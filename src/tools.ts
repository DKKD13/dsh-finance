/**
 * Model-facing agent tools over the research-graph service. Every tool is a
 * thin adapter onto {@link executeGraphRequest}, so tool and UI behavior can
 * never drift apart.
 * @module deepseek-harness-finance-plugin/tools
 */

import type { Context } from '@deepseek-ai/cordis'
import { defineTool } from '@deepseek-ai/dsh-tools'
import { EDGE_KINDS, NODE_KINDS } from './graph.ts'
import type { EdgeKind, JsonValue, NodeKind } from './graph.ts'
import { executeGraphRequest } from './protocol.ts'
import type { GraphRequest } from './protocol.ts'
import type { ResearchGraphService } from './service.ts'

const JSON_OUTPUT = { type: 'json' } as const

/** Execute one wire request and detach the response into the lossless JSON domain. */
async function run(graph: ResearchGraphService, request: GraphRequest): Promise<JsonValue> {
  const response = await executeGraphRequest(graph, request)
  const value: JsonValue = JSON.parse(JSON.stringify(response))
  return value
}

function renderJson(_args: unknown, value: JsonValue): { type: 'text'; text: string }[] {
  return [{ type: 'text', text: JSON.stringify(value) }]
}

/**
 * Register the four `research_graph_*` tools.
 * @param ctx - plugin context owning the registrations.
 * @param graph - the mounted research-graph service.
 */
export function registerGraphTools(ctx: Context, graph: ResearchGraphService): void {
  ctx.tools.register(defineTool({
    name: 'research_graph_node',
    description: 'Create, read, update, remove, or list nodes of the research knowledge graph '
      + `(kinds: ${NODE_KINDS.join(', ')}). Node ids are stable strings such as "skill:research".`,
    parameters: {
      action: { type: 'string', required: true, enum: ['create', 'get', 'update', 'remove', 'list'], description: 'The node operation to run.' },
      id: { type: 'string', description: 'Node id; required for get/update/remove, optional for create (derived from kind and title when omitted).' },
      kind: { type: 'string', enum: NODE_KINDS, description: 'Node kind; required for create, optional filter for list.' },
      title: { type: 'string', description: 'Human-readable node title; required for create.' },
      content: { type: 'string', description: 'Full node content (Markdown).' },
      metadata: { type: 'json', description: 'Arbitrary JSON metadata; replaces the whole record on update. metadata.references must list existing node ids.' },
      cascade: { type: 'boolean', description: 'remove only: also remove incident edges.' },
    },
    output: { schema: JSON_OUTPUT, render: renderJson },
    async execute(args) {
      const request = nodeRequest(args)
      return run(graph, request)
    },
  }))

  ctx.tools.register(defineTool({
    name: 'research_graph_edge',
    description: 'Add or remove a relation between two existing graph nodes '
      + `(kinds: ${EDGE_KINDS.join(', ')}). Both endpoints must exist; dangling edges are rejected.`,
    parameters: {
      action: { type: 'string', required: true, enum: ['add', 'remove'], description: 'The edge operation to run.' },
      from: { type: 'string', required: true, description: 'Source node id.' },
      to: { type: 'string', required: true, description: 'Target node id.' },
      kind: { type: 'string', required: true, enum: EDGE_KINDS, description: 'Relation kind.' },
      metadata: { type: 'json', description: 'add only: arbitrary JSON metadata for the edge.' },
    },
    output: { schema: JSON_OUTPUT, render: renderJson },
    async execute(args) {
      const triple = { from: args.from, to: args.to, kind: args.kind as EdgeKind }
      const request: GraphRequest = args.action === 'add'
        ? { op: 'edge.add', edge: { ...triple, ...(args.metadata === undefined ? {} : { metadata: args.metadata as Record<string, JsonValue> }) } }
        : { op: 'edge.remove', edge: triple }
      return run(graph, request)
    },
  }))

  ctx.tools.register(defineTool({
    name: 'research_graph_query',
    description: 'Query the research knowledge graph: full-text search, backlinks of a node, a consistent node/edge snapshot, '
      + 'a broken-reference audit, stats, or a revision-range diff.',
    parameters: {
      action: { type: 'string', required: true, enum: ['search', 'backlinks', 'snapshot', 'audit', 'stats', 'diff'], description: 'The query to run.' },
      query: { type: 'string', description: 'search only: free-text query over title, content, and metadata.' },
      id: { type: 'string', description: 'backlinks only: target node id.' },
      kinds: { type: 'array', items: { type: 'string', enum: NODE_KINDS }, description: 'search only: restrict to these node kinds.' },
      limit: { type: 'integer', description: 'search only: maximum hits (default 50).' },
      from: { type: 'integer', description: 'diff only: exclusive lower revision bound (0 diffs against the empty graph).' },
      to: { type: 'integer', description: 'diff only: inclusive upper revision bound (defaults to current).' },
    },
    output: { schema: JSON_OUTPUT, render: renderJson },
    async execute(args) {
      const request = queryRequest(args)
      return run(graph, request)
    },
  }))

  ctx.tools.register(defineTool({
    name: 'research_graph_admin',
    description: 'Maintain the research knowledge graph: apply an atomic GraphPlan, rebuild the import-managed skills subgraph, '
      + 'or export the whole graph as a Markdown mirror directory.',
    parameters: {
      action: { type: 'string', required: true, enum: ['apply_plan', 'rebuild_skills', 'export_markdown'], description: 'The maintenance operation to run.' },
      plan: { type: 'json', description: 'apply_plan only: explicit-id node/edge upserts committed in at most one revision.' },
      dir: { type: 'string', description: 'export_markdown only: target directory (defaults to <dataDir>/mirror).' },
    },
    output: { schema: JSON_OUTPUT, render: renderJson },
    async execute(args) {
      const request: GraphRequest = args.action === 'rebuild_skills'
        ? { op: 'skills.rebuild' }
        : args.action === 'apply_plan'
          ? { op: 'graph.plan', plan: args.plan as unknown as NonNullable<GraphRequest['plan']> }
          : { op: 'export.markdown', ...(args.dir === undefined ? {} : { dir: args.dir }) }
      return run(graph, request)
    },
  }))
}

interface NodeToolArgs {
  action: 'create' | 'get' | 'update' | 'remove' | 'list'
  id?: string
  kind?: string
  title?: string
  content?: string
  metadata?: JsonValue
  cascade?: boolean
}

function nodeRequest(args: NodeToolArgs): GraphRequest {
  switch (args.action) {
    case 'create':
      return {
        op: 'node.create',
        node: {
          ...(args.id === undefined ? {} : { id: args.id }),
          kind: args.kind as NodeKind,
          title: args.title ?? '',
          ...(args.content === undefined ? {} : { content: args.content }),
          ...(args.metadata === undefined ? {} : { metadata: args.metadata as Record<string, JsonValue> }),
        },
      }
    case 'get':
      return { op: 'node.get', id: args.id ?? '' }
    case 'update':
      return {
        op: 'node.update',
        id: args.id ?? '',
        patch: {
          ...(args.title === undefined ? {} : { title: args.title }),
          ...(args.content === undefined ? {} : { content: args.content }),
          ...(args.metadata === undefined ? {} : { metadata: args.metadata as Record<string, JsonValue> }),
        },
      }
    case 'remove':
      return { op: 'node.remove', id: args.id ?? '', ...(args.cascade === undefined ? {} : { cascade: args.cascade }) }
    case 'list':
      return { op: 'node.list', ...(args.kind === undefined ? {} : { kind: args.kind as NodeKind }) }
  }
}

interface QueryToolArgs {
  action: 'search' | 'backlinks' | 'snapshot' | 'audit' | 'stats' | 'diff'
  query?: string
  id?: string
  kinds?: string[]
  limit?: number
  from?: number
  to?: number
}

function queryRequest(args: QueryToolArgs): GraphRequest {
  switch (args.action) {
    case 'search':
      return {
        op: 'search',
        query: args.query ?? '',
        ...(args.kinds === undefined ? {} : { kinds: args.kinds as NodeKind[] }),
        ...(args.limit === undefined ? {} : { limit: args.limit }),
      }
    case 'backlinks':
      return { op: 'backlinks', id: args.id ?? '' }
    case 'snapshot':
      return { op: 'graph.snapshot' }
    case 'audit':
      return { op: 'audit' }
    case 'stats':
      return { op: 'stats' }
    case 'diff':
      return { op: 'diff', from: args.from ?? 0, ...(args.to === undefined ? {} : { to: args.to }) }
  }
}
