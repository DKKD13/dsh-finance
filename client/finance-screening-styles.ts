export const SCREENING_STYLE = `
.rg-screen {
  --rg-screen-blue: var(--dsw-static-deepseek-500, var(--dsw-alias-brand-primary));
  --rg-screen-green: var(--dsw-alias-state-success-primary);
  --rg-screen-red: var(--dsw-alias-state-error-primary);
  width: 100%;
  max-width: 1180px;
  padding: 18px 22px 44px;
  color: var(--dsw-alias-label-primary);
}
.rg-screen *, .rg-screen *::before, .rg-screen *::after { box-sizing: border-box; }
.rg-screen button, .rg-screen input, .rg-screen select { font: inherit; }
.rg-screen-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 16px;
}
.rg-screen-heading { min-width: 0; }
.rg-screen-kicker {
  display: flex;
  align-items: center;
  gap: 7px;
  margin-bottom: 4px;
  color: var(--dsw-alias-label-tertiary);
  font-size: 11px;
}
.rg-screen h2 { margin: 0; font-size: 18px; line-height: 1.35; font-weight: 600; }
.rg-screen-intro {
  max-width: 68ch;
  margin: 4px 0 0;
  color: var(--dsw-alias-label-secondary);
  font-size: 12px;
  line-height: 1.55;
}
.rg-screen-mode {
  display: inline-flex;
  flex: none;
  align-items: center;
  gap: 6px;
  min-height: 28px;
  padding: 3px 9px;
  border: 1px solid var(--dsw-alias-border-l2);
  border-radius: 999px;
  color: var(--dsw-alias-label-secondary);
  background: var(--dsw-alias-bg-layer-1);
  font-family: var(--ds-font-family-code, monospace);
  font-size: 10px;
  white-space: nowrap;
}
.rg-screen-mode[data-demo] {
  color: var(--dsw-alias-state-warn-primary);
  border-color: var(--dsw-alias-state-warn-primary);
}
.rg-screen-demo {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: 5px 10px;
  align-items: start;
  margin: 0 0 14px;
  padding: 10px 12px;
  border: 1px solid var(--dsw-alias-state-warn-primary);
  border-radius: 8px;
  background: var(--dsw-alias-bg-layer-2);
  color: var(--dsw-alias-label-secondary);
  font-size: 11px;
}
.rg-screen-demo svg { margin-top: 1px; color: var(--dsw-alias-state-warn-primary); }
.rg-screen-demo strong { color: var(--dsw-alias-label-primary); font-weight: 600; }
.rg-screen-demo span { grid-column: 2; }
.rg-screen-ask {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 12px;
  align-items: end;
  min-height: 112px;
  margin-bottom: 20px;
  padding: 18px;
  border: 1px solid var(--dsw-alias-border-l2);
  border-radius: 12px;
  background: var(--dsw-alias-bg-layer-1);
}
.rg-screen-ask textarea {
  width: 100%;
  min-height: 66px;
  resize: vertical;
  padding: 0;
  border: 0;
  outline: 0;
  background: transparent;
  color: var(--dsw-alias-label-primary);
  font-size: 14px;
  line-height: 1.55;
}
.rg-screen-ask textarea::placeholder { color: var(--dsw-alias-label-tertiary); }
.rg-screen-ask:focus-within {
  border-color: var(--dsw-alias-brand-primary);
  box-shadow: 0 0 0 2px var(--dsw-alias-brand-primary);
}
.rg-screen-submit,
.rg-screen-icon-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  border: 1px solid var(--dsw-alias-border-l2);
  border-radius: 999px;
  color: var(--dsw-alias-label-secondary);
  background: var(--dsw-alias-bg-layer-2);
}
.rg-screen-submit {
  border-color: transparent;
  color: var(--dsw-alias-label-primary-inverted);
  background: var(--dsw-alias-button-primary-fill);
}
.rg-screen-submit:hover:not(:disabled) { background: var(--dsw-alias-button-primary-hover); }
.rg-screen-icon-button:hover:not(:disabled) { background: var(--dsw-alias-interactive-bg-hover); color: var(--dsw-alias-label-primary); }
.rg-screen-submit:focus-visible,
.rg-screen-icon-button:focus-visible,
.rg-screen-preset:focus-visible,
.rg-screen button:focus-visible,
.rg-screen a:focus-visible,
.rg-screen input:focus-visible,
.rg-screen select:focus-visible {
  outline: 0;
  box-shadow: 0 0 0 2px var(--dsw-alias-brand-primary);
}
.rg-screen-section-title {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 16px;
  margin: 0 0 10px;
}
.rg-screen-section-title h3 { margin: 0; font-size: 14px; }
.rg-screen-section-title p { margin: 3px 0 0; color: var(--dsw-alias-label-secondary); font-size: 11px; }
.rg-screen-presets {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 2px 30px;
  margin-bottom: 20px;
}
.rg-screen-preset {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: 10px;
  align-items: start;
  min-width: 0;
  padding: 10px 0;
  text-align: left;
  border-radius: 6px;
  color: var(--dsw-alias-label-primary);
}
.rg-screen-preset:hover { background: var(--dsw-alias-interactive-bg-hover); }
.rg-screen-preset-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border: 1px solid var(--dsw-alias-border-l2);
  border-radius: 6px;
  color: var(--dsw-alias-label-secondary);
  background: var(--dsw-alias-bg-layer-2);
}
.rg-screen-preset strong { display: block; font-size: 12px; font-weight: 600; }
.rg-screen-preset span span {
  display: -webkit-box;
  overflow: hidden;
  margin-top: 2px;
  color: var(--dsw-alias-label-secondary);
  font-size: 11px;
  line-height: 1.45;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}
.rg-screen-filterbar {
  display: grid;
  grid-template-columns: minmax(170px, 1.4fr) repeat(4, minmax(120px, 1fr)) auto;
  gap: 8px;
  align-items: end;
  margin-bottom: 12px;
  padding: 12px 0;
  border-top: 1px solid var(--dsw-alias-border-l2);
  border-bottom: 1px solid var(--dsw-alias-border-l2);
}
.rg-screen-filter {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}
.rg-screen-filter > span {
  color: var(--dsw-alias-label-tertiary);
  font-size: 10px;
}
.rg-screen-filter input,
.rg-screen-filter select {
  width: 100%;
  height: 33px;
  min-width: 0;
  padding: 5px 9px;
  border: 1px solid var(--dsw-alias-border-l2);
  border-radius: 6px;
  color: var(--dsw-alias-label-primary);
  background: var(--dsw-alias-bg-layer-1);
  font-size: 11px;
}
.rg-screen-filter[data-search] input { padding-left: 30px; }
.rg-screen-search-wrap { position: relative; }
.rg-screen-search-wrap svg {
  position: absolute;
  top: 9px;
  left: 9px;
  color: var(--dsw-alias-label-tertiary);
  pointer-events: none;
}
.rg-screen-filter-actions { display: flex; align-items: center; gap: 6px; }
.rg-screen-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  min-height: 33px;
  padding: 5px 10px;
  border: 1px solid var(--dsw-alias-border-l2);
  border-radius: 6px;
  color: var(--dsw-alias-label-secondary);
  background: var(--dsw-alias-bg-layer-1);
  font-size: 11px;
  white-space: nowrap;
}
.rg-screen-button:hover:not(:disabled) {
  color: var(--dsw-alias-label-primary);
  background: var(--dsw-alias-interactive-bg-hover);
}
.rg-screen-button[data-primary] {
  border-color: transparent;
  color: var(--dsw-alias-label-primary-inverted);
  background: var(--dsw-alias-button-primary-fill);
}
.rg-screen-button[data-primary]:hover:not(:disabled) { background: var(--dsw-alias-button-primary-hover); }
.rg-screen button:disabled { cursor: default; opacity: .45; }
.rg-screen-resultbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px 12px;
  min-height: 40px;
  margin-bottom: 4px;
}
.rg-screen-resultbar strong { font-size: 12px; }
.rg-screen-resultbar > span { color: var(--dsw-alias-label-tertiary); font-size: 10px; }
.rg-screen-resultbar-actions { display: flex; flex-wrap: wrap; gap: 6px; margin-left: auto; }
.rg-screen-alert,
.rg-screen-note {
  margin: 9px 0;
  padding: 9px 10px;
  border-radius: 6px;
  color: var(--dsw-alias-label-secondary);
  background: var(--dsw-alias-bg-layer-2);
  font-size: 11px;
  line-height: 1.55;
}
.rg-screen-alert { color: var(--dsw-alias-state-error-primary); border-left: 2px solid var(--dsw-alias-state-error-primary); }
.rg-screen-empty {
  display: grid;
  justify-items: center;
  gap: 7px;
  padding: 34px 16px;
  border-top: 1px solid var(--dsw-alias-border-l2);
  color: var(--dsw-alias-label-tertiary);
  text-align: center;
  font-size: 11px;
}
.rg-screen-empty strong { color: var(--dsw-alias-label-primary); font-size: 13px; }
.rg-screen-table-wrap {
  max-width: 100%;
  overflow-x: auto;
  border-top: 1px solid var(--dsw-alias-border-l2);
}
.rg-screen-table {
  width: 100%;
  min-width: 760px;
  border-collapse: collapse;
  font-size: 11px;
  font-variant-numeric: tabular-nums;
}
.rg-screen-table th {
  padding: 9px 8px;
  color: var(--dsw-alias-label-tertiary);
  font-weight: 500;
  text-align: left;
  white-space: nowrap;
  border-bottom: 1px solid var(--dsw-alias-border-l2);
}
.rg-screen-table td {
  padding: 10px 8px;
  color: var(--dsw-alias-label-secondary);
  border-bottom: 1px solid var(--dsw-alias-border-l1);
  vertical-align: middle;
}
.rg-screen-table tbody tr:hover { background: var(--dsw-alias-interactive-bg-hover); }
.rg-screen-table tbody tr[data-selected] { background: var(--dsw-alias-bg-multi-select); }
.rg-screen-check { width: 18px; height: 18px; accent-color: var(--dsw-alias-brand-primary); }
.rg-screen-company {
  display: grid;
  gap: 2px;
  text-align: left;
  color: var(--dsw-alias-label-primary);
}
.rg-screen-company strong { font-size: 12px; font-weight: 600; }
.rg-screen-company span { color: var(--dsw-alias-label-tertiary); font-family: var(--ds-font-family-code, monospace); font-size: 10px; }
.rg-screen-company:hover strong { text-decoration: underline; }
.rg-screen-number { text-align: right !important; white-space: nowrap; }
.rg-screen-positive { color: var(--rg-screen-green) !important; }
.rg-screen-negative { color: var(--rg-screen-red) !important; }
.rg-screen-muted { color: var(--dsw-alias-label-tertiary) !important; }
.rg-screen-open {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 27px;
  height: 27px;
  border-radius: 6px;
  color: var(--dsw-alias-label-tertiary);
}
.rg-screen-open:hover { color: var(--dsw-alias-label-primary); background: var(--dsw-alias-bg-layer-2); }
.rg-screen-draft {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 8px 12px;
  margin: 10px 0 0;
  padding: 11px 12px;
  border-left: 2px solid var(--dsw-static-deepseek-500, var(--dsw-alias-brand-primary));
  background: var(--dsw-alias-bg-layer-2);
  font-size: 11px;
}
.rg-screen-draft strong { display: block; margin-bottom: 3px; font-size: 12px; }
.rg-screen-draft p { margin: 0; color: var(--dsw-alias-label-secondary); white-space: pre-wrap; overflow-wrap: anywhere; }
.rg-screen-draft button {
  align-self: start;
  color: var(--dsw-alias-label-tertiary);
}
.rg-screen-source-note {
  margin: 12px 0 0;
  padding-top: 10px;
  border-top: 1px solid var(--dsw-alias-border-l1);
  color: var(--dsw-alias-label-secondary);
  font-size: 10.5px;
  line-height: 1.6;
}
.rg-screen-source-note a { color: var(--dsw-alias-brand-primary); text-underline-offset: 2px; }
.rg-politics-search {
  position: relative;
  margin-bottom: 14px;
}
.rg-politics-search svg {
  position: absolute;
  top: 13px;
  left: 13px;
  color: var(--dsw-alias-label-tertiary);
  pointer-events: none;
}
.rg-politics-search input {
  width: 100%;
  height: 42px;
  padding: 8px 12px 8px 39px;
  border: 1px solid var(--dsw-alias-border-l2);
  border-radius: 8px;
  color: var(--dsw-alias-label-primary);
  background: var(--dsw-alias-bg-layer-1);
  font-size: 12px;
}
.rg-politics-filters {
  display: grid;
  grid-template-columns: repeat(3, minmax(120px, 1fr)) auto;
  gap: 8px;
  align-items: end;
  margin-bottom: 10px;
}
.rg-politics-events {
  display: inline-flex;
  gap: 3px;
  padding: 2px;
  border-radius: 6px;
  background: var(--dsw-alias-bg-layer-2);
}
.rg-politics-events button {
  padding: 5px 9px;
  border-radius: 4px;
  color: var(--dsw-alias-label-secondary);
  font-size: 10px;
}
.rg-politics-events button[data-active] {
  color: var(--dsw-alias-label-primary);
  background: var(--dsw-alias-bg-layer-1);
}
.rg-politics-layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 0;
  border-top: 1px solid var(--dsw-alias-border-l2);
}
.rg-politics-layout[data-open] {
  grid-template-columns: minmax(0, 1.55fr) minmax(280px, .75fr);
}
.rg-politics-list { min-width: 0; overflow: hidden; }
.rg-politics-list .rg-screen-table { min-width: 960px; }
.rg-politics-name {
  display: grid;
  gap: 1px;
  width: 100%;
  text-align: left;
  color: var(--dsw-alias-label-primary);
}
.rg-politics-name strong { font-weight: 600; }
.rg-politics-name span { color: var(--dsw-alias-label-tertiary); font-size: 10px; }
.rg-politics-name:hover strong { text-decoration: underline; }
.rg-politics-party {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  white-space: nowrap;
}
.rg-politics-party i {
  display: inline-block;
  width: 7px;
  height: 7px;
  border: 1px solid var(--rg-party-color, var(--dsw-alias-label-tertiary));
  border-radius: 50%;
  background: var(--rg-party-color, transparent);
}
.rg-politics-trade {
  display: grid;
  gap: 2px;
  white-space: nowrap;
}
.rg-politics-trade span { color: var(--dsw-alias-label-tertiary); font-size: 10px; }
.rg-politics-detail {
  min-width: 0;
  padding: 4px 0 24px 18px;
  border-left: 1px solid var(--dsw-alias-border-l2);
}
.rg-politics-detail-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
  padding: 12px 0;
  border-bottom: 1px solid var(--dsw-alias-border-l1);
}
.rg-politics-detail-head > div { min-width: 0; }
.rg-politics-detail-head h3 { margin: 2px 0; font-size: 15px; overflow-wrap: anywhere; }
.rg-politics-detail-head p { margin: 0; color: var(--dsw-alias-label-secondary); font-size: 11px; }
.rg-politics-close {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  flex: none;
  border-radius: 6px;
  color: var(--dsw-alias-label-tertiary);
}
.rg-politics-close:hover { color: var(--dsw-alias-label-primary); background: var(--dsw-alias-interactive-bg-hover); }
.rg-politics-facts {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 1px;
  margin: 10px 0 14px;
  background: var(--dsw-alias-border-l1);
}
.rg-politics-facts > div { min-width: 0; padding: 8px; background: var(--dsw-alias-bg-base); }
.rg-politics-facts dt { color: var(--dsw-alias-label-tertiary); font-size: 9.5px; }
.rg-politics-facts dd { margin: 2px 0 0; color: var(--dsw-alias-label-primary); font-size: 11px; overflow-wrap: anywhere; }
.rg-politics-symbols { display: flex; flex-wrap: wrap; gap: 6px; margin: 8px 0 12px; }
.rg-politics-symbols button {
  padding: 4px 8px;
  border: 1px solid var(--dsw-alias-border-l2);
  border-radius: 999px;
  color: var(--dsw-alias-label-secondary);
  background: var(--dsw-alias-bg-layer-1);
  font-family: var(--ds-font-family-code, monospace);
  font-size: 10px;
}
.rg-politics-symbols button:hover { color: var(--dsw-alias-label-primary); background: var(--dsw-alias-interactive-bg-hover); }
.rg-politics-disclosures { margin: 10px 0 0; padding: 0; list-style: none; }
.rg-politics-disclosures li {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 3px 10px;
  padding: 9px 0;
  border-top: 1px solid var(--dsw-alias-border-l1);
  font-size: 10.5px;
}
.rg-politics-disclosures strong { color: var(--dsw-alias-label-primary); font-size: 11px; }
.rg-politics-disclosures time { color: var(--dsw-alias-label-tertiary); white-space: nowrap; }
.rg-politics-disclosures p { grid-column: 1 / -1; margin: 0; color: var(--dsw-alias-label-secondary); }
.rg-politics-detail-actions { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 14px; }
.rg-politics-source-more {
  margin-top: 8px;
  padding: 9px;
  background: var(--dsw-alias-bg-layer-2);
  border-radius: 6px;
  color: var(--dsw-alias-label-secondary);
  font-size: 10.5px;
  line-height: 1.55;
}
@media (max-width: 900px) {
  .rg-screen-presets { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .rg-screen-filterbar { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .rg-screen-filter[data-search] { grid-column: 1 / -1; }
  .rg-screen-filter-actions { justify-content: flex-end; }
  .rg-politics-layout[data-open] { grid-template-columns: minmax(0, 1fr); }
  .rg-politics-detail { padding: 0 0 20px; border-left: 0; border-bottom: 1px solid var(--dsw-alias-border-l2); }
}
@media (max-width: 620px) {
  .rg-screen { padding: 14px 12px 34px; }
  .rg-screen-head { display: grid; }
  .rg-screen-mode { justify-self: start; }
  .rg-screen-ask { min-height: 104px; padding: 14px; }
  .rg-screen-presets { grid-template-columns: minmax(0, 1fr); gap: 0; }
  .rg-screen-preset { padding: 8px 2px; }
  .rg-screen-filterbar { grid-template-columns: minmax(0, 1fr); }
  .rg-screen-filter[data-search] { grid-column: auto; }
  .rg-screen-filter-actions { justify-content: stretch; }
  .rg-screen-filter-actions .rg-screen-button { flex: 1; }
  .rg-screen-resultbar-actions { width: 100%; margin-left: 0; }
  .rg-screen-table-wrap { overflow: visible; border-top: 0; }
  .rg-screen-table { display: block; min-width: 0; }
  .rg-screen-table thead { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); }
  .rg-screen-table tbody { display: grid; gap: 0; }
  .rg-screen-table tr {
    display: grid;
    grid-template-columns: 24px minmax(0, 1fr) auto;
    gap: 5px 8px;
    padding: 10px 2px;
    border-bottom: 1px solid var(--dsw-alias-border-l1);
  }
  .rg-screen-table td {
    display: flex;
    justify-content: space-between;
    gap: 10px;
    grid-column: 2 / -1;
    padding: 2px 0;
    border: 0;
    text-align: right;
  }
  .rg-screen-table td::before { content: attr(data-label); color: var(--dsw-alias-label-tertiary); white-space: nowrap; }
  .rg-screen-table td:first-child { display: block; grid-column: 1; grid-row: 1 / span 5; padding-top: 7px; }
  .rg-screen-table td:first-child::before,
  .rg-screen-table td[data-company]::before,
  .rg-screen-table td[data-open]::before { display: none; }
  .rg-screen-table td[data-company] { grid-column: 2; grid-row: 1; text-align: left; }
  .rg-screen-table td[data-open] { grid-column: 3; grid-row: 1; }
  .rg-politics-filters { grid-template-columns: minmax(0, 1fr); }
  .rg-politics-layout .rg-screen-table tr { grid-template-columns: minmax(0, 1fr) auto; }
  .rg-politics-layout .rg-screen-table td:first-child { grid-column: 1; grid-row: auto; padding: 0; }
  .rg-politics-layout .rg-screen-table td[data-company] { grid-column: 1; grid-row: auto; }
  .rg-politics-layout .rg-screen-table td { grid-column: 1 / -1; }
  .rg-politics-layout .rg-screen-table td[data-open] { grid-column: 2; grid-row: 1; }
  .rg-politics-facts { grid-template-columns: minmax(0, 1fr); }
}

/* Perplexity Finance refinement. Keep this scoped so the shared shell and
   the later finish layer remain untouched while this surface matches the
   supplied screenshots. */
[data-rg-root] .rg-screen {
  padding: 20px 22px 48px;
}
[data-rg-root] .rg-screen h2 {
  font-size: 16px;
  font-weight: 600;
  line-height: 1.5;
  letter-spacing: 0;
}
[data-rg-root] .rg-screen-head {
  align-items: center;
  margin-bottom: 14px;
}
[data-rg-root] .rg-screen .rg-screen-provider {
  display: inline-flex;
  flex: none;
  align-items: center;
  gap: 6px;
  min-height: 28px;
  padding: 3px 8px;
  border: 1px solid var(--dsw-alias-border-l2);
  border-radius: 6px;
  color: var(--dsw-alias-label-secondary);
  background: var(--dsw-alias-bg-layer-1);
  font-size: 10.5px;
  white-space: nowrap;
}
[data-rg-root] .rg-screen .rg-screen-ask {
  position: relative;
  display: block;
  min-height: 96px;
  margin: 18px 0 30px;
  padding: 17px 58px 17px 18px;
  border: 1px solid var(--dsw-alias-border-l2);
  border-radius: 10px;
  background: var(--dsw-alias-bg-layer-1);
}
[data-rg-root] .rg-screen .rg-screen-ask textarea {
  min-height: 58px;
  padding: 0;
  resize: none;
  font-size: 14px;
  line-height: 1.6;
}
[data-rg-root] .rg-screen .rg-screen-ask:focus-within {
  border-color: var(--dsw-alias-state-business-primary);
  box-shadow: 0 0 0 1px var(--dsw-alias-state-business-primary);
}
[data-rg-root] .rg-screen .rg-screen-submit {
  position: absolute;
  right: 14px;
  bottom: 14px;
  width: 32px;
  min-width: 32px;
  height: 32px;
  padding: 0;
  border: 0;
  border-radius: 50%;
  color: var(--dsw-alias-label-primary-inverted);
  background: var(--dsw-alias-button-primary-fill);
}
[data-rg-root] .rg-screen .rg-screen-submit:hover:not(:disabled) {
  background: var(--dsw-alias-button-primary-hover);
}
[data-rg-root] .rg-screen .rg-screen-submit:disabled {
  color: var(--dsw-alias-label-tertiary);
  background: var(--dsw-alias-bg-layer-3);
  opacity: 1;
}
[data-rg-root] .rg-screen .rg-screen-section-title {
  align-items: flex-start;
  margin: 0 0 9px;
}
[data-rg-root] .rg-screen .rg-screen-section-title h3 {
  font-size: 13.5px;
  font-weight: 600;
  line-height: 1.5;
}
[data-rg-root] .rg-screen .rg-screen-section-title p {
  max-width: 70ch;
  margin-top: 2px;
  font-size: 11.5px;
  line-height: 1.55;
}
[data-rg-root] .rg-screen .rg-screen-presets {
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px 32px;
  margin: 0 0 26px;
}
[data-rg-root] .rg-screen .rg-screen-preset {
  grid-template-columns: 30px minmax(0, 1fr);
  gap: 10px;
  align-items: start;
  min-height: 54px;
  padding: 8px 2px;
  border: 0;
  border-radius: 4px;
  background: transparent;
}
[data-rg-root] .rg-screen .rg-screen-preset:hover {
  background: var(--dsw-alias-interactive-bg-hover);
}
[data-rg-root] .rg-screen .rg-screen-preset-icon {
  width: 30px;
  height: 30px;
  border-color: var(--dsw-alias-border-l1);
  border-radius: 6px;
  background: var(--dsw-alias-bg-layer-2);
}
[data-rg-root] .rg-screen .rg-screen-preset strong {
  margin-top: 1px;
  font-size: 13px;
  font-weight: 600;
  line-height: 1.35;
}
[data-rg-root] .rg-screen .rg-screen-preset > span:last-child > span {
  margin-top: 3px;
  font-size: 11.5px;
  line-height: 1.45;
}
[data-rg-root] .rg-screen .rg-screen-footer-row {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 18px;
  margin-bottom: 14px;
}
[data-rg-root] .rg-screen .rg-screen-footer-row .rg-discovery-source {
  margin: 0;
}
[data-rg-root] .rg-screen .rg-screen-button {
  min-height: 31px;
  padding: 5px 10px;
  border: 1px solid var(--dsw-alias-border-l2);
  border-radius: 6px;
  background: var(--dsw-alias-bg-layer-1);
  font-size: 11px;
}
[data-rg-root] .rg-screen .rg-screen-filterbar {
  gap: 8px;
  margin-bottom: 10px;
  padding: 12px 0;
}
[data-rg-root] .rg-screen .rg-screen-filter > span {
  font-size: 10.5px;
}
[data-rg-root] .rg-screen .rg-screen-filter input,
[data-rg-root] .rg-screen .rg-screen-filter select {
  height: 31px;
  padding: 4px 8px;
  border-color: var(--dsw-alias-border-l1);
  border-radius: 5px;
  font-size: 11.5px;
}
[data-rg-root] .rg-screen .rg-politics-filterbar {
  grid-template-columns: minmax(220px, 1.6fr) repeat(3, minmax(105px, .72fr)) auto;
  margin-bottom: 0;
}
[data-rg-root] .rg-screen .rg-politics-listbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  min-height: 40px;
  border-bottom: 1px solid var(--dsw-alias-border-l2);
}
[data-rg-root] .rg-screen .rg-politics-listbar p {
  margin: 0;
  color: var(--dsw-alias-label-tertiary);
  font-size: 10.5px;
}
[data-rg-root] .rg-screen .rg-politics-listbar button {
  color: var(--dsw-alias-label-secondary);
  font-size: 10.5px;
}
[data-rg-root] .rg-screen .rg-politics-table-wrap {
  border-top: 0;
}
[data-rg-root] .rg-screen .rg-politics-table,
[data-rg-root] .rg-screen .rg-politics-holdings-table {
  min-width: 840px;
  border-collapse: collapse;
}
[data-rg-root] .rg-screen .rg-politics-table th,
[data-rg-root] .rg-screen .rg-politics-holdings-table th {
  padding: 11px 9px;
  font-size: 10.5px;
  font-weight: 550;
}
[data-rg-root] .rg-screen .rg-politics-table td,
[data-rg-root] .rg-screen .rg-politics-holdings-table td {
  height: 58px;
  padding: 9px;
  color: var(--dsw-alias-label-secondary);
  font-size: 11.5px;
}
[data-rg-root] .rg-screen .rg-politics-name {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 190px;
}
[data-rg-root] .rg-screen .rg-politics-avatar {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  flex: none;
  border: 1px solid var(--dsw-alias-border-l2);
  border-radius: 50%;
  color: var(--dsw-alias-label-secondary);
  background: var(--dsw-alias-bg-layer-2);
  font-size: 9px;
  font-weight: 650;
  line-height: 1;
}
[data-rg-root] .rg-screen .rg-politics-avatar-large {
  width: 42px;
  height: 42px;
  font-size: 11px;
}
[data-rg-root] .rg-screen .rg-politics-identity {
  display: grid;
  min-width: 0;
  gap: 2px;
}
[data-rg-root] .rg-screen .rg-politics-identity > strong {
  overflow: hidden;
  font-size: 12px;
  font-weight: 600;
  text-overflow: ellipsis;
  white-space: nowrap;
}
[data-rg-root] .rg-screen .rg-politics-party {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  margin: 0;
  color: var(--dsw-alias-label-tertiary);
  font-size: 9.5px;
  line-height: 1.4;
  white-space: nowrap;
}
[data-rg-root] .rg-screen .rg-politics-party[data-party="D"] {
  --rg-party-color: var(--dsw-static-blue-500, var(--dsw-alias-state-business-primary));
}
[data-rg-root] .rg-screen .rg-politics-party[data-party="R"] {
  --rg-party-color: var(--dsw-static-red-500, var(--dsw-alias-state-error-primary));
}
[data-rg-root] .rg-screen .rg-politics-party[data-party="I"] {
  --rg-party-color: var(--dsw-static-amber-500, var(--dsw-alias-state-warn-primary));
}
[data-rg-root] .rg-screen .rg-politics-party i {
  border-color: var(--rg-party-color, var(--dsw-alias-label-tertiary));
  background: var(--rg-party-color, transparent);
}
[data-rg-root] .rg-screen .rg-politics-symbol {
  min-width: 50px;
  padding: 2px 0;
  color: var(--dsw-alias-label-primary);
  font-family: var(--ds-font-family-code, monospace);
  font-size: 10.5px;
}
[data-rg-root] .rg-screen .rg-politics-symbol:hover:not(:disabled) {
  text-decoration: underline;
  text-underline-offset: 2px;
}
[data-rg-root] .rg-screen .rg-politics-trade strong {
  color: var(--dsw-alias-label-primary);
  font-weight: 550;
}
[data-rg-root] .rg-screen .rg-politics-source-link {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 25px;
  height: 25px;
  border-radius: 5px;
  color: var(--dsw-alias-state-business-primary);
}
[data-rg-root] .rg-screen .rg-politics-source-link:hover {
  background: var(--dsw-alias-interactive-bg-hover);
}
[data-rg-root] .rg-screen .rg-politics-detail {
  min-width: 0;
  padding: 0;
  border: 0;
}
[data-rg-root] .rg-screen .rg-politics-detail-head {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  gap: 11px;
  margin-bottom: 9px;
  padding: 11px 12px;
  border: 1px solid var(--dsw-alias-border-l2);
  border-radius: 8px;
  background: var(--dsw-alias-bg-layer-1);
}
[data-rg-root] .rg-screen .rg-politics-detail-identity {
  min-width: 0;
}
[data-rg-root] .rg-screen .rg-politics-detail-head h3 {
  margin: 0 0 2px;
  font-size: 13px;
  font-weight: 600;
  line-height: 1.4;
}
[data-rg-root] .rg-screen .rg-politics-fictional {
  display: inline-block;
  margin-top: 3px;
  color: var(--dsw-alias-state-warn-primary);
  font-size: 9.5px;
}
[data-rg-root] .rg-screen .rg-politics-clear {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  min-height: 30px;
  padding: 4px 8px;
  border: 1px solid var(--dsw-alias-border-l2);
  border-radius: 6px;
  color: var(--dsw-alias-label-secondary);
  background: var(--dsw-alias-bg-layer-1);
  font-size: 10.5px;
}
[data-rg-root] .rg-screen .rg-politics-clear:hover {
  color: var(--dsw-alias-label-primary);
  background: var(--dsw-alias-interactive-bg-hover);
}
[data-rg-root] .rg-screen .rg-politics-events {
  display: inline-flex;
  gap: 2px;
  margin: 0 0 11px;
  padding: 2px;
  border: 1px solid var(--dsw-alias-border-l1);
  border-radius: 6px;
  background: var(--dsw-alias-bg-layer-2);
}
[data-rg-root] .rg-screen .rg-politics-events button {
  min-height: 28px;
  padding: 4px 10px;
  border-radius: 4px;
  color: var(--dsw-alias-label-secondary);
  font-size: 10.5px;
}
[data-rg-root] .rg-screen .rg-politics-events button span {
  margin-left: 3px;
  color: var(--dsw-alias-label-tertiary);
}
[data-rg-root] .rg-screen .rg-politics-events button[data-active] {
  color: var(--dsw-alias-label-primary);
  background: var(--dsw-alias-bg-layer-1);
}
[data-rg-root] .rg-screen .rg-politics-empty {
  display: grid;
  justify-items: center;
  gap: 8px;
  padding: 52px 20px 54px;
  border-top: 1px solid var(--dsw-alias-border-l2);
  border-bottom: 1px solid var(--dsw-alias-border-l1);
  color: var(--dsw-alias-label-tertiary);
  text-align: center;
}
[data-rg-root] .rg-screen .rg-politics-empty > svg {
  color: var(--dsw-alias-label-tertiary);
}
[data-rg-root] .rg-screen .rg-politics-empty strong {
  color: var(--dsw-alias-label-primary);
  font-size: 12.5px;
  font-weight: 600;
}
[data-rg-root] .rg-screen .rg-politics-empty p {
  max-width: 62ch;
  margin: 0;
  color: var(--dsw-alias-label-secondary);
  font-size: 11.5px;
  line-height: 1.65;
}
[data-rg-root] .rg-screen .rg-politics-detail-summary {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  min-height: 38px;
  padding-bottom: 8px;
  border-top: 1px solid var(--dsw-alias-border-l2);
}
[data-rg-root] .rg-screen .rg-politics-detail-summary p {
  margin: 0;
  color: var(--dsw-alias-label-secondary);
  font-size: 10.5px;
}
[data-rg-root] .rg-screen .rg-politics-holdings-table td small {
  display: block;
  margin-top: 2px;
  color: var(--dsw-alias-label-tertiary);
  font-family: var(--ds-font-family-code, monospace);
  font-size: 9.5px;
}
[data-rg-root] .rg-screen .rg-politics-detail-actions {
  margin-top: 14px;
}
@media (max-width: 900px) {
  [data-rg-root] .rg-screen .rg-screen-presets {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  [data-rg-root] .rg-screen .rg-politics-filterbar {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  [data-rg-root] .rg-screen .rg-politics-filterbar .rg-screen-filter[data-search] {
    grid-column: 1 / -1;
  }
}
@media (max-width: 620px) {
  [data-rg-root] .rg-screen {
    padding: 16px 14px 36px;
  }
  [data-rg-root] .rg-screen .rg-screen-head {
    display: flex;
  }
  [data-rg-root] .rg-screen .rg-screen-provider {
    display: none;
  }
  [data-rg-root] .rg-screen .rg-screen-ask {
    min-height: 92px;
    margin: 16px 0 24px;
    padding: 14px 54px 14px 14px;
  }
  [data-rg-root] .rg-screen .rg-screen-presets {
    grid-template-columns: minmax(0, 1fr);
    gap: 2px;
  }
  [data-rg-root] .rg-screen .rg-screen-footer-row {
    align-items: stretch;
    flex-direction: column;
    gap: 9px;
  }
  [data-rg-root] .rg-screen .rg-screen-footer-row .rg-screen-button {
    align-self: flex-start;
  }
  [data-rg-root] .rg-screen .rg-politics-filterbar {
    grid-template-columns: minmax(0, 1fr);
  }
  [data-rg-root] .rg-screen .rg-politics-filterbar .rg-screen-filter[data-search] {
    grid-column: auto;
  }
  [data-rg-root] .rg-screen .rg-politics-detail-head {
    grid-template-columns: auto minmax(0, 1fr);
  }
  [data-rg-root] .rg-screen .rg-politics-clear {
    grid-column: 1 / -1;
    justify-self: start;
  }
  [data-rg-root] .rg-screen .rg-politics-events {
    display: flex;
    width: 100%;
  }
  [data-rg-root] .rg-screen .rg-politics-events button {
    flex: 1;
  }
  [data-rg-root] .rg-screen .rg-politics-detail-summary {
    align-items: flex-start;
    flex-direction: column;
    padding: 10px 0 9px;
  }
  [data-rg-root] .rg-screen .rg-politics-table-wrap {
    overflow-x: auto;
    border-top: 1px solid var(--dsw-alias-border-l1);
  }
}
`
