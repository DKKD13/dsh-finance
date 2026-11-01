import { useEffect, useRef, useState } from 'react'
import type { FormEvent, ReactNode } from 'react'
import type { FinanceStore, MarketHistoryInput } from '../finance-store.ts'
import type { MarketBar } from '../chart-data.ts'
import { readMarketHistory } from '../chart-data.ts'

function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url; link.download = filename; link.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export function historyCsv(bars: readonly MarketBar[]): string {
  return 'timestamp,open,high,low,close,adjustedClose,volume\r\n' + bars.map(bar => [bar.timestamp, bar.open, bar.high, bar.low, bar.close, bar.adjustedClose, bar.volume].map(value => value === null ? '' : `"${String(value).replaceAll('"', '""')}"`).join(',')).join('\r\n')
}

/** Returns use exact matching timestamps; unmatched/missing observations stay gaps. */
export function comparisonReturns(primary: readonly MarketBar[], other: readonly MarketBar[]) {
  const lookup = new Map(other.map(bar => [bar.timestamp, bar.close]))
  const aligned = primary.map(bar => ({ timestamp: bar.timestamp, primary: bar.close, other: lookup.get(bar.timestamp) ?? null }))
  const base = aligned.find(row => row.primary !== null && row.primary !== 0 && row.other !== null && row.other !== 0)
  if (!base || base.primary === null || base.other === null) return []
  const start = aligned.indexOf(base)
  return aligned.slice(start).map(row => ({ timestamp: row.timestamp, primary: row.primary === null ? null : (row.primary / base.primary! - 1) * 100, other: row.other === null ? null : (row.other / base.other! - 1) * 100 }))
}

export function StockChartTools({ store, request, value, locale, onCalendar, children }: {
  readonly store: FinanceStore; readonly request: MarketHistoryInput; readonly value: unknown
  readonly locale?: string | undefined; readonly onCalendar: () => void; readonly children: ReactNode | ((tools: ReactNode) => ReactNode)
}) {
  const zh = !locale || locale.startsWith('zh')
  const text = (cn: string, en: string) => zh ? cn : en
  const root = useRef<HTMLDivElement>(null)
  const token = useRef(0)
  const [comparing, setComparing] = useState(false)
  const [compareSymbol, setCompareSymbol] = useState('')
  const [comparison, setComparison] = useState<{symbol: string; bars: readonly MarketBar[]} | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [grid, setGrid] = useState(true)
  const [volume, setVolume] = useState(true)
  const [expanded, setExpanded] = useState(false)
  const bars = readMarketHistory(value).bars
  const aligned = comparison ? comparisonReturns(bars, comparison.bars) : []
  useEffect(() => { token.current += 1; setComparison(null); setBusy(false); setError('') }, [request.symbol, request.range, request.start, request.end, request.interval, value])
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') { setExpanded(false); setComparing(false) } }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])
  const compare = async (event: FormEvent) => {
    event.preventDefault()
    const symbol = compareSymbol.trim().toUpperCase()
    if (!/^[A-Z^][A-Z0-9.^=_-]{0,19}$/u.test(symbol) || symbol === request.symbol.toUpperCase()) { setError(text('请输入另一个有效代码。', 'Enter another valid symbol.')); return }
    const id = ++token.current
    setBusy(true); setError('')
    const result = await store.readHistory({ ...request, symbol })
    if (id !== token.current) return
    setBusy(false)
    if (!result.ok) { setError(`${result.error.code}: ${result.error.message}`); return }
    const series = readMarketHistory(result.result)
    if (series.symbol?.toUpperCase() !== symbol || series.bars.length === 0) { setError(text('没有该标的的可用历史数据。', 'No history returned for this symbol.')); return }
    if (comparisonReturns(bars, series.bars).length === 0) { setError(text('两个序列没有共同的有效时间点，请调整区间或频率。', 'The series have no common valid timestamps. Change the period or interval.')); return }
    setComparison({ symbol, bars: series.bars }); setComparing(false)
  }
  const screenshot = async () => {
    const svg = root.current?.querySelector<SVGSVGElement>('.rg-stock-comparison svg, .rg-stock-chart-plot > svg')
    if (!svg) return
    try {
      const clone = svg.cloneNode(true) as SVGSVGElement
      const originals = [svg, ...svg.querySelectorAll('*')]
      const copies = [clone, ...clone.querySelectorAll('*')]
      originals.forEach((element, i) => {
        const computed = getComputedStyle(element)
        const copy = copies[i]
        if (!copy) return
        for (const property of ['fill','stroke','stroke-width','opacity','font-family','font-size','font-weight','stop-color','stop-opacity','stroke-dasharray']) {
          const propertyValue = computed.getPropertyValue(property)
          copy.setAttribute(property, propertyValue.startsWith('url(') ? propertyValue.replace(/url\([^#]*#([^)"]+)"?\)/u, 'url(#$1)') : propertyValue)
        }
      })
      clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg')
      const source = new Blob([new XMLSerializer().serializeToString(clone)], { type: 'image/svg+xml' })
      const url = URL.createObjectURL(source)
      try {
        const image = new Image(); image.src = url
        await image.decode()
        const canvas = document.createElement('canvas')
        const bounds = svg.getBoundingClientRect()
        canvas.width = Math.round(bounds.width * 2); canvas.height = Math.round(bounds.height * 2)
        const context = canvas.getContext('2d')
        if (!context) throw new Error('Canvas unavailable')
        context.fillStyle = getComputedStyle(root.current!).backgroundColor
        context.fillRect(0, 0, canvas.width, canvas.height)
        context.drawImage(image, 0, 0, canvas.width, canvas.height)
        const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/png'))
        if (!blob) throw new Error('PNG unavailable')
        download(blob, `${request.symbol}-chart.png`)
      } finally { URL.revokeObjectURL(url) }
    } catch (cause) { setError(text('无法导出截图：', 'Could not export chart: ') + String(cause)) }
  }
  const actions = (<div className="rg-stock-chart-tools-actions">
      <button type="button" onClick={onCalendar} aria-label={text('选择日期范围', 'Choose date range')} title={text('选择日期范围', 'Choose date range')}><svg viewBox="0 0 20 20" aria-hidden><path d="M4 5h12v12H4zM4 8h12M7 3v4m6-4v4M7 11h2v2H7z"/></svg></button>
      <button type="button" aria-expanded={comparing} onClick={() => { setComparing(current => !current); setError('') }}>{text('比较', 'Compare')}⌄</button>
      <button type="button" aria-label={text('截图', 'Screenshot')} title={text('截图', 'Screenshot')} disabled={bars.length === 0} onClick={() => { void screenshot() }}><svg viewBox="0 0 20 20" aria-hidden><path d="M3 6h3l2-3h4l2 3h3v11H3z"/><circle cx="10" cy="11" r="3"/></svg></button>
      <button type="button" aria-label={expanded ? text('退出全屏', 'Exit fullscreen') : text('全屏图表', 'Expand chart')} title={text('全屏图表', 'Expand chart')} aria-pressed={expanded} onClick={() => setExpanded(current => !current)}><svg viewBox="0 0 20 20" aria-hidden><path d="M3 8V3h5M12 3h5v5M17 12v5h-5M8 17H3v-5M3 3l5 5m9-5-5 5m5 9-5-5M3 17l5-5"/></svg></button>
      <details className="rg-stock-chart-more"><summary aria-label={text('更多图表选项', 'More chart options')} title={text('更多图表选项', 'More chart options')}>⋮</summary><div><label><input type="checkbox" checked={grid} onChange={event => setGrid(event.target.checked)}/>{text('网格线', 'Grid lines')}</label><label><input type="checkbox" checked={volume} onChange={event => setVolume(event.target.checked)}/>{text('成交量', 'Volume')}</label><button type="button" disabled={!bars.length} onClick={() => download(new Blob(['\uFEFF', historyCsv(bars)], {type:'text/csv;charset=utf-8'}), `${request.symbol}-history.csv`)}>{text('下载数据 · CSV', 'Download data · CSV')}</button></div></details>
    </div>)
  return <div ref={root} className="rg-stock-chart-tools" data-grid={grid} data-volume={volume} data-expanded={expanded || undefined}>
    {(comparison !== null || typeof children !== 'function') && actions}
    {comparing && <form className="rg-stock-compare-form" onSubmit={event => { void compare(event) }}><label>{text('比较标的', 'Compare instrument')}<input autoFocus value={compareSymbol} onChange={event => setCompareSymbol(event.target.value)} placeholder="MSFT" disabled={busy}/></label><button type="submit" className="rg-btn" data-primary disabled={busy || !compareSymbol.trim()}>{busy ? text('加载中…', 'Loading…') : text('添加比较', 'Add comparison')}</button><button type="button" className="rg-btn" onClick={() => setComparing(false)}>{text('取消', 'Cancel')}</button></form>}
    {error && <p className="rg-stock-tools-error" role="alert">{error}</p>}
    {comparison && <div className="rg-stock-comparison">
      <div className="rg-stock-compare-legend"><span>{request.symbol}</span><span>{comparison.symbol}</span><small>{text('共同时间点 · 起点归零', 'Matching timestamps · Returns from common start')}</small><button type="button" aria-label={text('移除比较', 'Remove comparison')} onClick={() => setComparison(null)}>×</button></div>
      <ReturnPlot rows={aligned} labels={[request.symbol, comparison.symbol]} />
      <p>{text('Yahoo 免费历史行情。只对齐相同时间戳，不填补缺失价格。', 'Free Yahoo history. Exact timestamps are aligned; missing prices remain gaps.')}</p>
    </div>}
    <div hidden={comparison !== null}>{typeof children === 'function' ? children(actions) : children}</div>
  </div>
}

function ReturnPlot({ rows, labels }: { readonly rows: ReturnType<typeof comparisonReturns>; readonly labels: readonly string[] }) {
  const values = rows.flatMap(row => [row.primary, row.other]).filter((value): value is number => value !== null)
  const low = Math.min(0, ...values), high = Math.max(0, ...values)
  const span = high - low || 1
  const x = (i: number) => 55 + i * 700 / Math.max(1, rows.length - 1)
  const y = (value: number) => 270 - (value - low) / span * 215
  const [active, setActive] = useState<number | null>(null)
  return <><svg viewBox="0 0 780 310" role="application" tabIndex={0} aria-label={`${labels.join(' / ')} %`} onPointerMove={event => { const bounds = event.currentTarget.getBoundingClientRect(); setActive(Math.max(0,Math.min(rows.length - 1,Math.round(((event.clientX - bounds.left) / bounds.width * 780 - 55) / 700 * (rows.length - 1))))) }} onPointerLeave={() => setActive(null)} onKeyDown={event => { if (event.key === 'Escape') setActive(null); else if (['ArrowLeft','ArrowRight','Home','End'].includes(event.key)) { event.preventDefault(); setActive(event.key === 'Home' ? 0 : event.key === 'End' ? rows.length - 1 : Math.max(0,Math.min(rows.length - 1,(active ?? 0) + (event.key === 'ArrowLeft' ? -1 : 1)))) } }}>
    {[low, (low + high) / 2, high].map((value,i) => <g key={i}><line className="rg-chart-grid" x1="55" x2="755" y1={y(value)} y2={y(value)}/><text x="48" y={y(value)+4} textAnchor="end">{value.toFixed(1)}%</text></g>)}
    {(['primary','other'] as const).map(key => { let started = false; return <path key={key} data-series={key} fill="none" d={rows.map((row,i) => { const value = row[key]; if (value === null) { started = false; return '' } const command = started ? 'L' : 'M'; started = true; return `${command}${x(i)},${y(value)}` }).join(' ')}/> })}
    {active !== null && rows[active] && <line className="rg-chart-crosshair" x1={x(active)} x2={x(active)} y1="40" y2="275"/>}
    {[0,rows.length - 1].map((i,j) => <text key={j} x={x(i)} y="300" textAnchor={j === 0 ? 'start' : 'end'}>{rows[i]?.timestamp.slice(0,10)}</text>)}
  </svg>{active !== null && rows[active] && <p role="status">{rows[active].timestamp} · {labels[0]} {rows[active].primary?.toFixed(2) ?? '—'}% · {labels[1]} {rows[active].other?.toFixed(2) ?? '—'}%</p>}</>
}
