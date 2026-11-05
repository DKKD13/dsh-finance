import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { MarkdownText } from '@deepseek-ai/dsh-client-ui-primitives'
import type { GraphNode, JsonValue } from '../../src/graph.ts'
import type { GraphResponse } from '../../src/protocol.ts'
import { VirtualFundOverview } from './VirtualFundOverview.tsx'
import { FUND_AVATARS } from '../fund-avatars.ts'
import { protectReportCurrency } from '../report-markdown.ts'
import { AssetLogo } from './AssetLogo.tsx'
import type { ScheduleListResult } from '../finance-store.ts'

type View = 'office' | 'overview' | 'portfolio'
/** sessionStorage key: the chosen fund survives section switches and remounts within one tab session. */
const FUND_SELECTION_KEY = 'dsh-finance.virtual-fund-selection.v1'
const readSavedFund = (): string => {
  try { return typeof sessionStorage === 'undefined' ? '' : sessionStorage.getItem(FUND_SELECTION_KEY) ?? '' }
  catch { return '' }
}
interface FundState { funds: readonly GraphNode[]; researchers: readonly GraphNode[]; snapshots: readonly GraphNode[]; events: readonly GraphNode[] }
const string = (value: JsonValue | undefined) => typeof value === 'string' ? value : ''
const object = (value: JsonValue | undefined): Record<string, JsonValue> => value && typeof value === 'object' && !Array.isArray(value) ? value : {}
const tickers = (node: GraphNode) => Array.isArray(node.metadata.tickers) ? node.metadata.tickers.filter((v): v is string => typeof v === 'string') : []
const rows = (value: JsonValue | undefined): GraphNode[] => Array.isArray(value) ? value.filter(v => !!v && typeof v === 'object' && !Array.isArray(v) && typeof v.id === 'string' && typeof v.metadata === 'object') as unknown as GraphNode[] : []
function fromNodes(nodes: readonly GraphNode[]): FundState {
  return { funds: nodes.filter(n => n.kind === 'portfolio' && n.metadata.virtualFund), researchers: nodes.filter(n => n.kind === 'session' && n.metadata.type === 'fund-researcher'), snapshots: nodes.filter(n => n.kind === 'session' && n.metadata.type === 'fund-snapshot'), events: nodes.filter(n => n.kind === 'deliverable' && typeof n.metadata.fundId === 'string') }
}
function avatar(node: GraphNode, index: number) {
  const explicitAvatar = string(node.metadata.avatarKey)
  if (FUND_AVATARS[explicitAvatar]) return FUND_AVATARS[explicitAvatar]
  const key = string(node.metadata.role) === 'manager' ? 'pm' : string(node.metadata.role) === 'reviewer' ? 'reviewer' : tickers(node)[0]?.toLowerCase() ?? ''
  return FUND_AVATARS[key] ?? Object.values(FUND_AVATARS)[1 + index % 6]!
}

type CoverageState = 'checking' | 'scheduled' | 'missing' | 'unknown'

export function VirtualFundPanel({ locale, nodes = [], readState, readSchedules, onResearch, portfolioContent, initialView = 'office' }: {
  readonly locale: string; readonly nodes?: readonly GraphNode[]
  readonly readState?: ((fundId?: string, knownRevision?: number) => Promise<GraphResponse>) | undefined
  readonly readSchedules?: ((sessionId: string) => Promise<ScheduleListResult>) | undefined
  readonly onResearch?: ((question: string, sessionId?: string) => void) | undefined
  readonly portfolioContent?: ReactNode; readonly initialView?: View
}) {
  const zh = locale.startsWith('zh'), text = (cn: string, en: string) => zh ? cn : en
  const [view, setView] = useState<View>(initialView)
  const [data, setData] = useState<FundState>(() => fromNodes(nodes))
  const [fundId, setFundIdState] = useState(readSavedFund)
  const setFundId = (id: string) => {
    setFundIdState(id)
    try { if (typeof sessionStorage !== 'undefined') sessionStorage.setItem(FUND_SELECTION_KEY, id) }
    catch { /* The selection still works for this mount when storage is unavailable. */ }
  }
  const [selected, setSelected] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(!!readState)
  const [refresh, setRefresh] = useState(0)
  const revision = useRef<number | undefined>(undefined)
  const [coverageStatus, setCoverage] = useState<Record<string, CoverageState>>({})
  const trigger = useRef<HTMLElement | null>(null)
  const close = useRef<HTMLButtonElement>(null)
  const tabs = useRef<(HTMLButtonElement | null)[]>([])
  useEffect(() => { if (!readState) setData(fromNodes(nodes)) }, [nodes, readState])
  useEffect(() => {
    if (!readState) return
    let alive = true, pending = false
    const load = async () => {
      if (pending) return
      pending = true
      try {
        const response = await readState(undefined, revision.current)
        if (!alive) return
        if (!response.ok) { setError(response.error.code + ': ' + response.error.message); return }
        const result = object(response.result)
        revision.current = response.revision
        if (result.unchanged === true) { setError(''); return }
        setData({ funds: rows(result.funds), researchers: rows(result.researchers), snapshots: rows(result.snapshots), events: rows(result.events) })
        setError('')
      } catch (cause) { if (alive) setError(cause instanceof Error ? cause.message : String(cause)) }
      finally { pending = false; if (alive) setLoading(false) }
    }
    void load()
    const timer = setInterval(() => { if (!document.hidden) void load() }, 30000)
    return () => { alive = false; clearInterval(timer) }
  }, [readState, refresh])
  const fund = data.funds.find(n => n.id === fundId) ?? data.funds[0]
  const researchers = data.researchers.filter(n => n.metadata.fundId === fund?.id)
  const snapshots = data.snapshots.filter(n => n.metadata.fundId === fund?.id).sort((a, b) => string(a.metadata.asOf).localeCompare(string(b.metadata.asOf)))
  const events = data.events.filter(n => n.metadata.fundId === fund?.id).sort((a, b) => b.createdAt - a.createdAt)
  const activeSeat = researchers.find(n => n.id === selected)
  const latest = snapshots.at(-1)
  const config = object(fund?.metadata.virtualFund)
  const money = (value: JsonValue | undefined) => {
    if (typeof value !== 'number' || !Number.isFinite(value)) return '—'
    const currency = string(config.currency)
    try { return value.toLocaleString(zh ? 'zh-CN' : 'en-US', { style: 'currency', currency, maximumFractionDigits: 0 }) }
    catch { return `${currency} ${value.toLocaleString(zh ? 'zh-CN' : 'en-US', { maximumFractionDigits: 0 })}`.trim() }
  }
  const date = (value: string) => value && Number.isFinite(Date.parse(value)) ? new Date(value).toLocaleString(zh ? 'zh-CN' : 'en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', timeZoneName: 'short' }) : '—'
  useEffect(() => {
    if (!readSchedules) return
    let alive = true
    const verify = async () => {
      for (const node of data.researchers) {
        const scheduleId = string(node.metadata.scheduleId)
        const sessionId = string(node.metadata.sessionId)
        if (node.metadata.enabled !== true || !scheduleId) continue
        if (!sessionId) { if (alive) setCoverage(current => ({ ...current, [node.id]: 'unknown' })); continue }
        if (alive) setCoverage(current => ({ ...current, [node.id]: 'checking' }))
        const result = await readSchedules(sessionId)
        if (!alive) return
        const status = result.ok ? result.value.some(task => task.id === scheduleId) ? 'scheduled' : 'missing' : 'unknown'
        setCoverage(current => ({ ...current, [node.id]: status }))
      }
    }
    void verify()
    const timer = setInterval(() => { if (!document.hidden) void verify() }, 30000)
    return () => { alive = false; clearInterval(timer) }
  }, [data.researchers, readSchedules, refresh])
  const stateOf = (node: GraphNode) => {
    if (node.metadata.enabled !== true) return text('未开启覆盖', 'Coverage paused')
    if (!string(node.metadata.scheduleId)) return text('等待设置计划', 'Schedule pending')
    if (!readSchedules) return text('计划状态未核实', 'Schedule unverified')
    const status = coverageStatus[node.id]
    return status === 'scheduled' ? text('已设覆盖计划', 'Coverage scheduled')
      : status === 'missing' ? text('计划已失效', 'Schedule missing')
        : status === 'checking' ? text('正在核对计划', 'Checking schedule')
          : text('计划状态未核实', 'Schedule unverified')
  }
  const setup = () => onResearch?.(text('我想创建一支虚拟基金和投研团队。请先简洁地询问基金名称、初始资金、基础币种（ISO 三字母代码）、起始日期，以及我希望覆盖的公司或方向；一次只问必要的问题。说明这是独立的模拟资金账本。确认后使用 finance_virtual_fund configure 保存，创建我选择的研究工位。', 'Help me create a virtual fund and research team. Ask briefly for its name, starting capital, base currency (three-letter ISO code), start date and coverage. Ask only what is needed. This is a separate paper-fund ledger. After confirmation, persist it with finance_virtual_fund configure and create the selected research desks.'))
  const advance = () => fund && onResearch?.(`${text('查看并推进这支虚拟基金的模拟研究：', 'Review and advance this virtual fund: ')} ${JSON.stringify(fund.id)}。${text('先读取最新截面和研究记录，询问我要推进到哪个日期，严格使用当时已可用资料。用 finance_virtual_fund advance 计算纸面持仓和净值。', 'Read its latest snapshot and research. Ask which as-of date to advance to. Use only information available by then, and finance_virtual_fund advance for paper holdings and NAV.')}`)
  const createDesk = () => fund ? onResearch?.(`${text('为这支虚拟基金创建一个投研工位：', 'Create a research desk for this virtual fund: ')} ${JSON.stringify(fund.id)}。${text('请通过简短对话了解职业角色、研究风格、关注方向、研究任务和覆盖标的，然后保存。是否持续覆盖、更新频率和时区由我确认；只有实际创建 DSH 计划成功后才标记已开启。', 'Ask briefly about its professional role, research style, focus, task and covered symbols, then save it. Confirm recurring coverage, cadence and time zone with me; only mark coverage enabled after a native DSH schedule was actually created.')}`) : setup()
  const talk = (node: GraphNode, configure = false) => onResearch?.(`${text('与这个虚拟研究员继续工作。', 'Continue with this virtual researcher.')} fundId=${JSON.stringify(fund?.id)}, researcherId=${JSON.stringify(node.id)}。${configure ? text('我想调整研究设定或持续覆盖计划。先读取当前配置，用简短问题确认研究特征、风格、关注方向、任务与覆盖标的，再保存；保留已有记忆。修改或暂停实际 DSH schedule 后同步其返回状态。', 'Help me adjust the professional profile or recurring coverage. Read the current configuration first, ask concise questions, preserve memory, and save. Synchronize the actual native schedule result when modifying or pausing it.') : text('先读取该研究员的设定、历史研究和基金当前截面。请简要介绍你当前覆盖的公司、最近判断与尚缺证据，再让我继续提问；未运行的任务不要描述成已经运行。', 'Read this researcher’s profile, past research and the fund’s current as-of date. Briefly explain current coverage, latest judgment and evidence gaps, then let me ask questions. Do not describe unrun tasks as completed.')}`, string(node.metadata.sessionId) || undefined)
  const discussWithManager = () => {
    const manager = researchers.find(node => node.metadata.role === 'manager')
    if (manager) talk(manager)
    else if (fund) onResearch?.(`${text('讨论这支虚拟基金的当前情况：', 'Discuss this virtual fund’s current position: ')} fundId=${JSON.stringify(fund.id)}。${text('先只读基金当前截面和现有研究记录，概述当前持仓、最近判断与证据缺口，再让我继续提问。', 'Read only this fund’s current snapshot and existing research records. Summarize current holdings, recent judgments and evidence gaps, then let me ask questions.')}`)
  }
  const openSeat = (id: string, origin?: HTMLElement) => { trigger.current = origin ?? document.activeElement as HTMLElement; setSelected(id) }
  const closeSeat = () => {
    setSelected(null)
    const origin = trigger.current?.isConnected ? trigger.current : tabs.current[views.indexOf(view)]
    origin?.focus({ preventScroll: true })
  }
  useEffect(() => { if (selected) close.current?.focus({ preventScroll: true }) }, [selected])
  const views: View[] = portfolioContent ? ['office', 'overview', 'portfolio'] : ['office', 'overview']
  const changeView = (next: View) => { setSelected(null); setView(next) }
  useEffect(() => { if (selected && !activeSeat) closeSeat() }, [selected, activeSeat])
  const coverage = [...new Set(researchers.flatMap(tickers))]
  const openHolding = (id: string) => {
    const owner = researchers.find(n => n.id === id) ?? researchers.find(n => tickers(n).some(symbol => symbol.toLowerCase() === id.toLowerCase()))
    if (owner) { trigger.current = null; setView('office'); setSelected(owner.id) }
    else onResearch?.(`${text('查看这支虚拟基金的持仓与相关研究：', 'Review this virtual fund holding and related research: ')} fundId=${JSON.stringify(fund?.id)}, symbol=${JSON.stringify(id.toUpperCase())}`)
  }
  return <section className="rg-vfund" aria-label={text('虚拟基金', 'Virtual fund')} onKeyDown={event => { if (event.key === 'Escape' && selected) { event.preventDefault(); closeSeat() } }}>
    <header className="rg-vfund-heading"><div><h2>{text('虚拟基金', 'Virtual fund')}{fund && <span>{fund.title}</span>}</h2><p>{text('让研究持续积累，让每一次模拟决策留下记录。', 'Research that compounds. A record of every simulated decision.')}</p></div><div className="rg-vfund-heading-actions">{data.funds.length > 1 && <select aria-label={text('选择基金', 'Choose fund')} value={fund?.id ?? ''} onChange={e => { setFundId(e.target.value); setSelected(null) }}>{data.funds.map(n => <option key={n.id} value={n.id}>{n.title}</option>)}</select>}<button type="button" className="rg-btn" data-primary onClick={createDesk}>{text('＋ 创建投研工位', '+ Create research desk')}</button></div></header>
    <nav className="rg-vfund-tabs" role="tablist" aria-label={text('虚拟基金视图', 'Virtual fund views')}>{views.map((key, index) => <button type="button" role="tab" key={key} id={`rg-vfund-tab-${key}`} aria-controls="rg-vfund-panel" aria-selected={view === key} tabIndex={view === key ? 0 : -1} ref={node => { tabs.current[index] = node }} onClick={() => changeView(key)} onKeyDown={event => { const next = event.key === 'ArrowRight' ? (index + 1) % views.length : event.key === 'ArrowLeft' ? (index + views.length - 1) % views.length : event.key === 'Home' ? 0 : event.key === 'End' ? views.length - 1 : -1; if (next < 0) return; event.preventDefault(); changeView(views[next]!); tabs.current[next]?.focus() }}>{key === 'office' ? text('投研办公室', 'Research office') : key === 'overview' ? text('基金概览', 'Fund overview') : text('我的持仓', 'My holdings')}</button>)}</nav>
    {error && <div className="rg-vfund-error" role="alert">{text('基金记录暂时无法更新：', 'Could not refresh fund records: ')}{error}<button type="button" className="rg-btn" onClick={() => setRefresh(v => v + 1)}>{text('重试', 'Retry')}</button></div>}
    <div id="rg-vfund-panel" role="tabpanel" aria-labelledby={`rg-vfund-tab-${view}`}>
      {view === 'portfolio' ? <div className="rg-vfund-holdings">{loading && !fund ? <p className="rg-vfund-loading" role="status">{text('正在读取基金记录…', 'Loading fund records…')}</p> : error && !fund ? <p className="rg-vfund-loading">{text('恢复读取后即可查看基金持仓。', 'Fund holdings will appear when records can be read again.')}</p> : <VirtualFundOverview locale={locale} fund={fund} snapshots={snapshots} events={events} researchers={researchers} onAdvance={advance} onOpenOffice={() => fund ? setView('office') : setup()} onOpenSeat={openHolding} holdingsOnly />}{portfolioContent && <details className="rg-portfolio-advanced"><summary>{text('独立组合计算（可选）', 'Separate portfolio calculation (optional)')}</summary>{portfolioContent}</details>}</div> : loading && !fund ? <p className="rg-vfund-loading" role="status">{text('正在读取基金记录…', 'Loading fund records…')}</p> : error && !fund ? <p className="rg-vfund-loading">{text('恢复读取后即可查看基金与研究工位。', 'Fund and research desks will appear when records can be read again.')}</p> : view === 'overview' ? <VirtualFundOverview locale={locale} fund={fund} snapshots={snapshots} events={events} researchers={researchers} onAdvance={advance} onOpenOffice={() => fund ? setView('office') : setup()} onOpenSeat={openHolding} /> : !fund ? <div className="rg-vfund-welcome"><div className="rg-vfund-welcome-team" aria-hidden>{['nvda', 'pm', 'aapl'].map(key => <img key={key} src={FUND_AVATARS[key]} alt=""/>)}</div><h3>{text('组建你的虚拟投研团队', 'Build your virtual research team')}</h3><p>{text('设定起点，招募研究员，持续观察他们的判断。持仓、净值和研究过程会保存在这里。', 'Choose a starting point, bring in researchers, and follow their thinking. Holdings, NAV and research history live here.')}</p><button type="button" className="rg-btn" data-primary onClick={setup}>{text('创建虚拟基金', 'Create virtual fund')} ↗</button></div> : <div className="rg-vfund-office-body">
        <div className="rg-vfund-floor"><div className="rg-vfund-fund-summary"><div className="rg-vfund-fund-identity"><img src={FUND_AVATARS.pm} alt=""/><div><span>{text('模拟资金账本', 'Paper fund ledger')}</span><h3>{fund.title}</h3><p>{latest ? text('最新截面 ', 'Latest as of ') + date(string(latest.metadata.asOf)) : text('从 ', 'Starting ') + date(string(config.startingAt))}</p></div></div><dl><div><dt>{text('组合净值', 'Portfolio value')}</dt><dd>{money(latest?.metadata.nav ?? config.initialCash)}</dd></div><div><dt>{text('现金', 'Cash')}</dt><dd>{money(latest?.metadata.cash ?? config.initialCash)}</dd></div></dl><button type="button" className="rg-vfund-text-button" onClick={discussWithManager}>{text('与基金经理讨论', 'Discuss with the manager')} ↗</button></div>
          <div className="rg-vfund-room"><div className="rg-vfund-area-title"><h4>{text('研究工位', 'Research desks')}</h4><span>{researchers.length} {text('位研究员', 'researchers')}</span></div>{researchers.length === 0 ? <div className="rg-vfund-event-empty"><p>{text('第一位研究员，想让他关注什么？', 'What should your first researcher focus on?')}</p><button type="button" className="rg-btn" onClick={createDesk}>{text('创建投研工位', 'Create research desk')}</button></div> : <div className="rg-vfund-analysts">{researchers.map((node, index) => {
            const output = events.find(n => n.metadata.researcherId === node.id)
            return <button type="button" key={node.id} className="rg-vfund-node rg-vfund-station" data-seat={node.id} data-selected={selected === node.id || undefined} data-working={coverageStatus[node.id] === 'scheduled' || undefined} onClick={e => openSeat(node.id, e.currentTarget)} aria-label={`${text('查看', 'Inspect')} ${node.title}`}><span className="rg-vfund-monitor"><span className="rg-vfund-screen"><span className="rg-vfund-screen-bar"><i/><i/><i/><span>{text('研究终端', 'Research')}</span><small>{stateOf(node)}</small></span><span className="rg-vfund-screen-content"><span className="rg-vfund-coverage">{tickers(node).slice(0, 3).map(symbol => <span key={symbol}><AssetLogo symbol={symbol}/><strong>{symbol}</strong></span>)}</span><span className="rg-vfund-note-state">{output ? text('最近研究', 'Latest research') : string(node.metadata.researchStyle) || text('研究方向', 'Research focus')}</span><p>{output?.title ?? (string(node.metadata.task) || string(node.metadata.focus) || text('在对话中设置研究任务', 'Set a research task in conversation'))}</p></span></span></span><span className="rg-vfund-monitor-neck"/><span className="rg-vfund-monitor-base"/><span className="rg-vfund-colleague"><img src={avatar(node, index)} alt=""/><span className="rg-vfund-seat-light"/></span><span className="rg-vfund-desk"/><span className="rg-vfund-nameplate"><span><strong>{node.title}</strong><small>{string(node.metadata.focus) || text('独立研究', 'Independent research')}</small></span><span className="rg-vfund-inspect">{text('交流', 'Talk')} ↗</span></span></button>
          })}</div>}</div>
          {coverage.length > 0 && <section className="rg-vfund-archive"><h4>{text('覆盖档案', 'Coverage archive')}</h4><div className="rg-vfund-archive-grid">{coverage.map(symbol => { const owner = researchers.find(n => tickers(n).includes(symbol))!; const count = events.filter(n => Array.isArray(n.metadata.instruments) && n.metadata.instruments.some(instrument => typeof instrument === 'string' && instrument.trim().toUpperCase() === symbol.trim().toUpperCase())).length; return <button type="button" key={symbol} onClick={e => openSeat(owner.id, e.currentTarget)}><AssetLogo symbol={symbol}/><span><strong>{symbol}</strong><small>{count ? `${count} ${text('份研究', 'reports')}` : text('等待首份研究', 'Awaiting first research')}</small></span><span aria-hidden>↗</span></button> })}</div></section>}
        </div>
        <aside className="rg-vfund-events" aria-label={text('工作动态', 'Activity feed')}><header><h3>{text('工作动态', 'Activity feed')}</h3><span>{events.length}</span></header>{events.length === 0 ? <div className="rg-vfund-event-empty"><p>{text('研究员的发现、基金决策与复盘会持续汇集在这里。', 'Findings, fund decisions and reviews collect here as the team works.')}</p></div> : <ol>{events.map(event => <li key={event.id}><button type="button" onClick={() => onResearch?.(`${text('继续讨论这份基金研究，读取原文与引用后回答我的问题：', 'Continue this fund research. Read the original and citations before answering: ')} ${JSON.stringify(event.id)}，fundId=${JSON.stringify(fund.id)}`, string(event.metadata.sessionId) || undefined)}><time>{date(new Date(event.createdAt).toISOString())}</time><span><span className="rg-vfund-event-label">{researchers.find(n => n.id === event.metadata.researcherId)?.title ?? text('基金研究', 'Fund research')}</span><span className="rg-vfund-event-text">{event.title}</span></span></button></li>)}</ol>}</aside>
        {activeSeat && <aside className="rg-vfund-drawer" role="dialog" aria-modal="false" aria-label={`${text('研究员', 'Researcher')} · ${activeSeat.title}`}><header><img className="rg-vfund-drawer-portrait" src={avatar(activeSeat, researchers.indexOf(activeSeat))} alt=""/><div><h3>{activeSeat.title}</h3><p>{stateOf(activeSeat)}</p></div><button type="button" ref={close} className="rg-btn" onClick={closeSeat} aria-label={text('关闭席位详情', 'Close seat details')}>×</button></header><div className="rg-vfund-drawer-body"><div className="rg-vfund-drawer-actions"><button type="button" className="rg-btn" data-primary onClick={() => talk(activeSeat)}>{text('和 TA 对话', 'Talk to researcher')} ↗</button><button type="button" className="rg-btn" onClick={() => talk(activeSeat, true)}>{text('调整设定', 'Edit profile')}</button></div><section><h4>{text('研究设定', 'Research profile')}</h4>{[['研究风格', 'Research style', activeSeat.metadata.researchStyle], ['关注方向', 'Focus', activeSeat.metadata.focus], ['研究任务', 'Research task', activeSeat.metadata.task]].map(([cn, en, value]) => <dl key={cn as string}><dt>{text(cn as string, en as string)}</dt><dd>{string(value as JsonValue) || '—'}</dd></dl>)}<div className="rg-vfund-drawer-symbols">{tickers(activeSeat).map(symbol => <span key={symbol}><AssetLogo symbol={symbol}/>{symbol}</span>)}</div></section><section><h4>{text('职责', 'Responsibilities')}</h4><p>{text('跟踪覆盖标的，引用原始材料，记录判断、反证与研究变化。模拟持仓与净值统一交由基金账本计算。', 'Follow covered companies, cite original materials, and record judgments, counterevidence and changes. The fund ledger calculates paper holdings and NAV.')}</p></section><section><h4>{text('持续覆盖', 'Recurring coverage')}</h4><p>{stateOf(activeSeat)}</p><button type="button" className="rg-vfund-text-button" onClick={() => talk(activeSeat, true)}>{activeSeat.metadata.enabled === true ? text('管理覆盖计划', 'Manage coverage schedule') : text('设置覆盖计划', 'Set coverage schedule')} ↗</button></section><section><h4>{text('最新研究', 'Latest research')}</h4>{events.filter(n => n.metadata.researcherId === activeSeat.id).slice(0, 2).map(n => <div className="rg-vfund-output" key={n.id}><strong>{n.title}</strong><MarkdownText text={protectReportCurrency(n.content)} labels={{ code: { copyLabel: text('复制', 'Copy'), copiedLabel: text('已复制', 'Copied'), toolbarLabels: { codeLabel: text('代码', 'Code'), wrapLabel: text('换行', 'Wrap'), unwrapLabel: text('取消换行', 'Unwrap') } }, footnotes: text('注释', 'Footnotes') }} omitHtml/></div>)}{!events.some(n => n.metadata.researcherId === activeSeat.id) && <p>{text('还没有保存研究。和 TA 聊聊，从一个问题开始。', 'No saved research yet. Start with a question.')}</p>}</section></div></aside>}
      </div>}
    </div>
  </section>
}
