import { useEffect, useMemo, useRef, useState } from 'react'
import type { CSSProperties, FormEvent } from 'react'
import type { GraphEdge, GraphNode } from '../../src/graph.ts'
import { MarkdownText } from '@deepseek-ai/dsh-client-ui-primitives'
import { displayAssessment, displayConfidence, hypothesisEvidence, HYPOTHESIS_KINDS, isResearchSource, killCriteria, relatedResearchNodes, versionChain, viewStance } from '../research.ts'
import type { HypothesisKind, ViewStance } from '../research.ts'
import type { ResearchStore } from '../research-store.ts'
import { protectReportCurrency } from '../report-markdown.ts'
import type { Translate } from '../store.ts'
import type { ConversationSeed } from './ConversationDialog.tsx'
import { Field, FinanceEmpty, RawJson } from './FinanceCommon.tsx'
import { ResearchGraphBoundary, ResearchRuns, useResearch } from './ResearchCommon.tsx'

interface HypothesesPanelProps {
  readonly research: ResearchStore
  readonly t: Translate
  readonly nodes: readonly GraphNode[]
  readonly edges: readonly GraphEdge[]
  readonly graphPhase: 'loading' | 'ready' | 'error'
  readonly graphError: { readonly code: string; readonly message: string } | null
  readonly onRefreshGraph: () => Promise<void>
  readonly onOpenGraph: (id: string) => void
  readonly onOpenReport: (id: string) => void
  readonly onOpenLibrary: () => void
  readonly onResearch?: ((question: string, skillName?: string, context?: Pick<ConversationSeed, 'sourceIds' | 'asOf' | 'sourceSummaryId'>) => void) | undefined
}

function optionalNumber(value: string): number | undefined {
  return value.trim().length === 0 ? undefined : Number(value)
}

function localEndOfDay(value: string): string | undefined {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/u.exec(value)
  if (match === null) return undefined
  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  const date = new Date(year, month - 1, day, 23, 59, 59)
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return undefined
  const offsetMinutes = -date.getTimezoneOffset()
  const sign = offsetMinutes >= 0 ? '+' : '-'
  const absolute = Math.abs(offsetMinutes)
  const hours = String(Math.floor(absolute / 60)).padStart(2, '0')
  const minutes = String(absolute % 60).padStart(2, '0')
  return `${value}T23:59:59${sign}${hours}:${minutes}`
}

function actualSourceIds(active: GraphNode, evidence: ReturnType<typeof hypothesisEvidence>, nodes: readonly GraphNode[], edges: readonly GraphEdge[]): string[] {
  const related = new Set<string>([active.id, ...evidence.map(item => item.node.id)])
  const sourceIds = new Set<string>()
  for (const edge of edges) {
    if (!['cite', 'references', 'supports', 'contradicts', 'based_on', 'derived_from', 'informed_by'].includes(edge.kind)) continue
    if (!related.has(edge.from) && !related.has(edge.to)) continue
    const other = related.has(edge.from) ? edge.to : edge.from
    const node = nodes.find(candidate => candidate.id === other)
    if (node !== undefined && isResearchSource(node)) sourceIds.add(node.id)
  }
  for (const item of evidence) if (isResearchSource(item.node)) sourceIds.add(item.node.id)
  return [...sourceIds].sort()
}

function CompactSegmented<Value extends string>({ label, value, options, onChange, disabled = false }: {
  readonly label: string
  readonly value: Value | undefined
  readonly options: readonly { readonly value: Value; readonly label: string }[]
  readonly onChange: (value: Value) => void
  readonly disabled?: boolean
}) {
  const selected = options.findIndex(option => option.value === value)
  const style = {
    '--rg-segment-count': String(options.length),
    '--rg-segment-index': String(Math.max(selected, 0)),
  } as CSSProperties
  return <div className="rg-compact-segmented" style={style} data-selected={selected >= 0 || undefined} role="radiogroup" aria-label={label}>
    <span className="rg-compact-segmented-indicator" aria-hidden />
    {options.map((option, index) => <button
      key={option.value}
      type="button"
      role="radio"
      aria-checked={selected === index}
      tabIndex={selected === index || selected < 0 && index === 0 ? 0 : -1}
      data-active={selected === index || undefined}
      disabled={disabled}
      onClick={() => { if (selected !== index) onChange(option.value) }}
      onKeyDown={event => {
        if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'].includes(event.key)) return
        const next = event.key === 'Home' ? 0
          : event.key === 'End' ? options.length - 1
            : event.key === 'ArrowLeft' || event.key === 'ArrowUp'
              ? (index + options.length - 1) % options.length
              : (index + 1) % options.length
        const target = options[next]
        if (target === undefined) return
        event.preventDefault()
        onChange(target.value)
        event.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>('[role="radio"]').item(next)?.focus()
      }}
    >{option.label}</button>)}
  </div>
}

function EvidenceAction({ research, t, nodes, hypotheses }: {
  readonly research: ResearchStore
  readonly t: Translate
  readonly nodes: readonly GraphNode[]
  readonly hypotheses: readonly GraphNode[]
}) {
  const state = useResearch(research)
  const action = state.hypothesisAction
  const [kind, setKind] = useState<HypothesisKind>('claim')
  const [stance, setStance] = useState<ViewStance>('bull')
  const [thesis, setThesis] = useState('')
  const [status, setStatus] = useState('open')
  const [confidence, setConfidence] = useState('')
  const [criteria, setCriteria] = useState('')
  const [hypothesisId, setHypothesisId] = useState('')
  const [direction, setDirection] = useState<'supports' | 'contradicts'>('supports')
  const [reliability, setReliability] = useState('')
  const [independence, setIndependence] = useState('')
  if (action === null) return null
  const evidence = nodes.find(node => node.id === action.evidenceId)
  const busy = state.mutation.status === 'loading'
  const submit = (event: FormEvent) => {
    event.preventDefault()
    if (action.mode === 'create') {
      void research.createHypothesis({
        kind,
        stance,
        thesis,
        status,
        ...(optionalNumber(confidence) === undefined ? {} : { confidence: optionalNumber(confidence) as number }),
        killCriteria: criteria.split(/\r?\n/u).map(line => line.trim()).filter(line => line.length > 0),
        evidenceId: action.evidenceId,
        direction,
        ...(optionalNumber(reliability) === undefined ? {} : { reliability: optionalNumber(reliability) as number }),
        ...(optionalNumber(independence) === undefined ? {} : { independence: optionalNumber(independence) as number }),
      })
    } else {
      void research.linkEvidence({
        hypothesisId,
        evidenceId: action.evidenceId,
        direction,
        ...(optionalNumber(reliability) === undefined ? {} : { reliability: optionalNumber(reliability) as number }),
        ...(optionalNumber(independence) === undefined ? {} : { independence: optionalNumber(independence) as number }),
      })
    }
  }
  return (
    <section className="rg-finance-block rg-hypothesis-action">
      <div className="rg-finance-block-heading"><h3>{t(`hypotheses.action.${action.mode}`)}</h3><button type="button" className="rg-btn" onClick={() => { research.cancelHypothesisAction() }}>{t('editor.cancel')}</button></div>
      <p className="rg-finance-block-description">{t('hypotheses.action.evidence')} <code>{action.evidenceId}</code>{evidence !== undefined && ` — ${evidence.title}`}</p>
      <form className="rg-finance-form" onSubmit={submit}>
        {action.mode === 'create' ? <>
          <div className="rg-finance-fields-inline">
            <Field label={t('hypotheses.kind')}><select value={kind} onChange={event => { setKind(event.target.value as HypothesisKind) }}>{HYPOTHESIS_KINDS.map(value => <option key={value} value={value}>{t(`kind.${value}`)}</option>)}</select></Field>
            <Field label={t('views.direction')}><select value={stance} onChange={event => setStance(event.target.value as ViewStance)}><option value="bull">{t('views.bull')}</option><option value="bear">{t('views.bear')}</option></select></Field>
            <Field label={t('hypotheses.status')}><input required value={status} onChange={event => { setStatus(event.target.value) }} /></Field>
            <Field label={t('hypotheses.confidence')} hint={t('hypotheses.metricHint')}><input type="number" min="0" max="1" step="0.01" value={confidence} onChange={event => { setConfidence(event.target.value) }} /></Field>
          </div>
          <Field label={t('hypotheses.thesis')}><textarea required rows={3} value={thesis} onChange={event => { setThesis(event.target.value) }} /></Field>
          <Field label={t('hypotheses.killCriteria')} hint={t('hypotheses.killCriteriaHint')}><textarea rows={3} value={criteria} onChange={event => { setCriteria(event.target.value) }} /></Field>
        </> : <Field label={t('hypotheses.linkTarget')}><select required value={hypothesisId} onChange={event => { setHypothesisId(event.target.value) }}><option value="" disabled>{t('hypotheses.selectTarget')}</option>{hypotheses.map(node => <option value={node.id} key={node.id}>{node.title} ({node.id})</option>)}</select></Field>}
        <div className="rg-finance-fields-inline">
          <Field label={t('hypotheses.evidenceDirection')}><select value={direction} onChange={event => { setDirection(event.target.value as 'supports' | 'contradicts') }}><option value="supports">{t('edge.supports')}</option><option value="contradicts">{t('edge.contradicts')}</option></select></Field>
          <Field label={t('hypotheses.reliability')} hint={t('hypotheses.metricHint')}><input type="number" min="0" max="1" step="0.01" value={reliability} onChange={event => { setReliability(event.target.value) }} /></Field>
          <Field label={t('hypotheses.independence')} hint={t('hypotheses.metricHint')}><input type="number" min="0" max="1" step="0.01" value={independence} onChange={event => { setIndependence(event.target.value) }} /></Field>
        </div>
        {state.mutation.error !== null && <p className="rg-finance-form-error" role="alert">{state.mutation.error.code}: {state.mutation.error.message}</p>}
        <div className="rg-finance-form-actions"><button type="submit" className="rg-btn" data-primary disabled={busy || action.mode === 'link' && hypothesisId.length === 0}>{t(`hypotheses.action.submit.${action.mode}`)}</button></div>
      </form>
    </section>
  )
}

function EvidenceList({ active, evidence, t, onOpenGraph }: {
  readonly active: GraphNode
  readonly evidence: ReturnType<typeof hypothesisEvidence>
  readonly t: Translate
  readonly onOpenGraph: (id: string) => void
}) {
  if (evidence.length === 0) return <FinanceEmpty>{t('hypotheses.noEvidence')}</FinanceEmpty>
  return <div className="rg-hypothesis-evidence">{evidence.map(({ edge, node, direction }) => {
    const matches = Array.isArray(active.metadata.evidence) && direction !== 'related'
      ? active.metadata.evidence.flatMap(entry => entry !== null && typeof entry === 'object' && !Array.isArray(entry)
        && entry.relation === direction && (node.kind === 'raw' && entry.rawId === node.id || node.kind === 'source' && entry.sourceId === node.id) ? [entry] : [])
      : []
    const assessment = matches.length === 1 ? matches[0] : undefined
    return <article key={edge.id}>
    <button type="button" onClick={() => { onOpenGraph(node.id) }}><strong>{node.title}</strong><code>{node.id}</code></button>
    <dl><div><dt>{t('hypotheses.relation')}</dt><dd>{t(`edge.${edge.kind}`)}</dd></div><div><dt>{t('hypotheses.reliability')}</dt><dd>{displayAssessment(edge.metadata.reliability ?? node.metadata.reliability ?? assessment?.reliability)}</dd></div><div><dt>{t('hypotheses.independence')}</dt><dd>{displayAssessment(edge.metadata.independence ?? node.metadata.independence ?? assessment?.independence)}</dd></div></dl>
    {direction !== 'related' && <span className="rg-finance-badge" data-direction={direction}>{t(`edge.${direction}`)}</span>}
  </article>})}</div>
}

function HypothesisReview({ research, t, active, sourceIds, onResearch, onOpenReport }: {
  readonly research: ResearchStore
  readonly t: Translate
  readonly active: GraphNode
  readonly sourceIds: readonly string[]
  readonly onResearch: HypothesesPanelProps['onResearch']
  readonly onOpenReport: (id: string) => void
}) {
  const [cutoffMode, setCutoffMode] = useState<'today' | 'custom'>('today')
  const [customAsOf, setCustomAsOf] = useState('')
  const [manualAsOf, setManualAsOf] = useState('')
  const [prepared, setPrepared] = useState<string | null>(null)
  const asOf = cutoffMode === 'today' ? new Date().toISOString() : localEndOfDay(customAsOf)
  const manualCutoff = manualAsOf.trim()
  const zh = t('hypotheses.title') !== 'Bull & bear views'
  const text = (cn: string, en: string) => zh ? cn : en
  const startManual = (mode: 'thinking' | 'drift') => {
    if (manualCutoff.length === 0) return
    research.startReview({ kind: 'review', mode, hypothesisId: active.id, asOf: manualCutoff })
  }
  const openAI = (mode: 'review' | 'counter' | 'drift') => {
    const asOf = cutoffMode === 'today' ? new Date().toISOString() : localEndOfDay(customAsOf)
    if (onResearch === undefined || asOf === undefined) return
    const node = `hypothesisId=${JSON.stringify(active.id)}`
    const question = mode === 'drift'
      ? text(
        `${node}。使用 thesis-drift 追踪这个观点从原始判断到 ${asOf} 的真实变化。先读取该观点节点、同一 revision 的图谱快照和所有实际关联证据；只有新增或新关联、且通过时间门的证据才能支持漂移结论。没有可确认的新证据时保持 confidenceAfter 与 confidenceBefore 相同。不要根据标题或措辞自动判断多空，不覆盖原观点的正文、多空分类或置信度，不编造来源、关系、日期或已完成的审查结果。`,
        `${node}. Use thesis-drift to track real changes in this view through ${asOf}. First read the view node, the graph snapshot at the same revision, and every actually linked evidence node. Only new or newly linked evidence that passes the as-of cutoff may support drift. When no new evidence is confirmed, keep confidenceAfter identical to confidenceBefore. Do not infer bull or bear direction from titles or wording, overwrite the original view, stance or confidence, or fabricate sources, relations, dates or a completed review.`,
      )
      : mode === 'counter'
        ? text(
          `${node}。使用 hypothesis-thinking 寻找并审查对这个观点的反证。先读取真实观点节点、当前图谱快照和实际关联证据，再检索可能反驳它的原始资料；区分已存在反证、新发现反证与证据缺口。不要把语义联想写成图谱关系，不要根据标题自动分类多空，不要擅自修改置信度或覆盖原观点；没有证据时明确写未知。`,
          `${node}. Use hypothesis-thinking to seek and assess disconfirming evidence for this view. First read the real view node, current graph snapshot and actually linked evidence, then look for original sources that may contradict it. Separate existing counterevidence, newly found counterevidence and evidence gaps. Do not turn semantic associations into graph relations, infer bull or bear direction from titles, change confidence or overwrite the view; state what is unknown when evidence is absent.`,
        )
        : text(
          `${node}。使用 hypothesis-thinking 审查这个观点。先读取真实观点节点、同一 revision 的图谱快照和所有实际关联证据，并核对其来源、时间、可靠性与独立性。判断支持项、反证项、kill criteria 和证据缺口；不要根据标题或措辞自动判断多空，不要擅自修改原观点的正文、多空分类或置信度。创建独立审查结果，不把建议写成已完成的更新；没有可确认的新证据时 confidenceAfter 必须与 confidenceBefore 相同。`,
          `${node}. Use hypothesis-thinking to review this view. First read the real view node, the graph snapshot at the same revision and every actually linked evidence node, including source, date, reliability and independence. Assess supports, contradictions, kill criteria and evidence gaps. Do not infer bull or bear direction from titles or wording, and do not change the original view, stance or confidence. Create an independent review, never present a recommendation as a completed update; when no new evidence is confirmed, confidenceAfter must equal confidenceBefore.`,
        )
    onResearch(question, mode === 'drift' ? 'thesis-drift' : 'hypothesis-thinking', {
      asOf,
      ...(sourceIds.length === 0 ? {} : { sourceIds }),
    })
    setPrepared(mode)
  }
  return <section className="rg-finance-block rg-hypothesis-review" aria-labelledby={`rg-review-${active.id}`}>
    <div className="rg-hypothesis-ai-head">
      <div><h4 id={`rg-review-${active.id}`}>{t('hypotheses.review.title')}</h4><p className="rg-finance-block-description">{t('hypotheses.review.description')}</p></div>
      <div className="rg-hypothesis-cutoff">
        <span>{t('hypotheses.review.asOf')}</span>
        <CompactSegmented label={t('hypotheses.review.asOf')} value={cutoffMode} onChange={setCutoffMode} options={[
          { value: 'today', label: t('hypotheses.review.today') },
          { value: 'custom', label: t('hypotheses.review.custom') },
        ]} />
        {cutoffMode === 'custom' && <input type="date" value={customAsOf} onChange={event => { setCustomAsOf(event.target.value) }} aria-label={t('hypotheses.review.customDate')} />}
      </div>
    </div>
    <div className="rg-hypothesis-ai-actions">
      <button type="button" data-primary onClick={() => { openAI('review') }} disabled={onResearch === undefined || asOf === undefined}><span><strong>{t('hypotheses.review.thinking')}</strong><small>{t('hypotheses.review.thinkingHint')}</small></span></button>
      <button type="button" onClick={() => { openAI('counter') }} disabled={onResearch === undefined || asOf === undefined}><span><strong>{t('hypotheses.review.counter')}</strong><small>{t('hypotheses.review.counterHint')}</small></span></button>
      <button type="button" onClick={() => { openAI('drift') }} disabled={onResearch === undefined || asOf === undefined}><span><strong>{t('hypotheses.review.drift')}</strong><small>{t('hypotheses.review.driftHint')}</small></span></button>
    </div>
    <p className="rg-hypothesis-ai-note" role="status">{prepared === null ? t('hypotheses.review.nativeHint') : t('hypotheses.review.prepared')}</p>
    <details className="rg-hypothesis-manual-review">
      <summary>{t('hypotheses.review.advanced')}</summary>
      <p>{t('hypotheses.review.advancedHint')}</p>
      <Field label={t('hypotheses.review.manualAsOf')} hint={t('hypotheses.review.asOfHint')}><input required value={manualAsOf} onChange={event => { setManualAsOf(event.target.value) }} placeholder="2026-10-31T00:00:00Z" /></Field>
      <div className="rg-finance-form-actions">
        <button type="button" className="rg-btn" data-primary disabled={manualCutoff.length === 0} onClick={() => { startManual('thinking') }}>{t('hypotheses.review.thinking')}</button>
        <button type="button" className="rg-btn" disabled={manualCutoff.length === 0} onClick={() => { startManual('drift') }}>{t('hypotheses.review.drift')}</button>
      </div>
    </details>
    <ResearchRuns store={research} t={t} kind="review" hypothesisId={active.id} onOpenArtifact={onOpenReport} />
  </section>
}

export function HypothesesPanel({ research, t, nodes, edges, graphPhase, graphError, onRefreshGraph, onOpenGraph, onOpenReport, onOpenLibrary, onResearch }: HypothesesPanelProps) {
  const state = useResearch(research)
  const detailTitle = useRef<HTMLHeadingElement>(null)
  const listFallback = useRef<HTMLDivElement>(null)
  const returnFocus = useRef<HTMLButtonElement | null>(null)
  const restoreFocus = useRef(false)
  const [drill, setDrill] = useState(false)
  const [unassignedOpen, setUnassignedOpen] = useState<boolean | null>(null)
  const [focusRequest, setFocusRequest] = useState(0)
  const hypotheses = nodes.filter(node => (HYPOTHESIS_KINDS as readonly string[]).includes(node.kind)).sort((left, right) => right.updatedAt - left.updatedAt || left.id.localeCompare(right.id))
  const active = hypotheses.find(node => node.id === state.selectedHypothesisId) ?? hypotheses[0]
  const evidence = active === undefined ? [] : hypothesisEvidence(active, nodes, edges)
  const related = active === undefined ? { predictions: [], reports: [] } : relatedResearchNodes(active, nodes, edges)
  const versions = active === undefined ? [] : versionChain(active, nodes, edges)
  const criteria = active === undefined ? [] : killCriteria(active)
  const sourceIds = active === undefined ? [] : actualSourceIds(active, evidence, nodes, edges)
  const markdownLabels = useMemo(() => ({
    code: {
      copyLabel: t('reports.markdown.copy'),
      copiedLabel: t('reports.markdown.copied'),
      toolbarLabels: {
        codeLabel: t('reports.markdown.code'),
        wrapLabel: t('reports.markdown.wrap'),
        unwrapLabel: t('reports.markdown.unwrap'),
      },
    },
    footnotes: t('reports.markdown.footnotes'),
  }), [t])
  useEffect(() => {
    if (active !== undefined && state.history.nodeId !== active.id) void research.loadHypothesisHistory(active.id)
  }, [active, research, state.history.nodeId])
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
  }, [drill, active?.id, focusRequest])
  const openDetail = (id: string, trigger: HTMLButtonElement) => {
    returnFocus.current = trigger
    research.selectHypothesis(id)
    setDrill(true)
    setFocusRequest(value => value + 1)
  }

  return <ResearchGraphBoundary phase={graphPhase} error={graphError} t={t} onRefresh={onRefreshGraph}><section className="rg-finance-section rg-hypotheses-section" aria-labelledby="rg-hypotheses-title">
    <div className="rg-finance-section-head"><div><h2 id="rg-hypotheses-title">{t('hypotheses.title')}</h2><p>{t('hypotheses.description')}</p></div><button type="button" className="rg-btn" onClick={onOpenLibrary}>{t('hypotheses.fromLibrary')}</button></div>
    {state.operations.some(operation => operation.request.kind === 'compile') && <details className="rg-view-run-history"><summary>{t('research.runs.compile')}</summary><ResearchRuns store={research} t={t} kind="compile" onOpenArtifact={id => { research.selectHypothesis(id); setDrill(true) }} /></details>}
    <EvidenceAction key={`${state.hypothesisAction?.mode ?? 'none'}:${state.hypothesisAction?.evidenceId ?? ''}`} research={research} t={t} nodes={nodes} hypotheses={hypotheses} />
    <div className="rg-hypotheses" data-drill={drill && active !== undefined ? 'detail' : 'list'}>
      <div className="rg-view-board">
        <div ref={listFallback} tabIndex={-1} className="rg-library-list-head"><span>{t('hypotheses.list')}</span><span>{hypotheses.length}</span></div>
        <div className="rg-view-columns">
          {(['bull', 'bear'] as const).map(stance => <section key={stance} className="rg-view-column" aria-label={t(`views.${stance}`)}>
            <header><svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden><path d={stance === 'bull' ? 'M3 14l5-5 4 3 5-7M12 5h5v5' : 'M3 6l5 5 4-3 5 7M12 15h5v-5'} /></svg><h3>{t(`views.${stance}`)}</h3><span>{hypotheses.filter(node => viewStance(node) === stance).length}</span></header>
            <div className="rg-hypothesis-list">{hypotheses.filter(node => viewStance(node) === stance).length === 0 ? <FinanceEmpty>{t(`views.empty.${stance}`)}</FinanceEmpty> : hypotheses.filter(node => viewStance(node) === stance).map(node => <button type="button" key={node.id} data-node-id={node.id} data-selected={active?.id === node.id || undefined} onClick={event => { openDetail(node.id, event.currentTarget) }}><strong>{node.title}</strong><span>{t('hypotheses.confidence')} · {displayConfidence(node.metadata.confidence)}</span></button>)}</div>
          </section>)}
        </div>
        {hypotheses.some(node => !viewStance(node)) && <details className="rg-view-unassigned" open={unassignedOpen ?? hypotheses.every(node => !viewStance(node))} onToggle={event => { setUnassignedOpen(event.currentTarget.open) }}><summary><span>{t('views.unassigned')}</span><span>{hypotheses.filter(node => !viewStance(node)).length}</span></summary><div className="rg-view-unassigned-body"><p>{t('views.unassignedHint')}</p><div className="rg-hypothesis-list">{hypotheses.filter(node => !viewStance(node)).map(node => <button type="button" key={node.id} data-node-id={node.id} data-selected={active?.id === node.id || undefined} onClick={event => { openDetail(node.id, event.currentTarget) }}><strong>{node.title}</strong><span>{t(`kind.${node.kind}`)}</span></button>)}</div></div></details>}
      </div>
      <article className="rg-hypothesis-detail" aria-label={t('hypotheses.detail')}>
        {active === undefined ? <div className="rg-state"><p>{t('hypotheses.selectPrompt')}</p><button type="button" className="rg-btn" onClick={onOpenLibrary}>{t('hypotheses.fromLibrary')}</button></div> : <>
          <header className="rg-hypothesis-detail-head"><button type="button" className="rg-btn rg-hypothesis-back" onClick={() => { restoreFocus.current = true; setDrill(false) }}>{t('finance.library.back')}</button><div><span className="rg-finance-badge">{t(`kind.${active.kind}`)}</span><h3 ref={detailTitle} tabIndex={-1}>{active.title}</h3></div><button type="button" className="rg-btn" onClick={() => { onOpenGraph(active.id) }}>{t('finance.library.openGraph')}</button></header>
          <div className="rg-view-classify"><span>{t('views.direction')}</span><CompactSegmented label={t('views.direction')} value={viewStance(active)} options={[
            { value: 'bull', label: t('views.bull') },
            { value: 'bear', label: t('views.bear') },
          ]} disabled={state.mutation.status === 'loading'} onChange={stance => { void research.setViewStance(active.id, stance) }} />{!viewStance(active) && <small>{t('views.unassigned')}</small>}</div>
          {state.mutation.error && <p role="alert" className="rg-finance-form-error">{state.mutation.error.message}</p>}
          {!evidence.some(item => item.direction === 'contradicts') && <p className="rg-research-warning" role="status">{t('hypotheses.noContradictions')}</p>}
          <dl className="rg-hypothesis-thesis"><div><dt>{t('hypotheses.thesis')}</dt><dd><div className="rg-hypothesis-markdown rg-hypothesis-thesis-copy"><MarkdownText text={protectReportCurrency(typeof active.metadata.thesis === 'string' ? active.metadata.thesis : active.content || '—')} labels={markdownLabels} omitHtml /></div></dd></div><div><dt>{t('hypotheses.confidence')}</dt><dd>{displayConfidence(active.metadata.confidence)}</dd></div><div><dt>{t('hypotheses.status')}</dt><dd>{typeof active.metadata.status === 'string' ? active.metadata.status : '—'}</dd></div><div><dt>{t('hypotheses.killCriteria')}</dt><dd>{criteria.length === 0 ? '—' : <ul className="rg-hypothesis-criteria">{criteria.map((criterion, index) => <li key={`${index}:${criterion}`}><div className="rg-hypothesis-markdown"><MarkdownText text={protectReportCurrency(criterion)} labels={markdownLabels} omitHtml variant="compact" /></div></li>)}</ul>}</dd></div></dl>
          <HypothesisReview key={active.id} research={research} t={t} active={active} sourceIds={sourceIds} onResearch={onResearch} onOpenReport={onOpenReport} />
          <section className="rg-finance-block"><h4>{t('hypotheses.supports')}</h4><EvidenceList active={active} evidence={evidence.filter(item => item.direction === 'supports')} t={t} onOpenGraph={onOpenGraph} /></section>
          <section className="rg-finance-block"><h4>{t('hypotheses.contradicts')}</h4><EvidenceList active={active} evidence={evidence.filter(item => item.direction === 'contradicts')} t={t} onOpenGraph={onOpenGraph} /></section>
          {evidence.some(item => item.direction === 'related') && <section className="rg-finance-block"><h4>{t('hypotheses.relatedEvidence')}</h4><EvidenceList active={active} evidence={evidence.filter(item => item.direction === 'related')} t={t} onOpenGraph={onOpenGraph} /></section>}
          <section className="rg-finance-block"><h4>{t('hypotheses.related')}</h4>{related.predictions.length === 0 && related.reports.length === 0 ? <FinanceEmpty>{t('hypotheses.noRelated')}</FinanceEmpty> : <div className="rg-hypothesis-related">{related.predictions.map(node => <button type="button" className="rg-chip" key={node.id} onClick={() => { onOpenGraph(node.id) }}>{t('kind.prediction')}: {node.title}</button>)}{related.reports.map(node => <button type="button" className="rg-chip" key={node.id} onClick={() => { onOpenReport(node.id) }}>{t('kind.deliverable')}: {node.title}</button>)}</div>}</section>
          <section className="rg-finance-block"><h4>{t('hypotheses.versions')}</h4><p className="rg-finance-block-description">{t('hypotheses.versionsHint')}</p><ol className="rg-version-chain">{versions.map(node => <li key={node.id} data-current={node.id === active.id || undefined}><button type="button" onClick={() => { research.selectHypothesis(node.id) }}><span>{node.title}</span><code>{node.id}</code><time dateTime={new Date(node.updatedAt).toISOString()}>{new Date(node.updatedAt).toISOString()}</time>{node.metadata.version !== undefined && <span>{t('reports.version')} {String(node.metadata.version)}</span>}</button></li>)}</ol></section>
          <section className="rg-finance-block"><div className="rg-finance-block-heading"><h4>{t('hypotheses.history')}</h4><button type="button" className="rg-btn" disabled={state.history.status === 'loading'} onClick={() => { void research.loadHypothesisHistory(active.id) }}>{t('header.refresh')}</button></div><p className="rg-finance-block-description">{t('hypotheses.historyHint')}</p>{state.history.status === 'loading' && <div className="rg-skeleton" role="status" />}{state.history.error !== null && <p className="rg-finance-form-error" role="alert">{state.history.error.code}: {state.history.error.message}</p>}{state.history.nodeId === active.id && state.history.status === 'ready' && <>{state.history.earliestRetainedRevision > 0 && <p className="rg-research-warning">{t('hypotheses.historyTruncated', { earliest: state.history.earliestRetainedRevision })}</p>}{state.history.entries.length === 0 ? <FinanceEmpty>{t('hypotheses.noHistory')}</FinanceEmpty> : <ol className="rg-hypothesis-history">{state.history.entries.map(entry => <li key={entry.revision}><code>rev {entry.revision} · {entry.op}</code><span>{entry.summary}</span><time dateTime={new Date(entry.at).toISOString()}>{new Date(entry.at).toISOString()}</time></li>)}</ol>}</>}</section>
          <RawJson value={active.metadata} t={t} label={t('finance.library.metadata')} />
        </>}
      </article>
    </div>
  </section></ResearchGraphBoundary>
}
