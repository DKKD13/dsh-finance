import { mkdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { Context } from '@deepseek-ai/cordis'
import { CommandRuntime, parseCommand } from '@deepseek-ai/dsh-commands'
import type { CommandDefinition, CommandInvocation } from '@deepseek-ai/dsh-commands'
import { SkillRegistry } from '@deepseek-ai/dsh-skill'
import type { ToolDefinition } from '@deepseek-ai/dsh-tools'
import { afterEach, describe, expect, it } from 'vitest'
import * as plugin from '../../src/index.ts'
import type { ResearchGraphChange } from '../../src/service.ts'
import { makeTempDir, writeSkillsFixture } from './fixtures.ts'

const cleanups: (() => Promise<void>)[] = []
afterEach(async () => {
  while (cleanups.length > 0) await cleanups.pop()?.()
})

interface Harness {
  app: Context
  tools: Map<string, ToolDefinition>
  runCommand: (line: string) => Promise<{ kind: string; text?: string } | undefined>
  events: ResearchGraphChange[]
}

/** Compose a minimal host: real skill + command registries, a collecting tools registry. */
async function compose(config: Record<string, unknown>): Promise<Harness & { dir: string; skillsRoot: string }> {
  const temp = await makeTempDir('plugin')
  cleanups.push(temp.cleanup)
  const skillsRoot = join(temp.dir, 'skills')
  await mkdir(skillsRoot, { recursive: true })
  await writeSkillsFixture(skillsRoot)
  const app = new Context()
  await app.plugin(SkillRegistry)
  await app.plugin(CommandRuntime)
  const tools = new Map<string, ToolDefinition>()
  app.provide('tools', {
    register(definition: ToolDefinition) {
      tools.set(definition.name, definition)
      return () => { tools.delete(definition.name) }
    },
  })
  const events: ResearchGraphChange[] = []
  app.on('research-graph/change', change => { events.push(change) })
  await app.plugin(plugin, { dataDir: join(temp.dir, 'data'), skillsRoot, ...config })
  const runCommand = async (line: string) => {
    const parsed = parseCommand(line)
    if (parsed === undefined) return undefined
    const definition: CommandDefinition | undefined = app.commands.find(undefined as never, parsed.name)
    if (definition === undefined) return undefined
    const invocation = {
      commandId: 'cmd-test',
      agent: undefined,
      rawInput: parsed.rawInput,
      signal: new AbortController().signal,
    } as unknown as CommandInvocation
    return definition.handler(invocation)
  }
  return { app, tools, runCommand, events, dir: temp.dir, skillsRoot }
}

describe('deepseek-harness-finance-plugin host plugin', () => {
  it('mounts the shared service and runs the first skills import', async () => {
    const { app, dir } = await compose({})
    expect(app.researchGraph).toBeDefined()
    await app.researchGraph.initialImport
    const text = await readFile(join(dir, 'data', 'graph.json'), 'utf8')
    expect(JSON.parse(text)).toMatchObject({ schemaVersion: 1, revision: 1 })
    const stats = await app.researchGraph.stats()
    expect(stats.nodes).toBe(5) // 3 skills + 1 reference + 1 script
    expect(stats.nodesByKind.persona).toBe(1)
  })

  it('registers every bundled skill including nested persona skills', async () => {
    const { app, skillsRoot } = await compose({})
    await app.researchGraph.initialImport
    const skills = await app.skills.list()
    const names = skills.map(skill => skill.name)
    expect(names).toContain('alpha-skill')
    expect(names).toContain('beta-skill')
    expect(names).toContain('gamma-persona')
    const alpha = skills.find(skill => skill.name === 'alpha-skill')
    expect(alpha?.provider).toBe('deepseek-harness-finance-plugin')
    expect(alpha?.source).toBe('bundled')
    const definition = await app.skills.get('alpha-skill')
    expect(definition?.content).toContain('# Alpha')
    expect(definition?.content).not.toContain('name: alpha-skill') // frontmatter stripped
    expect(definition?.resourceBase).toEqual({ kind: 'directory', path: join(skillsRoot, 'alpha-skill') })
  })

  it('registers every research and finance agent tool against the shared service', async () => {
    const { tools } = await compose({ autoIndexSkills: false })
    expect([...tools.keys()].sort()).toEqual([
      'finance_briefing',
      'finance_graph',
      'finance_ingest',
      'finance_market_data',
      'finance_memory',
      'finance_model',
      'finance_virtual_fund',
      'research_graph_admin',
      'research_graph_edge',
      'research_graph_node',
      'research_graph_query',
    ])
    const exec = { signal: new AbortController().signal } as never
    const created = await tools.get('research_graph_node')?.execute(
      { action: 'create', kind: 'claim', title: '工具创建', content: '正文' },
      exec,
    ) as { ok: boolean; result: { id: string } }
    expect(created.ok).toBe(true)
    expect(created.result.id).toBe('claim:工具创建')
    const search = await tools.get('research_graph_query')?.execute({ action: 'search', query: '工具' }, exec) as { ok: boolean; result: { node: { id: string } }[] }
    expect(search.ok).toBe(true)
    expect(search.result.map(hit => hit.node.id)).toContain('claim:工具创建')
    const snapshot = await tools.get('research_graph_query')?.execute({ action: 'snapshot' }, exec) as { ok: boolean; revision: number; result: { nodes: { id: string }[]; edges: unknown[] } }
    expect(snapshot.ok).toBe(true)
    expect(snapshot.revision).toBe(1)
    expect(snapshot.result.nodes.map(node => node.id)).toContain('claim:工具创建')
    expect(snapshot.result.edges).toEqual([])
    const bad = await tools.get('research_graph_edge')?.execute({ action: 'add', from: 'claim:工具创建', to: 'ghost', kind: 'supports' }, exec) as { ok: boolean; error?: { code: string } }
    expect(bad?.ok).toBe(false)
    expect(bad?.error?.code).toBe('MISSING_NODE')
  })

  it('executes finance_ingest and the new human /finance ingestion command', async () => {
    const { app, tools, runCommand } = await compose({ autoIndexSkills: false })
    const source = {
      provider: 'fixture.public', canonicalUrl: 'https://example.com/public?id=1', title: 'Public source', content: 'raw body',
      asOf: '2026-01-10T00:00:00.000Z', availableAt: '2026-01-09T00:00:00.000Z', fetchedAt: '2026-01-10T00:00:00.000Z',
      provenance: { locator: 'body' },
    }
    const preview = await tools.get('finance_ingest')?.execute({ action: 'ingest', input: { items: [source], runId: 'tool-preview' } }, { signal: new AbortController().signal } as never) as { ok: boolean; result: { dryRun: boolean } }
    expect(preview.ok).toBe(true)
    expect(preview.result.dryRun).toBe(true)
    expect(await app.researchGraph.currentRevision()).toBe(0)

    const committed = await runCommand(`/finance source-ingest ${JSON.stringify({ items: [source], dryRun: false, runId: 'command-run', asOf: source.asOf })}`)
    expect(committed?.kind).toBe('success')
    expect(committed?.text).toContain('"changed": true')
    expect(await app.researchGraph.currentRevision()).toBe(1)
    const marketFetch = await runCommand('/finance market-fetch {"source":"sec","kind":"ticker","symbol":"AAPL"}')
    expect(marketFetch?.kind).toBe('error')
    expect(marketFetch?.text).toContain('NOT_CONFIGURED')

    const clipPreview = await tools.get('finance_ingest')?.execute({ action: 'import_clip', input: { bundle: { clips: [{ type: 'page', title: 'Tool clip', url: 'https://example.com/clip', availableAt: source.asOf, content: { text: 'clip body' } }] }, asOf: source.asOf } }, { signal: new AbortController().signal } as never) as { ok: boolean; result: { dryRun: boolean; clipIds: string[] } }
    expect(clipPreview.ok).toBe(true)
    expect(clipPreview.result.dryRun).toBe(true)
    expect(clipPreview.result.clipIds).toHaveLength(1)
    expect(await app.researchGraph.currentRevision()).toBe(1)
    const document = await runCommand(`/finance document-import ${JSON.stringify({ files: [{ name: 'command.txt', mimeType: 'text/plain', dataBase64: Buffer.from('command document').toString('base64') }], dryRun: false, asOf: source.asOf, runId: 'command-document' })}`)
    expect(document?.kind).toBe('success')
    expect(document?.text).toContain('"documentIds"')
    expect(await app.researchGraph.currentRevision()).toBe(2)
  })

  it('answers the slash command in human and JSON modes', async () => {
    const { runCommand, events } = await compose({ autoIndexSkills: false })
    const usage = await runCommand('/research-graph')
    expect(usage?.kind).toBe('success')
    expect(usage?.text).toContain('stats')

    const stats = await runCommand('/research-graph stats')
    expect(stats?.kind).toBe('success')
    expect(stats?.text).toContain('"nodes": 0')

    const created = await runCommand('/research-graph {"op":"node.create","node":{"id":"claim:x","kind":"claim","title":"X"}}')
    expect(created?.kind).toBe('success')
    const show = await runCommand('/research-graph show claim:x')
    expect(show?.text).toContain('"id": "claim:x"')
    const unknown = await runCommand('/research-graph frobnicate')
    expect(unknown?.kind).toBe('error')
    expect(unknown?.text).toContain('Usage:')
    const missing = await runCommand('/research-graph show ghost')
    expect(missing?.kind).toBe('error')
    expect(missing?.text).toContain('MISSING_NODE')
    const snapshot = await runCommand('/research-graph snapshot')
    expect(snapshot?.kind).toBe('success')
    expect(snapshot?.text).toContain('"claim:x"')
    const history = await runCommand('/research-graph history')
    expect(history?.kind).toBe('success')
    expect(history?.text).toContain('"op": "node.create"')
    expect(events.map(change => change.op)).toEqual(['node.create'])
  })

  it('survives a restart with the same data directory', async () => {
    const temp = await makeTempDir('restart')
    cleanups.push(temp.cleanup)
    const skillsRoot = join(temp.dir, 'skills')
    await mkdir(skillsRoot, { recursive: true })
    await writeSkillsFixture(skillsRoot)

    const first = new Context()
    await first.plugin(SkillRegistry)
    await first.plugin(CommandRuntime)
    first.provide('tools', { register: () => () => {} })
    await first.plugin(plugin, { dataDir: join(temp.dir, 'data'), skillsRoot, autoIndexSkills: false })
    await first.researchGraph.createNode({ id: 'claim:persist', kind: 'claim', title: 'persisted' })

    const second = new Context()
    await second.plugin(SkillRegistry)
    await second.plugin(CommandRuntime)
    second.provide('tools', { register: () => () => {} })
    await second.plugin(plugin, { dataDir: join(temp.dir, 'data'), skillsRoot, autoIndexSkills: false })
    expect((await second.researchGraph.getNode('claim:persist'))?.title).toBe('persisted')
    expect(await second.researchGraph.currentRevision()).toBe(1)
  })

  it('registers deterministic compilation prepare/status on finance_graph tools and slash commands', async () => {
    const { tools, runCommand } = await compose({ autoIndexSkills: false })
    const exec = { signal: new AbortController().signal } as never
    const input = { runId: 'compile-plugin', sourceIds: ['source:missing'], asOf: '2026-01-10T00:00:00.000Z' }
    const prepared = await tools.get('finance_graph')?.execute({ action: 'compile_prepare', input }, exec) as {
      ok: boolean
      result: { status?: string; counts: { requested: number; ready: number; rejected: number } }
    }
    expect(prepared.ok).toBe(true)
    expect(prepared.result.counts).toEqual({ requested: 1, ready: 0, rejected: 1 })
    const status = await tools.get('finance_graph')?.execute({ action: 'compile_status', input: { runId: 'compile-plugin' } }, exec) as {
      ok: boolean
      result: { status: string; scope: string }
    }
    expect(status).toMatchObject({ ok: true, result: { status: 'not_found', scope: 'graph-artifacts-only' } })

    const commandPrepared = await runCommand(`/finance compile-prepare ${JSON.stringify(input)}`)
    expect(commandPrepared?.kind).toBe('success')
    expect(commandPrepared?.text).toContain('MISSING_SOURCE')
    const commandStatus = await runCommand('/finance compile-status {"runId":"compile-plugin"}')
    expect(commandStatus?.kind).toBe('success')
    expect(commandStatus?.text).toContain('"status": "not_found"')
  })
})
