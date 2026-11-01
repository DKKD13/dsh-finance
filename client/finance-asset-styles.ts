export const ASSET_STYLE = `
[data-rg-root] .rg-market-panel-head {
  margin-bottom: 4px;
}
[data-rg-root] .rg-market-panel-head h2 {
  font-size: 14px;
  color: var(--dsw-alias-label-secondary);
}
[data-rg-root] .rg-market-panel-head p {
  max-width: 82ch;
  font-size: 12px;
}
[data-rg-root] .rg-market-quote {
  margin: 0;
  border-top: 0;
  border-bottom: 1px solid var(--dsw-alias-border-l2);
}
[data-rg-root] .rg-market-quote-head {
  min-height: 88px;
  padding: 18px 0 16px;
  align-items: center;
  gap: 16px 28px;
}
[data-rg-root] .rg-market-asset-identity {
  display: flex;
  align-items: center;
  min-width: 0;
  gap: 12px;
}
[data-rg-root] .rg-market-asset-identity > div {
  min-width: 0;
}
[data-rg-root] .rg-market-symbol-mark {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 42px;
  height: 42px;
  flex: none;
  border: 1px solid var(--dsw-alias-border-l2);
  border-radius: 8px;
  background: var(--dsw-alias-bg-layer-2);
  color: var(--dsw-alias-label-primary);
  font-family: var(--ds-font-family-code, monospace);
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0;
}
[data-rg-root] .rg-market-asset-identity h1 {
  margin: 0;
  color: var(--dsw-alias-label-primary);
  font-size: 20px;
  font-weight: 650;
  line-height: 1.25;
  overflow-wrap: anywhere;
}
[data-rg-root] .rg-market-asset-identity p {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 5px;
  margin: 4px 0 0;
  color: var(--dsw-alias-label-tertiary);
  font-size: 12px;
}
[data-rg-root] .rg-market-asset-identity p strong {
  color: var(--dsw-alias-label-secondary);
  font-family: var(--ds-font-family-code, monospace);
  font-size: 12px;
  font-weight: 500;
}
[data-rg-root] .rg-market-price-block {
  display: flex;
  align-items: flex-end;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
  text-align: right;
}
[data-rg-root] .rg-market-price-block > div {
  display: flex;
  align-items: baseline;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 4px 7px;
}
[data-rg-root] .rg-market-price-block b {
  color: var(--dsw-alias-label-primary);
  font-size: 28px;
  font-weight: 600;
  line-height: 1;
  font-variant-numeric: tabular-nums;
}
[data-rg-root] .rg-market-price-currency,
[data-rg-root] .rg-market-price-block time {
  color: var(--dsw-alias-label-tertiary);
  font-family: var(--ds-font-family-code, monospace);
  font-size: 12px;
}
[data-rg-root] .rg-market-price-block p {
  margin: 2px 0 0;
  font-size: 13px;
  font-weight: 500;
  font-variant-numeric: tabular-nums;
}
[data-rg-root] .rg-market-price-block p[data-direction='positive'] {
  color: var(--dsw-alias-state-success-primary);
}
[data-rg-root] .rg-market-price-block p[data-direction='negative'] {
  color: var(--dsw-alias-state-error-primary);
}
[data-rg-root] .rg-market-quote[data-stale] {
  border-bottom-color: var(--dsw-alias-state-warn-primary);
}
[data-rg-root] .rg-market-quote-empty .rg-market-quote-head {
  opacity: .78;
}
[data-rg-root] .rg-market-section-tabs {
  display: flex;
  width: 100%;
  margin: 0;
  gap: 22px;
  overflow-x: auto;
  border-bottom: 1px solid var(--dsw-alias-border-l2);
  scrollbar-width: thin;
}
[data-rg-root] .rg-market-section-tabs .rg-tab {
  position: relative;
  flex: none;
  min-height: 42px;
  padding: 0;
  border: 0;
  border-radius: 0;
  color: var(--dsw-alias-label-secondary);
  background: transparent;
  font-size: 12px;
  white-space: nowrap;
}
[data-rg-root] .rg-market-section-tabs .rg-tab:hover {
  color: var(--dsw-alias-label-primary);
}
[data-rg-root] .rg-market-section-tabs .rg-tab[data-active] {
  color: var(--dsw-alias-label-primary);
  font-weight: 600;
}
[data-rg-root] .rg-market-section-tabs .rg-tab[data-active]::after {
  content: '';
  position: absolute;
  right: 0;
  bottom: -1px;
  left: 0;
  height: 2px;
  background: var(--dsw-alias-label-primary);
}
[data-rg-root] .rg-market-layout {
  grid-template-columns: minmax(196px, 228px) minmax(0, 1fr);
  gap: 22px;
}
[data-rg-root] .rg-market-watchlist {
  padding-top: 16px;
}
[data-rg-root] .rg-market-main {
  min-width: 0;
}
[data-rg-root] .rg-market-section {
  scroll-margin-top: 12px;
}
[data-rg-root] .rg-market-main > .rg-market-section:first-child,
[data-rg-root] .rg-market-main > .rg-market-section:nth-child(2) {
  border-top: 0;
}
[data-rg-root] .rg-market-overview-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(190px, 220px);
  gap: 24px;
  align-items: stretch;
}
[data-rg-root] .rg-market-query-pane {
  min-width: 0;
  padding: 2px 0 8px;
}
[data-rg-root] .rg-market-section-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
  color: var(--dsw-alias-label-primary);
  font-size: 14px;
  font-weight: 600;
}
[data-rg-root] .rg-market-section-heading code {
  color: var(--dsw-alias-label-tertiary);
  font-size: 12px;
  font-weight: 400;
}
[data-rg-root] .rg-market-query-pane .rg-finance-operation {
  margin-bottom: 0;
}
[data-rg-root] .rg-market-facts {
  min-width: 0;
  padding: 2px 0 8px 22px;
  border-left: 1px solid var(--dsw-alias-border-l1);
}
[data-rg-root] .rg-market-facts h3 {
  margin-bottom: 12px;
  color: var(--dsw-alias-label-primary);
  font-size: 14px;
}
[data-rg-root] .rg-market-facts dl {
  margin: 0;
}
[data-rg-root] .rg-market-facts dl > div {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 12px;
  padding: 8px 0;
  border-top: 1px solid var(--dsw-alias-border-l1);
}
[data-rg-root] .rg-market-facts dl > div:first-child {
  border-top: 0;
}
[data-rg-root] .rg-market-facts dt {
  color: var(--dsw-alias-label-tertiary);
  font-size: 12px;
}
[data-rg-root] .rg-market-facts dd {
  margin: 0;
  color: var(--dsw-alias-label-primary);
  font-size: 12px;
  font-variant-numeric: tabular-nums;
  text-align: right;
  overflow-wrap: anywhere;
}
[data-rg-root] .rg-market-history-form {
  gap: 8px;
}
[data-rg-root] .rg-market-history-toolbar {
  grid-template-columns: minmax(116px, 1fr) minmax(104px, .8fr) minmax(92px, .7fr) minmax(84px, .6fr) auto;
  align-items: end;
}
[data-rg-root] .rg-market-history-toolbar .rg-btn {
  min-height: 31px;
  align-self: end;
  white-space: nowrap;
}
[data-rg-root] .rg-market-main .rg-chart-frame {
  margin-top: 10px;
}
[data-rg-root] .rg-market-main .rg-chart-frame-head {
  margin-bottom: 7px;
}
[data-rg-root] .rg-market-accordion {
  scroll-margin-top: 12px;
}
@media (max-width: 900px) {
  [data-rg-root] .rg-market-layout {
    grid-template-columns: minmax(180px, .32fr) minmax(0, .68fr);
    gap: 16px;
  }
  [data-rg-root] .rg-market-overview-grid {
    grid-template-columns: minmax(0, 1fr);
    gap: 12px;
  }
  [data-rg-root] .rg-market-facts {
    padding: 12px 0 0;
    border-top: 1px solid var(--dsw-alias-border-l1);
    border-left: 0;
  }
  [data-rg-root] .rg-market-facts dl {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 0 18px;
  }
  [data-rg-root] .rg-market-history-toolbar {
    grid-template-columns: repeat(3, minmax(110px, 1fr));
  }
  [data-rg-root] .rg-market-history-toolbar .rg-btn {
    min-height: 40px;
  }
}
@media (max-width: 720px) {
  [data-rg-root] .rg-market-layout {
    grid-template-columns: minmax(0, 1fr);
  }
  [data-rg-root] .rg-market-watchlist {
    padding-top: 8px;
  }
  [data-rg-root] .rg-market-section-tabs {
    gap: 18px;
  }
  [data-rg-root] .rg-market-quote-head {
    min-height: 0;
    align-items: flex-start;
    flex-direction: column;
  }
  [data-rg-root] .rg-market-price-block {
    align-items: flex-start;
    width: 100%;
    padding-left: 54px;
    text-align: left;
  }
  [data-rg-root] .rg-market-price-block > div {
    justify-content: flex-start;
  }
  [data-rg-root] .rg-market-price-block b {
    font-size: 25px;
  }
  [data-rg-root] .rg-market-history-toolbar {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  [data-rg-root] .rg-market-history-toolbar .rg-btn {
    grid-column: 1 / -1;
    width: 100%;
  }
}
@media (max-width: 480px) {
  [data-rg-root] .rg-market-asset-identity {
    align-items: flex-start;
  }
  [data-rg-root] .rg-market-asset-identity h1 {
    font-size: 18px;
  }
  [data-rg-root] .rg-market-facts dl {
    grid-template-columns: minmax(0, 1fr);
  }
  [data-rg-root] .rg-market-history-toolbar {
    grid-template-columns: minmax(0, 1fr);
  }
}
`
