import { Children, isValidElement } from 'react'
import type { ReactElement, ReactNode } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { FinanceStore } from '../../client/finance-store.ts'
import { comparisonReturns, historyCsv } from '../../client/ui/StockChartTools.tsx'
import { StockPriceAlert } from '../../client/ui/StockPriceAlert.tsx'
import type { MarketBar } from '../../client/chart-data.ts'

// Exercise the component's real form handlers in the existing Node test runner;
// only hook scheduling and browser storage are replaced, with no browser/build.
const hooks = vi.hoisted(() => ({ values: [] as unknown[], cursor: 0 }))
vi.mock('react', async importOriginal => ({
  ...await importOriginal<typeof import('react')>(),
  useEffect: () => {},
  useRef: () => ({ current: null }),
  useState: (initial: unknown) => {
    const index = hooks.cursor++
    if (index === hooks.values.length) hooks.values.push(typeof initial === 'function' ? initial() : initial)
    return [hooks.values[index], (next: unknown) => {
      hooks.values[index] = typeof next === 'function' ? next(hooks.values[index]) : next
    }]
  },
}))

const bar = (timestamp: string, close: number | null): MarketBar => ({ timestamp, close, open: close, high: close, low: close, adjustedClose: close, volume: 17 })

describe('stock comparison and export', () => {
  it('leaves the open stock and its result intact when comparison succeeds or fails', async () => {
    let failing = false
    const requests: unknown[] = []
    const store = new FinanceStore({ request: async request => {
      requests.push(request)
      return failing ? { ok:false, error:{code:'UNAVAILABLE',message:'offline'} } : {ok:true,revision:3,result:{symbol:'AAPL',bars:[]}}
    } }, key => key)
    await store.fetchHistory({symbol:'AAPL',range:'5d',interval:'1h'})
    const before = store.getSnapshot()
    expect((await store.readHistory({symbol:'MSFT',range:'5d',interval:'1h'})).ok).toBe(true)
    expect(store.getSnapshot()).toBe(before)
    failing = true
    expect(await store.readHistory({symbol:'NVDA',start:'2026-01-01',end:'2026-01-10',interval:'1d'})).toMatchObject({ok:false,error:{code:'UNAVAILABLE'}})
    expect(store.getSnapshot()).toBe(before)
    expect(requests.at(-1)).toMatchObject({op:'market.fetch',input:{symbol:'NVDA',start:'2026-01-01',end:'2026-01-10',interval:'1d',dryRun:true}})
    expect((requests.at(-1) as {input:object}).input).not.toHaveProperty('range')
  })
  it('aligns exact timestamps from the first valid common observation and preserves gaps', () => {
    const a=[bar('2026-01-01',100),bar('2026-01-02',120),bar('2026-01-03',null),bar('2026-01-04',132)]
    const b=[bar('2026-01-02',60),bar('2026-01-03',66)]
    const result=comparisonReturns(a,b)
    expect(result).toHaveLength(3)
    expect(result[0]).toEqual({timestamp:'2026-01-02',primary:0,other:0})
    expect(result[1]?.primary).toBeNull()
    expect(result[1]?.other).toBeCloseTo(10)
    expect(result[2]?.other).toBeNull()
    expect(result[2]?.primary).toBeCloseTo(10)
    expect(comparisonReturns([bar('2026-01-01',0)], [bar('2026-01-01',20)])).toEqual([])
  })
  it('exports every exact observation with null values empty and no rounding', () => {
    const rows=Array.from({length:600},(_,i)=>bar(new Date(Date.UTC(2025,0,1+i)).toISOString(), i===1 ? null : 100.123456789))
    const csv=historyCsv(rows)
    expect(csv.split('\r\n')).toHaveLength(601)
    expect(csv).toContain('100.123456789')
    expect(csv.split('\r\n')[2]).toContain(',,,,,')
    expect(csv).not.toContain('null')
  })
})

describe('local stock price alert saves', () => {
  afterEach(() => { vi.unstubAllGlobals() })

  function rig(initial: object[] = []) {
    hooks.values = []; hooks.cursor = 0
    let stored = JSON.stringify(initial)
    let id = 0
    const setItem = vi.fn((_key: string, value: string) => { stored = value })
    const randomUUID = vi.fn(() => `alert-${++id}`)
    vi.stubGlobal('localStorage', { getItem: vi.fn(() => stored), setItem })
    vi.stubGlobal('crypto', { randomUUID })
    let symbol = 'AAPL'
    const walk = (node: ReactNode): ReactElement<Record<string, unknown>>[] => Children.toArray(node).flatMap(child =>
      isValidElement<Record<string, unknown>>(child) ? [child, ...walk(child.props.children as ReactNode)] : [])
    const render = () => {
      hooks.cursor = 0
      return walk(StockPriceAlert({ symbol, price: 351, changePercent: 6, locale: 'en' }))
    }
    const find = (predicate: (element: ReactElement<Record<string, unknown>>) => boolean) => {
      const node = render().find(predicate)
      if (!node) throw new Error('Missing alert control')
      return node
    }
    const change = (node: ReactElement<Record<string, unknown>>, value: string) => {
      (node.props.onChange as (event: { target: { value: string } }) => void)({ target: { value } })
    }
    const save = (options: { symbol?: string; kind?: 'price' | 'move'; direction?: 'above' | 'below'; value?: string; note?: string } = {}) => {
      symbol = options.symbol ?? 'AAPL'
      ;(find(node => node.props.className === 'rg-stock-alert-trigger').props.onClick as () => void)()
      if (options.kind === 'move') (find(node => node.type === 'button' && node.props.children === 'Price move').props.onClick as () => void)()
      change(find(node => node.type === 'select'), options.direction ?? 'above')
      change(find(node => node.type === 'input' && node.props.type === 'number'), options.value ?? '350')
      change(find(node => node.type === 'textarea'), options.note ?? '')
      ;(find(node => node.type === 'form').props.onSubmit as (event: { preventDefault: () => void }) => void)({ preventDefault: vi.fn() })
      return render()
    }
    return { save, render, setItem, randomUUID, stored: () => stored, alerts: () => JSON.parse(stored) as { id: string; note: string }[] }
  }

  it.each(['350', '350.00'])('saves an exact numeric duplicate twice as one reminder and one notification, reusing its id (%s)', value => {
    const test = rig()
    test.save()
    const first = test.stored()
    const tree = test.save({ value })
    expect(test.alerts()).toHaveLength(1)
    expect(test.stored()).toBe(first)
    expect(test.randomUUID).toHaveBeenCalledTimes(1)
    expect(tree.filter(node => node.props.role === 'status')).toHaveLength(1)
    expect(tree.some(node => node.type === 'dialog')).toBe(false)
    expect(test.setItem.mock.calls.every(([key]) => key === 'dsh-finance.local-price-alerts.v1')).toBe(true)
  })

  it.each([
    { note: 'review earnings' }, { note: ' ' }, { direction: 'below' as const },
    { value: '351' }, { kind: 'move' as const }, { symbol: 'MSFT' },
  ])('keeps a distinct reminder when one equality field changes: %j', options => {
    const test = rig()
    test.save()
    test.save(options)
    expect(test.alerts()).toHaveLength(2)
    expect(test.randomUUID).toHaveBeenCalledTimes(2)
  })

  it('leaves historical duplicate records and their ids intact without appending another', () => {
    const initial = ['old-1', 'old-2'].map(id => ({ id, symbol: 'AAPL', kind: 'price', direction: 'above', value: 350, note: '' }))
    const test = rig(initial)
    test.save()
    expect(test.alerts()).toEqual(initial)
    expect(test.randomUUID).not.toHaveBeenCalled()
  })

  it.each([false, true])('keeps the form open with an error if storage rejects a save (duplicate=%s)', duplicate => {
    const test = rig()
    if (duplicate) test.save()
    const before = test.stored()
    test.setItem.mockImplementation(() => { throw new Error('quota denied') })
    const tree = test.save()
    expect(test.stored()).toBe(before)
    expect(tree.some(node => node.type === 'dialog')).toBe(true)
    expect(tree.find(node => node.props.role === 'alert')?.props.children).toBe('Cannot save the reminder. Check browser storage.')
  })
})
