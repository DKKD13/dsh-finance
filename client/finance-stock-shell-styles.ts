/** Stock detail uses the reference page's dedicated header and composer. */
export const STOCK_SHELL_STYLE = `
.rg-pf-brand-group { display:flex; gap:10px; align-items:center; min-width:0; }
.rg-pf-brand-group > span { font-size:14px; color:var(--dsw-alias-label-secondary); }
.rg-pf-monogram:has(img) { border-radius:5px; background:transparent; overflow:hidden; }
.rg-pf-monogram img { width:100%; height:100%; object-fit:contain; }
.rg-pf-search { position:relative; }
.rg-pf-search-results { position:absolute; z-index:30; top:calc(100% + 8px); left:0; width:100%; min-width:280px; max-height:430px; overflow:auto; padding:7px; border:1px solid var(--dsw-alias-border-l2); border-radius:10px; background:var(--dsw-alias-bg-layer-1); box-shadow:0 8px 30px #0002; }
.rg-pf-search-results > small { display:block; padding:5px 8px 8px; color:var(--dsw-alias-label-tertiary); font-size:11px; }
[data-rg-root] .rg-pf-search-results > button { display:flex; width:100%; height:auto; padding:10px 8px; gap:10px; justify-content:initial; align-items:center; text-align:left; border-radius:6px; }
.rg-pf-search-results > button:hover, .rg-pf-search-results > button[aria-selected=true] { background:var(--dsw-alias-interactive-bg-hover); }
.rg-pf-search-results > button > span:nth-child(2) { flex:1; min-width:0; }
.rg-pf-search-results > button > span:last-child { text-align:right; font-variant-numeric:tabular-nums; }
.rg-pf-search-results strong { font-size:13px; font-weight:500; }
.rg-pf-search-results small { display:block; color:var(--dsw-alias-label-tertiary); font-size:11px; }
.rg-pf-search-results p { padding:8px; margin:0; font-size:12px; color:var(--dsw-alias-label-secondary); }
.rg-pf-more-data-mode { display:flex; align-items:center; justify-content:space-between; gap:8px; padding:8px 6px 12px; border-bottom:1px solid var(--dsw-alias-border-l2); font-size:12px; }
.rg-pf-more > div:has(.rg-pf-more-data-mode) { min-width:205px; }
[data-rg-root] .rg-pf-more-data-mode select { min-width:0; font-size:12px; padding:4px; }
.rg-finance-workspace[data-asset-page] .rg-pf-header { min-height:56px; padding:10px 24px; }
[data-rg-root] .rg-finance-workspace[data-asset-page] .rg-pf-brand { color:var(--dsw-alias-label-secondary); font-weight:500; text-decoration:underline; text-underline-offset:3px; }
.rg-finance-workspace[data-asset-page] .rg-pf-search { width:min(380px,40%); }
[data-rg-root] .rg-pf-share { display:flex; align-items:center; gap:6px; padding:6px 11px; border:1px solid var(--dsw-alias-border-l2); border-radius:8px; font-size:14px; font-weight:500; }
.rg-finance-workspace[data-asset-page] .rg-pf-assistant { padding:10px 18px 12px; margin:0 24px 14px; border-radius:18px; }
[data-rg-root] .rg-finance-workspace[data-asset-page] .rg-pf-assistant textarea { font-size:15px; }
.rg-finance-workspace[data-asset-page] .rg-pf-composer-actions { min-height:32px; }
.rg-stock-chart-tools { position:relative; background:var(--dsw-alias-bg-base); }
.rg-stock-chart-tools-actions { display:flex; gap:4px; align-items:center; justify-content:flex-end; padding:6px 12px; }
[data-rg-root] .rg-stock-chart-tools-actions > button, .rg-stock-chart-more > summary { display:inline-flex; align-items:center; justify-content:center; min-width:30px; height:30px; padding:0 8px; border:1px solid var(--dsw-alias-border-l2); border-radius:7px; font-size:12px; list-style:none; }
.rg-stock-chart-more > summary::-webkit-details-marker { display:none; }
.rg-stock-chart-tools-actions svg { width:16px; height:16px; fill:none; stroke:currentColor; stroke-width:1.4; }
.rg-stock-chart-more { position:relative; }
.rg-stock-chart-more > div { position:absolute; z-index:12; right:0; top:35px; min-width:170px; padding:8px; border:1px solid var(--dsw-alias-border-l2); border-radius:8px; background:var(--dsw-alias-bg-layer-1); box-shadow:0 5px 20px #0001; }
.rg-stock-chart-more label, .rg-stock-chart-more button { display:flex; align-items:center; gap:8px; padding:8px; width:100%; white-space:nowrap; }
.rg-stock-compare-form { display:flex; align-items:end; flex-wrap:wrap; gap:8px; padding:10px 14px; border-block:1px solid var(--dsw-alias-border-l2); }
.rg-stock-compare-form label { display:flex; flex-direction:column; gap:5px; font-size:12px; }
.rg-stock-tools-error { margin:8px 14px; color:var(--dsw-alias-state-error-primary); }
.rg-stock-chart-tools[data-grid=false] .rg-chart-grid { visibility:hidden; }
.rg-stock-chart-tools[data-volume=false] :is(.rg-stock-volume,.rg-chart-axis-title) { visibility:hidden; }
.rg-stock-chart-tools[data-expanded] { position:fixed; inset:12px; z-index:100; overflow:auto; padding:12px; border:1px solid var(--dsw-alias-border-l2); border-radius:12px; box-shadow:0 0 0 100vmax #0006; }
.rg-stock-chart-tools[data-expanded] .rg-stock-chart-plot > svg { height:min(75vh,800px); }
.rg-stock-comparison { padding:12px; }
.rg-stock-compare-legend { display:flex; gap:15px; align-items:center; }
.rg-stock-compare-legend > span:first-child { color:var(--dsw-alias-state-success-primary); }
.rg-stock-compare-legend > span:nth-child(2) { color:var(--dsw-alias-brand-primary); }
.rg-stock-compare-legend > small { color:var(--dsw-alias-label-tertiary); font-size:11px; margin-left:auto; }
.rg-stock-comparison svg { width:100%; min-height:270px; }
.rg-stock-comparison svg path { stroke-width:1.8; }
.rg-stock-comparison [data-series=primary] { stroke:var(--dsw-alias-state-success-primary); }
.rg-stock-comparison [data-series=other] { stroke:var(--dsw-alias-brand-primary); }
.rg-stock-comparison svg text { fill:var(--dsw-alias-label-tertiary); font-size:11px; }
.rg-stock-comparison > p { font-size:11px; color:var(--dsw-alias-label-tertiary); }
[data-rg-root] .rg-stock-alert-trigger { display:inline-flex; align-items:center; gap:6px; font-size:14px; white-space:nowrap; }
.rg-stock-alert-trigger small { display:inline-grid; place-items:center; border-radius:10px; min-width:17px; background:var(--dsw-alias-bg-layer-2); font-size:11px; }
.rg-stock-alert-notice { position:fixed; z-index:20; right:24px; top:74px; display:flex; align-items:center; gap:10px; max-width:min(600px,90vw); padding:12px 16px; background:var(--dsw-alias-bg-layer-1); border:1px solid var(--dsw-alias-border-l2); border-radius:9px; box-shadow:0 4px 20px #0001; font-size:12px; }
.rg-stock-alert-dialog { width:min(510px,calc(100vw - 32px)); }
.rg-stock-alert-dialog header { align-items:center; }
.rg-stock-alert-dialog header h3 { margin:0; font-size:18px; }
.rg-stock-alert-dialog form { display:flex; flex-direction:column; gap:16px; }
.rg-stock-alert-dialog label { display:flex; flex-direction:column; gap:7px; font-size:13px; }
.rg-stock-alert-kinds { display:flex; gap:5px; background:var(--dsw-alias-bg-layer-2); padding:3px; border-radius:8px; }
[data-rg-root] .rg-stock-alert-kinds button { flex:1; padding:7px; border-radius:6px; }
.rg-stock-alert-kinds button[aria-pressed=true] { background:var(--dsw-alias-bg-base); box-shadow:0 1px 3px #0001; }
.rg-stock-alert-threshold { display:flex; gap:8px; align-items:center; }
.rg-stock-alert-threshold input { min-width:0; flex:1; }
.rg-stock-alert-dialog form > p { margin:0; font-size:12px; color:var(--dsw-alias-label-secondary); }
.rg-stock-alert-saved h4 { font-size:12px; margin:0 0 8px; }
.rg-stock-alert-saved > div { display:flex; justify-content:space-between; padding:7px 0; border-bottom:1px solid var(--dsw-alias-border-l2); }
.rg-stock-alert-dialog footer { display:flex; justify-content:flex-end; gap:8px; }
.rg-stock-date-dialog { width:min(620px,calc(100vw - 28px)); max-height:90vh; overflow:auto; padding:20px; border:1px solid var(--dsw-alias-border-l2); border-radius:12px; background:var(--dsw-alias-bg-base); color:var(--dsw-alias-label-primary); box-shadow:0 12px 50px #0002; }
.rg-stock-date-dialog::backdrop { background:#0004; }
.rg-stock-date-dialog header { display:flex; align-items:center; justify-content:space-between; margin-bottom:18px; }
.rg-stock-date-dialog h3 { margin:0; font-size:16px; }
.rg-stock-date-inputs { display:flex; align-items:end; gap:12px; }
.rg-stock-date-inputs label { display:grid; gap:6px; flex:1; min-width:0; font-size:12px; }
.rg-stock-date-inputs input { min-width:0; width:100%; }
.rg-stock-date-inputs > span { padding-bottom:7px; color:var(--dsw-alias-label-tertiary); }
.rg-stock-calendar-nav { display:flex; justify-content:space-between; margin:18px 0 -32px; position:relative; z-index:1; pointer-events:none; }
[data-rg-root] .rg-stock-calendar-nav button { width:30px; height:30px; border-radius:6px; font-size:24px; pointer-events:auto; }
.rg-stock-calendar-months { display:grid; grid-template-columns:1fr 1fr; gap:22px; }
.rg-stock-calendar-months h4 { text-align:center; font-size:13px; font-weight:500; margin:9px 0 14px; }
.rg-stock-calendar-months table { border-collapse:collapse; width:100%; table-layout:fixed; font-size:12px; text-align:center; }
.rg-stock-calendar-months th { font-size:11px; font-weight:400; color:var(--dsw-alias-label-tertiary); padding-bottom:8px; }
.rg-stock-calendar-months td { padding:1px 0; }
[data-rg-root] .rg-stock-calendar-months td button { display:block; width:100%; height:32px; border-radius:5px; }
.rg-stock-calendar-months td button:hover { background:var(--dsw-alias-interactive-bg-hover); }
.rg-stock-calendar-months td button[aria-pressed=true] { background:var(--dsw-alias-button-primary-fill); color:var(--dsw-alias-label-primary-inverted); }
.rg-stock-calendar-months td button[data-range] { background:var(--dsw-alias-bg-multi-select); }
.rg-stock-calendar-months td button[data-outside] { visibility:hidden; }
.rg-stock-date-dialog footer { display:flex; align-items:center; gap:12px; justify-content:space-between; margin-top:18px; padding-top:14px; border-top:1px solid var(--dsw-alias-border-l2); }
.rg-stock-date-dialog footer > span { font-size:11px; color:var(--dsw-alias-label-tertiary); }
.rg-stock-history { min-width:0; }
.rg-stock-history-toolbar { display:flex; gap:10px; align-items:center; flex-wrap:wrap; padding:6px 0 20px; }
.rg-stock-history-toolbar > div { display:flex; gap:2px; padding:3px; border:1px solid var(--dsw-alias-border-l2); border-radius:8px; }
[data-rg-root] .rg-stock-history-toolbar > div > button { height:30px; padding:0 10px; font-size:12px; border-radius:6px; }
.rg-stock-history-toolbar button[aria-pressed=true] { background:var(--dsw-alias-bg-layer-2); }
.rg-stock-history-options { position:relative; margin-left:auto; }
.rg-stock-history-options > summary { list-style:none; padding:6px 10px; font-size:12px; border:1px solid var(--dsw-alias-border-l2); border-radius:7px; cursor:pointer; }
.rg-stock-history-options > div { position:absolute; z-index:10; right:0; min-width:190px; padding:12px; border:1px solid var(--dsw-alias-border-l2); border-radius:8px; background:var(--dsw-alias-bg-layer-1); box-shadow:0 5px 25px #0001; }
.rg-stock-history-options label { display:flex; justify-content:space-between; align-items:center; gap:10px; padding:6px 0; font-size:12px; white-space:nowrap; }
.rg-stock-history-table { overflow:auto; border:1px solid var(--dsw-alias-border-l2); border-radius:10px; }
.rg-stock-history-table[data-stale] { opacity:.5; }
.rg-stock-history-table table { border-collapse:collapse; width:100%; min-width:560px; font-size:13px; font-variant-numeric:tabular-nums; }
.rg-stock-history-table :is(td,th) { padding:13px 15px; border-bottom:1px solid var(--dsw-alias-border-l1); text-align:right; white-space:nowrap; }
.rg-stock-history-table th { font-weight:450; color:var(--dsw-alias-label-secondary); }
.rg-stock-history-table :is(td,th):first-child { text-align:left; }
.rg-stock-history-table tbody tr:hover { background:var(--dsw-alias-interactive-bg-hover); }
.rg-stock-history-more { display:block; margin:16px auto; }
.rg-stock-history-provenance, .rg-stock-history-dates { margin:15px 0; font-size:11px; color:var(--dsw-alias-label-tertiary); }
@media(max-width:540px) { .rg-stock-calendar-months { grid-template-columns:1fr; gap:15px; } .rg-stock-calendar-months section + section { display:none; } .rg-stock-date-dialog footer > span { display:none; } }
@media(max-width:720px) {
 .rg-finance-workspace[data-asset-page] .rg-pf-header { padding:12px 16px; }
 .rg-finance-workspace[data-asset-page] .rg-pf-search { width:100%; }
 .rg-pf-brand-group { gap:7px; }
 [data-rg-root] .rg-finance-workspace[data-asset-page] .rg-pf-brand { font-size:14px; }
 .rg-finance-workspace[data-asset-page] .rg-pf-assistant { margin:0 10px 10px; padding:9px 12px; border-radius:14px; }
}

/* A single compact toolbar follows the observed Finance stock chart. */
[data-rg-root] .rg-stock-detail-page .rg-stock-detail-chart-card { overflow:visible; }
[data-rg-root] .rg-stock-chart { overflow:visible; }
[data-rg-root] .rg-stock-chart .rg-chart-frame-head { position:relative; inset:auto; display:block; min-height:48px; padding:8px 9px; border-bottom:1px solid var(--dsw-alias-border-l1); }
[data-rg-root] .rg-stock-chart .rg-chart-controls { position:static; width:100%; }
[data-rg-root] .rg-stock-unified-toolbar { display:flex; align-items:center; flex-wrap:wrap; gap:5px; min-width:0; }
[data-rg-root] .rg-stock-detail-page .rg-stock-detail-range-toolbar { min-height:31px; padding:2px; border:1px solid var(--dsw-alias-border-l1); border-radius:7px; background:var(--dsw-alias-bg-layer-2); }
[data-rg-root] .rg-stock-detail-page .rg-stock-detail-range-toolbar button { min-width:28px; padding:0 7px; height:27px; font-size:11px; }
[data-rg-root] .rg-stock-chart-controls { flex:none; min-height:31px; }
[data-rg-root] .rg-stock-chart-tools-actions { display:flex; flex:none; align-items:center; gap:5px; padding:0; border:0; }
[data-rg-root] .rg-stock-chart .rg-chart-canvas { border-radius:0; }
[data-rg-root] .rg-stock-chart-tools { background:var(--dsw-alias-bg-layer-1); }
[data-rg-root] .rg-stock-compare-form { position:absolute; z-index:12; top:48px; left:10px; width:min(380px,calc(100% - 20px)); padding:16px; border:1px solid var(--dsw-alias-border-l2); border-radius:10px; background:var(--dsw-alias-bg-layer-1); box-shadow:0 14px 36px #0002; }
[data-rg-root] .rg-stock-detail-page .rg-stock-detail-quotes > section { display:grid; grid-template-columns:max-content 1fr; align-items:baseline; column-gap:8px; padding:12px 15px 10px; }
[data-rg-root] .rg-stock-detail-page .rg-stock-detail-quotes > section > span:first-child { display:none; }
[data-rg-root] .rg-stock-detail-page .rg-stock-detail-quotes > section > div { margin:0; }
[data-rg-root] .rg-stock-detail-page .rg-stock-detail-quotes > section > p { margin:0; font-size:16px; font-weight:500; }
[data-rg-root] .rg-stock-detail-page .rg-stock-detail-quotes > section > time,
[data-rg-root] .rg-stock-detail-page .rg-stock-detail-after-hours-note { grid-column:1 / -1; font-size:11px; }
[data-rg-root] .rg-stock-detail-page .rg-stock-detail-identity-meta > button { display:flex; align-items:center; gap:6px; padding:7px 9px; border-radius:6px; font-size:13px; }
@media (max-width:1100px) { [data-rg-root] .rg-stock-detail-page .rg-stock-detail-quotes > section > p { font-size:13px; } }
@media (max-width:600px) {
 [data-rg-root] .rg-stock-detail-page .rg-stock-detail-quotes > section { display:block; padding:10px; }
 [data-rg-root] .rg-stock-unified-toolbar { gap:4px; }
 [data-rg-root] .rg-stock-detail-page .rg-stock-detail-range-toolbar { flex-basis:100%; justify-content:space-between; }
 [data-rg-root] .rg-stock-chart .rg-chart-frame-head { padding:7px; }
 [data-rg-root] .rg-stock-compare-form { top:84px; }
}

[data-rg-root] .rg-stock-detail-page [hidden] { display:none !important; }
[data-rg-root] .rg-stock-detail-page .rg-stock-detail-identity-main { min-height:0; padding:0; }
[data-rg-root] .rg-stock-detail-page .rg-stock-detail-identity-main > div { display:block; min-width:0; }
[data-rg-root] .rg-stock-detail-page .rg-stock-detail-identity { min-height:100px; }
[data-rg-root] .rg-stock-detail-page .rg-stock-detail-logo[data-monochrome] { filter:brightness(0); }
body[data-ds-dark-theme] [data-rg-root] .rg-stock-detail-page .rg-stock-detail-logo[data-monochrome], body[data-ds-dark-theme] [data-rg-root] .rg-pf-monogram img[data-monochrome] { filter:brightness(0) invert(1); }
[data-rg-root] .rg-stock-detail-page .rg-stock-detail-chart-slot { padding:0; }
[data-rg-root] .rg-stock-detail-page .rg-stock-detail-chart-slot .rg-chart-controls { margin:0; }

[data-rg-root] .rg-pf-monogram img[data-monochrome] { filter:brightness(0); }

[data-rg-root] .rg-stock-detail-page .rg-stock-detail-identity p strong { font-size:12px; font-weight:500; }
[data-rg-root] .rg-stock-detail-page .rg-stock-detail-quotes > section > div { gap:0; }

[data-rg-root] .rg-stock-share-dialog > input { display:block; width:100%; padding:10px; margin:18px 0; font-size:12px; }
[data-rg-root] .rg-stock-share-dialog footer > span { font-size:12px; color:var(--dsw-alias-label-secondary); }
`
