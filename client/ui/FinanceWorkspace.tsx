import { useCallback, useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import type { GraphEdge, GraphNode } from '../../src/graph.ts'
import type { FinanceSection, FinanceStore } from '../finance-store.ts'
import type { Translate } from '../store.ts'
import { useFinance } from './FinanceCommon.tsx'
import { BriefingPanel, PredictionsPanel } from './FinanceMemory.tsx'
import { PortfolioPanel, ValuationsPanel } from './FinanceModels.tsx'
import { MarketPanel, OverviewPanel } from './FinancePanels.tsx'
import { InboxPanel } from './InboxPanel.tsx'
import { LibraryPanel } from './LibraryPanel.tsx'
import { HypothesesPanel } from './HypothesesPanel.tsx'
import { ReportsPanel } from './ReportsPanel.tsx'
import { GuidePanel } from './GuidePanel.tsx'
import { deriveWorkflow } from '../workflow.ts'
import type { ResearchStore } from '../research-store.ts'
import { DiscoveryPanel, discoveryDemoAssets, discoveryDemoCrypto, discoveryRecords } from './FinanceDiscovery.tsx'
import { ScreenerPanel, PoliticiansPanel } from './FinanceScreening.tsx'
import { EarningsPanel, PredictionMarketsPanel } from './FinanceEvents.tsx'
import { WorkflowCatalog } from './FinanceCatalog.tsx'
import { VirtualFundPanel } from './VirtualFundPanel.tsx'
import { ResearchRuns } from './ResearchCommon.tsx'
import { FinanceAside } from './FinanceAside.tsx'
import { launchResearchConversation } from '../conversation-launch.ts'
import type { ConversationAccess, ConversationSeed } from './ConversationDialog.tsx'
import { readQuote } from '../chart-data.ts'
import { AssetLogo } from './AssetLogo.tsx'
import { isResearchSource, researchContextPrompt } from '../research.ts'
import type { ResearchMode } from '../research.ts'


const PRIMARY_SECTIONS: readonly FinanceSection[] = ['markets', 'overview', 'earnings', 'screener', 'watchlist', 'library', 'hypotheses', 'reports', 'virtual-fund']
const MARKET_SECTIONS: readonly FinanceSection[] = ['markets', 'crypto', 'prediction-markets']
const RESEARCH_SECTIONS: readonly FinanceSection[] = ['politicians', 'inbox', 'library', 'hypotheses', 'reports', 'market', 'valuations', 'predictions', 'briefing', 'activity', 'guide']
const LABELS: Readonly<Record<string, readonly [string, string]>> = {
  markets: ['市场', 'Markets'], crypto: ['加密货币', 'Crypto'], earnings: ['财报', 'Earnings'],
  'prediction-markets': ['预测市场', 'Prediction markets'], screener: ['选股器', 'Screener'],
  politicians: ['政治人物', 'Politicians'], watchlist: ['关注列表', 'Watchlist'],
  apps: ['应用库', 'Apps'], activity: ['研究进度', 'Activity'],
  hypotheses: ['多空观点', 'Bull & bear views'], reports: ['历史研究', 'Research history'],
  'virtual-fund': ['虚拟基金', 'Virtual fund'],
}
const DEMO_KEY = 'dsh-research-graph.finance-demo.v1'
function initialDemo(): boolean {
  try { return typeof localStorage === 'undefined' || localStorage.getItem(DEMO_KEY) !== 'false' } catch { return true }
}


export function FinanceWorkspace({ store, t, nodes, edges, research, conversations, locale, graphRevision, graphPhase, graphError, onRefreshGraph, onOpenGraph, onOpenAudit, onOpenHistory }: {
  readonly store: FinanceStore
  readonly t: Translate
  readonly nodes: readonly GraphNode[]
  readonly edges: readonly GraphEdge[]
  readonly research?: ResearchStore | undefined
  readonly conversations?: ConversationAccess | undefined
  readonly locale?: string | undefined
  readonly graphRevision: number
  readonly graphPhase: 'loading' | 'ready' | 'error'
  readonly graphError: { readonly code: string; readonly message: string } | null
  readonly onRefreshGraph: () => Promise<void>
  readonly onOpenGraph: (id?: string) => void
  readonly onOpenAudit: () => void
  readonly onOpenHistory?: (() => void) | undefined
}) {
  const state = useFinance(store)
  const readFundState = useCallback((fundId?: string) => store.readFundState(fundId), [store])
  const assetPage = state.section === 'market'
  const marketGroup = MARKET_SECTIONS.includes(state.section)
  const primarySection = marketGroup || state.section === 'market' ? 'markets' : state.section === 'apps' ? 'overview' : state.section === 'portfolio' ? 'virtual-fund' : state.section
  const main = useRef<HTMLDivElement>(null)
  const nav = useRef<HTMLElement>(null)
  const zh = locale ? locale.startsWith('zh') : t('finance.workspace') === '金融'
  const pageLocale = locale ?? (zh ? 'zh' : 'en')
  const text = (cn: string, en: string) => zh ? cn : en
  const label = (section: FinanceSection) => LABELS[section]?.[zh ? 0 : 1] ?? t(`finance.section.${section}`)
  const [demo, setDemo] = useState(initialDemo)
  const [query, setQuery] = useState('')
  const [assistant, setAssistant] = useState(false)
  const [inboxEntry, setInboxEntry] = useState<'url' | 'clip'>('url')
  useEffect(() => { if (state.section !== 'inbox') setInboxEntry('url') }, [state.section])
  const [question, setQuestion] = useState('')
  const [asOf, setAsOf] = useState('')
  const launchPending = useRef(false)
  const [researchMode, setResearchMode] = useState<ResearchMode>('question')
  const [workflowSkill, setWorkflowSkill] = useState('')
  const [researchTicker, setResearchTicker] = useState('')
  const [sourceIds, setSourceIds] = useState<string[]>([])
  const [sourceQuery, setSourceQuery] = useState('')
  const [composerError, setComposerError] = useState('')
  const sourceMenu = useRef<HTMLDetailsElement>(null)
  const skillMenu = useRef<HTMLDetailsElement>(null)
  const sourceNodes = nodes.filter(isResearchSource)
  const visibleSources = sourceNodes.filter(node => node.title.toLocaleLowerCase().includes(sourceQuery.trim().toLocaleLowerCase()))
  const contextSeed = { ...(researchTicker ? { ticker: researchTicker } : {}), ...(sourceIds.length ? { sourceIds } : {}) }
  const [activeSymbol, setActiveSymbol] = useState('')
  const [shareNotice, setShareNotice] = useState('')
  const [shareOpen, setShareOpen] = useState(false)
  const [shareUrl, setShareUrl] = useState('')
  const shareDialog = useRef<HTMLDialogElement>(null)
  useEffect(() => { if (shareOpen) shareDialog.current?.showModal() }, [shareOpen])
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchIndex, setSearchIndex] = useState(-1)
  const assetMatches = (demo ? [...discoveryDemoAssets, ...discoveryDemoCrypto] : [...discoveryRecords(nodes, false), ...discoveryRecords(nodes, true)])
    .filter(asset => `${asset.symbol} ${asset.name}`.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase())).slice(0, 7)
  const assetSymbol = state.market.quote?.symbol || state.market.history?.symbol || activeSymbol || ''
  const quoteResult = state.operations.quote?.result
  const quoteData = readQuote(quoteResult)
  const assetName = typeof quoteData?.symbol === 'string' && quoteData.symbol.toUpperCase() === assetSymbol.toUpperCase() ? typeof quoteData.longName === 'string' ? quoteData.longName : typeof quoteData.shortName === 'string' ? quoteData.shortName : assetSymbol : assetSymbol
  useEffect(() => { if (assetPage && assetSymbol) setResearchTicker(assetSymbol) }, [assetPage, assetSymbol])
  useEffect(() => {
    const dismiss = (event: PointerEvent) => {
      for (const menu of [sourceMenu.current, skillMenu.current]) if (menu && event.target instanceof Node && !menu.contains(event.target)) menu.open = false
    }
    document.addEventListener('pointerdown', dismiss)
    return () => document.removeEventListener('pointerdown', dismiss)
  }, [])
  const questionRef = useRef<HTMLTextAreaElement>(null)
  const setDataMode = (value: boolean) => {
    setDemo(value)
    try { localStorage.setItem(DEMO_KEY, String(value)) } catch { /* The choice still works in this view. */ }
  }
  useEffect(() => { if (state.section === 'overview' || state.section === 'apps') setQuery('') }, [state.section])
  const launch = async (seed: ConversationSeed, sessionId?: string) => {
    if (!conversations || launchPending.current) return
    launchPending.current = true
    setComposerError('')
    try {
      const result = await launchResearchConversation(conversations, seed, nodes, pageLocale, sessionId)
      if (result.status === 'preserved') store.flash(text('已保留原对话草稿。请在对话中继续。', 'The existing draft was preserved. Continue in the conversation.'))
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : String(cause)
      store.flash(message === 'DSH_WORKSPACE_REQUIRED' ? text('请先在 DSH 添加一个工作区，再开始研究。', 'Add a workspace in DSH before starting research.') : message === 'CONVERSATION_BLOCKED' ? text('这个对话暂时不能接收输入，请稍后重试。', 'This conversation cannot receive input right now. Try again shortly.') : text('未能进入对话：', 'Could not open the conversation: ') + message)
    } finally { launchPending.current = false }
  }
  const openResearch = (value: string, skillName?: string, skillContext?: Pick<ConversationSeed, 'ticker' | 'sourceIds' | 'asOf' | 'sourceSummaryId'>) => {
    setComposerError('')
    const context: Pick<ConversationSeed, 'ticker' | 'sourceIds' | 'asOf' | 'sourceSummaryId'> = skillContext ?? (assetPage || assistant ? { ...contextSeed, ...(asOf ? { asOf } : {}) } : {})
    if (conversations) { void launch({ mode: 'question', question: value, ...context, ...(skillName ? { skillName } : {}) }); return }
    setWorkflowSkill(skillName ?? '')
    setResearchTicker(context.ticker ?? ''); setSourceIds([...(context.sourceIds ?? [])]); setAsOf(context.asOf ?? '')
    setQuestion(value); setAssistant(true); setTimeout(() => questionRef.current?.focus(), 0)
  }
  const openSymbol = (symbol: string) => {
    setActiveSymbol(symbol)
    store.setSection('market')
    void store.fetchQuote(symbol)
    void store.fetchHistory({ symbol, range: '1d', interval: '1m' })
  }
  const submitSearch = (event: FormEvent) => {
    event.preventDefault()
    const value = query.trim()
    if (!value) return
    setSearchOpen(false)
    // Only an explicit market-symbol grammar is interpreted here; research semantics stay with the model.
    if (/^[A-Za-z^][A-Za-z0-9.^=_-]{0,19}$/u.test(value)) openSymbol(value.toUpperCase())
    else { store.setSection('overview'); openResearch(value) }
  }
  const closeShare = () => { shareDialog.current?.close(); setShareOpen(false) }
  const shareAsset = async () => {
    try {
      const url = new URL(window.location.href)
      url.searchParams.set('asset', assetSymbol)
      await navigator.clipboard.writeText(url.href)
      setShareNotice(text('链接已复制', 'Link copied'))
    } catch { setShareNotice(text('未能复制，请使用浏览器地址栏分享。', 'Could not copy. Share through the browser address bar.')) }
  }
  const submitResearch = (event: FormEvent) => {
    event.preventDefault()
    if (workflowSkill && !conversations) { setComposerError(text('请在 DSH 原生页面中选择对话来运行此 Skill。当前预览只准备问题。', 'Use a native DSH conversation to run this Skill. This preview only prepares the question.')); return }
    if (conversations && (question.trim() || researchMode === 'ticker' && researchTicker)) { void launch({ mode: researchMode, question: question.trim(), ...contextSeed, ...(workflowSkill ? { skillName: workflowSkill } : {}), ...(asOf.trim() ? { asOf: asOf.trim() } : {}) }); return }
    if (!research || !question.trim()) return
    try {
      const context = researchContextPrompt(contextSeed, sourceNodes)
      setComposerError('')
      research.startResearch({ kind: 'research', mode: 'question', question: [question.trim(), context].filter(Boolean).join('\n\n'), ...(asOf.trim() ? { asOf: asOf.trim() } : {}) })
    } catch { setComposerError(text('所选资料已不可用，请重新选择。', 'A selected source is unavailable. Select sources again.')) }
  }
  const [libraryNodeId, setLibraryNodeId] = useState<string | undefined>(undefined)
  useEffect(() => {
    if (store.getSnapshot().phase !== 'ready') void store.load()
  }, [store])
  const initialAsset = useRef(false)
  useEffect(() => {
    if (initialAsset.current || state.phase !== 'ready') return
    initialAsset.current = true
    const value = new URL(window.location.href).searchParams.get('asset')?.trim()
    if (value && /^[A-Za-z^][A-Za-z0-9.^=_-]{0,19}$/u.test(value)) openSymbol(value.toUpperCase())
  }, [state.phase])
  useEffect(() => {
    main.current?.scrollTo({ top: 0 })
  }, [state.section])
  useEffect(() => {
    const root = nav.current
    if (root === null) return
    const containers = root.querySelectorAll<HTMLElement>('.rg-pf-primary, .rg-pf-research-nav')
    for (const element of containers) {
      const active = element.querySelector<HTMLButtonElement>('button[data-active]')
      if (active === null || element.scrollWidth <= element.clientWidth) continue
      const navRect = element.getBoundingClientRect()
      const activeRect = active.getBoundingClientRect()
      if (activeRect.left >= navRect.left && activeRect.right <= navRect.right) continue
      const left = element.scrollLeft + activeRect.left - navRect.left - (element.clientWidth - activeRect.width) / 2
      const reduceMotion = typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
      element.scrollTo({ left: Math.max(0, left), behavior: reduceMotion ? 'auto' : 'smooth' })
    }
  }, [state.section])

  const props = { store, t, nodes }
  const openLibrary = (id: string) => {
    setLibraryNodeId(id)
    store.setSection('library')
  }
  const openHypothesis = (id: string) => {
    research?.selectHypothesis(id)
    store.setSection('hypotheses')
  }
  const openReport = (id: string) => {
    research?.selectReport(id)
    store.setSection('reports')
  }
  return (
    <div className="rg-finance-workspace" data-asset-page={assetPage || undefined}>
      <header className="rg-pf-header">
        <div className="rg-pf-brand-group"><button type="button" className="rg-pf-brand" onClick={() => store.setSection('markets')} aria-label="DeepSeek Finance">DeepSeek <span>Finance</span></button>{assetPage && <><span aria-hidden>›</span><span>{assetSymbol || text('个股', 'Stock')}</span></>}</div>
        <form className="rg-pf-search" role="search" onSubmit={submitSearch} onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setSearchOpen(false) }}>
          <svg width="17" height="17" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden="true"><circle cx="8.5" cy="8.5" r="5.7"/><path d="m13 13 4 4"/></svg>
          <input type="search" role="combobox" aria-autocomplete="list" aria-controls="rg-finance-search-results" aria-expanded={searchOpen} aria-activedescendant={searchOpen && searchIndex >= 0 && assetMatches[searchIndex] ? `rg-finance-search-result-${searchIndex}` : undefined} value={query} onFocus={() => setSearchOpen(true)} onChange={event => { setQuery(event.target.value); setSearchIndex(-1); setSearchOpen(true) }} onKeyDown={event => {
            if (event.key === 'Escape') { event.preventDefault(); setSearchOpen(false); setSearchIndex(-1) }
            else if (event.key === 'ArrowDown' || event.key === 'ArrowUp') { event.preventDefault(); setSearchOpen(true); setSearchIndex(index => !assetMatches.length ? -1 : index < 0 ? event.key === 'ArrowDown' ? 0 : assetMatches.length - 1 : (index + (event.key === 'ArrowDown' ? 1 : -1) + assetMatches.length) % assetMatches.length) }
            else if (event.key === 'Enter' && searchOpen && searchIndex >= 0 && assetMatches[searchIndex]) { event.preventDefault(); const asset = assetMatches[searchIndex]; setSearchOpen(false); setQuery(''); openSymbol(asset.symbol) }
          }} aria-label={text('搜索股票、公司或工作流', 'Search stocks, companies or workflows')} placeholder={text('搜索股票、加密货币等…', 'Search stocks, crypto and more…')} />
          {query && <button type="button" aria-label={text('清除搜索', 'Clear search')} onClick={() => { setQuery(''); setSearchIndex(-1) }}>×</button>}
          <button type="submit" aria-label={text('搜索', 'Search')}><svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden="true"><path d="M16 4v7H4m4-4-4 4 4 4"/></svg></button>
          {searchOpen && <div className="rg-pf-search-results" id="rg-finance-search-results" role="listbox" aria-label={text('搜索结果', 'Search results')}><small>{demo ? text('样例标的', 'Example instruments') : text('资料库中的标的', 'Instruments in your library')}</small>{assetMatches.map((asset, index) => <button type="button" role="option" id={`rg-finance-search-result-${index}`} key={asset.symbol} aria-selected={searchIndex === index} onMouseEnter={() => setSearchIndex(index)} onClick={() => { setSearchOpen(false); setQuery(''); openSymbol(asset.symbol) }}><AssetLogo symbol={asset.symbol} /><span><strong>{asset.name}</strong><small>{asset.symbol}{asset.sector ? ` · ${asset.sector}` : ''}</small></span><span>{asset.price === null ? '—' : asset.price.toLocaleString(undefined, { maximumFractionDigits: 2 })}<small data-up={asset.change === null ? undefined : asset.change >= 0}>{asset.change === null ? '—' : `${asset.change >= 0 ? '+' : ''}${asset.change.toFixed(2)}%`}</small></span></button>)}{assetMatches.length === 0 && <p>{text('本地未找到匹配项。按回车查询代码，或研究这个问题。', 'No local match. Press Enter to look up the symbol or research this question.')}</p>}</div>}
        </form>
        <div className="rg-pf-header-actions">
          {assetPage && <button type="button" className="rg-pf-share" onClick={() => { const url = new URL(window.location.href); url.searchParams.set('asset', assetSymbol); setShareUrl(url.href); setShareNotice(''); setShareOpen(true) }}><svg width="17" height="17" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden><path d="M12 3l5 5-5 4V9c-5 0-7 3-8 6 0-7 3-9 8-9V3Z"/><path d="M17 13v4H3V6h3"/></svg>{text('分享', 'Share')}</button>}<button type="button" className="rg-pf-assistant-button" onClick={() => { setAssistant(value => !value) }}>{text('金融助手', 'Finance assistant')}<svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden="true"><path d="M3 8h10m-4-4 4 4-4 4"/></svg></button>
          <details className="rg-pf-more"><summary aria-label={text('更多功能', 'More tools')}><svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden="true"><path d="M3 5h14M3 10h14M3 15h14"/></svg></summary><div>
            <label className="rg-pf-more-data-mode">{text('页面数据', 'Page data')}<select aria-label={text('切换演示或真实数据', 'Switch demo or real data')} value={demo ? 'demo' : 'real'} onChange={event => setDataMode(event.target.value === 'demo')}><option value="demo">{text('样例资料', 'Example data')}</option><option value="real">{text('我的资料', 'My data')}</option></select></label>
            <button type="button" onClick={() => onOpenGraph()}>{text('知识图谱', 'Knowledge graph')}</button>
            <button type="button" onClick={onOpenHistory}>{text('修订历史', 'History')}</button>
            <button type="button" onClick={onOpenAudit}>{text('检查数据', 'Audit')}</button>
            {assetPage && PRIMARY_SECTIONS.map(section => <button type="button" key={section} onClick={event => { store.setSection(section); event.currentTarget.closest('details')?.removeAttribute('open') }}>{label(section)}</button>)}
            {RESEARCH_SECTIONS.filter(section => !PRIMARY_SECTIONS.includes(section) && section !== 'portfolio').map(section => <button type="button" key={section} data-finance-section={section} aria-current={state.section === section ? 'page' : undefined} onClick={event => { store.setSection(section); event.currentTarget.closest('details')?.removeAttribute('open') }}>{label(section)}</button>)}
          </div></details>
        </div>
      </header>
      {!assetPage && <nav className="rg-finance-nav" ref={nav} aria-label={t('finance.nav')}>
        <div className="rg-pf-primary" role="tablist" aria-label={text('财经板块', 'Finance sections')}>
          {PRIMARY_SECTIONS.map((section, index) => <button type="button" role="tab" id={`rg-finance-tab-${section}`} key={section} aria-controls="rg-finance-content" aria-selected={primarySection === section} tabIndex={primarySection === section || !PRIMARY_SECTIONS.includes(primarySection) && index === 0 ? 0 : -1} data-active={primarySection === section || undefined} onClick={() => store.setSection(section)} onKeyDown={event => {
            const next = event.key === 'ArrowRight' ? (index + 1) % PRIMARY_SECTIONS.length : event.key === 'ArrowLeft' ? (index + PRIMARY_SECTIONS.length - 1) % PRIMARY_SECTIONS.length : event.key === 'Home' ? 0 : event.key === 'End' ? PRIMARY_SECTIONS.length - 1 : -1
            const target = PRIMARY_SECTIONS[next]
            if (target === undefined) return
            event.preventDefault(); store.setSection(target); event.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>('[role="tab"]')[next]?.focus()
          }}>{label(section)}</button>)}
        </div>

      <div className="rg-pf-statusbar">
        <span>{text('本地研究空间', 'Local research workspace')}<span className="rg-pf-status-separator">·</span>{t('header.revision', { revision: graphRevision })}</span>
        {state.section !== 'virtual-fund' && state.section !== 'portfolio' && <label>{text('页面数据', 'Page data')} <select aria-label={text('页面数据模式', 'Page data mode')} value={demo ? 'demo' : 'real'} onChange={event => setDataMode(event.target.value === 'demo')}><option value="demo">{text('样例资料', 'Example data')}</option><option value="real">{text('我的资料', 'My data')}</option></select></label>}
        <button type="button" disabled={state.busy !== null} onClick={() => { void store.refresh(); void onRefreshGraph() }}>{t('header.refresh')}</button>
      </div>
      </nav>}


      <div className="rg-finance-main" id="rg-finance-content" role={!assetPage && PRIMARY_SECTIONS.includes(primarySection) ? 'tabpanel' : 'region'} aria-labelledby={!assetPage && PRIMARY_SECTIONS.includes(primarySection) ? marketGroup && state.section !== 'markets' ? `rg-finance-tab-${state.section}` : `rg-finance-tab-${primarySection}` : undefined} aria-label={assetPage ? assetSymbol || text('个股详情', 'Stock detail') : PRIMARY_SECTIONS.includes(primarySection) ? undefined : label(state.section)} ref={main}>
      {marketGroup && <div className="rg-pf-market-nav" role="tablist" aria-label={text('市场类别', 'Market categories')}>
        {MARKET_SECTIONS.map((section, index) => <button key={section} type="button" role="tab" id={section === 'markets' ? 'rg-finance-market-tab-markets' : `rg-finance-tab-${section}`} aria-controls="rg-finance-content" aria-selected={state.section === section} tabIndex={state.section === section ? 0 : -1} onClick={() => store.setSection(section)} onKeyDown={event => {
          const next = event.key === 'ArrowRight' ? (index + 1) % MARKET_SECTIONS.length : event.key === 'ArrowLeft' ? (index + MARKET_SECTIONS.length - 1) % MARKET_SECTIONS.length : event.key === 'Home' ? 0 : event.key === 'End' ? MARKET_SECTIONS.length - 1 : -1
          const target = MARKET_SECTIONS[next]
          if (target === undefined) return
          event.preventDefault(); store.setSection(target); event.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>('[role="tab"]')[next]?.focus()
        }}>{section === 'markets' ? text('股票', 'Stocks') : label(section)}</button>)}
      </div>}
      <div className="rg-pf-body" data-with-aside={['markets', 'crypto', 'earnings', 'prediction-markets', 'screener', 'politicians', 'watchlist'].includes(state.section) || undefined}>
      <div className="rg-pf-page-content">
        {state.phase === 'loading' && <div className="rg-state" role="status"><div className="rg-skeleton" /><div className="rg-skeleton" style={{ width: 'min(420px, 72%)' }} /><span>{t('finance.state.loadingOverview')}</span></div>}
        {state.phase === 'error' && state.error !== null && <div className="rg-state" role="alert"><p className="rg-state-title">{t('finance.state.errorTitle')}</p><p className="rg-state-detail">{state.error.code}: {state.error.message}</p><button type="button" className="rg-btn" data-primary onClick={() => { void store.load() }}>{t('state.error.retry')}</button></div>}
        {state.phase === 'ready' && (state.section === 'markets' || state.section === 'crypto' || state.section === 'watchlist') && <DiscoveryPanel kind={state.section === 'markets' ? 'market' : state.section} nodes={nodes} demo={demo} locale={pageLocale} onOpenSymbol={openSymbol} onOpenSection={section => store.setSection(section)} onWatch={(node, watched) => { void store.setInstrumentWatched(node, watched) }} />}
        {state.phase === 'ready' && state.section === 'screener' && <ScreenerPanel nodes={nodes} demo={demo} locale={pageLocale} onOpenSymbol={openSymbol} onResearch={openResearch} />}
        {state.phase === 'ready' && state.section === 'politicians' && <PoliticiansPanel nodes={nodes} demo={demo} locale={pageLocale} onOpenSymbol={openSymbol} onResearch={openResearch} />}
        {state.phase === 'ready' && state.section === 'earnings' && <EarningsPanel nodes={nodes} demo={demo} locale={pageLocale} onOpenSymbol={openSymbol} onResearch={openResearch} />}
        {state.phase === 'ready' && state.section === 'prediction-markets' && <PredictionMarketsPanel nodes={nodes} demo={demo} locale={pageLocale} onOpenSymbol={openSymbol} onResearch={openResearch} />}
        {state.phase === 'ready' && (state.section === 'overview' || state.section === 'apps') && <WorkflowCatalog nodes={nodes} locale={pageLocale} query={query} onOpenSection={section => store.setSection(section)} onResearch={openResearch} />}
        {state.phase === 'ready' && state.section === 'activity' && <><OverviewPanel {...props} research={research} graphRevision={graphRevision} graphPhase={graphPhase} graphError={graphError} onRefreshGraph={onRefreshGraph} onOpenLibrary={openLibrary} onOpenHypothesis={openHypothesis} onOpenReport={openReport} onOpenGraph={onOpenGraph} onOpenAudit={onOpenAudit} />{research && <section className="rg-finance-section"><ResearchRuns store={research} t={t} kind="research" onOpenArtifact={openReport} /><ResearchRuns store={research} t={t} kind="review" onOpenArtifact={openReport} /></section>}</>}
        {state.phase === 'ready' && (state.section === 'inbox' || state.section === 'ingest') && <InboxPanel key={inboxEntry} {...props} initialEntry={inboxEntry} onOpenGraph={onOpenGraph} />}
        {state.phase === 'ready' && state.section === 'library' && <LibraryPanel {...props} initialSelectedId={libraryNodeId} graphPhase={graphPhase} graphError={graphError} onRefreshGraph={onRefreshGraph} onOpenGraph={onOpenGraph} edges={edges} locale={pageLocale} onAddMaterials={() => store.setSection('inbox')} onResearch={openResearch} research={research} onOpenHypotheses={() => { store.setSection('hypotheses') }} />}
        {state.phase === 'ready' && state.section === 'hypotheses' && (research !== undefined ? <HypothesesPanel research={research} t={t} nodes={nodes} edges={edges} graphPhase={graphPhase} graphError={graphError} onRefreshGraph={onRefreshGraph} onOpenGraph={onOpenGraph} onOpenReport={openReport} onOpenLibrary={() => { store.setSection('library') }} onResearch={openResearch} /> : <div className="rg-state" role="alert">{t('research.unavailable')}</div>)}
        {state.phase === 'ready' && state.section === 'reports' && (research !== undefined ? <ReportsPanel research={research} t={t} nodes={nodes} edges={edges} graphPhase={graphPhase} graphError={graphError} onRefreshGraph={onRefreshGraph} onOpenGraph={onOpenGraph} onOpenLibrary={openLibrary} onOpenBriefing={() => { store.setSection('briefing') }} conversations={conversations} onResearch={conversations ? seed => { void launch(seed) } : undefined} locale={pageLocale} /> : <div className="rg-state" role="alert">{t('research.unavailable')}</div>)}
        {state.phase === 'ready' && state.section === 'market' && <MarketPanel {...props} onResearch={openResearch} locale={pageLocale} demo={demo} />}
        {state.phase === 'ready' && (state.section === 'virtual-fund' || state.section === 'portfolio') && <VirtualFundPanel key={state.section} locale={pageLocale} nodes={nodes} readState={readFundState} portfolioContent={<PortfolioPanel {...props} />} initialView={state.section === 'portfolio' ? 'portfolio' : 'office'} onResearch={(question, sessionId) => { if (conversations) void launch({ mode: 'question', question, skillName: 'virtual-fund' }, sessionId); else openResearch(question, 'virtual-fund') }} />}
        {state.phase === 'ready' && state.section === 'valuations' && <ValuationsPanel {...props} />}
        {state.phase === 'ready' && state.section === 'predictions' && <PredictionsPanel {...props} onResearch={conversations ? openResearch : undefined} />}
        {state.phase === 'ready' && state.section === 'briefing' && <BriefingPanel {...props} onResearch={conversations ? openResearch : undefined} />}
        {state.phase === 'ready' && state.section === 'guide' && <GuidePanel
          {...props}
          edges={edges}
          locale={locale}
          workflow={deriveWorkflow(nodes)}
          onOpenGraph={id => { onOpenGraph(id) }}
          onOpenLibrary={openLibrary}
          onOpenHypothesis={openHypothesis}
          onOpenReport={openReport}
          onOpenClip={() => { setInboxEntry('clip'); store.setSection('inbox') }}
        />}
      </div>
      {state.phase === 'ready' && ['markets', 'crypto', 'earnings', 'prediction-markets', 'screener', 'politicians', 'watchlist'].includes(state.section) && <FinanceAside section={state.section} nodes={nodes} demo={demo} locale={pageLocale} onOpenSymbol={openSymbol} onOpenSection={section => store.setSection(section)} onResearch={openResearch} />}
      </div>
      </div>
      {assistant && <section className="rg-pf-assistant" data-expanded={assistant || undefined} aria-label={text('金融助手', 'Finance assistant')}>
        {assistant && <div className="rg-pf-assistant-head"><strong>{text('用你的资料，研究一个问题', 'Research a question with your sources')}</strong><button type="button" onClick={() => setAssistant(false)} aria-label={text('关闭金融助手', 'Close finance assistant')}><svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden="true"><path d="m5 5 10 10M15 5 5 15"/></svg></button></div>}
        <form onSubmit={submitResearch}>
          {(workflowSkill || researchTicker || sourceIds.length > 0) && <div className="rg-research-context" aria-label={text('研究上下文', 'Research context')}>
            {workflowSkill && <span>/{workflowSkill}<button type="button" aria-label={text('移除 Skill', 'Remove Skill')} onClick={() => { setWorkflowSkill(''); setComposerError('') }}>×</button></span>}
            {researchTicker && <span>@ {researchTicker}<button type="button" aria-label={text('移除公司上下文', 'Remove company context')} onClick={() => setResearchTicker('')}>×</button></span>}
            {sourceIds.map(id => <span key={id} data-unavailable={!sourceNodes.some(node => node.id === id) || undefined} title={sourceNodes.find(node => node.id === id)?.title}><span className="rg-research-chip-label">{sourceNodes.find(node => node.id === id)?.title ?? text('资料已不可用', 'Source unavailable')}</span><button type="button" aria-label={`${text('移除资料', 'Remove source')} ${sourceNodes.find(node => node.id === id)?.title ?? id}`} onClick={() => setSourceIds(ids => ids.filter(value => value !== id))}>×</button></span>)}
          </div>}
          <textarea ref={questionRef} rows={assistant ? 2 : 1} onFocus={() => setAssistant(true)} value={question} onChange={event => setQuestion(event.target.value)} placeholder={assetPage ? text(`询问关于 ${assetName || assetSymbol} 的任何问题`, `Ask anything about ${assetName || assetSymbol}`) : text('例如：比较苹果和微软的增长驱动，并检查我的投资假说', 'Compare growth drivers for Apple and Microsoft using my investment theses')} aria-label={text('研究问题', 'Research question')} />
          <div className="rg-pf-composer-actions" onKeyDown={event => { if (event.key === 'Escape') { const menu = (event.target as HTMLElement).closest('details'); if (menu?.open) { event.preventDefault(); menu.open = false; menu.querySelector('summary')?.focus() } } }}>
            <details ref={sourceMenu} className="rg-research-menu rg-research-source-menu"><summary aria-label={text('选择研究资料', 'Choose research sources')}><svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden><path d="M10 3v14M3 10h14"/></svg>{text('资料', 'Sources')}{sourceIds.length > 0 && <small>{sourceIds.length}</small>}</summary><div>
              <header><strong>{text('从资料库选择', 'Choose from library')}</strong><span>{sourceIds.length} {text('已选', 'selected')}</span></header>
              <input type="search" aria-label={text('搜索研究资料', 'Search research sources')} placeholder={text('搜索材料名称', 'Search source titles')} value={sourceQuery} onChange={event => setSourceQuery(event.target.value)} onKeyDown={event => { if (event.key === 'Enter') event.preventDefault() }} />
              <div className="rg-research-source-list">{visibleSources.map(source => <label key={source.id}><input type="checkbox" checked={sourceIds.includes(source.id)} onChange={event => setSourceIds(ids => event.target.checked ? [...ids, source.id] : ids.filter(id => id !== source.id))}/><span><strong>{source.title}</strong><small>{source.kind === 'raw' ? text('原始材料', 'Original material') : text('来源资料', 'Source')}</small></span></label>)}{visibleSources.length === 0 && <p>{text(sourceNodes.length ? '没有匹配的材料。' : '资料库还没有材料，可以先导入网页或文件。', sourceNodes.length ? 'No matching sources.' : 'Your library is empty. Import a webpage or file first.')}</p>}</div>
              <footer><button type="button" onClick={() => { sourceMenu.current?.removeAttribute('open'); store.setSection('inbox') }}>{text('导入网页或文件', 'Import webpage or file')}<span aria-hidden>↗</span></button><button type="button" onClick={() => sourceMenu.current?.removeAttribute('open')}>{text('完成', 'Done')}</button></footer>
            </div></details>
            {conversations && <details ref={skillMenu} className="rg-research-menu rg-research-skill-menu"><summary aria-label={text('选择研究 Skill', 'Choose research Skill')}><svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden><rect x="3" y="3" width="14" height="14" rx="4"/><path d="m13 6-6 8"/></svg>{researchMode === 'ticker' ? text('公司研究', 'Company research') : researchMode === 'deep' ? text('深入研究', 'Deep research') : text('问题研究', 'Question research')}<span aria-hidden>⌄</span></summary><div>{(['ticker', 'question', 'deep'] as const).map(mode => <button type="button" key={mode} aria-pressed={researchMode === mode} onClick={() => { setResearchMode(mode); skillMenu.current?.removeAttribute('open') }}><span>{mode === 'ticker' ? text('研究一家公司', 'Research a company') : mode === 'question' ? text('回答一个问题', 'Explore a question') : text('深入已有报告', 'Continue a report')}</span><small>{mode === 'deep' ? '/deep-research' : '/research'}</small></button>)}</div></details>}
            {assistant && <input type="text" aria-label={text('研究截止时间（可选）', 'As-of cutoff (optional)')} placeholder={text('截止时间（可选，ISO）', 'As-of cutoff (optional, ISO)')} value={asOf} onChange={event => setAsOf(event.target.value)} />}<span>{conversations ? text('在 DSH 对话中继续', 'Continue in DSH') : text('使用 DSH 当前会话', 'Uses the current DSH session')}</span><button type="submit" className="rg-btn" data-primary disabled={(!research && !conversations) || !(question.trim() || conversations && researchMode === 'ticker' && researchTicker)}>{conversations ? text('进入对话', 'Open conversation') : text('开始研究', 'Start research')}</button>
          </div>
        </form>
        {composerError && <p role="alert">{composerError}</p>}
        {!research && !conversations && <p role="alert">{text('研究会话暂不可用，请检查 DSH 连接。', 'Research session unavailable. Check the DSH connection.')}</p>}
        {assistant && research && <ResearchRuns store={research} t={t} kind="research" onOpenArtifact={openReport} />}
      </section>}
      {shareOpen && <dialog ref={shareDialog} className="rg-stock-share-dialog rg-conversation-dialog" aria-labelledby="rg-stock-share-title" onCancel={event => { event.preventDefault(); closeShare() }}>
        <header><h3 id="rg-stock-share-title">{text('分享此页面', 'Share this page')}</h3><button type="button" aria-label={text('关闭', 'Close')} onClick={closeShare}>×</button></header>
        <p>{assetName || assetSymbol} · {assetSymbol}</p><input aria-label={text('分享链接', 'Share link')} value={shareUrl} readOnly onFocus={event => event.currentTarget.select()} />
        <footer><span role="status">{shareNotice}</span><button type="button" className="rg-btn" data-primary onClick={() => { void shareAsset() }}>{text('复制链接', 'Copy link')}</button></footer>
      </dialog>}
      {shareNotice && <div className="rg-toast" role="status"><span>{shareNotice}</span><button type="button" aria-label={text('关闭', 'Close')} onClick={() => setShareNotice('')}>×</button></div>}
      {state.notice !== null && <div className="rg-toast" data-tone={state.notice.tone === 'error' ? 'error' : undefined} role="status">{state.notice.text}</div>}
    </div>
  )
}
