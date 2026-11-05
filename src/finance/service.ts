import { Context, Service } from '@deepseek-ai/cordis'
import { GraphError } from '../graph.ts'
import type { EdgeInput, GraphNode, JsonValue, NodeKind } from '../graph.ts'
import type { GraphPlan, GraphPlanNode } from '../plan.ts'
import type { ResearchGraphService } from '../service.ts'
import { researchArtifactPlan } from './artifacts.ts'
import { hashText, importCaptures } from './capture.ts'
import { normalizeClipperBundle } from './clipper.ts'
import { compilationStatus, finalizeCompilationPlan, prepareCompilationCandidates } from './compile.ts'
import { normalizeDocumentFiles } from './documents.ts'
import { buildIngestPlan, normalizeSourceItem } from './ingest.ts'
import { assertAvailableBy, canonicalJson, effectiveAvailableAt, financeMetadata, hashId, hashJson, timestamp } from './metadata.ts'
import { calculateComps, calculateDcf } from './models.ts'
import { calculatePortfolio } from './portfolio.ts'
import { FinanceDataPlane } from './sources.ts'
import type { FinanceDataDependencies } from './sources.ts'
import type {
  BriefingRecordInput,
  ClipperImportInput,
  CompilePrepareInput,
  CompileStatusInput,
  CompsInput,
  DcfInput,
  DocumentImportInput,
  FinanceConnectorConfig,
  FinanceMetadataInput,
  InstrumentInput,
  IssueInput,
  JsonObject,
  MarketDataIngestInput,
  PortfolioInput,
  PredictionInput,
  ResolvePredictionInput,
  SourceFailure,
  SourceFetchInput,
  SourceIngestInput,
  SourceItem,
} from './types.ts'
import { VirtualFundManager } from './virtual-fund.ts'
import type {
  FundAdvanceInput,
  FundConfigureInput,
  FundResearcherInput,
  FundStateInput,
} from './virtual-fund.ts'

declare module '@deepseek-ai/cordis' {
  interface Context {
    finance: FinanceService
  }
}

const FINANCE_KINDS = new Set<NodeKind>(['instrument', 'portfolio', 'position', 'valuation', 'catalyst', 'prediction'])

function asJson(value: unknown): JsonValue {
  return JSON.parse(JSON.stringify(value)) as JsonValue
}

function visibleBy(node: GraphNode, asOf: string): boolean {
  const availableAt = effectiveAvailableAt(node)
  const nodeAsOf = node.metadata.asOf
  if (availableAt === undefined || typeof nodeAsOf !== 'string') return false
  if (availableAt.milliseconds > timestamp(asOf, 'asOf')) return false
  if (timestamp(nodeAsOf, `${node.id}.asOf`) > timestamp(asOf, 'asOf')) return false
  if (node.kind === 'prediction') {
    const resolutionDate = node.metadata.resolutionDate
    return typeof resolutionDate === 'string' && timestamp(resolutionDate, `${node.id}.resolutionDate`) <= timestamp(asOf, 'asOf')
  }
  return true
}

function instrumentNode(input: InstrumentInput, extra: JsonObject = {}): GraphPlanNode {
  const metadata = financeMetadata(input.metadata, asJson(input))
  return {
    id: input.id,
    kind: 'instrument',
    title: input.title,
    content: input.symbol ?? input.title,
    metadata: {
      ...metadata,
      symbol: input.symbol ?? input.title,
      currency: input.currency,
      ...extra,
    },
  }
}

function predictionDirection(value: JsonObject): string | undefined {
  for (const field of ['actualDirection', 'predictedDirection', 'direction']) {
    const direction = value[field]
    if (typeof direction === 'string') return direction
  }
  return undefined
}

function numericValue(value: JsonObject, actual: boolean): number | undefined {
  const fields = actual ? ['actualValue', 'value'] : ['predictedValue', 'value']
  for (const field of fields) {
    const number = value[field]
    if (typeof number === 'number' && Number.isFinite(number)) return number
  }
  return undefined
}

export class FinanceService extends Service {
  private readonly dataPlane: FinanceDataPlane
  private readonly virtualFund: VirtualFundManager

  constructor(
    ctx: Context,
    private readonly graph: ResearchGraphService,
    connectors: FinanceConnectorConfig = {},
    dependencies: FinanceDataDependencies = {},
  ) {
    super(ctx, 'finance')
    this.dataPlane = new FinanceDataPlane(connectors, dependencies)
    this.virtualFund = new VirtualFundManager(graph)
  }

  async fundState(input: FundStateInput = {}) {
    const { revision, ...result } = await this.virtualFund.state(input)
    return { revision, result }
  }

  async fundConfigure(input: FundConfigureInput) {
    const result = await this.virtualFund.configure(input)
    return { revision: await this.graph.currentRevision(), result }
  }

  async fundResearcher(input: FundResearcherInput) {
    const result = await this.virtualFund.researcher(input)
    return { revision: await this.graph.currentRevision(), result }
  }

  async fundAdvance(input: FundAdvanceInput) {
    const result = await this.virtualFund.advance(input)
    return { revision: await this.graph.currentRevision(), result }
  }

  async ingestMarketData(input: MarketDataIngestInput) {
    if (typeof input.data !== 'object' || input.data === null || Array.isArray(input.data)) {
      throw new GraphError('INVALID_MARKET_DATA', 'external market data must be a structured JSON object')
    }
    const instrument = input.instrument
    if (typeof instrument !== 'object' || instrument === null || Array.isArray(instrument)
      || [instrument.id, instrument.title].some(value => typeof value !== 'string' || value.trim().length === 0)
      || typeof instrument.metadata !== 'object' || instrument.metadata === null || Array.isArray(instrument.metadata)) {
      throw new GraphError('INVALID_MARKET_DATA', 'market ingest requires input:{instrument:{id,title,currency,metadata:{provider,asOf,availableAt,fetchedAt}},data:{...}}; fetched SourceItems belong in finance_ingest input.items')
    }
    const node = { ...instrumentNode(input.instrument, { marketData: input.data }), content: canonicalJson(input.data) }
    const applied = await this.graph.applyPlan({ nodes: [node], edges: [] }, 'finance.market.ingest', `ingest external market data for ${input.instrument.id}`)
    return { revision: applied.revision, changed: applied.result.changed, instrumentId: input.instrument.id }
  }

  private async ingestItems(
    values: readonly SourceItem[],
    options: { dryRun: boolean; runId?: string; asOf?: string; fetchedAt?: string; errors?: readonly SourceFailure[] },
  ) {
    if (!Array.isArray(values) || values.length === 0 || values.length > 500) {
      throw new GraphError('INVALID_REQUEST', 'items must contain between 1 and 500 SourceItem records')
    }
    const items = values.map(normalizeSourceItem)
    const asOf = options.asOf ?? items.map(item => Date.parse(item.asOf)).reduce((latest, value) => Math.max(latest, value), Number.NEGATIVE_INFINITY)
    const resolvedAsOf = typeof asOf === 'string' ? asOf : new Date(asOf).toISOString()
    timestamp(resolvedAsOf, 'asOf')
    const fetchedAt = options.fetchedAt ?? new Date(items.map(item => Date.parse(item.fetchedAt)).reduce((latest, value) => Math.max(latest, value), Number.NEGATIVE_INFINITY)).toISOString()
    timestamp(fetchedAt, 'fetchedAt')
    const runId = options.runId ?? `run-${hashId({ items: asJson(items), asOf: resolvedAsOf, fetchedAt })}`
    const snapshot = await this.graph.snapshot()
    const preview = buildIngestPlan(items, snapshot.nodes, {
      runId, asOf: resolvedAsOf, fetchedAt,
      ...(options.errors === undefined ? {} : { errors: options.errors }),
    })
    const base = {
      dryRun: options.dryRun,
      runId,
      asOf: resolvedAsOf,
      sourceIds: preview.sourceIds,
      rawIds: preview.rawIds,
      duplicates: preview.duplicates,
      quarantined: preview.quarantined,
      counts: {
        received: values.length,
        accepted: preview.items.length,
        duplicates: preview.duplicates.length,
        quarantined: preview.quarantined.length,
      },
      errors: options.errors ?? [],
    }
    if (options.dryRun || preview.plan === undefined) {
      return { ...base, revision: snapshot.revision, changed: false, ...(preview.sessionId === undefined ? {} : { sessionId: preview.sessionId }) }
    }
    const applied = await this.graph.applyPlan(preview.plan, 'finance.source.ingest', `ingest ${preview.sourceIds.length} public source item(s) in ${runId}`)
    return {
      ...base,
      revision: applied.revision,
      changed: applied.result.changed,
      ...(preview.sessionId === undefined ? {} : { sessionId: preview.sessionId }),
      diff: applied.diff,
    }
  }

  async ingestSources(input: SourceIngestInput) {
    if (!Array.isArray(input.items)) throw new GraphError('INVALID_REQUEST', 'source.ingest requires an items array')
    if (input.dryRun !== undefined && typeof input.dryRun !== 'boolean') throw new GraphError('INVALID_REQUEST', 'dryRun must be a boolean')
    return this.ingestItems(input.items, {
      dryRun: input.dryRun ?? true,
      ...(input.runId === undefined ? {} : { runId: input.runId }),
      ...(input.asOf === undefined ? {} : { asOf: input.asOf }),
    })
  }

  async importClipper(input: ClipperImportInput) {
    if (input.dryRun !== undefined && typeof input.dryRun !== 'boolean') throw new GraphError('INVALID_REQUEST', 'dryRun must be a boolean')
    if (typeof input.asOf !== 'string' || input.asOf.length === 0) throw new GraphError('INVALID_REQUEST', 'clipper.import requires a non-empty asOf')
    if (input.runId !== undefined && (typeof input.runId !== 'string' || input.runId.trim().length === 0)) throw new GraphError('INVALID_REQUEST', 'runId must be a non-empty string')
    const normalized = normalizeClipperBundle(input.bundle, input.asOf)
    return importCaptures(this.graph, normalized.records, normalized.rejected, normalized.received, {
      dryRun: input.dryRun ?? true,
      asOf: input.asOf,
      ...(input.runId === undefined ? {} : { runId: input.runId }),
      op: 'finance.clipper.import',
    })
  }

  async importDocuments(input: DocumentImportInput) {
    if (input.dryRun !== undefined && typeof input.dryRun !== 'boolean') throw new GraphError('INVALID_REQUEST', 'dryRun must be a boolean')
    if (typeof input.asOf !== 'string' || input.asOf.length === 0) throw new GraphError('INVALID_REQUEST', 'document.import requires a non-empty asOf')
    if (input.runId !== undefined && (typeof input.runId !== 'string' || input.runId.trim().length === 0)) throw new GraphError('INVALID_REQUEST', 'runId must be a non-empty string')
    const normalized = await normalizeDocumentFiles(input.files, input.asOf)
    return importCaptures(this.graph, normalized.records, normalized.rejected, normalized.received, {
      dryRun: input.dryRun ?? true,
      asOf: input.asOf,
      ...(input.runId === undefined ? {} : { runId: input.runId }),
      op: 'finance.document.import',
    })
  }

  async fetchSources(input: SourceFetchInput) {
    const batch = await this.dataPlane.fetch(input)
    if (batch.items.length === 0) {
      return {
        ...batch, revision: await this.graph.currentRevision(), changed: false,
        sourceIds: [], rawIds: [], duplicates: [], quarantined: [],
        counts: { received: 0, accepted: 0, duplicates: 0, quarantined: 0 },
      }
    }
    const ingested = await this.ingestItems(batch.items, {
      dryRun: batch.dryRun, runId: batch.runId, asOf: batch.asOf, fetchedAt: batch.fetchedAt, errors: batch.errors,
    })
    return { ...batch, ...ingested, items: batch.items, errors: batch.errors }
  }

  async fetchMarketData(input: SourceFetchInput) {
    return this.fetchSources(input)
  }

  async dcf(input: DcfInput) {
    const result = calculateDcf(input)
    assertAvailableBy(input.instrument.metadata, input.metadata.asOf, `instrument "${input.instrument.id}"`)
    const metadata = financeMetadata(input.metadata, asJson(input))
    const id = `valuation:${hashId({ method: 'dcf', instrumentId: input.instrument.id, runId: metadata.runId })}`
    const instrument = instrumentNode(input.instrument)
    const valuation: GraphPlanNode = {
      id,
      kind: 'valuation',
      title: `${input.instrument.title} DCF ${metadata.asOf}`,
      content: canonicalJson(asJson(result)),
      metadata: { ...metadata, method: 'dcf', instrumentId: input.instrument.id, result: asJson(result), warnings: result.warnings, references: [input.instrument.id] },
    }
    const applied = await this.graph.applyPlan({
      nodes: [instrument, valuation],
      edges: [{ from: id, to: input.instrument.id, kind: 'values', metadata: { runId: metadata.runId, contentHash: metadata.contentHash } }],
    }, 'finance.model.dcf', `DCF valuation for ${input.instrument.id}`)
    return { revision: applied.revision, changed: applied.result.changed, valuationId: id, result }
  }

  async comps(input: CompsInput) {
    const result = calculateComps(input)
    assertAvailableBy(input.instrument.metadata, input.metadata.asOf, `instrument "${input.instrument.id}"`)
    const metadata = financeMetadata(input.metadata, asJson(input))
    const id = `valuation:${hashId({ method: 'comps', instrumentId: input.instrument.id, runId: metadata.runId })}`
    const instrument = instrumentNode(input.instrument)
    const valuation: GraphPlanNode = {
      id,
      kind: 'valuation',
      title: `${input.instrument.title} comps ${metadata.asOf}`,
      content: canonicalJson(asJson(result)),
      metadata: { ...metadata, method: 'comps', instrumentId: input.instrument.id, result: asJson(result), warnings: result.warnings, references: [input.instrument.id] },
    }
    const applied = await this.graph.applyPlan({
      nodes: [instrument, valuation],
      edges: [{ from: id, to: input.instrument.id, kind: 'values', metadata: { runId: metadata.runId, contentHash: metadata.contentHash } }],
    }, 'finance.model.comps', `comps valuation for ${input.instrument.id}`)
    return { revision: applied.revision, changed: applied.result.changed, valuationId: id, result }
  }

  async portfolio(input: PortfolioInput) {
    const result = calculatePortfolio(input)
    const metadata = financeMetadata(input.metadata, asJson(input))
    const portfolioMetadata = financeMetadata(input.portfolio.metadata, asJson(input.portfolio))
    const nodes: GraphPlanNode[] = [{
      id: input.portfolio.id,
      kind: 'portfolio',
      title: input.portfolio.title,
      content: canonicalJson(asJson(result)),
      metadata: { ...portfolioMetadata, baseCurrency: input.baseCurrency, snapshotRunId: metadata.runId, result: asJson(result), warnings: result.warnings },
    }]
    const edges: EdgeInput[] = []
    for (const position of input.positions) {
      const calculated = result.positions.find(entry => entry.id === position.id)
      if (calculated === undefined) throw new GraphError('INTERNAL', `missing calculated position ${position.id}`)
      const positionMetadata = financeMetadata(position.metadata, asJson(position))
      nodes.push(instrumentNode(position.instrument))
      nodes.push({
        id: position.id,
        kind: 'position',
        title: `${input.portfolio.title} / ${position.instrument.title}`,
        content: canonicalJson(asJson(calculated)),
        metadata: {
          ...positionMetadata,
          portfolioId: input.portfolio.id,
          instrumentId: position.instrument.id,
          result: asJson(calculated),
          references: [input.portfolio.id, position.instrument.id],
        },
      })
      edges.push(
        { from: input.portfolio.id, to: position.id, kind: 'holds', metadata: { runId: metadata.runId, weight: calculated.weight } },
        { from: position.id, to: position.instrument.id, kind: 'exposure_to', metadata: { runId: metadata.runId, weight: calculated.weight } },
      )
    }
    const applied = await this.graph.applyPlan({ nodes, edges }, 'finance.portfolio.snapshot', `portfolio snapshot ${input.portfolio.id} at ${input.asOf}`)
    return { revision: applied.revision, changed: applied.result.changed, portfolioId: input.portfolio.id, result }
  }

  async applyPlan(plan: GraphPlan) {
    const compiled = finalizeCompilationPlan(plan)
    const finalized: GraphPlan = {
      ...compiled,
      nodes: compiled.nodes.map(node => {
        if (node.kind !== 'deliverable' || node.metadata?.compileRunId !== undefined) return node
        const contentHash = hashText(node.content ?? '')
        if (node.metadata?.contentHash !== undefined && node.metadata.contentHash !== contentHash) {
          throw new GraphError('CONTENT_HASH_MISMATCH', 'deliverable contentHash does not match its body')
        }
        return node.metadata?.contentHash === undefined
          ? { ...node, metadata: { ...node.metadata, contentHash } }
          : node
      }),
    }
    const applied = await this.graph.applyPlan(finalized, 'finance.graph.plan', 'apply finance graph plan')
    return { revision: applied.revision, changed: applied.result.changed, result: applied.result, diff: applied.diff }
  }

  async prepareCompilation(input: CompilePrepareInput) {
    const snapshot = await this.graph.snapshot()
    return { ...prepareCompilationCandidates(snapshot.nodes, input), revision: snapshot.revision }
  }

  async compileStatus(input: CompileStatusInput) {
    const snapshot = await this.graph.snapshot()
    return { ...compilationStatus(snapshot.nodes, snapshot.edges, input.runId), revision: snapshot.revision }
  }

  async getNode(id: string) {
    const node = await this.graph.getNode(id)
    if (node === undefined) throw new GraphError('MISSING_NODE', `node "${id}" does not exist`)
    return { revision: await this.graph.currentRevision(), node }
  }

  async search(query: string, options: { kinds?: NodeKind[] | undefined; limit?: number | undefined; asOf?: string | undefined } = {}) {
    const hits = await this.graph.search(query, {
      ...(options.kinds === undefined ? {} : { kinds: options.kinds }),
      ...(options.asOf === undefined && options.limit !== undefined ? { limit: options.limit } : {}),
    })
    const visible = options.asOf === undefined
      ? hits
      : hits.filter(hit => visibleBy(hit.node, options.asOf as string)).map(hit => {
        const availableAt = effectiveAvailableAt(hit.node)
        return availableAt === undefined || availableAt.value === hit.node.metadata.availableAt
          ? hit
          : { ...hit, node: { ...hit.node, metadata: { ...hit.node.metadata, availableAt: availableAt.value } } }
      })
    return { revision: await this.graph.currentRevision(), hits: visible.slice(0, options.limit ?? 50) }
  }

  async stats() {
    const stats = await this.graph.stats()
    return { ...stats, financeKinds: [...FINANCE_KINDS] }
  }

  async importArtifacts(payload: JsonObject) {
    const snapshot = await this.graph.snapshot()
    const built = researchArtifactPlan(payload, new Set(snapshot.nodes.map(node => node.id)))
    const applied = await this.graph.applyPlan(built.plan, 'finance.graph.import_artifact', `import ${built.artifactIds.length} ResearchArtifact(s)`)
    return { revision: applied.revision, changed: applied.result.changed, artifactIds: built.artifactIds, sourceIds: built.sourceIds }
  }

  async recordPrediction(input: PredictionInput) {
    timestamp(input.resolutionDate, 'resolutionDate')
    const date = /^([+-]\d{6}|\d{4})-(\d{1,2})-(\d{1,2})/.exec(input.resolutionDate.trim())
    if (date !== null) {
      const year = Number(date[1])
      const month = Number(date[2])
      const day = Number(date[3])
      const leapYear = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0)
      const daysInMonth = [31, leapYear ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month - 1] ?? 0
      if (day < 1 || day > daysInMonth) {
        throw new GraphError('INVALID_TIMESTAMP', 'resolutionDate must name an existing calendar day')
      }
    }
    const probability = input.prediction.probability
    if (probability !== undefined && (typeof probability !== 'number' || !Number.isFinite(probability) || probability < 0 || probability > 1)) {
      throw new GraphError('INVALID_PROBABILITY', 'prediction.probability must be a finite number in [0, 1]')
    }
    const metadata = financeMetadata(input.metadata, asJson(input))
    const references: string[] = []
    if (input.instrumentId !== undefined) references.push(input.instrumentId)
    if (input.catalyst !== undefined) references.push(input.catalyst.id)
    const nodes: GraphPlanNode[] = []
    const edges: EdgeInput[] = []
    if (input.catalyst !== undefined) {
      const catalystMetadata = financeMetadata(input.catalyst.metadata, asJson(input.catalyst))
      nodes.push({
        id: input.catalyst.id,
        kind: 'catalyst',
        title: input.catalyst.title,
        content: input.catalyst.title,
        metadata: { ...catalystMetadata, ...(input.instrumentId === undefined ? {} : { instrumentId: input.instrumentId, references: [input.instrumentId] }) },
      })
      if (input.instrumentId !== undefined) {
        edges.push({ from: input.catalyst.id, to: input.instrumentId, kind: 'catalyzes', metadata: { runId: metadata.runId } })
      }
    }
    nodes.push({
      id: input.id,
      kind: 'prediction',
      title: input.title,
      content: canonicalJson(input.prediction),
      metadata: {
        ...metadata,
        status: 'pending',
        resolutionDate: input.resolutionDate,
        prediction: input.prediction,
        warnings: [],
        references,
        ...(input.instrumentId === undefined ? {} : { instrumentId: input.instrumentId }),
        ...(input.catalyst === undefined ? {} : { catalystId: input.catalyst.id }),
      },
    })
    if (input.catalyst !== undefined) edges.push({ from: input.id, to: input.catalyst.id, kind: 'based_on', metadata: { runId: metadata.runId } })
    const applied = await this.graph.applyPlan({ nodes, edges }, 'finance.memory.record_prediction', `record prediction ${input.id}`)
    return { revision: applied.revision, changed: applied.result.changed, predictionId: input.id, status: 'pending' }
  }

  async recordIssue(input: IssueInput) {
    if (input.severity !== 'warning' && input.severity !== 'error') throw new GraphError('INVALID_SEVERITY', 'issue severity must be warning or error')
    const metadata = financeMetadata(input.metadata, asJson(input))
    const applied = await this.graph.applyPlan({
      nodes: [{
        id: input.id,
        kind: 'memory',
        title: input.title,
        content: input.message,
        metadata: { ...metadata, severity: input.severity, status: input.severity === 'error' ? 'error' : 'warning', references: input.references ?? [] },
      }],
      edges: [],
    }, 'finance.memory.record_issue', `record ${input.severity} ${input.id}`)
    return { revision: applied.revision, changed: applied.result.changed, memoryId: input.id, severity: input.severity }
  }

  async due(asOf: string) {
    timestamp(asOf, 'asOf')
    const nodes = await this.graph.listNodes('prediction')
    const predictions = nodes.filter(node => node.metadata.status === 'pending' && visibleBy(node, asOf))
    return { revision: await this.graph.currentRevision(), asOf, predictions, count: predictions.length }
  }

  async resolvePrediction(input: ResolvePredictionInput) {
    const current = await this.graph.getNode(input.id)
    if (current === undefined || current.kind !== 'prediction') throw new GraphError('MISSING_PREDICTION', `prediction "${input.id}" does not exist`)
    if (input.status !== 'resolved' && input.status !== 'error') throw new GraphError('INVALID_STATUS', 'resolution status must be resolved or error')
    const resolutionDate = current.metadata.resolutionDate
    if (typeof resolutionDate !== 'string') throw new GraphError('INVALID_PREDICTION', 'prediction has no resolutionDate')
    timestamp(input.resolvedAt, 'resolvedAt')
    if (timestamp(resolutionDate, 'resolutionDate') > timestamp(input.resolvedAt, 'resolvedAt')) {
      throw new GraphError('PREDICTION_NOT_DUE', `prediction "${input.id}" cannot settle before ${resolutionDate}`)
    }
    assertAvailableBy(input.metadata, input.resolvedAt, 'resolution')
    const metadata = financeMetadata(input.metadata, asJson(input))
    const references = Array.isArray(current.metadata.references) ? [...current.metadata.references] : []
    const targetId = input.targetId ?? (typeof current.metadata.instrumentId === 'string'
      ? current.metadata.instrumentId
      : typeof current.metadata.catalystId === 'string' ? current.metadata.catalystId : undefined)
    if (targetId !== undefined && !references.includes(targetId)) references.push(targetId)
    const prediction: GraphPlanNode = {
      id: current.id,
      kind: 'prediction',
      title: current.title,
      content: current.content,
      metadata: {
        ...current.metadata,
        ...metadata,
        status: input.status,
        outcome: input.outcome,
        resolvedAt: input.resolvedAt,
        warnings: input.warnings ?? [],
        predictionMetadata: current.metadata,
        references,
      },
    }
    const applied = await this.graph.applyPlan({
      nodes: [prediction],
      edges: targetId === undefined ? [] : [{ from: current.id, to: targetId, kind: 'resolves', metadata: { runId: metadata.runId, status: input.status } }],
    }, 'finance.memory.resolve', `resolve prediction ${input.id} as ${input.status}`)
    return { revision: applied.revision, changed: applied.result.changed, predictionId: input.id, status: input.status, warnings: input.warnings ?? [] }
  }

  async recall(asOf: string, query?: string) {
    timestamp(asOf, 'asOf')
    const snapshot = await this.graph.snapshot()
    const needle = query?.trim().toLowerCase()
    const memories = snapshot.nodes.filter(node => (node.kind === 'prediction' || node.kind === 'memory')
      && visibleBy(node, asOf)
      && (needle === undefined || needle.length === 0 || `${node.title}\n${node.content}\n${JSON.stringify(node.metadata)}`.toLowerCase().includes(needle)))
    return {
      revision: snapshot.revision,
      asOf,
      memories,
      count: memories.length,
      errors: memories.filter(node => node.metadata.status === 'error' || node.metadata.severity === 'error').length,
      warnings: memories.filter(node => node.metadata.severity === 'warning' || (Array.isArray(node.metadata.warnings) && node.metadata.warnings.length > 0)).length,
    }
  }

  async prepareBriefing(input: { asOf: string; kinds?: NodeKind[] | undefined; query?: string | undefined }) {
    timestamp(input.asOf, 'asOf')
    const snapshot = await this.graph.snapshot()
    const kinds = input.kinds === undefined ? undefined : new Set(input.kinds)
    const needle = input.query?.trim().toLowerCase()
    const nodes = snapshot.nodes.filter(node => visibleBy(node, input.asOf)
      && (kinds === undefined || kinds.has(node.kind))
      && (needle === undefined || needle.length === 0 || `${node.title}\n${node.content}`.toLowerCase().includes(needle)))
    const byId = new Map(snapshot.nodes.map(node => [node.id, node]))
    const cards = nodes.map(node => {
      const references = Array.isArray(node.metadata.references) ? node.metadata.references.filter((id): id is string => typeof id === 'string') : []
      const nodeAvailableAt = effectiveAvailableAt(node)
      return {
        id: node.id,
        kind: node.kind,
        claim: node.title,
        content: node.content,
        asOf: node.metadata.asOf,
        availableAt: nodeAvailableAt?.value,
        contentHash: node.metadata.contentHash,
        runId: node.metadata.runId,
        provenance: node.metadata.provenance,
        evidence: references.flatMap(id => {
          const source = byId.get(id)
          if (source === undefined) return [{ id }]
          if (!visibleBy(source, input.asOf)) return []
          return [{
            id,
            title: source.title,
            contentHash: source.metadata.contentHash,
            availableAt: effectiveAvailableAt(source)?.value,
          }]
        }),
      }
    })
    const lines = [`# Finance briefing — ${input.asOf}`, '']
    for (const card of cards) {
      lines.push(`## ${card.claim}`, '', `- ID: \`${card.id}\``, `- Kind: ${card.kind}`, `- Content hash: ${String(card.contentHash)}`, '', card.content, '')
      if (card.evidence.length > 0) lines.push(`Evidence: ${card.evidence.map(source => `\`${source.id}\``).join(', ')}`, '')
    }
    if (cards.length === 0) lines.push('No records were available at this as-of cutoff.', '')
    const content = lines.join('\n')
    return {
      revision: snapshot.revision,
      asOf: input.asOf,
      contentHash: hashJson({ asOf: input.asOf, cards: asJson(cards) }),
      cards,
      content,
      warnings: cards.length === 0 ? ['no point-in-time records matched the briefing cutoff'] : [],
    }
  }

  async recordBriefing(input: BriefingRecordInput) {
    const metadata = financeMetadata(input.metadata, asJson(input))
    const applied = await this.graph.applyPlan({
      nodes: [{
        id: input.id,
        kind: 'deliverable',
        title: input.title,
        content: input.content,
        metadata: { ...metadata, references: input.references ?? [], briefing: true },
      }],
      edges: [],
    }, 'finance.briefing.record', `record briefing ${input.id}`)
    return { revision: applied.revision, changed: applied.result.changed, briefingId: input.id }
  }

  async evaluate(input: { asOf: string }) {
    const recalled = await this.recall(input.asOf)
    const predictions = recalled.memories.filter((node): node is GraphNode => node.kind === 'prediction')
    const evaluations: JsonObject[] = []
    let correct = 0
    let directional = 0
    let brierTotal = 0
    let brierCount = 0
    const calibration = Array.from({ length: 10 }, () => ({ count: 0, probabilityTotal: 0, actualTotal: 0 }))
    for (const node of predictions) {
      if (node.metadata.status === 'pending') {
        evaluations.push({ id: node.id, status: 'pending_due', warning: 'prediction is due but unresolved' })
        continue
      }
      if (node.metadata.status === 'error') {
        evaluations.push({ id: node.id, status: 'error', warnings: node.metadata.warnings ?? [] })
        continue
      }
      if (node.metadata.status !== 'resolved' || typeof node.metadata.prediction !== 'object' || node.metadata.prediction === null
        || typeof node.metadata.outcome !== 'object' || node.metadata.outcome === null) continue
      const prediction = node.metadata.prediction as JsonObject
      const outcome = node.metadata.outcome as JsonObject
      const expectedDirection = predictionDirection(prediction)
      const actualDirection = predictionDirection(outcome)
      let isCorrect: boolean | undefined
      if (expectedDirection !== undefined && actualDirection !== undefined) {
        directional += 1
        isCorrect = expectedDirection === actualDirection
        if (isCorrect) correct += 1
      }
      const expectedValue = numericValue(prediction, false)
      const actualValue = numericValue(outcome, true)
      const absoluteError = expectedValue !== undefined && actualValue !== undefined ? Math.abs(expectedValue - actualValue) : undefined
      const probability = prediction.probability
      const actual = outcome.actual
      let brier: number | undefined
      if (typeof probability === 'number' && Number.isFinite(probability) && probability >= 0 && probability <= 1 && typeof actual === 'boolean') {
        brier = (probability - (actual ? 1 : 0)) ** 2
        brierTotal += brier
        brierCount += 1
        const binIndex = calibration.findIndex((_, index) => probability < (index + 1) / 10 || index === 9)
        const bin = calibration[binIndex]
        if (bin === undefined) throw new GraphError('INTERNAL', 'missing calibration bin')
        bin.count += 1
        bin.probabilityTotal += probability
        bin.actualTotal += actual ? 1 : 0
      }
      evaluations.push({
        id: node.id,
        status: 'resolved',
        ...(isCorrect === undefined ? {} : { correct: isCorrect }),
        ...(absoluteError === undefined ? {} : { absoluteError }),
        ...(brier === undefined ? {} : { brier }),
        warnings: node.metadata.warnings ?? [],
      })
    }
    const resolved = evaluations.filter(entry => entry.status === 'resolved').length
    const errors = evaluations.filter(entry => entry.status === 'error').length
    const pendingDue = evaluations.filter(entry => entry.status === 'pending_due').length
    const warnings = pendingDue > 0 ? [`${pendingDue} due prediction(s) remain unresolved`] : []
    if (brierCount > 0 && brierCount < 30) {
      warnings.push(`small calibration sample: ${brierCount} determinate prediction(s); interpret bins cautiously (30+ recommended)`)
    }
    return {
      revision: recalled.revision,
      asOf: input.asOf,
      due: predictions.length,
      resolved,
      errors,
      pendingDue,
      directionalAccuracy: directional === 0 ? null : correct / directional,
      brierScore: brierCount === 0 ? null : brierTotal / brierCount,
      brierCount,
      calibrationBins: calibration.map((bin, index) => ({
        lower: index / 10,
        upper: (index + 1) / 10,
        count: bin.count,
        meanPredictedProbability: bin.count === 0 ? null : bin.probabilityTotal / bin.count,
        observedFrequency: bin.count === 0 ? null : bin.actualTotal / bin.count,
      })),
      evaluations,
      warnings,
    }
  }
}
