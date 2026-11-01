export const DISCOVERY_STYLE = `
[data-rg-root] .rg-discovery-heading,[data-rg-root] .rg-discovery-section-head { display:flex; align-items:center; gap:16px; justify-content:space-between; }
[data-rg-root] .rg-discovery-heading { min-height:34px; }
[data-rg-root] .rg-discovery-heading h2 { margin:0; }
[data-rg-root] .rg-discovery-source { font-size:11px; line-height:1.5; color:var(--dsw-alias-label-tertiary); margin:8px 0 16px; overflow-wrap:anywhere; }
[data-rg-root] .rg-discovery-source summary { width:fit-content; cursor:pointer; }
[data-rg-root] .rg-discovery-source p { max-width:72ch; margin:8px 0; }
[data-rg-root] .rg-discovery-source ul { margin:6px 0; padding-left:18px; }
.rg-discovery-tickers { display:grid; grid-auto-flow:column; grid-auto-columns:minmax(156px,1fr); gap:10px; min-width:0; max-width:100%; overflow-x:auto; }
[data-rg-root] .rg-discovery .rg-discovery-tickers > button { position:relative; display:grid; grid-template-columns:minmax(0,1fr) auto; grid-template-rows:auto auto 32px; gap:7px 5px; min-width:0; min-height:120px; padding:12px 12px 0; text-align:left; overflow:hidden; border:1px solid var(--dsw-alias-border-l2); border-radius:10px; background:var(--dsw-alias-bg-base); }
[data-rg-root] .rg-discovery .rg-discovery-tickers > button:hover { background:var(--dsw-alias-interactive-bg-hover); }
[data-rg-root] .rg-discovery .rg-discovery-ticker-identity { display:flex; min-width:0; align-items:center; gap:7px; grid-column:1; grid-row:1; }
[data-rg-root] .rg-discovery .rg-discovery-ticker-identity > span:last-child { min-width:0; }
[data-rg-root] .rg-discovery .rg-discovery-ticker-identity strong { display:block; min-width:0; margin:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; font-size:12px; font-weight:550; }
[data-rg-root] .rg-discovery .rg-discovery-ticker-identity small { display:block; margin-top:3px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; color:var(--dsw-alias-label-tertiary); font-size:10px; }
[data-rg-root] .rg-discovery .rg-discovery-ticker-identity .rg-pf-monogram { width:26px; height:26px; flex:0 0 26px; }
[data-rg-root] .rg-discovery .rg-discovery-ticker-identity img { width:26px; height:26px; object-fit:contain; }
[data-rg-root] .rg-discovery .rg-discovery-ticker-price { grid-column:1 / -1; grid-row:2; min-width:0; color:var(--dsw-alias-label-primary); font-size:18px; line-height:1.2; font-weight:550; font-variant-numeric:tabular-nums; overflow-wrap:anywhere; }
[data-rg-root] .rg-discovery .rg-discovery-ticker-price small { font-size:10px; color:var(--dsw-alias-label-tertiary); margin-left:5px; font-weight:400; }
[data-rg-root] .rg-discovery .rg-discovery-ticker-change { grid-column:2; grid-row:1; align-self:start; padding-top:2px; white-space:nowrap; font-size:11px; font-variant-numeric:tabular-nums; }
[data-rg-root] .rg-discovery .rg-discovery-spark { width:calc(100% + 24px); height:32px; grid-column:1 / -1; grid-row:3; margin:0 -12px; color:var(--rg-finance-up,var(--dsw-alias-state-success-primary)); }
[data-rg-root] .rg-discovery .rg-discovery-spark[data-trend=down] { color:var(--rg-finance-down,var(--dsw-alias-state-error-primary)); }
[data-rg-root] .rg-discovery .rg-discovery-no-series { grid-column:1 / -1; grid-row:3; align-self:center; font-size:10px; color:var(--dsw-alias-label-tertiary); }
[data-rg-root] .rg-discovery .rg-discovery-price-evidence { display:block; margin-top:3px; color:var(--dsw-alias-label-tertiary); font-size:10px; line-height:1.5; overflow-wrap:anywhere; }
[data-rg-root] .rg-discovery .rg-discovery-price-evidence summary { cursor:pointer; white-space:nowrap; }
[data-rg-root] .rg-discovery .rg-discovery-price-evidence > span { display:block; max-width:24ch; white-space:normal; text-align:left; }
[data-rg-root] .rg-discovery .rg-discovery-watch-records { max-width:160px; text-align:left; font-size:11px; }
[data-rg-root] .rg-discovery .rg-discovery-watch-records button { display:block; padding:5px 0; }
.rg-discovery [data-up=true] { color:var(--dsw-static-green-700,var(--dsw-alias-state-success-primary)); }
.rg-discovery [data-up=false] { color:var(--dsw-alias-state-error-primary); }
[data-rg-root] .rg-discovery .rg-discovery-summary { padding:24px 0 0; border-bottom:1px solid var(--dsw-alias-border-l1); }
[data-rg-root] .rg-discovery .rg-discovery-summary-head { display:flex; align-items:center; justify-content:space-between; gap:16px; min-height:28px; margin-bottom:12px; }
[data-rg-root] .rg-discovery .rg-discovery-summary-head h3 { margin:0; font-size:14px; font-weight:550; }
[data-rg-root] .rg-discovery .rg-discovery-summary-head small { color:var(--dsw-alias-label-tertiary); font-size:10.5px; font-weight:400; }
[data-rg-root] .rg-discovery .rg-discovery-demo-badge { display:inline-flex; min-height:21px; padding:1px 7px; align-items:center; border:1px solid color-mix(in srgb,var(--dsw-alias-state-warn-primary) 35%,var(--dsw-alias-border-l2)); border-radius:999px; color:var(--dsw-alias-state-warn-primary); background:color-mix(in srgb,var(--dsw-alias-state-warn-primary) 7%,var(--dsw-alias-bg-base)); font-size:10px; font-weight:550; }
[data-rg-root] .rg-discovery .rg-market-briefs { border-radius:10px; background:var(--dsw-alias-bg-layer-1); }
[data-rg-root] .rg-discovery .rg-market-briefs details + details { border-top:1px solid var(--dsw-alias-border-l1); }
[data-rg-root] .rg-discovery .rg-market-briefs summary { min-height:51px; padding:13px 16px; color:var(--dsw-alias-label-primary); cursor:pointer; font-size:14px; font-weight:450; list-style:none; }
[data-rg-root] .rg-discovery .rg-market-briefs summary::-webkit-details-marker { display:none; }
[data-rg-root] .rg-discovery .rg-market-briefs summary svg { flex:0 0 auto; transition:transform 150ms ease; }
[data-rg-root] .rg-discovery .rg-market-briefs details[open] summary svg { transform:rotate(180deg); }
[data-rg-root] .rg-discovery .rg-market-briefs details > p { max-width:78ch; margin:0; padding:0 16px 10px; color:var(--dsw-alias-label-secondary); font-size:14px; line-height:1.55; }
[data-rg-root] .rg-discovery .rg-market-briefs > details > .rg-market-extract { white-space:pre-line; overflow-wrap:anywhere; }
[data-rg-root] .rg-discovery .rg-market-citations { margin:0 16px 12px; color:var(--dsw-alias-label-tertiary); font-size:11px; overflow-wrap:anywhere; }
[data-rg-root] .rg-discovery .rg-market-citations summary { min-height:0; padding:0; font-size:11px; color:inherit; list-style:disclosure-closed; }
[data-rg-root] .rg-discovery .rg-market-citations p { padding:6px 0 0; font-size:11px; }
[data-rg-root] .rg-discovery .rg-market-citations ul { margin:6px 0; padding-left:16px; }
[data-rg-root] .rg-discovery .rg-market-stored-summary { display:flex; align-items:baseline; justify-content:space-between; gap:10px; margin-bottom:12px; flex-wrap:wrap; }
[data-rg-root] .rg-discovery .rg-market-stored-summary p { flex:1 1 220px; margin:0; color:var(--dsw-alias-label-secondary); font-size:12px; line-height:1.5; }
[data-rg-root] .rg-discovery .rg-market-stored-summary button { padding:0; font-size:12px; color:var(--dsw-alias-state-business-primary); }
[data-rg-root] .rg-discovery .rg-market-observations { margin-bottom:12px; border:1px solid var(--dsw-alias-border-l2); border-radius:10px; }
[data-rg-root] .rg-discovery .rg-market-observations > details + details { border-top:1px solid var(--dsw-alias-border-l1); }
[data-rg-root] .rg-discovery .rg-market-observations summary { display:grid; grid-template-columns:minmax(50px,1fr) auto auto; gap:6px 16px; padding:11px 14px; cursor:pointer; font-size:12px; font-variant-numeric:tabular-nums; }
[data-rg-root] .rg-discovery .rg-market-observations time { grid-column:1 / -1; color:var(--dsw-alias-label-tertiary); font-size:10px; }
[data-rg-root] .rg-discovery .rg-market-observations p { padding:0 14px; font-size:11px; line-height:1.5; overflow-wrap:anywhere; color:var(--dsw-alias-label-secondary); }
[data-rg-root] .rg-discovery .rg-market-observations button { margin:0 14px 12px; padding:0; font-size:11px; color:var(--dsw-alias-state-business-primary); }
[data-rg-root] .rg-discovery .rg-discovery-moves { display:grid; grid-template-columns:repeat(auto-fit,minmax(130px,1fr)); gap:8px; }
[data-rg-root] .rg-discovery .rg-discovery-moves > button { display:grid; gap:5px; padding:14px; min-width:0; text-align:left; border:1px solid var(--dsw-alias-border-l2); border-radius:9px; background:var(--dsw-alias-bg-layer-1); font-size:13px; font-variant-numeric:tabular-nums; }
[data-rg-root] .rg-discovery .rg-discovery-moves > button[data-up=true] { background:color-mix(in srgb,var(--dsw-alias-state-success-primary) 8%,var(--dsw-alias-bg-base)); }
[data-rg-root] .rg-discovery .rg-discovery-moves > button[data-up=false] { background:color-mix(in srgb,var(--dsw-alias-state-error-primary) 7%,var(--dsw-alias-bg-base)); }
[data-rg-root] .rg-discovery .rg-discovery-moves strong { font-size:15px; color:var(--dsw-alias-label-primary); }
[data-rg-root] .rg-discovery .rg-discovery-moves small { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; font-size:11px; color:var(--dsw-alias-label-secondary); }
[data-rg-root] .rg-discovery .rg-market-briefs details > button { margin:0 16px 14px; padding:0; color:var(--dsw-alias-label-secondary); font-size:11px; }
[data-rg-root] .rg-discovery .rg-market-summary-empty { padding:16px; border-radius:10px; background:var(--dsw-alias-bg-layer-1); }
[data-rg-root] .rg-discovery .rg-market-summary-empty p { margin:0 0 10px; color:var(--dsw-alias-label-secondary); font-size:12px; line-height:1.55; }
[data-rg-root] .rg-discovery-section-head { margin:24px 0 13px; }
[data-rg-root] .rg-discovery-section-head h3 { margin:0; margin-right:auto; font-size:14px; font-weight:550; }
[data-rg-root] .rg-discovery-section-head span,[data-rg-root] .rg-discovery-section-head > button { font-size:11px; color:var(--dsw-alias-label-secondary); }
[data-rg-root] .rg-discovery .rg-discovery-heatmap { display:grid; grid-template-columns:minmax(0,1fr); gap:10px; }
[data-rg-root] .rg-discovery .rg-discovery-heatmap-sector { min-width:0; overflow:hidden; border:1px solid var(--dsw-alias-border-l2); border-radius:10px; background:var(--dsw-alias-bg-layer-1); }
[data-rg-root] .rg-discovery .rg-discovery-heatmap-sector-head { display:grid; grid-template-columns:minmax(0,1fr) auto auto 14px; gap:12px; width:100%; min-height:42px; padding:8px 12px; align-items:center; border-bottom:1px solid var(--dsw-alias-border-l1); color:var(--dsw-alias-label-secondary); text-align:left; }
[data-rg-root] .rg-discovery .rg-discovery-heatmap-sector-head:hover { background:var(--dsw-alias-interactive-bg-hover); }
[data-rg-root] .rg-discovery .rg-discovery-heatmap-sector-head strong { min-width:0; overflow:hidden; color:var(--dsw-alias-label-primary); font-size:12px; font-weight:600; text-overflow:ellipsis; white-space:nowrap; }
[data-rg-root] .rg-discovery .rg-discovery-heatmap-sector-head span { font-size:10.5px; font-variant-numeric:tabular-nums; }
[data-rg-root] .rg-discovery .rg-discovery-heatmap-sector-head svg { transition:transform 150ms ease; }
[data-rg-root] .rg-discovery .rg-discovery-heatmap-sector-head[aria-expanded=true] svg { transform:rotate(180deg); }
[data-rg-root] .rg-discovery .rg-discovery-heatmap-cells { display:grid; grid-template-columns:repeat(12,minmax(0,1fr)); gap:3px; padding:3px; }
[data-rg-root] .rg-discovery .rg-discovery-heatmap-cells > button { display:flex; min-width:0; min-height:66px; padding:8px 7px; flex-direction:column; justify-content:center; align-items:center; overflow:hidden; border:1px solid transparent; border-radius:4px; color:var(--dsw-alias-label-secondary); background:var(--dsw-alias-bg-layer-2); }
[data-rg-root] .rg-discovery .rg-discovery-heatmap-cells > button:hover { border-color:var(--dsw-alias-border-l3); }
[data-rg-root] .rg-discovery .rg-discovery-heatmap-cells > button[data-up=true] { background:color-mix(in srgb,var(--dsw-alias-state-success-primary) 15%,var(--dsw-alias-bg-base)); }
[data-rg-root] .rg-discovery .rg-discovery-heatmap-cells > button[data-up=false] { background:color-mix(in srgb,var(--dsw-alias-state-error-primary) 12%,var(--dsw-alias-bg-base)); }
[data-rg-root] .rg-discovery .rg-discovery-heatmap-cells > button[aria-pressed=true] { border-color:var(--dsw-alias-brand-primary); box-shadow:inset 0 0 0 1px var(--dsw-alias-brand-primary); }
[data-rg-root] .rg-discovery .rg-discovery-heatmap-cells small { max-width:100%; overflow:hidden; font-size:9px; text-overflow:ellipsis; white-space:nowrap; }
[data-rg-root] .rg-discovery .rg-discovery-heatmap-cells strong { max-width:100%; overflow:hidden; margin:4px 0 2px; color:var(--dsw-alias-label-primary); font-size:14px; font-weight:600; text-overflow:ellipsis; white-space:nowrap; }
[data-rg-root] .rg-discovery .rg-discovery-heatmap-cells span { font-size:10.5px; font-variant-numeric:tabular-nums; }
[data-rg-root] .rg-discovery .rg-discovery-sector-detail { padding:12px; border-top:1px solid var(--dsw-alias-border-l1); background:var(--dsw-alias-bg-layer-2); }
[data-rg-root] .rg-discovery .rg-discovery-sector-detail > div:first-child { display:flex; align-items:center; justify-content:space-between; gap:12px; }
[data-rg-root] .rg-discovery .rg-discovery-sector-detail > div:first-child strong { color:var(--dsw-alias-label-primary); font-size:12px; }
[data-rg-root] .rg-discovery .rg-discovery-sector-detail > div:first-child span,[data-rg-root] .rg-discovery .rg-discovery-sector-detail > p { color:var(--dsw-alias-label-tertiary); font-size:10.5px; }
[data-rg-root] .rg-discovery .rg-discovery-sector-detail > p { margin:5px 0 8px; }
[data-rg-root] .rg-discovery .rg-discovery-sector-detail > div:last-child { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:2px 14px; }
[data-rg-root] .rg-discovery .rg-discovery-sector-detail > div:last-child > button { display:grid; grid-template-columns:30px minmax(0,1fr) auto; gap:9px; min-width:0; min-height:42px; padding:6px 4px; align-items:center; border-bottom:1px solid var(--dsw-alias-border-l1); text-align:left; }
[data-rg-root] .rg-discovery .rg-discovery-sector-detail > div:last-child > button:hover { background:var(--dsw-alias-interactive-bg-hover); }
[data-rg-root] .rg-discovery .rg-discovery-sector-detail > div:last-child > button > span:nth-child(2) { min-width:0; }
[data-rg-root] .rg-discovery .rg-discovery-sector-detail > div:last-child > button strong,[data-rg-root] .rg-discovery .rg-discovery-sector-detail > div:last-child > button small { display:block; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
[data-rg-root] .rg-discovery .rg-discovery-sector-detail > div:last-child > button strong { color:var(--dsw-alias-label-primary); font-size:11px; font-weight:500; }
[data-rg-root] .rg-discovery .rg-discovery-sector-detail > div:last-child > button small { margin-top:3px; color:var(--dsw-alias-label-tertiary); font-size:9.5px; }
[data-rg-root] .rg-discovery .rg-discovery-sector-detail > div:last-child > button > span:last-child { font-size:10.5px; font-variant-numeric:tabular-nums; }
.rg-discovery-tools { display:flex; gap:10px; margin-bottom:16px; }
[data-rg-root] .rg-discovery-tools input { width:260px; min-width:0; font-size:12px; }
[data-rg-root] .rg-discovery-tools select { font-size:12px; max-width:40%; }
.rg-discovery-table-wrap { overflow:auto; }
.rg-discovery-table { min-width:570px; font-variant-numeric:tabular-nums; }
.rg-discovery-table th:not(:first-child),.rg-discovery-table td:not(:first-child) { text-align:right; }
.rg-discovery-table th:first-child,.rg-discovery-table td:first-child { padding-left:0; }
.rg-discovery-table th button { white-space:nowrap; font-size:11px; }
.rg-discovery-name { display:flex; align-items:center; gap:12px; text-align:left; }
.rg-discovery-name strong { display:block; font-size:13px; font-weight:500; }
.rg-discovery-name small { display:block; margin-top:4px; font-size:10px; color:var(--dsw-alias-label-tertiary); }
.rg-discovery-empty { text-align:center; padding:36px 15px; font-size:13px; }
.rg-discovery-empty button { font-size:12px; padding:10px; color:var(--dsw-alias-state-business-primary); }
@media(max-width:720px) {
  .rg-discovery-tickers > button { border-bottom:1px solid var(--dsw-alias-border-l1); }
  [data-rg-root] .rg-discovery .rg-discovery-summary-head { align-items:flex-start; flex-direction:column; gap:6px; }
  [data-rg-root] .rg-discovery .rg-discovery-heatmap-sector-head { grid-template-columns:minmax(0,1fr) auto 14px; gap:8px; }
  [data-rg-root] .rg-discovery .rg-discovery-heatmap-sector-head > span:first-of-type { display:none; }
  [data-rg-root] .rg-discovery .rg-discovery-heatmap-cells { grid-template-columns:repeat(6,minmax(0,1fr)); }
  [data-rg-root] .rg-discovery .rg-discovery-heatmap-cells > button { min-height:62px; }
  [data-rg-root] .rg-discovery .rg-discovery-sector-detail > div:last-child { grid-template-columns:minmax(0,1fr); }
  .rg-discovery-section-head { gap:8px; flex-wrap:wrap; }
  .rg-discovery-section-head h3 { font-size:14px; }
}
`
