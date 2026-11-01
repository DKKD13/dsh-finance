import { createElement } from 'react'
import { renderToString } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import type { GraphNode } from '../../src/graph.ts'
import { FinanceAside } from '../../client/ui/FinanceAside.tsx'

function node(id: string, kind: GraphNode['kind'], title: string, metadata: Record<string, unknown> = {}): GraphNode {
  return { id, kind, title, content: '', metadata: metadata as GraphNode['metadata'], createdAt: 1, updatedAt: 1 }
}

function relatedContext(html: string): string {
  const match = html.match(/<section class="rg-aside-context"[\s\S]*?<\/section>/u)
  expect(match).not.toBeNull()
  return match![0]
}

const callbacks = {
  onOpenSymbol: vi.fn(),
  onOpenSection: vi.fn(),
  onResearch: vi.fn(),
}

describe('FinanceAside context module', () => {
  it.each([['AAPL', 'Apple Inc.'], ['MSFT', 'Microsoft Corporation']])('deduplicates %s in related and watched previews while retaining a watched noncanonical member', (symbol, title) => {
    const records = [
      node('instrument:manual', 'instrument', symbol, { symbol, watchlist: true }),
      node('instrument:canonical', 'instrument', title, { symbol, watchlist: false }),
      node('instrument:other', 'instrument', 'NVIDIA', { symbol: 'NVDA' }),
    ]
    const before = JSON.stringify(records)
    const html = renderToString(createElement(FinanceAside, { nodes: records, demo: false, locale: 'en', section: 'markets', ...callbacks }))
    const context = relatedContext(html)
    const preview = html.match(/<div class="rg-pf-watch-preview">[\s\S]*?<\/section>/u)?.[0] ?? ''
    expect((context.match(/class="rg-aside-context-row"/g) ?? [])).toHaveLength(2)
    expect((context.match(new RegExp(`<strong>${title}</strong>`, 'g')) ?? [])).toHaveLength(1)
    expect(context).not.toContain(`<strong>${symbol}</strong>`)
    expect((preview.match(/class="rg-pf-aside-asset"/g) ?? [])).toHaveLength(1)
    expect(preview).toContain(title)
    expect(html).not.toContain('No watched instruments yet')
    expect(JSON.stringify(records)).toBe(before)
  })

  it('keeps distinct explicit asset classes and symbol-less watched records in the rail', () => {
    const records = [
      node('instrument:stock', 'instrument', 'Stock record', { symbol: 'SAME', assetClass: 'equity', watchlist: true }),
      node('instrument:fund', 'instrument', 'ETF record', { symbol: 'SAME', assetClass: 'etf', watchlist: true }),
      node('instrument:legacy', 'instrument', 'Legacy watch without a code', { watchlist: true }),
    ]
    const html = renderToString(createElement(FinanceAside, { nodes: records, demo: false, locale: 'en', section: 'markets', ...callbacks }))
    const context = relatedContext(html)
    expect((context.match(/class="rg-aside-context-row"/g) ?? [])).toHaveLength(2)
    expect(html).toContain('Stock record')
    expect(html).toContain('ETF record')
    expect(html).toContain('Legacy watch without a code')
    expect(html).toContain('No symbol recorded')
  })

  it('places demo movers between watchlist and existing research modules', () => {
    const html = renderToString(createElement(FinanceAside, { nodes: [], demo: true, locale: 'en', section: 'screener', ...callbacks }))
    const watchlist = html.indexOf('Build a watchlist')
    const context = html.indexOf('Relevant instruments')
    const hypotheses = html.indexOf('Investment theses')
    expect(watchlist).toBeGreaterThan(-1)
    expect(context).toBeGreaterThan(watchlist)
    expect(hypotheses).toBeGreaterThan(context)
    expect(html).not.toContain('Small demo')
    expect(html).toContain('NVIDIA')
    expect(html).toContain('Exxon Mobil')
    expect(html).toContain('Apple')
    expect(html).toContain('Research sources')
  })

  it('links the prediction context to the existing prediction markets section', () => {
    const html = renderToString(createElement(FinanceAside, { nodes: [], demo: true, locale: 'en', section: 'prediction-markets', ...callbacks }))
    expect(html).toContain('Related prediction markets')
    expect(html).toContain('Explore prediction market events')
    expect(html).toContain('Open the existing prediction markets page')
    expect(html).not.toContain('Small demo')
    expect(html).not.toContain('source records</small>')
    const context = relatedContext(html)
    expect(context).toContain('Will the next policy decision lower interest rates?')
    expect(context).toContain('Demo contract')
    expect(context).not.toContain('NVIDIA')
    expect(context).not.toContain('Exxon Mobil')
  })

  it('uses only explicit imported nodes outside demo mode', () => {
    const nodes = [
      node('instrument:test', 'instrument', 'TEST Holdings', { symbol: 'TEST' }),
      node('prediction:test', 'prediction', 'Will TEST pass?', { yesProbability: 55 }),
    ]
    const instruments = renderToString(createElement(FinanceAside, { nodes, demo: false, locale: 'zh-CN', section: 'earnings', ...callbacks }))
    expect(instruments).toContain('TEST Holdings')
    expect(instruments).toContain('TEST')
    expect(instruments).not.toContain('Apple')
    expect(instruments).not.toContain('NVIDIA')

    const predictions = renderToString(createElement(FinanceAside, { nodes, demo: false, locale: 'zh-CN', section: 'prediction-markets', ...callbacks }))
    expect(predictions).toContain('Will TEST pass?')
    expect(relatedContext(predictions)).not.toContain('Will TEST pass?')
    expect(relatedContext(predictions)).not.toContain('已导入外部合约')
    expect(relatedContext(predictions)).toContain('当前没有显式导入的相关记录。')
    expect(predictions).not.toContain('Apple')
  })

  it.each(['zh-CN', 'en'])('limits prediction market context to explicit external contracts (%s)', locale => {
    const nodes = [
      node('prediction:personal', 'prediction', 'My personal forecast', { probability: .7 }),
      node('source:contract', 'source', 'Imported policy contract', { predictionMarket: { probability: .6, provider: 'fixture' } }),
      node('prediction:empty-market', 'prediction', 'Empty market marker', { predictionMarket: {} }),
      node('source:invalid-market', 'source', 'Invalid market marker', { predictionMarket: [] }),
      node('instrument:unrelated', 'instrument', 'Unrelated Bitcoin', { symbol: 'BTC' }),
    ]
    const html = renderToString(createElement(FinanceAside, { nodes, demo: false, locale, section: 'prediction-markets', ...callbacks }))
    const context = relatedContext(html)
    expect(context).toContain('Imported policy contract')
    expect(context).toContain(locale === 'en' ? 'Imported external contract' : '已导入外部合约')
    for (const title of ['My personal forecast', 'Empty market marker', 'Invalid market marker', 'Unrelated Bitcoin']) expect(context).not.toContain(title)
    // The user's prediction remains in its own unchanged personal module.
    expect(html).toContain('My personal forecast')
    expect(context).toContain(locale === 'en' ? 'Explore prediction market events' : '查看预测市场事件')
  })

  it.each(['zh-CN', 'en'])('uses only actual political disclosure symbols, including symbols without instruments (%s)', locale => {
    const nodes = [
      node('instrument:btc', 'instrument', 'Unrelated Bitcoin', { symbol: 'BTC' }),
      node('instrument:eth', 'instrument', 'Unrelated Ether', { symbol: 'ETH' }),
      node('instrument:msft', 'instrument', 'Unrelated Microsoft', { symbol: 'MSFT' }),
      node('instrument:aapl', 'instrument', 'Disclosed Apple', { symbol: 'AAPL' }),
      node('source:trade-aapl', 'source', 'Disclosure A', { politicalDisclosure: { person: 'Fixture person', symbol: ' aapl ' } }),
      node('source:trade-duplicate', 'source', 'Disclosure B', { politicalDisclosure: { person: 'Fixture person', symbol: 'AAPL' } }),
      node('source:trade-nvda', 'source', 'Disclosure C', { politicalDisclosure: { person: 'Fixture person', symbol: 'NVDA' } }),
      node('source:unrelated-symbol', 'source', 'Unrelated Tesla', { symbol: 'TSLA' }),
      node('source:no-symbol', 'source', 'Disclosure without a symbol', { politicalDisclosure: { person: 'Fixture person' } }),
    ]
    const html = renderToString(createElement(FinanceAside, { nodes, demo: false, locale, section: 'politicians', ...callbacks }))
    const context = relatedContext(html)
    expect(context).toContain('Disclosed Apple')
    expect(context.split('Disclosed Apple')).toHaveLength(2)
    expect(context).toContain('<strong>NVDA</strong>')
    for (const value of ['BTC', 'ETH', 'MSFT', 'TSLA', 'Unrelated', 'Disclosure without a symbol']) expect(context).not.toContain(value)
  })

  it('does not infer political trades from an instrument library when no disclosures exist', () => {
    const nodes = ['BTC', 'ETH', 'MSFT'].map(symbol => node(`instrument:${symbol}`, 'instrument', `Unrelated ${symbol}`, { symbol }))
    const context = relatedContext(renderToString(createElement(FinanceAside, { nodes, demo: false, locale: 'en', section: 'politicians', ...callbacks })))
    expect(context).toContain('No explicitly imported related records yet.')
    for (const symbol of ['BTC', 'ETH', 'MSFT']) expect(context).not.toContain(symbol)
  })

  it.each(['zh-CN', 'en'])('labels political demo instruments without inventing disclosure relationships (%s)', locale => {
    const context = relatedContext(renderToString(createElement(FinanceAside, { nodes: [], demo: true, locale, section: 'politicians', ...callbacks })))
    expect(context).toContain(locale === 'en' ? 'Example instruments' : '样例标的')
    expect(context).toContain(locale === 'en' ? 'not actual political disclosures' : '不代表真实政治披露')
    expect(context).not.toContain(locale === 'en' ? 'Related traded instruments' : '相关交易标的')
    expect(context).toContain('NVIDIA')
  })

  it('omits the context module when no section is supplied or the section is unrelated', () => {
    const absent = renderToString(createElement(FinanceAside, { nodes: [], demo: true, locale: 'en', ...callbacks }))
    expect(absent).not.toContain('Relevant instruments')
    const unrelated = renderToString(createElement(FinanceAside, { nodes: [], demo: true, locale: 'en', section: 'portfolio', ...callbacks }))
    expect(unrelated).not.toContain('Relevant instruments')
  })

  it('counts the same research reports that the history destination lists', () => {
    const nodes = [
      node('deliverable:research', 'deliverable', 'Company research', { provider: 'research' }),
      node('deliverable:fund', 'deliverable', 'Fund research', { provider: 'virtual-fund' }),
      node('deliverable:review', 'deliverable', 'Review', { reviewOf: 'belief:one' }),
      node('deliverable:thinking', 'deliverable', 'Thinking review', { provider: 'hypothesis-thinking' }),
      node('deliverable:drift', 'deliverable', 'Drift review', { provider: 'thesis-drift' }),
      node('deliverable:legacy', 'deliverable', 'Legacy review', { runId: 'review:legacy' }),
      node('session:research', 'session', 'Research activity'),
    ]
    for (const locale of ['zh-CN', 'en']) {
      const html = renderToString(createElement(FinanceAside, { nodes, demo: false, locale, ...callbacks }))
      expect(html).toContain(locale === 'en' ? 'Read 2 reports' : '查看 2 份报告')
    }
  })
})
