import { describe, expect, it } from 'vitest'
import { NODE_KINDS } from '../../src/graph.ts'
import type { GraphEdge, GraphNode, NodeKind } from '../../src/graph.ts'
import {
  filterLibraryEntries,
  filterLibraryNodes,
  isLibraryTechnicalNode,
  LIBRARY_GROUPS,
  libraryAiSummary,
  libraryAnnotations,
  libraryEntryForSelection,
  libraryGroupEntries,
  libraryGroupForKind,
  libraryGroupMatchCounts,
  libraryOriginalUrl,
  libraryRelations,
  libraryStatus,
  relatedLibraryNodes,
} from '../../client/library.ts'

function node(id: string, kind: NodeKind, metadata: GraphNode['metadata'] = {}, content = ''): GraphNode {
  return { id, kind, title: id, content, metadata, createdAt: 1, updatedAt: 2 }
}

const source = node('source:1', 'source', {
  provider: 'clipper', status: 'quarantined', availableAt: '2026-01-01T00:00:00Z', topic: 'Finance', tags: ['daily'],
  annotations: [{ exact: 'beta', prefix: 'alpha ', suffix: ' gamma', note: 'Important', tags: ['claim'], locator: { container: 'p' }, annotationHash: 'sha256:a' }],
  provenance: { rawId: 'raw:1', sessionId: 'session:1' },
}, 'https://example.com')
const raw = node('raw:1', 'raw', { provider: 'clipper', sourceId: 'source:1', sessionId: 'session:1', asOf: '2026-01-02T00:00:00Z' }, 'alpha beta gamma')
const session = node('session:1', 'session', { provider: 'finance.ingest', ingestion: { sources: ['source:1'], errors: [{ code: 'PARTIAL' }] } }, '{}')

describe('Library snapshot filtering and lineage', () => {
  it('opens only explicit safe public source links and keeps summaries tied to material versions', () => {
    const material = node('source:filing', 'source', { canonicalUrl: 'javascript:alert(1)', provenance: { canonicalUrl: 'https://example.com/filing' }, contentHash: 'sha256:a', aiSummary: { text: 'A model summary', sourceContentHash: 'sha256:a', model: 'verified-route' } })
    expect(libraryOriginalUrl([material])).toBe('https://example.com/filing')
    expect(libraryOriginalUrl([node('source:file', 'source', { canonicalUrl: 'urn:dsh:document:1' })])).toBeUndefined()
    expect(libraryOriginalUrl([node('source:bad', 'source', { url: 'https://name:secret@example.com' })])).toBeUndefined()
    expect(libraryAiSummary([material])).toEqual({ text: 'A model summary', stale: false, model: 'verified-route' })
    expect(libraryAiSummary([{ ...material, metadata: { ...material.metadata, contentHash: 'sha256:b' } }])?.stale).toBe(true)
    expect(libraryAiSummary([node('source:plain', 'source', { summary: 'An unattributed human snippet' })])).toBeUndefined()
  })
  it('filters real nodes by kind, provider, time/status, and annotation text', () => {
    const nodes = [source, raw, session]
    expect(filterLibraryNodes(nodes, { kind: 'source', query: 'important', provider: 'clipper', status: 'quarantined' })).toEqual([source])
    expect(filterLibraryNodes(nodes, { kind: 'source', query: '2026-01-01', provider: '', status: '' })).toEqual([source])
    expect(filterLibraryNodes(nodes, { kind: 'raw', query: 'beta gamma', provider: '', status: '' })).toEqual([raw])
    expect(filterLibraryNodes(nodes, { kind: 'session', query: 'finance.ingest', provider: '', status: '' })).toEqual([session])
    expect(filterLibraryNodes(nodes, { kind: 'source', query: '', provider: 'other', status: '' })).toEqual([])
    expect(libraryStatus(source)).toBe('quarantined')
  })

  it('resolves source/raw/session relationships without inventing records', () => {
    expect(relatedLibraryNodes(source, [source, raw, session])).toEqual({ source, raw, session })
    expect(relatedLibraryNodes(raw, [source, raw, session])).toEqual({ source, raw, session })
    expect(relatedLibraryNodes(raw, [raw])).toEqual({ raw })
  })

  it('does not inherit another source capture or session through a mismatched raw pointer', () => {
    const a = node('source:a', 'source', { rawId: 'raw:b' }, 'A body')
    const b = node('source:b', 'source')
    const capture = node('reference:b', 'reference', { sourceId: b.id, topic: 'Only B' })
    const foreignSession = node('session:b', 'session', { ingestion: { errors: [{ code: 'ONLY_B' }] } })
    const foreignRaw = node('raw:b', 'raw', { sourceId: b.id, captureId: capture.id, references: [foreignSession.id] }, 'B body')
    expect(relatedLibraryNodes(a, [a, b, capture, foreignSession, foreignRaw])).toEqual({ source: a })
    expect(relatedLibraryNodes(foreignRaw, [a, b, capture, foreignSession, foreignRaw])).toEqual({ source: b, raw: foreignRaw, capture, session: foreignSession })
  })

  it('retains TextQuote, notes, tags, locator, and annotationHash', () => {
    expect(libraryAnnotations([source])).toEqual([{
      exact: 'beta', prefix: 'alpha ', suffix: ' gamma', note: 'Important', tags: ['claim'], locator: { container: 'p' }, annotationHash: 'sha256:a',
    }])
    const nested = node('source:2', 'source', { clip: { annotations: [{ selector: { exact: 'nested' }, note: 'n' }] } })
    expect(libraryAnnotations([nested])[0]).toMatchObject({ exact: 'nested', note: 'n', tags: [] })
  })

  it('assigns every graph kind to exactly one user-facing group', () => {
    const grouped = LIBRARY_GROUPS.map(group => NODE_KINDS.filter(kind => libraryGroupForKind(kind) === group))
    expect(grouped.flat().sort()).toEqual([...NODE_KINDS].sort())
    expect(new Set(grouped.flat()).size).toBe(NODE_KINDS.length)
    for (const kind of NODE_KINDS) expect(grouped.filter(group => group.includes(kind))).toHaveLength(1)
  })

  it('shows a paired source and raw as one material while keeping raw text and raw deep links reachable', () => {
    const entries = libraryGroupEntries([source, raw, session], 'materials')
    expect(entries).toHaveLength(1)
    expect(entries[0]?.primary).toBe(source)
    expect(entries[0]?.members).toEqual(expect.arrayContaining([source, raw]))
    expect(filterLibraryEntries(entries, { query: 'alpha beta gamma', provider: '', status: '' })).toEqual(entries)
    expect(libraryEntryForSelection([source, raw], 'raw:1')).toMatchObject({ group: 'materials', primary: source, selected: raw })
    expect(libraryGroupEntries([raw], 'materials')[0]?.primary).toBe(raw)
  })

  it('never attaches an orphan raw to an unrelated reference or raw', () => {
    const orphan = node('raw:orphan', 'raw', { provider: 'manual' }, 'orphan body')
    const reference = node('reference:user', 'reference', { provider: 'clipper' }, 'user reference')
    const entries = libraryGroupEntries([orphan, reference], 'materials')
    expect(entries).toHaveLength(2)
    expect(entries.map(entry => entry.primary.id).sort()).toEqual(['raw:orphan', 'reference:user'])
    expect(entries.find(entry => entry.primary.id === reference.id)?.members).toEqual([reference])
    expect(entries.find(entry => entry.primary.id === orphan.id)?.members).toEqual([orphan])
  })

  it('keeps citations separate from material identity and the selected source URL', () => {
    const a = { ...node('source:a', 'source', { canonicalUrl: 'https://example.com/a', references: ['source:b', 'reference:r'], rawId: 'raw:b' }, 'body A'), updatedAt: 200 }
    const b = { ...node('source:b', 'source', { canonicalUrl: 'https://example.com/b' }, 'unique-b-content'), updatedAt: 100 }
    const rawB = node('raw:b', 'raw', { sourceId: b.id }, 'unique-b-content raw')
    const ref = node('reference:r', 'reference', {}, 'independent citation')
    const records = [a, b, rawB, ref]
    const entries = libraryGroupEntries(records, 'materials')
    expect(entries).toHaveLength(3)
    expect(entries.find(entry => entry.primary.id === a.id)?.members).toEqual([a])
    expect(entries.find(entry => entry.primary.id === ref.id)?.members).toEqual([ref])
    const selected = libraryEntryForSelection(records, b.id)!
    expect(selected.primary).toBe(b)
    expect(selected.members).toEqual([b, rawB])
    expect(libraryOriginalUrl(selected.members)).toBe('https://example.com/b')
    expect(filterLibraryEntries(entries, { query: 'unique-b-content', provider: '', status: '' }).map(entry => entry.primary.id)).toEqual([b.id])
  })

  it('retains all versions of a source raw and resolves an exact later raw selection', () => {
    const first = node('raw:first', 'raw', { sourceId: source.id }, 'first body')
    const second = node('raw:second', 'raw', { sourceId: source.id }, 'unique second body')
    const records = [source, first, second]
    const entries = libraryGroupEntries(records, 'materials')
    expect(entries[0]?.members).toEqual([source, first, second])
    expect(filterLibraryEntries(entries, { query: 'unique second', provider: '', status: '' })).toHaveLength(1)
    expect(libraryEntryForSelection(records, second.id)?.selected).toBe(second)
  })

  it('hides only explicitly managed tool references by default and never hides an ordinary user reference', () => {
    const bundled = node('reference:catalyst-calendar/references/method.md', 'reference', {
      managedBy: 'dsh-research-graph/import', path: 'catalyst-calendar/references/method.md', ownerSkill: 'catalyst-calendar',
    }, 'bundled method text')
    const userReference = node('reference:user-note', 'reference', { provider: 'clipper', canonicalUrl: 'https://example.com/note', path: 'my-notes/note.md' }, 'user note text')
    expect(isLibraryTechnicalNode(bundled)).toBe(true)
    expect(isLibraryTechnicalNode(userReference)).toBe(false)
    const visible = libraryGroupEntries([source, raw, bundled, userReference], 'materials')
    expect(visible.map(entry => entry.primary.id)).toEqual(expect.arrayContaining(['source:1', 'reference:user-note']))
    expect(visible.map(entry => entry.primary.id)).not.toContain(bundled.id)
    expect(filterLibraryEntries(visible, { query: 'bundled method', provider: '', status: '' })).toEqual([])
    const all = libraryGroupEntries([source, raw, bundled, userReference], 'materials', true)
    expect(filterLibraryEntries(all, { query: 'bundled method', provider: '', status: '', includeTechnical: true })[0]?.primary).toBe(bundled)
    expect(libraryEntryForSelection([source, raw, bundled], bundled.id)).toMatchObject({ group: 'materials', technical: true, primary: bundled })
  })

  it('routes selected non-material kinds into their Library group and keeps missing edge peers non-throwing', () => {
    const claim = node('claim:1', 'claim', { provider: 'manual' }, 'A readable claim')
    expect(libraryEntryForSelection([claim], claim.id)).toMatchObject({ group: 'insights', primary: claim, selected: claim })
    const edge: GraphEdge = {
      id: 'supports:claim:1→claim:missing', from: 'claim:1', to: 'claim:missing', kind: 'supports',
      metadata: {}, createdAt: 1,
    }
    expect(libraryRelations(claim, [claim], [edge])).toEqual([
      { edge, peerId: 'claim:missing', direction: 'from' },
    ])
  })

  it('reports global search matches across all three groups instead of only the selected group', () => {
    const claim = node('claim:shared', 'claim', { provider: 'manual' }, 'shared token')
    const deliverable = node('deliverable:shared', 'deliverable', { provider: 'manual' }, 'shared token')
    const material = node('source:shared', 'source', { provider: 'manual' }, 'shared token')
    expect(libraryGroupMatchCounts([material, claim, deliverable], 'shared token')).toEqual({ materials: 1, insights: 1, history: 1 })
  })

  it('does not throw while grouping a node with missing metadata', () => {
    const incomplete = { ...source, metadata: undefined as unknown as GraphNode['metadata'], updatedAt: undefined as unknown as number }
    expect(() => libraryGroupEntries([incomplete], 'materials')).not.toThrow()
    expect(libraryGroupEntries([incomplete], 'materials')[0]?.primary).toBe(incomplete)
  })
})
