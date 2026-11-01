/**
 * Render smoke test: the workbench page and its dialogs render to markup
 * against a real graph (server-side render — no DOM, no mocks of the graph
 * itself), in both locales and in the loading/error/empty states.
 */
import { mkdir } from 'node:fs/promises'
import { join } from 'node:path'
import { renderToString } from 'react-dom/server'
import { createElement } from 'react'
import { Context } from '@deepseek-ai/cordis'
import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('@deepseek-ai/dsh-client-ui-primitives', () => ({
  MarkdownText: ({ text }: { text: string }) => text,
}))
import { executeGraphRequest } from '../../src/protocol.ts'
import { ResearchGraphService, resolveConfig } from '../../src/service.ts'
import { WorkbenchStore } from '../../client/store.ts'
import type { GraphGateway, Translate } from '../../client/store.ts'
import { en, zh } from '../../client/locales.ts'
import { WorkbenchPage } from '../../client/ui/WorkbenchPage.tsx'
import { GraphPanelIcon } from '../../client/index.tsx'
import { makeTempDir } from '../host/fixtures.ts'

const cleanups: (() => Promise<void>)[] = []
afterEach(async () => {
  while (cleanups.length > 0) await cleanups.pop()?.()
})

function translate(dictionary: Record<string, string>): Translate {
  return (key, params) => {
    const template = dictionary[key] ?? key
    if (params === undefined) return template
    return Object.entries(params).reduce((text, [name, value]) => text.replaceAll(`{${name}}`, String(value)), template)
  }
}

async function seededStore(): Promise<WorkbenchStore> {
  const temp = await makeTempDir('client-render')
  cleanups.push(temp.cleanup)
  const skillsRoot = join(temp.dir, 'skills')
  await mkdir(skillsRoot, { recursive: true })
  const graph = new ResearchGraphService(new Context(), resolveConfig({ dataDir: join(temp.dir, 'data'), skillsRoot, autoIndexSkills: false }, skillsRoot))
  const gateway: GraphGateway = { request: request => executeGraphRequest(graph, request) }
  const store = new WorkbenchStore(gateway, translate(en))
  await store.load()
  await store.createNode({ id: 'claim:a', kind: 'claim', title: 'Alpha claim', content: 'alpha body', metadata: { origin: 'test' } })
  await store.createNode({ id: 'source:b', kind: 'source', title: 'Beta source' })
  await store.addEdge({ from: 'claim:a', to: 'source:b', kind: 'based_on' })
  return store
}

describe('workbench rendering', () => {
  it('renders the graph mode with header, canvas, ledger, and inspector', async () => {
    const store = await seededStore()
    store.select('claim:a')
    const html = renderToString(createElement(WorkbenchPage, { store, t: translate(en) }))
    expect(html).toContain('Research Graph')
    expect(html).toContain('rev 3')
    expect(html).toContain('2 nodes · 1 edge')
    expect(html).toContain('rg-canvas')
    expect(html).toContain('rg-ledger')
    expect(html).toContain('Alpha claim')
    expect(html).toContain('rg-inspector')
    expect(html).toContain('Backlinks')
    expect(html).toContain('based on')
    expect(html).toContain('alpha body')
    expect(html).toContain('var(--rg-kind-claim)')
  })

  it('applies search and kind filters to the canvas as well as the ledger', async () => {
    const store = await seededStore()
    store.setQuery('alpha')
    const searched = renderToString(createElement(WorkbenchPage, { store, t: translate(en) }))
    expect(searched).toContain('data-node="claim:a"')
    expect(searched).not.toContain('data-node="source:b"')
    expect(searched).not.toContain('data-edge-hit=')

    store.setQuery('')
    store.toggleKind('source')
    const filtered = renderToString(createElement(WorkbenchPage, { store, t: translate(en) }))
    expect(filtered).not.toContain('data-node="claim:a"')
    expect(filtered).toContain('data-node="source:b"')
    expect(filtered).not.toContain('data-edge-hit=')
  })

  it('renders in Chinese with the same structure', async () => {
    const store = await seededStore()
    const html = renderToString(createElement(WorkbenchPage, { store, t: translate(zh) }))
    expect(html).toContain('研究图谱')
    expect(html).toContain('新建节点')
    expect(html).toContain('时间线')
    expect(html).toContain('审计')
  })

  it('renders history mode with the retained revisions and a diff', async () => {
    const store = await seededStore()
    store.setMode('history')
    await new Promise(resolve => setImmediate(resolve))
    await store.inspectDiff(0, 2)
    const html = renderToString(createElement(WorkbenchPage, { store, t: translate(en) }))
    expect(html).toContain('node.create')
    expect(html).toContain('Changes (0 → 2)')
    expect(html).toContain('Nodes added')
    expect(html).toContain('claim:a')
  })

  it('links mode tabs to their panel and renders updated node fields once', async () => {
    const store = await seededStore()
    await store.updateNode('claim:a', { title: 'Alpha edited' })
    store.setMode('history')
    await new Promise(resolve => setImmediate(resolve))
    await store.inspectDiff(3, 4)
    const html = renderToString(createElement(WorkbenchPage, { store, t: translate(en) }))
    expect(html).toContain('id="rg-mode-history"')
    expect(html).toContain('aria-controls="rg-mode-panel"')
    expect(html).toContain('role="tabpanel"')
    expect(html).toContain('aria-labelledby="rg-mode-history"')
    expect(html).toContain('Nodes updated')
    expect(html).toContain('Alpha edited')
    expect(html.replaceAll('<!-- -->', '').match(/claim:a \(title\)/g)).toHaveLength(1)
  })

  it('renders audit mode with the clean report', async () => {
    const store = await seededStore()
    store.setMode('audit')
    await new Promise(resolve => setImmediate(resolve))
    const html = renderToString(createElement(WorkbenchPage, { store, t: translate(en) }))
    expect(html).toContain('Integrity audit')
    expect(html).toContain('No issues found')
  })

  it('renders the loading, error, and editor states', async () => {
    const failing: GraphGateway = { request: async () => ({ ok: false, error: { code: 'NO_SESSION', message: 'no session' } }) }
    const broken = new WorkbenchStore(failing, translate(en))
    const loading = renderToString(createElement(WorkbenchPage, { store: broken, t: translate(en) }))
    expect(loading).toContain('rg-skeleton')
    await broken.load()
    const failed = renderToString(createElement(WorkbenchPage, { store: broken, t: translate(en) }))
    expect(failed).toContain('Open a session')
    expect(failed).toContain('NO_SESSION')

    const store = await seededStore()
    store.openEditor({ kind: 'create' })
    const html = renderToString(createElement(WorkbenchPage, { store, t: translate(en) }))
    expect(html).toContain('rg-dialog')
    expect(html).toContain('New node')
    expect(html).toContain('Metadata (JSON)')
  })

  it('renders the sidebar icon glyph', () => {
    const html = renderToString(createElement(GraphPanelIcon, { size: 18 }))
    expect(html).toContain('<svg')
    expect(html).toContain('circle')
  })

  it('keeps the two dictionaries key-aligned', () => {
    expect(Object.keys(zh).sort()).toEqual(Object.keys(en).sort())
  })
})
