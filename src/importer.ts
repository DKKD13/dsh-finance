/**
 * First-build and rebuild of the graph from the bundled skills: turns every
 * discovered skill into a `skill`/`persona` node, its resource files into
 * `reference`/`script`/`raw` nodes, and its Markdown links, READ markers,
 * and declared dependencies into edges. A rebuild is a full sync of the
 * import-managed subgraph recorded as at most one revision; hand-made nodes and
 * edges are never touched.
 * @module dsh-research-graph/importer
 */

import { readFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { GraphError, edgeIdOf, emptyDiff, mergeDiffs } from './graph.ts'
import type { EdgeInput, GraphDiff, GraphNode, JsonValue, NodeInput } from './graph.ts'
import { extractDeclaredDependencies, extractMarkdownLinks, extractMentionedSkills, extractReadReferences, isExternalTarget, parseMarkdown } from './markdown.ts'
import { RESOURCE_CONTENT_LIMIT, discoverResources, discoverSkills } from './skills.ts'
import type { DiscoveredSkill } from './skills.ts'
import type { GraphStore } from './store.ts'

/** Node/edge metadata marker identifying everything the importer owns. */
export const IMPORT_MARKER = 'dsh-research-graph/import'

/** Outcome of one skills import run. */
export interface ImportReport {
  /** Skills discovered under the scanned root. */
  readonly skills: number
  /** Resource files imported. */
  readonly resources: number
  /** The merged diff recorded as the import revision. */
  readonly diff: GraphDiff
}

/** Convert YAML-parsed frontmatter values into lossless JSON. */
function toJsonValue(value: unknown): JsonValue {
  if (value === null || typeof value === 'boolean' || typeof value === 'string') return value
  if (typeof value === 'number') return Number.isFinite(value) ? value : String(value)
  if (value instanceof Date) return value.toISOString()
  if (Array.isArray(value)) return value.map(toJsonValue)
  if (typeof value === 'object') {
    return Object.fromEntries(Object.entries(value as Record<string, unknown>).map(([key, entry]) => [key, toJsonValue(entry)]))
  }
  return String(value)
}

/** Graph id of one skill (`skill:<name>` or `persona:<name>`). */
export function skillNodeId(skill: DiscoveredSkill): string {
  return `${skill.persona ? 'persona' : 'skill'}:${skill.name}`
}

/** Graph id of one resource file inside a skill. */
export function resourceNodeId(skill: DiscoveredSkill, kind: string, relativePath: string): string {
  return `${kind}:${skill.name}/${relativePath}`
}

interface DesiredGraph {
  nodes: Map<string, NodeInput>
  edges: EdgeInput[]
}

/** Resolve one relative link target against the file that contains it. */
function resolveTarget(fromFile: string, target: string): string {
  const withoutAnchor = target.split('#')[0] ?? target
  return resolve(dirname(fromFile), withoutAnchor)
}

/** Compute the complete desired import-managed subgraph for one root. */
async function planImport(root: string): Promise<DesiredGraph> {
  const skills = await discoverSkills(root)
  const desired: DesiredGraph = { nodes: new Map(), edges: [] }
  const skillByFile = new Map<string, DiscoveredSkill>()
  const resourceNodeByFile = new Map<string, string>()
  const skillNames = new Set(skills.map(skill => skill.name))

  for (const skill of skills) skillByFile.set(skill.file, skill)

  // Resources are planned first so SKILL.md links can resolve to their ids.
  for (const skill of skills) {
    for (const resource of await discoverResources(skill, skills)) {
      const id = resourceNodeId(skill, resource.kind, resource.relativePath)
      resourceNodeByFile.set(resource.file, id)
      let content = ''
      const metadata: Record<string, JsonValue> = {
        managedBy: IMPORT_MARKER,
        path: `${skill.relativeDir}/${resource.relativePath}`,
        ownerSkill: skill.name,
      }
      if (resource.binary) {
        metadata.binary = true
      } else {
        const text = await readFile(resource.file, 'utf8')
        if (Buffer.byteLength(text, 'utf8') > RESOURCE_CONTENT_LIMIT) {
          content = text.slice(0, RESOURCE_CONTENT_LIMIT)
          metadata.truncated = true
        } else {
          content = text
        }
      }
      desired.nodes.set(id, { id, kind: resource.kind, title: resource.relativePath, content, metadata })
      desired.edges.push({ from: skillNodeId(skill), to: id, kind: 'contain' })
    }
  }

  for (const skill of skills) {
    const id = skillNodeId(skill)
    const text = await readFile(skill.file, 'utf8')
    const parsed = parseMarkdown(text, skill.relativeDir)
    const unresolvedRefs: string[] = []
    const edgeKeys = new Set(desired.edges.map(edge => edgeIdOf(edge.from, edge.to, edge.kind)))
    const linkTargets = [
      ...extractMarkdownLinks(parsed.body).map(link => link.target),
      ...extractReadReferences(parsed.body),
    ]
    const pushEdge = (edge: EdgeInput): void => {
      const key = edgeIdOf(edge.from, edge.to, edge.kind)
      if (edgeKeys.has(key) || edge.from === edge.to) return
      edgeKeys.add(key)
      desired.edges.push(edge)
    }
    for (const target of linkTargets) {
      if (isExternalTarget(target)) continue
      const absolute = resolveTarget(skill.file, target)
      const linkedSkill = skillByFile.get(absolute)
      const linkedResource = resourceNodeByFile.get(absolute)
      const to = linkedSkill !== undefined ? skillNodeId(linkedSkill) : linkedResource
      if (to === undefined) {
        unresolvedRefs.push(target)
        continue
      }
      pushEdge({ from: id, to, kind: 'references' })
    }
    const dependencies = extractDeclaredDependencies(parsed.frontmatter, skill.relativeDir)
    for (const dependency of dependencies) {
      const target = skills.find(candidate => candidate.name === dependency)
      if (target === undefined) {
        unresolvedRefs.push(`skill:${dependency}`)
        continue
      }
      pushEdge({ from: id, to: skillNodeId(target), kind: 'depends_on' })
    }
    for (const mentioned of extractMentionedSkills(parsed.body, skillNames, skill.name)) {
      const target = skills.find(candidate => candidate.name === mentioned)
      if (target === undefined) continue
      pushEdge({ from: id, to: skillNodeId(target), kind: 'references' })
    }
    desired.nodes.set(id, {
      id,
      kind: skill.persona ? 'persona' : 'skill',
      title: skill.name,
      content: text,
      metadata: {
        managedBy: IMPORT_MARKER,
        path: skill.relativeDir,
        description: skill.description,
        ...(unresolvedRefs.length > 0 ? { unresolvedRefs } : {}),
        ...(parsed.frontmatter === undefined ? {} : { frontmatter: toJsonValue(parsed.frontmatter) }),
      },
    })
  }
  return desired
}

function nodeMatches(node: GraphNode, input: NodeInput): boolean {
  return node.title === input.title
    && node.kind === input.kind
    && node.content === (input.content ?? '')
    && JSON.stringify(node.metadata) === JSON.stringify(input.metadata ?? {})
}

/**
 * Rebuild the import-managed subgraph from one skills root and record it as at
 * most one revision. Managed nodes absent from the scan are removed together
 * with their managed edges; user-created nodes and edges are preserved.
 * Rebuilding a root with no skills and no previously imported nodes fails
 * loudly instead of recording an empty revision.
 * @param store - the opened graph store.
 * @param root - absolute skills root directory.
 * @returns the import report.
 */
export async function rebuildFromSkills(store: GraphStore, root: string): Promise<ImportReport> {
  const desired = await planImport(root)
  const managedCount = [...store.engine.nodes.values()].filter(node => node.metadata.managedBy === IMPORT_MARKER).length
  if (desired.nodes.size === 0 && managedCount === 0) {
    throw new GraphError('IMPORT_EMPTY', `no skills found under ${root}`)
  }
  const { result } = await store.mutateBulk('skills.rebuild', `import ${desired.nodes.size} node(s) from ${root}`, () => {
    const diffs: GraphDiff[] = []
    const managedNodes = [...store.engine.nodes.values()].filter(node => node.metadata.managedBy === IMPORT_MARKER)
    const desiredIds = new Set(desired.nodes.keys())
    for (const existing of managedNodes) {
      if (!desiredIds.has(existing.id)) diffs.push(store.engine.removeNode(existing.id, true))
    }
    for (const input of desired.nodes.values()) {
      const existing = store.engine.getNode(input.id as string)
      if (existing === undefined) {
        diffs.push(store.engine.createNode(input).diff)
      } else if (!nodeMatches(existing, input)) {
        diffs.push(store.engine.updateNode(existing.id, {
          title: input.title,
          content: input.content ?? '',
          metadata: input.metadata ?? {},
        }).diff)
      }
    }
    const desiredEdges = new Map<string, EdgeInput>()
    for (const edge of desired.edges) desiredEdges.set(edgeIdOf(edge.from, edge.to, edge.kind), edge)
    for (const edge of [...store.engine.edges.values()]) {
      if (edge.metadata.managedBy === IMPORT_MARKER && !desiredEdges.has(edge.id)) {
        diffs.push(store.engine.removeEdge(edge.id))
      }
    }
    for (const edge of desiredEdges.values()) {
      const existing = store.engine.edges.get(edgeIdOf(edge.from, edge.to, edge.kind))
      if (existing === undefined) {
        diffs.push(store.engine.addEdge({ ...edge, metadata: { managedBy: IMPORT_MARKER } }).diff)
      }
    }
    return { diffs, result: { diff: mergeDiffs(diffs) } }
  })
  const resources = [...desired.nodes.values()].filter(node => node.kind === 'reference' || node.kind === 'script' || node.kind === 'raw').length
  return { skills: desired.nodes.size - resources, resources, diff: result.diff }
}
