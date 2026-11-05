/**
 * The ledger: the strip under the canvas listing every visible node, synced
 * with the canvas selection in both directions. Keyboard: up/down moves the
 * row focus, Enter selects.
 * @module deepseek-harness-finance-plugin/client/ui/Ledger
 */

import { useEffect, useRef, useState } from 'react'
import type { KeyboardEvent } from 'react'
import { visibleNodes } from '../store.ts'
import { formatTime, kindLabelKey, useWorkbench } from './common.ts'
import { FinanceKindIcon } from './FinanceCommon.tsx'
import type { ViewProps } from './common.ts'

/** The node ledger strip. */
export function Ledger({ store, t }: ViewProps) {
  const state = useWorkbench(store)
  const rows = visibleNodes(state)
  const selectedRow = useRef<HTMLButtonElement | null>(null)
  const [focusedId, setFocusedId] = useState<string | null>(null)
  const activeId = rows.some(node => node.id === focusedId) ? focusedId : state.selectedId ?? rows[0]?.id

  // Keep the selected row in view when the canvas drives the selection.
  useEffect(() => {
    setFocusedId(state.selectedId)
    selectedRow.current?.scrollIntoView({ block: 'nearest' })
  }, [state.selectedId])

  const navigate = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const next = event.key === 'ArrowUp' ? Math.max(0, index - 1)
      : event.key === 'ArrowDown' ? Math.min(rows.length - 1, index + 1)
        : event.key === 'Home' ? 0
          : event.key === 'End' ? rows.length - 1 : -1
    const node = rows[next]
    if (node === undefined) return
    event.preventDefault()
    setFocusedId(node.id)
    store.select(node.id)
    event.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>('[role="option"]').item(next).focus()
  }

  return (
    <section className="rg-ledger" aria-label={t('ledger.title')}>
      <div className="rg-ledger-head">
        <span>{t('ledger.title')}</span>
        <span>{t('ledger.count', { shown: rows.length, total: state.nodes.length })}</span>
      </div>
      <div className="rg-ledger-rows" role="listbox" aria-label={t('ledger.title')}>
        {rows.map((node, index) => (
          <button
            key={node.id}
            type="button"
            role="option"
            aria-selected={state.selectedId === node.id}
            tabIndex={activeId === node.id ? 0 : -1}
            ref={state.selectedId === node.id ? selectedRow : undefined}
            className="rg-row"
            data-selected={state.selectedId === node.id || undefined}
            onFocus={() => { setFocusedId(node.id) }}
            onKeyDown={event => { navigate(event, index) }}
            onClick={() => { store.select(node.id) }}
            onMouseEnter={() => { store.hover(node.id) }}
            onMouseLeave={() => { store.hover(null) }}
          >
            <span className="rg-kind-chip" style={{ color: `var(--rg-kind-${node.kind})` }}>
              <span className="rg-chip-dot" style={{ background: `var(--rg-kind-${node.kind})` }} />
              <FinanceKindIcon kind={node.kind} />
              <span className="rg-kind-label">{t(kindLabelKey(node.kind))}</span>
            </span>
            <span className="rg-row-title">
              {node.title} <span className="rg-row-id">{node.id}</span>
            </span>
            <span className="rg-row-time">{formatTime(node.updatedAt, undefined)}</span>
          </button>
        ))}
      </div>
    </section>
  )
}
