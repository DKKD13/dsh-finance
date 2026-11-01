import { useEffect, useRef, useState } from 'react'
import type { FormEvent, ReactNode } from 'react'
import type { GraphNode } from '../../src/graph.ts'
import { financeOperation } from '../finance-store.ts'
import { readGuideBannerDismissed, writeGuideBannerDismissed } from '../onboarding.ts'
import {
  asRecord,
  displayValue,
  FinanceEdgeIcon,
  FinanceEmpty,
  formatNumber,
  LazyDetails,
  NodeProvenance,
  OperationStatus,
  Provenance,
  ProvenanceList,
  RawJson,
  useFinance,
} from './FinanceCommon.tsx'
import type { FinancePanelProps } from './FinanceCommon.tsx'
import { Field } from './FinanceCommon.tsx'
import { readMarketHistory, readQuote } from '../chart-data.ts'
import { deriveWorkflow } from '../workflow.ts'
import type { WorkflowStageKey } from '../workflow.ts'
import type { ResearchStore } from '../research-store.ts'
import { MarketChart } from './FinanceCharts.tsx'
import { StockChartTools } from './StockChartTools.tsx'
import { StockPriceAlert } from './StockPriceAlert.tsx'
import { StockDateRange } from './StockDateRange.tsx'
import { StockHistoryPanel } from './StockHistoryPanel.tsx'
import { StockSections } from './StockSections.tsx'

interface WorkflowPanelProps extends FinancePanelProps {
  readonly research?: ResearchStore | undefined
  readonly graphRevision: number
  readonly graphPhase: 'loading' | 'ready' | 'error'
  readonly graphError: { readonly code: string; readonly message: string } | null
  readonly onRefreshGraph: () => Promise<void>
  readonly onOpenLibrary: (id: string) => void
  readonly onOpenHypothesis: (id: string) => void
  readonly onOpenReport: (id: string) => void
  readonly onOpenGraph: (id: string) => void
  readonly onOpenAudit: () => void
}

export function OverviewPanel({ store, t, nodes, research, graphRevision, graphPhase, graphError, onRefreshGraph, onOpenLibrary, onOpenHypothesis, onOpenReport, onOpenGraph, onOpenAudit }: WorkflowPanelProps) {
  const [guideDismissed, setGuideDismissed] = useState(() => readGuideBannerDismissed())
  if (graphPhase === 'loading') return <div className="rg-state" role="status"><div className="rg-skeleton" /><div className="rg-skeleton" style={{ width: 'min(420px, 72%)' }} /><span>{t('finance.workflow.loading')}</span></div>
  if (graphPhase === 'error') return <div className="rg-state" role="alert"><p className="rg-state-title">{t('finance.workflow.errorTitle')}</p><p className="rg-state-detail">{graphError?.code}: {graphError?.message}</p><button type="button" className="rg-btn" data-primary onClick={() => { void onRefreshGraph() }}>{t('state.error.retry')}</button></div>

  const workflow = deriveWorkflow(nodes)
  const latestSource = workflow.sources[0]
  const latestHypothesis = workflow.hypotheses[0]
  const latestReport = workflow.reports[0]
  const dismissGuide = () => {
    writeGuideBannerDismissed(true)
    setGuideDismissed(true)
  }
  const createHypothesis = () => {
    if (research === undefined || latestSource === undefined) return
    research.beginHypothesis({ mode: 'create', evidenceId: latestSource.id })
    store.setSection('hypotheses')
  }
  const openStage = (key: WorkflowStageKey) => {
    if (key === 'collect') {
      if (latestSource === undefined) store.setSection('inbox')
      else onOpenLibrary(latestSource.id)
    } else if (key === 'compile') {
      const session = workflow.compiledSessions[0]
      if (session !== undefined) onOpenLibrary(session.id)
      else if (latestSource !== undefined) onOpenLibrary(latestSource.id)
      else store.setSection('inbox')
    } else if (key === 'hypotheses') {
      if (latestHypothesis !== undefined) onOpenHypothesis(latestHypothesis.id)
      else createHypothesis()
    } else if (key === 'report') {
      if (latestReport !== undefined) onOpenReport(latestReport.id)
      else store.setSection('reports')
    } else {
      store.setSection('predictions')
    }
  }
  const openRecent = (node: GraphNode) => {
    if (node.kind === 'source') onOpenLibrary(node.id)
    else if (node.kind === 'deliverable') onOpenReport(node.id)
    else if (node.kind === 'prediction') onOpenGraph(node.id)
    else onOpenHypothesis(node.id)
  }
  return (
    <section className="rg-finance-section rg-workflow-section" aria-labelledby="rg-finance-overview-title">
      <div className="rg-finance-section-head"><div><h2 id="rg-finance-overview-title">{t('finance.workflow.title')}</h2><p>{t('finance.workflow.description')}</p></div><div className="rg-workflow-head-actions"><span className="rg-revision">{t('header.revision', { revision: graphRevision })}</span><button type="button" className="rg-btn" onClick={() => { store.setSection('guide') }}>{t('guide.open')}</button></div></div>
      {workflow.sources.length === 0 && !guideDismissed && <aside className="rg-guide-nudge" aria-labelledby="rg-guide-nudge-title">
        <div>
          <strong id="rg-guide-nudge-title">{t('guide.banner.title')}</strong>
          <p>{t('guide.banner.body')}</p>
        </div>
        <div className="rg-guide-nudge-actions">
          <button type="button" className="rg-btn" data-primary onClick={() => { store.setSection('guide') }}>{t('guide.banner.open')}</button>
          <button type="button" className="rg-btn" onClick={dismissGuide}>{t('guide.banner.dismiss')}</button>
        </div>
      </aside>}
      <section className="rg-workflow-next" aria-label={t('finance.workflow.recommended')}>
        <div>
          {workflow.next === null && <><h3>{t('finance.workflow.complete.title')}</h3><p>{t('finance.workflow.complete.description', { revision: graphRevision })}</p></>}
          {workflow.next === 'collect' && <><h3>{t('finance.workflow.next.collect.title')}</h3><p>{t('finance.workflow.next.collect.description')}</p></>}
          {workflow.next === 'compile' && <><h3>{t('finance.workflow.next.compile.title')}</h3><p>{t('finance.workflow.next.compile.description', { count: workflow.sources.length })}</p></>}
          {workflow.next === 'hypotheses' && <><h3>{t('finance.workflow.next.hypotheses.title')}</h3><p>{t('finance.workflow.next.hypotheses.description')}</p></>}
          {workflow.next === 'report' && <><h3>{t('finance.workflow.next.report.title')}</h3><p>{t('finance.workflow.next.report.description', { count: workflow.hypotheses.length })}</p></>}
          {workflow.next === 'review' && <><h3>{t('finance.workflow.next.review.title')}</h3><p>{t('finance.workflow.next.review.description', { count: workflow.reports.length })}</p></>}
        </div>
        <div className="rg-workflow-next-actions">
          {workflow.next === null && <><button type="button" className="rg-btn" data-primary onClick={() => { store.setSection('predictions') }}>{t('finance.workflow.action.reviewPredictions')}</button><button type="button" className="rg-btn" onClick={onOpenAudit}>{t('finance.workflow.action.audit')}</button></>}
          {workflow.next === 'collect' && <button type="button" className="rg-btn" data-primary onClick={() => { store.setSection('inbox') }}>{t('finance.workflow.action.addSource')}</button>}
          {workflow.next === 'compile' && <button type="button" className="rg-btn" data-primary disabled={latestSource === undefined} onClick={() => { if (latestSource !== undefined) onOpenLibrary(latestSource.id) }}>{t('finance.workflow.action.compile')}</button>}
          {workflow.next === 'hypotheses' && <button type="button" className="rg-btn" data-primary disabled={research === undefined || latestSource === undefined} onClick={createHypothesis}>{t('finance.workflow.action.createHypothesis')}</button>}
          {workflow.next === 'report' && <><button type="button" className="rg-btn" data-primary disabled={latestHypothesis === undefined} onClick={() => { if (latestHypothesis !== undefined) onOpenHypothesis(latestHypothesis.id) }}>{t('finance.workflow.action.reviewHypotheses')}</button><button type="button" className="rg-btn" onClick={() => { store.setSection('reports') }}>{t('finance.workflow.action.research')}</button></>}
          {workflow.next === 'review' && <><button type="button" className="rg-btn" data-primary onClick={() => { store.setSection('predictions') }}>{t('finance.workflow.action.prediction')}</button><button type="button" className="rg-btn" onClick={onOpenAudit}>{t('finance.workflow.action.audit')}</button></>}
        </div>
      </section>
      <div className="rg-workflow-layout">
        <section className="rg-workflow-ledger" aria-labelledby="rg-workflow-ledger-title">
          <h3 id="rg-workflow-ledger-title">{t('finance.workflow.ledger')}</h3>
          <ol>{workflow.stages.map(stage => {
            const status = stage.complete ? 'complete' : workflow.next === stage.key ? 'next' : 'pending'
            return <li key={stage.key} data-state={status}>
              <button type="button" aria-current={status === 'next' ? 'step' : undefined} onClick={() => { openStage(stage.key) }}>
                <span><strong>{t(`finance.workflow.stage.${stage.key}`)}</strong><span>{t(`finance.workflow.count.${stage.key}`, { count: stage.count })}</span></span>
                <span className="rg-finance-badge" data-status={status}>{t(`finance.workflow.status.${status}`)}</span>
              </button>
            </li>
          })}</ol>
          <p className="rg-finance-block-description">{t('finance.workflow.ledgerHint')}</p>
        </section>
        <section className="rg-workflow-recent" aria-labelledby="rg-workflow-recent-title">
          <h3 id="rg-workflow-recent-title">{t('finance.workflow.recent')}</h3>
          {workflow.recent.length === 0 ? <FinanceEmpty>{t('finance.workflow.recentEmpty')}</FinanceEmpty> : <div>{workflow.recent.map(node => <button type="button" key={node.id} onClick={() => { openRecent(node) }}>
            <span className="rg-finance-badge">{t(`kind.${node.kind}`)}</span>
            <span className="rg-workflow-recent-title">{node.title}<code>{node.id}</code></span>
            <time dateTime={new Date(node.updatedAt).toISOString()}>{new Date(node.updatedAt).toISOString()}</time>
            <NodeProvenance node={node} t={t} />
          </button>)}</div>}
        </section>
      </div>
    </section>
  )
}

function FollowStar({ watched }: { readonly watched: boolean }) {
  return <svg className="rg-stock-follow-star" width="16" height="16" viewBox="0 0 20 20" fill={watched ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.35" aria-hidden="true"><path d="m10 2 2.5 5.2 5.7.8-4.1 4 .9 5.7-5-2.7-5 2.7.9-5.7-4.1-4 5.7-.8z"/></svg>
}

function WatchlistToggle({ node, store, t, busy, variant = 'default', locale }: {
  readonly node: GraphNode
  readonly store: FinancePanelProps['store']
  readonly t: FinancePanelProps['t']
  readonly busy: boolean
  readonly variant?: 'default' | 'stock'
  readonly locale?: string | undefined
}) {
  const watched = node.metadata.watchlist === true
  const symbol = String(node.metadata.symbol ?? node.content)
  const stock = variant === 'stock'
  return <button type="button" className={stock ? 'rg-stock-follow rg-stock-follow-action rg-watchlist-toggle' : 'rg-btn rg-watchlist-toggle'} aria-pressed={watched} aria-label={t(watched ? 'finance.market.watchRemoveFor' : 'finance.market.watchAddFor', { symbol })} disabled={busy} onClick={() => { void store.setInstrumentWatched(node, !watched) }}>
    {stock ? <><FollowStar watched={watched}/><span>{stockText(locale, t, watched ? '已关注' : '关注', watched ? 'Following' : 'Follow')}</span></> : t(watched ? 'finance.market.watchRemove' : 'finance.market.watchAdd')}
  </button>
}

function SearchResults({ value, t, onSelect, instruments, store, watchlistBusy }: { readonly value: unknown; readonly t: import('../store.ts').Translate; readonly onSelect: (symbol: string) => void; readonly instruments: readonly GraphNode[]; readonly store: FinancePanelProps['store']; readonly watchlistBusy: boolean }) {
  const record = asRecord(value)
  const hits = Array.isArray(value) ? value : Array.isArray(record?.hits) ? record.hits : []
  if (hits.length === 0) return <FinanceEmpty>{t('finance.market.searchEmpty')}</FinanceEmpty>
  return <div className="rg-finance-search-results">{hits.map((hit, index) => {
    const hitRecord = asRecord(hit)
    const node = asRecord(hitRecord?.node)
    const metadata = asRecord(node?.metadata)
    const symbol = typeof metadata?.symbol === 'string' ? metadata.symbol : typeof node?.content === 'string' ? node.content : ''
    const instrument = instruments.find(candidate => candidate.id === node?.id)
    return (
      <article key={String(node?.id ?? index)}>
        <div className="rg-finance-search-select">
          <button type="button" onClick={() => { onSelect(symbol) }} disabled={symbol.length === 0}>
            <div><strong>{displayValue(node?.title)}</strong><code>{displayValue(node?.id)}</code></div>
            <p>{displayValue(node?.content)}</p>
          </button>
          </div>
        <Provenance value={node?.metadata} t={t} />
      </article>
    )
  })}</div>
}

type StockDetailTab = 'overview' | 'financials' | 'earnings' | 'holders' | 'forecasts' | 'historical' | 'analysis'

interface StockDetailTabDefinition {
  readonly id: StockDetailTab
  readonly zh: string
  readonly en: string
}

const STOCK_DETAIL_TABS: readonly StockDetailTabDefinition[] = [
  { id: 'overview', zh: '概述', en: 'Overview' },
  { id: 'financials', zh: '财务数据', en: 'Financials' },
  { id: 'earnings', zh: '收益', en: 'Earnings' },
  { id: 'holders', zh: '持有者', en: 'Holders' },
  { id: 'forecasts', zh: '预测', en: 'Forecasts' },
  { id: 'historical', zh: '历史数据', en: 'Historical' },
  { id: 'analysis', zh: '分析', en: 'Analysis' },
]

function stockText(locale: string | undefined, t: import('../store.ts').Translate, zhText: string, enText: string): string {
  const zh = locale ? locale.toLowerCase().startsWith('zh') : t('finance.workspace') === '金融'
  return zh ? zhText : enText
}

function quoteNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

function quoteString(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null
}

function quoteCompanyName(quote: Record<string, unknown> | undefined, instrument: GraphNode | undefined, symbol: string): string {
  const actualName = quoteString(quote?.longName) ?? quoteString(quote?.shortName)
  const instrumentName = instrument?.title.trim()
  return actualName ?? (instrumentName !== undefined && instrumentName.length > 0 ? instrumentName : symbol || '—')
}

function quotePreviousClose(quote: Record<string, unknown> | undefined): number | null {
  return quoteNumber(quote?.previousClose) ?? quoteNumber(quote?.chartPreviousClose)
}

function quoteChange(price: number | null, previous: number | null): { readonly amount: number | null; readonly percent: number | null } {
  const amount = price !== null && previous !== null ? price - previous : null
  return { amount, percent: amount !== null && previous !== null && previous !== 0 ? (amount / previous) * 100 : null }
}

function quoteDirection(value: number | null): 'positive' | 'negative' | undefined {
  return value === null ? undefined : value >= 0 ? 'positive' : 'negative'
}

function formatQuoteTime(value: unknown, locale: string | undefined, timezone: string | null): string {
  if (typeof value !== 'string') return '—'
  const parsed = new Date(value)
  if (!Number.isFinite(parsed.getTime())) return value
  return new Intl.DateTimeFormat(locale?.toLowerCase().startsWith('zh') ? 'zh-CN' : 'en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: timezone ?? 'UTC',
    timeZoneName: 'short',
  }).format(parsed)
}

function marketFlag(quote: Record<string, unknown> | undefined): string {
  const timezone = quoteString(quote?.exchangeTimezoneName)?.toLowerCase() ?? ''
  if (timezone.includes('new_york') || timezone.includes('chicago') || timezone.includes('los_angeles')) return '🇺🇸'
  if (timezone.includes('toronto')) return '🇨🇦'
  if (timezone.includes('hong_kong')) return '🇭🇰'
  if (timezone.includes('shanghai')) return '🇨🇳'
  if (timezone.includes('tokyo')) return '🇯🇵'
  if (timezone.includes('london')) return '🇬🇧'
  if (timezone.includes('zurich')) return '🇨🇭'
  if (timezone.startsWith('europe/')) return '🇪🇺'
  return ''
}

function StockLogo({ symbol, name }: { readonly symbol: string; readonly name: string }) {
  const [failedSymbol, setFailedSymbol] = useState<string | null>(null)
  const mark = symbol.replace(/[^A-Za-z0-9]/g, '').slice(0, 2).toUpperCase() || name.slice(0, 1).toUpperCase()
  if (failedSymbol === symbol || symbol.length === 0) return <span className="rg-stock-detail-logo-fallback" aria-hidden>{mark}</span>
  return <img
    className="rg-stock-detail-logo"
    data-monochrome={symbol === 'AAPL' || undefined}
    src={`https://finance-logo.perplexity.ai/ticker/${encodeURIComponent(symbol)}?format=png&fallback=404&size=50`}
    alt=""
    width="40"
    height="40"
    onError={() => { setFailedSymbol(symbol) }}
  />
}

function QuoteHeader({ value, stale, t, instrument, locale, previewOnly, actions }: {
  readonly value: unknown
  readonly stale: boolean
  readonly t: import('../store.ts').Translate
  readonly instrument: GraphNode | undefined
  readonly locale: string | undefined
  readonly previewOnly: boolean
  readonly actions?: ReactNode
}) {
  const quote = readQuote(value)
  const instrumentSymbol = String(instrument?.metadata.symbol ?? instrument?.content ?? '').trim()
  const symbol = quoteString(quote?.symbol) ?? (instrumentSymbol.length > 0 ? instrumentSymbol : '—')
  const name = quoteCompanyName(quote, instrument, symbol)
  const exchange = quote?.exchangeName === 'PREVIEW_ONLY' ? stockText(locale, t, '演示行情', 'Demo quotes') : quoteString(quote?.fullExchangeName) ?? quoteString(quote?.exchangeName) ?? quoteString(instrument?.metadata.exchangeName) ?? '—'
  const currency = quoteString(quote?.currency) ?? quoteString(instrument?.metadata.currency) ?? '—'
  return (
    <header className="rg-stock-detail-identity">
      <div className="rg-stock-detail-identity-main rg-market-quote-head">
        <StockLogo symbol={symbol === '—' ? '' : symbol} name={name} />
        <div>
          <h1 id="rg-finance-market-title">{name}</h1>
          <p><strong>{symbol}</strong><span aria-hidden>·</span><span>{exchange}</span>{marketFlag(quote) !== '' && <span className="rg-stock-detail-flag" aria-label={exchange}>{marketFlag(quote)}</span>}<span aria-hidden>·</span><span>{currency}</span></p>
        </div>
      </div>
      <div className="rg-stock-detail-identity-meta">
        {previewOnly && <span className="rg-stock-detail-preview-badge">{stockText(locale, t, '演示', 'Demo')}</span>}
        {stale && <span className="rg-finance-badge" data-status="stale">{t('chart.stale')}</span>}
        {actions}
      </div>
    </header>
  )
}

function QuoteFacts({ value, t, instrument, store, watchlistBusy, locale, onResearch }: {
  readonly value: unknown
  readonly t: import('../store.ts').Translate
  readonly instrument: GraphNode | undefined
  readonly store: FinancePanelProps['store']
  readonly watchlistBusy: boolean
  readonly locale: string | undefined
  readonly onResearch: ((question: string) => void) | undefined
}) {
  const quote = readQuote(value)
  const instrumentSymbol = String(instrument?.metadata.symbol ?? instrument?.content ?? '').trim()
  const symbol = quoteString(quote?.symbol) ?? (instrumentSymbol.length > 0 ? instrumentSymbol : '—')
  const name = quoteCompanyName(quote, instrument, symbol)
  const firstTrade = quoteNumber(quote?.firstTradeDate)
  const firstTradeDate = firstTrade === null ? '—' : new Intl.DateTimeFormat(locale?.toLowerCase().startsWith('zh') ? 'zh-CN' : 'en-US', { year: 'numeric', month: 'short', day: 'numeric' }).format(new Date(firstTrade * 1000))
  const fiftyTwoWeekRange = quoteNumber(quote?.fiftyTwoWeekLow) === null && quoteNumber(quote?.fiftyTwoWeekHigh) === null
    ? '—'
    : `${formatNumber(quote?.fiftyTwoWeekLow ?? null)} – ${formatNumber(quote?.fiftyTwoWeekHigh ?? null)}`
  const researchQuestion = stockText(
    locale,
    t,
    `研究 ${name}（${symbol}）的最新公开财务与经营资料。优先核对公司披露和监管文件，区分事实、估计与缺失数据，并列出证据日期。`,
    `Research ${name} (${symbol}) using the latest public filings and operating disclosures. Prioritize company and regulatory sources, separate facts from estimates and missing data, and include source dates.`,
  )
  return (
    <aside className="rg-stock-detail-facts" aria-label={stockText(locale, t, '公司资料', 'Company facts')}>
      <div className="rg-stock-detail-facts-head">
        <h2>{stockText(locale, t, '公司资料', 'Company facts')}</h2>
        <div className="rg-stock-detail-fact-actions">
          {onResearch !== undefined && <button type="button" onClick={() => { onResearch(researchQuestion) }}>{stockText(locale, t, '研究', 'Research')}</button>}
        </div>
      </div>
      <dl className="rg-stock-detail-fact-list">
        <div><dt>{stockText(locale, t, '代码', 'Symbol')}</dt><dd>{symbol}</dd></div>
        <div><dt>{stockText(locale, t, '首次交易日期', 'First trade date')}</dt><dd>{firstTradeDate}</dd></div>
        <div><dt>{stockText(locale, t, '首席执行官', 'CEO')}</dt><dd>—</dd></div>
        <div><dt>{stockText(locale, t, '全职员工', 'Employees')}</dt><dd>—</dd></div>
        <div><dt>{stockText(locale, t, '行业', 'Industry')}</dt><dd>{quoteString(instrument?.metadata.sector) ?? '—'}</dd></div>
        <div><dt>{stockText(locale, t, '52周区间', '52-week range')}</dt><dd>{fiftyTwoWeekRange}</dd></div>
        <div><dt>{stockText(locale, t, '交易所', 'Exchange')}</dt><dd>{quoteString(quote?.fullExchangeName) ?? quoteString(quote?.exchangeName) ?? '—'}</dd></div>
        <div><dt>{stockText(locale, t, '时区', 'Timezone')}</dt><dd>{quoteString(quote?.exchangeTimezoneName) ?? quoteString(quote?.timezone) ?? '—'}</dd></div>
      </dl>
      <p className="rg-stock-detail-fact-note">
        {quoteString(quote?.longBusinessSummary) ?? stockText(locale, t, '当前行情响应未包含公司简介。', 'The current quote response does not include a company description.')}
      </p>
    </aside>
  )
}

function StockMetricGrid({ quote, value, locale, t }: {
  readonly quote: Record<string, unknown> | undefined
  readonly value: unknown
  readonly locale: string | undefined
  readonly t: import('../store.ts').Translate
}) {
  const history = readMarketHistory(value)
  const latest = history.bars.at(-1)
  const entries = [
    [stockText(locale, t, '预期市盈率', 'Forward P/E'), formatNumber(quote?.forwardPE)],
    [stockText(locale, t, '市值', 'Market cap'), formatNumber(quote?.marketCap)],
    [stockText(locale, t, '开盘', 'Open'), formatNumber(quote?.regularMarketOpen)],
    [stockText(locale, t, '过去市盈率', 'Trailing P/E'), formatNumber(quote?.trailingPE)],
    [stockText(locale, t, '当日区间', 'Day range'), `${formatNumber(quote?.regularMarketDayLow ?? null)} – ${formatNumber(quote?.regularMarketDayHigh ?? null)}`],
    [stockText(locale, t, '股息率', 'Dividend yield'), quoteNumber(quote?.dividendYield) === null ? '—' : `${formatNumber((quote!.dividendYield as number) * 100)}%`],
    [stockText(locale, t, '52周区间', '52-week range'), `${formatNumber(quote?.fiftyTwoWeekLow ?? null)} – ${formatNumber(quote?.fiftyTwoWeekHigh ?? null)}`],
    [stockText(locale, t, 'EPS', 'EPS'), formatNumber(quote?.trailingEps)],
    [stockText(locale, t, '成交量', 'Volume'), formatNumber(quote?.regularMarketVolume ?? latest?.volume ?? null)],
  ] as const
  return <dl className="rg-stock-detail-metrics">{entries.map(([label, content]) => <div key={label}><dt>{label}</dt><dd>{content}</dd></div>)}</dl>
}

export function MarketPanel({ store, t, nodes, onResearch, locale, demo = false }: FinancePanelProps & {
  readonly onResearch?: ((question: string) => void) | undefined
  readonly locale?: string | undefined
  readonly demo?: boolean | undefined
}) {
  const state = useFinance(store)
  const search = financeOperation(state, 'search')
  const quote = financeOperation(state, 'quote')
  const history = financeOperation(state, 'history')
  const savedQuote = store.getSnapshot().market.quote
  const savedHistory = store.getSnapshot().market.history
  const previousSavedQuoteSymbol = useRef(savedQuote?.symbol)
  const [query, setQuery] = useState('')
  const [searchAsOf, setSearchAsOf] = useState('')
  const [symbol, setSymbol] = useState(savedQuote?.symbol ?? savedHistory?.symbol ?? '')
  const [quoteAsOf, setQuoteAsOf] = useState(savedQuote?.asOf ?? '')
  const [historySymbol, setHistorySymbol] = useState(savedHistory?.symbol ?? savedQuote?.symbol ?? '')
  const [rangeMode, setRangeMode] = useState<'range' | 'custom'>(savedHistory?.start !== undefined || savedHistory?.end !== undefined ? 'custom' : 'range')
  const [range, setRange] = useState(savedHistory?.range ?? '1mo')
  const [start, setStart] = useState(savedHistory?.start ?? '')
  const [end, setEnd] = useState(savedHistory?.end ?? '')
  const [interval, setIntervalValue] = useState(savedHistory?.interval ?? '1d')
  const [activeTab, setActiveTab] = useState<StockDetailTab>('overview')
  const [calendar, setCalendar] = useState(false)
  const [advancedOpen, setAdvancedOpen] = useState(!savedQuote && !savedHistory)
  const previousSavedHistory = useRef(savedHistory)
  const historyFormRef = useRef<HTMLFormElement>(null)
  useEffect(() => {
    if (previousSavedHistory.current === savedHistory) return
    previousSavedHistory.current = savedHistory
    if (!savedHistory) return
    setHistorySymbol(savedHistory.symbol); setIntervalValue(savedHistory.interval)
    setRangeMode(savedHistory.start || savedHistory.end ? 'custom' : 'range')
    setRange(savedHistory.range ?? '1mo'); setStart(savedHistory.start ?? ''); setEnd(savedHistory.end ?? '')
  }, [savedHistory])
  const submittedQuote = state.market.quote
  const submittedHistory = state.market.history
  const instruments = nodes.filter(node => node.kind === 'instrument')
  const selectSymbol = (value: string) => {
    if (rangeMode === 'custom' && (!start.trim() || !end.trim())) {
      historyFormRef.current?.reportValidity()
      return
    }
    const selected = value.trim()
    if (!selected) return
    setSymbol(selected)
    setHistorySymbol(selected)
    setActiveTab('overview')
    void store.fetchQuote(selected, quoteAsOf)
    void store.fetchHistory({ ...historyRequest, symbol: selected })
  }
  const quoteRequest = { symbol: symbol.trim(), asOf: quoteAsOf }
  const historyRequest: Parameters<FinancePanelProps['store']['fetchHistory']>[0] = { symbol: historySymbol.trim(), interval, ...(rangeMode === 'custom' ? { start, end } : { range }) }
  const historyData = readMarketHistory(history.result)
  const quoteData = readQuote(quote.result)
  const quoteRequestChanged = submittedQuote === null || submittedQuote.symbol.toUpperCase() !== quoteRequest.symbol.toUpperCase() || submittedQuote.asOf !== quoteRequest.asOf
  const historyRequestChanged = submittedHistory === null
    || submittedHistory.symbol.toUpperCase() !== historyRequest.symbol.toUpperCase()
    || submittedHistory.interval !== historyRequest.interval
    || (submittedHistory.range ?? '') !== (historyRequest.range ?? '')
    || (submittedHistory.start ?? '') !== (historyRequest.start ?? '')
    || (submittedHistory.end ?? '') !== (historyRequest.end ?? '')
  const quoteStale = quote.status === 'loading' || quote.status === 'error' || quote.result !== null && quoteRequestChanged || (typeof quoteData?.symbol === 'string' && quoteData.symbol.toUpperCase() !== symbol.trim().toUpperCase())
  const historyStale = history.status === 'loading' || history.status === 'error' || history.result !== null && historyRequestChanged || (historyData.symbol !== null && historyData.symbol.toUpperCase() !== historySymbol.trim().toUpperCase())
  const selectedInstrument = instruments.find(node => String(node.metadata.symbol ?? '').toUpperCase() === symbol.trim().toUpperCase())
  const selectedProvenance = asRecord(selectedInstrument?.metadata.provenance)
  const previewOnly = selectedInstrument?.metadata.previewOnly === true
    || selectedInstrument?.metadata.provider === 'preview.fixture'
    || selectedProvenance?.previewOnly === true
  const watchedInstruments = instruments.filter(node => node.metadata.watchlist === true)
  const watchlist = financeOperation(state, 'watchlist')
  const watchlistBusy = watchlist.status === 'loading'
  const catalysts = selectedInstrument === undefined ? [] : nodes.filter(node => node.kind === 'catalyst' && (node.metadata.instrumentId === selectedInstrument.id || (Array.isArray(node.metadata.references) && node.metadata.references.includes(selectedInstrument.id))))
  const previousClose = quotePreviousClose(quoteData ?? undefined)
  const regularPrice = quoteNumber(quoteData?.regularMarketPrice)
  const regularChange = quoteChange(regularPrice, previousClose)
  const afterHoursPrice = quoteNumber(quoteData?.postMarketPrice)
  const afterHoursChange = quoteChange(afterHoursPrice, regularPrice)
  const currency = quoteString(quoteData?.currency) ?? '—'
  useEffect(() => {
    if (savedQuote?.symbol !== undefined && savedQuote.symbol !== previousSavedQuoteSymbol.current) {
      setSymbol(savedQuote.symbol)
      setHistorySymbol(savedQuote.symbol)
    }
    previousSavedQuoteSymbol.current = savedQuote?.symbol
  }, [savedQuote?.symbol])
  const changeRanges = [
    { id: '1d', label: '1D' },
    { id: '5d', label: '5D' },
    { id: '1mo', label: '1M' },
    { id: '6mo', label: '6M' },
    { id: 'ytd', label: 'YTD' },
    { id: '1y', label: '1Y' },
    { id: '5y', label: '5Y' },
    { id: 'max', label: 'MAX' },
  ] as const
  const rangeControls = (<div className="rg-stock-detail-range-toolbar" role="group" aria-label={t('finance.market.rangePreset')}>
              {changeRanges.map(item => <button
                type="button"
                key={item.id}
                aria-pressed={rangeMode === 'range' && range === item.id}
                disabled={history.status === 'loading' || historySymbol.trim().length === 0}
                onClick={() => {
                  setRangeMode('range')
                  setRange(item.id)
                  const nextInterval = item.id === '1d' ? '1m' : item.id === '5d' ? '15m' : '1d'
                  setIntervalValue(nextInterval)
                  void store.fetchHistory({ symbol: historySymbol.trim(), range: item.id, interval: nextInterval })
                }}
              >{item.label}</button>)}
            </div>)
  return (
    <section className="rg-finance-section rg-market-panel rg-stock-detail-page" data-loaded={quote.result !== null || undefined} aria-labelledby="rg-finance-market-title">
      <QuoteHeader value={quote.result} stale={quoteStale} t={t} instrument={selectedInstrument} locale={locale} previewOnly={previewOnly} actions={<div className="rg-stock-detail-actions">
        {selectedInstrument ? <WatchlistToggle node={selectedInstrument} store={store} t={t} busy={watchlistBusy} variant="stock" locale={locale} /> : <button type="button" className="rg-stock-follow rg-stock-follow-action" disabled={!symbol.trim() || quoteStale || watchlistBusy} onClick={() => { void store.followSymbol(symbol, quoteCompanyName(quoteData ?? undefined, selectedInstrument, symbol)) }}><FollowStar watched={false}/><span>{stockText(locale,t,'关注','Follow')}</span></button>}
        <StockPriceAlert symbol={symbol} price={quoteStale ? null : regularPrice} changePercent={quoteStale ? null : regularChange.percent} locale={locale} onResearch={onResearch}/>
      </div>} />
      {quote.status === 'error' && <div className="rg-stock-request-error">
        <div><strong>{stockText(locale, t, `无法获取 ${submittedQuote?.symbol ?? symbol} 的行情`, `Could not load ${submittedQuote?.symbol ?? symbol} quotes`)}</strong>
          {quote.result !== null && <p>{stockText(locale, t, '下方保留上次成功的结果，请核对股票代码与时间。', 'The last successful result remains below. Check its symbol and time.')}</p>}
          <details><summary>{stockText(locale, t, '错误详情', 'Error details')}</summary><OperationStatus operation={quote} t={t} idle="" /></details>
        </div>
        <button type="button" className="rg-btn" disabled={!submittedQuote?.symbol.trim()} onClick={() => { if (submittedQuote) void store.fetchQuote(submittedQuote.symbol, submittedQuote.asOf) }}>{stockText(locale, t, '重试行情', 'Retry quotes')}</button>
      </div>}
      {history.status === 'error' && <div className="rg-stock-request-error">
        <div><strong>{stockText(locale, t, `无法获取 ${submittedHistory?.symbol ?? historySymbol} 的历史价格`, `Could not load ${submittedHistory?.symbol ?? historySymbol} history`)}</strong>
          {history.result !== null && <p>{stockText(locale, t, '图表保留上次成功的结果。', 'The chart retains the last successful result.')}</p>}
          <details><summary>{stockText(locale, t, '错误详情', 'Error details')}</summary><OperationStatus operation={history} t={t} idle="" /></details>
        </div>
        <button type="button" className="rg-btn" disabled={!submittedHistory?.symbol.trim()} onClick={() => { if (submittedHistory) void store.fetchHistory(submittedHistory) }}>{stockText(locale, t, '重试历史价格', 'Retry history')}</button>
      </div>}
      <nav className="rg-stock-detail-tabs" role="tablist" aria-label={stockText(locale, t, '股票详情', 'Stock detail')}>
        {STOCK_DETAIL_TABS.map(tab => <button
          type="button"
          role="tab"
          id={`rg-market-tab-${tab.id}`}
          key={tab.id}
          aria-selected={activeTab === tab.id}
          aria-controls={`rg-market-tab-${tab.id}-panel`}
          tabIndex={activeTab === tab.id ? 0 : -1}
          data-active={activeTab === tab.id || undefined}
          onClick={() => { setActiveTab(tab.id) }}
          onKeyDown={event => {
            const index = STOCK_DETAIL_TABS.findIndex(candidate => candidate.id === tab.id)
            const next = event.key === 'ArrowRight' ? (index + 1) % STOCK_DETAIL_TABS.length : event.key === 'ArrowLeft' ? (index + STOCK_DETAIL_TABS.length - 1) % STOCK_DETAIL_TABS.length : event.key === 'Home' ? 0 : event.key === 'End' ? STOCK_DETAIL_TABS.length - 1 : -1
            const target = STOCK_DETAIL_TABS[next]
            if (target === undefined) return
            event.preventDefault()
            setActiveTab(target.id)
            event.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>('[role="tab"]')[next]?.focus()
          }}
        >{stockText(locale, t, tab.zh, tab.en)}</button>)}
      </nav>
      {activeTab === 'overview' && <div className="rg-stock-detail-overview" id="rg-market-tab-overview-panel" role="tabpanel" aria-labelledby="rg-market-tab-overview">
        <div className="rg-stock-detail-grid">
          <div className="rg-stock-detail-chart-card">
            <div className="rg-stock-detail-quotes rg-market-quote" data-stale={quoteStale || undefined}>
              <section>
                <span>{stockText(locale, t, '常规交易时段', 'Regular session')}</span>
                <div><small>{currency === 'USD' ? 'US$' : currency}</small><strong>{formatNumber(regularPrice)}</strong>{quoteStale && <span className="rg-finance-badge" data-status="stale">{t('chart.stale')}</span>}</div>
                <p data-direction={quoteDirection(regularChange.amount)}>{regularChange.amount === null ? '—' : `${regularChange.amount > 0 ? '+' : ''}${formatNumber(regularChange.amount)}${regularChange.percent === null ? '' : `  ${regularChange.percent > 0 ? '+' : ''}${regularChange.percent.toFixed(2)}%`}`}</p>
                <time dateTime={quoteString(quoteData?.regularMarketTime) ?? undefined}>{stockText(locale, t, '报价时间：', 'As of: ')}{formatQuoteTime(quoteData?.regularMarketTime, locale, quoteString(quoteData?.exchangeTimezoneName))}</time>
              </section>
              <section>
                <span>{stockText(locale, t, '盘后', 'After hours')}</span>
                <div><small>{afterHoursPrice === null ? '' : currency === 'USD' ? 'US$' : currency}</small><strong>{formatNumber(afterHoursPrice)}</strong></div>
                <p data-direction={quoteDirection(afterHoursChange.amount)}>{afterHoursChange.amount === null ? '—' : `${afterHoursChange.amount > 0 ? '+' : ''}${formatNumber(afterHoursChange.amount)}${afterHoursChange.percent === null ? '' : `  ${afterHoursChange.percent > 0 ? '+' : ''}${afterHoursChange.percent.toFixed(2)}%`}`}</p>
                {afterHoursPrice === null && <span className="rg-stock-detail-after-hours-note">{stockText(locale, t, '当前响应未返回盘后价格', 'No after-hours price in this response')}</span>}
              </section>
            </div>
            <div className="rg-stock-detail-chart-slot" data-stock-chart-slot>
              <StockChartTools store={store} request={historyRequest} value={history.result} locale={locale} onCalendar={() => setCalendar(true)}>
              {tools => history.result === null
                ? <div className="rg-stock-detail-chart-empty"><div className="rg-stock-unified-toolbar">{rangeControls}{tools}</div>
                    <p>{stockText(locale, t, '尚未返回历史价格。', 'No price history has been returned yet.')}</p>
                    <button type="button" disabled={history.status === 'loading' || historySymbol.trim().length === 0} onClick={() => { void store.fetchHistory({ symbol: historySymbol.trim(), range, interval }) }}>
                      {stockText(locale, t, '加载历史数据', 'Load history')}
                    </button>
                  </div>
                : <MarketChart value={history.result} stale={historyStale} initialMode="close" appearance="asset" toolbarStart={rangeControls} toolbarEnd={tools} {...(previousClose === null ? {} : { previousClose })} t={t} />}
              </StockChartTools>
            </div>
            <StockMetricGrid quote={quoteData ?? undefined} value={history.result} locale={locale} t={t} />
          </div>
          <QuoteFacts value={quote.result} t={t} instrument={selectedInstrument} store={store} watchlistBusy={watchlistBusy} locale={locale} onResearch={onResearch} />
        </div>
      </div>}
      {activeTab !== 'overview' && <div id="rg-market-tab-overview-panel" role="tabpanel" aria-labelledby="rg-market-tab-overview" hidden />}
      {STOCK_DETAIL_TABS.filter(tab => tab.id !== 'overview' && tab.id !== 'historical').map(tab => <div key={`${tab.id}:${symbol}:${demo}`} data-stock-tab-slot={tab.id} hidden={activeTab !== tab.id}><StockSections section={tab.id === 'forecasts' ? 'forecast' : tab.id as 'financials' | 'earnings' | 'holders' | 'analysis'} symbol={symbol} nodes={nodes} locale={locale} onResearch={onResearch} demo={demo} panelId={`rg-market-tab-${tab.id}-panel`} labelledBy={`rg-market-tab-${tab.id}`} hidden={activeTab !== tab.id}/></div>)}
      <StockHistoryPanel store={store} symbol={symbol} active={activeTab === 'historical'} locale={locale} t={t}/>
      {calendar && <StockDateRange start={start} end={end && Number.isFinite(Date.parse(end)) ? new Date(Date.parse(end)-86400000).toISOString().slice(0,10) : ''} locale={locale} onClose={() => setCalendar(false)} onApply={(from,to) => {
        const exclusiveEnd = new Date(Date.parse(to)+86400000).toISOString().slice(0,10)
        setStart(from); setEnd(exclusiveEnd); setRangeMode('custom'); setIntervalValue('1d')
        void store.fetchHistory({symbol:historySymbol.trim(),start:from,end:exclusiveEnd,interval:'1d'})
      }}/>} 
      <details className="rg-stock-detail-advanced" open={advancedOpen} onToggle={event => setAdvancedOpen(event.currentTarget.open)}>
        <summary>
          <span>{stockText(locale, t, '高级数据与查询', 'Advanced data and lookup')}</span>
          <small>{stockText(locale, t, '手动日期、区间、关注列表与原始响应', 'Manual dates, intervals, watchlist and raw responses')}</small>
        </summary>
        <div className="rg-stock-detail-advanced-body">
          <div className="rg-market-layout">
        <aside className="rg-market-watchlist">
          <section className="rg-finance-block"><div className="rg-finance-block-heading"><h3>{t('finance.market.watchlist')}</h3><span className="rg-finance-badge">{watchedInstruments.length}</span></div>
            {watchedInstruments.length === 0 ? <FinanceEmpty>{t('finance.market.watchlistEmpty')}</FinanceEmpty> : <div className="rg-market-watchlist-rows">{watchedInstruments.map(node => {
              const nodeSymbol = String(node.metadata.symbol ?? node.content)
              return <article key={node.id}><button type="button" className="rg-market-watchlist-select" data-selected={nodeSymbol.toUpperCase() === symbol.trim().toUpperCase() || undefined} onClick={() => { selectSymbol(nodeSymbol) }}><strong>{nodeSymbol}</strong><span>{node.title}</span><NodeProvenance node={node} t={t} /></button><WatchlistToggle node={node} store={store} t={t} busy={watchlistBusy} /></article>
            })}</div>}
            <OperationStatus operation={watchlist} t={t} idle={t('finance.market.watchlistIdle')} />
          </section>
          <section className="rg-finance-block"><h3>{t('finance.market.searchTitle')}</h3>
            <form className="rg-finance-form" onSubmit={(event: FormEvent) => { event.preventDefault(); void store.searchInstruments(query.trim(), searchAsOf) }}>
              <Field label={t('finance.market.query')}><input type="search" required value={query} onChange={event => { setQuery(event.target.value) }} placeholder={t('finance.market.queryPlaceholder')} /></Field>
              <Field label={t('finance.asOfOptional')}><input value={searchAsOf} onChange={event => { setSearchAsOf(event.target.value) }} placeholder="2026-10-30T00:00:00Z" /></Field>
              <div className="rg-finance-form-actions"><button className="rg-btn" data-primary type="submit" disabled={search.status === 'loading' || query.trim().length === 0}>{t('finance.market.searchAction')}</button></div>
            </form>
            <OperationStatus operation={search} t={t} idle={t('finance.market.searchIdle')} />
            {search.status === 'success' && <SearchResults value={search.result} t={t} onSelect={selectSymbol} instruments={instruments} store={store} watchlistBusy={watchlistBusy} />}
          </section>
        </aside>
        <div className="rg-market-main">
          <section id="rg-market-quote" className="rg-finance-block rg-market-section">
            <div className="rg-market-overview-grid">
              <div className="rg-market-query-pane">
                <div className="rg-market-section-heading"><span>{t('finance.market.quoteTitle')}</span><code>/finance</code></div>
                <form className="rg-finance-form" onSubmit={(event: FormEvent) => { event.preventDefault(); setActiveTab('overview'); void store.fetchQuote(quoteRequest.symbol, quoteRequest.asOf) }}>
                  <div className="rg-finance-fields-inline"><Field label={t('finance.market.symbol')}><input required value={symbol} onChange={event => { setSymbol(event.target.value) }} placeholder="AAPL" /></Field><Field label={t('finance.asOfOptional')}><input value={quoteAsOf} onChange={event => { setQuoteAsOf(event.target.value) }} placeholder="2026-10-30T00:00:00Z" /></Field></div>
                  <div className="rg-finance-form-actions">{selectedInstrument !== undefined && <WatchlistToggle node={selectedInstrument} store={store} t={t} busy={watchlistBusy} />}<button className="rg-btn" data-primary type="submit" disabled={quote.status === 'loading' || symbol.trim().length === 0}>{t('finance.market.quoteAction')}</button></div>
                </form>
                <OperationStatus operation={quote} t={t} idle={t('finance.market.quoteIdle')} />
              </div>
            </div>
          </section>
          <section id="rg-market-history" className="rg-finance-block rg-market-section">
            <OperationStatus operation={history} t={t} idle={t('finance.market.historyIdle')} />
            <form ref={historyFormRef} className="rg-finance-form rg-market-history-form" onSubmit={(event: FormEvent) => { event.preventDefault(); setActiveTab('overview'); void store.fetchHistory(historyRequest) }}>
              <div className="rg-finance-fields-inline rg-finance-fields-four rg-market-history-toolbar">
                <Field label={t('finance.market.symbol')}><input required value={historySymbol} onChange={event => { setHistorySymbol(event.target.value) }} placeholder="AAPL" /></Field>
                <Field label={t('finance.market.range')}><select value={rangeMode} onChange={event => { setRangeMode(event.target.value as 'range' | 'custom') }}><option value="range">{t('finance.market.rangePreset')}</option><option value="custom">{t('finance.market.customRange')}</option></select></Field>
                {rangeMode === 'range' ? <Field label={t('finance.market.rangePreset')}><select value={range} onChange={event => { setRange(event.target.value) }}>{['1d', '5d', '1mo', '3mo', '6mo', '1y', '2y', '5y', '10y', 'ytd', 'max'].map(value => <option key={value} value={value}>{value}</option>)}</select></Field> : <><Field label={t('finance.market.start')}><input required type="date" value={start} onChange={event => { setStart(event.target.value) }} /></Field><Field label={t('finance.market.end')}><input required type="date" value={end} onChange={event => { setEnd(event.target.value) }} /></Field></>}
                <Field label={t('finance.market.interval')}><select value={interval} onChange={event => { setIntervalValue(event.target.value) }}><option value="1d">1d</option><option value="1wk">1wk</option><option value="1mo">1mo</option><option value="1h">1h</option><option value="30m">30m</option><option value="15m">15m</option><option value="5m">5m</option><option value="1m">1m</option></select></Field>
                <button className="rg-btn" data-primary type="submit" disabled={history.status === 'loading' || historySymbol.trim().length === 0}>{t('finance.market.historyAction')}</button>
              </div>
            </form>
          </section>
          <LazyDetails id="rg-market-catalysts" className="rg-finance-record rg-market-accordion rg-market-section" summary={<>{t('finance.market.catalysts')}<span className="rg-finance-badge">{catalysts.length}</span></>}>{() => <CatalystTimeline nodes={catalysts} t={t} />}</LazyDetails>
          <LazyDetails id="rg-market-sources" className="rg-finance-record rg-market-accordion rg-market-section" summary={t('finance.market.sources')}>{() => <>
            <ProvenanceList value={{ quote: quote.result, history: history.result }} t={t} />
            {quote.result !== null && <RawJson value={quote.result} t={t} label={t('finance.market.quoteJson')} />}
            {history.result !== null && <RawJson value={history.result} t={t} label={t('finance.market.historyJson')} />}
          </>}</LazyDetails>
        </div>
      </div>
        </div>
      </details>
    </section>
  )
}

export function IngestPanel({ store, t }: FinancePanelProps) {
  const state = useFinance(store)
  const operation = financeOperation(state, 'ingest')
  const [source, setSource] = useState<'rss' | 'youtube'>('rss')
  const [url, setUrl] = useState('')
  const [validation, setValidation] = useState<string | null>(null)
  const submit = (event: FormEvent) => {
    event.preventDefault()
    try {
      const parsed = new URL(url)
      if (!['http:', 'https:'].includes(parsed.protocol) || parsed.username.length > 0 || parsed.password.length > 0) throw new Error('public http(s) URL required')
      setValidation(null)
      void store.dryRunIngest(source, parsed.toString())
    } catch {
      setValidation(t('finance.ingest.invalidUrl'))
    }
  }
  return (
    <section className="rg-finance-section" aria-labelledby="rg-finance-ingest-title">
      <div className="rg-finance-section-head"><div><h2 id="rg-finance-ingest-title">{t('finance.ingest.title')}</h2><p>{t('finance.ingest.description')}</p></div><span className="rg-finance-badge">dryRun: true</span></div>
      <section className="rg-finance-block">
        <form className="rg-finance-form" onSubmit={submit}>
          <div className="rg-finance-fields-inline">
            <Field label={t('finance.ingest.source')}><select value={source} onChange={event => { setSource(event.target.value as 'rss' | 'youtube') }}><option value="rss">RSS</option><option value="youtube">YouTube</option></select></Field>
            <Field label={t('finance.ingest.url')} hint={t('finance.ingest.urlHint')}><input required type="url" value={url} onChange={event => { setUrl(event.target.value); setValidation(null) }} placeholder="https://example.com/feed.xml" /></Field>
          </div>
          {validation !== null && <p className="rg-finance-form-error" role="alert">{validation}</p>}
          <div className="rg-finance-form-actions"><button className="rg-btn" data-primary type="submit" disabled={state.busy !== null || url.trim().length === 0}>{t('finance.ingest.action')}</button></div>
        </form>
        <OperationStatus operation={operation} t={t} idle={t('finance.ingest.idle')} />
        {operation.status === 'success' && <div className="rg-finance-result"><Provenance value={operation.result} t={t} /><RawJson value={operation.result} t={t} /></div>}
      </section>
    </section>
  )
}

export function CatalystTimeline({ nodes, t }: { readonly nodes: readonly GraphNode[]; readonly t: import('../store.ts').Translate }) {
  const catalysts = nodes.filter(node => node.kind === 'catalyst').sort((left, right) => String(left.metadata.asOf ?? '').localeCompare(String(right.metadata.asOf ?? '')))
  if (catalysts.length === 0) return <FinanceEmpty>{t('finance.predictions.noCatalysts')}</FinanceEmpty>
  return <ol className="rg-finance-timeline">{catalysts.map(node => <li key={node.id}>
    <time dateTime={String(node.metadata.asOf ?? '')}>{String(node.metadata.asOf ?? '—')}</time>
    <div><strong>{node.title}</strong><code>{node.id}</code><NodeProvenance node={node} t={t} /></div>
  </li>)}</ol>
}

export function FinanceEdgeLegend({ t }: { readonly t: import('../store.ts').Translate }) {
  return <span className="rg-finance-edge-legend">{(['holds', 'exposure_to', 'values', 'catalyzes', 'resolves'] as const).map(kind => <span key={kind}><FinanceEdgeIcon kind={kind} />{t(`edge.${kind}`)}</span>)}</span>
}
