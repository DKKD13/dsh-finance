import { join } from 'node:path'
import { Context } from '@deepseek-ai/cordis'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { executeGraphRequest } from '../../src/protocol.ts'
import { ResearchGraphService, resolveConfig } from '../../src/service.ts'
import type { GraphGateway } from '../../client/store.ts'
import { ResearchStore } from '../../client/research-store.ts'
import type { SessionPromptGateway } from '../../client/research-store.ts'
import type { SessionRunState } from '../../client/session.ts'
import { displayConfidence, expectedArtifactIds, expectedArtifactKinds, knowledgeCompilerPrompt, reportOutline, researchContextPrompt, researchPrompt, reviewPrompt, versionChain, viewStance } from '../../client/research.ts'
import { makeTempDir } from '../host/fixtures.ts'

const cleanups: (() => Promise<void>)[] = []
afterEach(async () => {
  while (cleanups.length > 0) await cleanups.pop()?.()
})

async function graphRig() {
  const temp = await makeTempDir('client-research-store')
  cleanups.push(temp.cleanup)
  const graph = new ResearchGraphService(new Context(), resolveConfig({ dataDir: join(temp.dir, 'data'), autoIndexSkills: false }, join(temp.dir, 'skills')))
  const gateway: GraphGateway = { request: request => executeGraphRequest(graph, request) }
  return { graph, gateway }
}

function completed(runId: string, artifactIds: readonly string[]): SessionRunState {
  return { status: 'completed', runId, sessionId: 's-main', artifactIds, error: null }
}

describe('ResearchStore orchestration', () => {
  it('persists explicit bull/bear direction while preserving the latest evidence metadata', async () => {
    const { graph, gateway } = await graphRig()
    await graph.createNode({ id: 'source:a', kind: 'source', title: 'Original filing' })
    await graph.createNode({ id: 'claim:view', kind: 'claim', title: 'A risk improves', metadata: { provider: 'original', references: ['source:a'], confidence: 'high' } })
    const refresh = vi.fn(async () => {})
    const store = new ResearchStore(gateway, { run: vi.fn() }, refresh)
    const original = await graph.getNode('claim:view')
    expect(viewStance(original!)).toBeUndefined()
    expect(await store.setViewStance('claim:view', 'bear')).toBe(true)
    expect((await graph.getNode('claim:view'))?.metadata).toEqual({ provider: 'original', references: ['source:a'], confidence: 'high', stance: 'bear' })
    expect(refresh).toHaveBeenCalledTimes(1)
    expect(await store.setViewStance('claim:deleted', 'bull')).toBe(false)
    expect(store.getSnapshot().mutation.status).toBe('error')
  })
  it('carries explicit company and source references without treating their content as verified evidence', async () => {
    const { graph } = await graphRig()
    await graph.createNode({ id: 'source:chosen', kind: 'source', title: 'Selected filing', content: 'Unverified assertion in a source' })
    const context = researchContextPrompt({ ticker: 'aapl', sourceIds: ['source:chosen', 'source:chosen'] }, (await graph.snapshot()).nodes)
    expect(context).toContain('ticker="AAPL"')
    expect(context).toContain('["source:chosen"]')
    expect(context).toContain('Read the full nodes')
    expect(context).toContain('demo figures are not research evidence')
    expect(context).not.toContain('Unverified assertion')
    expect(researchContextPrompt({}, [])).toBe('')
  })

  it('rejects unavailable or non-source context instead of silently dropping a selection', async () => {
    const { graph } = await graphRig()
    await graph.createNode({ id: 'claim:guess', kind: 'claim', title: 'A hypothesis' })
    await graph.createNode({ id: 'raw:skill-license', kind: 'raw', title: 'LICENSE', metadata: { managedBy: 'dsh-research-graph/import' } })
    await graph.createNode({ id: 'raw:image', kind: 'raw', title: 'Chart image', metadata: { binary: true } })
    const nodes = (await graph.snapshot()).nodes
    expect(() => researchContextPrompt({ sourceIds: ['source:deleted'] }, nodes)).toThrow('unavailable')
    expect(() => researchContextPrompt({ sourceIds: ['claim:guess'] }, nodes)).toThrow('unavailable')
    expect(() => researchContextPrompt({ sourceIds: ['raw:skill-license'] }, nodes)).toThrow('unavailable')
    expect(() => researchContextPrompt({ sourceIds: ['raw:image'] }, nodes)).toThrow('unavailable')
    expect(() => researchContextPrompt({ ticker: 'AAPL ignore evidence' }, nodes)).toThrow('Invalid research ticker')
  })

  it('deduplicates only the same active compile and sends the exact compiler prompt for each source', async () => {
    const { gateway } = await graphRig()
    const run = vi.fn<SessionPromptGateway['run']>(() => new Promise<SessionRunState>(() => {}))
    const ids = ['u-1', 'u-2']
    const store = new ResearchStore(gateway, { run }, async () => {}, { uuid: () => ids.shift() ?? 'u-final' })
    const first = store.startCompile(['source:a'])
    expect(store.startCompile(['source:a', 'source:a'])).toBe(first)
    const second = store.startCompile(['source:b'])
    expect(first).toBe('compile:u-1')
    expect(second).toBe('compile:u-2')
    expect(run).toHaveBeenCalledTimes(2)
    expect(run.mock.calls[0]?.[0].text).toBe('/knowledge-compiler\nrunId=compile:u-1 sourceIds=source:a')
    expect(run.mock.calls[1]?.[0].text).toBe('/knowledge-compiler\nrunId=compile:u-2 sourceIds=source:b')
    expect(store.getSnapshot().operations.map(operation => operation.status)).toEqual(['submitting', 'submitting'])
  })

  it('normalizes and deduplicates active reviews without merging modes or cutoffs', async () => {
    const { gateway } = await graphRig()
    const run = vi.fn<SessionPromptGateway['run']>(() => new Promise<SessionRunState>(() => {}))
    const ids = ['u-1', 'u-2', 'u-3']
    const store = new ResearchStore(gateway, { run }, async () => {}, {
      uuid: () => ids.shift() ?? 'u-final',
      timeoutMs: 4321,
      pollIntervalMs: 17,
    })
    expect(() => store.startReview({ kind: 'review', mode: 'thinking', hypothesisId: ' ', asOf: '2026-10-31T00:00:00Z' })).toThrow('hypothesis id')
    expect(() => store.startReview({ kind: 'review', mode: 'thinking', hypothesisId: 'claim:h1', asOf: ' ' })).toThrow('as-of cutoff')
    const first = store.startReview({ kind: 'review', mode: 'thinking', hypothesisId: ' claim:h1 ', asOf: ' 2026-10-31T00:00:00Z ' })
    expect(store.startReview({ kind: 'review', mode: 'thinking', hypothesisId: 'claim:h1', asOf: '2026-10-31T00:00:00Z' })).toBe(first)
    const drift = store.startReview({ kind: 'review', mode: 'drift', hypothesisId: 'claim:h1', asOf: '2026-10-31T00:00:00Z' })
    const later = store.startReview({ kind: 'review', mode: 'thinking', hypothesisId: 'claim:h1', asOf: '2026-11-01T00:00:00Z' })
    expect([first, drift, later]).toEqual(['review:u-1', 'review:u-2', 'review:u-3'])
    expect(run).toHaveBeenCalledTimes(3)
    expect(run.mock.calls[0]?.[0]).toMatchObject({
      text: '/hypothesis-thinking\nrunId=review:u-1 hypothesisId=claim:h1 asOf=2026-10-31T00:00:00Z',
      timeoutMs: 4321,
      pollIntervalMs: 17,
    })
    expect(run.mock.calls[1]?.[0].text).toBe('/thesis-drift\nrunId=review:u-2 hypothesisId=claim:h1 asOf=2026-10-31T00:00:00Z')
    expect(store.getSnapshot().operations.find(operation => operation.runId === first)?.request).toEqual({
      kind: 'review', mode: 'thinking', hypothesisId: 'claim:h1', asOf: '2026-10-31T00:00:00Z',
    })
  })

  it('verifies a review deliverable by run id, refreshes the graph, and leaves the source hypothesis untouched', async () => {
    const { graph, gateway } = await graphRig()
    await graph.createNode({
      id: 'claim:h1', kind: 'claim', title: 'Original thesis', content: 'Original content',
      metadata: { claimType: 'hypothesis', status: 'open', confidence: 0.65 },
    })
    const before = (await graph.snapshot()).nodes.find(node => node.id === 'claim:h1')
    let refreshes = 0
    const run = vi.fn<SessionPromptGateway['run']>(async input => {
      input.onTransition({ status: 'running', runId: input.runId, sessionId: 's-main', artifactIds: [], error: null })
      await graph.createNode({ id: 'session:review:u-1', kind: 'session', title: 'Review session', metadata: { runId: input.runId } })
      await graph.createNode({ id: 'deliverable:other', kind: 'deliverable', title: 'Other run', metadata: { runId: 'review:other' } })
      expect(await input.observeArtifacts(input.runId)).toEqual([])
      await graph.createNode({
        id: 'deliverable:review:u-1', kind: 'deliverable', title: 'Independent review', content: '# Review',
        metadata: { runId: input.runId, reviewOf: 'claim:h1', confidenceBefore: 0.65, confidenceAfter: 0.65 },
      })
      await graph.addEdge({ from: 'deliverable:review:u-1', to: 'claim:h1', kind: 'derived_from' })
      const result = completed(input.runId, await input.observeArtifacts(input.runId))
      input.onTransition(result)
      return result
    })
    const store = new ResearchStore(gateway, { run }, async () => { refreshes += 1 }, { uuid: () => 'u-1' })
    const runId = store.startReview({ kind: 'review', mode: 'thinking', hypothesisId: 'claim:h1', asOf: '2026-10-31T00:00:00Z' })
    await vi.waitFor(() => {
      expect(store.getSnapshot().operations[0]?.status).toBe('completed')
      expect(refreshes).toBe(1)
    })
    expect(store.getSnapshot().operations[0]).toMatchObject({ runId, sessionId: 's-main', artifactIds: ['deliverable:review:u-1'], error: null })
    const snapshot = await graph.snapshot()
    expect(snapshot.nodes.find(node => node.id === 'claim:h1')).toEqual(before)
    expect(snapshot.edges.some(edge => edge.kind === 'supersedes' && (edge.from === 'claim:h1' || edge.to === 'claim:h1'))).toBe(false)
  })

  it('keeps out-of-order completions independent and serializes graph refreshes', async () => {
    const { graph, gateway } = await graphRig()
    await graph.createNode({ id: 'claim:one', kind: 'claim', title: 'One', metadata: { provenance: { runId: 'compile:u-1' } } })
    await graph.createNode({ id: 'claim:two', kind: 'claim', title: 'Two', metadata: { runId: 'compile:u-2' } })
    const pending = new Map<string, { resolve: (state: SessionRunState) => void; input: Parameters<SessionPromptGateway['run']>[0] }>()
    const run = vi.fn<SessionPromptGateway['run']>(input => new Promise<SessionRunState>(resolve => {
      pending.set(input.runId, { resolve, input })
      input.onTransition({ status: 'running', runId: input.runId, sessionId: 's-main', artifactIds: [], error: null })
    }))
    let refreshing = 0
    let maxRefreshing = 0
    let refreshes = 0
    const ids = ['u-1', 'u-2']
    const store = new ResearchStore(gateway, { run }, async () => {
      refreshes += 1
      refreshing += 1
      maxRefreshing = Math.max(maxRefreshing, refreshing)
      await new Promise(resolve => setTimeout(resolve, 5))
      refreshing -= 1
    }, { uuid: () => ids.shift() ?? 'u-final' })
    const first = store.startCompile(['source:a'])
    const second = store.startCompile(['source:b'])
    const secondRun = pending.get(second)
    const firstRun = pending.get(first)
    expect(secondRun).toBeDefined()
    expect(firstRun).toBeDefined()
    expect(await secondRun?.input.observeArtifacts(second)).toEqual(['claim:two'])
    expect(await firstRun?.input.observeArtifacts(first)).toEqual(['claim:one'])
    secondRun?.resolve(completed(second, ['claim:two']))
    firstRun?.resolve(completed(first, ['claim:one']))
    await vi.waitFor(() => { expect(refreshes).toBe(2) })
    expect(maxRefreshing).toBe(1)
    expect(store.getSnapshot().operations.find(operation => operation.runId === first)?.artifactIds).toEqual(['claim:one'])
    expect(store.getSnapshot().operations.find(operation => operation.runId === second)?.artifactIds).toEqual(['claim:two'])
  })

  it('retries a failed or unknown run with a new id without rewriting the old operation', async () => {
    const { gateway } = await graphRig()
    const ids = ['u-1', 'u-2']
    const store = new ResearchStore(gateway, {
      run: async input => {
        const result: SessionRunState = { status: 'timeout', runId: input.runId, sessionId: 's-main', artifactIds: [], error: { code: 'TIMEOUT_RESULT_UNKNOWN', message: 'unknown' } }
        input.onTransition(result)
        return result
      },
    }, async () => {}, { uuid: () => ids.shift() ?? 'u-final' })
    const original = store.startReview({ kind: 'review', mode: 'drift', hypothesisId: 'claim:h1', asOf: '2026-10-31T00:00:00Z' })
    await vi.waitFor(() => { expect(store.getSnapshot().operations[0]?.status).toBe('timeout') })
    const retried = store.retry(original)
    expect(retried).not.toBe(original)
    await vi.waitFor(() => { expect(store.getSnapshot().operations[0]?.status).toBe('timeout') })
    expect(store.getSnapshot().operations).toHaveLength(2)
    expect(store.getSnapshot().operations.map(operation => operation.runId)).toEqual([retried, original])
    expect(store.getSnapshot().operations[0]?.request).toEqual(store.getSnapshot().operations[1]?.request)
    expect(store.getSnapshot().operations.map(operation => operation.error?.code)).toEqual(['TIMEOUT_RESULT_UNKNOWN', 'TIMEOUT_RESULT_UNKNOWN'])
  })

  it('creates hypotheses and evidence links atomically with quality metadata and retained history', async () => {
    const { graph, gateway } = await graphRig()
    await graph.createNode({ id: 'source:a', kind: 'source', title: 'Evidence A' })
    await graph.createNode({ id: 'source:b', kind: 'source', title: 'Evidence B' })
    await graph.createNode({ id: 'claim:existing', kind: 'claim', title: 'Existing', content: 'Existing thesis' })
    const store = new ResearchStore(gateway, { run: vi.fn() }, async () => {}, { uuid: () => 'new-hypothesis' })
    store.beginHypothesis({ mode: 'create', evidenceId: 'source:a' })
    const id = await store.createHypothesis({
      kind: 'claim', thesis: 'A falsifiable thesis', status: 'open', confidence: 0.65,
      killCriteria: ['Two quarters below threshold'], evidenceId: 'source:a', direction: 'supports', reliability: 0.9, independence: 0.8,
    })
    expect(id).toBe('claim:new-hypothesis')
    const snapshot = await graph.snapshot()
    const created = snapshot.nodes.find(node => node.id === id)
    expect(created?.metadata).toMatchObject({ thesis: 'A falsifiable thesis', status: 'open', confidence: 0.65, killCriteria: ['Two quarters below threshold'], references: ['source:a'] })
    expect(snapshot.edges.find(edge => edge.from === 'source:a' && edge.to === id)).toMatchObject({ kind: 'supports', metadata: { reliability: 0.9, independence: 0.8 } })
    expect(store.getSnapshot().hypothesisAction).toBeNull()
    expect(store.getSnapshot().selectedHypothesisId).toBe(id)

    await store.loadHypothesisHistory(id as string)
    const historyRevision = store.getSnapshot().history.revision
    expect(await store.linkEvidence({ hypothesisId: id as string, evidenceId: 'source:b', direction: 'contradicts', reliability: 0.7, independence: 0.6 })).toBe(true)
    expect((await graph.snapshot()).edges.find(edge => edge.from === 'source:b' && edge.to === id)).toMatchObject({ kind: 'contradicts' })
    expect(store.getSnapshot().history.status).toBe('ready')
    expect(store.getSnapshot().history.revision).toBeGreaterThan(historyRevision)
    expect(store.getSnapshot().history.entries.some(entry => entry.diff.nodesAdded.includes(id as string))).toBe(true)
    expect(store.getSnapshot().history.entries.some(entry => entry.diff.edgesAdded.some(edge => edge.includes(id as string)))).toBe(true)

    const revision = (await graph.snapshot()).revision
    expect(await store.createHypothesis({ kind: 'belief', thesis: '  ', status: 'open', killCriteria: [], evidenceId: 'source:a', direction: 'supports' })).toBeNull()
    expect(store.getSnapshot().mutation.error?.code).toBe('INVALID_THESIS')
    expect((await graph.snapshot()).revision).toBe(revision)
  })
})

describe('research prompt and reading helpers', () => {
  it('builds the explicit Skill prompts and never implies Deep Research for other modes', () => {
    expect(knowledgeCompilerPrompt('compile:r', ['source:a', 'source:b'])).toBe('/knowledge-compiler\nrunId=compile:r sourceIds=source:a,source:b')
    expect(knowledgeCompilerPrompt('compile:r', ['source:a'], '2026-10-31T00:00:00Z')).toBe('/knowledge-compiler\nrunId=compile:r sourceIds=source:a asOf=2026-10-31T00:00:00Z')
    expect(researchPrompt('research:r', { kind: 'research', mode: 'ticker', ticker: 'AAPL', asOf: '2026-10-31T00:00:00Z' })).toBe('/research\nrunId=research:r mode=Ticker ticker=AAPL asOf=2026-10-31T00:00:00Z')
    expect(researchPrompt('research:r', { kind: 'research', mode: 'question', question: 'What changes?' })).toBe('/research\nrunId=research:r mode=Question question="What changes?"')
    expect(researchPrompt('research:r', { kind: 'research', mode: 'deep', question: 'Where is the edge?', baseReportId: 'deliverable:base' })).toBe('/deep-research\nrunId=research:r baseReportId=deliverable:base question="Where is the edge?"')
    expect(reviewPrompt('review:r', { kind: 'review', mode: 'thinking', hypothesisId: ' claim:h1 ', asOf: ' 2026-10-31T00:00:00Z ' })).toBe('/hypothesis-thinking\nrunId=review:r hypothesisId=claim:h1 asOf=2026-10-31T00:00:00Z')
    expect(reviewPrompt('review:r', { kind: 'review', mode: 'drift', hypothesisId: 'claim:h1', asOf: '2026-10-31T00:00:00Z' })).toBe('/thesis-drift\nrunId=review:r hypothesisId=claim:h1 asOf=2026-10-31T00:00:00Z')
    expect(expectedArtifactKinds({ kind: 'review', mode: 'thinking', hypothesisId: 'claim:h1', asOf: '2026-10-31T00:00:00Z' })).toEqual(['deliverable'])
  })

  it('renders qualitative compiler confidence without inventing percentages', () => {
    expect(displayConfidence({ level: 'medium', rationale: 'Two independent sources' })).toBe('medium — Two independent sources')
    expect(displayConfidence(undefined)).toBe('—')
  })

  it('matches only expected artifact kinds with the exact nested run id', async () => {
    const { graph } = await graphRig()
    await graph.createNode({ id: 'claim:yes', kind: 'claim', title: 'yes', metadata: { provenance: { runId: 'compile:r' } } })
    await graph.createNode({ id: 'session:no', kind: 'session', title: 'no', metadata: { runId: 'compile:r' } })
    await graph.createNode({ id: 'claim:no', kind: 'claim', title: 'no', metadata: { runId: 'compile:other' } })
    const snapshot = await graph.snapshot()
    expect(expectedArtifactIds(snapshot.nodes, 'compile:r', ['claim', 'belief'])).toEqual(['claim:yes'])
  })

  it('parses real headings outside code fences and follows only explicit supersedes chains', async () => {
    const { graph } = await graphRig()
    expect(reportOutline('# Title\n```md\n## not a heading\n```\n## Evidence\n### Detail')).toEqual([
      { level: 1, text: 'Title' }, { level: 2, text: 'Evidence' }, { level: 3, text: 'Detail' },
    ])
    await graph.createNode({ id: 'deliverable:v1', kind: 'deliverable', title: 'v1' })
    await graph.createNode({ id: 'deliverable:v2', kind: 'deliverable', title: 'v2' })
    await graph.createNode({ id: 'deliverable:other', kind: 'deliverable', title: 'other' })
    await graph.addEdge({ from: 'deliverable:v2', to: 'deliverable:v1', kind: 'supersedes' })
    const snapshot = await graph.snapshot()
    const active = snapshot.nodes.find(node => node.id === 'deliverable:v2')
    expect(active).toBeDefined()
    expect(versionChain(active as never, snapshot.nodes, snapshot.edges).map(node => node.id)).toEqual(['deliverable:v1', 'deliverable:v2'])
  })
})
