import { Children, createElement, isValidElement } from 'react'
import type { ReactElement, ReactNode } from 'react'
import { renderToString } from 'react-dom/server'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { FinanceStore, financeOperation } from '../../client/finance-store.ts'
import type { FinanceGateway } from '../../client/finance-store.ts'
import { MarketPanel } from '../../client/ui/FinancePanels.tsx'
import { en } from '../../client/locales.ts'
import type { Translate } from '../../client/store.ts'
import type { GraphNode } from '../../src/graph.ts'

const marketHooks = vi.hoisted(() => ({ isolated: false, values: [] as unknown[], cursor: 0 }))
vi.mock('react', async importOriginal => {
  const actual = await importOriginal<typeof import('react')>()
  return {
    ...actual,
    useEffect: (...args: Parameters<typeof actual.useEffect>) => marketHooks.isolated ? undefined : actual.useEffect(...args),
    useRef: (initial: unknown) => marketHooks.isolated ? { current: initial } : actual.useRef(initial),
    useSyncExternalStore: (...args: Parameters<typeof actual.useSyncExternalStore>) => marketHooks.isolated ? args[1]() : actual.useSyncExternalStore(...args),
    useState: (initial: unknown) => {
      if (!marketHooks.isolated) return actual.useState(initial)
      const index = marketHooks.cursor++
      if (index === marketHooks.values.length) marketHooks.values.push(typeof initial === 'function' ? initial() : initial)
      return [marketHooks.values[index], (next: unknown) => {
        marketHooks.values[index] = typeof next === 'function' ? next(marketHooks.values[index]) : next
      }]
    },
  }
})

afterEach(() => {
  marketHooks.isolated = false
  marketHooks.values = []
  marketHooks.cursor = 0
  vi.restoreAllMocks()
})

function marketTree(store: FinanceStore, records: readonly GraphNode[]) {
  marketHooks.isolated = true
  marketHooks.cursor = 0
  try {
    return MarketPanel({ store, t, nodes: records, locale: 'en' })
  } finally {
    marketHooks.isolated = false
  }
}

function walk(node: ReactNode): ReactElement<Record<string, unknown>>[] {
  return Children.toArray(node).flatMap(child => isValidElement<Record<string, unknown>>(child)
    ? [child, ...walk(child.props.children as ReactNode)] : [])
}

const t: Translate = (key, params) => {
  const template: string = en[key as keyof typeof en] ?? key
  if (params === undefined) return template
  return Object.entries(params).reduce((text, [name, value]) => text.replaceAll(`{${name}}`, String(value)), template)
}

const nodes: GraphNode[] = [
  { id: 'instrument:aapl', kind: 'instrument', title: 'Apple', content: 'AAPL', metadata: { symbol: 'AAPL' }, createdAt: 1, updatedAt: 1 },
  { id: 'catalyst:earnings', kind: 'catalyst', title: 'Earnings', content: '', metadata: { instrumentId: 'instrument:aapl', asOf: '2026-01-10' }, createdAt: 1, updatedAt: 1 },
]

const gateway: FinanceGateway = {
  request: async request => {
    if (request.op !== 'market.fetch') return { ok: true, revision: 0, result: {} }
    const input = request.input as { kind: string; symbol: string }
    if (input.kind === 'quote') {
      return { ok: true, revision: 0, result: { items: [{ data: { symbol: input.symbol, regularMarketPrice: 123.45, currency: 'USD' } }] } }
    }
    return { ok: true, revision: 0, result: { items: [{ data: { symbol: input.symbol, bars: [{ timestamp: '2026-01-10T00:00:00Z', open: 120, high: 125, low: 119, close: 123.45, adjustedClose: 123.45, volume: 1000 }] } }] } }
  },
}

describe('Market submitted state restoration', () => {
  it.each([
    ['search', 'range'],
    ['search', 'custom'],
    ['watchlist', 'range'],
    ['watchlist', 'custom'],
  ] as const)('loads the selected symbol from %s with current edited %s inputs, without fetching on input edits', async (entry, mode) => {
    const bitcoin: GraphNode = {
      id: 'instrument:btc', kind: 'instrument', title: 'Bitcoin USD', content: 'BTC-USD',
      metadata: { symbol: 'BTC-USD', watchlist: true }, createdAt: 1, updatedAt: 1,
    }
    const request = vi.fn<FinanceGateway['request']>(async command => command.op === 'graph.search'
      ? { ok: true, revision: 0, result: { hits: [{ node: { ...bitcoin } }] } }
      : gateway.request(command))
    const store = new FinanceStore({ request }, t)
    const oldCutoff = '2026-01-10T00:00:00Z'
    const cutoff = '2026-11-01T09:00:00Z'
    await store.fetchQuote('MSFT', oldCutoff)
    await store.fetchHistory(mode === 'custom'
      ? { symbol: 'MSFT', start: '2026-01-01', end: '2026-01-31', interval: '30m' }
      : { symbol: 'MSFT', range: '5d', interval: '1h' })
    await store.searchInstruments('BTC-USD')
    request.mockClear()
    const quoteCall = vi.spyOn(store, 'fetchQuote')
    const historyCall = vi.spyOn(store, 'fetchHistory')

    const tree = marketTree(store, [bitcoin])
    const quoteSection = walk(tree).find(element => element.props.id === 'rg-market-quote')
    const cutoffInput = walk(quoteSection).find(element => element.type === 'input' && element.props.value === oldCutoff)
    expect(cutoffInput).toBeDefined()
    ;(cutoffInput!.props.onChange as (event: { target: { value: string } }) => void)({ target: { value: cutoff } })
    const quoteSymbolInput = walk(quoteSection).find(element => element.type === 'input' && element.props.value === 'MSFT')
    expect(quoteSymbolInput).toBeDefined()
    ;(quoteSymbolInput!.props.onChange as (event: { target: { value: string } }) => void)({ target: { value: 'UNSENT-QUOTE' } })
    const historyForm = walk(tree).find(element => element.props.className === 'rg-finance-form rg-market-history-form')
    const historySymbolInput = walk(historyForm).find(element => element.type === 'input' && element.props.value === 'MSFT')
    expect(historySymbolInput).toBeDefined()
    ;(historySymbolInput!.props.onChange as (event: { target: { value: string } }) => void)({ target: { value: 'UNSENT-HISTORY' } })
    const edits = mode === 'custom'
      ? [['2026-01-01', '2026-10-29'], ['2026-01-31', '2026-10-31'], ['30m', '5m']]
      : [['5d', '3mo'], ['1h', '15m']]
    for (const [previous, next] of edits) {
      const field = walk(historyForm).find(element => (element.type === 'input' || element.type === 'select') && element.props.value === previous)
      expect(field).toBeDefined()
      ;(field!.props.onChange as (event: { target: { value: string } }) => void)({ target: { value: next! } })
    }
    expect(request).not.toHaveBeenCalled()
    expect(quoteCall).not.toHaveBeenCalled()
    expect(historyCall).not.toHaveBeenCalled()

    const editedTree = marketTree(store, [bitcoin])
    const choices = entry === 'search'
      ? (() => {
          const results = walk(editedTree).find(element => typeof element.props.onSelect === 'function')
          expect(results).toBeDefined()
          return walk((results!.type as (props: Record<string, unknown>) => ReactNode)(results!.props))
        })()
      : walk(editedTree).filter(element => element.props.className === 'rg-market-watchlist-select')
    const choice = choices.find(element => element.type === 'button')
    expect(choice).toBeDefined()
    ;(choice!.props.onClick as () => void)()

    const expectedHistory = mode === 'custom'
      ? { symbol: 'BTC-USD', start: '2026-10-29', end: '2026-10-31', interval: '5m' }
      : { symbol: 'BTC-USD', range: '3mo', interval: '15m' }
    expect(quoteCall).toHaveBeenCalledOnce()
    expect(quoteCall).toHaveBeenCalledWith('BTC-USD', cutoff)
    expect(historyCall).toHaveBeenCalledOnce()
    expect(historyCall).toHaveBeenCalledWith(expectedHistory)
    expect(request).toHaveBeenCalledTimes(2)
    expect(request).toHaveBeenCalledWith({ op: 'market.fetch', input: { source: 'yahoo', kind: 'quote', symbol: 'BTC-USD', dryRun: true, asOf: cutoff } })
    expect(request).toHaveBeenCalledWith({ op: 'market.fetch', input: { source: 'yahoo', kind: 'history', ...expectedHistory, dryRun: true } })
    await Promise.all([quoteCall.mock.results[0]!.value, historyCall.mock.results[0]!.value])
    expect(store.getSnapshot().market).toEqual({ quote: { symbol: 'BTC-USD', asOf: cutoff }, history: expectedHistory })
    expect(financeOperation(store.getSnapshot(), 'quote').result).toMatchObject({ items: [{ data: { symbol: 'BTC-USD' } }] })
    expect(financeOperation(store.getSnapshot(), 'history').result).toMatchObject({ items: [{ data: { symbol: 'BTC-USD' } }] })
  })

  it.each(['search', 'watchlist'] as const)('blocks %s selection and reports the existing form validity when a custom date is incomplete', async entry => {
    const bitcoin: GraphNode = {
      id: 'instrument:btc', kind: 'instrument', title: 'Bitcoin USD', content: 'BTC-USD',
      metadata: { symbol: 'BTC-USD', watchlist: true }, createdAt: 1, updatedAt: 1,
    }
    const request = vi.fn<FinanceGateway['request']>(async command => command.op === 'graph.search'
      ? { ok: true, revision: 0, result: { hits: [{ node: { ...bitcoin } }] } }
      : gateway.request(command))
    const store = new FinanceStore({ request }, t)
    await store.fetchQuote('MSFT', '2026-01-10T00:00:00Z')
    await store.fetchHistory({ symbol: 'MSFT', start: '2026-01-01', end: '2026-01-31', interval: '30m' })
    await store.searchInstruments('BTC-USD')
    request.mockClear()
    const quoteCall = vi.spyOn(store, 'fetchQuote')
    const historyCall = vi.spyOn(store, 'fetchHistory')
    const beforeMarket = store.getSnapshot().market

    const tree = marketTree(store, [bitcoin])
    const historyForm = walk(tree).find(element => element.props.className === 'rg-finance-form rg-market-history-form')
    const missingDate = walk(historyForm).find(element => element.type === 'input'
      && element.props.value === (entry === 'search' ? '2026-01-01' : '2026-01-31'))
    expect(missingDate).toBeDefined()
    ;(missingDate!.props.onChange as (event: { target: { value: string } }) => void)({ target: { value: '' } })

    const editedTree = marketTree(store, [bitcoin])
    const editedForm = walk(editedTree).find(element => element.props.className === 'rg-finance-form rg-market-history-form')
    expect(editedForm).toBeDefined()
    const formRef = (editedForm as unknown as { ref: { current: Pick<HTMLFormElement, 'reportValidity'> | null } }).ref
    const reportValidity = vi.fn(() => false)
    formRef.current = { reportValidity }
    const beforeInputs = [...marketHooks.values]
    const choices = entry === 'search'
      ? (() => {
          const results = walk(editedTree).find(element => typeof element.props.onSelect === 'function')
          expect(results).toBeDefined()
          return walk((results!.type as (props: Record<string, unknown>) => ReactNode)(results!.props))
        })()
      : walk(editedTree).filter(element => element.props.className === 'rg-market-watchlist-select')
    const choice = choices.find(element => element.type === 'button')
    expect(choice).toBeDefined()
    ;(choice!.props.onClick as () => void)()

    expect(reportValidity).toHaveBeenCalledOnce()
    expect(marketHooks.values).toEqual(beforeInputs)
    expect(store.getSnapshot().market).toBe(beforeMarket)
    expect(quoteCall).not.toHaveBeenCalled()
    expect(historyCall).not.toHaveBeenCalled()
    expect(request).not.toHaveBeenCalled()
  })

  it('rehydrates preset quote/history inputs and results without false stale or losing catalysts', async () => {
    const store = new FinanceStore(gateway, t)
    expect(await store.fetchQuote('AAPL', '2026-01-10T00:00:00Z')).toBe(true)
    expect(await store.fetchHistory({ symbol: 'AAPL', range: '5d', interval: '1h' })).toBe(true)

    const html = renderToString(createElement(MarketPanel, { store, t, nodes }))
    expect(html).toContain('value="AAPL"')
    expect(html).toContain('value="2026-01-10T00:00:00Z"')
    expect(html).toContain('<option value="5d" selected="">')
    expect(html).toContain('<option value="1h" selected="">')
    expect(html).toContain('123.45')
    expect(html).not.toContain('data-stale="true"')
    expect(html).toContain('Linked catalysts')
    expect(html).toContain('rg-finance-badge">1</span>')
    expect(store.getSnapshot().market).toEqual({
      quote: { symbol: 'AAPL', asOf: '2026-01-10T00:00:00Z' },
      history: { symbol: 'AAPL', range: '5d', interval: '1h' },
    })
  })

  it('restores custom dates and interval from the last submission', async () => {
    const store = new FinanceStore(gateway, t)
    expect(await store.fetchHistory({ symbol: 'AAPL', start: '2026-01-01', end: '2026-01-31', interval: '30m' })).toBe(true)

    const html = renderToString(createElement(MarketPanel, { store, t, nodes }))
    expect(html).toContain('<option value="custom" selected="">')
    expect(html).toContain('value="2026-01-01"')
    expect(html).toContain('value="2026-01-31"')
    expect(html).toContain('<option value="30m" selected="">')
    expect(html).not.toContain('data-stale="true"')
  })

  it('shows failed quote/history requests above the tabs while preserving the previous response, then recovers', async () => {
    let offline = false
    const store = new FinanceStore({ request: async request => offline
      ? { ok: false, error: { code: 'NOT_FOUND', message: 'symbol was not found' } }
      : gateway.request(request) }, t)
    await store.fetchQuote('AAPL')
    await store.fetchHistory({ symbol: 'AAPL', range: '1d', interval: '1m' })
    offline = true
    expect(await store.fetchQuote('ZZZQATEST404')).toBe(false)
    expect(await store.fetchHistory({ symbol: 'ZZZQATEST404', range: '1d', interval: '1m' })).toBe(false)
    const failed = renderToString(createElement(MarketPanel, { store, t, nodes, locale: 'en' }))
    expect(failed.indexOf('Could not load ZZZQATEST404 quotes')).toBeLessThan(failed.indexOf('role="tablist"'))
    expect(failed.indexOf('Could not load ZZZQATEST404 history')).toBeLessThan(failed.indexOf('role="tablist"'))
    expect(failed).toContain('Retry quotes')
    expect(failed).toContain('Retry history')
    expect(failed).toContain('last successful result')
    expect(failed).toContain('123.45')
    expect(failed).toContain('data-stale="true"')
    offline = false
    expect(await store.fetchQuote('MSFT')).toBe(true)
    expect(await store.fetchHistory({ symbol: 'MSFT', range: '1d', interval: '1m' })).toBe(true)
    const recovered = renderToString(createElement(MarketPanel, { store, t, nodes, locale: 'en' }))
    expect(recovered).not.toContain('rg-stock-request-error')
    expect(recovered).not.toContain('data-stale="true"')
    expect(recovered).toContain('MSFT')
  })
})
