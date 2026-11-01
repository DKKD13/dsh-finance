/**
 * Durable JSON graph store: atomic writes, a versioned file schema, a bounded
 * revision history, and revision-range diff replay.
 *
 * Layout inside the configured data directory:
 * - `graph.json` — the single durable document (nodes, edges, history).
 * - `graph.json.tmp-<pid>` — transient atomic-write staging file.
 * - `mirror/` — optional Markdown mirror written when enabled.
 * @module dsh-research-graph/store
 */

import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { GraphEngine, GraphError, isEmptyDiff, mergeDiffs } from './graph.ts'
import type { GraphDiff, GraphEdge, GraphNode } from './graph.ts'
import { prepareGraphPlan } from './plan.ts'
import type { GraphPlan, GraphPlanResult } from './plan.ts'

/** Current durable schema version of `graph.json`. */
export const GRAPH_SCHEMA_VERSION = 1

/** Default number of revision entries retained for diff replay. */
export const DEFAULT_HISTORY_LIMIT = 256

/** One recorded mutation in the revision history. */
export interface RevisionEntry {
  /** Revision number this entry created (1-based, monotonic). */
  readonly revision: number
  /** Epoch milliseconds of the mutation. */
  readonly at: number
  /** Operation tag, e.g. `node.create`, `edge.add`, `skills.rebuild`. */
  readonly op: string
  /** Human-readable one-line summary. */
  readonly summary: string
  /** The exact change applied by this revision. */
  readonly diff: GraphDiff
}

/** Durable document shape at {@link GRAPH_SCHEMA_VERSION}. */
export interface GraphFileV1 {
  readonly schemaVersion: 1
  readonly revision: number
  readonly nodes: Record<string, GraphNode>
  readonly edges: Record<string, GraphEdge>
  readonly history: readonly RevisionEntry[]
}

/** Options accepted by {@link GraphStore.open}. */
export interface GraphStoreOptions {
  /** Revision history cap; older entries are dropped from diff replay. */
  readonly historyLimit?: number
  /** Clock override for deterministic tests. */
  readonly now?: () => number
}

interface ParsedFile {
  revision: number
  nodes: GraphNode[]
  edges: GraphEdge[]
  history: RevisionEntry[]
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function assertNodeShape(value: unknown, subject: string): asserts value is GraphNode {
  if (!isRecord(value)
    || typeof value.id !== 'string'
    || typeof value.kind !== 'string'
    || typeof value.title !== 'string'
    || typeof value.content !== 'string'
    || !isRecord(value.metadata)
    || typeof value.createdAt !== 'number'
    || typeof value.updatedAt !== 'number') {
    throw new GraphError('STORE_CORRUPT', `${subject} is not a well-formed graph node`)
  }
}

function assertEdgeShape(value: unknown, subject: string): asserts value is GraphEdge {
  if (!isRecord(value)
    || typeof value.id !== 'string'
    || typeof value.from !== 'string'
    || typeof value.to !== 'string'
    || typeof value.kind !== 'string'
    || !isRecord(value.metadata)
    || typeof value.createdAt !== 'number') {
    throw new GraphError('STORE_CORRUPT', `${subject} is not a well-formed graph edge`)
  }
}

/**
 * Migrate an arbitrary parsed file to the current schema. Version 0 is the
 * pre-versioned shape `{ nodes: GraphNode[], edges: GraphEdge[] }`; anything
 * newer than the current version is rejected loudly instead of being read
 * with lossy assumptions.
 */
function migrate(raw: unknown): ParsedFile {
  if (!isRecord(raw)) throw new GraphError('STORE_CORRUPT', 'graph file must contain a JSON object')
  const version = raw.schemaVersion
  if (version === undefined) {
    const nodes = raw.nodes
    const edges = raw.edges
    if (!Array.isArray(nodes) || !Array.isArray(edges)) {
      throw new GraphError('STORE_CORRUPT', 'pre-versioned graph file must carry nodes and edges arrays')
    }
    const nodeList: GraphNode[] = []
    const edgeList: GraphEdge[] = []
    nodes.forEach((node, index) => {
      assertNodeShape(node, `nodes[${index}]`)
      nodeList.push(node)
    })
    edges.forEach((edge, index) => {
      assertEdgeShape(edge, `edges[${index}]`)
      edgeList.push(edge)
    })
    return { revision: 0, nodes: nodeList, edges: edgeList, history: [] }
  }
  if (typeof version !== 'number' || !Number.isSafeInteger(version) || version < 1) {
    throw new GraphError('STORE_CORRUPT', `graph file schemaVersion must be a positive integer, got ${JSON.stringify(version)}`)
  }
  if (version > GRAPH_SCHEMA_VERSION) {
    throw new GraphError(
      'STORE_VERSION_AHEAD',
      `graph file schema version ${version} is newer than supported version ${GRAPH_SCHEMA_VERSION}; upgrade dsh-research-graph`,
    )
  }
  const nodes = raw.nodes
  const edges = raw.edges
  const history = raw.history
  const revision = raw.revision
  if (!isRecord(nodes) || !isRecord(edges) || !Array.isArray(history) || typeof revision !== 'number' || !Number.isSafeInteger(revision)) {
    throw new GraphError('STORE_CORRUPT', 'graph file v1 must carry revision, nodes/edges records, and a history array')
  }
  const nodeList: GraphNode[] = []
  const edgeList: GraphEdge[] = []
  for (const [key, node] of Object.entries(nodes)) {
    assertNodeShape(node, `nodes[${JSON.stringify(key)}]`)
    nodeList.push(node)
  }
  for (const [key, edge] of Object.entries(edges)) {
    assertEdgeShape(edge, `edges[${JSON.stringify(key)}]`)
    edgeList.push(edge)
  }
  for (const entry of history as unknown[]) {
    if (!isRecord(entry) || typeof entry.revision !== 'number' || typeof entry.op !== 'string' || !isRecord(entry.diff)) {
      throw new GraphError('STORE_CORRUPT', 'graph file history entry is malformed')
    }
  }
  return { revision, nodes: nodeList, edges: edgeList, history: history as RevisionEntry[] }
}

/**
 * Local-first graph store. All mutations run on a serialized queue so the
 * in-memory engine, the revision counter, and the on-disk file never
 * interleave; each non-empty mutation is one atomic file replacement.
 */
export class GraphStore {
  /** In-memory rule engine holding the live graph. */
  readonly engine: GraphEngine
  /** Current revision: the number of recorded changes since graph creation. */
  private revision = 0
  private history: RevisionEntry[] = []
  private readonly historyLimit: number
  private readonly now: () => number
  private readonly file: string
  private readonly dataDir: string
  private queue: Promise<unknown> = Promise.resolve()

  private constructor(dir: string, options: GraphStoreOptions) {
    this.dataDir = dir
    this.file = join(dir, 'graph.json')
    this.historyLimit = options.historyLimit ?? DEFAULT_HISTORY_LIMIT
    if (!Number.isSafeInteger(this.historyLimit) || this.historyLimit < 1) {
      throw new GraphError('INVALID_CONFIG', `historyLimit must be a positive safe integer, got ${this.historyLimit}`)
    }
    this.now = options.now ?? (() => Date.now())
    this.engine = new GraphEngine(this.now)
  }

  /**
   * Open the store in one data directory, creating nothing until the first
   * mutation. A missing file starts an empty graph; a malformed or
   * too-new file fails loudly.
   * @param dir - data directory holding `graph.json`.
   * @param options - history cap and clock override.
   * @returns the opened store.
   */
  static async open(dir: string, options: GraphStoreOptions = {}): Promise<GraphStore> {
    const store = new GraphStore(dir, options)
    let text: string
    try {
      text = await readFile(store.file, 'utf8')
    } catch (error: unknown) {
      if (isRecord(error) && error.code === 'ENOENT') return store
      throw error
    }
    let parsed: unknown
    try {
      parsed = JSON.parse(text)
    } catch (error: unknown) {
      throw new GraphError('STORE_CORRUPT', `graph file ${store.file} is not valid JSON: ${error instanceof Error ? error.message : String(error)}`)
    }
    const migrated = migrate(parsed)
    store.revision = migrated.revision
    store.history = migrated.history
    store.engine.restore(migrated.nodes, migrated.edges)
    return store
  }

  /** Data directory of this store. */
  get dir(): string {
    return this.dataDir
  }

  /** Current revision number. */
  get currentRevision(): number {
    return this.revision
  }

  /** Oldest revision whose diff is still replayable. */
  get earliestRetainedRevision(): number {
    const first = this.history[0]
    return first === undefined ? this.revision : first.revision - 1
  }

  /** Retained history entries, oldest first. */
  get revisions(): readonly RevisionEntry[] {
    return this.history
  }

  /**
   * Run one mutation on the serialized queue: apply the engine change and, for
   * a non-empty diff, record history and atomically replace the durable file.
   * @param op - operation tag recorded in history.
   * @param summary - human-readable one-line summary.
   * @param mutate - engine mutation returning its diff and a result.
   * @returns the mutation result with the current revision.
   */
  async mutate<T>(op: string, summary: string, mutate: () => { diff: GraphDiff; result: T }): Promise<{ revision: number; result: T; diff: GraphDiff }> {
    const run = this.queue.then(() => this.applyMutation(op, summary, mutate))
    this.queue = run.catch(() => {})
    return run
  }

  private async applyMutation<T>(op: string, summary: string, mutate: () => { diff: GraphDiff; result: T }): Promise<{ revision: number; result: T; diff: GraphDiff }> {
    const { diff, result } = mutate()
    if (isEmptyDiff(diff)) return { revision: this.revision, result, diff }
    this.revision += 1
    this.history.push(Object.freeze({ revision: this.revision, at: this.now(), op, summary, diff }))
    if (this.history.length > this.historyLimit) this.history.splice(0, this.history.length - this.historyLimit)
    await this.persist()
    return { revision: this.revision, result, diff }
  }

  /**
   * Record one externally computed multi-step change (the skills import) as at
   * most one revision. The callback may run several engine operations; their
   * diffs merge into one history entry.
   * @param op - operation tag recorded in history.
   * @param summary - human-readable one-line summary.
   * @param mutate - engine mutations returning merged diffs and a result.
   * @returns the mutation result with the current revision.
   */
  async mutateBulk<T>(op: string, summary: string, mutate: () => { diffs: readonly GraphDiff[]; result: T }): Promise<{ revision: number; result: T; diff: GraphDiff }> {
    return this.mutate(op, summary, () => {
      const { diffs, result } = mutate()
      return { diff: mergeDiffs(diffs), result }
    })
  }

  /** Apply an isolated GraphPlan in zero or one revision; identical replays are no-ops. */
  async applyPlan(op: string, summary: string, plan: GraphPlan): Promise<{ revision: number; result: GraphPlanResult; diff: GraphDiff }> {
    const run = this.queue.then(async () => {
      const prepared = prepareGraphPlan(this.engine, plan, this.now)
      if (!prepared.result.changed) {
        return { revision: this.revision, result: prepared.result, diff: prepared.diff }
      }
      const revision = this.revision + 1
      const history = [...this.history, Object.freeze({ revision, at: this.now(), op, summary, diff: prepared.diff })]
      if (history.length > this.historyLimit) history.splice(0, history.length - this.historyLimit)
      await this.persist({
        schemaVersion: GRAPH_SCHEMA_VERSION,
        revision,
        nodes: Object.fromEntries(prepared.nodes.map(node => [node.id, node])),
        edges: Object.fromEntries(prepared.edges.map(edge => [edge.id, edge])),
        history,
      })
      this.revision = revision
      this.history = history
      this.engine.restore(prepared.nodes, prepared.edges)
      return { revision, result: prepared.result, diff: prepared.diff }
    })
    this.queue = run.catch(() => {})
    return run
  }

  /**
   * Replay retained history into the net change between two revisions.
   * @param from - exclusive lower bound; `0` diffs against the empty graph.
   * @param to - inclusive upper bound; defaults to the current revision.
   * @returns the merged diff of every entry in `(from, to]`.
   */
  diffRevisions(from: number, to?: number): GraphDiff {
    const upper = to ?? this.revision
    if (!Number.isSafeInteger(from) || from < 0 || !Number.isSafeInteger(upper) || upper > this.revision || from > upper) {
      throw new GraphError('INVALID_REVISION_RANGE', `diff range (${from}, ${upper}] is outside revision 0..${this.revision}`)
    }
    if (from < this.earliestRetainedRevision && this.history.length > 0) {
      throw new GraphError(
        'HISTORY_TRUNCATED',
        `revisions up to ${this.earliestRetainedRevision} were compacted away; earliest diffable range starts at ${this.earliestRetainedRevision}`,
      )
    }
    return mergeDiffs(this.history.filter(entry => entry.revision > from && entry.revision <= upper).map(entry => entry.diff))
  }

  /** Serialize the current state and atomically replace the durable file. */
  private async persist(candidate?: GraphFileV1): Promise<void> {
    const document: GraphFileV1 = candidate ?? {
      schemaVersion: GRAPH_SCHEMA_VERSION,
      revision: this.revision,
      nodes: Object.fromEntries(this.engine.nodes),
      edges: Object.fromEntries(this.engine.edges),
      history: this.history,
    }
    await mkdir(this.dir, { recursive: true })
    const staging = `${this.file}.tmp-${process.pid}`
    await writeFile(staging, `${JSON.stringify(document, null, 2)}\n`, 'utf8')
    await rename(staging, this.file)
  }
}
