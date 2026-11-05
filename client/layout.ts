/**
 * Graph geometry for the workbench canvas: a deterministic force layout that
 * preserves user-placed positions, viewport math for pan/zoom, and neighbor
 * computation. Pure and DOM-free so every rule is unit-testable.
 * @module deepseek-harness-finance-plugin/client/layout
 */

import type { GraphEdge, GraphNode } from '../src/graph.ts'

/** One point in world coordinates. */
export interface Point {
  readonly x: number
  readonly y: number
}

/** Canvas viewport: world-space origin at the screen's top-left plus zoom. */
export interface Viewport {
  readonly x: number
  readonly y: number
  readonly zoom: number
}

/** Zoom bounds. */
export const MIN_ZOOM = 0.25
export const MAX_ZOOM = 3

/** FNV-1a hash; the deterministic seed for placement. */
export function hashString(text: string): number {
  let hash = 0x811c9dc5
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index)
    hash = Math.imul(hash, 0x01000193)
  }
  return hash >>> 0
}

/** Ids adjacent to `id` through any edge, in either direction. */
export function neighborsOf(edges: readonly GraphEdge[], id: string): Set<string> {
  const neighbors = new Set<string>()
  for (const edge of edges) {
    if (edge.from === id) neighbors.add(edge.to)
    if (edge.to === id) neighbors.add(edge.from)
  }
  return neighbors
}

/** Degree (incident edge count) per node id. */
export function degreesOf(edges: readonly GraphEdge[]): Map<string, number> {
  const degrees = new Map<string, number>()
  for (const edge of edges) {
    degrees.set(edge.from, (degrees.get(edge.from) ?? 0) + 1)
    degrees.set(edge.to, (degrees.get(edge.to) ?? 0) + 1)
  }
  return degrees
}

interface MutablePoint {
  x: number
  y: number
}

/**
 * Compute node positions. Pinned positions (user-placed) are returned
 * unchanged and act as anchors; every other node is seeded on deterministic
 * concentric rings (hash-ordered, so reloads look identical) and relaxed with
 * a Fruchterman–Reingold pass whose iteration order is fully sorted — the
 * same graph always lands in the same arrangement.
 * @param nodes - graph nodes.
 * @param edges - graph edges.
 * @param pinned - positions that must survive (user drags, earlier sessions).
 * @param iterations - relaxation rounds.
 * @returns positions for every node id.
 */
export function computeLayout(
  nodes: readonly GraphNode[],
  edges: readonly GraphEdge[],
  pinned: Readonly<Record<string, Point>> = {},
  iterations = 120,
): Record<string, Point> {
  const sorted = [...nodes].sort((left, right) => left.id < right.id ? -1 : 1)
  const points = new Map<string, MutablePoint>()
  const anchored = new Set<string>()
  const free: string[] = []
  for (const node of sorted) {
    const held = pinned[node.id]
    if (held !== undefined) {
      points.set(node.id, { x: held.x, y: held.y })
      anchored.add(node.id)
    } else {
      free.push(node.id)
    }
  }
  // Seeding: rings around the centroid of anchored nodes (or the origin).
  let cx = 0
  let cy = 0
  if (anchored.size > 0) {
    for (const id of anchored) {
      const point = points.get(id)
      if (point !== undefined) { cx += point.x; cy += point.y }
    }
    cx /= anchored.size
    cy /= anchored.size
  }
  const seeded = [...free].sort((left, right) => hashString(left) - hashString(right))
  seeded.forEach((id, index) => {
    const ring = Math.floor(index / 12)
    const angle = (index % 12) / 12 * Math.PI * 2 + ring * 0.37
    const radius = 150 + ring * 110
    points.set(id, { x: cx + Math.cos(angle) * radius, y: cy + Math.sin(angle) * radius })
  })
  if (sorted.length === 0) return {}
  if (free.length === 0) {
    const result: Record<string, Point> = {}
    for (const [id, point] of points) result[id] = { x: Math.round(point.x), y: Math.round(point.y) }
    return result
  }

  const ideal = 130
  const ids = sorted.map(node => node.id)
  for (let round = 0; round < iterations; round += 1) {
    const temperature = 60 * (1 - round / iterations) + 1
    const delta = new Map<string, MutablePoint>(ids.map(id => [id, { x: 0, y: 0 }]))
    for (let a = 0; a < ids.length; a += 1) {
      const idA = ids[a] as string
      const pa = points.get(idA)
      if (pa === undefined) continue
      for (let b = a + 1; b < ids.length; b += 1) {
        const idB = ids[b] as string
        if (anchored.has(idA) && anchored.has(idB)) continue
        const pb = points.get(idB)
        if (pb === undefined) continue
        let dx = pa.x - pb.x
        let dy = pa.y - pb.y
        let distance = Math.hypot(dx, dy)
        if (distance < 0.01) {
          dx = (hashString(idA + idB) % 100) / 100 - 0.5
          dy = (hashString(idB + idA) % 100) / 100 - 0.5
          distance = Math.max(Math.hypot(dx, dy), 0.01)
        }
        const force = ideal * ideal / distance / distance
        const ux = dx / distance * force * 4
        const uy = dy / distance * force * 4
        const da = delta.get(idA)
        const db = delta.get(idB)
        if (da !== undefined) { da.x += ux; da.y += uy }
        if (db !== undefined) { db.x -= ux; db.y -= uy }
      }
    }
    for (const edge of edges) {
      if (anchored.has(edge.from) && anchored.has(edge.to)) continue
      const pa = points.get(edge.from)
      const pb = points.get(edge.to)
      if (pa === undefined || pb === undefined) continue
      const dx = pb.x - pa.x
      const dy = pb.y - pa.y
      const distance = Math.max(Math.hypot(dx, dy), 0.01)
      const force = distance / ideal * 0.06
      const ux = dx * force
      const uy = dy * force
      const da = delta.get(edge.from)
      const db = delta.get(edge.to)
      if (da !== undefined) { da.x += ux; da.y += uy }
      if (db !== undefined) { db.x -= ux; db.y -= uy }
    }
    for (const id of ids) {
      if (anchored.has(id)) continue
      const point = points.get(id)
      const d = delta.get(id)
      if (point === undefined || d === undefined) continue
      // Mild gravity keeps the cluster compact.
      d.x += (cx - point.x) * 0.008
      d.y += (cy - point.y) * 0.008
      const length = Math.hypot(d.x, d.y)
      if (length < 0.01) continue
      const step = Math.min(length, temperature)
      point.x += d.x / length * step
      point.y += d.y / length * step
    }
  }
  const result: Record<string, Point> = {}
  for (const [id, point] of points) result[id] = { x: Math.round(point.x), y: Math.round(point.y) }
  return result
}

/** Clamp a zoom factor into the admitted range. */
export function clampZoom(zoom: number): number {
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom))
}

/**
 * Zoom around one screen point: the world point under the cursor stays put.
 * @param viewport - current viewport.
 * @param factor - multiplicative zoom change.
 * @param px - screen x of the anchor.
 * @param py - screen y of the anchor.
 * @returns the next viewport.
 */
export function zoomAt(viewport: Viewport, factor: number, px: number, py: number): Viewport {
  const zoom = clampZoom(viewport.zoom * factor)
  const scale = zoom / viewport.zoom
  return { zoom, x: px - (px - viewport.x) * scale, y: py - (py - viewport.y) * scale }
}

/** Pan by a screen-space delta. */
export function panBy(viewport: Viewport, dx: number, dy: number): Viewport {
  return { ...viewport, x: viewport.x + dx, y: viewport.y + dy }
}

/** Convert a screen point to world coordinates. */
export function screenToWorld(viewport: Viewport, px: number, py: number): Point {
  return { x: (px - viewport.x) / viewport.zoom, y: (py - viewport.y) / viewport.zoom }
}

/** Convert a world point to screen coordinates. */
export function worldToScreen(viewport: Viewport, point: Point): Point {
  return { x: point.x * viewport.zoom + viewport.x, y: point.y * viewport.zoom + viewport.y }
}

/** Estimated on-screen box of one node label. Text is anchored at the origin's x and
 * centered horizontally (text-anchor: middle), so the box extends width/2 on both sides. */
export interface LabelBox {
  readonly x: number
  readonly y: number
  readonly width: number
  readonly height: number
}

/** One label candidate: lower priority labels yield first when boxes collide. */
export interface LabelPlacement {
  readonly id: string
  readonly priority: number
  readonly box: LabelBox
}

/**
 * Estimate a label's screen box from its (already truncated) title. CJK glyphs
 * are em-wide; Latin glyphs are roughly 0.56em. The box covers the glyph area
 * above and below the baseline origin.
 * @param origin - screen position of the text baseline origin (horizontal center of the label).
 * @param title - rendered label text.
 * @param fontSize - rendered font size in screen pixels.
 */
export function estimateLabelBox(origin: Point, title: string, fontSize: number): LabelBox {
  let width = 0
  for (const char of title) width += (char.codePointAt(0) ?? 0) > 0x2e7f ? fontSize : fontSize * 0.56
  return { x: origin.x - width / 2, y: origin.y - fontSize, width, height: fontSize * 1.2 }
}

/**
 * Selected and hovered labels are both pinned (never hidden by collision).
 * When their boxes overlap, both would render on top of each other; lift the
 * hovered label above its node so the selection stays put and both remain
 * readable. Neighbor labels are unaffected — they still yield via
 * {@link collidingLabels} — both pinned labels still render, so collision
 * hiding never applies to them.
 * @param placements - label candidates with screen-space boxes.
 * @param selectedId - pinned selection node id, if any.
 * @param hoveredId - pinned hover node id, if any.
 * @param lift - vertical screen-space offset applied to the hovered label.
 * @returns node ids mapped to their vertical label offset.
 */
export function pinnedLabelLift(
  placements: readonly LabelPlacement[],
  selectedId: string | null,
  hoveredId: string | null,
  lift: number,
): Map<string, number> {
  const offsets = new Map<string, number>()
  if (selectedId === null || hoveredId === null || selectedId === hoveredId) return offsets
  const selected = placements.find(placement => placement.id === selectedId)
  const hovered = placements.find(placement => placement.id === hoveredId)
  if (selected === undefined || hovered === undefined) return offsets
  const overlaps = selected.box.x < hovered.box.x + hovered.box.width && selected.box.x + selected.box.width > hovered.box.x
    && selected.box.y < hovered.box.y + hovered.box.height && selected.box.y + selected.box.height > hovered.box.y
  if (overlaps) offsets.set(hoveredId, lift)
  return offsets
}

/**
 * Greedy label placement in screen space: higher priority first, then input
 * order. A label is hidden when its padded box intersects an already kept box.
 * Selected/hovered labels always win over neighbor labels.
 * @param placements - label candidates with screen-space boxes.
 * @param padding - extra clearance required around every kept label.
 * @returns ids of labels that should not render.
 */
export function collidingLabels(placements: readonly LabelPlacement[], padding = 3): Set<string> {
  const hidden = new Set<string>()
  const kept: LabelBox[] = []
  const ordered = placements.map((placement, index) => ({ placement, index }))
    .sort((left, right) => right.placement.priority - left.placement.priority || left.index - right.index)
  for (const { placement } of ordered) {
    const box: LabelBox = {
      x: placement.box.x - padding,
      y: placement.box.y - padding,
      width: placement.box.width + padding * 2,
      height: placement.box.height + padding * 2,
    }
    const overlaps = kept.some(other => box.x < other.x + other.width && box.x + box.width > other.x
      && box.y < other.y + other.height && box.y + box.height > other.y)
    if (overlaps) hidden.add(placement.id)
    else kept.push(box)
  }
  return hidden
}

/**
 * Fit every positioned node into one box with padding.
 * @param positions - node positions.
 * @param width - screen width.
 * @param height - screen height.
 * @param padding - screen padding around the bounds.
 * @returns the viewport that frames the graph; identity zoom 1 for an empty graph.
 */
export function fitViewport(positions: Readonly<Record<string, Point>>, width: number, height: number, padding = 60): Viewport {
  const all = Object.values(positions)
  if (all.length === 0 || width <= 0 || height <= 0) return { x: width / 2, y: height / 2, zoom: 1 }
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  for (const point of all) {
    minX = Math.min(minX, point.x)
    minY = Math.min(minY, point.y)
    maxX = Math.max(maxX, point.x)
    maxY = Math.max(maxY, point.y)
  }
  const spanX = Math.max(maxX - minX, 1)
  const spanY = Math.max(maxY - minY, 1)
  const zoom = clampZoom(Math.min((width - padding * 2) / spanX, (height - padding * 2) / spanY))
  const worldCx = (minX + maxX) / 2
  const worldCy = (minY + maxY) / 2
  return { zoom, x: width / 2 - worldCx * zoom, y: height / 2 - worldCy * zoom }
}

/**
 * Center one world-space point in the canvas at a useful inspection zoom.
 * Keeping this geometry pure lets navigation entry points request a target
 * without duplicating DOM measurements or viewport math.
 * @param point - target point in world coordinates.
 * @param width - canvas width in screen pixels.
 * @param height - canvas height in screen pixels.
 * @param zoom - retained zoom when already close enough to inspect; raised to
 * 1.15 otherwise.
 * @returns viewport with the point at the canvas center.
 */
export function centerViewport(point: Point, width: number, height: number, zoom = 1.15): Viewport {
  const nextZoom = clampZoom(Math.max(zoom, 1.15))
  return {
    zoom: nextZoom,
    x: width / 2 - point.x * nextZoom,
    y: height / 2 - point.y * nextZoom,
  }
}
