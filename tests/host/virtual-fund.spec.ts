import { createHash } from 'node:crypto'
import { join } from 'node:path'
import { Context } from '@deepseek-ai/cordis'
import type { ToolDefinition } from '@deepseek-ai/dsh-tools'
import { afterEach, describe, expect, it } from 'vitest'
import { executeFinanceRequest } from '../../src/finance/protocol.ts'
import { FinanceService } from '../../src/finance/service.ts'
import { registerFinanceTools } from '../../src/finance/tools.ts'
import type { FundAdvanceInput } from '../../src/finance/virtual-fund.ts'
import { ResearchGraphService, resolveConfig } from '../../src/service.ts'
import type { SourceItem } from '../../src/finance/types.ts'
import { makeTempDir } from './fixtures.ts'

const cleanups: (() => Promise<void>)[] = []
afterEach(async () => {
  while (cleanups.length > 0) await cleanups.pop()?.()
})

const startingAt = '2026-01-01T00:00:00.000Z'

async function setup() {
  const temp = await makeTempDir('virtual-fund')
  cleanups.push(temp.cleanup)
  const ctx = new Context()
  const tools = new Map<string, ToolDefinition>()
  ctx.provide('tools', {
    register(definition: ToolDefinition) {
      tools.set(definition.name, definition)
      return () => { tools.delete(definition.name) }
    },
  })
  const config = resolveConfig({ dataDir: join(temp.dir, 'data'), autoIndexSkills: false }, join(temp.dir, 'skills'))
  const graph = new ResearchGraphService(ctx, config)
  const finance = new FinanceService(ctx, graph)
  registerFinanceTools(ctx, finance)
  return { temp, config, graph, finance, tools }
}

async function configure(finance: FinanceService, initialCash = 1_000, id = 'portfolio:fund') {
  return finance.fundConfigure({
    id,
    title: 'Evidence Fund',
    currency: 'USD',
    initialCash,
    startingAt,
  })
}

function source(symbol: string, price: number, at: string, suffix: string): SourceItem {
  const content = JSON.stringify({ symbol, currency: 'USD', price, availableAt: at })
  return {
    provider: 'fixture.market',
    canonicalUrl: `https://market.example.test/${symbol}/${suffix}`,
    title: `${symbol} quote ${at}`,
    content,
    contentHash: `sha256:${createHash('sha256').update(content).digest('hex')}`,
    asOf: at,
    availableAt: at,
    fetchedAt: at,
    data: { symbol, currency: 'USD', price, availableAt: at },
    provenance: { fixture: 'virtual-fund' },
  }
}

async function addPrice(
  finance: FinanceService,
  symbol: string,
  price: number,
  at: string,
  suffix: string,
) {
  const ingested = await finance.ingestSources({
    items: [source(symbol, price, at, suffix)],
    dryRun: false,
    asOf: at,
    runId: `price-${suffix}`,
  })
  const sourceId = ingested.sourceIds[0]
  if (sourceId === undefined) throw new Error('fixture source was not accepted')
  return { symbol, price, availableAt: at, sourceId }
}

function advance(
  prices: FundAdvanceInput['prices'],
  trades: FundAdvanceInput['trades'],
  asOf: string,
  summary = '',
  fundId = 'portfolio:fund',
): FundAdvanceInput {
  return { fundId, asOf, prices, trades, summary }
}

describe('persisted virtual fund', () => {
  it('mechanically rejects malformed fund currencies before writing', async () => {
    const { finance, graph } = await setup()
    await expect(finance.fundConfigure({
      id: 'portfolio:invalid-currency',
      title: 'Invalid Currency',
      currency: 'US$',
      initialCash: 1_000,
      startingAt,
    })).rejects.toMatchObject({ code: 'INVALID_FUND_INPUT' })
    expect(await graph.currentRevision()).toBe(0)
  })

  it('exposes authoritative state through the protocol and finance_virtual_fund tool envelope', async () => {
    const { finance, tools } = await setup()
    await configure(finance)
    const protocol = await executeFinanceRequest(finance, {
      op: 'fund.state',
      input: { fundId: 'portfolio:fund' },
    })
    expect(protocol).toMatchObject({
      ok: true,
      result: {
        funds: [{ id: 'portfolio:fund', kind: 'portfolio', metadata: { virtualFund: { initialCash: 1_000 } } }],
        researchers: [],
        snapshots: [],
        events: [],
      },
    })

    const tool = await tools.get('finance_virtual_fund')?.execute(
      { action: 'state', input: { fundId: 'portfolio:fund' } },
      { signal: new AbortController().signal } as never,
    ) as { ok: boolean; revision: number; result: { funds: { id: string }[] } }
    expect(tool).toMatchObject({
      ok: true,
      revision: 1,
      result: { funds: [{ id: 'portfolio:fund' }] },
    })
  })

  it('survives restart with GraphNode authority, explicit roles, and real schedule/session references', async () => {
    const { temp, config, finance } = await setup()
    await configure(finance)
    const researcher = await finance.fundResearcher({
      fundId: 'portfolio:fund',
      id: 'session:manager',
      title: 'Fund Manager',
      tickers: ['AAPL'],
      researchStyle: 'evidence-first',
      focus: 'capital allocation',
      task: 'Review price evidence and publish a paper plan.',
      role: 'manager',
      avatarKey: 'pm',
      sessionId: 'session-actual-1',
      scheduleId: 'schedule-actual-1',
      enabled: true,
    })
    expect(researcher.result.researcher).toMatchObject({
      role: 'manager',
      avatarKey: 'pm',
      sessionId: 'session-actual-1',
      scheduleId: 'schedule-actual-1',
      enabled: true,
    })

    const price = await addPrice(finance, 'AAPL', 100, '2026-01-02T00:00:00.000Z', 'restart')
    await finance.fundAdvance(advance([price], [{ symbol: 'AAPL', quantity: 2 }], '2026-01-02T00:00:00.000Z'))

    const reopenedGraph = new ResearchGraphService(new Context(), config)
    const reopenedFinance = new FinanceService(new Context(), reopenedGraph)
    const state = await reopenedFinance.fundState({ fundId: 'portfolio:fund' })
    expect(state.result.funds).toHaveLength(1)
    expect(state.result.funds[0]).toMatchObject({
      id: 'portfolio:fund',
      kind: 'portfolio',
      metadata: { virtualFund: { initialCash: 1_000, currency: 'USD', startingAt } },
    })
    expect(state.result.researchers[0]).toMatchObject({
      id: 'session:manager',
      kind: 'session',
      metadata: {
        type: 'fund-researcher',
        role: 'manager',
        scheduleId: 'schedule-actual-1',
        sessionId: 'session-actual-1',
        enabled: true,
      },
    })
    expect(state.result.snapshots[0]).toMatchObject({
      kind: 'session',
      metadata: { type: 'fund-snapshot', fundId: 'portfolio:fund', cash: 800, nav: 1_000 },
    })
    expect(temp.dir).toBeTruthy()
  })

  it('computes cash, positions, NAV, and keeps prior snapshots immutable', async () => {
    const { finance, graph } = await setup()
    await configure(finance)
    const firstPrice = await addPrice(finance, 'AAPL', 100, '2026-01-02T00:00:00.000Z', 'first')
    const first = await finance.fundAdvance(
      advance([firstPrice], [{ symbol: 'AAPL', quantity: 2 }], '2026-01-02T00:00:00.000Z', 'initial buy'),
    )
    expect(first.result.snapshot).toMatchObject({
      cash: 800,
      nav: 1_000,
      positions: [{ symbol: 'AAPL', quantity: 2, price: 100, value: 200 }],
    })
    const firstNode = await graph.getNode(first.result.snapshot.id)

    const secondPrice = await addPrice(finance, 'AAPL', 110, '2026-01-03T00:00:00.000Z', 'second')
    const second = await finance.fundAdvance(
      advance([secondPrice], [{ symbol: 'AAPL', quantity: -1 }], '2026-01-03T00:00:00.000Z', 'trim'),
    )
    expect(second.result.snapshot).toMatchObject({
      cash: 910,
      nav: 1_020,
      positions: [{ symbol: 'AAPL', quantity: 1, price: 110, value: 110 }],
    })
    expect(await graph.getNode(first.result.snapshot.id)).toEqual(firstNode)
  })

  it('uses an ingested Yahoo quote directly without rewriting its price evidence', async () => {
    const { finance, graph } = await setup()
    await configure(finance, 100_000)
    const at = '2026-01-02T20:00:01.000Z'
    const data = { symbol: 'AAPL', currency: 'USD', regularMarketPrice: 344.63, regularMarketTime: at }
    const content = JSON.stringify(data)
    const item: SourceItem = {
      ...source('AAPL', 344.63, at, 'yahoo-quote'),
      provider: 'yahoo',
      data,
      content,
      contentHash: `sha256:${createHash('sha256').update(content).digest('hex')}`,
      provenance: { endpoint: 'v8/finance/chart', priceBasis: 'regularMarketPrice, unadjusted' },
    }
    const ingested = await finance.ingestSources({ items: [item], dryRun: false, asOf: at, runId: 'yahoo-quote' })
    const sourceId = ingested.sourceIds[0]!
    const savedSource = await graph.getNode(sourceId)
    const savedRaw = await graph.getNode(ingested.rawIds[0]!)
    const price = { symbol: 'AAPL', price: 344.63, availableAt: at, sourceId }
    await expect(finance.fundAdvance(advance([{ ...price, price: 345 }], [], at)))
      .rejects.toMatchObject({ code: 'SOURCE_PRICE_MISMATCH' })
    const result = await finance.fundAdvance(advance([price], [{ symbol: 'AAPL', quantity: 50 }], at))
    expect(result.result.snapshot).toMatchObject({ cash: 82_768.5, nav: 100_000,
      positions: [{ symbol: 'AAPL', quantity: 50, price: 344.63, value: 17_231.5 }] })
    expect(await graph.getNode(sourceId)).toEqual(savedSource)
    expect(await graph.getNode(ingested.rawIds[0]!)).toEqual(savedRaw)
  })

  it('does not treat an unrelated regularMarketPrice field as a Yahoo quote', async () => {
    const { finance } = await setup()
    await configure(finance)
    const at = '2026-01-02T00:00:00.000Z'
    const data = { symbol: 'AAPL', currency: 'USD', regularMarketPrice: 100, regularMarketTime: at }
    const ingested = await finance.ingestSources({
      items: [{ ...source('AAPL', 100, at, 'unrelated'), data }], dryRun: false, asOf: at, runId: 'unrelated',
    })
    await expect(finance.fundAdvance(advance([
      { symbol: 'AAPL', price: 100, availableAt: at, sourceId: ingested.sourceIds[0]! },
    ], [], at))).rejects.toMatchObject({ code: 'SOURCE_POINT_INVALID' })
  })

  it('rejects shorts and purchases that would make cash negative', async () => {
    const { finance } = await setup()
    await configure(finance, 100)
    const price = await addPrice(finance, 'AAPL', 60, '2026-01-02T00:00:00.000Z', 'risk')
    await expect(finance.fundAdvance(
      advance([price], [{ symbol: 'AAPL', quantity: -1 }], '2026-01-02T00:00:00.000Z'),
    )).rejects.toMatchObject({ code: 'INSUFFICIENT_POSITION' })
    await expect(finance.fundAdvance(
      advance([price], [{ symbol: 'AAPL', quantity: 2 }], '2026-01-02T00:00:00.000Z'),
    )).rejects.toMatchObject({ code: 'INSUFFICIENT_CASH' })
    expect((await finance.fundState()).result.snapshots).toEqual([])
  })

  it('enforces exact fractional no-short and no-negative-cash invariants', async () => {
    const { finance } = await setup()
    await configure(finance, 0)
    const tinyPrice = await addPrice(finance, 'TINY', 1_000_000_000_000, '2026-01-02T00:00:00.000Z', 'tiny-short')
    await expect(finance.fundAdvance(
      advance([tinyPrice], [{ symbol: 'TINY', quantity: -0.9e-12 }], '2026-01-02T00:00:00.000Z'),
    )).rejects.toMatchObject({ code: 'INSUFFICIENT_POSITION' })
    expect((await finance.fundState()).result.snapshots).toEqual([])

    await configure(finance, 1)
    const onePrice = await addPrice(finance, 'ONE', 1, '2026-01-02T00:00:00.000Z', 'negative-cash')
    await expect(finance.fundAdvance(
      advance([onePrice], [{ symbol: 'ONE', quantity: 1 + 5e-10 }], '2026-01-02T00:00:00.000Z'),
    )).rejects.toMatchObject({ code: 'INSUFFICIENT_CASH' })
    expect((await finance.fundState()).result.snapshots).toEqual([])

    await configure(finance, 100)
    const buyPrice = await addPrice(finance, 'FRAC', 20, '2026-01-02T00:00:00.000Z', 'fractional-buy')
    const bought = await finance.fundAdvance(
      advance([buyPrice], [{ symbol: 'FRAC', quantity: 0.25 }], '2026-01-02T00:00:00.000Z'),
    )
    expect(bought.result.snapshot).toMatchObject({
      cash: 95,
      nav: 100,
      positions: [{ symbol: 'FRAC', quantity: 0.25, price: 20, value: 5 }],
    })
    const sellPrice = await addPrice(finance, 'FRAC', 40, '2026-01-03T00:00:00.000Z', 'fractional-sell')
    const sold = await finance.fundAdvance(
      advance([sellPrice], [{ symbol: 'FRAC', quantity: -0.125 }], '2026-01-03T00:00:00.000Z'),
    )
    expect(sold.result.snapshot).toMatchObject({
      cash: 100,
      nav: 105,
      positions: [{ symbol: 'FRAC', quantity: 0.125, price: 40, value: 5 }],
    })
  })

  it('rejects computed overflow without persisting a corrupt snapshot', async () => {
    const { finance, graph } = await setup()
    await configure(finance)
    const initialPrice = await addPrice(finance, 'LARGE', 1e-308, '2026-01-02T00:00:00.000Z', 'small-price')
    await finance.fundAdvance(advance([initialPrice], [{ symbol: 'LARGE', quantity: 1e308 }], '2026-01-02T00:00:00.000Z'))
    const overflowPrice = await addPrice(finance, 'LARGE', 1e308, '2026-01-03T00:00:00.000Z', 'large-price')
    const before = await graph.currentRevision()
    await expect(finance.fundAdvance(advance([overflowPrice], [], '2026-01-03T00:00:00.000Z')))
      .rejects.toMatchObject({ code: 'INVALID_FUND_INPUT' })
    expect(await graph.currentRevision()).toBe(before)
    expect((await finance.fundState()).result.snapshots).toHaveLength(1)
  })

  it('enforces the time gate and derives prices from the referenced graph record', async () => {
    const { finance } = await setup()
    await configure(finance)
    const price = await addPrice(finance, 'AAPL', 100, '2026-01-02T00:00:00.000Z', 'gate')
    await expect(finance.fundAdvance(
      advance([price], [], '2025-12-31T23:59:59.000Z'),
    )).rejects.toMatchObject({ code: 'BEFORE_FUND_START' })
    await expect(finance.fundAdvance(
      advance([{ ...price, price: 101 }], [{ symbol: 'AAPL', quantity: 1 }], '2026-01-02T00:00:00.000Z'),
    )).rejects.toMatchObject({ code: 'SOURCE_PRICE_MISMATCH' })
    await expect(finance.fundAdvance(
      advance([{ ...price, availableAt: '2026-01-02T00:00:01.000Z' }], [], '2026-01-02T00:00:01.000Z'),
    )).rejects.toMatchObject({ code: 'SOURCE_TIME_MISMATCH' })
    const future = new Date(Date.now() + 86_400_000).toISOString()
    await expect(finance.fundAdvance(advance([], [], future))).rejects.toMatchObject({ code: 'FUTURE_AS_OF' })
  })

  it('requires one ready point observation and rejects ambiguous, future, or rejected records', async () => {
    const { finance, graph } = await setup()
    await configure(finance)
    const at = '2026-01-02T00:00:00.000Z'
    const later = '2026-01-03T00:00:00.000Z'
    await graph.applyPlan({
      nodes: [
        {
          id: 'instrument:ambiguous',
          kind: 'instrument',
          title: 'Ambiguous',
          content: 'AMB',
          metadata: {
            symbol: 'AMB',
            currency: 'USD',
            availableAt: at,
            asOf: at,
            data: { symbol: 'AMB', price: 10, currency: 'USD', availableAt: at },
            marketData: { symbol: 'AMB', price: 11, currency: 'USD', availableAt: at },
          },
        },
        {
          id: 'instrument:future',
          kind: 'instrument',
          title: 'Future',
          content: 'FUT',
          metadata: {
            symbol: 'FUT',
            currency: 'USD',
            availableAt: later,
            asOf: later,
            data: { symbol: 'FUT', price: 20, currency: 'USD', availableAt: later },
          },
        },
        {
          id: 'instrument:rejected',
          kind: 'instrument',
          title: 'Rejected',
          content: 'REJ',
          metadata: {
            symbol: 'REJ',
            currency: 'USD',
            availableAt: at,
            asOf: at,
            status: 'rejected',
            data: { symbol: 'REJ', price: 30, currency: 'USD', availableAt: at },
          },
        },
      ],
      edges: [],
    })

    await expect(finance.fundAdvance(advance([{
      symbol: 'AMB', price: 10, availableAt: at, sourceId: 'instrument:ambiguous',
    }], [], at))).rejects.toMatchObject({ code: 'AMBIGUOUS_PRICE' })
    await expect(finance.fundAdvance(advance([{
      symbol: 'FUT', price: 20, availableAt: at, sourceId: 'instrument:future',
    }], [], at))).rejects.toMatchObject({ code: 'SOURCE_FUTURE' })
    await expect(finance.fundAdvance(advance([{
      symbol: 'REJ', price: 30, availableAt: at, sourceId: 'instrument:rejected',
    }], [], at))).rejects.toMatchObject({ code: 'SOURCE_QUARANTINED' })
  })

  it('gates legacy Yahoo history at fetchedAt and still rejects it as a non-point record', async () => {
    const { finance, graph } = await setup()
    await configure(finance)
    const provenance = {
      endpoint: 'v8/finance/chart',
      adjustment: 'provider adjustedClose and unadjusted OHLC retained separately',
    }
    await graph.applyPlan({
      nodes: [
        {
          id: 'source:yahoo-history', kind: 'source', title: 'Yahoo history',
          content: 'https://query1.finance.yahoo.com/v8/finance/chart/AAPL?interval=1d&range=1d',
          metadata: {
            provider: 'yahoo', asOf: '2026-01-01T00:00:00.000Z', availableAt: '2026-01-01T00:00:00.000Z',
            fetchedAt: '2026-01-03T00:00:00.000Z', provenance: { ...provenance, rawId: 'raw:yahoo-history' },
          },
        },
        {
          id: 'raw:yahoo-history', kind: 'raw', title: 'Yahoo history raw', content: '{"bars":[]}',
          metadata: {
            provider: 'yahoo', asOf: '2026-01-01T00:00:00.000Z', availableAt: '2026-01-01T00:00:00.000Z',
            fetchedAt: '2026-01-03T00:00:00.000Z', provenance, sourceId: 'source:yahoo-history',
            data: { symbol: 'AAPL', currency: 'USD', bars: [] },
          },
        },
      ],
      edges: [],
    })
    const price = { symbol: 'AAPL', price: 344.63, availableAt: '2026-01-01T00:00:00.000Z', sourceId: 'source:yahoo-history' }
    await expect(finance.fundAdvance(
      advance([price], [], '2026-01-02T00:00:00.000Z'),
    )).rejects.toMatchObject({ code: 'SOURCE_FUTURE' })
    await expect(finance.fundAdvance(
      advance([price], [], '2026-01-03T00:00:00.000Z'),
    )).rejects.toMatchObject({ code: 'SOURCE_POINT_INVALID' })
  })

  it('treats a result-equivalent advance retry as a no-op and rejects a conflicting duplicate', async () => {
    const { finance, graph } = await setup()
    await configure(finance)
    const price = await addPrice(finance, 'AAPL', 100, '2026-01-02T00:00:00.000Z', 'retry')
    const request = advance([price], [{ symbol: 'AAPL', quantity: 0.5 }], '2026-01-02T00:00:00.000Z', 'same')
    const first = await finance.fundAdvance(request)
    const revision = await graph.currentRevision()
    const retry = await finance.fundAdvance({
      ...request,
      trades: [{ symbol: 'AAPL', quantity: 0.25 }, { symbol: 'AAPL', quantity: 0.25 }],
    })
    expect(retry.result.snapshot).toEqual(first.result.snapshot)
    expect(await graph.currentRevision()).toBe(revision)
    expect((await graph.revisions()).filter(entry => entry.op === 'finance.fund.advance')).toHaveLength(1)
    await expect(finance.fundAdvance({ ...request, summary: 'different' }))
      .rejects.toMatchObject({ code: 'DUPLICATE_SNAPSHOT_CONFLICT' })
  })

  it('serializes concurrent advances across finance wrappers sharing one graph', async () => {
    const { finance, graph } = await setup()
    await configure(finance)
    const secondFinance = new FinanceService(new Context(), graph)
    const aaplDayTwo = await addPrice(finance, 'AAPL', 100, '2026-01-02T00:00:00.000Z', 'concurrent-a2')
    const aaplDayThree = await addPrice(finance, 'AAPL', 110, '2026-01-03T00:00:00.000Z', 'concurrent-a3')
    const bbbDayThree = await addPrice(finance, 'BBB', 50, '2026-01-03T00:00:00.000Z', 'concurrent-b3')

    const [dayTwo, dayThree] = await Promise.all([
      finance.fundAdvance(advance([aaplDayTwo], [{ symbol: 'AAPL', quantity: 2 }], '2026-01-02T00:00:00.000Z')),
      secondFinance.fundAdvance(advance(
        [aaplDayThree, bbbDayThree],
        [{ symbol: 'BBB', quantity: 1 }],
        '2026-01-03T00:00:00.000Z',
      )),
    ])
    expect(dayThree.result.snapshot).toMatchObject({
      cash: 750,
      nav: 1_020,
      positions: [
        { symbol: 'AAPL', quantity: 2, price: 110, value: 220 },
        { symbol: 'BBB', quantity: 1, price: 50, value: 50 },
      ],
    })
    expect(await graph.getNode(dayTwo.result.snapshot.id)).toMatchObject({
      metadata: { cash: 800, nav: 1_000 },
    })
    expect((await graph.revisions()).filter(entry => entry.op === 'finance.fund.advance')).toHaveLength(2)
  })

  it('requires a real scheduleId before storing enabled=true and preserves unknown metadata', async () => {
    const { finance, graph } = await setup()
    await configure(finance)
    await expect(finance.fundResearcher({
      fundId: 'portfolio:fund',
      id: 'session:analyst',
      title: 'Analyst',
      tickers: ['AAPL'],
      researchStyle: 'fundamental',
      focus: 'quality',
      task: 'Publish evidence.',
      enabled: true,
    })).rejects.toMatchObject({ code: 'SCHEDULE_ID_REQUIRED' })

    await finance.fundResearcher({
      fundId: 'portfolio:fund',
      id: 'session:analyst',
      title: 'Analyst',
      tickers: ['AAPL'],
      researchStyle: 'fundamental',
      focus: 'quality',
      task: 'Publish evidence.',
      enabled: false,
    })
    const node = await graph.getNode('session:analyst')
    if (node === undefined) throw new Error('analyst was not stored')
    await graph.applyPlan({
      nodes: [{
        id: node.id,
        kind: node.kind,
        title: node.title,
        content: node.content,
        metadata: { ...node.metadata, hostExtension: { keep: true } },
      }],
      edges: [],
    })
    await finance.fundResearcher({
      fundId: 'portfolio:fund',
      id: 'session:analyst',
      title: 'Analyst',
      tickers: ['AAPL'],
      researchStyle: 'fundamental',
      focus: 'quality',
      task: 'Publish evidence.',
      scheduleId: 'schedule-real-2',
      enabled: true,
    })
    expect((await finance.fundState({ fundId: 'portfolio:fund' })).result.researchers[0]?.metadata)
      .toMatchObject({ role: 'analyst', hostExtension: { keep: true }, scheduleId: 'schedule-real-2', enabled: true })
  })
})
