export interface MarketBar {
  readonly timestamp: string
  readonly open: number | null
  readonly high: number | null
  readonly low: number | null
  readonly close: number | null
  readonly volume: number | null
  readonly adjustedClose: number | null
}

export interface AggregatedMarketBar extends MarketBar {
  readonly startTimestamp: string
  readonly endTimestamp: string
  readonly count: number
}

export interface MarketHistory {
  readonly symbol: string | null
  readonly currency: string | null
  readonly bars: readonly MarketBar[]
}

export interface CalibrationBin {
  readonly predictedMean: number
  readonly observedFrequency: number
  readonly count: number
  readonly lower: number | null
  readonly upper: number | null
}

export interface PortfolioReturnPoint {
  readonly timestamp: string
  readonly value: number | null
}

function record(value: unknown): Record<string, unknown> | undefined {
  return typeof value === 'object' && value !== null && !Array.isArray(value) ? value as Record<string, unknown> : undefined
}

function finite(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

function text(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null
}

function unwrap(value: unknown): unknown {
  const object = record(value)
  return object !== undefined && object.result !== undefined ? object.result : value
}

function historyRecord(value: unknown, depth = 0): Record<string, unknown> | undefined {
  if (depth > 7) return undefined
  const object = record(value)
  if (object === undefined) return undefined
  if (Array.isArray(object.bars)) return object
  for (const key of ['data', 'quote', 'history', 'result']) {
    const found = historyRecord(object[key], depth + 1)
    if (found !== undefined) return found
  }
  if (Array.isArray(object.items)) {
    for (const item of object.items) {
      const found = historyRecord(item, depth + 1)
      if (found !== undefined) return found
    }
  }
  return undefined
}

export function readMarketHistory(value: unknown): MarketHistory {
  const source = historyRecord(unwrap(value))
  if (source === undefined) return { symbol: null, currency: null, bars: [] }
  const bars = (source.bars as unknown[]).flatMap(entry => {
    const bar = record(entry)
    const timestamp = text(bar?.timestamp)
    if (bar === undefined || timestamp === null || !Number.isFinite(Date.parse(timestamp))) return []
    return [{
      timestamp,
      open: finite(bar.open),
      high: finite(bar.high),
      low: finite(bar.low),
      close: finite(bar.close),
      volume: finite(bar.volume),
      adjustedClose: finite(bar.adjustedClose),
    }]
  })
  return { symbol: text(source.symbol), currency: text(source.currency), bars }
}

export function readQuote(value: unknown): Record<string, unknown> | undefined {
  const root = record(unwrap(value))
  if (root === undefined) return undefined
  const items = Array.isArray(root.items) ? root.items : []
  for (const item of items) {
    const data = record(record(item)?.data)
    if (data?.regularMarketPrice !== undefined) return data
  }
  for (const candidate of [root.quote, root.data, root]) {
    const data = record(candidate)
    if (data?.regularMarketPrice !== undefined) return data
  }
  return undefined
}

export function aggregateMarketBars(bars: readonly MarketBar[], maximumPoints = 160): readonly AggregatedMarketBar[] {
  const limit = Math.max(1, Math.floor(maximumPoints))
  const bucketSize = Math.max(1, Math.ceil(bars.length / limit))
  const aggregated: AggregatedMarketBar[] = []
  for (let start = 0; start < bars.length; start += bucketSize) {
    const bucket = bars.slice(start, start + bucketSize)
    const first = bucket[0]
    const last = bucket.at(-1)
    if (first === undefined || last === undefined) continue
    const numbers = (select: (bar: MarketBar) => number | null): number[] => bucket.map(select).filter((entry): entry is number => entry !== null)
    const opens = numbers(bar => bar.open)
    const highs = numbers(bar => bar.high)
    const lows = numbers(bar => bar.low)
    const closes = numbers(bar => bar.close)
    const adjusted = numbers(bar => bar.adjustedClose)
    const volumes = numbers(bar => bar.volume)
    aggregated.push({
      timestamp: last.timestamp,
      startTimestamp: first.timestamp,
      endTimestamp: last.timestamp,
      count: bucket.length,
      open: opens[0] ?? null,
      high: highs.length === 0 ? null : Math.max(...highs),
      low: lows.length === 0 ? null : Math.min(...lows),
      close: closes.at(-1) ?? null,
      adjustedClose: adjusted.at(-1) ?? null,
      volume: volumes.length === 0 ? null : volumes.reduce((sum, entry) => sum + entry, 0),
    })
  }
  return aggregated
}

export function lineSegments(values: readonly (number | null)[]): readonly (readonly number[])[] {
  const segments: number[][] = []
  let current: number[] = []
  values.forEach((value, index) => {
    if (value === null || !Number.isFinite(value)) {
      if (current.length > 0) segments.push(current)
      current = []
      return
    }
    current.push(index)
  })
  if (current.length > 0) segments.push(current)
  return segments
}

export function nextChartIndex(current: number | null, key: string, count: number): number | null {
  if (count <= 0) return null
  if (key === 'Home') return 0
  if (key === 'End') return count - 1
  if (key === 'Escape') return null
  if (key === 'ArrowLeft') return current === null ? count - 1 : Math.max(0, current - 1)
  if (key === 'ArrowRight') return current === null ? 0 : Math.min(count - 1, current + 1)
  return current
}

export function pointerChartIndex(clientX: number, left: number, width: number, count: number): number | null {
  if (count <= 0 || width <= 0 || !Number.isFinite(clientX)) return null
  const ratio = Math.max(0, Math.min(1, (clientX - left) / width))
  return Math.min(count - 1, Math.max(0, Math.round(ratio * (count - 1))))
}

export function nextMatrixIndex(current: number, key: string, rowCount: number, columnCount: number): number | undefined {
  const count = rowCount * columnCount
  if (count <= 0 || current < 0 || current >= count) return undefined
  if (key === 'Home') return 0
  if (key === 'End') return count - 1
  if (key === 'ArrowLeft') return current % columnCount === 0 ? current : current - 1
  if (key === 'ArrowRight') return current % columnCount === columnCount - 1 ? current : current + 1
  if (key === 'ArrowUp') return Math.max(0, current - columnCount)
  if (key === 'ArrowDown') return Math.min(count - 1, current + columnCount)
  return undefined
}

export function readCalibration(value: unknown): { readonly bins: readonly CalibrationBin[]; readonly brierScore: number | null } {
  const root = record(unwrap(value))
  const calibration = record(root?.calibration)
  const rawBins = calibration?.bins ?? root?.calibrationBins
  const bins = Array.isArray(rawBins) ? rawBins.flatMap(entry => {
    const bin = record(entry)
    const predictedMean = finite(bin?.predictedMean ?? bin?.meanPredictedProbability ?? bin?.avgConfidence)
    const observedFrequency = finite(bin?.observedFrequency ?? bin?.actualFrequency ?? bin?.accuracy)
    const count = finite(bin?.count ?? bin?.size)
    if (predictedMean === null || observedFrequency === null || count === null || count < 0
      || predictedMean < 0 || predictedMean > 1 || observedFrequency < 0 || observedFrequency > 1) return []
    return [{
      predictedMean,
      observedFrequency,
      count,
      lower: finite(bin?.lower ?? bin?.binLower),
      upper: finite(bin?.upper ?? bin?.binUpper),
    }]
  }) : []
  return { bins, brierScore: finite(root?.brierScore) }
}

export function readPortfolioReturns(value: unknown): readonly PortfolioReturnPoint[] {
  const root = record(unwrap(value))
  if (!Array.isArray(root?.returns)) return []
  return root.returns.flatMap(entry => {
    const point = record(entry)
    if (point === undefined) return []
    const timestamp = text(point.timestamp ?? point.asOf)
    if (timestamp === null || !Number.isFinite(Date.parse(timestamp))) return []
    const rawValue = point.return ?? point.value
    return [{ timestamp, value: rawValue === null ? null : finite(rawValue) }]
  })
}
