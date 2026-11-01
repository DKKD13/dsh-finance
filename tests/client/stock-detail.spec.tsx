import { createElement } from 'react'
import { renderToString } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { FinanceStore } from '../../client/finance-store.ts'
import type { FinanceGateway } from '../../client/finance-store.ts'
import { en } from '../../client/locales.ts'
import type { Translate } from '../../client/store.ts'
import { MarketPanel } from '../../client/ui/FinancePanels.tsx'
import type { GraphNode } from '../../src/graph.ts'

const t: Translate = (key, params) => {
  const template: string = en[key as keyof typeof en] ?? key
  if (params === undefined) return template
  return Object.entries(params).reduce((text, [name, value]) => text.replaceAll(`{${name}}`, String(value)), template)
}

const nodes: GraphNode[] = [
  {
    id: 'instrument:aapl',
    kind: 'instrument',
    title: 'Stored Apple title',
    content: 'AAPL',
    metadata: { symbol: 'AAPL', provider: 'preview.fixture' },
    createdAt: 1,
    updatedAt: 1,
  },
]

const gateway: FinanceGateway = {
  request: async request => {
    if (request.op !== 'market.fetch') return { ok: true, revision: 0, result: {} }
    const input = request.input as { kind: string; symbol: string }
    if (input.kind === 'quote') {
      return {
        ok: true,
        revision: 0,
        result: {
          items: [{
            data: {
              symbol: input.symbol,
              longName: 'Apple Inc.',
              shortName: 'Apple',
              currency: 'USD',
              exchangeName: 'NasdaqGS',
              fullExchangeName: 'Nasdaq Global Select',
              exchangeTimezoneName: 'America/New_York',
              regularMarketPrice: 344.63,
              previousClose: 348.91,
              preMarketPrice: 999,
              regularMarketDayLow: 342.35,
              regularMarketDayHigh: 349.19,
              regularMarketVolume: 123456,
              regularMarketTime: '2026-10-30T20:00:01Z',
              firstTradeDate: 322156800,
              fiftyTwoWeekLow: 243.42,
              fiftyTwoWeekHigh: 351.73,
            },
          }],
        },
      }
    }
    return {
      ok: true,
      revision: 0,
      result: {
        items: [{
          data: {
            symbol: input.symbol,
            currency: 'USD',
            bars: [{
              timestamp: '2026-10-30T20:00:00Z',
              open: 346,
              high: 349.19,
              low: 342.35,
              close: 344.63,
              adjustedClose: 344.63,
              volume: 123456,
            }],
          },
        }],
      },
    }
  },
}

describe('stock detail parent layout', () => {
  it('renders the seven-tab shell, real company identity, advanced forms and integration slots', async () => {
    const store = new FinanceStore(gateway, t)
    expect(await store.fetchQuote('AAPL', '2026-10-30T00:00:00Z')).toBe(true)
    expect(await store.fetchHistory({ symbol: 'AAPL', range: '1mo', interval: '1d' })).toBe(true)

    const html = renderToString(createElement(MarketPanel, { store, t, nodes, locale: 'zh' }))

    expect(html).toContain('<h1 id="rg-finance-market-title">Apple Inc.</h1>')
    expect(html).not.toContain('<h1 id="rg-finance-market-title">Stored Apple title</h1>')
    expect(html).toContain('rg-stock-detail-preview-badge')
    expect(html).not.toContain('>999<')
    expect(html.indexOf('概述')).toBeLessThan(html.indexOf('财务数据'))
    expect(html.indexOf('财务数据')).toBeLessThan(html.indexOf('收益'))
    expect(html.indexOf('收益')).toBeLessThan(html.indexOf('持有者'))
    expect(html.indexOf('持有者')).toBeLessThan(html.indexOf('预测'))
    expect(html.indexOf('预测')).toBeLessThan(html.indexOf('历史数据'))
    expect(html.indexOf('历史数据')).toBeLessThan(html.indexOf('分析'))
    expect(html).toContain('data-stock-chart-slot')
    expect((html.match(/data-stock-tab-slot=/g) ?? [])).toHaveLength(6)
    expect(html).toContain('id="rg-market-tab-financials-panel"')
    expect(html).toContain('高级数据与查询')
    expect(html).toContain('value="AAPL"')
    expect(html).toContain('value="2026-10-30T00:00:00Z"')
    expect(html).toContain('<option value="1mo" selected="">')
    expect(html).toContain('<option value="1d" selected="">')
    expect(html).toContain('rg-market-accordion')
  })
})
