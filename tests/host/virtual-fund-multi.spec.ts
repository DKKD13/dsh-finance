import { createHash } from 'node:crypto'
import { join } from 'node:path'
import { Context } from '@deepseek-ai/cordis'
import { afterEach, describe, expect, it } from 'vitest'
import { FinanceService } from '../../src/finance/service.ts'
import type { FundAdvanceInput, FundPriceInput } from '../../src/finance/virtual-fund.ts'
import { ResearchGraphService, resolveConfig } from '../../src/service.ts'
import type { SourceItem } from '../../src/finance/types.ts'
import { makeTempDir } from './fixtures.ts'

/**
 * Two-fund, two-currency, two-date ledger reconciliation. Every expected
 * number below is recomputed by the independent `ledger` helper in this file
 * and then compared against the Host's persisted snapshots, so the test
 * cross-checks the Host ledger instead of restating it.
 */

const cleanups: (() => Promise<void>)[] = []
afterEach(async () => {
  while (cleanups.length > 0) await cleanups.pop()?.()
})

const USD_FUND = 'portfolio:fund:usd'
const HKD_FUND = 'portfolio:fund:hkd'
const USD_START = '2026-01-01T00:00:00.000Z'
const HKD_START = '2026-02-01T00:00:00.000Z'

async function setup() {
  const temp = await makeTempDir('virtual-fund-multi')
  cleanups.push(temp.cleanup)
  const config = resolveConfig({ dataDir: join(temp.dir, 'data'), autoIndexSkills: false }, join(temp.dir, 'skills'))
  const graph = new ResearchGraphService(new Context(), config)
  const finance = new FinanceService(new Context(), graph)
  return { temp, config, graph, finance }
}

function source(symbol: string, price: number, at: string, currency: string, suffix: string): SourceItem {
  const content = JSON.stringify({ symbol, currency, price, availableAt: at })
  return {
    provider: 'fixture.market',
    canonicalUrl: `https://market.example.test/${symbol}/${suffix}`,
    title: `${symbol} quote ${at}`,
    content,
    contentHash: `sha256:${createHash('sha256').update(content).digest('hex')}`,
    asOf: at,
    availableAt: at,
    fetchedAt: at,
    data: { symbol, currency, price, availableAt: at },
    provenance: { fixture: 'virtual-fund-multi' },
  }
}

async function addPrice(
  finance: FinanceService,
  symbol: string,
  price: number,
  at: string,
  currency: string,
  suffix: string,
): Promise<FundPriceInput> {
  const ingested = await finance.ingestSources({
    items: [source(symbol, price, at, currency, suffix)],
    dryRun: false,
    asOf: at,
    runId: `price-${suffix}`,
  })
  const sourceId = ingested.sourceIds[0]
  if (sourceId === undefined) throw new Error('fixture source was not accepted')
  return { symbol, price, availableAt: at, sourceId }
}

function advance(
  fundId: string,
  asOf: string,
  prices: readonly FundPriceInput[],
  trades: FundAdvanceInput['trades'],
  summary = '',
): FundAdvanceInput {
  return { fundId, asOf, prices, trades, summary }
}

/** Independent paper ledger: the test's own source of truth for NAV math. */
function ledger(initialCash: number) {
  let cash = initialCash
  const positions = new Map<string, number>()
  return {
    buy(symbol: string, quantity: number, price: number) {
      cash -= quantity * price
      positions.set(symbol, (positions.get(symbol) ?? 0) + quantity)
      return this
    },
    sell(symbol: string, quantity: number, price: number) {
      cash += quantity * price
      positions.set(symbol, (positions.get(symbol) ?? 0) - quantity)
      return this
    },
    expected(prices: Record<string, number>) {
      const list = [...positions.keys()].sort().map(symbol => {
        const quantity = positions.get(symbol) ?? 0
        const price = prices[symbol]
        if (price === undefined) throw new Error(`ledger missing price for ${symbol}`)
        return { symbol, quantity, price, value: quantity * price }
      })
      const nav = cash + list.reduce((total, position) => total + position.value, 0)
      return { cash, nav, positions: list }
    },
  }
}

describe('two-fund two-currency ledger reconciliation', () => {
  it('keeps USD and HKD paper ledgers isolated across two dates each and reconciles against persisted snapshots', async () => {
    const { config, graph, finance } = await setup()

    // --- configure two funds with different currencies and start dates ---
    await finance.fundConfigure({ id: USD_FUND, title: 'US Tech Paper Fund', currency: 'USD', initialCash: 100_000, startingAt: USD_START })
    await finance.fundConfigure({ id: HKD_FUND, title: 'HK Value Paper Fund', currency: 'HKD', initialCash: 800_000, startingAt: HKD_START })

    // --- research desks (coverage disabled: no native schedule is created) ---
    await finance.fundResearcher({
      fundId: USD_FUND, id: 'session:analyst-usd', title: 'AAPL Analyst',
      tickers: ['AAPL'], researchStyle: 'evidence-first', focus: 'consumer hardware cycle',
      task: 'Track AAPL price evidence and publish paper notes.', role: 'analyst', enabled: false,
    })
    await finance.fundResearcher({
      fundId: HKD_FUND, id: 'session:pm-hkd', title: 'HK Desk PM',
      tickers: ['HSBC'], researchStyle: 'value discipline', focus: 'HK banking',
      task: 'Watch HSBC valuation and keep the paper ledger honest.', role: 'manager', avatarKey: 'pm', enabled: false,
    })

    // --- USD fund: 2026-01-05 buy 10 AAPL @150, 2026-01-09 buy 5 @160 ---
    const usdLedger = ledger(100_000)
    const usdT1Price = await addPrice(finance, 'AAPL', 150, '2026-01-05T00:00:00.000Z', 'USD', 'usd-t1')
    usdLedger.buy('AAPL', 10, 150)
    const usdT1 = await finance.fundAdvance(advance(USD_FUND, '2026-01-05T00:00:00.000Z', [usdT1Price], [{ symbol: 'AAPL', quantity: 10 }], 'initial AAPL position'))
    expect(usdT1.result.snapshot).toMatchObject(usdLedger.expected({ AAPL: 150 }))

    const usdT2Price = await addPrice(finance, 'AAPL', 160, '2026-01-09T00:00:00.000Z', 'USD', 'usd-t2')
    usdLedger.buy('AAPL', 5, 160)
    const usdT2 = await finance.fundAdvance(advance(USD_FUND, '2026-01-09T00:00:00.000Z', [usdT2Price], [{ symbol: 'AAPL', quantity: 5 }], 'add on strength'))
    expect(usdT2.result.snapshot).toMatchObject(usdLedger.expected({ AAPL: 160 }))
    expect(usdT2.result.snapshot.nav).toBe(100_100)

    // --- HKD fund: 2026-02-03 buy 2000 HSBC @68.50, 2026-02-06 sell 500 @70.20 ---
    const hkdLedger = ledger(800_000)
    const hkdT1Price = await addPrice(finance, 'HSBC', 68.5, '2026-02-03T00:00:00.000Z', 'HKD', 'hkd-t1')
    hkdLedger.buy('HSBC', 2000, 68.5)
    const hkdT1 = await finance.fundAdvance(advance(HKD_FUND, '2026-02-03T00:00:00.000Z', [hkdT1Price], [{ symbol: 'HSBC', quantity: 2000 }], 'open HSBC position'))
    expect(hkdT1.result.snapshot).toMatchObject(hkdLedger.expected({ HSBC: 68.5 }))

    const hkdT2Price = await addPrice(finance, 'HSBC', 70.2, '2026-02-06T00:00:00.000Z', 'HKD', 'hkd-t2')
    hkdLedger.sell('HSBC', 500, 70.2)
    const hkdT2 = await finance.fundAdvance(advance(HKD_FUND, '2026-02-06T00:00:00.000Z', [hkdT2Price], [{ symbol: 'HSBC', quantity: -500 }], 'trim into strength'))
    expect(hkdT2.result.snapshot).toMatchObject(hkdLedger.expected({ HSBC: 70.2 }))
    expect(hkdT2.result.snapshot.nav).toBe(803_400)

    // --- currency isolation: the HKD record cannot price the USD fund ---
    await expect(finance.fundAdvance(advance(USD_FUND, '2026-02-09T00:00:00.000Z', [hkdT2Price], [])))
      .rejects.toMatchObject({ code: 'CURRENCY_MISMATCH' })

    // --- failure recovery: out-of-order and conflicting/duplicate advances ---
    await expect(finance.fundAdvance(advance(USD_FUND, '2026-01-07T00:00:00.000Z', [usdT2Price], [])))
      .rejects.toMatchObject({ code: 'OUT_OF_ORDER_SNAPSHOT' })
    const replay = await finance.fundAdvance(advance(USD_FUND, '2026-01-09T00:00:00.000Z', [usdT2Price], [{ symbol: 'AAPL', quantity: 5 }], 'add on strength'))
    expect(replay.result.snapshot.id).toBe(usdT2.result.snapshot.id)
    const misstatedPrice: FundPriceInput = { symbol: 'AAPL', price: 161, availableAt: usdT2Price.availableAt, sourceId: usdT2Price.sourceId }
    await expect(finance.fundAdvance(advance(USD_FUND, '2026-01-09T00:00:00.000Z', [misstatedPrice], [{ symbol: 'AAPL', quantity: 5 }])))
      .rejects.toMatchObject({ code: 'SOURCE_PRICE_MISMATCH' })

    // --- real activity only: one recorded deliverable appears in exactly one fund's feed ---
    await graph.applyPlan(
      {
        nodes: [{
          id: 'deliverable:research:aapl-note-1',
          kind: 'deliverable',
          title: 'AAPL evidence note',
          content: 'Paper research note citing saved price evidence.',
          metadata: { fundId: USD_FUND, researcherId: 'session:analyst-usd', instruments: ['AAPL'] },
        }],
        edges: [],
      },
      'finance.fund.fixture',
      'record fund research deliverable',
    )

    const usdState = await finance.fundState({ fundId: USD_FUND })
    const hkdState = await finance.fundState({ fundId: HKD_FUND })
    const allState = await finance.fundState()

    expect(usdState.result.funds.map(node => node.id)).toEqual([USD_FUND])
    expect(hkdState.result.funds.map(node => node.id)).toEqual([HKD_FUND])
    expect(allState.result.funds.map(node => node.id)).toEqual([HKD_FUND, USD_FUND].sort())
    expect(usdState.result.snapshots.map(node => node.metadata.asOf)).toEqual(['2026-01-05T00:00:00.000Z', '2026-01-09T00:00:00.000Z'])
    expect(hkdState.result.snapshots.map(node => node.metadata.asOf)).toEqual(['2026-02-03T00:00:00.000Z', '2026-02-06T00:00:00.000Z'])
    expect(usdState.result.researchers.map(node => node.id)).toEqual(['session:analyst-usd'])
    expect(hkdState.result.researchers.map(node => node.id)).toEqual(['session:pm-hkd'])
    expect(usdState.result.events.map(node => node.id)).toEqual(['deliverable:research:aapl-note-1'])
    expect(hkdState.result.events).toEqual([])

    // --- restart: reopened graph replays the same ledger numbers from disk ---
    const reopenedGraph = new ResearchGraphService(new Context(), config)
    const reopenedFinance = new FinanceService(new Context(), reopenedGraph)
    const reopenedUsd = await reopenedFinance.fundState({ fundId: USD_FUND })
    const reopenedHkd = await reopenedFinance.fundState({ fundId: HKD_FUND })
    expect(reopenedUsd.result.snapshots.at(-1)).toMatchObject({
      metadata: { nav: usdLedger.expected({ AAPL: 160 }).nav, cash: usdLedger.expected({ AAPL: 160 }).cash },
    })
    expect(reopenedHkd.result.snapshots.at(-1)).toMatchObject({
      metadata: { nav: hkdLedger.expected({ HSBC: 70.2 }).nav, cash: hkdLedger.expected({ HSBC: 70.2 }).cash },
    })
    expect(reopenedUsd.result.snapshots).toHaveLength(2)
    expect(reopenedHkd.result.snapshots).toHaveLength(2)
  })
})
