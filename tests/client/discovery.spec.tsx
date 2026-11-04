import { createElement } from 'react'
import { renderToString } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import type { GraphNode } from '../../src/graph.ts'
import { DiscoveryPanel, discoveryRecords } from '../../client/ui/FinanceDiscovery.tsx'

const node: GraphNode = { id: 'instrument:real', kind: 'instrument', title: 'Real record', content: '', metadata: { symbol: 'REAL', watchlist: true }, createdAt: 1790812800000, updatedAt: 1790812800000 }
describe('Finance discovery data boundary', () => {
  it('does not substitute zero or demo prices into incomplete real records', () => {
    const rows = discoveryRecords([node], false)
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({ symbol: 'REAL', price: null, change: null, cap: null })
    const onWatch = vi.fn()
    const html = renderToString(createElement(DiscoveryPanel, { kind: 'watchlist', demo: false, nodes: [node], locale: 'en', onWatch, onOpenSymbol: vi.fn(), onOpenSection: vi.fn() }))
    expect(html).toContain('Real record')
    expect(html).toContain('—')
    expect(html).not.toContain('218.40')
    expect(html).not.toContain('Synthetic examples')
    expect(onWatch).not.toHaveBeenCalled()
  })
  it('labels synthetic views and keeps real graph records out of demo assets', () => {
    const html = renderToString(createElement(DiscoveryPanel, { kind: 'crypto', demo: true, nodes: [node], locale: 'en', onWatch: vi.fn(), onOpenSymbol: vi.fn(), onOpenSection: vi.fn() }))
    expect(html).not.toContain('Synthetic examples')
    expect(html).toContain('Bitcoin')
    expect(html).not.toContain('Real record')
  })
  it('puts saved-quote assets before quote-less instrument records in the market cards', () => {
    const at = '2026-11-01T20:00:00Z'
    const quoteEvidence = (symbol: string, price: number, change: number): GraphNode[] => [
      { id: `source:${symbol}`, kind: 'source', title: `${symbol} quote`, content: '', metadata: { provider: 'yahoo' }, createdAt: 1, updatedAt: 1 },
      { id: `raw:${symbol}`, kind: 'raw', title: `${symbol} quote body`, content: '', metadata: { provider: 'yahoo', sourceId: `source:${symbol}`, data: { symbol, regularMarketPrice: price, regularMarketChangePercent: change, regularMarketTime: at, currency: 'USD', exchangeTimezoneName: 'UTC' } }, createdAt: 1, updatedAt: 1 },
    ]
    const nodes = [
      { id: 'instrument:qa', kind: 'instrument', title: 'QA instrument', content: '', metadata: { symbol: 'QA' }, createdAt: 1, updatedAt: 1 },
      ...quoteEvidence('AAPL', 218.4, 1.32),
      { id: 'instrument:aapl', kind: 'instrument', title: 'Apple', content: '', metadata: { symbol: 'AAPL' }, createdAt: 1, updatedAt: 1 },
      ...quoteEvidence('GOOGL', 184.6, -.72),
      { id: 'instrument:googl', kind: 'instrument', title: 'Alphabet', content: '', metadata: { symbol: 'GOOGL' }, createdAt: 1, updatedAt: 1 },
    ] satisfies GraphNode[]
    const html = renderToString(createElement(DiscoveryPanel, { kind: 'market', demo: false, nodes, locale: 'en', onWatch: vi.fn(), onOpenSymbol: vi.fn(), onOpenSection: vi.fn() }))
    const start = html.indexOf('class="rg-discovery-tickers"')
    const end = html.indexOf('class="rg-discovery-summary"')
    expect(start).toBeGreaterThanOrEqual(0)
    expect(end).toBeGreaterThan(start)
    const cards = html.slice(start, end)
    expect(cards.indexOf('instrument:aapl')).toBeLessThan(cards.indexOf('instrument:qa'))
    expect(cards.indexOf('instrument:googl')).toBeLessThan(cards.indexOf('instrument:qa'))
    expect(cards.indexOf('instrument:aapl')).toBeLessThan(cards.indexOf('instrument:googl'))
  })
})
