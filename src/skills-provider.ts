/**
 * SkillProvider adapter registering every directory or standalone bundled
 * skill with the Harness registry, including nested persona skills.
 * Discovery re-reads the filesystem
 * on every catalog collect; bodies are read fresh on `get()`.
 * @module deepseek-harness-finance-plugin/skills-provider
 */

import { readFile } from 'node:fs/promises'
import type { Context } from '@deepseek-ai/cordis'
import { BUNDLED_SKILL_RANK, isSkillName } from '@deepseek-ai/dsh-skill'
import type { SkillCandidate, SkillDefinition, SkillLookupOptions, SkillProvider } from '@deepseek-ai/dsh-skill'
import { parseMarkdown } from './markdown.ts'
import { discoverSkills } from './skills.ts'
import type { DiscoveredSkill } from './skills.ts'

/** Provider name reported to the skill registry. */
export const SKILLS_PROVIDER_NAME = 'deepseek-harness-finance-plugin'

interface SkillLocator {
  readonly file: string
}

/**
 * Register the bundled-skills provider on the Harness skill registry.
 * Discovered skills whose names violate the registry's kebab-case grammar
 * are skipped with a warning instead of poisoning the whole catalog.
 * @param ctx - plugin context owning the registration.
 * @param skillsRoot - absolute skills root directory.
 * @returns the registration disposer.
 */
export function registerSkillsProvider(ctx: Context, skillsRoot: string): () => void {
  return ctx.skills.registerProvider(() => new BundledSkillsProvider(skillsRoot, message => {
    ctx.logger.warn(message)
  }))
}

class BundledSkillsProvider implements SkillProvider {
  readonly name = SKILLS_PROVIDER_NAME

  constructor(
    private readonly skillsRoot: string,
    private readonly warn: (message: string) => void,
  ) {}

  async list(_options: SkillLookupOptions): Promise<readonly SkillCandidate[]> {
    let skills: DiscoveredSkill[]
    try {
      skills = await discoverSkills(this.skillsRoot)
    } catch (error: unknown) {
      if (typeof error === 'object' && error !== null && (error as { code?: unknown }).code === 'ENOENT') return []
      throw error
    }
    const candidates: SkillCandidate[] = []
    const seen = new Set<string>()
    for (const skill of skills) {
      if (!isSkillName(skill.name)) {
        this.warn(`skill at ${skill.relativeDir} has invalid name ${JSON.stringify(skill.name)} and is skipped`)
        continue
      }
      if (seen.has(skill.name)) {
        this.warn(`duplicate skill name ${JSON.stringify(skill.name)} at ${skill.relativeDir} is skipped`)
        continue
      }
      seen.add(skill.name)
      candidates.push(this.candidate(skill))
    }
    return candidates
  }

  async get(candidate: SkillCandidate, _options: SkillLookupOptions): Promise<SkillDefinition | undefined> {
    const locator = candidate.locator as SkillLocator
    let text: string
    try {
      text = await readFile(locator.file, 'utf8')
    } catch (error: unknown) {
      if (typeof error === 'object' && error !== null && (error as { code?: unknown }).code === 'ENOENT') return undefined
      throw error
    }
    const parsed = parseMarkdown(text, candidate.name)
    const definition: SkillDefinition = {
      name: candidate.name,
      description: candidate.description,
      invocation: candidate.invocation,
      source: candidate.source,
      provider: this.name,
      content: parsed.body,
      resourceBase: { kind: 'directory', path: locator.file.slice(0, locator.file.lastIndexOf('/')) },
      ...(candidate.path === undefined ? {} : { path: candidate.path }),
      ...(candidate.metadata === undefined ? {} : { metadata: candidate.metadata }),
    }
    return definition
  }

  private candidate(skill: DiscoveredSkill): SkillCandidate {
    return {
      name: skill.name,
      description: skill.description,
      invocation: { modelInvocable: true, userInvocable: true },
      source: 'bundled',
      provider: this.name,
      rank: BUNDLED_SKILL_RANK,
      locator: { file: skill.file } satisfies SkillLocator,
      path: skill.file,
      resourceBase: { kind: 'directory', path: skill.dir },
      metadata: { persona: skill.persona, relativeDir: skill.relativeDir },
    }
  }
}
