import { useState } from 'react'
import type { FormEvent } from 'react'
import type { JsonObject } from '../../src/finance/types.ts'
import type { Translate } from '../store.ts'
import { Field } from './FinanceCommon.tsx'

/** Manual observations only. Prices and source availability are supplied by the user. */
export function PortfolioEntryForm({ busy, t, onSubmit }: {
  readonly busy: boolean
  readonly t: Translate
  readonly onSubmit: (input: JsonObject) => Promise<boolean>
}) {
  const [title, setTitle] = useState(''), [currency, setCurrency] = useState('USD')
  const [asOf, setAsOf] = useState(''), [availableAt, setAvailableAt] = useState('')
  const [positions, setPositions] = useState([{ symbol: '', quantity: '', price: '', cost: '' }])
  const patch = (index: number, key: keyof typeof positions[number], value: string) => setPositions(current => current.map((row, i) => i === index ? { ...row, [key]: value } : row))
  const submit = (event: FormEvent) => {
    event.preventDefault()
    const id = `portfolio:manual:${crypto.randomUUID()}`
    const cutoff = new Date(`${asOf}Z`).toISOString()
    const supplied = { provider: 'manual', asOf: cutoff, availableAt: new Date(`${availableAt}Z`).toISOString(), fetchedAt: new Date().toISOString(), provenance: { entryMethod: 'manual', sourceRefs: [] } }
    const baseCurrency = currency.trim().toUpperCase()
    void onSubmit({
      portfolio: { id, title: title.trim(), metadata: supplied }, baseCurrency, asOf: cutoff, metadata: supplied, fx: [],
      positions: positions.map((row, index) => ({ id: `position:${id}:${index}`, quantity: Number(row.quantity), price: Number(row.price), costBasisPerUnit: Number(row.cost), metadata: supplied, instrument: { id: `instrument:manual:${baseCurrency}:${row.symbol.trim().toUpperCase()}`, title: row.symbol.trim().toUpperCase(), symbol: row.symbol.trim().toUpperCase(), currency: baseCurrency, metadata: supplied } })),
    })
  }
  return <form className="rg-portfolio-entry rg-finance-form" onSubmit={submit}>
    <div className="rg-portfolio-meta">
      <Field label={t('finance.portfolio.entry.name')}><input required value={title} onChange={event => setTitle(event.target.value)} /></Field>
      <Field label={t('finance.portfolio.baseCurrency')}><input required pattern="[A-Za-z]{3}" maxLength={3} value={currency} onChange={event => setCurrency(event.target.value)} /></Field>
      <Field label={t('finance.portfolio.entry.asOf')}><input type="datetime-local" required value={asOf} onChange={event => setAsOf(event.target.value)} /></Field>
      <Field label={t('finance.portfolio.entry.availableAt')}><input type="datetime-local" required value={availableAt} onChange={event => setAvailableAt(event.target.value)} /></Field>
    </div>
    <div className="rg-discovery-table-wrap"><table className="rg-pf-table rg-portfolio-entry-table"><thead><tr>{['symbol', 'quantity', 'price', 'cost'].map(key => <th key={key}>{t(`finance.portfolio.entry.${key}`)}</th>)}<th /></tr></thead><tbody>{positions.map((row, index) => <tr key={index}>
      {(['symbol', 'quantity', 'price', 'cost'] as const).map(key => <td key={key}><input aria-label={`${t(`finance.portfolio.entry.${key}`)} ${index + 1}`} type={key === 'symbol' ? 'text' : 'number'} required min={key === 'symbol' ? undefined : 0} step={key === 'symbol' ? undefined : 'any'} value={row[key]} onChange={event => patch(index, key, event.target.value)} /></td>)}
      <td><button type="button" className="rg-btn" disabled={positions.length === 1} onClick={() => setPositions(current => current.filter((_, i) => i !== index))}>{t('finance.portfolio.entry.remove')}</button></td>
    </tr>)}</tbody></table></div>
    <p className="rg-finance-block-description">{t('finance.portfolio.entry.hint')}</p>
    <div className="rg-finance-form-actions"><button type="button" className="rg-btn" onClick={() => setPositions(current => [...current, { symbol: '', quantity: '', price: '', cost: '' }])}>{t('finance.portfolio.entry.add')}</button><button type="submit" className="rg-btn" data-primary disabled={busy}>{t('finance.portfolio.action')}</button></div>
  </form>
}
