/**
 * The plugin's retained panel catalogue. Finance is the single sidebar entry;
 * every keyed `main` address remains available for existing direct links. The
 * research-graph entry keeps the original workbench; the five finance entries
 * open the same shared stores at a different mode and section, so switching
 * entries never creates a second graph or finance store.
 * @module dsh-research-graph/client/entries
 */

import type { ComponentType } from 'react'
import type { FinanceSection, FinanceStore } from './finance-store.ts'
import type { WorkbenchMode, WorkbenchStore } from './store.ts'
import {
  FinancePanelIcon,
  GraphPanelIcon,
  GuidePanelIcon,
  LibraryPanelIcon,
  MarketPanelIcon,
  ResearchPanelIcon,
} from './panel-icons.tsx'
import type { PanelIconProps } from './panel-icons.tsx'

/** One global panel and its sidebar row. */
export interface PanelEntry {
  /** Sidebar id and main-slot key: they must be exactly equal. */
  readonly id: string
  /** Ascending sidebar row order. */
  readonly order: number
  /** Sidebar label, accessible name, and page header title. */
  readonly labelKey: string
  /** Workbench mode applied whenever this entry becomes active. */
  readonly mode: WorkbenchMode
  /** Finance section applied with the mode; omitted for the graph entry. */
  readonly section?: FinanceSection | undefined
  readonly icon: ComponentType<PanelIconProps>
}

/** The original graph workbench; kept unchanged. */
export const RESEARCH_GRAPH_ENTRY: PanelEntry = {
  id: 'research-graph',
  order: 100,
  labelKey: 'panel.title',
  mode: 'graph',
  icon: GraphPanelIcon,
}

/** Every entry, in sidebar order. */
export const PANEL_ENTRIES: readonly PanelEntry[] = [
  RESEARCH_GRAPH_ENTRY,
  { id: 'finance-workbench', order: 110, labelKey: 'panel.finance', mode: 'finance', section: 'markets', icon: FinancePanelIcon },
  { id: 'finance-library', order: 120, labelKey: 'panel.library', mode: 'finance', section: 'inbox', icon: LibraryPanelIcon },
  { id: 'finance-research', order: 130, labelKey: 'panel.research', mode: 'finance', section: 'hypotheses', icon: ResearchPanelIcon },
  { id: 'finance-market', order: 140, labelKey: 'panel.market', mode: 'finance', section: 'market', icon: MarketPanelIcon },
  { id: 'finance-guide', order: 150, labelKey: 'panel.guide', mode: 'finance', section: 'guide', icon: GuidePanelIcon },
]

/** Finance entries only, for direct testing and the guide. */
export const FINANCE_ENTRIES: readonly PanelEntry[] = PANEL_ENTRIES.filter(entry => entry.section !== undefined)

/** Look up one entry by its main key / sidebar id. */
export function entryByPanelId(id: string | null | undefined): PanelEntry | undefined {
  if (id === null || id === undefined) return undefined
  return PANEL_ENTRIES.find(entry => entry.id === id)
}

/**
 * Apply an entry's default mode and section to the shared stores. Called from
 * the layout subscription (so selection initialises before paint) and again
 * on main-panel mount (so a live reload or a direct registration does too).
 * @param entry - selected panel entry.
 * @param workbench - shared graph workbench store.
 * @param finance - shared finance store, when the client registered it.
 */
export function activatePanel(entry: PanelEntry, workbench: WorkbenchStore, finance?: FinanceStore | undefined): void {
  workbench.setMode(entry.mode)
  if (entry.section !== undefined && finance !== undefined) finance.setSection(entry.section)
}
