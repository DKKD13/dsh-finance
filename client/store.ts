/**
 * Framework-free workbench store: one immutable snapshot, explicit actions,
 * and every graph read/write dispatched through the shared wire protocol via
 * a {@link GraphGateway}. The React tree only subscribes and calls actions,
 * so all state transitions are unit-testable without a DOM.
 * @module dsh-research-graph/client/store
 */

import type { GraphRequest, GraphResponse } from '../src/protocol.ts'
import type { GraphAudit, GraphDiff, GraphEdge, GraphNode, NodeKind, EdgeKind } from '../src/graph.ts'
import type { RevisionEntry } from '../src/store.ts'
import { computeLayout } from './layout.ts'
import type { Point, Viewport } from './layout.ts'

/** Async channel the store talks to: one wire request in, one wire response out. */
export interface GraphGateway {
  request(request: GraphRequest): Promise<GraphResponse>
}

/** Bound locale translator. */
export type Translate = (key: string, params?: Record<string, unknown>) => string

/** Which workbench mode the body shows. */
export type WorkbenchMode = 'graph' | 'finance' | 'history' | 'audit'

/** Node editor dialog state. */
export type EditorState =
  | { readonly kind: 'create' }
  | { readonly kind: 'edit'; readonly id: string }

/** One transient notice shown in the page's toast area. */
export interface Notice {
  readonly tone: 'success' | 'error' | 'info'
  readonly text: string
}

/** The complete workbench snapshot. */
export interface WorkbenchState {
  /** Loading lifecycle of the graph snapshot. */
  readonly phase: 'loading' | 'ready' | 'error'
  /** Structured load failure when phase is 'error'. */
  readonly error: { readonly code: string; readonly message: string } | null
  /** Revision the snapshot was read at. */
  readonly revision: number
  readonly nodes: readonly GraphNode[]
  readonly edges: readonly GraphEdge[]
  /** World positions per node id (user drags and computed layout alike). */
  readonly positions: Readonly<Record<string, Point>>
  readonly viewport: Viewport
  readonly selectedId: string | null
  readonly selectedEdgeId: string | null
  readonly hoveredId: string | null
  /**
   * One-shot navigation intent emitted by revealNode. The canvas consumes the
   * request after it knows its measured size and centers the target there.
   */
  readonly focusRequest: { readonly nodeId: string; readonly requestId: number } | null
  /** Free-text filter over id/title/content/metadata. */
  readonly query: string
  /** Active node-kind filter; empty means all kinds. */
  readonly kindFilter: readonly NodeKind[]
  /** Active edge-kind filter; empty means all kinds. */
  readonly edgeKindFilter: readonly EdgeKind[]
  readonly mode: WorkbenchMode
  /** Retained history entries (oldest first), loaded in history mode. */
  readonly history: readonly RevisionEntry[] | null
  readonly historyLoading: boolean
  readonly historyError: { readonly code: string; readonly message: string } | null
  /** Earliest revision whose diff still replays. */
  readonly earliestRetainedRevision: number
  /** The diff currently inspected in history mode, with its range. */
  readonly diff: { readonly from: number; readonly to: number; readonly value: GraphDiff } | null
  /** Audit report, loaded in audit mode. */
  readonly audit: GraphAudit | null
  readonly auditLoading: boolean
  readonly auditError: { readonly code: string; readonly message: string } | null
  /** Editor dialog state. */
  readonly editor: EditorState | null
  /** Edge-creation dialog state: the fixed source node. */
  readonly linking: { readonly from: string } | null
  /** Delete confirmation target. */
  readonly removing: { readonly id: string; readonly cascade: boolean } | null
  /** In-flight mutation/read description, or null when idle. */
  readonly busy: string | null
  readonly notice: Notice | null
}

const EMPTY_VIEWPORT: Viewport = { x: 0, y: 0, zoom: 1 }

/** Initial state. */
export function initialWorkbenchState(): WorkbenchState {
  return {
    phase: 'loading',
    error: null,
    revision: 0,
    nodes: [],
    edges: [],
    positions: {},
    viewport: EMPTY_VIEWPORT,
    selectedId: null,
    selectedEdgeId: null,
    hoveredId: null,
    focusRequest: null,
    query: '',
    kindFilter: [],
    edgeKindFilter: [],
    mode: 'graph',
    history: null,
    historyLoading: false,
    historyError: null,
    earliestRetainedRevision: 0,
    diff: null,
    audit: null,
    auditLoading: false,
    auditError: null,
    editor: null,
    linking: null,
    removing: null,
    busy: null,
    notice: null,
  }
}

/** localStorage key for user-placed node positions. */
export const LAYOUT_STORAGE_KEY = 'dsh-research-graph.layout.v1'

/** Read persisted user positions; never throws. */
export function readStoredPositions(storage?: Pick<Storage, 'getItem'>): Record<string, Point> {
  if (storage === undefined) return {}
  try {
    const raw = storage.getItem(LAYOUT_STORAGE_KEY)
    if (raw === null) return {}
    const parsed: unknown = JSON.parse(raw)
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return {}
    const out: Record<string, Point> = {}
    for (const [id, point] of Object.entries(parsed)) {
      if (typeof point === 'object' && point !== null
        && typeof (point as Point).x === 'number' && typeof (point as Point).y === 'number') {
        out[id] = { x: (point as Point).x, y: (point as Point).y }
      }
    }
    return out
  } catch {
    return {}
  }
}

/** Rank nodes against a query: whole phrase + per-token matching over id, title, content, metadata. */
export function rankNodes(nodes: readonly GraphNode[], query: string): GraphNode[] {
  const phrase = query.trim().toLowerCase()
  if (phrase.length === 0) return [...nodes]
  const tokens = phrase.split(/\s+/u).filter(token => token.length > 0)
  const scored: { node: GraphNode; score: number }[] = []
  for (const node of nodes) {
    const fields: [string, number][] = [
      [node.id.toLowerCase(), 2],
      [node.title.toLowerCase(), 3],
      [node.content.toLowerCase(), 1],
      [JSON.stringify(node.metadata).toLowerCase(), 1],
    ]
    let score = 0
    for (const [text, weight] of fields) {
      let fieldScore = 0
      if (text.includes(phrase)) fieldScore += 10
      for (const token of tokens) if (text.includes(token)) fieldScore += 1
      score += fieldScore * weight
    }
    if (score > 0) scored.push({ node, score })
  }
  scored.sort((left, right) => right.score - left.score || (left.node.id < right.node.id ? -1 : 1))
  return scored.map(entry => entry.node)
}

/** Nodes passing the query and kind filter. */
export function visibleNodes(state: WorkbenchState): GraphNode[] {
  const ranked = rankNodes(state.nodes, state.query)
  if (state.kindFilter.length === 0) return ranked
  const kinds = new Set<string>(state.kindFilter)
  return ranked.filter(node => kinds.has(node.kind))
}

/** Edges whose endpoints and kind survive the current filters. */
export function visibleEdges(state: WorkbenchState, nodes: readonly GraphNode[]): GraphEdge[] {
  const visible = new Set(nodes.map(node => node.id))
  const kinds = state.edgeKindFilter.length === 0 ? undefined : new Set<string>(state.edgeKindFilter)
  return state.edges.filter(edge => visible.has(edge.from) && visible.has(edge.to)
    && (kinds === undefined || kinds.has(edge.kind)))
}

/** Edges incident to one node, outgoing first. */
export function incidentEdges(edges: readonly GraphEdge[], id: string): { out: GraphEdge[]; incoming: GraphEdge[] } {
  const out: GraphEdge[] = []
  const incoming: GraphEdge[] = []
  for (const edge of edges) {
    if (edge.from === id) out.push(edge)
    else if (edge.to === id) incoming.push(edge)
  }
  return { out, incoming }
}

/** Node/edge counts per kind for the filter bar. */
export function kindCounts(nodes: readonly GraphNode[]): Map<NodeKind, number> {
  const counts = new Map<NodeKind, number>()
  for (const node of nodes) counts.set(node.kind, (counts.get(node.kind) ?? 0) + 1)
  return counts
}

/**
 * The workbench store. Created once per plugin activation so user layout and
 * view state survive panel switches; node positions additionally persist to
 * localStorage across reloads.
 */
export class WorkbenchStore {
  private state: WorkbenchState = initialWorkbenchState()
  private readonly listeners = new Set<() => void>()
  /** User-dragged positions; anchors for later layouts and the persisted set. */
  private readonly pinned = new Map<string, Point>()
  private noticeToken = 0
  private historyToken = 0
  private auditToken = 0
  private focusRequestId = 0

  constructor(
    private readonly gateway: GraphGateway,
    private readonly t: Translate,
    private readonly storage?: Pick<Storage, 'getItem' | 'setItem'>,
  ) {
    for (const [id, point] of Object.entries(readStoredPositions(storage))) this.pinned.set(id, point)
  }

  /** Current immutable snapshot. */
  getSnapshot = (): WorkbenchState => this.state

  /** Subscribe to state changes; returns the unsubscribe. */
  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener)
    return () => { this.listeners.delete(listener) }
  }

  private set(patch: Partial<WorkbenchState>): void {
    this.state = { ...this.state, ...patch }
    for (const listener of [...this.listeners]) listener()
  }

  private fail(error: { code: string; message: string }): void {
    this.set({ phase: 'error', error, busy: null })
  }

  private notify(tone: Notice['tone'], text: string): void {
    this.noticeToken += 1
    const token = this.noticeToken
    this.set({ notice: { tone, text } })
    // A newer notice supersedes the dismissal of an older one.
    setTimeout(() => {
      if (this.noticeToken === token) this.set({ notice: null })
    }, 5000)
  }

  private async run(request: GraphRequest): Promise<GraphResponse> {
    try {
      return await this.gateway.request(request)
    } catch (error: unknown) {
      return { ok: false, error: { code: 'INTERNAL', message: error instanceof Error ? error.message : String(error) } }
    }
  }

  /**
   * Load (or reload) the whole-graph snapshot. Existing positions are kept
   * verbatim; only previously unseen nodes receive a computed position, so a
   * refresh never shuffles the user's arrangement.
   */
  async load(): Promise<void> {
    if (this.state.busy !== null) return
    this.set({ busy: 'load', ...(this.state.phase !== 'ready' ? { phase: 'loading' as const, error: null } : {}) })
    const response = await this.run({ op: 'graph.snapshot' })
    if (!response.ok) {
      this.fail(response.error)
      return
    }
    const snapshot = response.result as unknown as { revision: number; nodes: GraphNode[]; edges: GraphEdge[] }
    const anchors: Record<string, Point> = { ...this.state.positions }
    for (const [id, point] of this.pinned) anchors[id] = point
    const positions = computeLayout(snapshot.nodes, snapshot.edges, anchors)
    const selectedId = this.state.selectedId !== null && snapshot.nodes.some(node => node.id === this.state.selectedId)
      ? this.state.selectedId
      : null
    this.set({
      phase: 'ready',
      error: null,
      busy: null,
      revision: snapshot.revision,
      nodes: snapshot.nodes,
      edges: snapshot.edges,
      positions,
      selectedId,
      selectedEdgeId: this.state.selectedEdgeId !== null && snapshot.edges.some(edge => edge.id === this.state.selectedEdgeId)
        ? this.state.selectedEdgeId
        : null,
    })
  }

  /** Retry after a failure, or reload after reconnecting. */
  async refresh(): Promise<void> {
    if (this.state.busy !== null) return
    await this.load()
    if (this.state.phase === 'ready') {
      if (this.state.mode === 'history') await this.loadHistory()
      if (this.state.mode === 'audit') await this.loadAudit()
    }
  }

  /** Shared mutation flow: run, report, reload the snapshot. Returns success. */
  private async mutate(request: GraphRequest, successKey: string, params?: Record<string, unknown>): Promise<boolean> {
    if (this.state.busy !== null) return false
    this.set({ busy: request.op })
    const response = await this.run(request)
    if (!response.ok) {
      this.set({ busy: null })
      this.notify('error', `${response.error.code}: ${response.error.message}`)
      return false
    }
    this.historyToken += 1
    this.auditToken += 1
    this.set({ busy: null, history: null, historyLoading: false, historyError: null, audit: null, auditLoading: false, auditError: null, diff: null })
    this.notify('success', this.t(successKey, params))
    await this.refresh()
    return true
  }

  /** Create one node from the editor dialog. */
  async createNode(input: { id?: string; kind: NodeKind; title: string; content?: string; metadata?: Record<string, unknown> }): Promise<boolean> {
    const ok = await this.mutate({ op: 'node.create', node: input as GraphRequest['node'] & { kind: NodeKind; title: string } }, 'notice.nodeCreated')
    if (ok) this.set({ editor: null })
    return ok
  }

  /** Patch one node from the editor dialog. */
  async updateNode(id: string, patch: { title?: string; content?: string; metadata?: Record<string, unknown> }): Promise<boolean> {
    const ok = await this.mutate({ op: 'node.update', id, patch: patch as GraphRequest['patch'] & object }, 'notice.nodeUpdated')
    if (ok) this.set({ editor: null })
    return ok
  }

  /** Remove the node under confirmation, cascading incident edges. */
  async removeNode(id: string): Promise<boolean> {
    const ok = await this.mutate({ op: 'node.remove', id, cascade: true }, 'notice.nodeRemoved')
    if (ok) this.set({ removing: null, selectedId: null })
    return ok
  }

  /** Add one edge from the link dialog. */
  async addEdge(input: { from: string; to: string; kind: EdgeKind }): Promise<boolean> {
    const ok = await this.mutate({ op: 'edge.add', edge: input }, 'notice.edgeAdded')
    if (ok) this.set({ linking: null })
    return ok
  }

  /** Remove one edge by id. */
  async removeEdge(edgeId: string): Promise<boolean> {
    const ok = await this.mutate({ op: 'edge.remove', edgeId }, 'notice.edgeRemoved')
    if (ok && this.state.selectedEdgeId === edgeId) this.set({ selectedEdgeId: null })
    return ok
  }

  /** Re-import the bundled skills into the graph. */
  async rebuildSkills(): Promise<boolean> {
    const ok = await this.mutate({ op: 'skills.rebuild' }, 'notice.rebuilt')
    return ok
  }

  /** Write the Markdown mirror; reports the file count. */
  async exportMarkdown(): Promise<boolean> {
    if (this.state.busy !== null) return false
    this.set({ busy: 'export.markdown' })
    const response = await this.run({ op: 'export.markdown' })
    this.set({ busy: null })
    if (!response.ok) {
      this.notify('error', `${response.error.code}: ${response.error.message}`)
      return false
    }
    const result = response.result as unknown as { dir: string; files: string[] }
    this.notify('success', this.t('notice.exported', { count: result.files.length, dir: result.dir }))
    return true
  }

  /** Load the retained revision history (history mode entry and refresh). */
  async loadHistory(): Promise<void> {
    const token = ++this.historyToken
    this.set({ historyLoading: true, historyError: null })
    const response = await this.run({ op: 'history.list' })
    if (this.historyToken !== token) return
    if (!response.ok) {
      this.set({ historyLoading: false, historyError: response.error })
      return
    }
    const result = response.result as unknown as { revision: number; earliestRetainedRevision: number; entries: RevisionEntry[] }
    this.set({ history: result.entries, earliestRetainedRevision: result.earliestRetainedRevision, historyLoading: false, historyError: null })
  }

  /** Load the integrity audit (audit mode entry and refresh). */
  async loadAudit(): Promise<void> {
    const token = ++this.auditToken
    this.set({ auditLoading: true, auditError: null })
    const response = await this.run({ op: 'audit' })
    if (this.auditToken !== token) return
    if (!response.ok) {
      this.set({ auditLoading: false, auditError: response.error })
      return
    }
    this.set({ audit: response.result as unknown as GraphAudit, auditLoading: false, auditError: null })
  }

  /** Inspect the net change of one revision range; clears on invalid input. */
  async inspectDiff(from: number, to?: number): Promise<void> {
    const upper = to ?? this.state.revision
    const response = await this.run({ op: 'diff', from, to: upper })
    if (!response.ok) {
      this.notify('error', `${response.error.code}: ${response.error.message}`)
      return
    }
    this.set({ diff: { from, to: upper, value: response.result as unknown as GraphDiff } })
  }

  /** Leave the diff detail. */
  clearDiff(): void {
    this.set({ diff: null })
  }

  /** Switch the body mode; entering a mode loads its data lazily. */
  setMode(mode: WorkbenchMode): void {
    if (this.state.mode === mode) return
    this.set({ mode, diff: null })
    if (mode === 'history' && this.state.history === null) void this.loadHistory()
    if (mode === 'audit' && this.state.audit === null) void this.loadAudit()
  }

  /** Select one node (inspector opens); null clears the selection. */
  select(id: string | null): void {
    this.set({ selectedId: id, selectedEdgeId: null })
  }

  /**
   * Make an existing node mechanically reachable from search results, history,
   * audit, or a relation row. Filters are cleared so the target cannot remain
   * hidden; the canvas consumes the request once its size is known.
   * @returns whether the node exists.
   */
  revealNode(id: string): boolean {
    if (!this.state.nodes.some(node => node.id === id)) return false
    this.focusRequestId += 1
    this.set({
      mode: 'graph',
      diff: null,
      query: '',
      kindFilter: [],
      edgeKindFilter: [],
      hoveredId: null,
      selectedId: id,
      selectedEdgeId: null,
      focusRequest: { nodeId: id, requestId: this.focusRequestId },
    })
    return true
  }

  /** Select one edge (edge popover opens). */
  selectEdge(id: string | null): void {
    this.set({ selectedEdgeId: id, ...(id !== null ? { selectedId: null } : {}) })
  }

  /** Hover highlight for neighbor emphasis. */
  hover(id: string | null): void {
    if (this.state.hoveredId !== id) this.set({ hoveredId: id })
  }

  /** Set the free-text filter. */
  setQuery(query: string): void {
    this.set({ query })
  }

  /** Toggle one node kind in the filter. */
  toggleKind(kind: NodeKind): void {
    const current = new Set(this.state.kindFilter)
    if (current.has(kind)) current.delete(kind)
    else current.add(kind)
    this.set({ kindFilter: [...current] })
  }

  /** Toggle one edge kind in the filter. */
  toggleEdgeKind(kind: EdgeKind): void {
    const current = new Set(this.state.edgeKindFilter)
    if (current.has(kind)) current.delete(kind)
    else current.add(kind)
    this.set({ edgeKindFilter: [...current] })
  }

  /** Reset query and both kind filters. */
  clearFilters(): void {
    this.set({ query: '', kindFilter: [], edgeKindFilter: [] })
  }

  /** Open/close the node editor dialog. */
  openEditor(editor: EditorState | null): void {
    this.set({ editor })
  }

  /** Open/close the edge-creation dialog for one source node. */
  openLinking(from: string | null): void {
    this.set({ linking: from === null ? null : { from } })
  }

  /** Ask for delete confirmation (cascade is derived from incident edges). */
  confirmRemove(id: string | null): void {
    if (id === null) {
      this.set({ removing: null })
      return
    }
    const cascade = this.state.edges.some(edge => edge.from === id || edge.to === id)
    this.set({ removing: { id, cascade } })
  }

  /**
   * Move one node to a world position, pinning it against future relayout.
   * During a drag gesture pass `persist: false` and call {@link persistLayout}
   * once at pointer-up, so storage sees one write per gesture.
   */
  moveNode(id: string, point: Point, persist = true): void {
    this.pinned.set(id, point)
    this.set({ positions: { ...this.state.positions, [id]: point } })
    if (persist) this.persistPositions()
  }

  /** Persist all pinned positions (end of a drag gesture). */
  persistLayout(): void {
    this.persistPositions()
  }

  /** User-pinned positions (dragged nodes), exposed for persistence checks. */
  get pinnedPositions(): ReadonlyMap<string, Point> {
    return this.pinned
  }

  /** Flash a transient informational notice (e.g. copy feedback). */
  flash(text: string): void {
    this.notify('info', text)
  }

  /** Replace the canvas viewport (pan/zoom). */
  setViewport(viewport: Viewport): void {
    this.set({ viewport })
  }

  /** Forget all user-placed positions and recompute the whole layout. */
  resetLayout(): void {
    this.pinned.clear()
    this.persistPositions()
    const positions = computeLayout(this.state.nodes, this.state.edges)
    this.set({ positions })
  }

  private persistPositions(): void {
    if (this.storage === undefined) return
    try {
      this.storage.setItem(LAYOUT_STORAGE_KEY, JSON.stringify(Object.fromEntries(this.pinned)))
    } catch {
      // Storage quota or privacy mode: positions simply stop persisting.
    }
  }
}
