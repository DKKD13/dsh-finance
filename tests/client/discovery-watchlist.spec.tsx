import { Children, createElement, isValidElement } from 'react'
import type { ReactElement, ReactNode } from 'react'
import { renderToString } from 'react-dom/server'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { GraphNode, JsonValue } from '../../src/graph.ts'
import { DiscoveryPanel, discoveryRecords } from '../../client/ui/FinanceDiscovery.tsx'

const discoveryHooks = vi.hoisted(() => ({ isolated: false }))
vi.mock('react', async importOriginal => {
  const actual = await importOriginal<typeof import('react')>()
  return {
    ...actual,
    useId: () => discoveryHooks.isolated ? 'discovery-test' : actual.useId(),
    useMemo: <T,>(factory: () => T, dependencies: readonly unknown[]) => discoveryHooks.isolated ? factory() : actual.useMemo(factory, dependencies),
    useRef: (initial: unknown) => discoveryHooks.isolated ? { current: initial } : actual.useRef(initial),
    useState: (initial: unknown) => discoveryHooks.isolated
      ? [typeof initial === 'function' ? initial() : initial, vi.fn()]
      : actual.useState(initial),
  }
})
afterEach(() => { discoveryHooks.isolated = false; vi.restoreAllMocks() })

function walk(tree: ReactNode): ReactElement<Record<string, unknown>>[] {
  return Children.toArray(tree).flatMap(child => isValidElement<Record<string, unknown>>(child) ? [child, ...walk(child.props.children as ReactNode)] : [])
}

function tree(props: Parameters<typeof DiscoveryPanel>[0]) {
  discoveryHooks.isolated = true
  try { return DiscoveryPanel(props) } finally { discoveryHooks.isolated = false }
}

function node(kind: GraphNode['kind'], id: string, title: string, metadata: Record<string, JsonValue> = {}, content = ''): GraphNode {
  return { id, kind, title, content, metadata, createdAt: 1, updatedAt: 1 }
}

const instruments = [
  node('instrument', 'instrument:aapl', 'Apple', {
    symbol: 'AAPL',
    sector: 'Technology',
    marketCapBillions: 3000,
    regularMarketPrice: 220,
    changePercent: 1.2,
    watchlist: true,
  }),
  node('instrument', 'instrument:btc', 'Bitcoin', {
    symbol: 'BTC-USD',
    assetClass: 'crypto',
    sector: 'Crypto',
    marketCapBillions: 1000,
    regularMarketPrice: 80000,
    changePercent: -0.8,
    watchlist: true,
  }),
  node('instrument', 'instrument:xom', 'Exxon Mobil', {
    symbol: 'XOM',
    sector: 'Energy',
    regularMarketPrice: 118,
    changePercent: 2.1,
    watchlist: false,
  }),
  node('instrument', 'instrument:msft', 'Microsoft', {
    symbol: 'MSFT',
    sector: 'Technology',
    marketCapBillions: 1000,
    regularMarketPrice: 420,
    changePercent: 0.4,
    watchlist: false,
  }),
  node('instrument', 'instrument:spy', 'SPDR S&P 500 ETF', {
    symbol: 'SPY',
    assetClass: 'etf',
    sector: 'Index funds',
    marketCapBillions: 600,
    regularMarketPrice: 650,
    changePercent: 0.6,
    watchlist: true,
  }),
  node('instrument', 'instrument:nosector', 'No sector record', {
    symbol: 'NOSECTOR',
    regularMarketPrice: 10,
    changePercent: null,
    watchlist: false,
  }),
]

function render(kind: 'market' | 'crypto' | 'watchlist', options: { readonly demo?: boolean; readonly nodes?: readonly GraphNode[]; readonly locale?: string } = {}): string {
  return renderToString(createElement(DiscoveryPanel, {
    kind,
    demo: options.demo ?? false,
    nodes: options.nodes ?? instruments,
    locale: options.locale ?? 'en',
    onOpenSymbol: vi.fn(),
    onOpenSection: vi.fn(),
    onWatch: vi.fn(),
  }))
}

function yahooQuote(symbol: string, sourceId: string, price: number | null, extras: Record<string, JsonValue> = {}): GraphNode[] {
  return [
    node('source', sourceId, `${symbol} quote`, { provider: 'yahoo' }),
    node('raw', sourceId.replace('source:', 'raw:'), `${symbol} quote raw`, {
      provider: 'yahoo',
      sourceId,
      availableAt: String(extras.availableAt ?? ''),
      data: { symbol, regularMarketPrice: price, ...extras },
    }),
  ]
}

describe('discovery watchlist and sector heatmap', () => {
  it('includes every explicitly watched instrument type in the real watchlist', () => {
    const html = render('watchlist')

    expect(html).toContain('AAPL')
    expect(html).toContain('BTC-USD')
    expect(html).toContain('SPY')
    expect(html).not.toContain('Exxon Mobil')
    expect(html).toContain('Unfollow AAPL')
    expect(html).toContain('Unfollow BTC-USD')
    expect(html).toContain('Unfollow SPY')
  })

  it('keeps demo watchlist data distinct while combining stocks and crypto', () => {
    const html = render('watchlist', { demo: true })

    expect(html).not.toContain('Synthetic examples')
    expect(html).toContain('AAPL')
    expect(html).toContain('BTC-USD')
    expect(html).toContain('All assets')
    expect(html).not.toContain('Exxon Mobil')
  })

  it('groups sectors, weights only explicit market caps, and exposes keyboard disclosure semantics', () => {
    const html = render('market')

    expect(html).toContain('data-sector="Technology"')
    expect(html).toContain('data-sector="Energy"')
    expect(html).toContain('data-market-cap="3000"')
    expect(html).toContain('data-cap-weight="4"')
    expect(html).toContain('data-cap-weight="2"')
    expect((html.match(/data-cap-weight=/g) ?? [])).toHaveLength(3)
    expect(html).toContain('NOSECTOR')
    expect(html).not.toContain('data-sector="Unclassified"')
    expect(html).toContain('aria-expanded="false"')
    expect(html).toContain('aria-controls=')
    expect(html).toContain('hidden=""')
    expect(html).toContain('Missing caps do not affect cell weight')
  })

  it('shows source count only when source records are explicitly available and never on synthetic summaries', () => {
    const sourcesWithoutSummary = [
      ...instruments,
      node('source', 'source:one', 'Filing one'),
      node('source', 'source:two', 'Filing two'),
    ]
    const sourcesWithSummary = [
      ...sourcesWithoutSummary,
      node('deliverable', 'deliverable:market-summary', 'Market summary', {
        marketSummary: true,
        sourceCount: 999,
        references: ['source:one', 'source:two', 'source:missing'],
      }, 'A saved market note with explicit source references.'),
    ]
    const sourceOnly = render('market', { nodes: sourcesWithoutSummary })
    const real = render('market', { nodes: sourcesWithSummary })
    const withoutSources = render('market')
    const demo = render('market', { demo: true, nodes: sourcesWithSummary })

    expect(real).toContain('data-explicit-source-count="2"')
    expect(real).toContain('2 source records')
    expect(real).not.toContain('999 source records')
    expect(sourceOnly).not.toContain('data-explicit-source-count')
    expect(withoutSources).not.toContain('data-explicit-source-count')
    expect(demo).toContain('data-demo="true"')
    expect(demo).toContain('Example research question: which holdings are most sensitive to a change in discount rates?')
    expect(demo).not.toContain('Demo · synthetic scenarios')
    expect(demo).not.toContain('data-explicit-source-count')
  })

  it('projects the latest complete stored Yahoo quote with source, currency and price time', () => {
    const aapl = node('instrument', 'instrument:aapl', 'Apple', { symbol: 'AAPL', sector: 'Technology', watchlist: true })
    const simple = yahooQuote('AAPL', 'source:simple', 350, {
      availableAt: '2026-10-30T20:00:01.000Z',
      regularMarketTime: '2026-10-30T20:00:01.000Z',
      currency: 'USD',
    })
    const complete = yahooQuote('AAPL', 'source:complete', 344.63, {
      availableAt: '2026-10-30T20:00:01.000Z',
      regularMarketTime: '2026-10-30T20:00:01.000Z',
      chartPreviousClose: 348.91,
      currency: 'USD',
      exchangeTimezoneName: 'America/New_York',
    })
    const html = render('watchlist', { nodes: [aapl, ...simple, ...complete] })
    expect(html).toContain('344.63')
    expect(html).toContain('-1.23%')
    expect(html).not.toContain('US$350.00')
    expect(html).toContain('USD · Yahoo · Oct 30, 2026')
    expect(html).toContain('data-quote-source-id="source:complete"')
    expect(html).toContain('data-quote-time="2026-10-30T20:00:01.000Z"')
  })

  it('uses the newest whole quote and never fills its missing change from an older record', () => {
    const aapl = node('instrument', 'instrument:aapl', 'Apple', { symbol: 'AAPL', watchlist: true })
    const older = yahooQuote('AAPL', 'source:older', 344.63, {
      regularMarketTime: '2026-10-30T20:00:01.000Z',
      chartPreviousClose: 348.91,
      currency: 'USD',
    })
    const newer = yahooQuote('AAPL', 'source:newer', 350, {
      regularMarketTime: '2026-10-31T20:00:01.000Z',
      currency: 'USD',
    })
    const html = render('watchlist', { nodes: [aapl, ...older, ...newer] })
    expect(html).toContain('350.00')
    expect(html).not.toContain('-1.23%')
    expect(html).toContain('data-quote-source-id="source:newer"')
  })

  it('keeps direct instrument values authoritative and accepts non-USD stored quotes', () => {
    const direct = node('instrument', 'instrument:direct', 'Direct Quote', { symbol: 'DIRECT', watchlist: true, regularMarketPrice: 12, changePercent: 1.5 })
    const directQuote = yahooQuote('DIRECT', 'source:ignored', 99, { regularMarketTime: '2026-10-30T20:00:01.000Z', currency: 'USD' })
    const eur = node('instrument', 'instrument:eur', 'Euro Quote', { symbol: 'EURQ', watchlist: true })
    const eurQuote = yahooQuote('EURQ', 'source:eur', 1.25, { regularMarketTime: '2026-10-30T20:00:01.000Z', currency: 'EUR', exchangeTimezoneName: 'Europe/Paris' })
    const html = render('watchlist', { nodes: [direct, ...directQuote, eur, ...eurQuote] })
    expect(html).toContain('12.00')
    expect(html).not.toContain('99.00')
    expect(html).toContain('1.25')
    expect(html).toContain('EUR · Yahoo')
  })

  it('rejects untimed, invalid-priced, wrong-symbol and source-less Yahoo raw records', () => {
    const aapl = node('instrument', 'instrument:aapl', 'Apple', { symbol: 'AAPL', watchlist: true })
    const untimed = yahooQuote('AAPL', 'source:untimed', 300, { currency: 'USD' })
    const invalid = yahooQuote('AAPL', 'source:invalid', 0, { regularMarketTime: '2026-10-30T20:00:01.000Z', currency: 'USD' })
    const wrong = yahooQuote('MSFT', 'source:wrong', 400, { regularMarketTime: '2026-10-30T20:00:01.000Z', currency: 'USD' })
    const sourceLess = node('raw', 'raw:source-less', 'AAPL source-less raw', {
      provider: 'yahoo',
      sourceId: 'source:missing',
      availableAt: '2026-10-30T20:00:01.000Z',
      data: { symbol: 'AAPL', regularMarketPrice: 275, currency: 'USD' },
    })
    const html = render('watchlist', { nodes: [aapl, ...untimed, ...invalid, ...wrong, sourceLess] })
    expect(html).toContain('Apple')
    expect(html).not.toContain('300.00')
    expect(html).not.toContain('275.00')
    expect(html).not.toContain('400.00')
    expect(html).not.toContain('data-quote-source-id="source:untimed"')
  })

  it.each([['MSFT', 'Microsoft Corporation'], ['MSFT', 'Microsoft'], ['AAPL', 'Apple Inc.']])('deduplicates exact symbol/class, preferring the source-backed %s title %s without changing nodes', (symbol, title) => {
    const manual = node('instrument', 'instrument:manual', `${symbol} hand check`, { symbol, assetClass: 'equity', watchlist: true })
    const canonical = node('instrument', 'instrument:canonical', title, { symbol, assetClass: 'equity' })
    const etf = node('instrument', 'instrument:etf', 'Different class', { symbol, assetClass: 'etf' })
    const unknown = node('instrument', 'instrument:unknown', 'Unspecified class', { symbol })
    const other = node('instrument', 'instrument:other', 'Same title', { symbol: `${symbol}.B`, assetClass: 'equity' })
    const records = [manual, canonical, etf, unknown, other, ...yahooQuote(symbol, 'source:quote', 521.91, { regularMarketTime: '2026-10-30T20:00:01Z', longName: symbol === 'AAPL' ? 'Apple Inc.' : 'Microsoft Corporation', shortName: symbol === 'AAPL' ? 'Apple' : 'Microsoft', currency: 'USD' })]
    const before = JSON.stringify(records)
    const assets = discoveryRecords(records, false)
    expect(assets).toHaveLength(4)
    expect(assets[0]?.node).toBe(canonical)
    expect(assets[0]?.records).toEqual([manual, canonical])
    expect(assets.slice(1).map(asset => asset.node?.id)).toEqual([etf.id, unknown.id, other.id])
    expect(JSON.stringify(records)).toBe(before)

    const onWatch = vi.fn()
    const panel = tree({ kind: 'watchlist', nodes: records, demo: false, locale: 'en', onWatch, onOpenSymbol: vi.fn(), onOpenSection: vi.fn() })
    const button = walk(panel).find(element => element.props['aria-label'] === `Unfollow ${symbol}`)
    expect(button?.props['data-node-id']).toBe(manual.id)
    ;(button!.props.onClick as () => void)()
    expect(onWatch).toHaveBeenCalledTimes(1)
    expect(onWatch).toHaveBeenCalledWith(manual, false)
  })

  it.each(['AAPL', 'MSFT'])('keeps all %s watched node controls addressable and removes them sequentially', symbol => {
    const first = node('instrument', 'instrument:first', symbol === 'AAPL' ? 'Apple Inc.' : 'Microsoft', { symbol, watchlist: true })
    const second = node('instrument', 'instrument:second', symbol, { symbol, watchlist: true })
    const onWatch = vi.fn()
    const panel = tree({ kind: 'watchlist', nodes: [first, second], demo: false, locale: 'en', onWatch, onOpenSymbol: vi.fn(), onOpenSection: vi.fn() })
    const group = walk(panel).find(element => element.props.className === 'rg-discovery-watch-records')
    const buttons = walk(group).filter(element => element.type === 'button')
    expect(buttons.map(button => button.props['data-node-id'])).toEqual([first.id, second.id])
    ;(buttons[1]!.props.onClick as () => void)()
    expect(onWatch).toHaveBeenCalledTimes(1)
    expect(onWatch).toHaveBeenCalledWith(second, false)
    const secondRemoved = { ...second, metadata: { ...second.metadata, watchlist: false } }
    const next = tree({ kind: 'watchlist', nodes: [first, secondRemoved], demo: false, locale: 'en', onWatch, onOpenSymbol: vi.fn(), onOpenSection: vi.fn() })
    const remaining = walk(next).find(element => element.props['aria-label'] === `Unfollow ${symbol}`)
    expect(remaining?.props['data-node-id']).toBe(first.id)
    ;(remaining!.props.onClick as () => void)()
    expect(onWatch).toHaveBeenCalledTimes(2)
    expect(onWatch).toHaveBeenLastCalledWith(first, false)
    const final = render('watchlist', { nodes: [{ ...first, metadata: { ...first.metadata, watchlist: false } }, secondRemoved] })
    expect(final).not.toContain(`aria-label="Unfollow ${symbol}"`)
    expect(final).not.toContain('<tr data-node-id=')
  })

  it('shows real quote-only assets and equal-area moves when sectors/caps are absent, with correct navigation', () => {
    const msft = node('instrument', 'instrument:msft', 'Microsoft Corporation', { symbol: 'MSFT' })
    const duplicate = node('instrument', 'instrument:duplicate', 'MSFT', { symbol: 'MSFT' })
    const records = [msft, duplicate, ...yahooQuote('MSFT', 'source:msft', 521.91, { regularMarketTime: '2026-10-30T20:00:01Z', chartPreviousClose: 519, currency: 'USD' }), ...yahooQuote('AAPL', 'source:aapl', 344.63, { regularMarketTime: '2026-10-30T20:00:01Z', longName: 'Apple Inc.', chartPreviousClose: 348.91, currency: 'USD' })]
    const html = render('market', { nodes: records })
    expect(html).toContain('Market overview')
    expect(html).not.toContain('Top assets')
    expect(html).toContain('Apple Inc.')
    expect(html).toContain('Tracked moves')
    expect(html).toContain('Equal area · Not cap-weighted')
    expect(html).toContain('344.63')
    expect(html).not.toContain('data-cap-weight')
    expect(html).not.toContain('data-sector=')
    expect(html).not.toContain('aria-label="Sector"')
    expect((html.match(/<tr data-node-id="instrument:msft"/g) ?? [])).toHaveLength(1)
    expect(html).not.toContain('data-node-id="instrument:duplicate"')
    expect(html).not.toContain('<polyline')
    const onOpenSymbol = vi.fn()
    const onOpenSection = vi.fn()
    const panel = tree({ kind: 'market', nodes: records, demo: false, locale: 'en', onWatch: vi.fn(), onOpenSymbol, onOpenSection })
    const moves = walk(panel).find(element => element.props.className === 'rg-discovery-moves')
    const tile = walk(moves).find(element => element.type === 'button' && element.props['data-node-id'] === msft.id)
    ;(tile!.props.onClick as () => void)()
    expect(onOpenSymbol).toHaveBeenCalledTimes(1)
    expect(onOpenSymbol).toHaveBeenCalledWith('MSFT')
    const start = walk(panel).find(element => element.type === 'button' && element.props.children === 'Research with saved materials')
    ;(start!.props.onClick as () => void)()
    expect(onOpenSection).toHaveBeenCalledTimes(1)
    expect(onOpenSection).toHaveBeenCalledWith('overview')
  })

  it('renders cited explicitly marked market-summary excerpts, not unrelated or missing-source research', () => {
    const source = node('source', 'source:filing', 'Actual filing', { canonicalUrl: 'https://example.com/filing', availableAt: '2026-10-30T12:00:00Z' })
    const records = [source,
      node('deliverable', 'deliverable:unrelated', 'Unrelated saved report', { sourceIds: [source.id] }, 'Do not turn this report into market news.'),
      node('deliverable', 'deliverable:missing', 'Missing source report', { marketSummary: true, references: ['source:absent'], sourceCount: 88 }, 'Unverifiable summary.'),
      node('deliverable', 'deliverable:marked', 'Saved bounded market note', { marketSummary: true, references: [source.id], asOf: '2026-10-30T20:00:00Z' }, '# Heading\n\nExact saved excerpt: 3.5%, not a new generated claim.'),
    ]
    const html = render('market', { nodes: records })
    expect(html).toContain('Saved bounded market note')
    expect(html).toContain('Exact saved excerpt: 3.5%')
    expect(html).toContain('https://example.com/filing')
    expect(html).toContain('2026-10-30T12:00:00Z')
    expect(html).toContain('data-explicit-source-count="1"')
    for (const text of ['Unrelated saved report', 'Do not turn this report', 'Missing source report', '88 source records']) expect(html).not.toContain(text)
    expect(records[3]?.content).toBe('# Heading\n\nExact saved excerpt: 3.5%, not a new generated claim.')
  })

  it('does not promote a claim, managed Skill raw, or a truthy non-boolean summary marker into market evidence', () => {
    const records = [
      node('claim', 'claim:one', 'A claim is not a source'),
      node('raw', 'raw:skill', 'Managed Skill text', { managedBy: 'dsh-research-graph/import' }),
      node('source', 'source:one', 'Stored source'),
      node('deliverable', 'deliverable:wrong-kind', 'Not a cited market summary', { marketSummary: true, references: ['claim:one', 'raw:skill'] }, 'Do not surface this content.'),
      node('deliverable', 'deliverable:string-marker', 'Not explicitly marked', { marketSummary: 'true', sourceIds: ['source:one'] }, 'Do not surface this either.'),
    ]
    const html = render('market', { nodes: records })
    expect(html).not.toContain('Do not surface')
    expect(html).not.toContain('data-explicit-source-count')
    expect(html).toContain('Look up a quote')
  })

  it.each(['zh-CN', 'en'])('keeps empty data honest and exposes the existing quote and research routes (%s)', locale => {
    const onWatch = vi.fn()
    const onOpenSymbol = vi.fn()
    const onOpenSection = vi.fn()
    const props = { kind: 'market' as const, nodes: [], demo: false, locale, onWatch, onOpenSymbol, onOpenSection }
    const html = renderToString(createElement(DiscoveryPanel, props))
    expect(html).toContain(locale === 'en' ? 'Market overview' : '市场概览')
    expect(html).not.toContain('data-sector=')
    expect(html).not.toContain('<polyline')
    const panel = tree(props)
    expect(onWatch).not.toHaveBeenCalled()
    expect(onOpenSymbol).not.toHaveBeenCalled()
    expect(onOpenSection).not.toHaveBeenCalled()
    const button = walk(panel).find(element => element.type === 'button' && element.props.children === (locale === 'en' ? 'Look up a quote' : '查询真实行情'))
    expect(button).toBeDefined()
    ;(button!.props.onClick as () => void)()
    expect(onOpenSection).toHaveBeenCalledTimes(1)
    expect(onOpenSection).toHaveBeenCalledWith('market')
  })

  it('draws real history with elapsed-time spacing, not a synthetic curve or equally spaced samples', () => {
    const records = yahooQuote('AAPL', 'source:quote', 30, { regularMarketTime: '2026-10-04T00:00:00Z', currency: 'USD' })
    records.push(node('source', 'source:history', 'Stored historical prices', { provider: 'yahoo' }), node('raw', 'raw:history', 'Stored history raw', { provider: 'yahoo', sourceId: 'source:history', data: { symbol: 'AAPL', currency: 'USD', bars: [
      { timestamp: '2026-10-01T00:00:00Z', close: 10 },
      { timestamp: '2026-10-02T00:00:00Z', close: 20 },
      { timestamp: '2026-10-04T00:00:00Z', close: 30 },
    ] } }))
    const html = render('market', { nodes: records })
    expect(html).toContain('points="0.00,46.00 79.00,26.00 237.00,6.00"')
    expect(html).toContain('data-series-source-id="source:history"')
    expect(html).not.toContain('linearGradient')
    expect(html).not.toContain('<polygon')
  })

  it.each(['missing-source', 'null-close', 'duplicate-time', 'future-bar', 'wrong-currency'])('does not draw misleading live history: %s', invalid => {
    const records = yahooQuote('AAPL', 'source:quote', 30, { regularMarketTime: '2026-10-02T00:00:00Z', currency: 'USD' })
    if (invalid !== 'missing-source') records.push(node('source', 'source:history', 'Stored historical prices', { provider: 'yahoo' }))
    records.push(node('raw', 'raw:history', 'Stored history raw', { provider: 'yahoo', sourceId: 'source:history', data: { symbol: 'AAPL', currency: invalid === 'wrong-currency' ? 'EUR' : 'USD', bars: [
      { timestamp: '2026-10-01T00:00:00Z', close: 10 },
      { timestamp: invalid === 'duplicate-time' ? '2026-10-01T00:00:00Z' : invalid === 'future-bar' ? '2026-10-03T00:00:00Z' : '2026-10-02T00:00:00Z', close: invalid === 'null-close' ? null : 30 },
    ] } }))
    const html = render('market', { nodes: records })
    expect(html).not.toContain('<polyline')
    expect(html).toContain('No saved price history')
  })
})
