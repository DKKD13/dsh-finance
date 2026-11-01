/**
 * Recursive discovery and classification of bundled skills: finds directory
 * `SKILL.md` entrypoints and standalone Markdown files with skill frontmatter,
 * including nested personas, and classifies resources without double ownership.
 * @module dsh-research-graph/skills
 */

import { readdir, readFile } from 'node:fs/promises'
import { dirname, join, relative, sep } from 'node:path'
import { parseMarkdown } from './markdown.ts'
import type { NodeKind } from './graph.ts'

/** File name that marks a skill directory. */
export const SKILL_FILE = 'SKILL.md'

/** Resource content is mirrored into graph nodes up to this size in bytes. */
export const RESOURCE_CONTENT_LIMIT = 64 * 1024

const BINARY_EXTENSIONS = new Set([
  '.png', '.jpg', '.jpeg', '.gif', '.webp', '.ico', '.svgz',
  '.pdf', '.zip', '.gz', '.tar', '.mp4', '.mov', '.woff', '.woff2', '.ttf', '.otf',
])

const SCRIPT_EXTENSIONS = new Set(['.sh', '.bash', '.zsh', '.py', '.ps1', '.mjs', '.cjs', '.js', '.ts'])

const SKIPPED_DIRECTORIES = new Set(['node_modules', '.git', '.hg', '.svn'])

/** One discovered directory or standalone skill. */
export interface DiscoveredSkill {
  /** Absolute path of the skill Markdown entrypoint. */
  readonly file: string
  /** Absolute path of the skill directory. */
  readonly dir: string
  /** Skill name from frontmatter, falling back to the directory name. */
  readonly name: string
  /** Routing description from frontmatter, falling back to the name. */
  readonly description: string
  /** True for skills nested under an `examples` segment (persona skills). */
  readonly persona: boolean
  /** Path of the skill directory relative to the scanned root. */
  readonly relativeDir: string
  /** True for a standalone frontmatter Markdown file rather than a SKILL.md directory. */
  readonly standalone: boolean
}

/** One non-SKILL.md file inside a skill directory. */
export interface DiscoveredResource {
  /** Absolute file path. */
  readonly file: string
  /** Path relative to the owning skill directory. */
  readonly relativePath: string
  /** Graph node kind derived from directory and extension. */
  readonly kind: NodeKind
  /** Whether the file is binary and its content is not mirrored. */
  readonly binary: boolean
}

function extensionOf(file: string): string {
  const base = file.slice(file.lastIndexOf('/') + 1)
  const dot = base.lastIndexOf('.')
  return dot < 1 ? '' : base.slice(dot).toLowerCase()
}

/**
 * Classify one resource file inside a skill directory.
 * @param relativePath - path relative to the skill directory.
 * @returns the node kind and binary flag.
 */
export function classifyResource(relativePath: string): { kind: NodeKind; binary: boolean } {
  const extension = extensionOf(relativePath)
  if (BINARY_EXTENSIONS.has(extension)) return { kind: 'raw', binary: true }
  const segments = relativePath.split('/')
  if (segments.includes('scripts') || SCRIPT_EXTENSIONS.has(extension)) return { kind: 'script', binary: false }
  if (segments.includes('reference') || segments.includes('references') || extension === '.md') return { kind: 'reference', binary: false }
  return { kind: 'raw', binary: false }
}

/**
 * Recursively list files under one directory, skipping VCS and dependency
 * directories. Returned paths are relative to `root` and use `/` separators.
 * @param root - absolute directory to walk.
 * @returns relative file paths, sorted.
 */
export async function walkFiles(root: string): Promise<string[]> {
  const found: string[] = []
  async function walk(dir: string, prefix: string): Promise<void> {
    const entries = await readdir(dir, { withFileTypes: true })
    for (const entry of entries) {
      if (entry.name.startsWith('.') && entry.name !== '.') continue
      const path = join(dir, entry.name)
      const rel = prefix === '' ? entry.name : `${prefix}/${entry.name}`
      if (entry.isDirectory()) {
        if (SKIPPED_DIRECTORIES.has(entry.name)) continue
        await walk(path, rel)
      } else if (entry.isFile()) {
        found.push(rel)
      }
    }
  }
  await walk(root, '')
  found.sort()
  return found
}

/**
 * Discover every skill under a root. A `SKILL.md` defines a directory skill;
 * any other Markdown file with explicit non-empty name/description frontmatter
 * defines a standalone skill. Directories below `examples` remain personas.
 * @param root - absolute skills root directory.
 * @returns discovered skills sorted by relative directory.
 */
export async function discoverSkills(root: string): Promise<DiscoveredSkill[]> {
  const files = await walkFiles(root)
  const skills: DiscoveredSkill[] = []
  for (const rel of files) {
    const lower = rel.toLowerCase()
    const skillFile = lower === SKILL_FILE.toLowerCase() || lower.endsWith(`/${SKILL_FILE.toLowerCase()}`)
    if (!skillFile && !lower.endsWith('.md')) continue
    const file = join(root, rel)
    const parsed = parseMarkdown(await readFile(file, 'utf8'), rel)
    const frontmatter = parsed.frontmatter ?? {}
    const nameValue = frontmatter.name
    const descriptionValue = frontmatter.description
    if (!skillFile && (typeof nameValue !== 'string' || nameValue.trim().length === 0
      || typeof descriptionValue !== 'string' || descriptionValue.trim().length === 0)) continue
    const dir = dirname(file)
    const relativeDir = skillFile ? relative(root, dir).split(sep).join('/') : rel.slice(0, -3)
    const dirName = relativeDir.slice(relativeDir.lastIndexOf('/') + 1)
    const name = typeof nameValue === 'string' && nameValue.trim().length > 0 ? nameValue.trim() : dirName
    const description = typeof descriptionValue === 'string' && descriptionValue.trim().length > 0
      ? descriptionValue.trim()
      : name
    const segments = relativeDir.split('/')
    skills.push({
      file,
      dir,
      name,
      description,
      persona: segments.includes('examples'),
      relativeDir,
      standalone: !skillFile,
    })
  }
  return skills
}

/**
 * List resources owned by a directory skill. Standalone skills own no sibling
 * resources, and standalone entrypoints are never duplicated as references of
 * a parent directory skill.
 * @param skill - discovered skill whose directory is scanned.
 * @param allSkills - every skill discovered under the same root.
 * @returns classified resources sorted by relative path.
 */
export async function discoverResources(skill: DiscoveredSkill, allSkills: readonly DiscoveredSkill[]): Promise<DiscoveredResource[]> {
  if (skill.standalone) return []
  const nested = allSkills
    .filter(other => other.dir !== skill.dir && other.dir.startsWith(`${skill.dir}/`))
    .map(other => `${relative(skill.dir, other.dir).split(sep).join('/')}/`)
  const skillFiles = new Set(allSkills.map(other => other.file))
  const files = await walkFiles(skill.dir)
  return files
    .filter(rel => !skillFiles.has(join(skill.dir, rel)))
    .filter(rel => !nested.some(prefix => rel.startsWith(prefix)))
    .map(rel => ({ file: join(skill.dir, rel), relativePath: rel, ...classifyResource(rel) }))
}
