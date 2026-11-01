/**
 * Sidebar glyphs for the plugin's global panels. Every icon is one 18×18
 * single-stroke drawing in the shell's icon grammar, so the finance entries
 * read as siblings of the existing graph glyph rather than a second icon set.
 * @module dsh-research-graph/client/panel-icons
 */

export interface PanelIconProps {
  readonly size?: number
  readonly active?: boolean
}

function iconStroke(active: boolean | undefined): number {
  return active === true ? 1.7 : 1.4
}

/** Research graph: three connected nodes. */
export function GraphPanelIcon({ size = 18 }: PanelIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 18 18" aria-hidden>
      <g fill="none" stroke="currentColor" strokeWidth={1.4} strokeLinecap="round">
        <path d="M5 5.2 12.4 3.6 M5.6 6.4 8.2 12 M13.4 5.4 9.6 12.2" />
        <circle cx="4.4" cy="5.4" r="2.1" />
        <circle cx="13.6" cy="4.4" r="2.1" />
        <circle cx="8.8" cy="13.2" r="2.1" />
      </g>
    </svg>
  )
}

/** Finance workbench: a ledger with a rising exposure line. */
export function FinancePanelIcon({ size = 18, active }: PanelIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 18 18" aria-hidden data-active={active || undefined}>
      <g fill="none" stroke="currentColor" strokeWidth={iconStroke(active)} strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 4.2h12M3 8.1h7.6M3 12h4.8" />
        <path d="M10.2 13.2 12.4 9l2.2 2.1 1.9-3.3" />
      </g>
    </svg>
  )
}

/** Finance library: an open evidence book. */
export function LibraryPanelIcon({ size = 18, active }: PanelIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 18 18" aria-hidden data-active={active || undefined}>
      <g fill="none" stroke="currentColor" strokeWidth={iconStroke(active)} strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 4.2c2.2-.8 4.2-.8 6 .3v9.3c-1.8-1.1-3.8-1.1-6-.3z" />
        <path d="M15 4.2c-2.2-.8-4.2-.8-6 .3v9.3c1.8-1.1 3.8-1.1 6-.3z" />
        <path d="M5.2 7.1c.8-.2 1.6-.2 2.4 0M5.2 9.4c.8-.2 1.6-.2 2.4 0" />
      </g>
    </svg>
  )
}

/** Finance research: one evidence node opening into two hypotheses. */
export function ResearchPanelIcon({ size = 18, active }: PanelIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 18 18" aria-hidden data-active={active || undefined}>
      <g fill="none" stroke="currentColor" strokeWidth={iconStroke(active)} strokeLinecap="round" strokeLinejoin="round">
        <circle cx="4.5" cy="9" r="2" />
        <path d="M6.5 8.2 9.2 5.8M6.5 9.8l2.7 2.4" />
        <circle cx="12.1" cy="4.9" r="1.9" />
        <circle cx="12.1" cy="13.1" r="1.9" />
        <path d="M12.1 6.8v4.4" />
      </g>
    </svg>
  )
}

/** Finance market: three candles over a baseline. */
export function MarketPanelIcon({ size = 18, active }: PanelIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 18 18" aria-hidden data-active={active || undefined}>
      <g fill="none" stroke="currentColor" strokeWidth={iconStroke(active)} strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 14.8h12" />
        <path d="M5 4.4v9.6M3.9 6.3h2.2v3.1H3.9z" />
        <path d="M9 3.2v10.8M7.9 8.2h2.2v3.4H7.9z" />
        <path d="M13 5.2v9M11.9 5.6h2.2v2.7h-2.2z" />
      </g>
    </svg>
  )
}

/** Guide: a compass with one marked bearing. */
export function GuidePanelIcon({ size = 18, active }: PanelIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 18 18" aria-hidden data-active={active || undefined}>
      <g fill="none" stroke="currentColor" strokeWidth={iconStroke(active)} strokeLinecap="round" strokeLinejoin="round">
        <circle cx="9" cy="9" r="6.3" />
        <path d="m11.6 6.4-1.5 3.7-3.7 1.5 1.5-3.7z" />
        <circle cx="9" cy="9" r=".7" />
      </g>
    </svg>
  )
}
