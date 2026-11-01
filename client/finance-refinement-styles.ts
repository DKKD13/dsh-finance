/** Second-level reference details and the native conversation handoff. */
export const FINANCE_REFINEMENT_STYLE = `
.rg-finance-workspace .rg-pf-header { min-height:64px; padding-top:12px; padding-bottom:12px; }
.rg-finance-workspace .rg-pf-statusbar { padding-top:8px; padding-bottom:8px; }
[data-rg-root] .rg-market-panel[data-loaded] .rg-market-panel-head { display:none; }
[data-rg-root] .rg-market-panel .rg-finance-operation[data-status=success] { display:none; }
[data-rg-root] .rg-market-section-tabs a { text-decoration:none; }
[data-rg-root] .rg-market-range-bar { display:flex; gap:4px; margin:0 0 12px; }
[data-rg-root] .rg-market-range-bar button { padding:6px 12px; border-radius:6px; color:var(--dsw-alias-label-secondary); font-size:12px; }
[data-rg-root] .rg-market-range-bar button[aria-pressed=true] { background:var(--dsw-alias-bg-layer-2); color:var(--dsw-alias-label-primary); }
[data-rg-root] .rg-market-history-form { margin-top:20px; }
[data-rg-root] .rg-market-layout { grid-template-columns:minmax(0,1fr) 260px; gap:30px; align-items:start; }
[data-rg-root] .rg-market-layout > .rg-market-watchlist { grid-column:2; grid-row:1; }
[data-rg-root] .rg-market-layout > .rg-market-main { grid-column:1; grid-row:1; display:flex; flex-direction:column; }
[data-rg-root] .rg-market-main > #rg-market-history { order:-1; padding-top:18px; }
[data-rg-root] .rg-market-overview-grid { display:block; }
[data-rg-root] .rg-market-facts { padding:12px 0 24px; border-left:0; border-bottom:1px solid var(--dsw-alias-border-l1); }
[data-rg-root] .rg-market-watchlist > .rg-finance-block { padding-top:24px; }
.rg-pf-market-nav { display:flex; gap:8px; padding:16px 30px 0; }
[data-rg-root] .rg-pf-market-nav button { padding:7px 13px; border:1px solid transparent; border-radius:8px; color:var(--dsw-alias-label-secondary); font-size:13px; white-space:nowrap; }
[data-rg-root] .rg-pf-market-nav button[aria-selected=true] { border-color:var(--dsw-alias-border-l2); background:var(--dsw-alias-bg-layer-2); color:var(--dsw-alias-label-primary); }
.rg-finance-workspace .rg-screen h2,.rg-finance-workspace .dsh-events h2,.rg-finance-workspace .rg-discovery h2,.rg-finance-workspace .rg-pf-panel h2 { font-size:14px; font-weight:500; letter-spacing:0; }
.rg-report-entry { padding:20px 0 26px; border-bottom:1px solid var(--dsw-alias-border-l1); margin-bottom:24px; }
.rg-report-entry h3 { font-size:16px; font-weight:550; margin:0; }
.rg-report-entry p { font-size:12px; color:var(--dsw-alias-label-secondary); line-height:1.7; margin:8px 0 0; }
.rg-report-entry > div { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:12px; margin:20px 0 14px; }
[data-rg-root] .rg-report-entry > div > button { text-align:left; padding:18px; border:1px solid var(--dsw-alias-border-l2); border-radius:12px; }
.rg-report-entry button:hover { background:var(--dsw-alias-interactive-bg-hover); }
.rg-report-entry button > span { display:block; font-size:14px; font-weight:500; }
.rg-report-entry button small { display:flex; justify-content:space-between; margin-top:20px; font-size:11px; color:var(--dsw-alias-label-tertiary); }
.rg-report-conversation-actions { display:flex; gap:8px; margin:0 0 20px; flex-wrap:wrap; }
.rg-conversation-dialog { width:min(560px,calc(100vw - 32px)); max-height:85vh; overflow:auto; padding:24px; border:1px solid var(--dsw-alias-border-l2); border-radius:14px; background:var(--dsw-alias-bg-base); color:var(--dsw-alias-label-primary); box-shadow:0 24px 80px #0003; }
.rg-conversation-dialog header { display:flex; justify-content:space-between; align-items:flex-start; gap:24px; }
.rg-conversation-dialog h3 { margin:0; font-size:18px; font-weight:550; }
.rg-conversation-dialog header p { font-size:12px; color:var(--dsw-alias-label-secondary); line-height:1.7; margin:8px 0 0; }
.rg-conversation-dialog fieldset { border:0; padding:0; margin:22px 0; min-width:0; }
.rg-conversation-dialog label { display:grid; gap:8px; margin:18px 0 0; font-size:13px; }
[data-rg-root] .rg-conversation-dialog input,[data-rg-root] .rg-conversation-dialog select,[data-rg-root] .rg-conversation-dialog textarea { width:100%; min-width:0; font-size:13px; }
.rg-conversation-dialog textarea { resize:vertical; }
.rg-conversation-modes { display:flex; gap:4px; padding:4px; border-radius:9px; background:var(--dsw-alias-bg-layer-2); }
[data-rg-root] .rg-conversation-modes button { flex:1; padding:9px 4px; border-radius:6px; font-size:12px; white-space:nowrap; }
[data-rg-root] .rg-conversation-modes button[aria-pressed=true] { background:var(--dsw-alias-bg-base); box-shadow:0 1px 3px #0001; }
.rg-conversation-skill { display:block; font-size:11px; color:var(--dsw-alias-label-tertiary); margin:12px 0 0; }
.rg-conversation-dialog details { margin-top:18px; font-size:12px; color:var(--dsw-alias-label-secondary); }
.rg-conversation-dialog summary { cursor:pointer; }
.rg-conversation-dialog footer { display:flex; align-items:center; justify-content:space-between; gap:20px; padding-top:18px; border-top:1px solid var(--dsw-alias-border-l1); }
.rg-conversation-dialog small { font-size:11px; line-height:1.6; color:var(--dsw-alias-label-secondary); }
.rg-conversation-dialog footer button { flex:none; }
.rg-research-context { display:flex; flex-wrap:wrap; align-items:flex-start; gap:6px; padding:3px 0 7px; max-height:78px; overflow:auto; }
.rg-research-context > span { display:inline-flex; align-items:center; gap:6px; min-width:0; max-width:300px; padding:4px 8px; border:1px solid var(--dsw-alias-border-l2); border-radius:6px; background:var(--dsw-alias-bg-layer-2); font-size:12px; line-height:1.5; overflow-wrap:anywhere; }
.rg-research-chip-label { min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
[data-rg-root] .rg-research-context > span > button { flex:none; padding:0 2px; color:var(--dsw-alias-label-tertiary); font-size:14px; }
.rg-research-context [data-unavailable] { color:var(--dsw-alias-state-error-primary); }
.rg-pf-assistant:has(.rg-research-menu[open]) { overflow:visible; }
.rg-research-menu { position:relative; flex:none; }
[data-rg-root] .rg-research-menu > summary { display:inline-flex; align-items:center; gap:6px; min-height:31px; padding:5px 10px; border:1px solid var(--dsw-alias-border-l2); border-radius:18px; color:var(--dsw-alias-label-secondary); font-size:12px; list-style:none; cursor:pointer; }
.rg-research-menu > summary::-webkit-details-marker { display:none; }
.rg-research-menu[open] > summary,.rg-research-menu > summary:hover { background:var(--dsw-alias-interactive-bg-hover); }
.rg-research-menu > div { position:absolute; z-index:35; left:0; bottom:calc(100% + 10px); width:340px; max-width:calc(100vw - 60px); padding:10px; border:1px solid var(--dsw-alias-border-l2); border-radius:12px; background:var(--dsw-alias-bg-layer-1); box-shadow:0 8px 32px #0002; }
.rg-research-menu header { display:flex; align-items:center; justify-content:space-between; padding:5px 3px 10px; font-size:12px; }
.rg-research-menu header span { color:var(--dsw-alias-label-tertiary); }
[data-rg-root] .rg-research-source-menu > div > input { width:100%; padding:7px 9px; margin:0 0 8px; font-size:12px; }
.rg-research-source-list { max-height:250px; overflow:auto; }
.rg-research-source-list label { display:flex; align-items:flex-start; gap:9px; padding:9px 6px; border-radius:6px; cursor:pointer; }
.rg-research-source-list label:hover { background:var(--dsw-alias-interactive-bg-hover); }
[data-rg-root] .rg-research-source-list input { flex:none; width:14px; height:14px; margin:3px 0 0; }
.rg-research-source-list label span { min-width:0; overflow-wrap:anywhere; }
.rg-research-source-list strong { display:block; font-size:12px; font-weight:500; line-height:1.5; }
.rg-research-source-list small { display:block; margin-top:2px; color:var(--dsw-alias-label-tertiary); font-size:11px; }
.rg-research-source-list p { padding:8px 6px; color:var(--dsw-alias-label-secondary); font-size:12px; line-height:1.7; }
.rg-research-menu footer { display:flex; justify-content:space-between; align-items:center; gap:12px; margin-top:8px; padding:9px 4px 0; border-top:1px solid var(--dsw-alias-border-l1); }
[data-rg-root] .rg-research-menu footer button { display:flex; align-items:center; gap:12px; font-size:12px; padding:4px 2px; }
.rg-research-skill-menu > div { width:240px; }
[data-rg-root] .rg-research-skill-menu > div > button { display:flex; align-items:center; justify-content:space-between; gap:12px; width:100%; padding:10px 8px; border-radius:6px; font-size:12px; }
.rg-research-skill-menu > div > button:hover,.rg-research-skill-menu > div > button[aria-pressed=true] { background:var(--dsw-alias-interactive-bg-hover); }
.rg-research-skill-menu small { color:var(--dsw-alias-label-tertiary); font-size:10px; }
.rg-conversation-dialog [role=alert] { font-size:12px; line-height:1.7; color:var(--dsw-alias-state-error-primary); overflow-wrap:anywhere; }
@media(max-width:720px) {
 [data-rg-root] .rg-market-layout { grid-template-columns:minmax(0,1fr); }
 [data-rg-root] .rg-market-layout > .rg-market-main { grid-column:1; grid-row:1; }
 [data-rg-root] .rg-market-layout > .rg-market-watchlist { grid-column:1; grid-row:2; }
 .rg-pf-market-nav { padding:14px 16px 0; overflow-x:auto; flex:none; }
 .rg-report-entry > div { grid-template-columns:minmax(0,1fr); gap:8px; }
 [data-rg-root] .rg-report-entry > div > button { padding:15px; }
 .rg-report-entry button small { margin-top:10px; }
 .rg-conversation-dialog { padding:20px 16px; }
 .rg-conversation-dialog footer { gap:12px; }
}
`
