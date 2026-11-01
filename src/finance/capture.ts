import { createHash } from 'node:crypto'
import type { EdgeInput, GraphNode, JsonValue } from '../graph.ts'
import { GraphError } from '../graph.ts'
import type { GraphPlan, GraphPlanNode } from '../plan.ts'
import type { ResearchGraphService } from '../service.ts'
import { canonicalJson, hashId, hashJson, timestamp } from './metadata.ts'
import type { JsonObject } from './types.ts'

export type CaptureKind = 'clip' | 'document'
export type CaptureItemStatus = 'accepted' | 'quarantined' | 'duplicate'

export interface CaptureAnnotation {
  readonly exact: string
  readonly prefix?: string
  readonly suffix?: string
  readonly note?: string
  readonly tags?: readonly string[]
  readonly locator?: JsonValue
  readonly annotationHash: string
}

export interface CaptureRecord {
  readonly captureKind: CaptureKind
  readonly provider: string
  readonly canonicalUrl: string
  readonly title: string
  readonly content: string
  readonly contentHash: string
  readonly annotations: readonly CaptureAnnotation[]
  readonly annotationHash: string
  readonly asOf: string
  readonly availableAt?: string
  readonly capturedAt?: string
  readonly mimeType: string
  readonly topic?: string
  readonly provenance: JsonObject
  readonly locators?: readonly JsonValue[]
}

export interface CaptureRejection extends JsonObject {
  index: number
  code: string
  message: string
  name?: string
}

export interface CaptureImportOptions {
  readonly dryRun: boolean
  readonly asOf: string
  readonly runId?: string
  readonly op: 'finance.clipper.import' | 'finance.document.import'
}

export interface CaptureImportResult {
  readonly dryRun: boolean
  readonly changed: boolean
  readonly counts: {
    readonly received: number
    readonly accepted: number
    readonly duplicates: number
    readonly quarantined: number
    readonly rejected: number
    readonly annotations: number
  }
  readonly items: readonly JsonObject[]
  readonly sourceIds: readonly string[]
  readonly rawIds: readonly string[]
  readonly clipIds: readonly string[]
  readonly documentIds: readonly string[]
  readonly annotationCount: number
  readonly rejected: readonly CaptureRejection[]
  readonly sessionId?: string
  readonly revision: number
  readonly status: 'preview' | 'imported' | 'unchanged' | 'partial' | 'quarantined' | 'rejected'
  readonly runId: string
  readonly asOf: string
  readonly diff?: unknown
}

interface CaptureVersion {
  readonly id: string
  readonly sourceId?: string
  readonly canonicalUrl: string
  readonly contentHash: string
  readonly availableAt?: string
  readonly asOf: string
}

function asJson(value: unknown): JsonValue {
  return JSON.parse(JSON.stringify(value)) as JsonValue
}

export function hashText(content: string): string {
  return `sha256:${createHash('sha256').update(content, 'utf8').digest('hex')}`
}

export function annotationListHash(annotations: readonly CaptureAnnotation[]): string {
  return hashJson(annotations.map(annotation => annotation.annotationHash).sort() as JsonValue)
}

export function mergeAnnotations(...groups: readonly (readonly CaptureAnnotation[])[]): CaptureAnnotation[] {
  const annotations = new Map<string, CaptureAnnotation>()
  for (const group of groups) {
    for (const annotation of group) annotations.set(annotation.annotationHash, annotation)
  }
  return [...annotations.values()].sort((left, right) => left.annotationHash.localeCompare(right.annotationHash))
}

function captureId(record: CaptureRecord): string {
  return `${record.captureKind}:${hashId({ canonicalUrl: record.canonicalUrl, contentHash: record.contentHash })}`
}

function sourceId(record: CaptureRecord): string {
  return `source:${hashId({ provider: record.provider, canonicalUrl: record.canonicalUrl, contentHash: record.contentHash })}`
}

function rawId(record: CaptureRecord): string {
  return `raw:${hashId({ provider: record.provider, canonicalUrl: record.canonicalUrl, contentHash: record.contentHash })}`
}

function existingAnnotations(node: GraphNode | undefined): CaptureAnnotation[] {
  if (!Array.isArray(node?.metadata.annotations)) return []
  const annotations: CaptureAnnotation[] = []
  for (const value of node.metadata.annotations) {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) continue
    const candidate = value as Partial<CaptureAnnotation>
    if (typeof candidate.exact === 'string' && typeof candidate.annotationHash === 'string') {
      annotations.push(candidate as CaptureAnnotation)
    }
  }
  return annotations
}

function existingVersions(nodes: readonly GraphNode[], captureKind: CaptureKind): CaptureVersion[] {
  const versions: CaptureVersion[] = []
  for (const node of nodes) {
    if (node.kind !== 'reference' || node.metadata.captureKind !== captureKind
      || typeof node.metadata.canonicalUrl !== 'string' || typeof node.metadata.contentHash !== 'string') continue
    versions.push({
      id: node.id,
      ...(typeof node.metadata.sourceId === 'string' ? { sourceId: node.metadata.sourceId } : {}),
      canonicalUrl: node.metadata.canonicalUrl,
      contentHash: node.metadata.contentHash,
      ...(typeof node.metadata.availableAt === 'string' ? { availableAt: node.metadata.availableAt } : {}),
      asOf: typeof node.metadata.asOf === 'string' ? node.metadata.asOf : '',
    })
  }
  return versions
}

function previousVersion(versions: readonly CaptureVersion[], record: CaptureRecord): CaptureVersion | undefined {
  const cutoff = record.availableAt ?? record.asOf
  return versions
    .filter(version => version.canonicalUrl === record.canonicalUrl && version.contentHash !== record.contentHash
      && (version.availableAt ?? version.asOf) <= cutoff)
    .sort((left, right) => (right.availableAt ?? right.asOf).localeCompare(left.availableAt ?? left.asOf)
      || right.id.localeCompare(left.id))[0]
}

function quarantineReason(record: CaptureRecord, cutoff: string): string | undefined {
  if (record.availableAt === undefined) return record.captureKind === 'clip' ? 'AVAILABLE_AT_REQUIRED' : undefined
  if (timestamp(record.availableAt, 'availableAt') > timestamp(cutoff, 'asOf')) return 'FUTURE_AVAILABLE_AT'
  if (timestamp(record.asOf, 'record.asOf') > timestamp(cutoff, 'asOf')) return 'FUTURE_AS_OF'
  return undefined
}

function temporalMetadata(
  record: CaptureRecord,
  reason: string | undefined,
  runId: string,
  existing?: GraphNode,
): JsonObject {
  const metadata: JsonObject = existing === undefined
    ? {
      provider: record.provider,
      asOf: record.asOf,
      runId,
      contentHash: record.contentHash,
    }
    : { ...existing.metadata }
  if (record.availableAt !== undefined) metadata.availableAt = record.availableAt
  if (reason === undefined) {
    metadata.status = 'accepted'
    metadata.quarantined = false
    delete metadata.quarantineReason
  } else {
    metadata.status = 'quarantined'
    metadata.quarantined = true
    metadata.quarantineReason = reason
  }
  return metadata
}

function groupRecords(records: readonly CaptureRecord[]): { records: CaptureRecord[]; duplicateInputs: number } {
  const groups = new Map<string, CaptureRecord>()
  let duplicateInputs = 0
  for (const record of records) {
    const id = captureId(record)
    const current = groups.get(id)
    if (current === undefined) {
      groups.set(id, record)
      continue
    }
    const annotations = mergeAnnotations(current.annotations, record.annotations)
    if (annotations.length === current.annotations.length && current.availableAt === record.availableAt && current.asOf === record.asOf) duplicateInputs += 1
    const availableAt = current.availableAt ?? record.availableAt
    const asOf = current.asOf <= record.asOf ? current.asOf : record.asOf
    const topics = [...new Set([current.topic, record.topic].filter((topic): topic is string => topic !== undefined))]
    groups.set(id, {
      ...current,
      annotations,
      annotationHash: annotationListHash(annotations),
      asOf,
      ...(availableAt === undefined ? {} : { availableAt }),
      ...(topics.length === 0 ? {} : { topic: topics.join(' | ') }),
      provenance: {
        ...current.provenance,
        mergedCaptures: (typeof current.provenance.mergedCaptures === 'number' ? current.provenance.mergedCaptures : 1) + 1,
      },
    })
  }
  return { records: [...groups.values()], duplicateInputs }
}

function resultStatus(
  dryRun: boolean,
  changed: boolean,
  received: number,
  rejected: number,
  quarantined: number,
): CaptureImportResult['status'] {
  if (received > 0 && rejected === received) return 'rejected'
  if (dryRun) return 'preview'
  if (rejected > 0) return 'partial'
  if (quarantined > 0) return 'quarantined'
  return changed ? 'imported' : 'unchanged'
}

export async function importCaptures(
  graph: ResearchGraphService,
  values: readonly CaptureRecord[],
  rejected: readonly CaptureRejection[],
  received: number,
  options: CaptureImportOptions,
): Promise<CaptureImportResult> {
  timestamp(options.asOf, 'asOf')
  const grouped = groupRecords(values)
  const records = grouped.records
  const runId = options.runId ?? `run-${hashId({ op: options.op, asOf: options.asOf, records: asJson(records) })}`
  if (runId.trim().length === 0) throw new GraphError('INVALID_REQUEST', 'runId must be a non-empty string')
  const snapshot = await graph.snapshot()
  const knownNodes = new Map(snapshot.nodes.map(node => [node.id, node]))
  const versions = existingVersions(snapshot.nodes, options.op === 'finance.clipper.import' ? 'clip' : 'document')
  const nodes = new Map<string, GraphPlanNode>()
  const edges = new Map<string, EdgeInput>()
  const items: JsonObject[] = []
  const sourceIds: string[] = []
  const rawIds: string[] = []
  const clipIds: string[] = []
  const documentIds: string[] = []
  let duplicates = grouped.duplicateInputs
  let quarantined = 0
  let annotationCount = 0
  const sessionId = `session:${hashId({ provider: options.op, runId })}`

  for (const record of records) {
    const id = captureId(record)
    const source = sourceId(record)
    const raw = rawId(record)
    const existingCapture = knownNodes.get(id)
    const existingSource = knownNodes.get(source)
    const existingRaw = knownNodes.get(raw)
    const oldAnnotations = existingAnnotations(existingCapture)
    const annotations = mergeAnnotations(oldAnnotations, record.annotations)
    const annotationHash = annotationListHash(annotations)
    const reason = quarantineReason(record, options.asOf)
    const isDuplicate = existingCapture !== undefined && existingSource !== undefined && existingRaw !== undefined
      && annotations.length === oldAnnotations.length
      && existingCapture.metadata.status === (reason === undefined ? 'accepted' : 'quarantined')
    if (isDuplicate) duplicates += 1
    if (reason !== undefined) quarantined += 1
    annotationCount += record.annotations.length
    sourceIds.push(source)
    rawIds.push(raw)
    if (record.captureKind === 'clip') clipIds.push(id)
    else documentIds.push(id)

    const status: CaptureItemStatus = isDuplicate ? 'duplicate' : reason === undefined ? 'accepted' : 'quarantined'
    items.push({
      id,
      ...(record.captureKind === 'clip' ? { clipId: id } : { documentId: id }),
      captureKind: record.captureKind,
      title: record.title,
      canonicalUrl: record.canonicalUrl,
      content: record.content,
      contentHash: record.contentHash,
      annotationHash: record.annotationHash,
      annotationCount: record.annotations.length,
      annotations: asJson(record.annotations),
      status,
      quarantined: reason !== undefined,
      ...(reason === undefined ? {} : { quarantineReason: reason }),
      ...(record.availableAt === undefined ? {} : { availableAt: record.availableAt }),
      ...(record.capturedAt === undefined ? {} : { capturedAt: record.capturedAt }),
      asOf: record.asOf,
      sourceId: source,
      rawId: raw,
      ...(record.locators === undefined ? {} : { locators: asJson(record.locators) }),
    })

    const sourceMetadata = temporalMetadata(record, reason, runId, existingSource)
    sourceMetadata.canonicalUrl = record.canonicalUrl
    sourceMetadata.mimeType = record.mimeType
    sourceMetadata.rawId = raw
    sourceMetadata.captureId = id
    if (existingSource === undefined) sourceMetadata.references = [raw, sessionId]
    nodes.set(source, {
      id: source, kind: 'source', title: record.title, content: record.canonicalUrl,
      metadata: sourceMetadata,
    })

    const rawMetadata = temporalMetadata(record, reason, runId, existingRaw)
    rawMetadata.canonicalUrl = record.canonicalUrl
    rawMetadata.sourceId = source
    rawMetadata.captureId = id
    rawMetadata.mimeType = record.mimeType
    if (record.locators !== undefined) rawMetadata.locators = asJson(record.locators)
    if (existingRaw === undefined) rawMetadata.references = [source, sessionId]
    nodes.set(raw, {
      id: raw, kind: 'raw', title: `${record.title} — raw`, content: record.content,
      metadata: rawMetadata,
    })

    const captureMetadata = temporalMetadata(record, reason, runId, existingCapture)
    captureMetadata.captureKind = record.captureKind
    captureMetadata.canonicalUrl = record.canonicalUrl
    captureMetadata.mimeType = record.mimeType
    captureMetadata.annotationHash = annotationHash
    captureMetadata.annotations = asJson(annotations)
    captureMetadata.sourceId = source
    captureMetadata.rawId = raw
    captureMetadata.provenance = record.provenance
    if (record.capturedAt !== undefined) captureMetadata.capturedAt = record.capturedAt
    if (record.topic !== undefined) captureMetadata.topic = record.topic
    if (record.locators !== undefined) captureMetadata.locators = asJson(record.locators)
    if (existingCapture === undefined) captureMetadata.references = [source, raw, sessionId]
    nodes.set(id, {
      id, kind: 'reference', title: existingCapture?.title ?? record.title, content: record.content,
      metadata: captureMetadata,
    })

    const previous = previousVersion(versions, record)
    if (existingCapture === undefined && previous !== undefined) {
      const supersede: EdgeInput = { from: id, to: previous.id, kind: 'supersedes', metadata: { runId, contentHash: record.contentHash } }
      edges.set(`${supersede.kind}:${supersede.from}→${supersede.to}`, supersede)
      if (previous.sourceId !== undefined) {
        const sourceSupersede: EdgeInput = { from: source, to: previous.sourceId, kind: 'supersedes', metadata: { runId, contentHash: record.contentHash } }
        edges.set(`${sourceSupersede.kind}:${sourceSupersede.from}→${sourceSupersede.to}`, sourceSupersede)
      }
    }
    if (existingCapture === undefined) versions.push({ id, sourceId: source, canonicalUrl: record.canonicalUrl, contentHash: record.contentHash, ...(record.availableAt === undefined ? {} : { availableAt: record.availableAt }), asOf: record.asOf })

    for (const edge of [
      { from: raw, to: source, kind: 'derived_from', metadata: { runId, contentHash: record.contentHash } },
      { from: id, to: raw, kind: 'derived_from', metadata: { runId, contentHash: record.contentHash } },
      { from: sessionId, to: source, kind: 'produces', metadata: { runId, contentHash: record.contentHash } },
      { from: sessionId, to: raw, kind: 'produces', metadata: { runId, contentHash: record.contentHash } },
      { from: sessionId, to: id, kind: 'produces', metadata: { runId, contentHash: record.contentHash } },
    ] as EdgeInput[]) edges.set(`${edge.kind}:${edge.from}→${edge.to}`, edge)
  }

  const base = {
    dryRun: options.dryRun,
    runId,
    asOf: options.asOf,
    sourceIds,
    rawIds,
    clipIds,
    documentIds,
    annotationCount,
    rejected,
    items,
    counts: {
      received,
      accepted: records.length - (duplicates - grouped.duplicateInputs),
      duplicates,
      quarantined,
      rejected: rejected.length,
      annotations: annotationCount,
    },
  }
  if (records.length === 0) {
    return {
      ...base,
      changed: false,
      revision: snapshot.revision,
      status: resultStatus(options.dryRun, false, received, rejected.length, quarantined),
    }
  }

  const sessionReport: JsonObject = {
    runId,
    asOf: options.asOf,
    operation: options.op,
    captures: items.map(item => item.id) as JsonValue,
    clips: clipIds as JsonValue,
    documents: documentIds as JsonValue,
    duplicateInputs: grouped.duplicateInputs,
    quarantined: items.filter(item => item.quarantined === true).map(item => item.id) as JsonValue,
    rejected: asJson(rejected),
    annotationCount,
  }
  nodes.set(sessionId, {
    id: sessionId,
    kind: 'session',
    title: `${options.op === 'finance.clipper.import' ? 'Clipper' : 'Document'} import ${runId}`,
    content: canonicalJson(sessionReport),
    metadata: {
      provider: options.op,
      asOf: options.asOf,
      availableAt: options.asOf,
      fetchedAt: options.asOf,
      contentHash: hashJson(sessionReport),
      runId,
      status: rejected.length > 0 ? 'partial' : quarantined > 0 ? 'quarantined' : 'accepted',
      provenance: { sourceRefs: [...sourceIds] },
      ingestion: sessionReport,
      references: [...new Set([...sourceIds, ...rawIds, ...clipIds, ...documentIds])],
    },
  })

  const plan: GraphPlan = { nodes: [...nodes.values()], edges: [...edges.values()] }
  if (options.dryRun) {
    return {
      ...base,
      sessionId,
      changed: false,
      revision: snapshot.revision,
      status: resultStatus(true, false, received, rejected.length, quarantined),
    }
  }
  const applied = await graph.applyPlan(plan, options.op, `${options.op} ${runId}`)
  return {
    ...base,
    sessionId,
    revision: applied.revision,
    changed: applied.result.changed,
    status: resultStatus(false, applied.result.changed, received, rejected.length, quarantined),
    diff: applied.diff,
  }
}
