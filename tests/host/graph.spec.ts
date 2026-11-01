import { describe, expect, it } from 'vitest'
import { GraphEngine, GraphError, NODE_KINDS, EDGE_KINDS, edgeIdOf } from '../../src/graph.ts'

function engine(): GraphEngine {
  let tick = 0
  return new GraphEngine(() => ++tick)
}

describe('GraphEngine', () => {
  it('admits every required node and edge kind', () => {
    expect(NODE_KINDS).toEqual([
      'skill', 'reference', 'persona', 'script', 'signal', 'source', 'raw',
      'session', 'claim', 'question', 'belief', 'memory', 'deliverable',
      'instrument', 'portfolio', 'position', 'valuation', 'catalyst', 'prediction',
    ])
    expect(EDGE_KINDS).toEqual([
      'references', 'depends_on', 'supports', 'contradicts', 'tensions', 'cite', 'update',
      'reason', 'contain', 'based_on', 'seeks', 'answers', 'supersedes', 'derived_from',
      'informed_by', 'produces', 'uses', 'holds', 'exposure_to', 'values', 'catalyzes', 'resolves',
    ])
  })

  it('creates, reads, updates, and removes nodes', () => {
    const g = engine()
    const { node } = g.createNode({ id: 'claim:a', kind: 'claim', title: 'A', content: 'body' })
    expect(g.getNode('claim:a')).toEqual(node)
    const updated = g.updateNode('claim:a', { title: 'A2' })
    expect(updated.node.title).toBe('A2')
    expect(updated.node.createdAt).toBe(node.createdAt)
    expect(updated.node.updatedAt).toBeGreaterThan(node.createdAt)
    expect(updated.diff.nodesUpdated).toEqual([{ id: 'claim:a', fields: ['title'] }])
    expect(g.removeNode('claim:a').nodesRemoved).toEqual(['claim:a'])
    expect(g.getNode('claim:a')).toBeUndefined()
  })

  it('derives an id from kind and title when omitted', () => {
    const g = engine()
    expect(g.createNode({ kind: 'signal', title: 'CPU 回归' }).node.id).toBe('signal:cpu-回归')
    expect(g.createNode({ kind: 'signal', title: 'CPU 回归' }).node.id).toBe('signal:cpu-回归-2')
  })

  it('rejects duplicate nodes, unknown kinds, and empty titles', () => {
    const g = engine()
    g.createNode({ id: 'a', kind: 'claim', title: 'A' })
    expect(() => g.createNode({ id: 'a', kind: 'claim', title: 'A' })).toThrowError(GraphError)
    expect(() => g.createNode({ kind: 'nope' as never, title: 'A' })).toThrowError(GraphError)
    expect(() => g.createNode({ kind: 'claim', title: ' ' })).toThrowError(GraphError)
    expect(() => g.createNode({ id: 'has space', kind: 'claim', title: 'A' })).toThrowError(GraphError)
  })

  it('rejects dangling edges, self edges, and duplicate edges', () => {
    const g = engine()
    g.createNode({ id: 'a', kind: 'claim', title: 'A' })
    expect(() => g.addEdge({ from: 'a', to: 'missing', kind: 'supports' })).toThrowError(GraphError)
    expect(() => g.addEdge({ from: 'missing', to: 'a', kind: 'supports' })).toThrowError(GraphError)
    expect(() => g.addEdge({ from: 'a', to: 'a', kind: 'supports' })).toThrowError(GraphError)
    g.createNode({ id: 'b', kind: 'source', title: 'B' })
    g.addEdge({ from: 'a', to: 'b', kind: 'supports' })
    expect(() => g.addEdge({ from: 'a', to: 'b', kind: 'supports' })).toThrowError(GraphError)
    expect(() => g.addEdge({ from: 'a', to: 'b', kind: 'nope' as never })).toThrowError(GraphError)
  })

  it('refuses to remove a node with incident edges unless cascading', () => {
    const g = engine()
    g.createNode({ id: 'a', kind: 'claim', title: 'A' })
    g.createNode({ id: 'b', kind: 'source', title: 'B' })
    g.addEdge({ from: 'a', to: 'b', kind: 'based_on' })
    expect(() => g.removeNode('a')).toThrowError(GraphError)
    const diff = g.removeNode('a', true)
    expect(diff.nodesRemoved).toEqual(['a'])
    expect(diff.edgesRemoved).toEqual([edgeIdOf('a', 'b', 'based_on')])
    expect(g.edges.size).toBe(0)
  })

  it('validates metadata.references against existing nodes', () => {
    const g = engine()
    expect(() => g.createNode({ kind: 'claim', title: 'A', metadata: { references: ['ghost'] } })).toThrowError(GraphError)
    g.createNode({ id: 'real', kind: 'source', title: 'R' })
    g.createNode({ id: 'ok', kind: 'claim', title: 'A', metadata: { references: ['real'] } })
    expect(() => g.updateNode('ok', { metadata: { references: ['ghost'] } })).toThrowError(GraphError)
  })

  it('searches title, content, and metadata including CJK phrases', () => {
    const g = engine()
    g.createNode({ id: 's1', kind: 'signal', title: 'CPU 回归信号', content: '关于良率' })
    g.createNode({ id: 's2', kind: 'source', title: '财报', content: '管理层讨论 CPU 回归 的可能性', metadata: { region: 'cn' } })
    g.createNode({ id: 's3', kind: 'memory', title: 'unrelated', content: 'nothing' })
    const hits = g.search('CPU 回归')
    expect(hits.map(hit => hit.node.id)).toEqual(['s1', 's2'])
    expect(hits[0]?.matches).toContain('title')
    expect(g.search('region').map(hit => hit.node.id)).toEqual(['s2'])
    expect(g.search('').length).toBe(0)
    expect(g.search('CPU', { kinds: ['source'] }).map(hit => hit.node.id)).toEqual(['s2'])
    expect(g.search('CPU', { limit: 1 }).length).toBe(1)
  })

  it('computes backlinks with resolved source nodes', () => {
    const g = engine()
    g.createNode({ id: 'q', kind: 'question', title: 'Q' })
    g.createNode({ id: 'c', kind: 'claim', title: 'C' })
    g.addEdge({ from: 'c', to: 'q', kind: 'answers' })
    const links = g.backlinks('q')
    expect(links.length).toBe(1)
    expect(links[0]?.edge.kind).toBe('answers')
    expect(links[0]?.from?.id).toBe('c')
    expect(() => g.backlinks('ghost')).toThrowError(GraphError)
  })

  it('audits broken edges, dangling metadata references, unresolved refs, and orphans', () => {
    const g = engine()
    g.createNode({ id: 'a', kind: 'claim', title: 'A' })
    g.createNode({ id: 'b', kind: 'source', title: 'B' })
    g.addEdge({ from: 'a', to: 'b', kind: 'cite' })
    g.createNode({ id: 'lonely', kind: 'memory', title: 'L', metadata: { unresolvedRefs: ['gone.md'] } })
    // Simulate a hand-edited restore: dangling edge + broken metadata reference.
    g.restore(
      [
        { id: 'a', kind: 'claim', title: 'A', content: '', metadata: { references: ['ghost'] }, createdAt: 1, updatedAt: 1 },
        { id: 'lonely', kind: 'memory', title: 'L', content: '', metadata: { unresolvedRefs: ['gone.md'] }, createdAt: 1, updatedAt: 1 },
      ],
      [{ id: edgeIdOf('a', 'missing', 'cite'), from: 'a', to: 'missing', kind: 'cite', metadata: {}, createdAt: 1 }],
    )
    const audit = g.audit()
    expect(audit.brokenEdges.map(edge => edge.id)).toEqual([edgeIdOf('a', 'missing', 'cite')])
    expect(audit.brokenRefs).toEqual([{ node: 'a', reference: 'ghost' }])
    expect(audit.unresolvedRefs).toEqual([{ node: 'lonely', target: 'gone.md' }])
    expect(audit.orphans).toContain('lonely')
  })

  it('summarizes stats grouped by kind', () => {
    const g = engine()
    g.createNode({ id: 'a', kind: 'claim', title: 'A' })
    g.createNode({ id: 'b', kind: 'claim', title: 'B' })
    g.addEdge({ from: 'a', to: 'b', kind: 'supports' })
    const stats = g.stats(7)
    expect(stats).toMatchObject({ revision: 7, nodes: 2, edges: 1, nodesByKind: { claim: 2 }, edgesByKind: { supports: 1 } })
  })
})
