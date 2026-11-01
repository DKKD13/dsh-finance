import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { GraphNode } from '../../src/graph.ts'
import type { FinanceSection } from '../finance-store.ts'
import { workflowSkills } from '../workflow-skills.ts'
import type { WorkflowSkill } from '../workflow-skills.ts'
import type { ConversationSeed } from './ConversationDialog.tsx'
import { SkillArtwork } from './SkillArtwork.tsx'

interface Props {
  readonly nodes: readonly GraphNode[]
  readonly locale?: string | undefined
  readonly query?: string | undefined
  readonly onOpenSection: (section: FinanceSection) => void
  readonly onResearch: (question: string, skillName?: string, context?: Pick<ConversationSeed, 'ticker' | 'sourceIds' | 'asOf'>) => void
}
interface Task { readonly cn: string; readonly en: string; readonly desc: readonly [string, string]; readonly section?: FinanceSection; readonly prompt?: string }
const GROUPS: readonly { readonly name: string; readonly cn: string; readonly en: string; readonly state: 'local' | 'public' | 'locked'; readonly tasks: readonly Task[] }[] = [
  { name: 'DeepSeek Research', cn: '用你的原始资料、投资假说和报告，完成有据可查的研究。', en: 'Research with your original sources, investment theses and reports.', state: 'local', tasks: [
    { cn: '公司首次覆盖报告', en: 'Company initiation report', desc: ['梳理业务、增长、估值与风险，逐条回溯原文。', 'Cover the business, growth, valuation and risks with original citations.'], prompt: '生成公司首次覆盖报告，分析业务、竞争、增长驱动、估值和风险，明确事实、推断和缺失证据。' },
    { cn: '知识编译', en: 'Knowledge compilation', desc: ['把网页、文件与批注编译成可追溯的知识。', 'Compile pages, files and annotations into traceable knowledge.'], section: 'library' },
    { cn: '假说与反证审查', en: 'Thesis & counter-evidence', desc: ['检验投资论断，保留相反证据和失效条件。', 'Challenge investment theses with counter-evidence and kill criteria.'], section: 'hypotheses' },
    { cn: '财报前瞻', en: 'Pre-earnings brief', desc: ['整理关键指标、预期差和待验证的问题。', 'Prepare the key metrics, expectations and open questions.'], prompt: '准备一份财报前瞻，列出关键指标、已披露事实、预期差与待验证问题。' },
    { cn: '财报后复盘', en: 'Post-earnings report', desc: ['比较业绩、指引和原有投资假说。', 'Compare results and guidance against the original thesis.'], prompt: '制作财报后复盘，比较业绩、指引与原有假说，给出证据和变化原因。' },
    { cn: '深度研究', en: 'Deep research', desc: ['从已有报告继续追问，保留版本与引用。', 'Extend an existing report with version history and citations.'], section: 'reports' },
  ] },
  { name: 'Public sources', cn: '免费公开来源与本地资料；商业数据缺口会明确列出。', en: 'Free public sources and local files, with data gaps made explicit.', state: 'public', tasks: [
    { cn: '公开申报分析', en: 'SEC filings analysis', desc: ['读取公开申报，核对财务数据和经营风险。', 'Analyze public filings, financial metrics and business risks.'], prompt: '研究公开申报文件，核对财务数据、披露时点和经营风险；引用可访问的原文。' },
    { cn: '同业对比', en: 'Company comparables', desc: ['比较增长、利润率、估值与可比口径。', 'Compare growth, margins and valuation on a consistent basis.'], prompt: '制作同业比较表，比较增长、利润率、估值和统计口径，缺失数据留空并注明。' },
    { cn: '行业全景', en: 'Industry overview', desc: ['拆解产业链、竞争格局和需求变化。', 'Map the value chain, competition and changing demand.'], prompt: '生成行业全景，分析产业链、竞争格局、市场需求和关键不确定性。' },
    { cn: '网页与文件采集', en: 'Collect pages & files', desc: ['预览后确认入库，保留来源和可用时间。', 'Preview and confirm imports with their source and availability date.'], section: 'inbox' },
    { cn: '免费行情与图表', en: 'Quotes & charts', desc: ['按股票代码查询 Yahoo 价格与历史行情。', 'Request Yahoo prices and history by market symbol.'], section: 'market' },
    { cn: '市场事件追踪', en: 'Market event research', desc: ['从事件回到原始证据，跟进影响与催化剂。', 'Follow events back to original evidence and catalysts.'], prompt: '基于可核验来源追踪市场事件，列明事件时点、影响机制和证据缺口。' },
  ] },
  { name: 'Portfolio & decisions', cn: '把研究落到你的持仓、估值与预测记录。', en: 'Connect research to your holdings, valuation and predictions.', state: 'local', tasks: [
    { cn: '组合透视', en: 'Portfolio X-ray', desc: ['查看持仓、敞口和组合计算结果。', 'Inspect holdings, exposure and portfolio calculations.'], section: 'portfolio' },
    { cn: 'DCF 与敏感性', en: 'DCF & sensitivity', desc: ['使用明确假设计算估值，检查敏感性。', 'Value a business using explicit assumptions and sensitivities.'], section: 'valuations' },
    { cn: '预测与结算', en: 'Prediction review', desc: ['记录原始判断，按截止时点结算与复盘。', 'Keep original predictions and review them at the stated cutoff.'], section: 'predictions' },
    { cn: '组合周度复核', en: 'Weekly portfolio review', desc: ['结合持仓和本周证据，检查假说变化。', 'Review thesis changes against holdings and weekly evidence.'], prompt: '请基于真实持仓、原始假说和本周资料进行组合周度复核，按时点区分事实与推断。' },
    { cn: '研究简报', en: 'Research briefing', desc: ['汇总关键资料、到期预测与行动问题。', 'Summarize key sources, due predictions and open questions.'], section: 'briefing' },
    { cn: '研究进度', en: 'Research activity', desc: ['查看采集、编译、假说、报告与复盘记录。', 'Track collection, compilation, theses, reports and reviews.'], section: 'activity' },
  ] },
  { name: 'Premium connectors', cn: '参考产品中的商业数据工作流。尚未接入；可先用公开资料研究。', en: 'Commercial data workflows from the reference. Not connected; public-source research is available.', state: 'locked', tasks: [
    { cn: 'Daloopa · 财务指标', en: 'Daloopa · Financial KPIs', desc: ['商业连接器未配置，查看可用替代路径。', 'Connector not configured. View the public-source alternative.'] },
    { cn: 'PitchBook · 私募市场', en: 'PitchBook · Private markets', desc: ['商业连接器未配置，不展示虚构数据库结果。', 'Connector not configured. Database results are unavailable.'] },
    { cn: 'FactSet · 一致预期', en: 'FactSet · Consensus', desc: ['授权和预期数据库尚未接入。', 'Licensed estimates are not connected.'] },
    { cn: 'Quartr · 电话会议', en: 'Quartr · Earnings calls', desc: ['可先导入你拥有的公开文字稿与文件。', 'Import publicly accessible transcripts or your own files.'] },
    { cn: 'Fiscal.ai · 财报数据', en: 'Fiscal.ai · Earnings data', desc: ['可先使用公开申报与已导入的财报。', 'Use public filings and imported earnings reports.'] },
    { cn: 'Unusual Whales · 交易披露', en: 'Unusual Whales · Disclosures', desc: ['披露追踪使用演示数据或显式导入记录。', 'Disclosure tracking uses demo or explicitly imported records.'] },
  ] },
]
export function WorkflowCatalog({ nodes, locale, query = '', onOpenSection, onResearch }: Props) {
  const zh = !locale || locale.startsWith('zh'), text = (cn: string, en: string) => zh ? cn : en
  const [preview, setPreview] = useState<{ skill: WorkflowSkill; rect: DOMRect } | null>(null)
  const tooltip = useRef<HTMLDivElement>(null)
  const focusedSkill = useRef<WorkflowSkill | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const hidePreview = () => { clearTimeout(timer.current); setPreview(null) }
  const showPreview = (skill: WorkflowSkill, element: HTMLElement, delay = 180) => {
    clearTimeout(timer.current)
    const rect = element.getBoundingClientRect()
    timer.current = setTimeout(() => setPreview({ skill, rect }), delay)
  }
  const leavePreview = () => {
    const active = document.activeElement
    if (focusedSkill.current && active instanceof HTMLElement && active.dataset.skill === focusedSkill.current.name) { showPreview(focusedSkill.current, active, 0); return }
    clearTimeout(timer.current); timer.current = setTimeout(() => setPreview(null), 100)
  }
  useEffect(() => {
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape') { focusedSkill.current = null; hidePreview() } }
    const scroll = (event: Event) => {
      if (event.target instanceof Node && tooltip.current?.contains(event.target)) return
      const active = document.activeElement
      if (focusedSkill.current && active instanceof HTMLElement && active.dataset.skill === focusedSkill.current.name) showPreview(focusedSkill.current, active, 80)
      else hidePreview()
    }
    document.addEventListener('keydown', escape)
    window.addEventListener('scroll', scroll, true)
    window.addEventListener('resize', hidePreview)
    return () => { clearTimeout(timer.current); document.removeEventListener('keydown', escape); window.removeEventListener('scroll', scroll, true); window.removeEventListener('resize', hidePreview) }
  }, [])
  useLayoutEffect(() => {
    const card = tooltip.current
    if (!preview || !card) return
    card.setAttribute('popover', 'manual')
    card.showPopover()
    const bounds = card.getBoundingClientRect(), { rect } = preview
    card.style.left = `${Math.max(12, Math.min(rect.left, window.innerWidth - bounds.width - 12))}px`
    card.style.top = `${Math.max(12, Math.min(rect.bottom + 8 + bounds.height <= window.innerHeight - 12 ? rect.bottom + 8 : rect.top - bounds.height - 8, window.innerHeight - bounds.height - 12))}px`
  }, [preview])
  const skills = workflowSkills(nodes, zh).filter(skill => `${skill.name} ${skill.title} ${skill.description}`.toLowerCase().includes(query.trim().toLowerCase()))
  const startSkill = (skill: WorkflowSkill) => {
    const prompt = zh
      ? `你好，我想开始「${skill.title}」任务。这个工作流需要：${skill.inputs}；会产出：${skill.outputs}。开始前，请只问我一个最关键的缺失信息问题，然后等我回答，不要自动执行任务。`
      : `Hi, I'd like to start a ${skill.title} task. This workflow needs: ${skill.inputs}; it produces: ${skill.outputs}. Before we begin, please ask me one concise question for the most important missing information, then wait for my answer. Please do not start the task automatically.`
    onResearch(prompt, skill.name)
  }
  return <section className="rg-pf-panel"><div className="rg-finance-catalog">
    {[false, true].map(persona => {
      const filtered = skills.filter(skill => skill.persona === persona)
      if (!filtered.length) return null
      return <section className="rg-catalog-group" key={String(persona)} data-persona={persona || undefined}><header className="rg-catalog-group-head"><div className="rg-catalog-connector-copy"><div className="rg-catalog-connector-title"><h2>{persona ? text('研究视角', 'Research perspectives') : text('应用库', 'Skill library')}</h2><span className="rg-catalog-view-all">{filtered.length}</span></div><p>{persona ? text('用可复用的思考视角分析公司、人物或问题。', 'Examine companies, people, and questions through reusable points of view.') : text('把资料、问题与明确假设变成可追溯的研究工作。', 'Turn sources, questions, and explicit assumptions into traceable work.')}</p></div></header><div className="rg-catalog-grid">{filtered.map(skill => <button type="button" className="rg-catalog-task" key={skill.name} data-skill={skill.name} data-persona={skill.persona || undefined} aria-describedby={preview?.skill.name === skill.name ? 'rg-skill-preview' : undefined} onMouseEnter={event => showPreview(skill, event.currentTarget)} onMouseLeave={leavePreview} onFocus={event => { focusedSkill.current = skill; showPreview(skill, event.currentTarget, 0) }} onBlur={() => { focusedSkill.current = null; hidePreview() }} onClick={() => { hidePreview(); startSkill(skill) }}><span className="rg-catalog-artwork"><span className="rg-catalog-artwork-meta"><span aria-hidden="true"><svg viewBox="0 0 16 16"><path d="M4 12 12 4M6 4h6v6"/></svg></span></span><SkillArtwork name={skill.name} persona={skill.persona}/></span><span className="rg-catalog-task-copy"><strong>{skill.title}</strong><span>{skill.description}</span><code>/{skill.name}</code></span></button>)}</div></section>
    })}
    {skills.length === 0 && <div className="rg-catalog-empty"><h2>{query.trim() ? text('没有匹配的 Skill', 'No matching Skills') : text('还没有已索引的 Skill', 'No indexed Skills yet')}</h2><p>{query.trim() ? text('试试 Skill 名称或用途关键词。', 'Try a Skill name or purpose.') : text('请先在 DSH 中启用并索引研究 Skills。', 'Enable and index your research Skills in DSH first.')}</p></div>}
    {preview && <div ref={tooltip} id="rg-skill-preview" className="rg-skill-preview" role="tooltip" onMouseEnter={() => clearTimeout(timer.current)} onMouseLeave={leavePreview}><strong>{preview.skill.title}</strong><code>/{preview.skill.name}</code><p>{preview.skill.description}</p><dl><div><dt>{text('需要', 'Needs')}</dt><dd>{preview.skill.inputs}</dd></div><div><dt>{text('得到', 'Produces')}</dt><dd>{preview.skill.outputs}</dd></div></dl><footer>{text('点击直接打开 DSH 对话。', 'Click to open a DSH conversation.')}</footer></div>}
  </div></section>
}
export function FinanceAppsPanel({ nodes, locale, onOpenSection, onResearch }: Props) {
  const zh = !locale || locale.startsWith('zh'), text = (cn: string, en: string) => zh ? cn : en
  const apps = GROUPS.slice(0, 3).flatMap(group => group.tasks).filter(task => task.section !== 'inbox' && task.section !== 'activity').slice(0, 12)
  return <section className="rg-pf-panel rg-finance-apps"><div className="rg-discovery-heading"><h2>{text('用 DeepSeek 开始研究', 'Build with DeepSeek')}</h2><button type="button" className="rg-btn" onClick={() => onResearch('')}>{text('新建任务', 'New task')}</button></div><div className="rg-app-gallery">{apps.map((task, index) => <button type="button" className="rg-app-preview-card" key={task.en} onClick={() => task.section ? onOpenSection(task.section) : onResearch(task.prompt ?? text(task.cn, task.en))}><span className="rg-app-miniature" aria-hidden="true"><span className="rg-app-mini-title">{task.en}</span>{index % 3 === 0 ? <svg viewBox="0 0 240 82" fill="none"><path d="M5 70h230M5 5v65" stroke="currentColor" opacity=".2"/><path d="m8 63 22-12 20 4 22-20 20 6 20-18 20 7 23-14 20 6 25-12 24 4" stroke="currentColor" strokeWidth="2"/></svg> : index % 3 === 1 ? <span className="rg-app-mini-table">{Array.from({ length: 15 }, (_, i) => <i key={i}/>)}</span> : <span className="rg-app-mini-columns"><span/><span/><span/><span/><span/></span>}<span className="rg-app-mini-lines"><i/><i/><i/></span></span><strong>{text(task.cn, task.en)}</strong><small>{text('研究应用', 'Research app')}</small></button>)}</div><details className="rg-pf-section"><summary>{text(`已索引的 Skills（${nodes.filter(node => node.kind === 'skill').length}）`, `Indexed Skills (${nodes.filter(node => node.kind === 'skill').length})`)}</summary>{nodes.filter(node => node.kind === 'skill').map(node => <p key={node.id}>{node.title}</p>)}<button type="button" className="rg-btn" onClick={() => onOpenSection('guide')}>{text('查看使用指南', 'Open guide')}</button></details></section>
}
