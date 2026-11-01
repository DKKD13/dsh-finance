import { useEffect, useRef, useState } from 'react'
import type { FinanceStore, MarketHistoryInput } from '../finance-store.ts'
import { readMarketHistory } from '../chart-data.ts'
import { formatNumber, ProvenanceList } from './FinanceCommon.tsx'
import type { Translate } from '../store.ts'
import { historyCsv } from './StockChartTools.tsx'
import { StockDateRange } from './StockDateRange.tsx'

const RANGES = [['1d','1D'],['5d','5D'],['1mo','1M'],['6mo','6M'],['ytd','YTD'],['1y','1Y'],['5y','5Y'],['max','MAX']] as const

/** A separate read keeps overview and historical-table range selections independent. */
export function StockHistoryPanel({ store, symbol, active, locale, t }: {
  readonly store: FinanceStore; readonly symbol: string; readonly active: boolean
  readonly locale?: string | undefined; readonly t: Translate
}) {
  const zh = !locale || locale.startsWith('zh'), text = (cn: string, en: string) => zh ? cn : en
  const [range, setRange] = useState('5y')
  const [interval, setInterval] = useState('1d')
  const [dates, setDates] = useState<{start:string;end:string} | null>(null)
  const [calendar, setCalendar] = useState(false)
  const [value, setValue] = useState<unknown>(null)
  const [busy, setBusy] = useState(false), [error, setError] = useState('')
  const [limit, setLimit] = useState(50), [descending, setDescending] = useState(true)
  const [retry, setRetry] = useState(0)
  const key = JSON.stringify({symbol,range,interval,dates,retry})
  const loaded = useRef('')
  useEffect(() => {
    if (!active || !symbol || loaded.current === key) return
    let cancelled = false
    setBusy(true); setError(''); setLimit(50)
    const request: MarketHistoryInput = {symbol, interval, ...(dates ?? {range})}
    void store.readHistory(request).then(response => {
      if (cancelled) return
      setBusy(false)
      if (!response.ok) { setError(`${response.error.code}: ${response.error.message}`); return }
      const history = readMarketHistory(response.result)
      if (history.symbol?.toUpperCase() !== symbol.toUpperCase()) { setError(text('数据返回的股票代码不匹配。', 'The returned symbol does not match.')); return }
      loaded.current = key; setValue(response.result)
    })
    return () => { cancelled = true }
  }, [active,key,store])
  const history = readMarketHistory(value)
  const stale = loaded.current !== key
  const rows = descending ? [...history.bars].reverse() : history.bars
  const priceFormat = new Intl.NumberFormat(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  const exportData = () => {
    const url = URL.createObjectURL(new Blob(['\uFEFF',historyCsv(history.bars)],{type:'text/csv;charset=utf-8'}))
    const link = document.createElement('a'); link.href = url; link.download = `${symbol}-historical.csv`; link.click()
    setTimeout(() => URL.revokeObjectURL(url),1000)
  }
  return <section hidden={!active} className="rg-stock-history" data-stock-tab-slot="historical" role="tabpanel" id="rg-market-tab-historical-panel" aria-labelledby="rg-market-tab-historical">
    <div className="rg-stock-history-toolbar"><div role="group" aria-label={text('历史数据区间', 'Historical period')}>{RANGES.map(([id,label]) => <button type="button" key={id} aria-pressed={!dates && range === id} onClick={() => { setDates(null); setRange(id) }}>{label}</button>)}<button type="button" aria-label={text('选择日期范围', 'Choose date range')} aria-pressed={dates !== null} onClick={() => setCalendar(true)}>▦</button></div>
      <details className="rg-stock-history-options"><summary>{text('更多选项', 'More options')}</summary><div><label>{text('频率', 'Frequency')}<select value={interval} onChange={event => setInterval(event.target.value)}><option value="1d">{text('每日', 'Daily')}</option><option value="1wk">{text('每周', 'Weekly')}</option><option value="1mo">{text('每月', 'Monthly')}</option></select></label><label><input type="checkbox" checked={descending} onChange={event => setDescending(event.target.checked)}/>{text('最新日期优先', 'Newest first')}</label></div></details>
      <button type="button" className="rg-btn" disabled={busy || stale || !history.bars.length} onClick={exportData}>{text('下载数据', 'Download data')} ↓</button>
    </div>
    {dates && <p className="rg-stock-history-dates">{dates.start} — {new Date(Date.parse(dates.end)-86400000).toISOString().slice(0,10)}</p>}
    {busy && <p role="status">{text('正在加载历史数据…', 'Loading historical data…')}</p>}
    {error && <p role="alert">{error} <button type="button" className="rg-btn" onClick={() => setRetry(value => value + 1)}>{text('重试', 'Retry')}</button></p>}
    <div className="rg-stock-history-table" data-stale={active && stale || undefined}><table><thead><tr>{[text('日期', 'Date'),text('开盘', 'Open'),text('最高', 'High'),text('最低', 'Low'),text('收盘', 'Close'),text('成交量', 'Volume')].map((label,i) => <th key={label}>{i === 0 ? <button type="button" onClick={() => setDescending(value => !value)}>{label} {descending ? '↓' : '↑'}</button> : label}</th>)}</tr></thead><tbody>{rows.slice(0,limit).map((bar,i) => <tr key={`${bar.timestamp}-${i}`}><td><time>{bar.timestamp.slice(0,10)}</time></td>{[bar.open,bar.high,bar.low,bar.close,bar.volume].map((number,j) => <td key={j} title={number === null ? undefined : String(number)}>{j < 4 && number !== null && Number.isFinite(number) && Math.abs(number) >= 1 ? priceFormat.format(number) : formatNumber(number)}</td>)}</tr>)}</tbody></table></div>
    {!busy && !error && !history.bars.length && <p>{text('所选区间没有可用价格。', 'No prices are available for this period.')}</p>}
    {rows.length > limit && <button type="button" className="rg-btn rg-stock-history-more" onClick={() => setLimit(value => value + 50)}>{text('查看更多', 'Show more')} ({Math.min(limit,rows.length)}/{rows.length})</button>}
    {value !== null && <details className="rg-stock-history-provenance"><summary>{text('数据来源', 'Data source')} · Yahoo</summary><ProvenanceList value={value} t={t}/></details>}
    {calendar && <StockDateRange start={dates?.start ?? ''} end={dates ? new Date(Date.parse(dates.end)-86400000).toISOString().slice(0,10) : ''} locale={locale} onClose={() => setCalendar(false)} onApply={(start,end) => setDates({start,end:new Date(Date.parse(end)+86400000).toISOString().slice(0,10)})}/>} 
  </section>
}
