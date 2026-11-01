import { GraphError, isNodeKind } from '../graph.ts'
import type { JsonValue, NodeKind } from '../graph.ts'
import type { GraphPlan } from '../plan.ts'
import type { GraphFailure, GraphSuccess } from '../protocol.ts'
import { jsonObject } from './metadata.ts'
import type { FinanceService } from './service.ts'
import type {
  BriefingRecordInput,
  ClipperImportInput,
  CompilePrepareInput,
  CompileStatusInput,
  CompsInput,
  DcfInput,
  DocumentImportInput,
  IssueInput,
  JsonObject,
  MarketDataIngestInput,
  PortfolioInput,
  PredictionInput,
  ResolvePredictionInput,
  SourceFetchInput,
  SourceIngestInput,
} from './types.ts'
import type {
  FundAdvanceInput,
  FundConfigureInput,
  FundResearcherInput,
  FundStateInput,
} from './virtual-fund.ts'

export const FINANCE_OPS = [
  'market.ingest',
  'market.fetch',
  'source.fetch',
  'source.ingest',
  'clipper.import',
  'document.import',
  'model.dcf',
  'model.comps',
  'portfolio.snapshot',
  'graph.plan',
  'graph.get',
  'graph.search',
  'graph.stats',
  'graph.import_artifact',
  'compile.prepare',
  'compile.status',
  'memory.record_prediction',
  'memory.record_issue',
  'memory.due',
  'memory.resolve',
  'memory.recall',
  'briefing.prepare',
  'briefing.record',
  'briefing.evaluate',
  'fund.state',
  'fund.configure',
  'fund.researcher',
  'fund.advance',
] as const

export type FinanceOp = typeof FINANCE_OPS[number]
export type FinanceResponse = GraphSuccess | GraphFailure

export interface FinanceRequest {
  readonly op: FinanceOp
  readonly input?: JsonValue | undefined
  readonly id?: string | undefined
  readonly query?: string | undefined
  readonly asOf?: string | undefined
  readonly kinds?: NodeKind[] | undefined
  readonly limit?: number | undefined
  readonly plan?: GraphPlan | undefined
  readonly [extra: string]: unknown
}

function toJson(value: unknown): JsonValue {
  return JSON.parse(JSON.stringify(value)) as JsonValue
}

function fail(code: string, message: string): GraphFailure {
  return { ok: false, error: { code, message } }
}

function input(request: FinanceRequest): JsonObject {
  if (request.input === undefined) throw new GraphError('INVALID_REQUEST', `${request.op} requires an "input" object`)
  return jsonObject(request.input, 'input')
}

function stringField(request: FinanceRequest, field: 'id' | 'query' | 'asOf', required = true): string | undefined {
  const direct = request[field]
  const nested = typeof request.input === 'object' && request.input !== null && !Array.isArray(request.input)
    ? request.input[field]
    : undefined
  const value = direct ?? nested
  if (value === undefined && !required) return undefined
  if (typeof value !== 'string' || value.length === 0) throw new GraphError('INVALID_REQUEST', `${request.op} requires a non-empty "${field}"`)
  return value
}

function kinds(request: FinanceRequest): NodeKind[] | undefined {
  const nested = typeof request.input === 'object' && request.input !== null && !Array.isArray(request.input)
    ? request.input.kinds
    : undefined
  const value = request.kinds ?? nested
  if (value === undefined) return undefined
  if (!Array.isArray(value) || value.some(kind => !isNodeKind(kind))) {
    throw new GraphError('INVALID_REQUEST', 'kinds must be an array of admitted node kinds')
  }
  return value as NodeKind[]
}

async function dispatch(finance: FinanceService, request: FinanceRequest): Promise<FinanceResponse> {
  switch (request.op) {
    case 'market.ingest': {
      const result = await finance.ingestMarketData(input(request) as unknown as MarketDataIngestInput)
      return { ok: true, revision: result.revision, result: toJson(result) }
    }
    case 'market.fetch': {
      const result = await finance.fetchMarketData(input(request) as unknown as SourceFetchInput)
      return { ok: true, revision: result.revision, result: toJson(result) }
    }
    case 'source.fetch': {
      const result = await finance.fetchSources(input(request) as unknown as SourceFetchInput)
      return { ok: true, revision: result.revision, result: toJson(result) }
    }
    case 'source.ingest': {
      const result = await finance.ingestSources(input(request) as unknown as SourceIngestInput)
      return { ok: true, revision: result.revision, result: toJson(result) }
    }
    case 'clipper.import': {
      const result = await finance.importClipper(input(request) as unknown as ClipperImportInput)
      return { ok: true, revision: result.revision, result: toJson(result) }
    }
    case 'document.import': {
      const result = await finance.importDocuments(input(request) as unknown as DocumentImportInput)
      return { ok: true, revision: result.revision, result: toJson(result) }
    }
    case 'model.dcf': {
      const result = await finance.dcf(input(request) as unknown as DcfInput)
      return { ok: true, revision: result.revision, result: toJson(result) }
    }
    case 'model.comps': {
      const result = await finance.comps(input(request) as unknown as CompsInput)
      return { ok: true, revision: result.revision, result: toJson(result) }
    }
    case 'portfolio.snapshot': {
      const result = await finance.portfolio(input(request) as unknown as PortfolioInput)
      return { ok: true, revision: result.revision, result: toJson(result) }
    }
    case 'graph.plan': {
      const plan = request.plan ?? request.input
      if (typeof plan !== 'object' || plan === null || Array.isArray(plan)) throw new GraphError('INVALID_REQUEST', 'graph.plan requires a plan object')
      const result = await finance.applyPlan(plan as GraphPlan)
      return { ok: true, revision: result.revision, result: toJson(result) }
    }
    case 'graph.get': {
      const result = await finance.getNode(stringField(request, 'id') as string)
      return { ok: true, revision: result.revision, result: toJson(result.node) }
    }
    case 'graph.search': {
      const limit = request.limit
      if (limit !== undefined && (!Number.isSafeInteger(limit) || limit < 1)) throw new GraphError('INVALID_REQUEST', 'limit must be a positive safe integer')
      const result = await finance.search(stringField(request, 'query') as string, {
        ...(kinds(request) === undefined ? {} : { kinds: kinds(request) }),
        ...(limit === undefined ? {} : { limit }),
        ...(stringField(request, 'asOf', false) === undefined ? {} : { asOf: stringField(request, 'asOf', false) }),
      })
      return { ok: true, revision: result.revision, result: toJson(result.hits) }
    }
    case 'graph.stats': {
      const result = await finance.stats()
      return { ok: true, revision: result.revision, result: toJson(result) }
    }
    case 'graph.import_artifact': {
      const result = await finance.importArtifacts(input(request))
      return { ok: true, revision: result.revision, result: toJson(result) }
    }
    case 'compile.prepare': {
      const result = await finance.prepareCompilation(input(request) as unknown as CompilePrepareInput)
      return { ok: true, revision: result.revision, result: toJson(result) }
    }
    case 'compile.status': {
      const result = await finance.compileStatus(input(request) as unknown as CompileStatusInput)
      return { ok: true, revision: result.revision, result: toJson(result) }
    }
    case 'memory.record_prediction': {
      const result = await finance.recordPrediction(input(request) as unknown as PredictionInput)
      return { ok: true, revision: result.revision, result: toJson(result) }
    }
    case 'memory.record_issue': {
      const result = await finance.recordIssue(input(request) as unknown as IssueInput)
      return { ok: true, revision: result.revision, result: toJson(result) }
    }
    case 'memory.due': {
      const result = await finance.due(stringField(request, 'asOf') as string)
      return { ok: true, revision: result.revision, result: toJson(result) }
    }
    case 'memory.resolve': {
      const result = await finance.resolvePrediction(input(request) as unknown as ResolvePredictionInput)
      return { ok: true, revision: result.revision, result: toJson(result) }
    }
    case 'memory.recall': {
      const result = await finance.recall(stringField(request, 'asOf') as string, stringField(request, 'query', false))
      return { ok: true, revision: result.revision, result: toJson(result) }
    }
    case 'briefing.prepare': {
      const raw = input(request)
      const result = await finance.prepareBriefing({
        asOf: stringField(request, 'asOf') as string,
        ...(kinds(request) === undefined ? {} : { kinds: kinds(request) }),
        ...(stringField(request, 'query', false) === undefined ? {} : { query: stringField(request, 'query', false) }),
        ...(Array.isArray(raw.kinds) && request.kinds === undefined ? { kinds: raw.kinds as NodeKind[] } : {}),
      })
      return { ok: true, revision: result.revision, result: toJson(result) }
    }
    case 'briefing.record': {
      const result = await finance.recordBriefing(input(request) as unknown as BriefingRecordInput)
      return { ok: true, revision: result.revision, result: toJson(result) }
    }
    case 'briefing.evaluate': {
      const result = await finance.evaluate({ asOf: stringField(request, 'asOf') as string })
      return { ok: true, revision: result.revision, result: toJson(result) }
    }
    case 'fund.state': {
      const raw = request.input === undefined ? {} : input(request)
      const result = await finance.fundState(raw as unknown as FundStateInput)
      return { ok: true, revision: result.revision, result: toJson(result.result) }
    }
    case 'fund.configure': {
      const result = await finance.fundConfigure(input(request) as unknown as FundConfigureInput)
      return { ok: true, revision: result.revision, result: toJson(result.result) }
    }
    case 'fund.researcher': {
      const result = await finance.fundResearcher(input(request) as unknown as FundResearcherInput)
      return { ok: true, revision: result.revision, result: toJson(result.result) }
    }
    case 'fund.advance': {
      const result = await finance.fundAdvance(input(request) as unknown as FundAdvanceInput)
      return { ok: true, revision: result.revision, result: toJson(result.result) }
    }
    default:
      return fail('UNKNOWN_OP', `unknown op ${JSON.stringify((request as { op?: unknown }).op)}; admitted ops: ${FINANCE_OPS.join(', ')}`)
  }
}

export async function executeFinanceRequest(finance: FinanceService, request: FinanceRequest): Promise<FinanceResponse> {
  try {
    return await dispatch(finance, request)
  } catch (error: unknown) {
    if (error instanceof GraphError) return fail(error.code, error.message)
    return fail('INTERNAL', error instanceof Error ? error.message : String(error))
  }
}

export function parseFinanceRequestJson(text: string): FinanceRequest | undefined {
  const trimmed = text.trim()
  if (!trimmed.startsWith('{')) return undefined
  const parsed: unknown = JSON.parse(trimmed)
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed) || typeof (parsed as { op?: unknown }).op !== 'string') {
    throw new GraphError('INVALID_REQUEST', 'finance request must be a JSON object with a string "op"')
  }
  return parsed as FinanceRequest
}
