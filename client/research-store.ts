import type { GraphNode, JsonValue } from '../src/graph.ts'
import type { GraphResponse } from '../src/protocol.ts'
import type { RevisionEntry } from '../src/store.ts'
import type { GraphGateway } from './store.ts'
import type { SessionRunState } from './session.ts'
import { expectedArtifactIds, expectedArtifactKinds, knowledgeCompilerPrompt, researchPrompt, reviewPrompt } from './research.ts'
import type { HypothesisKind, ResearchRequest, ViewStance } from './research.ts'

export interface SessionPromptGateway {
  run(input: {
    readonly runId: string
    readonly text: string
    readonly observeArtifacts: (runId: string) => Promise<readonly string[]>
    readonly timeoutMs: number
    readonly pollIntervalMs: number
    readonly onTransition: (state: SessionRunState) => void
  }): Promise<SessionRunState>
}

export type ResearchOperationStatus = 'submitting' | SessionRunState['status']

export interface ResearchOperation {
  readonly runId: string
  readonly request: ResearchRequest
  readonly status: ResearchOperationStatus
  readonly sessionId: string | null
  readonly artifactIds: readonly string[]
  readonly error: { readonly code: string; readonly message: string } | null
  readonly createdAt: number
  readonly updatedAt: number
}

export interface HypothesisAction {
  readonly mode: 'create' | 'link'
  readonly evidenceId: string
}

export interface ResearchMutation {
  readonly status: 'idle' | 'loading' | 'success' | 'error'
  readonly error: { readonly code: string; readonly message: string } | null
}

export interface HypothesisHistory {
  readonly nodeId: string | null
  readonly status: 'idle' | 'loading' | 'ready' | 'error'
  readonly entries: readonly RevisionEntry[]
  readonly revision: number
  readonly earliestRetainedRevision: number
  readonly error: { readonly code: string; readonly message: string } | null
}

export interface ResearchState {
  readonly operations: readonly ResearchOperation[]
  readonly selectedHypothesisId: string | null
  readonly selectedReportId: string | null
  readonly hypothesisAction: HypothesisAction | null
  readonly mutation: ResearchMutation
  readonly history: HypothesisHistory
}

export interface HypothesisInput {
  readonly kind: HypothesisKind
  readonly thesis: string
  readonly status: string
  readonly confidence?: number
  readonly killCriteria: readonly string[]
  readonly evidenceId: string
  readonly direction: 'supports' | 'contradicts'
  readonly reliability?: number
  readonly independence?: number
  readonly stance?: ViewStance
}

const INITIAL_HISTORY: HypothesisHistory = {
  nodeId: null,
  status: 'idle',
  entries: [],
  revision: 0,
  earliestRetainedRevision: 0,
  error: null,
}

function initialResearchState(): ResearchState {
  return {
    operations: [],
    selectedHypothesisId: null,
    selectedReportId: null,
    hypothesisAction: null,
    mutation: { status: 'idle', error: null },
    history: INITIAL_HISTORY,
  }
}

function isActive(operation: ResearchOperation): boolean {
  return operation.status === 'submitting' || operation.status === 'accepted' || operation.status === 'running'
}

function sameRequest(left: ResearchRequest, right: ResearchRequest): boolean {
  return JSON.stringify(left) === JSON.stringify(right)
}

function revisionTouches(entry: RevisionEntry, nodeId: string): boolean {
  const { diff } = entry
  return diff.nodesAdded.includes(nodeId)
    || diff.nodesRemoved.includes(nodeId)
    || diff.nodesUpdated.some(node => node.id === nodeId)
    || [...diff.edgesAdded, ...diff.edgesRemoved].some(id => id.includes(nodeId))
}

export class ResearchStore {
  private state: ResearchState = initialResearchState()
  private readonly listeners = new Set<() => void>()
  private refreshQueue: Promise<void> = Promise.resolve()
  private historyToken = 0
  private mutationToken = 0

  constructor(
    private readonly graph: GraphGateway,
    private readonly prompts: SessionPromptGateway,
    private readonly onGraphChange: () => Promise<void>,
    private readonly options: {
      readonly timeoutMs?: number
      readonly pollIntervalMs?: number
      readonly now?: () => number
      readonly uuid?: () => string
    } = {},
  ) {}

  getSnapshot = (): ResearchState => this.state

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener)
    return () => { this.listeners.delete(listener) }
  }

  private set(patch: Partial<ResearchState>): void {
    this.state = { ...this.state, ...patch }
    for (const listener of [...this.listeners]) listener()
  }

  private now(): number {
    return this.options.now?.() ?? Date.now()
  }

  private runId(prefix: string): string {
    return `${prefix}:${this.options.uuid?.() ?? globalThis.crypto.randomUUID()}`
  }

  private queueGraphRefresh(): Promise<void> {
    this.refreshQueue = this.refreshQueue.then(() => this.onGraphChange()).catch(() => {})
    return this.refreshQueue
  }

  private patchOperation(runId: string, patch: Partial<ResearchOperation>): void {
    this.set({
      operations: this.state.operations.map(operation => operation.runId === runId
        ? { ...operation, ...patch, updatedAt: this.now() }
        : operation),
    })
  }

  private observe(runId: string, request: ResearchRequest): Promise<readonly string[]> {
    return this.graph.request({ op: 'graph.snapshot' }).then(response => {
      if (!response.ok) throw new Error(`${response.error.code}: ${response.error.message}`)
      const snapshot = response.result as unknown as { nodes: GraphNode[] }
      return expectedArtifactIds(snapshot.nodes, runId, expectedArtifactKinds(request))
    })
  }

  private start(request: ResearchRequest, force: boolean): string {
    if (!force) {
      const existing = this.state.operations.find(operation => isActive(operation) && sameRequest(operation.request, request))
      if (existing !== undefined) return existing.runId
    }
    const runId = this.runId(request.kind)
    const at = this.now()
    const operation: ResearchOperation = {
      runId,
      request,
      status: 'submitting',
      sessionId: null,
      artifactIds: [],
      error: null,
      createdAt: at,
      updatedAt: at,
    }
    this.set({ operations: [operation, ...this.state.operations] })
    const text = request.kind === 'compile'
      ? knowledgeCompilerPrompt(runId, request.sourceIds, request.asOf)
      : request.kind === 'research' ? researchPrompt(runId, request) : reviewPrompt(runId, request)
    void this.prompts.run({
      runId,
      text,
      observeArtifacts: id => this.observe(id, request),
      timeoutMs: this.options.timeoutMs ?? 10 * 60 * 1000,
      pollIntervalMs: this.options.pollIntervalMs ?? 1000,
      onTransition: result => {
        this.patchOperation(result.runId, {
          status: result.status,
          sessionId: result.sessionId,
          artifactIds: result.artifactIds,
          error: result.error,
        })
      },
    }).then(async result => {
      this.patchOperation(runId, {
        status: result.status,
        sessionId: result.sessionId,
        artifactIds: result.artifactIds,
        error: result.error,
      })
      if (result.status === 'completed') await this.queueGraphRefresh()
    }).catch((error: unknown) => {
      this.patchOperation(runId, {
        status: 'failed',
        error: { code: 'SESSION_TRANSPORT', message: error instanceof Error ? error.message : String(error) },
      })
    })
    return runId
  }

  startCompile(sourceIds: readonly string[], asOf?: string): string {
    const ids = [...new Set(sourceIds.map(id => id.trim()).filter(id => id.length > 0))]
    if (ids.length === 0) throw new Error('at least one source id is required')
    const cutoff = asOf?.trim()
    return this.start({ kind: 'compile', sourceIds: ids, ...(cutoff === undefined || cutoff.length === 0 ? {} : { asOf: cutoff }) }, false)
  }

  startResearch(request: Extract<ResearchRequest, { kind: 'research' }>): string {
    return this.start(request, false)
  }

  startReview(request: Extract<ResearchRequest, { kind: 'review' }>): string {
    const hypothesisId = request.hypothesisId.trim()
    const asOf = request.asOf.trim()
    if (hypothesisId.length === 0) throw new Error('a hypothesis id is required')
    if (asOf.length === 0) throw new Error('an as-of cutoff is required')
    return this.start({ kind: 'review', mode: request.mode, hypothesisId, asOf }, false)
  }

  retry(runId: string): string {
    const operation = this.state.operations.find(candidate => candidate.runId === runId)
    if (operation === undefined) throw new Error(`unknown research run ${runId}`)
    return this.start(operation.request, true)
  }

  selectHypothesis(id: string | null): void {
    this.set({ selectedHypothesisId: id })
  }

  selectReport(id: string | null): void {
    this.set({ selectedReportId: id })
  }

  beginHypothesis(action: HypothesisAction): void {
    this.set({ hypothesisAction: action, mutation: { status: 'idle', error: null } })
  }

  cancelHypothesisAction(): void {
    this.set({ hypothesisAction: null, mutation: { status: 'idle', error: null } })
  }

  private async mutate(plan: { nodes: readonly unknown[]; edges: readonly unknown[] }): Promise<GraphResponse> {
    const token = ++this.mutationToken
    this.set({ mutation: { status: 'loading', error: null } })
    let response: GraphResponse
    try {
      response = await this.graph.request({ op: 'graph.plan', plan: plan as never })
    } catch (error: unknown) {
      response = { ok: false, error: { code: 'TRANSPORT', message: error instanceof Error ? error.message : String(error) } }
    }
    if (token === this.mutationToken) {
      this.set({ mutation: response.ok ? { status: 'success', error: null } : { status: 'error', error: response.error } })
    }
    return response
  }

  async createHypothesis(input: HypothesisInput): Promise<string | null> {
    const thesis = input.thesis.trim()
    if (thesis.length === 0) {
      this.set({ mutation: { status: 'error', error: { code: 'INVALID_THESIS', message: 'a non-empty thesis is required' } } })
      return null
    }
    const id = this.runId(input.kind)
    const metadata: Record<string, JsonValue> = {
      thesis,
      status: input.status,
      references: [input.evidenceId],
      ...(input.stance === undefined ? {} : { stance: input.stance }),
      ...(input.confidence === undefined ? {} : { confidence: input.confidence }),
      ...(input.killCriteria.length === 0 ? {} : { killCriteria: [...input.killCriteria] }),
    }
    const response = await this.mutate({
      nodes: [{ id, kind: input.kind, title: thesis, content: thesis, metadata }],
      edges: [{
        from: input.evidenceId,
        to: id,
        kind: input.direction,
        metadata: {
          ...(input.reliability === undefined ? {} : { reliability: input.reliability }),
          ...(input.independence === undefined ? {} : { independence: input.independence }),
        },
      }],
    })
    if (!response.ok) return null
    this.set({ selectedHypothesisId: id, hypothesisAction: null })
    await this.queueGraphRefresh()
    return id
  }

  async setViewStance(id: string, stance: ViewStance): Promise<boolean> {
    this.set({ mutation: { status: 'loading', error: null } })
    try {
      // Re-read before merging: classifications must preserve all source lineage.
      const read = await this.graph.request({ op: 'node.get', id })
      if (!read.ok) { this.set({ mutation: { status: 'error', error: read.error } }); return false }
      const node = read.result as unknown as GraphNode
      if (!node || !['claim', 'belief', 'signal', 'question'].includes(node.kind) || !node.metadata) throw new Error('The selected view is unavailable')
      const response = await this.graph.request({ op: 'node.update', id, patch: { metadata: { ...node.metadata, stance } } })
      this.set({ mutation: response.ok ? { status: 'success', error: null } : { status: 'error', error: response.error } })
      if (!response.ok) return false
      await this.queueGraphRefresh()
      return true
    } catch (error) {
      this.set({ mutation: { status: 'error', error: { code: 'VIEW_UPDATE_FAILED', message: error instanceof Error ? error.message : String(error) } } })
      return false
    }
  }

  async linkEvidence(input: {
    readonly hypothesisId: string
    readonly evidenceId: string
    readonly direction: 'supports' | 'contradicts'
    readonly reliability?: number
    readonly independence?: number
  }): Promise<boolean> {
    const response = await this.mutate({
      nodes: [],
      edges: [{
        from: input.evidenceId,
        to: input.hypothesisId,
        kind: input.direction,
        metadata: {
          ...(input.reliability === undefined ? {} : { reliability: input.reliability }),
          ...(input.independence === undefined ? {} : { independence: input.independence }),
        },
      }],
    })
    if (!response.ok) return false
    this.set({ selectedHypothesisId: input.hypothesisId, hypothesisAction: null })
    await this.queueGraphRefresh()
    if (this.state.history.nodeId === input.hypothesisId) await this.loadHypothesisHistory(input.hypothesisId)
    return true
  }

  async loadHypothesisHistory(nodeId: string): Promise<void> {
    const token = ++this.historyToken
    this.set({ history: { ...INITIAL_HISTORY, nodeId, status: 'loading' } })
    let response: GraphResponse
    try {
      response = await this.graph.request({ op: 'history.list' })
    } catch (error: unknown) {
      response = { ok: false, error: { code: 'TRANSPORT', message: error instanceof Error ? error.message : String(error) } }
    }
    if (token !== this.historyToken) return
    if (!response.ok) {
      this.set({ history: { ...INITIAL_HISTORY, nodeId, status: 'error', error: response.error } })
      return
    }
    const result = response.result as unknown as {
      revision: number
      earliestRetainedRevision: number
      entries: RevisionEntry[]
    }
    this.set({
      history: {
        nodeId,
        status: 'ready',
        entries: result.entries.filter(entry => revisionTouches(entry, nodeId)).reverse(),
        revision: result.revision,
        earliestRetainedRevision: result.earliestRetainedRevision,
        error: null,
      },
    })
  }
}
