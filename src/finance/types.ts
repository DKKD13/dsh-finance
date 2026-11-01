import type { JsonValue } from '../graph.ts'
export type { JsonValue } from '../graph.ts'

export type JsonObject = { [key: string]: JsonValue }

/** Provenance and temporal lineage shared by every finance-owned record. */
export interface FinanceMetadata extends JsonObject {
  provider: string
  asOf: string
  availableAt: string
  fetchedAt: string
  contentHash: string
  runId: string
  provenance: JsonObject
}

/** External metadata; derived hash and run id may be filled deterministically. */
export interface FinanceMetadataInput extends JsonObject {
  provider: string
  asOf: string
  availableAt: string
  fetchedAt: string
  contentHash?: string
  runId?: string
  provenance?: JsonObject
  sourceRefs?: JsonValue[]
}

export interface InstrumentInput {
  id: string
  title: string
  symbol?: string
  currency: string
  metadata: FinanceMetadataInput
}

export interface MarketDataIngestInput {
  instrument: InstrumentInput
  data: JsonObject
}

export interface DcfScenarioInput {
  name: string
  probability: number
  wacc: number
  terminalGrowth: number
  taxRate: number
  incomeStatement: {
    revenue: number[]
    ebit: number[]
  }
  cashFlowStatement: {
    depreciation: number[]
    capitalExpenditure: number[]
    workingCapitalChange: number[]
  }
  balanceSheet: {
    netDebt: number
    debt?: number
    cash?: number
  }
}

export interface DcfInput {
  instrument: InstrumentInput
  currency: string
  units: {
    financials: 'units' | 'thousands' | 'millions' | 'billions'
    shares: 'units' | 'thousands' | 'millions' | 'billions'
  }
  sharesOutstanding: number
  scenarios: DcfScenarioInput[]
  sensitivity?: {
    waccValues: number[]
    terminalGrowthValues: number[]
  }
  metadata: FinanceMetadataInput
}

export interface CompsInput {
  instrument: InstrumentInput
  targetMetric: number
  basis: 'enterprise' | 'equity'
  peers: { id: string; multiple: number }[]
  netDebt?: number
  sharesOutstanding?: number
  currency: string
  metadata: FinanceMetadataInput
}

export interface FxRateInput {
  from: string
  to: string
  rate: number
  asOf: string
  availableAt: string
  provider: string
}

export interface PortfolioPositionInput {
  id: string
  instrument: InstrumentInput
  quantity: number
  price: number
  costBasisPerUnit: number
  metadata: FinanceMetadataInput
}

export interface PortfolioInput {
  portfolio: {
    id: string
    title: string
    metadata: FinanceMetadataInput
  }
  baseCurrency: string
  asOf: string
  positions: PortfolioPositionInput[]
  fx: FxRateInput[]
  metadata: FinanceMetadataInput
}

export interface PredictionInput {
  id: string
  title: string
  instrumentId?: string
  catalyst?: {
    id: string
    title: string
    metadata: FinanceMetadataInput
  }
  resolutionDate: string
  prediction: JsonObject
  metadata: FinanceMetadataInput
}

export interface IssueInput {
  id: string
  title: string
  severity: 'warning' | 'error'
  message: string
  references?: string[]
  metadata: FinanceMetadataInput
}

export interface ResolvePredictionInput {
  id: string
  outcome: JsonObject
  status: 'resolved' | 'error'
  resolvedAt: string
  targetId?: string
  warnings?: string[]
  metadata: FinanceMetadataInput
}

export interface BriefingRecordInput {
  id: string
  title: string
  content: string
  references?: string[]
  metadata: FinanceMetadataInput
}

export interface TranscriptSegment extends JsonObject {
  segmentId: string
  speaker: string
  start: string
  end: string
  startSeconds: number
  endSeconds: number
  text: string
  deepLink: string
}

/** One normalized, content-addressed public observation. */
export interface SourceItem extends JsonObject {
  provider: string
  canonicalUrl: string
  title: string
  content: string
  contentHash: string
  asOf: string
  availableAt: string
  fetchedAt: string
  provenance: JsonObject
  mimeType?: string
  data?: JsonValue
  segments?: TranscriptSegment[]
}

export interface SourceFetchRequest extends JsonObject {
  source: string
  kind?: string
  symbol?: string
  from?: string
  to?: string
  start?: string
  end?: string
  range?: string
  interval?: string
  cik?: string
  fact?: string
  form?: string
  route?: string
  query?: JsonObject
  url?: string
  channelId?: string
  videoId?: string
  lang?: string
  args?: string[]
  limit?: number
}

export type SourceFetchInput = Partial<SourceFetchRequest> & {
  source?: string
  requests?: SourceFetchRequest[]
  dryRun?: boolean
  runId?: string
  asOf?: string
}

export interface SourceIngestInput extends JsonObject {
  items: SourceItem[]
  dryRun?: boolean
  runId?: string
  asOf?: string
}

export interface CompilePrepareInput extends JsonObject {
  runId: string
  sourceIds: string[]
  asOf: string
}

export interface CompileStatusInput extends JsonObject {
  runId: string
}

export interface DocumentFileInput extends JsonObject {
  name: string
  mimeType: string
  dataBase64: string
  lastModified?: string | number
}

export interface ClipperImportInput extends JsonObject {
  bundle: JsonValue
  dryRun?: boolean
  asOf: string
  runId?: string
}

export interface DocumentImportInput extends JsonObject {
  files: DocumentFileInput[]
  dryRun?: boolean
  asOf: string
  runId?: string
}

export interface SourceFailure extends JsonObject {
  source: string
  code: string
  message: string
  index?: number
}

export interface FinanceConnectorConfig {
  readonly secContact?: string
  readonly openbbBaseUrl?: string
  readonly alphaSiftPath?: string
  readonly httpTimeoutMs?: number
  readonly httpMaxBytes?: number
}
