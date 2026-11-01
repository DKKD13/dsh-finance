import { describe, expect, it } from 'vitest'
import { FinanceStore, financeOperation } from '../../client/finance-store.ts'
import type { FinanceGateway } from '../../client/finance-store.ts'
import type { FinanceCommandRequest } from '../../client/protocol.ts'
import type { GraphResponse } from '../../src/protocol.ts'
import type { JsonValue } from '../../src/graph.ts'

interface Deferred {
  readonly request: FinanceCommandRequest
  readonly resolve: (response: GraphResponse) => void
}

function success(result: JsonValue, revision = 1): GraphResponse {
  return { ok: true, revision, result }
}

describe('market request independence and stale charts', () => {
  it('settles quote/history independently, ignores late responses, and retains stale history', async () => {
    const calls: Deferred[] = []
    const gateway: FinanceGateway = {
      request: request => new Promise<GraphResponse>(resolve => { calls.push({ request, resolve }) }),
    }
    const store = new FinanceStore(gateway, key => key)

    const firstQuote = store.fetchQuote('AAA')
    const firstHistory = store.fetchHistory({ symbol: 'AAA', range: '3mo', interval: '1d' })
    expect(calls).toHaveLength(2)
    expect(calls[1]?.request).toMatchObject({ op: 'market.fetch', input: { range: '3mo', interval: '1d', dryRun: true } })
    calls[1]?.resolve(success({ items: [{ data: { symbol: 'AAA', bars: [{ timestamp: '2026-01-01T00:00:00Z', close: 10 }] } }] }))
    expect(await firstHistory).toBe(true)
    expect(financeOperation(store.getSnapshot(), 'history').status).toBe('success')
    expect(financeOperation(store.getSnapshot(), 'quote').status).toBe('loading')

    const secondQuote = store.fetchQuote('BBB')
    expect(calls).toHaveLength(3)
    calls[2]?.resolve(success({ items: [{ data: { symbol: 'BBB', regularMarketPrice: 20 } }] }, 2))
    expect(await secondQuote).toBe(true)
    calls[0]?.resolve(success({ items: [{ data: { symbol: 'AAA', regularMarketPrice: 10 } }] }, 2))
    expect(await firstQuote).toBe(false)
    expect(financeOperation(store.getSnapshot(), 'quote').result).toMatchObject({ items: [{ data: { symbol: 'BBB', regularMarketPrice: 20 } }] })
    expect(store.getSnapshot().market.quote).toEqual({ symbol: 'BBB', asOf: '' })

    const oldHistory = financeOperation(store.getSnapshot(), 'history').result
    const secondHistory = store.fetchHistory({ symbol: 'BBB', start: '2026-01-01', end: '2026-02-01', interval: '1d' })
    expect(calls[3]?.request).toMatchObject({ input: { start: '2026-01-01', end: '2026-02-01' } })
    expect(financeOperation(store.getSnapshot(), 'history')).toMatchObject({ status: 'loading', result: oldHistory })
    calls[3]?.resolve({ ok: false, error: { code: 'UNAVAILABLE', message: 'provider offline' } })
    expect(await secondHistory).toBe(false)
    expect(financeOperation(store.getSnapshot(), 'history')).toMatchObject({ status: 'error', result: oldHistory })
  })

  it('uses the preset range when a custom date is incomplete', async () => {
    const calls: Deferred[] = []
    const store = new FinanceStore({ request: request => new Promise<GraphResponse>(resolve => { calls.push({ request, resolve }) }) }, key => key)
    const pending = store.fetchHistory({ symbol: 'AAA', start: '2026-01-01', range: '1mo', interval: '1d' })
    expect(calls[0]?.request).toMatchObject({ input: { range: '1mo' } })
    expect(calls[0]?.request.input).not.toHaveProperty('start')
    calls[0]?.resolve(success({ items: [] }))
    expect(await pending).toBe(true)
  })
})
