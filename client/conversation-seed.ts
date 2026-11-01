import type { ResearchMode } from './research.ts'

export interface ConversationSeed {
  readonly mode: ResearchMode
  readonly question?: string
  readonly baseReportId?: string
  readonly asOf?: string
  readonly ticker?: string
  readonly sourceIds?: readonly string[]
  readonly skillName?: string
  readonly sourceSummaryId?: string
}
