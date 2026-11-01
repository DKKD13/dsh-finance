import { useEffect, useState } from 'react'
import type { GraphNode } from '../../src/graph.ts'

interface Props { readonly nodes: readonly GraphNode[]; readonly demo: boolean; readonly locale?: string | undefined; readonly onOpenSymbol: (symbol: string) => void; readonly onResearch: (question: string) => void }
const record = (value: unknown): Record<string, unknown> => value !== null && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {}
const numeric = (value: unknown) => typeof value === 'number' && Number.isFinite(value) ? value : null
const str = (value: unknown) => typeof value === 'string' ? value : ''
const shiftDate = (value: string, days: number) => new Date(Date.parse(`${value}T12:00:00Z`) + days * 86400000).toISOString().slice(0, 10)
interface Earning { readonly id: string; readonly symbol: string; readonly name: string; readonly date: string; readonly session: string; readonly epsEstimate: number | null; readonly epsActual: number | null; readonly revenueEstimate: number | null; readonly revenueActual: number | null; readonly source: string }
const EARNINGS: readonly Earning[] = ['AAPL', 'MSFT', 'GOOGL', 'META', 'AMZN', 'XOM', 'CAT', 'V', 'MA', 'LLY'].map((symbol, i) => ({ id: `demo:${symbol}`, symbol, name: ['Apple', 'Microsoft', 'Alphabet', 'Meta Platforms', 'Amazon', 'Exxon Mobil', 'Caterpillar', 'Visa', 'Mastercard', 'Eli Lilly'][i] ?? symbol, date: shiftDate('2026-10-26', i % 5), session: i % 2 ? 'AM' : 'PM', epsEstimate: 1.6 + i * .22, epsActual: i < 6 ? 1.7 + i * .19 : null, revenueEstimate: 12.8 + i * 7.1, revenueActual: i < 6 ? 13.4 + i * 6.9 : null, source: '' }))
export function earningsRecords(nodes: readonly GraphNode[]): Earning[] {
  return nodes.filter(node => node.kind === 'catalyst' && (node.metadata.eventType === 'earnings' || Object.keys(record(node.metadata.earnings)).length > 0)).map(node => {
    const data = Object.keys(record(node.metadata.earnings)).length ? record(node.metadata.earnings) : node.metadata
    return { id: node.id, symbol: str(data.symbol), name: node.title, date: str(data.date ?? data.eventDate).slice(0, 10), session: str(data.session), epsEstimate: numeric(data.epsEstimate), epsActual: numeric(data.epsActual), revenueEstimate: numeric(data.revenueEstimate), revenueActual: numeric(data.revenueActual), source: str(data.sourceUrl) }
  })
}
export function EarningsPanel({ nodes, demo, locale, onOpenSymbol, onResearch }: Props) {
  const zh = !locale || locale.startsWith('zh'), text = (cn: string, en: string) => zh ? cn : en
  const [week, setWeek] = useState('2026-10-26'), [day, setDay] = useState(''), [session, setSession] = useState(''), [query, setQuery] = useState(''), [selected, setSelected] = useState<string | null>(null)
  const all = demo ? EARNINGS : earningsRecords(nodes)
  const rows = all.filter(row => row.date >= week && row.date <= shiftDate(week, 6) && (!day || row.date === day) && (!session || row.session === session) && `${row.symbol} ${row.name}`.toLowerCase().includes(query.toLowerCase()))
  const metric = (value: number | null) => value === null ? '—' : value.toFixed(2)
  const move = (days: number) => { setWeek(shiftDate(week, days)); setDay(''); setSelected(null) }
  return <section className="rg-pf-panel dsh-events dsh-events-earnings"><div className="rg-discovery-heading"><h2>{text('财报日历', 'Earnings calendar')}</h2><div className="dsh-events-week-nav"><button type="button" className="dsh-events-button" onClick={() => move(-7)} aria-label={text('上一周', 'Previous week')}>‹</button><button type="button" className="dsh-events-button" onClick={() => { setWeek('2026-10-26'); setDay('') }}>{text('示例周', 'Example week')}</button><button type="button" className="dsh-events-button" onClick={() => { setWeek(earningsWeekStart(new Date())); setDay(''); setSelected(null) }}>{text('今天', 'Today')}</button><button type="button" className="dsh-events-button" onClick={() => move(7)} aria-label={text('下一周', 'Next week')}>›</button></div></div>{!demo && <p className="rg-discovery-source">{text('只显示显式导入的财报事件；共识预期未接入时显示 —。', 'Explicitly imported earnings events only. Unavailable consensus estimates show —.')}</p>}
    <div className="dsh-events-day-strip">{Array.from({ length: 7 }, (_, i) => { const date = shiftDate(week, i); return <button type="button" className="dsh-events-day" key={date} data-active={day === date || undefined} aria-pressed={day === date} onClick={() => setDay(current => current === date ? '' : date)}><small>{new Date(`${date}T12:00:00Z`).toLocaleDateString(zh ? 'zh-CN' : 'en-US', { weekday: 'short', timeZone: 'UTC' })}</small><strong>{date.slice(5).replace('-', '/')}</strong><span>{all.filter(row => row.date === date).length} {text('场财报', 'earnings')}</span></button> })}</div>
    <div className="dsh-events-controls"><input type="date" aria-label={text('财报周起始日', 'Earnings week start')} value={week} onChange={event => { if (event.target.value) { setWeek(event.target.value); setDay('') } }}/><input type="search" aria-label={text('搜索财报', 'Search earnings')} placeholder={text('搜索公司或代码', 'Search company or symbol')} value={query} onChange={event => setQuery(event.target.value)}/><select aria-label={text('发布时间', 'Release session')} value={session} onChange={event => setSession(event.target.value)}><option value="">{text('全部时段', 'All sessions')}</option><option value="AM">{text('盘前', 'Before market')}</option><option value="PM">{text('盘后', 'After market')}</option></select><button type="button" className="dsh-events-button" onClick={() => { setDay(''); setSession(''); setQuery('') }}>{text('重置', 'Reset')}</button></div>
    <div className="rg-discovery-table-wrap"><table className="rg-pf-table rg-event-table"><thead><tr><th>{text('公司', 'Company')}</th><th>{text('日期 / 时段', 'Date / session')}</th><th>{text('EPS 预期 / 实际', 'EPS est. / actual')}</th><th>{text('营收预期 / 实际（十亿美元）', 'Revenue est. / actual ($B)')}</th></tr></thead><tbody>{rows.map(row => <tr key={row.id} data-selected={selected === row.id || undefined}><td><button type="button" className="rg-event-company" aria-expanded={selected === row.id} onClick={() => setSelected(current => current === row.id ? null : row.id)}><span className="rg-pf-monogram">{row.symbol.slice(0, 1)}</span><span><strong>{row.symbol || row.name}</strong><small>{row.name}</small></span></button></td><td>{row.date}<small className="rg-event-sub">{row.session === 'AM' ? text('盘前', 'Before market') : row.session === 'PM' ? text('盘后', 'After market') : '—'}</small></td><td>{metric(row.epsEstimate)} / {metric(row.epsActual)}</td><td>{metric(row.revenueEstimate)} / {metric(row.revenueActual)}</td></tr>)}</tbody></table></div>
    {rows.length === 0 && <div className="rg-event-empty"><p>{text('所选日期与条件下没有财报。', 'No earnings match this date and filters.')}</p><button type="button" className="rg-btn" onClick={() => { setWeek('2026-10-26'); setDay(''); setQuery(''); setSession('') }}>{text('返回示例周 / 重置', 'Return to example week / Reset')}</button></div>}
    {rows.filter(row => row.id === selected).map(row => <section key={row.id} className="rg-event-detail"><h3>{row.name} · {text('财报研究', 'Earnings research')}</h3>{!demo && <p>{row.id}</p>}{!demo && /^https?:\/\//i.test(row.source) && <p><a href={row.source} target="_blank" rel="noreferrer">{text('查看原始披露', 'Open original disclosure')}</a></p>}<div className="rg-event-actions"><button type="button" className="rg-btn" disabled={!row.symbol} onClick={() => onOpenSymbol(row.symbol)}>{text('查看公司', 'View company')}</button>{['pre', 'post'].map(mode => <button type="button" className="rg-btn" key={mode} onClick={() => onResearch(`${mode === 'pre' ? 'Prepare a pre-earnings brief' : 'Analyze reported earnings'} for ${row.symbol || row.name}. Verify original public filings and disclosure dates. UI demo figures are synthetic and must not be used as evidence.${!demo ? ` Real source node: ${row.id}.` : ''}`)}>{mode === 'pre' ? text('财报前瞻', 'Pre-earnings brief') : text('财报后复盘', 'Post-earnings report')}</button>)}</div></section>)}
  </section>
}
/** Monday in the caller's local calendar, returned as YYYY-MM-DD. */
export function earningsWeekStart(now: Date): string {
  if (!Number.isFinite(now.getTime())) return ''
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000)
  local.setUTCDate(local.getUTCDate() - ((local.getUTCDay() + 6) % 7))
  return local.toISOString().slice(0, 10)
}
export interface PredictionHistoryPoint {
  readonly at: string
  readonly probability: number
}
export interface PredictionOutcome {
  readonly name: string
  readonly probability: number
  readonly history: readonly PredictionHistoryPoint[]
}
export interface PredictionContract {
  readonly id: string
  readonly title: string
  readonly topic: string
  readonly probability: number | null
  readonly date: string
  readonly volume: number | null
  readonly history: readonly number[]
  readonly criteria: string
  readonly source: string
  readonly sourceName: string
  readonly asOf: string
  readonly outcomes: readonly PredictionOutcome[]
  readonly outcomeDataState: 'absent' | 'valid' | 'invalid'
}
const BINARY_CONTRACTS: readonly PredictionContract[] = [
  { id: 'demo:rates', title: 'Will the next policy decision lower interest rates?', topic: 'Macro', probability: .64, date: '2026-12-31', volume: 240000, history: [.42, .46, .44, .51, .56, .52, .61, .64], criteria: 'A synthetic contract resolved against an invented year-end policy outcome.', source: '', sourceName: 'Demo fixture', asOf: '2026-10-30' },
  { id: 'demo:earnings', title: 'Will a large technology company beat quarterly EPS estimates?', topic: 'Earnings', probability: .72, date: '2026-12-15', volume: 184000, history: [.51, .54, .58, .55, .66, .69, .67, .72], criteria: 'An invented EPS outcome for interaction preview; no real contract exists.', source: '', sourceName: 'Demo fixture', asOf: '2026-10-30' },
  { id: 'demo:oil', title: 'Will crude oil finish the year above the example threshold?', topic: 'Commodities', probability: .38, date: '2026-12-31', volume: 92000, history: [.62, .57, .58, .49, .44, .47, .41, .38], criteria: 'An invented price threshold used only to demonstrate event research.', source: '', sourceName: 'Demo fixture', asOf: '2026-10-30' },
  { id: 'demo:ai', title: 'Will a major AI company announce a public offering?', topic: 'Technology', probability: .47, date: '2026-12-31', volume: 310000, history: [.23, .29, .27, .38, .41, .39, .43, .47], criteria: 'A hypothetical corporate event, not an exchange-listed contract.', source: '', sourceName: 'Demo fixture', asOf: '2026-10-30' },
].map(contract => ({ ...contract, outcomes: [], outcomeDataState: 'absent' as const }))
export const predictionMarketDemoContracts: readonly PredictionContract[] = [
  ...BINARY_CONTRACTS,
  {
    id: 'demo:ipo-cap',
    title: 'Largest IPO by market cap in 2026?',
    topic: 'Technology',
    probability: null,
    date: '2026-12-31',
    volume: 7030000,
    history: [],
    criteria: 'Synthetic multi-outcome fixture. No real contract or live probability is represented.',
    source: '',
    sourceName: 'Demo fixture',
    asOf: '2026-10-30T00:00:00Z',
    outcomeDataState: 'valid',
    outcomes: [
      {
        name: 'SpaceX',
        probability: .57,
        history: [
          { at: '2026-09-30T00:00:00Z', probability: .48 },
          { at: '2026-10-10T00:00:00Z', probability: .51 },
          { at: '2026-10-20T00:00:00Z', probability: .54 },
          { at: '2026-10-29T18:00:00Z', probability: .56 },
          { at: '2026-10-29T23:00:00Z', probability: .565 },
          { at: '2026-10-30T00:00:00Z', probability: .57 },
        ],
      },
      {
        name: 'Anthropic',
        probability: .42,
        history: [
          { at: '2026-09-30T00:00:00Z', probability: .51 },
          { at: '2026-10-10T00:00:00Z', probability: .48 },
          { at: '2026-10-20T00:00:00Z', probability: .45 },
          { at: '2026-10-29T18:00:00Z', probability: .43 },
          { at: '2026-10-29T23:00:00Z', probability: .425 },
          { at: '2026-10-30T00:00:00Z', probability: .42 },
        ],
      },
      {
        name: 'OpenAI',
        probability: .01,
        history: [
          { at: '2026-09-30T00:00:00Z', probability: .01 },
          { at: '2026-10-10T00:00:00Z', probability: .01 },
          { at: '2026-10-20T00:00:00Z', probability: .01 },
          { at: '2026-10-29T18:00:00Z', probability: .01 },
          { at: '2026-10-29T23:00:00Z', probability: .01 },
          { at: '2026-10-30T00:00:00Z', probability: .01 },
        ],
      },
    ],
  },
]
const validProbability = (value: number | null): value is number => value !== null && value >= 0 && value <= 1
function readPredictionOutcomes(value: unknown): PredictionOutcome[] | null {
  if (!Array.isArray(value) || value.length < 2) return null
  const outcomes: PredictionOutcome[] = []
  for (const item of value) {
    const outcome = record(item)
    const name = str(outcome.name).trim()
    const probability = numeric(outcome.probability)
    if (!name || !validProbability(probability)) return null
    const rawHistory = outcome.history
    if (rawHistory !== undefined && !Array.isArray(rawHistory)) return null
    const history: PredictionHistoryPoint[] = []
    for (const rawPoint of Array.isArray(rawHistory) ? rawHistory : []) {
      const point = record(rawPoint)
      const at = str(point.at).trim()
      const pointProbability = numeric(point.probability)
      if (!at || !Number.isFinite(Date.parse(at)) || !validProbability(pointProbability)) return null
      history.push({ at, probability: pointProbability })
    }
    history.sort((left, right) => Date.parse(left.at) - Date.parse(right.at))
    outcomes.push({ name, probability, history })
  }
  return outcomes
}
export function predictionMarketRecords(nodes: readonly GraphNode[]): PredictionContract[] {
  return nodes.filter(node => Object.keys(record(node.metadata.predictionMarket)).length > 0).map(node => {
    const data = record(node.metadata.predictionMarket), value = numeric(data.probability)
    const rawOutcomes = node.metadata.outcomes
    const parsedOutcomes = rawOutcomes === undefined ? [] : readPredictionOutcomes(rawOutcomes)
    return {
      id: node.id,
      title: node.title,
      topic: str(data.topic),
      probability: validProbability(value) ? value : null,
      date: str(data.resolutionDate),
      volume: numeric(data.volume),
      history: Array.isArray(data.history) ? data.history.filter((item): item is number => typeof item === 'number' && item >= 0 && item <= 1) : [],
      criteria: str(data.criteria),
      source: str(data.sourceUrl),
      sourceName: str(data.provider) || str(data.sourceName),
      asOf: str(data.asOf ?? data.observedAt),
      outcomes: parsedOutcomes ?? [],
      outcomeDataState: rawOutcomes === undefined ? 'absent' : parsedOutcomes === null ? 'invalid' : 'valid',
    }
  })
}
function probabilityPoints(values: readonly number[]): string {
  return values.map((value, index) => {
    const bounded = Math.max(0, Math.min(1, value))
    const x = values.length <= 1 ? 56 : 56 + index * 648 / (values.length - 1)
    const y = 196 - bounded * 156
    return `${x.toFixed(2)},${y.toFixed(2)}`
  }).join(' ')
}
export function contractHistoryPoints(history: readonly number[], side: 'yes' | 'no'): string {
  return probabilityPoints(history.map(value => side === 'yes' ? value : 1 - value))
}
export const PREDICTION_HISTORY_RANGES = [
  { id: '1h', label: '1H', durationMs: 60 * 60 * 1000 },
  { id: '6h', label: '6H', durationMs: 6 * 60 * 60 * 1000 },
  { id: '1d', label: '1D', durationMs: 24 * 60 * 60 * 1000 },
  { id: '1w', label: '1W', durationMs: 7 * 24 * 60 * 60 * 1000 },
  { id: '1m', label: '1M', durationMs: 30 * 24 * 60 * 60 * 1000 },
  { id: 'max', label: 'MAX', durationMs: null },
] as const
export type PredictionHistoryRange = typeof PREDICTION_HISTORY_RANGES[number]['id']
export function filterPredictionHistory(history: readonly PredictionHistoryPoint[], range: PredictionHistoryRange): PredictionHistoryPoint[] {
  const ordered = [...history].sort((left, right) => Date.parse(left.at) - Date.parse(right.at))
  const selected = PREDICTION_HISTORY_RANGES.find(item => item.id === range)
  if (ordered.length === 0 || selected?.durationMs == null) return ordered
  const end = Date.parse(ordered[ordered.length - 1]?.at ?? '')
  if (!Number.isFinite(end)) return []
  const start = end - selected.durationMs
  return ordered.filter(point => Date.parse(point.at) >= start)
}
export function predictionOutcomeView(contract: PredictionContract, index: number, range: PredictionHistoryRange) {
  const outcome = contract.outcomes[index] ?? contract.outcomes[0]
  if (outcome === undefined) return null
  const history = filterPredictionHistory(outcome.history, range)
  return { outcome, history, points: probabilityPoints(history.map(point => point.probability)) }
}
function formatHistoryTimestamp(value: string, range: PredictionHistoryRange, locale: string): string {
  const date = new Date(value)
  if (!Number.isFinite(date.getTime())) return '—'
  const options: Intl.DateTimeFormatOptions = range === '1h' || range === '6h' || range === '1d'
    ? { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'UTC' }
    : { month: 'short', day: 'numeric', timeZone: 'UTC' }
  return new Intl.DateTimeFormat(locale, options).format(date)
}
const contractSourceLabel = (contract: PredictionContract): string => {
  if (contract.sourceName) return contract.sourceName
  if (!contract.source) return '—'
  try { return new URL(contract.source).hostname } catch { return contract.source }
}
const contractVolume = (value: number | null): string => value === null ? '—' : `$${value.toLocaleString()}`
const contractProbability = (value: number | null): string => value === null ? '—' : `${(value * 100).toFixed(0)}%`
export function PredictionMarketDetail({ contract, related, demo, locale, onResearch, onBack, onSelect }: {
  readonly contract: PredictionContract
  readonly related: readonly PredictionContract[]
  readonly demo: boolean
  readonly locale?: string | undefined
  readonly onResearch: (question: string) => void
  readonly onBack: () => void
  readonly onSelect: (id: string) => void
}) {
  const zh = !locale || locale.startsWith('zh'), text = (cn: string, en: string) => zh ? cn : en
  const [side, setSide] = useState<'yes' | 'no'>('yes')
  const [selectedOutcomeIndex, setSelectedOutcomeIndex] = useState(0)
  const [historyRange, setHistoryRange] = useState<PredictionHistoryRange>('max')
  const probability = (value: number | null) => value === null ? '—' : `${(value * 100).toFixed(0)}%`
  const probabilityFor = (value: number | null, selected: 'yes' | 'no') => value === null ? null : selected === 'yes' ? value : 1 - value
  const multiOutcome = contract.outcomes.length > 1
  const outcomeView = multiOutcome ? predictionOutcomeView(contract, selectedOutcomeIndex, historyRange) : null
  const currentProbability = outcomeView?.outcome.probability ?? probabilityFor(contract.probability, side)
  const chartName = outcomeView?.outcome.name ?? (side === 'yes' ? 'Yes' : 'No')
  const points = outcomeView?.points ?? contractHistoryPoints(contract.history, side)
  const historyLength = outcomeView?.history.length ?? contract.history.length
  const sourceLabel = contractSourceLabel(contract)
  const hasSourceLink = /^https?:\/\//i.test(contract.source)
  return <section className="rg-event-detail dsh-events-prediction-detail" aria-labelledby="rg-prediction-detail-title">
    <header className="dsh-events-detail-head">
      <button type="button" className="dsh-events-detail-back" onClick={onBack}>
        <span aria-hidden="true">‹</span>{text('返回市场', 'Back to markets')}
      </button>
      <div className="dsh-events-detail-title-row">
        <div>
          <span className="dsh-events-detail-topic">{contract.topic || text(multiOutcome ? '多结果合约' : '二元合约', multiOutcome ? 'Multi-outcome contract' : 'Binary contract')}</span>
          <h3 id="rg-prediction-detail-title">{contract.title}</h3>
        </div>
        {!demo && <div className="dsh-events-detail-status">
          <i aria-hidden="true" />
          <span>{text('显式导入数据 · 实时状态未知', 'Explicitly imported data · live status unknown')}</span>
        </div>}
      </div>
      <div className="dsh-events-detail-facts">
        <span><strong>{text('成交量', 'Volume')}</strong>{contractVolume(contract.volume)}</span>
        <span><strong>{text('截止', 'Deadline')}</strong>{contract.date || '—'}</span>
        <span><strong>{text('数据源', 'Source')}</strong>{sourceLabel}</span>
      </div>
    </header>
    <div className="dsh-events-detail-layout">
      <div className="dsh-events-detail-primary">
        <div className="dsh-events-history-head">
          <div>
            <h4>{demo ? text('演示概率历史', 'Demo probability history') : text('已导入的概率历史', 'Imported probability history')}</h4>
            <p>{multiOutcome
              ? text('曲线只使用所选结果的显式时间戳记录。', 'The curve uses only timestamped records explicitly supplied for the selected outcome.')
              : text('曲线随下方所选结果切换；No 为 Yes 概率的反向序列。', 'The curve follows the selected outcome below; No is the inverse of the Yes series.')}</p>
          </div>
          <strong>{chartName} · {probability(currentProbability)}</strong>
        </div>
        {multiOutcome && <div className="dsh-events-history-ranges" role="group" aria-label={text('概率历史时间范围', 'Probability history range')}>
          {PREDICTION_HISTORY_RANGES.map(range => <button type="button" key={range.id} aria-pressed={historyRange === range.id} data-active={historyRange === range.id || undefined} onClick={() => setHistoryRange(range.id)}>{range.label}</button>)}
        </div>}
        {contract.outcomeDataState === 'invalid' && <p className="dsh-events-data-warning" role="status">{text('metadata.outcomes 结构无效，已忽略；继续显示原有二元字段。', 'metadata.outcomes did not match the supported shape and was ignored; the existing binary fields remain in use.')}</p>}
        {historyLength > 1
          ? <figure className="rg-contract-history dsh-events-contract-history">
            <figcaption className="dsh-events-sr-only">{text('概率历史图', 'Probability history')}: {chartName}</figcaption>
            <svg viewBox="0 0 720 232" role="img" aria-label={`${text('概率历史图', 'Probability history')} · ${chartName}`}>
              {[0, .25, .5, .75, 1].map(value => {
                const y = 196 - value * 156
                return <g key={value}><line className="dsh-events-chart-grid" x1="56" x2="704" y1={y} y2={y}/><text className="dsh-events-chart-axis-label" x="48" y={y + 4} textAnchor="end">{Math.round(value * 100)}%</text></g>
              })}
              <line className="dsh-events-chart-axis" x1="56" x2="56" y1="40" y2="196"/>
              <line className="dsh-events-chart-axis" x1="56" x2="704" y1="196" y2="196"/>
              <polyline points={points} data-side={multiOutcome ? 'outcome' : side} data-outcome={outcomeView?.outcome.name} vectorEffect="non-scaling-stroke"/>
              <text className="dsh-events-chart-axis-label" x="56" y="220" textAnchor="start">{outcomeView?.history[0] ? formatHistoryTimestamp(outcomeView.history[0].at, historyRange, locale ?? 'en-US') : text('最早记录', 'First')}</text>
              <text className="dsh-events-chart-axis-label" x="380" y="220" textAnchor="middle">{text('历史中段', 'Midpoint')}</text>
              <text className="dsh-events-chart-axis-label" x="704" y="220" textAnchor="end">{outcomeView?.history.at(-1) ? formatHistoryTimestamp(outcomeView.history.at(-1)?.at ?? '', historyRange, locale ?? 'en-US') : text('最新记录', 'Latest')}</text>
            </svg>
          </figure>
          : <p className="dsh-events-contract-history-empty" role="status" data-state="empty">{multiOutcome
            ? (outcomeView?.outcome.history.length ?? 0) > 0
              ? text('所选时间范围内没有足够的显式时间戳记录。', 'Not enough timestamped records exist in the selected range.')
              : text('所选结果没有显式时间戳历史。', 'No timestamped probability history is available for the selected outcome.')
            : text('尚无概率历史。', 'No probability history available.')}</p>}
        <div className="rg-event-actions dsh-events-contract-outcomes" role="group" aria-label={text('选择结果', 'Select outcome')} data-outcome-count={multiOutcome ? contract.outcomes.length : 2}>
          {multiOutcome
            ? contract.outcomes.map((outcome, index) => <button type="button" className="dsh-events-contract-outcome-button" key={`${outcome.name}:${index}`} aria-pressed={selectedOutcomeIndex === index} data-selected={selectedOutcomeIndex === index || undefined} onClick={() => setSelectedOutcomeIndex(index)}>
              <span>{outcome.name} · {probability(outcome.probability)}</span>
              <i aria-hidden="true"><b style={{ width: `${outcome.probability * 100}%` }}/></i>
            </button>)
            : (['yes', 'no'] as const).map(value => {
              const outcomeProbability = probabilityFor(contract.probability, value)
              return <button type="button" className="dsh-events-contract-outcome-button" key={value} aria-pressed={side === value} data-selected={side === value || undefined} onClick={() => setSide(value)}>
                <span>{value === 'yes' ? 'Yes' : 'No'} · {probability(outcomeProbability)}</span>
                <i aria-hidden="true"><b style={{ width: `${(outcomeProbability ?? 0) * 100}%` }}/></i>
              </button>
            })}
        </div>
        <div className="dsh-events-resolution">
          <h4>{text('结算条件', 'Resolution criteria')}</h4>
          <p>{contract.criteria || '—'}</p>
        </div>
        <div className="rg-event-actions dsh-events-contract-actions">
          <button type="button" className="rg-btn" data-primary onClick={() => onResearch(`Research the event: ${contract.title}. Verify original sources and contract resolution rules. Do not use synthetic UI probabilities or volume as evidence.${demo ? '' : ` Imported external contract node: ${contract.id}.`}`)}>{text('研究这个事件', 'Research this event')}</button>
          <button type="button" className="rg-btn" onClick={onBack}>{text('关闭详情', 'Close details')}</button>
        </div>
      </div>
      <aside className="dsh-events-detail-aside">
        <section className="dsh-events-contract-sidebar">
          <div className="dsh-events-detail-aside-head">
            <h4>{text('合约元数据', 'Contract details')}</h4>
            {hasSourceLink && <a href={contract.source} target="_blank" rel="noreferrer">{text('查看原始合约', 'Open source')}</a>}
          </div>
          <dl className="dsh-events-contract">
            <div><dt>{text('类型', 'Type')}</dt><dd>{multiOutcome ? text(`多结果 · ${contract.outcomes.length} 项`, `Multi-outcome · ${contract.outcomes.length} entries`) : text('二元 · Yes / No', 'Binary · Yes / No')}</dd></div>
            <div><dt>{text('提供方', 'Provider')}</dt><dd>{sourceLabel}</dd></div>
            <div><dt>{text('成交量', 'Volume')}</dt><dd>{contractVolume(contract.volume)}</dd></div>
            <div><dt>{text('结束日期', 'End date')}</dt><dd>{contract.date || '—'}</dd></div>
            <div><dt>{text('数据状态', 'Data status')}</dt><dd>{demo ? text('合成演示', 'Synthetic demo') : text('显式导入', 'Imported')}</dd></div>
            <div><dt>{text('观测时间', 'Observed')}</dt><dd>{contract.asOf || '—'}</dd></div>
          </dl>
        </section>
        <section className="dsh-events-more-markets">
          <h4>{text('更多预测市场', 'More markets')}</h4>
          <div>
            {related.length > 0 ? related.slice(0, 3).map(item => <button type="button" className="rg-contract-card dsh-events-more-card" key={item.id} onClick={() => onSelect(item.id)}>
              <small>{item.topic || text(item.outcomes.length > 1 ? '多结果合约' : '二元合约', item.outcomes.length > 1 ? 'Multi-outcome contract' : 'Binary contract')}</small>
              <strong>{item.title}</strong>
              <span><b>{item.outcomes[0]?.name || 'Yes'}</b><span>{probability(item.outcomes[0]?.probability ?? item.probability)}</span></span>
              <footer>{contractVolume(item.volume)} · {item.date || '—'}</footer>
            </button>) : <p>{text('暂无更多合约。', 'No more contracts.')}</p>}
          </div>
        </section>
      </aside>
    </div>
  </section>
}
export function PredictionMarketsPanel({ nodes, demo, locale, onResearch }: Props) {
  const zh = !locale || locale.startsWith('zh'), text = (cn: string, en: string) => zh ? cn : en
  const [topic, setTopic] = useState(''), [query, setQuery] = useState(''), [selected, setSelected] = useState<string | null>(null)
  const all = demo ? predictionMarketDemoContracts : predictionMarketRecords(nodes)
  const rows = all.filter(row => (!topic || row.topic === topic) && row.title.toLowerCase().includes(query.toLowerCase()))
  const active = all.find(row => row.id === selected)
  const probability = (value: number | null) => value === null ? '—' : `${(value * 100).toFixed(0)}%`
  const selectContract = (id: string) => setSelected(id)
  useEffect(() => {
    if (selected !== null && active === undefined) setSelected(null)
  }, [active, selected])
  if (active !== undefined) return <section className="rg-pf-panel dsh-events dsh-events-prediction">
    <PredictionMarketDetail key={active.id} contract={active} related={all.filter(row => row.id !== active.id)} demo={demo} locale={locale} onResearch={onResearch} onBack={() => setSelected(null)} onSelect={selectContract}/>
  </section>
  return <section className="rg-pf-panel dsh-events"><h2>{text('预测市场', 'Prediction markets')}</h2>{!demo && <p className="rg-discovery-source">{text('仅显示显式导入的外部合约；与你的个人投资预测分开。', 'Explicitly imported external contracts, separate from your personal investment predictions.')}</p>}<div className="dsh-events-controls"><input type="search" aria-label={text('搜索预测市场', 'Search prediction markets')} placeholder={text('搜索事件', 'Search events')} value={query} onChange={event => setQuery(event.target.value)}/><div className="dsh-events-chips">{['', ...new Set(all.map(row => row.topic).filter(Boolean))].map(value => <button type="button" className="dsh-events-chip" key={value} data-active={topic === value || undefined} aria-pressed={topic === value} onClick={() => setTopic(value)}>{value || text('全部', 'All')}</button>)}</div></div><div className="rg-contract-grid">{rows.map(row => <button type="button" className="rg-contract-card" key={row.id} aria-expanded={selected === row.id} onClick={() => setSelected(current => current === row.id ? null : row.id)}><small>{row.topic}</small><h3>{row.title}</h3>{row.outcomes.length > 1 ? <div className="dsh-events-contract-summary">{row.outcomes.slice(0, 3).map((outcome, index) => <div key={`${outcome.name}:${index}`}><div className="rg-contract-outcome"><span>{outcome.name}</span><strong>{probability(outcome.probability)}</strong></div><div className="rg-contract-bar"><i style={{ width: `${outcome.probability * 100}%` }}/></div></div>)}</div> : <><div className="rg-contract-outcome"><span>Yes</span><strong>{contractProbability(row.probability)}</strong></div><div className="rg-contract-bar"><i style={{ width: `${(row.probability ?? 0) * 100}%` }}/></div><div className="rg-contract-outcome"><span>No</span><span>{contractProbability(row.probability === null ? null : 1 - row.probability)}</span></div></>}<footer>{row.volume === null ? '—' : `$${row.volume.toLocaleString()}`} {text('成交量', 'volume')}<span>{row.date || '—'}</span></footer></button>)}</div>{rows.length === 0 && <div className="rg-event-empty">{text('暂无匹配的外部合约。', 'No matching external contracts.')}</div>}
  </section>
}
