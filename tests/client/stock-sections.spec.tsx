import { createElement } from 'react'
import { renderToString } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import type { GraphNode } from '../../src/graph.ts'
import { StockSections, stockSectionCsv } from '../../client/ui/StockSections.tsx'

function node(id: string, metadata: Record<string, unknown>): GraphNode {
  return { id, kind: 'instrument', title: id, content: '', metadata: metadata as GraphNode['metadata'], createdAt: 1, updatedAt: 1 }
}

const financial = node('instrument:test', {
  symbol: 'TEST',
  currency: 'USD',
  units: { financials: 'millions' },
  financials: {
    unit: 'millions',
    annual: [
      { period: 'FY2025', values: { marketCap: 1000, revenue: 400, revenueGrowth: 12.5, grossProfit: 160, grossMargin: 40, dilutedEPS: 2.5 }, sourceId: 'filing:FY2025' },
      { period: 'FY2026', values: { marketCap: 1200, revenue: 440, revenueGrowth: 10, grossProfit: 180, grossMargin: 40.9, dilutedEPS: 2.8 }, sourceId: 'filing:FY2026' },
    ],
    quarter: [{ period: 'Q1 FY2026', values: { revenue: 110, revenueGrowth: 9 } }],
    ttm: [],
  },
  earnings: [{ id: 'e1', period: '2026 Q1', date: '2026-04-30', revenueActual: 110, revenueEstimate: 108, revenueSurprise: 1.85, epsActual: 1.1, epsEstimate: 1, epsSurprise: 10, summary: 'Reported source summary', sourceId: 'filing:earnings' }],
  holdings: [{ category: 'institutional', manager: 'Evidence Capital', filingDate: '2026-03-31', shares: 1000, value: 200000, change: 50, sourceId: 'filing:13f' }],
  estimates: {
    forecastMarkets: [{ id: 'm1', question: 'Will TEST launch a product?', yes: 61, no: 39, volume: 1200, summary: 'Explicit market summary', source: 'Evidence Market', asOf: '2026-05-01' }],
    consensus: { recommendation: 'Buy', bullish: 7, neutral: 2, bearish: 1, analystCount: 10 },
    targets: { low: 10, average: 15, current: 14, high: 20 },
    ratings: [{ id: 'r1', firm: 'Evidence Research', analyst: 'Analyst', rating: 'Buy', target: 20, previousTarget: 18, upside: 42.8, date: '2026-04-20' }],
    reports: [{ id: 'rep1', title: 'TEST public report', publisher: 'Publisher', date: '2026-04-01', outlook: 'Bullish', url: 'https://example.com/report' }],
  },
})

function financialsWith(values: Record<string, unknown>): GraphNode {
  return node('instrument:debt-test', {
    symbol: 'DEBT',
    currency: 'USD',
    units: { financials: 'millions' },
    financials: {
      unit: 'millions',
      annual: [{ period: 'FY2025', values }],
      quarter: [],
      ttm: [],
    },
  })
}

function debtRow(html: string): string {
  const row = html.match(/<th scope="row">Debt<\/th>.*?<\/tr>/u)?.[0]
  if (row === undefined) throw new Error('Debt row was not rendered')
  return row
}

describe('stock detail sections', () => {
  it('renders all seven financial categories and a complete missing-data table for non-demo nodes', () => {
    const html = renderToString(createElement(StockSections, { section: 'financials', symbol: 'NONE', nodes: [], locale: 'en' }))
    expect(html).toContain('id="rg-market-tab-financials-panel"')
    expect(html).toContain('role="tabpanel"')
    expect(html).toContain('aria-labelledby="rg-market-tab-financials"')
    for (const label of ['Key stats', 'Income statement', 'Balance sheet', 'Cash flow', 'Segments &amp; KPI', 'Adjusted', 'Ratios']) expect(html).toContain(label)
    expect(html).toContain('No matching financials metadata is connected')
    expect(html).toContain('—')
    expect(html).toContain('Download table')
    expect(html).toContain('Research this section')
    expect(html).not.toContain('<textarea')
    expect(html).not.toContain('Excel')
  })

  it('renders Chinese source guidance and the compact research label in zh-CN', () => {
    const html = renderToString(createElement(StockSections, { section: 'financials', symbol: 'NONE', nodes: [], locale: 'zh-CN' }))
    expect(html).toContain('尚未导入这类资料')
    expect(html).toContain('研究当前部分')
    expect(html).not.toContain('<textarea')
  })

  it('renders explicitly attached financial rows with annual, quarter, TTM, units and CSV controls', () => {
    const html = renderToString(createElement(StockSections, { section: 'financials', symbol: 'TEST', nodes: [financial], locale: 'en' }))
    expect(html).toContain('FY2025')
    expect(html).toContain('filing:FY2025')
    expect(html).toContain('Annual')
    expect(html).toContain('Quarter')
    expect(html).toContain('TTM')
    expect(html).toContain('aria-label="Units and range"')
    expect(html).toContain('Download table')
    expect(html).toContain('US$1,000')
    expect(html).not.toContain('Excel')
  })

  it('uses totalDebt for the key-stat debt row when the old debt field is absent', () => {
    const html = renderToString(createElement(StockSections, { section: 'financials', symbol: 'DEBT', nodes: [financialsWith({ totalDebt: 98657, dilutedEPS: 2.5 })], locale: 'en' }))
    expect(debtRow(html)).toContain('US$98,657')
    expect(html).toContain('US$2.5')
  })

  it('keeps old debt-only records compatible', () => {
    const html = renderToString(createElement(StockSections, { section: 'financials', symbol: 'DEBT', nodes: [financialsWith({ debt: 111088 })], locale: 'en' }))
    expect(debtRow(html)).toContain('US$111,088')
  })

  it('prefers the old debt field when both debt and totalDebt exist', () => {
    const html = renderToString(createElement(StockSections, { section: 'financials', symbol: 'DEBT', nodes: [financialsWith({ debt: 100, totalDebt: 200 })], locale: 'en' }))
    expect(debtRow(html)).toContain('US$100')
    expect(debtRow(html)).not.toContain('US$200')
  })

  it('leaves the debt row unavailable when neither debt nor totalDebt exists', () => {
    const html = renderToString(createElement(StockSections, { section: 'financials', symbol: 'DEBT', nodes: [financialsWith({ revenue: 400 })], locale: 'en' }))
    expect(debtRow(html)).toContain('<td>—</td>')
    expect(debtRow(html)).not.toContain('US$0')
  })

  it('keeps the Apple sample behind an explicit AAPL demo gate', () => {
    const apple = renderToString(createElement(StockSections, { section: 'financials', symbol: 'AAPL', nodes: [], locale: 'en', demo: true }))
    expect(apple).toContain('Demo data')
    expect(apple).toContain('Apple reference sample only')
    expect(apple).toContain('2025/9/27')

    const other = renderToString(createElement(StockSections, { section: 'financials', symbol: 'MSFT', nodes: [], locale: 'en', demo: true }))
    expect(other).toContain('available only for AAPL')
    expect(other).not.toContain('2025/9/27')
    expect(other).toContain('No matching financials metadata is connected')
  })

  it('renders explicit earnings, holder, forecast and analysis structures', () => {
    const earnings = renderToString(createElement(StockSections, { section: 'earnings', symbol: 'TEST', nodes: [financial], locale: 'en' }))
    expect(earnings).toContain('2026 Q1')
    expect(earnings).toContain('Reported source summary')
    expect(earnings).toContain('estimated')

    const holders = renderToString(createElement(StockSections, { section: 'holders', symbol: 'TEST', nodes: [financial], locale: 'en' }))
    expect(holders).toContain('Evidence Capital')
    expect(holders).toContain('filing:13f')
    expect(holders).toContain('Download loaded rows')

    const forecast = renderToString(createElement(StockSections, { section: 'forecast', symbol: 'TEST', nodes: [financial], locale: 'en' }))
    expect(forecast).toContain('Will TEST launch a product?')
    expect(forecast).toContain('61%')
    expect(forecast).toContain('Evidence Market')
    expect(forecast).not.toContain('52-week price targets')
    expect(forecast).not.toContain('Evidence Research')

    const analysis = renderToString(createElement(StockSections, { section: 'analysis', symbol: 'TEST', nodes: [financial], locale: 'en' }))
    expect(analysis).toContain('Evidence Research')
    expect(analysis).toContain('TEST public report')
    expect(analysis).toContain('https://example.com/report')
    expect(analysis).toContain('52-week price targets')
  })

  it('exports only the rows supplied to the loaded-table CSV helper', () => {
    expect(stockSectionCsv([['Metric', 'FY2025'], ['Revenue, net', 'US$400']])).toBe('Metric,FY2025\n"Revenue, net",US$400')
    expect(stockSectionCsv([['Metric'], ['—']])).toBe('Metric\n—')
  })
})
