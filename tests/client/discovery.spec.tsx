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
})
