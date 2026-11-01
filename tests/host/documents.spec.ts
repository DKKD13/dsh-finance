import { join } from 'node:path'
import { Context } from '@deepseek-ai/cordis'
import { afterEach, describe, expect, it } from 'vitest'
import { extractDocument, MAX_DOCUMENT_FILES } from '../../src/finance/documents.ts'
import { FinanceService } from '../../src/finance/service.ts'
import { ResearchGraphService, resolveConfig } from '../../src/service.ts'
import { makePdf } from './document-fixtures.ts'
import { makeTempDir } from './fixtures.ts'

const cleanups: (() => Promise<void>)[] = []
afterEach(async () => {
  while (cleanups.length > 0) await cleanups.pop()?.()
})

const asOf = '2026-02-01T00:00:00.000Z'
const DOCX = 'UEsDBAoAAAAAAPitXl3mdcR+iwEAAIsBAAATAAAAW0NvbnRlbnRfVHlwZXNdLnhtbDw/eG1sIHZlcnNpb249IjEuMCI/PjxUeXBlcyB4bWxucz0iaHR0cDovL3NjaGVtYXMub3BlbnhtbGZvcm1hdHMub3JnL3BhY2thZ2UvMjAwNi9jb250ZW50LXR5cGVzIj48RGVmYXVsdCBFeHRlbnNpb249InJlbHMiIENvbnRlbnRUeXBlPSJhcHBsaWNhdGlvbi92bmQub3BlbnhtbGZvcm1hdHMtcGFja2FnZS5yZWxhdGlvbnNoaXBzK3htbCIvPjxEZWZhdWx0IEV4dGVuc2lvbj0ieG1sIiBDb250ZW50VHlwZT0iYXBwbGljYXRpb24veG1sIi8+PE92ZXJyaWRlIFBhcnROYW1lPSIvd29yZC9kb2N1bWVudC54bWwiIENvbnRlbnRUeXBlPSJhcHBsaWNhdGlvbi92bmQub3BlbnhtbGZvcm1hdHMtb2ZmaWNlZG9jdW1lbnQud29yZHByb2Nlc3NpbmdtbC5kb2N1bWVudC5tYWluK3htbCIvPjwvVHlwZXM+UEsDBAoAAAAAAPitXl0AAAAAAAAAAAAAAAAGAAAAX3JlbHMvUEsDBAoAAAAAAPitXl1fM5VSBwEAAAcBAAALAAAAX3JlbHMvLnJlbHM8P3htbCB2ZXJzaW9uPSIxLjAiPz48UmVsYXRpb25zaGlwcyB4bWxucz0iaHR0cDovL3NjaGVtYXMub3BlbnhtbGZvcm1hdHMub3JnL3BhY2thZ2UvMjAwNi9yZWxhdGlvbnNoaXBzIj48UmVsYXRpb25zaGlwIElkPSJySWQxIiBUeXBlPSJodHRwOi8vc2NoZW1hcy5vcGVueG1sZm9ybWF0cy5vcmcvb2ZmaWNlRG9jdW1lbnQvMjAwNi9yZWxhdGlvbnNoaXBzL29mZmljZURvY3VtZW50IiBUYXJnZXQ9IndvcmQvZG9jdW1lbnQueG1sIi8+PC9SZWxhdGlvbnNoaXBzPlBLAwQKAAAAAAD4rV5dAAAAAAAAAAAAAAAABQAAAHdvcmQvUEsDBAoAAAAAAPitXl1K1l6QwwAAAMMAAAARAAAAd29yZC9kb2N1bWVudC54bWw8P3htbCB2ZXJzaW9uPSIxLjAiPz48dzpkb2N1bWVudCB4bWxuczp3PSJodHRwOi8vc2NoZW1hcy5vcGVueG1sZm9ybWF0cy5vcmcvd29yZHByb2Nlc3NpbmdtbC8yMDA2L21haW4iPjx3OmJvZHk+PHc6cD48dzpyPjx3OnQ+RE9DWCBsb2NhbCBleHRyYWN0aW9uIHdvcmtzLjwvdzp0PjwvdzpyPjwvdzpwPjwvdzpib2R5Pjwvdzpkb2N1bWVudD5QSwECFAAKAAAAAAD4rV5d5nXEfosBAACLAQAAEwAAAAAAAAAAAAAAAAAAAAAAW0NvbnRlbnRfVHlwZXNdLnhtbFBLAQIUAAoAAAAAAPitXl0AAAAAAAAAAAAAAAAGAAAAAAAAAAAAEAAAALwBAABfcmVscy9QSwECFAAKAAAAAAD4rV5dXzOVUgcBAAAHAQAACwAAAAAAAAAAAAAAAADgAQAAX3JlbHMvLnJlbHNQSwECFAAKAAAAAAD4rV5dAAAAAAAAAAAAAAAABQAAAAAAAAAAABAAAAAQAwAAd29yZC9QSwECFAAKAAAAAAD4rV5dStZekMMAAADDAAAAEQAAAAAAAAAAAAAAAAAzAwAAd29yZC9kb2N1bWVudC54bWxQSwUGAAAAAAUABQAgAQAAJQQAAAAA'

function file(name: string, mimeType: string, value: string | Buffer, lastModified?: string | number) {
  return { name, mimeType, dataBase64: Buffer.isBuffer(value) ? value.toString('base64') : Buffer.from(value, 'utf8').toString('base64'), ...(lastModified === undefined ? {} : { lastModified }) }
}

async function setup() {
  const temp = await makeTempDir('documents')
  cleanups.push(temp.cleanup)
  const config = resolveConfig({ dataDir: join(temp.dir, 'data'), autoIndexSkills: false }, join(temp.dir, 'skills'))
  const graph = new ResearchGraphService(new Context(), config)
  const finance = new FinanceService(new Context(), graph)
  return { config, graph, finance }
}

describe('byte-only document extraction', () => {
  it('decodes a normal multi-megabyte document without overflowing the regex stack', async () => {
    const body = 'Public financial statement\n'.repeat(190_000)
    const input = file('large-public-statement.txt', 'text/plain', body)
    const extracted = await extractDocument(input)
    expect(extracted.content).toBe(body)
    expect(extracted.byteLength).toBe(Buffer.byteLength(body))
    await expect(extractDocument({ ...input, dataBase64: `${input.dataBase64.slice(0, -1)}!` })).rejects.toMatchObject({ code: 'INVALID_DOCUMENT_BYTES' })
  })

  it('preserves padded and unpadded base64 while rejecting invalid padding and one-character tails', async () => {
    for (const dataBase64 of ['YQ==', 'YQ', 'YWI=', 'YWI', 'YWJj']) {
      expect((await extractDocument({ name: 'x.txt', mimeType: 'text/plain', dataBase64 })).content).toBe(Buffer.from(dataBase64, 'base64').toString('utf8'))
    }
    for (const dataBase64 of ['A', 'YQ=', 'YWI==', 'YWJj=', '=YQ=', 'YQ===', 'Y Q==']) {
      await expect(extractDocument({ name: 'x.txt', mimeType: 'text/plain', dataBase64 })).rejects.toMatchObject({ code: 'INVALID_DOCUMENT_BYTES' })
    }
  })

  it('really parses MD, TXT, HTML, CSV and OPML without executing active content or fetching outlines', async () => {
    expect((await extractDocument(file('notes.md', 'text/markdown', '# Heading\n\nMarkdown body'))).content).toContain('Markdown body')
    expect((await extractDocument(file('notes.txt', 'text/plain', 'Plain text'))).content).toBe('Plain text')
    const html = await extractDocument(file('page.html', 'text/html', '<html><head><style>hidden style</style><script>globalThis.pwned=true</script></head><body><h1>Title</h1><p>Safe &amp; local</p></body></html>'))
    expect(html.content).toBe('Title\nSafe & local')
    expect(html.content).not.toContain('pwned')
    expect((globalThis as { pwned?: boolean }).pwned).toBeUndefined()

    const csv = await extractDocument(file('table.csv', 'text/csv', 'name,note\n"A, Inc.","line 1\nline 2"\nformula,"=HYPERLINK(""https://invalid"",""click"")"'))
    expect(csv.rows).toEqual([['name', 'note'], ['A, Inc.', 'line 1\nline 2'], ['formula', '=HYPERLINK("https://invalid","click")']])
    expect(csv.content).toContain('=HYPERLINK')

    const opml = await extractDocument(file('feeds.opml', 'text/x-opml', '<?xml version="1.0"?><opml version="2.0"><head><title>Research feeds</title></head><body><outline text="Group"><outline text="Public feed" xmlUrl="https://feeds.invalid/never-fetch.xml"/></outline></body></opml>'))
    expect(opml.content).toContain('# Research feeds')
    expect(opml.content).toContain('  - Public feed')
    expect(opml.outlines).toHaveLength(2)
  })

  it('extracts real PDF text with page locators and rejects scanned, encrypted and forged PDFs', async () => {
    const pdf = await extractDocument(file('report.pdf', 'application/pdf', makePdf(['First page text', 'Second page text'])))
    expect(pdf.content).toContain('First page text')
    expect(pdf.content).toContain('Second page text')
    expect(pdf.locators).toMatchObject([{ page: 1, locator: 'page=1' }, { page: 2, locator: 'page=2' }])
    await expect(extractDocument(file('scan.pdf', 'application/pdf', makePdf([''])))).rejects.toMatchObject({ code: 'OCR_REQUIRED' })
    await expect(extractDocument(file('encrypted.pdf', 'application/pdf', makePdf(['Secret'], true)))).rejects.toMatchObject({ code: 'PDF_ENCRYPTED' })
    await expect(extractDocument(file('fake.pdf', 'application/pdf', 'not a pdf'))).rejects.toMatchObject({ code: 'INVALID_PDF' })
  })

  it('dynamically extracts real DOCX and explicitly rejects forged, encrypted and legacy DOC inputs', async () => {
    const docx = await extractDocument({ name: 'report.docx', mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', dataBase64: DOCX })
    expect(docx.content).toContain('DOCX local extraction works.')
    await expect(extractDocument(file('fake.docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'PK forged archive'))).rejects.toMatchObject({ code: 'INVALID_DOCX' })
    const compound = Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1, 0, 0])
    await expect(extractDocument(file('encrypted.docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', compound))).rejects.toMatchObject({ code: 'DOCX_ENCRYPTED' })
    await expect(extractDocument(file('legacy.doc', 'application/msword', compound))).rejects.toMatchObject({ code: 'LEGACY_DOC_UNSUPPORTED' })
  })

  it('rejects host paths, spoofed bytes, malformed CSV/OPML, and excessive file counts', async () => {
    await expect(extractDocument(file('/etc/passwd', 'text/plain', 'no paths'))).rejects.toMatchObject({ code: 'HOST_PATH_REJECTED' })
    await expect(extractDocument(file('C:\\secret.txt', 'text/plain', 'no paths'))).rejects.toMatchObject({ code: 'HOST_PATH_REJECTED' })
    await expect(extractDocument({ ...file('x.txt', 'text/plain', 'x'), path: '/tmp/x' })).rejects.toMatchObject({ code: 'HOST_PATH_REJECTED' })
    await expect(extractDocument(file('fake.pdf', 'application/pdf', 'not pdf'))).rejects.toMatchObject({ code: 'INVALID_PDF' })
    await expect(extractDocument(file('mime.txt', 'application/pdf', 'text'))).rejects.toMatchObject({ code: 'DOCUMENT_MIME_MISMATCH' })
    await expect(extractDocument({ name: 'x.txt', mimeType: 'text/plain', dataBase64: 'file:///tmp/x' })).rejects.toMatchObject({ code: 'INVALID_DOCUMENT_BYTES' })
    await expect(extractDocument(file('bad.csv', 'text/csv', '"unterminated'))).rejects.toMatchObject({ code: 'INVALID_CSV' })
    await expect(extractDocument(file('bad.opml', 'text/x-opml', '<!DOCTYPE x [<!ENTITY y SYSTEM "file:///etc/passwd">]><opml><body>&y;</body></opml>'))).rejects.toMatchObject({ code: 'UNSAFE_OPML' })
    await expect(extractDocument(file('macro.docm', 'application/vnd.ms-word.document.macroEnabled.12', 'PK'))).rejects.toMatchObject({ code: 'UNSUPPORTED_DOCUMENT' })
    const { finance } = await setup()
    await expect(finance.importDocuments({ files: Array.from({ length: MAX_DOCUMENT_FILES + 1 }, () => file('x.txt', 'text/plain', 'x')), asOf })).rejects.toMatchObject({ code: 'INVALID_REQUEST' })
  })
})

describe('document graph import', () => {
  it('uses dryRun by default, atomically imports accepted files with explicit rejections, and survives restart', async () => {
    const { finance, graph, config } = await setup()
    const valid = file('valid.txt', 'text/plain', 'persistent local document', Date.parse('2026-01-30T00:00:00Z'))
    const preview = await finance.importDocuments({ files: [valid], asOf, runId: 'doc-preview' })
    expect(preview).toMatchObject({ dryRun: true, revision: 0, changed: false, documentIds: preview.documentIds })
    expect(await graph.currentRevision()).toBe(0)

    const input = { files: [valid, file('scan.pdf', 'application/pdf', makePdf(['']))], dryRun: false, asOf, runId: 'doc-run' }
    const imported = await finance.importDocuments(input)
    expect(imported).toMatchObject({ revision: 1, changed: true, status: 'partial', annotationCount: 0 })
    expect(imported.documentIds).toHaveLength(1)
    expect(imported.rejected).toEqual([expect.objectContaining({ code: 'OCR_REQUIRED', name: 'scan.pdf' })])
    expect((await graph.revisions()).map(entry => entry.op)).toEqual(['finance.document.import'])
    expect((await graph.getNode(imported.documentIds[0] as string))?.metadata).toMatchObject({ availableAt: '2026-01-30T00:00:00.000Z', status: 'accepted' })
    expect((await finance.importDocuments(input))).toMatchObject({ revision: 1, changed: false, status: 'partial' })

    const reopenedGraph = new ResearchGraphService(new Context(), config)
    const reopenedFinance = new FinanceService(new Context(), reopenedGraph)
    expect((await reopenedFinance.importDocuments(input)).changed).toBe(false)
    expect((await reopenedGraph.getNode(imported.documentIds[0] as string))?.content).toBe('persistent local document')

    const future = await reopenedFinance.importDocuments({ files: [file('future.txt', 'text/plain', 'future file', '2026-02-02T00:00:00Z')], dryRun: false, asOf, runId: 'doc-future' })
    expect(future.status).toBe('quarantined')
    expect((await reopenedGraph.getNode(future.documentIds[0] as string))?.metadata.quarantineReason).toBe('FUTURE_AVAILABLE_AT')
  })
})
