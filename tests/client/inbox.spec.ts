import { describe, expect, it } from 'vitest'
import {
  base64FromArrayBuffer,
  describeInboxFile,
  formatFileSize,
  inferInboxMimeType,
  parseClipperJson,
  readInboxPreview,
  readInboxReviewItems,
} from '../../client/inbox.ts'
import { FinanceStore, financeOperation } from '../../client/finance-store.ts'
import type { FinanceGateway } from '../../client/finance-store.ts'
import type { GraphResponse } from '../../src/protocol.ts'
import type { Translate } from '../../client/store.ts'

const t: Translate = key => key
const item = {
  provider: 'clipper', canonicalUrl: 'https://example.com/article', title: 'Article', content: 'alpha beta',
  contentHash: 'sha256:test', asOf: '2026-01-01T00:00:00Z', availableAt: '2026-01-01T00:00:00Z', fetchedAt: '2026-01-01T00:00:00Z', provenance: {},
}

function deferred() {
  let resolve!: (value: GraphResponse) => void
  const promise = new Promise<GraphResponse>(resolvePromise => { resolve = resolvePromise })
  return { promise, resolve }
}

describe('Inbox input and preview model', () => {
  it('validates Clipper JSON without deriving availableAt from capturedAt', () => {
    const clip = parseClipperJson(JSON.stringify({
      schema: 'dsh.clipper/v1', kind: 'selection', capturedAt: '2026-01-02T00:00:00Z',
      content: { text: 'alpha beta' }, annotations: [{ exact: 'beta', prefix: 'alpha ', suffix: '', note: 'keep', tags: ['claim'] }],
    }))
    expect(clip.capturedAt).toBe('2026-01-02T00:00:00Z')
    expect(clip).not.toHaveProperty('availableAt')
    expect(() => parseClipperJson('{"schema":"other"}')).toThrow('dsh.clipper/v1')
    expect(() => parseClipperJson('{"schema":"dsh.clipper/v1","kind":"page","content":{}}')).toThrow('content.text')
  })

  it('reads file arrayBuffer into base64 and retains name, MIME, and lastModified', async () => {
    const bytes = Uint8Array.from([0, 1, 2, 255, 254])
    const file = await describeInboxFile({ name: 'NOTE.MD', size: bytes.byteLength, type: '', lastModified: 123, arrayBuffer: async () => bytes.buffer })
    expect(file).toEqual({ name: 'NOTE.MD', mimeType: 'text/markdown', dataBase64: 'AAEC//4=', lastModified: 123 })
    expect([...atob(file.dataBase64)].map(character => character.charCodeAt(0))).toEqual([...bytes])
    expect(base64FromArrayBuffer(new ArrayBuffer(0))).toBe('')
    expect(inferInboxMimeType('filing.docx')).toContain('wordprocessingml')
    expect(formatFileSize(2048)).toBe('2.00 KiB')
    await expect(describeInboxFile({ name: 'secret.exe', size: 0, type: '', arrayBuffer: async () => new ArrayBuffer(0) })).rejects.toThrow('Unsupported')
  })

  it('exposes all outcome classes and the actual planned nodes', () => {
    const preview = readInboxPreview({
      dryRun: true, runId: 'run-1', asOf: '2026-01-01T00:00:00Z', items: [item],
      counts: { received: 3, accepted: 1, duplicates: 1, quarantined: 1 }, duplicates: ['same'], quarantined: ['missing time'], rejected: [{ code: 'BAD_FILE' }], errors: [{ code: 'PARTIAL' }],
      plan: { nodes: [{ id: 'source:1', kind: 'source', title: 'Article' }], edges: [] },
    })
    expect(preview).toMatchObject({ received: 3, accepted: 1, dryRun: true, runId: 'run-1' })
    expect(preview?.duplicates).toEqual(['same'])
    expect(preview?.quarantined).toEqual(['missing time'])
    expect(preview?.rejected).toEqual([{ code: 'BAD_FILE' }])
    expect(preview?.errors).toEqual([{ code: 'PARTIAL' }])
    expect(preview?.plannedNodes).toEqual([{ id: 'source:1', kind: 'source', title: 'Article' }])
  })

  it('reads the real RSS review items independently from the 41 projected graph ids', () => {
    const sourceIds = Array.from({ length: 20 }, (_, index) => `source:${index + 1}`)
    const rawIds = Array.from({ length: 20 }, (_, index) => `raw:${index + 1}`)
    const rssItem = {
      provider: 'feed',
      canonicalUrl: 'https://www.federalreserve.gov/newsevents/pressreleases/orders20261029a.htm',
      title: 'Federal Reserve Board announces approval of application by The Bank of Nova Scotia',
      content: 'Federal Reserve Board announces approval of application by The Bank of Nova Scotia',
      asOf: '2026-11-01T00:33:39.027Z',
      fetchedAt: '2026-11-01T00:33:39.027Z',
      availableAt: '2026-10-29T20:30:00.000Z',
    }
    const preview = readInboxPreview({
      dryRun: true,
      asOf: rssItem.asOf,
      items: [rssItem],
      sourceIds,
      rawIds,
      sessionId: 'session:rss',
      plan: { nodes: [...sourceIds, ...rawIds, 'session:rss'].map(id => ({ id })) },
      counts: { received: 20, accepted: 20, duplicates: 0, quarantined: 0 },
    })

    expect(preview?.plannedNodes).toHaveLength(41)
    expect(readInboxReviewItems(preview?.items ?? [])).toEqual([{
      provider: 'feed',
      title: rssItem.title,
      url: rssItem.canonicalUrl,
      content: rssItem.content,
      status: 'accepted',
    }])
  })
})

describe('Inbox FinanceStore requests', () => {
  it('commits exactly the previewed URL SourceItems with dryRun:false', async () => {
    const seen: unknown[] = []
    const gateway: FinanceGateway = {
      request: async request => {
        seen.push(request)
        if (request.op === 'source.fetch') return { ok: true, revision: 4, result: { dryRun: true, runId: 'run-1', asOf: item.asOf, items: [item], sourceIds: ['source:1'], rawIds: ['raw:1'], counts: { received: 1, accepted: 1 } } }
        return { ok: true, revision: 5, result: { dryRun: false, revision: 5, changed: true, sourceIds: ['source:1'] } }
      },
    }
    const store = new FinanceStore(gateway, t)
    expect(await store.previewUrl('rss', 'https://example.com/feed.xml', item.asOf)).toBe(true)
    expect(seen[0]).toEqual({ op: 'source.fetch', input: { source: 'rss', url: 'https://example.com/feed.xml', dryRun: true, asOf: item.asOf } })
    expect(await store.commitInbox()).toBe(true)
    expect(seen[1]).toEqual({ op: 'source.ingest', input: { items: [item], dryRun: false, runId: 'run-1', asOf: item.asOf } })
    expect(financeOperation(store.getSnapshot(), 'inboxCommit').result).toMatchObject({ revision: 5, dryRun: false })
  })

  it('replays a Clip bundle through clipper.import with only dryRun and run lineage changed', async () => {
    const seen: unknown[] = []
    const gateway: FinanceGateway = {
      request: async request => {
        seen.push(request)
        if (seen.length === 1) return { ok: true, revision: 4, result: { dryRun: true, runId: 'run-clip', asOf: item.asOf, items: [{ ...item, captureKind: 'clip' }], clipIds: ['clip:1'], counts: { received: 1, accepted: 1 } } }
        return { ok: true, revision: 5, result: { dryRun: false, revision: 5, changed: true, clipIds: ['clip:1'] } }
      },
    }
    const store = new FinanceStore(gateway, t)
    const clip = parseClipperJson('{"schema":"dsh.clipper/v1","kind":"page","url":"https://example.com/article","content":{"text":"alpha beta"}}')
    expect(await store.previewClip(clip, item.asOf)).toBe(true)
    expect(seen[0]).toEqual({ op: 'clipper.import', input: { bundle: clip, dryRun: true, asOf: item.asOf } })
    expect(await store.commitInbox()).toBe(true)
    expect(seen[1]).toEqual({ op: 'clipper.import', input: { bundle: clip, dryRun: false, asOf: item.asOf, runId: 'run-clip' } })
  })

  it('uses document.import files with dataBase64 for local documents', async () => {
    const seen: unknown[] = []
    const gateway: FinanceGateway = {
      request: async request => {
        seen.push(request)
        return { ok: true, revision: 2, result: { dryRun: true, asOf: item.asOf, items: [{ ...item, captureKind: 'document' }] } }
      },
    }
    const store = new FinanceStore(gateway, t)
    const file = { name: 'note.md', mimeType: 'text/markdown', dataBase64: 'YWxwaGE=', lastModified: 123 }
    expect(await store.previewFile(file, item.asOf)).toBe(true)
    expect(seen[0]).toEqual({ op: 'document.import', input: { files: [file], dryRun: true, asOf: item.asOf } })
  })

  it('ignores late same-operation responses while allowing other operations to proceed', async () => {
    const pending = new Map<string, ReturnType<typeof deferred>[]>()
    const gateway: FinanceGateway = {
      request: request => {
        const wait = deferred()
        const waits = pending.get(request.op) ?? []
        waits.push(wait)
        pending.set(request.op, waits)
        return wait.promise
      },
    }
    const store = new FinanceStore(gateway, t)
    const oldPreview = store.previewUrl('rss', 'https://example.com/old.xml')
    const newPreview = store.previewUrl('rss', 'https://example.com/new.xml')
    const quote = store.fetchQuote('AAPL')
    expect(pending.get('source.fetch')).toHaveLength(2)
    expect(pending.get('market.fetch')).toHaveLength(1)
    pending.get('source.fetch')?.[1]?.resolve({ ok: true, revision: 4, result: { dryRun: true, items: [{ ...item, title: 'new' }] } })
    pending.get('market.fetch')?.[0]?.resolve({ ok: true, revision: 4, result: { dryRun: true, items: [] } })
    expect(await newPreview).toBe(true)
    expect(await quote).toBe(true)
    pending.get('source.fetch')?.[0]?.resolve({ ok: true, revision: 3, result: { dryRun: true, items: [{ ...item, title: 'old' }] } })
    expect(await oldPreview).toBe(false)
    expect(financeOperation(store.getSnapshot(), 'ingest').result).toMatchObject({ items: [{ title: 'new' }] })
    expect(financeOperation(store.getSnapshot(), 'quote').status).toBe('success')
    expect(store.getSnapshot().busy).toBeNull()
    expect(store.getSnapshot().revision).toBe(4)
  })

  it('fails closed when commit has no previewed SourceItems', async () => {
    let calls = 0
    const store = new FinanceStore({ request: async () => { calls += 1; return { ok: false, error: { code: 'UNEXPECTED', message: 'no call expected' } } } }, t)
    expect(await store.commitInbox()).toBe(false)
    expect(calls).toBe(0)
    expect(financeOperation(store.getSnapshot(), 'inboxCommit').error?.code).toBe('NO_PREVIEW_ITEMS')
  })

  it('invalidates a reviewed input without clearing unrelated operation results', async () => {
    const seen: string[] = []
    const gateway: FinanceGateway = {
      request: async request => {
        seen.push(request.op)
        if (request.op === 'source.fetch') return { ok: true, revision: 4, result: { dryRun: true, runId: 'run-1', asOf: item.asOf, items: [item] } }
        if (request.op === 'market.fetch') return { ok: true, revision: 4, result: { symbol: 'AAPL', regularMarketPrice: 124 } }
        return { ok: false, error: { code: 'UNEXPECTED', message: 'stale commit must not reach the Host' } }
      },
    }
    const store = new FinanceStore(gateway, t)
    expect(await store.previewUrl('rss', item.canonicalUrl)).toBe(true)
    expect(await store.fetchQuote('AAPL')).toBe(true)
    const quote = financeOperation(store.getSnapshot(), 'quote')
    store.invalidateInboxInput()
    expect(await store.commitInbox()).toBe(false)
    expect(seen).toEqual(['source.fetch', 'market.fetch'])
    expect(financeOperation(store.getSnapshot(), 'inboxCommit').error?.code).toBe('NO_PREVIEW_ITEMS')
    expect(financeOperation(store.getSnapshot(), 'quote')).toBe(quote)
  })

  it('replays a reused runId only with the newly previewed input', async () => {
    const seen: unknown[] = []
    const gateway: FinanceGateway = {
      request: async request => {
        seen.push(request)
        if (request.op === 'source.fetch') {
          const url = (request.input as { url: string }).url
          return { ok: true, revision: 4, result: { dryRun: true, runId: 'shared-run', asOf: item.asOf, items: [{ ...item, canonicalUrl: url, title: url }] } }
        }
        return { ok: true, revision: 5, result: { dryRun: false, revision: 5, changed: true } }
      },
    }
    const store = new FinanceStore(gateway, t)
    expect(await store.previewUrl('rss', 'https://example.com/old.xml')).toBe(true)
    store.invalidateInboxInput()
    expect(await store.previewUrl('rss', 'https://example.com/new.xml')).toBe(true)
    expect(await store.commitInbox()).toBe(true)
    expect(seen[2]).toMatchObject({ op: 'source.ingest', input: { runId: 'shared-run', items: [{ canonicalUrl: 'https://example.com/new.xml', title: 'https://example.com/new.xml' }] } })
  })

  it('does not restore an invalidated preview when its response arrives late', async () => {
    const pending = deferred()
    const store = new FinanceStore({ request: () => pending.promise }, t)
    const preview = store.previewUrl('rss', 'https://example.com/old.xml')
    store.invalidateInboxInput()
    pending.resolve({ ok: true, revision: 4, result: { dryRun: true, runId: 'old-run', items: [item] } })
    expect(await preview).toBe(false)
    expect(await store.commitInbox()).toBe(false)
    expect(financeOperation(store.getSnapshot(), 'inboxCommit').error?.code).toBe('NO_PREVIEW_ITEMS')
  })

  it('suppresses late commit feedback after input changes but still refreshes the graph', async () => {
    const pending = deferred()
    let graphChanges = 0
    const gateway: FinanceGateway = {
      request: request => {
        if (request.op === 'source.fetch') return Promise.resolve({ ok: true, revision: 4, result: { dryRun: true, runId: 'run-1', items: [item] } })
        return pending.promise
      },
    }
    const store = new FinanceStore(gateway, t, async () => { graphChanges += 1 })
    expect(await store.previewUrl('rss', item.canonicalUrl)).toBe(true)
    const commit = store.commitInbox()
    store.invalidateInboxInput()
    pending.resolve({ ok: true, revision: 5, result: { dryRun: false, revision: 5, changed: true } })
    expect(await commit).toBe(true)
    expect(graphChanges).toBe(1)
    expect(store.getSnapshot().notice).toBeNull()
    expect(financeOperation(store.getSnapshot(), 'inboxCommit').status).toBe('success')
  })
})
