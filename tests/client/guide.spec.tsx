import { join } from 'node:path'
import { createElement } from 'react'
import { renderToString } from 'react-dom/server'
import { Context } from '@deepseek-ai/cordis'
import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('@deepseek-ai/dsh-client-ui-primitives', () => ({
  MarkdownText: ({ text }: { text: string }) => text,
}))
import { ResearchGraphService, resolveConfig } from '../../src/service.ts'
import { FinanceService } from '../../src/finance/service.ts'
import { executeFinanceRequest } from '../../src/finance/protocol.ts'
import type { FinanceRequest } from '../../src/finance/protocol.ts'
import type { GraphNode } from '../../src/graph.ts'
import { executeGraphRequest } from '../../src/protocol.ts'
import { FinanceStore } from '../../client/finance-store.ts'
import { WorkbenchStore } from '../../client/store.ts'
import type { Translate } from '../../client/store.ts'
import { en, zh } from '../../client/locales.ts'
import { deriveWorkflow } from '../../client/workflow.ts'
import { DEMO_CLIP_SOURCE_URL, TUTORIAL_DEMO_CLIP } from '../../client/tutorial.ts'
import { GuidePanel } from '../../client/ui/GuidePanel.tsx'
import { OverviewPanel } from '../../client/ui/FinancePanels.tsx'
import { WorkbenchPage } from '../../client/ui/WorkbenchPage.tsx'
import { makeTempDir } from '../host/fixtures.ts'

const cleanups: (() => Promise<void>)[] = []
afterEach(async () => {
  while (cleanups.length > 0) await cleanups.pop()?.()
})

const now = new Date('2026-11-01T00:00:00.000Z')

function translate(dictionary: Record<string, string>): Translate {
  return (key, params) => {
    const template: string = dictionary[key] ?? key
    if (params === undefined) return template
    return Object.entries(params).reduce((text, [name, value]) => text.replaceAll(`{${name}}`, String(value)), template)
  }
}

async function setup(seed: boolean) {
  const temp = await makeTempDir('guide-render')
  cleanups.push(temp.cleanup)
  const ctx = new Context()
  const graph = new ResearchGraphService(ctx, resolveConfig({ dataDir: join(temp.dir, 'data'), autoIndexSkills: false }, join(temp.dir, 'skills')))
  const financeService = new FinanceService(ctx, graph)
  if (seed) {
    await graph.createNode({ id: 'source:apple', kind: 'source', title: 'Apple FY2025 Q4', content: 'Public release excerpt', metadata: { availableAt: '2025-10-30T00:00:00.000Z', canonicalUrl: 'https://www.apple.com/newsroom/2025/10/apple-reports-fourth-quarter-results/' } })
    await graph.createNode({ id: 'session:compile-1', kind: 'session', title: 'Compile run', metadata: { status: 'compiled', compileRunId: 'compile:1', runId: 'compile:1' } })
    await graph.createNode({ id: 'claim:services', kind: 'claim', title: 'Services durability', content: 'A testable thesis', metadata: { thesis: 'Services revenue is durable', confidence: 0.6, killCriteria: ['services growth turns negative'] } })
    await graph.createNode({ id: 'deliverable:base', kind: 'deliverable', title: 'Base research report', content: '# Base\n\nA real skill report fixture.', metadata: { runId: 'research:1', skill: 'research', asOf: '2025-10-30T00:00:00.000Z' } })
    await graph.createNode({ id: 'prediction:cut', kind: 'prediction', title: 'A record quarter', metadata: { status: 'resolved', resolvedAt: '2025-10-31T00:00:00.000Z' } })
    await graph.createNode({ id: 'portfolio:main', kind: 'portfolio', title: 'Main portfolio', metadata: { asOf: '2025-10-31T00:00:00.000Z' } })
    await graph.addEdge({ from: 'source:apple', to: 'claim:services', kind: 'supports' })
    await graph.addEdge({ from: 'deliverable:base', to: 'source:apple', kind: 'cite' })
  }
  const graphGateway = { request: (request: Parameters<typeof executeGraphRequest>[1]) => executeGraphRequest(graph, request) }
  const financeGateway = { request: (request: Parameters<typeof executeFinanceRequest>[1]) => executeFinanceRequest(financeService, request as FinanceRequest) }
  const workbench = new WorkbenchStore(graphGateway, translate(en))
  await workbench.load()
  const finance = new FinanceStore(financeGateway, translate(en))
  await finance.load()
  return { workbench, finance, nodes: workbench.getSnapshot().nodes, edges: workbench.getSnapshot().edges }
}

function renderGuide(rig: Awaited<ReturnType<typeof setup>>, dictionary: Record<string, string> = en, options: { initialLessonId?: string; locale?: string; now?: Date } = {}): string {
  return renderToString(createElement(GuidePanel, {
    store: rig.finance,
    t: translate(dictionary),
    nodes: rig.nodes,
    edges: rig.edges,
    workflow: deriveWorkflow(rig.nodes),
    onOpenGraph: () => {},
    onOpenLibrary: () => {},
    onOpenHypothesis: () => {},
    onOpenReport: () => {},
    now: options.now ?? now,
    ...(options.initialLessonId === undefined ? {} : { initialLessonId: options.initialLessonId }),
    ...(options.locale === undefined ? {} : { locale: options.locale }),
  }))
}

describe('guide rendering over the shared manifest', () => {
  it('renders the five canonical lessons and the real demo Clip on an empty graph', async () => {
    const rig = await setup(false)
    const html = renderGuide(rig, en, { locale: 'en' })
    expect(html).toContain('Five minutes to your first auditable result')
    expect(html).toContain('The graph has no sources yet')
    expect(html).toContain('rg-guide-roadmap')
    expect(html).toContain('data-state="next"')
    expect((html.match(/class="rg-guide-course"/g) ?? [])).toHaveLength(5)
    expect(html).toContain('From a public clip to a cited report')
    expect(html).toContain('Copy clip and open Add a source')
    expect(html).toContain('Demo Clip: Apple FY2025 Q4 results')
    expect(html).toContain('https://www.apple.com/newsroom/2025/10/apple-reports-fourth-quarter-results/')
    expect(html).toContain('2025-10-30T00:00:00.000Z')
    expect(html).toContain('Prompt cutoff: 2025-10-31T00:00:00.000Z')
    expect(html).toContain('role="tablist"')
    expect(html).toContain('aria-orientation="vertical"')
    expect(html).toContain('id="rg-guide-panel-first-chain"')
    expect(html).toContain('role="tabpanel"')
    expect(html).toContain('aria-labelledby="rg-guide-tab-first-chain"')
    expect(html).toContain('Current graph')
    expect(html).toContain('Missing')
    expect(html).toContain('This prompt needs a real record first: a source')
    expect((html.match(/tabindex="0"/g) ?? []).length).toBeGreaterThan(5)
  })

  it('uses real workflow counts and source ids once the graph has evidence', async () => {
    const rig = await setup(true)
    const html = renderGuide(rig, en, { locale: 'en' })
    expect(html).toContain('1 sources · 1 hypotheses · 1 reports')
    expect(html).toContain('data-state="complete"')
    expect(html).toContain('sourceIds=source:apple')
    expect(html).toContain('runId=compile:')
    expect(html).toContain('Ready')
    expect(html).toContain('Open base report')
    expect(html).toContain('What you should see')
    expect(html).toContain('Limits')
    expect(html).toContain('Open Add a source')
    expect(html).toContain('Open demo source')
    expect(html).toContain('Add a source → Paste clip')
    expect(html).toContain('Confirm and import')
    expect(html).toContain('Finance assistant')
    expect(html).toContain('Research history')
    expect(html).not.toContain('Queue selected research')
    expect(html).not.toContain('Confirm atomic import')
  })

  it('renders only the eligible demo id in first-chain prompts when a future source is newest', async () => {
    const rig = await setup(true)
    const demo = rig.nodes.find(node => node.id === 'source:apple')
    if (demo === undefined) throw new Error('Missing demo test fixture')
    const future = { ...demo, id: 'source:future-newest', updatedAt: demo.updatedAt + 100, metadata: { canonicalUrl: DEMO_CLIP_SOURCE_URL, availableAt: '2026-10-30T20:00:01Z' } }
    const nodes = [...rig.nodes, future]
    expect(deriveWorkflow(nodes).sources[0]?.id).toBe(future.id)
    const html = renderGuide({ ...rig, nodes }, en, { locale: 'en' })
    expect(html).toContain('sourceIds=source:apple')
    expect(html).not.toContain(future.id)
    expect(html).toContain(`asOf=${TUTORIAL_DEMO_CLIP.asOf}`)
    expect(html).toContain('Open demo source')
    expect(html).not.toContain('This prompt needs a real record first: a source')
  })

  const ineligibleDemoSources: readonly { name: string; metadata: GraphNode['metadata'] }[] = [
    { name: 'future', metadata: { canonicalUrl: DEMO_CLIP_SOURCE_URL, availableAt: '2026-10-30T20:00:01Z' } },
    { name: 'unknown availability', metadata: { canonicalUrl: DEMO_CLIP_SOURCE_URL } },
    { name: 'other URL', metadata: { canonicalUrl: 'https://example.com/other', availableAt: TUTORIAL_DEMO_CLIP.availableAt } },
  ]
  it.each(ineligibleDemoSources)('keeps every first-chain prompt disabled for only $name', async ({ metadata }) => {
    const rig = await setup(true)
    const demo = rig.nodes.find(node => node.id === 'source:apple')
    if (demo === undefined) throw new Error('Missing demo test fixture')
    const nodes = [{ ...demo, id: 'source:ineligible', metadata, content: DEMO_CLIP_SOURCE_URL }]
    const html = renderGuide({ ...rig, nodes }, en, { locale: 'en' })
    expect(html).not.toContain('sourceIds=source:ineligible')
    expect(html).not.toContain('sourceIds=source:apple')
    expect(html).toContain('sourceIds=&lt;source:')
    expect(html).toContain('This prompt needs a real record first: a source')
    expect(html).not.toContain('Open demo source')
    const prompts = html.match(/<article class="rg-guide-prompt">[\s\S]*?<\/article>/g) ?? []
    expect(prompts).toHaveLength(2)
    for (const prompt of prompts) expect(prompt).toContain('disabled=""')
  })

  it('keeps Deep Research disabled until a skill-produced base report exists', async () => {
    const empty = await setup(false)
    const disabled = renderGuide(empty, en, { locale: 'en', initialLessonId: 'ticker-deep-research' })
    expect(disabled).toContain('Ticker research, valuation and a deep dive')
    expect(disabled).toContain('This prompt needs a real record first: a skill report')
    expect(disabled).toContain('mode=Ticker ticker=AAPL')

    const seeded = await setup(true)
    const ready = renderGuide(seeded, en, { locale: 'en', initialLessonId: 'ticker-deep-research' })
    expect(ready).toContain('baseReportId=deliverable:base')
    expect(ready).toContain('runId=research:')
    expect(ready).not.toContain('This prompt needs a real record first: a skill report')
  })

  it('shows hypothesis and portfolio prerequisites from real records only', async () => {
    const empty = await setup(false)
    const hypothesis = renderGuide(empty, en, { locale: 'en', initialLessonId: 'hypothesis-review-drift' })
    expect(hypothesis).toContain('Review a claim without rewriting history')
    expect(hypothesis).toContain('This lesson still has a missing prerequisite')
    const portfolio = renderGuide(empty, en, { locale: 'en', initialLessonId: 'portfolio-weekly' })
    expect(portfolio).toContain('Save a portfolio snapshot first')
    expect(portfolio).toContain('data-status="missing"')

    const seeded = await setup(true)
    const readyHypothesis = renderGuide(seeded, en, { locale: 'en', initialLessonId: 'hypothesis-review-drift' })
    expect(readyHypothesis).toContain('hypothesisId=claim:services')
    expect(readyHypothesis).toContain('Ready')
    const readyPortfolio = renderGuide(seeded, en, { locale: 'en', initialLessonId: 'portfolio-weekly' })
    expect(readyPortfolio).toContain('runId=weekly:')
    expect(readyPortfolio).not.toContain('Save a portfolio snapshot first')
  })

  it('renders the shared lesson copy in Chinese without changing its structure', async () => {
    const rig = await setup(true)
    const html = renderGuide(rig, zh, { locale: 'zh' })
    expect(html).toContain('五分钟得到第一份可审计结果')
    expect(html).toContain('从一段公开剪藏到有引用的报告')
    expect(html).toContain('演示 Clip：Apple FY2025 Q4 业绩')
    expect(html).toContain('可复制提示词')
    expect(html).toContain('预期结果')
    expect(html).toContain('限制')
    expect(html).toContain('当前图谱')
    expect(html).toContain('sourceIds=source:apple')
    for (const label of ['添加资料 → 粘贴剪藏', '预览导入', '确认并导入', '知识编译', '多空观点', '金融助手', '原生对话研究', '历史研究', '打开演示来源']) expect(html).toContain(label)
    expect(html).not.toMatch(/收集箱 → Clip|确认原子导入|排队所选研究|选择 Question 模式/)
  })

  it('renders the Clipper prompt with explicit placeholders and no current clock', async () => {
    const rig = await setup(true)
    const html = renderGuide(rig, en, { locale: 'en', initialLessonId: 'web-clipper' })
    expect(html).toContain('Capture a page or a file as evidence')
    expect(html).toContain('published-or-available ISO')
    expect(html).toContain('explicit asOf ISO')
    expect(html).toContain('omit it if unknown so the Host quarantines')
    expect(html).not.toContain('2026-')
  })

  it('exposes the guide as an active finance section in the full page', async () => {
    const rig = await setup(true)
    rig.workbench.setMode('finance')
    rig.finance.setSection('guide')
    const html = renderToString(createElement(WorkbenchPage, {
      store: rig.workbench,
      finance: rig.finance,
      t: translate(zh),
      titleKey: 'panel.guide',
      locale: 'zh',
    }))
    expect(html).toContain('aria-label="DeepSeek Finance"')
    expect(html).toContain('aria-current="page"')
    expect(html).toContain('>指南</button>')
    expect(html).toContain('五分钟得到第一份可审计结果')
    expect(html).toContain('role="tabpanel"')
  })
})

describe('first-use banner', () => {
  function renderOverview(rig: Awaited<ReturnType<typeof setup>>): string {
    return renderToString(createElement(OverviewPanel, {
      store: rig.finance,
      t: translate(en),
      nodes: rig.nodes,
      graphRevision: 18,
      graphPhase: 'ready',
      graphError: null,
      onRefreshGraph: async () => {},
      onOpenLibrary: () => {},
      onOpenHypothesis: () => {},
      onOpenReport: () => {},
      onOpenGraph: () => {},
      onOpenAudit: () => {},
    }))
  }

  it('offers the five-minute guide on a graph with no sources without blocking the workflow', async () => {
    const rig = await setup(false)
    const html = renderOverview(rig)
    expect(html).toContain('First time here? A five-minute guide')
    expect(html).toContain('Open the guide')
    expect(html).toContain('Do not show again')
    expect(html).toContain('Research workflow')
    expect(html).toContain('Add source')
    expect(html).not.toContain('role="dialog"')
  })

  it('does not show the banner once a real source exists', async () => {
    const rig = await setup(true)
    const html = renderOverview(rig)
    expect(html).not.toContain('First time here? A five-minute guide')
    expect(html).toContain('Research workflow')
  })
})
