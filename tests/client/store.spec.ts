/**
 * Workbench-store tests. The gateway under test is the real wire dispatcher
 * over a real `ResearchGraphService` (temp-dir store), so client state
 * transitions are checked against production behavior, not a stubbed graph.
 */
import { mkdir } from 'node:fs/promises'
import { join } from 'node:path'
import { Context } from '@deepseek-ai/cordis'
import { afterEach, describe, expect, it } from 'vitest'
import { executeGraphRequest } from '../../src/protocol.ts'
import { ResearchGraphService, resolveConfig } from '../../src/service.ts'
import { WorkbenchStore, incidentEdges, kindCounts, rankNodes, visibleEdges, visibleNodes } from '../../client/store.ts'
import type { GraphGateway, Translate } from '../../client/store.ts'
import { makeTempDir, writeSkillsFixture } from '../host/fixtures.ts'

const cleanups: (() => Promise<void>)[] = []
afterEach(async () => {
  while (cleanups.length > 0) await cleanups.pop()?.()
})

const t: Translate = (key, params) => params === undefined
  ? key
  : `${key}(${Object.entries(params).map(([name, value]) => `${name}=${String(value)}`).join(',')})`

interface MemoryStorage {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  data: Map<string, string>
}

function memoryStorage(): MemoryStorage {
  const data = new Map<string, string>()
  return { data, getItem: key => data.get(key) ?? null, setItem: (key, value) => { data.set(key, value) } }
}

async function setup(options: { storage?: MemoryStorage } = {}) {
  const temp = await makeTempDir('client-store')
  cleanups.push(temp.cleanup)
  const skillsRoot = join(temp.dir, 'skills')
  await mkdir(skillsRoot, { recursive: true })
  const ctx = new Context()
  const graph = new ResearchGraphService(ctx, resolveConfig({ dataDir: join(temp.dir, 'data'), skillsRoot, autoIndexSkills: false }, skillsRoot))
  const gateway: GraphGateway = { request: request => executeGraphRequest(graph, request) }
  const store = new WorkbenchStore(gateway, t, options.storage)
  return { store, graph, skillsRoot }
}

async function seeded() {
  const rig = await setup()
  await rig.store.load()
  await rig.store.createNode({ id: 'claim:a', kind: 'claim', title: 'Alpha claim', content: 'alpha body' })
  await rig.store.createNode({ id: 'source:b', kind: 'source', title: 'Beta source', content: 'beta body' })
  await rig.store.addEdge({ from: 'claim:a', to: 'source:b', kind: 'based_on' })
  return rig
}

describe('WorkbenchStore', () => {
  it('reveals a linked node through filters without changing persisted graph data', async () => {
    const { store } = await seeded()
    store.setQuery('unrelated')
    store.toggleKind('claim')
    store.toggleEdgeKind('supports')
    store.setMode('history')
    const revision = store.getSnapshot().revision
    expect(store.revealNode('source:b')).toBe(true)
    const state = store.getSnapshot()
    expect(state.mode).toBe('graph')
    expect(state.selectedId).toBe('source:b')
    expect(state.query).toBe('')
    expect(state.kindFilter).toEqual([])
    expect(state.edgeKindFilter).toEqual([])
    expect(state.focusRequest?.nodeId).toBe('source:b')
    expect(state.revision).toBe(revision)
    expect(store.revealNode('source:missing')).toBe(false)
    expect(store.getSnapshot()).toBe(state)
  })

  it('loads the snapshot, assigns positions, and reports stats', async () => {
    const { store } = await seeded()
    const state = store.getSnapshot()
    expect(state.phase).toBe('ready')
    expect(state.nodes.map(node => node.id)).toEqual(['claim:a', 'source:b'])
    expect(state.edges).toHaveLength(1)
    expect(state.revision).toBe(3)
    expect(Object.keys(state.positions).sort()).toEqual(['claim:a', 'source:b'])
  })

  it('surfaces a load failure as a structured error state and recovers on retry', async () => {
    const failing: GraphGateway = { request: async () => ({ ok: false, error: { code: 'NO_SESSION', message: 'no session' } }) }
    const store = new WorkbenchStore(failing, t)
    await store.load()
    expect(store.getSnapshot().phase).toBe('error')
    expect(store.getSnapshot().error).toEqual({ code: 'NO_SESSION', message: 'no session' })

    const { store: healthy } = await setup()
    await healthy.load()
    expect(healthy.getSnapshot().phase).toBe('ready')
  })

  it('creates, updates, and removes nodes through the wire, closing dialogs on success', async () => {
    const { store } = await seeded()
    store.openEditor({ kind: 'create' })
    const created = await store.createNode({ kind: 'question', title: 'What next?', content: 'q body' })
    expect(created).toBe(true)
    let state = store.getSnapshot()
    expect(state.editor).toBeNull()
    expect(state.nodes.some(node => node.id === 'question:what-next')).toBe(true)
    expect(state.revision).toBe(4)

    store.openEditor({ kind: 'edit', id: 'claim:a' })
    await store.updateNode('claim:a', { title: 'Alpha revised' })
    state = store.getSnapshot()
    expect(state.editor).toBeNull()
    expect(state.nodes.find(node => node.id === 'claim:a')?.title).toBe('Alpha revised')

    store.select('claim:a')
    store.confirmRemove('claim:a')
    expect(store.getSnapshot().removing).toEqual({ id: 'claim:a', cascade: true })
    await store.removeNode('claim:a')
    state = store.getSnapshot()
    expect(state.removing).toBeNull()
    expect(state.selectedId).toBeNull()
    expect(state.nodes.some(node => node.id === 'claim:a')).toBe(false)
    expect(state.edges).toHaveLength(0)
  })

  it('keeps the dialog open and reports the error when a mutation fails', async () => {
    const { store } = await seeded()
    store.openEditor({ kind: 'create' })
    const created = await store.createNode({ id: 'claim:a', kind: 'claim', title: 'duplicate' })
    expect(created).toBe(false)
    const state = store.getSnapshot()
    expect(state.editor).toEqual({ kind: 'create' })
    expect(state.notice?.tone).toBe('error')
    expect(state.notice?.text).toContain('DUPLICATE_NODE')
  })

  it('adds and removes edges, clearing an edge selection that disappears', async () => {
    const { store } = await seeded()
    const edgeId = 'based_on:claim:a→source:b'
    store.selectEdge(edgeId)
    expect(store.getSnapshot().selectedEdgeId).toBe(edgeId)
    await store.removeEdge(edgeId)
    expect(store.getSnapshot().selectedEdgeId).toBeNull()
    expect(store.getSnapshot().edges).toHaveLength(0)

    store.openLinking('source:b')
    await store.addEdge({ from: 'source:b', to: 'claim:a', kind: 'supports' })
    const state = store.getSnapshot()
    expect(state.linking).toBeNull()
    expect(state.edges.map(edge => edge.id)).toEqual(['supports:source:b→claim:a'])
  })

  it('filters by query and kind, ranking title matches first', async () => {
    const { store } = await seeded()
    expect(visibleNodes(store.getSnapshot()).map(node => node.id)).toEqual(['claim:a', 'source:b'])

    store.setQuery('alpha')
    let visible = visibleNodes(store.getSnapshot())
    expect(visible.map(node => node.id)).toEqual(['claim:a'])
    expect(visibleEdges(store.getSnapshot(), visible)).toEqual([])

    store.setQuery('body')
    expect(visibleNodes(store.getSnapshot()).map(node => node.id)).toEqual(['claim:a', 'source:b'])

    store.setQuery('')
    store.toggleKind('source')
    expect(visibleNodes(store.getSnapshot()).map(node => node.id)).toEqual(['source:b'])
    store.toggleKind('source')
    store.toggleEdgeKind('based_on')
    expect(visibleEdges(store.getSnapshot(), visibleNodes(store.getSnapshot()))).toHaveLength(1)
    store.toggleEdgeKind('based_on')
    store.clearFilters()
    expect(store.getSnapshot().query).toBe('')
  })

  it('ranks exact title matches above content mentions', async () => {
    const { store } = await setup()
    await store.load()
    await store.createNode({ id: 'claim:x', kind: 'claim', title: 'Delta', content: 'mentions alpha' })
    await store.createNode({ id: 'claim:y', kind: 'claim', title: 'Alpha', content: 'nothing' })
    const ranked = rankNodes(store.getSnapshot().nodes, 'alpha')
    expect(ranked.map(node => node.id)).toEqual(['claim:y', 'claim:x'])
    expect(kindCounts(store.getSnapshot().nodes).get('claim')).toBe(2)
  })

  it('loads history lazily in history mode and inspects per-revision and range diffs', async () => {
    const { store } = await seeded()
    expect(store.getSnapshot().history).toBeNull()
    store.setMode('history')
    await new Promise(resolve => setImmediate(resolve))
    const state = store.getSnapshot()
    expect(state.history?.map(entry => entry.op)).toEqual(['node.create', 'node.create', 'edge.add'])
    expect(state.earliestRetainedRevision).toBe(0)

    await store.inspectDiff(1, 2)
    expect(store.getSnapshot().diff?.value.nodesAdded).toEqual(['source:b'])

    await store.inspectDiff(0)
    const range = store.getSnapshot().diff
    expect(range?.from).toBe(0)
    expect(range?.to).toBe(3)
    expect([...range?.value.nodesAdded ?? []].sort()).toEqual(['claim:a', 'source:b'])
    expect(range?.value.edgesAdded).toEqual(['based_on:claim:a→source:b'])
    store.clearDiff()
    expect(store.getSnapshot().diff).toBeNull()
  })

  it('loads the audit in audit mode and reports orphans', async () => {
    const { store } = await seeded()
    await store.createNode({ id: 'memory:lonely', kind: 'memory', title: 'alone' })
    store.setMode('audit')
    await new Promise(resolve => setImmediate(resolve))
    const audit = store.getSnapshot().audit
    expect(audit?.orphans).toEqual(['memory:lonely'])
    expect(audit?.brokenEdges).toEqual([])
  })

  it('refreshes history and audit after a mutation in their active modes', async () => {
    const { store } = await seeded()
    store.setMode('history')
    await new Promise(resolve => setImmediate(resolve))
    await store.inspectDiff(0, 1)
    await store.createNode({ id: 'memory:new', kind: 'memory', title: 'new history' })
    expect(store.getSnapshot().history).toHaveLength(4)
    expect(store.getSnapshot().history?.at(-1)?.op).toBe('node.create')
    expect(store.getSnapshot().diff).toBeNull()

    store.setMode('audit')
    await new Promise(resolve => setImmediate(resolve))
    await store.createNode({ id: 'memory:orphan', kind: 'memory', title: 'new orphan' })
    expect(store.getSnapshot().audit?.orphans).toContain('memory:orphan')
  })

  it('rebuilds skills and exports the markdown mirror with a counted notice', async () => {
    const { store, skillsRoot } = await setup()
    await writeSkillsFixture(skillsRoot)
    await store.load()
    expect(await store.rebuildSkills()).toBe(true)
    expect(store.getSnapshot().notice?.text).toBe('notice.rebuilt')
    expect(store.getSnapshot().nodes.length).toBeGreaterThan(0)

    expect(await store.exportMarkdown()).toBe(true)
    expect(store.getSnapshot().notice?.text).toContain('notice.exported(count=')
  })

  it('computes incident edges for the inspector', async () => {
    const { store } = await seeded()
    const { out, incoming } = incidentEdges(store.getSnapshot().edges, 'claim:a')
    expect(out.map(edge => edge.id)).toEqual(['based_on:claim:a→source:b'])
    expect(incidentEdges(store.getSnapshot().edges, 'source:b').incoming.map(edge => edge.id)).toEqual(['based_on:claim:a→source:b'])
    expect(out).toHaveLength(1)
    expect(incoming).toHaveLength(0)
  })

  it('pins dragged positions and restores them across store instances', async () => {
    const storage = memoryStorage()
    const { store } = await setup({ storage })
    await store.load()
    await store.createNode({ id: 'claim:p', kind: 'claim', title: 'Pinned' })
    store.moveNode('claim:p', { x: 321, y: -123 })
    store.persistLayout()
    expect(storage.data.size).toBe(1)

    const reopened = (await setup({ storage })).store
    expect(reopened.pinnedPositions.get('claim:p')).toEqual({ x: 321, y: -123 })
  })

  it('resets the layout, dropping pinned positions', async () => {
    const storage = memoryStorage()
    const { store } = await seededWithStorage(storage)
    store.moveNode('claim:a', { x: 5, y: 5 })
    store.resetLayout()
    expect(JSON.parse(storage.data.get('dsh-research-graph.layout.v1') ?? '{}')).toEqual({})
    expect(store.getSnapshot().positions['claim:a']).not.toEqual({ x: 5, y: 5 })
  })

  it('drops the selection when the selected node vanishes from a reload', async () => {
    const { store, graph } = await seeded()
    store.select('claim:a')
    await graph.removeNode('claim:a', true)
    await store.load()
    expect(store.getSnapshot().selectedId).toBeNull()
  })
})

/** Helper: a rig seeded with the two-node graph and a shared storage. */
async function seededWithStorage(storage: MemoryStorage) {
  const rig = await setup({ storage })
  await rig.store.load()
  await rig.store.createNode({ id: 'claim:a', kind: 'claim', title: 'Alpha claim' })
  await rig.store.createNode({ id: 'source:b', kind: 'source', title: 'Beta source' })
  await rig.store.addEdge({ from: 'claim:a', to: 'source:b', kind: 'based_on' })
  return rig
}
