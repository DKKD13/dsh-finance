import { createElement } from 'react'
import { renderToString } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { WorkbenchStore } from '../../client/store.ts'
import { GraphCanvas } from '../../client/ui/GraphCanvas.tsx'

describe('graph label occupancy', () => {
  it('reserves the lifted hover label before deciding whether its neighbor can render', async () => {
    const nodes = ['selected', 'hovered', 'neighbor'].map(id => ({ id, kind: 'claim' as const, title: id, content: '', metadata: {}, createdAt: 0, updatedAt: 0 }))
    const edges = [{ id: 'qa-relation', from: 'hovered', to: 'neighbor', kind: 'references' as const, metadata: {}, createdAt: 0 }]
    const store = new WorkbenchStore({ request: async () => ({ ok: true, revision: 1, result: { revision: 1, nodes, edges } }) }, key => key)
    await store.refresh()
    store.setViewport({ x: 100, y: 100, zoom: 0.5 })
    store.moveNode('selected', { x: 0, y: 0 }, false)
    store.moveNode('hovered', { x: 0, y: 0 }, false)
    store.moveNode('neighbor', { x: 0, y: -84 }, false)
    store.select('selected')
    store.hover('hovered')
    const html = renderToString(createElement(GraphCanvas, { store, t: key => key }))
    expect(html).toMatch(/data-node="selected"[^>]*data-label="all"/)
    expect(html).toMatch(/data-node="hovered"[^>]*data-label="all"/)
    expect(html).toMatch(/data-node="neighbor"[^>]*data-label="false"/)
    expect(html).toContain('>selected</text>')
    expect(html).toContain('>hovered</text>')
    expect(html).not.toContain('>neighbor</text>')
  })

  it('omits overlapping non-pinned labels at high zoom instead of painting both', async () => {
    const nodes = ['selected', 'neighbor'].map(id => ({ id, kind: 'claim' as const, title: id, content: '', metadata: {}, createdAt: 0, updatedAt: 0 }))
    const store = new WorkbenchStore({ request: async () => ({ ok: true, revision: 1, result: { revision: 1, nodes, edges: [] } }) }, key => key)
    await store.refresh()
    store.setViewport({ x: 100, y: 100, zoom: 1 })
    store.moveNode('selected', { x: 0, y: 0 }, false)
    store.moveNode('neighbor', { x: 0, y: 0 }, false)
    store.select('selected')
    const html = renderToString(createElement(GraphCanvas, { store, t: key => key }))
    expect(html).toMatch(/data-node="selected"[^>]*data-label="all"/)
    expect(html).toMatch(/data-node="neighbor"[^>]*data-label="false"/)
    expect(html).toContain('>selected</text>')
    expect(html).not.toContain('>neighbor</text>')
  })
})
