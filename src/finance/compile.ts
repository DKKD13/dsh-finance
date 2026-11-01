import { createHash } from 'node:crypto'
import { GraphError } from '../graph.ts'
import type { GraphNode, JsonValue } from '../graph.ts'
import type { GraphPlan } from '../plan.ts'
import { effectiveAvailableAt, hashJson, isYahooHistoryNode, timestamp } from './metadata.ts'
import type { CompilePrepareInput, JsonObject } from './types.ts'

const COMPILER_NODE_KINDS = new Set(['session', 'question', 'claim', 'belief', 'signal'])

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function requiredRunId(value: unknown): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new GraphError('INVALID_REQUEST', 'runId must be a non-empty string')
  }
  return value
}

function stringValue(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim().length > 0 ? value : undefined
}

function provenanceOf(node: GraphNode): JsonObject | undefined {
  const provenance = node.metadata.provenance
  return isRecord(provenance) ? provenance as JsonObject : undefined
}

function rawFor(source: GraphNode, nodes: readonly GraphNode[]): { raw?: GraphNode; code?: string; message?: string } {
  const provenance = provenanceOf(source)
  const linked = stringValue(source.metadata.rawId) ?? stringValue(provenance?.rawId)
  if (linked !== undefined) {
    const raw = nodes.find(node => node.id === linked)
    if (raw === undefined) return { code: 'MISSING_RAW', message: `linked raw node "${linked}" does not exist` }
    if (raw.kind !== 'raw') return { code: 'INVALID_RAW', message: `linked node "${linked}" is ${raw.kind}, not raw` }
    return { raw }
  }
  const candidates = nodes.filter(node => node.kind === 'raw' && node.metadata.sourceId === source.id)
  if (candidates.length === 0) return { code: 'MISSING_RAW', message: `source "${source.id}" has no linked raw node` }
  if (candidates.length > 1) return { code: 'AMBIGUOUS_RAW', message: `source "${source.id}" has more than one linked raw node` }
  return { raw: candidates[0] as GraphNode }
}

function captureFor(source: GraphNode, raw: GraphNode, nodes: readonly GraphNode[]): GraphNode | undefined {
  const id = stringValue(raw.metadata.captureId) ?? stringValue(source.metadata.captureId)
  return id === undefined ? undefined : nodes.find(node => node.id === id)
}

function readinessFailure(node: GraphNode): { code: string; message: string } | undefined {
  const status = node.metadata.status
  if (node.metadata.quarantined === true || status === 'quarantined' || status === 'rejected') {
    return { code: 'QUARANTINED', message: `${node.kind} "${node.id}" is quarantined or rejected` }
  }
  if (status !== undefined && status !== 'accepted' && status !== 'ready') {
    return { code: 'NOT_READY', message: `${node.kind} "${node.id}" has non-ready status ${JSON.stringify(status)}` }
  }
  return undefined
}

function temporalFailure(node: GraphNode, asOf: string): { code: string; message: string } | undefined {
  const availableAt = effectiveAvailableAt(node)
  const nodeAsOf = node.metadata.asOf
  if (availableAt === undefined || typeof nodeAsOf !== 'string') {
    return { code: 'INVALID_LINEAGE', message: `${node.kind} "${node.id}" requires availableAt and asOf` }
  }
  try {
    if (availableAt.milliseconds > timestamp(asOf, 'asOf')
      || timestamp(nodeAsOf, `${node.id}.asOf`) > timestamp(asOf, 'asOf')) {
      return { code: 'FUTURE_DATA', message: `${node.kind} "${node.id}" was not available by ${asOf}` }
    }
  } catch (error: unknown) {
    return { code: 'INVALID_LINEAGE', message: error instanceof Error ? error.message : String(error) }
  }
  return undefined
}

function locatorsFor(source: GraphNode, raw: GraphNode, capture: GraphNode | undefined, provenance: JsonObject): JsonValue[] {
  const locators: JsonValue[] = []
  for (const node of [raw, source, ...(capture === undefined ? [] : [capture])]) {
    const values = node.metadata.locators
    if (Array.isArray(values)) locators.push(...values)
  }
  if (provenance.locator !== undefined) locators.push(provenance.locator)
  const annotations = capture?.metadata.annotations
  if (Array.isArray(annotations)) {
    for (const annotation of annotations) {
      if (isRecord(annotation) && annotation.locator !== undefined) locators.push(annotation.locator as JsonValue)
    }
  }
  const seen = new Set<string>()
  return locators.filter(locator => {
    const key = JSON.stringify(locator)
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

function contentHash(content: string): string {
  return `sha256:${createHash('sha256').update(content, 'utf8').digest('hex')}`
}

export function prepareCompilationCandidates(
  nodes: readonly GraphNode[],
  input: CompilePrepareInput,
  preparedAt = new Date().toISOString(),
): JsonObject {
  const runId = requiredRunId(input.runId)
  timestamp(input.asOf, 'asOf')
  timestamp(preparedAt, 'preparedAt')
  if (!Array.isArray(input.sourceIds) || input.sourceIds.length === 0 || input.sourceIds.length > 500
    || input.sourceIds.some(id => typeof id !== 'string' || id.trim().length === 0)) {
    throw new GraphError('INVALID_REQUEST', 'sourceIds must contain between 1 and 500 non-empty source node ids')
  }
  if (new Set(input.sourceIds).size !== input.sourceIds.length) {
    throw new GraphError('INVALID_REQUEST', 'sourceIds must not contain duplicates')
  }
  const byId = new Map(nodes.map(node => [node.id, node]))
  const candidates: JsonObject[] = []
  const rejected: JsonObject[] = []
  const reject = (sourceId: string, code: string, message: string, rawId?: string) => {
    rejected.push({ sourceId, ...(rawId === undefined ? {} : { rawId }), code, message })
  }

  for (const sourceId of input.sourceIds) {
    const source = byId.get(sourceId)
    if (source === undefined) {
      reject(sourceId, 'MISSING_SOURCE', `source "${sourceId}" does not exist`)
      continue
    }
    if (source.kind !== 'source') {
      reject(sourceId, 'INVALID_SOURCE', `node "${sourceId}" is ${source.kind}, not source`)
      continue
    }
    const linked = rawFor(source, nodes)
    if (linked.raw === undefined) {
      reject(sourceId, linked.code ?? 'MISSING_RAW', linked.message ?? `source "${sourceId}" has no usable raw node`)
      continue
    }
    const raw = linked.raw
    const capture = captureFor(source, raw, nodes)
    const failure = readinessFailure(source) ?? readinessFailure(raw)
      ?? temporalFailure(source, input.asOf) ?? temporalFailure(raw, input.asOf)
    if (failure !== undefined) {
      reject(sourceId, failure.code, failure.message, raw.id)
      continue
    }
    const sourceAvailableAt = effectiveAvailableAt(source)
    const rawAvailableAt = effectiveAvailableAt(raw)
    if (sourceAvailableAt === undefined || rawAvailableAt === undefined) {
      reject(sourceId, 'INVALID_LINEAGE', 'ready source/raw require valid availability', raw.id)
      continue
    }
    if (isYahooHistoryNode(source) && isYahooHistoryNode(raw) && sourceAvailableAt.value !== rawAvailableAt.value) {
      reject(sourceId, 'SOURCE_TIME_MISMATCH', `source/raw availability does not match for "${sourceId}"`, raw.id)
      continue
    }
    const sourceProvider = stringValue(source.metadata.provider)
    const rawProvider = stringValue(raw.metadata.provider)
    const provider = rawProvider ?? sourceProvider
    const rawSourceId = stringValue(raw.metadata.sourceId)
    if ((rawSourceId !== undefined && rawSourceId !== source.id)
      || (sourceProvider !== undefined && rawProvider !== undefined && sourceProvider !== rawProvider)) {
      reject(sourceId, 'SOURCE_RAW_MISMATCH', `source/raw lineage does not describe the same source for "${sourceId}"`, raw.id)
      continue
    }
    const sourceHash = stringValue(source.metadata.contentHash)
    const rawHash = stringValue(raw.metadata.contentHash)
    if (provider === undefined || sourceHash === undefined || rawHash === undefined) {
      reject(sourceId, 'INVALID_LINEAGE', 'ready source/raw require provider and contentHash', raw.id)
      continue
    }
    if (sourceHash !== rawHash || contentHash(raw.content) !== rawHash) {
      reject(sourceId, 'CONTENT_HASH_MISMATCH', `source/raw content hash does not match the stored raw content for "${sourceId}"`, raw.id)
      continue
    }
    const provenance = provenanceOf(raw) ?? provenanceOf(source) ?? (capture === undefined ? undefined : provenanceOf(capture))
    if (provenance === undefined) {
      reject(sourceId, 'MISSING_PROVENANCE', `source/raw "${sourceId}" has no provenance object`, raw.id)
      continue
    }
    candidates.push({
      sourceId,
      rawId: raw.id,
      ...(capture === undefined ? {} : { captureId: capture.id }),
      title: source.title,
      provider,
      canonicalUrl: stringValue(source.metadata.canonicalUrl) ?? stringValue(raw.metadata.canonicalUrl) ?? null,
      content: raw.content,
      contentHash: rawHash,
      asOf: raw.metadata.asOf as string,
      availableAt: rawAvailableAt.value,
      ...(stringValue(raw.metadata.fetchedAt) === undefined ? {} : { fetchedAt: raw.metadata.fetchedAt as string }),
      provenance,
      locators: locatorsFor(source, raw, capture, provenance),
      source: {
        ...source,
        metadata: { ...source.metadata, availableAt: sourceAvailableAt.value },
      } as unknown as JsonValue,
      raw: {
        ...raw,
        metadata: { ...raw.metadata, availableAt: rawAvailableAt.value },
      } as unknown as JsonValue,
      ...(capture === undefined ? {} : { capture: capture as unknown as JsonValue }),
    })
  }
  return {
    runId,
    compileRunId: runId,
    asOf: input.asOf,
    preparedAt,
    provider: 'knowledge-compiler',
    revision: 0,
    candidates,
    rejected,
    counts: { requested: input.sourceIds.length, ready: candidates.length, rejected: rejected.length },
  }
}

function finalizeMetadata(metadata: Record<string, JsonValue>, subject: JsonObject, nodeKind?: string): Record<string, JsonValue> {
  const compileRunId = requiredRunId(metadata.compileRunId)
  if (metadata.runId !== compileRunId) {
    throw new GraphError('INVALID_COMPILE_PLAN', 'compiler artifact metadata.runId must equal compileRunId')
  }
  for (const field of ['provider', 'asOf', 'availableAt'] as const) {
    if (stringValue(metadata[field]) === undefined) {
      throw new GraphError('INVALID_COMPILE_PLAN', `compiler artifact metadata.${field} must be a non-empty string`)
    }
  }
  timestamp(metadata.asOf, 'compiler metadata.asOf')
  timestamp(metadata.availableAt, 'compiler metadata.availableAt')
  if (!isRecord(metadata.provenance)) {
    throw new GraphError('INVALID_COMPILE_PLAN', 'compiler artifact metadata.provenance must be an object')
  }
  const dshSessionId = (metadata.provenance as JsonObject).dshSessionId
  if (dshSessionId !== undefined && stringValue(dshSessionId) === undefined) {
    throw new GraphError('INVALID_COMPILE_PLAN', 'provenance.dshSessionId must be a non-empty string when present')
  }
  if (nodeKind !== undefined && !COMPILER_NODE_KINDS.has(nodeKind)) {
    throw new GraphError('INVALID_COMPILE_PLAN', `knowledge-compiler cannot produce ${nodeKind} nodes`)
  }
  if (nodeKind === 'claim' && metadata.claimType !== 'hypothesis') {
    throw new GraphError('INVALID_COMPILE_PLAN', 'knowledge-compiler claim metadata.claimType must be "hypothesis"')
  }
  const { contentHash: supplied, ...withoutHash } = metadata
  const contentHash = hashJson({ ...subject, metadata: withoutHash })
  if (supplied !== undefined && supplied !== contentHash) {
    throw new GraphError('CONTENT_HASH_MISMATCH', 'compiler artifact contentHash does not match its canonical content and metadata')
  }
  return { ...withoutHash, contentHash }
}

/** Fill deterministic hashes for model-authored compiler artifacts before the existing atomic plan commit. */
export function finalizeCompilationPlan(plan: GraphPlan): GraphPlan {
  if (!Array.isArray(plan.nodes) || (plan.edges !== undefined && !Array.isArray(plan.edges))) return plan
  const compilation = plan.nodes.some(node => node.metadata?.compileRunId !== undefined)
    || plan.edges?.some(edge => edge.metadata?.compileRunId !== undefined) === true
  if (!compilation) return plan
  const records = [...plan.nodes, ...(plan.edges ?? [])]
  if (records.some(record => record.metadata?.compileRunId === undefined)) {
    throw new GraphError('INVALID_COMPILE_PLAN', 'every node and edge in a compilation plan must carry compileRunId')
  }
  const runIds = new Set(records.map(record => record.metadata?.compileRunId))
  if (runIds.size !== 1) throw new GraphError('INVALID_COMPILE_PLAN', 'one compilation plan must use exactly one compileRunId')
  const nodes = plan.nodes.map(node => ({
    ...node,
    metadata: finalizeMetadata(node.metadata ?? {}, {
      id: node.id,
      kind: node.kind,
      title: node.title,
      content: node.content ?? '',
    }, node.kind),
  }))
  const edges = plan.edges?.map(edge => ({
    ...edge,
    metadata: finalizeMetadata(edge.metadata ?? {}, { from: edge.from, to: edge.to, kind: edge.kind }),
  }))
  return { nodes, ...(edges === undefined ? {} : { edges }) }
}

export function compilationStatus(nodes: readonly GraphNode[], edges: readonly { id: string; metadata: Record<string, JsonValue> }[], runIdValue: unknown): JsonObject {
  const runId = requiredRunId(runIdValue)
  const artifacts = nodes.filter(node => node.metadata.compileRunId === runId)
  const relations = edges.filter(edge => edge.metadata.compileRunId === runId)
  const compiled = artifacts.some(node => node.kind === 'session' && node.metadata.status === 'compiled')
  const count = (kind: string) => artifacts.filter(node => node.kind === kind).length
  return {
    runId,
    status: artifacts.length === 0 ? 'not_found' : compiled ? 'compiled' : 'artifacts_present',
    scope: 'graph-artifacts-only',
    artifactIds: artifacts.map(node => node.id),
    edgeIds: relations.map(edge => edge.id),
    nodes: artifacts as unknown as JsonValue,
    edges: relations as unknown as JsonValue,
    counts: {
      nodes: artifacts.length,
      edges: relations.length,
      questions: count('question'),
      claims: count('claim'),
      beliefs: count('belief'),
      signals: count('signal'),
    },
  }
}
