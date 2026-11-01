export const CATALOG_STYLE = `
/* Finance workflows and Computer gallery */
.rg-finance-catalog,
.rg-finance-apps {
  width: 100%;
  max-width: 1240px;
  margin: 0 auto;
  padding: 18px 0 52px;
  color: var(--dsw-alias-label-primary);
}
.rg-finance-catalog button,
.rg-finance-apps button {
  color: inherit;
}
.rg-catalog-group {
  border-top: 1px solid var(--dsw-alias-border-l2);
  padding: 26px 0 4px;
}
.rg-catalog-group:first-child {
  border-top: 0;
  padding-top: 4px;
}
.rg-catalog-group-head {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  align-items: start;
  gap: 0;
  margin-bottom: 16px;
}
.rg-apps-card-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: none;
  color: var(--dsw-alias-brand-primary);
  background: var(--dsw-alias-bg-layer-2);
  border: 1px solid var(--dsw-alias-border-l2);
}
.rg-catalog-connector-copy {
  min-width: 0;
}
.rg-catalog-connector-title {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
}
.rg-catalog-connector-title h2 {
  margin: 0;
  font-size: 17px;
  line-height: 26px;
  font-weight: 650;
}
.rg-catalog-connector-copy > p {
  max-width: 680px;
  margin: 3px 0 0;
  color: var(--dsw-alias-label-secondary);
  font-size: 13px;
  line-height: 20px;
}
.rg-catalog-status {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 24px;
  padding: 2px 8px;
  border: 1px solid var(--dsw-alias-border-l2);
  border-radius: 999px;
  background: var(--dsw-alias-bg-layer-1);
  color: var(--dsw-alias-label-secondary);
  font-size: 11px;
  line-height: 16px;
  white-space: nowrap;
}
button.rg-catalog-status:hover {
  color: var(--dsw-alias-label-primary);
  background: var(--dsw-alias-interactive-bg-hover);
}
.rg-catalog-status-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--dsw-alias-label-tertiary);
}
.rg-catalog-status[data-state='public'] .rg-catalog-status-dot {
  background: var(--dsw-alias-state-success-primary);
}
.rg-catalog-status[data-state='local'] .rg-catalog-status-dot {
  background: var(--dsw-static-deepseek-500, var(--dsw-alias-brand-primary));
}
.rg-catalog-status[data-state='locked'] {
  color: var(--dsw-alias-label-tertiary);
}
.rg-catalog-status[data-state='locked'] .rg-catalog-status-dot {
  background: var(--dsw-alias-state-warning-primary);
}
.rg-catalog-dependency {
  max-width: 760px;
  margin: 9px 0 0;
  padding: 8px 10px;
  color: var(--dsw-alias-label-secondary);
  background: var(--dsw-alias-bg-layer-2);
  border-left: 2px solid var(--dsw-alias-state-warning-primary);
  font-size: 12px;
  line-height: 18px;
}
.rg-catalog-view-all {
  min-width: 24px;
  height: 20px;
  padding: 1px 6px;
  border: 1px solid var(--dsw-alias-border-l2);
  border-radius: 999px;
  background: var(--dsw-alias-bg-layer-2);
  color: var(--dsw-alias-label-tertiary);
  font-size: 10px;
  line-height: 16px;
  text-align: center;
  white-space: nowrap;
}
.rg-catalog-view-all:hover {
  color: var(--dsw-alias-label-secondary);
}
.rg-catalog-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
}
[data-rg-root] .rg-finance-catalog .rg-catalog-task {
  display: grid;
  grid-template-rows: 126px minmax(0, 1fr);
  align-content: start;
  gap: 0;
  min-width: 0;
  min-height: 230px;
  padding: 6px;
  overflow: hidden;
  border: 1px solid var(--dsw-alias-border-l2);
  border-radius: 12px;
  background: var(--dsw-alias-bg-layer-1);
  text-align: left;
  transition: background-color 150ms ease-out, border-color 150ms ease-out, transform 150ms ease-out;
}
[data-rg-root] .rg-finance-catalog .rg-catalog-task:hover,
[data-rg-root] .rg-finance-catalog .rg-catalog-task:focus-visible,
[data-rg-root] .rg-finance-catalog .rg-catalog-task[data-active] {
  border-color: var(--dsw-alias-border-l3);
  border-radius: 12px;
  background: color-mix(in srgb, var(--dsw-alias-interactive-bg-hover) 72%, var(--dsw-alias-bg-layer-1));
  transform: translateY(-1px);
}
.rg-catalog-task[aria-disabled='true'] {
  cursor: default;
}
.rg-catalog-artwork {
  position: relative;
  display: block;
  min-width: 0;
  overflow: hidden;
  border-radius: 8px;
  background: var(--dsw-alias-bg-layer-2);
  color: var(--dsw-alias-brand-primary);
}
.rg-catalog-artwork-meta {
  position: absolute;
  z-index: 1;
  top: 8px;
  right: 8px;
  left: 9px;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  color: var(--dsw-alias-label-tertiary);
  font-size: 9px;
  line-height: 14px;
}
.rg-catalog-artwork-meta > span:last-child {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  border: 1px solid var(--dsw-alias-border-l2);
  border-radius: 50%;
  background: color-mix(in srgb, var(--dsw-alias-bg-layer-1) 82%, transparent);
  opacity: 0;
  transform: translate(-2px, 2px);
  transition: opacity 150ms ease-out, transform 150ms ease-out;
}
.rg-catalog-artwork-meta svg {
  width: 12px;
  height: 12px;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.4;
  stroke-linecap: round;
  stroke-linejoin: round;
}
.rg-catalog-task:hover .rg-catalog-artwork-meta > span:last-child,
.rg-catalog-task:focus-visible .rg-catalog-artwork-meta > span:last-child {
  opacity: 1;
  transform: none;
}
.rg-skill-art {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
  image-rendering: pixelated;
}
.rg-catalog-task-copy {
  display: flex;
  flex-direction: column;
  min-width: 0;
  padding: 11px 8px 8px;
}
.rg-catalog-task-copy strong {
  display: -webkit-box;
  overflow: hidden;
  color: var(--dsw-alias-label-primary);
  font-size: 14px;
  line-height: 19px;
  font-weight: 620;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}
.rg-catalog-task-copy > span {
  display: -webkit-box;
  overflow: hidden;
  margin-top: 5px;
  color: var(--dsw-alias-label-secondary);
  font-size: 12px;
  line-height: 18px;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}
.rg-catalog-task-copy code {
  display: block;
  overflow: hidden;
  margin-top: auto;
  padding-top: 10px;
  color: var(--dsw-alias-label-tertiary);
  font-size: 10px;
  line-height: 14px;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.rg-catalog-task-meta {
  display: flex;
  gap: 6px;
  margin-top: 7px;
  color: var(--dsw-alias-label-tertiary);
  font-size: 10px;
  line-height: 14px;
}
.rg-skill-preview {
  position: fixed;
  inset: auto;
  margin: 0;
  width: min(332px, calc(100vw - 24px));
  max-height: calc(100vh - 24px);
  overflow: auto;
  padding: 17px 18px;
  border: 1px solid var(--dsw-alias-border-l2);
  border-radius: 10px;
  background: var(--dsw-alias-bg-layer-1);
  color: var(--dsw-alias-label-primary);
  font: inherit;
  line-height: 1.6;
}
.rg-skill-preview > strong { display: block; font-size: 14px; font-weight: 600; }
.rg-skill-preview > code { display: block; margin-top: 3px; color: var(--dsw-alias-label-tertiary); font-size: 11px; overflow-wrap: anywhere; }
.rg-skill-preview > p { margin: 12px 0; color: var(--dsw-alias-label-secondary); font-size: 12px; }
.rg-skill-preview dl { display: grid; gap: 8px; margin: 0 0 14px; font-size: 12px; }
.rg-skill-preview dl > div { display: grid; grid-template-columns: 38px minmax(0, 1fr); gap: 8px; }
.rg-skill-preview dt { color: var(--dsw-alias-label-tertiary); }
.rg-skill-preview dd { margin: 0; color: var(--dsw-alias-label-secondary); }
.rg-skill-preview > footer { padding-top: 10px; border-top: 1px solid var(--dsw-alias-border-l2); color: var(--dsw-alias-label-tertiary); font-size: 11px; }
.rg-catalog-empty,
.rg-catalog-config-empty {
  padding: 16px 12px;
  color: var(--dsw-alias-label-tertiary);
  font-size: 12px;
}
.rg-catalog-config {
  margin: 18px 0 10px;
  padding: 16px;
  border: 1px solid var(--dsw-alias-border-l2);
  border-radius: 8px;
  background: var(--dsw-alias-bg-layer-1);
}
.rg-catalog-config-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 14px;
}
.rg-catalog-config-head h3 {
  margin: 0;
  font-size: 15px;
  line-height: 22px;
}
.rg-catalog-config-head p {
  margin: 3px 0 0;
  color: var(--dsw-alias-label-secondary);
  font-size: 12px;
  line-height: 18px;
}
.rg-catalog-config-close {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  border-radius: 6px;
  color: var(--dsw-alias-label-secondary);
}
.rg-catalog-config-close:hover {
  background: var(--dsw-alias-interactive-bg-hover);
  color: var(--dsw-alias-label-primary);
}
.rg-catalog-config-form {
  display: grid;
  gap: 12px;
}
.rg-catalog-config-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(180px, 0.55fr);
  gap: 12px;
}
.rg-catalog-config label {
  display: grid;
  gap: 5px;
  color: var(--dsw-alias-label-secondary);
  font-size: 11px;
}
.rg-catalog-config input[type='text'],
.rg-catalog-config input[type='search'],
.rg-catalog-config textarea,
.rg-catalog-config select {
  width: 100%;
  min-height: 34px;
  border-color: var(--dsw-alias-border-l2);
  background: var(--dsw-alias-bg-layer-2);
}
.rg-catalog-config textarea {
  resize: vertical;
}
.rg-catalog-materials {
  min-width: 0;
  border: 1px solid var(--dsw-alias-border-l1);
  border-radius: 7px;
}
.rg-catalog-materials-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 8px 10px;
  border-bottom: 1px solid var(--dsw-alias-border-l1);
}
.rg-catalog-materials-head strong {
  font-size: 12px;
}
.rg-catalog-materials-head span {
  color: var(--dsw-alias-label-tertiary);
  font-size: 11px;
}
.rg-catalog-material-search {
  padding: 8px 10px 4px;
}
.rg-catalog-material-list {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 2px 8px;
  max-height: 164px;
  overflow: auto;
  padding: 4px 8px 9px;
}
.rg-catalog-material {
  display: grid;
  grid-template-columns: 16px minmax(0, 1fr);
  gap: 7px;
  min-width: 0;
  padding: 6px;
  border-radius: 5px;
  cursor: pointer;
}
.rg-catalog-material:hover {
  background: var(--dsw-alias-interactive-bg-hover);
}
.rg-catalog-material input {
  margin: 3px 0 0;
}
.rg-catalog-material span {
  min-width: 0;
}
.rg-catalog-material b,
.rg-catalog-material code {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.rg-catalog-material b {
  color: var(--dsw-alias-label-primary);
  font-size: 11px;
  font-weight: 500;
}
.rg-catalog-material code {
  color: var(--dsw-alias-label-tertiary);
  font-size: 10px;
}
.rg-catalog-question-preview {
  margin: 0;
  padding: 9px 10px;
  color: var(--dsw-alias-label-tertiary);
  background: var(--dsw-alias-bg-layer-2);
  border-radius: 6px;
  font-size: 11px;
  line-height: 17px;
}
.rg-catalog-config-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
}
.rg-catalog-config-actions > span {
  margin-right: auto;
  color: var(--dsw-alias-label-tertiary);
  font-size: 11px;
}

/* Apps uses the same text-first density, with a compact gallery at the top. */
.rg-apps-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 16px;
}
.rg-apps-toolbar h1 {
  margin: 0;
  font-size: 20px;
  line-height: 28px;
  font-weight: 650;
}
.rg-apps-toolbar-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}
.rg-apps-new {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 34px;
  padding: 5px 12px;
  border: 1px solid var(--dsw-alias-border-l2);
  border-radius: 999px;
  background: var(--dsw-alias-bg-layer-1);
  color: var(--dsw-alias-label-secondary);
  font-size: 12px;
}
.rg-apps-new:hover {
  color: var(--dsw-alias-label-primary);
  background: var(--dsw-alias-interactive-bg-hover);
}
.rg-apps-gallery {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16px;
}
.rg-apps-card {
  display: grid;
  grid-template-rows: 146px auto;
  min-width: 0;
  overflow: hidden;
  text-align: left;
  border: 1px solid var(--dsw-alias-border-l2);
  border-radius: 10px;
  background: var(--dsw-alias-bg-layer-1);
  transition: border-color 120ms ease-out, transform 120ms ease-out, box-shadow 120ms ease-out;
}
.rg-apps-card:hover,
.rg-apps-card:focus-visible {
  border-color: var(--dsw-alias-border-l3);
  box-shadow: 0 6px 18px color-mix(in srgb, var(--dsw-alias-label-primary) 8%, transparent);
  transform: translateY(-1px);
}
.rg-apps-preview {
  position: relative;
  overflow: hidden;
  padding: 14px;
  background:
    linear-gradient(145deg, var(--dsw-alias-bg-layer-2), var(--dsw-alias-bg-base));
  border-bottom: 1px solid var(--dsw-alias-border-l1);
}
.rg-apps-preview::after {
  position: absolute;
  inset: 0;
  content: '';
  background: linear-gradient(120deg, transparent 35%, color-mix(in srgb, var(--dsw-alias-bg-layer-1) 78%, transparent) 35% 58%, transparent 58%);
  opacity: 0.58;
  pointer-events: none;
}
.rg-apps-preview-grid {
  display: grid;
  grid-template-columns: 72px minmax(0, 1fr);
  gap: 10px;
  height: 100%;
  opacity: 0.9;
}
.rg-apps-preview-nav,
.rg-apps-preview-panel {
  border: 1px solid var(--dsw-alias-border-l1);
  border-radius: 6px;
  background: color-mix(in srgb, var(--dsw-alias-bg-layer-1) 86%, transparent);
}
.rg-apps-preview-nav {
  display: grid;
  align-content: start;
  gap: 7px;
  padding: 9px;
}
.rg-apps-preview-nav i {
  display: block;
  height: 5px;
  border-radius: 2px;
  background: var(--dsw-alias-border-l2);
}
.rg-apps-preview-nav i:first-child {
  width: 26px;
  height: 7px;
  background: var(--dsw-alias-brand-primary);
}
.rg-apps-preview-panel {
  position: relative;
  display: grid;
  align-content: start;
  gap: 7px;
  padding: 10px;
}
.rg-apps-preview-panel strong {
  color: var(--dsw-alias-label-secondary);
  font-size: 9px;
  font-weight: 600;
}
.rg-apps-mini-bars {
  display: flex;
  align-items: end;
  gap: 4px;
  height: 42px;
  padding: 4px 0;
  border-bottom: 1px solid var(--dsw-alias-border-l1);
}
.rg-apps-mini-bars i {
  flex: 1;
  min-width: 3px;
  border-radius: 2px 2px 0 0;
  background: var(--dsw-alias-brand-primary);
  opacity: 0.55;
}
.rg-apps-mini-table {
  display: grid;
  grid-template-columns: 1fr 0.8fr 0.6fr;
  gap: 1px;
  overflow: hidden;
  border: 1px solid var(--dsw-alias-border-l1);
  border-radius: 3px;
}
.rg-apps-mini-table i {
  height: 9px;
  background: var(--dsw-alias-bg-layer-2);
}
.rg-apps-mini-table i:nth-child(-n+3) {
  background: var(--dsw-alias-bg-layer-3);
}
.rg-apps-mini-lines {
  display: grid;
  gap: 4px;
  margin-top: 2px;
}
.rg-apps-mini-lines i {
  height: 4px;
  border-radius: 2px;
  background: var(--dsw-alias-border-l2);
}
.rg-apps-mini-lines i:nth-child(2) { width: 82%; }
.rg-apps-mini-lines i:nth-child(3) { width: 61%; }
.rg-apps-card-copy {
  min-width: 0;
  padding: 11px 13px 12px;
}
.rg-apps-card-copy strong {
  display: block;
  overflow: hidden;
  margin-bottom: 3px;
  color: var(--dsw-alias-label-primary);
  font-size: 13px;
  line-height: 18px;
  font-weight: 600;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.rg-apps-card-copy span {
  display: -webkit-box;
  overflow: hidden;
  color: var(--dsw-alias-label-tertiary);
  font-size: 11px;
  line-height: 16px;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}
.rg-apps-lower {
  display: grid;
  grid-template-columns: minmax(0, 1.35fr) minmax(280px, 0.65fr);
  gap: 28px;
  margin-top: 30px;
  padding-top: 22px;
  border-top: 1px solid var(--dsw-alias-border-l2);
}
.rg-apps-section-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 9px;
}
.rg-apps-section-head h2 {
  margin: 0;
  font-size: 15px;
  line-height: 22px;
}
.rg-apps-section-head span {
  color: var(--dsw-alias-label-tertiary);
  font-size: 11px;
}
.rg-apps-skill-list,
.rg-apps-connector-list,
.rg-apps-guide {
  border-top: 1px solid var(--dsw-alias-border-l1);
}
.rg-apps-skill,
.rg-apps-connector {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: 12px;
  width: 100%;
  min-width: 0;
  padding: 10px 4px;
  border-bottom: 1px solid var(--dsw-alias-border-l1);
  text-align: left;
}
.rg-apps-skill:hover,
.rg-apps-connector:hover {
  background: var(--dsw-alias-interactive-bg-hover);
}
.rg-apps-skill-copy,
.rg-apps-connector-copy {
  min-width: 0;
}
.rg-apps-skill-copy strong,
.rg-apps-connector-copy strong {
  display: block;
  overflow: hidden;
  font-size: 12px;
  line-height: 18px;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.rg-apps-skill-copy span,
.rg-apps-connector-copy span {
  display: block;
  overflow: hidden;
  color: var(--dsw-alias-label-tertiary);
  font-size: 10px;
  line-height: 15px;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.rg-apps-connector-dependency {
  grid-column: 1 / -1;
  margin: 0;
  padding: 7px 9px;
  color: var(--dsw-alias-label-secondary);
  background: var(--dsw-alias-bg-layer-2);
  border-left: 2px solid var(--dsw-alias-state-warning-primary);
  font-size: 11px;
  line-height: 17px;
}
.rg-apps-guide {
  padding-top: 10px;
}
.rg-apps-guide p {
  margin: 0 0 10px;
  color: var(--dsw-alias-label-secondary);
  font-size: 12px;
  line-height: 18px;
}
.rg-apps-guide-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 7px;
}

@media (max-width: 900px) {
  .rg-catalog-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .rg-apps-gallery { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .rg-apps-lower { grid-template-columns: 1fr; gap: 22px; }
}
@media (max-width: 640px) {
  .rg-finance-catalog,
  .rg-finance-apps { padding: 10px 0 38px; }
  .rg-catalog-group { padding-top: 20px; }
  .rg-catalog-view-all { grid-column: auto; justify-self: start; }
  .rg-catalog-grid { grid-template-columns: minmax(0, 1fr); gap: 10px; }
  [data-rg-root] .rg-finance-catalog .rg-catalog-task { min-height: 220px; }
  .rg-catalog-config { padding: 12px; }
  .rg-catalog-config-row { grid-template-columns: 1fr; }
  .rg-catalog-material-list { grid-template-columns: 1fr; }
  .rg-catalog-config-actions { align-items: stretch; flex-wrap: wrap; }
  .rg-catalog-config-actions > span { flex-basis: 100%; }
  .rg-apps-toolbar { align-items: flex-start; }
  .rg-apps-toolbar h1 { font-size: 18px; line-height: 24px; }
  .rg-apps-toolbar-actions { flex: none; }
  .rg-apps-gallery { grid-template-columns: minmax(0, 1fr); gap: 12px; }
  .rg-apps-card { grid-template-rows: 132px auto; }
  .rg-apps-lower { margin-top: 24px; }
}
@media (max-width: 390px) {
  .rg-apps-toolbar { flex-wrap: wrap; }
  .rg-apps-toolbar-actions { width: 100%; justify-content: space-between; }
  .rg-apps-new { min-height: 36px; }
  .rg-catalog-connector-title h2 { font-size: 16px; line-height: 22px; }
  .rg-catalog-task-copy strong { font-size: 13px; }
}
@media (prefers-reduced-motion: reduce) {
  [data-rg-root] .rg-finance-catalog .rg-catalog-task,
  .rg-catalog-artwork-meta > span:last-child,
  .rg-apps-card { transition: none; }
}
`
