import type { GraphNode } from '../src/graph.ts'
import { HYPOTHESIS_KINDS } from './research.ts'

export type WorkflowStageKey = 'collect' | 'compile' | 'hypotheses' | 'report' | 'review'

export interface WorkflowStage {
  readonly key: WorkflowStageKey
  readonly complete: boolean
  readonly count: number
}

export interface WorkflowSummary {
  readonly stages: readonly WorkflowStage[]
  readonly next: WorkflowStageKey | null
  readonly sources: readonly GraphNode[]
  readonly compiledSessions: readonly GraphNode[]
  readonly hypotheses: readonly GraphNode[]
  readonly reports: readonly GraphNode[]
  readonly settledPredictions: readonly GraphNode[]
  readonly recent: readonly GraphNode[]
}

function byRecency(left: GraphNode, right: GraphNode): number {
  return right.updatedAt - left.updatedAt || left.id.localeCompare(right.id)
}

export function deriveWorkflow(nodes: readonly GraphNode[]): WorkflowSummary {
  const sources = nodes.filter(node => node.kind === 'source').sort(byRecency)
  const compiledSessions = nodes.filter(node => node.kind === 'session'
    && node.metadata.status === 'compiled'
    && typeof node.metadata.compileRunId === 'string'
    && node.metadata.compileRunId.length > 0).sort(byRecency)
  const hypotheses = nodes.filter(node => (HYPOTHESIS_KINDS as readonly string[]).includes(node.kind)).sort(byRecency)
  const reports = nodes.filter(node => node.kind === 'deliverable').sort(byRecency)
  const settledPredictions = nodes.filter(node => node.kind === 'prediction'
    && (node.metadata.status === 'resolved' || node.metadata.status === 'error')).sort(byRecency)
  const groups = [sources, compiledSessions, hypotheses, reports, settledPredictions] as const
  const keys: readonly WorkflowStageKey[] = ['collect', 'compile', 'hypotheses', 'report', 'review']
  const stages = keys.map((key, index) => {
    const records = groups[index] ?? []
    return { key, complete: records.length > 0, count: records.length }
  })
  const workflowIds = new Set([...sources, ...hypotheses, ...reports, ...nodes.filter(node => node.kind === 'prediction')].map(node => node.id))
  const recent = nodes.filter(node => workflowIds.has(node.id)).sort(byRecency).slice(0, 8)
  return {
    stages,
    next: stages.find(stage => !stage.complete)?.key ?? null,
    sources,
    compiledSessions,
    hypotheses,
    reports,
    settledPredictions,
    recent,
  }
}
