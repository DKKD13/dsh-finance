/**
 * Native DSH conversation selection and draft preparation.
 *
 * DSH has three separate public faces:
 * - `ctx.sessions` owns the catalog, creation, and retained Session bindings.
 * - `ctx.conversation.input` initializes drafts on those retained bindings.
 * - `ctx.uiWorkspace` owns the `mainView` retention that selects the native
 *   Conversation and returns the center panel to it.
 * @module dsh-research-graph/client/conversations
 */

export interface ConversationSummaryLike<Id extends string = string> {
  readonly id: Id
  readonly title?: string
  readonly displayTitle: string
  readonly cwd?: string
  readonly origin?: 'subagent'
  readonly running: boolean
  readonly blank: boolean
  readonly updatedAt: number
  readonly retainedBy: {
    readonly mainView?: number
  }
}

export interface ConversationListSnapshotLike<Id extends string = string> {
  readonly ids: readonly Id[]
  readonly byId: Readonly<Record<string, ConversationSummaryLike<Id>>>
}

export interface WorkspaceConversationListLike<
  Id extends string = string,
  WorkspaceId extends string = string,
> {
  readonly items: readonly {
    readonly workspaceId: WorkspaceId
    readonly path: string
    readonly sessionIds: readonly Id[]
  }[]
  readonly archivedSessionIds: readonly Id[]
}

export interface ConversationCreateOptions<WorkspaceId extends string = string> {
  readonly workspaceId?: WorkspaceId
  readonly cwd?: string
  readonly agentPreset?: string
}

export interface ConversationBindingLike<Id extends string = string> {
  readonly sessionId: Id
}

export interface ConversationReferenceLike<
  Binding extends ConversationBindingLike<Id>,
  Id extends string,
> {
  readonly sessionId: Id
  readonly binding: Binding
  readonly ready: Promise<Binding>
}

export interface ConversationSessionsLike<
  Id extends string,
  Binding extends ConversationBindingLike<Id>,
  WorkspaceId extends string,
> {
  readonly list: {
    getSnapshot(): ConversationListSnapshotLike<Id>
  }
  create(options?: ConversationCreateOptions<WorkspaceId>): Promise<Id>
  using<T>(
    target: Id,
    options: { readonly source: 'workspaceOperation' },
    operation: (reference: ConversationReferenceLike<Binding, Id>) => T | Promise<T>,
  ): Promise<T>
}

export interface ConversationInputLike<Binding extends ConversationBindingLike> {
  requestDraftInitialization(
    binding: Binding,
    options: {
      readonly prompt?: string
      readonly clearPreviousDraft?: boolean
    },
  ): ConversationPrepareStatus
}

export interface ConversationNavigationLike<Id extends string = string> {
  openSession(sessionId: Id): void
}

export interface ConversationOption {
  readonly id: string
  readonly title: string
  readonly cwd: string | null
  readonly running: boolean
  readonly updatedAt: number
}

export type ConversationPrepareStatus = 'applied' | 'preserved' | 'blocked'

export interface ConversationPrepareInput {
  readonly sessionId?: string
  /** A factory can include the actual newly created conversation reference. */
  readonly text: string | ((sessionId: string) => string)
}

export interface ConversationPrepareResult {
  readonly sessionId: string
  readonly status: ConversationPrepareStatus
}

/** The callback face consumed by the independent ConversationDialog. */
export interface ConversationGateway {
  list(): readonly ConversationOption[]
  currentId(): string | null
  open(id: string): Promise<void> | void
  prepare(input: ConversationPrepareInput): Promise<ConversationPrepareResult>
}

export interface ConversationGatewayDependencies<
  Id extends string,
  Binding extends ConversationBindingLike<Id>,
  WorkspaceId extends string,
> {
  readonly sessions: ConversationSessionsLike<Id, Binding, WorkspaceId>
  readonly conversation: {
    readonly input: ConversationInputLike<Binding>
  }
  readonly navigation: ConversationNavigationLike<Id>
  readonly workspaces: {
    readonly list: {
      getSnapshot(): WorkspaceConversationListLike<Id, WorkspaceId>
    }
  }
}

function listableSummaries<Id extends string>(
  snapshot: ConversationListSnapshotLike<Id>,
  archived: ReadonlySet<Id>,
): ConversationSummaryLike<Id>[] {
  return snapshot.ids.flatMap(id => {
    const summary = snapshot.byId[id]
    if (summary === undefined) return []
    if (summary.blank || summary.origin === 'subagent' || archived.has(id)) return []
    return [summary]
  })
}

export function createConversationGateway<
  Binding extends ConversationBindingLike,
  WorkspaceId extends string,
>(
  dependencies: ConversationGatewayDependencies<Binding['sessionId'], Binding, WorkspaceId>,
): ConversationGateway {
  type Id = Binding['sessionId']
  const { sessions, conversation, navigation, workspaces } = dependencies

  const currentId = (): Id | null => {
    const snapshot = sessions.list.getSnapshot()
    const catalog = snapshot.ids.flatMap(id => {
      const summary = snapshot.byId[id]
      return summary === undefined ? [] : [summary]
    })
    const retainedFallbacks = Object.values(snapshot.byId).filter(summary => !snapshot.ids.includes(summary.id))
    return [...catalog, ...retainedFallbacks].find(summary => (summary.retainedBy.mainView ?? 0) > 0)?.id ?? null
  }

  const requireOpenable = (sessionId: string): ConversationSummaryLike<Id> => {
    const summary = sessions.list.getSnapshot().byId[sessionId]
    if (summary === undefined) throw new Error(`unknown DSH conversation ${sessionId}`)
    if (summary.origin === 'subagent') throw new Error(`subagent ${sessionId} is not a user conversation`)
    if (workspaces.list.getSnapshot().archivedSessionIds.includes(summary.id)) {
      throw new Error(`archived DSH conversation ${sessionId} cannot be opened`)
    }
    return summary
  }

  const open = (sessionId: string): void => {
    const summary = requireOpenable(sessionId)
    navigation.openSession(summary.id)
  }

  const create = async (): Promise<Id> => {
    const current = currentId()
    const items = workspaces.list.getSnapshot().items
    const workspace = (current === null
      ? undefined
      : items.find(item => item.sessionIds.includes(current))) ?? items[0]
    if (workspace === undefined) throw new Error('DSH_WORKSPACE_REQUIRED')
    return sessions.create({ workspaceId: workspace.workspaceId })
  }

  const prepareOn = async (
    sessionId: Id,
    text: ConversationPrepareInput['text'],
  ): Promise<ConversationPrepareResult> => sessions.using(
    sessionId,
    { source: 'workspaceOperation' },
    async reference => {
      const binding = await reference.ready
      const prompt = typeof text === 'function' ? text(sessionId) : text
      const status = conversation.input.requestDraftInitialization(binding, { prompt })
      if (status === 'applied') navigation.openSession(sessionId)
      return { sessionId, status }
    },
  )

  return {
    list() {
      const archived = new Set(workspaces.list.getSnapshot().archivedSessionIds)
      return listableSummaries(sessions.list.getSnapshot(), archived).map(summary => ({
        id: summary.id,
        title: summary.displayTitle,
        cwd: summary.cwd ?? null,
        running: summary.running,
        updatedAt: summary.updatedAt,
      }))
    },
    currentId,
    open,
    async prepare(input) {
      if (input.sessionId !== undefined) {
        const summary = requireOpenable(input.sessionId)
        return prepareOn(summary.id, input.text)
      }
      const sessionId = await create()
      return prepareOn(sessionId, input.text)
    },
  }
}

