import { useEffect, useRef, useState } from 'react'

function isoDate(date: Date) { return date.toISOString().slice(0, 10) }
function monthDate(month: number, day = 1) { return new Date(Date.UTC(Math.floor(month / 12), month % 12, day)) }

export function StockDateRange({ start: initialStart, end: initialEnd, locale, onApply, onClose }: {
  readonly start: string; readonly end: string; readonly locale?: string | undefined
  readonly onApply: (start: string, inclusiveEnd: string) => void; readonly onClose: () => void
}) {
  const zh = !locale || locale.startsWith('zh')
  const text = (cn: string, en: string) => zh ? cn : en
  const dialog = useRef<HTMLDialogElement>(null)
  const today = isoDate(new Date())
  const now = new Date()
  const currentMonth = now.getUTCFullYear() * 12 + now.getUTCMonth()
  const initial = initialStart ? new Date(initialStart) : null
  const [month, setMonth] = useState(initial && Number.isFinite(initial.getTime()) ? initial.getUTCFullYear() * 12 + initial.getUTCMonth() : currentMonth - 1)
  const [start, setStart] = useState(initialStart.slice(0, 10))
  const [end, setEnd] = useState(initialEnd.slice(0, 10))
  useEffect(() => { dialog.current?.showModal() }, [])
  const choose = (value: string) => {
    if (!start || end) { setStart(value); setEnd('') }
    else if (value < start) { setEnd(start); setStart(value) }
    else setEnd(value)
  }
  const close = () => { dialog.current?.close(); onClose() }
  const valid = Boolean(start && end && start <= end && end <= today)
  return <dialog ref={dialog} className="rg-stock-date-dialog" aria-labelledby="rg-stock-date-title" onCancel={event => { event.preventDefault(); close() }}>
    <header><h3 id="rg-stock-date-title">{text('选择日期范围', 'Choose date range')}</h3><button type="button" aria-label={text('关闭', 'Close')} onClick={close}>×</button></header>
    <div className="rg-stock-date-inputs"><label>{text('从', 'From')}<input type="date" value={start} max={end || today} onChange={event => setStart(event.target.value)}/></label><span>—</span><label>{text('到', 'To')}<input type="date" value={end} min={start || undefined} max={today} onChange={event => setEnd(event.target.value)}/></label></div>
    <div className="rg-stock-calendar-nav"><button type="button" aria-label={text('上个月', 'Previous month')} onClick={() => setMonth(value => value - 1)}>‹</button><button type="button" aria-label={text('下个月', 'Next month')} disabled={month >= currentMonth} onClick={() => setMonth(value => value + 1)}>›</button></div>
    <div className="rg-stock-calendar-months">{[month, month + 1].map(monthNumber => {
      const first = monthDate(monthNumber)
      const offset = first.getUTCDay()
      return <section key={monthNumber}><h4>{new Intl.DateTimeFormat(zh ? 'zh-CN' : 'en-US', {year:'numeric',month:'long',timeZone:'UTC'}).format(first)}</h4><table><thead><tr>{(zh ? ['日','一','二','三','四','五','六'] : ['Su','Mo','Tu','We','Th','Fr','Sa']).map(day => <th key={day}>{day}</th>)}</tr></thead><tbody>{Array.from({length:6},(_,week) => <tr key={week}>{Array.from({length:7},(_,day) => {
        const date = monthDate(monthNumber, week * 7 + day - offset + 1)
        const value = isoDate(date)
        const outside = date.getUTCMonth() !== first.getUTCMonth()
        return <td key={day}><button type="button" data-date={value} data-outside={outside || undefined} data-range={start && end && value > start && value < end || undefined} aria-label={new Intl.DateTimeFormat(zh ? 'zh-CN' : 'en-US', {dateStyle:'full',timeZone:'UTC'}).format(date)} aria-pressed={value === start || value === end} disabled={value > today || outside} onClick={() => choose(value)} onKeyDown={event => {
          const delta = event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : event.key === 'ArrowDown' ? 7 : event.key === 'ArrowUp' ? -7 : 0
          if (!delta) return
          event.preventDefault()
          const next = new Date(date.getTime() + delta * 86400000), target = isoDate(next)
          if (target > today) return
          const targetMonth = next.getUTCFullYear() * 12 + next.getUTCMonth()
          if (targetMonth < month) setMonth(targetMonth)
          else if (targetMonth > month + 1) setMonth(targetMonth - 1)
          requestAnimationFrame(() => dialog.current?.querySelector<HTMLButtonElement>(`button[data-date="${target}"]:not(:disabled)`)?.focus())
        }}>{date.getUTCDate()}</button></td>
      })}</tr>)}</tbody></table></section>
    })}</div>
    <footer><button type="button" className="rg-btn" onClick={() => { setStart(''); setEnd('') }}>{text('重置', 'Reset')}</button><span>{text('开始日与结束日均包含在内', 'Start and end dates are included')}</span><button type="button" className="rg-btn" data-primary disabled={!valid} onClick={() => { if (valid) { onApply(start, end); close() } }}>{text('应用', 'Apply')}</button></footer>
  </dialog>
}
