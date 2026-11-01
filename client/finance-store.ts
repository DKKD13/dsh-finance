import type { GraphResponse } from '../src/protocol.ts'
import type { GraphNode, JsonValue } from '../src/graph.ts'
import type { JsonObject } from '../src/finance/types.ts'
import type { FinanceCommandRequest } from './protocol.ts'
import type { InboxFileDescriptor } from './inbox.ts'
import { readInboxPreview } from './inbox.ts'
import type { Notice, Translate } from './store.ts'

export interface FinanceGateway {
  request(request: FinanceCommandRequest): Promise<GraphResponse>
}

export type FinanceSection = 'overview' | 'inbox' | 'library' | 'hypotheses' | 'reports' | 'market' | 'portfolio' | 'valuations' | 'predictions' | 'ingest' | 'briefing' | 'guide'
  | 'markets' | 'crypto' | 'earnings' | 'prediction-markets' | 'screener' | 'politicians' | 'watchlist' | 'apps' | 'activity' | 'virtual-fund'
export type FinanceOperationKey =
  | 'overview'
  | 'search'
  | 'watchlist'
  | 'quote'
  | 'history'
  | 'portfolio'
  | 'valuation'
  | 'recordPrediction'
  | 'due'
  | 'resolve'
  | 'ingest'
  | 'inboxCommit'
  | 'briefingPrepare'
  | 'briefingRecord'
  | 'briefingEvaluate'

export interface FinanceOperationState {
  readonly status: 'idle' | 'loading' | 'success' | 'error'
  readonly result: JsonValue | null
  readonly error: { readonly code: string; readonly message: string } | null
}

export interface MarketQuoteInput {
  readonly symbol: string
  readonly asOf: string
}

export interface MarketHistoryInput {
  readonly symbol: string
  readonly start?: string
  readonly end?: string
  readonly range?: string
  readonly interval: string
}

export interface FinanceState {
  readonly phase: 'loading' | 'ready' | 'error'
  readonly error: { readonly code: string; readonly message: string } | null
  readonly revision: number
  readonly section: FinanceSection
  readonly market: {
    readonly quote: MarketQuoteInput | null
    readonly history: MarketHistoryInput | null
  }
  /** Compatibility summary: any operation currently in flight. Forms use their own operation state. */
  readonly busy: string | null
  readonly notice: Notice | null
  readonly operations: Readonly<Record<FinanceOperationKey, FinanceOperationState>>
}

const IDLE: FinanceOperationState = { status: 'idle', result: null, error: null }

interface FollowQuoteSource {
  readonly item: JsonObject
  readonly runId: string
  readonly asOf: string
}

function record(value: unknown): Record<string, unknown> | undefined {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? value as Record<string, unknown>
    : undefined
}

function nonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0
}

function initialOperations(): Record<FinanceOperationKey, FinanceOperationState> {
  return {
    overview: IDLE,
    search: IDLE,
    watchlist: IDLE,
    quote: IDLE,
    history: IDLE,
    portfolio: IDLE,
    valuation: IDLE,
    recordPrediction: IDLE,
    due: IDLE,
    resolve: IDLE,
    ingest: IDLE,
    inboxCommit: IDLE,
    briefingPrepare: IDLE,
    briefingRecord: IDLE,
    briefingEvaluate: IDLE,
  }
}

export function initialFinanceState(): FinanceState {
  return {
    phase: 'loading',
    error: null,
    revision: 0,
    section: 'overview',
    market: { quote: null, history: null },
    busy: null,
    notice: null,
    operations: initialOperations(),
  }
}

export function financeOperation(state: FinanceState, key: FinanceOperationKey): FinanceOperationState {
  return state.operations[key]
}

export function parseFinanceObject(text: string): JsonObject {
  const parsed: unknown = JSON.parse(text)
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw new Error('finance input must be a JSON object')
  }
  return parsed as JsonObject
}

export class FinanceStore {
  private state: FinanceState = initialFinanceState()
  private readonly listeners = new Set<() => void>()
  private readonly requestTokens = new Map<FinanceOperationKey, number>()
  private readonly pending = new Map<FinanceOperationKey, string>()
  private inboxPreview: { readonly request: FinanceCommandRequest; readonly result: JsonValue | null } | null = null
  private inboxInputRevision = 0
  private noticeToken = 0
  private noticeOperation: FinanceOperationKey | null = null

  constructor(
    private readonly gateway: FinanceGateway,
    private readonly t: Translate,
    private readonly onGraphChange?: () => Promise<void>,
  ) {}

  getSnapshot = (): FinanceState => this.state

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener)
    return () => { this.listeners.delete(listener) }
  }

  private set(patch: Partial<FinanceState>): void {
    this.state = { ...this.state, ...patch }
    for (const listener of [...this.listeners]) listener()
  }

  private setOperation(key: FinanceOperationKey, operation: FinanceOperationState): void {
    this.set({ operations: { ...this.state.operations, [key]: operation } })
  }

  private syncBusy(): void {
    this.set({ busy: this.pending.size === 0 ? null : [...this.pending.values()].at(-1) ?? null })
  }

  private notify(tone: Notice['tone'], text: string, operation: FinanceOperationKey): void {
    this.noticeToken += 1
    const token = this.noticeToken
    this.noticeOperation = operation
    this.set({ notice: { tone, text } })
    setTimeout(() => {
      if (this.noticeToken === token) {
        this.noticeOperation = null
        this.set({ notice: null })
      }
    }, 5000)
  }

  /** Show an informational notice (copy feedback, guide replay) without an operation. */
  flash(text: string): void {
    this.noticeToken += 1
    const token = this.noticeToken
    this.noticeOperation = null
    this.set({ notice: { tone: 'info', text } })
    setTimeout(() => {
      if (this.noticeToken === token) this.set({ notice: null })
    }, 5000)
  }

  private async run(request: FinanceCommandRequest): Promise<GraphResponse> {    try {
      return await this.gateway.request(request)
    } catch (error: unknown) {
      return { ok: false, error: { code: 'INTERNAL', message: error instanceof Error ? error.message : String(error) } }
    }
  }

  private failLocal(key: FinanceOperationKey, code: string, message: string): false {
    this.requestTokens.set(key, (this.requestTokens.get(key) ?? 0) + 1)
    this.pending.delete(key)
    this.setOperation(key, { status: 'error', result: null, error: { code, message } })
    this.syncBusy()
    this.notify('error', `${code}: ${message}`, key)
    return false
  }

  private async execute(
    key: FinanceOperationKey,
    request: FinanceCommandRequest,
    options: { readonly graphChanged?: boolean; readonly successKey?: string } = {},
  ): Promise<boolean> {
    const token = (this.requestTokens.get(key) ?? 0) + 1
    const inboxRevision = key === 'ingest' || key === 'inboxCommit' ? this.inboxInputRevision : null
    this.requestTokens.set(key, token)
    this.pending.set(key, request.op)
    const previousResult = this.state.operations[key].result
    const retainStaleResult = key === 'quote' || key === 'history'
    this.set({
      busy: request.op,
      operations: { ...this.state.operations, [key]: { status: 'loading', result: retainStaleResult ? previousResult : null, error: null } },
      ...(key === 'overview' && this.state.phase !== 'ready' ? { phase: 'loading' as const, error: null } : {}),
    })
    const response = await this.run(request)
    if (this.requestTokens.get(key) !== token) return false
    const inboxResponseIsCurrent = inboxRevision === null || inboxRevision === this.inboxInputRevision
    this.pending.delete(key)
    if (!response.ok) {
      this.set({
        busy: this.pending.size === 0 ? null : [...this.pending.values()].at(-1) ?? null,
        operations: { ...this.state.operations, [key]: { status: 'error', result: retainStaleResult ? previousResult : null, error: response.error } },
        ...(key === 'overview' ? { phase: 'error' as const, error: response.error } : {}),
      })
      if (key !== 'overview' && inboxResponseIsCurrent) this.notify('error', `${response.error.code}: ${response.error.message}`, key)
      return false
    }
    this.set({
      busy: this.pending.size === 0 ? null : [...this.pending.values()].at(-1) ?? null,
      revision: Math.max(this.state.revision, response.revision),
      operations: { ...this.state.operations, [key]: { status: 'success', result: response.result, error: null } },
      ...(key === 'overview' ? { phase: 'ready' as const, error: null } : {}),
    })
    if (options.successKey !== undefined && inboxResponseIsCurrent) this.notify('success', this.t(options.successKey), key)
    if (options.graphChanged === true) await this.onGraphChange?.()
    return true
  }

  setSection(section: FinanceSection): void {
    this.set({ section })
  }

  async load(): Promise<boolean> {
    return this.execute('overview', { op: 'graph.stats' })
  }

  async refresh(): Promise<boolean> {
    return this.load()
  }

  async searchInstruments(query: string, asOf?: string): Promise<boolean> {
    return this.execute('search', {
      op: 'graph.search',
      query,
      kinds: ['instrument'],
      limit: 50,
      ...(asOf === undefined || asOf.length === 0 ? {} : { asOf }),
    })
  }

  async setInstrumentWatched(node: GraphNode, watched: boolean, at = new Date().toISOString()): Promise<boolean> {
    if (node.kind !== 'instrument') return this.failLocal('watchlist', 'INVALID_INSTRUMENT', 'watchlist mutations require an instrument node')
    if ((node.metadata.watchlist === true) === watched) return true
    const symbol = typeof node.metadata.symbol === 'string' ? node.metadata.symbol.trim().toUpperCase() : ''
    const quoteSource = watched && symbol.length > 0 ? this.followQuoteSource(symbol) : undefined
    const ok = await this.planInstrumentWatched(node, watched, at)
    if (!ok) return false
    if (quoteSource !== undefined) {
      const saved = await this.persistFollowQuote(quoteSource)
      if (!saved.ok) {
        this.notify('error', `${this.t('finance.notice.watchlistAdded')} (${saved.error.code}: ${saved.error.message})`, 'watchlist')
        return true
      }
      this.set({ revision: Math.max(this.state.revision, saved.revision) })
      await this.onGraphChange?.()
    }
    this.notify('success', this.t(watched ? 'finance.notice.watchlistAdded' : 'finance.notice.watchlistRemoved'), 'watchlist')
    return true
  }

  private async planInstrumentWatched(node: GraphNode, watched: boolean, at: string): Promise<boolean> {
    return this.execute('watchlist', {
      op: 'graph.plan',
      plan: {
        nodes: [{
          id: node.id,
          kind: node.kind,
          title: node.title,
          content: node.content,
          metadata: {
            ...node.metadata,
            watchlist: watched,
            watchlistProvenance: {
              provider: 'dsh.client',
              operation: 'finance.graph.plan',
              updatedAt: at,
            },
          },
        }],
        edges: [],
      },
    }, { graphChanged: true })
  }

  /** Select only the exact yahoo quote item returned by the active successful request. */
  private followQuoteSource(symbol: string): FollowQuoteSource | undefined {
    const submitted = this.state.market.quote
    const operation = this.state.operations.quote
    const result = record(operation.result)
    if (submitted === null || submitted.symbol.trim().toUpperCase() !== symbol
      || operation.status !== 'success' || result === undefined || result.dryRun !== true) return undefined
    const items = Array.isArray(result.items) ? result.items : []
    const runId = result.runId
    const asOf = result.asOf
    const fetchedAt = result.fetchedAt
    if (items.length !== 1 || !nonEmptyString(runId) || !nonEmptyString(asOf) || !nonEmptyString(fetchedAt)
      || submitted.asOf.length > 0 && submitted.asOf !== asOf) return undefined
    const item = record(items[0])
    const data = record(item?.data)
    const provenance = record(item?.provenance)
    if (item === undefined || data === undefined || provenance === undefined
      || item.provider !== 'yahoo' || !nonEmptyString(item.canonicalUrl) || !nonEmptyString(item.title)
      || typeof item.content !== 'string' || !nonEmptyString(item.contentHash)
      || item.asOf !== asOf || !nonEmptyString(item.availableAt) || item.fetchedAt !== fetchedAt
      || !nonEmptyString(data.symbol) || data.symbol.trim().toUpperCase() !== symbol
      || typeof data.regularMarketPrice !== 'number' || !Number.isFinite(data.regularMarketPrice)) return undefined
    return { item: item as JsonObject, runId, asOf }
  }

  private persistFollowQuote(source: FollowQuoteSource): Promise<GraphResponse> {
    return this.run({
      op: 'source.ingest',
      input: { items: [source.item], dryRun: false, runId: source.runId, asOf: source.asOf },
    })
  }

  async followSymbol(symbol: string, title: string, at = new Date().toISOString()): Promise<boolean> {
    const normalized = symbol.trim().toUpperCase()
    if (!/^[A-Z^][A-Z0-9.^=_-]{0,19}$/u.test(normalized)) return this.failLocal('watchlist', 'INVALID_SYMBOL', 'a valid market symbol is required')
    const quoteSource = this.followQuoteSource(normalized)
    const id = `instrument:watchlist:${encodeURIComponent(normalized)}`
    const existing = await this.run({ op: 'graph.get', id })
    let followed: boolean
    if (existing.ok) {
      const node = record(existing.result)
      if (node?.kind !== 'instrument') return this.failLocal('watchlist', 'INVALID_INSTRUMENT', `node "${id}" is not an instrument`)
      followed = (node.metadata as JsonObject | undefined)?.watchlist === true
        || await this.planInstrumentWatched(node as unknown as GraphNode, true, at)
    } else if (existing.error.code === 'MISSING_NODE') {
      followed = await this.execute('watchlist', { op:'graph.plan', plan:{ nodes:[{
        id, kind:'instrument', title:title.trim() || normalized, content:normalized,
        metadata:{ symbol:normalized, watchlist:true, watchlistProvenance:{ provider:'dsh.client', operation:'finance.graph.plan', updatedAt:at } },
      }], edges:[] } }, { graphChanged:true })
    } else {
      return this.failLocal('watchlist', existing.error.code, existing.error.message)
    }
    if (!followed) return false
    if (quoteSource !== undefined) {
      const saved = await this.persistFollowQuote(quoteSource)
      if (!saved.ok) {
        this.notify('error', `${this.t('finance.notice.watchlistAdded')} (${saved.error.code}: ${saved.error.message})`, 'watchlist')
        return true
      }
      this.set({ revision: Math.max(this.state.revision, saved.revision) })
      await this.onGraphChange?.()
    }
    this.notify('success', this.t('finance.notice.watchlistAdded'), 'watchlist')
    return true
  }

  async fetchQuote(symbol: string, asOf?: string): Promise<boolean> {
    this.set({ market: { ...this.state.market, quote: { symbol, asOf: asOf ?? '' } } })
    return this.execute('quote', {
      op: 'market.fetch',
      input: { source: 'yahoo', kind: 'quote', symbol, dryRun: true, ...(asOf === undefined || asOf.length === 0 ? {} : { asOf }) },
    })
  }

  async fetchHistory(input: MarketHistoryInput): Promise<boolean> {
    this.set({ market: { ...this.state.market, history: { ...input } } })
    return this.execute('history', {
      op: 'market.fetch',
      input: {
        source: 'yahoo',
        kind: 'history',
        symbol: input.symbol,
        interval: input.interval,
        ...(input.start !== undefined && input.start.length > 0 && input.end !== undefined && input.end.length > 0
          ? { start: input.start, end: input.end }
          : { range: input.range ?? '1mo' }),
        dryRun: true,
      },
    })
  }

  /** Read a comparison series without replacing the open asset's request or result. */
  async readHistory(input: MarketHistoryInput): Promise<GraphResponse> {
    return this.run({ op: 'market.fetch', input: {
      source: 'yahoo', kind: 'history', symbol: input.symbol, interval: input.interval,
      ...(input.start && input.end ? { start: input.start, end: input.end } : { range: input.range ?? '1mo' }),
      dryRun: true,
    } })
  }

  /** Read persisted paper-fund state without changing the selected market or draft. */
  async readFundState(fundId?: string): Promise<GraphResponse> {
    return this.run({ op: 'fund.state', input: { ...(fundId ? { fundId } : {}) } })
  }

  async snapshotPortfolio(input: JsonObject): Promise<boolean> {
    return this.execute('portfolio', { op: 'portfolio.snapshot', input }, { graphChanged: true, successKey: 'finance.notice.portfolio' })
  }

  async runValuation(method: 'dcf' | 'comps', input: JsonObject): Promise<boolean> {
    return this.execute('valuation', { op: method === 'dcf' ? 'model.dcf' : 'model.comps', input }, { graphChanged: true, successKey: 'finance.notice.valuation' })
  }

  async recordPrediction(input: JsonObject): Promise<boolean> {
    return this.execute('recordPrediction', { op: 'memory.record_prediction', input }, { graphChanged: true, successKey: 'finance.notice.prediction' })
  }

  async loadDue(asOf: string): Promise<boolean> {
    return this.execute('due', { op: 'memory.due', asOf })
  }

  async resolvePrediction(input: JsonObject): Promise<boolean> {
    return this.execute('resolve', { op: 'memory.resolve', input }, { graphChanged: true, successKey: 'finance.notice.resolved' })
  }

  invalidateInboxInput(): void {
    this.inboxInputRevision += 1
    this.inboxPreview = null
    if (this.noticeOperation === 'ingest' || this.noticeOperation === 'inboxCommit') {
      this.noticeToken += 1
      this.noticeOperation = null
      this.set({ notice: null })
    }
  }

  private async previewInbox(request: FinanceCommandRequest): Promise<boolean> {
    this.invalidateInboxInput()
    const revision = this.inboxInputRevision
    const ok = await this.execute('ingest', request)
    if (!ok || revision !== this.inboxInputRevision) return false
    this.inboxPreview = { request, result: this.state.operations.ingest.result }
    return true
  }

  async previewUrl(source: 'rss' | 'youtube', url: string, asOf?: string): Promise<boolean> {
    return this.previewInbox({
      op: 'source.fetch',
      input: { source, ...(source === 'youtube' ? { kind: 'transcript' } : {}), url, dryRun: true, ...(asOf === undefined || asOf.length === 0 ? {} : { asOf }) },
    })
  }

  async dryRunIngest(source: 'rss' | 'youtube', url: string): Promise<boolean> {
    return this.previewUrl(source, url)
  }

  async previewClip(clip: JsonObject, asOf = new Date().toISOString()): Promise<boolean> {
    return this.previewInbox({ op: 'clipper.import', input: { bundle: clip, dryRun: true, asOf } })
  }

  async previewFile(file: InboxFileDescriptor, asOf = new Date().toISOString()): Promise<boolean> {
    return this.previewInbox({ op: 'document.import', input: { files: [file], dryRun: true, asOf } })
  }

  async commitInbox(): Promise<boolean> {
    const result = this.state.operations.ingest.result
    const preview = readInboxPreview(result)
    const original = this.inboxPreview
    if (preview === undefined || preview.items.length === 0 || original === null || original.result !== result) {
      return this.failLocal('inboxCommit', 'NO_PREVIEW_ITEMS', 'a current dry-run with importable items is required before commit')
    }
    if (original.request.op === 'source.fetch') {
      return this.execute('inboxCommit', {
        op: 'source.ingest',
        input: {
          items: preview.items as JsonObject[],
          dryRun: false,
          ...(preview.runId === undefined ? {} : { runId: preview.runId }),
          ...(preview.asOf === undefined ? {} : { asOf: preview.asOf }),
        },
      }, { graphChanged: true, successKey: 'finance.notice.inboxCommitted' })
    }
    if ((original.request.op === 'clipper.import' || original.request.op === 'document.import')
      && typeof original.request.input === 'object' && original.request.input !== null && !Array.isArray(original.request.input)) {
      return this.execute('inboxCommit', {
        op: original.request.op,
        input: {
          ...original.request.input,
          dryRun: false,
          ...(preview.runId === undefined ? {} : { runId: preview.runId }),
          ...(preview.asOf === undefined ? {} : { asOf: preview.asOf }),
        },
      }, { graphChanged: true, successKey: 'finance.notice.inboxCommitted' })
    }
    return this.failLocal('inboxCommit', 'INVALID_PREVIEW_REQUEST', 'the current preview cannot be committed through its original operation')
  }

  async prepareBriefing(asOf: string, query?: string): Promise<boolean> {
    return this.execute('briefingPrepare', {
      op: 'briefing.prepare',
      asOf,
      input: { asOf, ...(query === undefined || query.length === 0 ? {} : { query }) },
      ...(query === undefined || query.length === 0 ? {} : { query }),
    })
  }

  async recordBriefing(input: JsonObject): Promise<boolean> {
    return this.execute('briefingRecord', { op: 'briefing.record', input }, { graphChanged: true, successKey: 'finance.notice.briefingRecorded' })
  }

  async evaluateBriefing(asOf: string): Promise<boolean> {
    return this.execute('briefingEvaluate', { op: 'briefing.evaluate', asOf })
  }
}
