import { GraphError } from '../graph.ts'
import type { JsonValue } from '../graph.ts'
import { hashId, timestamp } from './metadata.ts'
import { annotationListHash, hashText } from './capture.ts'
import type { CaptureRecord, CaptureRejection } from './capture.ts'
import type { DocumentFileInput } from './types.ts'

export type { DocumentFileInput } from './types.ts'

export const MAX_DOCUMENT_FILES = 20
export const MAX_DOCUMENT_BYTES = 8 * 1024 * 1024
export const MAX_DOCUMENT_BATCH_BYTES = 24 * 1024 * 1024

export type DocumentFormat = 'md' | 'txt' | 'html' | 'csv' | 'opml' | 'pdf' | 'docx'

export interface ExtractedDocument {
  readonly name: string
  readonly title: string
  readonly mimeType: string
  readonly format: DocumentFormat
  readonly content: string
  readonly byteLength: number
  readonly locators?: readonly JsonValue[]
  readonly rows?: readonly (readonly string[])[]
  readonly outlines?: readonly JsonValue[]
  readonly lastModified?: string
}

export interface NormalizedDocuments {
  readonly records: CaptureRecord[]
  readonly rejected: CaptureRejection[]
  readonly received: number
}

const FORMATS: Record<string, { format: DocumentFormat; mimeTypes: readonly string[] }> = {
  '.md': { format: 'md', mimeTypes: ['text/markdown', 'text/plain', 'application/octet-stream'] },
  '.markdown': { format: 'md', mimeTypes: ['text/markdown', 'text/plain', 'application/octet-stream'] },
  '.txt': { format: 'txt', mimeTypes: ['text/plain', 'application/octet-stream'] },
  '.html': { format: 'html', mimeTypes: ['text/html', 'application/octet-stream'] },
  '.htm': { format: 'html', mimeTypes: ['text/html', 'application/octet-stream'] },
  '.csv': { format: 'csv', mimeTypes: ['text/csv', 'application/vnd.ms-excel', 'text/plain', 'application/octet-stream'] },
  '.opml': { format: 'opml', mimeTypes: ['text/x-opml', 'application/xml', 'text/xml', 'text/plain', 'application/octet-stream'] },
  '.xml': { format: 'opml', mimeTypes: ['text/x-opml', 'application/xml', 'text/xml', 'application/octet-stream'] },
  '.pdf': { format: 'pdf', mimeTypes: ['application/pdf', 'application/octet-stream'] },
  '.docx': { format: 'docx', mimeTypes: ['application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/octet-stream'] },
  '.doc': { format: 'docx', mimeTypes: ['application/msword', 'application/octet-stream'] },
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function extension(name: string): string {
  const dot = name.lastIndexOf('.')
  return dot < 0 ? '' : name.slice(dot).toLowerCase()
}

function validateName(value: unknown): string {
  if (typeof value !== 'string' || value.trim().length === 0 || value.length > 255) {
    throw new GraphError('INVALID_DOCUMENT_NAME', 'document name must be a non-empty base name of at most 255 characters')
  }
  const name = value.trim()
  if (name === '.' || name === '..' || /[/\\\0:]/u.test(name) || name.includes('://')) {
    throw new GraphError('HOST_PATH_REJECTED', 'document.import accepts bytes and a base name, never a host path')
  }
  return name
}

function documentTime(value: unknown): string | undefined {
  if (value === undefined) return undefined
  if (typeof value === 'number') {
    if (!Number.isSafeInteger(value) || value < 0) throw new GraphError('INVALID_TIMESTAMP', 'lastModified must be an ISO timestamp or non-negative epoch milliseconds')
    return new Date(value).toISOString()
  }
  if (typeof value !== 'string') throw new GraphError('INVALID_TIMESTAMP', 'lastModified must be an ISO timestamp or epoch milliseconds')
  timestamp(value, 'lastModified')
  return new Date(value).toISOString()
}

function decodeBase64(value: unknown): Buffer {
  if (typeof value !== 'string' || value.length === 0) throw new GraphError('INVALID_DOCUMENT_BYTES', 'dataBase64 must be a non-empty base64 string')
  if (value.length > Math.ceil(MAX_DOCUMENT_BYTES * 4 / 3) + 4) {
    throw new GraphError('DOCUMENT_TOO_LARGE', `decoded document exceeds ${MAX_DOCUMENT_BYTES} bytes`)
  }
  // Repeating a four-character group exhausts V8's regex stack on ordinary
  // multi-megabyte PDFs. Validate the alphabet and padding length separately.
  const padded = value.endsWith('=')
  if (!/^[A-Za-z0-9+/]+={0,2}$/u.test(value) || value.length % 4 === 1 || padded && value.length % 4 !== 0) {
    throw new GraphError('INVALID_DOCUMENT_BYTES', 'dataBase64 is not canonical base64; data URLs and host paths are not accepted')
  }
  const bytes = Buffer.from(value, 'base64')
  if (bytes.length === 0) throw new GraphError('INVALID_DOCUMENT_BYTES', 'document bytes must not be empty')
  if (bytes.length > MAX_DOCUMENT_BYTES) throw new GraphError('DOCUMENT_TOO_LARGE', `document exceeds ${MAX_DOCUMENT_BYTES} bytes`)
  return bytes
}

function decodeText(bytes: Buffer): string {
  let text: string
  try {
    text = new TextDecoder('utf-8', { fatal: true }).decode(bytes)
  } catch {
    throw new GraphError('INVALID_DOCUMENT_ENCODING', 'text documents must be valid UTF-8')
  }
  if (text.includes('\0')) throw new GraphError('INVALID_DOCUMENT_ENCODING', 'text documents must not contain NUL bytes')
  return text.startsWith('\uFEFF') ? text.slice(1) : text
}

function decodeEntities(value: string): string {
  const named: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' }
  return value.replace(/&(#x[\da-f]+|#\d+|[a-z]+);/giu, (entity, code: string) => {
    if (code.startsWith('#x') || code.startsWith('#X')) {
      const point = Number.parseInt(code.slice(2), 16)
      return Number.isFinite(point) && point <= 0x10ffff ? String.fromCodePoint(point) : entity
    }
    if (code.startsWith('#')) {
      const point = Number.parseInt(code.slice(1), 10)
      return Number.isFinite(point) && point <= 0x10ffff ? String.fromCodePoint(point) : entity
    }
    return named[code.toLowerCase()] ?? entity
  })
}

export function htmlToText(html: string): string {
  const withoutActiveContent = html
    .replace(/<!--[\s\S]*?-->/gu, ' ')
    .replace(/<(script|style|iframe|object|embed|svg|math|noscript|template)\b[^>]*>[\s\S]*?<\/\1\s*>/giu, ' ')
    .replace(/<(?:br|hr)\b[^>]*>/giu, '\n')
    .replace(/<\/(?:p|div|section|article|main|header|footer|aside|li|ul|ol|h[1-6]|tr|table|blockquote|pre)\s*>/giu, '\n')
  return decodeEntities(withoutActiveContent.replace(/<[^>]+>/gu, ' '))
    .replace(/\r\n?/gu, '\n')
    .split('\n')
    .map(line => line.replace(/[\t\f\v ]+/gu, ' ').trim())
    .join('\n')
    .replace(/\n{3,}/gu, '\n\n')
    .trim()
}

export function parseCsv(input: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let field = ''
  let quoted = false
  let closedQuote = false
  const pushField = (): void => {
    row.push(field)
    field = ''
    closedQuote = false
  }
  const pushRow = (): void => {
    pushField()
    rows.push(row)
    row = []
  }
  for (let index = 0; index < input.length; index += 1) {
    const char = input[index] as string
    if (quoted) {
      if (char === '"') {
        if (input[index + 1] === '"') {
          field += '"'
          index += 1
        } else {
          quoted = false
          closedQuote = true
        }
      } else field += char
      continue
    }
    if (closedQuote && char !== ',' && char !== '\n' && char !== '\r') {
      throw new GraphError('INVALID_CSV', `unexpected character after closing quote at offset ${index}`)
    }
    if (char === '"') {
      if (field.length !== 0) throw new GraphError('INVALID_CSV', `quote inside an unquoted CSV field at offset ${index}`)
      quoted = true
    } else if (char === ',') pushField()
    else if (char === '\n') pushRow()
    else if (char === '\r') {
      if (input[index + 1] === '\n') index += 1
      pushRow()
    } else field += char
  }
  if (quoted) throw new GraphError('INVALID_CSV', 'unterminated quoted CSV field')
  if (field.length > 0 || row.length > 0 || (input.length > 0 && !/[\r\n]$/u.test(input))) pushRow()
  return rows
}

function xmlAttributes(tag: string): Record<string, string> {
  const attributes: Record<string, string> = {}
  for (const match of tag.matchAll(/([:\w-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/gu)) {
    attributes[(match[1] as string).toLowerCase()] = decodeEntities((match[2] ?? match[3]) as string)
  }
  return attributes
}

function parseOpml(input: string): { content: string; outlines: JsonValue[] } {
  if (/<!DOCTYPE|<!ENTITY/iu.test(input)) throw new GraphError('UNSAFE_OPML', 'OPML DTD and entity declarations are not accepted')
  if (!/<opml\b/iu.test(input) || !/<body\b/iu.test(input)) throw new GraphError('INVALID_OPML', 'file is not an OPML document with a body')
  const title = decodeEntities(input.match(/<title\b[^>]*>([\s\S]*?)<\/title\s*>/iu)?.[1] ?? '').trim()
  const lines: string[] = title.length > 0 ? [`# ${title}`] : []
  const outlines: JsonValue[] = []
  let depth = 0
  for (const match of input.matchAll(/<outline\b[^>]*>|<\/outline\s*>/giu)) {
    const tag = match[0]
    if (tag.startsWith('</')) {
      depth = Math.max(0, depth - 1)
      continue
    }
    const attributes = xmlAttributes(tag)
    const text = attributes.text ?? attributes.title
    if (text !== undefined && text.trim().length > 0) {
      lines.push(`${'  '.repeat(depth)}- ${text.trim()}`)
      outlines.push({ index: outlines.length + 1, depth: depth + 1, text: text.trim(), attributes })
    }
    if (!/\/\s*>$/u.test(tag)) depth = Math.min(64, depth + 1)
  }
  return { content: lines.join('\n'), outlines }
}

async function extractPdf(bytes: Buffer): Promise<{ content: string; locators: JsonValue[] }> {
  if (bytes.subarray(0, 5).toString('ascii') !== '%PDF-') throw new GraphError('INVALID_PDF', 'file does not have a PDF header')
  let loading: { promise: Promise<{ numPages: number; getPage: (page: number) => Promise<{ getTextContent: () => Promise<{ items: unknown[] }> }> }>; destroy: () => Promise<void> } | undefined
  try {
    const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs')
    loading = pdfjs.getDocument({
      data: new Uint8Array(bytes),
      isEvalSupported: false,
      disableAutoFetch: true,
      disableStream: true,
      disableFontFace: true,
      useSystemFonts: false,
      verbosity: 0,
    }) as unknown as NonNullable<typeof loading>
    const document = await loading.promise
    const pages: string[] = []
    const locators: JsonValue[] = []
    for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
      const page = await document.getPage(pageNumber)
      const textContent = await page.getTextContent()
      let text = ''
      for (const item of textContent.items) {
        if (typeof item !== 'object' || item === null || !('str' in item) || typeof item.str !== 'string') continue
        text += item.str
        text += 'hasEOL' in item && item.hasEOL === true ? '\n' : ' '
      }
      text = text.split('\n').map(line => line.trim()).join('\n').replace(/\n{3,}/gu, '\n\n').trim()
      pages.push(text)
      locators.push({ page: pageNumber, locator: `page=${pageNumber}`, text, ...(text.length === 0 ? { ocrRequired: true } : {}) })
    }
    if (pages.every(page => page.trim().length === 0)) throw new GraphError('OCR_REQUIRED', 'PDF contains no extractable text; OCR is required for this scanned document')
    return { content: pages.join('\n\n'), locators }
  } catch (error: unknown) {
    if (error instanceof GraphError) throw error
    const name = typeof error === 'object' && error !== null && 'name' in error ? String(error.name) : ''
    const message = error instanceof Error ? error.message : String(error)
    if (name === 'PasswordException' || /password|encrypted/iu.test(message)) {
      throw new GraphError('PDF_ENCRYPTED', 'encrypted PDF files are not supported')
    }
    throw new GraphError('INVALID_PDF', 'PDF text extraction failed; the file is malformed or not a real PDF')
  } finally {
    await loading?.destroy().catch(() => undefined)
  }
}

async function extractDocx(bytes: Buffer): Promise<string> {
  const compoundFile = bytes.length >= 8 && bytes.subarray(0, 8).equals(Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]))
  if (compoundFile) throw new GraphError('DOCX_ENCRYPTED', 'encrypted OOXML or legacy compound documents are not accepted as DOCX')
  if (!(bytes[0] === 0x50 && bytes[1] === 0x4b)) throw new GraphError('INVALID_DOCX', 'DOCX must be a real ZIP-based Office Open XML document')
  try {
    const mammoth = await import('mammoth')
    const extracted = await mammoth.extractRawText({ buffer: bytes })
    return extracted.value.trim()
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error)
    if (/encrypt|password/iu.test(message)) throw new GraphError('DOCX_ENCRYPTED', 'encrypted DOCX files are not supported')
    throw new GraphError('INVALID_DOCX', 'DOCX extraction failed; the archive is forged, encrypted, or missing word/document.xml')
  }
}

export async function extractDocument(input: DocumentFileInput): Promise<ExtractedDocument> {
  if (!isRecord(input)) throw new GraphError('INVALID_DOCUMENT', 'each document must be an object with name, mimeType, and dataBase64')
  for (const field of ['path', 'filePath', 'url', 'uri']) {
    if (input[field] !== undefined) throw new GraphError('HOST_PATH_REJECTED', `document field ${field} is not accepted; send bytes only`)
  }
  const name = validateName(input.name)
  const format = FORMATS[extension(name)]
  if (format === undefined) throw new GraphError('UNSUPPORTED_DOCUMENT', 'supported formats are MD, TXT, HTML, CSV, OPML, PDF, and DOCX; legacy DOC is not supported')
  if (extension(name) === '.doc') throw new GraphError('LEGACY_DOC_UNSUPPORTED', 'legacy .doc files are not supported; convert to DOCX without macros first')
  if (typeof input.mimeType !== 'string') throw new GraphError('INVALID_DOCUMENT_MIME', 'mimeType must be a string')
  const mimeType = input.mimeType.split(';', 1)[0]?.trim().toLowerCase() ?? ''
  if (!format.mimeTypes.includes(mimeType)) throw new GraphError('DOCUMENT_MIME_MISMATCH', `mimeType ${mimeType || '(empty)'} does not match ${extension(name)}`)
  const bytes = decodeBase64(input.dataBase64)
  const lastModified = documentTime(input.lastModified)
  const title = name.slice(0, name.length - extension(name).length) || name
  let content: string
  let locators: JsonValue[] | undefined
  let rows: string[][] | undefined
  let outlines: JsonValue[] | undefined
  if (format.format === 'pdf') {
    const extracted = await extractPdf(bytes)
    content = extracted.content
    locators = extracted.locators
  } else if (format.format === 'docx') {
    content = await extractDocx(bytes)
  } else {
    const text = decodeText(bytes)
    if (format.format === 'html') content = htmlToText(text)
    else if (format.format === 'csv') {
      rows = parseCsv(text)
      content = rows.map(row => row.join('\t')).join('\n')
    } else if (format.format === 'opml') {
      const extracted = parseOpml(text)
      content = extracted.content
      outlines = extracted.outlines
      locators = outlines.map(outline => ({ opmlOutline: (outline as { index: number }).index }))
    } else content = text
  }
  if (content.trim().length === 0) throw new GraphError('EMPTY_DOCUMENT', 'document contains no extractable text')
  if (Buffer.byteLength(content, 'utf8') > MAX_DOCUMENT_BYTES) throw new GraphError('DOCUMENT_TOO_LARGE', `extracted document text exceeds ${MAX_DOCUMENT_BYTES} bytes`)
  return {
    name, title, mimeType, format: format.format, content, byteLength: bytes.length,
    ...(locators === undefined ? {} : { locators }),
    ...(rows === undefined ? {} : { rows }),
    ...(outlines === undefined ? {} : { outlines }),
    ...(lastModified === undefined ? {} : { lastModified }),
  }
}

export async function normalizeDocumentFiles(files: unknown, asOf: string): Promise<NormalizedDocuments> {
  timestamp(asOf, 'asOf')
  if (!Array.isArray(files) || files.length === 0 || files.length > MAX_DOCUMENT_FILES) {
    throw new GraphError('INVALID_REQUEST', `files must contain between 1 and ${MAX_DOCUMENT_FILES} documents`)
  }
  const records: CaptureRecord[] = []
  const rejected: CaptureRejection[] = []
  let totalBytes = 0
  for (let index = 0; index < files.length; index += 1) {
    const value = files[index]
    try {
      const document = await extractDocument(value as DocumentFileInput)
      totalBytes += document.byteLength
      if (totalBytes > MAX_DOCUMENT_BATCH_BYTES) throw new GraphError('DOCUMENT_BATCH_TOO_LARGE', `document batch exceeds ${MAX_DOCUMENT_BATCH_BYTES} input bytes`)
      const availableAt = document.lastModified ?? asOf
      records.push({
        captureKind: 'document',
        provider: 'document.import',
        canonicalUrl: `urn:dsh:document:${hashId({ name: document.name })}`,
        title: document.title,
        content: document.content,
        contentHash: hashText(document.content),
        annotations: [],
        annotationHash: annotationListHash([]),
        asOf: availableAt,
        availableAt,
        mimeType: document.mimeType,
        provenance: {
          fileName: document.name,
          format: document.format,
          ...(document.lastModified === undefined ? { availabilityBasis: 'imported_at_asOf' } : { lastModified: document.lastModified }),
          ...(document.rows === undefined ? {} : { rowCount: document.rows.length }),
          ...(document.outlines === undefined ? {} : { outlineCount: document.outlines.length }),
          scriptsExecuted: false,
          linksFetched: false,
        },
        ...(document.locators === undefined ? {} : { locators: document.locators }),
      })
    } catch (error: unknown) {
      if (error instanceof GraphError && error.code === 'DOCUMENT_BATCH_TOO_LARGE') throw error
      rejected.push({
        index,
        code: error instanceof GraphError ? error.code : 'INVALID_DOCUMENT',
        message: error instanceof Error ? error.message : String(error),
        ...(isRecord(value) && typeof value.name === 'string' ? { name: value.name.slice(0, 255) } : {}),
      })
    }
  }
  return { records, rejected, received: files.length }
}
