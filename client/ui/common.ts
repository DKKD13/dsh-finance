/**
 * Shared view helpers: the store subscription hook and the common prop face
 * every workbench component receives.
 * @module deepseek-harness-finance-plugin/client/ui/common
 */

import { useSyncExternalStore } from 'react'
import type { WorkbenchState, WorkbenchStore, Translate } from '../store.ts'
import type { NodeKind, EdgeKind } from '../../src/graph.ts'

/** Props every workbench component shares. */
export interface ViewProps {
  readonly store: WorkbenchStore
  readonly t: Translate
}

/** Subscribe a component to the workbench store. */
export function useWorkbench(store: WorkbenchStore): WorkbenchState {
  return useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot)
}

/** Locale key for one node kind chip/label. */
export function kindLabelKey(kind: NodeKind): string {
  return `kind.${kind}`
}

/** Locale key for one edge kind label. */
export function edgeLabelKey(kind: EdgeKind): string {
  return `edge.${kind}`
}

/** Trim a node title for the canvas label. */
export function shortTitle(title: string, max = 18): string {
  return title.length > max ? `${title.slice(0, max - 1)}…` : title
}

/** Format epoch milliseconds as a short local timestamp. */
export function formatTime(at: number, locale: string | undefined): string {
  const date = new Date(at)
  const today = new Date()
  const sameDay = date.toDateString() === today.toDateString()
  const time = date.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })
  if (sameDay) return time
  return `${date.toLocaleDateString(locale, { month: '2-digit', day: '2-digit' })} ${time}`
}
