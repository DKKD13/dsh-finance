import { join } from 'node:path'
import { Context } from '@deepseek-ai/cordis'
import { afterEach, describe, expect, it } from 'vitest'
import type { SearchHit } from '../../src/graph.ts'
import { executeFinanceRequest, FINANCE_OPS } from '../../src/finance/protocol.ts'
import { FinanceService } from '../../src/finance/service.ts'
import type { GraphPlan } from '../../src/plan.ts'
import { ResearchGraphService, resolveConfig } from '../../src/service.ts'
import { makeTempDir } from './fixtures.ts'

const cleanups: (() => Promise<void>)[] = []
afterEach(async () => {
  while (cleanups.length > 0) await cleanups.pop()?.()
})

const asOf = '2026-02-01T00:00:00.000Z'
const hypothesisId = 'claim:compile:original:h1'
const supportingId = 'raw:old-support'
const contradictingId = 'raw:old-contradiction'
const runId = 'review-no-new-evidence'
const sessionId = `session:review:${runId}`
const deliverableId = `deliverable:review:${runId}`

async function setup() {
  const temp = await makeTempDir('finance-review')
  cleanups.push(temp.cleanup)
  const graph = new ResearchGraphService(new Context(), resolveConfig({
    dataDir: join(temp.dir, 'data'),
    autoIndexSkills: false,
  }, join(temp.dir, 'skills')))
  const finance = new FinanceService(new Context(), graph)
  return { finance, graph }
}

function originalPlan(): GraphPlan {
  const evidenceMetadata = {
    provider: 'fixture.evidence',
    asOf: '2026-01-10T00:00:00.000Z',
    availableAt: '2026-01-10T00:00:00.000Z',
  }
  return {
    nodes: [
      {
        id: supportingId,
        kind: 'raw',
        title: 'Original support',
        content: 'The original disclosure supports the hypothesis.',
        metadata: { ...evidenceMetadata, contentHash: 'sha256:support' },
      },
      {
        id: contradictingId,
        kind: 'raw',
        title: 'Original contradiction',
        content: 'A same-upstream report qualifies the hypothesis.',
        metadata: { ...evidenceMetadata, contentHash: 'sha256:contradiction' },
      },
      {
        id: hypothesisId,
        kind: 'claim',
        title: 'Original hypothesis',
        content: 'The original hypothesis remains unchanged by a review.',
        metadata: {
          ...evidenceMetadata,
          claimType: 'hypothesis',
          confidence: { level: 'low', rationale: 'one upstream evidence group' },
          killCriteria: ['Same-scope evidence disproves the mechanism.'],
          evidence: [
            { rawId: supportingId, relation: 'supports', independence: { group: 'upstream-a' } },
            { rawId: contradictingId, relation: 'contradicts', independence: { group: 'upstream-a' } },
          ],
          references: [supportingId, contradictingId],
        },
      },
    ],
    edges: [
      { from: hypothesisId, to: supportingId, kind: 'cite' },
      { from: hypothesisId, to: supportingId, kind: 'derived_from' },
      { from: hypothesisId, to: contradictingId, kind: 'cite' },
      { from: supportingId, to: hypothesisId, kind: 'supports' },
      { from: contradictingId, to: hypothesisId, kind: 'contradicts', metadata: { independence: 0 } },
    ],
  }
}

function reviewPlan(): GraphPlan {
  const lineage = { runId, reviewOf: hypothesisId, asOf, provider: 'hypothesis-thinking' }
  const references = [hypothesisId, supportingId, contradictingId]
  return {
    nodes: [
      {
        id: sessionId,
        kind: 'session',
        title: `Hypothesis review ${runId}`,
        content: 'Reviewed the original hypothesis and its two existing evidence relations; confirmed no new evidence.',
        metadata: { ...lineage, status: 'reviewed', references: [...references, deliverableId] },
      },
      {
        id: deliverableId,
        kind: 'deliverable',
        title: `Review of ${hypothesisId}`,
        content: '# Hypothesis review\n\nNo new evidence. Confidence is unchanged; the same-upstream contradiction is not independent corroboration.',
        metadata: {
          ...lineage,
          status: 'reviewed',
          confidenceBefore: { level: 'low', rationale: 'one upstream evidence group' },
          confidenceAfter: { level: 'low', rationale: 'one upstream evidence group' },
          killCriteria: ['Same-scope evidence disproves the mechanism.'],
          evidenceGaps: ['No new evidence; contradiction independence remains limited to one upstream group.'],
          references: [...references, sessionId],
        },
      },
    ],
    edges: [
      { from: sessionId, to: deliverableId, kind: 'produces', metadata: lineage },
      { from: deliverableId, to: hypothesisId, kind: 'derived_from', metadata: lineage },
      { from: deliverableId, to: supportingId, kind: 'cite', metadata: lineage },
      { from: deliverableId, to: contradictingId, kind: 'cite', metadata: lineage },
    ],
  }
}

describe('hypothesis review host contract', () => {
  it('uses the existing 24 ops to persist one isolated review without overwriting the hypothesis or inventing a version', async () => {
    const { finance, graph } = await setup()
    expect(FINANCE_OPS).toHaveLength(28)
    expect(FINANCE_OPS).toEqual(expect.arrayContaining(['fund.state', 'fund.configure', 'fund.researcher', 'fund.advance']))
    expect(FINANCE_OPS).not.toContain('review.status')

    const original = await executeFinanceRequest(finance, { op: 'graph.plan', plan: originalPlan() })
    expect(original.ok).toBe(true)
    expect(original.ok && original.revision).toBe(1)
    const before = await graph.getNode(hypothesisId)
    expect((await graph.backlinks(hypothesisId)).map(link => link.edge.kind)).toEqual(['contradicts', 'supports'])
    expect((await graph.backlinks(supportingId)).map(link => link.edge.kind)).toEqual(['cite', 'derived_from'])

    const applied = await executeFinanceRequest(finance, { op: 'graph.plan', plan: reviewPlan() })
    expect(applied.ok).toBe(true)
    expect(applied.ok && applied.revision).toBe(2)
    expect(applied.ok && JSON.stringify(applied.result)).toContain('"changed":true')
    expect(await graph.getNode(hypothesisId)).toEqual(before)

    const review = await graph.getNode(deliverableId)
    expect(review?.metadata).toMatchObject({
      runId,
      reviewOf: hypothesisId,
      status: 'reviewed',
      confidenceBefore: { level: 'low' },
      confidenceAfter: { level: 'low' },
      killCriteria: ['Same-scope evidence disproves the mechanism.'],
      evidenceGaps: ['No new evidence; contradiction independence remains limited to one upstream group.'],
    })
    expect(review?.metadata.contentHash).toMatch(/^sha256:[a-f0-9]{64}$/)
    expect((await graph.backlinks(deliverableId)).map(link => `${link.edge.kind}:${link.edge.from}`)).toEqual([`produces:${sessionId}`])
    expect((await graph.backlinks(hypothesisId)).some(link => link.edge.kind === 'derived_from' && link.edge.from === deliverableId)).toBe(true)
    expect((await graph.snapshot()).edges.some(edge => edge.kind === 'supersedes')).toBe(false)

    const found = await executeFinanceRequest(finance, {
      op: 'graph.search',
      query: runId,
      kinds: ['session', 'deliverable'],
    })
    expect(found.ok).toBe(true)
    if (found.ok) {
      const hits = found.result as unknown as SearchHit[]
      expect(hits.filter(hit => hit.node.metadata.runId === runId && hit.node.metadata.reviewOf === hypothesisId).map(hit => hit.node.id).sort())
        .toEqual([deliverableId, sessionId].sort())
    }

    const replay = await executeFinanceRequest(finance, { op: 'graph.plan', plan: reviewPlan() })
    expect(replay.ok).toBe(true)
    expect(replay.ok && replay.revision).toBe(2)
    expect(replay.ok && JSON.stringify(replay.result)).toContain('"changed":false')
    expect((await graph.revisions()).map(entry => entry.op)).toEqual(['finance.graph.plan', 'finance.graph.plan'])
  })

  it('rejects a review with a missing cited node atomically and leaves the original graph untouched', async () => {
    const { finance, graph } = await setup()
    await executeFinanceRequest(finance, { op: 'graph.plan', plan: originalPlan() })
    const before = await graph.snapshot()
    const invalid = reviewPlan()
    const withMissingCite: GraphPlan = {
      ...invalid,
      edges: [...(invalid.edges ?? []), { from: deliverableId, to: 'raw:not-read', kind: 'cite' }],
    }

    const rejected = await executeFinanceRequest(finance, { op: 'graph.plan', plan: withMissingCite })
    expect(rejected.ok).toBe(false)
    expect(rejected.ok === false && rejected.error.code).toBe('MISSING_NODE')
    expect(await graph.currentRevision()).toBe(1)
    expect(await graph.getNode(sessionId)).toBeUndefined()
    expect(await graph.getNode(deliverableId)).toBeUndefined()
    expect(await graph.snapshot()).toEqual(before)
  })
})
