import { createElement } from 'react'
import { renderToString } from 'react-dom/server'
import { join } from 'node:path'
import { Context } from '@deepseek-ai/cordis'
import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('@deepseek-ai/dsh-client-ui-primitives', () => ({
  MarkdownText: ({ text }: { text: string }) => text,
}))
import { FinanceService } from '../../src/finance/service.ts'
import { executeFinanceRequest } from '../../src/finance/protocol.ts'
import type { FinanceRequest } from '../../src/finance/protocol.ts'
import { executeGraphRequest } from '../../src/protocol.ts'
import { ResearchGraphService, resolveConfig } from '../../src/service.ts'
import type { GraphEdge, GraphNode } from '../../src/graph.ts'
import { FinanceStore } from '../../client/finance-store.ts'
import type { FinanceGateway } from '../../client/finance-store.ts'
import { WorkbenchStore } from '../../client/store.ts'
import type { GraphGateway, Translate } from '../../client/store.ts'
import { en, zh } from '../../client/locales.ts'
import { LibraryPanel } from '../../client/ui/LibraryPanel.tsx'
import { WorkbenchPage } from '../../client/ui/WorkbenchPage.tsx'
import { makeTempDir } from '../host/fixtures.ts'

const cleanups: (() => Promise<void>)[] = []
afterEach(async () => {
  while (cleanups.length > 0) await cleanups.pop()?.()
})

const asOf = '2026-01-10T00:00:00.000Z'
const clip = {
  schema: 'dsh.clipper/v1', kind: 'selection', url: 'https://example.com/article', title: 'Evidence article', capturedAt: '2026-01-09T00:00:00.000Z',
  content: { text: 'alpha beta gamma' }, topic: 'Markets',
  annotations: [{ exact: 'beta', prefix: 'alpha ', suffix: ' gamma', note: 'Key sentence', tags: ['claim'], locator: { container: 'p' } }],
}

function translate(dictionary: Record<string, string>): Translate {
  return (key, params) => {
    const template = dictionary[key] ?? key
    if (params === undefined) return template
    return Object.entries(params).reduce((text, [name, value]) => text.replaceAll(`{${name}}`, String(value)), template)
  }
}

async function setup() {
  const temp = await makeTempDir('client-inbox-library-render')
  cleanups.push(temp.cleanup)
  const ctx = new Context()
  const graph = new ResearchGraphService(ctx, resolveConfig({ dataDir: join(temp.dir, 'data'), autoIndexSkills: false }, join(temp.dir, 'skills')))
  const service = new FinanceService(ctx, graph)
  const graphGateway: GraphGateway = { request: request => executeGraphRequest(graph, request) }
  const gateway: FinanceGateway = { request: request => executeFinanceRequest(service, request as FinanceRequest) }
  const workbench = new WorkbenchStore(graphGateway, translate(en))
  await workbench.load()
  const finance = new FinanceStore(gateway, translate(en), () => workbench.load())
  await finance.load()
  workbench.setMode('finance')
  return { workbench, finance, service, graph }
}

function render(rig: Awaited<ReturnType<typeof setup>>, dictionary: Record<string, string> = en): string {
  return renderToString(createElement(WorkbenchPage, { store: rig.workbench, finance: rig.finance, t: translate(dictionary) }))
}

describe('Inbox and Library rendering', () => {
  it('keeps the Inbox choices and preview boundary understandable without protocol copy', async () => {
    const rig = await setup()
    rig.finance.setSection('inbox')
    const html = render(rig)
    expect(html).toContain('Add a source')
    expect(html).toContain('Paste clip')
    expect(html).toContain('>Upload file</button>')
    expect(html).toContain('Preview before saving')
    expect(html).toContain('RSS / Atom feed')
    expect(html).toContain('YouTube video transcript')
    expect(html).toContain('Other webpages are not fetched here')
    expect(html).toContain('Research cutoff (optional)')
    expect(html).toContain('This is not the publication date.')
    expect(html).not.toContain('source.fetch / clipper.import / document.import')
    expect(html).not.toContain('arrayBuffer')
    expect(html).not.toContain('base64')

    const zhHtml = render(rig, zh)
    expect(zhHtml).toContain('添加资料')
    expect(zhHtml).toContain('订阅或视频')
    expect(zhHtml).toContain('其他网页不会在这里抓取')
    expect(zhHtml).toContain('研究截止时间（可选）')
    expect(zhHtml).toContain('不是资料发布日期')
    expect(zhHtml).not.toContain('运行谱系')
    expect(zhHtml).not.toContain('dryRun:true')
    expect(zhHtml).not.toContain('arrayBuffer')
  })

  it('previews and commits a real quarantined Clip without inventing availableAt or showing stale input state', async () => {
    const rig = await setup()
    expect(await rig.finance.previewClip(clip, asOf)).toBe(true)
    expect(rig.finance.getSnapshot().operations.ingest.result).toMatchObject({ dryRun: true, counts: { quarantined: 1 }, clipIds: [expect.stringContaining('clip:')], items: [expect.objectContaining({ quarantineReason: 'AVAILABLE_AT_REQUIRED' })] })
    rig.finance.setSection('inbox')
    const mountedWithBlankInput = render(rig)
    expect(mountedWithBlankInput).not.toContain('Review before import')
    expect(mountedWithBlankInput).not.toContain('Confirm and import')
    expect(await rig.finance.commitInbox(), JSON.stringify(rig.finance.getSnapshot().operations.inboxCommit.error)).toBe(true)
    expect(render(rig)).not.toContain('Import complete')
    const snapshot = await rig.graph.snapshot()
    const capture = snapshot.nodes.find(node => node.kind === 'reference')
    expect(capture?.metadata.status).toBe('quarantined')
    expect(capture?.metadata).not.toHaveProperty('availableAt')
    expect(capture?.metadata.capturedAt).toBe(clip.capturedAt)
  })

  it('previews and commits a real local Markdown document through document.import', async () => {
    const rig = await setup()
    const file = { name: 'note.md', mimeType: 'text/markdown', dataBase64: 'YWxwaGEgYmV0YQ==', lastModified: Date.parse('2026-01-09T00:00:00Z') }
    expect(await rig.finance.previewFile(file, asOf)).toBe(true)
    expect(await rig.finance.commitInbox()).toBe(true)
    const snapshot = await rig.graph.snapshot()
    expect(snapshot.nodes.some(node => node.kind === 'reference' && node.metadata.captureKind === 'document')).toBe(true)
    expect(snapshot.nodes.some(node => node.kind === 'raw' && node.content === 'alpha beta')).toBe(true)
  })

  it('renders graph.snapshot material with reference annotations, original text, and provenance', async () => {
    const rig = await setup()
    await rig.service.importClipper({ bundle: clip, dryRun: false, asOf })
    await rig.workbench.load()
    rig.finance.setSection('library')
    const html = render(rig)
    expect(html).toContain('Research library')
    expect(html).toContain('Evidence article')
    expect(html).toContain('Original text &amp; highlights')
    expect(html).toContain('<mark>beta</mark>')
    expect(html).toContain('Key sentence')
    expect(html).toContain('Markets')
    expect(html).toContain('Open source in Graph')
    expect(html).toContain('clipper')
    expect(html).toContain('Quarantined')
  })

  it('shows the three readable groups and keeps managed tool references out of the default list while deep links remain readable', async () => {
    const rig = await setup()
    const materialSource: GraphNode = {
      id: 'source:claim-context', kind: 'source', title: 'Claim source', content: 'https://example.com/claim-source',
      metadata: { provider: 'manual', canonicalUrl: 'https://example.com/claim-source', rawId: 'raw:claim-context' }, createdAt: 1, updatedAt: 2,
    }
    const materialRaw: GraphNode = {
      id: 'raw:claim-context', kind: 'raw', title: 'Claim source raw', content: 'RAW BODY MUST NOT REPLACE CLAIM BODY.',
      metadata: { provider: 'manual', sourceId: materialSource.id }, createdAt: 1, updatedAt: 2,
    }
    const claim: GraphNode = {
      id: 'claim:visible', kind: 'claim', title: 'Visible research claim', content: 'A claim that remains readable in Library.',
      metadata: { provider: 'manual', sourceId: materialSource.id, rawId: materialRaw.id }, createdAt: 1, updatedAt: 2,
    }
    const tool: GraphNode = {
      id: 'reference:demo-tool/references/method.md', kind: 'reference', title: 'Tool method reference', content: 'Bundled method text.',
      metadata: { managedBy: 'dsh-research-graph/import', path: 'demo-tool/references/method.md', ownerSkill: 'demo-tool' }, createdAt: 1, updatedAt: 2,
    }
    const edge: GraphEdge = {
      id: 'supports:claim:visible→reference:demo-tool/references/method.md', from: claim.id, to: tool.id, kind: 'supports',
      metadata: {}, createdAt: 1,
    }
    const props = {
      store: rig.finance, t: translate(en), nodes: [materialSource, materialRaw, claim, tool], edges: [edge], graphPhase: 'ready' as const, graphError: null,
      onRefreshGraph: async () => undefined, onOpenGraph: () => undefined, onOpenHypotheses: () => undefined, locale: 'en',
    }
    const claimHtml = renderToString(createElement(LibraryPanel, { ...props, initialSelectedId: claim.id }))
    expect(claimHtml).toContain('Materials')
    expect(claimHtml).toContain('Insights')
    expect(claimHtml).toContain('Research history')
    expect(claimHtml).toContain('Include tool references')
    expect(claimHtml).toContain('Visible research claim')
    expect(claimHtml).toContain('A claim that remains readable in Library.')
    expect(claimHtml).not.toContain('RAW BODY MUST NOT REPLACE CLAIM BODY.')
    expect(claimHtml).toContain('Content &amp; record')
    expect(claimHtml).not.toContain('data-node-id="reference:demo-tool/references/method.md"')
    expect(claimHtml).toContain('Tool method reference')
    expect(claimHtml).toContain('Open source in Graph')

    const toolHtml = renderToString(createElement(LibraryPanel, { ...props, initialSelectedId: tool.id }))
    expect(toolHtml).toContain('Tool method reference')
    expect(toolHtml).toContain('Bundled method text.')
    expect(toolHtml).toContain('Include tool references')
    expect(toolHtml).toContain('Open source in Graph')
  })

  it('keeps cited material URLs separate and exposes every raw version in the same reader', async () => {
    const rig = await setup()
    const sourceA: GraphNode = { id: 'source:a', kind: 'source', title: 'Source A', content: 'SOURCE A BODY', metadata: { canonicalUrl: 'https://example.com/a', references: ['source:b'], rawId: 'raw:b' }, createdAt: 1, updatedAt: 200 }
    const sourceB: GraphNode = { id: 'source:b', kind: 'source', title: 'Source B', content: 'SOURCE B BODY', metadata: { canonicalUrl: 'https://example.com/b' }, createdAt: 1, updatedAt: 100 }
    const rawB: GraphNode = { id: 'raw:b', kind: 'raw', title: 'Raw B', content: 'RAW B BODY', metadata: { sourceId: sourceB.id }, createdAt: 1, updatedAt: 100 }
    const first: GraphNode = { id: 'raw:first', kind: 'raw', title: 'First version', content: 'FIRST VERSION BODY', metadata: { sourceId: sourceA.id }, createdAt: 1, updatedAt: 200 }
    const second: GraphNode = { id: 'raw:second', kind: 'raw', title: 'Second version', content: 'UNIQUE SECOND VERSION BODY', metadata: { sourceId: sourceA.id }, createdAt: 1, updatedAt: 201 }
    const props = { store: rig.finance, t: translate(en), nodes: [sourceA, sourceB, rawB, first, second], graphPhase: 'ready' as const, graphError: null, onRefreshGraph: async () => undefined, onOpenGraph: () => undefined, onOpenHypotheses: () => undefined, locale: 'en' }
    const bHtml = renderToString(createElement(LibraryPanel, { ...props, initialSelectedId: sourceB.id }))
    expect(bHtml).toContain('RAW B BODY')
    expect(bHtml).toContain('href="https://example.com/b"')
    expect(bHtml).not.toContain('href="https://example.com/a"')
    const aHtml = renderToString(createElement(LibraryPanel, { ...props, initialSelectedId: sourceA.id }))
    expect(aHtml).toContain('FIRST VERSION BODY')
    expect(aHtml).not.toContain('RAW B BODY')
    expect(aHtml).toContain('data-related-node-id="raw:second"')
    expect(aHtml).toContain('data-related-node-id="source:b"')
    const secondHtml = renderToString(createElement(LibraryPanel, { ...props, initialSelectedId: second.id }))
    expect(secondHtml).toContain('UNIQUE SECOND VERSION BODY')
    expect(secondHtml).not.toContain('FIRST VERSION BODY')
  })

  it('shows the authoritative workbench revision when the finance operation revision is stale', async () => {
    const rig = await setup()
    await rig.workbench.createNode({ id: 'claim:new-revision', kind: 'claim', title: 'New graph revision' })
    expect(rig.finance.getSnapshot().revision).toBe(0)
    rig.finance.setSection('library')
    const html = render(rig).replaceAll('<!-- -->', '')
    expect(html).toContain('Local research workspace<span class="rg-pf-status-separator">·</span>rev 1</span>')
    expect(html).not.toContain('rev 0</span>')
  })

  it('keeps the new navigation and empty state bilingual', async () => {
    const rig = await setup()
    rig.finance.setSection('library')
    const html = render(rig, zh)
    expect(html).toContain('收集箱')
    expect(html).toContain('资料库')
    expect(html).toContain('尚无来源材料')
  })
})
