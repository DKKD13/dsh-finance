import { createHash } from 'node:crypto'
import { join } from 'node:path'
import { Context } from '@deepseek-ai/cordis'
import { afterEach, describe, expect, it } from 'vitest'
import { executeFinanceRequest } from '../../src/finance/protocol.ts'
import { FinanceService } from '../../src/finance/service.ts'
import type { FinanceDataDependencies } from '../../src/finance/sources.ts'
import type { SourceItem } from '../../src/finance/types.ts'
import { ResearchGraphService, resolveConfig } from '../../src/service.ts'
import { makeTempDir } from './fixtures.ts'

const cleanups: (() => Promise<void>)[] = []
afterEach(async () => {
  while (cleanups.length > 0) await cleanups.pop()?.()
})

const at = '2026-01-10T00:00:00.000Z'
function item(content = 'original body', canonicalUrl = 'https://news.example.com/story?utm_source=test&id=7'): SourceItem {
  return {
    provider: 'fixture.news', canonicalUrl, title: 'Original story', content,
    contentHash: `sha256:${createHash('sha256').update(content).digest('hex')}`,
    asOf: at, availableAt: '2026-01-09T00:00:00.000Z', fetchedAt: at,
    provenance: { locator: 'article-body' },
  }
}

async function setup(dependencies: FinanceDataDependencies = {}) {
  const temp = await makeTempDir('finance-ingest')
  cleanups.push(temp.cleanup)
  const ctx = new Context()
  const config = resolveConfig({ dataDir: join(temp.dir, 'data'), autoIndexSkills: false }, join(temp.dir, 'skills'))
  const graph = new ResearchGraphService(ctx, config)
  const finance = new FinanceService(ctx, graph, {}, dependencies)
  return { finance, graph }
}

describe('canonical SourceItem ingestion', () => {
  it.each([
    ['asOf', '2026-02-30'],
    ['availableAt', '2026-02-30T00:00:00Z'],
    ['fetchedAt', '2026-02-29T12:00:00+08:00'],
    ['availableAt', '2024-02-30T12:00:00-05:00'],
  ] as const)('rejects invalid %s=%s before any dryRun or commit writes', async (field, value) => {
    const { finance, graph } = await setup()
    await graph.createNode({ id: 'source:existing', kind: 'source', title: 'Existing source' })
    const before = await graph.snapshot()
    for (const dryRun of [true, false]) {
      const response = await executeFinanceRequest(finance, {
        op: 'source.ingest',
        input: {
          items: [item(), { ...item('invalid date', 'https://news.example.com/invalid-date'), [field]: value }],
          runId: 'run-invalid-calendar', asOf: '2026-11-01T00:00:00Z', dryRun,
        },
      })
      expect(response).toMatchObject({ ok: false, error: { code: 'INVALID_TIMESTAMP' } })
      expect(await graph.snapshot()).toEqual(before)
    }
  })

  it('defaults to dryRun, commits one atomic revision, deduplicates and replays as a no-op', async () => {
    const { finance, graph } = await setup()
    const firstItem = item()
    const preview = await finance.ingestSources({ items: [firstItem], runId: 'run-preview', asOf: at })
    expect(preview.dryRun).toBe(true)
    expect(preview.revision).toBe(0)
    expect((await graph.snapshot()).nodes).toHaveLength(0)

    const duplicate = item('original body', 'https://news.example.com/story?id=7&utm_campaign=duplicate')
    const committed = await finance.ingestSources({ items: [firstItem, duplicate], dryRun: false, runId: 'run-1', asOf: at })
    expect(committed).toMatchObject({ revision: 1, changed: true, counts: { received: 2, accepted: 1, duplicates: 1 } })
    const snapshot = await graph.snapshot()
    expect(snapshot.nodes.map(node => node.kind).sort()).toEqual(['raw', 'session', 'source'])
    expect(snapshot.edges.map(edge => edge.kind).sort()).toEqual(['derived_from', 'produces', 'produces'])
    expect(snapshot.nodes.find(node => node.kind === 'source')?.metadata.canonicalUrl).toBe('https://news.example.com/story?id=7')
    expect(snapshot.nodes.find(node => node.kind === 'raw')?.content).toBe('original body')
    expect(snapshot.nodes.find(node => node.kind === 'session')?.metadata.ingestion).toMatchObject({ runId: 'run-1', duplicateInputs: 1 })
    expect((await graph.revisions()).map(entry => entry.op)).toEqual(['finance.source.ingest'])

    const replay = await finance.ingestSources({ items: [firstItem, duplicate], dryRun: false, runId: 'run-1', asOf: at })
    expect(replay).toMatchObject({ revision: 1, changed: false })
    expect(await graph.currentRevision()).toBe(1)
    expect((await graph.snapshot()).nodes).toHaveLength(3)
  })

  it('retains every accepted source, raw reference and provider error when batches share a run', async () => {
    let fetchedAt = '2026-01-10T00:00:00.000Z'
    const dependencies: FinanceDataDependencies = {
      now: () => fetchedAt,
      lookup: async () => [{ address: '93.184.216.34', family: 4 }],
      fetch: async () => new Response(JSON.stringify({
        chart: {
          result: [{
            meta: { symbol: 'AAPL', currency: 'USD', exchangeName: 'NMS', regularMarketPrice: 123, regularMarketTime: 1767312000 },
          }],
          error: null,
        },
      }), { status: 200, headers: { 'content-type': 'application/json' } }),
    }
    const { finance, graph } = await setup(dependencies)

    const preview = await finance.fetchSources({ source: 'yahoo', kind: 'quote', symbol: 'AAPL', asOf: at })
    const originalAapl = preview.items[0]
    expect(originalAapl).toBeDefined()
    await finance.ingestSources({ items: [originalAapl as SourceItem], dryRun: false, runId: 'run-before', asOf: at })

    fetchedAt = '2026-01-10T00:01:00.000Z'
    const aaplBatch = await finance.fetchSources({
      asOf: at,
      dryRun: false,
      runId: 'run-shared',
      requests: [
        { source: 'yahoo', kind: 'quote', symbol: 'AAPL' },
        { source: 'sec', kind: 'ticker', symbol: 'AAPL' },
      ],
    })
    expect(aaplBatch).toMatchObject({
      counts: { accepted: 1, duplicates: 1 },
      errors: [{ source: 'sec', code: 'NOT_CONFIGURED' }],
    })

    const msftItem = item('MSFT quote', 'https://query1.finance.yahoo.com/v8/finance/chart/MSFT?interval=1d&range=1d')
    const msftBatch = await finance.ingestSources({ items: [msftItem], dryRun: false, runId: 'run-shared', asOf: at })
    expect(msftBatch).toMatchObject({ counts: { accepted: 1, duplicates: 0 } })

    const snapshot = await graph.snapshot()
    const session = snapshot.nodes.find(node => node.id === aaplBatch.sessionId)
    expect(session?.metadata.ingestion).toMatchObject({
      runId: 'run-shared',
      sources: [aaplBatch.sourceIds[0], msftBatch.sourceIds[0]],
      raw: [aaplBatch.rawIds[0], msftBatch.rawIds[0]],
      errors: [{ source: 'sec', code: 'NOT_CONFIGURED' }],
    })
    expect(session?.metadata.references).toEqual([
      aaplBatch.sourceIds[0],
      aaplBatch.rawIds[0],
      msftBatch.sourceIds[0],
      msftBatch.rawIds[0],
    ])
    expect(snapshot.edges.filter(edge => edge.from === aaplBatch.sessionId && edge.kind === 'produces')).toHaveLength(4)
    expect((await graph.getNode(aaplBatch.sourceIds[0] as string))?.metadata.fetchedAt).toBe(originalAapl?.fetchedAt)

    const revision = await graph.currentRevision()
    const replay = await finance.ingestSources({ items: [msftItem], dryRun: false, runId: 'run-shared', asOf: at })
    expect(replay).toMatchObject({ changed: false, revision })
    expect(await graph.currentRevision()).toBe(revision)
  })

  it('supersedes changed content, quarantines future evidence and rejects a false hash without partial writes', async () => {
    const { finance, graph } = await setup()
    await finance.ingestSources({ items: [item()], dryRun: false, runId: 'run-1', asOf: at })
    const changed = item('updated body')
    const second = await finance.ingestSources({ items: [changed], dryRun: false, runId: 'run-2', asOf: at })
    expect(second.revision).toBe(2)
    const snapshot = await graph.snapshot()
    expect(snapshot.nodes.filter(node => node.kind === 'source')).toHaveLength(2)
    expect(snapshot.nodes.filter(node => node.kind === 'raw')).toHaveLength(2)
    expect(snapshot.edges.filter(edge => edge.kind === 'supersedes')).toHaveLength(1)
    expect(snapshot.nodes.find(node => node.content === 'updated body')?.metadata.contentHash).toBe(changed.contentHash)

    const future = { ...item('future body', 'https://news.example.com/future'), availableAt: '2026-01-11T00:00:00.000Z' }
    const quarantined = await finance.ingestSources({ items: [future], dryRun: false, runId: 'run-future', asOf: at })
    expect(quarantined.counts.quarantined).toBe(1)
    expect(quarantined.revision).toBe(2)
    expect(await graph.currentRevision()).toBe(2)

    const invalid = { ...item('tampered body', 'https://news.example.com/tampered'), contentHash: 'sha256:false' }
    await expect(finance.ingestSources({ items: [invalid], dryRun: false, runId: 'run-bad', asOf: at })).rejects.toMatchObject({ code: 'CONTENT_HASH_MISMATCH' })
    expect(await graph.currentRevision()).toBe(2)
    expect((await graph.snapshot()).nodes).toHaveLength(6)
  })

  it('isolates a failed provider in a multi-source fetch and does not write during the default dryRun', async () => {
    const dependencies: FinanceDataDependencies = {
      now: () => at,
      lookup: async () => [{ address: '93.184.216.34', family: 4 }],
      fetch: async () => new Response(JSON.stringify({ chart: { result: [{ meta: { symbol: 'AAPL', regularMarketPrice: 123, regularMarketTime: 1767312000 } }], error: null } }), { status: 200, headers: { 'content-type': 'application/json' } }),
    }
    const { finance, graph } = await setup(dependencies)
    const response = await executeFinanceRequest(finance, {
      op: 'source.fetch',
      input: {
        asOf: at,
        requests: [
          { source: 'yahoo', kind: 'quote', symbol: 'AAPL' },
          { source: 'sec', kind: 'ticker', symbol: 'AAPL' },
        ],
      },
    })
    expect(response.ok).toBe(true)
    if (response.ok) {
      const result = response.result as { items: SourceItem[]; errors: { code: string }[]; dryRun: boolean }
      expect(result.items).toHaveLength(1)
      expect(result.errors).toEqual([expect.objectContaining({ code: 'NOT_CONFIGURED' })])
      expect(result.dryRun).toBe(true)
    }
    expect(await graph.currentRevision()).toBe(0)

    const single = await executeFinanceRequest(finance, { op: 'source.fetch', input: { source: 'sec', kind: 'ticker', symbol: 'AAPL' } })
    expect(single.ok).toBe(false)
    expect(single.ok === false && single.error.code).toBe('NOT_CONFIGURED')
  })

  it('quarantines fetched Yahoo history for an asOf before the observation', async () => {
    const fetchedAt = '2026-01-10T00:00:00.000Z'
    const historicalAsOf = '2026-01-09T23:59:30.000Z'
    const dependencies: FinanceDataDependencies = {
      now: () => fetchedAt,
      lookup: async () => [{ address: '93.184.216.34', family: 4 }],
      fetch: async () => new Response(JSON.stringify({
        chart: {
          result: [{
            meta: { symbol: 'AAPL', currency: 'USD', exchangeName: 'NMS', dataGranularity: '1mo' },
            timestamp: [1767364200],
            indicators: {
              quote: [{ open: [100], high: [105], low: [99], close: [104], volume: [12345] }],
              adjclose: [{ adjclose: [101.25] }],
            },
          }],
          error: null,
        },
      }), { status: 200, headers: { 'content-type': 'application/json' } }),
    }
    const { finance, graph } = await setup(dependencies)
    const response = await executeFinanceRequest(finance, {
      op: 'source.fetch',
      input: {
        source: 'yahoo',
        kind: 'history',
        symbol: 'AAPL',
        range: '1mo',
        interval: '1mo',
        asOf: historicalAsOf,
        dryRun: false,
        runId: 'yahoo-historical-observation',
      },
    })

    expect(response).toMatchObject({
      ok: true,
      revision: 0,
      result: {
        items: [{ availableAt: fetchedAt, fetchedAt }],
        sourceIds: [],
        rawIds: [],
        counts: { received: 1, accepted: 0, duplicates: 0, quarantined: 1 },
      },
    })
    expect((await graph.snapshot()).nodes).toEqual([])
    expect(await graph.currentRevision()).toBe(0)
  })
})
