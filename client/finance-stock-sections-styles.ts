export const STOCK_SECTIONS_STYLE = `
.rg-stock-sections {
  --rg-stock-border: var(--dsw-alias-border-l1);
  --rg-stock-muted: var(--dsw-alias-label-tertiary);
  --rg-stock-soft: var(--dsw-alias-bg-layer-2);
  min-width: 0;
  color: var(--dsw-alias-label-primary);
}
.rg-stock-sections * {
  box-sizing: border-box;
}
.rg-stock-sections button,
.rg-stock-sections input,
.rg-stock-sections textarea,
.rg-stock-sections select {
  font: inherit;
}
.rg-stock-sections button,
.rg-stock-sections select {
  cursor: pointer;
}
.rg-stock-sections button:disabled,
.rg-stock-sections select:disabled {
  cursor: not-allowed;
  opacity: .48;
}
.rg-stock-sections-card {
  min-width: 0;
  border: 1px solid var(--rg-stock-border);
  border-radius: 10px;
  background: var(--dsw-alias-bg-layer-1);
  overflow: hidden;
}
.rg-stock-sections-demo {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border-bottom: 1px solid var(--rg-stock-border);
  background: color-mix(in srgb, var(--dsw-alias-state-warn-primary) 8%, var(--dsw-alias-bg-layer-1));
  color: var(--dsw-alias-label-secondary);
  font-size: 11px;
}
.rg-stock-sections-demo strong {
  color: var(--dsw-alias-state-warn-primary);
  font-weight: 600;
}
.rg-stock-sections-source-note {
  margin: 0;
  padding: 9px 12px;
  border-bottom: 1px solid var(--rg-stock-border);
  color: var(--rg-stock-muted);
  background: var(--rg-stock-soft);
  font-size: 11px;
  line-height: 1.45;
}
.rg-stock-segmented {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 3px;
  padding: 3px;
  width: fit-content;
  max-width: 100%;
  border-radius: 8px;
  background: var(--rg-stock-soft);
}
.rg-stock-segmented button {
  min-height: 30px;
  padding: 4px 10px;
  border: 0;
  border-radius: 6px;
  color: var(--dsw-alias-label-secondary);
  background: transparent;
  font-size: 11px;
  white-space: nowrap;
}
.rg-stock-segmented button:hover {
  color: var(--dsw-alias-label-primary);
  background: var(--dsw-alias-interactive-bg-hover);
}
.rg-stock-segmented button[data-active] {
  color: var(--dsw-alias-label-primary);
  background: var(--dsw-alias-bg-layer-1);
  box-shadow: 0 0 0 1px color-mix(in srgb, var(--rg-stock-border) 68%, transparent);
  font-weight: 550;
}
.rg-stock-toolbar {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 10px 16px;
  padding: 10px;
  border-bottom: 1px solid var(--rg-stock-border);
}
.rg-stock-toolbar-actions {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-left: auto;
}
.rg-stock-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  min-height: 30px;
  padding: 4px 10px;
  border: 1px solid var(--rg-stock-border);
  border-radius: 7px;
  color: var(--dsw-alias-label-secondary);
  background: var(--dsw-alias-bg-layer-1);
  font-size: 11px;
  white-space: nowrap;
}
.rg-stock-button:hover:not(:disabled),
.rg-stock-button[data-active] {
  color: var(--dsw-alias-label-primary);
  background: var(--dsw-alias-interactive-bg-hover);
}
.rg-stock-button svg {
  width: 14px;
  height: 14px;
}
.rg-stock-icon-button {
  width: 30px;
  padding: 0;
}
.rg-stock-menu {
  position: absolute;
  z-index: 5;
  top: calc(100% + 5px);
  right: 10px;
  min-width: 184px;
  padding: 6px;
  border: 1px solid var(--rg-stock-border);
  border-radius: 8px;
  background: var(--dsw-alias-bg-layer-3);
  box-shadow: 0 14px 32px -20px rgba(0, 0, 0, .5);
}
.rg-stock-menu > strong {
  display: block;
  padding: 5px 8px 7px;
  color: var(--rg-stock-muted);
  font-size: 10px;
  font-weight: 500;
}
.rg-stock-menu button {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  min-height: 31px;
  padding: 5px 8px;
  border: 0;
  border-radius: 5px;
  color: var(--dsw-alias-label-secondary);
  background: transparent;
  text-align: left;
  font-size: 11px;
}
.rg-stock-menu button:hover,
.rg-stock-menu button[data-active] {
  color: var(--dsw-alias-label-primary);
  background: var(--dsw-alias-interactive-bg-hover);
}
.rg-stock-range {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 12px 9px;
  color: var(--rg-stock-muted);
  font-size: 10px;
}
.rg-stock-range select,
.rg-stock-control,
.rg-stock-search {
  min-height: 31px;
  padding: 5px 9px;
  border: 1px solid var(--rg-stock-border);
  border-radius: 7px;
  color: var(--dsw-alias-label-primary);
  background: var(--dsw-alias-bg-layer-1);
  font-size: 11px;
}
.rg-stock-table-wrap {
  min-width: 0;
  overflow: auto;
}
.rg-stock-table {
  width: 100%;
  min-width: 720px;
  border-collapse: collapse;
  font-size: 11px;
  font-variant-numeric: tabular-nums;
}
.rg-stock-table caption {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
}
.rg-stock-table th,
.rg-stock-table td {
  height: 37px;
  padding: 7px 12px;
  border-bottom: 1px solid var(--rg-stock-border);
  text-align: right;
  white-space: nowrap;
}
.rg-stock-table thead th {
  position: sticky;
  top: 0;
  z-index: 1;
  height: 42px;
  color: var(--rg-stock-muted);
  background: var(--dsw-alias-bg-layer-1);
  font-weight: 500;
}
.rg-stock-table th:first-child,
.rg-stock-table td:first-child {
  position: sticky;
  left: 0;
  z-index: 2;
  min-width: 190px;
  text-align: left;
  background: var(--dsw-alias-bg-layer-1);
}
.rg-stock-table thead th:first-child {
  z-index: 3;
}
.rg-stock-table tbody tr:nth-child(4n + 2),
.rg-stock-table tbody tr:nth-child(4n + 3) {
  background: color-mix(in srgb, var(--rg-stock-soft) 45%, transparent);
}
.rg-stock-table tbody tr.rg-stock-subrow td {
  color: var(--rg-stock-muted);
}
.rg-stock-table td[data-negative] {
  color: var(--dsw-alias-state-error-primary);
}
.rg-stock-table td[data-positive] {
  color: var(--dsw-alias-state-success-primary);
}
.rg-stock-section-note {
  margin: 0;
  padding: 8px 12px;
  color: var(--rg-stock-muted);
  font-size: 10px;
  line-height: 1.45;
}
.rg-stock-overview-grid {
  display: grid;
  grid-template-columns: minmax(0, 2fr) minmax(190px, .8fr);
  gap: 12px;
  padding: 12px;
}
.rg-stock-earnings-hero {
  padding: 16px;
  border-bottom: 1px solid var(--rg-stock-border);
}
.rg-stock-chip-row {
  display: flex;
  gap: 6px;
  overflow-x: auto;
  padding-bottom: 3px;
}
.rg-stock-quarter {
  flex: none;
  display: grid;
  gap: 2px;
  min-width: 105px;
  padding: 8px 10px;
  border: 1px solid var(--rg-stock-border);
  border-radius: 7px;
  color: var(--dsw-alias-label-secondary);
  background: var(--dsw-alias-bg-layer-1);
  text-align: left;
  font-size: 11px;
}
.rg-stock-quarter[data-active] {
  border-color: color-mix(in srgb, var(--dsw-alias-state-business-primary) 55%, var(--rg-stock-border));
  color: var(--dsw-alias-label-primary);
  background: color-mix(in srgb, var(--dsw-alias-state-business-primary) 7%, var(--dsw-alias-bg-layer-1));
}
.rg-stock-quarter small {
  color: var(--dsw-alias-state-success-primary);
}
.rg-stock-earnings-title {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 8px 16px;
  padding: 18px 0 10px;
}
.rg-stock-earnings-title h2,
.rg-stock-analysis h2,
.rg-stock-holder h2,
.rg-stock-forecast h2 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
}
.rg-stock-earnings-title p {
  margin: 4px 0 0;
  color: var(--rg-stock-muted);
  font-size: 11px;
}
.rg-stock-metric-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}
.rg-stock-metric-panel {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto auto;
  gap: 4px 12px;
  padding: 10px 12px;
  border: 1px solid var(--rg-stock-border);
  border-radius: 8px;
  background: var(--rg-stock-soft);
  font-size: 11px;
}
.rg-stock-metric-panel span {
  color: var(--dsw-alias-label-secondary);
}
.rg-stock-metric-panel strong {
  font-size: 13px;
  font-weight: 550;
}
.rg-stock-metric-panel small {
  color: var(--rg-stock-muted);
}
.rg-stock-tabs {
  display: flex;
  gap: 18px;
  margin-top: 16px;
  border-bottom: 1px solid var(--rg-stock-border);
}
.rg-stock-tabs button {
  position: relative;
  padding: 8px 0 10px;
  border: 0;
  color: var(--rg-stock-muted);
  background: transparent;
  font-size: 11px;
}
.rg-stock-tabs button[data-active] {
  color: var(--dsw-alias-label-primary);
  font-weight: 600;
}
.rg-stock-tabs button[data-active]::after {
  content: '';
  position: absolute;
  right: 0;
  bottom: -1px;
  left: 0;
  height: 2px;
  background: var(--dsw-alias-label-primary);
}
.rg-stock-detail-body {
  min-height: 130px;
  padding: 16px;
  color: var(--dsw-alias-label-secondary);
  font-size: 12px;
  line-height: 1.6;
}
.rg-stock-detail-body a,
.rg-stock-report a {
  color: var(--dsw-alias-state-business-primary);
  text-decoration: none;
}
.rg-stock-holder,
.rg-stock-analysis,
.rg-stock-forecast {
  padding: 12px;
}
.rg-stock-holder-toolbar,
.rg-stock-analysis-toolbar {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  margin: 12px 0;
}
.rg-stock-search {
  min-width: min(100%, 320px);
  flex: 1;
}
.rg-stock-holder-summary {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px 18px;
  margin-bottom: 10px;
  color: var(--rg-stock-muted);
  font-size: 10px;
}
.rg-stock-holder-summary strong {
  color: var(--dsw-alias-label-primary);
  font-weight: 500;
}
.rg-stock-forecast-search {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
}
.rg-stock-forecast-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}
.rg-stock-forecast-card,
.rg-stock-report {
  padding: 13px;
  border: 1px solid var(--rg-stock-border);
  border-radius: 9px;
  background: var(--dsw-alias-bg-layer-1);
}
.rg-stock-forecast-card h3,
.rg-stock-report h3 {
  margin: 0;
  font-size: 13px;
  font-weight: 550;
  line-height: 1.45;
}
.rg-stock-forecast-card > p {
  margin: 10px 0;
  color: var(--dsw-alias-label-secondary);
  font-size: 11px;
  line-height: 1.55;
}
.rg-stock-forecast-outcomes {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 5px 12px;
  margin: 12px 0;
  font-size: 11px;
}
.rg-stock-forecast-outcomes strong {
  text-align: right;
  font-variant-numeric: tabular-nums;
}
.rg-stock-card-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 5px 11px;
  color: var(--rg-stock-muted);
  font-size: 10px;
}
.rg-stock-analysis-summary {
  display: grid;
  grid-template-columns: minmax(0, 1.2fr) minmax(0, 1fr);
  gap: 10px;
}
.rg-stock-consensus,
.rg-stock-targets {
  padding: 14px;
  border: 1px solid var(--rg-stock-border);
  border-radius: 9px;
}
.rg-stock-consensus h2,
.rg-stock-targets h2 {
  font-size: 13px;
}
.rg-stock-consensus-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 7px;
  margin-top: 12px;
}
.rg-stock-consensus-grid > div {
  padding: 8px;
  border-radius: 6px;
  background: var(--rg-stock-soft);
}
.rg-stock-consensus-grid span,
.rg-stock-target-grid span {
  display: block;
  color: var(--rg-stock-muted);
  font-size: 10px;
}
.rg-stock-consensus-grid strong,
.rg-stock-target-grid strong {
  display: block;
  margin-top: 3px;
  font-size: 12px;
  font-variant-numeric: tabular-nums;
}
.rg-stock-target-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 8px;
  margin-top: 12px;
}
.rg-stock-rating-table {
  margin-top: 12px;
}
.rg-stock-rating-pill {
  display: inline-flex;
  padding: 2px 6px;
  border-radius: 4px;
  color: var(--dsw-alias-state-business-primary);
  background: color-mix(in srgb, var(--dsw-alias-state-business-primary) 9%, transparent);
  font-size: 10px;
}
.rg-stock-report-list {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 9px;
  margin-top: 12px;
}
.rg-stock-report h3 {
  margin-bottom: 7px;
}
.rg-stock-research {
  display: flex;
  justify-content: flex-end;
  margin: 12px;
}
.rg-stock-empty-grid {
  display: grid;
  gap: 8px;
  padding: 12px;
}
.rg-stock-empty-line {
  height: 34px;
  border: 1px solid var(--rg-stock-border);
  border-radius: 6px;
  background: repeating-linear-gradient(90deg, transparent 0 42px, color-mix(in srgb, var(--rg-stock-border) 45%, transparent) 42px 43px);
}
@media (max-width: 760px) {
  .rg-stock-toolbar {
    align-items: flex-start;
  }
  .rg-stock-toolbar-actions {
    width: 100%;
    margin-left: 0;
    overflow-x: auto;
  }
  .rg-stock-overview-grid,
  .rg-stock-analysis-summary {
    grid-template-columns: minmax(0, 1fr);
  }
  .rg-stock-metric-grid,
  .rg-stock-forecast-grid,
  .rg-stock-report-list {
    grid-template-columns: minmax(0, 1fr);
  }
  .rg-stock-consensus-grid,
  .rg-stock-target-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .rg-stock-table {
    min-width: 640px;
  }
}

.rg-stock-sections { margin-top:9px; }
.rg-stock-menu .rg-stock-range { display:grid; gap:8px; padding:12px 4px 4px; border-top:1px solid var(--rg-stock-border); }
.rg-stock-menu .rg-stock-range label { display:flex; justify-content:space-between; align-items:center; gap:12px; }
.rg-stock-menu .rg-stock-range select { max-width:160px; }
.rg-stock-table tbody th { font-weight:400; }
.rg-stock-sections-card { overflow:visible; }
.rg-stock-sections-demo { border-radius:10px 10px 0 0; }
`
