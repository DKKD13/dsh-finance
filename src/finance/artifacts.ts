import { GraphError } from '../graph.ts'
import type { EdgeKind, JsonValue, NodeKind } from '../graph.ts'
import type { GraphPlan, GraphPlanNode } from '../plan.ts'
import { artifactMetadata, canonicalJson, financeMetadata, hashId } from './metadata.ts'
import type { FinanceMetadataInput, JsonObject } from './types.ts'

const ARTIFACT_KINDS = new Set<NodeKind>(['claim', 'raw', 'source', 'deliverable', 'memory', 'signal', 'catalyst'])

function records(payload: JsonObject): JsonObject[] {
  for (const field of ['artifacts', 'researchArtifacts', 'evidenceCards'] as const) {
    const value = payload[field]
    if (value !== undefined) {
      if (!Array.isArray(value) || value.some(entry => typeof entry !== 'object' || entry === null || Array.isArray(entry))) {
        throw new GraphError('INVALID_ARTIFACT', `${field} must be an array of ResearchArtifact objects`)
      }
      return value as JsonObject[]
    }
  }
  if (typeof payload.artifact === 'object' && payload.artifact !== null && !Array.isArray(payload.artifact)) {
    return [payload.artifact as JsonObject]
  }
  return [payload]
}

function stringField(record: JsonObject, field: string): string | undefined {
  const value = record[field]
  return typeof value === 'string' && value.length > 0 ? value : undefined
}

function artifactInput(raw: JsonObject, sourceRefs: JsonValue[]): FinanceMetadataInput {
  const metadata = typeof raw.metadata === 'object' && raw.metadata !== null && !Array.isArray(raw.metadata)
    ? raw.metadata as FinanceMetadataInput
    : {} as FinanceMetadataInput
  const provenance = raw.provenance ?? metadata.provenance
  return {
    ...metadata,
    provider: stringField(raw, 'provider') ?? metadata.provider,
    asOf: stringField(raw, 'asOf') ?? metadata.asOf,
    availableAt: stringField(raw, 'availableAt') ?? metadata.availableAt,
    fetchedAt: stringField(raw, 'fetchedAt') ?? metadata.fetchedAt,
    contentHash: stringField(raw, 'contentHash') ?? metadata.contentHash,
    runId: stringField(raw, 'runId') ?? metadata.runId,
    ...(provenance === undefined ? {} : { provenance: provenance as JsonObject }),
    sourceRefs,
  } as FinanceMetadataInput
}

function refsOf(raw: JsonObject): JsonValue[] {
  const direct = raw.sourceRefs ?? raw.sources
  if (direct !== undefined) {
    if (!Array.isArray(direct)) throw new GraphError('INVALID_ARTIFACT', 'sourceRefs/sources must be an array')
    return direct
  }
  if (Array.isArray(raw.evidence)) {
    return raw.evidence.map(entry => {
      if (typeof entry !== 'object' || entry === null || Array.isArray(entry)) return entry
      const record = entry as JsonObject
      return record.sourceRef ?? record.source ?? record.url ?? entry
    })
  }
  return []
}

/** Build one idempotent plan for QuantMind evidence cards or DSA ResearchArtifact JSON. */
export function researchArtifactPlan(payload: JsonObject, existingNodeIds: ReadonlySet<string>): {
  plan: GraphPlan
  artifactIds: string[]
  sourceIds: string[]
} {
  const artifacts = records(payload)
  if (artifacts.length === 0) throw new GraphError('INVALID_ARTIFACT', 'at least one ResearchArtifact is required')
  const nodes = new Map<string, GraphPlanNode>()
  const edges: { from: string; to: string; kind: EdgeKind; metadata: Record<string, JsonValue> }[] = []
  const artifactIds: string[] = []
  const sourceIds: string[] = []

  for (const raw of artifacts) {
    const sourceRefs = refsOf(raw)
    const metadata = artifactMetadata(artifactInput(raw, sourceRefs))
    const requestedKind = stringField(raw, 'kind') ?? (raw.claim === undefined ? 'raw' : 'claim')
    if (!ARTIFACT_KINDS.has(requestedKind as NodeKind)) throw new GraphError('INVALID_ARTIFACT', `unsupported artifact node kind "${requestedKind}"`)
    const kind = requestedKind as NodeKind
    const id = stringField(raw, 'id') ?? stringField(raw, 'artifactId') ?? `${kind}:${hashId(raw)}`
    if (nodes.has(id)) throw new GraphError('DUPLICATE_NODE', `artifact "${id}" occurs more than once`)
    const title = stringField(raw, 'title') ?? stringField(raw, 'claim') ?? `Research artifact ${id}`
    const references: string[] = []
    for (const sourceRef of sourceRefs) {
      const source = typeof sourceRef === 'object' && sourceRef !== null && !Array.isArray(sourceRef) ? sourceRef : undefined
      const literal = typeof sourceRef === 'string' ? sourceRef : undefined
      if (literal !== undefined && existingNodeIds.has(literal)) {
        if (!references.includes(literal)) references.push(literal)
        continue
      }
      const sourceId = stringField(source ?? {}, 'id') ?? `source:${hashId(sourceRef)}`
      if (!sourceIds.includes(sourceId)) sourceIds.push(sourceId)
      if (!references.includes(sourceId)) references.push(sourceId)
      if (nodes.has(sourceId)) continue
      const sourceMetadataInput = artifactInput(source ?? {}, [])
      const hasIndependentLineage = source !== undefined
        && (sourceMetadataInput.provider !== undefined || sourceMetadataInput.contentHash !== undefined)
      const { contentHash: _artifactHash, ...inheritedMetadata } = metadata
      const sourceMetadata = hasIndependentLineage
        ? financeMetadata(sourceMetadataInput, sourceRef)
        : financeMetadata({ ...inheritedMetadata, runId: metadata.runId }, sourceRef)
      nodes.set(sourceId, {
        id: sourceId,
        kind: 'source',
        title: stringField(source ?? {}, 'title') ?? stringField(source ?? {}, 'url') ?? literal ?? sourceId,
        content: stringField(source ?? {}, 'content') ?? stringField(source ?? {}, 'url') ?? literal ?? canonicalJson(sourceRef),
        metadata: {
          ...sourceMetadata,
          sourceRef,
        },
      })
    }
    const content = stringField(raw, 'content') ?? stringField(raw, 'summary') ?? stringField(raw, 'claim') ?? canonicalJson(raw)
    nodes.set(id, {
      id,
      kind,
      title,
      content,
      metadata: {
        ...metadata,
        references,
        sourceRefs,
        researchArtifact: raw,
        artifactType: stringField(raw, 'artifactType') ?? stringField(raw, 'type') ?? 'ResearchArtifact',
      },
    })
    for (const reference of references) {
      edges.push({ from: id, to: reference, kind: 'cite', metadata: { runId: metadata.runId, contentHash: metadata.contentHash } })
    }
    artifactIds.push(id)
  }
  return { plan: { nodes: [...nodes.values()], edges }, artifactIds, sourceIds }
}
