import { createElement } from 'react'
import { renderToString } from 'react-dom/server'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { Context } from '@deepseek-ai/cordis'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { FinanceService } from '../../src/finance/service.ts'
import { executeFinanceRequest } from '../../src/finance/protocol.ts'
import type { FinanceRequest } from '../../src/finance/protocol.ts'
import { executeGraphRequest } from '../../src/protocol.ts'
import type { EdgeInput, NodeInput } from '../../src/graph.ts'
import { ResearchGraphService, resolveConfig } from '../../src/service.ts'
import { FinanceStore } from '../../client/finance-store.ts'
import type { FinanceGateway } from '../../client/finance-store.ts'
import { WorkbenchStore } from '../../client/store.ts'
import type { GraphGateway, Translate } from '../../client/store.ts'
import { ResearchStore } from '../../client/research-store.ts'
import { hypothesisEvidence } from '../../client/research.ts'
import type { SessionPromptGateway } from '../../client/research-store.ts'
import { en, zh } from '../../client/locales.ts'
import { WorkbenchPage } from '../../client/ui/WorkbenchPage.tsx'
import { makeTempDir } from '../host/fixtures.ts'

const markdown = vi.hoisted(() => vi.fn())
vi.mock('@deepseek-ai/dsh-client-ui-primitives', () => ({
  MarkdownText: (props: { text: string; omitHtml?: boolean }) => {
    markdown(props)
    return props.text
  },
}))

const cleanups: (() => Promise<void>)[] = []
afterEach(async () => {
  markdown.mockClear()
  while (cleanups.length > 0) await cleanups.pop()?.()
})

function translate(dictionary: Record<string, string>): Translate {
  return (key, params) => {
    const template = dictionary[key] ?? key
    if (params === undefined) return template
    return Object.entries(params).reduce((text, [name, value]) => text.replaceAll(`{${name}}`, String(value)), template)
  }
}

async function setup(seed = true) {
  const temp = await makeTempDir('client-research-render')
  cleanups.push(temp.cleanup)
  const ctx = new Context()
  const graph = new ResearchGraphService(ctx, resolveConfig({ dataDir: join(temp.dir, 'data'), autoIndexSkills: false }, join(temp.dir, 'skills')))
  if (seed) {
    for (const node of [
      { id: 'source:a', kind: 'source', title: 'Evidence A', content: 'A' },
      { id: 'source:b', kind: 'source', title: 'Evidence B', content: 'B' },
      { id: 'claim:h0', kind: 'claim', title: 'Earlier thesis', content: 'Earlier', metadata: { version: 'old' } },
      { id: 'claim:h1', kind: 'claim', title: 'Margin resilience', content: 'Margins hold', metadata: { thesis: 'Margins hold through the cycle', confidence: 0.65, status: 'open', killCriteria: ['Margin falls for two quarters'], runId: 'compile:r1', version: 'current' } },
      { id: 'claim:h2', kind: 'claim', title: 'Support only', content: 'Support only', metadata: { confidence: 0.4, status: 'open' } },
      { id: 'question:q1', kind: 'question', title: 'What changes?' },
      { id: 'belief:b1', kind: 'belief', title: 'Evidence matters' },
      { id: 'signal:s1', kind: 'signal', title: 'Margin signal' },
      { id: 'prediction:p1', kind: 'prediction', title: 'Margin prediction' },
      { id: 'deliverable:r0', kind: 'deliverable', title: 'Earlier report', content: '# Earlier' },
      { id: 'deliverable:r1', kind: 'deliverable', title: 'Research report', content: '# Thesis\n\nEvidence based.\n\n## Risks\n\n<script>alert(1)</script>', metadata: { runId: 'research:r1', researchMode: 'question', version: 2 } },
      { id: 'deliverable:briefing', kind: 'deliverable', title: 'Recorded briefing', content: '# Briefing', metadata: { briefing: true } },
    ] satisfies readonly NodeInput[]) await graph.createNode(node)
    for (const edge of [
      { from: 'source:a', to: 'claim:h1', kind: 'supports', metadata: { reliability: 0.9, independence: 0.8 } },
      { from: 'source:b', to: 'claim:h1', kind: 'contradicts', metadata: { reliability: { level: 'medium', rationale: 'Single primary source' }, independence: { group: 'source-b', rationale: 'Separate upstream' } } },
      { from: 'source:a', to: 'claim:h2', kind: 'supports' },
      { from: 'claim:h1', to: 'claim:h0', kind: 'supersedes' },
      { from: 'prediction:p1', to: 'claim:h1', kind: 'based_on' },
      { from: 'deliverable:r1', to: 'claim:h1', kind: 'contain' },
      { from: 'deliverable:r1', to: 'source:a', kind: 'cite' },
      { from: 'deliverable:r1', to: 'deliverable:r0', kind: 'supersedes' },
    ] satisfies readonly EdgeInput[]) await graph.addEdge(edge)
  }
  const financeService = new FinanceService(ctx, graph)
  const graphGateway: GraphGateway = { request: request => executeGraphRequest(graph, request) }
  const financeGateway: FinanceGateway = { request: request => executeFinanceRequest(financeService, request as FinanceRequest) }
  const workbench = new WorkbenchStore(graphGateway, translate(en))
  await workbench.load()
  const finance = new FinanceStore(financeGateway, translate(en), () => workbench.load())
  await finance.load()
  const run = vi.fn<SessionPromptGateway['run']>(() => new Promise(() => {}))
  const runIds = ['render-run', 'render-run-2', 'render-run-3']
  const research = new ResearchStore(graphGateway, { run }, () => workbench.load(), { uuid: () => runIds.shift() ?? 'render-final' })
  workbench.setMode('finance')
  return { graph, workbench, finance, research, run }
}

function render(rig: Awaited<ReturnType<typeof setup>>, dictionary: Record<string, string> = en): string {
  return renderToString(createElement(WorkbenchPage, { store: rig.workbench, finance: rig.finance, research: rig.research, t: translate(dictionary) }))
}

describe('Hypotheses and Reports rendering', () => {
  it('reads graph claims as protected Markdown while keeping raw evidence literal', async () => {
    const rig = await setup(false)
    const content = '# Coverage\n\n**Unverified**\n\n- [Source](https://example.com)\n\n$102.5B / $416B\n\n<script>untrusted()</script>'
    await rig.graph.createNode({ id: 'claim:reader', kind: 'claim', title: 'Coverage claim', content })
    await rig.graph.createNode({ id: 'raw:reader', kind: 'raw', title: 'Original evidence', content })
    await rig.workbench.load()
    rig.workbench.setMode('graph')
    rig.workbench.revealNode('claim:reader')
    expect(render(rig)).toContain('rg-content rg-content-markdown')
    expect(markdown).toHaveBeenCalledWith(expect.objectContaining({ text: content.replaceAll('$', '\\$'), omitHtml: true }))
    expect((await rig.graph.getNode('claim:reader'))?.content).toBe(content)
    markdown.mockClear()
    rig.workbench.revealNode('raw:reader')
    const raw = render(rig)
    expect(raw).toContain('<pre class="rg-content">')
    expect(raw).toContain('$102.5B / $416B')
    expect(raw).toContain('&lt;script&gt;untrusted()&lt;/script&gt;')
    expect(markdown).not.toHaveBeenCalled()
  })

  it('preserves financial plain-text originals without treating currency or indentation as Markdown', async () => {
    const rig = await setup(false)
    const content = '    Consolidated statements\nProducts  $73,716  $69,958\nServices cost  7,106  6,485\n<script>untrusted()</script>'
    await rig.graph.createNode({ id: 'source:plain', kind: 'source', title: 'Complete financial statement', content, metadata: { provider: 'document.import', mimeType: 'text/plain', status: 'accepted' } })
    await rig.workbench.load()
    rig.finance.setSection('library')
    const html = render(rig)
    expect(html).toContain('<pre class="rg-library-original">')
    expect(html).toContain('Products  $73,716  $69,958')
    expect(html).toContain('Services cost  7,106  6,485')
    expect(html).toContain('&lt;script&gt;untrusted()&lt;/script&gt;')
    expect(markdown.mock.calls.some(([props]) => (props as { text?: string }).text?.includes('Consolidated statements'))).toBe(false)
  })

  it('keeps derivation links separate from explicit supporting and contradicting evidence', async () => {
    const rig = await setup()
    await rig.graph.addEdge({ from: 'belief:b1', to: 'source:a', kind: 'derived_from' })
    await rig.graph.addEdge({ from: 'belief:b1', to: 'source:b', kind: 'informed_by' })
    await rig.graph.addEdge({ from: 'belief:b1', to: 'claim:h2', kind: 'based_on' })
    await rig.workbench.load()
    const snapshot = await rig.graph.snapshot()
    const belief = snapshot.nodes.find(node => node.id === 'belief:b1')!
    const evidence = hypothesisEvidence(belief, snapshot.nodes, snapshot.edges)
    expect(evidence).toHaveLength(3)
    expect(evidence.every(item => item.direction === 'related')).toBe(true)
    const claim = snapshot.nodes.find(node => node.id === 'claim:h1')!
    expect(hypothesisEvidence(claim, snapshot.nodes, snapshot.edges).map(item => item.direction).sort()).toEqual(['contradicts', 'supports'])
    rig.research.selectHypothesis(belief.id)
    rig.finance.setSection('hypotheses')
    const html = render(rig)
    expect(html).toContain('Related material')
    expect(html).toContain('Evidence A')
    expect(html).toContain('Evidence B')
    expect(html).not.toContain('data-direction="supports"')
    expect(html).not.toContain('data-direction="contradicts"')
    expect(html).toContain('No contradicting evidence is linked')
  })

  it('renders real thesis fields, evidence quality, related records, versions, and retained history', async () => {
    const rig = await setup()
    rig.research.selectHypothesis('claim:h1')
    await rig.research.loadHypothesisHistory('claim:h1')
    rig.finance.setSection('hypotheses')
    const html = render(rig)
    expect(html).toContain('Margins hold through the cycle')
    expect(html).toContain('65%')
    expect(html).toContain('Margin falls for two quarters')
    expect(html).toContain('Evidence A')
    expect(html).toContain('Evidence B')
    expect(html).toContain('0.9')
    expect(html).toContain('0.8')
    expect(html).toContain('Single primary source')
    expect(html).toContain('Separate upstream')
    expect(html).not.toContain('[object Object]')
    expect(html).toContain('Margin prediction')
    expect(html).toContain('Research report')
    expect(html).toContain('Earlier thesis')
    expect(html).toContain('Retained revision history')
    expect(html).toContain('node.create')
    expect(html).not.toContain('No contradicting evidence is linked')
  })

  it('shows compiler assessments only for one explicit matching evidence relation', async () => {
    const rig = await setup(false)
    await rig.graph.createNode({ id: 'raw:compiler', kind: 'raw', title: 'Compiler material' })
    await rig.graph.createNode({ id: 'raw:other', kind: 'raw', title: 'Other material' })
    const evidence = [
      { rawId: 'raw:compiler', relation: 'supports', reliability: { level: 'high', rationale: 'Exact persisted excerpt' }, independence: { group: 'One upstream', rationale: 'Same publisher' } },
      { rawId: 'raw:compiler', relation: 'contradicts', reliability: 'Wrong relation assessment' },
      { rawId: 'raw:other', relation: 'supports', reliability: 'Wrong material assessment' },
    ]
    await rig.graph.createNode({ id: 'claim:compiler', kind: 'claim', title: 'Compiler hypothesis', metadata: { evidence } })
    await rig.graph.addEdge({ from: 'raw:compiler', to: 'claim:compiler', kind: 'supports' })
    await rig.workbench.load()
    rig.research.selectHypothesis('claim:compiler')
    rig.finance.setSection('hypotheses')
    const html = render(rig)
    expect(html).toContain('Exact persisted excerpt')
    expect(html).toContain('One upstream')
    expect(html).toContain('Same publisher')
    expect(html).not.toContain('Wrong relation assessment')
    expect(html).not.toContain('Wrong material assessment')

    await rig.graph.updateNode('claim:compiler', { metadata: { evidence: [
      ...evidence,
      { rawId: 'raw:compiler', relation: 'supports', reliability: 'Ambiguous second assessment' },
    ] } })
    await rig.workbench.load()
    const ambiguous = render(rig)
    expect(ambiguous).not.toContain('Exact persisted excerpt')
    expect(ambiguous).not.toContain('Ambiguous second assessment')
  })

  it('renders AI review actions and retains the explicit manual cutoff without a phantom run', async () => {
    const rig = await setup()
    rig.research.selectHypothesis('claim:h1')
    rig.finance.setSection('hypotheses')
    const html = render(rig)
    expect(html).toContain('Investigate this view')
    expect(html).toContain('Review view')
    expect(html).toContain('Seek counterevidence')
    expect(html).toContain('Track changes')
    expect(html).toContain('Manual review cutoff (asOf)')
    expect(html).toContain('required=""')
    expect(html).toContain('disabled=""')
    expect(html).not.toContain('Hypothesis review runs')
    expect(render(rig, zh)).toContain('审查观点')
    expect(render(rig, zh)).toContain('追踪变化')
  })

  it.each([
    { kind: 'raw', field: 'rawId', matches: true },
    { kind: 'source', field: 'sourceId', matches: true },
    { kind: 'raw', field: 'sourceId', matches: false },
    { kind: 'source', field: 'rawId', matches: false },
    { kind: 'claim', field: 'rawId', matches: false },
  ] as const)('checks the evidence kind for $kind referenced by $field', async ({ kind, field, matches }) => {
    const rig = await setup(false)
    await rig.graph.createNode({ id: 'evidence:typed', kind, title: 'Typed evidence' })
    await rig.graph.createNode({ id: 'claim:typed', kind: 'claim', title: 'Typed hypothesis', metadata: { evidence: [
      { [field]: 'evidence:typed', relation: 'supports', reliability: 'Typed input assessment' },
    ] } })
    await rig.graph.addEdge({ from: 'evidence:typed', to: 'claim:typed', kind: 'supports' })
    await rig.workbench.load()
    rig.research.selectHypothesis('claim:typed')
    rig.finance.setSection('hypotheses')
    expect(render(rig).includes('Typed input assessment')).toBe(matches)
  })

  it('refreshes a completed review into the current hypothesis and the Reports reader without changing confidence', async () => {
    const rig = await setup()
    const artifactId = 'deliverable:review:render-run'
    rig.run.mockImplementationOnce(async input => {
      input.onTransition({ status: 'running', runId: input.runId, sessionId: 's-review', artifactIds: [], error: null })
      await rig.graph.createNode({
        id: artifactId, kind: 'deliverable', title: 'Independent hypothesis review',
        content: '# Independent review\n\nConfidence before: 65%\n\nConfidence after: 65%',
        metadata: {
          runId: input.runId, reviewOf: 'claim:h1', asOf: '2026-10-31T00:00:00Z', provider: 'hypothesis-thinking',
          confidenceBefore: 0.65, confidenceAfter: 0.65,
        },
      })
      await rig.graph.addEdge({ from: artifactId, to: 'claim:h1', kind: 'derived_from' })
      const result = { status: 'completed' as const, runId: input.runId, sessionId: 's-review', artifactIds: await input.observeArtifacts(input.runId), error: null }
      input.onTransition(result)
      return result
    })
    rig.research.selectHypothesis('claim:h1')
    rig.finance.setSection('hypotheses')
    rig.research.startReview({ kind: 'review', mode: 'thinking', hypothesisId: 'claim:h1', asOf: '2026-10-31T00:00:00Z' })
    await vi.waitFor(() => { expect(rig.workbench.getSnapshot().nodes.some(node => node.id === artifactId)).toBe(true) })
    const hypotheses = render(rig)
    expect(hypotheses).toContain('Completed and verified')
    expect(hypotheses).toContain('review:render-run')
    expect(hypotheses).toContain(artifactId)
    expect(hypotheses).toContain('Independent hypothesis review')
    expect(hypotheses).toContain('65%')
    expect((await rig.graph.snapshot()).nodes.find(node => node.id === 'claim:h1')?.metadata.confidence).toBe(0.65)

    rig.research.selectReport(artifactId)
    rig.finance.setSection('reports')
    const report = render(rig)
    expect(report).toContain('Independent hypothesis review')
    expect(report).toContain(artifactId)
    expect(markdown).toHaveBeenCalledWith(expect.objectContaining({ text: expect.stringContaining('Confidence after: 65%') }))
  })

  it('renders failed drift reviews and retries them as distinct review runs with the same request', async () => {
    const rig = await setup()
    rig.run.mockImplementation(async input => {
      const result = { status: 'failed' as const, runId: input.runId, sessionId: 's-review', artifactIds: [], error: { code: 'SKILL_FAILED', message: 'review rejected' } }
      input.onTransition(result)
      return result
    })
    rig.research.selectHypothesis('claim:h1')
    rig.finance.setSection('hypotheses')
    const original = rig.research.startReview({ kind: 'review', mode: 'drift', hypothesisId: 'claim:h1', asOf: '2026-10-31T00:00:00Z' })
    await vi.waitFor(() => { expect(rig.research.getSnapshot().operations[0]?.status).toBe('failed') })
    const failed = render(rig)
    expect(failed).toContain('Hypothesis review runs')
    expect(failed).toContain('Thesis drift check')
    expect(failed).toContain('SKILL_FAILED')
    expect(failed).toContain('Retry with a new run id')

    const retried = rig.research.retry(original)
    await vi.waitFor(() => {
      expect(rig.research.getSnapshot().operations[0]?.runId).toBe(retried)
      expect(rig.research.getSnapshot().operations[0]?.status).toBe('failed')
    })
    const retriedHtml = render(rig)
    expect(retried).toBe('review:render-run-2')
    expect(retriedHtml).toContain(original)
    expect(retriedHtml).toContain(retried)
    expect(retriedHtml.match(/Retry with a new run id/g)).toHaveLength(2)
    expect(rig.run.mock.calls[1]?.[0].text).toBe('/thesis-drift\nrunId=review:render-run-2 hypothesisId=claim:h1 asOf=2026-10-31T00:00:00Z')
    expect(rig.research.getSnapshot().operations[0]?.request).toEqual(rig.research.getSnapshot().operations[1]?.request)
  })

  it('warns when a hypothesis has no contradicting evidence and offers Library actions', async () => {
    const rig = await setup()
    rig.research.selectHypothesis('claim:h2')
    rig.finance.setSection('hypotheses')
    expect(render(rig)).toContain('No contradicting evidence is linked')
    rig.finance.setSection('library')
    const library = render(rig)
    expect(library).toContain('Compile')
    expect(library).toContain('New hypothesis from evidence')
    expect(library).toContain('Link evidence to hypothesis')
  })

  it('shows accepted as non-final and keeps the compile run id visible in Library', async () => {
    const rig = await setup()
    rig.run.mockImplementationOnce(input => {
      input.onTransition({ status: 'accepted', runId: input.runId, sessionId: 's-real', artifactIds: [], error: null })
      return new Promise(() => {})
    })
    rig.research.startCompile(['source:a', 'source:b'], '2026-10-31T00:00:00Z')
    rig.finance.setSection('library')
    const html = render(rig)
    expect(html).toContain('Accepted — not completed')
    expect(html).toContain('compile:render-run')
    expect(html).toContain('s-real')
    expect(html).not.toContain('Completed and verified')
    expect(rig.run.mock.calls[0]?.[0].text).toBe('/knowledge-compiler\nrunId=compile:render-run sourceIds=source:a,source:b asOf=2026-10-31T00:00:00Z')
  })

  it('renders Reports through the shared Markdown primitive with outline, citations, and supersedes chain', async () => {
    const rig = await setup()
    rig.research.selectReport('deliverable:r1')
    rig.finance.setSection('reports')
    const html = render(rig)
    expect(html).toContain('Research report')
    expect(html).toContain('Outline')
    expect(html).toContain('Risks')
    expect(html).toContain('Citations')
    expect(html).toContain('Evidence A')
    expect(html).toContain('Earlier report')
    expect(html).toContain('Recorded briefing')
    expect(html).toContain('Skill report')
    expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;')
    expect(html).not.toContain('<script>alert(1)</script>')
    expect(markdown).toHaveBeenCalledWith(expect.objectContaining({ omitHtml: true, text: expect.stringContaining('# Thesis') }))
  })

  it('protects both currency amounts in the sample report before shared Markdown rendering', async () => {
    const rig = await setup()
    const content = readFileSync(join(__dirname, 'fixtures', 'currency-report.md'), 'utf8')
    await rig.graph.createNode({ id: 'deliverable:sample-currency', kind: 'deliverable', title: 'Sample currency report', content })
    await rig.workbench.load()
    rig.research.selectReport('deliverable:sample-currency')
    rig.finance.setSection('reports')
    const html = render(rig)
    const input = markdown.mock.calls.at(-1)?.[0]
    expect(input.text).toContain('\\$102.5 billion')
    expect(input.text).toContain('\\$1.85')
    expect(input.text).not.toContain('102.5billion，同比 + 81.85')
    expect(input.omitHtml).toBe(true)
    expect(html).toContain('\\$102.5 billion')
    expect(html).toContain('\\$1.85')
    expect(html).not.toContain('102.5billion，同比 + 81.85')
  })

  it('keeps history primary and shows timeout details in research activity', async () => {
    const rig = await setup(false)
    rig.finance.setSection('reports')
    const gate = render(rig)
    expect(gate).toContain('Start Research')
    expect(gate).not.toContain('rg-research-gate')
    expect(gate).not.toContain('rg-report-entry')

    rig.run.mockImplementationOnce(async input => {
      const result = { status: 'timeout' as const, runId: input.runId, sessionId: 's-real', artifactIds: [], error: { code: 'TIMEOUT_RESULT_UNKNOWN', message: 'unknown' } }
      input.onTransition(result)
      return result
    })
    rig.research.startResearch({ kind: 'research', mode: 'question', question: 'What changes?' })
    await Promise.resolve()
    rig.finance.setSection('activity')
    const timeout = render(rig)
    expect(timeout).toContain('Timeout — result unknown')
    expect(timeout).toContain('TIMEOUT_RESULT_UNKNOWN')
    expect(timeout).toContain('Retry with a new run id')
    expect(rig.run.mock.calls.at(-1)?.[0].text).toContain('/research\nrunId=research:render-run mode=Question')
    expect(rig.run.mock.calls.at(-1)?.[0].text).not.toContain('/deep-research')
  })

  it('renders empty, loading, error, and bilingual states', async () => {
    const empty = await setup(false)
    empty.finance.setSection('hypotheses')
    expect(render(empty)).toContain('No bull views yet')
    empty.finance.setSection('reports')
    expect(render(empty, zh)).toContain('还没有历史研究')
    expect(render(empty, zh)).toContain('开始研究')

    const failingGateway: GraphGateway = { request: async () => ({ ok: false, error: { code: 'OFFLINE', message: 'snapshot unavailable' } }) }
    const broken = new WorkbenchStore(failingGateway, translate(en))
    broken.setMode('finance')
    empty.finance.setSection('hypotheses')
    const loadingHtml = renderToString(createElement(WorkbenchPage, { store: broken, finance: empty.finance, research: empty.research, t: translate(en) }))
    expect(loadingHtml).toContain('Loading research records')

    await broken.load()
    empty.finance.setSection('reports')
    const error = renderToString(createElement(WorkbenchPage, { store: broken, finance: empty.finance, research: empty.research, t: translate(en) }))
    expect(error).toContain('OFFLINE')
    expect(error).toContain('Research records could not be loaded')
  })
})
