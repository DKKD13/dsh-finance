/** Layout tests: deterministic placement, pinned anchors, viewport math. */
import { describe, expect, it, vi } from 'vitest'
import { computeLayout, fitViewport, neighborsOf, panBy, screenToWorld, worldToScreen, zoomAt } from '../../client/layout.ts'
import type { GraphEdge, GraphNode } from '../../src/graph.ts'

function node(id: string): GraphNode {
  return { id, kind: 'claim', title: id, content: '', metadata: {}, createdAt: 0, updatedAt: 0 }
}

function edge(from: string, to: string): GraphEdge {
  return { id: `references:${from}→${to}`, from, to, kind: 'references', metadata: {}, createdAt: 0 }
}

describe('layout', () => {
  it('places every node and is fully deterministic', () => {
    const nodes = [node('b'), node('a'), node('c'), node('d')]
    const edges = [edge('a', 'b'), edge('b', 'c')]
    const first = computeLayout(nodes, edges)
    const second = computeLayout(nodes, edges)
    expect(first).toEqual(second)
    for (const n of nodes) expect(first[n.id]).toBeDefined()
  })

  it('keeps pinned positions and anchors new nodes around them', () => {
    const nodes = [node('a'), node('b')]
    const laid = computeLayout(nodes, [edge('a', 'b')], { a: { x: 1000, y: -400 } })
    expect(laid['a']).toEqual({ x: 1000, y: -400 })
    const b = laid['b']
    expect(b).toBeDefined()
    // The anchored node pulls its neighbor closer than the seeding ring's origin distance.
    expect(Math.hypot((b?.x ?? 0) - 1000, (b?.y ?? -400) + 400)).toBeLessThan(600)
  })

  it('returns 1000 anchored nodes without entering force relaxation', () => {
    const nodes = Array.from({ length: 1000 }, (_, index) => node(`n${index.toString().padStart(4, '0')}`))
    const pinned = Object.fromEntries(nodes.map((n, index) => [n.id, { x: index * 3, y: (index % 37) * 11 }]))
    const hypot = vi.spyOn(Math, 'hypot')
    try {
      const laid = computeLayout(nodes, [], { ...pinned, ghost: { x: -1, y: -1 } })
      expect(laid).toEqual(pinned)
      expect(hypot).not.toHaveBeenCalled()
    } finally {
      hypot.mockRestore()
    }
  })

  it('computes neighbors in both directions', () => {
    const edges = [edge('a', 'b'), edge('c', 'b')]
    expect(neighborsOf(edges, 'b')).toEqual(new Set(['a', 'c']))
    expect(neighborsOf(edges, 'a')).toEqual(new Set(['b']))
    expect(neighborsOf(edges, 'z')).toEqual(new Set())
  })

  it('zooms around a screen anchor without moving the world point under it', () => {
    const viewport = { x: 40, y: -20, zoom: 1 }
    const anchor = { x: 300, y: 200 }
    const before = screenToWorld(viewport, anchor.x, anchor.y)
    const zoomed = zoomAt(viewport, 1.5, anchor.x, anchor.y)
    const after = screenToWorld(zoomed, anchor.x, anchor.y)
    expect(after.x).toBeCloseTo(before.x, 6)
    expect(after.y).toBeCloseTo(before.y, 6)
    expect(zoomed.zoom).toBeCloseTo(1.5, 6)
  })

  it('clamps zoom and round-trips screen/world coordinates', () => {
    expect(zoomAt({ x: 0, y: 0, zoom: 3 }, 10, 0, 0).zoom).toBe(3)
    expect(zoomAt({ x: 0, y: 0, zoom: 0.25 }, 0.01, 0, 0).zoom).toBe(0.25)
    const viewport = panBy({ x: 0, y: 0, zoom: 2 }, 15, -25)
    const world = { x: 12.5, y: -7.5 }
    const screen = worldToScreen(viewport, world)
    const back = screenToWorld(viewport, screen.x, screen.y)
    expect(back.x).toBeCloseTo(world.x, 6)
    expect(back.y).toBeCloseTo(world.y, 6)
  })

  it('fits the node bounds into the viewport with padding', () => {
    const positions = { a: { x: 0, y: 0 }, b: { x: 400, y: 300 } }
    const fitted = fitViewport(positions, 800, 600, 60)
    const topLeft = worldToScreen(fitted, { x: 0, y: 0 })
    const bottomRight = worldToScreen(fitted, { x: 400, y: 300 })
    expect(topLeft.x).toBeGreaterThanOrEqual(59)
    expect(topLeft.y).toBeGreaterThanOrEqual(59)
    expect(bottomRight.x).toBeLessThanOrEqual(741)
    expect(bottomRight.y).toBeLessThanOrEqual(541)
    expect(fitViewport({}, 800, 600)).toEqual({ x: 400, y: 300, zoom: 1 })
  })
})
