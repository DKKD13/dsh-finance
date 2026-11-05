import { useEffect, useMemo, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { MarkdownText } from '@deepseek-ai/dsh-client-ui-primitives'
import type { MarkdownLabels } from '@deepseek-ai/dsh-client-ui-primitives'
import type { GraphEdge, GraphNode } from '../../src/graph.ts'
import { expectedArtifactIds, hasVisualArtifact, historicalResearch, isResearchSource, reportCitations, reportOrigin, reportOutline, versionChain, visualArtifactPath, visualArtifactSessionId } from '../research.ts'
import { protectReportCurrency } from '../report-markdown.ts'
import type { ResearchMode, ResearchRequest } from '../research.ts'
import type { ResearchStore } from '../research-store.ts'
import type { Translate } from '../store.ts'
import { Field, FinanceEmpty, Provenance, RawJson } from './FinanceCommon.tsx'
import { ResearchGraphBoundary, useResearch } from './ResearchCommon.tsx'
import { hostNavigator } from '../host-nav.ts'
import type { ConversationAccess, ConversationSeed } from './ConversationDialog.tsx'

interface ReportsPanelProps {
  readonly research: ResearchStore
  readonly t: Translate
  readonly nodes: readonly GraphNode[]
  readonly edges: readonly GraphEdge[]
  readonly graphPhase: 'loading' | 'ready' | 'error'
  readonly graphError: { readonly code: string; readonly message: string } | null
  readonly onRefreshGraph: () => Promise<void>
  readonly onOpenGraph: (id: string) => void
  readonly onOpenLibrary?: ((id: string) => void) | undefined
  readonly onOpenBriefing: () => void
  readonly conversations?: ConversationAccess | undefined
  readonly onResearch?: ((seed: ConversationSeed) => void) | undefined
  readonly locale?: string | undefined
}

function StartResearch({ research, t, reports, open, onClose }: {
  readonly research: ResearchStore
  readonly t: Translate
  readonly reports: readonly GraphNode[]
  readonly open: boolean
  readonly onClose: () => void
}) {
  const [mode, setMode] = useState<ResearchMode | null>(null)
  const [ticker, setTicker] = useState('')
  const [question, setQuestion] = useState('')
  const [baseReportId, setBaseReportId] = useState('')
  const [asOf, setAsOf] = useState('')
  const ready = mode === 'ticker' ? ticker.trim().length > 0
    : mode === 'question' ? question.trim().length > 0
      : mode === 'deep' ? question.trim().length > 0 && baseReportId.trim().length > 0
        : false
  const submit = (event: FormEvent) => {
    event.preventDefault()
    if (!ready || mode === null) return
    const cutoff = asOf.trim()
    let request: Extract<ResearchRequest, { kind: 'research' }>
    if (mode === 'ticker') request = { kind: 'research', mode, ticker: ticker.trim(), ...(cutoff.length === 0 ? {} : { asOf: cutoff }) }
    else if (mode === 'question') request = { kind: 'research', mode, question: question.trim(), ...(cutoff.length === 0 ? {} : { asOf: cutoff }) }
    else request = { kind: 'research', mode, question: question.trim(), baseReportId: baseReportId.trim(), ...(cutoff.length === 0 ? {} : { asOf: cutoff }) }
    research.startResearch(request)
  }
  if (!open) return null
  return <section className="rg-finance-block rg-start-research">
    <div className="rg-finance-block-heading"><div><h3>{t('reports.start.title')}</h3><p className="rg-finance-block-description">{t('reports.start.description')}</p></div><button type="button" className="rg-btn" onClick={onClose}>{t('reports.start.close')}</button></div>
    <form className="rg-finance-form" onSubmit={submit}>
      <fieldset className="rg-research-gate"><legend>{t('reports.start.gate')}</legend><div role="group" aria-label={t('reports.start.gate')}>{(['ticker', 'question', 'deep'] as const).map(value => <button type="button" key={value} aria-pressed={mode === value} data-active={mode === value || undefined} onClick={() => { setMode(value); if (value === 'deep' && baseReportId.length === 0) setBaseReportId(reports[0]?.id ?? '') }}>{t(`reports.start.mode.${value}`)}</button>)}</div><p>{t('reports.start.gateHint')}</p></fieldset>
      {mode === 'ticker' && <Field label={t('reports.start.ticker')}><input required autoFocus value={ticker} onChange={event => { setTicker(event.target.value) }} placeholder="AAPL" /></Field>}
      {(mode === 'question' || mode === 'deep') && <Field label={t('reports.start.question')}><textarea required autoFocus rows={3} value={question} onChange={event => { setQuestion(event.target.value) }} /></Field>}
      {mode === 'deep' && <Field label={t('reports.start.baseReport')} hint={t('reports.start.baseReportHint')}><input required list="rg-report-base-options" value={baseReportId} onChange={event => { setBaseReportId(event.target.value) }} placeholder="deliverable:…" /><datalist id="rg-report-base-options">{reports.map(report => <option key={report.id} value={report.id}>{report.title}</option>)}</datalist></Field>}
      {mode !== null && <Field label={t('finance.asOfOptional')}><input value={asOf} onChange={event => { setAsOf(event.target.value) }} placeholder="2026-10-31T00:00:00Z" /></Field>}
      <div className="rg-finance-form-actions"><button type="submit" className="rg-btn" data-primary disabled={!ready}>{t('reports.start.submit')}</button></div>
    </form>
  </section>
}

function record(value: unknown): Record<string, unknown> | undefined {
  return typeof value === 'object' && value !== null && !Array.isArray(value) ? value as Record<string, unknown> : undefined
}

function explicitMode(node: GraphNode): 'ticker' | 'question' | 'deep' | undefined {
  const provenance = record(node.metadata.provenance)
  const candidates = [node.metadata.researchMode, provenance?.mode, node.metadata.mode]
  for (const value of candidates) {
    if (typeof value !== 'string') continue
    const normalized = value.toLowerCase()
    if (normalized === 'ticker' || normalized === 'company') return 'ticker'
    if (normalized === 'question') return 'question'
    if (normalized === 'deep' || normalized === 'deep-research' || normalized === 'deep research') return 'deep'
  }
  return undefined
}

function reportInstrument(node: GraphNode, nodes: readonly GraphNode[], edges: readonly GraphEdge[]): GraphNode | undefined {
  const provenance = record(node.metadata.provenance)
  const references = Array.isArray(node.metadata.references) ? node.metadata.references.filter((value): value is string => typeof value === 'string') : []
  const explicitId = [node.metadata.instrumentId, provenance?.instrumentId, ...references]
    .find(value => typeof value === 'string' && value.startsWith('instrument:'))
  const linkedId = edges.find(edge => edge.from === node.id && edge.to.startsWith('instrument:'))?.to
  const id = typeof explicitId === 'string' ? explicitId : linkedId
  return id === undefined ? undefined : nodes.find(candidate => candidate.id === id && candidate.kind === 'instrument')
}

function reportCompany(node: GraphNode, nodes: readonly GraphNode[], edges: readonly GraphEdge[]): string | undefined {
  const instrument = reportInstrument(node, nodes, edges)
  if (instrument === undefined) return undefined
  return instrument.title.trim().length > 0 ? instrument.title : undefined
}

function reportSymbol(node: GraphNode, nodes: readonly GraphNode[], edges: readonly GraphEdge[]): string | undefined {
  const instrument = reportInstrument(node, nodes, edges)
  const symbol = instrument?.metadata.symbol ?? node.metadata.symbol ?? node.metadata.ticker
  return typeof symbol === 'string' && symbol.trim().length > 0 ? symbol.trim() : undefined
}

function formatReportDate(value: number, locale: string | undefined): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return new Intl.DateTimeFormat(locale, { year: 'numeric', month: 'short', day: 'numeric' }).format(date)
}

export function ReportsPanel({ research, t, nodes, edges, graphPhase, graphError, onRefreshGraph, onOpenGraph, onOpenLibrary, conversations, onResearch, locale }: ReportsPanelProps) {
  const state = useResearch(research)
  const detailTitle = useRef<HTMLHeadingElement>(null)
  const listFallback = useRef<HTMLDivElement>(null)
  const returnFocus = useRef<HTMLButtonElement | null>(null)
  const restoreFocus = useRef(false)
  const [drill, setDrill] = useState(false)
  const [conversationError, setConversationError] = useState('')
  const [artifactError, setArtifactError] = useState('')
  const [fallbackStartOpen, setFallbackStartOpen] = useState(false)
  const zh = locale ? locale.startsWith('zh') : t('reports.title') === '历史研究'
  const text = (cn: string, en: string) => zh ? cn : en
  const reports = nodes.filter(historicalResearch).sort((left, right) => right.updatedAt - left.updatedAt || left.id.localeCompare(right.id))
  const active = nodes.find(node => node.kind === 'deliverable' && node.id === state.selectedReportId) ?? reports[0]
  const reportSession = (node: GraphNode) => {
    const available = new Set(conversations?.list().map(session => session.id) ?? [])
    const explicit = node.metadata.sessionId
    if (typeof explicit === 'string' && available.has(explicit)) return explicit
    return state.operations.find(operation => operation.sessionId && available.has(operation.sessionId) && (operation.artifactIds.includes(node.id) || expectedArtifactIds([node], operation.runId, ['deliverable']).length > 0))?.sessionId ?? undefined
  }
  const activeSessionId = active === undefined ? undefined : reportSession(active)
  const activeCompany = active === undefined ? undefined : reportCompany(active, nodes, edges)
  const activeSymbol = active === undefined ? undefined : reportSymbol(active, nodes, edges)
  const activeMode = active === undefined ? undefined : explicitMode(active)
  const artifactPath = active === undefined ? undefined : visualArtifactPath(active.metadata)
  const artifactUnsupported = active !== undefined && artifactPath === undefined && hasVisualArtifact(active.metadata)
  const openVisualArtifact = async () => {
    if (active === undefined || artifactPath === undefined) return
    const navigator = hostNavigator()
    if (navigator === undefined) {
      setArtifactError(text('当前宿主不支持侧栏文档预览。', 'This host does not support the sidebar document preview.'))
      return
    }
    const sessionId = visualArtifactSessionId(active.metadata, reportSession(active))
    if (sessionId === undefined) {
      setArtifactError(text('找不到产物所属对话，无法定位文件。', 'Could not locate the conversation that produced this artifact.'))
      return
    }
    setArtifactError('')
    try {
      if (!await navigator.openFilePreview(sessionId, artifactPath)) {
        setArtifactError(text('无法打开可视化。', 'Could not open the visual artifact.'))
      }
    } catch (cause) {
      setArtifactError(text('无法打开可视化。', 'Could not open the visual artifact.') + ' ' + (cause instanceof Error ? cause.message : String(cause)))
    }
  }
  const openConversation = async (id: string) => {
    setConversationError('')
    try { await conversations?.open(id) }
    catch (cause) { setConversationError(text('无法打开对话。', 'Could not open the conversation.') + ' ' + (cause instanceof Error ? cause.message : String(cause))) }
  }
  const outline = active === undefined ? [] : reportOutline(active.content)
  const citations = active === undefined ? [] : reportCitations(active, nodes, edges)
  const versions = active === undefined ? [] : versionChain(active, nodes, edges)
  const labels = useMemo<MarkdownLabels>(() => ({
    code: {
      copyLabel: t('reports.markdown.copy'),
      copiedLabel: t('reports.markdown.copied'),
      toolbarLabels: { codeLabel: t('reports.markdown.code'), wrapLabel: t('reports.markdown.wrap'), unwrapLabel: t('reports.markdown.unwrap') },
    },
    footnotes: t('reports.markdown.footnotes'),
  }), [t])
  useEffect(() => {
    if (drill && active !== undefined) {
      detailTitle.current?.focus()
      return
    }
    if (!drill && restoreFocus.current) {
      restoreFocus.current = false
      const target = returnFocus.current
      if (target?.isConnected === true) target.focus()
      else listFallback.current?.focus()
    }
  }, [drill, active?.id])
  const startWorkflow = () => {
    if (onResearch !== undefined) {
      onResearch({ mode: 'question' })
      return
    }
    setFallbackStartOpen(true)
  }
  return <ResearchGraphBoundary phase={graphPhase} error={graphError} t={t} onRefresh={onRefreshGraph}><section className="rg-finance-section rg-reports-section" aria-labelledby="rg-reports-title">
    <div className="rg-finance-section-head rg-report-history-head"><div><h2 id="rg-reports-title">{t('reports.title')}</h2><p>{t('reports.description')}</p></div><div className="rg-report-history-head-actions"><span>{text(`${reports.length} 份研究`, `${reports.length} research ${reports.length === 1 ? 'report' : 'reports'}`)}</span><button type="button" className="rg-btn" onClick={() => { if (onResearch !== undefined) startWorkflow(); else setFallbackStartOpen(value => !value) }}>{onResearch !== undefined ? text('新建研究', 'New research') : t('reports.start.action')}</button></div></div>
    {onResearch === undefined && <StartResearch research={research} t={t} reports={reports} open={fallbackStartOpen} onClose={() => { setFallbackStartOpen(false) }} />}
    {conversationError.length > 0 && <p role="alert">{conversationError}</p>}
    {artifactError.length > 0 && <p role="alert">{artifactError}</p>}
    <div className="rg-reports rg-report-history" data-drill={drill && active !== undefined ? 'reader' : 'list'}>
      <div className="rg-report-list" aria-label={t('reports.list')}>
        <div ref={listFallback} tabIndex={-1} className="rg-library-list-head"><span>{t('reports.list')}</span><span>{reports.length}</span></div>
        {reports.length === 0 ? <div className="rg-report-history-empty"><FinanceEmpty>{t('reports.empty')}</FinanceEmpty><button type="button" className="rg-btn" data-primary onClick={startWorkflow}>{text('开始问题研究', 'Start question research')}</button></div> : <ol className="rg-report-history-list">{reports.map(node => {
          const sessionId = reportSession(node)
          const company = reportCompany(node, nodes, edges)
          const symbol = reportSymbol(node, nodes, edges)
          const mode = explicitMode(node)
          const date = formatReportDate(node.updatedAt, locale)
          return <li key={node.id} className="rg-report-history-item" data-selected={active?.id === node.id || undefined}>
            <button type="button" className="rg-report-history-select" aria-current={active?.id === node.id ? 'true' : undefined} onClick={event => { returnFocus.current = event.currentTarget; research.selectReport(node.id); setDrill(true) }}>
              <strong>{node.title}</strong>
              <span className="rg-report-history-meta">
                {company !== undefined && <span>{company}</span>}
                {symbol !== undefined && <span className="rg-report-history-symbol">{symbol}</span>}
                {mode !== undefined && <span>{mode === 'ticker' ? text('公司研究', 'Company') : mode === 'question' ? text('问题研究', 'Question') : text('深入研究', 'Deep research')}</span>}
                {date.length > 0 && <time dateTime={new Date(node.updatedAt).toISOString()}>{date}</time>}
              </span>
            </button>
            {sessionId !== undefined && <button type="button" className="rg-report-history-conversation" onClick={() => { void openConversation(sessionId) }}>{text('原对话', 'Conversation')}</button>}
          </li>
        })}</ol>}
      </div>
      <article className="rg-report-reader" aria-label={t('reports.reader')}>
        {active === undefined ? <div className="rg-state"><p>{text('完成研究后，报告正文会显示在这里。', 'Completed report content will appear here.')}</p></div> : <>
          <header className="rg-report-reader-head rg-report-history-reader-head"><button type="button" className="rg-btn rg-report-back" onClick={() => { restoreFocus.current = true; setDrill(false) }}>{t('finance.library.back')}</button><div><div className="rg-report-history-detail-meta"><span>{t(`reports.origin.${reportOrigin(active)}`)}</span>{activeCompany !== undefined && <span>{activeCompany}</span>}{activeSymbol !== undefined && <span>{activeSymbol}</span>}{activeMode !== undefined && <span>{activeMode === 'ticker' ? text('公司研究', 'Company') : activeMode === 'question' ? text('问题研究', 'Question') : text('深入研究', 'Deep research')}</span>}</div><h3 ref={detailTitle} tabIndex={-1}>{active.title}</h3>{formatReportDate(active.updatedAt, locale).length > 0 && <time dateTime={new Date(active.updatedAt).toISOString()}>{formatReportDate(active.updatedAt, locale)}</time>}</div><div className="rg-report-history-actions">{artifactPath !== undefined && <button type="button" className="rg-btn" title={artifactPath} onClick={openVisualArtifact}>{text('打开可视化', 'Open visual')}</button>}{artifactUnsupported && <button type="button" className="rg-btn" disabled>{text('可视化产物（历史路径，当前不可定位）', 'Visual artifact (legacy path, not locatable)')}</button>}{activeSessionId !== undefined && <button type="button" className="rg-btn" data-primary onClick={() => { void openConversation(activeSessionId) }}>{text('打开原对话', 'Open original conversation')}</button>}{conversations && onResearch && <button type="button" className="rg-btn" onClick={() => { onResearch({ mode: 'deep', baseReportId: active.id }) }}>{text('继续研究', 'Continue research')}</button>}<button type="button" className="rg-btn" onClick={() => { onOpenGraph(active.id) }}>{t('finance.library.openGraph')}</button></div></header>
          <div className="rg-report-reading-layout">
            <div className="rg-report-markdown"><MarkdownText text={protectReportCurrency(active.content)} labels={labels} omitHtml /></div>
            <aside className="rg-report-outline" aria-label={t('reports.outline')}>
              <h4>{t('reports.outline')}</h4>
              {outline.length === 0 ? <p>{t('reports.noOutline')}</p> : <ol>{outline.map((heading, index) => <li key={`${heading.text}-${index}`} data-level={heading.level}>{heading.text}</li>)}</ol>}
              <h4>{t('reports.citations')}</h4>
              {citations.length === 0 ? <p>{t('reports.noCitations')}</p> : <ul>{citations.map(citation => <li key={citation.id}>
                {citation.node === undefined ? <code>{citation.id}</code> : <button type="button" onClick={() => {
                  if (citation.node !== undefined && onOpenLibrary !== undefined && isResearchSource(citation.node)) onOpenLibrary(citation.id)
                  else onOpenGraph(citation.id)
                }}><span>{citation.node.title}</span><code>{citation.id}</code></button>}
              </li>)}</ul>}
            </aside>
          </div>
          <section className="rg-finance-block"><h3>{t('reports.versionChain')}</h3><p className="rg-finance-block-description">{t('reports.versionHint')}</p><ol className="rg-version-chain">{versions.map(node => <li key={node.id} data-current={node.id === active.id || undefined}><button type="button" onClick={() => { research.selectReport(node.id) }}><span>{node.title}</span><code>{node.id}</code><time dateTime={new Date(node.updatedAt).toISOString()}>{new Date(node.updatedAt).toISOString()}</time>{node.metadata.version !== undefined && <span>{t('reports.version')} {String(node.metadata.version)}</span>}</button></li>)}</ol></section>
          <Provenance value={active.metadata} t={t} />
          <RawJson value={active.metadata} t={t} label={t('finance.library.metadata')} />
        </>}
      </article>
    </div>
  </section></ResearchGraphBoundary>
}
