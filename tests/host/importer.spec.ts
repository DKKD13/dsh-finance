import { mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { rebuildFromSkills, IMPORT_MARKER } from '../../src/importer.ts'
import { GraphStore } from '../../src/store.ts'
import { discoverSkills } from '../../src/skills.ts'
import { makeTempDir, writeSkillsFixture } from './fixtures.ts'

const cleanups: (() => Promise<void>)[] = []
afterEach(async () => {
  while (cleanups.length > 0) await cleanups.pop()?.()
})

async function setup() {
  const temp = await makeTempDir('import')
  cleanups.push(temp.cleanup)
  const skillsRoot = join(temp.dir, 'skills')
  await mkdir(skillsRoot, { recursive: true })
  await writeSkillsFixture(skillsRoot)
  const store = await GraphStore.open(join(temp.dir, 'data'))
  return { store, skillsRoot }
}

describe('importer', () => {
  it('discovers nested skills including persona examples', async () => {
    const { skillsRoot } = await setup()
    const skills = await discoverSkills(skillsRoot)
    expect(skills.map(skill => skill.name).sort()).toEqual(['alpha-skill', 'beta-skill', 'gamma-persona'])
    expect(skills.find(skill => skill.name === 'gamma-persona')?.persona).toBe(true)
    expect(skills.find(skill => skill.name === 'alpha-skill')?.persona).toBe(false)
  })

  it('registers standalone frontmatter skills without duplicating them as parent resources', async () => {
    const { store, skillsRoot } = await setup()
    await writeFile(join(skillsRoot, 'alpha-skill', 'market-watch.md'), [
      '---', 'name: market-watch', 'description: Standalone market observation.', '---', '', '# Market watch', '',
    ].join('\n'), 'utf8')
    const skills = await discoverSkills(skillsRoot)
    expect(skills.map(skill => skill.name).sort()).toEqual(['alpha-skill', 'beta-skill', 'gamma-persona', 'market-watch'])
    expect(skills.find(skill => skill.name === 'market-watch')).toMatchObject({ standalone: true, relativeDir: 'alpha-skill/market-watch' })
    const report = await rebuildFromSkills(store, skillsRoot)
    expect(report.skills).toBe(4)
    expect(report.resources).toBe(2)
    expect(store.engine.getNode('skill:market-watch')?.content).toContain('# Market watch')
    expect(store.engine.getNode('reference:alpha-skill/market-watch.md')).toBeUndefined()
  })

  it('builds the import-managed subgraph with typed nodes and validated edges', async () => {
    const { store, skillsRoot } = await setup()
    const report = await rebuildFromSkills(store, skillsRoot)
    expect(report.skills).toBe(3)
    expect(report.resources).toBe(2)

    const alpha = store.engine.getNode('skill:alpha-skill')
    expect(alpha?.kind).toBe('skill')
    expect(alpha?.content).toContain('# Alpha')
    expect(alpha?.metadata.description).toBe('Alpha research skill.')
    expect(alpha?.metadata.managedBy).toBe(IMPORT_MARKER)

    const persona = store.engine.getNode('persona:gamma-persona')
    expect(persona?.kind).toBe('persona')

    const reference = store.engine.getNode('reference:alpha-skill/reference/details.md')
    expect(reference?.kind).toBe('reference')
    expect(reference?.content).toContain('Reference body.')

    const script = store.engine.getNode('script:alpha-skill/scripts/run.sh')
    expect(script?.kind).toBe('script')

    const kinds = [...store.engine.edges.values()].map(edge => `${edge.from} -${edge.kind}-> ${edge.to}`)
    expect(kinds).toContain('skill:alpha-skill -contain-> reference:alpha-skill/reference/details.md')
    expect(kinds).toContain('skill:alpha-skill -contain-> script:alpha-skill/scripts/run.sh')
    expect(kinds).toContain('skill:alpha-skill -references-> reference:alpha-skill/reference/details.md')
    expect(kinds).toContain('skill:alpha-skill -depends_on-> skill:beta-skill')
    expect(kinds).toContain('skill:beta-skill -references-> skill:alpha-skill')

    // beta-skill links to a missing file: recorded as unresolved, never as an edge.
    const beta = store.engine.getNode('skill:beta-skill')
    expect(beta?.metadata.unresolvedRefs).toEqual(['nowhere.md'])
    expect(store.engine.audit().brokenEdges).toEqual([])
    expect(store.engine.audit().unresolvedRefs).toEqual([{ node: 'skill:beta-skill', target: 'nowhere.md' }])
  })

  it('is idempotent on a second rebuild and syncs removals', async () => {
    const { store, skillsRoot } = await setup()
    await rebuildFromSkills(store, skillsRoot)
    const revision = store.currentRevision
    const file = join(store.dir, 'graph.json')
    const persisted = await readFile(file, 'utf8')
    const second = await rebuildFromSkills(store, skillsRoot)
    expect(second.diff.nodesAdded).toEqual([])
    expect(second.diff.nodesRemoved).toEqual([])
    expect(second.diff.nodesUpdated).toEqual([])
    expect(second.diff.edgesAdded).toEqual([])
    expect(store.currentRevision).toBe(revision)
    expect(store.revisions).toHaveLength(1)
    expect(await readFile(file, 'utf8')).toBe(persisted)

    const reopened = await GraphStore.open(store.dir)
    await rebuildFromSkills(reopened, skillsRoot)
    expect(reopened.currentRevision).toBe(revision)
    expect(reopened.revisions).toHaveLength(1)

    // Removing a skill removes its managed nodes and edges, but not user data.
    await rm(join(skillsRoot, 'beta-skill'), { recursive: true })
    await store.mutate('node.create', 'user note', () => ({ diff: store.engine.createNode({ id: 'user-note', kind: 'memory', title: 'user note' }).diff, result: undefined }))
    await store.mutate('edge.add', 'note edge', () => ({ diff: store.engine.addEdge({ from: 'user-note', to: 'skill:alpha-skill', kind: 'informed_by' }).diff, result: undefined }))
    const beforeSync = store.currentRevision
    const third = await rebuildFromSkills(store, skillsRoot)
    expect(third.diff.nodesRemoved).toContain('skill:beta-skill')
    expect(store.currentRevision).toBe(beforeSync + 1)
    expect(store.engine.getNode('skill:beta-skill')).toBeUndefined()
    expect(store.engine.getNode('user-note')).toBeDefined()
    expect([...store.engine.edges.values()].some(edge => edge.from === 'user-note')).toBe(true)
    expect(store.engine.audit().brokenEdges).toEqual([])
  })

  it('fails loudly when the root holds no skills and nothing was imported before', async () => {
    const temp = await makeTempDir('empty')
    cleanups.push(temp.cleanup)
    const skillsRoot = join(temp.dir, 'skills')
    await mkdir(skillsRoot, { recursive: true })
    const store = await GraphStore.open(join(temp.dir, 'data'))
    await expect(rebuildFromSkills(store, skillsRoot)).rejects.toMatchObject({ code: 'IMPORT_EMPTY' })
  })

  it('records the import as one revision with a merged diff', async () => {
    const { store, skillsRoot } = await setup()
    const before = store.currentRevision
    await rebuildFromSkills(store, skillsRoot)
    expect(store.currentRevision).toBe(before + 1)
    const entry = store.revisions.at(-1)
    expect(entry?.op).toBe('skills.rebuild')
    expect(entry?.diff.nodesAdded.length).toBeGreaterThan(0)
    const diff = store.diffRevisions(before)
    expect(diff.nodesAdded).toContain('skill:alpha-skill')
  })
})
