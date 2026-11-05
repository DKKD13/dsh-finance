/**
 * Client adapter over the shared teaching manifest. Structure, prompts,
 * prerequisites, cutoffs and the demo Clip all come from `shared/tutorials.ts`
 * (the same module the Host `/finance guide` reads); this file only adds the
 * localized presentation copy, prompt-token substitution, and the live-graph
 * checks the browser can honestly perform.
 * @module deepseek-harness-finance-plugin/client/tutorial
 */

import type { GraphEdge, GraphNode } from '../src/graph.ts'
import type { JsonObject } from '../src/finance/types.ts'
import type { FinanceSection } from './finance-store.ts'
import type { WorkflowSummary } from './workflow.ts'
import { reportOrigin } from './research.ts'
import {
  TUTORIAL_DEMO_CLIP,
  TUTORIAL_DEMO_SOURCE,
  TUTORIAL_LESSONS,
  findTutorialLesson as findSharedLesson,
  tutorialLessonIds,
} from '../shared/tutorials.ts'
import type { TutorialLesson, TutorialSection } from '../shared/tutorials.ts'
import { lessonCopy } from './tutorial-i18n.ts'
import type { LessonCopy } from './tutorial-i18n.ts'

export { TUTORIAL_DEMO_CLIP, TUTORIAL_DEMO_SOURCE, TUTORIAL_LESSONS, tutorialLessonIds }
export type { TutorialDemoClip, TutorialLesson, TutorialSection } from '../shared/tutorials.ts'

/** The real public demo bundle, typed for the finance gateway. */
export const DEMO_CLIP = TUTORIAL_DEMO_CLIP as unknown as JsonObject
export const DEMO_CLIP_JSON = JSON.stringify(TUTORIAL_DEMO_CLIP, null, 2)
export const DEMO_CLIP_SOURCE_URL = TUTORIAL_DEMO_SOURCE.url
export const DEMO_CLIP_AVAILABLE_AT = TUTORIAL_DEMO_SOURCE.availableAt

export type GuideCheckState = 'met' | 'missing' | 'manual'

export interface GuideCheck {
  readonly id: string
  readonly labelKey: string
  readonly state: GuideCheckState
  readonly open: FinanceSection
}

export interface GuideStep {
  readonly title: string
  readonly detail: string
  readonly action?: string | undefined
  readonly section: TutorialSection
  readonly prompt?: string | undefined
}

export interface GuidePromptEntry {
  readonly key: string
  readonly template: string
  readonly kind: 'lesson' | 'step'
  readonly stepTitle?: string | undefined
}

export interface GuideLesson {
  readonly id: string
  readonly title: string
  readonly summary: string
  readonly duration: string
  readonly goal: string
  readonly prerequisites: readonly string[]
  readonly steps: readonly GuideStep[]
  readonly prompts: readonly GuidePromptEntry[]
  readonly expected: string
  readonly asOf: string
  readonly runId: string
  readonly limits: readonly string[]
  readonly demoClip: boolean
}

export interface TutorialContext {
  readonly workflow: WorkflowSummary
  readonly nodes: readonly GraphNode[]
  readonly edges: readonly GraphEdge[]
  readonly asOf: string
}

export interface TutorialPromptContext {
  readonly asOf?: string | undefined
  readonly sourceId?: string | undefined
  readonly reportId?: string | undefined
  readonly hypothesisId?: string | undefined
  readonly portfolioId?: string | undefined
  readonly question?: string | undefined
}

export interface BuiltPrompt {
  readonly text: string
  readonly missing: readonly string[]
}

/** Latest skill-produced report: the only valid Deep Research base. */
export function latestSkillReport(workflow: WorkflowSummary): GraphNode | undefined {
  return workflow.reports.find(report => reportOrigin(report) === 'skill')
}

/** Latest hypothesis node, regardless of kind. */
export function latestHypothesis(workflow: WorkflowSummary): GraphNode | undefined {
  return workflow.hypotheses[0]
}

/** Latest saved portfolio identity in the shared graph. */
export function latestPortfolio(nodes: readonly GraphNode[]): GraphNode | undefined {
  return nodes.filter(node => node.kind === 'portfolio').sort((left, right) => right.updatedAt - left.updatedAt || left.id.localeCompare(right.id))[0]
}

/** Whether the hypothesis has at least one supports/contradicts edge into it. */
export function hypothesisHasEvidence(hypothesis: GraphNode | undefined, edges: readonly GraphEdge[]): boolean {
  if (hypothesis === undefined) return false
  return edges.some(edge => edge.to === hypothesis.id && (edge.kind === 'supports' || edge.kind === 'contradicts'))
}

/** ISO timestamp for the current cutoff; callers may replace it with a chosen asOf. */
export function currentAsOf(now = new Date()): string {
  return now.toISOString()
}

/** A week before the cutoff, used only as the weekly lesson's starting section. */
export function weekStartAsOf(asOf: string): string {
  const date = new Date(asOf)
  if (Number.isNaN(date.getTime())) return asOf
  date.setUTCDate(date.getUTCDate() - 7)
  return date.toISOString()
}

/** Client-side fresh run id, matching the workbench prompt convention. */
export function newRunId(prefix: string, uuid?: string): string {
  const suffix = uuid ?? newUuid()
  return `${prefix}:${suffix}`
}

/** A fresh UUID, with a deterministic-enough fallback for older shells. */
export function newUuid(): string {
  if (typeof globalThis.crypto?.randomUUID === 'function') return globalThis.crypto.randomUUID()
  return `${Date.now().toString(36)}-${Math.random().toString(16).slice(2, 10)}`
}

/** Prefix named by a prompt's `<type:UUID>` placeholder, if any. */
export function promptRunPrefix(template: string): string {
  const match = /<(compile|research|review|weekly):UUID>/.exec(template)
  return match?.[1] ?? 'guide'
}

/** Resolve one shared lesson by canonical id or alias. */
export function lessonById(id: string | null | undefined): TutorialLesson | undefined {
  if (id === null || id === undefined) return undefined
  return findSharedLesson(id)
}

/** Build the localized view models once per locale change. */
export function guideLessons(locale: string | undefined): readonly GuideLesson[] {
  return TUTORIAL_LESSONS.map((lesson, index) => guideLesson(lesson, index, locale ?? 'zh'))
}

function guideLesson(lesson: TutorialLesson, index: number, locale: string | undefined): GuideLesson {
  const copy: LessonCopy = lessonCopy(lesson, locale)
  const steps = lesson.steps.map((step, stepIndex) => {
    const localized = copy.steps[stepIndex]
    return {
      title: localized?.title ?? step.title,
      detail: localized?.detail ?? step.detail,
      ...((localized?.action ?? step.action) === undefined ? {} : { action: localized?.action ?? step.action }),
      section: step.section,
      ...(step.prompt === undefined ? {} : { prompt: step.prompt }),
    }
  })
  const prompts: GuidePromptEntry[] = []
  const seen = new Set<string>()
  if (lesson.prompt !== undefined) {
    prompts.push({ key: `${lesson.id}:lesson:${index}`, template: lesson.prompt, kind: 'lesson' })
    seen.add(lesson.prompt)
  }
  lesson.steps.forEach((step, stepIndex) => {
    if (step.prompt === undefined || seen.has(step.prompt)) return
    seen.add(step.prompt)
    prompts.push({
      key: `${lesson.id}:step:${stepIndex}`,
      template: step.prompt,
      kind: 'step',
      stepTitle: steps[stepIndex]?.title ?? step.title,
    })
  })
  return {
    id: lesson.id,
    title: copy.title,
    summary: `${copy.summary} ${guideEntry(locale)}`,
    duration: copy.duration,
    goal: copy.goal,
    prerequisites: copy.prerequisites,
    steps,
    prompts,
    expected: copy.expected,
    asOf: copy.asOf,
    runId: copy.runId,
    limits: copy.limits,
    demoClip: lesson.demoClip === true,
  }
}

/** Entry wording stays independent of section ids while Finance nav is changing. */
function guideEntry(locale: string | undefined): string {
  return (locale?.startsWith('zh') ?? true)
    ? '入口：从侧栏打开 Finance，先在 Workflow 看下一步；行情在 Market，通过金融助手进入原生对话研究，在历史研究（Reports）查看结果。'
    : 'Entry: open Finance from the sidebar, start with Workflow, use Market for quotes, start native conversation research through Finance assistant, and read results in Research history (Reports).'
}

/**
 * Substitute the shared template's record tokens with ids that exist in the
 * current graph. Unresolved `<source:…>` / `<deliverable:…>` / `<claim:…>`
 * tokens stay visible and are reported as missing, so the UI can disable the
 * copy action instead of inventing an id.
 */
export function buildPrompt(template: string, context: TutorialPromptContext, runId: string): BuiltPrompt {
  const missing = new Set<string>()
  let text = template.replace(/<(compile|research|review|weekly):UUID>/g, runId)
  if (context.asOf !== undefined && context.asOf.trim().length > 0) {
    text = text.replace(/<ISO>/g, context.asOf).replace(/<weekEnd ISO>/g, context.asOf)
  }
  const sourceTokens = /<source:[^>]*>/g
  if (text.includes('<source:')) {
    if (context.sourceId === undefined) missing.add('source')
    else text = text.replace(sourceTokens, context.sourceId)
  }
  const reportTokens = /<deliverable:[^>]*>/g
  if (text.includes('<deliverable:')) {
    if (context.reportId === undefined) missing.add('report')
    else text = text.replace(reportTokens, context.reportId)
  }
  const hypothesisTokens = /<claim:[^>]*>/g
  if (text.includes('<claim:')) {
    if (context.hypothesisId === undefined) missing.add('hypothesis')
    else text = text.replace(hypothesisTokens, context.hypothesisId)
  }
  const portfolioTokens = /<portfolio:[^>]*>/g
  if (text.includes('<portfolio:')) {
    if (context.portfolioId === undefined) missing.add('portfolio')
    else text = text.replace(portfolioTokens, context.portfolioId)
  }
  if (context.question !== undefined) {
    text = text.replace(/<one answerable question>/g, context.question).replace(/<core disagreement>/g, context.question)
  }
  return { text, missing: [...missing] }
}

/** Lesson 1 uses only its imported demo at the fixed cutoff, never a newer substitute. */
export function sourceForLesson(lessonId: string, workflow: WorkflowSummary): GraphNode | undefined {
  if (lessonId !== 'first-chain') return workflow.sources[0]
  const cutoff = Date.parse(TUTORIAL_DEMO_CLIP.asOf)
  return workflow.sources.find(source => {
    if (source.kind !== 'source' || source.metadata.canonicalUrl !== TUTORIAL_DEMO_SOURCE.url) return false
    const availableAt = source.metadata.availableAt
    if (typeof availableAt !== 'string' || !/^\d{4}-\d{2}-\d{2}(?:T|$)/.test(availableAt)) return false
    const day = availableAt.slice(0, 10)
    const dayTime = Date.parse(day)
    const time = Date.parse(availableAt)
    // Date.parse alone normalizes impossible dates such as February 30.
    return Number.isFinite(dayTime) && new Date(dayTime).toISOString().slice(0, 10) === day
      && Number.isFinite(time) && time <= cutoff
  })
}

/** Live graph checks for the lessons whose prompts need real records. */
export function guideChecks(lessonId: string, context: TutorialContext): readonly GuideCheck[] {
  const source = sourceForLesson(lessonId, context.workflow)
  const report = latestSkillReport(context.workflow)
  const hypothesis = latestHypothesis(context.workflow)
  const portfolio = latestPortfolio(context.nodes)
  switch (lessonId) {
    case 'first-chain':
      return [{ id: 'source', labelKey: 'guide.prereq.latestSource', state: source === undefined ? 'missing' : 'met', open: 'inbox' }]
    case 'ticker-deep-research':
      return [{ id: 'baseReport', labelKey: 'guide.prereq.baseReport', state: report === undefined ? 'missing' : 'met', open: 'reports' }]
    case 'hypothesis-review-drift':
      return [
        { id: 'hypothesis', labelKey: 'guide.prereq.hypothesis', state: hypothesis === undefined ? 'missing' : 'met', open: 'hypotheses' },
        { id: 'evidence', labelKey: 'guide.prereq.evidence', state: hypothesisHasEvidence(hypothesis, context.edges) ? 'met' : 'missing', open: 'library' },
      ]
    case 'portfolio-weekly':
      return [{ id: 'portfolio', labelKey: 'guide.prereq.portfolio', state: portfolio === undefined ? 'missing' : 'met', open: 'portfolio' }]
    default:
      return []
  }
}

/**
 * The demo lesson deliberately replays a 2025-10-31 cutoff so its public clip
 * stays inside the lesson's own example; the web-clipper lesson has no single
 * safe cutoff and leaves asOf for the user to type; every other lesson starts
 * from the caller's explicit clock.
 */
export function lessonCutoff(lessonId: string, now = new Date()): string | undefined {
  if (lessonId === 'first-chain') return TUTORIAL_DEMO_CLIP.asOf
  if (lessonId === 'web-clipper') return undefined
  return currentAsOf(now)
}
