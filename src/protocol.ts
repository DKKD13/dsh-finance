/**
 * Stable command request/response protocol of `dsh-research-graph`.
 *
 * The same dispatcher backs the agent tools (`research_graph_*`) and the
 * `/research-graph` slash command (JSON mode: the command line is one JSON
 * request object). A Client reaches it through
 * `ctx.remote.commands.execute(sessionId, '/research-graph ' + JSON.stringify(request), [])`
 * and reads the JSON {@link GraphResponse} from the command result text.
 *
 * Request validation lives here at this wire boundary; every failure is a
 * structured `{ ok: false, error: { code, message } }`, never a throw.
 * @module dsh-research-graph/protocol
 */

import { GraphError, isEdgeKind, isNodeKind } from './graph.ts'
import type { EdgeKind, JsonValue, NodeKind } from './graph.ts'
import type { ResearchGraphService } from './service.ts'
import type { GraphPlan } from './plan.ts'

/** Every operation the dispatcher admits. */
export const GRAPH_OPS = [
  'node.create',
  'node.get',
  'node.update',
  'node.remove',
  'node.list',
  'edge.add',
  'edge.remove',
  'search',
  'backlinks',
  'audit',
  'stats',
  'diff',
  'graph.plan',
  'graph.snapshot',
  'history.list',
  'skills.rebuild',
  'export.markdown',
] as const

/** One admitted operation tag. */
export type GraphOp = typeof GRAPH_OPS[number]

/** Wire request: an operation tag plus its operation-specific fields. */
export interface GraphRequest {
  readonly op: GraphOp
  readonly id?: string
  readonly node?: {
    readonly id?: string
    readonly kind: NodeKind
    readonly title: string
    readonly content?: string
    readonly metadata?: Record<string, JsonValue>
  }
  readonly patch?: {
    readonly title?: string
    readonly content?: string
    readonly metadata?: Record<string, JsonValue>
  }
  readonly cascade?: boolean
  readonly kind?: NodeKind
  readonly edge?: {
    readonly from: string
    readonly to: string
    readonly kind: EdgeKind
    readonly metadata?: Record<string, JsonValue>
  }
  readonly edgeId?: string
  readonly query?: string
  readonly kinds?: readonly NodeKind[]
  readonly limit?: number
  readonly from?: number
  readonly to?: number
  readonly dir?: string
  readonly plan?: GraphPlan
  /** Wire payloads may carry fields newer readers ignore. */
  readonly [extra: string]: unknown
}

/** Successful wire response. */
export interface GraphSuccess {
  readonly ok: true
  /** Revision after the request (unchanged for reads). */
  readonly revision: number
  /** Operation-specific result payload. */
  readonly result: JsonValue
}

/** Failed wire response; `code` is stable for programmatic handling. */
export interface GraphFailure {
  readonly ok: false
  readonly error: {
    readonly code: string
    readonly message: string
  }
}

/** The wire response union every caller receives. */
export type GraphResponse = GraphSuccess | GraphFailure

function fail(code: string, message: string): GraphFailure {
  return { ok: false, error: { code, message } }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/** Round-trip a JSON-safe value into the lossless {@link JsonValue} domain. */
function toJson(value: unknown): JsonValue {
  const parsed: JsonValue = JSON.parse(JSON.stringify(value))
  return parsed
}

function requireString(request: Record<string, unknown>, field: string): string {
  const value = request[field]
  if (typeof value !== 'string' || value.length === 0) {
    throw new GraphError('INVALID_REQUEST', `request field "${field}" must be a non-empty string`)
  }
  return value
}

function optionalKinds(value: unknown): NodeKind[] | undefined {
  if (value === undefined) return undefined
  if (!Array.isArray(value) || value.some(entry => !isNodeKind(entry))) {
    throw new GraphError('INVALID_REQUEST', `request field "kinds" must be an array of node kinds (${JSON.stringify(value)})`)
  }
  return value as NodeKind[]
}

function optionalLimit(value: unknown): number | undefined {
  if (value === undefined) return undefined
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 1) {
    throw new GraphError('INVALID_REQUEST', 'request field "limit" must be a positive safe integer')
  }
  return value
}

function requireNodeKind(value: unknown, field: string): NodeKind {
  if (!isNodeKind(value)) throw new GraphError('INVALID_REQUEST', `request field "${field}" must be a node kind`)
  return value
}

function requireEdgeKind(value: unknown, field: string): EdgeKind {
  if (!isEdgeKind(value)) throw new GraphError('INVALID_REQUEST', `request field "${field}" must be an edge kind`)
  return value
}

function optionalMetadata(value: unknown, field: string): Record<string, JsonValue> | undefined {
  if (value === undefined) return undefined
  if (!isRecord(value)) throw new GraphError('INVALID_REQUEST', `request field "${field}" must be an object`)
  return value as Record<string, JsonValue>
}

/** Spread an optional metadata field into a request-mapped object. */
function withMetadata(value: unknown, field: string): { metadata: Record<string, JsonValue> } | Record<string, never> {
  const metadata = optionalMetadata(value, field)
  return metadata === undefined ? {} : { metadata }
}

/**
 * Execute one wire request against the shared service. Invalid requests and
 * domain failures settle as {@link GraphFailure}; unexpected errors surface
 * with code `INTERNAL`.
 * @param graph - the mounted research-graph service.
 * @param request - one parsed request object.
 * @returns the wire response.
 */
export async function executeGraphRequest(graph: ResearchGraphService, request: GraphRequest): Promise<GraphResponse> {
  try {
    return await dispatch(graph, request)
  } catch (error: unknown) {
    if (error instanceof GraphError) return fail(error.code, error.message)
    return fail('INTERNAL', error instanceof Error ? error.message : String(error))
  }
}

async function dispatch(graph: ResearchGraphService, request: GraphRequest): Promise<GraphResponse> {
  const raw: Record<string, unknown> = request
  switch (request.op) {
    case 'node.create': {
      const node = raw.node
      if (!isRecord(node)) throw new GraphError('INVALID_REQUEST', 'node.create requires a "node" object')
      const input = {
        ...(typeof node.id === 'string' ? { id: node.id } : {}),
        kind: requireNodeKind(node.kind, 'node.kind'),
        title: requireString(node, 'title'),
        ...(typeof node.content === 'string' ? { content: node.content } : {}),
        ...withMetadata(node.metadata, 'node.metadata'),
      }
      const { revision, node: created } = await graph.createNode(input)
      return { ok: true, revision, result: toJson(created) }
    }
    case 'node.get': {
      const id = requireString(raw, 'id')
      const node = await graph.getNode(id)
      if (node === undefined) throw new GraphError('MISSING_NODE', `node "${id}" does not exist`)
      return { ok: true, revision: await graph.currentRevision(), result: toJson(node) }
    }
    case 'node.update': {
      const id = requireString(raw, 'id')
      const patch = raw.patch
      if (!isRecord(patch)) throw new GraphError('INVALID_REQUEST', 'node.update requires a "patch" object')
      const { revision, node } = await graph.updateNode(id, {
        ...(typeof patch.title === 'string' ? { title: patch.title } : {}),
        ...(typeof patch.content === 'string' ? { content: patch.content } : {}),
        ...withMetadata(patch.metadata, 'patch.metadata'),
      })
      return { ok: true, revision, result: toJson(node) }
    }
    case 'node.remove': {
      const id = requireString(raw, 'id')
      const { revision } = await graph.removeNode(id, raw.cascade === true)
      return { ok: true, revision, result: { removed: id } }
    }
    case 'node.list': {
      const kind = raw.kind === undefined ? undefined : requireNodeKind(raw.kind, 'kind')
      const nodes = await graph.listNodes(kind)
      return { ok: true, revision: await graph.currentRevision(), result: toJson(nodes) }
    }
    case 'edge.add': {
      const edge = raw.edge
      if (!isRecord(edge)) throw new GraphError('INVALID_REQUEST', 'edge.add requires an "edge" object')
      const { revision, edge: created } = await graph.addEdge({
        from: requireString(edge, 'from'),
        to: requireString(edge, 'to'),
        kind: requireEdgeKind(edge.kind, 'edge.kind'),
        ...withMetadata(edge.metadata, 'edge.metadata'),
      })
      return { ok: true, revision, result: toJson(created) }
    }
    case 'edge.remove': {
      if (typeof raw.edgeId === 'string') {
        const { revision } = await graph.removeEdge(raw.edgeId)
        return { ok: true, revision, result: { removed: raw.edgeId } }
      }
      const edge = raw.edge
      if (!isRecord(edge)) throw new GraphError('INVALID_REQUEST', 'edge.remove requires "edgeId" or an "edge" object with from/to/kind')
      const { revision } = await graph.removeEdge({
        from: requireString(edge, 'from'),
        to: requireString(edge, 'to'),
        kind: requireEdgeKind(edge.kind, 'edge.kind'),
      })
      return { ok: true, revision, result: { removed: `${requireEdgeKind(edge.kind, 'edge.kind')}:${requireString(edge, 'from')}→${requireString(edge, 'to')}` } }
    }
    case 'search': {
      const kinds = optionalKinds(raw.kinds)
      const limit = optionalLimit(raw.limit)
      const hits = await graph.search(requireString(raw, 'query'), {
        ...(kinds === undefined ? {} : { kinds }),
        ...(limit === undefined ? {} : { limit }),
      })
      return { ok: true, revision: await graph.currentRevision(), result: toJson(hits) }
    }
    case 'backlinks': {
      const links = await graph.backlinks(requireString(raw, 'id'))
      return { ok: true, revision: await graph.currentRevision(), result: toJson(links) }
    }
    case 'audit':
      return { ok: true, revision: await graph.currentRevision(), result: toJson(await graph.audit()) }
    case 'stats':
      return { ok: true, revision: await graph.currentRevision(), result: toJson(await graph.stats()) }
    case 'diff': {
      const from = raw.from
      if (typeof from !== 'number' || !Number.isSafeInteger(from) || from < 0) {
        throw new GraphError('INVALID_REQUEST', 'diff requires "from" as a non-negative safe integer')
      }
      const to = raw.to
      const diff = await graph.diffRevisions(from, typeof to === 'number' ? to : undefined)
      return { ok: true, revision: await graph.currentRevision(), result: toJson(diff) }
    }
    case 'graph.plan': {
      if (!isRecord(raw.plan)) throw new GraphError('INVALID_REQUEST', 'graph.plan requires a "plan" object')
      const applied = await graph.applyPlan(raw.plan as unknown as GraphPlan)
      return { ok: true, revision: applied.revision, result: toJson({ changed: applied.result.changed, nodes: applied.result.nodes, edges: applied.result.edges, diff: applied.diff }) }
    }
    case 'graph.snapshot': {
      const snapshot = await graph.snapshot()
      return { ok: true, revision: snapshot.revision, result: toJson(snapshot) }
    }
    case 'history.list': {
      const history = await graph.revisionHistory()
      return { ok: true, revision: history.revision, result: toJson(history) }
    }
    case 'skills.rebuild': {
      const { revision, report } = await graph.rebuildFromSkills()
      return { ok: true, revision, result: toJson(report) }
    }
    case 'export.markdown': {
      const dir = typeof raw.dir === 'string' ? raw.dir : undefined
      const written = await graph.exportMarkdown(dir)
      return { ok: true, revision: await graph.currentRevision(), result: toJson(written) }
    }
    default:
      return fail('UNKNOWN_OP', `unknown op ${JSON.stringify((request as { op?: unknown }).op)}; admitted ops: ${GRAPH_OPS.join(', ')}`)
  }
}

/**
 * Parse a slash-command line payload into a wire request.
 * @param text - trimmed command input.
 * @returns the parsed request, or `undefined` when the text is not JSON.
 */
export function parseRequestJson(text: string): GraphRequest | undefined {
  const trimmed = text.trim()
  if (!trimmed.startsWith('{')) return undefined
  const parsed: unknown = JSON.parse(trimmed)
  if (!isRecord(parsed) || typeof parsed.op !== 'string') {
    throw new GraphError('INVALID_REQUEST', 'request must be a JSON object with a string "op"')
  }
  return parsed as GraphRequest
}
