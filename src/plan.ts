import { GraphEngine, GraphError, edgeIdOf, isEdgeKind, jsonEqual, mergeDiffs } from './graph.ts'
import type { EdgeInput, GraphDiff, GraphEdge, GraphNode, JsonValue, NodeInput } from './graph.ts'

/** A deterministic node upsert. Plans require explicit ids so repeats converge. */
export interface GraphPlanNode extends NodeInput {
  readonly id: string
}

/** A fully validated, idempotent graph mutation. */
export interface GraphPlan {
  readonly nodes: readonly GraphPlanNode[]
  readonly edges?: readonly EdgeInput[]
}

/** The plan records selected after applying every upsert. */
export interface GraphPlanResult {
  readonly changed: boolean
  readonly nodes: readonly GraphNode[]
  readonly edges: readonly GraphEdge[]
}

/** A plan applied to an isolated engine snapshot, ready for one durable commit. */
export interface PreparedGraphPlan {
  readonly diff: GraphDiff
  readonly result: GraphPlanResult
  readonly nodes: readonly GraphNode[]
  readonly edges: readonly GraphEdge[]
}

function validateReferences(
  metadata: Record<string, JsonValue> | undefined,
  nodes: ReadonlyMap<string, GraphNode>,
  subject: string,
): void {
  const references = metadata?.references
  if (references === undefined) return
  if (!Array.isArray(references) || references.some(reference => typeof reference !== 'string')) {
    throw new GraphError('INVALID_METADATA', `${subject}: metadata.references must be an array of node ids`)
  }
  for (const reference of references as string[]) {
    if (!nodes.has(reference)) {
      throw new GraphError('MISSING_NODE', `${subject}: metadata.references points at missing node "${reference}"`)
    }
  }
}

function withoutReferences(metadata: Record<string, JsonValue> | undefined): Record<string, JsonValue> | undefined {
  if (metadata?.references === undefined) return metadata
  const copy = { ...metadata }
  delete copy.references
  return copy
}

function changed(diff: GraphDiff): boolean {
  return diff.nodesAdded.length > 0
    || diff.nodesRemoved.length > 0
    || diff.nodesUpdated.length > 0
    || diff.edgesAdded.length > 0
    || diff.edgesRemoved.length > 0
}

/**
 * Validate and apply a plan against a clone. Forward metadata references are
 * legal, every edge endpoint is checked against the final node set, and an
 * exception leaves the live engine untouched.
 */
export function prepareGraphPlan(
  live: GraphEngine,
  plan: GraphPlan,
  now: () => number = () => Date.now(),
): PreparedGraphPlan {
  if (!Array.isArray(plan.nodes) || (plan.edges !== undefined && !Array.isArray(plan.edges))) {
    throw new GraphError('INVALID_PLAN', 'graph plan nodes must be an array and edges, when present, must be an array')
  }
  const finalNodes = new Map(live.nodes)
  const plannedIds = new Set<string>()
  for (const node of plan.nodes) {
    if (typeof node.id !== 'string' || node.id.length === 0) {
      throw new GraphError('INVALID_PLAN', 'every graph plan node requires a non-empty explicit id')
    }
    if (plannedIds.has(node.id)) throw new GraphError('DUPLICATE_NODE', `plan contains node "${node.id}" more than once`)
    plannedIds.add(node.id)
    const existing = live.getNode(node.id)
    if (existing !== undefined && existing.kind !== node.kind) {
      throw new GraphError('NODE_KIND_CONFLICT', `node "${node.id}" is already ${existing.kind}, not ${node.kind}`)
    }
    finalNodes.set(node.id, node as GraphNode)
  }
  for (const node of plan.nodes) validateReferences(node.metadata, finalNodes, `node "${node.id}"`)

  const edgeIds = new Set<string>()
  const edges = plan.edges ?? []
  for (const edge of edges) {
    if (!isEdgeKind(edge.kind)) throw new GraphError('INVALID_EDGE_KIND', `unknown plan edge kind ${JSON.stringify(edge.kind)}`)
    if (!finalNodes.has(edge.from)) throw new GraphError('MISSING_NODE', `edge source node "${edge.from}" does not exist in the final plan`)
    if (!finalNodes.has(edge.to)) throw new GraphError('MISSING_NODE', `edge target node "${edge.to}" does not exist in the final plan`)
    if (edge.from === edge.to) throw new GraphError('SELF_EDGE', `edge "${edge.from}" → "${edge.to}" loops onto the same node`)
    const id = edgeIdOf(edge.from, edge.to, edge.kind)
    if (edgeIds.has(id)) throw new GraphError('DUPLICATE_EDGE', `plan contains edge "${id}" more than once`)
    edgeIds.add(id)
    validateReferences(edge.metadata, finalNodes, `edge "${id}"`)
  }

  const scratch = new GraphEngine(now)
  scratch.restore([...live.nodes.values()], [...live.edges.values()])
  const diffs: GraphDiff[] = []
  for (const input of plan.nodes) {
    const current = scratch.getNode(input.id)
    const hasReferences = input.metadata?.references !== undefined
    if (current === undefined) {
      const created = scratch.createNode({ ...input, metadata: withoutReferences(input.metadata) })
      diffs.push(created.diff)
    } else {
      const updated = scratch.updateNode(input.id, {
        title: input.title,
        content: input.content ?? '',
        ...(hasReferences ? {} : { metadata: input.metadata ?? {} }),
      })
      diffs.push(updated.diff)
    }
  }
  for (const input of plan.nodes) {
    if (input.metadata?.references === undefined) continue
    diffs.push(scratch.updateNode(input.id, { metadata: input.metadata }).diff)
  }
  for (const input of edges) {
    const id = edgeIdOf(input.from, input.to, input.kind)
    const current = scratch.edges.get(id)
    if (current !== undefined && jsonEqual(current.metadata, input.metadata ?? {})) continue
    if (current !== undefined) diffs.push(scratch.removeEdge(id))
    diffs.push(scratch.addEdge(input).diff)
  }

  const diff = mergeDiffs(diffs)
  const result: GraphPlanResult = {
    changed: changed(diff),
    nodes: plan.nodes.map(node => scratch.getNode(node.id) as GraphNode),
    edges: edges.map(edge => scratch.edges.get(edgeIdOf(edge.from, edge.to, edge.kind)) as GraphEdge),
  }
  return { diff, result, nodes: [...scratch.nodes.values()], edges: [...scratch.edges.values()] }
}
