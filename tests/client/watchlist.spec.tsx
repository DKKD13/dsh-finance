import { createElement } from 'react'
import { renderToString } from 'react-dom/server'
import { join } from 'node:path'
import { Context } from '@deepseek-ai/cordis'
import { afterEach, describe, expect, it } from 'vitest'
import { FinanceService } from '../../src/finance/service.ts'
import { executeFinanceRequest } from '../../src/finance/protocol.ts'
import type { FinanceRequest } from '../../src/finance/protocol.ts'
import { executeGraphRequest } from '../../src/protocol.ts'
import { ResearchGraphService, resolveConfig } from '../../src/service.ts'
import { FinanceStore, financeOperation } from '../../client/finance-store.ts'
import type { FinanceCommandRequest } from '../../client/protocol.ts'
import type { FinanceGateway } from '../../client/finance-store.ts'
import { WorkbenchStore } from '../../client/store.ts'
import type { Translate } from '../../client/store.ts'
import { MarketPanel } from '../../client/ui/FinancePanels.tsx'
import { en } from '../../client/locales.ts'
import { makeTempDir } from '../host/fixtures.ts'

const cleanups: (() => Promise<void>)[] = []
afterEach(async () => {
  while (cleanups.length > 0) await cleanups.pop()?.()
})

const t: Translate = (key, params) => {
  const template: string = en[key as keyof typeof en] ?? key
  if (params === undefined) return template
  return Object.entries(params).reduce((text, [name, value]) => text.replaceAll(`{${name}}`, String(value)), template)
}

describe('persistent Market watchlist', () => {
  it('writes explicit graph plans, restores after a Host restart, and preserves submitted market state', async () => {
    const temp = await makeTempDir('client-watchlist')
    cleanups.push(temp.cleanup)
    const dataDir = join(temp.dir, 'data')
    const skillsRoot = join(temp.dir, 'skills')
    const makeHost = () => {
      const ctx = new Context()
      const graph = new ResearchGraphService(ctx, resolveConfig({ dataDir, skillsRoot, autoIndexSkills: false }, skillsRoot))
      const finance = new FinanceService(ctx, graph)
      return { graph, finance }
    }
    const host = makeHost()
    await host.graph.createNode({ id: 'instrument:aapl', kind: 'instrument', title: 'Apple', content: 'AAPL', metadata: { symbol: 'AAPL', provider: 'fixture.market', asOf: '2026-01-10T00:00:00Z' } })
    await host.graph.createNode({ id: 'instrument:msft', kind: 'instrument', title: 'Microsoft', content: 'MSFT', metadata: { symbol: 'MSFT', provider: 'fixture.market' } })

    const seen: FinanceCommandRequest[] = []
    const gateway: FinanceGateway = {
      request: request => {
        seen.push(request)
        if (request.op === 'market.fetch') {
          const input = request.input as { kind: string; symbol: string }
          const data = input.kind === 'quote'
            ? { symbol: input.symbol, regularMarketPrice: 123.45, currency: 'USD' }
            : { symbol: input.symbol, bars: [{ timestamp: '2026-01-10T00:00:00Z', open: 120, high: 125, low: 119, close: 123.45, adjustedClose: 123.45, volume: 1000 }] }
          return Promise.resolve({ ok: true, revision: 0, result: { items: [{ data }] } })
        }
        return executeFinanceRequest(host.finance, request as FinanceRequest)
      },
    }
    const workbench = new WorkbenchStore({ request: request => executeGraphRequest(host.graph, request) }, t)
    await workbench.load()
    const store = new FinanceStore(gateway, t, () => workbench.load())
    await store.load()
    expect(await store.fetchQuote('AAPL', '2026-01-10T00:00:00Z')).toBe(true)
    expect(await store.fetchHistory({ symbol: 'AAPL', range: '5d', interval: '1h' })).toBe(true)
    const submitted = store.getSnapshot().market
    const quoteResult = financeOperation(store.getSnapshot(), 'quote').result
    const historyResult = financeOperation(store.getSnapshot(), 'history').result

    const apple = workbench.getSnapshot().nodes.find(node => node.id === 'instrument:aapl')
    expect(apple).toBeDefined()
    const beforeRevision = workbench.getSnapshot().revision
    expect(await store.setInstrumentWatched(apple!, true, '2026-01-11T00:00:00Z')).toBe(true)
    expect(workbench.getSnapshot().revision).toBeGreaterThan(beforeRevision)
    expect(store.getSnapshot().market).toEqual(submitted)
    expect(financeOperation(store.getSnapshot(), 'quote').result).toBe(quoteResult)
    expect(financeOperation(store.getSnapshot(), 'history').result).toBe(historyResult)

    const financeRead = await host.finance.getNode('instrument:aapl')
    const graphRead = await host.graph.getNode('instrument:aapl')
    expect(financeRead.node).toEqual(graphRead)
    expect(graphRead).toMatchObject({
      title: 'Apple', content: 'AAPL',
      metadata: {
        symbol: 'AAPL', provider: 'fixture.market', watchlist: true,
        watchlistProvenance: { provider: 'dsh.client', operation: 'finance.graph.plan', updatedAt: '2026-01-11T00:00:00Z' },
      },
    })
    const plans = seen.filter(request => request.op === 'graph.plan')
    expect(plans).toHaveLength(1)
    expect(plans[0]).not.toHaveProperty('dryRun')
    expect(JSON.stringify(plans[0]?.plan)).not.toContain('dryRun')
    expect(plans[0]?.plan).toMatchObject({ nodes: [{ id: 'instrument:aapl', metadata: { watchlist: true } }] })

    const marketHtml = renderToString(createElement(MarketPanel, { store, t, nodes: workbench.getSnapshot().nodes }))
    const aside = /<aside[\s\S]*?<\/aside>/.exec(marketHtml)?.[0] ?? ''
    expect(aside).toContain('AAPL')
    expect(aside).not.toContain('MSFT')
    expect(marketHtml).not.toContain('data-stale="true"')

    const restartedHost = makeHost()
    const restartedSnapshot = await restartedHost.graph.snapshot()
    expect(restartedSnapshot.nodes.find(node => node.id === 'instrument:aapl')?.metadata.watchlist).toBe(true)
    const restartedStore = new FinanceStore({ request: request => executeFinanceRequest(restartedHost.finance, request as FinanceRequest) }, t)
    await restartedStore.load()
    const restartedHtml = renderToString(createElement(MarketPanel, { store: restartedStore, t, nodes: restartedSnapshot.nodes }))
    expect(restartedHtml).toContain('AAPL')
    expect(restartedHtml).not.toContain('No watched instruments')

    expect(await store.setInstrumentWatched(graphRead!, false, '2026-01-12T00:00:00Z')).toBe(true)
    expect((await host.graph.getNode('instrument:aapl'))?.metadata).toMatchObject({ watchlist: false, provider: 'fixture.market' })
    const secondRestart = makeHost()
    const afterRemoval = await secondRestart.graph.snapshot()
    expect(afterRemoval.nodes.find(node => node.id === 'instrument:aapl')?.metadata.watchlist).toBe(false)
    const removedStore = new FinanceStore({ request: request => executeFinanceRequest(secondRestart.finance, request as FinanceRequest) }, t)
    await removedStore.load()
    const removedHtml = renderToString(createElement(MarketPanel, { store: removedStore, t, nodes: afterRemoval.nodes }))
    expect(removedHtml).toContain('No watched instruments')
    expect(removedHtml).not.toContain('rg-market-watchlist-select')
    expect(seen.filter(request => request.op === 'graph.plan')).toHaveLength(2)
  })
})
