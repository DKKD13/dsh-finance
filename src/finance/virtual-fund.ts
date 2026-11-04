import { GraphError } from '../graph.ts'
import type { GraphNode, JsonValue } from '../graph.ts'
import type { GraphPlan, GraphPlanNode } from '../plan.ts'
import type { ResearchGraphService } from '../service.ts'
import { canonicalJson, effectiveAvailableAt, hashId, isYahooHistoryNode, timestamp } from './metadata.ts'
import type { JsonObject } from './types.ts'

export const FUND_RESEARCHER_ROLES = ['manager', 'analyst', 'reviewer'] as const
export type FundResearcherRole = typeof FUND_RESEARCHER_ROLES[number]

export const FUND_AVATAR_KEYS = ['pm', 'nvda', 'googl', 'cost', 'jpm', 'unh', 'aapl', 'reviewer'] as const
export type FundAvatarKey = typeof FUND_AVATAR_KEYS[number]

export interface VirtualFundSettings {
  readonly initialCash: number
  readonly currency: string
  readonly startingAt: string
}

export interface FundConfigureInput extends VirtualFundSettings {
  readonly id: string
  readonly title: string
}

export interface FundResearcherInput {
  readonly fundId: string
  readonly id: string
  readonly title: string
  readonly tickers: readonly string[]
  readonly researchStyle: string
  readonly focus: string
  readonly task: string
  readonly role?: FundResearcherRole
  readonly avatarKey?: FundAvatarKey
  readonly sessionId?: string
  readonly scheduleId?: string
  readonly enabled: boolean
}

export interface FundPriceInput {
  readonly symbol: string
  readonly price: number
  readonly availableAt: string
  readonly sourceId: string
}

export interface FundTradeInput {
  readonly symbol: string
  /** Positive buys shares; negative sells shares. */
  readonly quantity: number
}

export interface FundAdvanceInput {
  readonly fundId: string
  readonly asOf: string
  readonly prices: readonly FundPriceInput[]
  readonly trades: readonly FundTradeInput[]
  readonly summary?: string
}

export interface FundStateInput {
  readonly fundId?: string
  /** Skip returning records the caller already has at this graph revision. */
  readonly knownRevision?: number
}

export interface FundSnapshotPosition {
  readonly symbol: string
  readonly quantity: number
  readonly price: number
  readonly value: number
}

export interface FundView extends VirtualFundSettings {
  readonly id: string
  readonly title: string
  readonly metadata: JsonObject
}

export interface FundResearcherView {
  readonly id: string
  readonly title: string
  readonly fundId: string
  readonly tickers: readonly string[]
  readonly researchStyle: string
  readonly focus: string
  readonly task: string
  readonly role: FundResearcherRole
  readonly avatarKey?: FundAvatarKey
  readonly sessionId?: string
  readonly scheduleId?: string
  readonly enabled: boolean
  readonly metadata: JsonObject
}

export interface FundSnapshotView {
  readonly id: string
  readonly fundId: string
  readonly asOf: string
  readonly nav: number
  readonly cash: number
  readonly positions: readonly FundSnapshotPosition[]
  readonly sourceIds: readonly string[]
  readonly summary: string
  readonly metadata: JsonObject
}

export interface FundStateResult {
  /** A compact poll response; the caller keeps its existing records. */
  readonly unchanged?: boolean
  /** Authoritative portfolio nodes carrying metadata.virtualFund. */
  readonly funds: readonly GraphNode[]
  /** Authoritative session nodes with metadata.type = "fund-researcher". */
  readonly researchers: readonly GraphNode[]
  /** Authoritative session nodes with metadata.type = "fund-snapshot". */
  readonly snapshots: readonly GraphNode[]
  /** Deliverable nodes carrying metadata.fundId. */
  readonly events: readonly GraphNode[]
}

interface FundStateRead extends FundStateResult {
  /** The revision belonging to these exact returned node arrays. */
  readonly revision: number
}

export interface FundConfigureResult {
  readonly fund: FundView
}

export interface FundResearcherResult {
  readonly researcher: FundResearcherView
}

export interface FundAdvanceResult {
  readonly snapshot: FundSnapshotView
}

const fundQueues = new WeakMap<ResearchGraphService, Promise<unknown>>()

type JsonRecord = Record<string, JsonValue>

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function cloneJson<T extends JsonValue>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}

function requiredString(value: unknown, field: string): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new GraphError('INVALID_FUND_INPUT', `${field} must be a non-empty string`)
  }
  return value.trim()
}

function optionalString(value: unknown, field: string): string | undefined {
  if (value === undefined) return undefined
  return requiredString(value, field)
}

function finite(value: unknown, field: string, minimum?: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || (minimum !== undefined && value < minimum)) {
    throw new GraphError('INVALID_FUND_INPUT', `${field} must be finite${minimum === undefined ? '' : ` and at least ${minimum}`}`)
  }
  return value
}

function isoTime(value: unknown, field: string): { value: string; milliseconds: number } {
  const milliseconds = timestamp(value, field)
  return { value: new Date(milliseconds).toISOString(), milliseconds }
}

function normalizedSymbol(value: unknown, field: string): string {
  return requiredString(value, field).toUpperCase()
}

function currencyCode(value: unknown, field: string): string {
  const currency = requiredString(value, field).toUpperCase()
  if (!/^[A-Z]{3}$/u.test(currency)) {
    throw new GraphError('INVALID_FUND_INPUT', `${field} must match /^[A-Z]{3}$/`)
  }
  return currency
}

function normalizedTickers(value: unknown): string[] {
  if (!Array.isArray(value) || value.length === 0) {
    throw new GraphError('INVALID_FUND_INPUT', 'tickers must be a non-empty array')
  }
  const tickers = value.map((entry, index) => requiredString(entry, `tickers[${index}]`))
  return [...new Set(tickers)]
}

function role(value: unknown): FundResearcherRole {
  if (value === undefined) return 'analyst'
  if (typeof value !== 'string' || !(FUND_RESEARCHER_ROLES as readonly string[]).includes(value)) {
    throw new GraphError('INVALID_FUND_INPUT', `role must be one of ${FUND_RESEARCHER_ROLES.join(', ')}`)
  }
  return value as FundResearcherRole
}

function avatarKey(value: unknown): FundAvatarKey | undefined {
  if (value === undefined) return undefined
  if (typeof value !== 'string' || !(FUND_AVATAR_KEYS as readonly string[]).includes(value)) {
    throw new GraphError('INVALID_FUND_INPUT', `avatarKey must be one of ${FUND_AVATAR_KEYS.join(', ')}`)
  }
  return value as FundAvatarKey
}

function virtualFundSettings(metadata: JsonObject): VirtualFundSettings & JsonObject {
  const value = metadata.virtualFund
  if (!isRecord(value)) throw new GraphError('INVALID_FUND_STATE', 'portfolio metadata.virtualFund must be an object')
  return {
    ...value,
    initialCash: finite(value.initialCash, 'virtualFund.initialCash', 0),
    currency: currencyCode(value.currency, 'virtualFund.currency'),
    startingAt: isoTime(value.startingAt, 'virtualFund.startingAt').value,
  }
}

function fundView(node: GraphNode): FundView {
  const settings = virtualFundSettings(node.metadata)
  return {
    id: node.id,
    title: node.title,
    initialCash: settings.initialCash,
    currency: settings.currency,
    startingAt: settings.startingAt,
    metadata: cloneJson(node.metadata),
  }
}

function researcherView(node: GraphNode): FundResearcherView {
  const metadata = node.metadata
  if (metadata.type !== 'fund-researcher') throw new GraphError('INVALID_FUND_STATE', `node "${node.id}" is not a fund researcher`)
  const tickers = normalizedTickers(metadata.tickers)
  const parsedRole = role(metadata.role)
  const parsedAvatar = avatarKey(metadata.avatarKey)
  const sessionId = metadata.sessionId === undefined ? undefined : requiredString(metadata.sessionId, `${node.id}.sessionId`)
  const scheduleId = metadata.scheduleId === undefined ? undefined : requiredString(metadata.scheduleId, `${node.id}.scheduleId`)
  if (typeof metadata.enabled !== 'boolean') throw new GraphError('INVALID_FUND_STATE', `node "${node.id}" must have boolean metadata.enabled`)
  if (metadata.enabled && scheduleId === undefined) {
    throw new GraphError('INVALID_FUND_STATE', `enabled researcher "${node.id}" has no scheduleId`)
  }
  return {
    id: node.id,
    title: node.title,
    fundId: requiredString(metadata.fundId, `${node.id}.fundId`),
    tickers,
    researchStyle: requiredString(metadata.researchStyle, `${node.id}.researchStyle`),
    focus: requiredString(metadata.focus, `${node.id}.focus`),
    task: requiredString(metadata.task, `${node.id}.task`),
    role: parsedRole,
    ...(parsedAvatar === undefined ? {} : { avatarKey: parsedAvatar }),
    ...(sessionId === undefined ? {} : { sessionId }),
    ...(scheduleId === undefined ? {} : { scheduleId }),
    enabled: metadata.enabled,
    metadata: cloneJson(metadata),
  }
}

function positionsFrom(metadata: JsonObject): FundSnapshotPosition[] {
  if (!Array.isArray(metadata.positions)) throw new GraphError('INVALID_FUND_STATE', 'fund snapshot positions must be an array')
  return metadata.positions.map((value, index) => {
    if (!isRecord(value)) throw new GraphError('INVALID_FUND_STATE', `fund snapshot positions[${index}] must be an object`)
    const quantity = finite(value.quantity, `positions[${index}].quantity`, 0)
    const price = finite(value.price, `positions[${index}].price`, 0)
    const returnedValue = finite(value.value, `positions[${index}].value`, 0)
    if (Math.abs(returnedValue - quantity * price) > 1e-9) {
      throw new GraphError('INVALID_FUND_STATE', `fund snapshot positions[${index}].value does not equal quantity * price`)
    }
    return {
      symbol: normalizedSymbol(value.symbol, `positions[${index}].symbol`),
      quantity,
      price,
      value: returnedValue,
    }
  })
}

function snapshotView(node: GraphNode): FundSnapshotView {
  const metadata = node.metadata
  if (metadata.type !== 'fund-snapshot') throw new GraphError('INVALID_FUND_STATE', `node "${node.id}" is not a fund snapshot`)
  if (!Array.isArray(metadata.sourceIds) || metadata.sourceIds.some(value => typeof value !== 'string')) {
    throw new GraphError('INVALID_FUND_STATE', `fund snapshot "${node.id}" sourceIds must be a string array`)
  }
  return {
    id: node.id,
    fundId: requiredString(metadata.fundId, `${node.id}.fundId`),
    asOf: isoTime(metadata.asOf, `${node.id}.asOf`).value,
    nav: finite(metadata.nav, `${node.id}.nav`),
    cash: finite(metadata.cash, `${node.id}.cash`),
    positions: positionsFrom(metadata),
    sourceIds: metadata.sourceIds as string[],
    summary: typeof metadata.summary === 'string' ? metadata.summary : '',
    metadata: cloneJson(metadata),
  }
}

function fundNodes(nodes: readonly GraphNode[]): GraphNode[] {
  return nodes.filter(node => node.kind === 'portfolio' && isRecord(node.metadata.virtualFund))
}

function researcherNodes(nodes: readonly GraphNode[]): GraphNode[] {
  return nodes.filter(node => node.kind === 'session' && node.metadata.type === 'fund-researcher')
}

function snapshotNodes(nodes: readonly GraphNode[]): GraphNode[] {
  return nodes.filter(node => node.kind === 'session' && node.metadata.type === 'fund-snapshot')
}

function findFund(nodes: readonly GraphNode[], fundId: string): GraphNode {
  const fund = fundNodes(nodes).find(node => node.id === fundId)
  if (fund === undefined) throw new GraphError('FUND_NOT_FOUND', `virtual fund "${fundId}" does not exist`)
  return fund
}

function nodeTimeline(node: GraphNode): { value: string; milliseconds: number } {
  const availableAt = effectiveAvailableAt(node)
  if (availableAt !== undefined) return availableAt
  if (isYahooHistoryNode(node)) {
    throw new GraphError('INVALID_TIMESTAMP', `${node.id}.fetchedAt is required for Yahoo history`)
  }
  const asOf = node.metadata.asOf
  return isoTime(asOf, `${node.id}.asOf`)
}

function parsedContent(node: GraphNode): JsonValue | undefined {
  if (!node.content.trim().startsWith('{') && !node.content.trim().startsWith('[')) return undefined
  try {
    return JSON.parse(node.content) as JsonValue
  } catch {
    return undefined
  }
}

interface PriceEvidence {
  readonly price: number
  readonly currency: string
  readonly availableAt: string
  readonly milliseconds: number
}

function assertSourceUsable(node: GraphNode, point?: JsonRecord): void {
  const status = point?.status ?? node.metadata.status
  if (point?.quarantined === true
    || node.metadata.quarantined === true
    || status === 'quarantined'
    || status === 'rejected') {
    throw new GraphError('SOURCE_QUARANTINED', `price record "${node.id}" is quarantined or rejected`)
  }
}

function pointRecords(node: GraphNode): JsonRecord[] {
  const structured = [node.metadata.data, node.metadata.marketData].filter(isRecord)
  if (structured.length > 0) return structured
  const parsed = parsedContent(node)
  return isRecord(parsed) ? [parsed] : []
}

function pointEvidence(node: GraphNode, point: JsonRecord, symbol: string): PriceEvidence {
  assertSourceUsable(node, point)
  const pointSymbol = point.symbol ?? point.ticker ?? node.metadata.symbol
  if (typeof pointSymbol !== 'string' || pointSymbol.toUpperCase() !== symbol) {
    throw new GraphError('SOURCE_SYMBOL_MISMATCH', `price record "${node.id}" does not identify ${symbol}`)
  }
  const provenance = isRecord(node.metadata.provenance) ? node.metadata.provenance : undefined
  const yahooQuote = node.metadata.provider === 'yahoo'
    && provenance?.endpoint === 'v8/finance/chart'
    && provenance.priceBasis === 'regularMarketPrice, unadjusted'
    && !Array.isArray(point.bars)
  const price = point.price ?? (yahooQuote ? point.regularMarketPrice : undefined)
  if (typeof price !== 'number' || !Number.isFinite(price) || price <= 0) {
    throw new GraphError('SOURCE_POINT_INVALID', `price record "${node.id}" requires one positive numeric data.price`)
  }
  const currencyValue = point.currency ?? node.metadata.currency
  if (typeof currencyValue !== 'string' || !/^[A-Z]{3}$/u.test(currencyValue.trim().toUpperCase())) {
    throw new GraphError('SOURCE_POINT_INVALID', `price record "${node.id}" requires a three-letter currency`)
  }
  const availableAtValue = point.availableAt
    ?? (yahooQuote ? point.regularMarketTime : undefined)
    ?? node.metadata.availableAt
    ?? node.metadata.asOf
  const availableAt = isoTime(availableAtValue, `${node.id}.availableAt`)
  const recordTimeline = nodeTimeline(node)
  if (availableAt.value !== recordTimeline.value) {
    throw new GraphError('SOURCE_TIME_MISMATCH', `price record "${node.id}" observation time does not match its record timestamp`)
  }
  return {
    price,
    currency: currencyValue.toUpperCase(),
    availableAt: availableAt.value,
    milliseconds: availableAt.milliseconds,
  }
}

function evidenceFromRecord(node: GraphNode, symbol: string, asOf: number): PriceEvidence {
  assertSourceUsable(node)
  const timeline = nodeTimeline(node)
  if (timeline.milliseconds > asOf) {
    throw new GraphError('SOURCE_FUTURE', `source record "${node.id}" was not available by the requested asOf`)
  }
  const points = pointRecords(node).map(point => pointEvidence(node, point, symbol))
  if (points.length === 0) {
    throw new GraphError('SOURCE_POINT_INVALID', `price record "${node.id}" has no single-point metadata.data or metadata.marketData object`)
  }
  const distinct = new Map(points.map(point => [canonicalJson({
    price: point.price,
    currency: point.currency,
    availableAt: point.availableAt,
  }), point]))
  if (distinct.size !== 1) {
    throw new GraphError('AMBIGUOUS_PRICE', `price record "${node.id}" contains more than one distinct point observation`)
  }
  const point = [...distinct.values()][0] as PriceEvidence
  if (point.milliseconds > asOf) {
    throw new GraphError('SOURCE_FUTURE', `price record "${node.id}" observation is newer than the requested asOf`)
  }
  return point
}

function sourceEvidence(
  nodes: readonly GraphNode[],
  sourceId: string,
  symbol: string,
  asOf: number,
): PriceEvidence {
  const source = nodes.find(node => node.id === sourceId)
  if (source === undefined || (source.kind !== 'source' && source.kind !== 'raw' && source.kind !== 'instrument')) {
    throw new GraphError('SOURCE_NOT_FOUND', `price sourceId "${sourceId}" does not identify a source, raw, or instrument record`)
  }
  if (source.kind === 'instrument') return evidenceFromRecord(source, symbol, asOf)
  if (source.kind === 'raw') return evidenceFromRecord(source, symbol, asOf)
  assertSourceUsable(source)
  const provenance = isRecord(source.metadata.provenance) ? source.metadata.provenance : undefined
  const rawId = typeof provenance?.rawId === 'string' ? provenance.rawId : undefined
  const raw = rawId === undefined
    ? nodes.find(node => node.kind === 'raw' && node.metadata.sourceId === sourceId)
    : nodes.find(node => node.id === rawId && node.kind === 'raw')
  if (raw === undefined) {
    throw new GraphError('SOURCE_NOT_FOUND', `sourceId "${sourceId}" has no actual raw record`)
  }
  const sourceTimeline = nodeTimeline(source)
  if (sourceTimeline.milliseconds > asOf) {
    throw new GraphError('SOURCE_FUTURE', `source record "${source.id}" was not available by the requested asOf`)
  }
  const rawTimeline = evidenceFromRecord(raw, symbol, asOf)
  if (rawTimeline.availableAt !== sourceTimeline.value) {
    throw new GraphError('SOURCE_TIME_MISMATCH', `raw record for sourceId "${sourceId}" does not match its source timestamp`)
  }
  return { ...rawTimeline, availableAt: sourceTimeline.value, milliseconds: sourceTimeline.milliseconds }
}

function validatedPrices(
  nodes: readonly GraphNode[],
  prices: readonly FundPriceInput[],
  asOf: { value: string; milliseconds: number },
  currency: string,
): Map<string, FundPriceInput> {
  if (!Array.isArray(prices)) throw new GraphError('INVALID_FUND_INPUT', 'prices must be an array')
  const result = new Map<string, FundPriceInput>()
  for (const [index, raw] of prices.entries()) {
    if (!isRecord(raw)) throw new GraphError('INVALID_FUND_INPUT', `prices[${index}] must be an object`)
    const symbol = normalizedSymbol(raw.symbol, `prices[${index}].symbol`)
    if (result.has(symbol)) throw new GraphError('DUPLICATE_PRICE', `prices contains ${symbol} more than once`)
    const requestedPrice = finite(raw.price, `prices[${index}].price`, Number.MIN_VALUE)
    const availableAt = isoTime(raw.availableAt, `prices[${index}].availableAt`)
    if (availableAt.milliseconds > asOf.milliseconds) {
      throw new GraphError('FUTURE_PRICE', `${symbol} price is not available by ${asOf.value}`)
    }
    const sourceId = requiredString(raw.sourceId, `prices[${index}].sourceId`)
    const evidence = sourceEvidence(nodes, sourceId, symbol, asOf.milliseconds)
    if (evidence.availableAt !== availableAt.value) {
      throw new GraphError('SOURCE_TIME_MISMATCH', `${symbol} availableAt does not match source record "${sourceId}"`)
    }
    if (evidence.currency !== currency.toUpperCase()) {
      throw new GraphError('CURRENCY_MISMATCH', `${symbol} source currency ${evidence.currency} does not match fund currency ${currency}`)
    }
    if (Math.abs(evidence.price - requestedPrice) > Math.max(1, Math.abs(evidence.price)) * 1e-12) {
      throw new GraphError(
        'SOURCE_PRICE_MISMATCH',
        `${symbol} price ${requestedPrice} does not match source record value ${evidence.price}`,
      )
    }
    result.set(symbol, {
      symbol,
      price: evidence.price,
      availableAt: evidence.availableAt,
      sourceId,
    })
  }
  return result
}

function validatedTrades(trades: readonly FundTradeInput[]): Map<string, number> {
  if (!Array.isArray(trades)) throw new GraphError('INVALID_FUND_INPUT', 'trades must be an array')
  const result = new Map<string, number>()
  for (const [index, raw] of trades.entries()) {
    if (!isRecord(raw)) throw new GraphError('INVALID_FUND_INPUT', `trades[${index}] must be an object`)
    const symbol = normalizedSymbol(raw.symbol, `trades[${index}].symbol`)
    const quantity = finite(raw.quantity, `trades[${index}].quantity`)
    if (quantity === 0) throw new GraphError('INVALID_TRADE', `trades[${index}].quantity must be non-zero`)
    result.set(symbol, (result.get(symbol) ?? 0) + quantity)
  }
  return result
}

function previousLedger(fund: FundView, snapshot: FundSnapshotView | undefined) {
  const cash = snapshot?.cash ?? fund.initialCash
  const positions = new Map<string, FundSnapshotPosition>()
  for (const position of snapshot?.positions ?? []) positions.set(position.symbol, position)
  return { cash, positions }
}

function buildSnapshot(
  fundNode: GraphNode,
  nodes: readonly GraphNode[],
  input: FundAdvanceInput,
  previous: FundSnapshotView | undefined,
) {
  const fund = fundView(fundNode)
  const asOf = isoTime(input.asOf, 'asOf')
  if (asOf.milliseconds > Date.now()) throw new GraphError('FUTURE_AS_OF', `asOf ${asOf.value} is in the future`)
  if (asOf.milliseconds < timestamp(fund.startingAt, 'startingAt')) {
    throw new GraphError('BEFORE_FUND_START', `asOf ${asOf.value} is before the fund startingAt ${fund.startingAt}`)
  }
  const prices = validatedPrices(nodes, input.prices, asOf, fund.currency)
  const trades = validatedTrades(input.trades)
  const ledger = previousLedger(fund, previous)
  const requiredSymbols = new Set<string>([...ledger.positions.keys(), ...trades.keys()])
  for (const symbol of requiredSymbols) {
    if (!prices.has(symbol)) throw new GraphError('MISSING_PRICE', `missing price for held or traded symbol ${symbol}`)
  }

  let cash = ledger.cash
  for (const [symbol, quantity] of trades) {
    const price = prices.get(symbol)?.price
    if (price === undefined) throw new GraphError('MISSING_PRICE', `missing price for traded symbol ${symbol}`)
    cash -= quantity * price
    const position = ledger.positions.get(symbol)
    const nextQuantity = (position?.quantity ?? 0) + quantity
    if (nextQuantity < 0) {
      throw new GraphError('INSUFFICIENT_POSITION', `trade would short ${symbol}: resulting quantity ${nextQuantity}`)
    }
    if (nextQuantity === 0) ledger.positions.delete(symbol)
    else ledger.positions.set(symbol, { symbol, quantity: nextQuantity, price, value: nextQuantity * price })
  }
  if (cash < 0) throw new GraphError('INSUFFICIENT_CASH', `advance requires ${Math.abs(cash)} more ${fund.currency}`)

  const positions = [...ledger.positions.keys()].sort().map(symbol => {
    const position = ledger.positions.get(symbol) as FundSnapshotPosition
    const price = prices.get(symbol)?.price
    if (price === undefined) throw new GraphError('MISSING_PRICE', `missing price for held symbol ${symbol}`)
    return { symbol, quantity: position.quantity, price, value: position.quantity * price }
  })
  const nav = cash + positions.reduce((total, position) => total + position.value, 0)
  if (!Number.isFinite(cash) || !Number.isFinite(nav) || positions.some(position => !Number.isFinite(position.quantity) || !Number.isFinite(position.value))) {
    throw new GraphError('INVALID_FUND_INPUT', 'ledger calculation exceeds the supported finite numeric range')
  }
  const sourceIds = [...new Set([...prices.values()].map(price => price.sourceId))].sort()
  if (input.summary !== undefined && typeof input.summary !== 'string') {
    throw new GraphError('INVALID_FUND_INPUT', 'summary must be a string when provided')
  }
  const summary = input.summary ?? ''
  const id = `session:fund-snapshot:${hashId({ fundId: fund.id, asOf: asOf.value })}`
  const metadata: JsonObject = {
    type: 'fund-snapshot',
    fundId: fund.id,
    asOf: asOf.value,
    nav,
    cash,
    positions,
    sourceIds,
    summary,
    references: [fund.id, ...sourceIds],
  }
  return {
    node: {
      id,
      kind: 'session' as const,
      title: `${fund.title} snapshot ${asOf.value}`,
      content: canonicalJson({
        fundId: fund.id,
        asOf: asOf.value,
        nav,
        cash,
        positions,
        sourceIds,
        summary,
      }),
      metadata,
    } satisfies GraphPlanNode,
    view: {
      id,
      fundId: fund.id,
      asOf: asOf.value,
      nav,
      cash,
      positions,
      sourceIds,
      summary,
      metadata,
    } satisfies FundSnapshotView,
  }
}

/**
 * Same-asOf replay equivalence uses the materialized ledger result, summary,
 * and source IDs. Trade ordering and decomposition may differ when they
 * normalize to the same result.
 */
function sameSnapshot(left: FundSnapshotView, right: FundSnapshotView): boolean {
  return left.id === right.id
    && left.fundId === right.fundId
    && left.asOf === right.asOf
    && left.nav === right.nav
    && left.cash === right.cash
    && canonicalJson(left.positions as unknown as JsonValue) === canonicalJson(right.positions as unknown as JsonValue)
    && left.summary === right.summary
    && canonicalJson(left.sourceIds as unknown as JsonValue) === canonicalJson(right.sourceIds as unknown as JsonValue)
}

/** Serialized graph-backed virtual fund operations. */
export class VirtualFundManager {
  constructor(private readonly graph: ResearchGraphService) {}

  private serialized<T>(operation: () => Promise<T>): Promise<T> {
    const previous = fundQueues.get(this.graph) ?? Promise.resolve()
    const run = previous.then(operation)
    fundQueues.set(this.graph, run.catch(() => {}))
    return run
  }

  state(input: FundStateInput = {}): Promise<FundStateRead> {
    return this.serialized(async () => {
      const requestedFund = input.fundId === undefined ? undefined : requiredString(input.fundId, 'fundId')
      if (input.knownRevision !== undefined
        && (!Number.isSafeInteger(input.knownRevision) || input.knownRevision < 0)) {
        throw new GraphError('INVALID_FUND_INPUT', 'knownRevision must be a non-negative safe integer')
      }
      const snapshot = await this.graph.readNodeSnapshot()
      // Legacy unversioned graphs can be non-empty at revision zero. Their
      // first full read is safe to repeat; never replace it with an empty cache.
      if (input.knownRevision !== undefined && input.knownRevision > 0
        && input.knownRevision === snapshot.revision && requestedFund === undefined) {
        return { revision: snapshot.revision, unchanged: true, funds: [], researchers: [], snapshots: [], events: [] }
      }
      // Fund state only reads nodes; listing them avoids copying and sorting
      // every edge on each poll (the panel refreshes on an interval).
      const nodes = snapshot.nodes
      const funds = fundNodes(nodes)
        .filter(node => requestedFund === undefined || node.id === requestedFund)
        .sort((left, right) => left.id.localeCompare(right.id))
      for (const node of funds) virtualFundSettings(node.metadata)
      if (requestedFund !== undefined && funds.length === 0) {
        throw new GraphError('FUND_NOT_FOUND', `virtual fund "${requestedFund}" does not exist`)
      }
      const allowedFunds = new Set(funds.map(fund => fund.id))
      const researchers = researcherNodes(nodes)
        .filter(node => allowedFunds.has(String(node.metadata.fundId)))
        .sort((left, right) => left.id.localeCompare(right.id))
      for (const node of researchers) researcherView(node)
      return {
        revision: snapshot.revision,
        funds,
        researchers,
        snapshots: snapshotNodes(nodes)
          .filter(node => allowedFunds.has(String(node.metadata.fundId)))
          .sort((left, right) => {
            const leftAsOf = typeof left.metadata.asOf === 'string' ? left.metadata.asOf : ''
            const rightAsOf = typeof right.metadata.asOf === 'string' ? right.metadata.asOf : ''
            return leftAsOf.localeCompare(rightAsOf) || left.id.localeCompare(right.id)
          }),
        events: nodes
          .filter(node => node.kind === 'deliverable' && typeof node.metadata.fundId === 'string' && allowedFunds.has(node.metadata.fundId))
          .sort((left, right) => left.createdAt - right.createdAt || left.id.localeCompare(right.id)),
      }
    })
  }

  configure(input: FundConfigureInput): Promise<FundConfigureResult> {
    return this.serialized(async () => {
      const id = requiredString(input.id, 'id')
      const title = requiredString(input.title, 'title')
      const initialCash = finite(input.initialCash, 'initialCash', 0)
      const currency = currencyCode(input.currency, 'currency')
      const startingAt = isoTime(input.startingAt, 'startingAt').value
      const nodes = await this.graph.listNodes()
      const existing = nodes.find(node => node.id === id)
      if (existing !== undefined && existing.kind !== 'portfolio') {
        throw new GraphError('FUND_CONFLICT', `node "${id}" is ${existing.kind}, not portfolio`)
      }
      const existingVirtualFund = isRecord(existing?.metadata.virtualFund) ? existing.metadata.virtualFund : {}
      const hasSnapshots = snapshotNodes(nodes).some(node => node.metadata.fundId === id)
      if (hasSnapshots
        && (existingVirtualFund.initialCash !== initialCash
          || existingVirtualFund.currency !== currency
          || (typeof existingVirtualFund.startingAt === 'string'
            && isoTime(existingVirtualFund.startingAt, `virtualFund.startingAt`).value !== startingAt))) {
        throw new GraphError('FUND_CONFIG_IMMUTABLE', 'initialCash, currency, and startingAt cannot change after the first snapshot')
      }
      const virtualFund: JsonObject = {
        ...existingVirtualFund,
        initialCash,
        currency,
        startingAt,
      }
      const metadata: JsonObject = {
        ...(existing?.metadata ?? {}),
        virtualFund,
      }
      const node: GraphPlanNode = {
        id,
        kind: 'portfolio',
        title,
        content: existing?.content || canonicalJson(virtualFund),
        metadata,
      }
      const applied = await this.graph.applyPlan({ nodes: [node], edges: [] }, 'finance.fund.configure', `configure virtual fund ${id}`)
      return { fund: fundView(applied.result.nodes[0] as GraphNode) }
    })
  }

  researcher(input: FundResearcherInput): Promise<FundResearcherResult> {
    return this.serialized(async () => {
      const fundId = requiredString(input.fundId, 'fundId')
      const id = requiredString(input.id, 'id')
      const title = requiredString(input.title, 'title')
      const tickers = normalizedTickers(input.tickers)
      const researchStyle = requiredString(input.researchStyle, 'researchStyle')
      const focus = requiredString(input.focus, 'focus')
      const task = requiredString(input.task, 'task')
      const researcherRole = role(input.role)
      const parsedAvatar = avatarKey(input.avatarKey)
      if (typeof input.enabled !== 'boolean') throw new GraphError('INVALID_FUND_INPUT', 'enabled must be a boolean')
      const nodes = await this.graph.listNodes()
      findFund(nodes, fundId)
      const existing = nodes.find(node => node.id === id)
      if (existing !== undefined && existing.kind !== 'session') {
        throw new GraphError('FUND_CONFLICT', `researcher id "${id}" is ${existing.kind}, not session`)
      }
      if (existing !== undefined
        && existing.metadata.type !== undefined
        && existing.metadata.type !== 'fund-researcher') {
        throw new GraphError('FUND_CONFLICT', `session "${id}" is not a fund researcher`)
      }
      if (existing !== undefined && existing.metadata.fundId !== undefined && existing.metadata.fundId !== fundId) {
        throw new GraphError('RESEARCHER_FUND_MISMATCH', `researcher "${id}" belongs to another fund`)
      }
      const requestedSessionId = optionalString(input.sessionId, 'sessionId')
      const requestedScheduleId = optionalString(input.scheduleId, 'scheduleId')
      const existingSessionId = optionalString(existing?.metadata.sessionId, `${id}.sessionId`)
      const existingScheduleId = optionalString(existing?.metadata.scheduleId, `${id}.scheduleId`)
      const sessionId = requestedSessionId ?? existingSessionId
      const scheduleId = requestedScheduleId ?? existingScheduleId
      const existingAvatar = avatarKey(existing?.metadata.avatarKey)
      const selectedAvatar = parsedAvatar ?? existingAvatar
      if (input.enabled && scheduleId === undefined) {
        throw new GraphError('SCHEDULE_ID_REQUIRED', 'enabled researchers require the actual scheduleId returned by the host schedule tool')
      }
      const metadata: JsonObject = {
        ...(existing?.metadata ?? {}),
        type: 'fund-researcher',
        fundId,
        tickers,
        researchStyle,
        focus,
        task,
        role: researcherRole,
        enabled: input.enabled,
        ...(selectedAvatar === undefined ? {} : { avatarKey: selectedAvatar }),
        ...(sessionId === undefined ? {} : { sessionId }),
        ...(scheduleId === undefined ? {} : { scheduleId }),
      }
      const node: GraphPlanNode = {
        id,
        kind: 'session',
        title,
        content: task,
        metadata,
      }
      const applied = await this.graph.applyPlan({ nodes: [node], edges: [] }, 'finance.fund.researcher', `configure fund researcher ${id}`)
      return { researcher: researcherView(applied.result.nodes[0] as GraphNode) }
    })
  }

  advance(input: FundAdvanceInput): Promise<FundAdvanceResult> {
    return this.serialized(async () => {
      const fundId = requiredString(input.fundId, 'fundId')
      const target = isoTime(input.asOf, 'asOf')
      const nodes = await this.graph.listNodes()
      const fundNode = findFund(nodes, fundId)
      const snapshots = snapshotNodes(nodes)
        .filter(node => node.metadata.fundId === fundId)
        .map(snapshotView)
        .sort((left, right) => Date.parse(left.asOf) - Date.parse(right.asOf) || left.id.localeCompare(right.id))
      const existing = snapshots.find(entry => entry.asOf === target.value)
      if (existing !== undefined) {
        const previous = [...snapshots].reverse().find(entry => Date.parse(entry.asOf) < target.milliseconds)
        const rebuilt = buildSnapshot(fundNode, nodes, { ...input, asOf: target.value }, previous)
        if (sameSnapshot(existing, rebuilt.view)) return { snapshot: existing }
        throw new GraphError('DUPLICATE_SNAPSHOT_CONFLICT', `snapshot ${target.value} already exists with different ledger data`)
      }
      const latest = snapshots.at(-1)
      if (latest !== undefined && target.milliseconds < Date.parse(latest.asOf)) {
        throw new GraphError('OUT_OF_ORDER_SNAPSHOT', `asOf ${target.value} is earlier than latest snapshot ${latest.asOf}`)
      }
      const built = buildSnapshot(fundNode, nodes, { ...input, asOf: target.value }, latest)
      const applied = await this.graph.applyPlan({ nodes: [built.node], edges: [] }, 'finance.fund.advance', `advance virtual fund ${fundId} to ${target.value}`)
      return { snapshot: applied.result.changed ? built.view : snapshotView(applied.result.nodes[0] as GraphNode) }
    })
  }
}
