import { useEffect, useId, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import type { GraphEdge, GraphNode } from '../../src/graph.ts'
import { MarkdownText } from '@deepseek-ai/dsh-client-ui-primitives'
import {
  filterLibraryEntries,
  isLibraryTechnicalNode,
  LIBRARY_GROUPS,
  libraryEntryForSelection,
  libraryGroupEntries,
  libraryGroupMatchCounts,
  libraryAnnotations,
  libraryErrors,
  libraryProvider,
  libraryRelations,
  libraryStatus,
  libraryTags,
  libraryTime,
  libraryTopic,
  relatedLibraryNodes,
  libraryOriginalUrl,
  libraryAiSummary,
  libraryTitle,
} from '../library.ts'
import type { LibraryAnnotation, LibraryGroup, LibraryRelation } from '../library.ts'
import type { FinancePanelProps } from './FinanceCommon.tsx'
import { FinanceEmpty, Provenance, RawJson } from './FinanceCommon.tsx'
import { displayInboxEntry } from '../inbox.ts'
import type { ResearchStore } from '../research-store.ts'
import { ResearchRuns } from './ResearchCommon.tsx'
import { protectReportCurrency } from '../report-markdown.ts'
import type { ConversationSeed } from './ConversationDialog.tsx'

interface LibraryPanelProps extends FinancePanelProps {
  readonly initialSelectedId?: string | undefined
  readonly graphPhase: 'loading' | 'ready' | 'error'
  readonly graphError: { readonly code: string; readonly message: string } | null
  readonly onRefreshGraph: () => Promise<void>
  readonly onOpenGraph: (id: string) => void
  readonly research?: ResearchStore | undefined
  readonly onOpenHypotheses: () => void
  readonly edges?: readonly GraphEdge[] | undefined
  readonly locale?: string | undefined
  readonly onAddMaterials?: (() => void) | undefined
  readonly onResearch?: ((question: string, skillName?: string, context?: Pick<ConversationSeed, 'sourceIds' | 'asOf' | 'sourceSummaryId'>) => void) | undefined
}

interface Highlight {
  readonly start: number
  readonly end: number
  readonly annotation: LibraryAnnotation
}

function highlights(content: string, annotations: readonly LibraryAnnotation[]): Highlight[] {
  const matches: Highlight[] = []
  annotations.forEach((annotation, annotationIndex) => {
    if (annotation.exact === undefined || annotation.exact.length === 0) return
    let from = 0
    while (from <= content.length - annotation.exact.length) {
      const start = content.indexOf(annotation.exact, from)
      if (start < 0) break
      const end = start + annotation.exact.length
      const prefixMatches = annotation.prefix === undefined || content.slice(Math.max(0, start - annotation.prefix.length), start) === annotation.prefix
      const suffixMatches = annotation.suffix === undefined || content.slice(end, end + annotation.suffix.length) === annotation.suffix
      if (prefixMatches && suffixMatches) matches.push({ start, end, annotation: { ...annotation, annotationHash: annotation.annotationHash ?? String(annotationIndex) } })
      from = start + annotation.exact.length
    }
  })
  return matches.sort((left, right) => left.start - right.start || right.end - left.end).filter((match, index, all) => {
    const previous = all[index - 1]
    return previous === undefined || match.start >= previous.end
  })
}

function HighlightedContent({ content, annotations }: { readonly content: string; readonly annotations: readonly LibraryAnnotation[] }) {
  const marks = highlights(content, annotations)
  if (marks.length === 0) return <>{content}</>
  const output: ReactNode[] = []
  let cursor = 0
  marks.forEach((mark, index) => {
    if (mark.start > cursor) output.push(content.slice(cursor, mark.start))
    output.push(<mark key={`${mark.start}-${mark.end}-${index}`}>{content.slice(mark.start, mark.end)}</mark>)
    cursor = mark.end
  })
  if (cursor < content.length) output.push(content.slice(cursor))
  return <>{output}</>
}

function LibraryNodeIcon({ kind }: { readonly kind: GraphNode['kind'] }) {
  return (
    <svg className="rg-library-node-icon" width="15" height="15" viewBox="0 0 16 16" aria-hidden>
      <g fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 1.75h4.8L11.5 4.5v9.75H4z" />
        <path d="M8.8 1.75V4.5h2.7" />
        {kind === 'raw' && <path d="M5.8 6.5h3.8M5.8 8.7h3.8M5.8 10.9h2.7" />}
        {kind === 'session' && <path d="M6 6.35h3.4M6 8.4h2.5M6 10.45h3.8" />}
      </g>
    </svg>
  )
}

function AnnotationDetails({ annotations, t }: { readonly annotations: readonly LibraryAnnotation[]; readonly t: FinancePanelProps['t'] }) {
  if (annotations.length === 0) return <FinanceEmpty>{t('finance.library.noAnnotations')}</FinanceEmpty>
  return <ol className="rg-library-annotations">{annotations.map((annotation, index) => <li key={annotation.annotationHash ?? `${annotation.exact ?? 'annotation'}-${index}`}>
    {annotation.exact !== undefined && <blockquote>{annotation.exact}</blockquote>}
    {(annotation.prefix !== undefined || annotation.suffix !== undefined) && <p className="rg-library-quote-context">
      {annotation.prefix !== undefined && <span><b>{t('finance.library.prefix')}</b> {annotation.prefix}</span>}
      {annotation.suffix !== undefined && <span><b>{t('finance.library.suffix')}</b> {annotation.suffix}</span>}
    </p>}
    {annotation.note !== undefined && <p><b>{t('finance.library.note')}</b> {annotation.note}</p>}
    {annotation.tags.length > 0 && <div className="rg-library-tags">{annotation.tags.map(tag => <span className="rg-finance-badge" key={tag}>{tag}</span>)}</div>}
    {annotation.locator !== undefined && <div className="rg-library-locator"><b>{t('finance.library.locator')}</b><code>{JSON.stringify(annotation.locator)}</code></div>}
    {annotation.annotationHash !== undefined && <code className="rg-library-hash">{annotation.annotationHash}</code>}
  </li>)}</ol>
}

export function LibraryPanel({ store, t, nodes, initialSelectedId, graphPhase, graphError, onRefreshGraph, onOpenGraph, research, onOpenHypotheses, edges = [], locale, onAddMaterials, onResearch }: LibraryPanelProps) {
  const zh = locale ? locale.startsWith('zh') : t('finance.library.title') === '资料库'
  const text = (cn: string, en: string) => zh ? cn : en
  const metadataOf = (node: GraphNode): Record<string, unknown> => node.metadata !== null && typeof node.metadata === 'object' && !Array.isArray(node.metadata) ? node.metadata : {}
  const date = (value: string) => Number.isFinite(Date.parse(value)) ? new Date(value).toLocaleDateString(zh ? 'zh-CN' : 'en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : value
  const statusLabel = (node: GraphNode) => { const key = `finance.library.status.${libraryStatus(node)}`; const value = t(key); return value === key ? libraryStatus(node) : value }
  const tabId = useId()
  const detailTitle = useRef<HTMLHeadingElement>(null)
  const listFallback = useRef<HTMLDivElement>(null)
  const returnFocus = useRef<HTMLButtonElement | null>(null)
  const restoreFocus = useRef(false)
  const requested = initialSelectedId === undefined ? undefined : nodes.find(node => node.id === initialSelectedId)
  const requestedRoute = requested === undefined ? undefined : libraryEntryForSelection(nodes, requested.id)
  const requestedTechnical = requested === undefined ? false : isLibraryTechnicalNode(requested)
  const [group, setGroup] = useState<LibraryGroup>(requestedRoute?.group ?? 'materials')
  const [includeTechnical, setIncludeTechnical] = useState(requestedTechnical)
  const [query, setQuery] = useState('')
  const [provider, setProvider] = useState('')
  const [status, setStatus] = useState('')
  const [selectedTopic, setSelectedTopic] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(requested?.id ?? null)
  const [drill, setDrill] = useState(requested !== undefined)
  const [compileAsOf, setCompileAsOf] = useState('')
  const groupEntries = Object.fromEntries(LIBRARY_GROUPS.map(value => [value, libraryGroupEntries(nodes, value, includeTechnical)])) as Record<LibraryGroup, ReturnType<typeof libraryGroupEntries>>
  const currentEntries = groupEntries[group]
  const technicalEntries = LIBRARY_GROUPS.flatMap(value => libraryGroupEntries(nodes, value, true).filter(entry => entry.technical))
  const technicalNodeCount = nodes.filter(isLibraryTechnicalNode).length
  const currentMembers = currentEntries.flatMap(entry => entry.members)
  const providers = [...new Set(currentMembers.map(libraryProvider))].sort()
  const statuses = [...new Set(currentMembers.map(libraryStatus))].sort()
  const baseMatches = filterLibraryEntries(currentEntries, { query, provider, status, includeTechnical })
  const filtered = selectedTopic === '' ? baseMatches : baseMatches.filter(entry => entry.members.some(node => libraryTopic(node) === selectedTopic))
  const topics = [...new Set(filterLibraryEntries(currentEntries, { query: '', provider, status, includeTechnical }).flatMap(entry => {
    return entry.members.flatMap(node => {
      const value = libraryTopic(node)
      return value === undefined ? [] : [value]
    })
  }))].sort()
  const hiddenTechnicalMatches = filterLibraryEntries(technicalEntries, { query, provider: '', status: '', includeTechnical: true }).length
  const groupMatchCounts = libraryGroupMatchCounts(nodes, query, includeTechnical)
  const selected = selectedId === null ? undefined : nodes.find(node => node.id === selectedId)
  const active = selected ?? filtered.find(entry => libraryProvider(entry.primary) !== 'yahoo')?.primary ?? filtered[0]?.primary
  const related = active === undefined ? {} : relatedLibraryNodes(active, nodes)
  const activeRoute = active === undefined ? undefined : libraryEntryForSelection(nodes, active.id)
  const materialMembers = activeRoute?.group === 'materials' ? activeRoute.members : []
  const materialRaw = materialMembers.find(node => node.kind === 'raw' && node.id === related.raw?.id)
    ?? materialMembers.find(node => node.kind === 'raw')
  const original = active?.kind === 'source' ? materialRaw ?? active : active
  const originalContent = typeof original?.content === 'string' ? original.content : ''
  const evidence = active === undefined ? [] : [...new Map([active, ...materialMembers].map(node => [node.id, node])).values()]
  const plainOriginal = evidence.some(node => ['text/plain', 'application/pdf', 'text/csv', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'].includes(String(metadataOf(node).mimeType)))
  const annotations = libraryAnnotations(evidence)
  const referenceIds = active === undefined ? undefined : metadataOf(active).references
  const explicitReferences = Array.isArray(referenceIds) ? referenceIds.flatMap(id => typeof id === 'string' ? nodes.filter(node => node.id === id) : []) : []
  const lineage = active === undefined ? [] : [...new Map([...(activeRoute?.group === 'materials' ? materialMembers : [related.source, related.raw, related.capture]), related.session, ...explicitReferences]
    .filter((node): node is GraphNode => node !== undefined && node.id !== active.id)
    .map(node => [node.id, node])).values()]
  const relations = libraryRelations(active, nodes, edges)
  const visibleLineage = lineage.filter(node => !relations.some(relation => relation.peer?.id === node.id))
  const topic = related.capture === undefined
    ? related.source === undefined ? active === undefined ? undefined : libraryTopic(active) : libraryTopic(related.source)
    : libraryTopic(related.capture)
  const tags = [...new Set(evidence.flatMap(node => libraryTags(node)))]
  const errors = active === undefined ? [] : [...libraryErrors(active), ...(related.session === undefined ? [] : libraryErrors(related.session))]
  const originalUrl = libraryOriginalUrl(evidence)
  const materialOriginalUrl = activeRoute?.group === 'materials' ? originalUrl : undefined
  const summary = libraryAiSummary(evidence)
  const fileName = evidence.flatMap(node => { const value = metadataOf(node).provenance; return value && typeof value === 'object' && !Array.isArray(value) && typeof (value as Record<string, unknown>).fileName === 'string' ? [String((value as Record<string, unknown>).fileName)] : [] })[0]
  const summarySource = related.source ?? (active?.kind === 'source' ? active : undefined)
  const summarize = () => {
    const managedBy = active === undefined ? undefined : metadataOf(active).managedBy
    if (!active || !onResearch || managedBy === 'dsh-research-graph/import' || metadataOf(active).binary === true || !summarySource) return
    onResearch(text('概括这份材料中的关键事实、作者观点和证据缺口，并注明原文位置。', 'Summarize the key facts, author views and evidence gaps in this material, with original locations.'), 'research', { sourceIds: [summarySource.id], sourceSummaryId: summarySource.id })
  }
  const markdownLabels = { code: { copyLabel: t('reports.markdown.copy'), copiedLabel: t('reports.markdown.copied'), toolbarLabels: { codeLabel: t('reports.markdown.code'), wrapLabel: t('reports.markdown.wrap'), unwrapLabel: t('reports.markdown.unwrap') } }, footnotes: t('reports.markdown.footnotes') }
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

  if (graphPhase === 'loading') return <div className="rg-state" role="status"><div className="rg-skeleton" /><div className="rg-skeleton" style={{ width: 'min(420px, 72%)' }} /><span>{t('finance.library.loading')}</span></div>
  if (graphPhase === 'error') return <div className="rg-state" role="alert"><p className="rg-state-title">{t('finance.library.errorTitle')}</p><p className="rg-state-detail">{graphError?.code}: {graphError?.message}</p><button type="button" className="rg-btn" data-primary onClick={() => { void onRefreshGraph() }}>{t('state.error.retry')}</button></div>

  const openRelated = (node: GraphNode) => {
    const route = libraryEntryForSelection(nodes, node.id)
    if (route === undefined) return
    setGroup(route.group)
    setQuery('')
    setProvider('')
    setStatus('')
    setSelectedTopic('')
    if (route.technical) setIncludeTechnical(true)
    setSelectedId(route.selected.id)
    setDrill(true)
  }
  const groupLabel = (value: LibraryGroup) => value === 'materials' ? text('材料', 'Materials') : value === 'insights' ? text('研究观点', 'Insights') : text('研究记录', 'Research history')
  const relationLabel = (relation: LibraryRelation) => {
    const key = `edge.${relation.edge.kind}`
    const translated = t(key)
    return `${relation.direction === 'from' ? '→' : '←'} ${translated === key ? relation.edge.kind : translated}`
  }

  return (
    <section className="rg-finance-section rg-library-section" aria-labelledby="rg-finance-library-title">
      <div className="rg-finance-section-head"><div><h2 id="rg-finance-library-title">{t('finance.library.title')}</h2><p>{t('finance.library.description')}</p></div>{onAddMaterials && <button type="button" className="rg-btn" onClick={onAddMaterials}>{text('添加材料', 'Add materials')}</button>}</div>
      <div id={`${tabId}-panel`} className="rg-library" role="tabpanel" aria-labelledby={`${tabId}-tab-${group}`} data-drill={drill && active !== undefined ? 'preview' : 'list'}>
        <div className="rg-library-list" aria-label={t('finance.library.records')}>
          <div ref={listFallback} tabIndex={-1} className="rg-library-list-head"><span>{groupLabel(group)}</span><span>{t('ledger.count', { shown: filtered.length, total: currentEntries.length })}</span></div>
          <div className="rg-library-toolbar">
            <div className="rg-library-group-tabs" role="tablist" aria-orientation="horizontal" aria-label={text('资料库分组', 'Library groups')}>
              {LIBRARY_GROUPS.map((value, index) => <button type="button" role="tab" key={value} id={`${tabId}-tab-${value}`} aria-selected={group === value} aria-controls={`${tabId}-panel`} tabIndex={group === value ? 0 : -1} data-active={group === value || undefined}
                onClick={() => { setGroup(value); setSelectedId(null); setDrill(false); setProvider(''); setStatus(''); setSelectedTopic('') }}
                onKeyDown={event => {
                  const next = event.key === 'ArrowLeft' || event.key === 'ArrowUp' ? (index + LIBRARY_GROUPS.length - 1) % LIBRARY_GROUPS.length : event.key === 'ArrowRight' || event.key === 'ArrowDown' ? (index + 1) % LIBRARY_GROUPS.length : event.key === 'Home' ? 0 : event.key === 'End' ? LIBRARY_GROUPS.length - 1 : -1
                  const nextValue = LIBRARY_GROUPS[next]
                  if (nextValue === undefined) return
                  event.preventDefault()
                  event.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>('[role="tab"]').item(next).focus()
                  setGroup(nextValue)
                  setSelectedId(null)
                  setDrill(false)
                  setProvider('')
                  setStatus('')
                  setSelectedTopic('')
                }}><span>{groupLabel(value)}</span><small>{groupEntries[value].length}</small></button>)}
            </div>
            <input type="search" value={query} onChange={event => { setQuery(event.target.value); setSelectedId(null) }} placeholder={t('finance.library.searchPlaceholder')} aria-label={t('finance.library.searchLabel')} />
            {query.trim().length > 0 && <div className="rg-library-global-matches" aria-label={text('全部三组匹配', 'Matches across all groups')}><span>{text('全部匹配', 'All matches')}</span>{LIBRARY_GROUPS.map(value => <button type="button" key={value} data-active={group === value || undefined} aria-pressed={group === value} onClick={() => { setGroup(value); setSelectedId(null); setDrill(false); setProvider(''); setStatus(''); setSelectedTopic('') }}><span>{groupLabel(value)}</span><small>{groupMatchCounts[value]}</small></button>)}</div>}
            <details className="rg-library-filter-more"><summary>{text('筛选', 'Filters')}</summary><div className="rg-library-filter-row">
              <select value={provider} onChange={event => { setProvider(event.target.value); setStatus(''); setSelectedTopic(''); setSelectedId(null) }} aria-label={t('finance.library.providerFilter')}><option value="">{t('finance.library.allProviders')}</option>{providers.map(value => <option value={value} key={value}>{value}</option>)}</select>
              <select value={status} onChange={event => { setStatus(event.target.value); setSelectedTopic(''); setSelectedId(null) }} aria-label={t('finance.library.statusFilter')}><option value="">{t('finance.library.allStatuses')}</option>{statuses.map(value => <option value={value} key={value}>{t(`finance.library.status.${value}`) === `finance.library.status.${value}` ? value : t(`finance.library.status.${value}`)}</option>)}</select>
            </div><label className="rg-library-tool-toggle"><input type="checkbox" checked={includeTechnical} onChange={event => { setIncludeTechnical(event.target.checked); setProvider(''); setStatus(''); setSelectedTopic(''); setSelectedId(null); setDrill(false) }} /><span>{text('包含工具资料', 'Include tool references')}</span><small>{technicalNodeCount}</small></label></details>
            {!includeTechnical && query.trim().length > 0 && hiddenTechnicalMatches > 0 && <p className="rg-library-hidden-count">{text(`另有 ${hiddenTechnicalMatches} 条工具资料匹配，开启“包含工具资料”查看。`, `${hiddenTechnicalMatches} tool reference(s) match this search. Enable “Include tool references” to view them.`)}</p>}
            {topics.length > 0 && <details className="rg-library-directories">
              <summary><span>{t('finance.library.topic')}</span><span>{topics.length}</span></summary>
              <div>
                <button type="button" aria-pressed={selectedTopic === ''} onClick={() => { setSelectedTopic(''); setSelectedId(null); setDrill(false) }}><span>{t('finance.library.records')}</span><small>{baseMatches.length}</small></button>
                {topics.map(value => <button type="button" key={value} aria-pressed={selectedTopic === value} onClick={() => { setSelectedTopic(value); setSelectedId(null); setDrill(false) }}><span>{value}</span><small>{filterLibraryEntries(currentEntries, { query, provider, status, includeTechnical }).filter(entry => entry.members.some(node => libraryTopic(node) === value)).length}</small></button>)}
              </div>
            </details>}
          </div>
          {filtered.length === 0 ? <FinanceEmpty>{currentEntries.length === 0 ? t('finance.library.empty') : t('finance.library.noMatches')}</FinanceEmpty> : filtered.map(entry => {
            const node = entry.primary
            return <button type="button" key={node.id} data-selected={entry.members.some(member => member.id === active?.id) || undefined} data-kind={node.kind} data-node-id={node.id} onClick={event => { returnFocus.current = event.currentTarget; setSelectedId(node.id); setDrill(true) }}>
              <span className="rg-library-row-icon"><LibraryNodeIcon kind={node.kind} /></span>
              <span className="rg-library-row-title" title={libraryTitle(node, nodes)}>{libraryTitle(node, nodes)}</span>
              <span className="rg-library-row-meta">{t(`kind.${node.kind}`)} · {libraryProvider(node)} · <time dateTime={libraryTime(node)}>{date(libraryTime(node))}</time></span>
              <span className="rg-finance-badge" data-status={libraryStatus(node)}>{statusLabel(node)}</span>
            </button>
          })}
        </div>

        <article className="rg-library-preview" aria-label={t('finance.library.preview')}>
          {active === undefined ? <div className="rg-state"><p>{t('finance.library.selectPrompt')}</p></div> : <>
            <div className="rg-library-toolbar rg-library-detail-toolbar">
              <input type="search" value={query} onChange={event => { setQuery(event.target.value); setSelectedId(null) }} placeholder={t('finance.library.searchPlaceholder')} aria-label={t('finance.library.searchLabel')} />
            </div>
            <header className="rg-library-preview-head">
              <button type="button" className="rg-btn rg-library-back" onClick={() => { restoreFocus.current = true; setDrill(false) }}>{t('finance.library.back')}</button>
              <div className="rg-library-document-heading">
                <span className="rg-library-document-kind"><LibraryNodeIcon kind={active.kind} /><span>{groupLabel(activeRoute?.group ?? group)}</span><span>{t(`kind.${active.kind}`)}</span><span>{libraryProvider(active)}</span></span>
                <h3 ref={detailTitle} tabIndex={-1}>{libraryTitle(active, nodes)}</h3>
                <span className="rg-library-document-date">{date(libraryTime(active))}</span>
              </div>
              <div className="rg-library-preview-actions">
                {materialOriginalUrl && <a className="rg-btn rg-library-original-link" href={materialOriginalUrl} target="_blank" rel="noopener noreferrer">{text('打开原始链接', 'Open original source')} ↗</a>}
              </div>
            </header>
            <div className="rg-library-reader-layout">
              <div className="rg-library-document">
                {errors.length > 0 && <section className="rg-library-partial" role="status"><strong>{t('finance.library.partial')}</strong><ul>{errors.map((error, index) => <li key={index}>{displayInboxEntry(error)}</li>)}</ul></section>}
                {activeRoute?.group === 'materials' && <section className="rg-library-summary" aria-label={text('AI 摘要', 'AI summary')}>
                  <div className="rg-library-summary-head"><h4>{text('AI 摘要', 'AI summary')}</h4>{onResearch && (active.kind === 'source' || active.kind === 'raw') && metadataOf(active).managedBy !== 'dsh-research-graph/import' && metadataOf(active).binary !== true && summarySource && <button type="button" className="rg-btn" onClick={summarize}>{summary ? text('重新生成', 'Regenerate') : text('生成摘要', 'Summarize')}</button>}</div>
                  {summary ? <><div className="rg-library-summary-text"><MarkdownText text={protectReportCurrency(summary.text)} labels={markdownLabels} omitHtml /></div><p className="rg-library-summary-meta">{summary.stale ? text('材料版本已变化或摘要未绑定版本，请重新核对。', 'The material changed or this summary has no version reference. Verify it again.') : text('基于当前材料版本', 'Based on the current material version')}{summary.model ? ` · ${summary.model}` : ''}{summary.generatedAt ? ` · ${date(summary.generatedAt)}` : ''}</p></> : <p className="rg-library-summary-empty">{text('这份材料还没有 AI 摘要。生成后可以先读摘要，再回到原文逐项核对。', 'This material has no AI summary yet. Generate one, then verify each point against the original.')}</p>}
                </section>}
                <section className="rg-library-content-section rg-library-reading"><div className="rg-library-original-head"><h4>{activeRoute?.group === 'materials' ? t('finance.library.original') : text('正文与记录', 'Content & record')}</h4>{materialOriginalUrl ? <a href={materialOriginalUrl} target="_blank" rel="noopener noreferrer">{new URL(materialOriginalUrl).hostname} ↗</a> : fileName && <span>{fileName}</span>}</div>{originalContent.length === 0 ? <FinanceEmpty>{t('finance.library.emptyContent')}</FinanceEmpty> : annotations.length || (activeRoute?.group === 'materials' && plainOriginal) ? <pre className="rg-library-original"><HighlightedContent content={originalContent} annotations={annotations} /></pre> : <div className="rg-library-original rg-library-markdown"><MarkdownText text={protectReportCurrency(originalContent)} labels={markdownLabels} omitHtml /></div>}</section>
              </div>
              <aside className="rg-library-inspector">
                <section className="rg-library-inspector-section">
                  <h4>{t('finance.library.preview')}</h4>
                  <dl className="rg-library-facts">
                    <div><dt>{t('finance.provenance.provider')}</dt><dd>{libraryProvider(active)}</dd></div>
                    <div><dt>{t('finance.library.time')}</dt><dd>{date(libraryTime(active))}</dd></div>
                    <div><dt>{t('finance.library.statusLabel')}</dt><dd>{statusLabel(active)}</dd></div>
                    <div><dt>{t('finance.library.mimeType')}</dt><dd>{typeof metadataOf(active).mimeType === 'string' ? String(metadataOf(active).mimeType) : '—'}</dd></div>
                  </dl>
                </section>
                <section className="rg-library-inspector-section rg-library-detail-grid">
                  <div><h4>{t('finance.library.topic')}</h4><p>{topic ?? '—'}</p></div>
                  <div><h4>{t('finance.library.tags')}</h4>{tags.length === 0 ? <p>—</p> : <div className="rg-library-tags">{tags.map(tag => <span className="rg-finance-badge" key={tag}>{tag}</span>)}</div>}</div>
                </section>
                <section className="rg-library-inspector-section">
                  <h4>{text('关系与引用', 'Relations & citations')}</h4>
                  {relations.length === 0 && visibleLineage.length === 0 ? <p className="rg-library-inspector-empty">—</p> : <ul className="rg-library-relations">
                    {visibleLineage.map(node => <li key={`lineage:${node.id}`}><button type="button" title={node.id} data-related-node-id={node.id} onClick={() => { openRelated(node) }}><LibraryNodeIcon kind={node.kind} /><span><strong>{node.title}</strong><small>{text('关联记录', 'Related record')} · {t(`kind.${node.kind}`)}</small></span></button></li>)}
                    {relations.map(relation => <li key={relation.edge.id}>{relation.peer === undefined
                      ? <div className="rg-library-relation-missing"><span><strong>{relation.peerId}</strong><small>{relationLabel(relation)} · {text('节点缺失', 'Missing node')}</small></span></div>
                      : <button type="button" title={relation.peer.id} data-related-node-id={relation.peer.id} onClick={() => { openRelated(relation.peer as GraphNode) }}><LibraryNodeIcon kind={relation.peer.kind} /><span><strong>{relation.peer.title}</strong><small>{relationLabel(relation)} · {t(`kind.${relation.peer.kind}`)}</small></span></button>}
                    </li>)}
                  </ul>}
                </section>
                {research !== undefined && <details className="rg-library-inspector-section rg-library-research-tools">
                  <summary>{active.kind === 'source' ? t('research.compile') : t('hypotheses.action.link')}</summary>
                  <div className="rg-library-actions">
                    {active.kind === 'source' && <><label className="rg-library-compile-as-of"><span>{t('finance.provenance.asOf')}</span><input required value={compileAsOf} onChange={event => { setCompileAsOf(event.target.value) }} placeholder="2026-10-31T00:00:00Z" /></label><button type="button" className="rg-btn" data-primary disabled={compileAsOf.trim().length === 0} onClick={() => { research.startCompile([active.id], compileAsOf) }}>{t('research.compile')}</button></>}
                    <button type="button" className="rg-btn" onClick={() => { research.beginHypothesis({ mode: 'create', evidenceId: active.id }); onOpenHypotheses() }}>{t('hypotheses.action.create')}</button>
                    <button type="button" className="rg-btn" onClick={() => { research.beginHypothesis({ mode: 'link', evidenceId: active.id }); onOpenHypotheses() }}>{t('hypotheses.action.link')}</button>
                  </div>
                  {active.kind === 'source' && <ResearchRuns store={research} t={t} kind="compile" sourceId={active.id} onOpenArtifact={id => { research.selectHypothesis(id); onOpenHypotheses() }} />}
                </details>}
                <section className="rg-library-inspector-section">
                  <h4>{t('finance.library.annotations')}</h4>
                  <AnnotationDetails annotations={annotations} t={t} />
                </section>
                <details className="rg-library-inspector-section rg-library-advanced">
                  <summary>{text('技术详情', 'Technical details')}</summary>
                  <Provenance value={metadataOf(related.capture ?? related.source ?? active)} t={t} />
                  <RawJson value={active} t={t} label={text('完整节点数据', 'Full node data')} />
                  <button type="button" className="rg-btn" onClick={() => onOpenGraph(active.id)}>{t('finance.library.openGraph')}</button>
                </details>
              </aside>
            </div>
          </>}
        </article>
      </div>
    </section>
  )
}
