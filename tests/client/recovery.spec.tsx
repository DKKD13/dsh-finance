import { createElement } from 'react'
import { renderToString } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { WorkbenchStore } from '../../client/store.ts'
import type { GraphGateway, Translate } from '../../client/store.ts'
import { AuditPanel } from '../../client/ui/AuditPanel.tsx'
import { HistoryPanel } from '../../client/ui/HistoryPanel.tsx'
import { en } from '../../client/locales.ts'
import type { RevisionEntry } from '../../src/store.ts'
import type { GraphRequest, GraphResponse } from '../../src/protocol.ts'

const t: Translate = (key, params) => {
  const template: string = en[key as keyof typeof en] ?? key
  if (params === undefined) return template
  return Object.entries(params).reduce((text, [name, value]) => text.replaceAll(`{${name}}`, String(value)), template)
}

const diff = { nodesAdded: [], nodesRemoved: [], nodesUpdated: [], edgesAdded: [], edgesRemoved: [] }
const cleanAudit = { brokenEdges: [], brokenRefs: [], unresolvedRefs: [], orphans: [] }

function entry(revision: number): RevisionEntry & Record<string, import('../../src/graph.ts').JsonValue> {
  return { revision, at: 1_700_000_000_000 + revision, op: 'node.create', summary: `revision ${revision}`, diff } as RevisionEntry & Record<string, import('../../src/graph.ts').JsonValue>
}

function snapshot(): GraphResponse {
  return { ok: true, revision: 0, result: { revision: 0, nodes: [], edges: [] } }
}

describe('History and Audit independent recovery', () => {
  it('shows a structured History failure, retries, and retains old entries on a later refresh failure', async () => {
    const responses: GraphResponse[] = [
      { ok: false, error: { code: 'HISTORY_OFFLINE', message: 'history unavailable' } },
      { ok: true, revision: 1, result: { revision: 1, earliestRetainedRevision: 0, entries: [entry(1)] } },
      { ok: false, error: { code: 'HISTORY_REFRESH_FAILED', message: 'refresh unavailable' } },
    ]
    const store = new WorkbenchStore({ request: async request => request.op === 'graph.snapshot' ? snapshot() : request.op === 'history.list' ? responses.shift() ?? snapshot() : snapshot() }, t)
    await store.load()
    store.setMode('history')
    await new Promise(resolve => setImmediate(resolve))

    expect(store.getSnapshot()).toMatchObject({ history: null, historyLoading: false, historyError: { code: 'HISTORY_OFFLINE' } })
    const failed = renderToString(createElement(HistoryPanel, { store, t })).replaceAll('<!-- -->', '')
    expect(failed).toContain('HISTORY_OFFLINE: history unavailable')
    expect(failed).toContain('Retry')
    expect(failed).not.toContain('rg-skeleton')

    await store.loadHistory()
    expect(store.getSnapshot()).toMatchObject({ historyLoading: false, historyError: null })
    expect(store.getSnapshot().history?.map(item => item.revision)).toEqual([1])

    await store.loadHistory()
    expect(store.getSnapshot().history?.map(item => item.revision)).toEqual([1])
    expect(store.getSnapshot().historyError?.code).toBe('HISTORY_REFRESH_FAILED')
    const stale = renderToString(createElement(HistoryPanel, { store, t }))
    expect(stale).toContain('HISTORY_REFRESH_FAILED')
    expect(stale).toContain('revision 1')
  })

  it('shows a structured Audit failure, retries, and retains the previous report on refresh failure', async () => {
    const responses: GraphResponse[] = [
      { ok: false, error: { code: 'AUDIT_OFFLINE', message: 'audit unavailable' } },
      { ok: true, revision: 0, result: { ...cleanAudit, orphans: ['memory:old'] } },
      { ok: false, error: { code: 'AUDIT_REFRESH_FAILED', message: 'refresh unavailable' } },
    ]
    const store = new WorkbenchStore({ request: async request => request.op === 'graph.snapshot' ? snapshot() : request.op === 'audit' ? responses.shift() ?? snapshot() : snapshot() }, t)
    await store.load()
    store.setMode('audit')
    await new Promise(resolve => setImmediate(resolve))

    expect(store.getSnapshot()).toMatchObject({ audit: null, auditLoading: false, auditError: { code: 'AUDIT_OFFLINE' } })
    const failed = renderToString(createElement(AuditPanel, { store, t })).replaceAll('<!-- -->', '')
    expect(failed).toContain('AUDIT_OFFLINE: audit unavailable')
    expect(failed).toContain('Retry')
    expect(failed).not.toContain('rg-skeleton')

    await store.loadAudit()
    expect(store.getSnapshot().audit?.orphans).toEqual(['memory:old'])
    await store.loadAudit()
    expect(store.getSnapshot().audit?.orphans).toEqual(['memory:old'])
    expect(store.getSnapshot().auditError?.code).toBe('AUDIT_REFRESH_FAILED')
    const stale = renderToString(createElement(AuditPanel, { store, t }))
    expect(stale).toContain('AUDIT_REFRESH_FAILED')
    expect(stale).toContain('memory:old')
  })

  it('does not let older History or Audit responses overwrite their own newer request', async () => {
    const pending: { request: GraphRequest; resolve: (response: GraphResponse) => void }[] = []
    const gateway: GraphGateway = {
      request: request => request.op === 'graph.snapshot'
        ? Promise.resolve(snapshot())
        : new Promise<GraphResponse>(resolve => { pending.push({ request, resolve }) }),
    }
    const store = new WorkbenchStore(gateway, t)
    await store.load()
    const firstHistory = store.loadHistory()
    const firstAudit = store.loadAudit()
    const secondHistory = store.loadHistory()
    const secondAudit = store.loadAudit()
    expect(pending.map(item => item.request.op)).toEqual(['history.list', 'audit', 'history.list', 'audit'])

    pending[2]?.resolve({ ok: true, revision: 2, result: { revision: 2, earliestRetainedRevision: 0, entries: [entry(2)] } })
    pending[3]?.resolve({ ok: true, revision: 2, result: { ...cleanAudit, orphans: ['memory:new'] } })
    await Promise.all([secondHistory, secondAudit])
    pending[0]?.resolve({ ok: true, revision: 1, result: { revision: 1, earliestRetainedRevision: 0, entries: [entry(1)] } })
    pending[1]?.resolve({ ok: true, revision: 1, result: { ...cleanAudit, orphans: ['memory:old'] } })
    await Promise.all([firstHistory, firstAudit])

    expect(store.getSnapshot().history?.map(item => item.revision)).toEqual([2])
    expect(store.getSnapshot().audit?.orphans).toEqual(['memory:new'])
    expect(store.getSnapshot().historyLoading).toBe(false)
    expect(store.getSnapshot().auditLoading).toBe(false)
  })
})
