import { join } from 'node:path'
import { Context } from '@deepseek-ai/cordis'
import { afterEach, describe, expect, it } from 'vitest'
import { ResearchGraphService, resolveConfig } from '../../src/service.ts'
import { FinanceService } from '../../src/finance/service.ts'
import { parseClipperJson } from '../../client/inbox.ts'
import { copyToClipboard } from '../../client/clipboard.ts'
import { GUIDE_BANNER_STORAGE_KEY, readGuideBannerDismissed, writeGuideBannerDismissed } from '../../client/onboarding.ts'
import {
  DEMO_CLIP,
  DEMO_CLIP_JSON,
  DEMO_CLIP_SOURCE_URL,
  TUTORIAL_DEMO_CLIP,
  buildPrompt,
  currentAsOf,
  guideChecks,
  guideLessons,
  hypothesisHasEvidence,
  latestHypothesis,
  latestPortfolio,
  latestSkillReport,
  lessonById,
  lessonCutoff,
  newRunId,
  promptRunPrefix,
  sourceForLesson,
} from '../../client/tutorial.ts'
import { translatedLessonIds } from '../../client/tutorial-i18n.ts'
import { deriveWorkflow } from '../../client/workflow.ts'
import type { TutorialPromptContext } from '../../client/tutorial.ts'
import type { GraphEdge, GraphNode, NodeKind } from '../../src/graph.ts'
import { makeTempDir } from '../host/fixtures.ts'

const cleanups: (() => Promise<void>)[] = []
afterEach(async () => {
  while (cleanups.length > 0) await cleanups.pop()?.()
})

const asOf = '2026-11-01T00:00:00.000Z'
const promptContext: TutorialPromptContext = {
  asOf,
  sourceId: 'source:demo',
  reportId: 'deliverable:base',
  hypothesisId: 'claim:hypothesis',
  portfolioId: 'portfolio:main',
  question: 'What does the evidence actually support?',
}

function node(id: string, kind: NodeKind, metadata: GraphNode['metadata'] = {}): GraphNode {
  return { id, kind, title: id, content: id, metadata, createdAt: 1, updatedAt: 10 }
}

function edge(from: string, to: string, kind: GraphEdge['kind']): GraphEdge {
  return { id: `edge:${from}:${to}:${kind}`, from, to, kind, metadata: {}, createdAt: 1 }
}

describe('shared demo Clip', () => {
  it('is the canonical Apple selection with distinct availability and capture times', () => {
    expect(() => parseClipperJson(DEMO_CLIP_JSON)).not.toThrow()
    expect(TUTORIAL_DEMO_CLIP.schema).toBe('dsh.clipper/v1')
    expect(TUTORIAL_DEMO_CLIP.type).toBe('selection')
    expect(DEMO_CLIP_SOURCE_URL).toBe('https://www.apple.com/newsroom/2025/10/apple-reports-fourth-quarter-results/')
    expect(TUTORIAL_DEMO_CLIP.availableAt).toBe('2025-10-30T00:00:00.000Z')
    expect(TUTORIAL_DEMO_CLIP.asOf).toBe('2025-10-31T00:00:00.000Z')
    expect(TUTORIAL_DEMO_CLIP.capturedAt).not.toBe(TUTORIAL_DEMO_CLIP.availableAt)
    expect(TUTORIAL_DEMO_CLIP.annotations[0]?.exact).toContain('quarterly revenue of $102.5 billion')
    expect(DEMO_CLIP_JSON).not.toMatch(/token|bearer|api[_-]?key/i)
  })

  it('previews and commits through the real finance service without a network fetch', async () => {
    const temp = await makeTempDir('tutorial-clip')
    cleanups.push(temp.cleanup)
    const ctx = new Context()
    const graph = new ResearchGraphService(ctx, resolveConfig({ dataDir: join(temp.dir, 'data'), autoIndexSkills: false }, join(temp.dir, 'skills')))
    const finance = new FinanceService(ctx, graph)
    const preview = await finance.importClipper({ bundle: DEMO_CLIP, dryRun: true, asOf })
    expect(preview.dryRun).toBe(true)
    expect(preview.counts.accepted).toBe(1)
    expect(preview.counts.rejected).toBe(0)
    expect(await graph.currentRevision()).toBe(0)
    const committed = await finance.importClipper({ bundle: DEMO_CLIP, dryRun: false, asOf })
    expect(committed.dryRun).toBe(false)
    expect(committed.counts.accepted).toBe(1)
    expect(await graph.currentRevision()).toBe(1)
    const snapshot = await graph.snapshot()
    const source = snapshot.nodes.find(candidate => candidate.kind === 'source')
    expect(source?.metadata.availableAt).toBe('2025-10-30T00:00:00.000Z')
    expect(source?.metadata.canonicalUrl ?? source?.content).toBe(DEMO_CLIP_SOURCE_URL)
    expect(snapshot.nodes.some(candidate => candidate.kind === 'raw')).toBe(true)
    expect(snapshot.nodes.some(candidate => candidate.kind === 'session')).toBe(true)
  })
})

describe('shared lesson view model', () => {
  it('renders five canonical lessons with localized copy and aligned steps', () => {
    const english = guideLessons('en')
    const chinese = guideLessons('zh')
    expect(english).toHaveLength(5)
    expect(translatedLessonIds().sort()).toEqual(english.map(lesson => lesson.id).sort())
    expect(english.map(lesson => lesson.id)).toEqual(['first-chain', 'ticker-deep-research', 'hypothesis-review-drift', 'portfolio-weekly', 'web-clipper'])
    for (const lesson of english) {
      expect(lesson.steps.length).toBeGreaterThanOrEqual(3)
      expect(lesson.steps.length).toBeLessThanOrEqual(7)
      expect(lesson.prompts.length).toBeGreaterThan(0)
      expect(lesson.expected.length).toBeGreaterThan(30)
      expect(lesson.asOf.length).toBeGreaterThan(20)
      expect(lesson.runId.length).toBeGreaterThan(20)
      expect(lesson.limits.length).toBeGreaterThanOrEqual(2)
      const zh = chinese.find(candidate => candidate.id === lesson.id)
      expect(zh?.steps).toHaveLength(lesson.steps.length)
      expect(zh?.title).not.toBe(lesson.title)
      expect(zh?.prerequisites.length).toBe(lesson.prerequisites.length)
    }
    expect(english[0]?.demoClip).toBe(true)
    expect(english[1]?.demoClip).toBe(false)
    expect(lessonById('ticker')?.id).toBe('ticker-deep-research')
    expect(lessonById('no-such-lesson')).toBeUndefined()
  })

  it('uses a dedicated demo cutoff for the first chain, the caller clock for other filled lessons, and none for Clipper', () => {
    expect(lessonCutoff('first-chain', new Date('2026-11-01T00:00:00.000Z'))).toBe('2025-10-31T00:00:00.000Z')
    expect(lessonCutoff('portfolio-weekly', new Date('2026-11-01T12:00:00.000Z'))).toBe('2026-11-01T12:00:00.000Z')
    expect(lessonCutoff('web-clipper', new Date('2026-11-01T12:00:00.000Z'))).toBeUndefined()
    expect(currentAsOf(new Date('2026-11-01T12:00:00.000Z'))).toBe('2026-11-01T12:00:00.000Z')
  })

  it('names current first-chain controls in both languages while keeping canonical sections and prompts', () => {
    const english = guideLessons('en')[0]
    const chinese = guideLessons('zh')[0]
    const enSteps = english?.steps.map(step => `${step.title} ${step.detail} ${step.action ?? ''}`).join('\n') ?? ''
    const zhSteps = chinese?.steps.map(step => `${step.title} ${step.detail} ${step.action ?? ''}`).join('\n') ?? ''
    for (const label of ['Add a source → Paste clip', 'Preview import', 'Confirm and import', 'Library', 'Bull & bear views', 'Finance assistant', 'native conversation', 'Research history']) expect(enSteps).toContain(label)
    for (const label of ['添加资料 → 粘贴剪藏', '预览导入', '确认并导入', '知识编译', '多空观点', '金融助手', '原生对话研究', '历史研究']) expect(zhSteps).toContain(label)
    expect(enSteps).not.toMatch(/Inbox → Clip|Confirm atomic import|Queue selected research|choose mode Question/)
    expect(zhSteps).not.toMatch(/收集箱 → Clip|确认原子导入|排队所选研究|选择 Question 模式/)
    expect(english?.steps.map(step => step.section)).toEqual(['inbox', 'inbox', 'library', 'library', 'hypotheses', 'reports', 'reports'])
    expect(chinese?.prompts.map(prompt => prompt.template)).toEqual(english?.prompts.map(prompt => prompt.template))
  })

  it('substitutes real record ids while preserving unresolved placeholders', () => {
    const compile = guideLessons('en')[0]?.prompts.find(prompt => prompt.kind === 'lesson')
    expect(compile).toBeDefined()
    const built = buildPrompt(compile?.template ?? '', promptContext, 'compile:fixed-run')
    expect(built.missing).toEqual([])
    expect(built.text).toContain('runId=compile:fixed-run')
    expect(built.text).toContain('sourceIds=source:demo')
    expect(built.text).toContain(`asOf=${asOf}`)

    const missing = buildPrompt(compile?.template ?? '', { asOf }, 'compile:fixed-run')
    expect(missing.missing).toEqual(['source'])
    expect(missing.text).toContain('<source:')
  })

  it('builds the exact ticker, deep, review and weekly prompts', () => {
    const tickerLesson = lessonById('ticker-deep-research')
    const ticker = tickerLesson?.prompt ?? ''
    expect(promptRunPrefix(ticker)).toBe('research')
    const tickerText = buildPrompt(ticker, promptContext, 'research:ticker-run')
    expect(tickerText.text).toContain('mode=Ticker ticker=AAPL')
    expect(tickerText.text).toContain('runId=research:ticker-run')
    expect(tickerText.missing).toEqual([])

    const deepTemplate = tickerLesson?.steps.find(step => step.prompt?.includes('/deep-research'))?.prompt ?? ''
    const deep = buildPrompt(deepTemplate, promptContext, 'research:deep-run')
    expect(deep.text).toContain('baseReportId=deliverable:base')
    expect(deep.text).toContain('runId=research:deep-run')
    expect(buildPrompt(deepTemplate, { asOf }, 'research:deep-run').missing).toEqual(['report'])

    const hypothesisLesson = lessonById('hypothesis-review-drift')
    const thinking = buildPrompt(hypothesisLesson?.prompt ?? '', promptContext, 'review:thinking-run')
    expect(thinking.text).toContain('hypothesisId=claim:hypothesis')
    expect(thinking.text).toContain('runId=review:thinking-run')
    expect(buildPrompt(hypothesisLesson?.prompt ?? '', { asOf }, 'review:thinking-run').missing).toEqual(['hypothesis'])

    const weeklyTemplate = lessonById('portfolio-weekly')?.prompt ?? ''
    const weekly = buildPrompt(weeklyTemplate, { asOf }, 'weekly:main-run')
    expect(weekly.text).toContain('runId=weekly:main-run')
    expect(weekly.text).toContain(`asOf=${asOf}`)
    expect(weekly.missing).toEqual([])
    expect(newRunId('ticker', 'fixed')).toBe('ticker:fixed')
  })

  it('never auto-fills Clipper availableAt or asOf with the current clock', () => {
    const lesson = lessonById('web-clipper')
    const clip = buildPrompt(lesson?.prompt ?? '', {}, 'guide:fixed-run')
    expect(clip.text).toContain('<published-or-available ISO>')
    expect(clip.text).toContain('<explicit asOf ISO>')
    expect(clip.text).not.toMatch(/20\d\d-\d\d-\d\dT/)
    expect(clip.missing).toEqual([])

    const fetchPrompt = lesson?.steps[0]?.prompt ?? ''
    const fetched = buildPrompt(fetchPrompt, {}, 'guide:fixed-run')
    expect(fetched.text).toContain('<explicit asOf ISO>')
    expect(fetched.text).not.toMatch(/20\d\d-\d\d-\d\dT/)

    const generic = buildPrompt('/x asOf=<ISO>', {}, 'guide:fixed-run')
    expect(generic.text).toContain('<ISO>')
    expect(generic.text).not.toMatch(/20\d\d-\d\d-\d\dT/)
    expect(generic.missing).toEqual([])
  })
})

describe('live graph checks', () => {
  it('derives source, report, hypothesis, evidence and portfolio state only from records', () => {
    const source = node('source:a', 'source', { canonicalUrl: DEMO_CLIP_SOURCE_URL, availableAt: TUTORIAL_DEMO_CLIP.availableAt })
    const hypothesis = node('claim:h', 'claim')
    const skillReport = node('deliverable:skill', 'deliverable', { runId: 'research:1', skill: 'research' })
    const plainReport = node('deliverable:plain', 'deliverable')
    const portfolioNode = node('portfolio:p', 'portfolio')
    const workflow = deriveWorkflow([source, hypothesis, skillReport, plainReport, portfolioNode])
    expect(latestSkillReport(workflow)?.id).toBe('deliverable:skill')
    expect(latestHypothesis(workflow)?.id).toBe('claim:h')
    expect(latestPortfolio([source, hypothesis, skillReport, plainReport, portfolioNode])?.id).toBe('portfolio:p')
    expect(hypothesisHasEvidence(hypothesis, [edge('source:a', 'claim:h', 'supports')])).toBe(true)
    expect(hypothesisHasEvidence(hypothesis, [edge('claim:h', 'source:a', 'supports')])).toBe(false)

    const full = { workflow, nodes: [source, hypothesis, skillReport, portfolioNode], edges: [edge('source:a', 'claim:h', 'supports')], asOf }
    expect(guideChecks('first-chain', full)[0]?.state).toBe('met')
    expect(guideChecks('ticker-deep-research', full)[0]?.state).toBe('met')
    expect(guideChecks('hypothesis-review-drift', full).map(check => check.state)).toEqual(['met', 'met'])
    expect(guideChecks('portfolio-weekly', full)[0]?.state).toBe('met')
    const empty = { workflow: deriveWorkflow([]), nodes: [], edges: [], asOf }
    expect(guideChecks('first-chain', empty)[0]?.state).toBe('missing')
    expect(guideChecks('ticker-deep-research', empty)[0]?.state).toBe('missing')
    expect(guideChecks('hypothesis-review-drift', empty).map(check => check.state)).toEqual(['missing', 'missing'])
    expect(guideChecks('portfolio-weekly', empty)[0]?.state).toBe('missing')
  })
})

describe('first-chain source binding', () => {
  const cutoff = TUTORIAL_DEMO_CLIP.asOf

  it('uses an older eligible demo for checks and prompts without changing the workflow latest source', () => {
    const older = node('source:demo-older', 'source', { canonicalUrl: DEMO_CLIP_SOURCE_URL, availableAt: TUTORIAL_DEMO_CLIP.availableAt })
    const future = { ...node('source:future-latest', 'source', { canonicalUrl: DEMO_CLIP_SOURCE_URL, availableAt: '2026-10-30T20:00:01Z' }), updatedAt: 100 }
    const nodes = [older, future]
    const workflow = deriveWorkflow(nodes)
    const selected = sourceForLesson('first-chain', workflow)
    expect(workflow.sources[0]?.id).toBe(future.id)
    expect(selected?.id).toBe(older.id)
    expect(guideChecks('first-chain', { workflow, nodes, edges: [], asOf })[0]?.state).toBe('met')
    const prompt = buildPrompt(lessonById('first-chain')?.prompt ?? '', { asOf: cutoff, sourceId: selected?.id }, 'compile:cutoff-test')
    expect(prompt.missing).toEqual([])
    expect(prompt.text).toContain('sourceIds=source:demo-older')
    expect(prompt.text).not.toContain(future.id)
    expect(sourceForLesson('ticker-deep-research', workflow)?.id).toBe(future.id)
    expect(workflow.sources[0]?.id).toBe(future.id)
  })

  const ineligible: readonly [string, GraphNode['metadata']][] = [
    ['future', { canonicalUrl: DEMO_CLIP_SOURCE_URL, availableAt: '2026-10-30T20:00:01Z' }],
    ['unknown', { canonicalUrl: DEMO_CLIP_SOURCE_URL, capturedAt: TUTORIAL_DEMO_CLIP.availableAt }],
    ['invalid', { canonicalUrl: DEMO_CLIP_SOURCE_URL, availableAt: 'not-a-date' }],
    ['normalized impossible day', { canonicalUrl: DEMO_CLIP_SOURCE_URL, availableAt: '2025-02-30T00:00:00Z' }],
    ['other URL', { canonicalUrl: 'https://example.com/other', availableAt: TUTORIAL_DEMO_CLIP.availableAt }],
    ['missing canonical URL', { availableAt: TUTORIAL_DEMO_CLIP.availableAt, url: DEMO_CLIP_SOURCE_URL }],
  ]
  it.each(ineligible)('does not satisfy the lesson with only a %s source', (_label, metadata) => {
    const nodes = [{ ...node('source:wrong', 'source', metadata), content: DEMO_CLIP_SOURCE_URL }]
    const workflow = deriveWorkflow(nodes)
    const selected = sourceForLesson('first-chain', workflow)
    expect(selected).toBeUndefined()
    expect(guideChecks('first-chain', { workflow, nodes, edges: [], asOf })[0]?.state).toBe('missing')
    expect(buildPrompt(lessonById('first-chain')?.prompt ?? '', { asOf: cutoff, sourceId: selected?.id }, 'compile:missing').missing).toEqual(['source'])
  })

  it.each([
    ['2025-10-31T00:00:00.000Z', true],
    ['2025-10-31T00:00:00.001Z', false],
    ['2025-10-31T01:00:00+01:00', true],
    ['2025-10-30', true],
  ] as const)('compares availability %s to the unchanged lesson cutoff', (availableAt, eligible) => {
    const workflow = deriveWorkflow([node('source:boundary', 'source', { canonicalUrl: DEMO_CLIP_SOURCE_URL, availableAt })])
    expect(sourceForLesson('first-chain', workflow)?.id).toBe(eligible ? 'source:boundary' : undefined)
    expect(lessonCutoff('first-chain')).toBe(cutoff)
  })
})

describe('first-use banner storage', () => {
  function storage(initial: Record<string, string> = {}): { values: Map<string, string>; getItem(key: string): string | null; setItem(key: string, value: string): void } {
    const values = new Map(Object.entries(initial))
    return {
      values,
      getItem: key => values.get(key) ?? null,
      setItem: (key, value) => { values.set(key, value) },
    }
  }

  it('starts shown, respects dismissal, and can be replayed', () => {
    const fake = storage()
    expect(readGuideBannerDismissed(fake)).toBe(false)
    writeGuideBannerDismissed(true, fake)
    expect(fake.values.get(GUIDE_BANNER_STORAGE_KEY)).toBe('dismissed')
    expect(readGuideBannerDismissed(fake)).toBe(true)
    writeGuideBannerDismissed(false, fake)
    expect(readGuideBannerDismissed(fake)).toBe(false)
  })

  it('treats unreadable or missing storage as shown', () => {
    expect(readGuideBannerDismissed(undefined)).toBe(false)
    const broken = { getItem: () => { throw new Error('denied') }, setItem: () => { throw new Error('denied') } }
    expect(readGuideBannerDismissed(broken)).toBe(false)
    expect(() => { writeGuideBannerDismissed(true, broken) }).not.toThrow()
  })
})

describe('clipboard', () => {
  it('uses the async clipboard and surfaces denial', async () => {
    let copied = ''
    expect(await copyToClipboard('hello', { clipboard: { writeText: async text => { copied = text } } })).toBe(true)
    expect(copied).toBe('hello')
    expect(await copyToClipboard('hello', { clipboard: { writeText: async () => { throw new Error('denied') } } })).toBe(false)
  })

  it('falls back to a hidden textarea when the async API is denied', async () => {
    const appended: unknown[] = []
    let removed = 0
    const area = {
      value: '',
      style: {} as Record<string, string>,
      setAttribute: () => {},
      select: () => {},
      remove: () => { removed += 1 },
    }
    const document = {
      body: { append: (node: unknown) => { appended.push(node) } },
      createElement: () => area,
      getSelection: () => null,
      execCommand: (command: string) => command === 'copy',
    }
    expect(await copyToClipboard('fallback', { clipboard: { writeText: async () => { throw new Error('denied') } }, document })).toBe(true)
    expect(area.value).toBe('fallback')
    expect(appended).toHaveLength(1)
    expect(removed).toBe(1)
  })
})
