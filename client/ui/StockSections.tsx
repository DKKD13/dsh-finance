import { useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import type { GraphNode } from '../../src/graph.ts'

export type StockSection = 'financials' | 'earnings' | 'holders' | 'forecast' | 'analysis'
type FinancialPeriodMode = 'annual' | 'quarter' | 'ttm'
type FinancialUnit = 'thousands' | 'millions' | 'billions'
type FinancialCategory = 'keyStats' | 'income' | 'balance' | 'cashFlow' | 'segments' | 'adjusted' | 'ratios'
type MetricFormat = 'currency' | 'percent' | 'number' | 'eps'

interface StockSectionsProps {
  readonly section: StockSection
  readonly symbol: string
  readonly nodes: readonly GraphNode[]
  readonly locale?: string | undefined
  readonly onResearch?: ((question: string) => void) | undefined
  readonly demo?: boolean
  readonly panelId?: string | undefined
  readonly labelledBy?: string | undefined
  readonly hidden?: boolean
}

interface FinancialPeriod {
  readonly id: string
  readonly label: string
  readonly values: Record<string, unknown>
  readonly sourceId?: string
}

interface FinancialData {
  readonly unit: FinancialUnit
  readonly currency: string
  readonly annual: readonly FinancialPeriod[]
  readonly quarter: readonly FinancialPeriod[]
  readonly ttm: readonly FinancialPeriod[]
}

interface FinancialMetric {
  readonly key: string
  readonly aliases?: readonly string[]
  readonly en: string
  readonly zh: string
  readonly format: MetricFormat
  readonly subrow?: boolean
}

interface EarningsRecord {
  readonly id: string
  readonly label: string
  readonly date: string | null
  readonly revenueActual: number | null
  readonly revenueEstimate: number | null
  readonly epsActual: number | null
  readonly epsEstimate: number | null
  readonly revenueSurprise: number | null
  readonly epsSurprise: number | null
  readonly summary: string | null
  readonly transcript: string | null
  readonly documentUrl: string | null
  readonly sourceId: string | null
}

type HolderCategory = 'institutional' | 'insider' | 'political'

interface HolderRecord {
  readonly id: string
  readonly category: HolderCategory
  readonly manager: string | null
  readonly filedAt: string | null
  readonly shares: number | null
  readonly value: number | null
  readonly change: number | null
  readonly sourceId: string | null
}

interface ForecastRecord {
  readonly id: string
  readonly question: string | null
  readonly yes: number | null
  readonly no: number | null
  readonly volume: number | null
  readonly summary: string | null
  readonly source: string | null
  readonly asOf: string | null
  readonly url: string | null
}

interface AnalystRating {
  readonly id: string
  readonly firm: string | null
  readonly analyst: string | null
  readonly rating: string | null
  readonly target: number | null
  readonly previousTarget: number | null
  readonly upside: number | null
  readonly date: string | null
}

interface AnalystReport {
  readonly id: string
  readonly title: string | null
  readonly publisher: string | null
  readonly date: string | null
  readonly outlook: string | null
  readonly url: string | null
}

interface AnalystData {
  readonly consensus: string | null
  readonly bullish: number | null
  readonly neutral: number | null
  readonly bearish: number | null
  readonly analystCount: number | null
  readonly targetLow: number | null
  readonly targetAverage: number | null
  readonly targetCurrent: number | null
  readonly targetHigh: number | null
  readonly ratings: readonly AnalystRating[]
  readonly reports: readonly AnalystReport[]
  readonly sourceIds: readonly string[]
}

const EMPTY = '—'
const FINANCIAL_CATEGORIES: readonly { id: FinancialCategory; en: string; zh: string }[] = [
  { id: 'keyStats', en: 'Key stats', zh: '关键统计数据' },
  { id: 'income', en: 'Income statement', zh: '损益表' },
  { id: 'balance', en: 'Balance sheet', zh: '资产负债表' },
  { id: 'cashFlow', en: 'Cash flow', zh: '现金流' },
  { id: 'segments', en: 'Segments & KPI', zh: '分部和 KPI' },
  { id: 'adjusted', en: 'Adjusted', zh: '调整后' },
  { id: 'ratios', en: 'Ratios', zh: '比率' },
]

const FINANCIAL_METRICS: Record<FinancialCategory, readonly FinancialMetric[]> = {
  keyStats: [
    { key: 'marketCap', en: 'Market cap', zh: '市值', format: 'currency' },
    { key: 'cash', en: 'Cash', zh: '现金', format: 'currency', subrow: true },
    { key: 'debt', aliases: ['totalDebt'], en: 'Debt', zh: '债务', format: 'currency', subrow: true },
    { key: 'enterpriseValue', en: 'Enterprise value', zh: '企业价值', format: 'currency' },
    { key: 'revenue', en: 'Revenue', zh: '收入', format: 'currency' },
    { key: 'revenueGrowth', en: '% growth', zh: '同比增速', format: 'percent', subrow: true },
    { key: 'grossProfit', en: 'Gross profit', zh: '毛利润', format: 'currency' },
    { key: 'grossMargin', en: '% margin', zh: '毛利率', format: 'percent', subrow: true },
    { key: 'ebitda', en: 'EBITDA', zh: 'EBITDA', format: 'currency' },
    { key: 'ebitdaMargin', en: 'EBITDA margin', zh: 'EBITDA 利润率', format: 'percent', subrow: true },
    { key: 'netIncome', en: 'Net income', zh: '净利润', format: 'currency' },
    { key: 'netMargin', en: '% margin', zh: '净利率', format: 'percent', subrow: true },
    { key: 'dilutedEPS', en: 'Diluted EPS', zh: '摊薄每股收益', format: 'eps' },
    { key: 'epsGrowth', en: '% growth', zh: 'EPS 增速', format: 'percent', subrow: true },
  ],
  income: [
    { key: 'revenue', en: 'Revenue', zh: '收入', format: 'currency' },
    { key: 'costOfRevenue', en: 'Cost of revenue', zh: '营业成本', format: 'currency' },
    { key: 'grossProfit', en: 'Gross profit', zh: '毛利润', format: 'currency' },
    { key: 'operatingExpenses', en: 'Operating expenses', zh: '运营费用', format: 'currency' },
    { key: 'operatingIncome', en: 'Operating income', zh: '营业利润', format: 'currency' },
    { key: 'pretaxIncome', en: 'Pretax income', zh: '税前利润', format: 'currency' },
    { key: 'netIncome', en: 'Net income', zh: '净利润', format: 'currency' },
    { key: 'dilutedEPS', en: 'Diluted EPS', zh: '摊薄每股收益', format: 'eps' },
  ],
  balance: [
    { key: 'totalAssets', en: 'Total assets', zh: '总资产', format: 'currency' },
    { key: 'currentAssets', en: 'Current assets', zh: '流动资产', format: 'currency' },
    { key: 'cash', en: 'Cash & equivalents', zh: '现金及等价物', format: 'currency' },
    { key: 'receivables', en: 'Receivables', zh: '应收账款', format: 'currency' },
    { key: 'inventory', en: 'Inventory', zh: '存货', format: 'currency' },
    { key: 'totalLiabilities', en: 'Total liabilities', zh: '总负债', format: 'currency' },
    { key: 'currentLiabilities', en: 'Current liabilities', zh: '流动负债', format: 'currency' },
    { key: 'totalDebt', en: 'Total debt', zh: '总债务', format: 'currency' },
    { key: 'equity', en: 'Shareholders’ equity', zh: '股东权益', format: 'currency' },
  ],
  cashFlow: [
    { key: 'operatingCashFlow', en: 'Operating cash flow', zh: '经营现金流', format: 'currency' },
    { key: 'capex', en: 'Capital expenditure', zh: '资本开支', format: 'currency' },
    { key: 'freeCashFlow', en: 'Free cash flow', zh: '自由现金流', format: 'currency' },
    { key: 'investingCashFlow', en: 'Investing cash flow', zh: '投资现金流', format: 'currency' },
    { key: 'financingCashFlow', en: 'Financing cash flow', zh: '融资现金流', format: 'currency' },
    { key: 'netCashChange', en: 'Net cash change', zh: '现金净变动', format: 'currency' },
  ],
  segments: [
    { key: 'iphoneRevenue', en: 'iPhone revenue', zh: 'iPhone 收入', format: 'currency' },
    { key: 'macRevenue', en: 'Mac revenue', zh: 'Mac 收入', format: 'currency' },
    { key: 'ipadRevenue', en: 'iPad revenue', zh: 'iPad 收入', format: 'currency' },
    { key: 'wearablesRevenue', en: 'Wearables & home', zh: '可穿戴及家居', format: 'currency' },
    { key: 'servicesRevenue', en: 'Services revenue', zh: '服务收入', format: 'currency' },
    { key: 'activeDevices', en: 'Active devices', zh: '活跃设备数', format: 'number' },
    { key: 'paidSubscriptions', en: 'Paid subscriptions', zh: '付费订阅数', format: 'number' },
  ],
  adjusted: [
    { key: 'adjustedRevenue', en: 'Adjusted revenue', zh: '调整后收入', format: 'currency' },
    { key: 'adjustedGrossProfit', en: 'Adjusted gross profit', zh: '调整后毛利润', format: 'currency' },
    { key: 'adjustedOperatingIncome', en: 'Adjusted operating income', zh: '调整后营业利润', format: 'currency' },
    { key: 'adjustedNetIncome', en: 'Adjusted net income', zh: '调整后净利润', format: 'currency' },
    { key: 'adjustedEPS', en: 'Adjusted EPS', zh: '调整后每股收益', format: 'eps' },
  ],
  ratios: [
    { key: 'grossMargin', en: 'Gross margin', zh: '毛利率', format: 'percent' },
    { key: 'operatingMargin', en: 'Operating margin', zh: '营业利润率', format: 'percent' },
    { key: 'netMargin', en: 'Net margin', zh: '净利率', format: 'percent' },
    { key: 'currentRatio', en: 'Current ratio', zh: '流动比率', format: 'number' },
    { key: 'debtToEquity', en: 'Debt / equity', zh: '债务权益比', format: 'number' },
    { key: 'returnOnEquity', en: 'Return on equity', zh: '净资产收益率', format: 'percent' },
    { key: 'peRatio', en: 'P / E', zh: '市盈率', format: 'number' },
    { key: 'priceToSales', en: 'Price / sales', zh: '市销率', format: 'number' },
  ],
}

function record(value: unknown): Record<string, unknown> | undefined {
  return typeof value === 'object' && value !== null && !Array.isArray(value) ? value as Record<string, unknown> : undefined
}

function values(value: unknown): readonly unknown[] {
  return Array.isArray(value) ? value : []
}

function stringValue(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null
}

function numberValue(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  const object = record(value)
  return typeof object?.value === 'number' && Number.isFinite(object.value) ? object.value : null
}

function text(locale: string | undefined, en: string, zh: string): string {
  return locale?.toLowerCase().startsWith('zh') ? zh : en
}

function formatNumber(value: number | null, locale?: string, digits = 2): string {
  return value === null || !Number.isFinite(value) ? EMPTY : new Intl.NumberFormat(locale, { maximumFractionDigits: digits }).format(value)
}

function formatCurrency(value: number | null, currency: string, locale?: string): string {
  if (value === null || !Number.isFinite(value)) return EMPTY
  const formatted = new Intl.NumberFormat(locale, { maximumFractionDigits: 2 }).format(value)
  return `${currency === 'USD' ? 'US$' : `${currency} `}${formatted}`
}

function matchingNodes(nodes: readonly GraphNode[], symbol: string): readonly GraphNode[] {
  const normalized = symbol.trim().toUpperCase()
  if (normalized.length === 0) return []
  return nodes.filter(node => {
    const metadata = record(node.metadata)
    const explicit = stringValue(metadata?.symbol) ?? stringValue(metadata?.ticker) ?? stringValue(record(metadata?.instrument)?.symbol)
    return explicit?.toUpperCase() === normalized
  })
}

function periodCollection(financials: Record<string, unknown>, mode: FinancialPeriodMode): readonly unknown[] {
  const direct = values(financials[mode])
  if (direct.length > 0) return direct
  return values(financials.periods).filter(entry => stringValue(record(entry)?.periodType)?.toLowerCase() === mode)
}

function readFinancialPeriods(raw: readonly unknown[], mode: FinancialPeriodMode): readonly FinancialPeriod[] {
  return raw.flatMap((entry, index) => {
    const object = record(entry)
    if (object === undefined) return []
    const valueRecord = record(object.values) ?? record(object.metrics) ?? object
    const id = stringValue(object.id) ?? stringValue(object.period) ?? stringValue(object.endDate) ?? `${mode}-${index}`
    const label = stringValue(object.label) ?? stringValue(object.period) ?? stringValue(object.endDate) ?? id
    return [{
      id,
      label,
      values: valueRecord,
      ...(stringValue(object.sourceId) === null ? {} : { sourceId: stringValue(object.sourceId) as string }),
    }]
  })
}

function readFinancials(nodes: readonly GraphNode[], symbol: string): { readonly data: FinancialData | null; readonly connected: boolean } {
  const matched = matchingNodes(nodes, symbol)
  for (const node of matched) {
    const metadata = node.metadata
    const financials = record(metadata.financials)
    if (financials === undefined) continue
    const units = record(metadata.units)
    const rawUnit = stringValue(financials.unit) ?? stringValue(units?.financials)
    const unit: FinancialUnit = rawUnit === 'thousands' || rawUnit === 'millions' || rawUnit === 'billions' ? rawUnit : 'millions'
    return {
      connected: true,
      data: {
        unit,
        currency: stringValue(financials.currency) ?? stringValue(metadata.currency) ?? 'USD',
        annual: readFinancialPeriods(periodCollection(financials, 'annual'), 'annual'),
        quarter: readFinancialPeriods(periodCollection(financials, 'quarter'), 'quarter'),
        ttm: readFinancialPeriods(periodCollection(financials, 'ttm'), 'ttm'),
      },
    }
  }
  return { data: null, connected: matched.some(node => node.metadata.financials !== undefined) }
}

function readEarnings(nodes: readonly GraphNode[], symbol: string): readonly EarningsRecord[] {
  return matchingNodes(nodes, symbol).flatMap(node => {
    const raw = node.metadata.earnings
    const entries = Array.isArray(raw) ? raw : raw === undefined ? [] : [raw]
    return entries.flatMap((entry, index) => {
      const object = record(entry)
      if (object === undefined) return []
      const estimate = record(object.estimate)
      const actual = record(object.actual)
      const surprise = record(object.surprise)
      return [{
        id: stringValue(object.id) ?? `${node.id}:earnings:${index}`,
        label: stringValue(object.label) ?? stringValue(object.period) ?? stringValue(object.fiscalQuarter) ?? `Q${index + 1}`,
        date: stringValue(object.date) ?? stringValue(object.asOf),
        revenueActual: numberValue(actual?.revenue ?? object.revenueActual),
        revenueEstimate: numberValue(estimate?.revenue ?? object.revenueEstimate),
        epsActual: numberValue(actual?.eps ?? object.epsActual),
        epsEstimate: numberValue(estimate?.eps ?? object.epsEstimate),
        revenueSurprise: numberValue(surprise?.revenue ?? object.revenueSurprise),
        epsSurprise: numberValue(surprise?.eps ?? object.epsSurprise),
        summary: stringValue(object.summary) ?? stringValue(object.preview),
        transcript: stringValue(object.transcript) ?? stringValue(object.transcriptUrl),
        documentUrl: stringValue(object.documentUrl) ?? stringValue(object.sourceUrl),
        sourceId: stringValue(object.sourceId) ?? node.id,
      }]
    })
  })
}

function holderCategory(value: unknown): HolderCategory {
  const normalized = stringValue(value)?.toLowerCase()
  return normalized === 'insider' || normalized === 'internal' ? 'insider'
    : normalized === 'political' || normalized === 'politician' ? 'political'
      : 'institutional'
}

function readHolders(nodes: readonly GraphNode[], symbol: string): readonly HolderRecord[] {
  return matchingNodes(nodes, symbol).flatMap(node => {
    const raw = node.metadata.holdings
    if (Array.isArray(raw)) {
      return raw.flatMap((entry, index) => {
        const object = record(entry)
        if (object === undefined) return []
        return [{
          id: stringValue(object.id) ?? `${node.id}:holder:${index}`,
          category: holderCategory(object.category ?? object.type),
          manager: stringValue(object.manager) ?? stringValue(object.holder) ?? stringValue(object.name),
          filedAt: stringValue(object.filedAt) ?? stringValue(object.filingDate),
          shares: numberValue(object.shares),
          value: numberValue(object.value),
          change: numberValue(object.change),
          sourceId: stringValue(object.sourceId) ?? node.id,
        }]
      })
    }
    const grouped = record(raw)
    if (grouped === undefined) return []
    return (['institutional', 'insider', 'political'] as const).flatMap(category => values(grouped[category]).flatMap((entry, index) => {
      const object = record(entry)
      if (object === undefined) return []
      return [{
        id: stringValue(object.id) ?? `${node.id}:${category}:${index}`,
        category,
        manager: stringValue(object.manager) ?? stringValue(object.holder) ?? stringValue(object.name),
        filedAt: stringValue(object.filedAt) ?? stringValue(object.filingDate),
        shares: numberValue(object.shares),
        value: numberValue(object.value),
        change: numberValue(object.change),
        sourceId: stringValue(object.sourceId) ?? node.id,
      }]
    }))
  })
}

function readForecastMarkets(nodes: readonly GraphNode[], symbol: string): readonly ForecastRecord[] {
  const matched = matchingNodes(nodes, symbol)
  const explicit = matched.flatMap(node => {
    const estimates = record(node.metadata.estimates)
    const raw = estimates?.forecastMarkets ?? estimates?.markets ?? estimates?.predictions ?? node.metadata.forecastMarkets
    return values(raw).flatMap((entry, index) => {
      const object = record(entry)
      if (object === undefined) return []
      return [{
        id: stringValue(object.id) ?? `${node.id}:forecast:${index}`,
        question: stringValue(object.question) ?? stringValue(object.title),
        yes: numberValue(object.yes) ?? numberValue(object.yesProbability),
        no: numberValue(object.no) ?? numberValue(object.noProbability),
        volume: numberValue(object.volume),
        summary: stringValue(object.summary) ?? stringValue(object.content),
        source: stringValue(object.source) ?? stringValue(object.provider),
        asOf: stringValue(object.asOf) ?? stringValue(object.date),
        url: stringValue(object.url) ?? stringValue(object.canonicalUrl),
      }]
    })
  })
  const predictions = matched.filter(node => node.kind === 'prediction').map(node => {
    const metadata = node.metadata
    return {
      id: node.id,
      question: node.title,
      yes: numberValue(metadata.yes) ?? numberValue(metadata.yesProbability),
      no: numberValue(metadata.no) ?? numberValue(metadata.noProbability),
      volume: numberValue(metadata.volume),
      summary: node.content || null,
      source: stringValue(metadata.provider) ?? stringValue(metadata.source),
      asOf: stringValue(metadata.asOf),
      url: stringValue(metadata.canonicalUrl) ?? stringValue(metadata.url),
    }
  })
  const unique = new Map<string, ForecastRecord>()
  for (const item of [...explicit, ...predictions]) unique.set(item.id, item)
  return [...unique.values()]
}

function readAnalysis(nodes: readonly GraphNode[], symbol: string): AnalystData {
  const matched = matchingNodes(nodes, symbol)
  const objects = matched.flatMap(node => {
    const estimates = record(node.metadata.estimates)
    return estimates === undefined ? [] : [{ node, estimates }]
  })
  const first = objects[0]?.estimates
  const consensus = record(first?.consensus)
  const targets = record(first?.targets) ?? record(first?.priceTargets)
  const ratings = objects.flatMap(({ node, estimates }) => values(estimates.ratings).flatMap((entry, index) => {
    const object = record(entry)
    if (object === undefined) return []
    return [{
      id: stringValue(object.id) ?? `${node.id}:rating:${index}`,
      firm: stringValue(object.firm) ?? stringValue(object.institution),
      analyst: stringValue(object.analyst),
      rating: stringValue(object.rating),
      target: numberValue(object.target) ?? numberValue(object.priceTarget),
      previousTarget: numberValue(object.previousTarget),
      upside: numberValue(object.upside),
      date: stringValue(object.date) ?? stringValue(object.asOf),
    }]
  }))
  const reports = objects.flatMap(({ node, estimates }) => values(estimates.reports).flatMap((entry, index) => {
    const object = record(entry)
    if (object === undefined) return []
    return [{
      id: stringValue(object.id) ?? `${node.id}:report:${index}`,
      title: stringValue(object.title),
      publisher: stringValue(object.publisher) ?? stringValue(object.provider),
      date: stringValue(object.date) ?? stringValue(object.asOf),
      outlook: stringValue(object.outlook),
      url: stringValue(object.url) ?? stringValue(object.canonicalUrl),
    }]
  }))
  return {
    consensus: stringValue(consensus?.recommendation) ?? stringValue(first?.recommendation),
    bullish: numberValue(consensus?.bullish) ?? numberValue(first?.bullish),
    neutral: numberValue(consensus?.neutral) ?? numberValue(first?.neutral),
    bearish: numberValue(consensus?.bearish) ?? numberValue(first?.bearish),
    analystCount: numberValue(consensus?.analystCount) ?? numberValue(first?.analystCount),
    targetLow: numberValue(targets?.low),
    targetAverage: numberValue(targets?.average) ?? numberValue(targets?.mean),
    targetCurrent: numberValue(targets?.current),
    targetHigh: numberValue(targets?.high),
    ratings,
    reports,
    sourceIds: [...new Set(objects.map(({ node }) => node.id))],
  }
}

function period(id: string, label: string, values: Record<string, unknown>, sourceId?: string): FinancialPeriod {
  return { id, label, values, ...(sourceId === undefined ? {} : { sourceId }) }
}

function demoFinancials(): FinancialData {
  const annual = [
    period('fy2022', '2022/9/24', { marketCap: 2398369, cash: 48304, debt: 120069, enterpriseValue: 2470134, revenue: 394328, revenueGrowth: null, grossProfit: 170782, grossMargin: 43.3, ebitda: 130541, ebitdaMargin: 33.1, netIncome: 99803, netMargin: 25.3, dilutedEPS: 6.11, epsGrowth: null, operatingCashFlow: 122151, capex: -10708, freeCashFlow: 111443 }, 'reference:FY2022'),
    period('fy2023', '2023/9/30', { marketCap: 2662326, cash: 61555, debt: 111088, enterpriseValue: 2711859, revenue: 383285, revenueGrowth: -2.8, grossProfit: 169148, grossMargin: 44.1, ebitda: 125820, ebitdaMargin: 32.8, netIncome: 96995, netMargin: 25.3, dilutedEPS: 6.13, epsGrowth: 0.3, operatingCashFlow: 110543, capex: -10959, freeCashFlow: 99584 }, 'reference:FY2023'),
    period('fy2024', '2024/9/28', { marketCap: 3443453, cash: 65171, debt: 106629, enterpriseValue: 3484911, revenue: 391035, revenueGrowth: 2, grossProfit: 180683, grossMargin: 46.2, ebitda: 134661, ebitdaMargin: 34.4, netIncome: 93736, netMargin: 24, dilutedEPS: 6.08, epsGrowth: -0.8, operatingCashFlow: 118254, capex: -9447, freeCashFlow: 108807 }, 'reference:FY2024'),
    period('fy2025', '2025/9/27', { marketCap: 3773977, cash: 54697, debt: 98657, enterpriseValue: 3817937, revenue: 416161, revenueGrowth: 6.4, grossProfit: 195201, grossMargin: 46.9, ebitda: 144748, ebitdaMargin: 34.8, netIncome: 112010, netMargin: 26.9, dilutedEPS: 7.46, epsGrowth: 22.7, operatingCashFlow: 111482, capex: -12715, freeCashFlow: 98767 }, 'reference:FY2025'),
  ]
  const quarter = [
    period('q4fy2025', '2025/9/27', { revenue: 102466, revenueGrowth: null, grossProfit: 48341, grossMargin: 47.2, ebitda: 35554, ebitdaMargin: 34.7, netIncome: 27466, netMargin: 26.8, dilutedEPS: 1.85, epsGrowth: null, operatingCashFlow: 29728, capex: -3242, freeCashFlow: 26486 }, 'reference:Q4-FY2025'),
    period('q1fy2026', '2025/12/27', { revenue: 143756, revenueGrowth: 40.3, grossProfit: 69231, grossMargin: 48.2, ebitda: 54066, ebitdaMargin: 37.6, netIncome: 42097, netMargin: 29.3, dilutedEPS: 2.84, epsGrowth: 53.5, operatingCashFlow: 53925, capex: -2373, freeCashFlow: 51552 }, 'reference:Q1-FY2026'),
    period('q2fy2026', '2026/3/28', { revenue: 111184, revenueGrowth: -22.7, grossProfit: 54781, grossMargin: 49.3, ebitda: 39324, ebitdaMargin: 35.4, netIncome: 29578, netMargin: 26.6, dilutedEPS: 2.01, epsGrowth: -29.2, operatingCashFlow: 28702, capex: -1971, freeCashFlow: 26731 }, 'reference:Q2-FY2026'),
    period('q3fy2026', '2026/6/27', { revenue: 109417, revenueGrowth: -1.6, grossProfit: 54770, grossMargin: 50.1, ebitda: 39015, ebitdaMargin: 35.7, netIncome: 29789, netMargin: 27.2, dilutedEPS: 2.02, epsGrowth: 0.5, operatingCashFlow: 34369, capex: -2455, freeCashFlow: 31914 }, 'reference:Q3-FY2026'),
  ]
  return { unit: 'millions', currency: 'USD', annual, quarter, ttm: [] }
}

function demoEarnings(): readonly EarningsRecord[] {
  return [
    { id: 'demo-q4-2026', label: '2026 Q4', date: '2026-11-03T06:00:00+08:00', revenueActual: null, revenueEstimate: 113400, epsActual: null, epsEstimate: 1.98, revenueSurprise: null, epsSurprise: null, summary: 'Reference-sample preview. No reported figures are present before the release.', transcript: null, documentUrl: null, sourceId: 'AAPL reference capture' },
    { id: 'demo-q3-2026', label: '2026 Q3', date: null, revenueActual: 109417, revenueEstimate: null, epsActual: 2.02, epsEstimate: null, revenueSurprise: null, epsSurprise: 7.45, summary: 'Reference-sample reported quarter.', transcript: null, documentUrl: null, sourceId: 'AAPL reference capture' },
    { id: 'demo-q2-2026', label: '2026 Q2', date: null, revenueActual: 111184, revenueEstimate: null, epsActual: 2.01, epsEstimate: null, revenueSurprise: null, epsSurprise: 4.69, summary: 'Reference-sample reported quarter.', transcript: null, documentUrl: null, sourceId: 'AAPL reference capture' },
  ]
}

function demoHolders(): readonly HolderRecord[] {
  return [
    { id: 'demo-holder-1', category: 'institutional', manager: 'Vanguard Group', filedAt: '2026-08-14', shares: 1320000000, value: 455000000000, change: 1200000, sourceId: 'AAPL reference sample' },
    { id: 'demo-holder-2', category: 'insider', manager: 'Director sample', filedAt: '2026-08-01', shares: 125000, value: 43000000, change: -5000, sourceId: 'AAPL reference sample' },
    { id: 'demo-holder-3', category: 'political', manager: 'Disclosure sample', filedAt: '2026-07-22', shares: 2000, value: 690000, change: 0, sourceId: 'AAPL reference sample' },
  ]
}

function demoForecasts(): readonly ForecastRecord[] {
  return [
    { id: 'demo-forecast-1', question: 'Will Apple release a new product line before 2027?', yes: 97, no: 3, volume: 360000, summary: 'Reference-sample prediction market card. Verify the current contract and source before relying on it.', source: 'Reference sample · market card', asOf: '2026-05-13', url: null },
    { id: 'demo-forecast-2', question: 'Will Apple release a touchscreen MacBook in 2026?', yes: 99.9, no: 0.1, volume: 190000, summary: 'Reference-sample prediction market card. Verify the current contract and source before relying on it.', source: 'Reference sample · market card', asOf: '2026-05-13', url: null },
  ]
}

function demoAnalysis(): AnalystData {
  return {
    consensus: 'Buy',
    bullish: 17,
    neutral: 5,
    bearish: 2,
    analystCount: 24,
    targetLow: 245,
    targetAverage: 341.94,
    targetCurrent: 344.63,
    targetHigh: 400,
    ratings: [
      { id: 'demo-rating-1', firm: 'MoffettNathanson', analyst: 'Craig Moffett', rating: 'Neutral', target: 283, previousTarget: 304, upside: -17.9, date: '2026-10-20' },
      { id: 'demo-rating-2', firm: 'Loop Capital', analyst: 'Ananda Baruah', rating: 'Hold', target: 330, previousTarget: 370, upside: -4.2, date: '2026-10-20' },
      { id: 'demo-rating-3', firm: 'JP Morgan', analyst: 'Samik Chatterjee', rating: 'Overweight', target: 360, previousTarget: 340, upside: 4.5, date: '2026-10-12' },
    ],
    reports: [
      { id: 'demo-report-1', title: 'Apple Inc. (AAPL) — MCH Analysis Research', publisher: 'MCH Analysis, LLC', date: '2026-10-29', outlook: 'Bearish', url: null },
      { id: 'demo-report-2', title: 'Apple (AAPL) Equity Research Report October 2026', publisher: 'Moschovakis Capital Research', date: '2026-10-05', outlook: 'Neutral', url: null },
    ],
    sourceIds: ['AAPL reference sample'],
  }
}

function sourceNote(locale: string | undefined, field: string): string {
  return text(
    locale,
    `No matching ${field} metadata is connected for this symbol. Every unavailable value is shown as ${EMPTY}; no sample figures have been substituted.`,
    `尚未导入这类资料。可以用研究入口查找公开来源；缺少的数字显示 ${EMPTY}。`,
  )
}

function DemoNotice({ show, locale }: { readonly show: boolean; readonly locale?: string | undefined }) {
  if (!show) return null
  return <div className="rg-stock-sections-demo" role="note"><strong>{text(locale, 'Demo data', '演示数据')}</strong><span>{text(locale, 'Apple reference sample only. Do not treat these figures as current evidence.', '仅限 Apple 参考样本；不得把这些数字视为当前证据。')}</span></div>
}

function SourceNote({ locale, field }: { readonly locale?: string | undefined; readonly field: string }) {
  return <p className="rg-stock-sections-source-note" role="note">{sourceNote(locale, field)}</p>
}

function Icon({ kind }: { readonly kind: 'download' | 'more' | 'send' | 'search' }) {
  if (kind === 'download') return <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 2.2v7.2m0 0 2.7-2.7M8 9.4 5.3 6.7M2.7 11.2v2.1h10.6v-2.1" fill="none" stroke="currentColor" strokeWidth="1.35" strokeLinecap="round" strokeLinejoin="round" /></svg>
  if (kind === 'more') return <svg viewBox="0 0 16 16" aria-hidden="true"><circle cx="3" cy="8" r="1" fill="currentColor"/><circle cx="8" cy="8" r="1" fill="currentColor"/><circle cx="13" cy="8" r="1" fill="currentColor"/></svg>
  if (kind === 'send') return <svg viewBox="0 0 16 16" aria-hidden="true"><path d="m3 8 9.8-4.8L10 13 7.4 9.3 3 8Z" fill="none" stroke="currentColor" strokeWidth="1.35" strokeLinejoin="round"/></svg>
  return <svg viewBox="0 0 16 16" aria-hidden="true"><circle cx="7" cy="7" r="4.2" fill="none" stroke="currentColor" strokeWidth="1.35"/><path d="m10.2 10.2 3.1 3.1" fill="none" stroke="currentColor" strokeWidth="1.35" strokeLinecap="round"/></svg>
}

function ResearchComposer({ section, symbol, locale, onResearch, demo, context }: {
  readonly section: StockSection
  readonly symbol: string
  readonly locale?: string | undefined
  readonly onResearch?: ((question: string) => void) | undefined
  readonly demo: boolean
  readonly context?: string
}) {
  const sectionLabel = text(locale, section === 'forecast' ? 'forecast markets' : section, {financials:'财务数据',earnings:'收益',holders:'持有者',forecast:'预测市场',analysis:'分析'}[section])
  const submit = () => onResearch?.(`Research ${symbol} ${sectionLabel} using the current stock context.${context ? ` ${context}` : ''} Use only explicit source records on this panel and label unavailable data.${demo ? ' The figures shown here are a labeled Apple demo sample and must not be treated as evidence.' : ''}`)
  return <div className="rg-stock-research">
    <button type="button" className="rg-stock-button" aria-label={text(locale, `Research ${symbol} ${sectionLabel}`, `研究 ${symbol} ${sectionLabel}`)} title={onResearch === undefined ? text(locale, 'Research is unavailable because no callback is connected.', '研究回调尚未接入。') : text(locale, 'Use the current stock context to open research', '使用当前股票上下文打开研究')} disabled={onResearch === undefined} onClick={submit}><Icon kind="send" />{text(locale, 'Research this section', '研究当前部分')}</button>
  </div>
}

function metricValue(object: Record<string, unknown>, metric: FinancialMetric): unknown {
  for (const key of [metric.key, ...(metric.aliases ?? [])]) {
    const direct = object[key]
    if (direct !== undefined) return direct
  }
  return undefined
}

function scaleValue(value: number, from: FinancialUnit, to: FinancialUnit): number {
  const factors: Record<FinancialUnit, number> = { thousands: 1e3, millions: 1e6, billions: 1e9 }
  return value * factors[from] / factors[to]
}

function displayMetric(raw: unknown, metric: FinancialMetric, fromUnit: FinancialUnit, unit: FinancialUnit, currency: string, locale?: string): string {
  if (raw === null || raw === undefined) return EMPTY
  if (typeof raw === 'string' && numberValue(raw) === null) return raw
  const numeric = numberValue(raw)
  if (numeric === null) return EMPTY
  const explicitFormat = stringValue(record(raw)?.format)
  const format = explicitFormat === 'currency' || explicitFormat === 'percent' || explicitFormat === 'number' || explicitFormat === 'eps' ? explicitFormat : metric.format
  if (format === 'percent') return `${formatNumber(numeric, locale)}%`
  if (format === 'eps') return `${currency === 'USD' ? 'US$' : `${currency} `}${formatNumber(numeric, locale)}`
  if (format === 'number') return formatNumber(numeric, locale)
  return formatCurrency(scaleValue(numeric, fromUnit, unit), currency, locale)
}

function csvCell(value: unknown): string {
  const text = value === null || value === undefined ? EMPTY : String(value)
  return /[",\n]/u.test(text) ? `"${text.replaceAll('"', '""')}"` : text
}

export function stockSectionCsv(rows: readonly (readonly unknown[])[]): string {
  return rows.map(row => row.map(csvCell).join(',')).join('\n')
}

function downloadCsv(filename: string, rows: readonly (readonly unknown[])[]): void {
  if (typeof document === 'undefined' || typeof URL === 'undefined') return
  const blob = new Blob([stockSectionCsv(rows)], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

function FinancialsSection({ symbol, nodes, locale, onResearch, demoApple }: {
  readonly symbol: string
  readonly nodes: readonly GraphNode[]
  readonly locale?: string | undefined
  readonly onResearch?: ((question: string) => void) | undefined
  readonly demoApple: boolean
}) {
  const source = readFinancials(nodes, symbol)
  const data = source.data ?? (demoApple ? demoFinancials() : null)
  const [category, setCategory] = useState<FinancialCategory>('keyStats')
  const [periodMode, setPeriodMode] = useState<FinancialPeriodMode>('annual')
  const [unit, setUnit] = useState<FinancialUnit>(data?.unit ?? 'millions')
  const [from, setFrom] = useState(0)
  const [to, setTo] = useState(Math.max(0, (data?.[periodMode].length ?? 1) - 1))
  const [menu, setMenu] = useState<'units' | 'download' | null>(null)
  const periods = data?.[periodMode] ?? []
  const selected = periods.slice(from, Math.min(to + 1, periods.length))
  const units = FINANCIAL_METRICS[category]
  const categoryLabel = FINANCIAL_CATEGORIES.find(entry => entry.id === category)
  const sourceIds = [...new Set(periods.flatMap(item => item.sourceId === undefined ? [] : [item.sourceId]))]
  const loaded = data !== null && periods.length > 0
  const unitLabel = `${data?.currency ?? 'USD'} · ${text(locale, unit, unit === 'thousands' ? '千' : unit === 'millions' ? '百万' : '十亿')} · ${text(locale, 'except per-share data and ratios', '每股数据与比率除外')}`
  const rows: readonly (readonly unknown[])[] = [
    [`${text(locale, 'Line item', '项目')} (${unitLabel})`, ...selected.map(item => item.label)],
    ...units.map(metric => [text(locale, metric.en, metric.zh), ...selected.map(item => displayMetric(metricValue(item.values, metric), metric, data?.unit ?? unit, unit, data?.currency ?? 'USD', locale))]),
  ]
  const changePeriod = (next: FinancialPeriodMode) => {
    const nextLength = data?.[next].length ?? 0
    setPeriodMode(next)
    setFrom(0)
    setTo(Math.max(0, nextLength - 1))
    setMenu(null)
  }
  return <section className="rg-stock-sections-card" aria-label={text(locale, `${symbol} financials`, `${symbol} 财务数据`)}>
    <DemoNotice show={demoApple} locale={locale} />
    <div className="rg-stock-toolbar">
      <div className="rg-stock-segmented" role="group" aria-label={text(locale, 'Financial category', '财务分类')}>
        {FINANCIAL_CATEGORIES.map(entry => <button type="button" key={entry.id} data-active={category === entry.id || undefined} aria-pressed={category === entry.id} onClick={() => setCategory(entry.id)}>{text(locale, entry.en, entry.zh)}</button>)}
      </div>
      <div className="rg-stock-toolbar-actions">
        {data !== null && <span className="rg-stock-section-note">{unitLabel}</span>}
        <div className="rg-stock-segmented" role="group" aria-label={text(locale, 'Period', '周期')}>
          {(['annual', 'quarter', 'ttm'] as const).map(value => <button type="button" key={value} data-active={periodMode === value || undefined} aria-pressed={periodMode === value} onClick={() => changePeriod(value)}>{text(locale, value === 'quarter' ? 'Quarter' : value === 'ttm' ? 'TTM' : 'Annual', value === 'quarter' ? '季度' : value === 'ttm' ? 'TTM' : '年')}</button>)}
        </div>
        <button type="button" className="rg-stock-button rg-stock-icon-button" title={text(locale, 'Units and range', '单位与范围')} aria-label={text(locale, 'Units and range', '单位与范围')} aria-expanded={menu === 'units'} onClick={() => setMenu(current => current === 'units' ? null : 'units')}><Icon kind="more" /></button>
        <button type="button" className="rg-stock-button rg-stock-icon-button" title={text(locale, 'Download table', '下载表格')} aria-label={text(locale, 'Download table', '下载表格')} aria-expanded={menu === 'download'} disabled={!loaded} onClick={() => setMenu(current => current === 'download' ? null : 'download')}><Icon kind="download" /></button>
      </div>
      {menu === 'units' && <div className="rg-stock-menu" role="dialog" aria-label={text(locale, 'Display units and range', '显示单位与范围')}>
        <strong>{text(locale, 'Display units', '显示单位')}</strong>
        {(['thousands', 'millions', 'billions'] as const).map(value => <button type="button" key={value} data-active={unit === value || undefined} aria-pressed={unit === value} onClick={() => { setUnit(value); setMenu(null) }}>{text(locale, value, value === 'thousands' ? '数千' : value === 'millions' ? '百万' : '十亿')}<span>{unit === value ? '✓' : ''}</span></button>)}
{loaded && <div className="rg-stock-range">
      <label>{text(locale, 'From', '从')} <select value={from} onChange={event => {
        const next = Number(event.target.value)
        setFrom(next)
        if (next > to) setTo(next)
      }}>{periods.map((item, index) => <option key={item.id} value={index}>{item.label}</option>)}</select></label>
      <label>{text(locale, 'To', '到')} <select value={to} onChange={event => {
        const next = Number(event.target.value)
        setTo(next)
        if (next < from) setFrom(next)
      }}>{periods.map((item, index) => <option key={item.id} value={index}>{item.label}</option>)}</select></label>
      <span>{data?.currency} · {text(locale, unit, unit === 'thousands' ? '千' : unit === 'millions' ? '百万' : '十亿')}</span>
    </div>}
      </div>}
      {menu === 'download' && <div className="rg-stock-menu" role="menu" aria-label={text(locale, 'Download table', '下载表格')}>
        <button type="button" role="menuitem" onClick={() => { downloadCsv(`${symbol}-${category}-${periodMode}.csv`, rows); setMenu(null) }}>{text(locale, 'CSV · loaded rows only', 'CSV · 仅当前已加载数据')}</button>
      </div>}
    </div>
    {!loaded && <SourceNote locale={locale} field="financials" />}
    <div className="rg-stock-table-wrap"><table className="rg-stock-table">
      <caption>{`${symbol} ${text(locale, categoryLabel?.en ?? 'financials', categoryLabel?.zh ?? '财务数据')} ${text(locale, periodMode === 'quarter' ? 'Quarter' : periodMode === 'ttm' ? 'TTM' : 'Annual', periodMode === 'quarter' ? '季度' : periodMode === 'ttm' ? 'TTM' : '年度')}`}</caption>
      <thead><tr><th scope="col">{text(locale, 'Line item', '项目')}</th>{loaded ? selected.map(item => <th scope="col" key={item.id}>{item.label}</th>) : <th scope="col">{EMPTY}</th>}</tr></thead>
      <tbody>{units.map(metric => <tr key={metric.key} className={metric.subrow ? 'rg-stock-subrow' : undefined}>
        <th scope="row">{text(locale, metric.en, metric.zh)}</th>
        {loaded ? selected.map(item => {
          const raw = metricValue(item.values, metric)
          const display = displayMetric(raw, metric, data?.unit ?? unit, unit, data?.currency ?? 'USD', locale)
          const numeric = numberValue(raw)
          return <td key={item.id} data-negative={numeric !== null && numeric < 0 ? true : undefined} data-positive={metric.format === 'percent' && numeric !== null && numeric > 0 ? true : undefined}>{display}</td>
        }) : <td>{EMPTY}</td>}
      </tr>)}</tbody>
    </table></div>
    <p className="rg-stock-section-note">{loaded ? `${text(locale, 'Loaded source records', '已加载来源记录')}: ${sourceIds.join(', ') || EMPTY}。${text(locale, 'CSV exports the selected category, period range and displayed unit only.', 'CSV 只导出所选分类、周期与显示单位。')}` : text(locale, 'Select another period to verify whether records exist; unavailable cells remain —.', '可切换周期确认是否已有数据；不可用单元仍显示 —。')}</p>
    <ResearchComposer section="financials" symbol={symbol} locale={locale} onResearch={onResearch} demo={demoApple} context={`Selected financial view: category=${JSON.stringify(categoryLabel?.en ?? category)}, period=${JSON.stringify(periodMode)}, displayUnit=${JSON.stringify(unit)}, loadedPeriods=${JSON.stringify(selected.map(item => item.label))}, sourceRecords=${JSON.stringify([...new Set(selected.flatMap(item => item.sourceId === undefined ? [] : [item.sourceId]))])}. These are the selected controls and loaded record references, not verified financial facts.`} />
  </section>
}

function metricPanel(label: string, actual: number | null, estimate: number | null, surprise: number | null, locale?: string): ReactNode {
  return <div className="rg-stock-metric-panel">
    <span>{label}</span><strong>{formatNumber(actual, locale)}</strong><small>{text(locale, 'estimated', '估算')} {formatNumber(estimate, locale)}</small>
    <span>{text(locale, 'Surprise', '超预期')}</span><strong>{surprise === null ? EMPTY : `${formatNumber(surprise, locale)}%`}</strong><small />
  </div>
}

function EarningsSection({ symbol, nodes, locale, onResearch, demoApple }: {
  readonly symbol: string
  readonly nodes: readonly GraphNode[]
  readonly locale?: string | undefined
  readonly onResearch?: ((question: string) => void) | undefined
  readonly demoApple: boolean
}) {
  const records = demoApple ? demoEarnings() : readEarnings(nodes, symbol)
  const [selected, setSelected] = useState(0)
  const [tab, setTab] = useState<'preview' | 'records' | 'documents'>('preview')
  const active = records[Math.min(selected, Math.max(0, records.length - 1))]
  return <section className="rg-stock-sections-card rg-stock-earnings" aria-label={text(locale, `${symbol} earnings`, `${symbol} 收益`)}>
    <DemoNotice show={demoApple} locale={locale} />
    {records.length === 0 && <SourceNote locale={locale} field="earnings" />}
    <div className="rg-stock-earnings-hero">
      <div className="rg-stock-chip-row" role="tablist" aria-label={text(locale, 'Earnings periods', '财报周期')}>
        {(records.length === 0 ? [{ id: EMPTY, label: EMPTY, epsSurprise: null }] : records).map((item, index) => <button type="button" role="tab" className="rg-stock-quarter" key={item.id} data-active={(records.length > 0 && selected === index) || undefined} aria-selected={records.length > 0 && selected === index} disabled={records.length === 0} onClick={() => { setSelected(index); setTab('preview') }}><span>{item.label}</span><small>{item.epsSurprise === null ? EMPTY : `${item.epsSurprise >= 0 ? '+' : ''}${formatNumber(item.epsSurprise, locale)}%`}</small></button>)}
      </div>
      <div className="rg-stock-earnings-title"><div><h2>{symbol} {active?.label ?? EMPTY} {text(locale, 'Earnings call', '财报电话会议')}</h2><p>{active?.date ?? EMPTY}</p></div></div>
      <div className="rg-stock-metric-grid">
        {metricPanel(text(locale, 'Revenue', '收入'), active?.revenueActual ?? null, active?.revenueEstimate ?? null, active?.revenueSurprise ?? null, locale)}
        {metricPanel(text(locale, 'Adjusted EPS', '每股收益（调整后）'), active?.epsActual ?? null, active?.epsEstimate ?? null, active?.epsSurprise ?? null, locale)}
      </div>
      <div className="rg-stock-tabs" role="tablist" aria-label={text(locale, 'Earnings detail', '收益详情')}>
        {(['preview', 'records', 'documents'] as const).map(value => <button type="button" role="tab" key={value} aria-selected={tab === value} data-active={tab === value || undefined} onClick={() => setTab(value)}>{text(locale, value[0]?.toUpperCase() + value.slice(1), value === 'preview' ? '预览' : value === 'records' ? '记录' : '文档')}</button>)}
      </div>
    </div>
    <div className="rg-stock-detail-body">
      {active === undefined ? EMPTY : tab === 'preview' ? active.summary ?? EMPTY : tab === 'records' ? active.transcript === null ? EMPTY : /^https?:\/\//iu.test(active.transcript) ? <a href={active.transcript} target="_blank" rel="noreferrer">{text(locale, 'Open transcript', '打开记录')}</a> : active.transcript : active.documentUrl === null ? EMPTY : <a href={active.documentUrl} target="_blank" rel="noreferrer">{text(locale, 'Open document source', '打开文档来源')}</a>}
    </div>
    <p className="rg-stock-section-note">{text(locale, 'Loaded source records', '已加载来源记录')}: {active?.sourceId ?? EMPTY}</p>
    <ResearchComposer section="earnings" symbol={symbol} locale={locale} onResearch={onResearch} demo={demoApple} />
  </section>
}

function HoldersSection({ symbol, nodes, locale, onResearch, demoApple }: {
  readonly symbol: string
  readonly nodes: readonly GraphNode[]
  readonly locale?: string | undefined
  readonly onResearch?: ((question: string) => void) | undefined
  readonly demoApple: boolean
}) {
  const records = demoApple ? demoHolders() : readHolders(nodes, symbol)
  const [category, setCategory] = useState<HolderCategory>('institutional')
  const [query, setQuery] = useState('')
  const filtered = records.filter(item => item.category === category && ((item.manager?.toLowerCase().includes(query.trim().toLowerCase()) ?? false) || query.trim().length === 0))
  const total = filtered.reduce((sum, item) => sum + (item.value ?? 0), 0)
  const rows: readonly (readonly unknown[])[] = [[text(locale, 'Manager', '管理者'), text(locale, 'Filed', '备案日期'), text(locale, 'Shares', '股份'), text(locale, 'Value', '价值'), text(locale, 'Change', '变更')], ...filtered.map(item => [item.manager ?? EMPTY, item.filedAt ?? EMPTY, formatNumber(item.shares, locale, 0), formatCurrency(item.value, 'USD', locale), formatNumber(item.change, locale, 0)])]
  return <section className="rg-stock-sections-card rg-stock-holder" aria-label={text(locale, `${symbol} holders`, `${symbol} 持有者`)}>
    <DemoNotice show={demoApple} locale={locale} />
    <div className="rg-stock-segmented" role="group" aria-label={text(locale, 'Holder type', '持有者类型')}>
      {(['institutional', 'insider', 'political'] as const).map(value => <button type="button" key={value} data-active={category === value || undefined} aria-pressed={category === value} onClick={() => setCategory(value)}>{text(locale, value, value === 'institutional' ? '机构' : value === 'insider' ? '内部人士' : '政界人士')}</button>)}
    </div>
    <div className="rg-stock-holder-toolbar"><input className="rg-stock-search" type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder={text(locale, 'Find a holder', '查找持有人')} aria-label={text(locale, 'Find a holder', '查找持有人')} /><button type="button" className="rg-stock-button" disabled={filtered.length === 0} onClick={() => downloadCsv(`${symbol}-${category}-holders.csv`, rows)}><Icon kind="download" />{text(locale, 'Download loaded rows', '下载已加载数据')}</button></div>
    {records.length === 0 && <SourceNote locale={locale} field="holdings" />}
    <div className="rg-stock-holder-summary"><span>{text(locale, 'Filings', '申报文件')} <strong>{formatNumber(filtered.length, locale, 0)}</strong></span><span>{text(locale, 'Reported value', '报告总价值')} <strong>{filtered.length === 0 ? EMPTY : formatCurrency(total, 'USD', locale)}</strong></span></div>
    <div className="rg-stock-table-wrap"><table className="rg-stock-table">
      <caption>{`${symbol} ${text(locale, 'holders', '持有者')}`}</caption>
      <thead><tr>{[text(locale, 'Manager', '管理者'), text(locale, 'Filed', '备案日期'), text(locale, 'Shares', '股份'), text(locale, 'Value', '价值'), text(locale, 'Change', '变更')].map(column => <th key={column} scope="col">{column}</th>)}</tr></thead>
      <tbody>{filtered.length === 0 ? <tr>{Array.from({ length: 5 }, (_, index) => <td key={index}>{EMPTY}</td>)}</tr> : filtered.map(item => <tr key={item.id}><th scope="row">{item.manager ?? EMPTY}</th><td>{item.filedAt ?? EMPTY}</td><td>{formatNumber(item.shares, locale, 0)}</td><td>{formatCurrency(item.value, 'USD', locale)}</td><td data-negative={item.change !== null && item.change < 0 ? true : undefined} data-positive={item.change !== null && item.change > 0 ? true : undefined}>{formatNumber(item.change, locale, 0)}</td></tr>)}</tbody>
    </table></div>
    <p className="rg-stock-section-note">{text(locale, 'Loaded source records', '已加载来源记录')}: {[...new Set(filtered.flatMap(item => item.sourceId === null ? [] : [item.sourceId]))].join(', ') || EMPTY}</p>
    <ResearchComposer section="holders" symbol={symbol} locale={locale} onResearch={onResearch} demo={demoApple} />
  </section>
}

function ForecastSection({ symbol, nodes, locale, onResearch, demoApple }: {
  readonly symbol: string
  readonly nodes: readonly GraphNode[]
  readonly locale?: string | undefined
  readonly onResearch?: ((question: string) => void) | undefined
  readonly demoApple: boolean
}) {
  const records = demoApple ? demoForecasts() : readForecastMarkets(nodes, symbol)
  const [query, setQuery] = useState('')
  const filtered = records.filter(item => (item.question?.toLowerCase().includes(query.trim().toLowerCase()) ?? false) || query.trim().length === 0)
  return <section className="rg-stock-sections-card rg-stock-forecast" aria-label={text(locale, `${symbol} forecast markets`, `${symbol} 预测市场`)}>
    <DemoNotice show={demoApple} locale={locale} />
    <h2>{text(locale, 'Related forecast markets', '相关预测市场')}</h2>
    <div className="rg-stock-forecast-search"><input className="rg-stock-search" type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder={text(locale, 'Search forecast events…', '搜索事件…')} aria-label={text(locale, 'Search forecast events', '搜索预测事件')} /></div>
    {records.length === 0 && <SourceNote locale={locale} field="estimates.forecastMarkets or prediction" />}
    {records.length > 0 && filtered.length === 0 && <p className="rg-stock-section-note" role="status">{text(locale, 'No matching forecast events.', '没有匹配的预测事件。')}</p>}
    <div className="rg-stock-forecast-grid">{(filtered.length === 0 ? [null] : filtered).map((item, index) => <article className="rg-stock-forecast-card" key={item?.id ?? index}>
      <h3>{item?.question ?? EMPTY}</h3>
      <div className="rg-stock-forecast-outcomes"><span>{text(locale, 'Yes', '是')}</span><strong>{item?.yes === null || item?.yes === undefined ? EMPTY : `${formatNumber(item.yes, locale)}%`}</strong><span>{text(locale, 'No', '否')}</span><strong>{item?.no === null || item?.no === undefined ? EMPTY : `${formatNumber(item.no, locale)}%`}</strong></div>
      <p>{item?.summary ?? EMPTY}</p>
      <div className="rg-stock-card-meta"><span>{text(locale, 'Volume', '成交量')} {item?.volume === null || item?.volume === undefined ? EMPTY : formatNumber(item.volume, locale, 0)}</span><span>{item?.asOf ?? EMPTY}</span>{item?.url === null || item?.url === undefined ? <span>{item?.source ?? EMPTY}</span> : <a href={item.url} target="_blank" rel="noreferrer">{item.source ?? text(locale, 'Open source', '查看来源')}</a>}</div>
    </article>)}</div>
    <ResearchComposer section="forecast" symbol={symbol} locale={locale} onResearch={onResearch} demo={demoApple} />
  </section>
}

function AnalysisSection({ symbol, nodes, locale, onResearch, demoApple }: {
  readonly symbol: string
  readonly nodes: readonly GraphNode[]
  readonly locale?: string | undefined
  readonly onResearch?: ((question: string) => void) | undefined
  readonly demoApple: boolean
}) {
  const data = demoApple ? demoAnalysis() : readAnalysis(nodes, symbol)
  const connected = data.analystCount !== null || data.ratings.length > 0 || data.reports.length > 0
  return <section className="rg-stock-sections-card rg-stock-analysis" aria-label={text(locale, `${symbol} analyst research`, `${symbol} 分析`)}>
    <DemoNotice show={demoApple} locale={locale} />
    <h2>{text(locale, 'Analyst consensus', '分析师一致预期')}</h2>
    {!connected && <SourceNote locale={locale} field="estimates" />}
    <div className="rg-stock-analysis-summary">
      <div className="rg-stock-consensus"><h2>{text(locale, 'Consensus', '共识')}</h2><div className="rg-stock-consensus-grid">
        <div><span>{text(locale, 'Rating', '评级')}</span><strong>{data.consensus ?? EMPTY}</strong></div><div><span>{text(locale, 'Bullish', '看涨')}</span><strong>{formatNumber(data.bullish, locale, 0)}</strong></div><div><span>{text(locale, 'Neutral', '中性')}</span><strong>{formatNumber(data.neutral, locale, 0)}</strong></div><div><span>{text(locale, 'Bearish', '看跌')}</span><strong>{formatNumber(data.bearish, locale, 0)}</strong></div>
      </div></div>
      <div className="rg-stock-targets"><h2>{text(locale, '52-week price targets', '分析师 52 周目标价')}</h2><div className="rg-stock-target-grid">
        <div><span>{text(locale, 'Low', '最低')}</span><strong>{formatCurrency(data.targetLow, 'USD', locale)}</strong></div><div><span>{text(locale, 'Average', '平均值')}</span><strong>{formatCurrency(data.targetAverage, 'USD', locale)}</strong></div><div><span>{text(locale, 'Current', '当前')}</span><strong>{formatCurrency(data.targetCurrent, 'USD', locale)}</strong></div><div><span>{text(locale, 'High', '最高')}</span><strong>{formatCurrency(data.targetHigh, 'USD', locale)}</strong></div>
      </div></div>
    </div>
    <div className="rg-stock-rating-table rg-stock-table-wrap"><table className="rg-stock-table">
      <caption>{`${symbol} ${text(locale, 'analyst ratings', '分析师评级')}`}</caption>
      <thead><tr>{[text(locale, 'Institution', '机构'), text(locale, 'Analyst', '分析师'), text(locale, 'Rating', '评级'), text(locale, 'Target', '52周目标价'), text(locale, 'Upside', '上涨空间'), text(locale, 'Date', '日期')].map(column => <th scope="col" key={column}>{column}</th>)}</tr></thead>
      <tbody>{data.ratings.length === 0 ? <tr>{Array.from({ length: 6 }, (_, index) => <td key={index}>{EMPTY}</td>)}</tr> : data.ratings.map(item => <tr key={item.id}><th scope="row">{item.firm ?? EMPTY}</th><td>{item.analyst ?? EMPTY}</td><td><span className="rg-stock-rating-pill">{item.rating ?? EMPTY}</span></td><td>{formatCurrency(item.target, 'USD', locale)}{item.previousTarget === null ? '' : <small> {text(locale, 'prior', '此前')} {formatCurrency(item.previousTarget, 'USD', locale)}</small>}</td><td data-negative={item.upside !== null && item.upside < 0 ? true : undefined} data-positive={item.upside !== null && item.upside > 0 ? true : undefined}>{item.upside === null ? EMPTY : `${formatNumber(item.upside, locale)}%`}</td><td>{item.date ?? EMPTY}</td></tr>)}</tbody>
    </table></div>
    <h2 style={{ marginTop: 18 }}>{text(locale, 'Public research reports', '公开网络研究报告')}</h2>
    <div className="rg-stock-report-list">{(data.reports.length === 0 ? [null] : data.reports).map((item, index) => <article className="rg-stock-report" key={item?.id ?? index}><h3>{item?.title ?? EMPTY}</h3><div className="rg-stock-card-meta"><span>{item?.publisher ?? EMPTY}</span><span>{item?.date ?? EMPTY}</span><span>{text(locale, 'Outlook', '展望')}: {item?.outlook ?? EMPTY}</span>{item?.url === null || item?.url === undefined ? null : <a href={item.url} target="_blank" rel="noreferrer">{text(locale, 'View source', '查看来源')}</a>}</div></article>)}</div>
    <p className="rg-stock-section-note">{text(locale, 'Loaded source records', '已加载来源记录')}: {data.sourceIds.join(', ') || EMPTY}</p>
    <ResearchComposer section="analysis" symbol={symbol} locale={locale} onResearch={onResearch} demo={demoApple} />
  </section>
}

export function StockSections({ section, symbol, nodes, locale, onResearch, demo = false, panelId, labelledBy, hidden = false }: StockSectionsProps) {
  const normalized = symbol.trim().toUpperCase()
  const demoApple = demo && normalized === 'AAPL'
  const demoRejected = demo && normalized !== 'AAPL'
  const content = useMemo(() => {
    if (section === 'financials') return <FinancialsSection symbol={normalized} nodes={nodes} locale={locale} onResearch={onResearch} demoApple={demoApple} />
    if (section === 'earnings') return <EarningsSection symbol={normalized} nodes={nodes} locale={locale} onResearch={onResearch} demoApple={demoApple} />
    if (section === 'holders') return <HoldersSection symbol={normalized} nodes={nodes} locale={locale} onResearch={onResearch} demoApple={demoApple} />
    if (section === 'forecast') return <ForecastSection symbol={normalized} nodes={nodes} locale={locale} onResearch={onResearch} demoApple={demoApple} />
    return <AnalysisSection symbol={normalized} nodes={nodes} locale={locale} onResearch={onResearch} demoApple={demoApple} />
  }, [demoApple, locale, nodes, normalized, onResearch, section])
  return <section
    id={panelId ?? `rg-market-tab-${section}-panel`}
    className="rg-stock-sections"
    role="tabpanel"
    aria-labelledby={labelledBy ?? `rg-market-tab-${section}`}
    data-section={section}
    data-symbol={normalized}
    hidden={hidden || undefined}
  >
    {demoRejected && <p className="rg-stock-sections-source-note" role="note">{text(locale, `The labeled Apple demo is available only for AAPL. No Apple sample has been substituted for ${normalized || 'this symbol'}.`, `Apple 演示样本仅适用于 AAPL，没有把 Apple 样本替换给 ${normalized || '当前股票'}。`)}</p>}
    {content}
  </section>
}
