/**
 * Human-facing `/research-graph` slash command. Two grammars share one
 * dispatcher: a JSON mode (the whole input is one {@link GraphRequest},
 * answered with one JSON {@link GraphResponse}) for programmatic callers such
 * as the Client through `ctx.remote.commands.execute`, and a small
 * human-readable grammar for interactive use.
 * @module dsh-research-graph/commands
 */

import type { Context } from '@deepseek-ai/cordis'
import type { CommandResult } from '@deepseek-ai/dsh-commands'
import { GraphError } from './graph.ts'
import { executeGraphRequest, parseRequestJson } from './protocol.ts'
import type { GraphRequest, GraphResponse } from './protocol.ts'
import type { ResearchGraphService } from './service.ts'

/** Command name registered with the Harness command registry. */
export const COMMAND_NAME = 'research-graph'

const USAGE = [
  'Usage: /research-graph <subcommand> — or pass one JSON request: /research-graph {"op":"stats"}',
  '',
  'Subcommands:',
  '  stats                      Node/edge counts and current revision',
  '  search <query>             Full-text search over title/content/metadata',
  '  show <id>                  One node with its outgoing edges',
  '  backlinks <id>             Incoming edges of one node',
  '  audit                      Broken edges, dangling references, orphan nodes',
  '  diff <from> [to]           Net change between two revisions',
  '  snapshot                   Whole graph (nodes, edges) with its revision',
  '  history                    Retained revision history',
  '  rebuild                    Re-import the bundled skills into the graph',
  '  export [dir]               Write the Markdown mirror (default <dataDir>/mirror)',
  '',
  'JSON ops: node.create node.get node.update node.remove node.list edge.add edge.remove',
  'search backlinks audit stats diff graph.snapshot history.list skills.rebuild export.markdown',
].join('\n')

/** Render one JSON-mode response as the command text. */
function renderJsonResponse(response: GraphResponse): CommandResult {
  if (!response.ok) return { kind: 'error', text: `${response.error.code}: ${response.error.message}` }
  return { kind: 'success', text: JSON.stringify(response, null, 2) }
}

/** Execute one human-grammar subcommand. */
async function runHumanCommand(graph: ResearchGraphService, input: string): Promise<{ request: GraphRequest } | { error: string }> {
  const [head, ...rest] = input.split(/\s+/u)
  const tail = rest.join(' ')
  switch (head) {
    case 'stats':
      return { request: { op: 'stats' } }
    case 'search':
      if (tail.length === 0) return { error: 'search requires a query.' }
      return { request: { op: 'search', query: tail } }
    case 'show':
      if (tail.length === 0) return { error: 'show requires a node id.' }
      return { request: { op: 'node.get', id: tail } }
    case 'backlinks':
      if (tail.length === 0) return { error: 'backlinks requires a node id.' }
      return { request: { op: 'backlinks', id: tail } }
    case 'audit':
      return { request: { op: 'audit' } }
    case 'snapshot':
      return { request: { op: 'graph.snapshot' } }
    case 'history':
      return { request: { op: 'history.list' } }
    case 'rebuild':
      return { request: { op: 'skills.rebuild' } }
    case 'export':
      return { request: tail.length === 0 ? { op: 'export.markdown' } : { op: 'export.markdown', dir: tail } }
    case 'diff': {
      const from = Number.parseInt(rest[0] ?? '', 10)
      if (!Number.isSafeInteger(from) || from < 0) return { error: 'diff requires a non-negative "from" revision.' }
      const to = rest[1] === undefined ? undefined : Number.parseInt(rest[1], 10)
      if (rest[1] !== undefined && (to === undefined || !Number.isSafeInteger(to))) {
        return { error: 'diff upper bound must be a revision number.' }
      }
      return { request: { op: 'diff', from, ...(to === undefined ? {} : { to }) } }
    }
    default:
      return { error: `Unknown subcommand "${head ?? ''}".\n${USAGE}` }
  }
}

/**
 * Register the `/research-graph` command.
 * @param ctx - plugin context owning the registration.
 * @param graph - the mounted research-graph service.
 */
export function registerGraphCommand(ctx: Context, graph: ResearchGraphService): void {
  ctx.commands.register({
    name: COMMAND_NAME,
    description: 'Inspect and maintain the research knowledge graph (JSON mode: /research-graph {"op":"stats"})',
    input: { hint: '<stats|search|show|backlinks|audit|diff|rebuild|export> or a JSON request' },
    async handler(invocation): Promise<CommandResult> {
      const input = invocation.rawInput.trim()
      if (input.length === 0 || input === 'help') return { kind: 'success', text: USAGE }
      let request: GraphRequest
      try {
        const json = parseRequestJson(input)
        if (json !== undefined) {
          return renderJsonResponse(await executeGraphRequest(graph, json))
        }
        const human = await runHumanCommand(graph, input)
        if ('error' in human) return { kind: 'error', text: human.error }
        request = human.request
      } catch (error: unknown) {
        const message = error instanceof GraphError || error instanceof SyntaxError ? error.message : String(error)
        return { kind: 'error', text: `${message}\n${USAGE}` }
      }
      const response = await executeGraphRequest(graph, request)
      if (!response.ok) return { kind: 'error', text: `${response.error.code}: ${response.error.message}` }
      return { kind: 'success', text: JSON.stringify(response.result, null, 2) }
    },
  })
}
