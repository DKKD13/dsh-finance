import { createElement } from 'react'
import { renderToString } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import type { MarketBar } from '../../client/chart-data.ts'
import { en } from '../../client/locales.ts'
import type { Translate } from '../../client/store.ts'
import { MarketChart } from '../../client/ui/FinanceCharts.tsx'

const t: Translate = (key, params) => {
  const template: string = en[key as keyof typeof en] ?? key
  if (params === undefined) return template
  return Object.entries(params).reduce((text, [name, value]) => text.replaceAll(`{${name}}`, String(value)), template)
}

const bars: MarketBar[] = [
  { timestamp: '2026-01-01T00:00:00Z', open: 10, high: 12, low: 9, close: 11, adjustedClose: 10.7, volume: 100 },
  { timestamp: '2026-01-02T00:00:00Z', open: null, high: null, low: null, close: null, adjustedClose: null, volume: null },
  { timestamp: '2026-01-03T00:00:00Z', open: 11, high: 14, low: 10, close: 13, adjustedClose: 12.6, volume: 180 },
]

const history = {
  items: [{
    provider: 'fixture.stock',
    canonicalUrl: 'https://example.com/stock',
    asOf: '2026-01-03T00:00:00Z',
    provenance: { endpoint: 'history' },
    data: { symbol: 'AAA', currency: 'USD', bars },
  }],
}

describe('stock asset chart appearance', () => {
  it('renders the scoped asset line, gradient, volume, previous close, and compact controls', () => {
    const html = renderToString(createElement(MarketChart, {
      value: history,
      appearance: 'asset',
      initialMode: 'close',
      previousClose: 10.5,
      t,
    }))

    expect(html).toContain('class="rg-chart-frame rg-stock-chart"')
    expect(html).toContain('rg-stock-price-line')
    expect(html).toContain('linearGradient')
    expect(html).toContain('rg-stock-volume')
    expect(html).toContain('rg-stock-previous-close')
    expect(html).toContain('Previous close 10.5')
    expect(html).toContain('aria-label="Close"')
    expect(html).toContain('aria-label="Adjusted close"')
    expect(html).toContain('>Adj</button>')
    expect(html).toContain('fixture.stock')
  })

  it('keeps standard mode on candles and does not add asset-only markup', () => {
    const html = renderToString(createElement(MarketChart, { value: history, previousClose: 10.5, t }))

    expect(html).toContain('rg-chart-candle')
    expect(html).not.toContain('rg-stock-chart')
    expect(html).not.toContain('rg-stock-previous-close')
  })

  it('keeps all 600 exact rows lazy in asset mode', () => {
    const generated: MarketBar[] = Array.from({ length: 600 }, (_, index) => ({
      timestamp: new Date(Date.UTC(2026, 0, 1 + index)).toISOString(),
      open: index,
      high: index + 2,
      low: index - 2,
      close: index + 1,
      adjustedClose: index + 0.5,
      volume: index * 100,
    }))
    const html = renderToString(createElement(MarketChart, {
      value: { items: [{ data: { symbol: 'AAA', bars: generated } }] },
      appearance: 'asset',
      initialMode: 'close',
      t,
    }))

    expect(html).toContain('Exact data (600 rows)')
    expect(html).not.toContain('<tbody')
  })
})
