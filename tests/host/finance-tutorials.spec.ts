import { mkdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { Context } from '@deepseek-ai/cordis'
import { CommandRuntime, parseCommand } from '@deepseek-ai/dsh-commands'
import type { CommandDefinition, CommandInvocation } from '@deepseek-ai/dsh-commands'
import { SkillRegistry } from '@deepseek-ai/dsh-skill'
import type { ToolDefinition } from '@deepseek-ai/dsh-tools'
import { afterEach, describe, expect, it } from 'vitest'
import * as plugin from '../../src/index.ts'
import { FINANCE_OPS, executeFinanceRequest } from '../../src/finance/protocol.ts'
import type { FinanceRequest } from '../../src/finance/protocol.ts'
import type { FinanceService } from '../../src/finance/service.ts'
import type { ResearchGraphChange } from '../../src/service.ts'
import {
  TUTORIAL_ALIASES,
  TUTORIAL_DEMO_CLIP,
  TUTORIAL_DEMO_SOURCE,
  TUTORIAL_LESSONS,
  TUTORIAL_SECTIONS,
  TUTORIAL_SECTION_LABELS,
  findTutorialLesson,
  tutorialLessonIds,
} from '../../shared/tutorials.ts'
import { makeTempDir, writeSkillsFixture } from './fixtures.ts'

const cleanups: (() => Promise<void>)[] = []
afterEach(async () => {
  while (cleanups.length > 0) await cleanups.pop()?.()
})

const REQUIRED_LESSON_IDS = ['first-chain', 'ticker-deep-research', 'hypothesis-review-drift', 'portfolio-weekly', 'web-clipper'] as const

interface Harness {
  runCommand: (line: string) => Promise<{ kind: string; text?: string } | undefined>
  revision: () => Promise<number>
  events: ResearchGraphChange[]
}

/** Compose the real host plugin: skill + command registries, a collecting tools registry, no skills import. */
async function compose(): Promise<Harness> {
  const temp = await makeTempDir('tutorial')
  cleanups.push(temp.cleanup)
  const skillsRoot = join(temp.dir, 'skills')
  await mkdir(skillsRoot, { recursive: true })
  await writeSkillsFixture(skillsRoot)
  const app = new Context()
  await app.plugin(SkillRegistry)
  await app.plugin(CommandRuntime)
  app.provide('tools', {
    register(_definition: ToolDefinition) {
      return () => {}
    },
  })
  const events: ResearchGraphChange[] = []
  app.on('research-graph/change', change => { events.push(change) })
  await app.plugin(plugin, { dataDir: join(temp.dir, 'data'), skillsRoot, autoIndexSkills: false })
  const runCommand = async (line: string) => {
    const parsed = parseCommand(line)
    if (parsed === undefined) return undefined
    const definition: CommandDefinition | undefined = app.commands.find(undefined as never, parsed.name)
    if (definition === undefined) return undefined
    const invocation = {
      commandId: 'cmd-tutorial',
      agent: undefined,
      rawInput: parsed.rawInput,
      signal: new AbortController().signal,
    } as unknown as CommandInvocation
    return definition.handler(invocation)
  }
  return { runCommand, revision: () => app.researchGraph.currentRevision(), events }
}

describe('finance tutorial manifest', () => {
  it('ships the required lessons with unique kebab-case ids and resolvable aliases', () => {
    const ids = tutorialLessonIds()
    expect(ids.length).toBeGreaterThanOrEqual(5)
    expect(new Set(ids).size).toBe(ids.length)
    for (const required of REQUIRED_LESSON_IDS) expect(ids).toContain(required)
    for (const id of ids) expect(id).toMatch(/^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/u)

    for (const [alias, target] of Object.entries(TUTORIAL_ALIASES)) {
      expect(ids).not.toContain(alias)
      expect(ids).toContain(target)
      expect(findTutorialLesson(alias)?.id).toBe(target)
    }
    expect(findTutorialLesson('  FILE-INGEST ')?.id).toBe('web-clipper')
    expect(findTutorialLesson('')).toBeUndefined()
    expect(findTutorialLesson('no-such-lesson')).toBeUndefined()
  })

  it('maps every step to a real workspace section and visits all of them across the lessons', () => {
    const admitted = new Set<string>(TUTORIAL_SECTIONS)
    for (const section of TUTORIAL_SECTIONS) {
      expect(TUTORIAL_SECTION_LABELS[section].trim().length).toBeGreaterThan(0)
    }
    for (const lesson of TUTORIAL_LESSONS) {
      expect(lesson.steps.length).toBeGreaterThanOrEqual(3)
      expect(lesson.steps.length).toBeLessThanOrEqual(7)
      const visited = new Set<string>()
      for (const step of lesson.steps) {
        expect(admitted.has(step.section)).toBe(true)
        visited.add(step.section)
        expect(step.title.trim().length).toBeGreaterThan(3)
        expect(step.detail.trim().length).toBeGreaterThanOrEqual(60)
        expect(step.detail.trim().length).toBeLessThanOrEqual(320)
      }
      // A lesson that never changes section is a wall of text, not a walk through the workspace.
      expect(visited.size).toBeGreaterThanOrEqual(2)
    }
    const covered = new Set<string>(TUTORIAL_LESSONS.flatMap(lesson => lesson.steps.map(step => step.section)))
    expect([...TUTORIAL_SECTIONS].filter(section => !covered.has(section))).toEqual([])
  })

  it('keeps every lesson self-contained: goal, cutoff, run id, limits and display-only prompts', () => {
    const prompts: string[] = []
    for (const lesson of TUTORIAL_LESSONS) {
      expect(lesson.title.trim().length).toBeGreaterThan(10)
      expect(lesson.summary.trim().length).toBeGreaterThan(30)
      expect(lesson.goal.trim().length).toBeGreaterThan(30)
      expect(lesson.duration).toMatch(/\d+\s*min/iu)
      expect(lesson.prerequisites.length).toBeGreaterThan(0)
      expect(lesson.limits.length).toBeGreaterThanOrEqual(2)
      expect(lesson.expected.trim().length).toBeGreaterThan(30)
      expect(lesson.asOf).toMatch(/asOf|cutoff/iu)
      expect(lesson.runId).toMatch(/runId|uuid|run-<hash>/iu)
      for (const item of [...lesson.prerequisites, ...lesson.limits]) expect(item.trim().length).toBeGreaterThan(20)
      if (lesson.prompt !== undefined) prompts.push(lesson.prompt)
      for (const step of lesson.steps) if (step.prompt !== undefined) prompts.push(step.prompt)
    }
    expect(prompts.length).toBeGreaterThanOrEqual(5)
    for (const prompt of prompts) {
      expect(prompt.startsWith('/')).toBe(true)
      // Skill prompts document the exact run inputs; the finance example is a Host subcommand.
      if (!prompt.startsWith('/finance ')) {
        expect(prompt).toContain('runId=')
        expect(prompt).toContain('asOf=')
      }
    }
    const clipper = findTutorialLesson('web-clipper')
    expect(clipper?.prompt).toContain('<published-or-available ISO>')
    expect(clipper?.prompt).toContain('<explicit asOf ISO>')
    expect(clipper?.prompt).not.toMatch(/20\d\d-\d\d-\d\dT/)
    expect(clipper?.steps[0]?.prompt).toContain('<explicit asOf ISO>')
  })

  it('ships a real, non-empty public demo clip with explicit source and availability', () => {
    expect(TUTORIAL_DEMO_CLIP.schema).toBe('dsh.clipper/v1')
    expect(TUTORIAL_DEMO_CLIP.type).toBe('selection')
    expect(new URL(TUTORIAL_DEMO_CLIP.url).hostname).toBe('www.apple.com')
    expect(TUTORIAL_DEMO_SOURCE.publisher).toBe('Apple Newsroom')
    expect(TUTORIAL_DEMO_SOURCE.excerptOnly).toBe(true)
    expect(TUTORIAL_DEMO_SOURCE.fixture).toMatch(/^\.verification\/kth-ui-chain\/evidence\/ui-clip-input\.json$/u)
    expect(Date.parse(TUTORIAL_DEMO_CLIP.availableAt)).toBe(Date.parse(TUTORIAL_DEMO_SOURCE.availableAt))
    expect(Date.parse(TUTORIAL_DEMO_CLIP.asOf)).toBeGreaterThanOrEqual(Date.parse(TUTORIAL_DEMO_CLIP.availableAt))
    // Capture happened later than publication on purpose: capturedAt is provenance, not availability.
    expect(Date.parse(TUTORIAL_DEMO_CLIP.capturedAt)).toBeGreaterThan(Date.parse(TUTORIAL_DEMO_CLIP.availableAt))
    expect(TUTORIAL_DEMO_CLIP.provenance.sourceUrl).toBe(TUTORIAL_DEMO_CLIP.url)
    expect(TUTORIAL_DEMO_CLIP.provenance.availableAtBasis).toMatch(/publication date/iu)
    expect(TUTORIAL_DEMO_CLIP.provenance.notice).toMatch(/excerpt/iu)
    expect(TUTORIAL_DEMO_SOURCE.notice).toMatch(/excerpt/iu)

    const text = TUTORIAL_DEMO_CLIP.content.text
    expect(text.trim().length).toBeGreaterThan(600)
    expect(text).toContain('$102.5 billion')
    expect(text).toContain('September 27, 2025')
    expect(text).not.toMatch(/lorem|TODO|FIXME/iu)

    const annotation = TUTORIAL_DEMO_CLIP.annotations[0]
    expect(annotation).toBeDefined()
    if (annotation === undefined) return
    const index = text.indexOf(annotation.exact)
    expect(index).toBeGreaterThan(-1)
    expect(text.slice(index - annotation.prefix.length, index)).toBe(annotation.prefix)
    expect(text.slice(index + annotation.exact.length, index + annotation.exact.length + annotation.suffix.length)).toBe(annotation.suffix)
    expect(annotation.note.length).toBeGreaterThan(40)
    expect(annotation.tags).toContain('observed-result')
  })

  it('reproduces the workspace verification fixture verbatim when that evidence is present', async () => {
    const fixtureUrl = new URL(`../../${TUTORIAL_DEMO_SOURCE.fixture}`, import.meta.url)
    let fixture: { url?: string; availableAt?: string; content?: { text?: string }; annotations?: unknown } | undefined
    try {
      fixture = JSON.parse(await readFile(fileURLToPath(fixtureUrl), 'utf8')) as typeof fixture
    } catch {
      fixture = undefined
    }
    // The fixture is workspace evidence, not package content; a clean checkout may omit it.
    if (fixture === undefined) return
    expect(fixture.url).toBe(TUTORIAL_DEMO_CLIP.url)
    expect(fixture.availableAt).toBe(TUTORIAL_DEMO_CLIP.availableAt)
    expect(fixture.content?.text).toBe(TUTORIAL_DEMO_CLIP.content.text)
    expect(fixture.annotations).toEqual(TUTORIAL_DEMO_CLIP.annotations)
  })
})

describe('tutorial demo clip', () => {
  it('is accepted verbatim by the real dry-run Clipper importer and writes nothing', async () => {
    const harness = await compose()
    const input = { bundle: TUTORIAL_DEMO_CLIP, dryRun: true, asOf: '2025-10-31T00:00:00.000Z', runId: 'tutorial-demo-preview' }
    const preview = await harness.runCommand(`/finance clip-import ${JSON.stringify(input)}`)
    expect(preview?.kind).toBe('success')
    expect(preview?.text).toContain('"received": 1')
    expect(preview?.text).toContain('"accepted": 1')
    expect(preview?.text).toContain('"quarantined": 0')
    expect(preview?.text).toContain('"dryRun": true')
    expect(preview?.text).toContain('"runId": "tutorial-demo-preview"')
    expect(await harness.revision()).toBe(0)
    expect(harness.events).toEqual([])
  })
})

describe('/finance guide', () => {
  it('is advertised in /finance help and lists every lesson without touching the graph', async () => {
    const harness = await compose()
    expect(await harness.revision()).toBe(0)

    const help = await harness.runCommand('/finance help')
    expect(help?.kind).toBe('success')
    expect(help?.text).toContain('guide [id]')

    const index = await harness.runCommand('/finance guide')
    expect(index?.kind).toBe('success')
    for (const id of tutorialLessonIds()) expect(index?.text).toContain(id)
    expect(index?.text).toContain('never sent')

    const lesson = await harness.runCommand('/finance guide first-chain')
    expect(lesson?.kind).toBe('success')
    const text = lesson?.text ?? ''
    for (const label of ['[Inbox]', '[Library]', '[Hypotheses]', '[Reports]']) expect(text).toContain(label)
    expect(text).toContain('/knowledge-compiler')
    expect(text).toContain('asOf: 2025-10-31T00:00:00.000Z')
    expect(text).toContain('runId: compile:<uuid>')
    expect(text).toContain('Limits:')
    expect(text).toContain('"schema": "dsh.clipper/v1"')
    expect(text).toContain(TUTORIAL_DEMO_SOURCE.url)
    expect(text).toContain(TUTORIAL_DEMO_SOURCE.fixture)
    expect(text).toContain(`Replay: /finance guide first-chain`)

    expect(await harness.revision()).toBe(0)
    expect(harness.events).toEqual([])
  })

  it('resolves aliases and rejects unknown ids with the available list', async () => {
    const harness = await compose()
    const alias = await harness.runCommand('/finance guide file-ingest')
    const canonical = await harness.runCommand('/finance guide web-clipper')
    expect(alias?.kind).toBe('success')
    expect(alias?.text).toBe(canonical?.text)
    expect(alias?.text).toContain('[Workflow]')

    const unknown = await harness.runCommand('/finance guide no-such-lesson')
    expect(unknown?.kind).toBe('error')
    expect(unknown?.text).toContain('Unknown guide "no-such-lesson"')
    for (const id of tutorialLessonIds()) expect(unknown?.text).toContain(id)
    expect(unknown?.text).toContain('/finance guide [id]')
    expect(await harness.revision()).toBe(0)
  })

  it('keeps the JSON dispatcher at 24 ops: guide is human-only and cannot be invoked as an op', async () => {
    expect(FINANCE_OPS).toHaveLength(28)
    expect(FINANCE_OPS).toEqual(expect.arrayContaining(['fund.state', 'fund.configure', 'fund.researcher', 'fund.advance']))
    expect((FINANCE_OPS as readonly string[])).not.toContain('guide')
    const response = await executeFinanceRequest({} as unknown as FinanceService, { op: 'guide' } as unknown as FinanceRequest)
    expect(response.ok).toBe(false)
    if (!response.ok) expect(response.error.code).toBe('UNKNOWN_OP')

    const harness = await compose()
    const jsonGuide = await harness.runCommand('/finance {"op":"guide"}')
    expect(jsonGuide?.kind).toBe('error')
    expect(jsonGuide?.text).toContain('UNKNOWN_OP')
    const jsonStats = await harness.runCommand('/finance {"op":"graph.stats"}')
    expect(jsonStats?.kind).toBe('success')
    expect(jsonStats?.text).toContain('"ok": true')
    expect(jsonStats?.text).toContain('"nodes": 0')
  })
})
