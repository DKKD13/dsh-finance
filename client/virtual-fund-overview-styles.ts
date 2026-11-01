export const VIRTUAL_FUND_OVERVIEW_STYLE = `
[data-rg-root] .rg-vfund-overview {
  --rg-vfund-overview-line: var(--dsw-alias-border-l1);
  --rg-vfund-overview-line-strong: var(--dsw-alias-border-l2);
  width: 100%;
  min-width: 0;
  color: var(--dsw-alias-label-primary);
  background: var(--dsw-alias-bg-base);
  font-size: 14px;
  line-height: 1.5;
  font-variant-numeric: tabular-nums;
}
[data-rg-root] .rg-vfund-overview *,
[data-rg-root] .rg-vfund-overview *::before,
[data-rg-root] .rg-vfund-overview *::after { box-sizing: border-box; }
[data-rg-root] .rg-vfund-overview button { font: inherit; }
[data-rg-root] .rg-vfund-overview button:focus-visible,
[data-rg-root] .rg-vfund-overview svg:focus-visible {
  outline: 2px solid var(--dsw-alias-brand-primary);
  outline-offset: 2px;
}
[data-rg-root] .rg-vfund-overview-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 32px;
  padding: 22px 28px 18px;
  border-bottom: 1px solid var(--rg-vfund-overview-line);
}
[data-rg-root] .rg-vfund-overview-head > div { min-width: 0; }
[data-rg-root] .rg-vfund-overview-title-line { display: flex; align-items: center; flex-wrap: wrap; gap: 8px 10px; }
[data-rg-root] .rg-vfund-overview-head h3 {
  margin: 0;
  font-size: 24px;
  line-height: 1.2;
  font-weight: 650;
  letter-spacing: -.02em;
}
[data-rg-root] .rg-vfund-overview-title-line > span {
  display: inline-flex;
  align-items: center;
  height: 22px;
  padding: 0 7px;
  border: 1px solid var(--rg-vfund-overview-line-strong);
  border-radius: 5px;
  color: var(--dsw-alias-label-tertiary);
  font-family: var(--ds-font-family-code, monospace);
  font-size: 11px;
  line-height: 1;
}
[data-rg-root] .rg-vfund-overview-head p {
  max-width: 72ch;
  margin: 6px 0 0;
  color: var(--dsw-alias-label-secondary);
  font-size: 14px;
}
[data-rg-root] .rg-vfund-overview-fund-meta {
  display: flex;
  flex: none;
  gap: 26px;
  margin: 0;
}
[data-rg-root] .rg-vfund-overview-fund-meta > div { min-width: 96px; }
[data-rg-root] .rg-vfund-overview dt {
  color: var(--dsw-alias-label-tertiary);
  font-size: 12px;
  font-weight: 450;
}
[data-rg-root] .rg-vfund-overview-fund-meta dd {
  margin: 3px 0 0;
  font-size: 14px;
  font-weight: 550;
  white-space: nowrap;
}
[data-rg-root] .rg-vfund-overview-value {
  display: grid;
  grid-template-columns: minmax(260px, .8fr) minmax(0, 1.35fr);
  align-items: end;
  gap: 44px;
  padding: 20px 28px 18px;
  border-bottom: 1px solid var(--rg-vfund-overview-line);
}
[data-rg-root] .rg-vfund-overview-nav > span {
  display: block;
  color: var(--dsw-alias-label-secondary);
  font-size: 12px;
}
[data-rg-root] .rg-vfund-overview-nav > strong {
  display: block;
  margin-top: 2px;
  font-size: 30px;
  line-height: 1.15;
  font-weight: 650;
  letter-spacing: -.02em;
}
[data-rg-root] .rg-vfund-overview-value dl {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0;
  margin: 0;
}
[data-rg-root] .rg-vfund-overview-value dl > div {
  min-width: 0;
  padding: 3px 18px;
  border-left: 1px solid var(--rg-vfund-overview-line);
}
[data-rg-root] .rg-vfund-overview-value dd {
  display: grid;
  gap: 2px;
  margin: 5px 0 0;
}
[data-rg-root] .rg-vfund-overview-value dd strong { color: var(--dsw-alias-label-primary); font-size: 14px; font-weight: 600; }
[data-rg-root] .rg-vfund-overview-value dd span { color: var(--dsw-alias-label-tertiary); font-size: 12px; }
[data-rg-root] .rg-vfund-overview [data-positive] dd > strong { color: var(--dsw-alias-state-success-primary); }
[data-rg-root] .rg-vfund-overview [data-negative] dd > strong { color: var(--dsw-alias-state-error-primary); }
[data-rg-root] .rg-vfund-overview-chart { padding: 20px 28px 18px; border-bottom: 1px solid var(--rg-vfund-overview-line); }
[data-rg-root] .rg-vfund-overview-chart-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 20px;
  margin-bottom: 8px;
}
[data-rg-root] .rg-vfund-overview-chart-head > div:first-child { min-width: 0; }
[data-rg-root] .rg-vfund-overview h4 {
  margin: 0;
  font-size: 16px;
  line-height: 1.35;
  font-weight: 620;
}
[data-rg-root] .rg-vfund-overview-chart-head p {
  margin: 3px 0 0;
  color: var(--dsw-alias-label-tertiary);
  font-size: 12px;
}
[data-rg-root] .rg-vfund-overview-ranges {
  display: flex;
  flex: none;
  gap: 2px;
  padding: 2px;
  border: 1px solid var(--rg-vfund-overview-line);
  border-radius: 7px;
  background: var(--dsw-alias-bg-layer-2);
}
[data-rg-root] .rg-vfund-overview-ranges button {
  min-width: 38px;
  height: 27px;
  padding: 0 8px;
  border: 0;
  border-radius: 5px;
  color: var(--dsw-alias-label-tertiary);
  background: transparent;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
}
[data-rg-root] .rg-vfund-overview-ranges button:hover { color: var(--dsw-alias-label-primary); }
[data-rg-root] .rg-vfund-overview-ranges button[aria-pressed='true'] {
  color: var(--dsw-alias-label-primary);
  background: var(--dsw-alias-bg-base);
  box-shadow: 0 1px 3px var(--dsw-alias-bg-mask-2);
}
[data-rg-root] .rg-vfund-overview-chart-wrap { position: relative; min-width: 0; margin-top: 4px; }
[data-rg-root] .rg-vfund-overview-chart-wrap > svg {
  display: block;
  width: 100%;
  height: auto;
  overflow: visible;
  touch-action: pan-y;
  cursor: crosshair;
}
[data-rg-root] .rg-vfund-overview-gridline { stroke: var(--rg-vfund-overview-line); stroke-width: 1; }
[data-rg-root] .rg-vfund-overview-axis-label {
  fill: var(--dsw-alias-label-tertiary);
  font-size: 12px;
  font-variant-numeric: tabular-nums;
}
[data-rg-root] .rg-vfund-overview-area {
  fill: color-mix(in srgb, var(--dsw-alias-state-business-primary) 9%, transparent);
}
[data-rg-root] .rg-vfund-overview-line {
  fill: none;
  stroke: var(--dsw-alias-state-business-primary);
  stroke-width: 2;
  stroke-linecap: round;
  stroke-linejoin: round;
}
[data-rg-root] .rg-vfund-overview-point {
  fill: var(--dsw-alias-state-business-primary);
  stroke: var(--dsw-alias-bg-base);
  stroke-width: 2;
}
[data-rg-root] .rg-vfund-overview-point-active line {
  stroke: var(--dsw-alias-label-tertiary);
  stroke-width: 1;
  stroke-dasharray: 3 3;
}
[data-rg-root] .rg-vfund-overview-point-active circle {
  fill: var(--dsw-alias-bg-base);
  stroke: var(--dsw-alias-state-business-primary);
  stroke-width: 2.5;
}
[data-rg-root] .rg-vfund-overview-tooltip {
  position: absolute;
  z-index: 2;
  top: 10px;
  width: 210px;
  padding: 9px 11px;
  transform: translateX(10px);
  pointer-events: none;
  border: 1px solid var(--rg-vfund-overview-line-strong);
  border-radius: 7px;
  background: var(--dsw-alias-bg-layer-3);
  box-shadow: 0 12px 28px -18px var(--dsw-alias-bg-mask-2);
}
[data-rg-root] .rg-vfund-overview-tooltip[data-side='left'] { transform: translateX(calc(-100% - 10px)); }
[data-rg-root] .rg-vfund-overview-tooltip > strong { display: block; font-size: 12px; font-weight: 550; }
[data-rg-root] .rg-vfund-overview-tooltip dl { display: grid; gap: 4px; margin: 7px 0 0; }
[data-rg-root] .rg-vfund-overview-tooltip dl > div { display: flex; justify-content: space-between; gap: 14px; }
[data-rg-root] .rg-vfund-overview-tooltip dt { color: var(--dsw-alias-label-tertiary); font-size: 12px; }
[data-rg-root] .rg-vfund-overview-tooltip dd { margin: 0; font-size: 12px; font-weight: 500; }
[data-rg-root] .rg-vfund-overview-chart-summary {
  max-width: 88ch;
  margin: 6px 0 0;
  color: var(--dsw-alias-label-secondary);
  font-size: 12px;
  line-height: 1.55;
}
[data-rg-root] .rg-vfund-overview-source-line {
  display: flex;
  gap: 8px;
  margin: 7px 0 0;
  color: var(--dsw-alias-label-tertiary);
  font-family: var(--ds-font-family-code, monospace);
  font-size: 11px;
  overflow-wrap: anywhere;
}
[data-rg-root] .rg-vfund-overview-source-line span { color: var(--dsw-alias-label-secondary); font-family: inherit; }
[data-rg-root] .rg-vfund-overview-lower {
  display: grid;
  grid-template-columns: minmax(0, 1.55fr) minmax(310px, .75fr);
}
[data-rg-root] .rg-vfund-overview-lower > section,
[data-rg-root] .rg-vfund-overview-lower > aside { min-width: 0; padding: 20px 28px 24px; }
[data-rg-root] .rg-vfund-overview-lower > aside { border-left: 1px solid var(--rg-vfund-overview-line); }
[data-rg-root] .rg-vfund-overview-section-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 18px;
  margin-bottom: 12px;
}
[data-rg-root] .rg-vfund-overview-section-head > div { min-width: 0; }
[data-rg-root] .rg-vfund-overview-section-head p { margin: 3px 0 0; color: var(--dsw-alias-label-tertiary); font-size: 12px; }
[data-rg-root] .rg-vfund-overview-section-head > span { flex: none; color: var(--dsw-alias-label-tertiary); font-size: 12px; }
[data-rg-root] .rg-vfund-overview-table-wrap { min-width: 0; overflow-x: auto; }
[data-rg-root] .rg-vfund-overview-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
  font-variant-numeric: tabular-nums;
}
[data-rg-root] .rg-vfund-overview-table th,
[data-rg-root] .rg-vfund-overview-table td {
  padding: 9px 8px;
  border-bottom: 1px solid var(--rg-vfund-overview-line);
  text-align: right;
  white-space: nowrap;
}
[data-rg-root] .rg-vfund-overview-table thead th {
  padding-top: 5px;
  color: var(--dsw-alias-label-tertiary);
  font-size: 12px;
  font-weight: 450;
}
[data-rg-root] .rg-vfund-overview-table th:first-child,
[data-rg-root] .rg-vfund-overview-table td:first-child { text-align: left; }
[data-rg-root] .rg-vfund-overview-table tbody tr:hover { background: var(--dsw-alias-interactive-bg-hover); }
[data-rg-root] .rg-vfund-overview-asset {
  display: inline-flex;
  align-items: center;
  gap: 9px;
  padding: 0;
  border: 0;
  color: var(--dsw-alias-label-primary);
  background: transparent;
  cursor: pointer;
}
[data-rg-root] .rg-vfund-overview-asset:hover strong { text-decoration: underline; text-underline-offset: 3px; }
[data-rg-root] .rg-vfund-overview-asset .rg-pf-monogram { display: inline-grid; place-items: center; width: 28px; height: 28px; flex: none; overflow: hidden; border-radius: 6px; }
[data-rg-root] .rg-vfund-overview-asset strong { font-family: var(--ds-font-family-code, monospace); font-size: 13px; font-weight: 600; }
[data-rg-root] .rg-vfund-overview-holdings-foot {
  display: flex;
  justify-content: flex-end;
  gap: 24px;
  padding-top: 10px;
  color: var(--dsw-alias-label-tertiary);
  font-size: 12px;
}
[data-rg-root] .rg-vfund-overview-holdings-foot strong { color: var(--dsw-alias-label-primary); font-size: 13px; font-weight: 550; }
[data-rg-root] .rg-vfund-overview-review-meta {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  color: var(--dsw-alias-label-tertiary);
  font-size: 12px;
}
[data-rg-root] .rg-vfund-overview-review-meta span { color: var(--dsw-alias-label-secondary); }
[data-rg-root] .rg-vfund-overview-review h5 {
  margin: 6px 0 8px;
  font-size: 14px;
  line-height: 1.45;
  font-weight: 600;
}
[data-rg-root] .rg-vfund-overview-research-preview {
  max-height: 136px;
  overflow: hidden;
  color: var(--dsw-alias-label-secondary);
  font-size: 13px;
  line-height: 1.55;
}
[data-rg-root] .rg-vfund-overview-research-preview :is(h1,h2,h3,h4) { margin: 8px 0 4px; font-size: 13px; }
[data-rg-root] .rg-vfund-overview-research-preview p { margin: 0 0 6px; }
[data-rg-root] .rg-vfund-overview-research-preview :is(ul,ol) { margin: 4px 0 6px; padding-left: 18px; }
[data-rg-root] .rg-vfund-overview-review > button,
[data-rg-root] .rg-vfund-overview-empty > button {
  min-height: 32px;
  padding: 0 11px;
  border: 1px solid var(--rg-vfund-overview-line-strong);
  border-radius: 6px;
  color: var(--dsw-alias-label-secondary);
  background: var(--dsw-alias-bg-layer-1);
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
}
[data-rg-root] .rg-vfund-overview-review > button { margin-top: 10px; }
[data-rg-root] .rg-vfund-overview-review > button:hover { color: var(--dsw-alias-label-primary); background: var(--dsw-alias-interactive-bg-hover); }
[data-rg-root] .rg-vfund-overview-research-list {
  margin: 16px 0 0;
  padding: 0;
  border-top: 1px solid var(--rg-vfund-overview-line);
  list-style: none;
}
[data-rg-root] .rg-vfund-overview-research-list li + li { border-top: 1px solid var(--rg-vfund-overview-line); }
[data-rg-root] .rg-vfund-overview-research-list button {
  display: grid;
  width: 100%;
  gap: 2px;
  padding: 9px 2px;
  border: 0;
  color: var(--dsw-alias-label-secondary);
  background: transparent;
  text-align: left;
  cursor: pointer;
}
[data-rg-root] .rg-vfund-overview-research-list button:hover,
[data-rg-root] .rg-vfund-overview-research-list button[aria-pressed='true'] { color: var(--dsw-alias-label-primary); }
[data-rg-root] .rg-vfund-overview-research-list button[aria-pressed='true'] { background: var(--dsw-alias-bg-layer-2); }
[data-rg-root] .rg-vfund-overview-research-list span { overflow: hidden; font-size: 12px; font-weight: 500; text-overflow: ellipsis; white-space: nowrap; }
[data-rg-root] .rg-vfund-overview-research-list small { color: var(--dsw-alias-label-tertiary); font-size: 11px; }
[data-rg-root] .rg-vfund-overview-inline-empty {
  margin: 0;
  color: var(--dsw-alias-label-tertiary);
  font-size: 13px;
}
[data-rg-root] .rg-vfund-overview-empty {
  display: flex;
  min-height: 360px;
  max-width: 680px;
  margin: 0 auto;
  padding: 54px 28px 64px;
  align-items: center;
  flex-direction: column;
  justify-content: center;
  text-align: center;
}
[data-rg-root] .rg-vfund-overview-empty-art {
  display: block;
  width: 180px;
  color: var(--dsw-alias-label-tertiary);
}
[data-rg-root] .rg-vfund-overview-empty-art svg {
  display: block;
  width: 100%;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.2;
  stroke-linecap: round;
  stroke-linejoin: round;
  opacity: .62;
}
[data-rg-root] .rg-vfund-overview-empty h4 { margin-top: 14px; font-size: 18px; }
[data-rg-root] .rg-vfund-overview-empty p {
  max-width: 55ch;
  margin: 7px 0 16px;
  color: var(--dsw-alias-label-secondary);
  font-size: 14px;
}
[data-rg-root] .rg-vfund-overview-empty > button {
  min-height: 36px;
  padding: 0 14px;
  border-color: var(--dsw-alias-button-primary-fill);
  color: var(--dsw-alias-label-primary-inverted);
  background: var(--dsw-alias-button-primary-fill);
}
[data-rg-root] .rg-vfund-overview-empty > button:hover { filter: brightness(.96); }
`
