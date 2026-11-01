import { useState } from 'react'
import type { JsonObject } from '../../src/finance/types.ts'
import { financeOperation } from '../finance-store.ts'
import { FinanceEmpty, JsonObjectForm, LazyDetails, NodeProvenance, nodeResult, OperationStatus, useFinance } from './FinanceCommon.tsx'
import type { FinancePanelProps } from './FinanceCommon.tsx'
import { PortfolioResult, ValuationResult } from './FinanceData.tsx'
import { PortfolioEntryForm } from './PortfolioEntryForm.tsx'

const metadata = { provider: '', asOf: '', availableAt: '', fetchedAt: '', provenance: {} }
const instrument = { id: '', title: '', symbol: '', currency: '', metadata }

const PORTFOLIO_TEMPLATE: JsonObject = {
  portfolio: { id: '', title: '', metadata },
  baseCurrency: 'USD',
  asOf: '',
  positions: [{ id: '', instrument, quantity: 0, price: 0, costBasisPerUnit: 0, metadata }],
  fx: [{ from: 'USD', to: 'USD', rate: 1, asOf: '', availableAt: '', provider: 'identity' }],
  metadata,
}

const DCF_TEMPLATE: JsonObject = {
  instrument,
  currency: 'USD',
  units: { financials: 'millions', shares: 'millions' },
  sharesOutstanding: 0,
  scenarios: [{
    name: 'base', probability: 1, wacc: 0.1, terminalGrowth: 0.03, taxRate: 0.25,
    incomeStatement: { revenue: [0], ebit: [0] },
    cashFlowStatement: { depreciation: [0], capitalExpenditure: [0], workingCapitalChange: [0] },
    balanceSheet: { netDebt: 0 },
  }],
  sensitivity: { waccValues: [0.09, 0.1, 0.11], terminalGrowthValues: [0.02, 0.03, 0.04] },
  metadata,
}

const COMPS_TEMPLATE: JsonObject = {
  instrument,
  targetMetric: 0,
  basis: 'enterprise',
  peers: [{ id: '', multiple: 0 }],
  netDebt: 0,
  sharesOutstanding: 0,
  currency: 'USD',
  metadata,
}

export function PortfolioPanel({ store, t, nodes }: FinancePanelProps) {
  const state = useFinance(store)
  const operation = financeOperation(state, 'portfolio')
  const portfolios = nodes.filter(node => node.kind === 'portfolio' && !node.metadata.virtualFund)
  const instrumentLabels = new Map(nodes.filter(node => node.kind === 'instrument').map(node => [node.id, node.title]))
  return (
    <section className="rg-finance-section" aria-labelledby="rg-finance-portfolio-title">
      <div className="rg-finance-section-head"><div><h2 id="rg-finance-portfolio-title">{t('finance.portfolio.title')}</h2><p>{t('finance.portfolio.description')}</p></div></div>
      {operation.status === 'success' && <section className="rg-finance-block"><h3>{t('finance.latestResult')}</h3><PortfolioResult value={operation.result} instrumentLabels={instrumentLabels} t={t} /></section>}
      <section className="rg-finance-block">
        <h3>{t('finance.portfolio.saved')}</h3>
        {portfolios.length === 0 ? <FinanceEmpty>{t('finance.portfolio.empty')}</FinanceEmpty> : portfolios.map(node => (
          <LazyDetails className="rg-finance-record" key={node.id} defaultOpen={portfolios.length === 1} summary={<><span>{node.title}</span><code>{node.id}</code><NodeProvenance node={node} t={t} /></>}>
            {() => <PortfolioResult value={nodeResult(node)} provenanceValue={node.metadata} instrumentLabels={instrumentLabels} t={t} />}
          </LazyDetails>
        ))}
      </section>
      <section className="rg-finance-block">
        <h3>{t('finance.portfolio.new')}</h3>
        <p className="rg-finance-block-description">{t('finance.portfolio.newHint')}</p>
        <PortfolioEntryForm busy={operation.status === 'loading'} t={t} onSubmit={input => store.snapshotPortfolio(input)} />
        <details className="rg-portfolio-advanced"><summary>{t('finance.portfolio.entry.advanced')}</summary><JsonObjectForm template={PORTFOLIO_TEMPLATE} submitLabel={t('finance.portfolio.action')} busy={operation.status === 'loading'} t={t} onSubmit={input => store.snapshotPortfolio(input)} /></details>
        <OperationStatus operation={operation} t={t} idle={t('finance.portfolio.idle')} />
      </section>
    </section>
  )
}

export function ValuationsPanel({ store, t, nodes }: FinancePanelProps) {
  const state = useFinance(store)
  const operation = financeOperation(state, 'valuation')
  const valuations = nodes.filter(node => node.kind === 'valuation')
  const [method, setMethod] = useState<'dcf' | 'comps'>('dcf')
  return (
    <section className="rg-finance-section" aria-labelledby="rg-finance-valuations-title">
      <div className="rg-finance-section-head"><div><h2 id="rg-finance-valuations-title">{t('finance.valuation.title')}</h2><p>{t('finance.valuation.description')}</p></div></div>
      {operation.status === 'success' && <section className="rg-finance-block"><h3>{t('finance.latestResult')}</h3><ValuationResult value={operation.result} t={t} /></section>}
      <section className="rg-finance-block">
        <h3>{t('finance.valuation.saved')}</h3>
        {valuations.length === 0 ? <FinanceEmpty>{t('finance.valuation.empty')}</FinanceEmpty> : valuations.map(node => (
          <LazyDetails className="rg-finance-record" key={node.id} defaultOpen={valuations.length === 1} summary={<><span>{node.title}</span><code>{node.id}</code><NodeProvenance node={node} t={t} /></>}>
            {() => <ValuationResult value={nodeResult(node)} provenanceValue={node.metadata} t={t} />}
          </LazyDetails>
        ))}
      </section>
      <section className="rg-finance-block">
        <div className="rg-finance-block-heading"><h3>{t('finance.valuation.new')}</h3><div className="rg-tabs" role="group" aria-label={t('finance.valuation.method')}>
          {(['dcf', 'comps'] as const).map(value => <button type="button" className="rg-tab" data-active={method === value || undefined} aria-pressed={method === value} key={value} onClick={() => { setMethod(value) }}>{value.toUpperCase()}</button>)}
        </div></div>
        <p className="rg-finance-block-description">{t('finance.valuation.newHint')}</p>
        <JsonObjectForm key={method} template={method === 'dcf' ? DCF_TEMPLATE : COMPS_TEMPLATE} submitLabel={t(`finance.valuation.action.${method}`)} busy={operation.status === 'loading'} t={t} onSubmit={input => store.runValuation(method, input)} />
        <OperationStatus operation={operation} t={t} idle={t('finance.valuation.idle')} />
      </section>
    </section>
  )
}
