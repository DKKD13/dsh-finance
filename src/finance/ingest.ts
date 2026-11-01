import { createHash } from 'node:crypto'
import { GraphError } from '../graph.ts'
import type { EdgeInput, GraphNode, JsonValue } from '../graph.ts'
import type { GraphPlan, GraphPlanNode } from '../plan.ts'
import { canonicalHttpUrl } from './http.ts'
import { canonicalJson, financeMetadata, hashId, jsonObject, timestamp } from './metadata.ts'
import type { JsonObject, SourceFailure, SourceItem } from './types.ts'

export interface IngestContext {
  readonly runId: string
  readonly asOf: string
  readonly fetchedAt: string
  readonly errors?: readonly SourceFailure[]
}

export interface IngestPlanPreview {
  readonly plan?: GraphPlan
  readonly sessionId?: string
  readonly sourceIds: string[]
  readonly rawIds: string[]
  readonly duplicates: string[]
  readonly quarantined: string[]
  readonly items: SourceItem[]
}

function required(value: unknown, field: string): string {
  if (typeof value !== 'string' || value.trim().length === 0) throw new GraphError('INVALID_SOURCE_ITEM', `${field} must be a non-empty string`)
  return value.trim()
}

function contentHash(content: string): string {
  return `sha256:${createHash('sha256').update(content, 'utf8').digest('hex')}`
}

export function normalizeSourceItem(value: unknown): SourceItem {
  const item = jsonObject(value, 'item') as Partial<SourceItem>
  const provider = required(item.provider, 'provider')
  const title = required(item.title, 'title')
  if (typeof item.content !== 'string') throw new GraphError('INVALID_SOURCE_ITEM', 'content must be a string')
  const rawUrl = required(item.canonicalUrl, 'canonicalUrl')
  const canonicalUrl = rawUrl.startsWith('alphasift://') ? rawUrl : canonicalHttpUrl(rawUrl)
  const asOf = required(item.asOf, 'asOf')
  const availableAt = required(item.availableAt, 'availableAt')
  const fetchedAt = required(item.fetchedAt, 'fetchedAt')
  timestamp(asOf, 'asOf')
  timestamp(availableAt, 'availableAt')
  timestamp(fetchedAt, 'fetchedAt')
  const hash = contentHash(item.content)
  if (item.contentHash !== undefined && item.contentHash !== hash) {
    throw new GraphError('CONTENT_HASH_MISMATCH', `contentHash does not match the raw content for ${canonicalUrl}`)
  }
  if (typeof item.provenance !== 'object' || item.provenance === null || Array.isArray(item.provenance)) {
    throw new GraphError('INVALID_SOURCE_ITEM', 'provenance must be a JSON object')
  }
  return {
    ...item,
    provider,
    canonicalUrl,
    title,
    content: item.content,
    contentHash: hash,
    asOf: new Date(asOf).toISOString(),
    availableAt: new Date(availableAt).toISOString(),
    fetchedAt: new Date(fetchedAt).toISOString(),
    provenance: { canonicalUrl, ...item.provenance },
  } as SourceItem
}

function existingSource(node: GraphNode): { id: string; canonicalUrl: string; contentHash: string; availableAt: string } | undefined {
  if (node.kind !== 'source' || typeof node.metadata.canonicalUrl !== 'string' || typeof node.metadata.contentHash !== 'string') return undefined
  return {
    id: node.id,
    canonicalUrl: node.metadata.canonicalUrl,
    contentHash: node.metadata.contentHash,
    availableAt: typeof node.metadata.availableAt === 'string' ? node.metadata.availableAt : '',
  }
}

function stringArray(value: JsonValue | undefined): string[] {
  return Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === 'string') : []
}

function union(values: readonly string[]): string[] {
  return [...new Set(values)]
}

function unionJson(values: readonly JsonValue[]): JsonValue[] {
  const seen = new Set<string>()
  return values.filter(value => {
    const key = canonicalJson(value)
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

function itemMetadata(item: SourceItem, context: IngestContext, sessionId: string) {
  return financeMetadata({
    provider: item.provider,
    asOf: item.asOf,
    availableAt: item.availableAt,
    fetchedAt: item.fetchedAt,
    contentHash: item.contentHash,
    runId: context.runId,
    provenance: { ...item.provenance, sessionId },
  })
}

export function buildIngestPlan(
  values: readonly unknown[],
  existingNodes: readonly GraphNode[],
  context: IngestContext,
): IngestPlanPreview {
  timestamp(context.asOf, 'asOf')
  timestamp(context.fetchedAt, 'fetchedAt')
  required(context.runId, 'runId')
  const items = values.map(normalizeSourceItem).sort((left, right) => left.availableAt.localeCompare(right.availableAt) || left.canonicalUrl.localeCompare(right.canonicalUrl))
  const knownSources = new Map<string, { id: string; canonicalUrl: string; contentHash: string; availableAt: string }[]>()
  const knownNodes = new Map(existingNodes.map(node => [node.id, node]))
  for (const node of existingNodes) {
    const source = existingSource(node)
    if (source === undefined) continue
    const versions = knownSources.get(source.canonicalUrl) ?? []
    versions.push(source)
    knownSources.set(source.canonicalUrl, versions)
  }
  const nodes = new Map<string, GraphPlanNode>()
  const edges = new Map<string, EdgeInput>()
  const sourceIds: string[] = []
  const rawIds: string[] = []
  const duplicates: string[] = []
  const duplicateInputs: string[] = []
  const quarantined: string[] = []
  const accepted: SourceItem[] = []
  const seen = new Set<string>()
  const sessionId = `session:${hashId({ runId: context.runId })}`
  const priorSession = knownNodes.get(sessionId)
  const priorIngestion = priorSession?.kind === 'session'
    && priorSession.metadata.runId === context.runId
    && typeof priorSession.metadata.ingestion === 'object'
    && priorSession.metadata.ingestion !== null
    && !Array.isArray(priorSession.metadata.ingestion)
    && priorSession.metadata.ingestion.runId === context.runId
    ? priorSession.metadata.ingestion as JsonObject
    : undefined
  const priorSources = stringArray(priorIngestion?.sources).filter(id => knownNodes.get(id)?.kind === 'source')
  const priorRaw = stringArray(priorIngestion?.raw).filter(id => knownNodes.get(id)?.kind === 'raw')
  const priorQuarantined = stringArray(priorIngestion?.quarantined)
  const priorErrors = Array.isArray(priorIngestion?.errors) ? priorIngestion.errors : []
  const priorReferences = priorSession?.kind === 'session'
    ? stringArray(priorSession.metadata.references).filter(id => knownNodes.has(id))
    : []

  for (const item of items) {
    const identity = `${item.canonicalUrl}\n${item.contentHash}`
    if (seen.has(identity)) {
      duplicates.push(identity)
      duplicateInputs.push(identity)
      continue
    }
    seen.add(identity)
    if (timestamp(item.availableAt, 'availableAt') > timestamp(context.asOf, 'asOf')
      || timestamp(item.asOf, 'item.asOf') > timestamp(context.asOf, 'asOf')) {
      quarantined.push(identity)
      continue
    }
    accepted.push(item)
    const sourceId = `source:${hashId({ provider: item.provider, canonicalUrl: item.canonicalUrl, contentHash: item.contentHash })}`
    const rawId = `raw:${hashId({ provider: item.provider, canonicalUrl: item.canonicalUrl, contentHash: item.contentHash })}`
    sourceIds.push(sourceId)
    rawIds.push(rawId)
    const sourceExists = knownNodes.get(sourceId)?.kind === 'source'
    const rawExists = knownNodes.get(rawId)?.kind === 'raw'
    if (sourceExists && rawExists) duplicates.push(identity)
    const metadata = itemMetadata(item, context, sessionId)
    if (!sourceExists) {
      nodes.set(sourceId, {
        id: sourceId, kind: 'source', title: item.title, content: item.canonicalUrl,
        metadata: {
          ...metadata, canonicalUrl: item.canonicalUrl, mimeType: item.mimeType ?? null,
          provenance: { ...metadata.provenance, rawId },
          references: [rawId, sessionId],
        },
      })
    }
    if (!rawExists) {
      nodes.set(rawId, {
        id: rawId, kind: 'raw', title: `${item.title} — raw`, content: item.content,
        metadata: {
          ...metadata, canonicalUrl: item.canonicalUrl, sourceId, sessionId,
          ...(item.data === undefined ? {} : { data: item.data }),
          ...(item.segments === undefined ? {} : { segments: item.segments as JsonValue }),
          references: [sourceId, sessionId],
        },
      })
    }
    const versions = knownSources.get(item.canonicalUrl) ?? []
    const previous = versions.filter(version => version.contentHash !== item.contentHash && version.availableAt <= item.availableAt)
      .sort((left, right) => right.availableAt.localeCompare(left.availableAt))[0]
    if (!sourceExists && previous !== undefined) {
      const edge: EdgeInput = { from: sourceId, to: previous.id, kind: 'supersedes', metadata: { runId: context.runId, contentHash: item.contentHash } }
      edges.set(`${edge.kind}:${edge.from}→${edge.to}`, edge)
    }
    if (!sourceExists) {
      versions.push({ id: sourceId, canonicalUrl: item.canonicalUrl, contentHash: item.contentHash, availableAt: item.availableAt })
      knownSources.set(item.canonicalUrl, versions)
    }
    for (const edge of [
      { from: rawId, to: sourceId, kind: 'derived_from', metadata: { runId: context.runId, contentHash: item.contentHash } },
      { from: sessionId, to: sourceId, kind: 'produces', metadata: { runId: context.runId, contentHash: item.contentHash } },
      { from: sessionId, to: rawId, kind: 'produces', metadata: { runId: context.runId, contentHash: item.contentHash } },
    ] as EdgeInput[]) edges.set(`${edge.kind}:${edge.from}→${edge.to}`, edge)
  }

  if (accepted.length === 0) return { sourceIds, rawIds, duplicates, quarantined, items: accepted }
  const sessionSources = union([...priorSources, ...sourceIds])
  const sessionRaw = union([...priorRaw, ...rawIds])
  const sessionReport = {
    runId: context.runId,
    asOf: context.asOf,
    fetchedAt: context.fetchedAt,
    sources: sessionSources,
    raw: sessionRaw,
    duplicateInputs: duplicateInputs.length,
    quarantined: union([...priorQuarantined, ...quarantined]),
    errors: unionJson([...priorErrors, ...(context.errors ?? [])]),
  }
  const sessionMetadata = financeMetadata({
    provider: 'finance.ingest', asOf: context.asOf, availableAt: context.fetchedAt, fetchedAt: context.fetchedAt,
    runId: context.runId, provenance: { sourceRefs: sessionSources },
  }, sessionReport as JsonObject)
  nodes.set(sessionId, {
    id: sessionId, kind: 'session', title: `Finance ingestion ${context.runId}`,
    content: canonicalJson(sessionReport as JsonObject),
    metadata: {
      ...sessionMetadata,
      ingestion: sessionReport as JsonObject,
      references: union([...priorReferences, ...sessionSources, ...sessionRaw]),
    },
  })
  return {
    plan: { nodes: [...nodes.values()], edges: [...edges.values()] }, sessionId,
    sourceIds, rawIds, duplicates, quarantined, items: accepted,
  }
}
