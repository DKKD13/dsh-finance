import { createElement } from 'react'
import { renderToString } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { deriveWorkflow } from '../../client/workflow.ts'
import { OverviewPanel } from '../../client/ui/FinancePanels.tsx'
import { FinanceStore } from '../../client/finance-store.ts'
import { en } from '../../client/locales.ts'
import type { Translate } from '../../client/store.ts'
import type { GraphNode, NodeKind } from '../../src/graph.ts'

const t: Translate = (key, params) => {
  const template: string = en[key as keyof typeof en] ?? key
  if (params === undefined) return template
  return Object.entries(params).reduce((text, [name, value]) => text.replaceAll(`{${name}}`, String(value)), template)
}

function node(id: string, kind: NodeKind, updatedAt: number, metadata: GraphNode['metadata'] = {}): GraphNode {
  return { id, kind, title: id, content: id, metadata, createdAt: 1, updatedAt }
}

const source = node('source:evidence', 'source', 10)
const compiled = node('session:compile:run-1', 'session', 20, { status: 'compiled', compileRunId: 'compile:run-1', runId: 'compile:run-1' })
const hypothesis = node('claim:compile:run-1:h1', 'claim', 30, { compileRunId: 'compile:run-1', claimType: 'hypothesis' })
const report = node('deliverable:research', 'deliverable', 40)
const pending = node('prediction:pending', 'prediction', 50, { status: 'pending' })
const resolved = node('prediction:resolved', 'prediction', 60, { status: 'resolved', resolvedAt: '2026-01-02T00:00:00Z' })

function renderWorkflow(nodes: readonly GraphNode[]): string {
  const store = new FinanceStore({ request: async () => ({ ok: true, revision: 0, result: {} }) }, t)
  return renderToString(createElement(OverviewPanel, {
    store, t, nodes, graphRevision: 17, graphPhase: 'ready', graphError: null,
    onRefreshGraph: async () => {}, onOpenLibrary: () => {}, onOpenHypothesis: () => {},
    onOpenReport: () => {}, onOpenGraph: () => {}, onOpenAudit: () => {},
  }))
}

describe('research workflow graph state', () => {
  it('uses an empty graph to recommend Add source without inventing progress', () => {
    const workflow = deriveWorkflow([])
    expect(workflow.next).toBe('collect')
    expect(workflow.stages.every(stage => !stage.complete && stage.count === 0)).toBe(true)
    const html = renderWorkflow([])
    expect(html).toContain('Research workflow')
    expect(html).toContain('Start with a real source')
    expect(html).toContain('Add source')
    expect(html).toContain('rev 17')
    expect(html).toContain('No source, hypothesis, report, or prediction records exist yet.')
    expect(html).not.toContain('%')
  })

  it('requires a real compiled session even when source and hypothesis-like records exist', () => {
    const workflow = deriveWorkflow([source, hypothesis])
    expect(workflow.next).toBe('compile')
    expect(workflow.stages.find(stage => stage.key === 'compile')).toMatchObject({ complete: false, count: 0 })
    expect(workflow.stages.find(stage => stage.key === 'hypotheses')).toMatchObject({ complete: true, count: 1 })
    expect(renderWorkflow([source, hypothesis])).toContain('Compile source')
  })

  it('handles partial completion and does not count a pending prediction as reviewed', () => {
    const workflow = deriveWorkflow([source, compiled, hypothesis, report, pending])
    expect(workflow.next).toBe('review')
    expect(workflow.stages.map(stage => stage.complete)).toEqual([true, true, true, true, false])
    expect(workflow.recent.map(record => record.id)).toEqual(['prediction:pending', 'deliverable:research', 'claim:compile:run-1:h1', 'source:evidence'])
    expect(workflow.recent.some(record => record.id === compiled.id)).toBe(false)
    const html = renderWorkflow([source, compiled, hypothesis, report, pending])
    expect(html).toContain('Record prediction')
    expect(html).toContain('Audit graph')
    expect(html).toContain('Settled predictions: 0')
  })

  it('marks all stages recorded only from a complete graph-backed pass', () => {
    const workflow = deriveWorkflow([source, compiled, hypothesis, report, pending, resolved])
    expect(workflow.next).toBeNull()
    expect(workflow.stages.every(stage => stage.complete)).toBe(true)
    expect(workflow.recent[0]?.id).toBe(resolved.id)
    const html = renderWorkflow([source, compiled, hypothesis, report, pending, resolved])
    expect(html).toContain('A complete recorded pass is in the graph')
    expect(html).toContain('Review predictions')
    expect(html).toContain('Settled predictions: 1')
    expect(html).toContain('Record coverage does not certify research quality.')
  })
})
