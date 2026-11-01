/** The financial surface follows the reference product's hierarchy and the DSH theme. */
export const FINANCE_SHELL_STYLE = `
[data-rg-root][data-mode='finance'] { font-size: 14px; }
.rg-finance-workspace { display:flex; flex-direction:column; grid-template-columns:none; overflow:hidden; background:var(--dsw-alias-bg-base); }
.rg-pf-header { display:flex; align-items:center; justify-content:space-between; gap:24px; min-height:78px; padding:16px 28px; border-bottom:1px solid var(--dsw-alias-border-l1); flex:none; }
[data-rg-root] .rg-pf-brand { flex:none; font-size:19px; font-weight:650; letter-spacing:-.035em; text-align:left; }
.rg-pf-brand span { font-weight:450; color:var(--dsw-alias-label-secondary); }
.rg-pf-search { display:flex; align-items:center; gap:10px; width:min(420px,42%); min-width:180px; padding:0 13px; border:1px solid var(--dsw-alias-border-l2); border-radius:9px; color:var(--dsw-alias-label-secondary); background:var(--dsw-alias-bg-layer-1); }
[data-rg-root] .rg-pf-search input { min-width:0; flex:1; width:100%; height:39px; padding:0; border:0; border-radius:0; background:transparent; font-size:13px; }
.rg-pf-search:focus-within { outline:2px solid var(--dsw-alias-brand-primary); outline-offset:2px; }
[data-rg-root] .rg-pf-search input:focus-visible { box-shadow:none; }
.rg-pf-search button { padding:5px; }
.rg-pf-header-actions { display:flex; align-items:center; gap:20px; flex:none; }
[data-rg-root] .rg-pf-assistant-button { display:flex; align-items:center; gap:8px; font-size:13px; font-weight:550; white-space:nowrap; }
.rg-pf-more { position:relative; z-index:6; }
.rg-pf-more summary { list-style:none; padding:8px; cursor:pointer; line-height:1; }
.rg-pf-more summary::-webkit-details-marker { display:none; }
.rg-pf-more > div { position:absolute; right:0; top:30px; width:160px; background:var(--dsw-alias-bg-layer-1); border:1px solid var(--dsw-alias-border-l2); border-radius:10px; padding:6px; box-shadow:0 14px 30px -18px rgba(0,0,0,.45); }
.rg-pf-more button { display:block; width:100%; padding:10px; text-align:left; border-radius:5px; }
.rg-pf-more button:hover { background:var(--dsw-alias-interactive-bg-hover); }
.rg-finance-nav { padding:0; flex:none; overflow:visible; border-right:0; background:transparent; }
.rg-pf-primary { display:flex; align-items:stretch; padding:0 28px; gap:28px; min-height:51px; overflow-x:auto; scrollbar-width:thin; border-bottom:1px solid var(--dsw-alias-border-l2); }
.rg-finance-nav .rg-pf-primary button { position:relative; display:block; width:auto; flex:none; padding:14px 0 13px; text-align:center; border-radius:0; font-size:13px; color:var(--dsw-alias-label-secondary); background:transparent; }
.rg-finance-nav .rg-pf-primary button:hover { color:var(--dsw-alias-label-primary); background:transparent; }
.rg-finance-nav .rg-pf-primary button[data-active] { color:var(--dsw-alias-brand-primary); font-weight:600; background:transparent; }
.rg-pf-primary button[data-active]::after { content:''; position:absolute; bottom:0; left:0; right:0; height:2px; background:var(--dsw-alias-brand-primary); }
.rg-pf-research-nav { display:flex; align-items:center; gap:2px; padding:8px 22px; overflow-x:auto; border-bottom:1px solid var(--dsw-alias-border-l1); scrollbar-width:thin; }
.rg-pf-research-nav > span { font-size:11px; color:var(--dsw-alias-label-tertiary); padding:0 12px 0 6px; white-space:nowrap; }
.rg-finance-nav .rg-pf-research-nav button { width:auto; padding:5px 9px; font-size:12px; flex:none; }
.rg-finance-nav .rg-pf-research-nav button[data-active] { background:var(--dsw-alias-bg-multi-select); color:var(--dsw-alias-brand-primary); }
.rg-pf-statusbar { display:flex; align-items:center; gap:16px; padding:11px 28px; font-size:11px; color:var(--dsw-alias-label-secondary); flex:none; border-bottom:1px solid var(--dsw-alias-border-l1); }
.rg-pf-statusbar > span:first-child { margin-right:auto; }
.rg-pf-statusbar label { display:flex; align-items:center; gap:7px; white-space:nowrap; }
[data-rg-root] .rg-pf-statusbar select { font-size:11px; padding:3px 6px; background:transparent; }
.rg-pf-status-separator { padding:0 9px; color:var(--dsw-alias-label-tertiary); }
.rg-pf-demo-note { flex:none; margin:0; padding:9px 28px; font-size:11px; line-height:1.6; background:var(--dsw-alias-bg-layer-2); color:var(--dsw-alias-label-secondary); }
.rg-finance-main { flex:1; min-height:0; overflow:auto; overscroll-behavior:contain; }
.rg-pf-body { max-width:1800px; margin:0 auto; }
.rg-pf-body[data-with-aside] { display:grid; grid-template-columns:minmax(0,1fr) 284px; }
.rg-pf-page-content { min-width:0; }
.rg-pf-aside { padding:28px 24px 40px 10px; font-size:12px; }
.rg-pf-aside section { padding:0 0 24px; margin-bottom:24px; border-bottom:1px solid var(--dsw-alias-border-l1); }
.rg-pf-aside-head { display:flex; align-items:center; justify-content:space-between; gap:10px; margin-bottom:12px; }
.rg-pf-aside h3 { font-size:14px; font-weight:600; margin:0; }
.rg-pf-aside-head button { font-size:11px; color:var(--dsw-alias-label-secondary); }
.rg-pf-aside-caption { font-size:11px; color:var(--dsw-alias-label-tertiary); line-height:1.7; }
.rg-pf-aside-empty { border:1px solid var(--dsw-alias-border-l2); border-radius:10px; padding:14px; }
.rg-pf-aside-empty p { margin:0 0 10px; color:var(--dsw-alias-label-secondary); }
.rg-pf-aside-empty button,.rg-pf-aside-links button { font-size:12px; color:var(--dsw-alias-state-business-primary); text-align:left; }
.rg-pf-aside-asset { display:flex; align-items:center; gap:10px; width:100%; text-align:left; padding:12px 0; }
.rg-pf-aside-asset > span:nth-child(2) { flex:1; min-width:0; }
.rg-pf-aside-asset strong { display:block; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; font-size:12px; font-weight:550; }
.rg-pf-aside-asset small,.rg-pf-aside-record small { display:block; font-size:10px; margin-top:4px; color:var(--dsw-alias-label-secondary); }
.rg-pf-monogram { display:grid; place-items:center; width:30px; height:30px; border-radius:50%; background:var(--dsw-alias-bg-layer-3); font-size:13px; flex:none; }
.rg-pf-aside-record { display:block; width:100%; text-align:left; padding:10px 0; line-height:1.5; border-bottom:1px solid var(--dsw-alias-border-l1); }
.rg-pf-aside-links { display:grid; gap:14px; margin-top:14px; }
@media (max-width:1100px) { .rg-pf-body[data-with-aside] { display:block; } .rg-pf-aside { display:none; } }
.rg-finance-section { padding:28px 30px 44px; max-width:1500px; margin:0 auto; }
.rg-finance-section-head { margin-bottom:24px; }
.rg-finance-section-head h2 { font-size:19px; font-weight:600; letter-spacing:-.02em; }
.rg-finance-section-head p { font-size:13px; margin-top:7px; }
.rg-finance-block { padding:22px 0; }
.rg-finance-section h3 { font-size:15px; }
.rg-finance-table { font-size:13px; }
.rg-finance-table td,.rg-finance-table th { padding-top:12px; padding-bottom:12px; }
.rg-pf-panel { width:100%; max-width:1500px; margin:0 auto; padding:28px 30px 48px; }
.rg-pf-panel h2 { font-size:19px; letter-spacing:-.02em; font-weight:600; margin:0 0 20px; }
.rg-pf-panel h3 { font-size:16px; font-weight:600; margin:0 0 14px; }
.rg-pf-panel p { color:var(--dsw-alias-label-secondary); line-height:1.65; }
.rg-pf-section { padding:22px 0; border-bottom:1px solid var(--dsw-alias-border-l1); }
.rg-pf-table { border-collapse:collapse; width:100%; font-size:13px; }
.rg-pf-table th { color:var(--dsw-alias-label-secondary); font-weight:450; text-align:left; white-space:nowrap; }
.rg-pf-table td,.rg-pf-table th { border-bottom:1px solid var(--dsw-alias-border-l1); padding:12px 10px; }
.rg-pf-table tbody tr:hover { background:var(--dsw-alias-interactive-bg-hover); }
.rg-pf-symbol-context { display:flex; align-items:center; gap:10px; padding:16px 30px 0; font-size:12px; }
.rg-pf-symbol-context > span:nth-last-child(2) { margin-left:auto; color:var(--dsw-alias-label-secondary); font-size:11px; }
.rg-pf-symbol-context > button:last-child { color:var(--dsw-alias-brand-primary); }
.rg-pf-assistant { flex:none; max-height:55%; overflow:auto; padding:16px 24px; margin:0 24px 18px; border:1px solid var(--dsw-alias-border-l2); border-radius:12px; background:var(--dsw-alias-bg-layer-1); box-shadow:0 12px 32px -26px rgba(0,0,0,.25); }
.rg-pf-assistant-head { display:flex; align-items:center; justify-content:space-between; margin-bottom:8px; font-size:12px; }
.rg-pf-assistant-head button { font-size:22px; padding:0 5px; }
[data-rg-root] .rg-pf-assistant textarea { width:100%; border:0; padding:8px 0; resize:vertical; background:transparent; font-size:14px; }
.rg-pf-composer-actions { display:flex; align-items:center; gap:10px; font-size:11px; flex-wrap:wrap; }
.rg-pf-composer-actions > span { margin-left:auto; color:var(--dsw-alias-label-tertiary); }
[data-rg-root] .rg-pf-composer-actions input { width:190px; max-width:100%; font-size:11px; }
.rg-pf-composer-actions > button:first-child { padding:6px 0; color:var(--dsw-alias-label-secondary); }
.rg-pf-composer-actions .rg-btn { padding:7px 15px; }
@media (min-width:1500px) { .rg-pf-panel,.rg-finance-section { padding-left:44px; padding-right:44px; } }
@media (max-width:1000px) { .rg-pf-header { gap:14px; padding:14px 20px; } .rg-pf-header-actions { gap:10px; } .rg-pf-primary { gap:24px; padding:0 20px; } }
@media (max-width:720px) {
  .rg-pf-header { flex-wrap:wrap; gap:14px; padding:16px; min-height:auto; }
  [data-rg-root] .rg-pf-brand { font-size:18px; }
  .rg-pf-header-actions { margin-left:auto; }
  .rg-pf-search { order:3; width:100%; min-width:0; }
  .rg-finance-nav { display:block; padding:0; overflow:visible; }
  .rg-pf-primary { padding:0 16px; gap:22px; }
  .rg-finance-nav .rg-pf-primary button { padding:13px 0; }
  .rg-pf-research-nav { padding:7px 10px; }
  .rg-pf-statusbar { padding:9px 16px; gap:9px; flex-wrap:wrap; }
  .rg-pf-statusbar label { margin-left:auto; }
  .rg-pf-statusbar > span:first-child { font-size:10px; }
  .rg-pf-demo-note { padding:8px 16px; }
  .rg-pf-panel,.rg-finance-section { padding:22px 16px 32px; }
  .rg-pf-assistant { margin:0 10px 10px; padding:12px; max-height:65%; }
  .rg-pf-composer-actions > span { display:none; }
  [data-rg-root] .rg-pf-composer-actions input { width:145px; }
  .rg-pf-composer-actions .rg-btn { margin-left:auto; }
  .rg-pf-symbol-context { padding:12px 16px 0; flex-wrap:wrap; }
  .rg-pf-symbol-context > span:nth-last-child(2) { margin-left:0; }
}
/* Measured against the live reference: 56px header, 54px tabs, 14px labels. */
.rg-finance-workspace { font-size:14px; }
.rg-pf-header { min-height:56px; padding:10px 16px; gap:24px; }
[data-rg-root] .rg-pf-brand { font-size:15px; font-weight:550; letter-spacing:-.015em; }
.rg-pf-search { width:min(360px,40%); }
[data-rg-root] .rg-pf-search input { height:30px; font-size:14px; }
.rg-finance-nav { display:flex; flex-direction:row; align-items:stretch; min-width:0; border-bottom:1px solid var(--dsw-alias-border-l2); }
.rg-pf-primary { flex:1; min-width:0; padding:0 30px; gap:20px; min-height:54px; border:0; }
.rg-finance-nav .rg-pf-primary button { padding:14px 0; font-size:14px; line-height:24px; font-weight:500; }
.rg-pf-statusbar { padding:0 16px 0 10px; border:0; gap:8px; }
.rg-pf-statusbar > span:first-child { display:none; }
.rg-pf-statusbar label { font-size:0; gap:0; }
.rg-pf-statusbar select { max-width:110px; }
.rg-pf-more > div { max-height:70vh; overflow-y:auto; }
.rg-finance-section-head h2,.rg-pf-panel h2 { font-size:16px; font-weight:550; }
.rg-library-list > button,.rg-hypothesis-list > button,.rg-report-list > button { padding:16px 14px; gap:7px 12px; font-size:13px; }
.rg-library-row-title code,.rg-hypothesis-list > button > code,.rg-report-list > button > code { font-size:10px; opacity:.65; }
.rg-library-preview,.rg-hypothesis-detail,.rg-report-reader { padding:22px 28px 38px; }
.rg-library-preview-head h3,.rg-hypothesis-detail-head h3,.rg-report-reader-head h3 { font-size:19px; font-weight:550; line-height:1.5; margin-top:8px; }
.rg-library-original { font-size:14px; line-height:1.85; padding:18px; }
.rg-hypothesis-thesis dd { font-size:14px; line-height:1.8; }
.rg-library-facts dt,.rg-hypothesis-thesis dt { font-size:11px; }
.rg-library-facts dd { font-size:12px; margin-top:5px; }
.rg-finance-workspace .rg-finance-block-description { line-height:1.7; }
@media (max-width:1000px) { .rg-pf-statusbar { display:none; } }
@media (max-width:720px) {
 .rg-pf-header { padding:12px 16px; gap:12px; }
 .rg-pf-header-actions { gap:14px; }
 .rg-pf-search { width:100%; }
 .rg-pf-primary { padding:0 16px; gap:20px; }
 .rg-finance-nav { display:flex; }
 .rg-library-preview,.rg-hypothesis-detail,.rg-report-reader { padding:18px 16px 30px; }
}
.rg-app-gallery { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:28px 22px; margin:24px 0 36px; }
.rg-app-preview-card { display:block; min-width:0; text-align:left; }
.rg-app-miniature { display:block; min-height:154px; padding:18px; margin-bottom:12px; border:1px solid var(--dsw-alias-border-l2); border-radius:10px; background:var(--dsw-alias-bg-layer-2); color:var(--dsw-alias-label-secondary); overflow:hidden; }
.rg-app-mini-title { display:block; font-size:9px; margin-bottom:15px; font-weight:600; }
.rg-app-miniature svg { display:block; width:100%; height:72px; color:var(--dsw-alias-state-business-primary); }
.rg-app-mini-lines { display:grid; gap:5px; margin-top:12px; }
.rg-app-mini-lines i { height:3px; width:80%; background:var(--dsw-alias-border-l3); }
.rg-app-mini-lines i:nth-child(2) { width:60%; }
.rg-app-mini-lines i:nth-child(3) { width:70%; }
.rg-app-mini-table { display:grid; grid-template-columns:repeat(3,1fr); gap:8px; padding:8px 0; }
.rg-app-mini-table i { height:5px; background:var(--dsw-alias-border-l3); }
.rg-app-mini-columns { display:flex; gap:12px; height:75px; align-items:flex-end; }
.rg-app-mini-columns span { flex:1; height:60%; background:color-mix(in srgb,var(--dsw-alias-state-business-primary) 40%,transparent); }
.rg-app-mini-columns span:nth-child(even) { height:90%; }
.rg-app-mini-columns span:last-child { height:80%; }
.rg-app-preview-card > strong { display:block; font-size:13px; font-weight:550; }
.rg-app-preview-card > small { display:block; color:var(--dsw-alias-label-tertiary); font-size:11px; margin-top:5px; }
@media(max-width:720px) { .rg-app-gallery { grid-template-columns:repeat(2,minmax(0,1fr)); gap:22px 14px; } .rg-app-miniature { min-height:120px; padding:12px; } }
`
