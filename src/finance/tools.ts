import type { Context } from '@deepseek-ai/cordis'
import { defineTool } from '@deepseek-ai/dsh-tools'
import { NODE_KINDS } from '../graph.ts'
import type { JsonValue, NodeKind } from '../graph.ts'
import type { GraphPlan } from '../plan.ts'
import { executeFinanceRequest } from './protocol.ts'
import type { FinanceRequest } from './protocol.ts'
import type { FinanceService } from './service.ts'

const JSON_OUTPUT = { type: 'json' } as const

async function run(finance: FinanceService, request: FinanceRequest): Promise<JsonValue> {
  const response = await executeFinanceRequest(finance, request)
  return JSON.parse(JSON.stringify(response)) as JsonValue
}

function renderJson(_args: unknown, value: JsonValue): { type: 'text'; text: string }[] {
  return [{ type: 'text', text: JSON.stringify(value) }]
}

interface ToolArgs {
  action: string
  input?: JsonValue
  id?: string
  query?: string
  asOf?: string
  kinds?: string[]
  limit?: number
}

export function registerFinanceTools(ctx: Context, finance: FinanceService): void {
  const register = (name: string, description: string, actions: string[], execute: (args: ToolArgs) => FinanceRequest) => {
    ctx.tools.register(defineTool({
      name,
      description,
      parameters: {
        action: { type: 'string', required: true, enum: actions, description: 'The local finance operation to run.' },
        input: { type: 'json', description: 'Operation-specific structured JSON input; external observations require full temporal lineage.' },
        id: { type: 'string', description: 'Node id for graph get.' },
        query: { type: 'string', description: 'Optional search or recall text.' },
        asOf: { type: 'string', description: 'ISO point-in-time cutoff; future records are excluded.' },
        kinds: { type: 'array', items: { type: 'string', enum: NODE_KINDS }, description: 'Optional node-kind filter.' },
        limit: { type: 'integer', description: 'Optional positive result cap.' },
      },
      output: { schema: JSON_OUTPUT, render: renderJson },
      async execute(args) {
        return run(finance, execute(args as ToolArgs))
      },
    }))
  }

  register(
    'finance_market_data',
    'Fetch real public Yahoo/SEC/OpenBB data with input:{source,...provider parameters,runId,asOf,dryRun:true}. Fetch returns SourceItems; to commit a reviewed preview, use finance_ingest action:ingest input:{items:<the exact returned items>,runId,asOf,dryRun:false}, preserving original content, data, provenance and all timestamps. This tool action:ingest instead requires input:{instrument:{id,title,symbol,currency,metadata:{provider,asOf,availableAt,fetchedAt,runId,provenance}},data:{...actual observations}} and upserts one complete instrument. symbol is optional (defaults to title); metadata.runId, provenance and contentHash may be omitted for Host defaults. Never pass items, SourceItems, a JSON string or a plan wrapper to market ingest. Fetch is dryRun by default; no quote is synthesized and no trade is placed. Read finance-source-ingest/references/host-inputs.md for full envelopes.',
    ['ingest', 'fetch'],
    args => args.action === 'fetch'
      ? { op: 'market.fetch', input: args.input }
      : { op: 'market.ingest', input: args.input },
  )
  register(
    'finance_ingest',
    'Fetch supports only yahoo/sec/openbb/alphasift/rss/atom/feed/opml/youtube, with input.source required; there is no web provider. For a general webpage, first read its real text with host web tools, then ingest with input:{items:[{provider,canonicalUrl,title,content,asOf,availableAt,fetchedAt,provenance}],runId,asOf,dryRun:true}. Host computes contentHash if omitted. Commit those same reviewed items with dryRun:false. Also imports dsh.clipper/v1 bundles or byte-only local documents. Read finance-source-ingest/references/host-inputs.md for full envelopes.',
    ['fetch', 'ingest', 'import_clip', 'import_documents'],
    args => {
      if (args.action === 'import_clip') return { op: 'clipper.import', input: args.input }
      if (args.action === 'import_documents') return { op: 'document.import', input: args.input }
      return { op: args.action === 'fetch' ? 'source.fetch' : 'source.ingest', input: args.input }
    },
  )
  register(
    'finance_model',
    'Run deterministic local DCF, comparable-company, or point-in-time portfolio calculations and persist one atomic graph revision. Not investment advice or trading.',
    ['dcf', 'comps', 'portfolio'],
    args => ({ op: args.action === 'dcf' ? 'model.dcf' : args.action === 'comps' ? 'model.comps' : 'portfolio.snapshot', input: args.input }),
  )
  register(
    'finance_graph',
    'Apply an idempotent atomic GraphPlan, inspect/search the shared graph, import ResearchArtifact evidence, or prepare/status knowledge compilation without invoking an LLM. For plan, pass input as an OBJECT {nodes:[{id,kind,title,content,metadata}],edges:[{from,to,kind,metadata}]}, never a JSON-encoded string, filename or {plan:...} wrapper. Plan nodes are complete upserts, not patches: omitted content clears the body and metadata replaces the entire record. Before updating an existing node, get it and include its complete content and merged metadata. Assemble sessionId, contentHash and all final fields before one atomic submission; do not split metadata corrections into repeated plans. A supplied non-compiler deliverable contentHash must match its actual body or the whole plan is rejected with CONTENT_HASH_MISMATCH. Build and validate the complete plan before calling; a rejected plan commits nothing. Do not fall back to separate node/edge writes for one atomic research delivery.',
    ['plan', 'get', 'search', 'stats', 'import_artifact', 'compile_prepare', 'compile_status'],
    args => {
      switch (args.action) {
        case 'plan': return { op: 'graph.plan', plan: args.input as unknown as GraphPlan }
        case 'get': return { op: 'graph.get', id: args.id }
        case 'search': return { op: 'graph.search', query: args.query, asOf: args.asOf, kinds: args.kinds as NodeKind[], limit: args.limit }
        case 'stats': return { op: 'graph.stats' }
        case 'compile_prepare': return { op: 'compile.prepare', input: args.input }
        case 'compile_status': return { op: 'compile.status', input: args.input }
        default: return { op: 'graph.import_artifact', input: args.input }
      }
    },
  )
  register(
    'finance_memory',
    'Record predictions and warnings/errors, list due predictions, settle them after resolutionDate, and recall without future leakage.',
    ['record_prediction', 'record_issue', 'due', 'resolve', 'recall'],
    args => {
      switch (args.action) {
        case 'record_prediction': return { op: 'memory.record_prediction', input: args.input }
        case 'record_issue': return { op: 'memory.record_issue', input: args.input }
        case 'due': return { op: 'memory.due', asOf: args.asOf }
        case 'resolve': return { op: 'memory.resolve', input: args.input }
        default: return { op: 'memory.recall', asOf: args.asOf, query: args.query }
      }
    },
  )
  register(
    'finance_briefing',
    'Prepare deterministic evidence cards or evaluate due predictions using TOP-LEVEL asOf/query/kinds (not input). Example: {action:"prepare",asOf:"<confirmed cutoff>",query:"AAPL"}. Only record uses input:{id,title,content,references,metadata:{provider,asOf,availableAt,fetchedAt,runId,sessionId,provenance}}. Read back the saved deliverable. No LLM or agent loop is created.',
    ['prepare', 'record', 'evaluate'],
    args => ({
      op: args.action === 'prepare' ? 'briefing.prepare' : args.action === 'record' ? 'briefing.record' : 'briefing.evaluate',
      input: args.action === 'record' ? args.input : {
        ...(args.asOf === undefined ? {} : { asOf: args.asOf }),
        ...(args.query === undefined ? {} : { query: args.query }),
        ...(args.kinds === undefined ? {} : { kinds: args.kinds }),
      },
    }),
  )
  register(
    'finance_virtual_fund',
    'Read authoritative fund graph nodes, configure a paper-simulation fund or researcher, or commit a price-backed ledger advance. This tool stores host session/schedule references; it does not create schedules or place broker orders.',
    ['state', 'configure', 'researcher', 'advance'],
    args => ({
      op: args.action === 'state'
        ? 'fund.state'
        : args.action === 'configure'
          ? 'fund.configure'
          : args.action === 'researcher'
            ? 'fund.researcher'
            : 'fund.advance',
      ...(args.input === undefined ? {} : { input: args.input }),
    }),
  )
}
