/**
 * The guide page: the shared `/finance guide` manifest rendered over the live
 * graph. Five lessons, each with real prerequisites, an explicit cutoff, a
 * live SVG workflow route, steps that name real sections, copyable prompts and
 * the one public demo Clip. Nothing here writes to the graph or starts a model
 * run; the only actions are copy, section navigation, and opening a record.
 * @module dsh-research-graph/client/ui/GuidePanel
 */

import { useEffect, useRef, useState } from 'react'
import type { KeyboardEvent } from 'react'
import type { GraphEdge, GraphNode } from '../../src/graph.ts'
import type { FinanceSection, FinanceStore } from '../finance-store.ts'
import type { Translate } from '../store.ts'
import type { WorkflowStageKey, WorkflowSummary } from '../workflow.ts'
import { copyToClipboard } from '../clipboard.ts'
import { writeGuideBannerDismissed } from '../onboarding.ts'
import {
  DEMO_CLIP_AVAILABLE_AT,
  DEMO_CLIP_JSON,
  DEMO_CLIP_SOURCE_URL,
  TUTORIAL_DEMO_SOURCE,
  buildPrompt,
  currentAsOf,
  guideChecks,
  guideLessons,
  latestHypothesis,
  latestPortfolio,
  latestSkillReport,
  lessonById,
  lessonCutoff,
  newRunId,
  promptRunPrefix,
  sourceForLesson,
} from '../tutorial.ts'
import type { GuideLesson, GuidePromptEntry, TutorialContext } from '../tutorial.ts'
import { firstChainControlCopy } from '../tutorial-i18n.ts'
import { useFinance } from './FinanceCommon.tsx'
import type { FinancePanelProps } from './FinanceCommon.tsx'

interface GuidePanelProps extends FinancePanelProps {
  readonly edges: readonly GraphEdge[]
  readonly workflow: WorkflowSummary
  readonly onOpenGraph: (id: string) => void
  readonly onOpenLibrary: (id: string) => void
  readonly onOpenHypothesis: (id: string) => void
  readonly onOpenReport: (id: string) => void
  readonly onOpenClip?: () => void
  /** Fixed clock for deterministic tests/SSR; defaults to now. */
  readonly now?: Date
  /** Clipboard seam; defaults to the browser clipboard with a DOM fallback. */
  readonly copy?: (text: string) => Promise<boolean>
  /** Lesson shown on mount; defaults to the first shared lesson. */
  readonly initialLessonId?: string
  /** Active shell locale; falls back to the shared English lesson copy. */
  readonly locale?: string | undefined
}

interface CopyState {
  readonly key: string
  readonly ok: boolean
}

const STAGE_Y = [34, 98, 162, 226, 290] as const
const ROADMAP_PATH = 'M26 34 C 46 50 6 82 26 98 C 46 114 6 146 26 162 C 46 178 6 210 26 226 C 46 242 6 274 26 290'
const STAGE_ORDER: readonly WorkflowStageKey[] = ['collect', 'compile', 'hypotheses', 'report', 'review']

function stageState(workflow: WorkflowSummary, key: WorkflowStageKey): 'complete' | 'next' | 'pending' {
  const stage = workflow.stages.find(candidate => candidate.key === key)
  if (stage?.complete === true) return 'complete'
  return workflow.next === key ? 'next' : 'pending'
}

function stageAria(t: Translate, workflow: WorkflowSummary, key: WorkflowStageKey): string {
  const stage = workflow.stages.find(candidate => candidate.key === key)
  return t('guide.roadmap.stageLabel', {
    stage: t(`finance.workflow.stage.${key}`),
    count: t(`finance.workflow.count.${key}`, { count: stage?.count ?? 0 }),
    status: t(`finance.workflow.status.${stageState(workflow, key)}`),
  })
}

function missingLabel(t: Translate, key: string): string {
  return t(`guide.missing.${key}`)
}

/** The guide's full-page section. */
export function GuidePanel({ store, t, nodes, edges, workflow, onOpenGraph, onOpenLibrary, onOpenHypothesis, onOpenReport, onOpenClip, now, copy, initialLessonId, locale }: GuidePanelProps) {
  const state = useFinance(store)
  const lessons = guideLessons(locale)
  const first = lessons[0]
  const [selectedId, setSelectedId] = useState(() => lessonById(initialLessonId)?.id ?? first?.id ?? 'first-chain')
  const [copyState, setCopyState] = useState<CopyState | null>(null)
  const [announcement, setAnnouncement] = useState('')
  const [bannerRestored, setBannerRestored] = useState(false)
  const [runIds] = useState<Record<string, string>>(() => {
    const ids: Record<string, string> = {}
    for (const lesson of guideLessons(locale)) {
      for (const prompt of lesson.prompts) ids[prompt.key] = newRunId(promptRunPrefix(prompt.template))
    }
    return ids
  })
  const tabs = useRef<Array<HTMLButtonElement | null>>([])
  const lesson = lessons.find(candidate => candidate.id === selectedId) ?? first
  const contextAsOf = lesson === undefined ? currentAsOf(now) : lessonCutoff(lesson.id, now)
  const context: TutorialContext = { workflow, nodes, edges, asOf: contextAsOf ?? '' }
  const source = sourceForLesson(lesson?.id ?? '', workflow)
  const controlCopy: Readonly<Record<string, string>> = lesson?.id === 'first-chain' ? firstChainControlCopy(locale) : {}
  const guideText: Translate = (key, params) => controlCopy[key] ?? t(key, params)
  const baseReport = latestSkillReport(workflow)
  const hypothesis = latestHypothesis(workflow)
  const questionNode = workflow.hypotheses.find(node => node.kind === 'question')
  const portfolio = latestPortfolio(nodes)
  const copyImpl = copy ?? copyToClipboard
  const checks = lesson === undefined ? [] : guideChecks(lesson.id, context)
  const promptContext = {
    ...(contextAsOf === undefined ? {} : { asOf: contextAsOf }),
    ...(source === undefined ? {} : { sourceId: source.id }),
    ...(baseReport === undefined ? {} : { reportId: baseReport.id }),
    ...(hypothesis === undefined ? {} : { hypothesisId: hypothesis.id }),
    ...(questionNode === undefined ? {} : { question: questionNode.title }),
    ...(portfolio === undefined ? {} : { portfolioId: portfolio.id }),
  }
  const promptViews = lesson === undefined ? [] : lesson.prompts.map(entry => {
    const runId = runIds[entry.key] ?? newRunId(promptRunPrefix(entry.template))
    return { entry, runId, built: buildPrompt(entry.template, promptContext, runId) }
  })
  const portfolioBlocked = lesson?.id === 'portfolio-weekly' && portfolio === undefined
  const checksBlocked = (lesson?.id === 'first-chain' || lesson?.id === 'hypothesis-review-drift') && checks.some(check => check.state === 'missing')
  const blocked = portfolioBlocked || checksBlocked

  useEffect(() => {
    if (copyState === null) return
    const timer = setTimeout(() => { setCopyState(null) }, 4000)
    return () => { clearTimeout(timer) }
  }, [copyState])

  if (lesson === undefined) {
    return <section className="rg-finance-section rg-guide" aria-labelledby="rg-guide-title"><div className="rg-state" role="status"><p className="rg-state-title">{t('guide.noLessons')}</p></div></section>
  }

  const index = lessons.findIndex(candidate => candidate.id === lesson.id)

  const reportCopy = (key: string, ok: boolean, message: string): void => {
    setCopyState({ key, ok })
    setAnnouncement(message)
  }

  const runCopy = async (key: string, text: string, success: string): Promise<boolean> => {
    const ok = await copyImpl(text)
    reportCopy(key, ok, ok ? success : t('guide.copyFailed'))
    return ok
  }

  const copyPrompt = async (entry: GuidePromptEntry, text: string, ready: boolean): Promise<void> => {
    if (!ready) return
    await runCopy(entry.key, text, t('guide.copiedPrompt'))
  }

  const copyDemoClip = async (openInbox: boolean): Promise<void> => {
    const ok = await runCopy('demo-clip', DEMO_CLIP_JSON, t('guide.clip.copied'))
    if (!ok) return
    if (openInbox) {
      store.flash(guideText('guide.clip.copiedHint'))
      if (onOpenClip) onOpenClip()
      else store.setSection('inbox')
    }
  }

  const selectLesson = (id: string, focus = false): void => {
    setSelectedId(id)
    const next = lessons.findIndex(candidate => candidate.id === id)
    if (focus) tabs.current[next]?.focus()
  }

  const onTabKey = (event: KeyboardEvent<HTMLButtonElement>, tabIndex: number): void => {
    let next: number
    if (event.key === 'ArrowDown' || event.key === 'ArrowRight') next = (tabIndex + 1) % lessons.length
    else if (event.key === 'ArrowUp' || event.key === 'ArrowLeft') next = (tabIndex + lessons.length - 1) % lessons.length
    else if (event.key === 'Home') next = 0
    else if (event.key === 'End') next = lessons.length - 1
    else return
    event.preventDefault()
    event.stopPropagation()
    const target = lessons[next]
    if (target !== undefined) selectLesson(target.id, true)
  }

  const openStage = (key: WorkflowStageKey): void => {
    const latestSource = source
    const latestCompiled = workflow.compiledSessions[0]
    if (key === 'collect') {
      if (latestSource === undefined) store.setSection('inbox')
      else onOpenLibrary(latestSource.id)
      return
    }
    if (key === 'compile') {
      if (latestCompiled !== undefined) onOpenLibrary(latestCompiled.id)
      else if (latestSource !== undefined) onOpenLibrary(latestSource.id)
      else store.setSection('inbox')
      return
    }
    if (key === 'hypotheses') {
      if (hypothesis !== undefined) onOpenHypothesis(hypothesis.id)
      else store.setSection('hypotheses')
      return
    }
    if (key === 'report') {
      if (baseReport !== undefined) onOpenReport(baseReport.id)
      else store.setSection('reports')
      return
    }
    store.setSection('predictions')
  }

  const onStageKey = (event: KeyboardEvent<SVGGElement>, key: WorkflowStageKey): void => {
    if (event.key !== 'Enter' && event.key !== ' ') return
    event.preventDefault()
    openStage(key)
  }

  const openSection = (section: FinanceSection): void => { store.setSection(section) }

  const replayBanner = (): void => {
    writeGuideBannerDismissed(false)
    setBannerRestored(true)
    setAnnouncement(t('guide.replay.done'))
  }

  const sections = [...new Set(lesson.steps.map(step => step.section))]
  const dynamicActions: Array<{ readonly labelKey: string; readonly run: () => void }> = []
  if (source !== undefined) dynamicActions.push({ labelKey: 'guide.open.latestSource', run: () => { onOpenLibrary(source.id) } })
  if (baseReport !== undefined) dynamicActions.push({ labelKey: 'guide.open.baseReport', run: () => { onOpenReport(baseReport.id) } })
  if (hypothesis !== undefined) dynamicActions.push({ labelKey: 'guide.open.hypothesis', run: () => { onOpenHypothesis(hypothesis.id) } })
  if (portfolio !== undefined) dynamicActions.push({ labelKey: 'guide.open.portfolio', run: () => { onOpenGraph(portfolio.id) } })

  return (
    <section className="rg-finance-section rg-guide" aria-labelledby="rg-guide-title">
      <p className="rg-visually-hidden" role="status" aria-live="polite">{announcement}</p>
      <header className="rg-guide-hero">
        <div className="rg-guide-hero-copy">
          <p className="rg-guide-kicker">{t('guide.hero.kicker')}</p>
          <h2 id="rg-guide-title">{t('guide.title')}</h2>
          <p className="rg-guide-lede">{t('guide.hero.body')}</p>
          <p className="rg-guide-facts">
            <span>{t('guide.hero.fact.time')}</span>
            <span>{t('guide.hero.fact.real')}</span>
            <span>{t('guide.hero.fact.optional')}</span>
          </p>
        </div>
        <div className="rg-guide-hero-actions">
          <button type="button" className="rg-btn" data-primary onClick={() => { selectLesson(lesson.id, true) }}>{t('guide.hero.start')}</button>
          <button type="button" className="rg-btn" onClick={() => { store.setSection('overview') }}>{t('guide.hero.skip')}</button>
        </div>
      </header>

      <div className="rg-guide-state" data-empty={workflow.sources.length === 0 || undefined}>
        <p>{workflow.sources.length === 0 ? t('guide.state.empty') : t('guide.state.live', { sources: workflow.sources.length, hypotheses: workflow.hypotheses.length, reports: workflow.reports.length })}</p>
        <button type="button" className="rg-btn" onClick={replayBanner}>{bannerRestored ? t('guide.replay.doneShort') : t('guide.replay.action')}</button>
      </div>

      <div className="rg-guide-layout">
        <aside className="rg-guide-rail">
          <section className="rg-guide-roadmap-block" aria-labelledby="rg-guide-roadmap-title">
            <div className="rg-guide-block-head">
              <h3 id="rg-guide-roadmap-title">{t('guide.roadmap.title')}</h3>
              <span className="rg-finance-badge">{t('header.revision', { revision: state.revision })}</span>
            </div>
            <p className="rg-guide-block-note">{t('guide.roadmap.note')}</p>
            <svg className="rg-guide-roadmap" viewBox="0 0 288 324" role="group" aria-label={t('guide.roadmap.aria')}>
              <title>{t('guide.roadmap.aria')}</title>
              <path className="rg-guide-roadmap-path" d={ROADMAP_PATH} />
              {STAGE_ORDER.map((key, stageIndex) => {
                const stateName = stageState(workflow, key)
                const y = STAGE_Y[stageIndex] ?? 34
                const stage = workflow.stages.find(candidate => candidate.key === key)
                return (
                  <g
                    key={key}
                    className="rg-guide-stage"
                    data-state={stateName}
                    role="button"
                    tabIndex={0}
                    aria-label={stageAria(t, workflow, key)}
                    aria-current={stateName === 'next' ? 'step' : undefined}
                    onClick={() => { openStage(key) }}
                    onKeyDown={event => { onStageKey(event, key) }}
                  >
                    <circle className="rg-guide-stage-dot" cx={26} cy={y} r={12} />
                    <text className="rg-guide-stage-number" x={26} y={y + 4} textAnchor="middle">{stageIndex + 1}</text>
                    <text className="rg-guide-stage-name" x={48} y={y - 2}>{t(`finance.workflow.stage.${key}`)}</text>
                    <text className="rg-guide-stage-count" x={48} y={y + 13}>{t(`finance.workflow.count.${key}`, { count: stage?.count ?? 0 })}</text>
                    <text className="rg-guide-stage-status" x={280} y={y + 4} textAnchor="end">{t(`finance.workflow.status.${stateName}`)}</text>
                  </g>
                )
              })}
            </svg>
          </section>

          <section className="rg-guide-courses-block" aria-labelledby="rg-guide-courses-title">
            <div className="rg-guide-block-head">
              <h3 id="rg-guide-courses-title">{t('guide.courses.title')}</h3>
              <span className="rg-revision">{t('guide.courses.count', { count: lessons.length })}</span>
            </div>
            <div className="rg-guide-courses" role="tablist" aria-label={t('guide.courses.aria')} aria-orientation="vertical">
              {lessons.map((item, itemIndex) => (
                <button
                  key={item.id}
                  ref={element => { tabs.current[itemIndex] = element }}
                  type="button"
                  role="tab"
                  id={`rg-guide-tab-${item.id}`}
                  aria-selected={item.id === lesson.id}
                  aria-controls={`rg-guide-panel-${item.id}`}
                  tabIndex={item.id === lesson.id ? 0 : -1}
                  className="rg-guide-course"
                  data-active={item.id === lesson.id || undefined}
                  onClick={() => { selectLesson(item.id) }}
                  onKeyDown={event => { onTabKey(event, itemIndex) }}
                >
                  <span className="rg-guide-course-index">{itemIndex + 1}</span>
                  <span className="rg-guide-course-copy">
                    <strong>{item.title}</strong>
                    <small>{item.summary}</small>
                    <span className="rg-guide-course-duration">{item.duration}</span>
                  </span>
                  {itemIndex === 0 && <span className="rg-guide-course-badge">{t('guide.courses.startHere')}</span>}
                </button>
              ))}
            </div>
          </section>
        </aside>

        <section
          className="rg-guide-detail"
          id={`rg-guide-panel-${lesson.id}`}
          role="tabpanel"
          aria-labelledby={`rg-guide-tab-${lesson.id}`}
          tabIndex={-1}
        >
          <header className="rg-guide-detail-head">
            <span className="rg-finance-badge">{t('guide.detail.lesson', { index: index + 1, total: lessons.length })}</span>
            <h3>{lesson.title}</h3>
            <p>{lesson.summary}</p>
            <p className="rg-guide-outcome"><strong>{t('guide.detail.outcome')}</strong> {lesson.goal}</p>
          </header>

          <section className="rg-guide-meta" aria-labelledby="rg-guide-meta-title">
            <h4 id="rg-guide-meta-title">{t('guide.detail.before')}</h4>
            <dl>
              <div><dt>{t('guide.detail.asOf')}</dt><dd>{lesson.asOf}{contextAsOf !== undefined && <span className="rg-guide-cutoff">{t('guide.detail.promptCutoff', { asOf: contextAsOf })}</span>}</dd></div>
              <div><dt>{t('guide.detail.prerequisites')}</dt><dd><ul className="rg-guide-text-list">{lesson.prerequisites.map(item => <li key={item}>{item}</li>)}</ul></dd></div>
              {checks.length > 0 && <div><dt>{t('guide.detail.currentGraph')}</dt><dd><ul className="rg-guide-prerequisites">{checks.map(check => (
                <li key={check.id} data-state={check.state}>
                  <span className="rg-finance-badge" data-status={check.state}>{t(check.state === 'met' ? 'guide.prereq.met' : 'guide.prereq.missing')}</span>
                  <span>{guideText(check.labelKey)}</span>
                  {check.state === 'missing' && <button type="button" className="rg-btn" onClick={() => { openSection(check.open) }}>{t('guide.detail.openPrerequisite')}</button>}
                </li>
              ))}</ul></dd></div>}
              <div><dt>{t('guide.detail.runId')}</dt><dd>{lesson.runId}</dd></div>
            </dl>
          </section>

          <section className="rg-guide-steps" aria-labelledby="rg-guide-steps-title">
            <h4 id="rg-guide-steps-title">{t('guide.detail.steps')}</h4>
            <ol>{lesson.steps.map((step, stepIndex) => (
              <li key={`${step.title}-${stepIndex}`}>
                <span className="rg-guide-step-number" aria-hidden>{stepIndex + 1}</span>
                <div>
                  <strong>{step.title}{step.action !== undefined && <span className="rg-guide-step-action">{step.action}</span>}</strong>
                  <p>{step.detail}</p>
                  <button type="button" className="rg-guide-step-section" onClick={() => { openSection(step.section) }}>{t('guide.detail.openSection', { section: t(`finance.section.${step.section}`) })}</button>
                </div>
              </li>
            ))}</ol>
          </section>

          {lesson.demoClip && (
            <section className="rg-guide-demo" aria-labelledby="rg-guide-demo-title">
              <div className="rg-guide-block-head">
                <h4 id="rg-guide-demo-title">{t('guide.clip.demoTitle')}</h4>
                <span className="rg-finance-badge">{t('guide.clip.demoBadge')}</span>
              </div>
              <p>{t('guide.clip.demoBody')}</p>
              <dl className="rg-guide-demo-meta">
                <div><dt>{t('guide.clip.publisher')}</dt><dd>{TUTORIAL_DEMO_SOURCE.publisher}</dd></div>
                <div><dt>{t('guide.clip.publicationDate')}</dt><dd>{TUTORIAL_DEMO_SOURCE.publicationDate}</dd></div>
                <div><dt>{t('guide.clip.source')}</dt><dd><a href={DEMO_CLIP_SOURCE_URL} target="_blank" rel="noreferrer noopener">{DEMO_CLIP_SOURCE_URL}</a></dd></div>
                <div><dt>{t('guide.clip.availableAt')}</dt><dd><time dateTime={DEMO_CLIP_AVAILABLE_AT}>{DEMO_CLIP_AVAILABLE_AT}</time></dd></div>
                <div><dt>{t('guide.clip.annotation')}</dt><dd>{t('guide.clip.annotationValue')}</dd></div>
              </dl>
              <p className="rg-guide-demo-notice">{t('guide.clip.notice')}</p>
              <div className="rg-guide-demo-actions">
                <button type="button" className="rg-btn" data-primary onClick={() => { void copyDemoClip(true) }}>{copyState?.key === 'demo-clip' && copyState.ok ? t('guide.clip.copied') : guideText('guide.clip.copyOpen')}</button>
                <button type="button" className="rg-btn" onClick={() => { void copyDemoClip(false) }}>{t('guide.clip.copyOnly')}</button>
                <button type="button" className="rg-btn" onClick={() => { if (onOpenClip) onOpenClip(); else store.setSection('inbox') }}>{guideText('guide.clip.openInbox')}</button>
              </div>
              <p className="rg-guide-copy-status" role="status" data-error={copyState?.key === 'demo-clip' && !copyState.ok || undefined}>
                {copyState?.key === 'demo-clip' ? (copyState.ok ? guideText('guide.clip.copiedHint') : t('guide.copyFailed')) : guideText('guide.clip.copyHint')}
              </p>
              <details className="rg-guide-json">
                <summary>{t('guide.clip.viewJson')}</summary>
                <pre>{DEMO_CLIP_JSON}</pre>
              </details>
            </section>
          )}

          {promptViews.length > 0 && (
            <section className="rg-guide-prompts" aria-labelledby="rg-guide-prompts-title">
              <h4 id="rg-guide-prompts-title">{t('guide.detail.prompts')}</h4>
              {promptViews.map(({ entry, built }) => {
                const missing = built.missing.map(key => missingLabel(t, key))
                const ready = built.missing.length === 0 && !blocked
                const label = entry.kind === 'lesson' ? t('guide.prompt.lesson') : (entry.stepTitle ?? t('guide.prompt.step'))
                return (
                  <article className="rg-guide-prompt" key={entry.key}>
                    <div className="rg-guide-prompt-head">
                      <strong>{label}</strong>
                      <button type="button" className="rg-btn" disabled={!ready} onClick={() => { void copyPrompt(entry, built.text, ready) }}>
                        {copyState?.key === entry.key && copyState.ok ? t('guide.copied') : t('guide.copy')}
                      </button>
                    </div>
                    <pre tabIndex={0}>{built.text}</pre>
                    <p className="rg-guide-prompt-note">
                      {!ready && portfolioBlocked
                        ? t('guide.prompt.needsPortfolio')
                        : !ready && checksBlocked && (lesson.id !== 'first-chain' || missing.length === 0)
                          ? t('guide.prompt.blocked')
                          : !ready
                            ? t('guide.prompt.missing', { kinds: missing.join(' / ') })
                            : t('guide.prompt.note')}
                    </p>
                    {copyState?.key === entry.key && <p className="rg-guide-copy-status" role="status" data-error={!copyState.ok || undefined}>{copyState.ok ? t('guide.copiedPrompt') : t('guide.copyFailed')}</p>}
                  </article>
                )
              })}
            </section>
          )}

          <section className="rg-guide-expected" aria-labelledby="rg-guide-expected-title">
            <h4 id="rg-guide-expected-title">{t('guide.detail.expected')}</h4>
            <p>{lesson.expected}</p>
          </section>

          <section className="rg-guide-limits" aria-labelledby="rg-guide-limits-title">
            <h4 id="rg-guide-limits-title">{t('guide.detail.limits')}</h4>
            <ul>{lesson.limits.map(limit => <li key={limit}>{limit}</li>)}</ul>
          </section>

          <footer className="rg-guide-jumps" aria-labelledby="rg-guide-jumps-title">
            <h4 id="rg-guide-jumps-title">{t('guide.detail.jumps')}</h4>
            <div>
              {sections.map(section => <button type="button" key={section} className="rg-btn" onClick={() => { openSection(section) }}>{t(`finance.section.${section}`)}</button>)}
              {dynamicActions.map(action => <button type="button" key={action.labelKey} className="rg-btn" onClick={action.run}>{guideText(action.labelKey)}</button>)}
            </div>
          </footer>
        </section>
      </div>
    </section>
  )
}
