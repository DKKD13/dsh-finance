import { Children, isValidElement } from 'react'
import type { ReactElement, ReactNode } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { VirtualFundPanel } from '../../client/ui/VirtualFundPanel.tsx'
import type { GraphResponse } from '../../src/protocol.ts'
import type { GraphNode } from '../../src/graph.ts'

vi.mock('@deepseek-ai/dsh-client-ui-primitives', () => ({
  MarkdownText: ({ text }: { text: string }) => text,
}))

/**
 * Mounted-behavior coverage for the VirtualFundPanel readState path
 * (loading, failure, retry) and the activity-feed truthfulness rule
 * (only actually recorded deliverables appear). Hooks are kept in slots so
 * the real component body drives state transitions across manual renders.
 */

const hooks = vi.hoisted(() => ({ values: [] as unknown[], cursor: 0 }))
const captured = vi.hoisted(() => ({ effects: [] as (() => void)[] }))
vi.mock('react', async importOriginal => ({
  ...await importOriginal<typeof import('react')>(),
  useEffect: (fn: () => void) => { captured.effects.push(fn) },
  useRef: (initial: unknown) => {
    const i = hooks.cursor++
    if (i === hooks.values.length) hooks.values.push({ current: initial })
    return hooks.values[i]
  },
  useState: (initial: unknown) => {
    const i = hooks.cursor++
    if (i === hooks.values.length) hooks.values.push(typeof initial === 'function' ? initial() : initial)
    return [hooks.values[i], (next: unknown) => {
      hooks.values[i] = typeof next === 'function' ? next(hooks.values[i]) : next
    }]
  },
}))

type E = ReactElement<Record<string, any>> // eslint-disable-line @typescript-eslint/no-explicit-any
const walk = (node: ReactNode): E[] => Children.toArray(node).flatMap(child =>
  isValidElement<Record<string, any>>(child) ? [child, ...walk(child.props.children as ReactNode)] : [])

function fundNode(id: string, title: string, currency: string): GraphNode {
  return {
    id, kind: 'portfolio', title, content: '',
    metadata: { virtualFund: { initialCash: 1000, currency, startingAt: '2026-01-01T00:00:00.000Z' } },
    createdAt: 1, updatedAt: 1,
  }
}

function snapshotNode(fundId: string, asOf: string): GraphNode {
  return {
    id: `session:fund-snapshot:${fundId}:${asOf}`,
    kind: 'session',
    title: `snapshot ${asOf}`,
    content: '',
    metadata: { type: 'fund-snapshot', fundId, asOf, nav: 1000, cash: 1000, positions: [], sourceIds: [], summary: '' },
    createdAt: 2, updatedAt: 2,
  }
}

function eventNode(fundId: string, id: string, title: string, researcherId: string): GraphNode {
  return {
    id, kind: 'deliverable', title, content: 'recorded note',
    metadata: { fundId, researcherId, instruments: ['AAPL'] },
    createdAt: 3, updatedAt: 3,
  }
}

function response(result: unknown): GraphResponse {
  return { ok: true, revision: 7, result: JSON.parse(JSON.stringify(result)) }
}

afterEach(() => {
  hooks.values = []
  hooks.cursor = 0
  captured.effects = []
  vi.unstubAllGlobals()
})

describe('VirtualFundPanel readState path', () => {
  it('marks a deleted schedule missing instead of leaving the running indicator on', async () => {
    vi.useFakeTimers()
    try {
      const fund = fundNode('portfolio:fund:usd', 'USD Fund', 'USD')
      const researcher: GraphNode = {
        id: 'session:analyst-usd', kind: 'session', title: 'AAPL Analyst', content: '',
        metadata: { type: 'fund-researcher', fundId: fund.id, tickers: ['AAPL'], researchStyle: 'evidence', focus: 'AAPL', task: 'Read updates', role: 'analyst', enabled: true, scheduleId: 'schedule-deleted', sessionId: 'session-native' },
        createdAt: 1, updatedAt: 1,
      }
      const render = () => {
        hooks.cursor = 0
        captured.effects = []
        return walk(VirtualFundPanel({ locale: 'en', nodes: [fund, researcher], readSchedules: async () => ({ ok: true, value: [] }) }))
      }
      render()
      captured.effects.forEach(effect => effect())
      await Promise.resolve()
      await Promise.resolve()
      const tree = render()
      const seat = tree.find(node => node.props['data-seat'] === researcher.id)
      expect(seat?.props['data-working']).not.toBe(true)
      expect(seat?.props['data-working']).toBeUndefined()
      expect(tree.some(node => node.props.children === 'Schedule missing')).toBe(true)
    } finally {
      vi.useRealTimers()
    }
  })

  it('retains records when an unchanged poll omits their payload', async () => {
    vi.stubGlobal('sessionStorage', { getItem: () => null, setItem: () => undefined })
    const calls: (number | undefined)[] = []
    const usd = fundNode('portfolio:fund:usd', 'USD Fund', 'USD')
    const readState = async (_fund?: string, knownRevision?: number) => {
      calls.push(knownRevision)
      return knownRevision === 7
        ? response({ unchanged: true, funds: [], researchers: [], snapshots: [], events: [] })
        : response({ funds: [usd], researchers: [], snapshots: [], events: [] })
    }
    const render = () => {
      hooks.cursor = 0
      captured.effects = []
      return walk(VirtualFundPanel({ locale: 'en', nodes: [], readState }))
    }
    render()
    captured.effects.forEach(effect => effect())
    await Promise.resolve()
    await Promise.resolve()
    const tree = render()
    expect(calls).toEqual([undefined])
    expect(tree.some(node => node.type === 'h3' && node.props.children === 'USD Fund')).toBe(true)
    captured.effects.forEach(effect => effect())
    await Promise.resolve()
    await Promise.resolve()
    expect(calls).toEqual([undefined, 7])
    expect(render().some(node => node.type === 'h3' && node.props.children === 'USD Fund')).toBe(true)
  })

  it('shows loading, surfaces failure with retry, and recovers with real records', async () => {
    vi.stubGlobal('sessionStorage', { getItem: () => null, setItem: () => undefined, removeItem: () => undefined })
    const calls: string[] = []
    let resolveRead!: (value: GraphResponse) => void
    const readState = () => {
      calls.push('read')
      return new Promise<GraphResponse>(resolve => { resolveRead = resolve })
    }

    const render = () => {
      hooks.cursor = 0
      captured.effects = []
      return walk(VirtualFundPanel({ locale: 'en', nodes: [], readState }))
    }
    const text = (tree: E[]) => tree.map(node => {
      const collect = (value: unknown): string => {
        if (typeof value === 'string') return value
        if (Array.isArray(value)) return value.map(collect).join(' ')
        if (isValidElement(value)) return collect((value.props as { children?: unknown }).children)
        return ''
      }
      return collect(node.props.children)
    }).join(' ')

    // initial mount: effect captured, loading state visible
    let tree = render()
    expect(captured.effects.length).toBeGreaterThan(0)
    expect(tree.some(node => node.props.role === 'status' && text([node]).includes('Loading fund records'))).toBe(true)
    captured.effects.forEach(effect => effect())
    expect(calls).toEqual(['read'])
    tree = render()
    expect(tree.some(node => node.props.role === 'status' && text([node]).includes('Loading fund records'))).toBe(true)

    // failure: error banner with retry; recovery hint while no fund is readable
    resolveRead({ ok: false, error: { code: 'OFFLINE', message: 'graph unavailable' } })
    await Promise.resolve()
    await Promise.resolve()
    tree = render()
    const alert = tree.find(node => node.props.role === 'alert')
    expect(alert).toBeDefined()
    expect(text([alert!])).toContain('OFFLINE')
    const retry = tree.find(node => node.type === 'button' && text([node]).includes('Retry'))
    expect(retry).toBeDefined()
    expect(tree.some(node => text([node]).includes('Fund and research desks will appear when records can be read again'))).toBe(true)

    // retry: second read resolves with two funds, snapshots, one researcher, one event
    ;(retry!.props.onClick as () => void)()
    tree = render()
    const pending = calls.length
    captured.effects.forEach(effect => effect())
    expect(calls.length).toBe(pending + 1)
    const usd = fundNode('portfolio:fund:usd', 'USD Fund', 'USD')
    const hkd = fundNode('portfolio:fund:hkd', 'HKD Fund', 'HKD')
    const event = eventNode(usd.id, 'deliverable:note-1', 'AAPL evidence note', 'session:analyst-usd')
    resolveRead(response({
      funds: [usd, hkd],
      researchers: [{
        id: 'session:analyst-usd', kind: 'session', title: 'AAPL Analyst', content: 'task',
        metadata: { type: 'fund-researcher', fundId: usd.id, tickers: ['AAPL'], researchStyle: 'evidence-first', focus: 'hardware', task: 'track AAPL', role: 'analyst', enabled: false },
        createdAt: 1, updatedAt: 1,
      }],
      snapshots: [snapshotNode(usd.id, '2026-01-05T00:00:00.000Z')],
      events: [event],
    }))
    await Promise.resolve()
    await Promise.resolve()
    tree = render()

    // error cleared, fund selector shows both funds
    expect(tree.some(node => node.props.role === 'alert')).toBe(false)
    const select = tree.find(node => node.type === 'select' && node.props['aria-label'] === 'Choose fund')
    expect(select).toBeDefined()
    expect(walk(select!.props.children).filter(node => node.type === 'option')).toHaveLength(2)
    expect(text(tree)).toContain('USD Fund')

    // office view: activity feed shows exactly the one recorded deliverable
    const feed = tree.find(node => node.props['aria-label'] === 'Activity feed')
    expect(feed).toBeDefined()
    const items = walk(feed!.props.children).filter(node => node.type === 'button' && node.props.children?.[1]?.props?.children?.[1]?.props?.children)
    expect(items.length).toBe(1)
    expect(text([feed!])).toContain('AAPL evidence note')

    // switch to the HKD fund: no snapshots yet, no events — empty states, nothing fabricated
    ;(select!.props.onChange as (event: { target: { value: string } }) => void)({ target: { value: hkd.id } })
    tree = render()
    expect(text(tree)).toContain('HKD Fund')
    expect(tree.some(node => node.props['aria-label'] === 'Activity feed' && text([node]).includes('Findings, fund decisions and reviews collect here'))).toBe(true)
    expect(text(tree)).not.toContain('AAPL evidence note')
  })
})
