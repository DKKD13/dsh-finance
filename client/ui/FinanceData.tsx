import { useState } from 'react'
import type { JsonValue } from '../../src/graph.ts'
import type { Translate } from '../store.ts'
import { readPortfolioReturns } from '../chart-data.ts'
import { asRecord, displayValue, FinanceEmpty, formatNumber, operationResult, Provenance, ProvenanceList, RawJson } from './FinanceCommon.tsx'
import { AllocationBars, ChartFrame, ReturnSparkline, ScenarioBars, SensitivityMatrix } from './FinanceCharts.tsx'

function recordArray(value: unknown, depth = 0): Record<string, unknown>[] | undefined {
  if (depth > 4) return undefined
  if (Array.isArray(value)) {
    const rows = value.map(asRecord)
    return rows.every(row => row !== undefined) ? rows as Record<string, unknown>[] : undefined
  }
  const record = asRecord(value)
  if (record === undefined) return undefined
  for (const key of ['history', 'points', 'bars', 'candles', 'items', 'rows', 'evaluations', 'cards', 'positions', 'data', 'result']) {
    const rows = recordArray(record[key], depth + 1)
    if (rows !== undefined) return rows
  }
  return undefined
}

export function AutoTable({ value, t }: { readonly value: unknown; readonly t: Translate }) {
  const rows = recordArray(operationResult(value as JsonValue | null))
  if (rows === undefined || rows.length === 0) return null
  const columns = [...rows.slice(0, 20).reduce((keys, row) => {
    for (const key of Object.keys(row)) if (keys.size < 12) keys.add(key)
    return keys
  }, new Set<string>())]
  return (
    <div className="rg-finance-table-wrap">
      <table className="rg-finance-table">
        <thead><tr>{columns.map(column => <th key={column}>{column}</th>)}</tr></thead>
        <tbody>{rows.slice(0, 50).map((row, index) => <tr key={index}>{columns.map(column => <td key={column}>{displayValue(row[column])}</td>)}</tr>)}</tbody>
      </table>
      {rows.length > 50 && <p className="rg-finance-table-note">{t('finance.table.truncated', { shown: 50, total: rows.length })}</p>}
    </div>
  )
}

export function PrimitiveSummary({ value }: { readonly value: unknown }) {
  let record = asRecord(value)
  if (record !== undefined) {
    for (const key of ['quote', 'data', 'result']) {
      const nested = asRecord(record[key])
      if (nested !== undefined) { record = nested; break }
    }
  }
  if (record === undefined) return null
  const entries = Object.entries(record).filter(([key, entry]) => !['metadata', 'provenance', 'history', 'points', 'bars', 'candles'].includes(key)
    && (entry === null || ['string', 'number', 'boolean'].includes(typeof entry))).slice(0, 14)
  if (entries.length === 0) return null
  return <dl className="rg-finance-summary">{entries.map(([key, entry]) => <div key={key}><dt>{key}</dt><dd>{displayValue(entry)}</dd></div>)}</dl>
}

export function MarketResult({ value, t }: { readonly value: JsonValue | null; readonly t: Translate }) {
  if (value === null) return null
  const result = operationResult(value)
  const itemsValue = asRecord(result)?.items
  const items = Array.isArray(itemsValue) ? itemsValue.map(asRecord).filter((item): item is Record<string, unknown> => item !== undefined) : []
  return (
    <div className="rg-finance-result">
      <PrimitiveSummary value={result} />
      {items.length === 0 && <AutoTable value={result as JsonValue} t={t} />}
      {items.map((item, index) => <article className="rg-finance-source-item" key={String(item.contentHash ?? index)}>
        <h4>{displayValue(item.title)}</h4>
        <code>{displayValue(item.canonicalUrl)}</code>
        <PrimitiveSummary value={item.data ?? item} />
        <AutoTable value={item.data as JsonValue} t={t} />
        <Provenance value={item} t={t} />
        <RawJson value={item} t={t} />
      </article>)}
      {items.length === 0 && <Provenance value={value} t={t} />}
      <RawJson value={value} t={t} />
    </div>
  )
}

export function PortfolioResult({ value, provenanceValue, instrumentLabels, t }: { readonly value: unknown; readonly provenanceValue?: unknown; readonly instrumentLabels?: ReadonlyMap<string, string>; readonly t: Translate }) {
  const [selectedPosition, setSelectedPosition] = useState<string | null>(null)
  const lineage = provenanceValue ?? value
  const result = asRecord(operationResult(value as JsonValue | null))
  if (result === undefined) return <RawJson value={value} t={t} />
  const positions = (Array.isArray(result.positions) ? result.positions : []).map(asRecord).filter((row): row is Record<string, unknown> => row !== undefined)
  const totals = asRecord(result.totals)
  const concentration = asRecord(result.concentration)
  const returns = readPortfolioReturns(result)
  const warnings = Array.isArray(result.warnings) ? result.warnings.filter((entry): entry is string => typeof entry === 'string') : []
  const fxRows = positions.map(position => asRecord(position.fx)).filter((row): row is Record<string, unknown> => row !== undefined)
  const positionLabel = (position: Record<string, unknown>) => instrumentLabels?.get(String(position.instrumentId)) || displayValue(position.instrumentId ?? position.id)
  const weightFormat = new Intl.NumberFormat(undefined, { style: 'percent', maximumFractionDigits: 2 })
  const allocation = positions.map((position, index) => {
    const original = asRecord(position.original)
    const base = asRecord(position.base)
    const id = String(position.id ?? position.instrumentId ?? index)
    const pnl = base?.unrealizedPnl ?? original?.unrealizedPnl
    return { id, label: positionLabel(position), weight: typeof position.weight === 'number' ? position.weight : null, pnl: typeof pnl === 'number' ? pnl : null, currency: String(base?.currency ?? position.currency ?? '') }
  })
  return (
    <div className="rg-finance-result">
      <dl className="rg-finance-summary">
        <div><dt>{t('finance.portfolio.asOf')}</dt><dd>{displayValue(result.asOf)}</dd></div>
        <div><dt>{t('finance.portfolio.baseCurrency')}</dt><dd>{displayValue(result.baseCurrency)}</dd></div>
        {totals !== undefined && Object.entries(totals).map(([key, entry]) => <div key={key}><dt>{t(`finance.portfolio.${key}`)}</dt><dd>{formatNumber(entry)}</dd></div>)}
      </dl>
      {warnings.length > 0 && <ul className="rg-chart-warnings">{warnings.map(warning => <li key={warning}>{warning}</li>)}</ul>}
      <AllocationBars items={allocation} concentration={concentration} selectedId={selectedPosition} onSelect={setSelectedPosition} t={t} />
      {positions.length > 0 && (
        <div className="rg-finance-table-wrap">
          <table className="rg-finance-table">
            <thead><tr>{['instrument', 'quantity', 'price', 'currency', 'marketValue', 'baseMarketValue', 'weight', 'unrealizedPnl'].map(label => <th key={label}>{t(`finance.portfolio.columns.${label}`)}</th>)}</tr></thead>
            <tbody>{positions.map((position, index) => {
              const original = asRecord(position.original)
              const base = asRecord(position.base)
              const id = String(position.id ?? position.instrumentId ?? index)
              return <tr key={id} data-selected={selectedPosition === id || undefined}>
                <td><button type="button" className="rg-finance-table-link" aria-pressed={selectedPosition === id} onClick={() => { setSelectedPosition(id) }}>{positionLabel(position)}</button></td>
                <td>{formatNumber(original?.quantity)}</td><td>{formatNumber(original?.price)}</td><td>{displayValue(position.currency)}</td>
                <td>{formatNumber(original?.marketValue)}</td><td>{formatNumber(base?.marketValue)}</td>
                <td>{typeof position.weight === 'number' ? weightFormat.format(position.weight) : '—'}</td>
                <td>{formatNumber(base?.unrealizedPnl ?? original?.unrealizedPnl)}</td>
              </tr>
            })}</tbody>
          </table>
        </div>
      )}
      <section className="rg-finance-subsection"><h4>{t('finance.portfolio.returns')}</h4>
        {returns.length === 0 ? <FinanceEmpty>{t('finance.portfolio.noReturns')}</FinanceEmpty> : <ChartFrame title={t('finance.portfolio.returns')} t={t} table={{ columns: ['timestamp', 'return'], rows: returns.map(point => [point.timestamp, point.value === null ? '—' : String(point.value)]) }}><ReturnSparkline points={returns} t={t} /></ChartFrame>}
      </section>
      {fxRows.length > 0 && (
        <section className="rg-finance-subsection">
          <h4>{t('finance.portfolio.fx')}</h4>
          <div className="rg-finance-table-wrap"><table className="rg-finance-table">
            <thead><tr>{['pair', 'rate', 'asOf', 'availableAt', 'provider'].map(label => <th key={label}>{t(`finance.portfolio.fxColumns.${label}`)}</th>)}</tr></thead>
            <tbody>{fxRows.map((fx, index) => <tr key={`${String(fx.from)}-${String(fx.to)}-${index}`}><td>{`${displayValue(fx.from)}/${displayValue(fx.to)}`}</td><td>{formatNumber(fx.rate)}</td><td>{displayValue(fx.asOf)}</td><td>{displayValue(fx.availableAt)}</td><td>{displayValue(fx.provider)}</td></tr>)}</tbody>
          </table></div>
        </section>
      )}
      <ProvenanceList value={lineage} t={t} />
      <RawJson value={value} t={t} />
    </div>
  )
}

export function ValuationResult({ value, provenanceValue, t }: { readonly value: unknown; readonly provenanceValue?: unknown; readonly t: Translate }) {
  const [selectedScenario, setSelectedScenario] = useState<string | null>(null)
  const lineage = provenanceValue ?? value
  const result = asRecord(operationResult(value as JsonValue | null))
  if (result === undefined) return <RawJson value={value} t={t} />
  const weighted = asRecord(result.weighted) ?? result
  const scenarios = (Array.isArray(result.scenarios) ? result.scenarios : []).map(asRecord).filter((row): row is Record<string, unknown> => row !== undefined)
  const sensitivity = asRecord(result.sensitivity)
  const sensitivityRows = (Array.isArray(sensitivity?.rows) ? sensitivity.rows : []).map(asRecord).filter((row): row is Record<string, unknown> => row !== undefined).flatMap(row => {
    if (typeof row.wacc !== 'number' || !Array.isArray(row.values)) return []
    return [{ wacc: row.wacc, values: row.values.map(asRecord).filter((cell): cell is Record<string, unknown> => cell !== undefined && typeof cell.terminalGrowth === 'number').map(cell => ({ terminalGrowth: cell.terminalGrowth as number, perShare: typeof cell.perShare === 'number' ? cell.perShare : null })) }]
  })
  const sensitivityCenter = asRecord(sensitivity?.center)
  const center = typeof sensitivityCenter?.wacc === 'number' && typeof sensitivityCenter.terminalGrowth === 'number'
    ? { wacc: sensitivityCenter.wacc, terminalGrowth: sensitivityCenter.terminalGrowth, perShare: typeof sensitivityCenter.perShare === 'number' ? sensitivityCenter.perShare : null }
    : undefined
  const warnings = Array.isArray(result.warnings) ? result.warnings.filter((entry): entry is string => typeof entry === 'string') : []
  const currency = displayValue(result.currency)
  return (
    <div className="rg-finance-result">
      <dl className="rg-finance-summary">
        <div><dt>{t('finance.valuation.method')}</dt><dd>{displayValue(result.method)}</dd></div>
        <div><dt>{t('finance.valuation.currency')}</dt><dd>{currency}</dd></div>
        {['enterpriseValue', 'equityValue', 'perShare', 'peerMedian'].map(key => weighted[key] !== undefined || result[key] !== undefined
          ? <div key={key}><dt>{t(`finance.valuation.${key}`)}</dt><dd>{formatNumber(weighted[key] ?? result[key])}</dd></div>
          : null)}
      </dl>
      <ScenarioBars items={scenarios.map((scenario, index) => ({ name: displayValue(scenario.name ?? index), probability: typeof scenario.probability === 'number' ? scenario.probability : null, perShare: typeof scenario.perShare === 'number' ? scenario.perShare : null }))} currency={currency} selected={selectedScenario} onSelect={setSelectedScenario} t={t} />
      {scenarios.length > 0 && (
        <section className="rg-finance-subsection"><h4>{t('finance.valuation.assumptions')}</h4>
          <div className="rg-finance-table-wrap"><table className="rg-finance-table">
            <thead><tr>{['scenario', 'probability', 'wacc', 'terminalGrowth', 'taxRate', 'equityValue', 'perShare'].map(label => <th key={label}>{t(`finance.valuation.columns.${label}`)}</th>)}</tr></thead>
            <tbody>{scenarios.map((scenario, index) => {
              const statements = Array.isArray(scenario.incomeStatement) ? scenario.incomeStatement : []
              const taxRate = asRecord(statements[0])?.taxRate ?? scenario.taxRate
              const name = displayValue(scenario.name ?? index)
              return <tr key={name} data-selected={selectedScenario === name || undefined}><td><button type="button" className="rg-finance-table-link" aria-pressed={selectedScenario === name} onClick={() => { setSelectedScenario(name) }}>{name}</button></td><td>{formatNumber(scenario.probability)}</td><td>{formatNumber(scenario.wacc)}</td><td>{formatNumber(scenario.terminalGrowth)}</td><td>{formatNumber(taxRate)}</td><td>{formatNumber(scenario.equityValue)}</td><td>{formatNumber(scenario.perShare)}</td></tr>
            })}</tbody>
          </table></div>
        </section>
      )}
      {sensitivityRows.length > 0 && <SensitivityMatrix rows={sensitivityRows} center={center} currency={currency} warnings={warnings} source={<ProvenanceList value={lineage} t={t} />} t={t} />}
      {sensitivityRows.length === 0 && warnings.length > 0 && <ul className="rg-chart-warnings">{warnings.map(warning => <li key={warning}>{warning}</li>)}</ul>}
      <ProvenanceList value={lineage} t={t} />
      <RawJson value={value} t={t} />
    </div>
  )
}
