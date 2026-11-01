import { join } from 'node:path'
import { Context } from '@deepseek-ai/cordis'
import { afterEach, describe, expect, it } from 'vitest'
import { CLIPPER_SCHEMA } from '../../src/finance/clipper.ts'
import { executeFinanceRequest } from '../../src/finance/protocol.ts'
import { FinanceService } from '../../src/finance/service.ts'
import type { JsonValue } from '../../src/finance/types.ts'
import { ResearchGraphService, resolveConfig } from '../../src/service.ts'
import { makeTempDir } from './fixtures.ts'

const cleanups: (() => Promise<void>)[] = []
afterEach(async () => {
  while (cleanups.length > 0) await cleanups.pop()?.()
})

const asOf = '2026-02-01T00:00:00.000Z'
const availableAt = '2026-01-31T00:00:00.000Z'

function clip(content = 'A durable clipped body', note = 'first note') {
  return {
    type: 'selection',
    title: 'Research article',
    url: 'https://example.com/story?utm_source=clip&id=7',
    capturedAt: availableAt,
    availableAt,
    topic: 'Margins',
    content: { text: content },
    annotations: [{ exact: 'durable', prefix: 'A ', suffix: ' clipped', note, tags: ['research'], locator: { selector: '#p1' } }],
    provenance: { extension: 'fixture', capturedAt: availableAt },
  }
}

function bundle(clips: JsonValue[]) {
  return { schema: CLIPPER_SCHEMA, clips }
}

async function setup() {
  const temp = await makeTempDir('clipper')
  cleanups.push(temp.cleanup)
  const config = resolveConfig({ dataDir: join(temp.dir, 'data'), autoIndexSkills: false }, join(temp.dir, 'skills'))
  const graph = new ResearchGraphService(new Context(), config)
  const finance = new FinanceService(new Context(), graph)
  return { config, graph, finance }
}

describe('Clipper clean-room bundle ingestion', () => {
  it('previews, commits one revision, merges notes on the same content, and supersedes changed content', async () => {
    const { finance, graph, config } = await setup()
    const input = { bundle: bundle([clip()]), asOf, runId: 'clip-1' }
    const preview = await finance.importClipper(input)
    expect(preview).toMatchObject({ dryRun: true, changed: false, revision: 0, status: 'preview', annotationCount: 1 })
    expect(preview.clipIds).toHaveLength(1)
    expect(await graph.currentRevision()).toBe(0)

    const committed = await finance.importClipper({ ...input, dryRun: false })
    expect(committed).toMatchObject({ dryRun: false, changed: true, revision: 1, status: 'imported' })
    const clipId = committed.clipIds[0] as string
    const first = await graph.getNode(clipId)
    expect(first?.kind).toBe('reference')
    expect(first?.metadata).toMatchObject({ captureKind: 'clip', canonicalUrl: 'https://example.com/story?id=7', availableAt, topic: 'Margins', status: 'accepted' })
    expect(first?.metadata.contentHash).not.toBe(first?.metadata.annotationHash)
    expect(first?.metadata.annotations).toHaveLength(1)
    expect((await graph.snapshot()).nodes.map(node => node.kind).sort()).toEqual(['raw', 'reference', 'session', 'source'])
    expect((await graph.revisions()).map(entry => entry.op)).toEqual(['finance.clipper.import'])

    expect((await finance.importClipper({ ...input, dryRun: false }))).toMatchObject({ revision: 1, changed: false, status: 'unchanged' })
    const secondNote = clip()
    secondNote.annotations = [{ ...secondNote.annotations[0]!, note: 'a different interpretation', tags: ['thesis'] }]
    const merged = await finance.importClipper({ bundle: bundle([secondNote]), dryRun: false, asOf, runId: 'clip-2' })
    expect(merged).toMatchObject({ revision: 2, changed: true, clipIds: [clipId], annotationCount: 1 })
    expect((await graph.getNode(clipId))?.metadata.annotations).toHaveLength(2)
    expect((await graph.snapshot()).nodes.filter(node => node.kind === 'reference')).toHaveLength(1)
    expect((await graph.snapshot()).edges.filter(edge => edge.kind === 'supersedes')).toHaveLength(0)

    const changedInput = { bundle: bundle([clip('A materially revised body')]), dryRun: false, asOf, runId: 'clip-3' }
    const changed = await finance.importClipper(changedInput)
    expect(changed).toMatchObject({ revision: 3, changed: true })
    expect(changed.clipIds[0]).not.toBe(clipId)
    const snapshot = await graph.snapshot()
    expect(snapshot.nodes.filter(node => node.kind === 'reference')).toHaveLength(2)
    expect(snapshot.edges.filter(edge => edge.kind === 'supersedes')).toHaveLength(2)

    const reopenedGraph = new ResearchGraphService(new Context(), config)
    const reopenedFinance = new FinanceService(new Context(), reopenedGraph)
    const replay = await reopenedFinance.importClipper(changedInput)
    expect(replay).toMatchObject({ revision: 3, changed: false, status: 'unchanged' })
    expect((await reopenedGraph.getNode(changed.clipIds[0] as string))?.content).toBe('A materially revised body')
  })

  it('persists missing or future availableAt as quarantined without copying capturedAt', async () => {
    const { finance, graph } = await setup()
    const missing = clip('missing availability')
    delete (missing as { availableAt?: string }).availableAt
    const result = await finance.importClipper({ bundle: bundle([missing]), dryRun: false, asOf, runId: 'quarantine-missing' })
    expect(result).toMatchObject({ changed: true, status: 'quarantined', counts: { quarantined: 1 } })
    const node = await graph.getNode(result.clipIds[0] as string)
    expect(node?.metadata.capturedAt).toBe(availableAt)
    expect(node?.metadata.availableAt).toBeUndefined()
    expect(node?.metadata).toMatchObject({ status: 'quarantined', quarantined: true, quarantineReason: 'AVAILABLE_AT_REQUIRED' })
    expect((await finance.search('missing availability', { asOf, kinds: ['reference', 'raw'] })).hits).toHaveLength(0)

    const future = { ...clip('future availability'), availableAt: '2026-02-02T00:00:00.000Z' }
    const futureResult = await finance.importClipper({ bundle: bundle([future]), dryRun: false, asOf, runId: 'quarantine-future' })
    expect(futureResult.counts.quarantined).toBe(1)
    expect((await graph.getNode(futureResult.clipIds[0] as string))?.metadata).toMatchObject({ availableAt: '2026-02-02T00:00:00.000Z', quarantineReason: 'FUTURE_AVAILABLE_AT' })
  })

  it('accepts Verity field compatibility and reports item rejection with one atomic partial commit', async () => {
    const { finance, graph } = await setup()
    const verity = {
      title: 'Verity page', sourceName: 'Fixture publisher', sourceUrl: 'https://verity.example.com/a?utm_medium=x',
      topic_title: 'Cash flow', html: '<main><p>Compatible <b>body</b></p><script>throw new Error("must not run")</script></main>',
      highlights: [{ text: 'Compatible', note: 'legacy highlight' }],
      availableAt,
    }
    const result = await executeFinanceRequest(finance, {
      op: 'clipper.import',
      input: { bundle: { clips: [verity, { type: 'page', url: 'not-a-url', content: { text: 'bad' } }] }, dryRun: false, asOf, runId: 'verity' },
    })
    expect(result.ok).toBe(true)
    if (result.ok) {
      const imported = result.result as { status: string; rejected: { code: string }[]; clipIds: string[]; revision: number }
      expect(imported).toMatchObject({ status: 'partial', revision: 1 })
      expect(imported.rejected).toHaveLength(1)
      expect(imported.clipIds).toHaveLength(1)
      const node = await graph.getNode(imported.clipIds[0] as string)
      expect(node?.content).toBe('Compatible body')
      expect(node?.metadata).toMatchObject({ topic: 'Cash flow', provenance: { compatibility: 'verity-fields' } })
    }
    expect((await graph.revisions())).toHaveLength(1)
    const invalid = await executeFinanceRequest(finance, { op: 'clipper.import', input: { asOf } })
    expect(invalid.ok).toBe(false)
    expect(invalid.ok === false && invalid.error.code).toBe('INVALID_CLIPPER_BUNDLE')
    expect(await graph.currentRevision()).toBe(1)
  })

  it('deduplicates identical clips within a batch and preserves exact annotation anchors', async () => {
    const { finance, graph } = await setup()
    const anchored = clip('anchor body')
    anchored.annotations = [{ ...anchored.annotations[0]!, exact: '  anchor  ', prefix: '\n', suffix: ' ', note: '  keep whitespace  ' }]
    const result = await finance.importClipper({ bundle: bundle([anchored, anchored]), dryRun: false, asOf, runId: 'batch-duplicates' })
    expect(result.counts).toMatchObject({ received: 2, accepted: 1, duplicates: 1 })
    const node = await graph.getNode(result.clipIds[0] as string)
    expect(node?.metadata.annotations).toEqual([expect.objectContaining({ exact: '  anchor  ', prefix: '\n', suffix: ' ', note: '  keep whitespace  ' })])
    expect(result.annotationCount).toBe(1)
  })
})
