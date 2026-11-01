import { describe, expect, it } from 'vitest'
import { GraphError } from '../../src/graph.ts'
import { calculateComps, calculateDcf } from '../../src/finance/models.ts'
import { calculatePortfolio } from '../../src/finance/portfolio.ts'
import type { DcfInput, PortfolioInput } from '../../src/finance/types.ts'

const at = '2026-01-10T00:00:00.000Z'
const lineage = { provider: 'fixture.external', asOf: at, availableAt: at, fetchedAt: at, provenance: { sourceRefs: ['fixture://dcf'] } }

function dcfInput(): DcfInput {
  const scenario = (name: string, probability: number, ebit: number) => ({
    name,
    probability,
    wacc: 0.1,
    terminalGrowth: 0.02,
    taxRate: 0.2,
    incomeStatement: { revenue: [1000], ebit: [ebit] },
    cashFlowStatement: { depreciation: [10], capitalExpenditure: [20], workingCapitalChange: [5] },
    balanceSheet: { netDebt: 100, debt: 150, cash: 50 },
  })
  return {
    instrument: { id: 'instrument:gold', title: 'Gold Corp', symbol: 'GOLD', currency: 'USD', metadata: lineage },
    currency: 'USD',
    units: { financials: 'millions', shares: 'millions' },
    sharesOutstanding: 10,
    scenarios: [scenario('base', 0.6, 100), scenario('bear', 0.4, 50)],
    sensitivity: { waccValues: [0.09, 0.1, 0.11], terminalGrowthValues: [0.01, 0.02, 0.03] },
    metadata: lineage,
  }
}

function portfolioInput(): PortfolioInput {
  return {
    portfolio: { id: 'portfolio:main', title: 'Main', metadata: lineage },
    baseCurrency: 'USD',
    asOf: at,
    metadata: lineage,
    positions: [
      {
        id: 'position:usd', quantity: 10, price: 150, costBasisPerUnit: 100, metadata: lineage,
        instrument: { id: 'instrument:usd', title: 'USD Co', currency: 'USD', metadata: lineage },
      },
      {
        id: 'position:eur', quantity: 2, price: 800, costBasisPerUnit: 700, metadata: lineage,
        instrument: { id: 'instrument:eur', title: 'EUR Co', currency: 'EUR', metadata: lineage },
      },
    ],
    fx: [{ from: 'EUR', to: 'USD', rate: 1.2, asOf: at, availableAt: at, provider: 'fixture.fx' }],
  }
}

describe('deterministic finance models', () => {
  it('matches a DCF golden sample across three statements, scenarios, units, and sensitivity center', () => {
    const result = calculateDcf(dcfInput())
    expect(result.scenarios[0]?.cashFlowStatement[0]?.freeCashFlow).toBe(65)
    expect(result.scenarios[0]?.terminal.value).toBe(828.75)
    expect(result.scenarios[0]?.enterpriseValue).toBe(812.5)
    expect(result.scenarios[0]?.balanceSheet.equityValue).toBe(712.5)
    expect(result.scenarios[0]?.perShare).toBe(71.25)
    expect(result.scenarios[1]?.perShare).toBe(21.25)
    expect(result.weighted.perShare).toBe(51.25)
    expect(result.probabilityTotal).toBe(1)
    const sensitivity = result.sensitivity as { center: { perShare: number }; rows: { wacc: number; values: { terminalGrowth: number; perShare: number }[] }[] }
    expect(sensitivity.center.perShare).toBe(71.25)
    const center = sensitivity.rows.find(row => row.wacc === 0.1)?.values.find(value => value.terminalGrowth === 0.02)
    expect(center?.perShare).toBe(71.25)
    expect(result.units.perShare).toBe('USD/share')
  })

  it('rejects invalid WACC/g, probabilities, schedule lengths, balance sheets, and sensitivity axes', () => {
    for (const mutate of [
      (input: DcfInput) => { input.scenarios[0]!.wacc = 0.02 },
      (input: DcfInput) => { input.scenarios[0]!.probability = 0.5 },
      (input: DcfInput) => { input.scenarios[0]!.incomeStatement.ebit.push(90) },
      (input: DcfInput) => { input.scenarios[0]!.balanceSheet.netDebt = 90 },
      (input: DcfInput) => { input.sensitivity!.waccValues = [0.09, 0.11] },
    ]) {
      const input = dcfInput()
      mutate(input)
      expect(() => calculateDcf(input)).toThrowError(GraphError)
    }
  })

  it('uses the peer median while excluding the target itself', () => {
    const result = calculateComps({
      instrument: { id: 'instrument:target', title: 'Target', currency: 'USD', metadata: lineage },
      targetMetric: 5,
      basis: 'enterprise',
      peers: [{ id: 'instrument:target', multiple: 100 }, { id: 'p1', multiple: 10 }, { id: 'p2', multiple: 12 }, { id: 'p3', multiple: 14 }],
      netDebt: 20,
      sharesOutstanding: 10,
      currency: 'USD',
      metadata: lineage,
    })
    expect(result.peerMedian).toBe(12)
    expect(result.enterpriseValue).toBe(60)
    expect(result.equityValue).toBe(40)
    expect(result.perShare).toBe(4)
    expect(result.peerIds).not.toContain('instrument:target')
  })

  it('computes original-currency and FX-base PnL, weights, and concentration', () => {
    const result = calculatePortfolio(portfolioInput())
    expect(result.positions[0]?.original.unrealizedPnl).toBe(500)
    expect(result.positions[1]?.original.unrealizedPnl).toBe(200)
    expect(result.positions[1]?.base.marketValue).toBe(1920)
    expect(result.totals).toEqual({ marketValue: 3420, costBasis: 2680, unrealizedPnl: 740 })
    expect(result.positions[0]?.weight).toBeCloseTo(1500 / 3420, 12)
    expect(result.positions[1]?.weight).toBeCloseTo(1920 / 3420, 12)
    expect(result.concentration.top1Weight).toBeCloseTo(1920 / 3420, 12)
    expect(result.concentration.hhi).toBeCloseTo((1500 / 3420) ** 2 + (1920 / 3420) ** 2, 12)
    expect(result.originalCurrencyTotals.EUR?.unrealizedPnl).toBe(200)
  })

  it('fails closed when direct FX is missing or was not yet available', () => {
    const missing = portfolioInput()
    missing.fx = []
    expect(() => calculatePortfolio(missing)).toThrowError(GraphError)
    const future = portfolioInput()
    future.fx[0]!.availableAt = '2026-01-11T00:00:00.000Z'
    expect(() => calculatePortfolio(future)).toThrowError(GraphError)
    try {
      calculatePortfolio(future)
    } catch (error: unknown) {
      expect((error as GraphError).code).toBe('MISSING_FX')
    }
  })
})
