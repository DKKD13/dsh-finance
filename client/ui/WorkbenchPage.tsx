/**
 * The workbench page: header (title, revision, search, mode tabs, admin
 * actions), the filter rail, and the mode body — the map-over-ledger split
 * for graph work, the timeline for history, the report for audit. Loading,
 * error, empty, and notice states live here.
 * @module dsh-research-graph/client/ui/WorkbenchPage
 */

import { useEffect } from 'react'
import { EDGE_KINDS, NODE_KINDS } from '../../src/graph.ts'
import { kindCounts } from '../store.ts'
import type { WorkbenchMode } from '../store.ts'
import { edgeLabelKey, kindLabelKey, useWorkbench } from './common.ts'
import type { ViewProps } from './common.ts'
import { GraphCanvas } from './GraphCanvas.tsx'
import { Ledger } from './Ledger.tsx'
import { Inspector } from './Inspector.tsx'
import { HistoryPanel } from './HistoryPanel.tsx'
import { AuditPanel } from './AuditPanel.tsx'
import { LinkDialog, NodeEditorDialog, RemoveDialog } from './Dialogs.tsx'
import { FinanceWorkspace } from './FinanceWorkspace.tsx'
import type { ConversationAccess } from './ConversationDialog.tsx'
import { FinanceEdgeIcon, FinanceKindIcon } from './FinanceCommon.tsx'
import type { FinanceStore } from '../finance-store.ts'
import type { ResearchStore } from '../research-store.ts'

const MODES: readonly WorkbenchMode[] = ['graph', 'finance', 'history', 'audit']

/** The full-page main panel. */
export function WorkbenchPage({ store, t, finance, research, conversations, titleKey = 'header.title', locale }: ViewProps & { readonly finance?: FinanceStore; readonly research?: ResearchStore | undefined; readonly conversations?: ConversationAccess | undefined; readonly titleKey?: string; readonly locale?: string | undefined }) {
  const state = useWorkbench(store)

  // A conversation may have written new artifacts while this panel was away.
  useEffect(() => {
    void store.loadIfChanged()
  }, [store])

  const counts = kindCounts(state.nodes)
  const filtering = state.query.length > 0 || state.kindFilter.length > 0 || state.edgeKindFilter.length > 0

  return (
    <div data-rg-root data-mode={state.mode} className="rg-page">
      {state.mode !== 'finance' && <header className="rg-header">
        <h1 className="rg-title">{t(titleKey)}</h1>
        <span className="rg-revision">{t('header.revision', { revision: state.revision })}</span>
        <span className="rg-stats">{t('header.stats', { nodes: state.nodes.length, edges: state.edges.length })}</span>
        <input
          className="rg-search"
          type="search"
          role="searchbox"
          aria-label={t('header.search.placeholder')}
          placeholder={t('header.search.placeholder')}
          value={state.query}
          onChange={event => { store.setQuery(event.target.value) }}
          onKeyDown={event => { if (event.key === 'Escape') store.setQuery('') }}
        />
        <span className="rg-spacer" />
        <div className="rg-tabs" role="tablist" aria-label={t(titleKey)}>
          {MODES.map((mode, index) => (
            <button
              key={mode}
              id={`rg-mode-${mode}`}
              type="button"
              role="tab"
              aria-selected={state.mode === mode}
              aria-controls="rg-mode-panel"
              tabIndex={state.mode === mode ? 0 : -1}
              className="rg-tab"
              data-active={state.mode === mode || undefined}
              onClick={() => { store.setMode(mode) }}
              onKeyDown={event => {
                let next: number
                if (event.key === 'ArrowLeft') next = (index + MODES.length - 1) % MODES.length
                else if (event.key === 'ArrowRight') next = (index + 1) % MODES.length
                else if (event.key === 'Home') next = 0
                else if (event.key === 'End') next = MODES.length - 1
                else return
                event.preventDefault()
                event.stopPropagation()
                const nextMode = MODES[next]
                if (nextMode === undefined) return
                event.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>('[role="tab"]').item(next).focus()
                store.setMode(nextMode)
              }}
            >
              {t(`mode.${mode}`)}
            </button>
          ))}
        </div>
        <>
          <button type="button" className="rg-btn" data-primary disabled={state.busy !== null} onClick={() => { store.openEditor({ kind: 'create' }) }}>
            {t('header.newNode')}
          </button>
          <button type="button" className="rg-btn" disabled={state.busy !== null} onClick={() => { void store.rebuildSkills() }}>
            {t('header.rebuild')}
          </button>
          <button type="button" className="rg-btn" disabled={state.busy !== null} onClick={() => { void store.exportMarkdown() }}>
            {t('header.export')}
          </button>
        </>
        <button type="button" className="rg-btn" disabled={state.busy !== null} onClick={() => { void store.refresh(); if (state.mode === 'finance') void finance?.refresh() }}>
          {t('header.refresh')}
        </button>
      </header>}

      {state.phase === 'ready' && state.mode === 'graph' && state.nodes.length > 0 && (
        <div className="rg-filters">
          <span className="rg-filter-group-label">{t('filter.kinds')}</span>
          {NODE_KINDS.map(kind => {
            const count = counts.get(kind)
            if (count === undefined) return null
            const on = state.kindFilter.includes(kind)
            return (
              <button
                key={kind}
                type="button"
                className="rg-chip"
                data-on={on || undefined}
                aria-pressed={on}
                style={{ '--rg-chip-color': `var(--rg-kind-${kind})` } as Record<string, string>}
                onClick={() => { store.toggleKind(kind) }}
              >
                <span className="rg-chip-dot" />
                <FinanceKindIcon kind={kind} />
                {t(kindLabelKey(kind))} {count}
              </button>
            )
          })}
          <span className="rg-filter-group-label" style={{ marginLeft: 8 }}>{t('filter.edgeKinds')}</span>
          {EDGE_KINDS.map(kind => {
            if (!state.edges.some(edge => edge.kind === kind)) return null
            const on = state.edgeKindFilter.includes(kind)
            return (
              <button
                key={kind}
                type="button"
                className="rg-chip"
                data-on={on || undefined}
                aria-pressed={on}
                style={{ '--rg-chip-color': `var(--rg-edge-${kind})` } as Record<string, string>}
                onClick={() => { store.toggleEdgeKind(kind) }}
              >
                <FinanceEdgeIcon kind={kind} />
                {t(edgeLabelKey(kind))}
              </button>
            )
          })}
          {filtering && (
            <button type="button" className="rg-chip" onClick={() => { store.clearFilters() }}>{t('filter.clear')}</button>
          )}
        </div>
      )}

      <div id="rg-mode-panel" className="rg-mode-panel" role={state.mode === 'finance' ? 'region' : 'tabpanel'} aria-label={state.mode === 'finance' ? t('finance.workspace') : undefined} aria-labelledby={state.mode === 'finance' ? undefined : `rg-mode-${state.mode}`}>
        {state.phase === 'loading' && state.mode !== 'finance' && (
          <div className="rg-state" role="status">
            <div className="rg-skeleton" />
            <div className="rg-skeleton" style={{ width: 'min(420px, 72%)' }} />
            <div className="rg-skeleton" style={{ width: 'min(220px, 40%)' }} />
            <span>{t('state.loading')}</span>
          </div>
        )}
        {state.phase === 'error' && state.error !== null && state.mode !== 'finance' && (
          <div className="rg-state" role="alert">
            <p className="rg-state-title">{state.error.code === 'NO_SESSION' ? t('state.noSession') : t('state.error.title')}</p>
            <p className="rg-state-detail">{state.error.code}: {state.error.message}</p>
            <button type="button" className="rg-btn" data-primary onClick={() => { void store.load() }}>{t('state.error.retry')}</button>
          </div>
        )}
        {state.phase === 'ready' && state.mode === 'graph' && (
          <div className="rg-body">
            <GraphCanvas store={store} t={t} />
            <Ledger store={store} t={t} />
            <Inspector store={store} t={t} />
          </div>
        )}
        {state.mode === 'finance' && (finance !== undefined
          ? <FinanceWorkspace
              store={finance}
              t={t}
              nodes={state.nodes}
              edges={state.edges}
              research={research}
              conversations={conversations}
              locale={locale}
              graphRevision={state.revision}
              graphPhase={state.phase}
              graphError={state.error}
              onRefreshGraph={() => store.refresh()}
              onOpenGraph={id => {
                if (id !== undefined && state.nodes.some(node => node.id === id)) store.revealNode(id)
                else store.setMode('graph')
              }}
              onOpenAudit={() => { store.setMode('audit') }}
              onOpenHistory={() => { store.setMode('history') }}
            />
          : <div className="rg-state" role="alert">{t('finance.unavailable')}</div>)}
        {state.phase === 'ready' && state.mode === 'history' && <HistoryPanel store={store} t={t} />}
        {state.phase === 'ready' && state.mode === 'audit' && <AuditPanel store={store} t={t} />}
      </div>

      {state.notice !== null && (
        <div className="rg-toast" data-tone={state.notice.tone === 'error' ? 'error' : undefined} role="status">
          {state.notice.text}
        </div>
      )}

      <NodeEditorDialog store={store} t={t} />
      <LinkDialog store={store} t={t} />
      <RemoveDialog store={store} t={t} />
    </div>
  )
}
