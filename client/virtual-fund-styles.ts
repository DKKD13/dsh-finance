export const VIRTUAL_FUND_STYLE = `
[data-rg-root] .rg-vfund { container: virtual-fund / inline-size; min-width: 0; max-width: 1500px; margin: 0 auto; padding: 28px 30px 44px; outline: none; }
[data-rg-root] .rg-vfund:focus-visible { outline: 2px solid var(--dsw-alias-brand-primary); outline-offset: 3px; }
[data-rg-root] .rg-vfund-heading { display: flex; align-items: flex-start; justify-content: space-between; gap: 18px; margin-bottom: 20px; }
[data-rg-root] .rg-vfund-heading h2 { margin: 0; font-size: 19px; font-weight: 650; }
[data-rg-root] .rg-vfund-heading h2 > span { margin-left: 10px; color: var(--dsw-alias-label-secondary); font-size: 13px; font-weight: 400; }
[data-rg-root] .rg-vfund-heading p { margin: 7px 0 0; color: var(--dsw-alias-label-secondary); font-size: 13px; }
[data-rg-root] .rg-vfund-demo-label { padding: 5px 8px; color: var(--dsw-alias-label-secondary); border: 1px solid var(--dsw-alias-border-l2); border-radius: 6px; font-size: 11px; white-space: nowrap; }
[data-rg-root] .rg-vfund-tabs { display: flex; gap: 24px; border-bottom: 1px solid var(--dsw-alias-border-l2); }
[data-rg-root] .rg-vfund-tabs > button { padding: 11px 0; background: transparent; border: 0; border-bottom: 2px solid transparent; color: var(--dsw-alias-label-secondary); cursor: pointer; }
[data-rg-root] .rg-vfund-tabs > button[aria-selected='true'] { border-bottom-color: var(--dsw-alias-label-primary); color: var(--dsw-alias-label-primary); font-weight: 600; }
[data-rg-root] .rg-vfund-office-body { position: relative; display: grid; min-width: 0; grid-template-columns: minmax(0, 1fr); gap: 24px; padding-top: 24px; }
[data-rg-root] .rg-vfund-floor { min-width: 0; }
[data-rg-root] .rg-vfund-room-head { display: flex; align-items: center; justify-content: space-between; gap: 20px; padding-bottom: 22px; }
[data-rg-root] .rg-vfund-room-head h3 { margin: 0; font-size: 16px; font-weight: 600; }
[data-rg-root] .rg-vfund-room-head p { margin: 6px 0 0; font-size: 13px; color: var(--dsw-alias-label-secondary); line-height: 1.6; }
[data-rg-root] .rg-vfund-account { display: flex; flex-direction: column; align-items: flex-end; gap: 5px; padding: 8px 0 8px 16px; background: transparent; border: 0; font-size: 13px; cursor: pointer; white-space: nowrap; }
[data-rg-root] .rg-vfund-account > span { font-size: 12px; color: var(--dsw-alias-label-secondary); }
[data-rg-root] .rg-vfund-room { padding: 28px 26px 24px; border: 1px solid var(--dsw-alias-border-l2); border-radius: 12px; background: var(--dsw-alias-bg-layer-1, var(--dsw-alias-bg-base)); }
[data-rg-root] .rg-vfund-lead-row { display: grid; grid-template-columns: minmax(0, 1.4fr) minmax(0, 1fr); align-items: center; gap: 24px; }
[data-rg-root] .rg-vfund-node { display: block; min-width: 0; border: 1px solid var(--dsw-alias-border-l2); border-radius: 10px; padding: 16px; background: var(--dsw-alias-bg-base); color: var(--dsw-alias-label-primary); text-align: left; cursor: pointer; }
[data-rg-root] .rg-vfund-node:focus-visible, [data-rg-root] .rg-vfund-account:focus-visible { outline: 2px solid var(--dsw-alias-brand-primary); outline-offset: 4px; }
[data-rg-root] .rg-vfund-area-title { display:flex; align-items:center; justify-content:space-between; gap:16px; color:var(--dsw-alias-label-secondary); font-size:12px; }
[data-rg-root] .rg-vfund-area-title h4 { margin:0; color:var(--dsw-alias-label-primary); font-size:14px; font-weight:600; }
[data-rg-root] .rg-vfund-analysts { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:22px 20px; }
[data-rg-root] .rg-vfund-station { position:relative; width:100%; min-height:280px; padding:10px 8px 118px; border:0; border-radius:8px; background:transparent; }
[data-rg-root] .rg-vfund-station:hover, [data-rg-root] .rg-vfund-station[data-selected] { background:var(--dsw-alias-interactive-bg-hover); }
[data-rg-root] .rg-vfund-monitor { display:block; padding:7px; border:1px solid var(--dsw-alias-border-l2); border-radius:9px; background:var(--dsw-alias-bg-layer-2, var(--dsw-alias-interactive-bg-hover)); }
[data-rg-root] .rg-vfund-screen { display:block; min-width:0; min-height:165px; border:1px solid var(--dsw-alias-border-l1); border-radius:4px; background:var(--dsw-alias-bg-base); overflow:hidden; }
[data-rg-root] .rg-vfund-screen-bar { display:flex; align-items:center; gap:3px; min-height:25px; padding:0 8px; border-bottom:1px solid var(--dsw-alias-border-l1); color:var(--dsw-alias-label-secondary); }
[data-rg-root] .rg-vfund-screen-bar i { width:3px; height:3px; border-radius:50%; background:var(--dsw-alias-label-tertiary); }
[data-rg-root] .rg-vfund-screen-bar > span { margin-left:4px; font-size:10px; }
[data-rg-root] .rg-vfund-screen-bar small { margin-left:auto; font-size:10px; }
[data-rg-root] .rg-vfund-screen-content { display:block; padding:12px 10px; }
[data-rg-root] .rg-vfund-note-state { display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden; margin-top:12px; color:var(--dsw-alias-label-secondary); font-size:11px; line-height:1.6; }
[data-rg-root] .rg-vfund-screen-content p { display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden; margin:7px 0 0; font-size:12px; line-height:1.7; }
[data-rg-root] .rg-vfund-monitor-neck { display:block; width:16px; height:8px; margin:auto; background:var(--dsw-alias-border-l2); }
[data-rg-root] .rg-vfund-monitor-base { display:block; width:64px; height:4px; margin:auto; border-radius:3px; background:var(--dsw-alias-border-l2); }
[data-rg-root] .rg-vfund-colleague { position:absolute; left:12px; bottom:53px; width:58px; height:58px; }
[data-rg-root] .rg-vfund-colleague img { display:block; width:100%; height:100%; object-fit:contain; image-rendering:pixelated; }
[data-rg-root] .rg-vfund-seat-light { position:absolute; right:1px; bottom:2px; width:6px; height:6px; border:2px solid var(--dsw-alias-bg-base); border-radius:50%; background:var(--dsw-alias-label-tertiary); }
[data-rg-root] .rg-vfund-station[data-working] .rg-vfund-seat-light { background:var(--dsw-alias-brand-primary); }
[data-rg-root] .rg-vfund-desk { position:absolute; left:8px; right:8px; bottom:51px; height:2px; background:var(--dsw-alias-border-l2); }
[data-rg-root] .rg-vfund-nameplate { position:absolute; left:8px; right:8px; bottom:0; display:flex; align-items:center; gap:8px; min-height:42px; }
[data-rg-root] .rg-vfund-nameplate > span:first-child { display:grid; gap:5px; min-width:0; }
[data-rg-root] .rg-vfund-nameplate strong { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; font-size:13px; font-weight:550; }
[data-rg-root] .rg-vfund-nameplate small { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; color:var(--dsw-alias-label-secondary); font-size:11px; }
[data-rg-root] .rg-vfund-inspect { margin-left:auto; color:var(--dsw-alias-label-secondary); font-size:11px; white-space:nowrap; }
[data-rg-root] .rg-vfund-reviewer .rg-vfund-screen { min-height:130px; }
[data-rg-root] .rg-vfund-reviewer .rg-vfund-screen-bar > span { font-size: 10px; }
[data-rg-root] .rg-vfund-legend { display: grid; gap: 8px; margin-top: 20px; color: var(--dsw-alias-label-secondary); font-size: 12px; line-height: 1.6; }
[data-rg-root] .rg-vfund-legend small { font-size: 11px; }
[data-rg-root] .rg-vfund-holdings > .rg-finance-section { padding: 26px 0 0; }
[data-rg-root] .rg-vfund-events { min-width: 0; border-top: 1px solid var(--dsw-alias-border-l2); }
[data-rg-root] .rg-vfund-events > header { display: flex; align-items: center; justify-content: space-between; padding: 14px 0; border-bottom: 1px solid var(--dsw-alias-border-l1); }
[data-rg-root] .rg-vfund-events h3 { margin: 0; font-size: 14px; font-weight: 600; }
[data-rg-root] .rg-vfund-events header > span { color: var(--dsw-alias-label-secondary); font-size: 10px; }
[data-rg-root] .rg-vfund-events ol { margin: 0; padding: 0; list-style: none; max-height: 400px; overflow-y: auto; }
[data-rg-root] .rg-vfund-events li > button { display: grid; grid-template-columns: minmax(0, 1fr); gap: 8px; width: 100%; text-align: left; padding: 14px 0; border: 0; border-bottom: 1px solid var(--dsw-alias-border-l1); background: transparent; cursor: pointer; }
[data-rg-root] .rg-vfund-events li > button:hover { background: var(--dsw-alias-interactive-bg-hover); }
[data-rg-root] .rg-vfund-events time { color: var(--dsw-alias-label-secondary); font-size: 12px; font-variant-numeric: tabular-nums; white-space: nowrap; }
[data-rg-root] .rg-vfund-events li > button > span { display: grid; gap: 5px; min-width: 0; }
[data-rg-root] .rg-vfund-event-label { color: var(--dsw-alias-label-secondary); font-size: 12px; }
[data-rg-root] .rg-vfund-event-text { font-size: 14px; line-height: 1.7; }
[data-rg-root] .rg-vfund-events small { color: var(--dsw-alias-label-secondary); font-size: 12px; overflow-wrap: anywhere; }
[data-rg-root] .rg-vfund-event-empty { padding: 24px 0; color: var(--dsw-alias-label-secondary); font-size: 12px; }
[data-rg-root] .rg-vfund-event-empty button { margin-top: 8px; }
[data-rg-root] .rg-vfund-drawer { position: fixed; z-index: 30; top: 146px; right: 30px; bottom: 28px; width: 380px; max-width: calc(100vw - 60px); background: var(--dsw-alias-bg-base); box-shadow: -12px 6px 30px rgb(0 0 0 / .12); overflow: auto; border-radius: 10px; }
[data-rg-root] .rg-vfund-drawer > header { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; padding: 20px; border-bottom: 1px solid var(--dsw-alias-border-l2); }
[data-rg-root] .rg-vfund-drawer-portrait { width: 56px; height: 56px; object-fit: contain; image-rendering: pixelated; flex: none; }
[data-rg-root] .rg-vfund-drawer > header > div { flex: 1; }
[data-rg-root] .rg-vfund-drawer h3 { margin: 0; font-size: 16px; }
[data-rg-root] .rg-vfund-drawer header p { margin: 5px 0 0; color: var(--dsw-alias-label-secondary); font-size: 11px; }
[data-rg-root] .rg-vfund-drawer header .rg-btn { display: inline-flex; padding: 4px; }
[data-rg-root] .rg-vfund-drawer-body { padding: 0 20px 24px; }
[data-rg-root] .rg-vfund-drawer-body section { padding: 18px 0; border-bottom: 1px solid var(--dsw-alias-border-l1); }
[data-rg-root] .rg-vfund-drawer h4 { margin: 0 0 10px; font-size: 12px; }
[data-rg-root] .rg-vfund-drawer p, [data-rg-root] .rg-vfund-drawer blockquote { margin: 0; font-size: 14px; line-height: 1.75; }
[data-rg-root] .rg-vfund-drawer blockquote { margin-top: 12px; color: var(--dsw-alias-label-secondary); }
[data-rg-root] .rg-vfund-drawer dl { display: grid; grid-template-columns: 74px minmax(0, 1fr); gap: 12px; margin: 12px 0; font-size: 13px; line-height: 1.7; }
[data-rg-root] .rg-vfund-drawer dt { color: var(--dsw-alias-label-secondary); }
[data-rg-root] .rg-vfund-drawer dd { margin: 0; overflow-wrap: anywhere; }
[data-rg-root] .rg-vfund-drawer .rg-vfund-new-memory { margin-top: 12px; color: var(--dsw-alias-brand-primary); }
[data-rg-root] .rg-vfund-output + .rg-vfund-output { margin-top: 12px; }
[data-rg-root] .rg-vfund-output small { color: var(--dsw-alias-label-secondary); font-size: 10px; }
[data-rg-root] .rg-vfund-drawer-body > .rg-btn { width: 100%; margin-top: 18px; }
@container virtual-fund (min-width: 960px) {
  [data-rg-root] .rg-vfund-office-body { grid-template-columns: minmax(0, 1fr) 248px; gap: 24px; }
  [data-rg-root] .rg-vfund-events { padding-left: 20px; border-top: 0; border-left: 1px solid var(--dsw-alias-border-l2); }
  [data-rg-root] .rg-vfund-events ol { max-height: 1000px; }
}
@container virtual-fund (max-width: 760px) {
  [data-rg-root] .rg-vfund-analysts { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  [data-rg-root] .rg-vfund-memory-row { grid-template-columns: minmax(0, 1fr); }
}

[data-rg-root] .rg-vfund-heading-actions { display:flex; align-items:center; gap:12px; }
[data-rg-root] .rg-vfund-heading-actions .rg-btn { min-height:36px; padding:8px 14px; border-radius:9px; font-size:13px; }
[data-rg-root] .rg-vfund-welcome { display:flex; flex-direction:column; align-items:center; justify-content:center; min-height:460px; padding:48px 24px; text-align:center; }
[data-rg-root] .rg-vfund-welcome h3 { margin:18px 0 10px; font-size:24px; font-weight:600; letter-spacing:-.04em; }
[data-rg-root] .rg-vfund-welcome p { max-width:420px; margin:0 0 26px; font-size:14px; line-height:1.85; color:var(--dsw-alias-label-secondary); }
[data-rg-root] .rg-vfund-welcome-team { display:flex; align-items:flex-end; gap:12px; }
[data-rg-root] .rg-vfund-welcome-team img { width:72px; height:72px; object-fit:contain; image-rendering:pixelated; }
[data-rg-root] .rg-vfund-welcome-team img:nth-child(2) { width:92px; height:92px; }
[data-rg-root] .rg-vfund-loading, [data-rg-root] .rg-vfund-error { padding:28px 0; font-size:14px; color:var(--dsw-alias-label-secondary); }
[data-rg-root] .rg-vfund-error { display:flex; align-items:center; gap:12px; }
[data-rg-root] .rg-vfund-fund-summary { display:flex; flex-wrap:wrap; align-items:center; gap:24px; padding:0 0 26px; }
[data-rg-root] .rg-vfund-fund-identity { display:flex; align-items:center; gap:12px; margin-right:auto; }
[data-rg-root] .rg-vfund-fund-identity > img { width:68px; height:68px; object-fit:contain; image-rendering:pixelated; }
[data-rg-root] .rg-vfund-fund-identity span, [data-rg-root] .rg-vfund-fund-identity p { font-size:12px; color:var(--dsw-alias-label-secondary); margin:5px 0 0; }
[data-rg-root] .rg-vfund-fund-identity h3 { font-size:18px; font-weight:600; margin:5px 0 0; }
[data-rg-root] .rg-vfund-fund-summary > dl { display:flex; gap:28px; margin:0; }
[data-rg-root] .rg-vfund-fund-summary dt { font-size:12px; color:var(--dsw-alias-label-secondary); }
[data-rg-root] .rg-vfund-fund-summary dd { margin:6px 0 0; font-size:19px; font-variant-numeric:tabular-nums; letter-spacing:-.025em; }
[data-rg-root] .rg-vfund-text-button { display:inline-flex; align-items:center; padding:6px 0; border:0; background:transparent; color:var(--dsw-alias-label-primary); font-size:13px; cursor:pointer; }
[data-rg-root] .rg-vfund-text-button:hover { text-decoration:underline; text-underline-offset:4px; }
[data-rg-root] .rg-vfund-room .rg-vfund-area-title { margin:0 0 24px; padding:0; border:0; }
[data-rg-root] .rg-vfund-coverage { display:flex; gap:10px; flex-wrap:wrap; min-height:30px; }
[data-rg-root] .rg-vfund-coverage > span { display:inline-flex; gap:7px; align-items:center; font-size:13px; }
[data-rg-root] .rg-vfund-coverage .rg-pf-monogram { width:22px; height:22px; border-radius:5px; }
[data-rg-root] .rg-vfund-coverage img { width:22px; height:22px; object-fit:contain; }
[data-rg-root] .rg-vfund-archive { margin-top:28px; padding-top:24px; border-top:1px solid var(--dsw-alias-border-l2); }
[data-rg-root] .rg-vfund-archive h4 { font-size:14px; margin-bottom:16px; }
[data-rg-root] .rg-vfund-archive-grid { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:10px; }
[data-rg-root] .rg-vfund-archive-grid > button { display:flex; align-items:center; gap:10px; padding:14px 12px; text-align:left; border:1px solid var(--dsw-alias-border-l2); border-radius:9px; background:var(--dsw-alias-bg-base); color:var(--dsw-alias-label-primary); cursor:pointer; }
[data-rg-root] .rg-vfund-archive-grid > button:hover { background:var(--dsw-alias-interactive-bg-hover); }
[data-rg-root] .rg-vfund-archive-grid > button > span:nth-child(2) { display:grid; gap:5px; }
[data-rg-root] .rg-vfund-archive-grid > button > span:last-child { margin-left:auto; color:var(--dsw-alias-label-secondary); }
[data-rg-root] .rg-vfund-archive-grid strong { font-size:13px; font-weight:550; }
[data-rg-root] .rg-vfund-archive-grid small { font-size:12px; color:var(--dsw-alias-label-secondary); }
[data-rg-root] .rg-vfund-drawer-actions { display:flex; gap:10px; padding:20px 0 0; }
[data-rg-root] .rg-vfund-drawer-actions > .rg-btn:first-child { flex:1; }
[data-rg-root] .rg-vfund-drawer-symbols { display:flex; flex-wrap:wrap; gap:12px; margin-top:18px; }
[data-rg-root] .rg-vfund-drawer-symbols > span { display:flex; align-items:center; gap:8px; font-size:13px; }
[data-rg-root] .rg-vfund-output > strong { font-size:14px; font-weight:600; }
[data-rg-root] .rg-vfund-output { font-size:14px; line-height:1.8; }
[data-rg-root] .rg-vfund-output :is(h1,h2,h3,h4) { font-size:15px; margin:16px 0 8px; }
`
