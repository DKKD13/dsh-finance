/** History-first report archive layered over incumbent workbench classes. */
export const REPORT_HISTORY_STYLE = `
[data-rg-root] .rg-reports-section { height: auto; overflow: visible; }
[data-rg-root] .rg-report-history { flex: none; align-items: start; grid-template-columns: 280px minmax(0, 1fr); }
[data-rg-root] .rg-report-history .rg-report-reader { height: auto; overflow: visible; }
[data-rg-root] .rg-report-history .rg-report-reading-layout { display: flex; flex-direction: column; }
[data-rg-root] .rg-report-history .rg-report-markdown { order: 0; width: 100%; }
[data-rg-root] .rg-report-history .rg-report-outline { order: 1; width: 100%; padding: 18px 0 0; border-right: 0; border-top: 1px solid var(--dsw-alias-border-l1); }
[data-rg-root] .rg-report-history-select strong { white-space: normal; }

[data-rg-root] .rg-report-history-head { align-items: center; }
[data-rg-root] .rg-report-history-head > div:first-child { min-width: 0; }
[data-rg-root] .rg-report-history-head-actions { display: flex; align-items: center; justify-content: flex-end; gap: 12px; flex: none; }
[data-rg-root] .rg-report-history-head-actions > span { color: var(--dsw-alias-label-tertiary); font-size: 11px; font-variant-numeric: tabular-nums; }
[data-rg-root] .rg-report-history-list { list-style: none; margin: 0; padding: 0; }
[data-rg-root] .rg-report-history-item { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 8px; align-items: center; min-width: 0; border-bottom: 1px solid var(--dsw-alias-border-l1); }
[data-rg-root] .rg-report-history-item:hover { background: var(--dsw-alias-interactive-bg-hover); }
[data-rg-root] .rg-report-history-item[data-selected] { background: var(--dsw-alias-bg-multi-select); }
[data-rg-root] .rg-report-history-select { display: grid; gap: 7px; min-width: 0; width: 100%; padding: 14px 12px 13px; text-align: left; }
[data-rg-root] .rg-report-history-select strong { min-width: 0; color: var(--dsw-alias-label-primary); font-size: 13px; font-weight: 550; line-height: 1.45; overflow-wrap: anywhere; }
[data-rg-root] .rg-report-history-meta { display: flex; align-items: center; flex-wrap: wrap; gap: 4px 10px; min-width: 0; color: var(--dsw-alias-label-tertiary); font-size: 10px; line-height: 1.4; }
[data-rg-root] .rg-report-history-meta > span { min-width: 0; overflow-wrap: anywhere; }
[data-rg-root] .rg-report-history-meta > span + span::before { content: '·'; margin-right: 10px; color: var(--dsw-alias-label-tertiary); }
[data-rg-root] .rg-report-history-symbol { color: var(--dsw-alias-label-secondary); font-family: var(--ds-font-family-code, monospace); font-size: 10px; }
[data-rg-root] .rg-report-history-meta time { margin-left: auto; color: var(--dsw-alias-label-tertiary); font-variant-numeric: tabular-nums; white-space: nowrap; }
[data-rg-root] .rg-report-history-conversation { align-self: start; margin: 12px 10px 0 0; padding: 4px 6px; border-radius: var(--dsw-radius-sm, 6px); color: var(--dsw-alias-label-secondary); font-size: 10px; white-space: nowrap; }
[data-rg-root] .rg-report-history-conversation:hover { background: var(--dsw-alias-bg-layer-2); color: var(--dsw-alias-label-primary); }
[data-rg-root] .rg-report-history-empty { display: grid; justify-items: start; gap: 14px; padding: 24px 12px; }
[data-rg-root] .rg-report-history-empty .rg-finance-empty { padding: 0; text-align: left; }
[data-rg-root] .rg-report-history-reader-head { align-items: flex-start; }
[data-rg-root] .rg-report-history-reader-head > div:nth-child(2) { min-width: 0; flex: 1 1 100%; }
[data-rg-root] .rg-report-history-reader-head h3 { line-height: 1.35; }
[data-rg-root] .rg-report-history-reader-head time { display: block; margin-top: 6px; color: var(--dsw-alias-label-tertiary); font-size: 10px; font-variant-numeric: tabular-nums; }
[data-rg-root] .rg-report-history-detail-meta { display: flex; flex-wrap: wrap; align-items: center; gap: 5px 12px; color: var(--dsw-alias-label-secondary); font-size: 11px; }
[data-rg-root] .rg-report-history-detail-meta > span + span::before { content: '·'; margin-right: 12px; color: var(--dsw-alias-label-tertiary); }
[data-rg-root] .rg-report-history-actions { display: flex; align-items: center; justify-content: flex-start; flex: none; flex-wrap: wrap; gap: 7px; }
[data-rg-root] .rg-report-history .rg-start-research { margin: 0 0 16px; padding: 16px; border: 1px solid var(--dsw-alias-border-l2); border-radius: var(--dsw-radius-md, 8px); }
[data-rg-root] .rg-report-history .rg-report-reading-layout { margin-top: 22px; }
`
