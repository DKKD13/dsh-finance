/**
 * Host service `ctx.researchGraph`: the single capability seam shared by the
 * agent tools and the slash command. Owns the store lifecycle, emits
 * `research-graph/change` after every effective mutation, and optionally keeps
 * a Markdown mirror of the graph on disk.
 * @module dsh-research-graph/service
 */

import { homedir } from 'node:os'
import { createHash } from 'node:crypto'
import { dirname, isAbsolute, join, relative, resolve, sep } from 'node:path'
import { Context, Service } from '@deepseek-ai/cordis'
import { GraphError, isEmptyDiff } from './graph.ts'
import type { Backlink, EdgeInput, GraphAudit, GraphDiff, GraphEdge, GraphNode, GraphStats, NodeInput, NodeKind, NodePatch, SearchHit } from './graph.ts'
import { resolveClipperHttpConfig } from './finance/clipper-http.ts'
import type { ClipperHttpConfig, ResolvedClipperHttpConfig } from './finance/clipper-http.ts'
import { IMPORT_MARKER, rebuildFromSkills } from './importer.ts'
import type { ImportReport } from './importer.ts'
import { nodeFileName, nodeMarkdownLink, renderNodeMarkdown, rewriteMarkdownDestinations } from './markdown.ts'
import type { RevisionEntry } from './store.ts'
import { GraphStore } from './store.ts'
import type { GraphPlan, GraphPlanResult } from './plan.ts'
import { copyFile, lstat, mkdir, realpath, stat, writeFile } from 'node:fs/promises'

declare module '@deepseek-ai/cordis' {
  interface Context {
    researchGraph: ResearchGraphService
  }

  interface Events {
    /**
     * Fired after every effective graph mutation.
     * @mode emit
     * @param change - the revision created and the operation that made it.
     */
    'research-graph/change'(change: ResearchGraphChange): void
  }
}

/** Payload of the `research-graph/change` event. */
export interface ResearchGraphChange {
  /** Revision the mutation created. */
  readonly revision: number
  /** Operation tag, e.g. `node.create`, `skills.rebuild`. */
  readonly op: string
  /** The exact change applied. */
  readonly diff: GraphDiff
}

/** Plugin configuration; every field falls back to a documented default. */
export interface ResearchGraphConfig {
  /** Data directory holding `graph.json`; defaults to `~/.dsh-research-graph`. */
  readonly dataDir?: string
  /** Skills root scanned by the provider and importer; defaults to the package `skills/` directory. */
  readonly skillsRoot?: string
  /** Whether activation imports the skills root into the graph once. Defaults to true. */
  readonly autoIndexSkills?: boolean
  /** Whether every effective mutation also refreshes the `<dataDir>/mirror` Markdown export. Defaults to false. */
  readonly writeMirror?: boolean
  /** Revision history cap. Defaults to 256. */
  readonly historyLimit?: number
  /** SEC User-Agent contact, used only for explicit SEC fetches. */
  readonly secContact?: string
  /** Existing localhost OpenBB HTTP endpoint; only explicit whitelisted GET routes are contacted. */
  readonly openbbBaseUrl?: string
  /** Local AlphaSift CLI executable. Screen always runs with --no-llm --no-post-analysis. */
  readonly alphaSiftPath?: string
  /** Legacy compatibility field. No AlphaSift HTTP screen API is assumed or contacted. */
  readonly alphaSiftBaseUrl?: string
  /** Per-request HTTP timeout in milliseconds. Defaults to 10000. */
  readonly httpTimeoutMs?: number
  /** Maximum bytes read per HTTP response. Defaults to 16 MiB. */
  readonly httpMaxBytes?: number
  /** Disabled-by-default authenticated loopback Clipper and document importer. */
  readonly clipperHttp?: ClipperHttpConfig
}

/** Fully resolved configuration. */
export interface ResolvedResearchGraphConfig {
  readonly dataDir: string
  readonly skillsRoot: string
  readonly autoIndexSkills: boolean
  readonly writeMirror: boolean
  readonly historyLimit: number
  readonly httpTimeoutMs: number
  readonly httpMaxBytes: number
  readonly clipperHttp: ResolvedClipperHttpConfig
  readonly secContact?: string
  readonly openbbBaseUrl?: string
  readonly alphaSiftPath?: string
  readonly alphaSiftBaseUrl?: string
}

function localhostBase(value: string): boolean {
  try {
    const url = new URL(value)
    const hostname = url.hostname.replace(/^\[|\]$/gu, '').replace(/\.$/u, '').toLowerCase()
    return (url.protocol === 'http:' || url.protocol === 'https:')
      && url.username.length === 0 && url.password.length === 0 && url.search.length === 0 && url.hash.length === 0
      && (hostname === 'localhost' || hostname === '::1' || hostname.startsWith('127.'))
  } catch {
    return false
  }
}

/**
 * Fill configuration defaults. `skillsRoot` is resolved by the caller because
 * the package root differs between source and built layouts.
 * @param config - raw row config from `cordis.patch.yml`.
 * @param defaultSkillsRoot - absolute fallback for `skillsRoot`.
 * @returns the resolved configuration.
 */
export function resolveConfig(config: ResearchGraphConfig, defaultSkillsRoot: string): ResolvedResearchGraphConfig {
  if (config.dataDir !== undefined && config.dataDir.trim().length === 0) {
    throw new GraphError('INVALID_CONFIG', 'dataDir must be a non-empty path when set')
  }
  if (config.skillsRoot !== undefined && config.skillsRoot.trim().length === 0) {
    throw new GraphError('INVALID_CONFIG', 'skillsRoot must be a non-empty path when given')
  }
  if (config.historyLimit !== undefined && (!Number.isSafeInteger(config.historyLimit) || config.historyLimit < 1)) {
    throw new GraphError('INVALID_CONFIG', 'historyLimit must be a positive safe integer')
  }
  if (config.secContact !== undefined && config.secContact.trim().length === 0) {
    throw new GraphError('INVALID_CONFIG', 'secContact must be non-empty when set')
  }
  if (config.alphaSiftPath !== undefined && (config.alphaSiftPath.trim().length === 0 || config.alphaSiftPath.includes('\0'))) {
    throw new GraphError('INVALID_CONFIG', 'alphaSiftPath must be a non-empty executable path without NUL')
  }
  if (config.openbbBaseUrl !== undefined && !localhostBase(config.openbbBaseUrl)) {
    throw new GraphError('INVALID_CONFIG', 'openbbBaseUrl must be a credential-free localhost HTTP(S) URL without query or fragment')
  }
  if (config.alphaSiftBaseUrl !== undefined) {
    try {
      const url = new URL(config.alphaSiftBaseUrl)
      if (url.protocol !== 'http:' && url.protocol !== 'https:') throw new Error('unsupported protocol')
    } catch {
      throw new GraphError('INVALID_CONFIG', 'alphaSiftBaseUrl must be a valid HTTP(S) URL when retained for compatibility')
    }
  }
  if (config.httpTimeoutMs !== undefined && (!Number.isSafeInteger(config.httpTimeoutMs) || config.httpTimeoutMs < 1 || config.httpTimeoutMs > 60_000)) {
    throw new GraphError('INVALID_CONFIG', 'httpTimeoutMs must be an integer between 1 and 60000')
  }
  if (config.httpMaxBytes !== undefined && (!Number.isSafeInteger(config.httpMaxBytes) || config.httpMaxBytes < 1 || config.httpMaxBytes > 64 * 1024 * 1024)) {
    throw new GraphError('INVALID_CONFIG', 'httpMaxBytes must be an integer between 1 and 67108864')
  }
  return {
    dataDir: config.dataDir ?? join(homedir(), '.dsh-research-graph'),
    skillsRoot: config.skillsRoot ?? defaultSkillsRoot,
    autoIndexSkills: config.autoIndexSkills ?? true,
    writeMirror: config.writeMirror ?? false,
    historyLimit: config.historyLimit ?? 256,
    httpTimeoutMs: config.httpTimeoutMs ?? 10_000,
    httpMaxBytes: config.httpMaxBytes ?? 16 * 1024 * 1024,
    clipperHttp: resolveClipperHttpConfig(config.clipperHttp, config.dataDir ?? join(homedir(), '.dsh-research-graph')),
    ...(config.secContact === undefined ? {} : { secContact: config.secContact.trim() }),
    ...(config.openbbBaseUrl === undefined ? {} : { openbbBaseUrl: config.openbbBaseUrl }),
    ...(config.alphaSiftPath === undefined ? {} : { alphaSiftPath: config.alphaSiftPath }),
    ...(config.alphaSiftBaseUrl === undefined ? {} : { alphaSiftBaseUrl: config.alphaSiftBaseUrl }),
  }
}

/**
 * The research-graph capability seam. All reads are served from the in-memory
 * engine backed by the durable store; all mutations go through the store's
 * serialized queue. Effective changes bump the revision, persist atomically,
 * emit `research-graph/change`, and (when enabled) refresh the Markdown mirror.
 */
export class ResearchGraphService extends Service {
  private readonly config: ResolvedResearchGraphConfig
  private opening: Promise<GraphStore> | undefined
  /**
   * Settles when the activation-time skills import has finished (successfully
   * or with a logged failure). `undefined` when `autoIndexSkills` is false.
   */
  initialImport: Promise<void> | undefined

  constructor(ctx: Context, config: ResolvedResearchGraphConfig) {
    super(ctx, 'researchGraph')
    this.config = config
  }

  /** Resolved configuration this service runs with. */
  get resolvedConfig(): ResolvedResearchGraphConfig {
    return this.config
  }

  /** Open (once) and return the store. */
  private store(): Promise<GraphStore> {
    this.opening ??= GraphStore.open(this.config.dataDir, { historyLimit: this.config.historyLimit })
    return this.opening
  }

  /** Current revision; `0` before any mutation. */
  async currentRevision(): Promise<number> {
    return (await this.store()).currentRevision
  }

  /** Retained revision history, oldest first. */
  async revisions(): Promise<readonly RevisionEntry[]> {
    return (await this.store()).revisions
  }

  /** Create one node; duplicate ids and dangling metadata references fail. */
  async createNode(input: NodeInput): Promise<{ revision: number; node: GraphNode }> {
    const store = await this.store()
    const { revision, result, diff } = await store.mutate('node.create', `create ${input.kind} "${input.id ?? input.title}"`, () => {
      const { node, diff: nodeDiff } = store.engine.createNode(input)
      return { diff: nodeDiff, result: node }
    })
    await this.afterMutation(revision, 'node.create', diff)
    return { revision, node: result }
  }

  /** Read one node; `undefined` when absent. */
  async getNode(id: string): Promise<GraphNode | undefined> {
    return (await this.store()).engine.getNode(id)
  }

  /** Patch one node; omitted fields stay unchanged. */
  async updateNode(id: string, patch: NodePatch): Promise<{ revision: number; node: GraphNode }> {
    const store = await this.store()
    const { revision, result, diff } = await store.mutate('node.update', `update ${id}`, () => {
      const { node, diff: nodeDiff } = store.engine.updateNode(id, patch)
      return { diff: nodeDiff, result: node }
    })
    await this.afterMutation(revision, 'node.update', diff)
    return { revision, node: result }
  }

  /** Remove one node; incident edges require `cascade`. */
  async removeNode(id: string, cascade = false): Promise<{ revision: number }> {
    const store = await this.store()
    const { revision, diff } = await store.mutate('node.remove', `remove ${id}`, () => ({ diff: store.engine.removeNode(id, cascade), result: undefined }))
    await this.afterMutation(revision, 'node.remove', diff)
    return { revision }
  }

  /** List nodes, optionally restricted to one kind, sorted by id. */
  async listNodes(kind?: NodeKind): Promise<GraphNode[]> {
    return (await this.store()).engine.listNodes(kind)
  }

  /** Revision and nodes read from one store view, without copying every edge. */
  async readNodeSnapshot(): Promise<{ revision: number; nodes: GraphNode[] }> {
    const store = await this.store()
    return { revision: store.currentRevision, nodes: store.engine.listNodes() }
  }

  /** Add one edge; both endpoints must exist. */
  async addEdge(input: EdgeInput): Promise<{ revision: number; edge: GraphEdge }> {
    const store = await this.store()
    const { revision, result, diff } = await store.mutate('edge.add', `link ${input.from} -[${input.kind}]-> ${input.to}`, () => {
      const { edge, diff: edgeDiff } = store.engine.addEdge(input)
      return { diff: edgeDiff, result: edge }
    })
    await this.afterMutation(revision, 'edge.add', diff)
    return { revision, edge: result }
  }

  /** Remove one edge by id or by its (from, to, kind) triple. */
  async removeEdge(ref: string | { from: string; to: string; kind: GraphEdge['kind'] }): Promise<{ revision: number }> {
    const store = await this.store()
    const label = typeof ref === 'string' ? ref : `${ref.from} -[${ref.kind}]-> ${ref.to}`
    const { revision, diff } = await store.mutate('edge.remove', `unlink ${label}`, () => ({ diff: store.engine.removeEdge(ref), result: undefined }))
    await this.afterMutation(revision, 'edge.remove', diff)
    return { revision }
  }

  /** Full-text search over title, content, and metadata. */
  async search(query: string, options: { kinds?: readonly NodeKind[]; limit?: number } = {}): Promise<SearchHit[]> {
    return (await this.store()).engine.search(query, options)
  }

  /** Incoming edges of one node with resolved source nodes. */
  async backlinks(id: string): Promise<Backlink[]> {
    return (await this.store()).engine.backlinks(id)
  }

  /** Referential-integrity and connectivity audit. */
  async audit(): Promise<GraphAudit> {
    return (await this.store()).engine.audit()
  }

  /** Node/edge counts grouped by kind. */
  async stats(): Promise<GraphStats> {
    const store = await this.store()
    return store.engine.stats(store.currentRevision)
  }

  /** Net change between two revisions, replayed from retained history. */
  async diffRevisions(from: number, to?: number): Promise<GraphDiff> {
    const store = await this.store()
    return store.diffRevisions(from, to)
  }

  /**
   * Whole-graph snapshot for the Client workbench: every node and edge plus
   * the revision they were read at, so the Client can detect staleness
   * against later `revision` fields. Nodes and edges are sorted by id.
   */
  async snapshot(): Promise<{ revision: number; nodes: GraphNode[]; edges: GraphEdge[] }> {
    const store = await this.store()
    const edges = [...store.engine.edges.values()].sort((left, right) => left.id < right.id ? -1 : 1)
    return { revision: store.currentRevision, nodes: store.engine.listNodes(), edges }
  }

  /**
   * Retained revision history (oldest first) with the earliest diffable
   * revision, so the Client's timeline knows which ranges still replay.
   */
  async revisionHistory(): Promise<{ revision: number; earliestRetainedRevision: number; entries: readonly RevisionEntry[] }> {
    const store = await this.store()
    return { revision: store.currentRevision, earliestRetainedRevision: store.earliestRetainedRevision, entries: store.revisions }
  }

  /** Apply a generic idempotent plan as at most one revision. */
  async applyPlan(plan: GraphPlan, op = 'graph.plan', summary = 'apply graph plan'): Promise<{ revision: number; result: GraphPlanResult; diff: GraphDiff }> {
    const store = await this.store()
    const applied = await store.applyPlan(op, summary, plan)
    if (applied.result.changed) await this.afterMutation(applied.revision, op, applied.diff)
    return applied
  }

  /** Full-sync the import-managed subgraph from the configured skills root. */
  async rebuildFromSkills(): Promise<{ revision: number; report: ImportReport }> {
    const store = await this.store()
    const report = await rebuildFromSkills(store, this.config.skillsRoot)
    await this.afterMutation(store.currentRevision, 'skills.rebuild', report.diff)
    return { revision: store.currentRevision, report }
  }

  /**
   * Write the Markdown mirror: one `<kind>/<id>.md` per node under `dir`
   * (default `<dataDir>/mirror`), each with durable frontmatter and an
   * outgoing-links section, plus an `_index.md` of all nodes.
   * @param dir - target directory; defaults to the configured mirror.
   * @returns the directory and the written file paths.
   */
  async exportMarkdown(dir?: string): Promise<{ dir: string; files: string[] }> {
    const store = await this.store()
    const target = dir ?? join(this.config.dataDir, 'mirror')
    await mkdir(target, { recursive: true })
    const nodes = store.engine.listNodes()
    const filesById = new Map(nodes.map(node => [node.id, join(target, node.kind, nodeFileName(node.id))]))
    const idsByPath = new Map<string, string>()
    for (const [id, file] of filesById) {
      const portablePath = file.normalize('NFC').toLowerCase()
      if (idsByPath.has(portablePath)) throw new GraphError('EXPORT_PATH_COLLISION', `Export paths collide for ${JSON.stringify(idsByPath.get(portablePath))} and ${JSON.stringify(id)}`)
      idsByPath.set(portablePath, id)
    }
    const hrefTo = (from: string, to: string): string => relative(from, to).split(sep)
      .map(part => encodeURIComponent(part).replace(/[!'()*]/gu, char => `%${char.charCodeAt(0).toString(16).toUpperCase()}`)).join('/')
    const written: string[] = []
    const index: string[] = ['# Research graph index', '']
    const skillsRoot = resolve(this.config.skillsRoot)
    const inside = (root: string, path: string): boolean => {
      const rel = relative(root, path)
      return rel !== '..' && !rel.startsWith(`..${sep}`) && !isAbsolute(rel)
    }
    const realTarget = await realpath(target)
    const prepareFile = async (file: string): Promise<void> => {
      let existing = dirname(file)
      while (true) {
        const actual = await realpath(existing).catch((error: NodeJS.ErrnoException) => {
          if (error.code === 'ENOENT') return undefined
          throw error
        })
        if (actual !== undefined) {
          if (!inside(realTarget, actual)) throw new GraphError('EXPORT_PATH_OUTSIDE_ROOT', 'An export directory points outside the selected export root')
          break
        }
        existing = dirname(existing)
      }
      await mkdir(dirname(file), { recursive: true })
      if (!inside(realTarget, await realpath(dirname(file)))) throw new GraphError('EXPORT_PATH_OUTSIDE_ROOT', 'An export directory points outside the selected export root')
      const info = await lstat(file).catch((error: NodeJS.ErrnoException) => {
        if (error.code === 'ENOENT') return undefined
        throw error
      })
      if (info?.isSymbolicLink()) throw new GraphError('EXPORT_PATH_OUTSIDE_ROOT', 'An export file is a symbolic link')
    }
    const realSkillsRoot = await realpath(skillsRoot).catch((error: NodeJS.ErrnoException) => {
      if (error.code === 'ENOENT') return undefined
      throw error
    })
    const sourceById = new Map<string, string>()
    const nodesBySource = new Map<string, GraphNode[]>()
    for (const node of nodes) {
      if (realSkillsRoot === undefined || node.metadata.managedBy !== IMPORT_MARKER || typeof node.metadata.path !== 'string') continue
      let origin = resolve(skillsRoot, node.metadata.path)
      if (!inside(skillsRoot, origin)) continue
      if (node.kind === 'skill' || node.kind === 'persona') {
        const available: string[] = []
        for (const candidate of [join(origin, 'SKILL.md'), `${origin}.md`]) {
          const info = await stat(candidate).catch((error: NodeJS.ErrnoException) => {
            if (error.code === 'ENOENT' || error.code === 'ENOTDIR') return undefined
            throw error
          })
          if (info?.isFile()) available.push(candidate)
        }
        if (available.length !== 1) continue
        origin = available[0]!
      }
      const actual = await realpath(origin).catch((error: NodeJS.ErrnoException) => {
        if (error.code === 'ENOENT' || error.code === 'ENOTDIR') return undefined
        throw error
      })
      if (actual === undefined || !inside(realSkillsRoot, actual)) continue
      sourceById.set(node.id, origin)
      nodesBySource.set(origin, [...(nodesBySource.get(origin) ?? []), node])
    }
    const assetFiles = new Map<string, string>()
    const resolveBodyTarget = async (origin: string, file: string, rawTarget: string): Promise<string | undefined> => {
      const cut = rawTarget.search(/[?#]/u)
      const rawPath = cut === -1 ? rawTarget : rawTarget.slice(0, cut)
      const suffix = cut === -1 ? '' : rawTarget.slice(cut)
      let path: string
      try { path = decodeURIComponent(rawPath).replace(/\\([\\()[\] ])/gu, '$1') } catch { return undefined }
      if (!path || isAbsolute(path)) return undefined
      const source = resolve(dirname(origin), path)
      if (!inside(skillsRoot, source)) return undefined
      const candidates = nodesBySource.get(source)
      if (candidates?.length === 1 && candidates[0]!.metadata.binary !== true) return hrefTo(dirname(file), filesById.get(candidates[0]!.id)!) + suffix
      if (assetFiles.has(source)) return hrefTo(dirname(file), assetFiles.get(source)!) + suffix
      if (realSkillsRoot === undefined) return undefined
      const actual = await realpath(source).catch((error: NodeJS.ErrnoException) => {
        if (error.code === 'ENOENT' || error.code === 'ENOTDIR') return undefined
        throw error
      })
      if (actual === undefined || !inside(realSkillsRoot, actual)) return undefined
      const info = await stat(actual)
      let destination: string
      if (info.isDirectory()) {
        const children = [...nodesBySource.entries()].filter(([child, entries]) => child !== source && inside(source, child) && entries.length === 1)
        if (children.length === 0) return undefined
        destination = join(target, '_directories', `${createHash('sha256').update(relative(skillsRoot, source)).digest('hex')}.md`)
        await prepareFile(destination)
        await writeFile(destination, [`# ${relative(skillsRoot, source)}`, '', ...children.map(([child, entries]) => `- ${nodeMarkdownLink(relative(source, child), hrefTo(dirname(destination), filesById.get(entries[0]!.id)!))}`), ''].join('\n'), 'utf8')
      } else if (info.isFile() && candidates?.length === 1 && candidates[0]!.metadata.binary === true) {
        destination = join(target, '_assets', 'skills', relative(skillsRoot, source))
        await prepareFile(destination)
        await copyFile(actual, destination)
      } else return undefined
      written.push(destination)
      assetFiles.set(source, destination)
      return hrefTo(dirname(file), destination) + suffix
    }
    for (const node of nodes) {
      const outgoing = [...store.engine.edges.values()].filter(edge => edge.from === node.id)
      const file = filesById.get(node.id)!
      await prepareFile(file)
      const origin = sourceById.get(node.id)
      const content = origin === undefined ? node.content : await rewriteMarkdownDestinations(node.content, rawTarget => resolveBodyTarget(origin, file, rawTarget))
      await writeFile(file, renderNodeMarkdown({ ...node, content }, outgoing, id => {
        const destination = filesById.get(id)
        return destination ? hrefTo(dirname(file), destination) : undefined
      }), 'utf8')
      written.push(file)
      index.push(`- ${nodeMarkdownLink(node.id, hrefTo(target, file))} — ${node.title}`)
    }
    index.push('')
    const indexFile = join(target, '_index.md')
    await prepareFile(indexFile)
    await writeFile(indexFile, index.join('\n'), 'utf8')
    written.push(indexFile)
    return { dir: target, files: written }
  }

  /** Emit the change event and refresh the mirror when enabled. */
  private async afterMutation(revision: number, op: string, diff: GraphDiff): Promise<void> {
    if (isEmptyDiff(diff)) return
    this.ctx.emit('research-graph/change', { revision, op, diff })
    if (this.config.writeMirror) await this.exportMarkdown()
  }
}
