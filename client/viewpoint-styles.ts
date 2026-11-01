export const VIEWPOINT_STYLE = `
[data-rg-root] .rg-view-run-history { margin-bottom:16px; color:var(--dsw-alias-label-secondary); font-size:12px; }
[data-rg-root] .rg-view-run-history > summary { cursor:pointer; }
[data-rg-root] .rg-hypotheses-section { height:auto; overflow:visible; }
[data-rg-root] .rg-hypotheses-section .rg-hypotheses { display:block; flex:none; height:auto; min-height:0; }
[data-rg-root] .rg-view-board { margin-bottom:24px; }
[data-rg-root] .rg-view-board > .rg-library-list-head { position:static; padding:8px 0; background:transparent; }
[data-rg-root] .rg-view-columns { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:24px; padding-top:12px; }
[data-rg-root] .rg-view-column { min-width:0; border-top:1px solid var(--dsw-alias-border-l2); }
[data-rg-root] .rg-view-column > header { display:flex; align-items:center; gap:8px; padding:12px 0; }
[data-rg-root] .rg-view-column h3 { margin:0; font-size:14px; font-weight:550; }
[data-rg-root] .rg-view-column > header > span { margin-left:auto; color:var(--dsw-alias-label-tertiary); font-size:11px; }
[data-rg-root] .rg-view-board .rg-hypothesis-list { border:0; max-height:none; overflow:visible; }
[data-rg-root] .rg-view-board .rg-hypothesis-list > button { display:grid; gap:6px; width:100%; min-width:0; padding:13px 10px; text-align:left; border:0; border-bottom:1px solid var(--dsw-alias-border-l1); border-radius:0; }
[data-rg-root] .rg-view-board .rg-hypothesis-list > button:hover { background:var(--dsw-alias-interactive-bg-hover); }
[data-rg-root] .rg-view-board .rg-hypothesis-list > button[data-selected] { background:var(--dsw-alias-bg-multi-select); }
[data-rg-root] .rg-view-board .rg-hypothesis-list > button strong { display:block; overflow:visible; color:var(--dsw-alias-label-primary); font-size:13px; font-weight:500; line-height:1.6; white-space:normal; }
[data-rg-root] .rg-view-board .rg-hypothesis-list > button > span { color:var(--dsw-alias-label-tertiary); font-size:10.5px; }
[data-rg-root] .rg-view-unassigned { margin-top:20px; padding-top:0; border-top:1px solid var(--dsw-alias-border-l2); }
[data-rg-root] .rg-view-unassigned > summary { display:grid; grid-template-columns:minmax(0,1fr) auto 14px; gap:8px; align-items:center; min-height:42px; padding:8px 2px; color:var(--dsw-alias-label-secondary); font-size:12px; list-style:none; cursor:pointer; }
[data-rg-root] .rg-view-unassigned > summary::-webkit-details-marker { display:none; }
[data-rg-root] .rg-view-unassigned > summary > span:last-child { color:var(--dsw-alias-label-tertiary); font-variant-numeric:tabular-nums; }
[data-rg-root] .rg-view-unassigned > summary::after { content:''; width:6px; height:6px; justify-self:end; border-right:1px solid currentColor; border-bottom:1px solid currentColor; transform:rotate(45deg) translateY(-2px); transition:transform 150ms ease; }
[data-rg-root] .rg-view-unassigned[open] > summary::after { transform:rotate(225deg) translate(-1px,-1px); }
[data-rg-root] .rg-view-unassigned > summary:hover { color:var(--dsw-alias-label-primary); }
[data-rg-root] .rg-view-unassigned-body { padding:0 0 12px 2px; }
[data-rg-root] .rg-view-unassigned-body > p { max-width:76ch; margin:2px 0 8px; color:var(--dsw-alias-label-tertiary); font-size:11.5px; line-height:1.7; }
[data-rg-root] .rg-view-unassigned-body .rg-hypothesis-list { display:block; max-height:none; overflow:visible; border:0; }
[data-rg-root] .rg-view-unassigned-body .rg-hypothesis-list > button { display:grid; grid-template-columns:minmax(0,1fr) auto; gap:5px 16px; width:100%; padding:11px 2px; text-align:left; border-bottom:1px solid var(--dsw-alias-border-l1); }
[data-rg-root] .rg-view-unassigned-body .rg-hypothesis-list > button:hover { background:var(--dsw-alias-interactive-bg-hover); }
[data-rg-root] .rg-view-unassigned-body .rg-hypothesis-list > button strong { min-width:0; color:var(--dsw-alias-label-primary); font-size:12.5px; font-weight:500; line-height:1.6; white-space:normal; }
[data-rg-root] .rg-view-unassigned-body .rg-hypothesis-list > button > span { align-self:start; color:var(--dsw-alias-label-tertiary); font-size:10.5px; }
[data-rg-root] .rg-view-classify { display:flex; align-items:center; flex-wrap:wrap; gap:10px; margin:14px 0 18px; font-size:12px; }
[data-rg-root] .rg-view-classify > span:first-child { color:var(--dsw-alias-label-secondary); }
[data-rg-root] .rg-view-classify small { color:var(--dsw-alias-label-tertiary); }

[data-rg-root] .rg-compact-segmented { --rg-segment-count:2; --rg-segment-index:0; position:relative; display:inline-grid; grid-auto-flow:column; grid-auto-columns:minmax(64px,1fr); gap:2px; padding:3px; border-radius:var(--dsw-radius-md,8px); background:var(--dsw-alias-interactive-bg-hover); }
[data-rg-root] .rg-compact-segmented-indicator { position:absolute; z-index:0; top:3px; left:3px; width:calc((100% - 6px - 2px * (var(--rg-segment-count) - 1)) / var(--rg-segment-count)); height:calc(100% - 6px); border-radius:var(--dsw-radius-sm,6px); background:var(--dsw-alias-bg-layer-1); box-shadow:var(--dsw-elevation-soft); opacity:0; transform:translateX(calc(var(--rg-segment-index) * (100% + 2px))); transition:transform 160ms ease,opacity 120ms ease; pointer-events:none; }
[data-rg-root] .rg-compact-segmented[data-selected] .rg-compact-segmented-indicator { opacity:1; }
[data-rg-root] .rg-compact-segmented > button { position:relative; z-index:1; height:26px; padding:0 11px; border:0; border-radius:var(--dsw-radius-sm,6px); background:transparent; color:var(--dsw-alias-label-secondary); font-size:12px; font-weight:500; line-height:26px; white-space:nowrap; }
[data-rg-root] .rg-compact-segmented > button:hover:not(:disabled),[data-rg-root] .rg-compact-segmented > button[data-active] { color:var(--dsw-alias-label-primary); }
[data-rg-root] .rg-compact-segmented > button:focus-visible { outline:var(--dsw-focus-ring-width,2px) solid var(--dsw-alias-brand-primary); outline-offset:-2px; box-shadow:none; }

[data-rg-root] .rg-hypothesis-ai-head { display:flex; align-items:flex-start; justify-content:space-between; gap:24px; }
[data-rg-root] .rg-hypothesis-ai-head > div:first-child { min-width:0; }
[data-rg-root] .rg-hypothesis-ai-head h4 { margin:0; font-size:14px; font-weight:550; line-height:1.5; }
[data-rg-root] .rg-hypothesis-ai-head .rg-finance-block-description { max-width:72ch; margin:5px 0 0; }
[data-rg-root] .rg-hypothesis-cutoff { display:grid; justify-items:end; gap:6px; flex:none; }
[data-rg-root] .rg-hypothesis-cutoff > span { color:var(--dsw-alias-label-tertiary); font-size:10.5px; }
[data-rg-root] .rg-hypothesis-cutoff > input { width:150px; height:32px; padding:4px 8px; font-size:12px; }
[data-rg-root] .rg-hypothesis-ai-actions { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); margin-top:14px; border-top:1px solid var(--dsw-alias-border-l2); border-bottom:1px solid var(--dsw-alias-border-l2); }
[data-rg-root] .rg-hypothesis-ai-actions > button { position:relative; display:grid; min-width:0; min-height:64px; padding:11px 30px 11px 12px; text-align:left; border-right:1px solid var(--dsw-alias-border-l1); border-radius:0; background:transparent; }
[data-rg-root] .rg-hypothesis-ai-actions > button:last-child { border-right:0; }
[data-rg-root] .rg-hypothesis-ai-actions > button:hover:not(:disabled) { background:var(--dsw-alias-interactive-bg-hover); }
[data-rg-root] .rg-hypothesis-ai-actions > button[data-primary] { background:color-mix(in srgb,var(--dsw-alias-brand-primary) 7%,var(--dsw-alias-bg-layer-1)); }
[data-rg-root] .rg-hypothesis-ai-actions > button[data-primary]:hover:not(:disabled) { background:color-mix(in srgb,var(--dsw-alias-brand-primary) 11%,var(--dsw-alias-bg-layer-1)); }
[data-rg-root] .rg-hypothesis-ai-actions > button::after { content:'\\2192'; position:absolute; top:14px; right:12px; color:var(--dsw-alias-label-tertiary); font-size:14px; }
[data-rg-root] .rg-hypothesis-ai-actions strong,[data-rg-root] .rg-hypothesis-ai-actions small { display:block; min-width:0; white-space:normal; }
[data-rg-root] .rg-hypothesis-ai-actions strong { color:var(--dsw-alias-label-primary); font-size:12.5px; font-weight:550; line-height:1.5; }
[data-rg-root] .rg-hypothesis-ai-actions small { margin-top:3px; color:var(--dsw-alias-label-tertiary); font-size:10.5px; font-weight:400; line-height:1.55; }
[data-rg-root] .rg-hypothesis-ai-note { margin:8px 0 0; color:var(--dsw-alias-label-tertiary); font-size:10.5px; line-height:1.6; }
[data-rg-root] .rg-hypothesis-manual-review { margin-top:14px; padding-top:12px; border-top:1px solid var(--dsw-alias-border-l1); }
[data-rg-root] .rg-hypothesis-manual-review > summary { color:var(--dsw-alias-label-secondary); font-size:11.5px; cursor:pointer; }
[data-rg-root] .rg-hypothesis-manual-review > p { max-width:76ch; margin:8px 0 12px; color:var(--dsw-alias-label-tertiary); font-size:11px; line-height:1.65; }
[data-rg-root] .rg-hypothesis-manual-review .rg-finance-form-actions { margin-top:12px; }

[data-rg-root] .rg-hypotheses-section .rg-hypothesis-detail { height:auto; max-height:none; overflow:visible; padding:22px 0 30px; border-top:1px solid var(--dsw-alias-border-l2); border-left:0; }
[data-rg-root] .rg-hypothesis-detail > * { max-width:960px; }
[data-rg-root] .rg-hypothesis-detail > .rg-hypothesis-detail-head { max-width:1100px; }
[data-rg-root] .rg-hypothesis-detail-head h3 { max-width:32ch; margin:7px 0 2px; font-size:19px; font-weight:550; line-height:1.4; text-wrap:balance; }
[data-rg-root] .rg-hypothesis-detail .rg-finance-block > h4,[data-rg-root] .rg-hypothesis-review h4 { margin:0; color:var(--dsw-alias-label-primary); font-size:14px; font-weight:550; line-height:1.5; }
[data-rg-root] .rg-hypothesis-thesis { grid-template-columns:minmax(0,1fr) minmax(130px,.24fr) minmax(130px,.24fr); gap:14px 20px; margin:18px 0 2px; }
[data-rg-root] .rg-hypothesis-thesis > div:first-child,[data-rg-root] .rg-hypothesis-thesis > div:last-child { grid-column:1 / -1; }
[data-rg-root] .rg-hypothesis-thesis dt { color:var(--dsw-alias-label-tertiary); font-size:10.5px; }
[data-rg-root] .rg-hypothesis-thesis dd { margin:5px 0 0; color:var(--dsw-alias-label-primary); font-size:14px; line-height:1.75; overflow-wrap:anywhere; white-space:normal; }
[data-rg-root] .rg-hypothesis-thesis-copy { max-width:76ch; }
[data-rg-root] .rg-hypothesis-markdown { min-width:0; max-width:100%; white-space:normal; overflow-wrap:anywhere; }
[data-rg-root] .rg-hypothesis-markdown h1,[data-rg-root] .rg-hypothesis-markdown h2,[data-rg-root] .rg-hypothesis-markdown h3,[data-rg-root] .rg-hypothesis-markdown h4,[data-rg-root] .rg-hypothesis-markdown h5,[data-rg-root] .rg-hypothesis-markdown h6 { max-width:32ch; color:var(--dsw-alias-label-primary); text-wrap:balance; }
[data-rg-root] .rg-hypothesis-markdown h1 { margin:0 0 12px; font-size:20px; line-height:1.35; }
[data-rg-root] .rg-hypothesis-markdown h2 { margin:20px 0 10px; font-size:18px; line-height:1.4; }
[data-rg-root] .rg-hypothesis-markdown h3 { margin:18px 0 8px; font-size:16px; line-height:1.45; }
[data-rg-root] .rg-hypothesis-markdown h4,[data-rg-root] .rg-hypothesis-markdown h5,[data-rg-root] .rg-hypothesis-markdown h6 { margin:14px 0 7px; font-size:14px; line-height:1.5; }
[data-rg-root] .rg-hypothesis-markdown p { margin:10px 0; }
[data-rg-root] .rg-hypothesis-markdown > :first-child { margin-top:0 !important; }
[data-rg-root] .rg-hypothesis-markdown > :last-child { margin-bottom:0 !important; }
[data-rg-root] .rg-hypothesis-criteria { display:grid; gap:7px; margin:0; padding:0; list-style:none; }
[data-rg-root] .rg-hypothesis-criteria > li { position:relative; padding-left:13px; }
[data-rg-root] .rg-hypothesis-criteria > li::before { content:'\\2022'; position:absolute; top:0; left:0; color:var(--dsw-alias-label-tertiary); }
[data-rg-root] .rg-hypothesis-criteria .rg-hypothesis-markdown { color:var(--dsw-alias-label-primary); font-size:13px; line-height:1.7; }
[data-rg-root] .rg-hypothesis-criteria .rg-hypothesis-markdown p { margin:0; }

@media (max-width:900px) {
  [data-rg-root] .rg-hypothesis-ai-head { flex-direction:column; gap:12px; }
  [data-rg-root] .rg-hypothesis-cutoff { width:100%; justify-items:start; }
  [data-rg-root] .rg-hypothesis-ai-actions { grid-template-columns:minmax(0,1fr); }
  [data-rg-root] .rg-hypothesis-ai-actions > button { min-height:0; border-right:0; border-bottom:1px solid var(--dsw-alias-border-l1); }
  [data-rg-root] .rg-hypothesis-ai-actions > button:last-child { border-bottom:0; }
}
@media (max-width:720px) {
  [data-rg-root] .rg-view-columns { grid-template-columns:minmax(0,1fr); gap:18px; }
  [data-rg-root] .rg-view-unassigned-body .rg-hypothesis-list > button { grid-template-columns:minmax(0,1fr); }
  [data-rg-root] .rg-hypothesis-detail-head h3 { max-width:100%; font-size:18px; }
  [data-rg-root] .rg-hypothesis-thesis { grid-template-columns:repeat(2,minmax(0,1fr)); }
  [data-rg-root] .rg-hypothesis-thesis > div:first-child,[data-rg-root] .rg-hypothesis-thesis > div:last-child { grid-column:1 / -1; }
}
`
