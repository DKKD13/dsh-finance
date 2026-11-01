import { useId, useState } from 'react'
import type { KeyboardEvent, MouseEvent, ReactNode } from 'react'
import type { Translate } from '../store.ts'
import type { MarketBar, PortfolioReturnPoint } from '../chart-data.ts'
import { aggregateMarketBars, lineSegments, nextChartIndex, nextMatrixIndex, pointerChartIndex, readCalibration, readMarketHistory } from '../chart-data.ts'
import { FinanceEmpty, formatNumber, LazyDetails, ProvenanceList } from './FinanceCommon.tsx'
import { STOCK_CHART_STYLE } from '../finance-stock-chart-styles.ts'

export interface ChartTable {
  readonly columns: readonly string[]
  readonly rows: readonly (readonly ReactNode[])[]
}

export function ChartFrame({ title, description, controls, legend, source, table, stale = false, note, className, children, t }: {
  readonly title: string
  readonly description?: string | undefined
  readonly controls?: ReactNode
  readonly legend?: ReactNode
  readonly source?: ReactNode
  readonly table: ChartTable
  readonly stale?: boolean
  readonly note?: string | undefined
  readonly className?: string | undefined
  readonly children: ReactNode
  readonly t: Translate
}) {
  const id = useId()
  return (
    <figure className={`rg-chart-frame${className === undefined ? '' : ` ${className}`}`} aria-labelledby={`${id}-title`} data-stale={stale || undefined}>
      <div className="rg-chart-frame-head">
        <div><h3 id={`${id}-title`}>{title}</h3>{description !== undefined && <p>{description}</p>}</div>
        {stale && <span className="rg-finance-badge" data-status="stale">{t('chart.stale')}</span>}
        {controls !== undefined && <div className="rg-chart-controls">{controls}</div>}
      </div>
      {(legend !== undefined || note !== undefined) && <div className="rg-chart-meta">{legend !== undefined && <div className="rg-chart-legend">{legend}</div>}{note !== undefined && <span>{note}</span>}</div>}
      <div className="rg-chart-canvas">{children}</div>
      {source !== undefined && <div className="rg-chart-source"><span>{t('chart.source')}</span>{source}</div>}
      <LazyDetails className="rg-chart-data" summary={t('chart.exactData', { count: table.rows.length })}>{() => <div className="rg-finance-table-wrap"><table className="rg-finance-table">
        <thead><tr>{table.columns.map(column => <th key={column}>{column}</th>)}</tr></thead>
        <tbody>{table.rows.map((row, index) => <tr key={index}>{row.map((cell, cellIndex) => <td key={cellIndex}>{cell}</td>)}</tr>)}</tbody>
      </table></div>}</LazyDetails>
    </figure>
  )
}

function scale(value: number, minimum: number, maximum: number, lower: number, upper: number): number {
  return lower + ((value - minimum) / (maximum - minimum)) * (upper - lower)
}

function chartTime(timestamp: string, withTime = false): string {
  const parsed = new Date(timestamp)
  if (!Number.isFinite(parsed.getTime())) return timestamp
  return parsed.toISOString().slice(0, withTime ? 16 : 10).replace('T', ' ') + (withTime ? ' UTC' : '')
}

export function Sparkline({ values, label, emptyLabel }: {
  readonly values: readonly (number | null)[]
  readonly label: string
  readonly emptyLabel: string
}) {
  const finite = values.filter((value): value is number => value !== null && Number.isFinite(value))
  const width = 180
  const height = 48
  const minimum = finite.length === 0 ? 0 : Math.min(...finite)
  const maximum = finite.length === 0 ? 1 : Math.max(...finite)
  const padding = Math.max((maximum - minimum) * 0.08, Math.abs(maximum) * 0.02, 1e-9)
  const low = minimum - padding
  const high = maximum + padding
  const segments = lineSegments(values)
  return (
    <svg className="rg-sparkline" viewBox={`0 0 ${width} ${height}`} role="img" aria-label={finite.length === 0 ? emptyLabel : label}>
      {finite.length === 0 ? <text x={width / 2} y={height / 2} textAnchor="middle">{emptyLabel}</text> : <>
        {segments.map((segment, segmentIndex) => segment.length > 1 ? <path
          key={segmentIndex}
          className="rg-chart-line"
          d={segment.map((index, position) => `${position === 0 ? 'M' : 'L'}${scale(index, 0, Math.max(1, values.length - 1), 3, width - 3)},${scale(values[index] as number, low, high, height - 3, 3)}`).join(' ')}
        /> : segment.map(index => <circle key={index} className="rg-chart-line-point" cx={scale(index, 0, Math.max(1, values.length - 1), 3, width - 3)} cy={scale(values[index] as number, low, high, height - 3, 3)} r={2.5} />))}
      </>}
    </svg>
  )
}

function exactNumber(value: unknown): string {
  return typeof value === 'number' && Number.isFinite(value) ? String(value) : '—'
}

function exactBarRow(bar: MarketBar): readonly ReactNode[] {
  return [bar.timestamp, exactNumber(bar.open), exactNumber(bar.high), exactNumber(bar.low), exactNumber(bar.close), exactNumber(bar.adjustedClose), exactNumber(bar.volume)]
}

export function MarketChart({ value, stale = false, initialMode = 'candles', appearance = 'default', previousClose, toolbarStart, toolbarEnd, t }: {
  readonly value: unknown
  readonly stale?: boolean
  readonly initialMode?: 'candles' | 'close' | 'adjustedClose'
  readonly appearance?: 'default' | 'asset'
  readonly previousClose?: number
  readonly toolbarStart?: ReactNode
  readonly toolbarEnd?: ReactNode
  readonly t: Translate
}) {
  const isAsset = appearance === 'asset'
  const gradientId = `rg-stock-area-${useId().replaceAll(':', '')}`
  const [mode, setMode] = useState<'candles' | 'close' | 'adjustedClose'>(initialMode)
  const [activeIndex, setActiveIndex] = useState<number | null>(null)
  const history = readMarketHistory(value)
  const bars = aggregateMarketBars(history.bars)
  const selectedValues = bars.map(bar => mode === 'candles' ? bar.close : bar[mode])
  const closeReference = isAsset && typeof previousClose === 'number' && Number.isFinite(previousClose) ? previousClose : null
  const seriesValues = mode === 'candles'
    ? bars.flatMap(bar => [bar.high, bar.low]).filter((entry): entry is number => entry !== null)
    : selectedValues.filter((entry): entry is number => entry !== null)
  const hasSeriesValues = seriesValues.length > 0
  const domainValues = isAsset && closeReference !== null ? [...seriesValues, closeReference] : seriesValues
  const rawMinimum = domainValues.length === 0 ? 0 : Math.min(...domainValues)
  const rawMaximum = domainValues.length === 0 ? 1 : Math.max(...domainValues)
  const domainPadding = Math.max((rawMaximum - rawMinimum) * 0.08, Math.abs(rawMaximum) * (isAsset ? 0.0002 : 0.015), 1e-9)
  const minimum = rawMinimum - domainPadding
  const maximum = rawMaximum + domainPadding
  const priceTop = 18
  const priceHeight = isAsset ? 314 : 214
  const volumeTop = isAsset ? 354 : 266
  const volumeHeight = isAsset ? 36 : 58
  const axisTicks = [0, 1, 2, 3, 4].map(tick => ({
    tick,
    value: maximum - ((maximum - minimum) * tick) / 4,
    label: isAsset ? new Intl.NumberFormat('en-US', { maximumFractionDigits: maximum - minimum < 0.1 ? 4 : 2 }).format(maximum - ((maximum - minimum) * tick) / 4) : formatNumber(maximum - ((maximum - minimum) * tick) / 4),
    y: priceTop + (priceHeight * tick) / 4,
  }))
  const left = Math.max(62, ...axisTicks.map(tick => tick.label.length * 8 + 16))
  const width = (isAsset ? 1040 : 920) + Math.max(0, left - 62)
  const height = isAsset ? 430 : 370
  const margin = { left, right: 18, top: priceTop, bottom: 38 }
  const plotWidth = width - margin.left - margin.right
  const band = plotWidth / Math.max(1, bars.length)
  const maxVolume = Math.max(1, ...bars.map(bar => bar.volume ?? 0))
  const active = activeIndex !== null && activeIndex < bars.length ? bars[activeIndex] : undefined
  const activeX = activeIndex === null ? null : margin.left + band * (activeIndex + 0.5)
  const title = `${history.symbol ?? t('finance.market.symbol')} · ${t('finance.market.historyTitle')}`
  const previousCloseY = closeReference === null ? null : scale(closeReference, minimum, maximum, priceTop + priceHeight, priceTop)
  const previousCloseLabel = closeReference === null ? '' : `${t('finance.market.previousClose')} ${formatNumber(closeReference)}`
  const previousCloseLabelWidth = Math.max(104, previousCloseLabel.length * 7.5 + 16)
  const table = {
    columns: ['timestamp', 'open', 'high', 'low', 'close', 'adjustedClose', 'volume'],
    rows: history.bars.map(exactBarRow),
  }
  const pointer = (event: MouseEvent<SVGSVGElement>) => {
    const rect = event.currentTarget.getBoundingClientRect()
    const left = rect.left + (margin.left / width) * rect.width
    const index = pointerChartIndex(event.clientX, left, (plotWidth / width) * rect.width, bars.length)
    setActiveIndex(index)
  }
  const keyboard = (event: KeyboardEvent<SVGSVGElement>) => {
    const next = nextChartIndex(activeIndex, event.key, bars.length)
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End', 'Escape'].includes(event.key)) return
    event.preventDefault()
    setActiveIndex(next)
  }
  const controls = isAsset
    ? <div className="rg-stock-chart-controls" role="group" aria-label={t('chart.displayMode')}>
        <button type="button" data-active={mode === 'close' || undefined} aria-label={t('chart.close')} title={t('chart.close')} aria-pressed={mode === 'close'} onClick={() => { setMode('close'); setActiveIndex(null) }}>
          <svg viewBox="0 0 18 18" aria-hidden="true"><path d="M2.5 13.5 6 10l2.5 1.7 6.5-7" fill="none" stroke="currentColor" strokeWidth="1.45" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </button>
        <button type="button" data-active={mode === 'candles' || undefined} aria-label={t('chart.candles')} title={t('chart.candles')} aria-pressed={mode === 'candles'} onClick={() => { setMode('candles'); setActiveIndex(null) }}>
          <svg viewBox="0 0 18 18" aria-hidden="true"><g stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"><path d="M5 2.5v3M5 12.5v3M13 3.5v2M13 12.5v2" /><path d="M3.5 5.5h3v7h-3zM11.5 5.5h3v7h-3z" fill="none" /></g></svg>
        </button>
        <button type="button" className="rg-stock-chart-adjustment" data-active={mode === 'adjustedClose' || undefined} aria-label={t('chart.adjustedClose')} title={t('chart.adjustedClose')} aria-pressed={mode === 'adjustedClose'} onClick={() => { setMode('adjustedClose'); setActiveIndex(null) }}>Adj</button>
      </div>
    : <div className="rg-tabs" role="group" aria-label={t('chart.displayMode')}>
        {(['candles', 'close', 'adjustedClose'] as const).map(value => <button type="button" key={value} className="rg-tab" data-active={mode === value || undefined} aria-pressed={mode === value} onClick={() => { setMode(value); setActiveIndex(null) }}>{t(`chart.${value}`)}</button>)}
      </div>
  return (
    <ChartFrame
      title={title}
      description={history.currency === null ? undefined : `${history.currency} · ${t('chart.unadjustedAndAdjusted')}`}
      t={t}
      stale={stale}
      table={table}
      className={isAsset ? 'rg-stock-chart' : undefined}
      source={isAsset
        ? <details className="rg-stock-chart-source-details"><summary>{t('finance.provenance.details')}</summary><ProvenanceList value={value} t={t} /></details>
        : <ProvenanceList value={value} t={t} />}
      note={history.bars.length > bars.length ? t('chart.aggregated', { shown: bars.length, total: history.bars.length }) : undefined}
      controls={isAsset ? <div className="rg-stock-unified-toolbar">{toolbarStart}{controls}{toolbarEnd}</div> : controls}
      legend={isAsset ? undefined : <><span data-series="price">{t(`chart.${mode}`)}</span><span data-series="volume">{t('chart.volume')}</span></>}
    >
      {isAsset && <style>{STOCK_CHART_STYLE}</style>}
      {bars.length === 0 || !hasSeriesValues ? <FinanceEmpty>{t(bars.length > 0 && mode === 'adjustedClose' ? 'chart.noAdjustedClose' : 'chart.noMarketData')}</FinanceEmpty> : <div className={`rg-market-chart${isAsset ? ' rg-stock-chart-plot' : ''}`}>
        <svg
          viewBox={`0 0 ${width} ${height}`}
          role="application"
          tabIndex={0}
          aria-label={t('chart.marketKeyboard')}
          aria-keyshortcuts="ArrowLeft ArrowRight Home End Escape"
          onPointerMove={pointer}
          onPointerDown={event => { event.currentTarget.setPointerCapture(event.pointerId); pointer(event) }}
          onPointerUp={event => { if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId) }}
          onPointerLeave={event => { if (event.pointerType === 'mouse') setActiveIndex(null) }}
          onPointerCancel={() => { setActiveIndex(null) }}
          onClick={pointer}
          onKeyDown={keyboard}
        >
          {axisTicks.map(({ tick, label, y }) => <g key={tick}><line className="rg-chart-grid" x1={margin.left} x2={width - margin.right} y1={y} y2={y} /><text className="rg-chart-axis-label" x={margin.left - 8} y={y + 3} textAnchor="end">{label}</text></g>)}
          <line className="rg-chart-axis" x1={margin.left} x2={width - margin.right} y1={priceTop + priceHeight} y2={priceTop + priceHeight} />
          <text className="rg-chart-axis-title" x={margin.left} y={volumeTop - 12}>{t('chart.volume')}</text>
          {previousCloseY !== null && <g className="rg-stock-previous-close-group">
            <line className="rg-stock-previous-close" x1={margin.left} x2={width - margin.right} y1={previousCloseY} y2={previousCloseY} />
            <rect className="rg-stock-previous-close-bg" x={width - margin.right - previousCloseLabelWidth - 6} y={previousCloseY < priceTop + 26 ? previousCloseY + 5 : previousCloseY - 21} width={previousCloseLabelWidth} height="17" rx="4" />
            <text className="rg-stock-previous-close-label" x={width - margin.right - 13} y={previousCloseY < priceTop + 26 ? previousCloseY + 17 : previousCloseY - 9} textAnchor="end">{previousCloseLabel}</text>
          </g>}
          {bars.map((bar, index) => {
            const x = margin.left + band * (index + 0.5)
            const volume = bar.volume === null ? null : scale(bar.volume, 0, maxVolume, 0, volumeHeight)
            return <g key={`${bar.startTimestamp}-${index}`}>
              {volume !== null && <rect className={isAsset ? 'rg-stock-volume' : 'rg-chart-volume'} data-direction={bar.close !== null && bar.open !== null ? bar.close >= bar.open ? 'up' : 'down' : undefined} x={x - Math.max(1, Math.min(12, band * 0.62)) / 2} y={volumeTop + volumeHeight - volume} width={Math.max(1, Math.min(12, band * 0.62))} height={volume} />}
              {mode === 'candles' && bar.open !== null && bar.high !== null && bar.low !== null && bar.close !== null && <g className="rg-chart-candle" data-direction={bar.close >= bar.open ? 'up' : 'down'}>
                <line x1={x} x2={x} y1={scale(bar.high, minimum, maximum, priceTop + priceHeight, priceTop)} y2={scale(bar.low, minimum, maximum, priceTop + priceHeight, priceTop)} />
                <rect x={x - Math.max(1, Math.min(12, band * 0.62)) / 2} y={Math.min(scale(bar.open, minimum, maximum, priceTop + priceHeight, priceTop), scale(bar.close, minimum, maximum, priceTop + priceHeight, priceTop))} width={Math.max(1, Math.min(12, band * 0.62))} height={Math.max(1, Math.abs(scale(bar.open, minimum, maximum, priceTop + priceHeight, priceTop) - scale(bar.close, minimum, maximum, priceTop + priceHeight, priceTop)))} />
              </g>}
            </g>
          })}
          {mode !== 'candles' && isAsset && <defs><linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
            <stop className="rg-stock-area-start" offset="0" stopOpacity=".22" />
            <stop className="rg-stock-area-end" offset="1" stopOpacity="0" />
          </linearGradient></defs>}
          {mode !== 'candles' && isAsset && lineSegments(selectedValues).map((segment, segmentIndex) => segment.length > 1 ? <path
            key={`area-${segmentIndex}`}
            className="rg-stock-area"
            fill={`url(#${gradientId})`}
            d={`${segment.map((index, position) => `${position === 0 ? 'M' : 'L'}${margin.left + band * (index + 0.5)},${scale(selectedValues[index] as number, minimum, maximum, priceTop + priceHeight, priceTop)}`).join(' ')} L${margin.left + band * ((segment.at(-1) ?? 0) + 0.5)},${priceTop + priceHeight} L${margin.left + band * ((segment[0] ?? 0) + 0.5)},${priceTop + priceHeight} Z`}
          /> : null)}
          {mode !== 'candles' && lineSegments(selectedValues).map((segment, segmentIndex) => segment.length > 1 ? <path
            key={segmentIndex}
            className={isAsset ? 'rg-chart-line rg-stock-price-line' : 'rg-chart-line'}
            d={segment.map((index, position) => `${position === 0 ? 'M' : 'L'}${margin.left + band * (index + 0.5)},${scale(selectedValues[index] as number, minimum, maximum, priceTop + priceHeight, priceTop)}`).join(' ')}
          /> : segment.map(index => <circle key={index} className={isAsset ? 'rg-chart-line-point rg-stock-price-point' : 'rg-chart-line-point'} cx={margin.left + band * (index + 0.5)} cy={scale(selectedValues[index] as number, minimum, maximum, priceTop + priceHeight, priceTop)} r={isAsset ? 2.5 : 3} />))}
          {[0, Math.floor((bars.length - 1) / 2), bars.length - 1].filter((value, index, values) => values.indexOf(value) === index).map(index => <text key={index} className="rg-chart-axis-label" x={margin.left + band * (index + 0.5)} y={height - 12} textAnchor={index === 0 ? 'start' : index === bars.length - 1 ? 'end' : 'middle'}>{chartTime(bars[index]?.timestamp ?? '', bars[0]?.timestamp.includes('T') ?? false)}</text>)}
          {activeX !== null && <line className="rg-chart-crosshair" x1={activeX} x2={activeX} y1={priceTop} y2={volumeTop + volumeHeight} />}
        </svg>
        {active !== undefined && activeX !== null && <div className="rg-chart-tooltip" data-side={activeX > width * 0.7 ? 'left' : 'right'} style={{ left: `${(activeX / width) * 100}%` }} role="status">
          <strong>{chartTime(active.startTimestamp, true)}{active.count > 1 ? ` → ${chartTime(active.endTimestamp, true)}` : ''}</strong>
          {active.count > 1 && <span>{t('chart.bucket', { count: active.count })}</span>}
          <dl>{(['open', 'high', 'low', 'close', 'adjustedClose', 'volume'] as const).map(key => <div key={key}><dt>{t(`chart.${key}`)}</dt><dd>{formatNumber(active[key])}</dd></div>)}</dl>
        </div>}
      </div>}
      <p className="rg-chart-hint">{t('chart.interactionHint')}</p>
    </ChartFrame>
  )
}

export interface AllocationItem {
  readonly id: string
  readonly label: string
  readonly weight: number | null
  readonly pnl: number | null
  readonly currency: string
}

export function AllocationBars({ items, concentration, selectedId, onSelect, t }: {
  readonly items: readonly AllocationItem[]
  readonly concentration?: Record<string, unknown> | undefined
  readonly selectedId?: string | null
  readonly onSelect?: (id: string) => void
  readonly t: Translate
}) {
  const maxPnl = Math.max(1e-9, ...items.map(item => Math.abs(item.pnl ?? 0)))
  const percentFormat = new Intl.NumberFormat(undefined, { style: 'percent', maximumFractionDigits: 2 })
  const concentrationFormat = new Intl.NumberFormat(undefined, { maximumFractionDigits: 3 })
  return (
    <ChartFrame
      title={t('finance.portfolio.allocation')}
      description={t('finance.portfolio.allocationHint')}
      t={t}
      table={{ columns: [t('finance.portfolio.columns.instrument'), t('finance.portfolio.columns.weight'), t('finance.portfolio.columns.unrealizedPnl'), t('finance.portfolio.columns.currency')], rows: items.map(item => [item.label, exactNumber(item.weight), exactNumber(item.pnl), item.currency]) }}
      legend={<><span data-series="price">{t('finance.portfolio.columns.weight')}</span><span data-series="positive">{t('chart.positivePnl')}</span><span data-series="negative">{t('chart.negativePnl')}</span></>}
    >
      {concentration !== undefined && <dl className="rg-chart-inline-facts">{['top1Weight', 'top5Weight', 'hhi', 'effectivePositions'].map(key => <div key={key}><dt>{t(`finance.portfolio.${key}`)}</dt><dd>{typeof concentration[key] === 'number' ? key.endsWith('Weight') ? percentFormat.format(concentration[key] as number) : concentrationFormat.format(concentration[key] as number) : formatNumber(concentration[key])}</dd></div>)}</dl>}
      {items.length === 0 ? <FinanceEmpty>{t('chart.noPositions')}</FinanceEmpty> : <div className="rg-allocation-bars">{items.map(item => {
        const pnlWidth = item.pnl === null ? 0 : (Math.abs(item.pnl) / maxPnl) * 86
        return <button type="button" key={item.id} className="rg-allocation-row" data-selected={selectedId === item.id || undefined} aria-pressed={selectedId === item.id} onClick={() => { onSelect?.(item.id) }}>
          <span className="rg-allocation-label">{item.label}<small>{item.currency}</small></span>
          <svg viewBox="0 0 180 24" role="img" aria-label={`${t('finance.portfolio.columns.weight')}: ${item.weight === null ? '—' : percentFormat.format(item.weight)}`}><line className="rg-chart-axis" x1="0" x2="180" y1="20" y2="20" /><rect className="rg-chart-weight" x="0" y="9" width={Math.max(0, Math.min(180, (item.weight ?? 0) * 180))} height="11" /><text x="0" y="8">{item.weight === null ? '—' : percentFormat.format(item.weight)}</text></svg>
          <svg viewBox="0 0 180 24" role="img" aria-label={`${t('finance.portfolio.columns.unrealizedPnl')}: ${formatNumber(item.pnl)}`}><line className="rg-chart-zero" x1="90" x2="90" y1="2" y2="22" />{item.pnl !== null && <rect className="rg-chart-pnl" data-direction={item.pnl >= 0 ? 'positive' : 'negative'} x={item.pnl >= 0 ? 90 : 90 - pnlWidth} y="6" width={Math.max(1, pnlWidth)} height="12" />}<text x={item.pnl !== null && item.pnl < 0 ? 86 : 94} y="16" textAnchor={item.pnl !== null && item.pnl < 0 ? 'end' : 'start'}>{formatNumber(item.pnl)}</text></svg>
        </button>
      })}</div>}
    </ChartFrame>
  )
}

export interface ScenarioItem {
  readonly name: string
  readonly probability: number | null
  readonly perShare: number | null
}

export function ScenarioBars({ items, currency, selected, onSelect, t }: {
  readonly items: readonly ScenarioItem[]
  readonly currency: string
  readonly selected?: string | null
  readonly onSelect?: (name: string) => void
  readonly t: Translate
}) {
  const max = Math.max(1e-9, ...items.map(item => Math.abs(item.perShare ?? 0)))
  return (
    <ChartFrame title={t('finance.valuation.scenarioValues')} description={t('finance.valuation.scenarioValuesHint')} t={t} table={{ columns: [t('finance.valuation.columns.scenario'), t('finance.valuation.columns.probability'), t('finance.valuation.columns.perShare')], rows: items.map(item => [item.name, exactNumber(item.probability), exactNumber(item.perShare)]) }}>
      {items.length === 0 ? <FinanceEmpty>{t('chart.noScenarios')}</FinanceEmpty> : <div className="rg-scenario-bars">{items.map(item => {
        const width = item.perShare === null ? 0 : (Math.abs(item.perShare) / max) * 86
        return <button type="button" key={item.name} data-selected={selected === item.name || undefined} aria-pressed={selected === item.name} onClick={() => { onSelect?.(item.name) }}>
          <span>{item.name}<small>{t('finance.valuation.columns.probability')} {formatNumber(item.probability)}</small></span>
          <svg viewBox="0 0 180 28" role="img" aria-label={`${item.name}: ${formatNumber(item.perShare)} ${currency}`}><line className="rg-chart-zero" x1="90" x2="90" y1="2" y2="26" />{item.perShare !== null && <rect className="rg-chart-pnl" data-direction={item.perShare >= 0 ? 'positive' : 'negative'} x={item.perShare >= 0 ? 90 : 90 - width} y="7" width={Math.max(1, width)} height="13" />}<text x={item.perShare !== null && item.perShare < 0 ? 86 : 94} y="18" textAnchor={item.perShare !== null && item.perShare < 0 ? 'end' : 'start'}>{formatNumber(item.perShare)}</text></svg>
        </button>
      })}</div>}
    </ChartFrame>
  )
}

export interface SensitivityCell {
  readonly terminalGrowth: number
  readonly perShare: number | null
}

export interface SensitivityRow {
  readonly wacc: number
  readonly values: readonly SensitivityCell[]
}

export function SensitivityMatrix({ rows, center, currency, warnings, source, t }: {
  readonly rows: readonly SensitivityRow[]
  readonly center?: { readonly wacc: number; readonly terminalGrowth: number; readonly perShare: number | null } | undefined
  readonly currency: string
  readonly warnings: readonly string[]
  readonly source?: ReactNode
  readonly t: Translate
}) {
  const columns = rows[0]?.values ?? []
  const baseRow = center === undefined ? -1 : rows.findIndex(row => row.wacc === center.wacc)
  const baseColumn = center === undefined ? -1 : columns.findIndex(cell => cell.terminalGrowth === center.terminalGrowth)
  const initial = baseRow >= 0 && baseColumn >= 0 ? baseRow * columns.length + baseColumn : 0
  const [activeIndex, setActiveIndex] = useState(initial)
  const cells = rows.flatMap(row => row.values)
  const finite = cells.map(cell => cell.perShare).filter((value): value is number => value !== null)
  const minimum = finite.length === 0 ? 0 : Math.min(...finite)
  const maximum = finite.length === 0 ? 1 : Math.max(...finite)
  const active = cells[activeIndex]
  const activeRow = rows[Math.floor(activeIndex / Math.max(1, columns.length))]
  const cellWidth = Math.max(124, ...cells.map(cell => formatNumber(cell.perShare).length * 8 + 24))
  const cellHeight = 58
  const left = 92
  const top = 66
  const width = Math.max(520, left + columns.length * cellWidth + 18)
  const height = top + rows.length * cellHeight + 20
  const select = (index: number, target?: SVGGElement) => {
    const bounded = Math.max(0, Math.min(cells.length - 1, index))
    setActiveIndex(bounded)
    const svg = target?.ownerSVGElement
    const next = svg?.querySelector(`[data-matrix-index="${bounded}"]`)
    if (next instanceof SVGGElement) next.focus()
  }
  return (
    <ChartFrame
      title={t('finance.valuation.sensitivity')}
      description={t('finance.valuation.sensitivityHint')}
      t={t}
      source={source}
      table={{ columns: [t('finance.valuation.wacc'), t('finance.valuation.columns.terminalGrowth'), `${t('finance.valuation.perShare')} (${currency})`], rows: rows.flatMap(row => row.values.map(cell => [exactNumber(row.wacc), exactNumber(cell.terminalGrowth), exactNumber(cell.perShare)])) }}
      legend={<span data-series="base">{t('chart.baseCell')}</span>}
    >
      {rows.length === 0 || columns.length === 0 ? <FinanceEmpty>{t('chart.noSensitivity')}</FinanceEmpty> : <>
        <div className="rg-chart-matrix-scroll"><svg className="rg-sensitivity-matrix" viewBox={`0 0 ${width} ${height}`} role="group" aria-label={t('finance.valuation.sensitivity')}>
          <text className="rg-chart-axis-title" x={left} y="18">{t('finance.valuation.columns.terminalGrowth')}</text>
          {columns.map((cell, column) => <text key={cell.terminalGrowth} className="rg-chart-axis-label" x={left + column * cellWidth + cellWidth / 2} y="46" textAnchor="middle">{formatNumber(cell.terminalGrowth)}</text>)}
          {rows.map((row, rowIndex) => <g key={row.wacc}>
            <text className="rg-chart-axis-label" x={left - 12} y={top + rowIndex * cellHeight + cellHeight / 2 + 4} textAnchor="end">{formatNumber(row.wacc)}</text>
            {row.values.map((cell, columnIndex) => {
              const index = rowIndex * columns.length + columnIndex
              const isBase = rowIndex === baseRow && columnIndex === baseColumn
              const ratio = cell.perShare === null || maximum === minimum ? 0.5 : (cell.perShare - minimum) / (maximum - minimum)
              return <g
                key={cell.terminalGrowth}
                data-matrix-index={index}
                data-base={isBase || undefined}
                role="button"
                tabIndex={activeIndex === index ? 0 : -1}
                aria-label={`${t('finance.valuation.wacc')} ${formatNumber(row.wacc)}, ${t('finance.valuation.columns.terminalGrowth')} ${formatNumber(cell.terminalGrowth)}, ${t('finance.valuation.perShare')} ${exactNumber(cell.perShare)} ${currency}`}
                onFocus={() => { setActiveIndex(index) }}
                onClick={() => { setActiveIndex(index) }}
                onKeyDown={(event: KeyboardEvent<SVGGElement>) => {
                  const next = nextMatrixIndex(index, event.key, rows.length, columns.length)
                  if (next === undefined) return
                  event.preventDefault()
                  select(next, event.currentTarget)
                }}
              >
                <rect className="rg-sensitivity-cell" x={left + columnIndex * cellWidth + 2} y={top + rowIndex * cellHeight + 2} width={cellWidth - 4} height={cellHeight - 4} fillOpacity={0.06 + Math.max(0, Math.min(1, ratio)) * 0.2} />
                {isBase && <><rect className="rg-sensitivity-base-outer" x={left + columnIndex * cellWidth + 1} y={top + rowIndex * cellHeight + 1} width={cellWidth - 2} height={cellHeight - 2} /><rect className="rg-sensitivity-base-inner" x={left + columnIndex * cellWidth + 5} y={top + rowIndex * cellHeight + 5} width={cellWidth - 10} height={cellHeight - 10} /></>}
                <text className="rg-sensitivity-value" x={left + columnIndex * cellWidth + cellWidth / 2} y={top + rowIndex * cellHeight + cellHeight / 2 + 4} textAnchor="middle">{formatNumber(cell.perShare)}</text>
              </g>
            })}
          </g>)}
        </svg></div>
        <p className="rg-chart-selection" role="status">{activeRow !== undefined && active !== undefined ? `${t('finance.valuation.wacc')} ${exactNumber(activeRow.wacc)} · ${t('finance.valuation.columns.terminalGrowth')} ${exactNumber(active.terminalGrowth)} · ${exactNumber(active.perShare)} ${currency}` : '—'}</p>
        <p className="rg-chart-hint">{t('chart.matrixKeyboard')}</p>
      </>}
      {warnings.length > 0 && <ul className="rg-chart-warnings">{warnings.map(warning => <li key={warning}>{warning}</li>)}</ul>}
    </ChartFrame>
  )
}

export function CalibrationPlot({ value, t }: { readonly value: unknown; readonly t: Translate }) {
  const { bins, brierScore } = readCalibration(value)
  const width = 480
  const height = 320
  const left = 50
  const bottom = 42
  const plot = 230
  return (
    <section className="rg-calibration" aria-label={t('finance.calibration.title')}>
      <dl className="rg-chart-inline-facts"><div><dt>{t('finance.calibration.brier')}</dt><dd>{brierScore === null ? '—' : formatNumber(brierScore)}</dd></div></dl>
      {brierScore === null && <p className="rg-chart-hint">{t('finance.calibration.brierUnavailable')}</p>}
      {bins.length === 0 ? <FinanceEmpty>{t('finance.calibration.noBins')}</FinanceEmpty> : <ChartFrame
        title={t('finance.calibration.title')}
        description={t('finance.calibration.description')}
        t={t}
        source={<ProvenanceList value={value} t={t} />}
        table={{ columns: [t('finance.calibration.predictedMean'), t('finance.calibration.observedFrequency'), t('finance.calibration.count'), 'lower', 'upper'], rows: bins.map(bin => [exactNumber(bin.predictedMean), exactNumber(bin.observedFrequency), exactNumber(bin.count), exactNumber(bin.lower), exactNumber(bin.upper)]) }}
        legend={<><span data-series="price">{t('finance.calibration.bins')}</span><span data-series="reference">{t('finance.calibration.reference')}</span></>}
      >
        <svg className="rg-calibration-plot" viewBox={`0 0 ${width} ${height}`} role="img" aria-label={t('finance.calibration.description')}>
          {[0, 0.25, 0.5, 0.75, 1].map(tick => <g key={tick}><line className="rg-chart-grid" x1={left + tick * plot} x2={left + tick * plot} y1="16" y2={16 + plot} /><line className="rg-chart-grid" x1={left} x2={left + plot} y1={16 + plot - tick * plot} y2={16 + plot - tick * plot} /><text className="rg-chart-axis-label" x={left + tick * plot} y={16 + plot + 20} textAnchor="middle">{formatNumber(tick)}</text><text className="rg-chart-axis-label" x={left - 8} y={20 + plot - tick * plot} textAnchor="end">{formatNumber(tick)}</text></g>)}
          <line className="rg-chart-reference" x1={left} x2={left + plot} y1={16 + plot} y2="16" />
          {bins.map((bin, index) => <g key={index} className="rg-calibration-bin"><circle cx={left + bin.predictedMean * plot} cy={16 + plot - bin.observedFrequency * plot} r={Math.min(14, 5 + Math.sqrt(bin.count))} /><title>{`${formatNumber(bin.predictedMean)} → ${formatNumber(bin.observedFrequency)} · n=${formatNumber(bin.count)}`}</title></g>)}
          <text className="rg-chart-axis-title" x={left + plot / 2} y={height - 4} textAnchor="middle">{t('finance.calibration.predictedMean')}</text>
          <text className="rg-chart-axis-title" transform={`translate(14 ${16 + plot / 2}) rotate(-90)`} textAnchor="middle">{t('finance.calibration.observedFrequency')}</text>
        </svg>
      </ChartFrame>}
    </section>
  )
}

export function ReturnSparkline({ points, t }: { readonly points: readonly PortfolioReturnPoint[]; readonly t: Translate }) {
  return <Sparkline values={points.map(point => point.value)} label={t('finance.portfolio.returns')} emptyLabel={t('finance.portfolio.noReturns')} />
}

