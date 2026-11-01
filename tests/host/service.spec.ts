import { cp, mkdir, readFile, readdir, symlink, writeFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { Context } from '@deepseek-ai/cordis'
import { afterEach, describe, expect, it } from 'vitest'
import { GraphError } from '../../src/graph.ts'
import { executeGraphRequest, parseRequestJson, GRAPH_OPS } from '../../src/protocol.ts'
import { ResearchGraphService, resolveConfig } from '../../src/service.ts'
import { makeTempDir, writeSkillsFixture } from './fixtures.ts'

const cleanups: (() => Promise<void>)[] = []
afterEach(async () => {
  while (cleanups.length > 0) await cleanups.pop()?.()
})

async function setup(options: { skills?: boolean } = {}) {
  const temp = await makeTempDir('service')
  cleanups.push(temp.cleanup)
  const skillsRoot = join(temp.dir, 'skills')
  await mkdir(skillsRoot, { recursive: true })
  if (options.skills !== false) await writeSkillsFixture(skillsRoot)
  const ctx = new Context()
  const config = resolveConfig({ dataDir: join(temp.dir, 'data'), skillsRoot, autoIndexSkills: false }, skillsRoot)
  const graph = new ResearchGraphService(ctx, config)
  return { graph, ctx, dir: temp.dir, skillsRoot }
}

describe('ResearchGraphService + protocol', () => {
  it('resolves configuration defaults and rejects bad values', () => {
    const resolved = resolveConfig({}, '/tmp/skills')
    expect(resolved.dataDir.endsWith('.dsh-research-graph')).toBe(true)
    expect(resolved.autoIndexSkills).toBe(true)
    expect(resolved.writeMirror).toBe(false)
    expect(resolved.historyLimit).toBe(256)
    expect(resolved.httpTimeoutMs).toBe(10000)
    expect(resolved.httpMaxBytes).toBe(16777216)
    for (const bad of [
      { dataDir: ' ' }, { historyLimit: 0 }, { openbbBaseUrl: 'https://example.com' },
      { alphaSiftPath: ' ' }, { httpTimeoutMs: 0 }, { httpMaxBytes: 0 },
    ]) {
      try {
        resolveConfig(bad, '/tmp/skills')
        expect.unreachable('invalid config must throw')
      } catch (error: unknown) {
        expect(error).toBeInstanceOf(GraphError)
        expect((error as GraphError).code).toBe('INVALID_CONFIG')
      }
    }
  })

  it('round-trips every protocol op through the shared service', async () => {
    const { graph } = await setup()
    const create = await executeGraphRequest(graph, { op: 'node.create', node: { id: 'claim:a', kind: 'claim', title: 'A', content: 'alpha body' } })
    expect(create.ok).toBe(true)
    expect(create.ok && create.revision).toBe(1)

    const second = await executeGraphRequest(graph, { op: 'node.create', node: { id: 'source:b', kind: 'source', title: 'B' } })
    expect(second.ok && second.revision).toBe(2)

    const edge = await executeGraphRequest(graph, { op: 'edge.add', edge: { from: 'claim:a', to: 'source:b', kind: 'based_on' } })
    expect(edge.ok).toBe(true)

    expect((await executeGraphRequest(graph, { op: 'node.get', id: 'claim:a' })).ok).toBe(true)
    expect((await executeGraphRequest(graph, { op: 'node.get', id: 'ghost' })).ok).toBe(false)

    const updated = await executeGraphRequest(graph, { op: 'node.update', id: 'claim:a', patch: { title: 'A2' } })
    expect(updated.ok && JSON.stringify(updated.result)).toContain('A2')

    const search = await executeGraphRequest(graph, { op: 'search', query: 'alpha' })
    expect(search.ok && JSON.stringify(search.result)).toContain('claim:a')

    const links = await executeGraphRequest(graph, { op: 'backlinks', id: 'source:b' })
    expect(links.ok && JSON.stringify(links.result)).toContain('claim:a')

    const stats = await executeGraphRequest(graph, { op: 'stats' })
    expect(stats.ok && JSON.stringify(stats.result)).toContain('"nodes":2')

    const audit = await executeGraphRequest(graph, { op: 'audit' })
    expect(audit.ok).toBe(true)

    const diff = await executeGraphRequest(graph, { op: 'diff', from: 0 })
    expect(diff.ok && JSON.stringify(diff.result)).toContain('claim:a')

    const listed = await executeGraphRequest(graph, { op: 'node.list', kind: 'claim' })
    expect(listed.ok && JSON.stringify(listed.result)).toContain('claim:a')

    const removed = await executeGraphRequest(graph, { op: 'node.remove', id: 'source:b' })
    expect(removed.ok).toBe(false) // incident edge, no cascade
    const cascaded = await executeGraphRequest(graph, { op: 'node.remove', id: 'source:b', cascade: true })
    expect(cascaded.ok).toBe(true)

    const removedEdge = await executeGraphRequest(graph, { op: 'edge.remove', edgeId: 'supports:claim:a→source:b' })
    expect(removedEdge.ok).toBe(false)
    expect(removedEdge.ok === false && removedEdge.error.code).toBe('MISSING_EDGE')

    const list = await executeGraphRequest(graph, { op: 'node.list' })
    expect(list.ok && JSON.stringify(list.result)).not.toContain('source:b')

    const snapshot = await executeGraphRequest(graph, { op: 'graph.snapshot' })
    expect(snapshot.ok).toBe(true)
    if (snapshot.ok) {
      const snap = snapshot.result as { revision: number; nodes: { id: string }[]; edges: { id: string }[] }
      expect(snap.revision).toBe(snapshot.revision)
      expect(snap.nodes.map(node => node.id)).toEqual(['claim:a'])
      expect(snap.edges).toEqual([])
    }

    const history = await executeGraphRequest(graph, { op: 'history.list' })
    expect(history.ok).toBe(true)
    if (history.ok) {
      const list = history.result as { revision: number; earliestRetainedRevision: number; entries: { revision: number; op: string }[] }
      expect(list.revision).toBe(history.revision)
      expect(list.earliestRetainedRevision).toBe(0)
      expect(list.entries.map(entry => entry.op)).toEqual([
        'node.create', 'node.create', 'edge.add', 'node.update', 'node.remove',
      ])
    }
  })

  it('returns structured failures for invalid requests and unknown ops', async () => {
    const { graph } = await setup()
    const badOp = await executeGraphRequest(graph, { op: 'nope' } as never)
    expect(badOp.ok).toBe(false)
    expect(badOp.ok === false && badOp.error.code).toBe('UNKNOWN_OP')
    const badCreate = await executeGraphRequest(graph, { op: 'node.create' })
    expect(badCreate.ok === false && badCreate.error.code).toBe('INVALID_REQUEST')
    const badEdge = await executeGraphRequest(graph, { op: 'edge.add', edge: { from: 'a', to: 'b', kind: 'nope' as never } })
    expect(badEdge.ok === false && badEdge.error.code).toBe('INVALID_REQUEST')
    const dangling = await executeGraphRequest(graph, {
      op: 'node.create',
      node: { kind: 'claim', title: 'X', metadata: { references: ['ghost'] } },
    })
    expect(dangling.ok === false && dangling.error.code).toBe('MISSING_NODE')
  })

  it('parses JSON command payloads and rejects non-requests', async () => {
    expect(parseRequestJson('{"op":"stats"}')).toEqual({ op: 'stats' })
    expect(parseRequestJson('stats')).toBeUndefined()
    expect(() => parseRequestJson('{"op":42}')).toThrowError(GraphError)
    expect(GRAPH_OPS.length).toBe(17)
  })

  it('rebuilds from the skills root and exports a Markdown mirror', async () => {
    const { graph, ctx, dir } = await setup()
    const seen: number[] = []
    ctx.on('research-graph/change', change => { seen.push(change.revision) })
    const rebuilt = await executeGraphRequest(graph, { op: 'skills.rebuild' })
    expect(rebuilt.ok).toBe(true)
    expect(rebuilt.ok && rebuilt.revision).toBe(1)
    expect(rebuilt.ok && JSON.stringify(rebuilt.result)).toContain('"skills":3')

    const repeated = await executeGraphRequest(graph, { op: 'skills.rebuild' })
    expect(repeated.ok).toBe(true)
    expect(repeated.ok && repeated.revision).toBe(1)
    expect(await graph.revisions()).toHaveLength(1)
    expect(seen).toEqual([1])

    const target = join(dir, 'mirror')
    const exported = await executeGraphRequest(graph, { op: 'export.markdown', dir: target })
    expect(exported.ok).toBe(true)
    const index = await readFile(join(target, '_index.md'), 'utf8')
    expect(index).toContain('skill:alpha-skill')
    const nodeDoc = await readFile(join(target, 'skill', 'skill_alpha-skill.md'), 'utf8')
    expect(nodeDoc).toContain('id: skill:alpha-skill')
    expect(nodeDoc).toContain('- **depends_on** → [` skill:beta-skill `](skill_beta-skill.md)')
  })

  it('emits research-graph/change on every mutation', async () => {
    const { graph, ctx } = await setup()
    const seen: number[] = []
    ctx.on('research-graph/change', change => { seen.push(change.revision) })
    await executeGraphRequest(graph, { op: 'node.create', node: { kind: 'memory', title: 'm' } })
    await executeGraphRequest(graph, { op: 'node.create', node: { kind: 'memory', title: 'n' } })
    expect(seen).toEqual([1, 2])
  })

  it('exports portable index and cross-kind relationship links without changing the graph', async () => {
    const { graph, dir } = await setup({ skills: false })
    await graph.createNode({ id: 'source:笔记-a', kind: 'claim', title: 'Reader', content: 'Original body.\n' })
    await graph.createNode({ id: 'claim:document', kind: 'source', title: 'Document', content: 'Evidence body.' })
    await graph.addEdge({ from: 'source:笔记-a', to: 'claim:document', kind: 'based_on' })
    const before = await graph.snapshot()
    const history = await graph.revisions()
    const exported = await graph.exportMarkdown(join(dir, 'export'))
    const moved = join(dir, '移动后的导出 moved')
    await cp(exported.dir, moved, { recursive: true })
    const index = await readFile(join(moved, '_index.md'), 'utf8')
    const indexLinks = [...index.matchAll(/\]\(([^)]+)\)/gu)].map(match => match[1]!)
    expect(indexLinks).toHaveLength(2)
    for (const href of indexLinks) {
      expect(href).not.toMatch(/^(?:[a-z]+:|\/)/iu)
      const body = await readFile(resolve(moved, decodeURIComponent(href)), 'utf8')
      expect(body).toMatch(/id: (?:source:笔记-a|claim:document)/u)
    }
    const readerFile = join(moved, 'claim', 'source_笔记-a.md')
    const reader = await readFile(readerFile, 'utf8')
    const relationship = /\*\*based_on\*\* → \[` claim:document `\]\(([^)]+)\)/u.exec(reader)
    expect(relationship).not.toBeNull()
    const target = resolve(dirname(readerFile), decodeURIComponent(relationship![1]!))
    expect(await readFile(target, 'utf8')).toContain('id: claim:document')
    expect(await readFile(target, 'utf8')).toContain('Evidence body.')
    expect(await graph.snapshot()).toEqual(before)
    expect(await graph.revisions()).toEqual(history)
  })

  it('exports an empty graph to fresh default and explicit directories', async () => {
    const { graph, dir } = await setup({ skills: false })
    for (const target of [undefined, join(dir, 'fresh', 'export')]) {
      const exported = await graph.exportMarkdown(target)
      expect(exported.files).toEqual([join(exported.dir, '_index.md')])
      expect(await readFile(exported.files[0]!, 'utf8')).toBe('# Research graph index\n\n')
    }
  })

  it('keeps imported document links, referenced image bytes and directory navigation portable without copying outside assets', async () => {
    const { graph, dir } = await setup()
    const root = join(dir, 'skills')
    const original = await readFile(join(root, 'alpha-skill', 'SKILL.md'), 'utf8')
    await writeFile(join(root, 'alpha-skill', 'SKILL.md'), `${original}\n[terms](LICENSE) [folder](reference/)\n<img src="image(1).jpg">\n[unrelated](../../outside.txt) ![escape](escape.jpg)\n\`[code](LICENSE)\`\n`)
    await writeFile(join(root, 'beta-skill', 'SKILL.md'), '---\nname: beta-skill\ndescription: Beta.\n---\n[terms](LICENSE)\n')
    await writeFile(join(root, 'alpha-skill', 'LICENSE'), 'Alpha license, distinct content.')
    await writeFile(join(root, 'beta-skill', 'LICENSE'), 'Beta license, distinct content.')
    const image = Buffer.from([0, 255, 13, 10, 1, 2, 3])
    await writeFile(join(root, 'alpha-skill', 'image(1).jpg'), image)
    await writeFile(join(dir, 'outside.txt'), 'Outside material must not be copied.')
    await symlink(join(dir, 'outside.txt'), join(root, 'alpha-skill', 'escape.jpg'))
    await graph.rebuildFromSkills()
    await graph.createNode({ id: 'raw:escape-test', kind: 'raw', title: 'escape.jpg', metadata: { managedBy: 'dsh-research-graph/import', path: 'alpha-skill/escape.jpg', binary: true } })
    const before = await graph.snapshot()
    const revisions = await graph.revisions()
    const exported = await graph.exportMarkdown(join(dir, 'export'))
    const moved = join(dir, 'moved 目录')
    await cp(exported.dir, moved, { recursive: true })
    const alphaFile = join(moved, 'skill', 'skill_alpha-skill.md')
    const alpha = await readFile(alphaFile, 'utf8')
    const betaFile = join(moved, 'skill', 'skill_beta-skill.md')
    const beta = await readFile(betaFile, 'utf8')
    const linked = (file: string, href: string): string => resolve(dirname(file), decodeURIComponent(href))
    const alphaLicense = /\[terms\]\(([^)]+)\)/u.exec(alpha)![1]!
    const betaLicense = /\[terms\]\(([^)]+)\)/u.exec(beta)![1]!
    expect(await readFile(linked(alphaFile, alphaLicense), 'utf8')).toContain('Alpha license, distinct content.')
    expect(await readFile(linked(betaFile, betaLicense), 'utf8')).toContain('Beta license, distinct content.')
    const imageHref = /<img src="([^"]+)">/u.exec(alpha)![1]!
    expect(await readFile(linked(alphaFile, imageHref))).toEqual(image)
    const directoryHref = /\[folder\]\(([^)]+)\)/u.exec(alpha)![1]!
    const directoryFile = linked(alphaFile, directoryHref)
    const directory = await readFile(directoryFile, 'utf8')
    const childHref = /\]\(([^)]+)\)/u.exec(directory)![1]!
    expect(await readFile(linked(directoryFile, childHref), 'utf8')).toContain('Reference body.')
    expect(alpha).toContain('[unrelated](../../outside.txt) ![escape](escape.jpg)')
    expect(alpha).toContain('`[code](LICENSE)`')
    expect(exported.files.filter(file => file.includes('_assets'))).toHaveLength(1)
    expect(exported.files.filter(file => file.includes('_directories'))).toHaveLength(1)
    expect(await graph.snapshot()).toEqual(before)
    expect(await graph.revisions()).toEqual(revisions)
  })

  it('resolves standalone Skill origins beside asset directories and leaves genuinely ambiguous origins unchanged', async () => {
    const { graph, dir, skillsRoot } = await setup({ skills: false })
    await mkdir(join(skillsRoot, 'topic', 'assets'), { recursive: true })
    await writeFile(join(skillsRoot, 'topic.md'), '---\nname: standalone-topic\ndescription: Topic.\n---\n[terms](LICENSE)\n')
    await writeFile(join(skillsRoot, 'LICENSE'), 'Root license, not topic subdirectory.')
    await graph.rebuildFromSkills()
    await graph.createNode({ id: 'raw:root-license', kind: 'raw', title: 'LICENSE', content: 'Root license, not topic subdirectory.', metadata: { managedBy: 'dsh-research-graph/import', path: 'LICENSE' } })
    const first = await graph.exportMarkdown(join(dir, 'first-export'))
    const file = join(first.dir, 'skill', 'skill_standalone-topic.md')
    const content = await readFile(file, 'utf8')
    const href = /\[terms\]\(([^)]+)\)/u.exec(content)![1]!
    expect(await readFile(resolve(dirname(file), decodeURIComponent(href)), 'utf8')).toContain('Root license, not topic subdirectory.')
    await writeFile(join(skillsRoot, 'topic', 'SKILL.md'), '---\nname: directory-topic\ndescription: Other topic.\n---\nOther.\n')
    const ambiguous = await graph.exportMarkdown(join(dir, 'ambiguous-export'))
    expect(await readFile(join(ambiguous.dir, 'skill', 'skill_standalone-topic.md'), 'utf8')).toContain('[terms](LICENSE)')
  })

  it('refuses asset output symlinks before writing outside the selected export root', async () => {
    const { graph, dir, skillsRoot } = await setup({ skills: false })
    await mkdir(join(skillsRoot, 'asset-skill'), { recursive: true })
    await writeFile(join(skillsRoot, 'asset-skill', 'SKILL.md'), '---\nname: asset-skill\ndescription: Asset.\n---\n![image](image.jpg)\n')
    await writeFile(join(skillsRoot, 'asset-skill', 'image.jpg'), Buffer.from([0, 255, 1]))
    await graph.rebuildFromSkills()
    const target = join(dir, 'export')
    const outside = join(dir, 'outside-export')
    await mkdir(target)
    await mkdir(outside)
    await symlink(outside, join(target, '_assets'))
    await expect(graph.exportMarkdown(target)).rejects.toMatchObject({ code: 'EXPORT_PATH_OUTSIDE_ROOT' })
    expect(await readdir(outside)).toEqual([])
  })

  it('rejects colliding document paths before overwriting either exported node', async () => {
    const { graph, dir } = await setup({ skills: false })
    await graph.createNode({ id: 'claim:a/b', kind: 'claim', title: 'First', content: 'First distinct body.' })
    await graph.createNode({ id: 'claim:a:b', kind: 'claim', title: 'Second', content: 'Second distinct body.' })
    const target = join(dir, 'export')
    await mkdir(join(target, 'claim'), { recursive: true })
    const file = join(target, 'claim', 'claim_a_b.md')
    await writeFile(file, 'Existing export stays unchanged.')
    const graphBytes = await readFile(join(dir, 'data', 'graph.json'))
    await expect(graph.exportMarkdown(target)).rejects.toMatchObject({ code: 'EXPORT_PATH_COLLISION' })
    expect(await readFile(file, 'utf8')).toBe('Existing export stays unchanged.')
    expect(await readFile(join(dir, 'data', 'graph.json'))).toEqual(graphBytes)
  })

  it('keeps the mirror in sync when writeMirror is enabled', async () => {
    const temp = await makeTempDir('mirror')
    cleanups.push(temp.cleanup)
    const skillsRoot = join(temp.dir, 'skills')
    await mkdir(skillsRoot, { recursive: true })
    const ctx = new Context()
    const dataDir = join(temp.dir, 'data')
    const graph = new ResearchGraphService(ctx, resolveConfig({ dataDir, skillsRoot, autoIndexSkills: false, writeMirror: true }, skillsRoot))
    await executeGraphRequest(graph, { op: 'node.create', node: { id: 'm:1', kind: 'memory', title: 'mirror me' } })
    const mirrored = await readFile(join(dataDir, 'mirror', 'memory', 'm_1.md'), 'utf8')
    expect(mirrored).toContain('# mirror me')
  })
})
