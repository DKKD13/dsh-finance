import { afterEach, describe, expect, it } from 'vitest'
import { GraphError } from '../../src/graph.ts'
import { GraphStore } from '../../src/store.ts'
import type { GraphPlan } from '../../src/plan.ts'
import { makeTempDir } from './fixtures.ts'

const cleanups: (() => Promise<void>)[] = []
afterEach(async () => {
  while (cleanups.length > 0) await cleanups.pop()?.()
})

async function openStore() {
  const temp = await makeTempDir('plan')
  cleanups.push(temp.cleanup)
  let tick = 0
  return { store: await GraphStore.open(temp.dir, { now: () => ++tick }), dir: temp.dir }
}

describe('atomic GraphPlan', () => {
  it('upserts forward references and edges in one restartable revision, then replays as a no-op', async () => {
    const { store, dir } = await openStore()
    const plan = {
      nodes: [
        { id: 'claim:a', kind: 'claim' as const, title: 'A', metadata: { references: ['source:b'], runId: 'r1' } },
        { id: 'source:b', kind: 'source' as const, title: 'B' },
      ],
      edges: [{ from: 'claim:a', to: 'source:b', kind: 'based_on' as const, metadata: { runId: 'r1' } }],
    }
    const first = await store.applyPlan('finance.test', 'test plan', plan)
    expect(first.revision).toBe(1)
    expect(first.result.changed).toBe(true)
    expect(store.engine.getNode('claim:a')?.metadata.references).toEqual(['source:b'])
    expect(store.revisions.map(entry => entry.op)).toEqual(['finance.test'])

    const replay = await store.applyPlan('finance.test', 'test plan', plan)
    expect(replay.revision).toBe(1)
    expect(replay.result.changed).toBe(false)
    expect(store.revisions).toHaveLength(1)

    const reopened = await GraphStore.open(dir)
    expect(reopened.currentRevision).toBe(1)
    expect(reopened.engine.getNode('claim:a')?.metadata.runId).toBe('r1')
    expect(reopened.engine.edges.size).toBe(1)
  })

  it('updates changed nodes and edge metadata idempotently', async () => {
    const { store } = await openStore()
    const nodes = [
      { id: 'instrument:a', kind: 'instrument' as const, title: 'A', metadata: { asOf: '2026-01-01' } },
      { id: 'valuation:a', kind: 'valuation' as const, title: 'V', metadata: { references: ['instrument:a'] } },
    ]
    await store.applyPlan('finance.model', 'initial', { nodes, edges: [{ from: 'valuation:a', to: 'instrument:a', kind: 'values', metadata: { weight: 1 } }] })
    const updated = await store.applyPlan('finance.model', 'updated', {
      nodes: nodes.map(node => ({ ...node, metadata: { ...node.metadata, asOf: '2026-01-02' } })),
      edges: [{ from: 'valuation:a', to: 'instrument:a', kind: 'values', metadata: { weight: 2 } }],
    })
    expect(updated.revision).toBe(2)
    expect(updated.diff.edgesAdded).toHaveLength(1)
    expect(updated.diff.edgesRemoved).toHaveLength(1)
    expect(store.engine.getNode('valuation:a')?.metadata.asOf).toBe('2026-01-02')
    expect([...store.engine.edges.values()][0]?.metadata.weight).toBe(2)
  })

  it('rejects the whole plan on dangling references, edges, and kind conflicts', async () => {
    const { store } = await openStore()
    const invalidPlans: readonly (readonly [GraphPlan, string])[] = [
      [{ nodes: [{ id: 'claim:new', kind: 'claim', title: 'new', metadata: { references: ['ghost'] } }], edges: [] }, 'MISSING_NODE'],
      [{ nodes: [{ id: 'claim:new', kind: 'claim', title: 'new' }], edges: [{ from: 'claim:new', to: 'ghost', kind: 'supports' }] }, 'MISSING_NODE'],
    ]
    for (const [plan, code] of invalidPlans) {
      try {
        await store.applyPlan('finance.invalid', 'invalid', plan)
        expect.unreachable('invalid plan must throw')
      } catch (error: unknown) {
        expect(error).toBeInstanceOf(GraphError)
        expect((error as GraphError).code).toBe(code)
      }
      expect(store.currentRevision).toBe(0)
      expect(store.engine.nodes.size).toBe(0)
    }
    await store.applyPlan('finance.valid', 'valid', { nodes: [{ id: 'claim:a', kind: 'claim', title: 'A' }], edges: [] })
    await expect(store.applyPlan('finance.invalid', 'conflict', {
      nodes: [{ id: 'claim:a', kind: 'source', title: 'A' }], edges: [],
    })).rejects.toMatchObject({ code: 'NODE_KIND_CONFLICT' })
    expect(store.currentRevision).toBe(1)
    expect(store.engine.getNode('claim:a')?.kind).toBe('claim')
  })
})
