import { createHash } from 'node:crypto'
import { mkdir } from 'node:fs/promises'
import { join } from 'node:path'
import { Context } from '@deepseek-ai/cordis'
import { afterEach, describe, expect, it } from 'vitest'
import { FinanceService } from '../../src/finance/service.ts'
import { executeFinanceRequest } from '../../src/finance/protocol.ts'
import type { FinanceRequest } from '../../src/finance/protocol.ts'
import { ResearchGraphService, resolveConfig } from '../../src/service.ts'
import { FinanceStore, financeOperation, parseFinanceObject } from '../../client/finance-store.ts'
import type { FinanceGateway } from '../../client/finance-store.ts'
import type { Translate } from '../../client/store.ts'
import type { SourceItem } from '../../src/finance/types.ts'
import { makeTempDir } from '../host/fixtures.ts'

const cleanups: (() => Promise<void>)[] = []
afterEach(async () => {
  while (cleanups.length > 0) await cleanups.pop()?.()
})

const t: Translate = key => key

async function setup() {
  const temp = await makeTempDir('client-finance-store')
  cleanups.push(temp.cleanup)
  const skillsRoot = join(temp.dir, 'skills')
  await mkdir(skillsRoot, { recursive: true })
  const ctx = new Context()
  const graph = new ResearchGraphService(ctx, resolveConfig({ dataDir: join(temp.dir, 'data'), skillsRoot, autoIndexSkills: false }, skillsRoot))
  const finance = new FinanceService(ctx, graph)
  const gateway: FinanceGateway = { request: request => executeFinanceRequest(finance, request as FinanceRequest) }
  const store = new FinanceStore(gateway, t)
  return { store, graph, finance }
}

const predictionMetadata = {
  provider: 'unit-test',
  asOf: '2026-01-01T00:00:00Z',
  availableAt: '2026-01-01T00:00:00Z',
  fetchedAt: '2026-01-01T00:00:00Z',
  provenance: { url: 'https://example.com/evidence' },
}

function followQuote(symbol: string, price: number, previousClose: number, fetchedAt: string): SourceItem {
  const content = JSON.stringify({
    symbol,
    currency: 'USD',
    regularMarketPrice: price,
    previousClose,
    regularMarketTime: '2026-10-30T20:00:01.000Z',
  })
  return {
    provider: 'yahoo',
    canonicalUrl: `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}`,
    title: `${symbol} quote`,
    content,
    contentHash: `sha256:${createHash('sha256').update(content, 'utf8').digest('hex')}`,
    asOf: fetchedAt,
    availableAt: '2026-10-30T20:00:01.000Z',
    fetchedAt,
    provenance: { endpoint: 'v8/finance/chart', priceBasis: 'regularMarketPrice, unadjusted' },
    data: {
      symbol,
      currency: 'USD',
      regularMarketPrice: price,
      previousClose,
      regularMarketTime: '2026-10-30T20:00:01.000Z',
    },
  }
}

const followQuoteItem = followQuote('AAPL', 344.63, 348.91, '2026-11-01T00:47:31.934Z')
const followMsftQuoteItem = followQuote('MSFT', 521.91, 530.14, '2026-11-01T00:47:32.400Z')

function quoteSymbol(item: SourceItem): string {
  const data = item.data
  if (typeof data !== 'object' || data === null || Array.isArray(data) || typeof data.symbol !== 'string') {
    throw new Error('quote fixture requires data.symbol')
  }
  return data.symbol
}

function quoteResponse(item: SourceItem = followQuoteItem) {
  return {
    ok: true as const,
    revision: 0,
    result: {
      dryRun: true,
      runId: `run-${quoteSymbol(item).toLowerCase()}-quote`,
      asOf: item.asOf,
      fetchedAt: item.fetchedAt,
      items: [item],
      errors: [],
      counts: { received: 1, accepted: 1, duplicates: 0, quarantined: 0 },
    },
  }
}

describe('FinanceStore', () => {
  it('follows a quoted symbol without inventing market data and survives a fresh graph read', async () => {
    const { store, graph } = await setup()
    expect(await store.followSymbol('msft', 'Microsoft', '2026-01-01T00:00:00Z')).toBe(true)
    const snapshot = await graph.snapshot()
    const node = snapshot.nodes.find(item => item.id === 'instrument:watchlist:MSFT')
    expect(node).toMatchObject({kind:'instrument',title:'Microsoft',content:'MSFT',metadata:{symbol:'MSFT',watchlist:true,watchlistProvenance:{provider:'dsh.client'}}})
    expect(node?.metadata).not.toHaveProperty('regularMarketPrice')
    expect(node?.metadata).not.toHaveProperty('provider')
    expect(await store.followSymbol('bad symbol', 'Invalid')).toBe(false)
    expect((await graph.snapshot()).nodes).toHaveLength(snapshot.nodes.length)
  })

  it('persists the exact successful dry-run quotes when following and reads them back', async () => {
    const { finance, graph } = await setup()
    const seen: Parameters<FinanceGateway['request']>[0][] = []
    const lifecycle: string[] = []
    const gateway: FinanceGateway = {
      request: request => {
        seen.push(request)
        lifecycle.push(request.op)
        if (request.op === 'market.fetch') {
          const symbol = (request.input as { symbol?: string }).symbol
          return Promise.resolve(quoteResponse(symbol === 'MSFT' ? followMsftQuoteItem : followQuoteItem))
        }
        return executeFinanceRequest(finance, request as FinanceRequest)
      },
    }
    const store = new FinanceStore(gateway, t, async () => { lifecycle.push('refresh') })
    expect(await store.fetchQuote('AAPL', followQuoteItem.asOf)).toBe(true)
    expect(await store.followSymbol('AAPL', 'Apple', '2026-11-01T00:48:00Z')).toBe(true)
    expect(await store.fetchQuote('MSFT', followMsftQuoteItem.asOf)).toBe(true)
    expect(await store.followSymbol('MSFT', 'Microsoft', '2026-11-01T00:48:01Z')).toBe(true)

    const snapshot = await graph.snapshot()
    const instruments = snapshot.nodes.filter(node => node.kind === 'instrument' && node.metadata.watchlist === true)
    expect(instruments).toHaveLength(2)
    expect(instruments.map(node => node.metadata.symbol).sort()).toEqual(['AAPL', 'MSFT'])
    expect(instruments.every(node => !Object.hasOwn(node.metadata, 'regularMarketPrice'))).toBe(true)
    const source = snapshot.nodes.find(node => node.kind === 'source' && node.metadata.contentHash === followQuoteItem.contentHash)
    expect(source?.metadata).toMatchObject({
      provider: 'yahoo',
      asOf: followQuoteItem.asOf,
      availableAt: followQuoteItem.availableAt,
      fetchedAt: followQuoteItem.fetchedAt,
      contentHash: followQuoteItem.contentHash,
      runId: 'run-aapl-quote',
      provenance: {
        canonicalUrl: followQuoteItem.canonicalUrl,
        endpoint: 'v8/finance/chart',
        priceBasis: 'regularMarketPrice, unadjusted',
      },
    })
    const raws = snapshot.nodes.filter(node => node.kind === 'raw')
    expect(raws).toHaveLength(2)
    expect(raws.map(node => ({ symbol: (node.metadata.data as { symbol: string }).symbol, price: (node.metadata.data as { regularMarketPrice: number }).regularMarketPrice })).sort((left, right) => left.symbol.localeCompare(right.symbol))).toEqual([
      { symbol: 'AAPL', price: 344.63 },
      { symbol: 'MSFT', price: 521.91 },
    ])
    expect(seen.filter(request => request.op === 'market.fetch')).toHaveLength(2)
    expect(lifecycle).toEqual([
      'market.fetch',
      'graph.get',
      'graph.plan',
      'refresh',
      'source.ingest',
      'refresh',
      'market.fetch',
      'graph.get',
      'graph.plan',
      'refresh',
      'source.ingest',
      'refresh',
    ])
    expect(seen.filter(request => request.op === 'source.ingest')).toEqual([
      {
        op: 'source.ingest',
        input: {
          items: [followQuoteItem],
          dryRun: false,
          runId: 'run-aapl-quote',
          asOf: followQuoteItem.asOf,
        },
      },
      {
        op: 'source.ingest',
        input: {
          items: [followMsftQuoteItem],
          dryRun: false,
          runId: 'run-msft-quote',
          asOf: followMsftQuoteItem.asOf,
        },
      },
    ])
  })

  it('follows without saving a stale, failed, or mismatched quote', async () => {
    const failed = await setup()
    const failedSeen: string[] = []
    let failedQuoteCalls = 0
    const failedStore = new FinanceStore({
      request: request => {
        failedSeen.push(request.op)
        if (request.op !== 'market.fetch') return executeFinanceRequest(failed.finance, request as FinanceRequest)
        failedQuoteCalls += 1
        return failedQuoteCalls === 1
          ? Promise.resolve(quoteResponse())
          : Promise.resolve({ ok: false, error: { code: 'UNAVAILABLE', message: 'provider offline' } })
      },
    }, t)
    expect(await failedStore.fetchQuote('AAPL', followQuoteItem.asOf)).toBe(true)
    expect(await failedStore.fetchQuote('AAPL', followQuoteItem.asOf)).toBe(false)
    expect(await failedStore.followSymbol('AAPL', 'Apple')).toBe(true)
    expect((await failed.graph.snapshot()).nodes.some(node => node.id === 'instrument:watchlist:AAPL')).toBe(true)
    expect(failedSeen).not.toContain('source.ingest')

    const mismatched = await setup()
    const mismatchedSeen: string[] = []
    const mismatchedStore = new FinanceStore({
      request: request => {
        mismatchedSeen.push(request.op)
        return request.op === 'market.fetch'
          ? Promise.resolve(quoteResponse())
          : executeFinanceRequest(mismatched.finance, request as FinanceRequest)
      },
    }, t)
    expect(await mismatchedStore.fetchQuote('AAPL', followQuoteItem.asOf)).toBe(true)
    expect(await mismatchedStore.followSymbol('MSFT', 'Microsoft')).toBe(true)
    const snapshot = await mismatched.graph.snapshot()
    expect(snapshot.nodes.some(node => node.id === 'instrument:watchlist:MSFT')).toBe(true)
    expect(snapshot.nodes.some(node => node.kind === 'source')).toBe(false)
    expect(mismatchedSeen).not.toContain('source.ingest')
  })

  it('persists a quote on watched-false to watched-true without replacing existing instrument metadata', async () => {
    const { finance, graph } = await setup()
    await graph.createNode({
      id: 'instrument:research:apple-primary',
      kind: 'instrument',
      title: 'Apple research record',
      content: 'AAPL',
      metadata: {
        symbol: 'AAPL',
        provider: 'existing.research',
        asOf: '2026-10-01T00:00:00Z',
        regularMarketPrice: 111,
        financials: { revenue: 416_161 },
      },
    })
    const seen: string[] = []
    const store = new FinanceStore({
      request: request => {
        seen.push(request.op)
        return request.op === 'market.fetch'
          ? Promise.resolve(quoteResponse())
          : executeFinanceRequest(finance, request as FinanceRequest)
      },
    }, t)
    expect(await store.fetchQuote('AAPL', followQuoteItem.asOf)).toBe(true)
    const instrument = await graph.getNode('instrument:research:apple-primary')
    expect(instrument).toBeDefined()
    expect(await store.setInstrumentWatched(instrument!, true, '2026-11-01T00:48:00Z')).toBe(true)
    const watched = await graph.getNode('instrument:research:apple-primary')
    expect(watched).toMatchObject({
      id: 'instrument:research:apple-primary',
      title: 'Apple research record',
      content: 'AAPL',
      metadata: {
        symbol: 'AAPL',
        provider: 'existing.research',
        asOf: '2026-10-01T00:00:00Z',
        regularMarketPrice: 111,
        financials: { revenue: 416_161 },
        watchlist: true,
      },
    })
    expect((await graph.snapshot()).nodes.some(node => node.kind === 'source')).toBe(true)
    expect(await store.setInstrumentWatched(watched!, true)).toBe(true)
    expect(await store.setInstrumentWatched(watched!, false)).toBe(true)
    expect(seen.filter(op => op === 'source.ingest')).toHaveLength(1)
  })

  it('keeps the follow successful and reports a quote save failure truthfully', async () => {
    const { finance, graph } = await setup()
    const store = new FinanceStore({
      request: request => {
        if (request.op === 'market.fetch') return Promise.resolve(quoteResponse())
        if (request.op === 'source.ingest') {
          return Promise.resolve({ ok: false, error: { code: 'CONTENT_HASH_MISMATCH', message: 'quote source rejected' } })
        }
        return executeFinanceRequest(finance, request as FinanceRequest)
      },
    }, t)
    expect(await store.fetchQuote('AAPL', followQuoteItem.asOf)).toBe(true)
    expect(await store.followSymbol('AAPL', 'Apple')).toBe(true)
    expect((await graph.getNode('instrument:watchlist:AAPL'))?.metadata.watchlist).toBe(true)
    expect((await graph.snapshot()).nodes.some(node => node.kind === 'source')).toBe(false)
    expect(store.getSnapshot().notice).toEqual({
      tone: 'error',
      text: 'finance.notice.watchlistAdded (CONTENT_HASH_MISMATCH: quote source rejected)',
    })
  })

  it('loads real finance stats and tracks the Host revision', async () => {
    const { store } = await setup()
    expect(await store.load()).toBe(true)
    const state = store.getSnapshot()
    expect(state.phase).toBe('ready')
    expect(financeOperation(state, 'overview').status).toBe('success')
    expect(financeOperation(state, 'overview').result).toMatchObject({ financeKinds: ['instrument', 'portfolio', 'position', 'valuation', 'catalyst', 'prediction'] })
  })

  it('records, lists, resolves, and evaluates a prediction through the real service', async () => {
    const { store } = await setup()
    expect(await store.recordPrediction({
      id: 'prediction:alpha', title: 'Alpha rises', resolutionDate: '2026-01-01T00:00:00Z',
      prediction: { predictedDirection: 'up', predictedValue: 110, probability: 0.75 },
      metadata: predictionMetadata,
    })).toBe(true)
    expect(financeOperation(store.getSnapshot(), 'recordPrediction').status).toBe('success')

    expect(await store.loadDue('2026-01-02T00:00:00Z')).toBe(true)
    expect(financeOperation(store.getSnapshot(), 'due').result).toMatchObject({ count: 1 })

    expect(await store.resolvePrediction({
      id: 'prediction:alpha', status: 'resolved', resolvedAt: '2026-01-02T00:00:00Z',
      outcome: { actualDirection: 'up', actualValue: 112, actual: true },
      metadata: { ...predictionMetadata, asOf: '2026-01-02T00:00:00Z', availableAt: '2026-01-02T00:00:00Z', fetchedAt: '2026-01-02T00:00:00Z' },
    })).toBe(true)
    expect(financeOperation(store.getSnapshot(), 'resolve').result).toMatchObject({ status: 'resolved' })

    expect(await store.evaluateBriefing('2026-01-03T00:00:00Z')).toBe(true)
    expect(financeOperation(store.getSnapshot(), 'briefingEvaluate').result).toMatchObject({ resolved: 1, directionalAccuracy: 1, brierScore: 0.0625 })
  })

  it('prepares and records a briefing only through their respective commands', async () => {
    const { store } = await setup()
    expect(await store.prepareBriefing('2026-01-02T00:00:00Z')).toBe(true)
    expect(financeOperation(store.getSnapshot(), 'briefingPrepare').result).toMatchObject({ warnings: ['no point-in-time records matched the briefing cutoff'] })
    expect(await store.recordBriefing({
      id: 'briefing:empty', title: 'Empty cutoff', content: 'No records', references: [], metadata: predictionMetadata,
    })).toBe(true)
    expect(financeOperation(store.getSnapshot(), 'briefingRecord').result).toMatchObject({ briefingId: 'briefing:empty' })
  })

  it('keeps quote failures as errors and never fabricates a quote', async () => {
    const gateway: FinanceGateway = { request: async () => ({ ok: false, error: { code: 'NOT_IMPLEMENTED', message: 'provider offline' } }) }
    const store = new FinanceStore(gateway, t)
    expect(await store.fetchQuote('AAPL')).toBe(false)
    const operation = financeOperation(store.getSnapshot(), 'quote')
    expect(operation.status).toBe('error')
    expect(operation.error).toEqual({ code: 'NOT_IMPLEMENTED', message: 'provider offline' })
    expect(operation.result).toBeNull()
  })

  it('always sends RSS/YouTube ingest as a dry-run', async () => {
    const seen: unknown[] = []
    const gateway: FinanceGateway = {
      request: async request => {
        seen.push(request)
        return { ok: false, error: { code: 'NOT_IMPLEMENTED', message: 'ingest unavailable' } }
      },
    }
    const store = new FinanceStore(gateway, t)
    expect(await store.dryRunIngest('youtube', 'https://example.com/watch?v=1')).toBe(false)
    expect(seen[0]).toMatchObject({ op: 'source.fetch', input: { source: 'youtube', kind: 'transcript', url: 'https://example.com/watch?v=1', dryRun: true } })
    expect(await store.dryRunIngest('rss', 'https://example.com/feed.xml')).toBe(false)
    expect(seen[1]).toMatchObject({ op: 'source.fetch', input: { source: 'rss', url: 'https://example.com/feed.xml', dryRun: true } })
    expect(seen[1]).not.toHaveProperty('input.kind')
    expect(financeOperation(store.getSnapshot(), 'ingest').status).toBe('error')
  })

  it('validates complex JSON as an object before dispatch', () => {
    expect(parseFinanceObject('{"scenarios":[]}')).toEqual({ scenarios: [] })
    expect(() => parseFinanceObject('[]')).toThrow('JSON object')
    expect(() => parseFinanceObject('not json')).toThrow()
  })
})
