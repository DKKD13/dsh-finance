import { useState } from 'react'
import type { KeyboardEvent as ReactKeyboardEvent } from 'react'
import { MarkdownText } from '@deepseek-ai/dsh-client-ui-primitives'
import type { MarkdownLabels } from '@deepseek-ai/dsh-client-ui-primitives'
import type { GraphNode } from '../../src/graph.ts'
import { nextChartIndex } from '../chart-data.ts'
import { protectReportCurrency } from '../report-markdown.ts'
import { AssetLogo } from './AssetLogo.tsx'

export interface VirtualFundOverviewProps {
  readonly locale: string
  readonly onOpenOffice: () => void
  readonly onOpenSeat: (id: string) => void
  readonly fund?: GraphNode | undefined
  readonly snapshots?: readonly GraphNode[] | undefined
  readonly events?: readonly GraphNode[] | undefined
  readonly researchers?: readonly GraphNode[] | undefined
  readonly onAdvance?: (() => void) | undefined
  readonly holdingsOnly?: boolean | undefined
}

type Range = '1M' | '3M' | '1Y' | 'ALL'

interface VirtualFundInfo {
  readonly initialCash: number | null
  readonly currency: string | null
  readonly startingAt: string | null
}

interface FundPosition {
  readonly symbol: string
  readonly quantity: number
  readonly price: number
  readonly value: number
}

interface FundSnapshot {
  readonly id: string
  readonly asOf: string
  readonly timestamp: number
  readonly nav: number
  readonly cash: number
  readonly positions: readonly FundPosition[]
  readonly sourceIds: readonly string[]
  readonly summary: string | null
}

interface ResearchDeliverable {
  readonly id: string
  readonly title: string
  readonly content: string
  readonly researcherId: string
  readonly timestamp: number
  readonly asOf: string
}

interface ChartPointerEvent {
  readonly clientX: number
  readonly currentTarget: SVGSVGElement
}

const RANGES: readonly Range[] = ['1M', '3M', '1Y', 'ALL']
const DAY_MS = 24 * 60 * 60 * 1000

function record(value: unknown): Record<string, unknown> | undefined {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? value as Record<string, unknown>
    : undefined
}

function finite(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

function nonEmpty(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null
}

function timestampOf(value: unknown): number | null {
  const text = nonEmpty(value)
  if (text === null) return null
  const timestamp = Date.parse(text)
  return Number.isFinite(timestamp) ? timestamp : null
}

function readFundInfo(fund: GraphNode | undefined): VirtualFundInfo {
  const virtualFund = record(fund?.metadata.virtualFund)
  return {
    initialCash: finite(virtualFund?.initialCash),
    currency: nonEmpty(virtualFund?.currency),
    startingAt: nonEmpty(virtualFund?.startingAt),
  }
}

function readPosition(value: unknown): FundPosition | null {
  const position = record(value)
  const symbol = nonEmpty(position?.symbol)
  const quantity = finite(position?.quantity)
  const price = finite(position?.price)
  const marketValue = finite(position?.value)
  if (symbol === null || quantity === null || price === null || marketValue === null) return null
  return { symbol, quantity, price, value: marketValue }
}

function readSnapshot(node: GraphNode, fundId: string): FundSnapshot | null {
  const asOf = nonEmpty(node.metadata.asOf)
  const timestamp = timestampOf(asOf)
  const nav = finite(node.metadata.nav)
  const cash = finite(node.metadata.cash)
  if (node.kind !== 'session'
    || node.metadata.type !== 'fund-snapshot'
    || node.metadata.fundId !== fundId
    || asOf === null
    || timestamp === null
    || nav === null
    || cash === null) return null
  const positions = Array.isArray(node.metadata.positions)
    ? node.metadata.positions.flatMap(value => {
        const position = readPosition(value)
        return position === null ? [] : [position]
      })
    : []
  const sourceIds = Array.isArray(node.metadata.sourceIds)
    ? node.metadata.sourceIds.filter((value): value is string => typeof value === 'string' && value.length > 0)
    : []
  return {
    id: node.id,
    asOf,
    timestamp,
    nav,
    cash,
    positions,
    sourceIds,
    summary: nonEmpty(node.metadata.summary),
  }
}

function readDeliverable(node: GraphNode, fundId: string): ResearchDeliverable | null {
  const researcherId = nonEmpty(node.metadata.researcherId)
  if (node.kind !== 'deliverable' || node.metadata.fundId !== fundId || researcherId === null) return null
  const explicitAsOf = nonEmpty(node.metadata.asOf)
  const timestamp = timestampOf(explicitAsOf) ?? (Number.isFinite(node.updatedAt) ? node.updatedAt : node.createdAt)
  return {
    id: node.id,
    title: node.title,
    content: node.content,
    researcherId,
    timestamp,
    asOf: explicitAsOf ?? new Date(timestamp).toISOString(),
  }
}

function rangeCutoff(latest: number, range: Range): number | null {
  if (range === 'ALL') return null
  const date = new Date(latest)
  const months = range === '1M' ? 1 : range === '3M' ? 3 : 12
  const firstOfTargetMonth = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() - months, 1))
  const targetYear = firstOfTargetMonth.getUTCFullYear()
  const targetMonth = firstOfTargetMonth.getUTCMonth()
  const daysInTargetMonth = new Date(Date.UTC(targetYear, targetMonth + 1, 0)).getUTCDate()
  firstOfTargetMonth.setUTCDate(Math.min(date.getUTCDate(), daysInTargetMonth))
  firstOfTargetMonth.setUTCHours(
    date.getUTCHours(),
    date.getUTCMinutes(),
    date.getUTCSeconds(),
    date.getUTCMilliseconds(),
  )
  return firstOfTargetMonth.getTime()
}

function formatNumber(value: number, locale: string, maximumFractionDigits = 2): string {
  return new Intl.NumberFormat(locale, { maximumFractionDigits }).format(value)
}

function formatMoney(value: number, currency: string | null, locale: string, compact = false): string {
  const numeric = compact
    ? { notation: 'compact' as const, maximumFractionDigits: 1 }
    : { maximumFractionDigits: 2 }
  if (currency !== null) {
    try {
      return new Intl.NumberFormat(locale, {
        style: 'currency',
        currency: currency.toUpperCase(),
        currencyDisplay: 'narrowSymbol',
        ...numeric,
      }).format(value)
    } catch {
      return `${currency.toUpperCase()} ${formatNumber(value, locale, compact ? 1 : 2)}`
    }
  }
  return formatNumber(value, locale, compact ? 1 : 2)
}

function formatPercent(value: number | null): string {
  if (value === null) return '—'
  return `${value > 0 ? '+' : ''}${value.toFixed(2)}%`
}

function formatDate(timestamp: number, locale: string, timeZone?: 'UTC'): string {
  return new Intl.DateTimeFormat(locale, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    ...(timeZone ? { timeZone } : {}),
  }).format(new Date(timestamp))
}

/** Format one saved snapshot for exact UTC inspection and pointer/keyboard tooltips. */
export function formatSnapshotDateTime(timestamp: number, locale: string): string {
  return new Intl.DateTimeFormat(locale, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
    timeZone: 'UTC',
    timeZoneName: 'short',
  }).format(new Date(timestamp))
}

function formatAxisDate(timestamp: number, locale: string, includeYear: boolean, intraday: boolean, crossesDay: boolean): string {
  if (intraday) {
    return `${new Intl.DateTimeFormat(locale, {
      ...(crossesDay ? { month: 'short' as const, day: 'numeric' as const } : {}),
      ...(crossesDay && includeYear ? { year: 'numeric' as const } : {}),
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
      timeZone: 'UTC',
    }).format(new Date(timestamp))} UTC`
  }
  return new Intl.DateTimeFormat(locale, {
    month: 'short',
    day: 'numeric',
    ...(includeYear ? { year: 'numeric' as const } : {}),
    timeZone: 'UTC',
  }).format(new Date(timestamp))
}

export function VirtualFundOverview({
  locale,
  onOpenOffice,
  onOpenSeat,
  fund,
  snapshots = [],
  events = [],
  researchers = [],
  onAdvance,
  holdingsOnly = false,
}: VirtualFundOverviewProps) {
  const zh = locale.toLowerCase().startsWith('zh')
  const text = (cn: string, en: string) => zh ? cn : en
  const [range, setRange] = useState<Range>('1Y')
  const [activeIndex, setActiveIndex] = useState<number | null>(null)
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null)
  const fundNode = fund?.kind === 'portfolio' ? fund : undefined
  const fundInfo = readFundInfo(fundNode)
  const allSnapshots = fundNode === undefined
    ? []
    : snapshots
        .flatMap(node => {
          const snapshot = readSnapshot(node, fundNode.id)
          return snapshot === null ? [] : [snapshot]
        })
        .sort((left, right) => left.timestamp - right.timestamp || left.id.localeCompare(right.id))
  const latest = allSnapshots.at(-1)
  const cutoff = latest === undefined ? null : rangeCutoff(latest.timestamp, range)
  const visibleSnapshots = cutoff === null
    ? allSnapshots
    : allSnapshots.filter(snapshot => snapshot.timestamp >= cutoff)
  const activeSnapshot = activeIndex !== null && activeIndex >= 0 && activeIndex < visibleSnapshots.length
    ? visibleSnapshots[activeIndex]
    : undefined
  const displaySnapshot = activeSnapshot ?? latest
  const totalReturn = displaySnapshot !== undefined
    && fundInfo.initialCash !== null
    && fundInfo.initialCash !== 0
    ? (displaySnapshot.nav - fundInfo.initialCash) / fundInfo.initialCash * 100
    : null
  const totalReturnAmount = displaySnapshot !== undefined && fundInfo.initialCash !== null
    ? displaySnapshot.nav - fundInfo.initialCash
    : null
  const cashWeight = displaySnapshot !== undefined && displaySnapshot.nav !== 0
    ? displaySnapshot.cash / displaySnapshot.nav * 100
    : null
  const researchDeliverables = fundNode === undefined
    ? []
    : events
        .flatMap(node => {
          const deliverable = readDeliverable(node, fundNode.id)
          return deliverable === null ? [] : [deliverable]
        })
        .sort((left, right) => right.timestamp - left.timestamp || left.id.localeCompare(right.id))
  const activeDeliverable = researchDeliverables.find(event => event.id === selectedEventId) ?? researchDeliverables[0]
  const markdownLabels: MarkdownLabels = {
    code: {
      copyLabel: text('复制', 'Copy'),
      copiedLabel: text('已复制', 'Copied'),
      toolbarLabels: {
        codeLabel: text('代码', 'Code'),
        wrapLabel: text('自动换行', 'Wrap'),
        unwrapLabel: text('取消换行', 'Unwrap'),
      },
    },
    footnotes: text('脚注', 'Footnotes'),
  }

  if (fundNode === undefined) {
    return (
      <article className="rg-vfund-overview" aria-labelledby="rg-vfund-overview-title">
        <header className="rg-vfund-overview-head">
          <div>
            <h3 id="rg-vfund-overview-title">{text('虚拟基金', 'Virtual fund')}</h3>
            <p>{text('用已保存的模拟估值记录跟踪连续净值、现金和持仓。', 'Track a persistent NAV, cash balance and holdings from saved simulated valuation records.')}</p>
          </div>
        </header>
        <section className="rg-vfund-overview-empty">
          <span className="rg-vfund-overview-empty-art" aria-hidden="true">
            <svg viewBox="0 0 180 72">
              <path d="M8 61h164M14 57V19M14 39h52l17-13 19 19 18-27 27 12 19-6" />
              <circle cx="120" cy="18" r="3.5" />
            </svg>
          </span>
          <h4>{text('创建一只虚拟基金', 'Create a virtual fund')}</h4>
          <p>{text('先设置初始资金和研究团队，第一份估值写入后，这里会出现连续净值历史。', 'Set the starting capital and research team. The valuation history begins after the first snapshot is recorded.')}</p>
          <button type="button" onClick={onOpenOffice}>{text('创建基金', 'Create fund')}</button>
        </section>
      </article>
    )
  }

  if (latest === undefined) {
    return (
      <article className="rg-vfund-overview" aria-labelledby="rg-vfund-overview-title">
        <header className="rg-vfund-overview-head">
          <div>
            <div className="rg-vfund-overview-title-line">
              <h3 id="rg-vfund-overview-title">{fundNode.title || text('虚拟基金', 'Virtual fund')}</h3>
              {fundInfo.currency !== null && <span>{fundInfo.currency}</span>}
            </div>
            <p>{text('基金已建立，等待第一份可追溯的估值记录。', 'The fund exists and is waiting for its first traceable valuation.')}</p>
          </div>
          {fundInfo.initialCash !== null && (
            <dl className="rg-vfund-overview-fund-meta">
              <div><dt>{text('初始资金', 'Starting capital')}</dt><dd>{formatMoney(fundInfo.initialCash, fundInfo.currency, locale)}</dd></div>
              {fundInfo.startingAt !== null && <div><dt>{text('起始日期', 'Started')}</dt><dd>{fundInfo.startingAt.slice(0, 10)}</dd></div>}
            </dl>
          )}
        </header>
        <section className="rg-vfund-overview-empty">
          <span className="rg-vfund-overview-empty-art" aria-hidden="true">
            <svg viewBox="0 0 180 72">
              <path d="M8 61h164M14 57V19M14 39h52l17-13 19 19 18-27 27 12 19-6" />
              <circle cx="120" cy="18" r="3.5" />
            </svg>
          </span>
          <h4>{text('完成首次估值', 'Complete the first valuation')}</h4>
          <p>{text('写入持仓价格、现金和来源后，概览会从第一条已保存的模拟估值开始绘制。', 'Once prices, cash and sources are recorded, the overview starts from the first saved simulated valuation.')}</p>
          <button type="button" onClick={onAdvance ?? onOpenOffice}>{text('完成首次估值', 'Complete first valuation')}</button>
        </section>
      </article>
    )
  }

  const width = 960
  const height = 304
  const margin = { left: 78, right: 24, top: 22, bottom: 38 }
  const plotWidth = width - margin.left - margin.right
  const plotHeight = height - margin.top - margin.bottom
  const plotBottom = margin.top + plotHeight
  const timestamps = visibleSnapshots.map(snapshot => snapshot.timestamp)
  const navValues = visibleSnapshots.map(snapshot => snapshot.nav)
  const firstTimestamp = timestamps[0] ?? 0
  const lastTimestamp = timestamps.at(-1) ?? firstTimestamp
  const rawMinimum = navValues.reduce((minimum, value) => Math.min(minimum, value), navValues[0] ?? 0)
  const rawMaximum = navValues.reduce((maximum, value) => Math.max(maximum, value), navValues[0] ?? 0)
  const spread = rawMaximum - rawMinimum
  const padding = spread === 0 ? Math.max(Math.abs(rawMaximum) * 0.035, 1) : spread * 0.14
  const domainMinimum = rawMinimum - padding
  const domainMaximum = rawMaximum + padding
  const scale = (value: number, minimum: number, maximum: number, from: number, to: number) => {
    if (maximum === minimum) return (from + to) / 2
    return from + (value - minimum) / (maximum - minimum) * (to - from)
  }
  const xFor = (snapshot: FundSnapshot) => {
    if (visibleSnapshots.length === 1 || lastTimestamp === firstTimestamp) {
      return margin.left + plotWidth / 2
    }
    return margin.left + (snapshot.timestamp - firstTimestamp) / (lastTimestamp - firstTimestamp) * plotWidth
  }
  const yFor = (nav: number) => scale(nav, domainMinimum, domainMaximum, plotBottom, margin.top)
  const points = visibleSnapshots.map(snapshot => ({ snapshot, x: xFor(snapshot), y: yFor(snapshot.nav) }))
  const linePath = points.map((point, index) => `${index === 0 ? 'M' : 'L'}${point.x},${point.y}`).join(' ')
  const areaPath = points.length > 1
    ? `${linePath} L${points.at(-1)?.x ?? margin.left},${plotBottom} L${points[0]?.x ?? margin.left},${plotBottom} Z`
    : ''
  const selectedPoint = activeIndex !== null && activeIndex >= 0 && activeIndex < points.length
    ? points[activeIndex]
    : undefined
  const latestPoint = points.at(-1)
  const yTicks = [domainMaximum, (domainMaximum + domainMinimum) / 2, domainMinimum]
  const xTickIndexes = [0, Math.floor((visibleSnapshots.length - 1) / 2), visibleSnapshots.length - 1]
    .filter((value, index, values) => values.indexOf(value) === index)
  const includeYear = new Date(firstTimestamp).getUTCFullYear() !== new Date(lastTimestamp).getUTCFullYear()
  const intradaySeries = visibleSnapshots.length > 1 && lastTimestamp - firstTimestamp < DAY_MS
  const crossesUtcDay = new Date(firstTimestamp).toISOString().slice(0, 10) !== new Date(lastTimestamp).toISOString().slice(0, 10)
  const snapshotDateLabel = (timestamp: number) => intradaySeries
    ? formatSnapshotDateTime(timestamp, locale)
    : formatDate(timestamp, locale, 'UTC')
  const holdings = [...(displaySnapshot?.positions ?? [])].sort((left, right) => right.value - left.value)
  const investedValue = holdings.reduce((sum, position) => sum + position.value, 0)
  const pointerIndex = (event: ChartPointerEvent): number | null => {
    if (points.length === 0) return null
    const bounds = event.currentTarget.getBoundingClientRect()
    const viewX = (event.clientX - bounds.left) / Math.max(1, bounds.width) * width
    return points.reduce((nearest, point, index) => (
      Math.abs(point.x - viewX) < Math.abs((points[nearest]?.x ?? point.x) - viewX) ? index : nearest
    ), 0)
  }
  const keyboard = (event: ReactKeyboardEvent<SVGSVGElement>) => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End', 'Escape'].includes(event.key)) return
    event.preventDefault()
    setActiveIndex(nextChartIndex(activeIndex, event.key, points.length))
  }

  return (
    <article className="rg-vfund-overview" aria-labelledby="rg-vfund-overview-title">
      <header className="rg-vfund-overview-head">
        <div>
          <div className="rg-vfund-overview-title-line">
            <h3 id="rg-vfund-overview-title">{fundNode.title || text('虚拟基金', 'Virtual fund')}</h3>
            {fundInfo.currency !== null && <span>{fundInfo.currency}</span>}
          </div>
          <p>{text('已保存的模拟估值、现金与基金研究都来自这张知识图谱。', 'Saved simulated valuations, cash and fund research all come from this knowledge graph.')}</p>
        </div>
        {fundInfo.startingAt !== null && (
          <dl className="rg-vfund-overview-fund-meta">
            <div><dt>{text('起始日期', 'Started')}</dt><dd>{fundInfo.startingAt.slice(0, 10)}</dd></div>
            <div><dt>{text('初始资金', 'Starting capital')}</dt><dd>{fundInfo.initialCash === null ? '—' : formatMoney(fundInfo.initialCash, fundInfo.currency, locale)}</dd></div>
          </dl>
        )}
      </header>

      <section className="rg-vfund-overview-value" aria-live="polite">
        <div className="rg-vfund-overview-nav">
          <span>{text('基金净值', 'Net asset value')}</span>
          <strong>{formatMoney(displaySnapshot?.nav ?? 0, fundInfo.currency, locale)}</strong>
        </div>
        <dl>
          <div>
            <dt>{text('总收益', 'Total return')}</dt>
            <dd data-positive={totalReturn !== null && totalReturn >= 0 || undefined} data-negative={totalReturn !== null && totalReturn < 0 || undefined}>
              <strong>{formatPercent(totalReturn)}</strong>
              <span>{totalReturnAmount === null ? '—' : `${totalReturnAmount >= 0 ? '+' : '−'}${formatMoney(Math.abs(totalReturnAmount), fundInfo.currency, locale)}`}</span>
            </dd>
          </div>
          <div>
            <dt>{text('现金', 'Cash')}</dt>
            <dd>
              <strong>{displaySnapshot === undefined ? '—' : formatMoney(displaySnapshot.cash, fundInfo.currency, locale)}</strong>
              <span>{cashWeight === null ? '—' : `${cashWeight.toFixed(1)}% ${text('占净值', 'of NAV')}`}</span>
            </dd>
          </div>
          <div>
            <dt>{text('估值日期（UTC）', 'Valuation date (UTC)')}</dt>
            <dd><strong>{displaySnapshot === undefined ? '—' : snapshotDateLabel(displaySnapshot.timestamp)}</strong><span>{activeSnapshot === undefined ? text('最新快照', 'Latest snapshot') : text('正在查看', 'Inspecting')}</span></dd>
          </div>
        </dl>
      </section>

      {!holdingsOnly && <section className="rg-vfund-overview-chart" aria-labelledby="rg-vfund-overview-chart-title">
        <header className="rg-vfund-overview-chart-head">
          <div>
            <h4 id="rg-vfund-overview-chart-title">{text('净值历史', 'Valuation history')}</h4>
            <p>{text('悬停或用方向键查看每条已保存的模拟估值。', 'Hover or use the arrow keys to inspect each saved simulated valuation.')}</p>
          </div>
          <div className="rg-vfund-overview-ranges" role="group" aria-label={text('净值时间范围', 'Valuation range')}>
            {RANGES.map(value => (
              <button
                type="button"
                key={value}
                aria-pressed={range === value}
                onClick={() => {
                  setRange(value)
                  setActiveIndex(null)
                }}
              >
                {value === 'ALL' ? text('全部', 'ALL') : value}
              </button>
            ))}
          </div>
        </header>
        <div className="rg-vfund-overview-chart-wrap">
          <svg
            viewBox={`0 0 ${width} ${height}`}
            role="application"
            tabIndex={0}
            aria-label={text('基金净值历史。左右方向键逐点查看，Home 和 End 跳到首尾，Escape 清除选择。', 'Fund NAV history. Use left and right arrows to inspect points, Home and End to jump, and Escape to clear.')}
            aria-keyshortcuts="ArrowLeft ArrowRight Home End Escape"
            onPointerMove={event => setActiveIndex(pointerIndex(event))}
            onPointerDown={event => {
              event.currentTarget.setPointerCapture(event.pointerId)
              setActiveIndex(pointerIndex(event))
            }}
            onPointerUp={event => {
              if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId)
            }}
            onPointerLeave={event => {
              if (event.pointerType === 'mouse') setActiveIndex(null)
            }}
            onPointerCancel={() => setActiveIndex(null)}
            onClick={event => setActiveIndex(pointerIndex(event))}
            onKeyDown={keyboard}
          >
            {yTicks.map(tick => {
              const y = yFor(tick)
              return (
                <g key={tick}>
                  <line className="rg-vfund-overview-gridline" x1={margin.left} x2={width - margin.right} y1={y} y2={y} />
                  <text className="rg-vfund-overview-axis-label" x={margin.left - 10} y={y + 4} textAnchor="end">
                    {formatMoney(tick, fundInfo.currency, locale, true)}
                  </text>
                </g>
              )
            })}
            {points.length > 1 && <path className="rg-vfund-overview-area" d={areaPath} />}
            {points.length > 1 && <path className="rg-vfund-overview-line" d={linePath} />}
            {points.length === 1 && points.map(point => (
              <circle key={point.snapshot.id} className="rg-vfund-overview-point" cx={point.x} cy={point.y} r="4" />
            ))}
            {points.length > 1 && latestPoint !== undefined && selectedPoint?.snapshot.id !== latestPoint.snapshot.id && (
              <circle className="rg-vfund-overview-point" cx={latestPoint.x} cy={latestPoint.y} r="3.5" />
            )}
            {selectedPoint !== undefined && (
              <g className="rg-vfund-overview-point-active">
                <line x1={selectedPoint.x} x2={selectedPoint.x} y1={margin.top} y2={plotBottom} />
                <circle cx={selectedPoint.x} cy={selectedPoint.y} r="5" />
              </g>
            )}
            {xTickIndexes.map(index => {
              const point = points[index]
              if (point === undefined) return null
              return (
                <text
                  key={`${point.snapshot.id}:${index}`}
                  className="rg-vfund-overview-axis-label"
                  x={point.x}
                  y={height - 12}
                  textAnchor={index === 0 ? 'start' : index === visibleSnapshots.length - 1 ? 'end' : 'middle'}
                >
                  {formatAxisDate(point.snapshot.timestamp, locale, includeYear, intradaySeries, crossesUtcDay)}
                </text>
              )
            })}
          </svg>
          {selectedPoint !== undefined && (
            <div
              className="rg-vfund-overview-tooltip"
              data-side={selectedPoint.x > width * 0.7 ? 'left' : 'right'}
              style={{ left: `${selectedPoint.x / width * 100}%` }}
              role="status"
            >
              <strong>{formatSnapshotDateTime(selectedPoint.snapshot.timestamp, locale)}</strong>
              <dl>
                <div><dt>{text('净值', 'NAV')}</dt><dd>{formatMoney(selectedPoint.snapshot.nav, fundInfo.currency, locale)}</dd></div>
                <div><dt>{text('现金', 'Cash')}</dt><dd>{formatMoney(selectedPoint.snapshot.cash, fundInfo.currency, locale)}</dd></div>
              </dl>
            </div>
          )}
        </div>
        {displaySnapshot?.summary !== null && displaySnapshot?.summary !== undefined && <p className="rg-vfund-overview-chart-summary">{displaySnapshot.summary}</p>}
        {displaySnapshot !== undefined && displaySnapshot.sourceIds.length > 0 && (
          <p className="rg-vfund-overview-source-line">
            <span>{text('估值来源', 'Valuation sources')}</span>
            {displaySnapshot.sourceIds.slice(0, 4).join(' · ')}
            {displaySnapshot.sourceIds.length > 4 ? ` +${displaySnapshot.sourceIds.length - 4}` : ''}
          </p>
        )}
      </section>}

      <div
        className="rg-vfund-overview-lower"
        style={holdingsOnly ? { gridTemplateColumns: 'minmax(0, 1fr)' } : undefined}
      >
        <section className="rg-vfund-overview-holdings" aria-labelledby="rg-vfund-overview-holdings-title">
          <header className="rg-vfund-overview-section-head">
            <div>
              <h4 id="rg-vfund-overview-holdings-title">{text('持仓', 'Holdings')}</h4>
              <p>{displaySnapshot === undefined ? '—' : `${snapshotDateLabel(displaySnapshot.timestamp)} · ${holdings.length} ${text('个持仓', 'positions')}`}</p>
            </div>
            <span>{text('按市值排序', 'By market value')}</span>
          </header>
          {holdings.length === 0 ? (
            <p className="rg-vfund-overview-inline-empty">{text('这份快照没有记录持仓。', 'This snapshot contains no positions.')}</p>
          ) : (
            <>
              <div className="rg-vfund-overview-table-wrap">
                <table className="rg-vfund-overview-table">
                  <thead>
                    <tr>
                      <th>{text('标的', 'Position')}</th>
                      <th>{text('数量', 'Quantity')}</th>
                      <th>{text('价格', 'Price')}</th>
                      <th>{text('市值', 'Value')}</th>
                      <th>{text('权重', 'Weight')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {holdings.map(position => {
                      const weight = displaySnapshot !== undefined && displaySnapshot.nav !== 0
                        ? position.value / displaySnapshot.nav * 100
                        : null
                      return (
                        <tr key={position.symbol}>
                          <th scope="row">
                            <button type="button" className="rg-vfund-overview-asset" onClick={() => onOpenSeat(position.symbol.toLowerCase())}>
                              <AssetLogo symbol={position.symbol} />
                              <strong>{position.symbol}</strong>
                            </button>
                          </th>
                          <td>{formatNumber(position.quantity, locale, 4)}</td>
                          <td>{formatMoney(position.price, fundInfo.currency, locale)}</td>
                          <td>{formatMoney(position.value, fundInfo.currency, locale)}</td>
                          <td>{weight === null ? '—' : `${weight.toFixed(1)}%`}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
              <footer className="rg-vfund-overview-holdings-foot">
                <span>{text('证券市值', 'Invested')} <strong>{formatMoney(investedValue, fundInfo.currency, locale)}</strong></span>
                <span>{text('现金', 'Cash')} <strong>{displaySnapshot === undefined ? '—' : formatMoney(displaySnapshot.cash, fundInfo.currency, locale)}</strong></span>
              </footer>
            </>
          )}
        </section>

        {!holdingsOnly && <aside className="rg-vfund-overview-research" aria-labelledby="rg-vfund-overview-research-title">
          <header className="rg-vfund-overview-section-head">
            <div>
              <h4 id="rg-vfund-overview-research-title">{text('近期研究', 'Recent research')}</h4>
              <p>{text('与这只基金关联的研究交付物。', 'Research deliverables linked to this fund.')}</p>
            </div>
            <span>{researchDeliverables.length}</span>
          </header>
          {activeDeliverable === undefined ? (
            <p className="rg-vfund-overview-inline-empty">{text('还没有基金研究交付物。研究完成后会出现在这里。', 'No fund research has been linked yet. New deliverables will appear here.')}</p>
          ) : (
            <>
              <div className="rg-vfund-overview-review">
                <div className="rg-vfund-overview-review-meta">
                  <time dateTime={activeDeliverable.asOf}>{formatDate(activeDeliverable.timestamp, locale)}</time>
                  <span>{researchers.find(node => node.id === activeDeliverable.researcherId)?.title ?? text('基金研究员', 'Fund researcher')}</span>
                </div>
                <h5>{activeDeliverable.title || text('基金研究', 'Fund research')}</h5>
                {activeDeliverable.content.length > 0 && (
                  <div className="rg-vfund-overview-research-preview">
                    <MarkdownText text={protectReportCurrency(activeDeliverable.content)} labels={markdownLabels} omitHtml variant="compact" />
                  </div>
                )}
                <button type="button" onClick={() => onOpenSeat(activeDeliverable.researcherId)}>{text('打开研究员', 'Open researcher')}</button>
              </div>
              {researchDeliverables.length > 1 && (
                <ol className="rg-vfund-overview-research-list">
                  {researchDeliverables.slice(0, 4).map(deliverable => (
                    <li key={deliverable.id}>
                      <button type="button" aria-pressed={deliverable.id === activeDeliverable.id} onClick={() => setSelectedEventId(deliverable.id)}>
                        <span>{deliverable.title || text('基金研究', 'Fund research')}</span>
                        <small>{formatDate(deliverable.timestamp, locale)}</small>
                      </button>
                    </li>
                  ))}
                </ol>
              )}
            </>
          )}
        </aside>}
      </div>
    </article>
  )
}
