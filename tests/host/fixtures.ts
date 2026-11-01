/** Shared fixture builders for host tests. */
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

/** One temporary directory, removed on cleanup. */
export async function makeTempDir(prefix: string): Promise<{ dir: string; cleanup: () => Promise<void> }> {
  const dir = await mkdtemp(join(tmpdir(), `dsh-rg-${prefix}-`))
  return { dir, cleanup: () => rm(dir, { recursive: true, force: true }) }
}

/** A small skills tree covering skill/persona/reference/script classification and every reference form. */
export async function writeSkillsFixture(root: string): Promise<void> {
  await mkdir(join(root, 'alpha-skill', 'reference'), { recursive: true })
  await mkdir(join(root, 'alpha-skill', 'scripts'), { recursive: true })
  await mkdir(join(root, 'beta-skill'), { recursive: true })
  await mkdir(join(root, 'board', 'examples', 'gamma-persona'), { recursive: true })
  await writeFile(join(root, 'alpha-skill', 'SKILL.md'), [
    '---',
    'name: alpha-skill',
    'description: Alpha research skill.',
    'dependencies:',
    '  - beta-skill',
    '---',
    '',
    '# Alpha',
    '',
    'See [details](reference/details.md) and **[READ]** `reference/details.md`.',
    'Also mentions `beta-skill` inline.',
    '',
  ].join('\n'), 'utf8')
  await writeFile(join(root, 'alpha-skill', 'reference', 'details.md'), '# Details\n\nReference body.\n', 'utf8')
  await writeFile(join(root, 'alpha-skill', 'scripts', 'run.sh'), '#!/bin/sh\necho alpha\n', 'utf8')
  await writeFile(join(root, 'beta-skill', 'SKILL.md'), [
    '---',
    'name: beta-skill',
    'description: |',
    '  Beta skill with a folded',
    '  multi-line description.',
    '---',
    '',
    '# Beta',
    '',
    'Uses `alpha-skill` and points at [missing](nowhere.md).',
    '',
  ].join('\n'), 'utf8')
  await writeFile(join(root, 'board', 'examples', 'gamma-persona', 'SKILL.md'), [
    '---',
    'name: gamma-persona',
    'description: Example persona skill.',
    '---',
    '',
    '# Gamma',
    '',
  ].join('\n'), 'utf8')
}
