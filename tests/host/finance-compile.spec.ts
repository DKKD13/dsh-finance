import { createHash } from 'node:crypto'
import { join } from 'node:path'
import { Context } from '@deepseek-ai/cordis'
import { afterEach, describe, expect, it } from 'vitest'
import type { GraphPlan } from '../../src/plan.ts'
import { CLIPPER_SCHEMA } from '../../src/finance/clipper.ts'
import { executeFinanceRequest } from '../../src/finance/protocol.ts'
import { FinanceService } from '../../src/finance/service.ts'
import type { SourceItem } from '../../src/finance/types.ts'
import { ResearchGraphService, resolveConfig } from '../../src/service.ts'
import { makeTempDir } from './fixtures.ts'

const cleanups: (() => Promise<void>)[] = []
afterEach(async () => {
  while (cleanups.length > 0) await cleanups.pop()?.()
})

const asOf = '2026-01-10T00:00:00.000Z'

function sourceItem(): SourceItem {
  const content = 'Management said margins recovered after the product mix changed.'
  return {
    provider: 'fixture.news',
    canonicalUrl: 'https://news.example.com/story?id=7',
    title: 'Original story',
    content,
    contentHash: `sha256:${createHash('sha256').update(content).digest('hex')}`,
    asOf,
    availableAt: '2026-01-09T00:00:00.000Z',
    fetchedAt: asOf,
    provenance: { locator: 'article-body#paragraph-2' },
  }
}

const legacyHistorySource = 'source:legacy-history'
const legacyHistoryRaw = 'raw:legacy-history'
const legacyHistoryBarAt = '2026-01-01T00:00:00.000Z'
const legacyHistoryFetchedAt = '2026-01-03T00:00:00.000Z'
const legacyHistoryContent = '{"bars":[]}'
const legacyHistoryHash = `sha256:${createHash('sha256').update(legacyHistoryContent).digest('hex')}`

type CompilePrepareForTest = {
  revision: number
  candidates: {
    availableAt: string
    fetchedAt: string
    source: { metadata: { availableAt?: string } }
    raw: { metadata: { availableAt?: string } }
  }[]
  rejected: { sourceId: string; code: string }[]
}

function legacyHistoryPlan(rawFetchedAt = legacyHistoryFetchedAt): GraphPlan {
  const provenance = {
    endpoint: 'v8/finance/chart',
    adjustment: 'provider adjustedClose and unadjusted OHLC retained separately',
  }
  return {
    nodes: [
      {
        id: legacyHistorySource, kind: 'source', title: 'AAPL historical prices',
        content: 'https://query1.finance.yahoo.com/v8/finance/chart/AAPL?interval=1d&range=1d',
        metadata: {
          provider: 'yahoo', asOf: legacyHistoryBarAt, availableAt: legacyHistoryBarAt,
          fetchedAt: legacyHistoryFetchedAt, contentHash: legacyHistoryHash,
          provenance: { ...provenance, rawId: legacyHistoryRaw },
        },
      },
      {
        id: legacyHistoryRaw, kind: 'raw', title: 'AAPL historical prices — raw', content: legacyHistoryContent,
        metadata: {
          provider: 'yahoo', asOf: legacyHistoryBarAt, availableAt: legacyHistoryBarAt,
          fetchedAt: rawFetchedAt, contentHash: legacyHistoryHash,
          provenance, sourceId: legacyHistorySource, data: { bars: [] },
        },
      },
    ],
    edges: [],
  }
}

async function setup() {
  const temp = await makeTempDir('finance-compile')
  cleanups.push(temp.cleanup)
  const ctx = new Context()
  const config = resolveConfig({ dataDir: join(temp.dir, 'data'), autoIndexSkills: false }, join(temp.dir, 'skills'))
  const graph = new ResearchGraphService(ctx, config)
  const finance = new FinanceService(ctx, graph)
  return { finance, graph }
}

describe('knowledge compilation host contract', () => {
  it('prepares only persisted ready source/raw candidates and excludes quarantined/future evidence without writes', async () => {
    const { finance, graph } = await setup()
    const ready = await finance.ingestSources({ items: [sourceItem()], dryRun: false, runId: 'ingest-ready', asOf })
    const quarantined = await finance.importClipper({
      bundle: {
        schema: CLIPPER_SCHEMA,
        clips: [{
          type: 'page',
          title: 'Future clip',
          url: 'https://news.example.com/future',
          capturedAt: asOf,
          availableAt: '2026-01-11T00:00:00.000Z',
          content: { text: 'future evidence' },
          provenance: { locator: 'article-body' },
        }],
      },
      dryRun: false,
      asOf,
      runId: 'ingest-future',
    })
    const revision = await graph.currentRevision()
    const response = await executeFinanceRequest(finance, {
      op: 'compile.prepare',
      input: {
        runId: 'compile-ready',
        sourceIds: [ready.sourceIds[0] as string, quarantined.sourceIds[0] as string, 'source:ghost'],
        asOf,
      },
    })
    expect(response.ok).toBe(true)
    if (response.ok) {
      const result = response.result as {
        revision: number
        preparedAt: string
        candidates: { sourceId: string; rawId: string; content: string; locators: unknown[]; provenance: { locator: string } }[]
        rejected: { sourceId: string; code: string }[]
        counts: { requested: number; ready: number; rejected: number }
      }
      expect(result.revision).toBe(revision)
      expect(Number.isFinite(Date.parse(result.preparedAt))).toBe(true)
      expect(result.counts).toEqual({ requested: 3, ready: 1, rejected: 2 })
      expect(result.candidates).toHaveLength(1)
      expect(result.candidates[0]).toMatchObject({
        sourceId: ready.sourceIds[0] as string,
        rawId: ready.rawIds[0] as string,
        content: sourceItem().content,
        locators: ['article-body#paragraph-2'],
        provenance: { locator: 'article-body#paragraph-2' },
      })
      expect(result.rejected.map(entry => entry.code)).toEqual(['QUARANTINED', 'MISSING_SOURCE'])
    }
    expect(await graph.currentRevision()).toBe(revision)
    expect((await graph.snapshot()).nodes.filter(node => ['question', 'claim', 'belief', 'signal'].includes(node.kind))).toHaveLength(0)
  })

  it('derives real compiler hashes in one atomic plan, reports artifacts by runId, and replays idempotently', async () => {
    const { finance, graph } = await setup()
    const ingested = await finance.ingestSources({ items: [sourceItem()], dryRun: false, runId: 'ingest-compile', asOf })
    const sourceId = ingested.sourceIds[0] as string
    const rawId = ingested.rawIds[0] as string
    const runId = 'compile-hypothesis'
    const preparedAt = '2026-01-10T01:00:00.000Z'
    const lineage = {
      compileRunId: runId,
      runId,
      provider: 'knowledge-compiler',
      asOf,
      availableAt: preparedAt,
      provenance: {
        compiler: 'knowledge-compiler',
        sourceRefs: [sourceId],
        rawRefs: [rawId],
        locator: 'article-body#paragraph-2',
        dshSessionId: 'dsh-session-real',
      },
    }
    const sessionId = `session:compile:${runId}`
    const questionId = `question:compile:${runId}:q1`
    const claimId = `claim:compile:${runId}:h1`
    const evidence = [{
      sourceId,
      rawId,
      locator: 'article-body#paragraph-2',
      relation: 'supports',
      reliability: { level: 'medium', rationale: 'management statement, not independently verified' },
      independence: { group: 'company-management', rationale: 'single upstream speaker' },
    }]
    const plan: GraphPlan = {
      nodes: [
        {
          id: sessionId,
          kind: 'session',
          title: `Knowledge compilation ${runId}`,
          content: 'Compiled one hypothesis from one ready source.',
          metadata: { ...lineage, status: 'compiled', references: [questionId, claimId] },
        },
        {
          id: questionId,
          kind: 'question',
          title: 'Did product mix drive the margin recovery?',
          content: 'What evidence supports or contradicts a product-mix mechanism?',
          metadata: { ...lineage, references: [sourceId, rawId] },
        },
        {
          id: claimId,
          kind: 'claim',
          title: 'Product mix may have driven the margin recovery',
          content: 'Hypothesis: the observed recovery is associated with the stated product-mix change.',
          metadata: {
            ...lineage,
            claimType: 'hypothesis',
            killCriteria: ['Same-scope disclosures separate mix effects and show no mix contribution.'],
            confidence: { level: 'low', rationale: 'one management statement and no independent confirmation' },
            evidence,
            references: [questionId, sourceId, rawId],
          },
        },
      ],
      edges: [
        { from: sessionId, to: questionId, kind: 'produces', metadata: lineage },
        { from: sessionId, to: claimId, kind: 'produces', metadata: lineage },
        { from: claimId, to: questionId, kind: 'answers', metadata: lineage },
        { from: claimId, to: rawId, kind: 'cite', metadata: lineage },
        { from: rawId, to: claimId, kind: 'supports', metadata: lineage },
        { from: claimId, to: rawId, kind: 'derived_from', metadata: lineage },
      ],
    }

    const before = await finance.compileStatus({ runId })
    expect(before).toMatchObject({ status: 'not_found', revision: 1, artifactIds: [] })
    const applied = await executeFinanceRequest(finance, { op: 'graph.plan', plan })
    expect(applied.ok).toBe(true)
    expect(applied.ok && applied.revision).toBe(2)
    const snapshot = await graph.snapshot()
    const artifacts = snapshot.nodes.filter(node => node.metadata.compileRunId === runId)
    const relations = snapshot.edges.filter(edge => edge.metadata.compileRunId === runId)
    expect(artifacts).toHaveLength(3)
    expect(relations).toHaveLength(6)
    for (const artifact of [...artifacts, ...relations]) {
      expect(artifact.metadata.contentHash).toMatch(/^sha256:[a-f0-9]{64}$/)
      expect(artifact.metadata.runId).toBe(runId)
      expect(artifact.metadata.availableAt).toBe(preparedAt)
      expect(artifact.metadata.provenance).toMatchObject({ dshSessionId: 'dsh-session-real' })
    }
    expect((await graph.getNode(claimId))?.metadata).toMatchObject({ claimType: 'hypothesis', killCriteria: expect.any(Array), confidence: expect.any(Object), evidence: expect.any(Array) })
    expect((await graph.revisions()).map(entry => entry.op)).toEqual(['finance.source.ingest', 'finance.graph.plan'])

    const status = await finance.compileStatus({ runId })
    expect(status).toMatchObject({
      status: 'compiled',
      scope: 'graph-artifacts-only',
      revision: 2,
      artifactIds: [claimId, questionId, sessionId],
      counts: { nodes: 3, edges: 6, questions: 1, claims: 1, beliefs: 0, signals: 0 },
    })
    const replay = await executeFinanceRequest(finance, { op: 'graph.plan', plan })
    expect(replay.ok).toBe(true)
    expect(replay.ok && JSON.stringify(replay.result)).toContain('"changed":false')
    expect(await graph.currentRevision()).toBe(2)

    const wrongHash: GraphPlan = {
      ...plan,
      nodes: plan.nodes.map(node => node.id === claimId ? { ...node, metadata: { ...node.metadata, contentHash: 'sha256:false' } } : node),
    }
    const rejected = await executeFinanceRequest(finance, { op: 'graph.plan', plan: wrongHash })
    expect(rejected.ok).toBe(false)
    expect(rejected.ok === false && rejected.error.code).toBe('CONTENT_HASH_MISMATCH')
    expect(await graph.currentRevision()).toBe(2)

    const report: GraphPlan = {
      nodes: [{ id: 'deliverable:compile:not-allowed', kind: 'deliverable', title: 'Not a compiler artifact', metadata: lineage }],
      edges: [],
    }
    const reportResult = await executeFinanceRequest(finance, { op: 'graph.plan', plan: report })
    expect(reportResult.ok).toBe(false)
    expect(reportResult.ok === false && reportResult.error.code).toBe('INVALID_COMPILE_PLAN')
    const smuggledReport: GraphPlan = {
      nodes: [
        { id: 'session:compile:smuggled', kind: 'session', title: 'Compiler session', metadata: { ...lineage, status: 'compiled' } },
        { id: 'deliverable:compile:smuggled', kind: 'deliverable', title: 'Unmarked report', metadata: {} },
      ],
      edges: [],
    }
    const smuggledResult = await executeFinanceRequest(finance, { op: 'graph.plan', plan: smuggledReport })
    expect(smuggledResult.ok).toBe(false)
    expect(smuggledResult.ok === false && smuggledResult.error.code).toBe('INVALID_COMPILE_PLAN')
    expect(await graph.currentRevision()).toBe(2)
  })

  it('gates legacy Yahoo history before fetchedAt and returns effective lineage without changing storage', async () => {
    const { finance, graph } = await setup()
    await graph.applyPlan(legacyHistoryPlan(), 'test.fixture', 'legacy Yahoo history')
    const before = await graph.snapshot()

    const early = await finance.prepareCompilation({
      runId: 'compile-yahoo-early', sourceIds: [legacyHistorySource], asOf: '2026-01-02T00:00:00.000Z',
    }) as CompilePrepareForTest
    expect(early.rejected).toEqual([expect.objectContaining({ sourceId: legacyHistorySource, code: 'FUTURE_DATA' })])
    expect(early.candidates).toEqual([])

    const current = await finance.prepareCompilation({
      runId: 'compile-yahoo-current', sourceIds: [legacyHistorySource], asOf: legacyHistoryFetchedAt,
    }) as CompilePrepareForTest
    expect(current.candidates).toHaveLength(1)
    expect(current.candidates[0]).toMatchObject({
      availableAt: legacyHistoryFetchedAt,
      fetchedAt: legacyHistoryFetchedAt,
      source: { metadata: { availableAt: legacyHistoryFetchedAt } },
      raw: { metadata: { availableAt: legacyHistoryFetchedAt } },
    })

    const mismatched = await graph.applyPlan(legacyHistoryPlan('2026-01-04T00:00:00.000Z'), 'test.fixture', 'mismatched Yahoo history')
    expect(mismatched.revision).toBeGreaterThan(before.revision)
    const mismatch = await finance.prepareCompilation({
      runId: 'compile-yahoo-mismatch', sourceIds: [legacyHistorySource], asOf: '2026-01-04T00:00:00.000Z',
    }) as CompilePrepareForTest
    expect(mismatch.rejected).toEqual([expect.objectContaining({ sourceId: legacyHistorySource, code: 'SOURCE_TIME_MISMATCH' })])

    const stored = await graph.snapshot()
    const source = stored.nodes.find(node => node.id === legacyHistorySource)
    const raw = stored.nodes.find(node => node.id === legacyHistoryRaw)
    expect(source?.metadata).toMatchObject({ availableAt: legacyHistoryBarAt, contentHash: legacyHistoryHash })
    expect(raw?.metadata).toMatchObject({ availableAt: legacyHistoryBarAt, contentHash: legacyHistoryHash })
  })

  it('validates prepare input and never invents candidates or session completion', async () => {
    const { finance, graph } = await setup()
    const duplicate = await executeFinanceRequest(finance, {
      op: 'compile.prepare',
      input: { runId: 'compile-invalid', sourceIds: ['source:a', 'source:a'], asOf },
    })
    expect(duplicate.ok).toBe(false)
    expect(duplicate.ok === false && duplicate.error.code).toBe('INVALID_REQUEST')
    const empty = await executeFinanceRequest(finance, { op: 'compile.status', input: { runId: 'compile-unknown' } })
    expect(empty.ok).toBe(true)
    expect(empty.ok && empty.result).toMatchObject({ status: 'not_found', scope: 'graph-artifacts-only', nodes: [], edges: [] })
    expect(await graph.currentRevision()).toBe(0)
  })

  it('rejects a source/raw pair whose stored lineage differs', async () => {
    const { finance, graph } = await setup()
    const ingested = await finance.ingestSources({ items: [sourceItem()], dryRun: false, runId: 'ingest-mismatch', asOf })
    const sourceId = ingested.sourceIds[0] as string
    const rawId = ingested.rawIds[0] as string
    const raw = await graph.getNode(rawId)
    await graph.updateNode(rawId, { metadata: { ...raw?.metadata, provider: 'fixture.other' } })
    const revision = await graph.currentRevision()
    const prepared = await executeFinanceRequest(finance, {
      op: 'compile.prepare',
      input: { runId: 'compile-mismatch', sourceIds: [sourceId], asOf },
    })
    expect(prepared.ok).toBe(true)
    expect(prepared.ok && prepared.result).toMatchObject({
      candidates: [],
      rejected: [{ sourceId, rawId, code: 'SOURCE_RAW_MISMATCH' }],
    })
    expect(await graph.currentRevision()).toBe(revision)
  })
})
