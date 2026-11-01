import { readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { emptyDiff, GraphError } from '../../src/graph.ts'
import { GraphStore, GRAPH_SCHEMA_VERSION } from '../../src/store.ts'
import { makeTempDir } from './fixtures.ts'

/** Sync GraphError code capture. */
function errorCode(run: () => unknown): string | undefined {
  try {
    run()
    return undefined
  } catch (error: unknown) {
    return error instanceof GraphError ? error.code : undefined
  }
}

/** Async GraphError code capture. */
async function errorCodeOf(promise: Promise<unknown>): Promise<string | undefined> {
  try {
    await promise
    return undefined
  } catch (error: unknown) {
    return error instanceof GraphError ? error.code : undefined
  }
}

const cleanups: (() => Promise<void>)[] = []
afterEach(async () => {
  while (cleanups.length > 0) await cleanups.pop()?.()
})

async function openStore(options: { historyLimit?: number } = {}) {
  const temp = await makeTempDir('store')
  cleanups.push(temp.cleanup)
  let tick = 0
  const store = await GraphStore.open(temp.dir, { now: () => ++tick, ...options })
  return { store, dir: temp.dir }
}

describe('GraphStore', () => {
  it('starts empty when the file is missing and persists atomically', async () => {
    const { store, dir } = await openStore()
    expect(store.currentRevision).toBe(0)
    await store.mutate('node.create', 'create', () => {
      const { node, diff } = store.engine.createNode({ id: 'a', kind: 'claim', title: 'A' })
      return { diff, result: node }
    })
    const text = await readFile(join(dir, 'graph.json'), 'utf8')
    const parsed = JSON.parse(text) as { schemaVersion: number; revision: number }
    expect(parsed.schemaVersion).toBe(GRAPH_SCHEMA_VERSION)
    expect(parsed.revision).toBe(1)
    const reopened = await GraphStore.open(dir)
    expect(reopened.currentRevision).toBe(1)
    expect(reopened.engine.getNode('a')?.title).toBe('A')
    expect(reopened.revisions.length).toBe(1)
  })

  it('treats empty diffs as no-ops without history or durable writes', async () => {
    const { store, dir } = await openStore()
    const file = join(dir, 'graph.json')
    const empty = await store.mutate('node.update', 'noop', () => ({ diff: emptyDiff(), result: 'unchanged' }))
    expect(empty.revision).toBe(0)
    expect(empty.result).toBe('unchanged')
    expect(store.currentRevision).toBe(0)
    expect(store.revisions).toEqual([])
    await expect(readFile(file, 'utf8')).rejects.toMatchObject({ code: 'ENOENT' })

    await store.mutate('node.create', 'create', () => ({ diff: store.engine.createNode({ id: 'a', kind: 'claim', title: 'A' }).diff, result: undefined }))
    const persisted = await readFile(file, 'utf8')
    const repeated = await store.mutate('node.update', 'same title', () => {
      const { node, diff } = store.engine.updateNode('a', { title: 'A' })
      return { diff, result: node }
    })
    expect(repeated.revision).toBe(1)
    expect(store.revisions).toHaveLength(1)
    expect(await readFile(file, 'utf8')).toBe(persisted)

    const reopened = await GraphStore.open(dir)
    const afterRestart = await reopened.mutate('node.update', 'same title', () => {
      const { node, diff } = reopened.engine.updateNode('a', { title: 'A' })
      return { diff, result: node }
    })
    expect(afterRestart.revision).toBe(1)
    expect(reopened.currentRevision).toBe(1)
    expect(reopened.revisions).toHaveLength(1)
  })

  it('bumps one revision per mutation and records op, summary, and diff', async () => {
    const { store } = await openStore()
    await store.mutate('node.create', 'a', () => ({ diff: store.engine.createNode({ id: 'a', kind: 'claim', title: 'A' }).diff, result: undefined }))
    await store.mutate('node.create', 'b', () => ({ diff: store.engine.createNode({ id: 'b', kind: 'source', title: 'B' }).diff, result: undefined }))
    await store.mutate('edge.add', 'a->b', () => ({ diff: store.engine.addEdge({ from: 'a', to: 'b', kind: 'supports' }).diff, result: undefined }))
    expect(store.currentRevision).toBe(3)
    expect(store.revisions.map(entry => entry.op)).toEqual(['node.create', 'node.create', 'edge.add'])
    const diff = store.diffRevisions(1, 3)
    expect(diff.nodesAdded).toEqual(['b'])
    expect(diff.edgesAdded.length).toBe(1)
    const all = store.diffRevisions(0)
    expect([...all.nodesAdded].sort()).toEqual(['a', 'b'])
  })

  it('serializes concurrent mutations so revisions never interleave', async () => {
    const { store } = await openStore()
    await Promise.all(
      Array.from({ length: 20 }, (_, index) =>
        store.mutate('node.create', `n${index}`, () => ({ diff: store.engine.createNode({ kind: 'raw', title: `n${index}` }).diff, result: undefined }))),
    )
    expect(store.currentRevision).toBe(20)
    expect(store.engine.nodes.size).toBe(20)
    expect(store.revisions.map(entry => entry.revision)).toEqual(Array.from({ length: 20 }, (_, i) => i + 1))
  })

  it('trims history at the cap and fails truncated diff ranges loudly', async () => {
    const { store } = await openStore({ historyLimit: 3 })
    for (let index = 0; index < 5; index += 1) {
      await store.mutate('node.create', `n${index}`, () => ({ diff: store.engine.createNode({ id: `n${index}`, kind: 'raw', title: `n${index}` }).diff, result: undefined }))
    }
    expect(store.currentRevision).toBe(5)
    expect(store.revisions.length).toBe(3)
    expect(store.earliestRetainedRevision).toBe(2)
    expect(errorCode(() => store.diffRevisions(0))).toBe('HISTORY_TRUNCATED')
    expect(store.diffRevisions(3, 5).nodesAdded).toEqual(['n3', 'n4'])
    expect(errorCode(() => store.diffRevisions(6))).toBe('INVALID_REVISION_RANGE')
  })

  it('migrates a pre-versioned v0 file', async () => {
    const temp = await makeTempDir('v0')
    cleanups.push(temp.cleanup)
    const node = { id: 'a', kind: 'claim', title: 'A', content: '', metadata: {}, createdAt: 1, updatedAt: 1 }
    await writeFile(join(temp.dir, 'graph.json'), JSON.stringify({ nodes: [node], edges: [] }), 'utf8')
    const store = await GraphStore.open(temp.dir)
    expect(store.engine.getNode('a')?.title).toBe('A')
    expect(store.currentRevision).toBe(0)
  })

  it('rejects a newer schema version and corrupt JSON loudly', async () => {
    const temp = await makeTempDir('corrupt')
    cleanups.push(temp.cleanup)
    await writeFile(join(temp.dir, 'graph.json'), JSON.stringify({ schemaVersion: GRAPH_SCHEMA_VERSION + 1 }), 'utf8')
    expect(await errorCodeOf(GraphStore.open(temp.dir))).toBe('STORE_VERSION_AHEAD')
    await writeFile(join(temp.dir, 'graph.json'), '{not json', 'utf8')
    expect(await errorCodeOf(GraphStore.open(temp.dir))).toBe('STORE_CORRUPT')
    await writeFile(join(temp.dir, 'graph.json'), JSON.stringify({ schemaVersion: 1, nodes: [], edges: [], history: [], revision: 0 }), 'utf8')
    expect(await errorCodeOf(GraphStore.open(temp.dir))).toBe('STORE_CORRUPT')
  })

  it('rejects invalid historyLimit at open', async () => {
    const temp = await makeTempDir('cfg')
    cleanups.push(temp.cleanup)
    expect(await errorCodeOf(GraphStore.open(temp.dir, { historyLimit: 0 }))).toBe('INVALID_CONFIG')
  })
})
