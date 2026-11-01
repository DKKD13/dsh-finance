import { GraphError } from '../graph.ts'
import type { JsonValue } from '../graph.ts'
import { canonicalHttpUrl } from './http.ts'
import { canonicalJson, hashId, hashJson, jsonObject, timestamp } from './metadata.ts'
import { annotationListHash, hashText } from './capture.ts'
import type { CaptureAnnotation, CaptureRecord, CaptureRejection } from './capture.ts'
import { htmlToText } from './documents.ts'
import type { JsonObject } from './types.ts'

export const CLIPPER_SCHEMA = 'dsh.clipper/v1'
export const MAX_CLIPPER_CLIPS = 100
export const MAX_CLIP_TEXT_BYTES = 2 * 1024 * 1024
export const MAX_CLIPPER_BUNDLE_TEXT_BYTES = 8 * 1024 * 1024

export interface NormalizedClipperBundle {
  readonly records: CaptureRecord[]
  readonly rejected: CaptureRejection[]
  readonly received: number
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function jsonValue(value: unknown, field: string): JsonValue {
  if (value === undefined) throw new GraphError('INVALID_CLIP', `${field} must be a JSON value`)
  return JSON.parse(canonicalJson(value as JsonValue)) as JsonValue
}

function optionalString(value: unknown, field: string, maxLength = 4096): string | undefined {
  if (value === undefined || value === null) return undefined
  if (typeof value !== 'string' || value.trim().length === 0 || value.length > maxLength) {
    throw new GraphError('INVALID_CLIP', `${field} must be a non-empty string of at most ${maxLength} characters`)
  }
  return value.trim()
}

function optionalTime(value: unknown, field: string): string | undefined {
  const text = optionalString(value, field, 128)
  if (text === undefined) return undefined
  timestamp(text, field)
  return new Date(text).toISOString()
}

function annotationText(value: unknown, field: string, maxLength: number): string | undefined {
  if (value === undefined || value === null) return undefined
  if (typeof value !== 'string' || value.length > maxLength) {
    throw new GraphError('INVALID_ANNOTATION', `${field} must be a string of at most ${maxLength} characters`)
  }
  return value
}

function annotationFrom(value: unknown): CaptureAnnotation {
  if (typeof value === 'string') {
    if (value.length === 0) throw new GraphError('INVALID_ANNOTATION', 'highlight text must not be empty')
    const exact = value
    return { exact, annotationHash: hashJson({ exact }) }
  }
  if (!isRecord(value)) throw new GraphError('INVALID_ANNOTATION', 'annotation must be a string or object')
  const exact = annotationText(value.exact ?? value.text ?? value.highlight, 'annotation.exact', MAX_CLIP_TEXT_BYTES) ?? ''
  const note = annotationText(value.note ?? value.comment, 'annotation.note', 64 * 1024)
  if (exact.length === 0 && (note === undefined || note.length === 0)) throw new GraphError('INVALID_ANNOTATION', 'annotation requires exact/highlight text or a note')
  const prefix = annotationText(value.prefix, 'annotation.prefix', 64 * 1024)
  const suffix = annotationText(value.suffix, 'annotation.suffix', 64 * 1024)
  let tags: string[] | undefined
  if (value.tags !== undefined) {
    if (!Array.isArray(value.tags) || value.tags.length > 32) throw new GraphError('INVALID_ANNOTATION', 'annotation.tags must contain at most 32 strings')
    tags = [...new Set(value.tags.map(tag => optionalString(tag, 'annotation.tags', 128) as string))].sort()
  }
  const annotation = {
    exact,
    ...(prefix === undefined ? {} : { prefix }),
    ...(suffix === undefined ? {} : { suffix }),
    ...(note === undefined ? {} : { note }),
    ...(tags === undefined ? {} : { tags }),
    ...(value.locator === undefined ? {} : { locator: jsonValue(value.locator, 'annotation.locator') }),
  }
  return { ...annotation, annotationHash: hashJson(annotation as JsonValue) }
}

function clipValues(bundle: unknown): unknown[] {
  if (Array.isArray(bundle)) return bundle
  if (!isRecord(bundle)) throw new GraphError('INVALID_CLIPPER_BUNDLE', 'bundle must be a clip object, a clip array, or a dsh.clipper/v1 bundle')
  for (const field of ['schema', 'format'] as const) {
    const marker = bundle[field]
    if (marker !== undefined && marker !== CLIPPER_SCHEMA) {
      throw new GraphError('INVALID_CLIPPER_BUNDLE', `bundle ${field} must be ${CLIPPER_SCHEMA}`)
    }
  }
  if (typeof bundle.version === 'string' && bundle.version.includes('clipper') && bundle.version !== CLIPPER_SCHEMA) {
    throw new GraphError('INVALID_CLIPPER_BUNDLE', `bundle version must be ${CLIPPER_SCHEMA}`)
  }
  for (const field of ['clips', 'items'] as const) {
    if (bundle[field] !== undefined) {
      if (!Array.isArray(bundle[field])) throw new GraphError('INVALID_CLIPPER_BUNDLE', `bundle.${field} must be an array`)
      return bundle[field]
    }
  }
  if (isRecord(bundle.data)) {
    if (Array.isArray(bundle.data.clips)) return bundle.data.clips
    if (Array.isArray(bundle.data.items)) return bundle.data.items
  }
  return [bundle]
}

function fileIdentity(value: Record<string, unknown>, provenance: Record<string, unknown>): string {
  const file = isRecord(value.file) ? value.file : {}
  const name = optionalString(value.fileName ?? file.name ?? provenance.fileName ?? value.title, 'file.name', 255) as string
  if (name === '.' || name === '..' || /[/\\\0:]/u.test(name) || name.includes('://')) {
    throw new GraphError('HOST_PATH_REJECTED', 'file clips accept a display name, not a host path')
  }
  return `urn:dsh:clipper-file:${hashId({ name })}`
}

function normalizeClip(value: unknown, index: number, cutoff: string): CaptureRecord {
  if (!isRecord(value)) throw new GraphError('INVALID_CLIP', `clip ${index} must be an object`)
  const contentObject = isRecord(value.content) ? value.content : {}
  const provenance = isRecord(value.provenance) ? jsonObject(value.provenance, 'clip.provenance') : {}
  const kind = optionalString(value.kind ?? value.type, 'clip.kind', 32) ?? 'page'
  if (kind !== 'page' && kind !== 'selection' && kind !== 'file' && kind !== CLIPPER_SCHEMA) {
    throw new GraphError('INVALID_CLIP_KIND', 'clip kind must be page, selection, or file')
  }
  const resolvedKind = kind === CLIPPER_SCHEMA ? 'page' : kind
  let text: string
  let mimeType = 'text/plain'
  if (typeof value.content === 'string') text = value.content
  else if (typeof contentObject.text === 'string') text = contentObject.text
  else if (typeof value.snippet === 'string') text = value.snippet
  else if (typeof value.text === 'string') text = value.text
  else if (typeof value.html === 'string') {
    text = htmlToText(value.html)
    mimeType = 'text/html'
  } else throw new GraphError('INVALID_CLIP', 'clip requires content.text, snippet, text, or html')
  if (text.trim().length === 0) throw new GraphError('EMPTY_CLIP', 'clip content must not be empty')
  if (Buffer.byteLength(text, 'utf8') > MAX_CLIP_TEXT_BYTES) throw new GraphError('CLIP_TOO_LARGE', `clip content exceeds ${MAX_CLIP_TEXT_BYTES} bytes`)

  const rawUrl = value.canonicalUrl ?? value.sourceUrl ?? value.url ?? provenance.canonicalUrl ?? provenance.url
  const canonicalUrl = resolvedKind === 'file'
    ? fileIdentity(value, provenance)
    : canonicalHttpUrl(optionalString(rawUrl, 'clip.sourceUrl', 8192) as string)
  const title = optionalString(value.title ?? value.sourceName ?? contentObject.title ?? provenance.title, 'clip.title', 512)
    ?? (resolvedKind === 'file' ? 'File clip' : new URL(canonicalUrl).hostname)
  const capturedAt = optionalTime(value.capturedAt ?? provenance.capturedAt, 'clip.capturedAt')
  const availableAt = optionalTime(value.availableAt ?? contentObject.availableAt ?? provenance.availableAt, 'clip.availableAt')
  const recordAsOf = optionalTime(value.asOf ?? contentObject.asOf, 'clip.asOf') ?? capturedAt ?? cutoff
  const rawAnnotations = value.annotations ?? value.highlights ?? []
  if (!Array.isArray(rawAnnotations) || rawAnnotations.length > 500) {
    throw new GraphError('INVALID_ANNOTATION', 'clip annotations/highlights must contain at most 500 entries')
  }
  const annotations = rawAnnotations.map(annotationFrom)
  const topicValue = isRecord(value.topic) ? value.topic.title ?? value.topic.name : value.topic
  const topic = optionalString(topicValue ?? value.topic_title, 'clip.topic', 512)
  const contentHash = hashText(text)
  return {
    captureKind: 'clip',
    provider: 'clipper',
    canonicalUrl,
    title,
    content: text,
    contentHash,
    annotations,
    annotationHash: annotationListHash(annotations),
    asOf: recordAsOf,
    ...(availableAt === undefined ? {} : { availableAt }),
    ...(capturedAt === undefined ? {} : { capturedAt }),
    mimeType,
    ...(topic === undefined ? {} : { topic }),
    provenance: {
      ...provenance,
      clipperSchema: CLIPPER_SCHEMA,
      clipKind: resolvedKind,
      compatibility: value.snippet !== undefined || value.sourceUrl !== undefined || value.topic_title !== undefined ? 'verity-fields' : 'native',
    },
  }
}

export function normalizeClipperBundle(bundle: unknown, asOf: string): NormalizedClipperBundle {
  timestamp(asOf, 'asOf')
  const values = clipValues(bundle)
  if (values.length === 0 || values.length > MAX_CLIPPER_CLIPS) {
    throw new GraphError('INVALID_CLIPPER_BUNDLE', `bundle must contain between 1 and ${MAX_CLIPPER_CLIPS} clips`)
  }
  const records: CaptureRecord[] = []
  const rejected: CaptureRejection[] = []
  let totalBytes = 0
  values.forEach((value, index) => {
    try {
      const record = normalizeClip(value, index, asOf)
      totalBytes += Buffer.byteLength(record.content, 'utf8')
      if (totalBytes > MAX_CLIPPER_BUNDLE_TEXT_BYTES) throw new GraphError('CLIPPER_BUNDLE_TOO_LARGE', `clip text exceeds ${MAX_CLIPPER_BUNDLE_TEXT_BYTES} bytes`)
      records.push(record)
    } catch (error: unknown) {
      if (error instanceof GraphError && error.code === 'CLIPPER_BUNDLE_TOO_LARGE') throw error
      rejected.push({
        index,
        code: error instanceof GraphError ? error.code : 'INVALID_CLIP',
        message: error instanceof Error ? error.message : String(error),
        ...(isRecord(value) && typeof (value.title ?? value.sourceName) === 'string' ? { name: String(value.title ?? value.sourceName).slice(0, 255) } : {}),
      })
    }
  })
  return { records, rejected, received: values.length }
}

export function clipperBundleDigest(bundle: JsonObject): string {
  return hashJson(bundle)
}
