import { createElement } from 'react'
import { renderToString } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { aggregateMarketBars, lineSegments, nextChartIndex, nextMatrixIndex, pointerChartIndex, readCalibration, readPortfolioReturns } from '../../client/chart-data.ts'
import type { MarketBar } from '../../client/chart-data.ts'
import { AllocationBars, CalibrationPlot, MarketChart, ScenarioBars, SensitivityMatrix, Sparkline } from '../../client/ui/FinanceCharts.tsx'
import { ProvenanceList } from '../../client/ui/FinanceCommon.tsx'
import { ValuationResult } from '../../client/ui/FinanceData.tsx'
import { valuationPriceReference } from '../../client/ui/FinanceModels.tsx'
import { en } from '../../client/locales.ts'
import type { Translate } from '../../client/store.ts'

const t: Translate = (key, params) => {
  const template: string = en[key as keyof typeof en] ?? key
  if (params === undefined) return template
  return Object.entries(params).reduce((text, [name, value]) => text.replaceAll(`{${name}}`, String(value)), template)
}

const bars: MarketBar[] = [
  { timestamp: '2026-01-01T00:00:00Z', open: 10, high: 13, low: 9, close: 12, adjustedClose: 11.5, volume: 100 },
  { timestamp: '2026-01-02T00:00:00Z', open: null, high: null, low: null, close: null, adjustedClose: null, volume: null },
  { timestamp: '2026-01-03T00:00:00Z', open: 12, high: 15, low: 11, close: 14, adjustedClose: 13.5, volume: 140 },
  { timestamp: '2026-01-04T00:00:00Z', open: 14, high: 16, low: 13, close: 15, adjustedClose: 14.5, volume: 160 },
]

const history = {
  items: [{
    provider: 'fixture.one', title: 'AAA history', canonicalUrl: 'https://example.com/one', contentHash: 'hash-one', asOf: '2026-01-04T00:00:00Z', availableAt: '2026-01-04T00:00:00Z', fetchedAt: '2026-01-04T01:00:00Z', runId: 'run-one', provenance: { endpoint: 'one' },
    data: { symbol: 'AAA', currency: 'USD', bars },
  }],
}

describe('finance chart adapters', () => {
  it('breaks lines at null values without inserting zero', () => {
    expect(lineSegments([1, null, 3, 4, null, 6])).toEqual([[0], [2, 3], [5]])
    const html = renderToString(createElement(Sparkline, { values: [1, null, 3, 4], label: 'real series', emptyLabel: 'no series' }))
    expect(html).toContain('cx="3"')
    expect(html).toContain('M119,')
    expect(html).not.toContain('NaN')
  })

  it('aggregates only the visual bars and preserves OHLC/volume semantics', () => {
    const generated: MarketBar[] = Array.from({ length: 500 }, (_, index) => ({
      timestamp: new Date(Date.UTC(2026, 0, 1 + index)).toISOString(),
      open: index, high: index + 4, low: index - 2, close: index + 1, adjustedClose: index + 0.5, volume: index % 7 === 0 ? null : index,
    }))
    const aggregated = aggregateMarketBars(generated, 40)
    expect(aggregated.length).toBeLessThanOrEqual(40)
    expect(aggregated.reduce((sum, bar) => sum + bar.count, 0)).toBe(500)
    expect(aggregated[0]?.open).toBe(0)
    expect(aggregated[0]?.high).toBe(16)
    expect(aggregated[0]?.low).toBe(-2)
    expect(aggregated[0]?.close).toBe(13)
    expect(aggregated.at(-1)?.endTimestamp).toBe(generated.at(-1)?.timestamp)
  })

  it('maps keyboard and pointer/touch positions to bounded shared crosshair indices', () => {
    expect(nextChartIndex(null, 'ArrowRight', 4)).toBe(0)
    expect(nextChartIndex(null, 'ArrowLeft', 4)).toBe(3)
    expect(nextChartIndex(0, 'ArrowLeft', 4)).toBe(0)
    expect(nextChartIndex(2, 'End', 4)).toBe(3)
    expect(nextChartIndex(2, 'Escape', 4)).toBeNull()
    expect(pointerChartIndex(50, 0, 100, 5)).toBe(2)
    expect(pointerChartIndex(-20, 0, 100, 5)).toBe(0)
    expect(pointerChartIndex(120, 0, 100, 5)).toBe(4)
    expect(pointerChartIndex(20, 0, 0, 5)).toBeNull()
    expect(nextMatrixIndex(0, 'ArrowLeft', 2, 3)).toBe(0)
    expect(nextMatrixIndex(2, 'ArrowRight', 2, 3)).toBe(2)
    expect(nextMatrixIndex(4, 'ArrowUp', 2, 3)).toBe(1)
    expect(nextMatrixIndex(4, 'ArrowDown', 2, 3)).toBe(5)
    expect(nextMatrixIndex(4, 'End', 2, 3)).toBe(5)
  })

  it('reads only explicit calibration bins and keeps a null Brier unavailable', () => {
    const noBins = readCalibration({ brierScore: null, evaluations: [{ probability: 0.8, actual: true, brier: 0.04 }] })
    expect(noBins).toEqual({ bins: [], brierScore: null })
    expect(readCalibration({ brierScore: 0.0625, calibration: { bins: [{ predictedMean: 0.75, observedFrequency: 1, count: 1 }] } })).toEqual({ bins: [{ predictedMean: 0.75, observedFrequency: 1, count: 1, lower: null, upper: null }], brierScore: 0.0625 })
    expect(readPortfolioReturns({ positions: [], totals: { marketValue: 100 } })).toEqual([])
  })
})

describe('financial SVG rendering', () => {
  it('renders OHLC, adjusted lines, volume, and lineage while keeping the exact table lazy', () => {
    const html = renderToString(createElement(MarketChart, { value: history, t }))
    expect(html).toContain('rg-chart-candle')
    expect(html).toContain('rg-chart-volume')
    expect(html).toContain('role="application"')
    expect(html).toContain('aria-keyshortcuts="ArrowLeft ArrowRight Home End Escape"')
    expect(html).toContain('Exact data (4 rows)')
    expect(html).not.toContain('<tbody>')
    expect(html).not.toContain('<td>2026-01-02T00:00:00Z</td>')
    expect(html).toContain('fixture.one')
    const line = renderToString(createElement(MarketChart, { value: history, initialMode: 'adjustedClose', t }))
    expect(line).toContain('rg-chart-line-point')
    expect(line).toContain('rg-chart-line')
    const precise = renderToString(createElement(MarketChart, { value: { items: [{ data: { symbol: 'AAA', bars: [{ ...bars[0], close: 12.123456789 }] } }] }, t }))
    expect(precise).toContain('Exact data (1 rows)')
    expect(precise).not.toContain('<td>12.123456789</td>')
  })

  it('renders allocation zero lines, concentration, and linked selection state', () => {
    const html = renderToString(createElement(AllocationBars, {
      items: [{ id: 'a', label: 'AAA', weight: 0.75, pnl: 40, currency: 'USD' }, { id: 'b', label: 'BBB', weight: 0.25, pnl: -10, currency: 'USD' }],
      concentration: { top1Weight: 0.75, top5Weight: 1, hhi: 0.625, effectivePositions: 1.6 }, selectedId: 'b', t,
    }))
    expect(html).toContain('rg-chart-zero')
    expect(html).toContain('data-direction="negative"')
    expect(html).toContain('data-selected="true"')
    expect(html).toContain('0.625')
    expect(html).toContain('75%')
  })

  it('keeps allocation labels readable without rounding the chart geometry', () => {
    const weight = 521.91 / 931.19
    const html = renderToString(createElement(AllocationBars, {
      items: [{ id: 'msft', label: 'MSFT', weight, pnl: 21.91, currency: 'USD' }],
      concentration: { top1Weight: weight, hhi: weight ** 2 + (1 - weight) ** 2 }, t,
    }))
    expect(html).toContain('56.05%')
    expect(html).not.toContain('56.047638%')
    expect(html).toContain(`width="${weight * 180}"`)
    expect(html).toContain('Exact data (1 rows)')
  })

  it('renders the DCF base cell with two outlines, exact values, keyboard cells, table, and warnings', () => {
    const html = renderToString(createElement(SensitivityMatrix, {
      rows: [{ wacc: 0.09, values: [{ terminalGrowth: 0.02, perShare: 80 }] }, { wacc: 0.1, values: [{ terminalGrowth: 0.02, perShare: 71.24999999999999 }] }],
      center: { wacc: 0.1, terminalGrowth: 0.02, perShare: 71.24999999999999 }, currency: 'USD', warnings: ['real warning'], t,
    }))
    expect(html).toContain('data-base="true"')
    expect(html).toContain('rg-sensitivity-base-outer')
    expect(html).toContain('rg-sensitivity-base-inner')
    expect(html).toContain('>71.25</text>')
    expect(html).not.toContain('>71.24999999999999</text>')
    expect(html).not.toContain('<td>71.24999999999999</td>')
    expect(html).toContain('role="button"')
    expect(html).toContain('tabindex="0"')
    expect(html).toContain('Exact data (2 rows)')
    expect(html).toContain('real warning')
  })

  it('renders percent axes, base-relative coloring, and full-precision titles in the sensitivity matrix', () => {
    const html = renderToString(createElement(SensitivityMatrix, {
      rows: [
        { wacc: 0.09, values: [{ terminalGrowth: 0.02, perShare: 80 }, { terminalGrowth: 0.03, perShare: 86.5 }] },
        { wacc: 0.1, values: [{ terminalGrowth: 0.02, perShare: 71.24999999999999 }, { terminalGrowth: 0.03, perShare: 65 }] },
      ],
      center: { wacc: 0.1, terminalGrowth: 0.02, perShare: 71.24999999999999 }, currency: 'USD', warnings: [], t,
    }))
    expect(html).toContain('>9%</text>')
    expect(html).toContain('>10%</text>')
    expect(html).toContain('>2%</text>')
    expect(html).toContain('>3%</text>')
    expect(html).not.toContain('>0.09</text>')
    expect(html).toContain('data-direction="positive"')
    expect(html).toContain('data-direction="negative"')
    expect(html).toContain('Per share 71.24999999999999 USD')
    expect(html).toContain('>86.50</text>')
    // Selection readout follows the same percent/amount formatting as axes and cells (review-03 F2).
    const selection = html.match(/rg-chart-selection[^>]*>([^<]*)</)?.[1] ?? ''
    expect(selection).toBe('WACC 10% · Terminal growth 2% · 71.25 USD')
  })

  it('falls back to the min-max ramp when the sensitivity result has no base cell', () => {
    const html = renderToString(createElement(SensitivityMatrix, {
      rows: [{ wacc: 0.09, values: [{ terminalGrowth: 0.02, perShare: 80 }, { terminalGrowth: 0.03, perShare: 60 }] }],
      currency: 'USD', warnings: [], t,
    }))
    expect(html).not.toContain('data-direction=')
  })

  it('draws the saved-quote reference line and extends the domain when the price is outside the scenario range', () => {
    const items = [{ name: 'base', probability: 1, perShare: 100 }]
    const withRef = renderToString(createElement(ScenarioBars, {
      items, currency: 'USD', t, reference: { price: 87.23, asOf: '2026-10-31T13:30:00Z', provider: 'yahoo' },
    }))
    expect(withRef).toContain('rg-scenario-reference')
    expect(withRef).toContain('Saved quote reference')
    expect(withRef).toContain('Saved quote 87.23 from yahoo as of 2026-10-31T13:30:00Z')
    const withoutRef = renderToString(createElement(ScenarioBars, { items, currency: 'USD', t }))
    expect(withoutRef).not.toContain('rg-scenario-reference')
    // A reference above every scenario extends the domain instead of hiding the
    // line: the true scenario value stays unclamped, the line shows the distance.
    const outOfRange = renderToString(createElement(ScenarioBars, {
      items, currency: 'USD', t, reference: { price: 500, asOf: '2026-10-31T13:30:00Z', provider: 'yahoo' },
    }))
    expect(outOfRange).toContain('rg-scenario-reference')
    expect(outOfRange).toContain('x1="176"')
    expect(outOfRange).toContain('>100.00</text>')
  })

  it('shows the saved-quote reference row on the valuation summary only when supplied', () => {
    const value = {
      result: {
        method: 'dcf', currency: 'USD', enterpriseValue: 9200, equityValue: 8100, perShare: 71.24999999999999,
        instrument: { id: 'ins:msft', symbol: 'MSFT', currency: 'USD' },
        scenarios: [{ name: 'base', probability: 1, wacc: 0.1, terminalGrowth: 0.03, taxRate: 0.25, equityValue: 8100, perShare: 71.24999999999999 }],
        sensitivity: { rows: [{ wacc: 0.1, values: [{ terminalGrowth: 0.03, perShare: 71.25 }] }], center: { wacc: 0.1, terminalGrowth: 0.03, perShare: 71.25 } },
        warnings: [],
      },
    }
    const withRef = renderToString(createElement(ValuationResult, {
      value, t, priceReference: { price: 60, asOf: '2026-10-31T13:30:00Z', provider: 'yahoo' },
    })).replaceAll('<!-- -->', '')
    expect(withRef).toContain('Saved quote reference')
    expect(withRef).toContain('60.00 USD · yahoo · 2026-10-31T13:30:00Z')
    expect(withRef).toContain('rg-scenario-reference')
    expect(withRef).toContain('100%')
    expect(withRef).toContain('<td>10%</td>')
    expect(withRef).toContain('<td>25%</td>')
    const withoutRef = renderToString(createElement(ValuationResult, { value, t }))
    expect(withoutRef).not.toContain('Saved quote reference')
    expect(withoutRef).not.toContain('rg-scenario-reference')
  })

  it('accepts a saved quote as price reference only for the same currency', () => {
    const quote = { symbol: 'MSFT', price: 87.23, change: null, asOf: '2026-10-31T13:30:00Z', provider: 'yahoo', sourceId: 'src:1', currency: 'USD', timezone: null, name: null, shortName: null }
    const value = { result: { currency: 'USD', instrument: { symbol: 'MSFT' } } }
    expect(valuationPriceReference(value, new Map([['MSFT', quote]]))).toEqual({ price: 87.23, asOf: '2026-10-31T13:30:00Z', provider: 'yahoo' })
    const otherCurrency = { ...quote, currency: 'HKD' }
    expect(valuationPriceReference(value, new Map([['MSFT', otherCurrency]]))).toBeUndefined()
    const noSymbol = { result: { currency: 'USD' } }
    expect(valuationPriceReference(noSymbol, new Map([['MSFT', quote]]))).toBeUndefined()
    const missingQuote = { result: { currency: 'USD', instrument: { symbol: 'AAPL' } } }
    expect(valuationPriceReference(missingQuote, new Map([['MSFT', quote]]))).toBeUndefined()
    const zeroPrice = { ...quote, price: 0 }
    expect(valuationPriceReference(value, new Map([['MSFT', zeroPrice]]))).toBeUndefined()
  })

  it('does not fabricate a calibration plot from evaluations and renders only real bins', () => {
    const empty = renderToString(createElement(CalibrationPlot, { value: { brierScore: null, evaluations: [{ brier: 0.04 }] }, t }))
    expect(empty).not.toContain('rg-calibration-plot')
    expect(empty).toContain('Brier score is unavailable (null), not zero')
    expect(empty).toContain('No explicit calibration bins')
    const real = renderToString(createElement(CalibrationPlot, { value: { brierScore: 0, calibration: { bins: [{ predictedMean: 0.5, observedFrequency: 0.75, count: 4 }] } }, t }))
    expect(real).toContain('rg-calibration-plot')
    expect(real).toContain('rg-calibration-bin')
    expect(real).toContain('<dd>0</dd>')
  })

  it('reserves enough SVG space for the longest Y-axis label without shrinking the plot', () => {
    const longHistory = { items: [{ data: { symbol: 'LONG', bars: [{ timestamp: '2026-01-01T00:00:00Z', open: 123456780.123456, high: 123456790.123456, low: 123456770.123456, close: 123456785.123456, adjustedClose: 123456785.123456, volume: 1 }] } }] }
    const html = renderToString(createElement(MarketChart, { value: longHistory, t }))
    const labels = [...html.matchAll(/<text class="rg-chart-axis-label" x="([\d.-]+)" y="[\d.-]+" text-anchor="end">([^<]+)<\/text>/g)].slice(0, 5)
    expect(labels).toHaveLength(5)
    for (const label of labels) {
      const x = Number(label[1])
      const text = label[2] ?? ''
      expect(x - text.length * 8).toBeGreaterThanOrEqual(8)
    }
    const grid = /<line class="rg-chart-grid" x1="([\d.-]+)" x2="([\d.-]+)"/.exec(html)
    expect(grid).not.toBeNull()
    expect(Number(grid?.[2]) - Number(grid?.[1])).toBe(840)
  })

  it('keeps the initial DOM bounded for 600 bars by mounting only aggregated marks, not the exact table', () => {
    const generated: MarketBar[] = Array.from({ length: 600 }, (_, index) => ({
      timestamp: new Date(Date.UTC(2026, 0, 1 + index)).toISOString(), open: index, high: index + 2, low: index - 2, close: index + 1, adjustedClose: index + 1, volume: index * 100,
    }))
    const html = renderToString(createElement(MarketChart, { value: { items: [{ data: { symbol: 'AAA', bars: generated } }] }, t }))
    expect(html).toContain('Exact data (600 rows)')
    expect(html).not.toContain('<table')
    expect(html).not.toContain('<tbody')
    expect(html.match(/class="rg-chart-candle"/g) ?? []).toHaveLength(150)
  })

  it('lists every distinct source instead of only the first few', () => {
    const value = { items: ['one', 'two', 'three', 'four'].map(provider => ({ provider, asOf: '2026-01-01T00:00:00Z', provenance: { provider } })) }
    const html = renderToString(createElement(ProvenanceList, { value, t }))
    for (const provider of ['one', 'two', 'three', 'four']) expect(html).toContain(provider)
    expect(html).toContain('Source 4 of 4')
  })
})
