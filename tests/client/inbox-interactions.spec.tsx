import { Children, isValidElement } from 'react'
import type { ReactElement, ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { InboxPanel } from '../../client/ui/InboxPanel.tsx'
import { FinanceStore, financeOperation } from '../../client/finance-store.ts'
import type { FinanceGateway } from '../../client/finance-store.ts'
import type { GraphResponse } from '../../src/protocol.ts'
import type { Translate } from '../../client/store.ts'

const t: Translate = key => key
const item = { provider: 'feed', canonicalUrl: 'https://example.com/article', title: 'Article', content: 'alpha beta', asOf: '2026-01-01T00:00:00Z' }
function deferred() {
  let resolve!: (value: GraphResponse) => void
  const promise = new Promise<GraphResponse>(done => { resolve = done })
  return { promise, resolve }
}

// Keep one mount's hook slots while exercising the real component and store.
const hooks = vi.hoisted(() => ({ values: [] as unknown[], cursor: 0 }))
vi.mock('react', async importOriginal => ({
  ...await importOriginal<typeof import('react')>(),
  useId: () => 'inbox-test',
  useSyncExternalStore: (_subscribe: unknown, get: () => unknown) => get(),
  useState: (initial: unknown) => {
    const i = hooks.cursor++
    if (i === hooks.values.length) hooks.values.push(typeof initial === 'function' ? initial() : initial)
    return [hooks.values[i], (next: unknown) => {
      hooks.values[i] = typeof next === 'function' ? next(hooks.values[i]) : next
    }]
  },
  useRef: (initial: unknown) => {
    const i = hooks.cursor++
    if (i === hooks.values.length) hooks.values.push({ current: initial })
    return hooks.values[i] // 每次 rerender 仍是同一个 ref
  },
}))

describe('Inbox mounted handlers', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => { vi.clearAllTimers(); vi.useRealTimers(); vi.restoreAllMocks() })

  function rig() {
    hooks.values = []; hooks.cursor = 0 // 仅创建 rig 时清空，步骤间不清空
    const writes: ReturnType<typeof deferred>[] = []
    let previews = 0
    const gateway: FinanceGateway = { request: async request => {
      if (request.op === 'source.fetch') return {
        ok: true, revision: 4,
        result: { dryRun: true, runId: `preview-${++previews}`, asOf: item.asOf, items: [item] },
      }
      expect(request.op).toBe('source.ingest')
      const wait = deferred(); writes.push(wait); return wait.promise
    } }
    const store = new FinanceStore(gateway, t)
    const previewCall = vi.spyOn(store, 'previewUrl') // 保留真实实现
    const commitCall = vi.spyOn(store, 'commitInbox')
    type E = ReactElement<Record<string, any>> // 仅此测试的 JSX 事件 props
    const walk = (node: ReactNode): E[] => Children.toArray(node).flatMap(child =>
      isValidElement<Record<string, any>>(child) ? [child, ...walk(child.props.children)] : [])
    const tree = () => {
      hooks.cursor = 0
      return walk(InboxPanel({ store, t, nodes: [], onOpenGraph: vi.fn() }))
    }
    const find = (match: (e: E) => boolean): E => {
      const element = tree().find(match)
      if (!element) throw new Error('Missing Inbox control')
      return element
    }
    const has = (name: string) => tree().some(e =>
      typeof e.props.className === 'string' && e.props.className.split(' ').includes(name))
    const confirm = () => find(e => e.type === 'button' && e.props.children === 'finance.inbox.commitAction')
    const pending = () => tree().some(e => e.type === 'p' && e.props.children === 'finance.inbox.commitHint')
    return {
      store, writes, tree, has, pending, confirm,
      enter: (url: string) => find(e => e.type === 'input' && e.props.type === 'url')
        .props.onChange({ target: { value: url } }),
      preview: async () => {
        find(e => e.type === 'form').props.onSubmit({ preventDefault: vi.fn() })
        await previewCall.mock.results.at(-1)!.value
      },
      commit: (): Promise<boolean> => {
        const button = confirm(); expect(button.props.disabled).toBe(false)
        button.props.onClick()
        return commitCall.mock.results.at(-1)!.value
      },
    }
  }
  const success = (revision: number): GraphResponse => ({
    ok: true, revision, result: { revision, dryRun: false, changed: true },
  })

  it('same mount: preview → commit → no pending; new input can preview and commit again', async () => {
    const r = rig(); r.enter('https://example.com/first.xml'); await r.preview()
    const original = financeOperation(r.store.getSnapshot(), 'ingest').result
    expect(r.has('rg-inbox-preview')).toBe(true); expect(r.pending()).toBe(true)
    const first = r.commit(); expect(r.confirm().props.disabled).toBe(true)
    r.writes[0]!.resolve(success(5)); expect(await first).toBe(true)
    expect(financeOperation(r.store.getSnapshot(), 'ingest').result).toBe(original)
    expect(r.has('rg-inbox-preview')).toBe(true); expect(r.has('rg-inbox-success')).toBe(true)
    expect(r.pending()).toBe(false); expect(r.has('rg-inbox-confirm')).toBe(false)
    expect(r.writes).toHaveLength(1)

    r.enter('https://example.com/second.xml')
    expect(r.has('rg-inbox-success')).toBe(false); expect(r.has('rg-inbox-preview')).toBe(false)
    await r.preview(); expect(r.pending()).toBe(true); expect(r.confirm().props.disabled).toBe(false)
    const second = r.commit(); r.writes[1]!.resolve(success(6)); expect(await second).toBe(true)
    expect(r.has('rg-inbox-success')).toBe(true); expect(r.pending()).toBe(false)
    expect(r.writes).toHaveLength(2)
  })

  it('same mount: failed commit retains review and error, and permits a real retry', async () => {
    const r = rig(); r.enter('https://example.com/retry.xml'); await r.preview()
    const original = financeOperation(r.store.getSnapshot(), 'ingest').result
    const first = r.commit()
    r.writes[0]!.resolve({ ok: false, error: { code: 'OFFLINE', message: 'retry me' } })
    expect(await first).toBe(false)
    expect(financeOperation(r.store.getSnapshot(), 'ingest').result).toBe(original)
    expect(r.has('rg-inbox-preview')).toBe(true); expect(r.has('rg-inbox-success')).toBe(false)
    expect(r.tree().some(e => e.props.role === 'alert' && e.props.children === 'finance.inbox.commitError')).toBe(true)
    expect(r.pending()).toBe(true); expect(r.confirm().props.disabled).toBe(false)
    const retry = r.commit(); r.writes[1]!.resolve(success(5)); expect(await retry).toBe(true)
    expect(r.pending()).toBe(false); expect(r.has('rg-inbox-success')).toBe(true)
    expect(r.writes).toHaveLength(2)
  })
})
