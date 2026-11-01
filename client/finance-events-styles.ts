/**
 * Local styles for external event surfaces. All colors and radii resolve
 * through the DSH token layer so the panels follow the shell theme.
 */
export const EVENTS_STYLE = `
.dsh-events {
  --dsh-events-blue: var(--dsw-static-deepseek-500, var(--dsw-alias-brand-primary));
  --dsh-events-blue-soft: color-mix(in srgb, var(--dsh-events-blue) 9%, var(--dsw-alias-bg-layer-1));
  --dsh-events-blue-line: color-mix(in srgb, var(--dsh-events-blue) 42%, var(--dsw-alias-border-l2));
  color: var(--dsw-alias-label-primary);
  min-width: 0;
  width: 100%;
}

.dsh-events *, .dsh-events *::before, .dsh-events *::after { box-sizing: border-box; }
.dsh-events button, .dsh-events input, .dsh-events select { font: inherit; }
.dsh-events button { color: inherit; }
.dsh-events button:focus-visible, .dsh-events input:focus-visible, .dsh-events select:focus-visible,
.dsh-events a:focus-visible, .dsh-events svg:focus-visible {
  outline: none;
  box-shadow: 0 0 0 var(--dsw-focus-ring-width, 2px) var(--dsh-events-blue);
}

.dsh-events-sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

.dsh-events-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 20px;
  padding: 2px 0 18px;
  border-bottom: 1px solid var(--dsw-alias-border-l2);
}
.dsh-events-heading-wrap { display: flex; align-items: flex-start; gap: 12px; min-width: 0; }
.dsh-events-mark {
  display: grid;
  place-items: center;
  flex: none;
  width: 36px;
  height: 36px;
  margin-top: 1px;
  border: 1px solid var(--dsh-events-blue-line);
  border-radius: var(--dsw-radius-sm, 6px);
  color: var(--dsh-events-blue);
  background: var(--dsh-events-blue-soft);
}
.dsh-events-mark svg { width: 20px; height: 20px; }
.dsh-events-head h2 { margin: 0; font-size: 18px; line-height: 1.3; font-weight: 650; }
.dsh-events-head p { max-width: 72ch; margin: 5px 0 0; color: var(--dsw-alias-label-secondary); font-size: 12px; line-height: 1.55; }
.dsh-events-head-meta { display: flex; flex-direction: column; align-items: flex-end; gap: 7px; flex: none; }
.dsh-events-demo {
  display: inline-flex;
  align-items: center;
  min-height: 26px;
  padding: 3px 9px;
  border-radius: 999px;
  background: var(--dsh-events-blue);
  color: var(--dsw-alias-label-primary-inverted);
  font-size: 10.5px;
  font-weight: 650;
  white-space: nowrap;
}
.dsh-events-stamp {
  color: var(--dsw-alias-label-tertiary);
  font-family: var(--ds-font-family-code, monospace);
  font-size: 10px;
  white-space: nowrap;
}

.dsh-events-controls {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  padding: 14px 0;
  border-bottom: 1px solid var(--dsw-alias-border-l1);
}
.dsh-events-control-group { display: inline-flex; align-items: center; gap: 6px; min-width: 0; }
.dsh-events-control-label { color: var(--dsw-alias-label-tertiary); font-size: 10px; white-space: nowrap; }
.dsh-events-button,
.dsh-events-select,
.dsh-events-search {
  min-height: 36px;
  border: 1px solid var(--dsw-alias-border-l2);
  border-radius: var(--dsw-radius-sm, 6px);
  background: var(--dsw-alias-bg-layer-1);
  color: var(--dsw-alias-label-secondary);
}
.dsh-events-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 6px 10px;
  font-size: 11.5px;
  font-weight: 550;
  cursor: pointer;
}
.dsh-events-button:hover:not(:disabled) { background: var(--dsw-alias-interactive-bg-hover); color: var(--dsw-alias-label-primary); }
.dsh-events-button:disabled { opacity: .48; cursor: not-allowed; }
.dsh-events-button[data-primary] {
  border-color: var(--dsh-events-blue);
  background: var(--dsh-events-blue);
  color: var(--dsw-alias-label-primary-inverted);
}
.dsh-events-button[data-primary]:hover:not(:disabled) {
  background: var(--dsw-alias-button-primary-hover, var(--dsh-events-blue));
  color: var(--dsw-alias-label-primary-inverted);
}
.dsh-events-button[data-active],
.dsh-events-chip[data-active] {
  border-color: var(--dsh-events-blue-line);
  background: var(--dsh-events-blue-soft);
  color: var(--dsw-alias-label-primary);
  font-weight: 650;
}
.dsh-events-select { padding: 4px 30px 4px 9px; font-size: 11.5px; }
.dsh-events-week-nav { display: inline-flex; gap: 4px; }
.dsh-events-week-nav .dsh-events-button { width: 36px; padding: 0; }
.dsh-events-week-nav svg { width: 15px; height: 15px; }
.dsh-events-week {
  min-width: 150px;
  color: var(--dsw-alias-label-primary);
  font-size: 12px;
  font-weight: 600;
  text-align: center;
}

.dsh-events-day-strip {
  display: grid;
  grid-template-columns: repeat(7, minmax(76px, 1fr));
  gap: 6px;
  padding: 12px 0;
  overflow-x: auto;
  scrollbar-width: thin;
}
.dsh-events-day {
  min-width: 76px;
  min-height: 64px;
  padding: 8px 7px;
  border: 1px solid var(--dsw-alias-border-l1);
  border-radius: var(--dsw-radius-sm, 6px);
  background: var(--dsw-alias-bg-layer-1);
  color: var(--dsw-alias-label-secondary);
  text-align: left;
  cursor: pointer;
}
.dsh-events-day:hover { border-color: var(--dsw-alias-border-l3); background: var(--dsw-alias-interactive-bg-hover); }
.dsh-events-day[data-active] { border-color: var(--dsh-events-blue-line); background: var(--dsh-events-blue-soft); }
.dsh-events-day small { display: block; color: var(--dsw-alias-label-tertiary); font-size: 9.5px; }
.dsh-events-day strong { display: block; margin-top: 5px; color: var(--dsw-alias-label-primary); font-size: 12px; }
.dsh-events-day span { display: block; margin-top: 4px; font-size: 9.5px; white-space: nowrap; }

.dsh-events-list-head,
.dsh-events-earnings-row {
  display: grid;
  grid-template-columns: minmax(148px, 1.05fr) minmax(190px, 1.35fr) minmax(170px, 1.15fr) minmax(92px, .72fr);
  gap: 12px;
  align-items: center;
}
.dsh-events-list-head {
  padding: 7px 9px;
  color: var(--dsw-alias-label-tertiary);
  font-size: 9.5px;
  text-transform: uppercase;
}
.dsh-events-earnings-list { border-top: 1px solid var(--dsw-alias-border-l2); }
.dsh-events-earnings-item { border-bottom: 1px solid var(--dsw-alias-border-l1); }
.dsh-events-earnings-row {
  width: 100%;
  min-height: 68px;
  padding: 9px;
  border: 0;
  background: transparent;
  text-align: left;
  cursor: pointer;
}
.dsh-events-earnings-row:hover { background: var(--dsw-alias-interactive-bg-hover); }
.dsh-events-earnings-item[data-selected] .dsh-events-earnings-row { background: var(--dsh-events-blue-soft); }
.dsh-events-company { display: flex; align-items: center; gap: 9px; min-width: 0; }
.dsh-events-symbol {
  display: grid;
  place-items: center;
  flex: none;
  width: 34px;
  height: 34px;
  border-radius: var(--dsw-radius-sm, 6px);
  background: var(--dsh-events-blue);
  color: var(--dsw-alias-label-primary-inverted);
  font-family: var(--ds-font-family-code, monospace);
  font-size: 9px;
  font-weight: 700;
}
.dsh-events-company-copy { min-width: 0; }
.dsh-events-company-copy strong { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 12px; }
.dsh-events-company-copy small { display: block; margin-top: 3px; overflow: hidden; text-overflow: ellipsis; color: var(--dsw-alias-label-tertiary); font-size: 9.5px; white-space: nowrap; }
.dsh-events-metric {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 5px 8px;
  min-width: 0;
}
.dsh-events-metric > strong { grid-column: 1 / -1; color: var(--dsw-alias-label-tertiary); font-size: 9px; font-weight: 500; }
.dsh-events-metric span { min-width: 0; }
.dsh-events-metric small { display: block; color: var(--dsw-alias-label-tertiary); font-size: 8.5px; }
.dsh-events-metric b { display: block; margin-top: 2px; overflow: hidden; text-overflow: ellipsis; font-size: 10.5px; font-weight: 600; white-space: nowrap; font-variant-numeric: tabular-nums; }
.dsh-events-metric b[data-direction='positive'] { color: var(--dsw-alias-state-success-primary); }
.dsh-events-metric b[data-direction='negative'] { color: var(--dsw-alias-state-error-primary); }
.dsh-events-session { color: var(--dsw-alias-label-secondary); font-size: 10.5px; line-height: 1.45; }
.dsh-events-session strong { display: block; color: var(--dsw-alias-label-primary); font-size: 11px; }
.dsh-events-session small { display: block; margin-top: 3px; color: var(--dsw-alias-label-tertiary); font-size: 9.5px; }

.dsh-events-detail {
  display: grid;
  grid-template-columns: minmax(0, 1.2fr) minmax(230px, .8fr);
  gap: 22px;
  padding: 18px 9px 20px;
  background: var(--dsw-alias-bg-layer-2);
  border-top: 1px solid var(--dsw-events-blue-line, var(--dsw-alias-border-l2));
}
.dsh-events-detail h3 { margin: 0; font-size: 15px; line-height: 1.35; }
.dsh-events-detail p { max-width: 70ch; margin: 7px 0 0; color: var(--dsw-alias-label-secondary); font-size: 11.5px; line-height: 1.55; }
.dsh-events-detail h4 { margin: 16px 0 7px; color: var(--dsw-alias-label-secondary); font-size: 11px; }
.dsh-events-detail-actions { display: flex; flex-wrap: wrap; gap: 7px; margin-top: 14px; }
.dsh-events-sources { margin: 0; padding: 0; list-style: none; }
.dsh-events-sources li { padding: 8px 0; border-top: 1px solid var(--dsw-alias-border-l1); color: var(--dsw-alias-label-secondary); font-size: 10.5px; line-height: 1.45; }
.dsh-events-sources a { color: var(--dsh-events-blue); text-decoration: none; overflow-wrap: anywhere; }
.dsh-events-sources a:hover { text-decoration: underline; }
.dsh-events-sources code { display: block; margin-top: 4px; color: var(--dsw-alias-label-tertiary); font-size: 9px; overflow-wrap: anywhere; }
.dsh-events-panel-note {
  margin: 12px 0 0;
  padding: 9px 0 0;
  border-top: 1px solid var(--dsw-alias-border-l1);
  color: var(--dsw-alias-label-tertiary);
  font-size: 10px;
  line-height: 1.5;
}

.dsh-events-empty {
  display: grid;
  place-items: center;
  min-height: 210px;
  padding: 28px;
  border-top: 1px solid var(--dsw-alias-border-l1);
  color: var(--dsw-alias-label-secondary);
  text-align: center;
}
.dsh-events-empty div { max-width: 56ch; }
.dsh-events-empty svg { width: 34px; height: 34px; margin-bottom: 10px; color: var(--dsw-alias-label-tertiary); }
.dsh-events-empty strong { display: block; color: var(--dsw-alias-label-primary); font-size: 13px; }
.dsh-events-empty p { margin: 6px 0 0; font-size: 11px; line-height: 1.55; }

.dsh-events-market-toolbar {
  display: grid;
  gap: 10px;
  padding: 14px 0 12px;
}
.dsh-events-search-wrap { position: relative; }
.dsh-events-search-wrap svg {
  position: absolute;
  top: 50%;
  left: 11px;
  width: 16px;
  height: 16px;
  transform: translateY(-50%);
  color: var(--dsw-alias-label-tertiary);
  pointer-events: none;
}
.dsh-events-search {
  width: 100%;
  padding: 7px 12px 7px 36px;
  color: var(--dsw-alias-label-primary);
  font-size: 12px;
}
.dsh-events-search::placeholder { color: var(--dsw-alias-label-tertiary); }
.dsh-events-chips { display: flex; flex-wrap: wrap; gap: 6px; }
.dsh-events-chip {
  min-height: 30px;
  padding: 4px 9px;
  border: 1px solid var(--dsw-alias-border-l2);
  border-radius: 999px;
  background: transparent;
  color: var(--dsw-alias-label-secondary);
  font-size: 10.5px;
  cursor: pointer;
}
.dsh-events-chip:hover { background: var(--dsw-alias-interactive-bg-hover); color: var(--dsw-alias-label-primary); }
.dsh-events-external-note {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  padding: 9px 11px;
  border: 1px solid var(--dsw-events-blue-line);
  border-radius: var(--dsw-radius-sm, 6px);
  background: var(--dsh-events-blue-soft);
  color: var(--dsw-alias-label-secondary);
  font-size: 10.5px;
  line-height: 1.45;
}
.dsh-events-external-note strong { color: var(--dsw-alias-label-primary); }

.dsh-events-market-layout {
  display: grid;
  grid-template-columns: minmax(260px, .9fr) minmax(0, 1.35fr);
  gap: 16px;
  align-items: start;
  padding-top: 4px;
}
.dsh-events-market-list {
  display: grid;
  gap: 8px;
  min-width: 0;
}
.dsh-events-market-card {
  width: 100%;
  min-height: 142px;
  padding: 13px;
  border: 1px solid var(--dsw-alias-border-l2);
  border-radius: var(--dsw-radius-md, 8px);
  background: var(--dsw-alias-bg-layer-1);
  color: var(--dsw-alias-label-primary);
  text-align: left;
  cursor: pointer;
}
.dsh-events-market-card:hover { border-color: var(--dsw-alias-border-l3); background: var(--dsw-alias-interactive-bg-hover); }
.dsh-events-market-card[data-selected] { border-color: var(--dsh-events-blue-line); background: var(--dsh-events-blue-soft); }
.dsh-events-card-top { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.dsh-events-card-theme { color: var(--dsh-events-blue); font-size: 9.5px; font-weight: 650; text-transform: uppercase; }
.dsh-events-card-source { color: var(--dsw-alias-label-tertiary); font-size: 9px; }
.dsh-events-market-card h3 { margin: 9px 0 12px; font-size: 12.5px; line-height: 1.45; font-weight: 600; }
.dsh-events-probability-row { display: grid; grid-template-columns: auto minmax(70px, 1fr) auto; gap: 7px; align-items: center; color: var(--dsw-alias-label-secondary); font-size: 9.5px; }
.dsh-events-probability-track {
  display: flex;
  height: 7px;
  overflow: hidden;
  border-radius: 999px;
  background: var(--dsw-alias-border-l1);
}
.dsh-events-probability-yes { height: 100%; background: var(--dsh-events-blue); }
.dsh-events-probability-no { height: 100%; background: var(--dsw-static-amber-500, var(--dsw-alias-state-warn-primary)); }
.dsh-events-card-foot { display: flex; justify-content: space-between; gap: 8px; margin-top: 10px; color: var(--dsw-alias-label-tertiary); font-size: 9px; }
.dsh-events-card-foot span:last-child { text-align: right; }

.dsh-events-market-detail {
  position: sticky;
  top: 12px;
  min-width: 0;
  padding: 15px;
  border: 1px solid var(--dsw-alias-border-l2);
  border-radius: var(--dsw-radius-md, 8px);
  background: var(--dsw-alias-bg-layer-1);
}
.dsh-events-market-detail > header { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; }
.dsh-events-market-detail h3 { margin: 5px 0 0; font-size: 16px; line-height: 1.35; }
.dsh-events-market-detail p { margin: 8px 0 0; color: var(--dsw-alias-label-secondary); font-size: 11px; line-height: 1.55; }
.dsh-events-market-detail h4 { margin: 16px 0 8px; font-size: 11px; color: var(--dsw-alias-label-secondary); }
.dsh-events-contract {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 1px;
  margin-top: 14px;
  overflow: hidden;
  border: 1px solid var(--dsw-alias-border-l1);
  border-radius: var(--dsw-radius-sm, 6px);
  background: var(--dsw-alias-border-l1);
}
.dsh-events-contract > div { padding: 9px; background: var(--dsw-alias-bg-layer-2); }
.dsh-events-contract dt { color: var(--dsw-alias-label-tertiary); font-size: 9px; }
.dsh-events-contract dd { margin: 3px 0 0; color: var(--dsw-alias-label-primary); font-size: 10.5px; line-height: 1.45; overflow-wrap: anywhere; }
.dsh-events-market-probabilities {
  display: grid;
  gap: 7px;
  margin-top: 12px;
  padding: 11px;
  border-radius: var(--dsw-radius-sm, 6px);
  background: var(--dsw-alias-bg-layer-2);
}
.dsh-events-market-probabilities .dsh-events-probability-row { font-size: 10.5px; }
.dsh-events-market-probabilities .dsh-events-probability-track { height: 10px; }

.dsh-events-history {
  position: relative;
  margin-top: 16px;
  padding-top: 14px;
  border-top: 1px solid var(--dsw-alias-border-l1);
}
.dsh-events-history-head { display: flex; align-items: baseline; justify-content: space-between; gap: 12px; }
.dsh-events-history-head h4 { margin: 0; }
.dsh-events-history-head span { color: var(--dsw-alias-label-tertiary); font-size: 9px; }
.dsh-events-chart-wrap { position: relative; min-width: 0; margin-top: 8px; }
.dsh-events-chart { display: block; width: 100%; min-width: 520px; height: auto; }
.dsh-events-chart-grid { stroke: var(--dsw-alias-border-l1); stroke-width: 1; }
.dsh-events-chart-axis { stroke: var(--dsw-alias-border-l2); stroke-width: 1; }
.dsh-events-chart-line { fill: none; stroke: var(--dsh-events-blue); stroke-width: 2.2; stroke-linejoin: round; stroke-linecap: round; }
.dsh-events-chart-point { fill: var(--dsh-events-blue); stroke: var(--dsw-alias-bg-layer-1); stroke-width: 2; }
.dsh-events-chart-label { fill: var(--dsw-alias-label-tertiary); font-size: 10px; font-variant-numeric: tabular-nums; }
.dsh-events-chart-tooltip {
  position: absolute;
  top: 8px;
  z-index: 2;
  width: 148px;
  padding: 7px 8px;
  transform: translateX(8px);
  border: 1px solid var(--dsw-alias-border-l2);
  border-radius: var(--dsw-radius-sm, 6px);
  background: var(--dsw-alias-bg-layer-3);
  color: var(--dsw-alias-label-secondary);
  box-shadow: 0 10px 24px -16px var(--dsw-alias-bg-mask-2);
  font-size: 9.5px;
  pointer-events: none;
}
.dsh-events-chart-tooltip[data-side='left'] { transform: translateX(calc(-100% - 8px)); }
.dsh-events-chart-tooltip strong { display: block; margin-bottom: 3px; color: var(--dsw-alias-label-primary); }
.dsh-events-chart-scroll { overflow-x: auto; scrollbar-width: thin; }
.dsh-events-exact { margin-top: 9px; }
.dsh-events-exact summary { color: var(--dsw-alias-label-secondary); font-size: 10px; cursor: pointer; }
.dsh-events-exact table { width: 100%; margin-top: 7px; border-collapse: collapse; font-size: 9.5px; font-variant-numeric: tabular-nums; }
.dsh-events-exact th, .dsh-events-exact td { padding: 5px 6px; border-bottom: 1px solid var(--dsw-alias-border-l1); text-align: left; }
.dsh-events-exact th { color: var(--dsw-alias-label-tertiary); font-weight: 500; }
.dsh-events-exact td { color: var(--dsw-alias-label-secondary); }
.dsh-events-detail-links { display: flex; flex-wrap: wrap; gap: 7px; margin-top: 14px; }
.dsh-events-detail-links a {
  display: inline-flex;
  align-items: center;
  min-height: 34px;
  padding: 5px 10px;
  border: 1px solid var(--dsw-alias-border-l2);
  border-radius: var(--dsw-radius-sm, 6px);
  color: var(--dsh-events-blue);
  font-size: 10.5px;
  text-decoration: none;
}
.dsh-events-detail-links a:hover { background: var(--dsw-alias-interactive-bg-hover); }

/* Earnings follows the reference calendar's compact heading, controls and day-row rhythm. */
[data-rg-root] .dsh-events-earnings { padding-top: 22px; }
[data-rg-root] .dsh-events-earnings .rg-discovery-heading {
  align-items: center;
  min-height: 34px;
  margin-bottom: 8px;
}
[data-rg-root] .dsh-events-earnings .rg-discovery-heading h2 { margin: 0; }
[data-rg-root] .dsh-events-earnings > .rg-discovery-source {
  margin: 0 0 12px;
  line-height: 1.45;
}
[data-rg-root] .dsh-events-earnings .dsh-events-week-nav { gap: 6px; }
[data-rg-root] .dsh-events-earnings .dsh-events-week-nav .dsh-events-button {
  min-height: 32px;
  border-radius: 7px;
  background: var(--dsw-alias-bg-layer-1);
}
[data-rg-root] .dsh-events-earnings .dsh-events-day-strip {
  gap: 8px;
  padding: 8px 0 14px;
  border-bottom: 1px solid var(--dsw-alias-border-l1);
}
[data-rg-root] .dsh-events-earnings .dsh-events-day {
  min-height: 82px;
  border-radius: 9px;
  text-align: center;
}
[data-rg-root] .dsh-events-earnings .dsh-events-day small { margin-top: 1px; }
[data-rg-root] .dsh-events-earnings .dsh-events-day strong { margin-top: 4px; }
[data-rg-root] .dsh-events-earnings .dsh-events-day span { margin-top: 5px; }
[data-rg-root] .dsh-events-earnings .dsh-events-controls {
  padding: 10px 0 14px;
  margin: 0;
}
[data-rg-root] .dsh-events-earnings .rg-event-table tbody tr { height: 54px; }
[data-rg-root] .dsh-events-earnings .rg-event-company { padding: 0; }

/* A market opens into a complete internal detail surface while staying in this panel. */
[data-rg-root] .dsh-events-prediction { padding-top: 20px; }
[data-rg-root] .rg-event-detail.dsh-events-prediction-detail {
  display: block;
  min-width: 0;
  margin: 0;
  padding: 0 0 20px;
  border: 0;
  background: transparent;
}
[data-rg-root] .dsh-events-detail-head {
  padding: 0 0 16px;
  border-bottom: 1px solid var(--dsw-alias-border-l1);
}
[data-rg-root] .dsh-events-detail-back {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 28px;
  margin: 0 0 12px;
  padding: 2px 0;
  border: 0;
  background: transparent;
  color: var(--dsw-alias-label-secondary);
  font-size: 11.5px;
  cursor: pointer;
}
[data-rg-root] .dsh-events-detail-back:hover { color: var(--dsw-alias-label-primary); }
[data-rg-root] .dsh-events-detail-back > span { font-size: 20px; line-height: 1; }
[data-rg-root] .dsh-events-detail-title-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 18px;
}
[data-rg-root] .dsh-events-detail-topic {
  display: block;
  margin-bottom: 7px;
  color: var(--dsw-alias-label-tertiary);
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
}
[data-rg-root] .dsh-events-detail-title-row h3,
[data-rg-root] .rg-event-detail.dsh-events-prediction-detail h3 {
  max-width: 34ch;
  margin: 0;
  color: var(--dsw-alias-label-primary);
  font-size: 28px;
  font-weight: 570;
  line-height: 1.2;
  letter-spacing: 0;
}
[data-rg-root] .dsh-events-detail-status {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  flex: none;
  max-width: 270px;
  min-height: 30px;
  padding: 5px 9px;
  border: 1px solid var(--dsw-alias-border-l1);
  border-radius: 999px;
  background: var(--dsw-alias-bg-layer-1);
  color: var(--dsw-alias-label-tertiary);
  font-size: 9.5px;
  line-height: 1.4;
}
[data-rg-root] .dsh-events-detail-status > i {
  flex: none;
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--dsw-alias-state-success-primary);
}
[data-rg-root] .dsh-events-detail-status[data-synthetic] > i {
  background: var(--dsw-static-amber-500, var(--dsw-alias-state-warn-primary));
}
[data-rg-root] .dsh-events-detail-facts {
  display: flex;
  flex-wrap: wrap;
  gap: 7px 22px;
  margin-top: 12px;
  color: var(--dsw-alias-label-secondary);
  font-size: 11px;
  font-variant-numeric: tabular-nums;
}
[data-rg-root] .dsh-events-detail-facts > span { display: inline-flex; align-items: baseline; gap: 6px; }
[data-rg-root] .dsh-events-detail-facts strong { color: var(--dsw-alias-label-tertiary); font-size: 10px; font-weight: 500; }
[data-rg-root] .rg-pf-body[data-with-aside]:has(.dsh-events-prediction-detail) { display: block; }
[data-rg-root] .rg-pf-body:has(.dsh-events-prediction-detail) > .rg-pf-aside { display: none; }
[data-rg-root] .dsh-events-prediction { container-type: inline-size; }
[data-rg-root] .dsh-events-detail-layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(250px, 286px);
  gap: 22px;
  align-items: start;
  padding-top: 18px;
}
[data-rg-root] .dsh-events-detail-primary,
[data-rg-root] .dsh-events-detail-aside { min-width: 0; }
[data-rg-root] .dsh-events-detail-primary {
  padding: 16px;
  border: 1px solid var(--dsw-alias-border-l2);
  border-radius: 10px;
  background: var(--dsw-alias-bg-layer-1);
}
[data-rg-root] .dsh-events-detail-primary .dsh-events-history-head {
  align-items: flex-start;
  gap: 16px;
}
[data-rg-root] .dsh-events-detail-primary .dsh-events-history-head > div { min-width: 0; }
[data-rg-root] .dsh-events-detail-primary .dsh-events-history-head h4 {
  margin: 0;
  color: var(--dsw-alias-label-primary);
  font-size: 12px;
  font-weight: 600;
}
[data-rg-root] .dsh-events-detail-primary .dsh-events-history-head p {
  max-width: 58ch;
  margin: 4px 0 0;
  color: var(--dsw-alias-label-tertiary);
  font-size: 12px;
  line-height: 1.5;
}
[data-rg-root] .dsh-events-detail-primary .dsh-events-history-head > strong {
  flex: none;
  color: var(--dsw-alias-label-primary);
  font-size: 12px;
  font-variant-numeric: tabular-nums;
  font-weight: 600;
  white-space: nowrap;
}
[data-rg-root] .rg-contract-history.dsh-events-contract-history {
  margin: 12px 0 0;
  color: var(--dsh-events-blue);
}
[data-rg-root] .dsh-events-history-ranges {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
  margin: 12px 0 0;
}
[data-rg-root] .dsh-events-history-ranges button {
  min-width: 34px;
  min-height: 28px;
  padding: 4px 8px;
  border: 1px solid transparent;
  border-radius: 6px;
  background: transparent;
  color: var(--dsw-alias-label-tertiary);
  font-size: 11.5px;
  font-weight: 600;
  cursor: pointer;
}
[data-rg-root] .dsh-events-history-ranges button:hover {
  border-color: var(--dsw-alias-border-l2);
  color: var(--dsw-alias-label-primary);
}
[data-rg-root] .dsh-events-history-ranges button[data-active] {
  border-color: var(--dsw-alias-border-l2);
  background: var(--dsw-alias-bg-layer-2);
  color: var(--dsw-alias-label-primary);
}
[data-rg-root] .dsh-events-contract-history svg {
  display: block;
  width: 100%;
  height: auto;
  max-height: none;
  margin: 0;
  overflow: visible;
}
[data-rg-root] .dsh-events-contract-history polyline {
  fill: none;
  stroke: currentColor;
  stroke-width: 2px;
  stroke-linecap: round;
  stroke-linejoin: round;
}
[data-rg-root] .dsh-events-contract-history .dsh-events-chart-grid {
  stroke: var(--dsw-alias-border-l1);
  stroke-width: 1;
}
[data-rg-root] .dsh-events-contract-history .dsh-events-chart-axis {
  stroke: var(--dsw-alias-border-l2);
  stroke-width: 1;
}
[data-rg-root] .dsh-events-contract-history .dsh-events-chart-axis-label {
  fill: var(--dsw-alias-label-tertiary);
  font-size: 15px;
  font-variant-numeric: tabular-nums;
}
[data-rg-root] .dsh-events-contract-history-empty {
  margin: 14px 0 0;
  padding: 28px 12px;
  border: 1px dashed var(--dsw-alias-border-l2);
  border-radius: 8px;
  color: var(--dsw-alias-label-tertiary);
  font-size: 11px;
  text-align: center;
}
[data-rg-root] .dsh-events-data-warning {
  margin: 12px 0 0;
  padding: 9px 10px;
  border: 1px solid var(--dsw-static-amber-500, var(--dsw-alias-state-warn-primary));
  border-radius: 7px;
  background: color-mix(in srgb, var(--dsw-static-amber-500, var(--dsw-alias-state-warn-primary)) 8%, var(--dsw-alias-bg-layer-1));
  color: var(--dsw-alias-label-secondary);
  font-size: 10px;
  line-height: 1.45;
}
[data-rg-root] .dsh-events-contract-outcomes {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
  margin-top: 10px;
}
[data-rg-root] .dsh-events-contract-outcomes[data-outcome-count="3"],
[data-rg-root] .dsh-events-contract-outcomes[data-outcome-count="4"] {
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
}
[data-rg-root] .dsh-events-contract-outcome-button {
  display: grid;
  gap: 7px;
  min-width: 0;
  padding: 10px 11px;
  border: 1px solid var(--dsw-alias-border-l1);
  border-radius: 7px;
  background: var(--dsw-alias-bg-layer-1);
  color: var(--dsw-alias-label-secondary);
  font-size: 11.5px;
  text-align: left;
  cursor: pointer;
}
[data-rg-root] .dsh-events-contract-outcome-button:hover {
  border-color: var(--dsw-alias-border-l3);
  background: var(--dsw-alias-interactive-bg-hover);
  color: var(--dsw-alias-label-primary);
}
[data-rg-root] .dsh-events-contract-outcome-button[data-selected] {
  border-color: var(--dsh-events-blue-line);
  background: var(--dsh-events-blue-soft);
  color: var(--dsw-alias-label-primary);
  font-weight: 600;
}
[data-rg-root] .dsh-events-contract-outcome-button > span { font-variant-numeric: tabular-nums; }
[data-rg-root] .dsh-events-contract-outcome-button > i {
  display: block;
  height: 4px;
  overflow: hidden;
  border-radius: 999px;
  background: var(--dsw-alias-bg-layer-3);
}
[data-rg-root] .dsh-events-contract-outcome-button > i > b {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: var(--dsh-events-blue);
}
[data-rg-root] .dsh-events-contract-summary {
  display: grid;
  gap: 8px;
}
[data-rg-root] .dsh-events-contract-summary > div {
  display: grid;
  gap: 5px;
}
[data-rg-root] .dsh-events-resolution {
  margin-top: 14px;
  padding-top: 13px;
  border-top: 1px solid var(--dsw-alias-border-l1);
}
[data-rg-root] .dsh-events-resolution h4 {
  margin: 0;
  color: var(--dsw-alias-label-secondary);
  font-size: 10.5px;
  font-weight: 600;
}
[data-rg-root] .dsh-events-resolution p {
  margin: 5px 0 0;
  color: var(--dsw-alias-label-secondary);
  font-size: 10.5px;
  line-height: 1.55;
}
[data-rg-root] .dsh-events-contract-actions { margin-top: 14px; }
[data-rg-root] .dsh-events-detail-aside {
  display: grid;
  gap: 12px;
}
[data-rg-root] .dsh-events-contract-sidebar,
[data-rg-root] .dsh-events-more-markets {
  padding: 13px;
  border: 1px solid var(--dsw-alias-border-l2);
  border-radius: 9px;
  background: var(--dsw-alias-bg-layer-1);
}
[data-rg-root] .dsh-events-detail-aside-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 8px;
}
[data-rg-root] .dsh-events-detail-aside h4 {
  margin: 0;
  color: var(--dsw-alias-label-primary);
  font-size: 11px;
  font-weight: 600;
}
[data-rg-root] .dsh-events-detail-aside-head a {
  color: var(--dsh-events-blue);
  font-size: 9px;
  text-decoration: none;
}
[data-rg-root] .dsh-events-detail-aside-head a:hover { text-decoration: underline; }
[data-rg-root] .dsh-events-contract {
  display: block;
  margin: 0;
  overflow: visible;
  border: 0;
  border-radius: 0;
  background: transparent;
}
[data-rg-root] .dsh-events-contract > div {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
  padding: 8px 0;
  border-top: 1px solid var(--dsw-alias-border-l1);
  background: transparent;
}
[data-rg-root] .dsh-events-contract > div:first-child { border-top: 0; }
[data-rg-root] .dsh-events-contract dt {
  flex: none;
  color: var(--dsw-alias-label-tertiary);
  font-size: 9.5px;
}
[data-rg-root] .dsh-events-contract dd {
  min-width: 0;
  margin: 0;
  color: var(--dsw-alias-label-secondary);
  font-size: 10px;
  line-height: 1.4;
  text-align: right;
  overflow-wrap: anywhere;
}
[data-rg-root] .dsh-events-more-markets > div { display: grid; gap: 8px; margin-top: 9px; }
[data-rg-root] .dsh-events-more-markets .rg-contract-card.dsh-events-more-card {
  display: grid;
  gap: 7px;
  min-width: 0;
  padding: 10px;
  border: 1px solid var(--dsw-alias-border-l1);
  border-radius: 7px;
  background: var(--dsw-alias-bg-layer-2);
  text-align: left;
  cursor: pointer;
}
[data-rg-root] .dsh-events-more-markets .rg-contract-card.dsh-events-more-card:hover {
  border-color: var(--dsw-alias-border-l3);
  background: var(--dsw-alias-interactive-bg-hover);
}
[data-rg-root] .dsh-events-more-card > small {
  color: var(--dsw-alias-label-tertiary);
  font-size: 8.5px;
  text-transform: uppercase;
}
[data-rg-root] .dsh-events-more-card > strong {
  color: var(--dsw-alias-label-primary);
  font-size: 10.5px;
  font-weight: 550;
  line-height: 1.45;
}
[data-rg-root] .dsh-events-more-card > span {
  display: flex;
  align-items: center;
  justify-content: space-between;
  color: var(--dsw-alias-label-secondary);
  font-size: 10px;
}
[data-rg-root] .dsh-events-more-card > span > b { font-weight: 500; }
[data-rg-root] .dsh-events-more-card > footer {
  margin: 0;
  padding: 7px 0 0;
  border-top: 1px solid var(--dsw-alias-border-l1);
  color: var(--dsw-alias-label-tertiary);
  font-size: 8.5px;
}
[data-rg-root] .dsh-events-more-markets > div > p {
  margin: 0;
  color: var(--dsw-alias-label-tertiary);
  font-size: 10px;
}
[data-rg-root] .dsh-events .rg-contract-grid .rg-contract-card {
  display: grid;
  align-content: start;
  min-width: 0;
  padding: 18px 20px;
  border: 1px solid var(--dsw-alias-border-l2);
  border-radius: 10px;
  background: var(--dsw-alias-bg-layer-1);
}
[data-rg-root] .dsh-events .rg-contract-grid .rg-contract-card:hover {
  border-color: var(--dsw-alias-border-l3);
  background: var(--dsw-alias-interactive-bg-hover);
}
[data-rg-root] .dsh-events .rg-contract-grid .rg-contract-card > small { font-size: 9.5px; }
[data-rg-root] .dsh-events .rg-contract-grid .rg-contract-card h3 {
  margin: 8px 0 14px;
  color: var(--dsw-alias-label-primary);
  font-size: 14px;
  font-weight: 550;
  line-height: 1.5;
}
[data-rg-root] .dsh-events .rg-contract-grid .rg-contract-card footer {
  margin-top: 14px;
  padding-top: 12px;
}

@container (max-width: 840px) {
  [data-rg-root] .dsh-events-detail-layout { grid-template-columns: minmax(0, 1fr); }
  [data-rg-root] .dsh-events-detail-aside { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}

@media (max-width: 900px) {
  .dsh-events-market-layout { grid-template-columns: 1fr; }
  .dsh-events-market-detail { position: static; }
  .dsh-events-detail { grid-template-columns: 1fr; gap: 15px; }
  [data-rg-root] .dsh-events-detail-layout { grid-template-columns: minmax(0, 1fr); }
  [data-rg-root] .dsh-events-detail-aside { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}

@media (max-width: 620px) {
  .dsh-events-head { gap: 12px; }
  .dsh-events-head-meta { align-items: flex-start; }
  .dsh-events-demo { white-space: normal; text-align: center; }
  .dsh-events-controls { align-items: flex-start; }
  .dsh-events-list-head { display: none; }
  .dsh-events-earnings-row { grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 10px; padding: 11px 8px; }
  .dsh-events-company { grid-column: 1 / -1; }
  .dsh-events-session { text-align: right; }
  .dsh-events-metric { grid-template-columns: repeat(3, minmax(0, 1fr)); }
  .dsh-events-metric > strong { font-size: 9px; }
  .dsh-events-market-detail > header { display: block; }
  .dsh-events-contract { grid-template-columns: 1fr; }
  .dsh-events-external-note { align-items: flex-start; flex-direction: column; }
  [data-rg-root] .dsh-events-detail-title-row { display: block; }
  [data-rg-root] .dsh-events-detail-status { margin-top: 10px; max-width: none; white-space: normal; }
  [data-rg-root] .dsh-events-detail-title-row h3,
  [data-rg-root] .rg-event-detail.dsh-events-prediction-detail h3 { font-size: 22px; }
  [data-rg-root] .dsh-events-detail-facts { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px 12px; }
  [data-rg-root] .dsh-events-detail-facts > span:last-child { grid-column: 1 / -1; }
  [data-rg-root] .dsh-events-detail-aside { grid-template-columns: minmax(0, 1fr); }
  [data-rg-root] .dsh-events-detail-primary { padding: 12px; }
  [data-rg-root] .dsh-events-detail-primary .dsh-events-history-head { display: block; }
  [data-rg-root] .dsh-events-detail-primary .dsh-events-history-head > strong { display: block; margin-top: 6px; }
  [data-rg-root] .dsh-events-contract-outcomes { grid-template-columns: minmax(0, 1fr); }
  [data-rg-root] .dsh-events-earnings .rg-discovery-heading { align-items: flex-start; gap: 10px; flex-direction: column; }
}

@media (max-width: 390px) {
  .dsh-events-head { flex-direction: column; }
  .dsh-events-head-meta { width: 100%; align-items: flex-start; }
  .dsh-events-controls { gap: 7px; }
  .dsh-events-control-group { flex: 1 1 100%; justify-content: space-between; }
  .dsh-events-week { min-width: 0; flex: 1; }
  .dsh-events-week-nav { width: 100%; }
  .dsh-events-week-nav .dsh-events-button { flex: 1; }
  .dsh-events-day-strip { grid-template-columns: repeat(7, 72px); }
  .dsh-events-earnings-row { grid-template-columns: 1fr; }
  .dsh-events-company, .dsh-events-metric, .dsh-events-session { grid-column: 1; }
  .dsh-events-session { text-align: left; }
  .dsh-events-detail-actions .dsh-events-button { width: 100%; }
  .dsh-events-market-detail { padding: 12px; }
  .dsh-events-chart-scroll { margin-right: -12px; margin-left: -12px; padding: 0 12px; }
}

@media (prefers-reduced-motion: reduce) {
  .dsh-events *, .dsh-events *::before, .dsh-events *::after {
    scroll-behavior: auto !important;
    transition: none !important;
  }
}
`
