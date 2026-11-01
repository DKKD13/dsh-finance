export const STOCK_CHART_STYLE = `
.rg-chart-frame.rg-stock-chart {
  position: relative;
  margin: 0;
  overflow: hidden;
}
.rg-stock-chart .rg-chart-frame-head {
  position: absolute;
  z-index: 3;
  top: 10px;
  left: 58px;
  right: 14px;
  min-height: 30px;
  margin: 0;
}
.rg-stock-chart .rg-chart-frame-head > div:first-child {
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
.rg-stock-chart .rg-chart-frame-head > .rg-finance-badge {
  position: absolute;
  top: 0;
  right: 0;
}
.rg-stock-chart .rg-chart-controls {
  position: absolute;
  top: 0;
  left: 0;
}
.rg-stock-chart-controls {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  padding: 2px;
  border: 1px solid var(--dsw-alias-border-l1);
  border-radius: 7px;
  background: color-mix(in srgb, var(--dsw-alias-bg-layer-1) 92%, transparent);
}
.rg-stock-chart-controls button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 28px;
  height: 27px;
  padding: 0 7px;
  border: 0;
  border-radius: 5px;
  color: var(--dsw-alias-label-tertiary);
  background: transparent;
  font: inherit;
}
.rg-stock-chart-controls button:hover {
  color: var(--dsw-alias-label-primary);
  background: var(--dsw-alias-interactive-bg-hover);
}
.rg-stock-chart-controls button[data-active] {
  color: var(--dsw-alias-label-primary);
  background: var(--dsw-alias-bg-layer-2);
}
.rg-stock-chart-controls .rg-stock-chart-adjustment {
  min-width: 34px;
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0;
}
.rg-stock-chart-controls svg {
  width: 15px;
  height: 15px;
}
.rg-stock-chart .rg-chart-meta {
  min-height: 17px;
  margin: 0;
  padding: 0 14px 6px 58px;
}
.rg-stock-chart .rg-chart-canvas {
  overflow: hidden;
}
.rg-stock-chart .rg-market-chart {
  min-width: 0;
}
.rg-stock-chart .rg-market-chart > svg {
  width: 100%;
  min-height: 260px;
  touch-action: pan-y;
}
.rg-stock-chart .rg-chart-grid {
  opacity: .5;
  stroke-dasharray: 1 4;
}
.rg-stock-chart .rg-chart-axis {
  opacity: .55;
}
.rg-stock-chart .rg-chart-axis-label,
.rg-stock-chart .rg-chart-axis-title {
  font-size: 14px;
}
.rg-stock-chart .rg-stock-area-start {
  stop-color: var(--dsw-alias-state-success-primary, #1d7a4f);
}
.rg-stock-chart .rg-stock-area-end {
  stop-color: var(--dsw-alias-state-success-primary, #1d7a4f);
}
.rg-stock-chart .rg-stock-price-line {
  stroke: var(--dsw-alias-state-success-primary, #1d7a4f);
  stroke-width: 1.45;
}
.rg-stock-chart .rg-stock-price-point {
  fill: var(--dsw-alias-state-success-primary, #1d7a4f);
}
.rg-stock-chart .rg-stock-volume {
  fill: var(--dsw-alias-label-tertiary);
  opacity: .22;
}
.rg-stock-chart .rg-stock-volume[data-direction='up'] {
  fill: var(--dsw-alias-state-success-primary, #1d7a4f);
  opacity: .28;
}
.rg-stock-chart .rg-stock-volume[data-direction='down'] {
  fill: var(--dsw-alias-state-error-primary, #c45a5a);
  opacity: .24;
}
.rg-stock-chart .rg-stock-previous-close {
  stroke: var(--dsw-alias-label-tertiary);
  stroke-width: 1;
  stroke-dasharray: 4 4;
}
.rg-stock-chart .rg-stock-previous-close-bg {
  fill: color-mix(in srgb, var(--dsw-alias-bg-layer-2) 92%, transparent);
}
.rg-stock-chart .rg-stock-previous-close-label {
  fill: var(--dsw-alias-label-secondary);
  font-size: 12px;
  font-variant-numeric: tabular-nums;
}
.rg-stock-chart .rg-chart-tooltip {
  top: 45px;
}
.rg-stock-chart .rg-chart-hint {
  margin: 2px 14px 6px 58px;
  opacity: .8;
}
.rg-stock-chart .rg-chart-source {
  grid-template-columns: auto minmax(0, 1fr);
  align-items: start;
  gap: 8px;
  margin: 0 14px 0 58px;
  padding: 8px 0;
}
.rg-stock-chart .rg-chart-source > span {
  padding-top: 1px;
}
.rg-stock-chart-source-details summary,
.rg-stock-chart .rg-chart-data > summary {
  width: fit-content;
  cursor: pointer;
  color: var(--dsw-alias-label-secondary);
  font-size: 12px;
}
.rg-stock-chart-source-details[open] summary,
.rg-stock-chart .rg-chart-data[open] > summary {
  margin-bottom: 8px;
}
.rg-stock-chart .rg-chart-data {
  margin: 0 14px 6px 58px;
}
@media (max-width: 720px) {
  .rg-stock-chart .rg-chart-frame-head {
    left: 14px;
  }
  .rg-stock-chart .rg-market-chart > svg {
    min-width: 620px;
  }
  .rg-stock-chart .rg-chart-hint,
  .rg-stock-chart .rg-chart-source,
  .rg-stock-chart .rg-chart-data {
    margin-left: 14px;
  }
}
`
