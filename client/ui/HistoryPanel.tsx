/**
 * History mode: the retained revision timeline with per-revision diff
 * inspection and explicit from/to range replay. Selecting a revision shows
 * its own change; the range controls diff any admitted interval. Diff entries
 * that still exist link back to the node on the canvas.
 * @module dsh-research-graph/client/ui/HistoryPanel
 */

import { useState } from 'react'
import type { KeyboardEvent } from 'react'
import type { RevisionEntry } from '../../src/store.ts'
import { formatTime, useWorkbench } from './common.ts'
import type { ViewProps } from './common.ts'

/** The revision timeline and diff viewer. */
export function HistoryPanel({ store, t }: ViewProps) {
  const state = useWorkbench(store)
  const [rangeFrom, setRangeFrom] = useState('')
  const [rangeTo, setRangeTo] = useState('')
  const [focusedRevision, setFocusedRevision] = useState<number | null>(null)

  if (state.history === null && state.historyError !== null) {
    return <div className="rg-state" role="alert"><p className="rg-state-title">{t('history.errorTitle')}</p><p className="rg-state-detail">{state.historyError.code}: {state.historyError.message}</p><button type="button" className="rg-btn" data-primary disabled={state.historyLoading} onClick={() => { void store.loadHistory() }}>{t('state.error.retry')}</button></div>
  }
  if (state.history === null) {
    return (
      <div className="rg-state" role="status">
        <div className="rg-skeleton" />
        <div className="rg-skeleton" />
      </div>
    )
  }

  const entries = [...state.history].reverse()
  const nodeTitle = (id: string): string => state.nodes.find(node => node.id === id)?.title ?? id
  const selectedRevision = state.diff !== null && state.diff.to === state.diff.from + 1 ? state.diff.to : null
  const activeRevision = entries.some(entry => entry.revision === focusedRevision) ? focusedRevision : selectedRevision ?? entries[0]?.revision
  const navigate = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const next = event.key === 'ArrowUp' ? Math.max(0, index - 1)
      : event.key === 'ArrowDown' ? Math.min(entries.length - 1, index + 1)
        : event.key === 'Home' ? 0
          : event.key === 'End' ? entries.length - 1 : -1
    const entry = entries[next]
    if (entry === undefined) return
    event.preventDefault()
    setFocusedRevision(entry.revision)
    event.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>('[role="option"]').item(next).focus()
    void store.inspectDiff(entry.revision - 1, entry.revision)
  }

  return (
    <div className="rg-history">
      <div className="rg-history-list" role="listbox" aria-label={t('history.title')}>
        {state.earliestRetainedRevision > 0 && (
          <div className="rg-history-note" style={{ padding: '8px 16px' }}>
            {t('history.truncated', { earliest: state.earliestRetainedRevision })}
          </div>
        )}
        {entries.length === 0 && <div className="rg-state">{t('history.empty')}</div>}
        {entries.map((entry, index) => (
          <HistoryRow
            key={entry.revision}
            entry={entry}
            current={entry.revision === state.revision}
            selected={selectedRevision === entry.revision}
            tabIndex={activeRevision === entry.revision ? 0 : -1}
            onFocus={() => { setFocusedRevision(entry.revision) }}
            onNavigate={event => { navigate(event, index) }}
            onSelect={() => { void store.inspectDiff(entry.revision - 1, entry.revision) }}
            t={t}
          />
        ))}
      </div>
      <div className="rg-history-detail">
        {state.historyError !== null && <div className="rg-finance-form-error" role="alert"><p>{t('history.errorTitle')}: {state.historyError.code}: {state.historyError.message}</p><button type="button" className="rg-btn" disabled={state.historyLoading} onClick={() => { void store.loadHistory() }}>{t('state.error.retry')}</button></div>}
        <div className="rg-history-range">
          <label className="rg-field-label" htmlFor="rg-range-from">{t('history.rangeFrom')}</label>
          <input id="rg-range-from" inputMode="numeric" value={rangeFrom} onChange={event => { setRangeFrom(event.target.value) }} placeholder="0" />
          <label className="rg-field-label" htmlFor="rg-range-to">{t('history.rangeTo')}</label>
          <input id="rg-range-to" inputMode="numeric" value={rangeTo} onChange={event => { setRangeTo(event.target.value) }} placeholder={String(state.revision)} />
          <button
            type="button"
            className="rg-btn"
            disabled={!/^\d+$/u.test(rangeFrom)}
            onClick={() => {
              const from = Number.parseInt(rangeFrom, 10)
              const to = /^\d+$/u.test(rangeTo) ? Number.parseInt(rangeTo, 10) : undefined
              void store.inspectDiff(from, to)
            }}
          >
            {t('history.rangeApply')}
          </button>
          {state.diff !== null && (
            <button type="button" className="rg-btn" onClick={() => { store.clearDiff() }}>{t('history.closeDiff')}</button>
          )}
        </div>
        {state.diff !== null && <DiffView store={store} t={t} nodeTitle={nodeTitle} />}
        {state.diff === null && (
          <p style={{ color: 'var(--dsw-alias-label-tertiary)' }}>{t('history.hint')}</p>
        )}
      </div>
    </div>
  )
}

/** One revision row. */
function HistoryRow({ entry, current, selected, tabIndex, onFocus, onNavigate, onSelect, t }: {
  readonly entry: RevisionEntry
  readonly current: boolean
  readonly selected: boolean
  readonly tabIndex: number
  readonly onFocus: () => void
  readonly onNavigate: (event: KeyboardEvent<HTMLButtonElement>) => void
  readonly onSelect: () => void
  readonly t: ViewProps['t']
}) {
  const changes = entry.diff.nodesAdded.length + entry.diff.nodesRemoved.length + entry.diff.nodesUpdated.length
    + entry.diff.edgesAdded.length + entry.diff.edgesRemoved.length
  return (
    <button type="button" role="option" aria-selected={selected} tabIndex={tabIndex} className="rg-history-item" data-selected={selected || undefined} onFocus={onFocus} onKeyDown={onNavigate} onClick={onSelect}>
      <span className="rg-history-op">{entry.op}</span>
      <div className="rg-history-summary">{entry.summary}</div>
      <div className="rg-history-meta">
        <span>r{entry.revision}{current ? ` · ${t('history.current')}` : ''}</span>
        <span>{formatTime(entry.at, undefined)}</span>
        <span>{changes === 0 ? '—' : `±${changes}`}</span>
      </div>
    </button>
  )
}

/** The inspected diff, grouped by change kind. */
function DiffView({ store, t, nodeTitle }: ViewProps & { readonly nodeTitle: (id: string) => string }) {
  const state = useWorkbench(store)
  const diff = state.diff
  if (diff === null) return null
  const { value } = diff
  const empty = value.nodesAdded.length + value.nodesRemoved.length + value.nodesUpdated.length
    + value.edgesAdded.length + value.edgesRemoved.length === 0
  const heading = diff.to === diff.from + 1
    ? t('history.diffOf', { revision: diff.to })
    : t('history.diffRange', { from: diff.from, to: diff.to })

  const group = (title: string, ids: readonly string[], marker: 'added' | 'removed' | undefined, select?: (id: string) => void) => (
    ids.length === 0 ? null : (
      <div className="rg-diff-group" key={title}>
        <h4 className="rg-diff-title">{title} ({ids.length})</h4>
        <ul className="rg-diff-list">
          {ids.map(id => (
            <li key={id}>
              <button
                type="button"
                {...(marker === undefined ? {} : { [`data-${marker}`]: true })}
                onClick={() => { select?.(id) }}
              >
                {nodeTitle(id)} <span style={{ opacity: 0.6 }}>{id}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    )
  )

  const jumpToNode = (id: string) => {
    store.revealNode(id)
  }

  return (
    <div>
      <h3 className="rg-section-title" style={{ fontSize: 13 }}>{heading}</h3>
      {empty && <p style={{ color: 'var(--dsw-alias-label-tertiary)' }}>{t('history.noChanges')}</p>}
      {group(t('history.nodesAdded'), value.nodesAdded, 'added', jumpToNode)}
      {group(t('history.nodesRemoved'), value.nodesRemoved, 'removed')}
      {value.nodesUpdated.length > 0 && (
        <div className="rg-diff-group">
          <h4 className="rg-diff-title">{t('history.nodesUpdated')} ({value.nodesUpdated.length})</h4>
          <ul className="rg-diff-list">
            {value.nodesUpdated.map(entry => (
              <li key={entry.id}>
                <button type="button" onClick={() => { jumpToNode(entry.id) }}>
                  {nodeTitle(entry.id)} <span style={{ opacity: 0.6 }}>{entry.id} ({entry.fields.join(', ')})</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
      {group(t('history.edgesAdded'), value.edgesAdded, 'added')}
      {group(t('history.edgesRemoved'), value.edgesRemoved, 'removed')}
    </div>
  )
}
