import { createHash } from 'node:crypto'
import { GraphError } from '../graph.ts'
import type { GraphNode, JsonValue } from '../graph.ts'
import type { FinanceMetadata, FinanceMetadataInput, JsonObject } from './types.ts'

function canonical(value: JsonValue): JsonValue {
  if (typeof value === 'number' && !Number.isFinite(value)) {
    throw new GraphError('INVALID_NUMBER', 'finance payloads only admit finite numbers')
  }
  if (Array.isArray(value)) return value.map(canonical)
  if (typeof value === 'object' && value !== null) {
    return Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key] as JsonValue)]))
  }
  return value
}

/** Stable JSON representation used for content addressing and golden outputs. */
export function canonicalJson(value: JsonValue): string {
  return JSON.stringify(canonical(value))
}

/** SHA-256 of a lossless JSON value, with a stable algorithm prefix. */
export function hashJson(value: JsonValue): string {
  return `sha256:${createHash('sha256').update(canonicalJson(value)).digest('hex')}`
}

/** Short deterministic id component for imported or derived records. */
export function hashId(value: JsonValue, length = 24): string {
  return createHash('sha256').update(canonicalJson(value)).digest('hex').slice(0, length)
}

export function timestamp(value: unknown, field: string): number {
  if (typeof value !== 'string' || value.trim().length === 0 || !Number.isFinite(Date.parse(value))) {
    throw new GraphError('INVALID_TIMESTAMP', `${field} must be an ISO-8601 date or timestamp`)
  }
  const date = /^([+-]\d{6}|\d{4})-(\d{1,2})-(\d{1,2})/.exec(value.trim())
  if (date !== null) {
    const year = Number(date[1])
    const month = Number(date[2])
    const day = Number(date[3])
    const leapYear = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0)
    const daysInMonth = [31, leapYear ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month - 1] ?? 0
    if (day < 1 || day > daysInMonth) {
      throw new GraphError('INVALID_TIMESTAMP', `${field} must name an existing calendar day`)
    }
  }
  return Date.parse(value)
}

function record(value: unknown): Record<string, unknown> | undefined {
  return typeof value === 'object' && value !== null && !Array.isArray(value) ? value as Record<string, unknown> : undefined
}

/** Identify Yahoo history using only lineage already persisted on source and raw nodes. */
export function isYahooHistoryNode(node: GraphNode): boolean {
  if (node.metadata.provider !== 'yahoo') return false
  const provenance = record(node.metadata.provenance)
  if (provenance?.endpoint !== 'v8/finance/chart') return false
  const historyMarker = provenance.adjustment === 'provider adjustedClose and unadjusted OHLC retained separately'
  return historyMarker && (node.kind === 'source' || (node.kind === 'raw' && Array.isArray(record(node.metadata.data)?.bars)))
}

/** Resolve read-time availability without changing the persisted node. */
export function effectiveAvailableAt(node: GraphNode): { value: string; milliseconds: number } | undefined {
  const availableAt = node.metadata.availableAt
  if (typeof availableAt !== 'string' || !Number.isFinite(Date.parse(availableAt))) return undefined
  const availableMilliseconds = Date.parse(availableAt)
  if (!isYahooHistoryNode(node)) return { value: new Date(availableMilliseconds).toISOString(), milliseconds: availableMilliseconds }
  const fetchedAt = node.metadata.fetchedAt
  if (typeof fetchedAt !== 'string' || !Number.isFinite(Date.parse(fetchedAt))) return undefined
  const milliseconds = Math.max(availableMilliseconds, Date.parse(fetchedAt))
  return { value: new Date(milliseconds).toISOString(), milliseconds }
}

export function assertAvailableBy(metadata: { asOf: string; availableAt: string }, asOf: string, subject: string): void {
  if (timestamp(metadata.availableAt, `${subject}.availableAt`) > timestamp(asOf, 'asOf')
    || timestamp(metadata.asOf, `${subject}.asOf`) > timestamp(asOf, 'asOf')) {
    throw new GraphError('FUTURE_DATA', `${subject} was not available by ${asOf}`)
  }
}

/** Fill all common lineage fields without inventing an external fetch time. */
export function financeMetadata(input: FinanceMetadataInput, hashSubject?: JsonValue): FinanceMetadata {
  for (const field of ['provider', 'asOf', 'availableAt', 'fetchedAt', 'contentHash', 'runId'] as const) {
    if (field !== 'contentHash' && field !== 'runId' && (typeof input[field] !== 'string' || input[field].trim().length === 0)) {
      throw new GraphError('INVALID_METADATA', `${field} must be a non-empty string`)
    }
  }
  timestamp(input.asOf, 'metadata.asOf')
  timestamp(input.availableAt, 'metadata.availableAt')
  timestamp(input.fetchedAt, 'metadata.fetchedAt')
  const contentHash = input.contentHash ?? (hashSubject === undefined ? undefined : hashJson(hashSubject))
  if (typeof contentHash !== 'string' || contentHash.length === 0) {
    throw new GraphError('INVALID_METADATA', 'contentHash is required when no hash subject is supplied')
  }
  const runId = input.runId ?? `run-${hashId({ contentHash, operation: hashSubject ?? input })}`
  const provenance = input.provenance ?? { sourceRefs: input.sourceRefs ?? [] }
  if (typeof provenance !== 'object' || provenance === null || Array.isArray(provenance)) {
    throw new GraphError('INVALID_METADATA', 'provenance must be a JSON object')
  }
  if (provenance.sourceRefs !== undefined && !Array.isArray(provenance.sourceRefs)) {
    throw new GraphError('INVALID_METADATA', 'provenance.sourceRefs must be an array when present')
  }
  const output: FinanceMetadata = {
    ...input,
    provider: input.provider,
    asOf: input.asOf,
    availableAt: input.availableAt,
    fetchedAt: input.fetchedAt,
    contentHash,
    runId,
    provenance: { sourceRefs: input.sourceRefs ?? [], ...provenance },
  }
  delete output.sourceRefs
  return output
}

/** Require (rather than synthesize) the lineage carried by an evidence artifact. */
export function artifactMetadata(input: FinanceMetadataInput): FinanceMetadata {
  if (typeof input.contentHash !== 'string' || input.contentHash.length === 0
    || typeof input.runId !== 'string' || input.runId.length === 0
    || input.provenance === undefined) {
    throw new GraphError('INVALID_ARTIFACT', 'ResearchArtifact requires contentHash, runId, and provenance')
  }
  return financeMetadata(input)
}

/** JSON clone at the trust boundary, rejecting non-JSON and non-finite values. */
export function jsonObject(value: unknown, subject = 'input'): JsonObject {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new GraphError('INVALID_REQUEST', `${subject} must be a JSON object`)
  }
  const cloned = JSON.parse(JSON.stringify(value)) as JsonObject
  canonical(cloned)
  return cloned
}
