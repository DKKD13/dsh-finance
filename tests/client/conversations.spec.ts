import { describe, expect, it, vi } from 'vitest'
import { createConversationGateway } from '../../client/conversations.ts'
import type {
  ConversationBindingLike,
  ConversationListSnapshotLike,
  ConversationPrepareStatus,
  ConversationSessionsLike,
  WorkspaceConversationListLike,
} from '../../client/conversations.ts'

interface TestBinding extends ConversationBindingLike {
  readonly generation: string
}

function harness(
  snapshot: ConversationListSnapshotLike,
  workspace: WorkspaceConversationListLike = {
    items: [{
      workspaceId: 'workspace:research',
      path: '/workspace/research',
      sessionIds: ['session:main', 'session:other'],
    }],
    archivedSessionIds: [],
  },
) {
  const bindings = new Map<string, TestBinding>()
  const binding = (sessionId: string): TestBinding => {
    const existing = bindings.get(sessionId)
    if (existing !== undefined) return existing
    const created = { sessionId, generation: `${sessionId}:g1` }
    bindings.set(sessionId, created)
    return created
  }
  const create = vi.fn(async () => 'session:new')
  const usingCalls: Array<{
    readonly sessionId: string
    readonly options: { readonly source: 'workspaceOperation' }
  }> = []
  const using: ConversationSessionsLike<string, TestBinding, string>['using'] = async <T>(
    sessionId: string,
    options: { readonly source: 'workspaceOperation' },
    operation: (reference: {
      readonly sessionId: string
      readonly binding: TestBinding
      readonly ready: Promise<TestBinding>
    }) => T | Promise<T>,
  ): Promise<T> => {
    usingCalls.push({ sessionId, options })
    const target = binding(sessionId)
    return await operation({ sessionId, binding: target, ready: Promise.resolve(target) })
  }
  const requestDraftInitialization = vi.fn((
    _binding: TestBinding,
    _options: {
      readonly prompt?: string
      readonly clearPreviousDraft?: boolean
    },
  ): ConversationPrepareStatus => 'applied')
  const openSession = vi.fn()
  const sessions = {
    list: { getSnapshot: () => snapshot },
    create,
    using,
  }
  const conversation = { input: { requestDraftInitialization } }
  const navigation = { openSession }
  const workspaces = {
    list: {
      getSnapshot: () => workspace,
    },
  }
  return {
    gateway: createConversationGateway({
      sessions,
      conversation,
      navigation,
      workspaces,
    }),
    create,
    usingCalls,
    requestDraftInitialization,
    openSession,
  }
}

const catalog: ConversationListSnapshotLike = {
  ids: ['session:main', 'session:blank', 'session:subagent', 'session:archived', 'session:other'],
  byId: {
    'session:main': {
      id: 'session:main',
      displayTitle: 'Main research',
      cwd: '/workspace/research',
      running: true,
      blank: false,
      updatedAt: 50,
      retainedBy: { mainView: 1 },
    },
    'session:blank': {
      id: 'session:blank',
      displayTitle: 'New conversation',
      cwd: '/workspace/research',
      running: false,
      blank: true,
      updatedAt: 40,
      retainedBy: {},
    },
    'session:subagent': {
      id: 'session:subagent',
      displayTitle: 'Subagent',
      origin: 'subagent',
      running: true,
      blank: false,
      updatedAt: 30,
      retainedBy: {},
    },
    'session:archived': {
      id: 'session:archived',
      displayTitle: 'Archived',
      running: false,
      blank: false,
      updatedAt: 20,
      retainedBy: {},
    },
    'session:other': {
      id: 'session:other',
      displayTitle: 'Other research',
      running: false,
      blank: false,
      updatedAt: 10,
      retainedBy: {},
    },
  },
}

describe('native DSH ConversationGateway', () => {
  it('lists only openable user conversations and identifies the current same as DSH', () => {
    const h = harness(catalog, {
      items: [{
        workspaceId: 'workspace:research',
        path: '/workspace/research',
        sessionIds: ['session:main', 'session:blank', 'session:other'],
      }],
      archivedSessionIds: ['session:archived'],
    })

    expect(h.gateway.list()).toEqual([
      {
        id: 'session:main',
        title: 'Main research',
        cwd: '/workspace/research',
        running: true,
        updatedAt: 50,
      },
      {
        id: 'session:other',
        title: 'Other research',
        cwd: null,
        running: false,
        updatedAt: 10,
      },
    ])
    expect(h.gateway.currentId()).toBe('session:main')
  })

  it('opens an existing user conversation through uiWorkspace.openSession', () => {
    const h = harness(catalog)

    h.gateway.open('session:other')

    expect(h.openSession).toHaveBeenCalledWith('session:other')
  })

  it('rejects archived, subagent, and unknown ids without navigation', () => {
    const h = harness(catalog, {
      items: [],
      archivedSessionIds: ['session:archived'],
    })

    expect(() => h.gateway.open('session:archived')).toThrow('archived DSH conversation')
    expect(() => h.gateway.open('session:subagent')).toThrow('is not a user conversation')
    expect(() => h.gateway.open('session:missing')).toThrow('unknown DSH conversation')
    expect(h.openSession).not.toHaveBeenCalled()
  })

  it('prepares an empty native draft, then returns the main panel to that Session', async () => {
    const h = harness(catalog)

    await expect(h.gateway.prepare({ sessionId: 'session:main', text: 'research prompt' })).resolves.toEqual({
      sessionId: 'session:main',
      status: 'applied',
    })

    expect(h.usingCalls).toEqual([{
      sessionId: 'session:main',
      options: { source: 'workspaceOperation' },
    }])
    expect(h.requestDraftInitialization).toHaveBeenCalledWith(
      { sessionId: 'session:main', generation: 'session:main:g1' },
      { prompt: 'research prompt' },
    )
    expect(h.openSession).toHaveBeenCalledWith('session:main')
  })

  it('preserves a non-empty native draft and does not navigate or overwrite it', async () => {
    const h = harness(catalog)
    h.requestDraftInitialization.mockReturnValueOnce('preserved')

    await expect(h.gateway.prepare({ sessionId: 'session:main', text: 'replacement prompt' })).resolves.toEqual({
      sessionId: 'session:main',
      status: 'preserved',
    })

    const options = h.requestDraftInitialization.mock.calls[0]?.[1]
    expect(options).toEqual({ prompt: 'replacement prompt' })
    expect(options).not.toHaveProperty('clearPreviousDraft')
    expect(h.openSession).not.toHaveBeenCalled()
  })

  it('reports a blocked draft without opening the conversation', async () => {
    const h = harness(catalog)
    h.requestDraftInitialization.mockReturnValueOnce('blocked')

    await expect(h.gateway.prepare({ sessionId: 'session:main', text: 'research prompt' })).resolves.toEqual({
      sessionId: 'session:main',
      status: 'blocked',
    })
    expect(h.openSession).not.toHaveBeenCalled()
  })

  it('creates a new Session in the current Workspace, prepares it, and opens the returned id', async () => {
    const h = harness(catalog)

    await expect(h.gateway.prepare({ text: 'new research prompt' })).resolves.toEqual({
      sessionId: 'session:new',
      status: 'applied',
    })

    expect(h.create).toHaveBeenCalledWith({ workspaceId: 'workspace:research' })
    expect(h.usingCalls).toEqual([{
      sessionId: 'session:new',
      options: { source: 'workspaceOperation' },
    }])
    expect(h.openSession).toHaveBeenCalledWith('session:new')
  })

  it('does not retain or navigate when Host creation fails', async () => {
    const h = harness(catalog)
    h.create.mockRejectedValueOnce(new Error('host refused'))

    await expect(h.gateway.prepare({ text: 'new research prompt' })).rejects.toThrow('host refused')

    expect(h.usingCalls).toEqual([])
    expect(h.openSession).not.toHaveBeenCalled()
  })

  it('builds the draft with the real created id for report provenance', async () => {
    const h = harness(catalog)
    await h.gateway.prepare({ text: id => `report conversation=${id}` })
    expect(h.requestDraftInitialization).toHaveBeenCalledWith(
      { sessionId: 'session:new', generation: 'session:new:g1' },
      { prompt: 'report conversation=session:new' },
    )
  })

  it('requires a workspace before preparing a new native draft', async () => {
    const h = harness(catalog, { items: [], archivedSessionIds: [] })
    await expect(h.gateway.prepare({ text: 'research prompt' })).rejects.toThrow('DSH_WORKSPACE_REQUIRED')
    expect(h.create).not.toHaveBeenCalled()
    expect(h.requestDraftInitialization).not.toHaveBeenCalled()
    expect(h.openSession).not.toHaveBeenCalled()
  })

  it('uses an existing workspace when the current conversation is ungrouped', async () => {
    const h = harness(catalog, { items: [{ workspaceId: 'workspace:available', path: '/research', sessionIds: [] }], archivedSessionIds: [] })
    await h.gateway.prepare({ text: 'research prompt' })
    expect(h.create).toHaveBeenCalledWith({ workspaceId: 'workspace:available' })
  })
})
