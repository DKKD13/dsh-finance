/**
 * Knowledge-graph domain model: node/edge vocabularies, validation, and the
 * pure in-memory engine every mutation goes through.
 *
 * This module is free of runtime dependencies beyond the types below so the
 * graph rules stay testable without a Cordis context.
 * @module deepseek-harness-finance-plugin/graph
 */

/** Lossless JSON value, the only shape allowed in durable graph data. */
export type JsonValue = null | boolean | number | string | JsonValue[] | { [key: string]: JsonValue }

/** Closed set of node kinds the graph admits. */
export const NODE_KINDS = [
  'skill',
  'reference',
  'persona',
  'script',
  'signal',
  'source',
  'raw',
  'session',
  'claim',
  'question',
  'belief',
  'memory',
  'deliverable',
  'instrument',
  'portfolio',
  'position',
  'valuation',
  'catalyst',
  'prediction',
] as const

/** One admitted node kind. */
export type NodeKind = typeof NODE_KINDS[number]

/** Closed set of edge (relation) kinds the graph admits. */
export const EDGE_KINDS = [
  'references',
  'depends_on',
  'supports',
  'contradicts',
  'tensions',
  'cite',
  'update',
  'reason',
  'contain',
  'based_on',
  'seeks',
  'answers',
  'supersedes',
  'derived_from',
  'informed_by',
  'produces',
  'uses',
  'holds',
  'exposure_to',
  'values',
  'catalyzes',
  'resolves',
] as const

/** One admitted edge kind. */
export type EdgeKind = typeof EDGE_KINDS[number]

/** Durable node record. */
export interface GraphNode {
  readonly id: string
  readonly kind: NodeKind
  readonly title: string
  readonly content: string
  readonly metadata: Record<string, JsonValue>
  /** Epoch milliseconds of creation. */
  readonly createdAt: number
  /** Epoch milliseconds of the last update. */
  readonly updatedAt: number
}

/** Durable edge record. */
export interface GraphEdge {
  readonly id: string
  readonly from: string
  readonly to: string
  readonly kind: EdgeKind
  readonly metadata: Record<string, JsonValue>
  readonly createdAt: number
}

/** Input accepted by node creation. */
export interface NodeInput {
  /** Explicit id; when absent one is derived from kind and title. */
  readonly id?: string
  readonly kind: NodeKind
  readonly title: string
  readonly content?: string
  readonly metadata?: Record<string, JsonValue>
}

/** Patch accepted by node update; omitted fields stay unchanged. */
export interface NodePatch {
  readonly title?: string
  readonly content?: string
  readonly metadata?: Record<string, JsonValue>
}

/** Input accepted by edge creation. */
export interface EdgeInput {
  readonly from: string
  readonly to: string
  readonly kind: EdgeKind
  readonly metadata?: Record<string, JsonValue>
}

/** What one mutation changed, recorded in the revision history. */
export interface GraphDiff {
  readonly nodesAdded: readonly string[]
  readonly nodesRemoved: readonly string[]
  readonly nodesUpdated: readonly { id: string; fields: readonly string[] }[]
  readonly edgesAdded: readonly string[]
  readonly edgesRemoved: readonly string[]
}

/** One scored search hit. */
export interface SearchHit {
  readonly node: GraphNode
  readonly score: number
  /** Fields the query matched in. */
  readonly matches: readonly ('title' | 'content' | 'metadata')[]
}

/** One incoming edge with its resolved source node. */
export interface Backlink {
  readonly edge: GraphEdge
  readonly from: GraphNode | undefined
}

/** Integrity report over the whole graph. */
export interface GraphAudit {
  /** Edges whose endpoints no longer exist (only reachable after hand-edited files). */
  readonly brokenEdges: readonly GraphEdge[]
  /** `metadata.references` entries pointing at missing nodes. */
  readonly brokenRefs: readonly { node: string; reference: string }[]
  /** Nodes with no incident edges. */
  readonly orphans: readonly string[]
  /** Import-time link targets that resolved to no node. */
  readonly unresolvedRefs: readonly { node: string; target: string }[]
}

/** Summary counts of the graph. */
export interface GraphStats {
  readonly revision: number
  readonly nodes: number
  readonly edges: number
  readonly nodesByKind: Record<string, number>
  readonly edgesByKind: Record<string, number>
}

/** Typed failure raised by every graph rule violation. */
export class GraphError extends Error {
  /** Stable machine-readable code for protocol consumers. */
  readonly code: string

  constructor(code: string, message: string) {
    super(message)
    this.name = 'GraphError'
    this.code = code
  }
}

const NODE_ID = /^[^\s]{1,256}$/u
const EMPTY_DIFF: GraphDiff = Object.freeze({
  nodesAdded: Object.freeze([]),
  nodesRemoved: Object.freeze([]),
  nodesUpdated: Object.freeze([]),
  edgesAdded: Object.freeze([]),
  edgesRemoved: Object.freeze([]),
})

/** Return an empty diff record. */
export function emptyDiff(): GraphDiff {
  return { nodesAdded: [], nodesRemoved: [], nodesUpdated: [], edgesAdded: [], edgesRemoved: [] }
}

/** Return whether a diff contains no graph changes. */
export function isEmptyDiff(diff: GraphDiff): boolean {
  return diff.nodesAdded.length === 0
    && diff.nodesRemoved.length === 0
    && diff.nodesUpdated.length === 0
    && diff.edgesAdded.length === 0
    && diff.edgesRemoved.length === 0
}

/** Merge several diffs into one (import rebuilds record at most one revision). */
export function mergeDiffs(diffs: readonly GraphDiff[]): GraphDiff {
  const nodesAdded: string[] = []
  const nodesRemoved: string[] = []
  const edgesAdded: string[] = []
  const edgesRemoved: string[] = []
  const updated = new Map<string, Set<string>>()
  for (const diff of diffs) {
    nodesAdded.push(...diff.nodesAdded)
    nodesRemoved.push(...diff.nodesRemoved)
    edgesAdded.push(...diff.edgesAdded)
    edgesRemoved.push(...diff.edgesRemoved)
    for (const entry of diff.nodesUpdated) {
      const fields = updated.get(entry.id) ?? new Set<string>()
      for (const field of entry.fields) fields.add(field)
      updated.set(entry.id, fields)
    }
  }
  return {
    nodesAdded,
    nodesRemoved,
    edgesAdded,
    edgesRemoved,
    nodesUpdated: [...updated.entries()].map(([id, fields]) => ({ id, fields: [...fields] })),
  }
}

/** Return whether a value is one of the admitted node kinds. */
export function isNodeKind(value: unknown): value is NodeKind {
  return typeof value === 'string' && (NODE_KINDS as readonly string[]).includes(value)
}

/** Return whether a value is one of the admitted edge kinds. */
export function isEdgeKind(value: unknown): value is EdgeKind {
  return typeof value === 'string' && (EDGE_KINDS as readonly string[]).includes(value)
}

/** Deterministic edge id; identical (from, to, kind) triples share one edge. */
export function edgeIdOf(from: string, to: string, kind: EdgeKind): string {
  return `${kind}:${from}→${to}`
}

/** Compare lossless JSON values without depending on object key order. */
export function jsonEqual(left: JsonValue, right: JsonValue): boolean {
  if (left === right) return true
  if (typeof left !== typeof right || left === null || right === null) return false
  if (Array.isArray(left) || Array.isArray(right)) {
    return Array.isArray(left) && Array.isArray(right)
      && left.length === right.length
      && left.every((entry, index) => jsonEqual(entry, right[index] as JsonValue))
  }
  if (typeof left === 'object' && typeof right === 'object') {
    const leftKeys = Object.keys(left).sort()
    const rightKeys = Object.keys(right).sort()
    return jsonEqual(leftKeys, rightKeys)
      && leftKeys.every(key => jsonEqual(left[key] as JsonValue, right[key] as JsonValue))
  }
  return false
}

function assertNodeId(id: unknown): asserts id is string {
  if (typeof id !== 'string' || !NODE_ID.test(id)) {
    throw new GraphError('INVALID_NODE_ID', `node id must be a non-empty string of at most 256 non-whitespace characters, got ${JSON.stringify(id)}`)
  }
}

function slugify(title: string): string {
  const slug = title
    .toLowerCase()
    .replace(/[^\p{Letter}\p{Number}]+/gu, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48)
  return slug.length > 0 ? slug : 'node'
}

function validateMetadataReferences(metadata: Record<string, JsonValue>, has: (id: string) => boolean, subject: string): void {
  const references = metadata.references
  if (references === undefined) return
  if (!Array.isArray(references) || references.some(entry => typeof entry !== 'string')) {
    throw new GraphError('INVALID_METADATA', `${subject}: metadata.references must be an array of node ids`)
  }
  for (const reference of references as string[]) {
    if (!has(reference)) {
      throw new GraphError('MISSING_NODE', `${subject}: metadata.references points at missing node "${reference}"`)
    }
  }
}

/** Mutable in-memory graph; every rule violation throws a {@link GraphError}. */
export class GraphEngine {
  /** Live node table, keyed by id. */
  readonly nodes = new Map<string, GraphNode>()
  /** Live edge table, keyed by {@link edgeIdOf}. */
  readonly edges = new Map<string, GraphEdge>()

  constructor(private readonly now: () => number = () => Date.now()) {}

  /**
   * Restore durable state without applying rules; the loader validates the
   * file shape before calling this. Import-managed invariants are re-checked
   * by {@link GraphEngine.audit}, not rejected here, so a hand-edited file
   * stays inspectable.
   */
  restore(nodes: readonly GraphNode[], edges: readonly GraphEdge[]): void {
    this.nodes.clear()
    this.edges.clear()
    for (const node of nodes) this.nodes.set(node.id, node)
    for (const edge of edges) this.edges.set(edge.id, edge)
  }

  /**
   * Add a node. Duplicate ids and dangling `metadata.references` are rejected.
   * @param input - node fields; `id` may be omitted to derive one.
   * @returns the stored node and the diff it produced.
   */
  createNode(input: NodeInput): { node: GraphNode; diff: GraphDiff } {
    if (!isNodeKind(input.kind)) {
      throw new GraphError('INVALID_NODE_KIND', `node kind must be one of ${NODE_KINDS.join('/')}, got ${JSON.stringify(input.kind)}`)
    }
    if (typeof input.title !== 'string' || input.title.trim().length === 0) {
      throw new GraphError('INVALID_NODE_TITLE', 'node title must be a non-empty string')
    }
    let id = input.id
    if (id === undefined) {
      const base = `${input.kind}:${slugify(input.title)}`
      id = base
      for (let suffix = 2; this.nodes.has(id); suffix += 1) id = `${base}-${suffix}`
    }
    assertNodeId(id)
    if (this.nodes.has(id)) {
      throw new GraphError('DUPLICATE_NODE', `node "${id}" already exists`)
    }
    const metadata = input.metadata ?? {}
    validateMetadataReferences(metadata, candidate => this.nodes.has(candidate), `node "${id}"`)
    const at = this.now()
    const node: GraphNode = Object.freeze({
      id,
      kind: input.kind,
      title: input.title,
      content: input.content ?? '',
      metadata,
      createdAt: at,
      updatedAt: at,
    })
    this.nodes.set(id, node)
    return { node, diff: { ...emptyDiff(), nodesAdded: [id] } }
  }

  /**
   * Read one node.
   * @param id - node id.
   * @returns the node, or `undefined` when absent.
   */
  getNode(id: string): GraphNode | undefined {
    return this.nodes.get(id)
  }

  /**
   * Patch one node; `metadata` replaces the whole record.
   * @param id - existing node id.
   * @param patch - fields to replace.
   * @returns the updated node and the diff it produced.
   */
  updateNode(id: string, patch: NodePatch): { node: GraphNode; diff: GraphDiff } {
    const current = this.nodes.get(id)
    if (current === undefined) throw new GraphError('MISSING_NODE', `node "${id}" does not exist`)
    if (patch.title !== undefined && patch.title.trim().length === 0) {
      throw new GraphError('INVALID_NODE_TITLE', 'node title must be a non-empty string')
    }
    if (patch.metadata !== undefined) {
      validateMetadataReferences(patch.metadata, candidate => this.nodes.has(candidate), `node "${id}"`)
    }
    const fields: string[] = []
    if (patch.title !== undefined && patch.title !== current.title) fields.push('title')
    if (patch.content !== undefined && patch.content !== current.content) fields.push('content')
    if (patch.metadata !== undefined && !jsonEqual(patch.metadata, current.metadata)) fields.push('metadata')
    if (fields.length === 0) return { node: current, diff: emptyDiff() }
    const node: GraphNode = Object.freeze({
      ...current,
      ...(patch.title === undefined ? {} : { title: patch.title }),
      ...(patch.content === undefined ? {} : { content: patch.content }),
      ...(patch.metadata === undefined ? {} : { metadata: patch.metadata }),
      updatedAt: this.now(),
    })
    this.nodes.set(id, node)
    return { node, diff: { ...emptyDiff(), nodesUpdated: [{ id, fields }] } }
  }

  /**
   * Remove one node. Nodes with incident edges are rejected unless `cascade`
   * removes those edges in the same diff — the API never leaves dangling edges.
   * @param id - existing node id.
   * @param cascade - also remove every incident edge.
   * @returns the diff the removal produced.
   */
  removeNode(id: string, cascade = false): GraphDiff {
    if (!this.nodes.has(id)) throw new GraphError('MISSING_NODE', `node "${id}" does not exist`)
    const incident = [...this.edges.values()].filter(edge => edge.from === id || edge.to === id)
    if (incident.length > 0 && !cascade) {
      throw new GraphError(
        'NODE_HAS_EDGES',
        `node "${id}" still has ${incident.length} incident edge(s); pass cascade to remove them together`,
      )
    }
    this.nodes.delete(id)
    for (const edge of incident) this.edges.delete(edge.id)
    return {
      ...emptyDiff(),
      nodesRemoved: [id],
      edgesRemoved: incident.map(edge => edge.id),
    }
  }

  /**
   * Add an edge. Both endpoints must exist; self edges and duplicate
   * (from, to, kind) triples are rejected, so the graph can never gain a
   * dangling or repeated relation through the API.
   * @param input - endpoints, kind, and optional metadata.
   * @returns the stored edge and the diff it produced.
   */
  addEdge(input: EdgeInput): { edge: GraphEdge; diff: GraphDiff } {
    if (!isEdgeKind(input.kind)) {
      throw new GraphError('INVALID_EDGE_KIND', `edge kind must be one of ${EDGE_KINDS.join('/')}, got ${JSON.stringify(input.kind)}`)
    }
    if (!this.nodes.has(input.from)) throw new GraphError('MISSING_NODE', `edge source node "${input.from}" does not exist`)
    if (!this.nodes.has(input.to)) throw new GraphError('MISSING_NODE', `edge target node "${input.to}" does not exist`)
    if (input.from === input.to) throw new GraphError('SELF_EDGE', `edge "${input.from}" → "${input.to}" loops onto the same node`)
    const id = edgeIdOf(input.from, input.to, input.kind)
    if (this.edges.has(id)) {
      throw new GraphError('DUPLICATE_EDGE', `edge "${id}" already exists`)
    }
    const edge: GraphEdge = Object.freeze({
      id,
      from: input.from,
      to: input.to,
      kind: input.kind,
      metadata: input.metadata ?? {},
      createdAt: this.now(),
    })
    this.edges.set(id, edge)
    return { edge, diff: { ...emptyDiff(), edgesAdded: [id] } }
  }

  /**
   * Remove one edge by id or by its (from, to, kind) triple.
   * @param ref - edge id or triple.
   * @returns the diff the removal produced.
   */
  removeEdge(ref: string | { from: string; to: string; kind: EdgeKind }): GraphDiff {
    const id = typeof ref === 'string' ? ref : edgeIdOf(ref.from, ref.to, ref.kind)
    if (!this.edges.delete(id)) throw new GraphError('MISSING_EDGE', `edge "${id}" does not exist`)
    return { ...emptyDiff(), edgesRemoved: [id] }
  }

  /**
   * List nodes, optionally restricted to one kind.
   * @param kind - optional kind filter.
   * @returns nodes sorted by id.
   */
  listNodes(kind?: NodeKind): GraphNode[] {
    return [...this.nodes.values()]
      .filter(node => kind === undefined || node.kind === kind)
      .sort((left, right) => left.id < right.id ? -1 : 1)
  }

  /**
   * Full-text search over title, content, and metadata. The lowercase query
   * is matched as a whole phrase and per whitespace-separated token, which
   * covers both space-separated languages and unsegmented CJK text.
   * @param query - free-text query.
   * @param options - optional kind restriction and result cap.
   * @returns hits ordered by descending score.
   */
  search(query: string, options: { kinds?: readonly NodeKind[]; limit?: number } = {}): SearchHit[] {
    const phrase = query.trim().toLowerCase()
    if (phrase.length === 0) return []
    const tokens = phrase.split(/\s+/u).filter(token => token.length > 0)
    const kinds = options.kinds === undefined ? undefined : new Set<string>(options.kinds)
    const hits: SearchHit[] = []
    for (const node of this.nodes.values()) {
      if (kinds !== undefined && !kinds.has(node.kind)) continue
      const fields: ['title' | 'content' | 'metadata', string][] = [
        ['title', node.title.toLowerCase()],
        ['content', node.content.toLowerCase()],
        ['metadata', JSON.stringify(node.metadata).toLowerCase()],
      ]
      let score = 0
      const matches: ('title' | 'content' | 'metadata')[] = []
      for (const [field, text] of fields) {
        let fieldScore = 0
        if (text.includes(phrase)) fieldScore += 10
        for (const token of tokens) {
          if (text.includes(token)) fieldScore += 1
        }
        if (fieldScore > 0) {
          score += fieldScore * (field === 'title' ? 3 : 1)
          matches.push(field)
        }
      }
      if (score > 0) hits.push({ node, score, matches })
    }
    hits.sort((left, right) => right.score - left.score || (left.node.id < right.node.id ? -1 : 1))
    return hits.slice(0, options.limit ?? 50)
  }

  /**
   * List incoming edges of one node with their resolved source nodes.
   * @param id - target node id.
   * @returns backlinks sorted by edge id.
   */
  backlinks(id: string): Backlink[] {
    if (!this.nodes.has(id)) throw new GraphError('MISSING_NODE', `node "${id}" does not exist`)
    return [...this.edges.values()]
      .filter(edge => edge.to === id)
      .sort((left, right) => left.id < right.id ? -1 : 1)
      .map(edge => ({ edge, from: this.nodes.get(edge.from) }))
  }

  /**
   * Audit referential integrity and connectivity. API mutations cannot create
   * the reported defects; they surface after hand-edited store files or
   * partially migrated imports.
   * @returns the full integrity report.
   */
  audit(): GraphAudit {
    const brokenEdges = [...this.edges.values()].filter(edge => !this.nodes.has(edge.from) || !this.nodes.has(edge.to))
    const brokenRefs: { node: string; reference: string }[] = []
    const unresolvedRefs: { node: string; target: string }[] = []
    for (const node of this.nodes.values()) {
      const references = node.metadata.references
      if (Array.isArray(references)) {
        for (const reference of references) {
          if (typeof reference === 'string' && !this.nodes.has(reference)) brokenRefs.push({ node: node.id, reference })
        }
      }
      const unresolved = node.metadata.unresolvedRefs
      if (Array.isArray(unresolved)) {
        for (const target of unresolved) {
          if (typeof target === 'string') unresolvedRefs.push({ node: node.id, target })
        }
      }
    }
    const connected = new Set<string>()
    for (const edge of this.edges.values()) {
      connected.add(edge.from)
      connected.add(edge.to)
    }
    const orphans = [...this.nodes.keys()].filter(id => !connected.has(id))
    return { brokenEdges, brokenRefs, orphans, unresolvedRefs }
  }

  /**
   * Summarize the graph.
   * @param revision - current store revision, echoed into the result.
   * @returns node and edge counts grouped by kind.
   */
  stats(revision: number): GraphStats {
    const nodesByKind: Record<string, number> = {}
    const edgesByKind: Record<string, number> = {}
    for (const node of this.nodes.values()) nodesByKind[node.kind] = (nodesByKind[node.kind] ?? 0) + 1
    for (const edge of this.edges.values()) edgesByKind[edge.kind] = (edgesByKind[edge.kind] ?? 0) + 1
    return { revision, nodes: this.nodes.size, edges: this.edges.size, nodesByKind, edgesByKind }
  }
}
