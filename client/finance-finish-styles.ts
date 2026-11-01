/** Shared finish applied after individual panels, using live reference measurements. */
export const FINANCE_FINISH_STYLE = `
[data-rg-root] .rg-finance-workspace .rg-btn { padding:7px 12px; border:1px solid var(--dsw-alias-border-l2); border-radius:7px; background:var(--dsw-alias-bg-layer-1); color:var(--dsw-alias-label-secondary); font-size:12px; }
[data-rg-root] .rg-finance-workspace .rg-btn[data-primary] { background:var(--dsw-alias-button-primary-fill); color:var(--dsw-alias-label-primary-inverted); border-color:transparent; }
[data-rg-root] .rg-finance-workspace .rg-btn:hover:not(:disabled) { background:var(--dsw-alias-interactive-bg-hover); color:var(--dsw-alias-label-primary); }
[data-rg-root] .rg-finance-workspace .rg-btn[data-primary]:hover:not(:disabled) { background:var(--dsw-alias-button-primary-hover); color:var(--dsw-alias-label-primary-inverted); }
.rg-portfolio-meta { display:grid; grid-template-columns:2fr .7fr 1.3fr 1.3fr; gap:16px; }
.rg-portfolio-entry-table { min-width:610px; margin-top:12px; }
[data-rg-root] .rg-portfolio-entry-table input { width:100%; min-width:80px; font-size:13px; }
.rg-portfolio-advanced { margin-top:26px; padding:18px 0; border-top:1px solid var(--dsw-alias-border-l1); }
.rg-portfolio-advanced summary { cursor:pointer; color:var(--dsw-alias-label-secondary); font-size:12px; }
.rg-portfolio-advanced > form { margin-top:16px; }
.rg-finance-workspace { --rg-finance-up:color-mix(in srgb,var(--dsw-alias-state-success-primary) 62%,var(--dsw-alias-label-primary)); --rg-finance-down:color-mix(in srgb,var(--dsw-alias-state-error-primary) 68%,var(--dsw-alias-label-primary)); }
.rg-discovery [data-up=true] { color:var(--rg-finance-up); }
.rg-discovery [data-up=false] { color:var(--rg-finance-down); }
.rg-discovery-tickers .rg-discovery-spark { color:var(--rg-finance-up); }
.rg-discovery-tickers .rg-discovery-spark[data-trend=down] { color:var(--rg-finance-down); }
.rg-discovery-summary { border:0; padding:30px 0 0; }
.rg-discovery-summary h3 { display:flex; align-items:center; justify-content:space-between; font-size:14px; font-weight:500; }
.rg-discovery-summary h3 small { font-size:11px; font-weight:400; color:var(--dsw-alias-label-tertiary); }
.rg-market-briefs,.rg-market-summary-empty { border:1px solid var(--dsw-alias-border-l2); border-radius:12px; overflow:hidden; }
.rg-market-briefs details + details { border-top:1px solid var(--dsw-alias-border-l1); }
.rg-market-briefs summary { display:flex; justify-content:space-between; align-items:center; gap:18px; padding:13px 16px; list-style:none; font-size:14px; font-weight:450; color:var(--dsw-alias-label-primary); }
.rg-market-briefs summary::-webkit-details-marker { display:none; }
.rg-market-briefs details[open] summary { padding-bottom:8px; }
.rg-market-briefs details[open] summary svg { transform:rotate(180deg); }
.rg-discovery-summary .rg-market-briefs p { margin:0; padding:0 16px 8px; font-size:14px; line-height:1.6; }
[data-rg-root] .rg-market-briefs details > button { margin:0 16px 14px; padding:0; font-size:11px; color:var(--dsw-alias-label-secondary); }
.rg-market-summary-empty { padding:16px; }
.rg-market-summary-empty button { font-size:12px; color:var(--dsw-alias-state-business-primary); }
.rg-event-table { min-width:660px; font-variant-numeric:tabular-nums; }
[data-rg-root] .dsh-events-day { border:1px solid var(--dsw-alias-border-l2); border-radius:10px; padding:12px 8px; text-align:center; background:var(--dsw-alias-bg-layer-1); }
[data-rg-root] .dsh-events-day[data-active] { background:var(--dsw-alias-bg-layer-3); border-color:var(--dsw-alias-border-l3); }
[data-rg-root] .dsh-events-week-nav .dsh-events-button { min-height:32px; border:1px solid var(--dsw-alias-border-l2); border-radius:7px; }
[data-rg-root] .dsh-events-week-nav .dsh-events-button:nth-child(2) { width:auto; min-width:76px; padding:0 10px; white-space:nowrap; }
[data-rg-root] .rg-screen-submit { padding:10px 18px; border-radius:8px; background:var(--dsw-alias-brand-primary); color:var(--dsw-alias-label-primary-inverted); font-size:12px; }
[data-rg-root] .rg-screen-submit:disabled { opacity:.4; }
[data-rg-root] .rg-contract-card { padding:20px; border:1px solid var(--dsw-alias-border-l2); border-radius:12px; text-align:left; }
[data-rg-root] .rg-screen-preset { padding:20px 8px; text-align:left; }
[data-rg-root] .rg-screen-button { padding:8px 12px; border:1px solid var(--dsw-alias-border-l2); border-radius:7px; }
[data-rg-root] .rg-catalog-task { padding:10px 0; text-align:left; }
[data-rg-root] .dsh-events-chip { padding:7px 12px; border:1px solid var(--dsw-alias-border-l2); border-radius:7px; }
[data-rg-root] .dsh-events-chip[data-active] { background:var(--dsw-alias-bg-layer-3); }
.rg-pf-aside-price { font-size:12px; font-variant-numeric:tabular-nums; text-align:right; }
.rg-pf-aside-price small { font-size:10px; }
.rg-pf-body[data-with-aside] { grid-template-columns:minmax(0,1fr) 320px; }
.rg-pf-watch-preview { border:1px solid var(--dsw-alias-border-l2); border-radius:12px; padding:6px 12px; }
[data-rg-root] .rg-pf-aside-asset { padding:12px 0; }
.rg-pf-monogram { background:color-mix(in srgb,var(--dsw-alias-label-primary) 7%,var(--dsw-alias-bg-base)); }
.rg-catalog-config.rg-catalog-modal { width:min(640px,calc(100vw - 32px)); max-height:85vh; overflow:auto; padding:24px; border:1px solid var(--dsw-alias-border-l2); border-radius:14px; background:var(--dsw-alias-bg-base); color:var(--dsw-alias-label-primary); box-shadow:0 24px 80px rgba(0,0,0,.18); }
.rg-catalog-modal::backdrop { background:rgba(0,0,0,.25); }
.rg-event-table td { vertical-align:middle; }
.rg-event-company { display:flex; gap:12px; align-items:center; text-align:left; }
.rg-event-company strong { display:block; font-size:13px; font-weight:550; }
.rg-event-company small,.rg-event-sub { display:block; font-size:11px; color:var(--dsw-alias-label-tertiary); margin-top:5px; }
.rg-event-detail { padding:24px 0; margin-top:22px; border-top:1px solid var(--dsw-alias-border-l2); }
.rg-event-detail h3 { font-size:17px; font-weight:550; }
.rg-event-detail p { font-size:12px; line-height:1.8; }
.rg-event-actions { display:flex; gap:10px; flex-wrap:wrap; margin-top:16px; }
.rg-event-empty { text-align:center; padding:60px 20px; font-size:13px; color:var(--dsw-alias-label-secondary); }
.rg-contract-grid { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:18px; margin-top:22px; }
.rg-contract-card { min-width:0; text-align:left; padding:20px; border:1px solid var(--dsw-alias-border-l2); border-radius:12px; }
.rg-contract-card:hover { background:var(--dsw-alias-interactive-bg-hover); }
.rg-contract-card[aria-expanded=true] { border-color:var(--dsw-alias-state-business-primary); }
.rg-contract-card > small { font-size:10px; color:var(--dsw-alias-label-tertiary); }
.rg-contract-card h3 { font-size:15px; font-weight:550; line-height:1.6; margin:10px 0 18px; }
.rg-contract-outcome { display:flex; align-items:center; justify-content:space-between; gap:14px; margin:8px 0; font-size:13px; }
.rg-contract-outcome strong { font-size:24px; font-weight:500; }
.rg-contract-bar { height:5px; background:var(--dsw-alias-bg-layer-3); border-radius:3px; overflow:hidden; }
.rg-contract-bar i { display:block; height:100%; background:var(--dsw-alias-state-business-primary); }
.rg-contract-card footer { display:flex; justify-content:space-between; gap:12px; padding-top:18px; margin-top:18px; border-top:1px solid var(--dsw-alias-border-l1); color:var(--dsw-alias-label-tertiary); font-size:10px; }
.rg-contract-history { margin:24px 0 0; color:var(--dsw-alias-state-business-primary); }
.rg-contract-history figcaption { font-size:11px; color:var(--dsw-alias-label-secondary); }
.rg-contract-history svg { display:block; width:100%; max-height:210px; margin-top:10px; }
.rg-politics-table { min-width:820px; }
.rg-screen-company { text-align:left; }
.rg-screen-company strong,.rg-screen-company span { display:block; }
.rg-screen-company span { margin-top:5px; color:var(--dsw-alias-label-tertiary); font-size:11px; }
.rg-screen-preset > span:last-child > span { display:block; margin-top:5px; color:var(--dsw-alias-label-secondary); font-size:12px; line-height:1.6; }
.rg-screen,.dsh-events { padding:24px 30px 44px; }
.rg-screen h2,.dsh-events h2,.rg-discovery h2 { font-size:16px; font-weight:550; line-height:1.5; }
.rg-screen-ask { margin:24px 0 28px; }
.rg-screen-ask textarea { font-size:14px; }
.rg-screen-presets { margin:18px 0 28px; }
.rg-screen-preset { padding:20px 8px; }
.rg-screen-preset strong { font-size:14px; font-weight:550; }
.rg-finance-catalog { padding-top:0; }
.rg-finance-apps.rg-pf-panel { padding:24px 30px 44px; }
.rg-discovery-tickers { border:0; gap:8px; overflow-x:auto; overflow-y:hidden; }
.rg-discovery-tickers > button { border:1px solid var(--dsw-alias-border-l2); border-radius:10px; }
.rg-discovery-tickers > button:last-child { border:1px solid var(--dsw-alias-border-l2); }
.dsh-events-day-strip { grid-template-columns:repeat(7,minmax(0,1fr)); gap:8px; }
.dsh-events-day { border-radius:10px; padding:12px 8px; min-height:94px; }
.dsh-events-day small { font-size:11px; }
.dsh-events-day strong { font-size:16px; font-weight:500; }
.dsh-events-day span { font-size:10px; }
.dsh-events-controls { gap:10px; margin:16px 0; }
[data-rg-root] .dsh-events-controls input,[data-rg-root] .dsh-events-controls select { font-size:12px; max-width:100%; min-width:0; }
.dsh-events-chip { font-size:12px; }
.rg-report-markdown { grid-column:2; grid-row:1; }
.rg-report-outline { grid-column:1; grid-row:1; }
@media(max-width:720px) {
 .rg-report-markdown { grid-column:1; grid-row:1; }
 .rg-report-outline { grid-column:1; grid-row:2; }
 .rg-portfolio-meta { grid-template-columns:repeat(2,minmax(0,1fr)); gap:12px; }
 .rg-screen,.dsh-events,.rg-finance-apps.rg-pf-panel { padding:22px 16px 32px; }
 .rg-contract-grid { grid-template-columns:minmax(0,1fr); }
 .dsh-events-day-strip { display:flex; overflow-x:auto; }
 .dsh-events-day { flex:0 0 88px; }
 .rg-screen-filterbar { grid-template-columns:repeat(2,minmax(0,1fr)); }
 .rg-screen-filterbar input,.rg-screen-filterbar select { width:100%; min-width:0; }
}
`
