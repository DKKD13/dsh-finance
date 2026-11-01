export const STOCK_DETAIL_STYLE = `
[data-rg-root] .rg-stock-detail-page {
  padding-top: 0;
}
[data-rg-root] .rg-stock-request-error {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  margin-bottom: 16px;
  padding: 16px 18px;
  border: 1px solid var(--dsw-alias-border-l2);
  border-radius: 12px;
  background: var(--dsw-alias-bg-layer-2);
  font-size: 13px;
}
[data-rg-root] .rg-stock-request-error p {
  margin: 5px 0;
  color: var(--dsw-alias-label-secondary);
}
[data-rg-root] .rg-stock-request-error .rg-btn { flex-shrink: 0; }
[data-rg-root] .rg-stock-detail-page .rg-stock-detail-identity {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  min-height: 92px;
  padding: 20px 0 13px;
}
[data-rg-root] .rg-stock-detail-page .rg-stock-detail-identity-main {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
}
[data-rg-root] .rg-stock-detail-page .rg-stock-detail-logo,
[data-rg-root] .rg-stock-detail-page .rg-stock-detail-logo-fallback {
  display: grid;
  flex: 0 0 40px;
  width: 40px;
  height: 40px;
  place-items: center;
  border-radius: 8px;
  object-fit: contain;
}
[data-rg-root] .rg-stock-detail-page .rg-stock-detail-logo-fallback {
  color: var(--dsw-alias-label-primary);
  background: var(--dsw-alias-bg-layer-2);
  font-size: 13px;
  font-weight: 700;
}
[data-rg-root] .rg-stock-detail-page .rg-stock-detail-identity h1 {
  margin: 0;
  color: var(--dsw-alias-label-primary);
  font-size: 24px;
  font-weight: 700;
  line-height: 1.18;
  letter-spacing: 0;
}
[data-rg-root] .rg-stock-detail-page .rg-stock-detail-identity p {
  display: flex;
  align-items: center;
  gap: 5px;
  min-height: 18px;
  margin: 5px 0 0;
  color: var(--dsw-alias-label-secondary);
  font-size: 12px;
}
[data-rg-root] .rg-stock-detail-page .rg-stock-detail-identity p strong {
  color: var(--dsw-alias-label-primary);
  font-weight: 600;
}
[data-rg-root] .rg-stock-detail-page .rg-stock-detail-flag {
  font-size: 11px;
  line-height: 1;
}
[data-rg-root] .rg-stock-detail-page .rg-stock-detail-identity-meta {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
  flex-wrap: wrap;
}
[data-rg-root] .rg-stock-detail-page .rg-stock-detail-preview-badge {
  display: inline-flex;
  align-items: center;
  min-height: 22px;
  padding: 1px 8px;
  border: 1px solid var(--dsw-alias-border-l2);
  border-radius: 999px;
  color: var(--dsw-alias-state-warn-primary);
  font-size: 10px;
  font-weight: 600;
}
[data-rg-root] .rg-stock-detail-page .rg-stock-detail-tabs {
  display: flex;
  align-items: stretch;
  gap: 0;
  overflow-x: auto;
  border-bottom: 1px solid var(--dsw-alias-border-l2);
  scrollbar-width: none;
}
[data-rg-root] .rg-stock-detail-page .rg-stock-detail-tabs::-webkit-scrollbar {
  display: none;
}
[data-rg-root] .rg-stock-detail-page .rg-stock-detail-tabs > button {
  position: relative;
  flex: 0 0 auto;
  min-width: max-content;
  height: 54px;
  padding: 0 14px;
  border: 0;
  border-radius: 0;
  color: var(--dsw-alias-label-secondary);
  background: transparent;
  font-size: 14px;
  white-space: nowrap;
}
[data-rg-root] .rg-stock-detail-page .rg-stock-detail-tabs > button:hover {
  color: var(--dsw-alias-label-primary);
}
[data-rg-root] .rg-stock-detail-page .rg-stock-detail-tabs > button[data-active] {
  color: var(--dsw-alias-label-primary);
  font-weight: 650;
}
[data-rg-root] .rg-stock-detail-page .rg-stock-detail-tabs > button[data-active]::after {
  content: "";
  position: absolute;
  right: 14px;
  bottom: -1px;
  left: 14px;
  height: 2px;
  background: var(--dsw-alias-label-primary);
}
[data-rg-root] .rg-stock-detail-page .rg-stock-detail-overview {
  padding-top: 18px;
}
[data-rg-root] .rg-stock-detail-page .rg-stock-detail-grid {
  display: grid;
  grid-template-columns: minmax(0, 2.72fr) minmax(260px, 1fr);
  gap: 24px;
  align-items: stretch;
}
[data-rg-root] .rg-stock-detail-page .rg-stock-detail-chart-card,
[data-rg-root] .rg-stock-detail-page .rg-stock-detail-facts {
  min-width: 0;
  overflow: hidden;
  border: 1px solid var(--dsw-alias-border-l2);
  border-radius: 8px;
  background: var(--dsw-alias-bg-layer-1);
}
[data-rg-root] .rg-stock-detail-page .rg-stock-detail-quotes {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  border-bottom: 1px solid var(--dsw-alias-border-l2);
}
[data-rg-root] .rg-stock-detail-page .rg-stock-detail-quotes > section {
  min-width: 0;
  padding: 13px 14px 11px;
}
[data-rg-root] .rg-stock-detail-page .rg-stock-detail-quotes > section + section {
  border-left: 1px solid var(--dsw-alias-border-l2);
}
[data-rg-root] .rg-stock-detail-page .rg-stock-detail-quotes > section > span:first-child {
  display: block;
  color: var(--dsw-alias-label-secondary);
  font-size: 11px;
  line-height: 1.3;
}
[data-rg-root] .rg-stock-detail-page .rg-stock-detail-quotes > section > div {
  display: flex;
  align-items: baseline;
  gap: 3px;
  margin-top: 2px;
  white-space: nowrap;
}
[data-rg-root] .rg-stock-detail-page .rg-stock-detail-quotes small {
  color: var(--dsw-alias-label-primary);
  font-size: 16px;
  font-weight: 600;
}
[data-rg-root] .rg-stock-detail-page .rg-stock-detail-quotes strong {
  min-width: 0;
  color: var(--dsw-alias-label-primary);
  font-size: 20px;
  font-weight: 560;
  font-variant-numeric: tabular-nums;
}
[data-rg-root] .rg-stock-detail-page .rg-stock-detail-quotes p {
  margin: 1px 0 0;
  font-size: 13px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}
[data-rg-root] .rg-stock-detail-page [data-direction="positive"] {
  color: var(--dsw-alias-state-success-primary);
}
[data-rg-root] .rg-stock-detail-page [data-direction="negative"] {
  color: var(--dsw-alias-state-error-primary);
}
[data-rg-root] .rg-stock-detail-page .rg-stock-detail-quotes time,
[data-rg-root] .rg-stock-detail-page .rg-stock-detail-after-hours-note {
  display: block;
  margin-top: 2px;
  color: var(--dsw-alias-label-tertiary);
  font-size: 10px;
  line-height: 1.35;
}
[data-rg-root] .rg-stock-detail-page .rg-stock-detail-range-toolbar {
  display: flex;
  align-items: center;
  min-height: 49px;
  padding: 8px 10px;
  border-bottom: 1px solid var(--dsw-alias-border-l1);
}
[data-rg-root] .rg-stock-detail-page .rg-stock-detail-range-toolbar button {
  min-width: 34px;
  height: 30px;
  padding: 0 8px;
  border: 1px solid transparent;
  border-radius: 6px;
  color: var(--dsw-alias-label-secondary);
  background: transparent;
  font-size: 11px;
  font-weight: 600;
}
[data-rg-root] .rg-stock-detail-page .rg-stock-detail-range-toolbar button:hover {
  border-color: var(--dsw-alias-border-l1);
  color: var(--dsw-alias-label-primary);
}
[data-rg-root] .rg-stock-detail-page .rg-stock-detail-range-toolbar button[aria-pressed="true"] {
  color: var(--dsw-alias-label-primary);
  background: var(--dsw-alias-bg-layer-2);
}
[data-rg-root] .rg-stock-detail-page .rg-stock-detail-chart-slot {
  min-width: 0;
  padding: 0 10px;
}
[data-rg-root] .rg-stock-detail-page .rg-stock-detail-chart-slot .rg-chart-frame {
  margin: 0;
  padding: 0;
  border: 0;
  border-radius: 0;
  background: transparent;
}
[data-rg-root] .rg-stock-detail-page .rg-stock-detail-chart-slot .rg-chart-frame-head {
  min-height: 46px;
  margin: 0;
  padding: 7px 2px 0;
}
[data-rg-root] .rg-stock-detail-page .rg-stock-detail-chart-slot .rg-chart-frame-head > div:first-child,
[data-rg-root] .rg-stock-detail-page .rg-stock-detail-chart-slot .rg-chart-meta,
[data-rg-root] .rg-stock-detail-page .rg-stock-detail-chart-slot .rg-chart-legend,
[data-rg-root] .rg-stock-detail-page .rg-stock-detail-chart-slot .rg-chart-hint {
  display: none;
}
[data-rg-root] .rg-stock-detail-page .rg-stock-detail-chart-slot .rg-chart-frame-head > .rg-finance-badge {
  margin-left: auto;
}
[data-rg-root] .rg-stock-detail-page .rg-stock-detail-chart-slot .rg-chart-controls {
  margin-left: auto;
}
[data-rg-root] .rg-stock-detail-page .rg-stock-detail-chart-slot .rg-market-chart {
  overflow: hidden;
  min-width: 0;
}
[data-rg-root] .rg-stock-detail-page .rg-stock-detail-chart-slot .rg-market-chart > svg {
  display: block;
  width: 100%;
  height: auto;
}
[data-rg-root] .rg-stock-detail-page .rg-stock-detail-chart-slot .rg-chart-data,
[data-rg-root] .rg-stock-detail-page .rg-stock-detail-chart-slot .rg-stock-chart-source-details {
  border-top: 1px solid var(--dsw-alias-border-l1);
}
[data-rg-root] .rg-stock-detail-page .rg-stock-detail-chart-empty {
  display: grid;
  min-height: 280px;
  place-content: center;
  gap: 10px;
  color: var(--dsw-alias-label-secondary);
  text-align: center;
}
[data-rg-root] .rg-stock-detail-page .rg-stock-detail-chart-empty p {
  margin: 0;
  font-size: 12px;
}
[data-rg-root] .rg-stock-detail-page .rg-stock-detail-chart-empty button {
  justify-self: center;
  min-height: 32px;
  padding: 0 12px;
  border: 1px solid var(--dsw-alias-border-l2);
  border-radius: 6px;
  color: var(--dsw-alias-label-primary);
  background: var(--dsw-alias-bg-layer-1);
  font-size: 12px;
}
[data-rg-root] .rg-stock-detail-page .rg-stock-detail-metrics {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  margin: 0;
  border-top: 1px solid var(--dsw-alias-border-l2);
}
[data-rg-root] .rg-stock-detail-page .rg-stock-detail-metrics > div {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 10px;
  min-width: 0;
  min-height: 48px;
  padding: 11px 13px;
  align-items: center;
  border-right: 1px solid var(--dsw-alias-border-l1);
  border-bottom: 1px solid var(--dsw-alias-border-l1);
}
[data-rg-root] .rg-stock-detail-page .rg-stock-detail-metrics > div:nth-child(3n) {
  border-right: 0;
}
[data-rg-root] .rg-stock-detail-page .rg-stock-detail-metrics > div:nth-last-child(-n + 3) {
  border-bottom: 0;
}
[data-rg-root] .rg-stock-detail-page .rg-stock-detail-metrics dt {
  min-width: 0;
  color: var(--dsw-alias-label-tertiary);
  font-size: 11px;
}
[data-rg-root] .rg-stock-detail-page .rg-stock-detail-metrics dd {
  min-width: 0;
  margin: 0;
  color: var(--dsw-alias-label-primary);
  font-size: 12px;
  font-variant-numeric: tabular-nums;
  text-align: right;
  overflow-wrap: anywhere;
}
[data-rg-root] .rg-stock-detail-page .rg-stock-detail-facts {
  display: flex;
  min-height: 0;
  flex-direction: column;
  padding: 0 13px 12px;
}
[data-rg-root] .rg-stock-detail-page .rg-stock-detail-facts-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  min-height: 54px;
  border-bottom: 1px solid var(--dsw-alias-border-l2);
}
[data-rg-root] .rg-stock-detail-page .rg-stock-detail-facts-head h2 {
  margin: 0;
  color: var(--dsw-alias-label-primary);
  font-size: 14px;
}
[data-rg-root] .rg-stock-detail-page .rg-stock-detail-fact-actions {
  display: flex;
  align-items: center;
  gap: 6px;
}
[data-rg-root] .rg-stock-detail-page .rg-stock-detail-fact-actions button {
  min-height: 28px;
  padding: 0 8px;
  border: 1px solid var(--dsw-alias-border-l2);
  border-radius: 6px;
  color: var(--dsw-alias-label-primary);
  background: transparent;
  font-size: 10px;
  white-space: nowrap;
}
[data-rg-root] .rg-stock-detail-page .rg-stock-detail-fact-actions button:hover {
  background: var(--dsw-alias-interactive-bg-hover);
}
[data-rg-root] .rg-stock-detail-page .rg-stock-detail-fact-list {
  margin: 0;
}
[data-rg-root] .rg-stock-detail-page .rg-stock-detail-fact-list > div {
  display: grid;
  grid-template-columns: minmax(92px, .9fr) minmax(0, 1.25fr);
  gap: 12px;
  min-height: 36px;
  padding: 8px 0;
  align-items: center;
  border-bottom: 1px solid var(--dsw-alias-border-l1);
}
[data-rg-root] .rg-stock-detail-page .rg-stock-detail-fact-list dt {
  color: var(--dsw-alias-label-secondary);
  font-size: 11px;
}
[data-rg-root] .rg-stock-detail-page .rg-stock-detail-fact-list dd {
  min-width: 0;
  margin: 0;
  color: var(--dsw-alias-label-primary);
  font-size: 11px;
  font-variant-numeric: tabular-nums;
  text-align: right;
  overflow-wrap: anywhere;
}
[data-rg-root] .rg-stock-detail-page .rg-stock-detail-fact-note {
  margin: auto 0 0;
  padding-top: 12px;
  color: var(--dsw-alias-label-secondary);
  font-size: 10.5px;
  line-height: 1.5;
}
[data-rg-root] .rg-stock-detail-page .rg-stock-detail-tab-placeholder {
  display: grid;
  min-height: 330px;
  margin-top: 18px;
  padding: 28px;
  place-content: center;
  border: 1px solid var(--dsw-alias-border-l2);
  border-radius: 8px;
  background: var(--dsw-alias-bg-layer-1);
  text-align: center;
}
[data-rg-root] .rg-stock-detail-page .rg-stock-detail-tab-placeholder > div {
  max-width: 560px;
}
[data-rg-root] .rg-stock-detail-page .rg-stock-detail-tab-kicker {
  color: var(--dsw-alias-label-tertiary);
  font-size: 10px;
  text-transform: uppercase;
}
[data-rg-root] .rg-stock-detail-page .rg-stock-detail-tab-placeholder h2 {
  margin: 7px 0 8px;
  color: var(--dsw-alias-label-primary);
  font-size: 20px;
}
[data-rg-root] .rg-stock-detail-page .rg-stock-detail-tab-placeholder p {
  margin: 0;
  color: var(--dsw-alias-label-secondary);
  font-size: 12px;
  line-height: 1.6;
}
[data-rg-root] .rg-stock-detail-page .rg-stock-detail-advanced {
  margin-top: 22px;
  border-top: 1px solid var(--dsw-alias-border-l2);
}
[data-rg-root] .rg-stock-detail-page .rg-stock-detail-advanced > summary {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
  min-height: 54px;
  color: var(--dsw-alias-label-primary);
  cursor: pointer;
  font-size: 12px;
  list-style: none;
}
[data-rg-root] .rg-stock-detail-page .rg-stock-detail-advanced > summary::-webkit-details-marker {
  display: none;
}
[data-rg-root] .rg-stock-detail-page .rg-stock-detail-advanced > summary::before {
  content: "+";
  flex: 0 0 auto;
  order: 2;
  color: var(--dsw-alias-label-tertiary);
  font-size: 16px;
}
[data-rg-root] .rg-stock-detail-page .rg-stock-detail-advanced[open] > summary::before {
  content: "−";
}
[data-rg-root] .rg-stock-detail-page .rg-stock-detail-advanced > summary small {
  margin-left: auto;
  color: var(--dsw-alias-label-tertiary);
  font-size: 10.5px;
  font-weight: 400;
}
[data-rg-root] .rg-stock-detail-page .rg-stock-detail-advanced-body {
  padding: 4px 0 18px;
}
[data-rg-root] .rg-stock-detail-page .rg-stock-detail-advanced-body .rg-market-layout {
  grid-template-columns: minmax(210px, 248px) minmax(0, 1fr);
}
@media (max-width: 1040px) {
  [data-rg-root] .rg-stock-detail-page .rg-stock-detail-grid {
    grid-template-columns: minmax(0, 1fr);
  }
  [data-rg-root] .rg-stock-detail-page .rg-stock-detail-facts {
    min-height: auto;
  }
  [data-rg-root] .rg-stock-detail-page .rg-stock-detail-fact-list {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 0 20px;
  }
  [data-rg-root] .rg-stock-detail-page .rg-stock-detail-fact-note {
    margin-top: 12px;
  }
}
@media (max-width: 720px) {
  [data-rg-root] .rg-stock-detail-page .rg-stock-detail-identity {
    min-height: 82px;
    padding-top: 14px;
  }
  [data-rg-root] .rg-stock-detail-page .rg-stock-detail-identity h1 {
    font-size: 21px;
  }
  [data-rg-root] .rg-stock-detail-page .rg-stock-detail-tabs > button {
    height: 48px;
    padding: 0 12px;
    font-size: 13px;
  }
  [data-rg-root] .rg-stock-detail-page .rg-stock-detail-grid {
    gap: 14px;
  }
  [data-rg-root] .rg-stock-detail-page .rg-stock-detail-quotes strong {
    font-size: 18px;
  }
  [data-rg-root] .rg-stock-detail-page .rg-stock-detail-metrics {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  [data-rg-root] .rg-stock-detail-page .rg-stock-detail-metrics > div:nth-child(3n) {
    border-right: 1px solid var(--dsw-alias-border-l1);
  }
  [data-rg-root] .rg-stock-detail-page .rg-stock-detail-metrics > div:nth-child(2n) {
    border-right: 0;
  }
  [data-rg-root] .rg-stock-detail-page .rg-stock-detail-metrics > div:nth-last-child(-n + 3) {
    border-bottom: 1px solid var(--dsw-alias-border-l1);
  }
  [data-rg-root] .rg-stock-detail-page .rg-stock-detail-metrics > div:nth-last-child(-n + 2) {
    border-bottom: 0;
  }
  [data-rg-root] .rg-stock-detail-page .rg-stock-detail-fact-list {
    grid-template-columns: minmax(0, 1fr);
  }
  [data-rg-root] .rg-stock-detail-page .rg-stock-detail-facts-head {
    align-items: flex-start;
    flex-direction: column;
    padding: 11px 0;
  }
  [data-rg-root] .rg-stock-detail-page .rg-stock-detail-advanced > summary small {
    display: none;
  }
}
@media (max-width: 430px) {
  [data-rg-root] .rg-stock-detail-page .rg-stock-detail-quotes {
    grid-template-columns: minmax(0, 1fr);
  }
  [data-rg-root] .rg-stock-detail-page .rg-stock-detail-quotes > section + section {
    border-top: 1px solid var(--dsw-alias-border-l2);
    border-left: 0;
  }
  [data-rg-root] .rg-stock-detail-page .rg-stock-detail-range-toolbar {
    overflow-x: auto;
  }
}
`
