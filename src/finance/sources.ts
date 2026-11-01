import { execFile as nodeExecFile } from 'node:child_process'
import { createHash } from 'node:crypto'
import { GraphError } from '../graph.ts'
import type { JsonValue } from '../graph.ts'
import { canonicalHttpUrl, SafeHttp } from './http.ts'
import type { FetchLike, LookupLike } from './http.ts'
import { parseFeed, parseOpml } from './feeds.ts'
import { canonicalJson, hashId, jsonObject, timestamp } from './metadata.ts'
import type {
  FinanceConnectorConfig,
  JsonObject,
  SourceFailure,
  SourceFetchInput,
  SourceFetchRequest,
  SourceItem,
  TranscriptSegment,
} from './types.ts'

export interface ExecResult {
  readonly stdout: string
  readonly stderr: string
}

export type ExecFileLike = (file: string, args: readonly string[], options: {
  readonly timeout: number
  readonly maxBuffer: number
  readonly encoding: 'utf8'
  readonly env: NodeJS.ProcessEnv
}) => Promise<ExecResult>

export interface FinanceDataDependencies {
  readonly fetch?: FetchLike
  readonly lookup?: LookupLike
  readonly execFile?: ExecFileLike
  readonly now?: () => string
}

interface FetchContext {
  readonly asOf: string
  readonly fetchedAt: string
}

interface FetchOutcome {
  readonly items: SourceItem[]
  readonly errors: SourceFailure[]
}

const OPENBB_ROUTES = new Set([
  '/api/v1/equity/search',
  '/api/v1/equity/price/quote',
  '/api/v1/equity/price/historical',
  '/api/v1/equity/fundamental/balance',
  '/api/v1/equity/fundamental/income',
  '/api/v1/equity/fundamental/cash',
  '/api/v1/equity/fundamental/metrics',
  '/api/v1/equity/estimates/consensus',
  '/api/v1/news/company',
  '/api/v1/news/world',
  '/api/v1/economy/cpi',
  '/api/v1/economy/gdp',
  '/api/v1/fixed_income/government/yield_curve',
  '/api/v1/currency/price/historical',
])
const OPENBB_QUERY_KEYS = new Set([
  'symbol', 'provider', 'start_date', 'end_date', 'interval', 'limit', 'period', 'frequency',
  'from', 'to', 'country', 'units', 'adjustment', 'query', 'date', 'topics',
])
const YAHOO_RANGES = new Set(['1d', '5d', '1mo', '3mo', '6mo', '1y', '2y', '5y', '10y', 'ytd', 'max'])
const YAHOO_INTERVALS = new Set(['1m', '2m', '5m', '15m', '30m', '60m', '90m', '1h', '1d', '5d', '1wk', '1mo', '3mo'])

function defaultExecFile(file: string, args: readonly string[], options: {
  readonly timeout: number
  readonly maxBuffer: number
  readonly encoding: 'utf8'
  readonly env: NodeJS.ProcessEnv
}): Promise<ExecResult> {
  return new Promise((resolve, reject) => {
    nodeExecFile(file, [...args], options, (error, stdout, stderr) => {
      if (error) reject(error)
      else resolve({ stdout, stderr })
    })
  })
}

function record(value: unknown): Record<string, unknown> | undefined {
  return typeof value === 'object' && value !== null && !Array.isArray(value) ? value as Record<string, unknown> : undefined
}

function jsonValue(value: unknown): JsonValue {
  return JSON.parse(JSON.stringify(value)) as JsonValue
}

function parseJson(text: string, provider: string): unknown {
  try {
    return JSON.parse(text) as unknown
  } catch {
    throw new GraphError('UNAVAILABLE', `${provider} returned malformed JSON`)
  }
}

function requiredString(value: unknown, field: string): string {
  if (typeof value !== 'string' || value.trim().length === 0) throw new GraphError('INVALID_REQUEST', `${field} must be a non-empty string`)
  return value.trim()
}

function validSymbol(value: unknown, field = 'symbol'): string {
  const symbol = requiredString(value, field)
  if (!/^[A-Za-z0-9.^=_-]{1,40}$/u.test(symbol)) throw new GraphError('INVALID_REQUEST', `${field} contains unsupported characters`)
  return symbol
}

function validLimit(value: unknown, fallback: number, maximum: number): number {
  if (value === undefined) return fallback
  if (!Number.isSafeInteger(value) || (value as number) < 1 || (value as number) > maximum) {
    throw new GraphError('INVALID_REQUEST', `limit must be an integer between 1 and ${maximum}`)
  }
  return value as number
}

function latestTimestamp(value: unknown, fields: ReadonlySet<string>): string | undefined {
  let latest = Number.NEGATIVE_INFINITY
  const stack: unknown[] = [value]
  let visited = 0
  while (stack.length > 0 && visited < 500_000) {
    const current = stack.pop()
    visited += 1
    if (Array.isArray(current)) {
      stack.push(...current)
      continue
    }
    const object = record(current)
    if (object === undefined) continue
    for (const [key, entry] of Object.entries(object)) {
      if (fields.has(key.toLowerCase()) && typeof entry === 'string') {
        const parsed = Date.parse(entry)
        if (Number.isFinite(parsed)) latest = Math.max(latest, parsed)
      } else if (fields.has(key.toLowerCase()) && typeof entry === 'number' && Number.isFinite(entry) && entry > 0) {
        const parsed = entry >= 1_000_000_000_000 ? entry : entry * 1000
        if (Number.isFinite(Date.parse(new Date(parsed).toISOString()))) latest = Math.max(latest, parsed)
      } else if (typeof entry === 'object' && entry !== null) stack.push(entry)
    }
  }
  return Number.isFinite(latest) ? new Date(latest).toISOString() : undefined
}

function normalizeError(error: unknown, source: string, index?: number): SourceFailure {
  return {
    source,
    ...(index === undefined ? {} : { index }),
    code: error instanceof GraphError ? error.code : 'UNAVAILABLE',
    message: error instanceof GraphError ? error.message : `${source} is unavailable`,
  }
}

function sourceContentHash(content: string): string {
  return `sha256:${createHash('sha256').update(content, 'utf8').digest('hex')}`
}

function makeItem(input: {
  provider: string
  canonicalUrl: string
  title: string
  content: string
  availableAt: string
  fetchedAt: string
  asOf: string
  provenance?: JsonObject
  mimeType?: string
  data?: JsonValue
  segments?: TranscriptSegment[]
}): SourceItem {
  timestamp(input.availableAt, 'availableAt')
  timestamp(input.asOf, 'asOf')
  timestamp(input.fetchedAt, 'fetchedAt')
  const canonicalUrl = input.canonicalUrl.startsWith('alphasift://') ? input.canonicalUrl : canonicalHttpUrl(input.canonicalUrl)
  return {
    provider: input.provider,
    canonicalUrl,
    title: requiredString(input.title, 'title'),
    content: input.content,
    contentHash: sourceContentHash(input.content),
    asOf: input.asOf,
    availableAt: new Date(input.availableAt).toISOString(),
    fetchedAt: new Date(input.fetchedAt).toISOString(),
    provenance: { canonicalUrl, ...input.provenance },
    ...(input.mimeType === undefined ? {} : { mimeType: input.mimeType }),
    ...(input.data === undefined ? {} : { data: input.data }),
    ...(input.segments === undefined ? {} : { segments: input.segments }),
  }
}

function structuredItem(input: {
  provider: string
  canonicalUrl: string
  title: string
  data: unknown
  availableAt: string | undefined
  context: FetchContext
  provenance?: JsonObject
}): SourceItem {
  if (input.availableAt === undefined) {
    throw new GraphError('MISSING_TIMESTAMP', `${input.provider} response has no verifiable publication or observation timestamp`)
  }
  const data = jsonValue(input.data)
  return makeItem({
    provider: input.provider,
    canonicalUrl: input.canonicalUrl,
    title: input.title,
    content: canonicalJson(data),
    availableAt: input.availableAt,
    fetchedAt: input.context.fetchedAt,
    asOf: input.context.asOf,
    data,
    mimeType: 'application/json',
    ...(input.provenance === undefined ? {} : { provenance: input.provenance }),
  })
}

function secondsTimestamp(value: unknown): string | undefined {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? new Date(value * 1000).toISOString() : undefined
}

function chartResult(payload: unknown): Record<string, unknown> {
  const chart = record(record(payload)?.chart)
  const error = record(chart?.error)
  if (error !== undefined) throw new GraphError('UNAVAILABLE', 'Yahoo chart returned an error')
  const result = Array.isArray(chart?.result) ? chart.result[0] : undefined
  const object = record(result)
  if (object === undefined) throw new GraphError('UNAVAILABLE', 'Yahoo chart returned no result')
  return object
}

function yahooUrl(symbol: string, request: SourceFetchRequest, history: boolean): URL {
  const url = new URL(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}`)
  const interval = request.interval ?? '1d'
  if (!YAHOO_INTERVALS.has(interval)) throw new GraphError('INVALID_REQUEST', 'unsupported Yahoo interval')
  url.searchParams.set('interval', interval)
  if (history && (request.start !== undefined || request.end !== undefined)) {
    if (request.start === undefined || request.end === undefined) throw new GraphError('INVALID_REQUEST', 'Yahoo history requires both start and end')
    const start = Date.parse(request.start)
    const end = Date.parse(request.end)
    if (!Number.isFinite(start) || !Number.isFinite(end) || start >= end) throw new GraphError('INVALID_REQUEST', 'Yahoo history start/end are invalid')
    url.searchParams.set('period1', String(Math.floor(start / 1000)))
    url.searchParams.set('period2', String(Math.ceil(end / 1000)))
  } else {
    const range = request.range ?? (history ? '1mo' : '1d')
    if (!YAHOO_RANGES.has(range)) throw new GraphError('INVALID_REQUEST', 'unsupported Yahoo range')
    url.searchParams.set('range', range)
  }
  return url
}

function extractBalancedJson(text: string, marker: string): unknown {
  const markerAt = text.indexOf(marker)
  if (markerAt < 0) throw new GraphError('UNAVAILABLE', 'YouTube did not expose a public player response')
  const start = text.indexOf('{', markerAt + marker.length)
  if (start < 0) throw new GraphError('UNAVAILABLE', 'YouTube player response is missing')
  let depth = 0
  let quoted = false
  let escaped = false
  for (let index = start; index < text.length; index += 1) {
    const character = text[index]
    if (escaped) {
      escaped = false
      continue
    }
    if (character === '\\' && quoted) {
      escaped = true
      continue
    }
    if (character === '"') quoted = !quoted
    if (quoted) continue
    if (character === '{') depth += 1
    if (character === '}') depth -= 1
    if (depth === 0) {
      try {
        return JSON.parse(text.slice(start, index + 1)) as unknown
      } catch {
        throw new GraphError('UNAVAILABLE', 'YouTube player response is malformed')
      }
    }
  }
  throw new GraphError('UNAVAILABLE', 'YouTube player response is incomplete')
}

function clockTime(seconds: number): string {
  const milliseconds = Math.max(0, Math.round(seconds * 1000))
  const hours = Math.floor(milliseconds / 3_600_000)
  const minutes = Math.floor(milliseconds / 60_000) % 60
  const secs = Math.floor(milliseconds / 1000) % 60
  const ms = milliseconds % 1000
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}.${String(ms).padStart(3, '0')}`
}

export class FinanceDataPlane {
  private readonly http: SafeHttp
  private readonly execFile: ExecFileLike
  private readonly now: () => string
  private readonly timeoutMs: number
  private readonly maxBytes: number

  constructor(private readonly config: FinanceConnectorConfig = {}, dependencies: FinanceDataDependencies = {}) {
    this.timeoutMs = config.httpTimeoutMs ?? 10_000
    this.maxBytes = config.httpMaxBytes ?? 16 * 1024 * 1024
    this.http = new SafeHttp({ timeoutMs: this.timeoutMs, maxBytes: this.maxBytes, ...(dependencies.fetch === undefined ? {} : { fetch: dependencies.fetch }), ...(dependencies.lookup === undefined ? {} : { lookup: dependencies.lookup }) })
    this.execFile = dependencies.execFile ?? defaultExecFile
    this.now = dependencies.now ?? (() => new Date().toISOString())
  }

  async fetch(inputValue: SourceFetchInput): Promise<{
    items: SourceItem[]
    errors: SourceFailure[]
    runId: string
    asOf: string
    fetchedAt: string
    dryRun: boolean
  }> {
    const input = jsonObject(inputValue, 'input') as SourceFetchInput
    const fetchedAt = this.now()
    timestamp(fetchedAt, 'fetchedAt')
    const asOf = input.asOf ?? fetchedAt
    timestamp(asOf, 'asOf')
    if (input.dryRun !== undefined && typeof input.dryRun !== 'boolean') throw new GraphError('INVALID_REQUEST', 'dryRun must be a boolean')
    const requests = input.requests ?? [input]
    if (!Array.isArray(requests) || requests.length === 0 || requests.length > 20) {
      throw new GraphError('INVALID_REQUEST', 'requests must contain between 1 and 20 source requests')
    }
    const context = { asOf, fetchedAt }
    const items: SourceItem[] = []
    const errors: SourceFailure[] = []
    for (let index = 0; index < requests.length; index += 1) {
      const request = requests[index] as SourceFetchRequest
      try {
        const outcome = await this.fetchOne(request, context)
        items.push(...outcome.items)
        errors.push(...outcome.errors)
      } catch (error: unknown) {
        errors.push(normalizeError(error, typeof request.source === 'string' ? request.source : 'unknown', index))
      }
    }
    if (requests.length === 1 && items.length === 0 && errors.length === 1) {
      const failure = errors[0] as SourceFailure
      throw new GraphError(failure.code, failure.message)
    }
    const runId = input.runId ?? `run-${hashId({ requests: jsonValue(requests), asOf, fetchedAt })}`
    return { items, errors, runId, asOf, fetchedAt, dryRun: input.dryRun ?? true }
  }

  private async fetchOne(request: SourceFetchRequest, context: FetchContext): Promise<FetchOutcome> {
    const source = requiredString(request.source, 'source').toLowerCase()
    switch (source) {
      case 'yahoo': return { items: [await this.yahoo(request, context)], errors: [] }
      case 'sec': return { items: [await this.sec(request, context)], errors: [] }
      case 'openbb': return { items: [await this.openbb(request, context)], errors: [] }
      case 'alphasift':
      case 'alpha-sift': return { items: [await this.alphaSift(request, context)], errors: [] }
      case 'rss':
      case 'atom':
      case 'feed': return { items: await this.feed(requiredString(request.url, 'url'), context, 'feed'), errors: [] }
      case 'opml': return this.opml(requiredString(request.url, 'url'), context)
      case 'youtube': return { items: await this.youtube(request, context), errors: [] }
      default: throw new GraphError('INVALID_PROVIDER', `unsupported source provider ${JSON.stringify(source)}`)
    }
  }

  private async yahoo(request: SourceFetchRequest, context: FetchContext): Promise<SourceItem> {
    const kind = request.kind ?? 'quote'
    let symbol: string
    if (kind === 'fx') {
      const from = requiredString(request.from, 'from').toUpperCase()
      const to = requiredString(request.to, 'to').toUpperCase()
      if (!/^[A-Z]{3}$/u.test(from) || !/^[A-Z]{3}$/u.test(to)) throw new GraphError('INVALID_REQUEST', 'FX currencies must be three-letter codes')
      symbol = `${from}${to}=X`
    } else symbol = validSymbol(request.symbol)
    if (!['quote', 'history', 'fx'].includes(kind)) throw new GraphError('INVALID_REQUEST', 'Yahoo kind must be quote, history, or fx')
    const url = yahooUrl(symbol, request, kind === 'history')
    const payload = await this.http.request(url, { accept: 'application/json' })
    const result = chartResult(parseJson(payload.text, 'Yahoo'))
    const meta = record(result.meta) ?? {}
    if (kind === 'history') {
      const start = request.start === undefined ? undefined : Date.parse(request.start)
      const end = request.end === undefined ? undefined : Date.parse(request.end)
      const times = Array.isArray(result.timestamp) ? result.timestamp : []
      const indicators = record(result.indicators)
      const quote = record(Array.isArray(indicators?.quote) ? indicators.quote[0] : undefined) ?? {}
      const adjusted = record(Array.isArray(indicators?.adjclose) ? indicators.adjclose[0] : undefined) ?? {}
      const bars = times.map((time, index) => ({
        timestamp: secondsTimestamp(time),
        open: Array.isArray(quote.open) ? quote.open[index] ?? null : null,
        high: Array.isArray(quote.high) ? quote.high[index] ?? null : null,
        low: Array.isArray(quote.low) ? quote.low[index] ?? null : null,
        close: Array.isArray(quote.close) ? quote.close[index] ?? null : null,
        volume: Array.isArray(quote.volume) ? quote.volume[index] ?? null : null,
        adjustedClose: Array.isArray(adjusted.adjclose) ? adjusted.adjclose[index] ?? null : null,
      })).filter(bar => bar.timestamp !== undefined
        && (start === undefined || Date.parse(bar.timestamp) >= start)
        && (end === undefined || Date.parse(bar.timestamp) < end))
      if (bars.length === 0) throw new GraphError('UNAVAILABLE', 'Yahoo history returned no timestamped bars')
      return structuredItem({
        provider: 'yahoo', canonicalUrl: payload.finalUrl, title: `${String(meta.symbol ?? symbol)} historical prices`,
        data: { symbol: meta.symbol ?? symbol, currency: meta.currency ?? null, exchangeName: meta.exchangeName ?? null, bars },
        availableAt: context.fetchedAt, context,
        provenance: {
          endpoint: 'v8/finance/chart',
          observationAt: context.fetchedAt,
          publicationAt: null,
          availableAtBasis: 'observation of the returned payload; historical publication is not established',
          barTimestampBasis: 'Yahoo timestamp is the bar start',
          adjustment: 'provider adjustedClose and unadjusted OHLC retained separately; adjustedClose may be retrospective',
        },
      })
    }
    const fields = ['symbol', 'currency', 'exchangeName', 'fullExchangeName', 'instrumentType', 'regularMarketPrice', 'previousClose', 'chartPreviousClose', 'regularMarketDayHigh', 'regularMarketDayLow', 'regularMarketVolume', 'longName', 'shortName', 'firstTradeDate', 'fiftyTwoWeekHigh', 'fiftyTwoWeekLow', 'exchangeTimezoneName', 'gmtoffset', 'timezone']
    const quote = Object.fromEntries(fields.filter(field => meta[field] !== undefined).map(field => [field, meta[field]]))
    if (typeof quote.regularMarketPrice !== 'number') throw new GraphError('UNAVAILABLE', 'Yahoo quote returned no regularMarketPrice')
    const availableAt = secondsTimestamp(meta.regularMarketTime)
    return structuredItem({
      provider: 'yahoo', canonicalUrl: payload.finalUrl, title: `${String(meta.symbol ?? symbol)} ${kind === 'fx' ? 'FX rate' : 'quote'}`,
      data: { ...quote, regularMarketTime: availableAt ?? null }, availableAt, context,
      provenance: { endpoint: 'v8/finance/chart', priceBasis: 'regularMarketPrice, unadjusted' },
    })
  }

  private secHeaders(): { userAgent: string } {
    if (this.config.secContact === undefined) {
      throw new GraphError('NOT_CONFIGURED', 'SEC requires secContact in the plugin configuration; no request was made')
    }
    return { userAgent: `dsh-research-graph/0.1 ${this.config.secContact}` }
  }

  private async secTickerData(): Promise<{ payload: Awaited<ReturnType<SafeHttp['request']>>; entries: Record<string, unknown>[] }> {
    const payload = await this.http.request('https://www.sec.gov/files/company_tickers.json', { accept: 'application/json', ...this.secHeaders() })
    const parsed = record(parseJson(payload.text, 'SEC'))
    if (parsed === undefined) throw new GraphError('UNAVAILABLE', 'SEC ticker mapping is malformed')
    const entries = Object.values(parsed).map(record).filter((entry): entry is Record<string, unknown> => entry !== undefined)
    return { payload, entries }
  }

  private async secCik(request: SourceFetchRequest): Promise<string> {
    if (request.cik !== undefined) {
      const cik = requiredString(request.cik, 'cik').replace(/^0+/u, '')
      if (!/^\d{1,10}$/u.test(cik)) throw new GraphError('INVALID_REQUEST', 'cik must contain 1 to 10 digits')
      return cik.padStart(10, '0')
    }
    const symbol = validSymbol(request.symbol).toUpperCase()
    const { entries } = await this.secTickerData()
    const match = entries.find(entry => typeof entry.ticker === 'string' && entry.ticker.toUpperCase() === symbol)
    if (match === undefined || !Number.isSafeInteger(match.cik_str)) throw new GraphError('NOT_FOUND', `SEC ticker mapping has no CIK for ${symbol}`)
    return String(match.cik_str).padStart(10, '0')
  }

  private async sec(request: SourceFetchRequest, context: FetchContext): Promise<SourceItem> {
    const kind = request.kind ?? 'ticker'
    if (kind === 'ticker') {
      const { payload, entries } = await this.secTickerData()
      const symbol = request.symbol === undefined ? undefined : validSymbol(request.symbol).toUpperCase()
      const limit = validLimit(request.limit, 50, 500)
      const matches = entries.filter(entry => symbol === undefined || (typeof entry.ticker === 'string' && entry.ticker.toUpperCase() === symbol)).slice(0, limit)
      if (symbol !== undefined && matches.length === 0) throw new GraphError('NOT_FOUND', `SEC ticker mapping has no entry for ${symbol}`)
      return structuredItem({
        provider: 'sec', canonicalUrl: payload.finalUrl, title: symbol === undefined ? 'SEC company ticker mapping' : `SEC ticker mapping ${symbol}`,
        data: matches, availableAt: payload.lastModified ?? undefined, context,
        provenance: { endpoint: 'files/company_tickers.json', contactConfigured: true },
      })
    }
    if (kind !== 'xbrl' && kind !== 'companyfacts') throw new GraphError('INVALID_REQUEST', 'SEC kind must be ticker or xbrl')
    const cik = await this.secCik(request)
    let url: URL
    if (kind === 'xbrl' && request.fact !== undefined) {
      const fact = requiredString(request.fact, 'fact')
      const [taxonomy, concept] = fact.includes(':') ? fact.split(':', 2) : ['us-gaap', fact]
      if (!/^[A-Za-z0-9_.-]+$/u.test(taxonomy ?? '') || !/^[A-Za-z0-9_.-]+$/u.test(concept ?? '')) {
        throw new GraphError('INVALID_REQUEST', 'fact contains unsupported characters')
      }
      url = new URL(`https://data.sec.gov/api/xbrl/companyconcept/CIK${cik}/${taxonomy}/${concept}.json`)
    } else url = new URL(`https://data.sec.gov/api/xbrl/companyfacts/CIK${cik}.json`)
    const payload = await this.http.request(url, { accept: 'application/json', ...this.secHeaders() })
    const data = parseJson(payload.text, 'SEC')
    const availableAt = latestTimestamp(data, new Set(['filed'])) ?? payload.lastModified ?? undefined
    const title = record(data)?.entityName
    return structuredItem({
      provider: 'sec', canonicalUrl: payload.finalUrl, title: `${typeof title === 'string' ? title : cik} XBRL ${request.fact ?? 'company facts'}`,
      data, availableAt, context,
      provenance: { endpoint: request.fact === undefined ? 'api/xbrl/companyfacts' : 'api/xbrl/companyconcept', cik, contactConfigured: true },
    })
  }

  private async openbb(request: SourceFetchRequest, context: FetchContext): Promise<SourceItem> {
    if (this.config.openbbBaseUrl === undefined) throw new GraphError('NOT_CONFIGURED', 'OpenBB requires openbbBaseUrl; no request was made')
    const route = requiredString(request.route, 'route')
    if (!OPENBB_ROUTES.has(route)) throw new GraphError('ROUTE_NOT_ALLOWED', `OpenBB route is not in the read-only whitelist: ${route}`)
    const base = new URL(this.config.openbbBaseUrl)
    const url = new URL(route, base)
    if (url.origin !== base.origin) throw new GraphError('UNSAFE_URL', 'OpenBB route must remain on the configured localhost origin')
    const query = request.query ?? {}
    for (const [key, value] of Object.entries(query)) {
      if (!OPENBB_QUERY_KEYS.has(key)) throw new GraphError('INVALID_REQUEST', `OpenBB query parameter is not allowed: ${key}`)
      if (!['string', 'number', 'boolean'].includes(typeof value)) throw new GraphError('INVALID_REQUEST', `OpenBB query parameter ${key} must be scalar`)
      url.searchParams.set(key, String(value))
    }
    const payload = await this.http.request(url, { accept: 'application/json', allowLoopback: true })
    const data = parseJson(payload.text, 'OpenBB')
    return structuredItem({
      provider: 'openbb', canonicalUrl: payload.finalUrl, title: `OpenBB ${route}`, data,
      availableAt: latestTimestamp(data, new Set(['date', 'datetime', 'timestamp', 'published_at', 'publishedat', 'updated'])) ?? payload.lastModified ?? undefined,
      context, provenance: { route, localOnly: true },
    })
  }

  private async alphaSift(request: SourceFetchRequest, context: FetchContext): Promise<SourceItem> {
    if (this.config.alphaSiftPath === undefined) {
      throw new GraphError('NOT_CONFIGURED', 'AlphaSift requires alphaSiftPath; alphaSiftBaseUrl is not an HTTP screen API and is never contacted')
    }
    const args = request.args === undefined ? ['screen', validSymbol(request.symbol)] : [...request.args]
    if (args.length === 0 || args.length > 32 || args[0] !== 'screen' || args.some(arg => typeof arg !== 'string' || arg.length === 0 || arg.length > 256)) {
      throw new GraphError('INVALID_REQUEST', 'AlphaSift args must start with screen and contain at most 32 non-empty strings')
    }
    if (args.some(arg => /^--?(?:llm|post-analysis|no-llm|no-post-analysis|output|o|exec|config)(?:=|$)/iu.test(arg) || /api[_-]?key|token|cookie|secret/iu.test(arg))) {
      throw new GraphError('INVALID_REQUEST', 'AlphaSift arguments cannot override safety flags, access credentials, execute commands, or write files')
    }
    args.push('--no-llm', '--no-post-analysis')
    let result: ExecResult
    try {
      result = await this.execFile(this.config.alphaSiftPath, args, {
        timeout: this.timeoutMs,
        maxBuffer: Math.min(this.maxBytes, 4 * 1024 * 1024),
        encoding: 'utf8',
        env: { PATH: process.env.PATH ?? '', HOME: process.env.HOME ?? '', LANG: process.env.LANG ?? 'C', NO_COLOR: '1' },
      })
    } catch {
      throw new GraphError('UNAVAILABLE', 'AlphaSift CLI failed; stderr was suppressed to avoid credential leakage')
    }
    if (result.stdout.trim().length === 0) throw new GraphError('UNAVAILABLE', 'AlphaSift CLI returned no output')
    const parsed = (() => {
      try { return JSON.parse(result.stdout) as unknown } catch { return undefined }
    })()
    const canonicalUrl = `alphasift://screen/${hashId({ args: jsonValue(args) })}`
    return makeItem({
      provider: 'alphasift', canonicalUrl, title: 'AlphaSift CLI screen', content: result.stdout,
      availableAt: context.fetchedAt, fetchedAt: context.fetchedAt, asOf: context.asOf,
      mimeType: parsed === undefined ? 'text/plain' : 'application/json',
      ...(parsed === undefined ? {} : { data: jsonValue(parsed) }),
      provenance: { execution: 'execFile', shell: false, arguments: jsonValue(args), llm: false, postAnalysis: false },
    })
  }

  private async feed(url: string, context: FetchContext, provider: string): Promise<SourceItem[]> {
    const payload = await this.http.request(url, { accept: 'application/atom+xml, application/rss+xml, application/xml, text/xml;q=0.9' })
    const entries = parseFeed(payload.text)
    if (entries.length === 0) throw new GraphError('UNAVAILABLE', 'feed contained no entries')
    return entries.map(entry => {
      if (entry.url === undefined) throw new GraphError('INVALID_SOURCE_ITEM', 'feed entry has no canonical link')
      if (entry.publishedAt === undefined) throw new GraphError('MISSING_TIMESTAMP', `feed entry ${JSON.stringify(entry.title)} has no publication timestamp`)
      const canonicalUrl = provider === 'youtube' && entry.videoId !== undefined
        ? `https://www.youtube.com/watch?v=${entry.videoId}`
        : new URL(entry.url, payload.finalUrl).toString()
      return makeItem({
        provider, canonicalUrl, title: entry.title, content: entry.content,
        availableAt: entry.publishedAt, fetchedAt: context.fetchedAt, asOf: context.asOf,
        mimeType: 'text/plain', provenance: { feedUrl: canonicalHttpUrl(payload.finalUrl), ...(entry.author === undefined ? {} : { author: entry.author }), ...(entry.videoId === undefined ? {} : { videoId: entry.videoId }) },
      })
    })
  }

  private async opml(url: string, context: FetchContext): Promise<FetchOutcome> {
    const payload = await this.http.request(url, { accept: 'application/xml, text/xml, text/x-opml' })
    const feeds = parseOpml(payload.text)
    if (feeds.length === 0) throw new GraphError('INVALID_OPML', 'OPML contained no xmlUrl feeds')
    const items: SourceItem[] = []
    const errors: SourceFailure[] = []
    for (const [index, entry] of feeds.entries()) {
      try {
        items.push(...await this.feed(entry.url, context, 'feed'))
      } catch (error: unknown) {
        errors.push(normalizeError(error, `feed:${index}`))
      }
    }
    return { items, errors }
  }

  private async youtube(request: SourceFetchRequest, context: FetchContext): Promise<SourceItem[]> {
    const kind = request.kind ?? 'feed'
    if (kind === 'feed') {
      const channelId = requiredString(request.channelId, 'channelId')
      if (!/^[A-Za-z0-9_-]{3,128}$/u.test(channelId)) throw new GraphError('INVALID_REQUEST', 'channelId contains unsupported characters')
      const url = new URL('https://www.youtube.com/feeds/videos.xml')
      url.searchParams.set('channel_id', channelId)
      return this.feed(url.toString(), context, 'youtube')
    }
    if (kind !== 'transcript') throw new GraphError('INVALID_REQUEST', 'YouTube kind must be feed or transcript')
    let videoId = request.videoId
    if (videoId === undefined && request.url !== undefined) {
      const url = new URL(request.url)
      videoId = url.hostname === 'youtu.be' ? url.pathname.slice(1) : url.searchParams.get('v') ?? undefined
    }
    videoId = validSymbol(videoId, 'videoId')
    if (!/^[A-Za-z0-9_-]{6,20}$/u.test(videoId)) throw new GraphError('INVALID_REQUEST', 'videoId is invalid')
    const canonicalUrl = `https://www.youtube.com/watch?v=${videoId}`
    const watch = await this.http.request(canonicalUrl, { accept: 'text/html' })
    const player = record(extractBalancedJson(watch.text, 'ytInitialPlayerResponse'))
    const captions = record(record(player?.captions)?.playerCaptionsTracklistRenderer)
    const tracks = Array.isArray(captions?.captionTracks) ? captions.captionTracks.map(record).filter((entry): entry is Record<string, unknown> => entry !== undefined) : []
    if (tracks.length === 0) throw new GraphError('UNAVAILABLE', 'YouTube video has no public caption tracks without a Cookie')
    const track = request.lang === undefined ? tracks[0] : tracks.find(entry => entry.languageCode === request.lang) ?? tracks.find(entry => typeof entry.languageCode === 'string' && entry.languageCode.startsWith(`${request.lang}-`))
    if (track === undefined || typeof track.baseUrl !== 'string') throw new GraphError('UNAVAILABLE', `YouTube has no public caption track for ${request.lang ?? 'the requested language'}`)
    const transcriptUrl = new URL(track.baseUrl)
    transcriptUrl.searchParams.set('fmt', 'json3')
    const transcript = await this.http.request(transcriptUrl, { accept: 'application/json' })
    const events = record(parseJson(transcript.text, 'YouTube timedtext'))?.events
    if (!Array.isArray(events)) throw new GraphError('UNAVAILABLE', 'YouTube timedtext returned no events')
    const timed = events.map(record).filter((entry): entry is Record<string, unknown> => entry !== undefined)
      .filter(entry => typeof entry.tStartMs === 'number' && Array.isArray(entry.segs))
    const segments: TranscriptSegment[] = timed.map((event, index) => {
      const startSeconds = (event.tStartMs as number) / 1000
      const next = timed[index + 1]
      const duration = typeof event.dDurationMs === 'number' ? event.dDurationMs / 1000
        : typeof next?.tStartMs === 'number' ? Math.max(0, (next.tStartMs as number) / 1000 - startSeconds) : 0
      const endSeconds = startSeconds + duration
      const text = (event.segs as unknown[]).map(record).map(segment => typeof segment?.utf8 === 'string' ? segment.utf8 : '').join('').trim()
      return {
        segmentId: `seg-${String(index + 1).padStart(4, '0')}`,
        speaker: 'Unknown', start: clockTime(startSeconds), end: clockTime(endSeconds), startSeconds, endSeconds, text,
        deepLink: `${canonicalUrl}&t=${Math.floor(startSeconds)}s`,
      }
    }).filter(segment => segment.text.length > 0)
    if (segments.length === 0) throw new GraphError('UNAVAILABLE', 'YouTube timedtext returned no transcript segments')
    const videoDetails = record(player?.videoDetails)
    const microformat = record(record(player?.microformat)?.playerMicroformatRenderer)
    const availableAt = typeof microformat?.publishDate === 'string' ? microformat.publishDate : typeof microformat?.uploadDate === 'string' ? microformat.uploadDate : undefined
    if (availableAt === undefined) throw new GraphError('MISSING_TIMESTAMP', 'YouTube player response has no publishDate or uploadDate')
    const item = makeItem({
      provider: 'youtube', canonicalUrl, title: typeof videoDetails?.title === 'string' ? videoDetails.title : `YouTube transcript ${videoId}`,
      content: canonicalJson(jsonValue(segments)), availableAt, fetchedAt: context.fetchedAt, asOf: context.asOf,
      mimeType: 'application/json', data: jsonValue({ videoId, language: track.languageCode ?? null, segments }), segments,
      provenance: { transcript: 'public timedtext json3', cookie: false, automaticCaptions: track.kind === 'asr' },
    })
    return [item]
  }
}
