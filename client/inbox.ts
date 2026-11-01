import type { JsonObject, JsonValue } from '../src/finance/types.ts'

export const CLIPPER_SCHEMA = 'dsh.clipper/v1'
export const INBOX_FILE_EXTENSIONS = ['md', 'markdown', 'txt', 'html', 'htm', 'csv', 'opml', 'pdf', 'docx'] as const
export const INBOX_FILE_ACCEPT = '.md,.markdown,.txt,.html,.htm,.csv,.opml,.pdf,.docx,text/markdown,text/plain,text/html,text/csv,text/x-opml,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document'

export interface InboxFileLike {
  readonly name: string
  readonly size: number
  readonly type: string
  readonly lastModified?: number
  arrayBuffer(): Promise<ArrayBuffer>
}

export interface InboxFileDescriptor extends JsonObject {
  readonly name: string
  readonly mimeType: string
  readonly dataBase64: string
  readonly lastModified?: number
}

export interface InboxNodePreview {
  readonly id: string
  readonly kind?: string
  readonly title?: string
}

export interface InboxPreviewModel {
  readonly received: number
  readonly accepted: number
  readonly duplicates: readonly unknown[]
  readonly quarantined: readonly unknown[]
  readonly rejected: readonly unknown[]
  readonly errors: readonly unknown[]
  readonly plannedNodes: readonly InboxNodePreview[]
  readonly items: readonly JsonObject[]
  readonly runId?: string
  readonly asOf?: string
  readonly dryRun: boolean
}

export interface InboxReviewItem {
  readonly provider?: string
  readonly title?: string
  readonly url?: string
  readonly content?: string
  readonly status: string
}

function record(value: unknown): Record<string, unknown> | undefined {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? value as Record<string, unknown>
    : undefined
}

function array(value: unknown): readonly unknown[] {
  return Array.isArray(value) ? value : []
}

function count(value: unknown, entries: readonly unknown[], fallback = 0): number {
  if (typeof value === 'number' && Number.isSafeInteger(value) && value >= 0) return value
  if (Array.isArray(value)) return value.length
  return entries.length > 0 ? entries.length : fallback
}

function jsonObjects(value: unknown): readonly JsonObject[] {
  return array(value).filter((entry): entry is JsonObject => record(entry) !== undefined)
}

function clippedText(value: unknown, limit = 280): string | undefined {
  if (typeof value !== 'string') return undefined
  const text = value.replace(/\s+/g, ' ').trim()
  if (text.length === 0) return undefined
  return text.length > limit ? `${text.slice(0, limit - 1)}…` : text
}

function publicHttpUrl(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined
  try {
    const url = new URL(value)
    return ['http:', 'https:'].includes(url.protocol) && url.username.length === 0 && url.password.length === 0
      ? url.toString()
      : undefined
  } catch {
    return undefined
  }
}

/**
 * Project the accepted SourceItems in a preview for human review.
 *
 * `preview.items` is the accepted item collection; sourceIds/rawIds are graph
 * projections and must never be zipped with these records by array position.
 */
export function readInboxReviewItems(items: readonly JsonObject[]): readonly InboxReviewItem[] {
  return items.flatMap(item => {
    const provider = clippedText(item.provider, 40)
    const title = clippedText(item.title, 180)
    const url = publicHttpUrl(item.canonicalUrl ?? item.url)
    const content = clippedText(item.content)
    if (title === undefined && url === undefined && content === undefined) return []
    const status = clippedText(item.status, 40)?.toLowerCase()
      ?? (item.quarantined === true ? 'quarantined' : 'accepted')
    return [{
      ...(provider === undefined ? {} : { provider }),
      ...(title === undefined ? {} : { title }),
      ...(url === undefined ? {} : { url }),
      ...(content === undefined ? {} : { content }),
      status,
    }]
  })
}

export function parseClipperJson(text: string): JsonObject {
  const parsed: unknown = JSON.parse(text)
  const clip = record(parsed)
  if (clip === undefined) throw new Error('Clip JSON must be an object')
  if (clip.schema !== CLIPPER_SCHEMA) throw new Error(`Clip JSON schema must be ${CLIPPER_SCHEMA}`)
  const kind = clip.kind ?? clip.type
  if (kind !== 'page' && kind !== 'selection' && kind !== 'file') throw new Error('Clip kind must be page, selection, or file')
  if (record(clip.content)?.text !== undefined && typeof record(clip.content)?.text !== 'string') {
    throw new Error('Clip content.text must be a string')
  }
  if (typeof record(clip.content)?.text !== 'string') throw new Error('Clip content.text is required')
  if (clip.annotations !== undefined && !Array.isArray(clip.annotations)) throw new Error('Clip annotations must be an array')
  return clip as JsonObject
}

export function fileExtension(name: string): string {
  const index = name.lastIndexOf('.')
  return index < 0 ? '' : name.slice(index + 1).toLowerCase()
}

export function isSupportedInboxFile(name: string): boolean {
  return (INBOX_FILE_EXTENSIONS as readonly string[]).includes(fileExtension(name))
}

export function inferInboxMimeType(name: string, supplied = ''): string {
  if (supplied.trim().length > 0) return supplied
  switch (fileExtension(name)) {
    case 'md':
    case 'markdown': return 'text/markdown'
    case 'txt': return 'text/plain'
    case 'html':
    case 'htm': return 'text/html'
    case 'csv': return 'text/csv'
    case 'opml': return 'text/x-opml'
    case 'pdf': return 'application/pdf'
    case 'docx': return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    default: return 'application/octet-stream'
  }
}

export function base64FromArrayBuffer(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  const chunkSize = 0x8000
  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    const chunk = bytes.subarray(offset, Math.min(offset + chunkSize, bytes.length))
    binary += String.fromCharCode(...chunk)
  }
  return btoa(binary)
}

export async function describeInboxFile(file: InboxFileLike): Promise<InboxFileDescriptor> {
  if (!isSupportedInboxFile(file.name)) throw new Error('Unsupported file type; use MD, TXT, HTML, CSV, OPML, PDF, or DOCX')
  const dataBase64 = base64FromArrayBuffer(await file.arrayBuffer())
  return {
    name: file.name,
    mimeType: inferInboxMimeType(file.name, file.type),
    dataBase64,
    ...(typeof file.lastModified === 'number' && Number.isSafeInteger(file.lastModified) && file.lastModified >= 0 ? { lastModified: file.lastModified } : {}),
  }
}

export function formatFileSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return '—'
  if (bytes < 1024) return `${bytes} B`
  const units = ['KiB', 'MiB', 'GiB'] as const
  let value = bytes / 1024
  let unit = 0
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024
    unit += 1
  }
  return `${value >= 10 ? value.toFixed(1) : value.toFixed(2)} ${units[unit]}`
}

function plannedNodes(result: Record<string, unknown>): readonly InboxNodePreview[] {
  const preview = record(result.preview)
  const plan = record(result.plan) ?? record(preview?.plan)
  const diff = record(result.diff)
  const nodeValues = array(plan?.nodes).length > 0 ? array(plan?.nodes) : array(result.nodes)
  const nodes = nodeValues.flatMap(value => {
    const node = record(value)
    if (node === undefined || typeof node.id !== 'string') return []
    return [{
      id: node.id,
      ...(typeof node.kind === 'string' ? { kind: node.kind } : {}),
      ...(typeof node.title === 'string' ? { title: node.title } : {}),
    }]
  })
  if (nodes.length > 0) return nodes
  const added = array(diff?.nodesAdded).filter((id): id is string => typeof id === 'string')
  if (added.length > 0) return added.map(id => ({ id }))
  const captureItems = jsonObjects(result.items).filter(item => typeof item.captureKind === 'string')
  if (captureItems.length > 0) {
    const captureNodes = captureItems.filter(item => item.status !== 'duplicate').flatMap(item => [
      ...(typeof item.sourceId === 'string' ? [{ id: item.sourceId, kind: 'source' }] : []),
      ...(typeof item.rawId === 'string' ? [{ id: item.rawId, kind: 'raw' }] : []),
      ...(typeof item.id === 'string' ? [{ id: item.id, kind: 'reference', ...(typeof item.title === 'string' ? { title: item.title } : {}) }] : []),
    ])
    const ids = [...captureNodes, ...(typeof result.sessionId === 'string' ? [{ id: result.sessionId, kind: 'session' }] : [])]
    return ids.filter((entry, index) => ids.findIndex(candidate => candidate.id === entry.id) === index)
  }
  const ids = [
    ...array(result.sourceIds).filter((id): id is string => typeof id === 'string').map(id => ({ id, kind: 'source' })),
    ...array(result.rawIds).filter((id): id is string => typeof id === 'string').map(id => ({ id, kind: 'raw' })),
    ...array(result.clipIds).filter((id): id is string => typeof id === 'string').map(id => ({ id, kind: 'reference' })),
    ...array(result.documentIds).filter((id): id is string => typeof id === 'string').map(id => ({ id, kind: 'reference' })),
    ...(typeof result.sessionId === 'string' ? [{ id: result.sessionId, kind: 'session' }] : []),
  ]
  return ids.filter((entry, index) => ids.findIndex(candidate => candidate.id === entry.id) === index)
}

export function readInboxPreview(value: JsonValue | null): InboxPreviewModel | undefined {
  const result = record(value)
  if (result === undefined) return undefined
  const counts = record(result.counts)
  const items = jsonObjects(result.items).length > 0
    ? jsonObjects(result.items)
    : jsonObjects(record(result.preview)?.items).length > 0
      ? jsonObjects(record(result.preview)?.items)
      : jsonObjects(result.accepted)
  const duplicates = result.duplicates === undefined ? items.filter(item => item.status === 'duplicate') : array(result.duplicates)
  const quarantined = result.quarantined === undefined ? items.filter(item => item.quarantined === true || item.status === 'quarantined') : array(result.quarantined)
  const rejected = array(result.rejected)
  const errors = array(result.errors)
  const sourceIds = array(result.sourceIds)
  return {
    received: count(counts?.received ?? result.received, items),
    accepted: count(counts?.accepted ?? result.accepted, items, sourceIds.length),
    duplicates,
    quarantined,
    rejected,
    errors,
    plannedNodes: plannedNodes(result),
    items,
    ...(typeof result.runId === 'string' ? { runId: result.runId } : {}),
    ...(typeof result.asOf === 'string' ? { asOf: result.asOf } : {}),
    dryRun: result.dryRun !== false,
  }
}

export function displayInboxEntry(value: unknown): string {
  if (typeof value === 'string') return value
  const entry = record(value)
  if (entry === undefined) return JSON.stringify(value)
  const identity = entry.identity ?? entry.canonicalUrl ?? entry.url ?? entry.id ?? entry.title
  const reason = entry.message ?? entry.code ?? entry.quarantineReason ?? entry.reason
  return [typeof identity === 'string' ? identity : undefined, typeof reason === 'string' ? reason : undefined]
    .filter((part): part is string => part !== undefined).join(' — ') || JSON.stringify(value)
}
