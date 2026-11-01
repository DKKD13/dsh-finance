import { useEffect, useRef } from 'react'
import { drawPersonaArtwork } from './PersonaArtwork.ts'

interface Props {
  readonly name: string
  readonly persona: boolean
}

type Scene = 'calendar' | 'report' | 'research' | 'sources' | 'table' | 'memory' | 'scales' | 'graph' | 'market' | 'plan' | 'portfolio' | 'review' | 'product' | 'book' | 'video' | 'valuation' | 'office'
const SCENES: Readonly<Record<string, Scene>> = {
  'catalyst-calendar': 'calendar', 'daily-digest': 'report', 'deep-research': 'research',
  'equity-earnings': 'calendar', 'finance-source-ingest': 'sources', 'financial-data-rigor': 'table',
  'flex-memory': 'memory', 'hypothesis-thinking': 'scales', 'knowledge-compiler': 'graph',
  'market-watch': 'market', 'planning-with-files': 'plan', 'portfolio-allocation': 'portfolio',
  'portfolio-weekly': 'review', 'product-review': 'product', 'report-digest': 'book',
  'research': 'research', 'thesis-drift': 'review', 'valuation-model': 'valuation',
  'video-deep-reader': 'video', 'virtual-fund': 'office', 'visualizer': 'market', 'wiki-think': 'graph',
}

// A small, static illustration of the work, never a chart of actual results.
function drawArtwork(ctx: CanvasRenderingContext2D, name: string, persona: boolean) {
  if (persona || name === 'huashu-nuwa') { drawPersonaArtwork(ctx, name); return }
  const ink = '#263744', blue = '#5578bd', light = '#dbe5f6', paper = '#fffdf7'
  const mute = '#aab6c0', shadow = '#d4d7d8', green = '#71988b'
  const scene = Object.prototype.hasOwnProperty.call(SCENES, name) ? SCENES[name]! : 'report'
  const rect = (x: number, y: number, w: number, h: number, fill: string) => { ctx.fillStyle = fill; ctx.fillRect(x, y, w, h) }
  const box = (x: number, y: number, w: number, h: number, fill: string, border = ink) => {
    rect(x, y, w, h, border); rect(x + 2, y + 2, w - 4, h - 4, fill)
  }
  const line = (x: number, y: number, endX: number, endY: number, fill = ink, size = 2) => {
    const dx = Math.abs(endX - x), dy = -Math.abs(endY - y)
    const sx = x < endX ? 1 : -1, sy = y < endY ? 1 : -1
    let error = dx + dy
    for (;;) {
      rect(x, y, size, size, fill)
      if (x === endX && y === endY) break
      const twice = error * 2
      if (twice >= dy) { error += dy; x += sx }
      if (twice <= dx) { error += dx; y += sy }
    }
  }
  const textLines = (x: number, y: number, width: number, count = 3) => {
    for (let i = 0; i < count; i++) rect(x, y + i * 7, width - (i === count - 1 ? 12 : i % 2 * 5), 2, mute)
  }
  const sheet = (x: number, y: number, w = 68, h = 75) => {
    rect(x + 5, y + 5, w, h, shadow); box(x, y, w, h, paper)
    rect(x + 9, y + 10, 20, 3, blue)
  }
  const plant = () => {
    rect(193, 84, 17, 13, '#b9b6ac'); rect(195, 97, 13, 3, '#96988f')
    line(201, 84, 201, 66, green); rect(192, 70, 9, 5, green); rect(202, 63, 8, 7, green)
    rect(186, 66, 8, 4, '#96b1a3'); rect(206, 57, 5, 7, '#96b1a3')
  }
  const chart = (x: number, y: number, w = 56, h = 32) => {
    line(x, y + h, x + w, y + h, mute, 1)
    const points = [[0, 26], [8, 22], [16, 24], [24, 12], [32, 16], [40, 7], [48, 10], [56, 2]] as const
    points.slice(1).forEach((point, i) => {
      const last = points[i]!
      line(x + Math.round(last[0] / 56 * w), y + Math.round(last[1] / 32 * h), x + Math.round(point[0] / 56 * w), y + Math.round(point[1] / 32 * h), blue)
    })
  }
  const monitor = (x: number, y: number, w = 82, h = 56) => {
    rect(x + 4, y + 4, w, h, shadow); box(x, y, w, h, ink)
    rect(x + 4, y + 4, w - 8, h - 12, '#edf2fa'); rect(x + w / 2 - 4, y + h, 8, 11, ink)
    rect(x + w / 2 - 18, y + h + 10, 36, 3, ink)
  }
  ctx.clearRect(0, 0, 240, 126)
  rect(0, 0, 240, 126, ['sources', 'memory', 'book'].includes(scene) ? '#eef2ed' : ['calendar', 'scales', 'review'].includes(scene) ? '#f3efe6' : '#eef1f7')
  rect(21, 105, 198, 2, '#d7dbdf'); rect(40, 107, 167, 6, '#e0e3e5')
  switch (scene) {
    case 'calendar':
      sheet(50, 21, 91, 77); rect(52, 23, 87, 15, blue)
      for (let row = 0; row < 3; row++) for (let col = 0; col < 4; col++) rect(61 + col * 19, 46 + row * 14, 9, 6, row === 1 && col === 2 ? blue : light)
      rect(67, 16, 4, 11, ink); rect(120, 16, 4, 11, ink)
      box(153, 61, 28, 38, paper); rect(158, 68, 18, 3, blue); textLines(158, 78, 17, 2); plant()
      break
    case 'report': case 'plan':
      sheet(65, 24, 83, 72); sheet(80, 15, 83, 80)
      rect(91, 37, 59, 3, ink); textLines(91, 48, 58, 3)
      if (scene === 'plan') for (let i = 0; i < 3; i++) { box(91, 72 + i * 6, 4, 4, light, blue); rect(101, 73 + i * 6, 35, 2, mute) }
      else chart(91, 72, 52, 15)
      box(43, 70, 23, 27, light); rect(48, 76, 13, 3, blue); plant()
      break
    case 'research':
      sheet(58, 20, 89, 78); rect(69, 41, 45, 3, ink); textLines(69, 52, 61, 3); chart(69, 77, 54, 13)
      box(139, 38, 35, 35, ink); box(143, 42, 27, 27, light, paper); rect(148, 48, 15, 3, blue)
      line(168, 70, 188, 92, ink, 7); plant()
      break
    case 'sources': case 'memory':
      sheet(76, 19, 76, 59); sheet(86, 27, 76, 59); textLines(97, 48, 51, 3)
      box(50, 68, 111, 31, '#b7cbbf'); rect(50, 60, 43, 10, ink); rect(52, 62, 39, 8, '#b7cbbf')
      rect(64, 78, 37, 13, paper); rect(71, 82, 23, 3, green)
      if (scene === 'memory') { box(166, 58, 25, 41, paper); textLines(172, 67, 15, 3) }
      plant(); break
    case 'table': case 'portfolio': case 'valuation':
      monitor(45, 21, 112, 64); rect(50, 26, 102, 9, blue)
      for (let row = 0; row < 4; row++) for (let col = 0; col < 4; col++) rect(51 + col * 25, 40 + row * 8, 21, 5, col === 3 ? '#b5c8ed' : '#dce3eb')
      if (scene === 'valuation') chart(65, 44, 69, 23)
      if (scene === 'portfolio') { rect(163, 70, 10, 27, blue); rect(176, 57, 10, 40, '#8ba5d3'); rect(189, 80, 10, 17, '#b5c8ed') }
      else { sheet(168, 63, 33, 35); textLines(174, 81, 19, 2) }
      rect(63, 102, 79, 3, mute); break
    case 'market': case 'office': case 'product': case 'video':
      monitor(49, 27, 109, 62)
      if (scene === 'video') { rect(60, 38, 87, 35, light); for (let i = 0; i < 10; i++) rect(94 + i, Math.floor(44 + i / 2), 2, 24 - i * 2, blue) }
      else if (scene === 'product') { rect(55, 33, 97, 10, blue); rect(55, 46, 24, 28, light); textLines(86, 49, 53, 4) }
      else { rect(57, 35, 22, 39, light); textLines(62, 42, 13, 3); chart(86, 40, 60, 31) }
      if (scene === 'office') { monitor(165, 54, 39, 29); rect(176, 62, 17, 12, blue) }
      else plant()
      rect(61, 104, 91, 3, mute); break
    case 'scales':
      sheet(62, 26, 38, 66); textLines(69, 49, 24, 3); sheet(144, 26, 38, 66); textLines(151, 49, 24, 3)
      rect(118, 29, 4, 62, ink); rect(106, 94, 29, 4, ink); rect(84, 35, 73, 3, ink)
      line(88, 39, 76, 67, blue); line(88, 39, 101, 67, blue); rect(75, 68, 29, 5, blue)
      line(155, 39, 143, 61, green); line(155, 39, 167, 61, green); rect(142, 62, 28, 5, green); break
    case 'graph':
      line(88, 41, 126, 69, mute); line(88, 87, 126, 69, mute); line(126, 69, 167, 39, mute); line(126, 69, 177, 89, mute)
      sheet(54, 23, 42, 35); textLines(61, 41, 27, 2); sheet(54, 69, 42, 32); textLines(61, 86, 27, 2)
      box(113, 56, 28, 28, blue); box(158, 24, 36, 30, paper); box(160, 78, 36, 25, paper)
      rect(119, 63, 15, 3, paper); rect(119, 71, 10, 3, paper); break
    case 'review':
      sheet(51, 26, 74, 69); chart(61, 48, 53, 28); textLines(61, 83, 48, 1)
      sheet(134, 19, 53, 77); for (let i = 0; i < 4; i++) { box(143, 42 + i * 11, 7, 7, light, blue); rect(156, 44 + i * 11, 20, 2, mute) }
      line(118, 39, 136, 39, blue); line(131, 34, 136, 39, blue); line(131, 44, 136, 39, blue); break
    case 'book':
      box(51, 33, 70, 65, paper); box(121, 27, 70, 71, paper); rect(119, 30, 4, 68, shadow)
      textLines(61, 46, 49, 6); textLines(133, 41, 47, 3); chart(133, 68, 44, 20); rect(166, 28, 7, 22, blue); break
  }
}

export function SkillArtwork({ name, persona }: Props) {
  const canvas = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const context = canvas.current?.getContext('2d')
    if (context) { context.imageSmoothingEnabled = false; drawArtwork(context, name, persona) }
  }, [name, persona])
  return <canvas ref={canvas} className="rg-skill-art" width={240} height={126} aria-hidden="true" />
}
