import { useId, useMemo, useRef, useState } from 'react'
import type { GraphNode } from '../../src/graph.ts'
import type { FinanceSection } from '../finance-store.ts'
import { historicalResearch, isResearchSource } from '../research.ts'
import { AssetLogo } from './AssetLogo.tsx'

export interface DiscoveryAsset {
  readonly symbol: string
  readonly name: string
  readonly sector: string
  readonly price: number | null
  readonly change: number | null
  readonly cap: number | null
  readonly node?: GraphNode
  readonly records?: readonly GraphNode[]
}

// Fixed invented values are used only by the clearly labelled demo view.
const STOCKS: readonly DiscoveryAsset[] = [
  ['AAPL', 'Apple', 'Technology', 218.4, 1.32, 3210], ['MSFT', 'Microsoft', 'Technology', 426.8, .64, 3170],
  ['NVDA', 'NVIDIA', 'Technology', 147.2, 2.48, 3590], ['GOOGL', 'Alphabet', 'Communication', 184.6, -.72, 2240],
  ['AMZN', 'Amazon', 'Consumer', 203.1, -.38, 2140], ['META', 'Meta Platforms', 'Communication', 584.2, 1.05, 1480],
  ['JPM', 'JPMorgan Chase', 'Financials', 241.8, -.41, 680], ['XOM', 'Exxon Mobil', 'Energy', 118.4, 1.81, 510],
  ['LLY', 'Eli Lilly', 'Healthcare', 824.3, -.95, 780], ['WMT', 'Walmart', 'Consumer', 94.2, .37, 750],
  ['CAT', 'Caterpillar', 'Industrials', 394.7, -.64, 190], ['NEE', 'NextEra Energy', 'Utilities', 78.5, .52, 160],
].map(([symbol, name, sector, price, change, cap]) => ({ symbol: String(symbol), name: String(name), sector: String(sector), price: Number(price), change: Number(change), cap: Number(cap) }))
const CRYPTO: readonly DiscoveryAsset[] = [
  { symbol: 'BTC-USD', name: 'Bitcoin', sector: 'Crypto', price: 84210, change: 1.24, cap: 1670 },
  { symbol: 'ETH-USD', name: 'Ethereum', sector: 'Crypto', price: 3240, change: -.62, cap: 391 },
  { symbol: 'SOL-USD', name: 'Solana', sector: 'Crypto', price: 184.5, change: 3.15, cap: 89 },
  { symbol: 'XRP-USD', name: 'XRP', sector: 'Crypto', price: 1.84, change: .71, cap: 104 },
  { symbol: 'ADA-USD', name: 'Cardano', sector: 'Crypto', price: .72, change: -1.12, cap: 25 },
  { symbol: 'AVAX-USD', name: 'Avalanche', sector: 'Crypto', price: 34.6, change: 2.03, cap: 14 },
]
export const discoveryDemoAssets = STOCKS
export const discoveryDemoCrypto = CRYPTO
const INDICES: readonly DiscoveryAsset[] = [
  { symbol: 'ES=F', name: 'S&P Futures', sector: 'Indices', price: 5912.5, change: .74, cap: null },
  { symbol: 'NQ=F', name: 'NASDAQ Fut.', sector: 'Indices', price: 20840, change: 1.18, cap: null },
  { symbol: 'YM=F', name: 'Dow Futures', sector: 'Indices', price: 42890, change: -.23, cap: null },
  { symbol: '^VIX', name: 'VIX', sector: 'Indices', price: 18.42, change: -2.31, cap: null },
]
const DEMO_MARKET_BRIEFS = [
  {
    zhTitle: '科技股分化，财报季聚焦资本开支',
    enTitle: 'Technology diverges as earnings focus turns to capital spending',
    zhBody: '在这个演示情境中，大型科技股走势分化。研究应回到财报原文，区分收入增长、资本开支与自由现金流，再检查原有投资假说。',
    enBody: 'In this synthetic scenario, technology stocks diverge. Research should return to original filings, distinguish revenue growth, capital spending and free cash flow, and revisit the investment thesis.',
  },
  {
    zhTitle: '利率路径与估值敏感性',
    enTitle: 'Interest-rate expectations and valuation sensitivity',
    zhBody: '示例研究问题：如果贴现率变化，哪些持仓的估值最敏感？可在估值页面使用明确假设进行计算。',
    enBody: 'Example research question: which holdings are most sensitive to a change in discount rates? Use explicit assumptions in the valuation workspace.',
  },
  {
    zhTitle: '能源价格与企业利润率',
    enTitle: 'Energy prices and corporate margins',
    zhBody: '示例研究问题：油价变化如何传导到能源生产商和下游企业？需要核验产量、成本和对冲披露。',
    enBody: 'Example research question: how do energy prices reach producers and downstream margins? Verify volumes, costs and hedging disclosures.',
  },
  {
    zhTitle: '消费需求与盈利质量',
    enTitle: 'Consumer demand and earnings quality',
    zhBody: '示例研究问题：增长来自销量、提价还是并购？将财务指标与原始经营披露交叉核对。',
    enBody: 'Example research question: does growth come from volume, pricing or acquisitions? Cross-check financial metrics against operating disclosures.',
  },
  {
    zhTitle: '本周待验证的催化剂',
    enTitle: 'Catalysts to verify this week',
    zhBody: '从财报、产品发布与政策事件建立研究清单，保留提出问题的时间和后续验证结果。此处不是实时新闻。',
    enBody: 'Build a research checklist from earnings, launches and policy events, preserving question dates and later verification. This is not a live news feed.',
  },
] as const
const numeric = (value: unknown) => typeof value === 'number' && Number.isFinite(value) ? value : null
const textValue = (value: unknown) => typeof value === 'string' && value.trim().length > 0 ? value.trim() : null
function record(value: unknown): Record<string, unknown> | undefined {
  return typeof value === 'object' && value !== null && !Array.isArray(value) ? value as Record<string, unknown> : undefined
}
function parsedRecord(value: unknown): Record<string, unknown> | undefined {
  if (typeof value !== 'string') return undefined
  try { return record(JSON.parse(value)) } catch { return undefined }
}
function validTimestamp(value: unknown): string | null {
  const timestamp = textValue(value)
  return timestamp !== null && Number.isFinite(Date.parse(timestamp)) ? timestamp : null
}

interface StoredQuoteEvidence {
  readonly symbol: string
  readonly price: number
  readonly change: number | null
  readonly asOf: string
  readonly provider: string
  readonly sourceId: string
  readonly currency: string | null
  readonly timezone: string | null
  readonly name: string | null
  readonly shortName: string | null
}

function quoteCompleteness(quote: StoredQuoteEvidence): number {
  return (quote.change === null ? 0 : 4) + (quote.currency === null ? 0 : 2) + (quote.timezone === null ? 0 : 1)
}

function storedQuoteEvidence(nodes: readonly GraphNode[]): ReadonlyMap<string, StoredQuoteEvidence> {
  const sources = new Map<string, string>()
  for (const node of nodes) {
    if (node.kind !== 'source') continue
    const provider = textValue(node.metadata.provider)
    if (provider?.toLowerCase() === 'yahoo') sources.set(node.id, provider)
  }
  const quotes = new Map<string, StoredQuoteEvidence>()
  for (const node of nodes) {
    if (node.kind !== 'raw') continue
    const metadata = node.metadata
    if (textValue(metadata.provider)?.toLowerCase() !== 'yahoo') continue
    const sourceId = textValue(metadata.sourceId)
    if (sourceId === null) continue
    const provider = sources.get(sourceId)
    if (provider === undefined) continue
    const data = record(metadata.data) ?? parsedRecord(node.content)
    if (data === undefined) continue
    const symbol = textValue(data.symbol)?.toUpperCase() ?? null
    const price = numeric(data.regularMarketPrice ?? data.price)
    const asOf = validTimestamp(data.regularMarketTime) ?? validTimestamp(metadata.availableAt) ?? validTimestamp(data.availableAt)
    if (symbol === null || price === null || price <= 0 || asOf === null) continue
    const previousClose = numeric(data.previousClose ?? data.chartPreviousClose)
    const explicitChange = numeric(data.regularMarketChangePercent)
    const change = explicitChange ?? (previousClose !== null && previousClose > 0 ? (price - previousClose) / previousClose * 100 : null)
    const candidate: StoredQuoteEvidence = {
      symbol,
      price,
      change,
      asOf,
      provider,
      sourceId,
      currency: textValue(data.currency)?.toUpperCase() ?? null,
      timezone: textValue(data.exchangeTimezoneName),
      name: textValue(data.longName) ?? textValue(data.shortName),
      shortName: textValue(data.shortName),
    }
    const existing = quotes.get(symbol)
    if (existing === undefined || Date.parse(candidate.asOf) > Date.parse(existing.asOf)
      || Date.parse(candidate.asOf) === Date.parse(existing.asOf) && quoteCompleteness(candidate) > quoteCompleteness(existing)) {
      quotes.set(symbol, candidate)
    }
  }
  return quotes
}

function validMarketSymbol(value: string): string | null {
  const normalized = value.trim().toUpperCase()
  return /^[A-Z^][A-Z0-9.^=_-]{0,19}$/u.test(normalized) ? normalized : null
}

export function discoveryRecords(nodes: readonly GraphNode[], crypto: boolean): DiscoveryAsset[] {
  const quotes = storedQuoteEvidence(nodes)
  const groups = new Map<string, GraphNode[]>()
  for (const node of nodes) {
    if (node.kind !== 'instrument' || typeof node.metadata.symbol !== 'string' || !node.metadata.symbol.trim()) continue
    if ((node.metadata.assetClass === 'crypto' || node.metadata.symbol.endsWith('-USD')) !== crypto) continue
    // Identity comes from explicit fields, never the title or an ID prefix.
    const key = JSON.stringify([node.metadata.symbol, node.metadata.assetClass ?? null])
    groups.set(key, [...(groups.get(key) ?? []), node])
  }
  return [...groups.values()].map(records => {
    const first = records[0]!
    const symbol = String(first.metadata.symbol)
    const quote = quotes.get(symbol.toUpperCase())
    const titled = (node: GraphNode) => node.title === quote?.name || node.title === quote?.shortName ? 2 : node.title.trim() !== symbol ? 1 : 0
    const node = records.reduce((best, candidate) => titled(candidate) > titled(best) ? candidate : best, first)
    return { symbol, name: node.title, sector: typeof node.metadata.sector === 'string' ? node.metadata.sector : '', price: numeric(node.metadata.regularMarketPrice ?? node.metadata.price), change: numeric(node.metadata.changePercent), cap: numeric(node.metadata.marketCapBillions), node, records }
  })
}

interface StoredHistory {
  readonly sourceId: string
  readonly currency: string | null
  readonly points: readonly { readonly time: number; readonly close: number }[]
}

function storedHistory(nodes: readonly GraphNode[]): ReadonlyMap<string, StoredHistory> {
  const sources = new Set(nodes.filter(node => node.kind === 'source' && textValue(node.metadata.provider)?.toLowerCase() === 'yahoo').map(node => node.id))
  const histories = new Map<string, StoredHistory>()
  for (const node of nodes) {
    if (node.kind !== 'raw' || textValue(node.metadata.provider)?.toLowerCase() !== 'yahoo') continue
    const sourceId = textValue(node.metadata.sourceId)
    if (sourceId === null || !sources.has(sourceId)) continue
    const data = record(node.metadata.data) ?? parsedRecord(node.content)
    const symbol = textValue(data?.symbol)?.toUpperCase()
    if (!symbol || !Array.isArray(data?.bars) || data.bars.length < 2) continue
    const points: { time: number; close: number }[] = []
    for (const value of data.bars) {
      const bar = record(value)
      const time = validTimestamp(bar?.timestamp)
      const close = numeric(bar?.close)
      if (time === null || close === null || close <= 0 || (points.length > 0 && Date.parse(time) <= points[points.length - 1]!.time)) break
      points.push({ time: Date.parse(time), close })
    }
    if (points.length !== data.bars.length) continue
    const existing = histories.get(symbol)
    if (existing === undefined || points[points.length - 1]!.time > existing.points[existing.points.length - 1]!.time) {
      histories.set(symbol, { sourceId, currency: textValue(data.currency), points })
    }
  }
  return histories
}

function HistorySpark({ history }: { readonly history: StoredHistory }) {
  const points = history.points.slice(-80)
  const start = points[0]!
  const end = points[points.length - 1]!
  const low = Math.min(...points.map(point => point.close))
  const high = Math.max(...points.map(point => point.close))
  const coordinates = points.map(point => `${((point.time - start.time) / (end.time - start.time) * 237).toFixed(2)},${(high === low ? 26 : 46 - (point.close - low) / (high - low) * 40).toFixed(2)}`).join(' ')
  return <svg className="rg-discovery-spark" viewBox="0 0 237 52" preserveAspectRatio="none" fill="none" data-series-source-id={history.sourceId} data-trend={end.close >= start.close ? 'up' : 'down'} role="img" aria-label={`${new Date(start.time).toISOString()} – ${new Date(end.time).toISOString()}`}><polyline points={coordinates} stroke="currentColor" strokeWidth="1.5"/></svg>
}
function normalizedSector(asset: DiscoveryAsset): string {
  return asset.sector.trim()
}
function heatmapSpan(asset: DiscoveryAsset, maximumCap: number): number {
  if (asset.cap === null || maximumCap <= 0) return 1
  return Math.max(1, Math.min(4, Math.ceil((asset.cap / maximumCap) * 4)))
}
function capWeightedChange(assets: readonly DiscoveryAsset[]): number | null {
  const weighted = assets.filter(asset => asset.cap !== null && asset.cap > 0 && asset.change !== null)
  const total = weighted.reduce((sum, asset) => sum + (asset.cap ?? 0), 0)
  if (total <= 0) return null
  return weighted.reduce((sum, asset) => sum + (asset.change ?? 0) * (asset.cap ?? 0), 0) / total
}
function Spark({ up, variant }: { readonly up: boolean; readonly variant: number }) {
  const gradient = useId()
  const points = Array.from({ length: 80 }, (_, i) => `${i * 3},${(up ? 39 - i * .27 : 15 + i * .29) + Math.sin(i * .25 + variant) * 3 + Math.sin(i * 1.2) * 1.2}`).join(' ')
  return <svg className="rg-discovery-spark" viewBox="0 0 237 62" preserveAspectRatio="none" data-trend={up ? 'up' : 'down'} fill="none" aria-hidden="true"><defs><linearGradient id={gradient} x1="0" y1="0" x2="0" y2="1"><stop stopColor="currentColor" stopOpacity=".14"/><stop offset="1" stopColor="currentColor" stopOpacity="0"/></linearGradient></defs><path d="M0 29h237" stroke="currentColor" opacity=".25" strokeDasharray="2 2"/><polygon points={`0,62 ${points} 237,62`} fill={`url(#${gradient})`}/><polyline points={points} stroke="currentColor" strokeWidth="1.3"/></svg>
}
function Star({ active }: { readonly active: boolean }) {
  return <svg width="18" height="18" viewBox="0 0 20 20" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.2" aria-hidden="true"><path d="m10 2 2.5 5.2 5.7.8-4.1 4 .9 5.7-5-2.7-5 2.7.9-5.7-4.1-4 5.7-.8z"/></svg>
}
export function DiscoveryPanel({ kind, nodes, demo, locale, onOpenSymbol, onOpenSection, onWatch }: {
  readonly kind: 'market' | 'crypto' | 'watchlist'
  readonly nodes: readonly GraphNode[]
  readonly demo: boolean
  readonly locale?: string | undefined
  readonly onOpenSymbol: (symbol: string) => void
  readonly onOpenSection: (section: FinanceSection) => void
  readonly onWatch: (node: GraphNode, watched: boolean) => void
}) {
  const zh = !locale || locale.startsWith('zh')
  const text = (cn: string, en: string) => zh ? cn : en
  const [search, setSearch] = useState('')
  const searchInput = useRef<HTMLInputElement>(null)
  const [sector, setSector] = useState('')
  const [expandedSector, setExpandedSector] = useState('')
  const [sort, setSort] = useState('cap')
  const [direction, setDirection] = useState(-1)
  const [demoWatched, setDemoWatched] = useState<string[]>(['AAPL', 'MSFT', 'BTC-USD'])
  const [adding, setAdding] = useState(false)
  const heatmapId = useId()
  const quoteEvidence = useMemo(() => demo ? new Map<string, StoredQuoteEvidence>() : storedQuoteEvidence(nodes), [nodes, demo])
  const historyEvidence = useMemo(() => demo ? new Map<string, StoredHistory>() : storedHistory(nodes), [nodes, demo])
  const assets = useMemo(() => {
    const base = kind === 'watchlist'
      ? demo ? [...STOCKS, ...CRYPTO] : [...discoveryRecords(nodes, false), ...discoveryRecords(nodes, true)]
      : demo ? kind === 'crypto' ? CRYPTO : STOCKS : discoveryRecords(nodes, kind === 'crypto')
    if (demo) return base
    const projected = base.map(asset => {
      if (asset.price !== null || asset.change !== null) return asset
      const evidence = quoteEvidence.get(asset.symbol.toUpperCase())
      return evidence === undefined ? asset : { ...asset, name: evidence.name ?? asset.name, price: evidence.price, change: evidence.change }
    })
    // A stored quote can be read without manufacturing an instrument/watchlist node.
    if (kind !== 'watchlist') for (const quote of quoteEvidence.values()) {
      if (quote.symbol.endsWith('-USD') !== (kind === 'crypto') || projected.some(asset => asset.symbol.toUpperCase() === quote.symbol)) continue
      projected.push({ symbol: quote.symbol, name: quote.name ?? quote.symbol, sector: '', price: quote.price, change: quote.change, cap: null })
    }
    return projected
  }, [nodes, demo, kind, quoteEvidence])
  const sectors = useMemo(() => {
    const grouped = new Map<string, DiscoveryAsset[]>()
    for (const asset of assets) {
      const name = normalizedSector(asset)
      if (!name) continue
      grouped.set(name, [...(grouped.get(name) ?? []), asset])
    }
    return [...grouped.entries()].map(([name, entries]) => ({ name, assets: entries, change: capWeightedChange(entries) }))
  }, [assets])
  const maximumCap = useMemo(() => Math.max(0, ...assets.map(asset => asset.cap ?? 0)), [assets])
  const citedReports = useMemo(() => {
    const byId = new Map(nodes.map(node => [node.id, node]))
    return nodes.filter(node => historicalResearch(node) && node.metadata.marketSummary === true && node.content.trim().length > 0).map(node => {
      const refs = [node.metadata.sourceIds, node.metadata.references, record(node.metadata.provenance)?.sourceRefs]
        .flatMap(value => Array.isArray(value) ? value.filter((id): id is string => typeof id === 'string') : [])
      const sources = [...new Set(refs)].map(id => byId.get(id)).filter((source): source is GraphNode => source !== undefined && isResearchSource(source))
      return { node, sources }
    }).filter(report => report.sources.length > 0)
      .sort((a, b) => (Date.parse(validTimestamp(b.node.metadata.availableAt) ?? '') || 0) - (Date.parse(validTimestamp(a.node.metadata.availableAt) ?? '') || 0))
      .slice(0, 3)
  }, [nodes])
  const explicitSourceCount = new Set(citedReports.flatMap(report => report.sources.map(source => source.id))).size
  const watchedRecords = (asset: DiscoveryAsset) => (asset.records ?? (asset.node ? [asset.node] : [])).filter(node => node.metadata.watchlist === true)
  const watched = (asset: DiscoveryAsset) => demo ? demoWatched.includes(asset.symbol) : watchedRecords(asset).length > 0
  const toggleWatch = (asset: DiscoveryAsset, target?: GraphNode) => {
    if (demo) setDemoWatched(current => current.includes(asset.symbol) ? current.filter(symbol => symbol !== asset.symbol) : [...current, asset.symbol])
    else {
      const node = target ?? watchedRecords(asset)[0] ?? asset.node
      if (node) onWatch(node, node.metadata.watchlist !== true)
    }
  }
  const rows = assets.filter(asset => (kind !== 'watchlist' || adding || watched(asset)) && (!sector || normalizedSector(asset) === sector) && `${asset.name} ${asset.symbol}`.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      if (sort === 'name') return direction * a.name.localeCompare(b.name)
      const left = sort === 'price' ? a.price : sort === 'change' ? a.change : a.cap
      const right = sort === 'price' ? b.price : sort === 'change' ? b.change : b.cap
      return left === right ? 0 : left === null ? 1 : right === null ? -1 : direction * (left - right)
    })
  const order = (key: string) => { if (sort === key) setDirection(value => -value); else { setSort(key); setDirection(-1) } }
  const number = (value: number | null, digits = 2) => value === null ? '—' : new Intl.NumberFormat(zh ? 'zh-CN' : 'en-US', { maximumFractionDigits: digits, minimumFractionDigits: digits }).format(value)
  const percent = (value: number | null) => value === null ? '—' : `${value > 0 ? '+' : ''}${value.toFixed(2)}%`
  const quoteFor = (asset: DiscoveryAsset) => {
    if (demo) return undefined
    if (asset.node === undefined) return quoteEvidence.get(asset.symbol.toUpperCase())
    const directPrice = numeric(asset.node.metadata.regularMarketPrice ?? asset.node.metadata.price)
    const directChange = numeric(asset.node.metadata.changePercent)
    return directPrice === null && directChange === null ? quoteEvidence.get(asset.symbol.toUpperCase()) : undefined
  }
  const historyFor = (asset: DiscoveryAsset) => {
    const quote = quoteFor(asset)
    const history = historyEvidence.get(asset.symbol.toUpperCase())
    return quote && history && history.currency !== null && history.currency === quote.currency
      && history.points[history.points.length - 1]!.time <= Date.parse(quote.asOf) ? history : undefined
  }
  const quoteLabel = (quote: StoredQuoteEvidence) => {
    const formatTime = (timeZone: string) => new Intl.DateTimeFormat(zh ? 'zh-CN' : 'en-US', {
      year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
      timeZone, timeZoneName: 'short',
    }).format(new Date(quote.asOf))
    let time: string
    try { time = formatTime(quote.timezone ?? 'UTC') } catch { time = formatTime('UTC') }
    return `${quote.currency === null ? '' : `${quote.currency} · `}${quote.provider === 'yahoo' ? 'Yahoo' : quote.provider} · ${time}`
  }
  const normalizedSearch = validMarketSymbol(search)
  const lookupSymbol = normalizedSearch !== null && !assets.some(asset => asset.symbol.toUpperCase() === normalizedSearch) ? normalizedSearch : null
  const chooseSector = (value: string) => { setSector(value); setExpandedSector(value) }
  const keyFor = (asset: DiscoveryAsset) => asset.node ? `node:${asset.node.id}` : `quote:${asset.symbol}`
  const sourceUrl = (node: GraphNode) => {
    const value = textValue(node.metadata.canonicalUrl) ?? textValue(record(node.metadata.provenance)?.canonicalUrl)
    if (value === null) return undefined
    try { const url = new URL(value); return ['https:', 'http:'].includes(url.protocol) && !url.username && !url.password ? url.href : undefined } catch { return undefined }
  }
  const observedQuotes = [...new Map(assets.map(asset => quoteFor(asset)).filter((quote): quote is StoredQuoteEvidence => quote !== undefined).map(quote => [quote.sourceId, quote])).values()]
  const ungroupedMoves = assets.filter(asset => !normalizedSector(asset) && (asset.price !== null || asset.change !== null))
  return <section className="rg-pf-panel rg-discovery" data-kind={kind}>
    <div className="rg-discovery-heading"><h2>{kind === 'market' ? text('市场概览', 'Market overview') : kind === 'crypto' ? text('加密货币', 'Cryptocurrency') : text('关注列表', 'Watchlist')}</h2>{kind === 'watchlist' && <button type="button" className="rg-btn" onClick={() => setAdding(value => !value)}>{adding ? text('完成', 'Done') : text('添加标的', 'Add instruments')}</button>}</div>
    {!demo && <details className="rg-discovery-source"><summary>{text('已存行情与资料 · 来源及日期', 'Saved quotes & materials · Sources and dates')}</summary><p>{text('仅展示已存记录，不代表实时行情或全市场排名。缺失字段保留为空；点击标的可查询行情。', 'Saved records, not live market data or a market ranking. Missing values stay empty; open an instrument to request quotes.')}</p><ul>{assets.map(asset => {
      const quote = quoteFor(asset)
      const history = historyFor(asset)
      return <li key={keyFor(asset)} data-node-id={asset.node?.id} data-quote-source-id={quote?.sourceId}>{asset.symbol} · {quote ? quoteLabel(quote) : `${text('标的记录', 'Instrument record')} · ${validTimestamp(asset.node?.metadata.availableAt) ?? validTimestamp(asset.node?.metadata.asOf) ?? text('日期未记录', 'Date not recorded')}`}{history && <span data-series-source-id={history.sourceId}> · {text('已存历史收盘', 'Saved historical closes')} {new Date(history.points[Math.max(0, history.points.length - 80)]!.time).toISOString()} – {new Date(history.points[history.points.length - 1]!.time).toISOString()}</span>}</li>
    })}</ul></details>}
    {kind === 'market' && <>
      <div className="rg-discovery-tickers">{(demo ? INDICES : assets.slice(0, 4)).map((asset, index) => {
        const quote = quoteFor(asset)
        const history = historyFor(asset)
        return <button type="button" key={keyFor(asset)} title={`${asset.name} · ${asset.symbol}`} onClick={() => onOpenSymbol(asset.symbol)} data-node-id={asset.node?.id} data-quote-source-id={quote?.sourceId} data-quote-time={quote?.asOf}><span className="rg-discovery-ticker-identity"><AssetLogo symbol={asset.symbol}/><span><strong>{asset.symbol}</strong><small>{asset.name}</small></span></span><span className="rg-discovery-ticker-price">{number(asset.price)}{quote?.currency && <small>{quote.currency}</small>}</span><span className="rg-discovery-ticker-change" data-up={asset.change === null ? undefined : asset.change >= 0}>{percent(asset.change)}</span>{demo ? <Spark up={(asset.change ?? 0) >= 0} variant={index}/> : history ? <HistorySpark history={history}/> : <small className="rg-discovery-no-series">{text('尚无历史序列', 'No saved price history')}</small>}</button>
      })}</div>
	      <div className="rg-discovery-summary" data-demo={demo || undefined}>
	        <div className="rg-discovery-summary-head">
	          <h3>{text('市场摘要', 'Market summary')}</h3>
	          {!demo && explicitSourceCount > 0
	            ? <small data-explicit-source-count={explicitSourceCount}>{text(`已存研究 · 引用 ${explicitSourceCount} 个来源`, `Saved research · ${explicitSourceCount} source ${explicitSourceCount === 1 ? 'record' : 'records'}`)}</small>
	            : null}
	        </div>
	        {demo
	          ? <div className="rg-market-briefs">{DEMO_MARKET_BRIEFS.map((brief, index) => <details key={brief.enTitle} open={index === 0}>
	              <summary>{text(brief.zhTitle, brief.enTitle)}<svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3" aria-hidden="true"><path d="m4 6 4 4 4-4"/></svg></summary>
	              <p>{text(brief.zhBody, brief.enBody)}</p>
	              <button type="button" onClick={() => onOpenSection('overview')}>{text('用真实资料研究', 'Research with real sources')}</button>
	            </details>)}</div>
	          : <><div className="rg-market-stored-summary"><p>{text(`已存报价 ${observedQuotes.length} 条 · 各自观察日期，不代表实时市场`, `${observedQuotes.length} saved quotes · Separate observation dates, not a live market summary`)}</p><button type="button" onClick={() => onOpenSection('overview')}>{text('用已有资料开始研究', 'Research with saved materials')}</button></div>{observedQuotes.length > 0 && <div className="rg-market-observations">{observedQuotes.map(quote => {
              const source = nodes.find(node => node.id === quote.sourceId)
              return <details key={quote.sourceId} data-quote-source-id={quote.sourceId}><summary><strong>{quote.symbol}</strong><span>{number(quote.price)} {quote.currency}</span><span data-up={quote.change === null ? undefined : quote.change >= 0}>{percent(quote.change)}</span><time dateTime={quote.asOf}>{new Date(quote.asOf).toISOString().slice(0, 10)}</time></summary><p>{quoteLabel(quote)}{source && sourceUrl(source) && <> · <a href={sourceUrl(source)} target="_blank" rel="noreferrer">{text('原始来源', 'Original source')}</a></>}</p><button type="button" onClick={() => onOpenSymbol(quote.symbol)}>{text('打开标的行情', 'Open instrument quote')}</button></details>
            })}</div>}{citedReports.length > 0 && <div className="rg-market-briefs">{citedReports.map(({ node, sources }, index) => <details key={node.id} data-report-id={node.id} open={index === 0}><summary>{node.title}<svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3" aria-hidden="true"><path d="m4 6 4 4 4-4"/></svg></summary><p className="rg-market-extract">{node.content.trim().replace(/^\s*#{1,6}\s+/gmu, '').slice(0, 480)}{node.content.length > 480 ? '…' : ''}</p><details className="rg-market-citations"><summary>{text('已存原文节选 · 来源及日期', 'Saved original excerpt · Sources and dates')}</summary><p>{text('资料截面', 'As of')}: {validTimestamp(node.metadata.asOf) ?? text('未记录', 'Not recorded')}</p><ul>{sources.map(source => <li key={source.id} data-source-id={source.id}>{sourceUrl(source) ? <a href={sourceUrl(source)} target="_blank" rel="noreferrer">{source.title}</a> : source.title} · {validTimestamp(source.metadata.availableAt) ?? validTimestamp(source.metadata.asOf) ?? text('日期未记录', 'Date not recorded')}</li>)}</ul></details><button type="button" onClick={() => onOpenSection('reports')}>{text('在历史研究中阅读', 'Read in research history')}</button></details>)}</div>}{observedQuotes.length === 0 && citedReports.length === 0 && <div className="rg-market-summary-empty"><p>{text('还没有带时点与来源的已存报价或市场摘要。可查询真实行情，或从已有资料开始研究。', 'No saved timed quotes or sourced market summaries yet. Look up a real quote or start research with saved materials.')}</p><button type="button" onClick={() => onOpenSection('market')}>{text('查询真实行情', 'Look up a quote')}</button></div>}</>}
	      </div>
      <div className="rg-discovery-section-head"><h3>{text('我的标的涨跌', 'Tracked moves')}</h3><span>{sectors.length > 0 ? text('按已记录板块分组', 'Grouped by recorded sector') : text('等面积 · 非市值权重', 'Equal area · Not cap-weighted')}</span></div>
	      {sectors.length > 0 && <div className="rg-discovery-heatmap">
	        {sectors.map((group, groupIndex) => {
	          const panelId = `${heatmapId}-sector-${groupIndex}`
	          const expanded = expandedSector === group.name
	          return <section className="rg-discovery-heatmap-sector" data-sector={group.name} key={group.name}>
	            <button
	              type="button"
	              className="rg-discovery-heatmap-sector-head"
	              aria-expanded={expanded}
	              aria-controls={panelId}
	              onClick={() => { setExpandedSector(current => current === group.name ? '' : group.name) }}
	            >
	              <strong>{group.name}</strong>
	              <span>{group.assets.length} {text('只', 'assets')}</span>
	              <span data-up={group.change === null ? undefined : group.change >= 0}>{percent(group.change)}</span>
	              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3" aria-hidden="true"><path d="m4 6 4 4 4-4"/></svg>
	            </button>
	            <div className="rg-discovery-heatmap-cells">
	              {group.assets.map(asset => {
	                const span = heatmapSpan(asset, maximumCap)
	                return <button
	                  key={keyFor(asset)}
	                  type="button"
	                  style={{ gridColumn: `span ${span}` }}
	                  data-up={asset.change === null ? undefined : asset.change >= 0}
	                  data-cap-weight={asset.cap === null ? undefined : span}
	                  data-market-cap={asset.cap ?? undefined}
	                  aria-pressed={sector === group.name}
	                  onClick={() => chooseSector(group.name)}
	                >
	                  <small>{group.name}</small><strong>{asset.symbol}</strong><span>{percent(asset.change)}</span>
	                </button>
	              })}
	            </div>
	            <div className="rg-discovery-sector-detail" id={panelId} role="region" aria-label={text(`${group.name} 板块详情`, `${group.name} sector details`)} hidden={!expanded}>
	              <div><strong>{group.name}</strong><span>{text('市值加权涨跌', 'Cap-weighted move')} {percent(group.change)}</span></div>
	              <p>{text(
	                `显式市值：${group.assets.filter(asset => asset.cap !== null).length}/${group.assets.length} 只资产。缺失市值不参与单元权重。`,
	                `Explicit market cap: ${group.assets.filter(asset => asset.cap !== null).length}/${group.assets.length} assets. Missing caps do not affect cell weight.`,
	              )}</p>
	              <div>{group.assets.map(asset => <button key={keyFor(asset)} type="button" onClick={() => onOpenSymbol(asset.symbol)}><AssetLogo symbol={asset.symbol}/><span><strong>{asset.name}</strong><small>{asset.symbol} · {asset.cap === null ? '—' : `$${number(asset.cap, 1)}B`}</small></span><span data-up={asset.change === null ? undefined : asset.change >= 0}>{percent(asset.change)}</span></button>)}</div>
	            </div>
	          </section>
	        })}
	      </div>}
      {ungroupedMoves.length > 0 && <div className="rg-discovery-moves" aria-label={text('等面积标的涨跌，非市值权重', 'Equal-area instrument moves, not cap-weighted')}>{ungroupedMoves.map(asset => <button type="button" key={keyFor(asset)} data-node-id={asset.node?.id} data-up={asset.change === null ? undefined : asset.change >= 0} onClick={() => onOpenSymbol(asset.symbol)}><strong>{asset.symbol}</strong><small>{asset.name}</small><span>{number(asset.price)}</span><span>{percent(asset.change)}</span></button>)}</div>}
      {sectors.length === 0 && ungroupedMoves.length === 0 && <div className="rg-market-summary-empty"><p>{text('还没有可展示的标的行情。', 'No saved instrument quotes to show yet.')}</p><button type="button" onClick={() => onOpenSection('market')}>{text('按代码查询行情', 'Look up a quote by symbol')}</button></div>}
    </>}
    <div className="rg-discovery-section-head"><h3>{kind === 'market' ? text('发现标的', 'Discover instruments') : kind === 'watchlist' && adding ? text('选择关注的标的', 'Choose instruments to follow') : text('全部资产', 'All assets')}</h3>{sector && <button type="button" onClick={() => setSector('')}>{text('清除板块筛选', 'Clear sector filter')}</button>}<span>{rows.length} {text('项', 'results')}</span></div>
	    <div className="rg-discovery-tools"><input ref={searchInput} type="search" aria-label={text('筛选资产', 'Filter assets')} placeholder={kind === 'crypto' ? text('输入代码，例如 BTC-USD', 'Enter a symbol, e.g. BTC-USD') : text('搜索名称或代码', 'Search name or symbol')} value={search} onChange={event => setSearch(event.target.value)}/>{kind !== 'crypto' && sectors.length > 0 && <select aria-label={text('板块', 'Sector')} value={sector} onChange={event => setSector(event.target.value)}><option value="">{text('全部板块', 'All sectors')}</option>{sectors.map(group => <option key={group.name}>{group.name}</option>)}</select>}</div>
    <div className="rg-discovery-table-wrap"><table className="rg-pf-table rg-discovery-table"><thead><tr><th><button type="button" onClick={() => order('name')}>{text('名称', 'Name')} {sort === 'name' ? direction > 0 ? '↑' : '↓' : ''}</button></th><th><button type="button" onClick={() => order('price')}>{text('价格', 'Price')} {sort === 'price' ? direction > 0 ? '↑' : '↓' : ''}</button></th><th><button type="button" onClick={() => order('change')}>{text('涨跌幅', 'Change')} {sort === 'change' ? direction > 0 ? '↑' : '↓' : ''}</button></th><th><button type="button" onClick={() => order('cap')}>{text('市值（十亿美元）', 'Market cap ($B)')} {sort === 'cap' ? direction > 0 ? '↑' : '↓' : ''}</button></th><th>{text('关注', 'Follow')}</th></tr></thead><tbody>{rows.map(asset => {
      const quote = quoteFor(asset)
      const watches = watchedRecords(asset)
      return <tr key={keyFor(asset)} data-node-id={asset.node?.id}><td><button type="button" className="rg-discovery-name" onClick={() => onOpenSymbol(asset.symbol)}><AssetLogo symbol={asset.symbol} /><span><strong>{asset.name}</strong><small>{asset.symbol}</small></span></button></td><td data-quote-source-id={quote?.sourceId} data-quote-time={quote?.asOf}><span>{number(asset.price)}</span>{quote !== undefined && <details className="rg-discovery-price-evidence"><summary>{quote.currency} · {new Date(quote.asOf).toISOString().slice(0, 10)}</summary><span>{quoteLabel(quote)}</span></details>}</td><td data-up={asset.change === null ? undefined : asset.change >= 0}>{percent(asset.change)}</td><td>{number(asset.cap, 1)}</td><td>{!demo && asset.node === undefined ? <button type="button" onClick={() => onOpenSymbol(asset.symbol)}>{text('查看行情', 'Open quote')}</button> : watches.length > 1 ? <details className="rg-discovery-watch-records"><summary>{text(`管理关注（${watches.length}）`, `Manage follows (${watches.length})`)}</summary>{watches.map(node => <button type="button" key={node.id} data-node-id={node.id} onClick={() => toggleWatch(asset, node)}>{text('取消关注', 'Unfollow')} {node.title}</button>)}</details> : <button type="button" data-node-id={watches[0]?.id ?? asset.node?.id} aria-label={`${watched(asset) ? text('取消关注', 'Unfollow') : text('关注', 'Follow')} ${asset.symbol}`} aria-pressed={watched(asset)} onClick={() => toggleWatch(asset)}><Star active={watched(asset)}/></button>}</td></tr>
    })}</tbody></table></div>
    {rows.length === 0 && <div className="rg-discovery-empty"><p>{assets.length === 0 ? text('当前没有已接入的资产记录。', 'No connected asset records yet.') : text('没有符合条件的标的。', 'No matching instruments.')}</p>{lookupSymbol !== null && <button type="button" className="rg-discovery-lookup" onClick={() => { setSearch(''); setSector(''); onOpenSymbol(lookupSymbol) }}>{text(`查询 ${lookupSymbol}`, `Look up ${lookupSymbol}`)}</button>}<button type="button" onClick={() => { setSearch(''); setSector(''); if (kind === 'watchlist') setAdding(true) }}>{text('重置筛选 / 添加标的', 'Reset filters / Add instruments')}</button><button type="button" onClick={() => searchInput.current?.focus()}>{text('输入代码查询行情', 'Enter a symbol to look up')}</button></div>}
  </section>
}
