/**
 * The interactive graph canvas: an SVG map with pan (background drag), zoom
 * (wheel, buttons), node drag with layout pinning, click-to-select, neighbor
 * highlight on hover/selection, and edge click for the relation popover.
 * All geometry math lives in `../layout.ts`; this component only wires
 * pointer intent to store actions.
 * @module deepseek-harness-finance-plugin/client/ui/GraphCanvas
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { PointerEvent as ReactPointerEvent, KeyboardEvent as ReactKeyboardEvent } from 'react'
import type { GraphEdge, GraphNode } from '../../src/graph.ts'
import { centerViewport, collidingLabels, estimateLabelBox, fitViewport, neighborsOf, pinnedLabelLift, screenToWorld, worldToScreen, zoomAt } from '../layout.ts'
import type { LabelBox } from '../layout.ts'
import { visibleEdges, visibleNodes } from '../store.ts'
import { shortTitle, useWorkbench } from './common.ts'
import { FinanceKindIcon } from './FinanceCommon.tsx'
import type { ViewProps } from './common.ts'

/** Radius of a node dot on screen, in pixels. */
const NODE_RADIUS = 8

/** Canvas control icons, drawn in one 1.5px stroke (the shell's icon grammar). */
function CanvasIcon({ variant }: { readonly variant: 'in' | 'out' | 'fit' | 'reset' }) {
  const common = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.5, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const }
  return (
    <svg width={16} height={16} viewBox="0 0 16 16" aria-hidden>
      {variant === 'in' && (<g {...common}><circle cx="7" cy="7" r="4.5" /><path d="M10.2 10.2 13.5 13.5 M7 5v4 M5 7h4" /></g>)}
      {variant === 'out' && (<g {...common}><circle cx="7" cy="7" r="4.5" /><path d="M10.2 10.2 13.5 13.5 M5 7h4" /></g>)}
      {variant === 'fit' && (<g {...common}><path d="M2.5 5.5v-3h3 M10.5 2.5h3v3 M13.5 10.5v3h-3 M5.5 13.5h-3v-3" /><circle cx="8" cy="8" r="1.6" /></g>)}
      {variant === 'reset' && (<g {...common}><path d="M13 8a5 5 0 1 1-1.5-3.6 M13 2.6v2.6h-2.6" /></g>)}
    </svg>
  )
}

interface DragState {
  readonly kind: 'pan' | 'node' | 'maybe-node'
  readonly pointerId: number
  readonly startX: number
  readonly startY: number
  readonly nodeId?: string
  moved: boolean
}

/** Group parallel edges (same unordered endpoints) so each can arc apart. */
function edgeCurvatures(edges: readonly GraphEdge[]): Map<string, number> {
  const groups = new Map<string, GraphEdge[]>()
  for (const edge of edges) {
    const key = [edge.from, edge.to].sort().join(' ')
    const group = groups.get(key) ?? []
    group.push(edge)
    groups.set(key, group)
  }
  const curvature = new Map<string, number>()
  for (const group of groups.values()) {
    group.sort((left, right) => left.id < right.id ? -1 : 1)
    group.forEach((edge, index) => {
      curvature.set(edge.id, (index - (group.length - 1) / 2) * 26)
    })
  }
  return curvature
}

/** Path for one edge, bowed by its curvature around the midpoint. */
function edgePath(a: { x: number; y: number }, b: { x: number; y: number }, curve: number): string {
  if (curve === 0) return `M ${a.x} ${a.y} L ${b.x} ${b.y}`
  const mx = (a.x + b.x) / 2
  const my = (a.y + b.y) / 2
  const dx = b.x - a.x
  const dy = b.y - a.y
  const length = Math.max(Math.hypot(dx, dy), 0.01)
  return `M ${a.x} ${a.y} Q ${mx - dy / length * curve} ${my + dx / length * curve} ${b.x} ${b.y}`
}

/** A point along the edge path, used for arrowheads and labels. */
function edgePoint(a: { x: number; y: number }, b: { x: number; y: number }, curve: number, ratio: number): { x: number; y: number; angle: number } {
  const mx = (a.x + b.x) / 2
  const my = (a.y + b.y) / 2
  const dx = b.x - a.x
  const dy = b.y - a.y
  const length = Math.max(Math.hypot(dx, dy), 0.01)
  const qx = mx - dy / length * curve
  const qy = my + dx / length * curve
  const t = ratio
  const x = (1 - t) * (1 - t) * a.x + 2 * (1 - t) * t * qx + t * t * b.x
  const y = (1 - t) * (1 - t) * a.y + 2 * (1 - t) * t * qy + t * t * b.y
  const tangentX = 2 * (1 - t) * (qx - a.x) + 2 * t * (b.x - qx)
  const tangentY = 2 * (1 - t) * (qy - a.y) + 2 * t * (b.y - qy)
  return { x, y, angle: Math.atan2(tangentY, tangentX) }
}

/** The canvas plus its floating controls and edge popover. */
export function GraphCanvas({ store, t }: ViewProps) {
  const state = useWorkbench(store)
  const wrapRef = useRef<HTMLDivElement | null>(null)
  const svgRef = useRef<SVGSVGElement | null>(null)
  const dragRef = useRef<DragState | null>(null)
  const [size, setSize] = useState({ width: 0, height: 0 })
  const [panning, setPanning] = useState(false)
  const [focusedNodeId, setFocusedNodeId] = useState<string | null>(null)
  const fittedOnce = useRef(false)
  const handledFocus = useRef(0)

  const { positions, viewport } = state
  const nodes = useMemo(() => visibleNodes(state), [state])
  const edges = useMemo(() => visibleEdges(state, nodes), [state, nodes])
  const positioned = useMemo(
    () => nodes.filter(node => positionsOf(state.positions, node.id) !== undefined),
    [nodes, state.positions],
  )
  const visiblePositions = useMemo(() => {
    const result: Record<string, { x: number; y: number }> = {}
    for (const node of positioned) {
      const point = positionsOf(state.positions, node.id)
      if (point !== undefined) result[node.id] = point
    }
    return result
  }, [positioned, state.positions])
  const curvature = useMemo(() => edgeCurvatures(edges), [edges])
  const nodeById = useMemo(() => new Map(state.nodes.map(node => [node.id, node])), [state.nodes])
  const activeNodeId = positioned.some(node => node.id === focusedNodeId) ? focusedNodeId
    : positioned.some(node => node.id === state.selectedId) ? state.selectedId : positioned[0]?.id
  const focusNode = useCallback((id: string) => {
    setFocusedNodeId(id)
    const target = [...(svgRef.current?.querySelectorAll<SVGGElement>('[data-node]') ?? [])].find(node => node.dataset.node === id)
    target?.focus()
  }, [])
  useEffect(() => {
    setFocusedNodeId(state.selectedId)
    if (state.selectedId !== null && wrapRef.current?.contains(document.activeElement) === true) focusNode(state.selectedId)
  }, [state.selectedId, focusNode])

  // Neighbor emphasis: the hovered node wins, then the selection.
  const emphasis = state.hoveredId ?? state.selectedId
  const highlighted = useMemo(() => {
    if (emphasis === null) return null
    const set = neighborsOf(edges, emphasis)
    set.add(emphasis)
    return set
  }, [edges, emphasis])

  // Label modes per node; neighbor labels yield to collision in screen space so
  // a fit graph with one selected node does not stack unreadable titles.
  const labelFont = size.width < 720 ? 10 : 11
  const labelLimit = size.width < 720 ? 12 : 18
  const labelModes = useMemo(() => {
    const modes = new Map<string, 'all' | 'neighbors' | 'false'>()
    for (const node of positioned) {
      const pinned = node.id === state.selectedId || state.hoveredId === node.id
      modes.set(node.id, pinned ? 'all' : viewport.zoom >= .85 || highlighted?.has(node.id) === true ? 'neighbors' : 'false')
    }
    return modes
  }, [positioned, state.selectedId, state.hoveredId, highlighted, viewport.zoom])
  const labelLayout = useMemo(() => {
    const placements: { readonly id: string; readonly priority: number; readonly box: LabelBox }[] = []
    for (const node of positioned) {
      const mode = labelModes.get(node.id)
      if (mode === undefined || mode === 'false') continue
      const point = positionsOf(state.positions, node.id)
      if (point === undefined) continue
      const screen = worldToScreen(viewport, point)
      placements.push({
        id: node.id,
        priority: node.id === state.selectedId || state.hoveredId === node.id ? 1 : 0,
        box: estimateLabelBox({ x: screen.x, y: screen.y + NODE_RADIUS + 13 }, shortTitle(node.title, labelLimit), labelFont),
      })
    }
    // Both pinned labels always render; lift the hovered one above its node
    // when the two pinned boxes overlap so neither is unreadable.
    const lift = pinnedLabelLift(placements, state.selectedId, state.hoveredId, -(NODE_RADIUS + 13) * 2)
    const hidden = collidingLabels(placements.map(placement => ({
      ...placement,
      box: { ...placement.box, y: placement.box.y + (lift.get(placement.id) ?? 0) },
    })))
    return { hidden, lift }
  }, [positioned, labelModes, state.positions, state.selectedId, state.hoveredId, viewport, labelLimit, labelFont])
  const hiddenLabels = labelLayout.hidden
  const labelLift = labelLayout.lift

  // Track the canvas box for fit and zoom anchoring.
  useEffect(() => {
    const wrap = wrapRef.current
    if (wrap === null) return
    const observer = new ResizeObserver(() => {
      const box = wrap.getBoundingClientRect()
      setSize({ width: box.width, height: box.height })
    })
    observer.observe(wrap)
    return () => { observer.disconnect() }
  }, [])

  // Fit once: the first ready load with positioned nodes frames the graph.
  useEffect(() => {
    if (fittedOnce.current || state.phase !== 'ready' || size.width === 0 || positioned.length === 0) return
    fittedOnce.current = true
    store.setViewport(fitViewport(visiblePositions, size.width, size.height))
  }, [state.phase, visiblePositions, positioned.length, size, store])

  useEffect(() => {
    const request = state.focusRequest
    if (!request || request.requestId === handledFocus.current || size.width === 0 || size.height === 0) return
    const point = positions[request.nodeId]
    if (!point) return
    handledFocus.current = request.requestId
    store.setViewport(centerViewport(point, size.width, size.height))
    focusNode(request.nodeId)
  }, [state.focusRequest, positions, size, store, focusNode])

  // Wheel zoom needs a non-passive listener to prevent page scroll.
  useEffect(() => {
    const svg = svgRef.current
    if (svg === null) return
    const onWheel = (event: WheelEvent) => {
      event.preventDefault()
      const box = svg.getBoundingClientRect()
      const factor = Math.pow(1.0018, -event.deltaY)
      const current = store.getSnapshot().viewport
      store.setViewport(zoomAt(current, factor, event.clientX - box.left, event.clientY - box.top))
    }
    svg.addEventListener('wheel', onWheel, { passive: false })
    return () => { svg.removeEventListener('wheel', onWheel) }
  }, [store])

  const onBackgroundDown = useCallback((event: ReactPointerEvent<SVGSVGElement>) => {
    if (event.button !== 0) return
    const target = event.target as Element
    if (target.closest('[data-node]') !== null || target.closest('[data-edge-hit]') !== null) return
    svgRef.current?.setPointerCapture(event.pointerId)
    dragRef.current = { kind: 'pan', pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, moved: false }
    setPanning(true)
  }, [])

  const onNodeDown = useCallback((event: ReactPointerEvent, id: string) => {
    if (event.button !== 0) return
    event.stopPropagation()
    svgRef.current?.setPointerCapture(event.pointerId)
    dragRef.current = { kind: 'maybe-node', pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, nodeId: id, moved: false }
  }, [])

  const onPointerMove = useCallback((event: ReactPointerEvent<SVGSVGElement>) => {
    const drag = dragRef.current
    if (drag === null || drag.pointerId !== event.pointerId) return
    const dx = event.clientX - drag.startX
    const dy = event.clientY - drag.startY
    if (!drag.moved && Math.hypot(dx, dy) < 4) return
    if (drag.kind === 'pan') {
      const current = store.getSnapshot().viewport
      store.setViewport({ ...current, x: current.x + event.movementX, y: current.y + event.movementY })
      drag.moved = true
      return
    }
    if (drag.kind === 'maybe-node') dragRef.current = { ...drag, kind: 'node', moved: true }
    const active = dragRef.current
    if (active?.kind === 'node' && active.nodeId !== undefined) {
      const svg = svgRef.current
      if (svg === null) return
      const box = svg.getBoundingClientRect()
      const world = screenToWorld(store.getSnapshot().viewport, event.clientX - box.left, event.clientY - box.top)
      store.moveNode(active.nodeId, world, false)
    }
  }, [store])

  const onPointerUp = useCallback((event: ReactPointerEvent<SVGSVGElement>) => {
    const drag = dragRef.current
    dragRef.current = null
    setPanning(false)
    if (drag === null || drag.pointerId !== event.pointerId) return
    if (drag.kind === 'pan' && !drag.moved) {
      store.select(null)
      store.selectEdge(null)
      return
    }
    if (drag.kind === 'node') store.persistLayout()
    if (drag.kind === 'maybe-node' && drag.nodeId !== undefined) store.select(drag.nodeId)
  }, [store])

  const onKeyDown = useCallback((event: ReactKeyboardEvent<HTMLDivElement>) => {
    const snapshot = store.getSnapshot()
    if (event.key === 'Escape') {
      store.select(null)
      store.selectEdge(null)
      return
    }
    if (event.key === '+' || event.key === '=') {
      store.setViewport(zoomAt(snapshot.viewport, 1.2, size.width / 2, size.height / 2))
      return
    }
    if (event.key === '-') {
      store.setViewport(zoomAt(snapshot.viewport, 1 / 1.2, size.width / 2, size.height / 2))
      return
    }
    if (event.key === '0') {
      store.setViewport(fitViewport(visiblePositions, size.width, size.height))
      return
    }
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp' || event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      const ordered = visibleNodes(snapshot).map(node => node.id).sort()
      if (ordered.length === 0) return
      event.preventDefault()
      const currentId = (event.target as Element).closest('[data-node]')?.getAttribute('data-node') ?? snapshot.selectedId
      const currentIndex = currentId === null ? -1 : ordered.indexOf(currentId)
      const step = event.key === 'ArrowDown' || event.key === 'ArrowRight' ? 1 : -1
      const nextIndex = currentIndex < 0 ? (step > 0 ? 0 : ordered.length - 1) : (currentIndex + step + ordered.length) % ordered.length
      const next = ordered[nextIndex]
      if (next !== undefined) {
        store.select(next)
        focusNode(next)
      }
    }
  }, [store, size, visiblePositions, focusNode])

  const selectedEdge = state.selectedEdgeId === null ? undefined : edges.find(edge => edge.id === state.selectedEdgeId)
  const selectedEdgeScreen = selectedEdge === undefined ? undefined : (() => {
    const from = positionsOf(positions, selectedEdge.from)
    const to = positionsOf(positions, selectedEdge.to)
    if (from === undefined || to === undefined) return undefined
    const mid = edgePoint(from, to, curvature.get(selectedEdge.id) ?? 0, 0.5)
    return worldToScreen(viewport, { x: mid.x, y: mid.y })
  })()

  const inverseZoom = 1 / viewport.zoom

  return (
    <div ref={wrapRef} className="rg-canvas-wrap" tabIndex={0} role="application" aria-label={t('header.title')} onKeyDown={onKeyDown}>
      <svg
        ref={svgRef}
        className="rg-canvas"
        data-panning={panning || undefined}
        onPointerDown={onBackgroundDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        <g transform={`translate(${viewport.x} ${viewport.y}) scale(${viewport.zoom})`}>
          {edges.map(edge => {
            const from = positionsOf(positions, edge.from)
            const to = positionsOf(positions, edge.to)
            if (from === undefined || to === undefined) return null
            const curve = curvature.get(edge.id) ?? 0
            const path = edgePath(from, to, curve)
            const isHighlight = highlighted !== null && (highlighted.has(edge.from) && highlighted.has(edge.to) && (edge.from === emphasis || edge.to === emphasis))
            const isSelected = state.selectedEdgeId === edge.id
            const dimmed = highlighted !== null && !isHighlight && !isSelected
            const arrow = edgePoint(from, to, curve, 1)
            const arrowSize = 7 * inverseZoom
            const tipX = arrow.x - Math.cos(arrow.angle) * (NODE_RADIUS + 4) * inverseZoom
            const tipY = arrow.y - Math.sin(arrow.angle) * (NODE_RADIUS + 4) * inverseZoom
            const left = arrow.angle + Math.PI * 0.82
            const right = arrow.angle - Math.PI * 0.82
            return (
              <g key={edge.id}>
                <path
                  className="rg-edge"
                  d={path}
                  data-dimmed={dimmed || undefined}
                  data-highlight={isHighlight || undefined}
                  data-selected={isSelected || undefined}
                  style={{ '--rg-edge-color': `var(--rg-edge-${edge.kind})` } as Record<string, string>}
                  vectorEffect="non-scaling-stroke"
                />
                <path
                  className="rg-edge-hit"
                  data-edge-hit={edge.id}
                  d={path}
                  onPointerDown={event => { event.stopPropagation() }}
                  onClick={event => { event.stopPropagation(); store.selectEdge(edge.id) }}
                />
                <polygon
                  points={`${tipX},${tipY} ${tipX + Math.cos(left) * arrowSize},${tipY + Math.sin(left) * arrowSize} ${tipX + Math.cos(right) * arrowSize},${tipY + Math.sin(right) * arrowSize}`}
                  fill={`var(--rg-edge-${edge.kind}, var(--dsw-alias-border-l3))`}
                  opacity={dimmed ? 0.18 : 1}
                  pointerEvents="none"
                />
                {(isHighlight || isSelected) && (
                  <text className="rg-edge-label" x={edgePoint(from, to, curve, 0.5).x} y={edgePoint(from, to, curve, 0.5).y - 6 * inverseZoom} fontSize={10 * inverseZoom}>
                    {t(`edge.${edge.kind}`)}
                  </text>
                )}
              </g>
            )
          })}
          {positioned.map(node => {
            const point = positionsOf(positions, node.id)
            if (point === undefined) return null
            const isSelected = state.selectedId === node.id
            const isHighlight = highlighted !== null && highlighted.has(node.id)
            const dimmed = highlighted !== null && !isHighlight
            const showLabel = labelModes.get(node.id) === 'all'
              || labelModes.get(node.id) === 'neighbors' && !hiddenLabels.has(node.id)
            return (
              <g
                key={node.id}
                className="rg-node"
                data-node={node.id}
                data-dimmed={dimmed || undefined}
                data-highlight={isHighlight && !isSelected || undefined}
                data-label={labelModes.get(node.id) === 'neighbors' && hiddenLabels.has(node.id) ? 'false' : labelModes.get(node.id) ?? 'false'}
                transform={`translate(${point.x} ${point.y}) scale(${inverseZoom})`}
                tabIndex={activeNodeId === node.id ? 0 : -1}
                role="button"
                aria-label={node.title}
                aria-pressed={isSelected}
                onFocus={() => { setFocusedNodeId(node.id) }}
                onPointerDown={event => { focusNode(node.id); onNodeDown(event, node.id) }}
                onPointerEnter={() => { store.hover(node.id) }}
                onPointerLeave={() => { store.hover(null) }}
                onKeyDown={event => {
                  if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); store.select(node.id) }
                }}
              >
                {isSelected && <circle className="rg-node-ring" r={NODE_RADIUS + 4.5} />}
                <circle className="rg-node-hit" r={18} />
                <circle
                  className="rg-node-dot"
                  r={NODE_RADIUS}
                  style={{ '--rg-node-color': `var(--rg-kind-${node.kind})` } as Record<string, string>}
                />
                <g className="rg-node-finance-icon" transform="translate(-5.5 -5.5)"><FinanceKindIcon kind={node.kind} size={11} /></g>
                {showLabel && <text y={NODE_RADIUS + 13 + (labelLift.get(node.id) ?? 0)} fontSize={size.width < 720 ? 10 : 11}>{shortTitle(node.title, size.width < 720 ? 12 : 18)}</text>}
              </g>
            )
          })}
        </g>
      </svg>
      {positioned.length === 0 && state.phase === 'ready' && (
        <div className="rg-empty-canvas">{t(state.nodes.length === 0 ? 'canvas.emptyGraph' : 'canvas.empty')}</div>
      )}
      <div className="rg-canvas-controls">
        <button type="button" className="rg-icon-btn" aria-label={t('canvas.zoomIn')} onClick={() => {
          store.setViewport(zoomAt(viewport, 1.25, size.width / 2, size.height / 2))
        }}><CanvasIcon variant="in" /></button>
        <button type="button" className="rg-icon-btn" aria-label={t('canvas.zoomOut')} onClick={() => {
          store.setViewport(zoomAt(viewport, 1 / 1.25, size.width / 2, size.height / 2))
        }}><CanvasIcon variant="out" /></button>
        <button type="button" className="rg-icon-btn" aria-label={t('canvas.fit')} onClick={() => {
          store.setViewport(fitViewport(visiblePositions, size.width, size.height))
        }}><CanvasIcon variant="fit" /></button>
        <button type="button" className="rg-icon-btn" aria-label={t('canvas.resetLayout')} onClick={() => { store.resetLayout() }}><CanvasIcon variant="reset" /></button>
      </div>
      {selectedEdge !== undefined && selectedEdgeScreen !== undefined && (
        <div
          className="rg-edge-popover"
          style={{ left: selectedEdgeScreen.x, top: selectedEdgeScreen.y - 12, transform: 'translate(-50%, -100%)' }}
        >
          <span className="rg-edge-kind">{t(`edge.${selectedEdge.kind}`)}</span>
          <span>{nodeTitle(nodeById, selectedEdge.from)} → {nodeTitle(nodeById, selectedEdge.to)}</span>
          <button type="button" className="rg-btn" data-danger onClick={() => { void store.removeEdge(selectedEdge.id) }}>
            {t('edge.remove')}
          </button>
        </div>
      )}
    </div>
  )
}

function positionsOf(positions: Readonly<Record<string, { x: number; y: number }>>, id: string): { x: number; y: number } | undefined {
  return positions[id]
}

function nodeTitle(nodes: ReadonlyMap<string, GraphNode>, id: string): string {
  return nodes.get(id)?.title ?? id
}
