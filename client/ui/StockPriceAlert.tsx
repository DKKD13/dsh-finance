import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'

interface PriceAlert { id: string; symbol: string; kind: 'price' | 'move'; value: number; direction: 'above' | 'below'; note: string }
const KEY = 'dsh-finance.local-price-alerts.v1'
function readAlerts(): PriceAlert[] {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(KEY) ?? '[]')
    return Array.isArray(value) ? value.filter((item): item is PriceAlert => item !== null && typeof item === 'object' && typeof item.id === 'string' && typeof item.symbol === 'string' && (item.kind === 'price' || item.kind === 'move') && typeof item.value === 'number' && Number.isFinite(item.value) && (item.direction === 'above' || item.direction === 'below') && typeof item.note === 'string') : []
  } catch { return [] }
}

/** Local, explicitly foreground-only reminders; no push service is implied. */
export function StockPriceAlert({ symbol, price, changePercent, locale, onResearch }: {
  readonly symbol: string; readonly price: number | null; readonly changePercent: number | null
  readonly locale?: string | undefined; readonly onResearch?: ((question: string) => void) | undefined
}) {
  const zh = !locale || locale.startsWith('zh')
  const text = (cn: string, en: string) => zh ? cn : en
  const dialog = useRef<HTMLDialogElement>(null)
  const trigger = useRef<HTMLButtonElement>(null)
  const [open, setOpen] = useState(false)
  const [kind, setKind] = useState<'price' | 'move'>('price')
  const [direction, setDirection] = useState<'above' | 'below'>('above')
  const [value, setValue] = useState('')
  const [note, setNote] = useState('')
  const [error, setError] = useState('')
  const [alerts, setAlerts] = useState(readAlerts)
  const [dismissed, setDismissed] = useState<string[]>([])
  const close = () => { dialog.current?.close(); setOpen(false); trigger.current?.focus() }
  useEffect(() => { if (open) dialog.current?.showModal() }, [open])
  const save = (event: FormEvent) => {
    event.preventDefault()
    const threshold = Number(value)
    if (!value.trim() || !Number.isFinite(threshold) || threshold <= 0) { setError(text('请输入大于 0 的数值。', 'Enter a number greater than zero.')); return }
    const duplicate = alerts.some(item => item.symbol === symbol && item.kind === kind && item.direction === direction && item.value === threshold && item.note === note)
    const next = duplicate ? alerts : [...alerts, { id: crypto.randomUUID(), symbol, kind, direction, value: threshold, note }]
    try { localStorage.setItem(KEY, JSON.stringify(next)); setAlerts(next); close() }
    catch { setError(text('无法保存本地提醒，请检查浏览器存储。', 'Cannot save the reminder. Check browser storage.')) }
  }
  const remove = (id: string) => {
    const next = alerts.filter(item => item.id !== id)
    try { localStorage.setItem(KEY, JSON.stringify(next)); setAlerts(next) }
    catch { setError(text('无法删除本地提醒。', 'Cannot remove the reminder.')) }
  }
  const relevant = alerts.filter(item => item.symbol === symbol)
  const triggered = relevant.filter(item => {
    const current = item.kind === 'price' ? price : changePercent
    return current !== null && !dismissed.includes(item.id) && (item.direction === 'above' ? current >= item.value : current <= (item.kind === 'move' ? -item.value : item.value))
  })
  return <>
    <button ref={trigger} type="button" className="rg-stock-alert-trigger" onClick={() => { setValue(price === null ? '' : (price * 1.05).toFixed(2)); setError(''); setOpen(true) }}>
      <svg width="17" height="17" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden><path d="m2 14 5-5 4 3 7-8M13 4h5v5"/></svg>{text('价格提醒', 'Price alert')}{relevant.length > 0 && <small>{relevant.length}</small>}
    </button>
    {triggered.map(item => <div className="rg-stock-alert-notice" role="status" key={item.id}><span>{symbol} {text('已达到本地提醒条件', 'reached your local alert threshold')}: {item.direction === 'above' ? '≥' : '≤'} {item.kind === 'move' && item.direction === 'below' ? '−' : ''}{item.value}{item.kind === 'move' ? '%' : ''}</span>{onResearch && <button type="button" onClick={() => onResearch(`${text('解释', 'Explain')} ${symbol} ${text('本次价格变动，核查来源并检查我的投资假说。', 'price move, checking sources and my investment thesis.')} ${item.note}`)}>{text('研究原因', 'Research the move')}</button>}<button type="button" aria-label={text('关闭提醒', 'Dismiss alert')} onClick={() => setDismissed(items => [...items, item.id])}>×</button></div>)}
    {open && <dialog ref={dialog} className="rg-stock-alert-dialog rg-conversation-dialog" aria-labelledby="rg-stock-alert-title" onCancel={event => { event.preventDefault(); close() }}>
      <header><h3 id="rg-stock-alert-title">{text('价格提醒', 'Price alert')}</h3><button type="button" aria-label={text('关闭', 'Close')} onClick={close}>×</button></header>
      <form onSubmit={save}>
        <label>{text('股票、代币或基金', 'Stock, token or fund')}<input value={symbol} readOnly /></label>
        <div className="rg-stock-alert-kinds" role="group" aria-label={text('警报标准', 'Alert criteria')}><button type="button" aria-pressed={kind === 'price'} onClick={() => { setKind('price'); setValue(price === null ? '' : (price * 1.05).toFixed(2)) }}>{text('目标价格', 'Target price')}</button><button type="button" aria-pressed={kind === 'move'} onClick={() => { setKind('move'); setValue('5') }}>{text('移动幅度', 'Price move')}</button></div>
        <div className="rg-stock-alert-threshold"><select aria-label={text('提醒方向', 'Alert direction')} value={direction} onChange={event => setDirection(event.target.value as 'above' | 'below')}><option value="above">{text('上升至', 'Rises to')}</option><option value="below">{text('下降至', 'Falls to')}</option></select><input required type="number" step="any" min="0.000001" aria-label={kind === 'price' ? text('目标价格', 'Target price') : text('移动幅度百分比', 'Price move percent')} value={value} onChange={event => { setValue(event.target.value); setError('') }} /><span>{kind === 'move' ? '%' : ''}</span></div>
        <p className="rg-stock-alert-current">{text('当前价格', 'Current price')}: {price === null ? '—' : price.toFixed(2)}</p>
        <p>{text('本地提醒 · 仅在此页面打开并刷新行情时检查。后台监控与推送尚未接入。', 'Local reminder · Checked when this page is open and quotes refresh. Background monitoring and push are not connected.')}</p>
        <label>{text('附加说明（可选）', 'Additional notes (optional)')}<textarea rows={3} value={note} onChange={event => setNote(event.target.value)} placeholder={text('查看新闻和资料，评估共识或争议', 'Check news and sources for consensus or disagreement')} /></label>
        {relevant.length > 0 && <section className="rg-stock-alert-saved"><h4>{text('已保存的本地提醒', 'Saved local reminders')}</h4>{relevant.map(item => <div key={item.id}><span>{item.direction === 'above' ? '≥' : '≤'} {item.kind === 'move' && item.direction === 'below' ? '−' : ''}{item.value}{item.kind === 'move' ? '%' : ''}</span><button type="button" onClick={() => remove(item.id)}>{text('删除', 'Remove')}</button></div>)}</section>}
        {error && <p role="alert">{error}</p>}
        <footer><button type="button" className="rg-btn" onClick={close}>{text('取消', 'Cancel')}</button><button type="submit" className="rg-btn" data-primary>{text('保存', 'Save')}</button></footer>
      </form>
    </dialog>}
  </>
}
