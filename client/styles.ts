import { FINANCE_SHELL_STYLE } from './finance-shell-styles.ts'
import { DISCOVERY_STYLE } from './finance-discovery-styles.ts'
import { SCREENING_STYLE } from './finance-screening-styles.ts'
import { EVENTS_STYLE } from './finance-events-styles.ts'
import { CATALOG_STYLE } from './finance-catalog-styles.ts'
import { GRAPH_POLISH_STYLE } from './graph-polish-styles.ts'
import { FINANCE_FINISH_STYLE } from './finance-finish-styles.ts'
import { ASSET_STYLE } from './finance-asset-styles.ts'
import { FINANCE_REFINEMENT_STYLE } from './finance-refinement-styles.ts'
import { LIBRARY_STYLE } from './library-styles.ts'
import { STOCK_SHELL_STYLE } from './finance-stock-shell-styles.ts'
import { STOCK_CHART_STYLE } from './finance-stock-chart-styles.ts'
import { STOCK_DETAIL_STYLE } from './finance-stock-detail-styles.ts'
import { STOCK_SECTIONS_STYLE } from './finance-stock-sections-styles.ts'
import { FINANCE_ASIDE_CONTEXT_STYLE } from './finance-aside-context-styles.ts'
import { STOCK_FOLLOW_STYLE } from './finance-stock-follow-styles.ts'
import { VIEWPOINT_STYLE } from './viewpoint-styles.ts'
import { REPORT_HISTORY_STYLE } from './report-history-styles.ts'
import { VIRTUAL_FUND_STYLE } from './virtual-fund-styles.ts'
import { VIRTUAL_FUND_OVERVIEW_STYLE } from './virtual-fund-overview-styles.ts'

/**
 * The workbench stylesheet, injected once as a `<style data-plugin>` tag.
 * All colors, radii, and rings come from the shell's `--dsw-*` token layer so
 * the page follows the DSH theme (light and dark) exactly; the only custom
 * values are the categorical node-kind accents, mapped onto the shell's
 * static hue families.
 * @module dsh-research-graph/client/styles
 */

export const STYLE_TEXT = `
[data-rg-root] {
  --rg-kind-skill: var(--dsw-static-deepseek-500, rgb(65, 118, 230));
  --rg-kind-reference: var(--dsw-static-blue-500, rgb(59, 130, 246));
  --rg-kind-persona: var(--dsw-static-violet-500, rgb(139, 92, 246));
  --rg-kind-script: var(--dsw-static-neutral-500, rgb(107, 114, 128));
  --rg-kind-signal: var(--dsw-static-amber-500, rgb(245, 158, 11));
  --rg-kind-source: var(--dsw-static-green-500, rgb(34, 150, 84));
  --rg-kind-raw: var(--dsw-static-neutral-400, rgb(156, 163, 175));
  --rg-kind-session: var(--dsw-static-blue-400, rgb(96, 165, 250));
  --rg-kind-claim: var(--dsw-static-red-500, rgb(239, 68, 68));
  --rg-kind-question: var(--dsw-static-violet-300, rgb(167, 139, 250));
  --rg-kind-belief: var(--dsw-static-green-700, rgb(21, 110, 61));
  --rg-kind-memory: var(--dsw-static-amber-700, rgb(180, 117, 15));
  --rg-kind-deliverable: var(--dsw-static-deepseek-300, rgb(183, 200, 254));
  --rg-kind-instrument: var(--dsw-static-deepseek-600, rgb(45, 95, 190));
  --rg-kind-portfolio: var(--dsw-static-violet-600, rgb(112, 72, 190));
  --rg-kind-position: var(--dsw-static-blue-600, rgb(42, 108, 190));
  --rg-kind-valuation: var(--dsw-static-green-600, rgb(30, 135, 75));
  --rg-kind-catalyst: var(--dsw-static-amber-600, rgb(200, 125, 15));
  --rg-kind-prediction: var(--dsw-static-red-600, rgb(205, 65, 75));
  --rg-edge-holds: var(--dsw-static-violet-500, rgb(139, 92, 246));
  --rg-edge-exposure_to: var(--dsw-static-blue-500, rgb(59, 130, 246));
  --rg-edge-values: var(--dsw-static-green-500, rgb(34, 150, 84));
  --rg-edge-catalyzes: var(--dsw-static-amber-500, rgb(245, 158, 11));
  --rg-edge-resolves: var(--dsw-static-red-500, rgb(239, 68, 68));

  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  background: var(--dsw-alias-bg-base);
  color: var(--dsw-alias-label-primary);
  font-family: var(--dsh-font-family-text-default, inherit);
  font-size: 13px;
  line-height: 1.5;
  outline: none;
}
[data-rg-root] *, [data-rg-root] *::before, [data-rg-root] *::after { box-sizing: border-box; }
[data-rg-root] button {
  font: inherit;
  color: inherit;
  background: none;
  border: none;
  padding: 0;
  cursor: pointer;
}
[data-rg-root] button:disabled { cursor: default; opacity: 0.45; }
[data-rg-root] button:focus-visible, [data-rg-root] input:focus-visible,
[data-rg-root] select:focus-visible, [data-rg-root] textarea:focus-visible,
[data-rg-root] [tabindex]:focus-visible {
  outline: none;
  box-shadow: 0 0 0 var(--dsw-focus-ring-width, 2px) var(--dsw-alias-brand-primary);
  border-radius: var(--dsw-radius-sm, 6px);
}
[data-rg-root] input, [data-rg-root] select, [data-rg-root] textarea {
  font: inherit;
  color: var(--dsw-alias-label-primary);
  background: var(--dsw-alias-bg-layer-1);
  border: 1px solid var(--dsw-alias-border-l2);
  border-radius: var(--dsw-radius-sm, 6px);
  padding: 5px 8px;
}
[data-rg-root] input::placeholder, [data-rg-root] textarea::placeholder { color: var(--dsw-alias-label-tertiary); }
[data-rg-root] code, [data-rg-root] pre { font-family: var(--ds-font-family-code, monospace); }

/* Header */
.rg-header {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px 12px;
  padding: 10px 16px;
  border-bottom: 1px solid var(--dsw-alias-border-l2);
  background: var(--dsw-alias-bg-layer-1);
}
.rg-title { font-size: 15px; font-weight: 600; margin: 0; }
.rg-revision {
  font-family: var(--ds-font-family-code, monospace);
  font-size: 11px;
  color: var(--dsw-alias-label-tertiary);
}
.rg-stats { color: var(--dsw-alias-label-secondary); font-size: 12px; }
.rg-spacer { flex: 1; }
.rg-search { min-width: 220px; flex: 0 1 320px; }
.rg-tabs { display: flex; gap: 2px; background: var(--dsw-alias-bg-layer-2); border-radius: var(--dsw-radius-md, 8px); padding: 2px; }
.rg-tab {
  padding: 4px 12px;
  border-radius: var(--dsw-radius-sm, 6px);
  color: var(--dsw-alias-label-secondary);
  font-size: 12px;
}
.rg-tab:hover { background: var(--dsw-alias-interactive-bg-hover); }
.rg-tab[data-active] { background: var(--dsw-alias-bg-layer-1); color: var(--dsw-alias-label-primary); font-weight: 500; }
.rg-btn {
  padding: 5px 10px;
  border-radius: var(--dsw-radius-sm, 6px);
  color: var(--dsw-alias-label-secondary);
  border: 1px solid var(--dsw-alias-border-l2);
  background: var(--dsw-alias-bg-layer-1);
  font-size: 12px;
  white-space: nowrap;
}
.rg-btn:hover:not(:disabled) { background: var(--dsw-alias-interactive-bg-hover); color: var(--dsw-alias-label-primary); }
.rg-btn[data-primary] {
  background: var(--dsw-alias-button-primary-fill);
  color: var(--dsw-alias-label-primary-inverted);
  border-color: transparent;
}
.rg-btn[data-primary]:hover:not(:disabled) { background: var(--dsw-alias-button-primary-hover); }
.rg-btn[data-danger] { color: var(--dsw-alias-state-error-primary); }
.rg-btn[data-danger]:hover:not(:disabled) { background: var(--dsw-alias-interactive-bg-hover-danger); }
.rg-icon-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: var(--dsw-radius-sm, 6px);
  color: var(--dsw-alias-label-secondary);
  background: var(--dsw-alias-bg-layer-1);
  border: 1px solid var(--dsw-alias-border-l2);
}
.rg-icon-btn:hover:not(:disabled) { background: var(--dsw-alias-interactive-bg-hover); color: var(--dsw-alias-label-primary); }

/* Body split: map over ledger */
.rg-body { flex: 1; min-height: 0; display: flex; flex-direction: column; position: relative; }
.rg-canvas-wrap { flex: 1; min-height: 0; position: relative; overflow: hidden; }
.rg-canvas { display: block; width: 100%; height: 100%; touch-action: none; }
.rg-canvas[data-panning] { cursor: grabbing; }
.rg-canvas { cursor: grab; }
.rg-canvas-controls {
  position: absolute;
  left: 12px;
  bottom: 12px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.rg-canvas-hint {
  position: absolute;
  right: 12px;
  bottom: 12px;
  font-size: 11px;
  color: var(--dsw-alias-label-tertiary);
  background: var(--dsw-alias-bg-layer-1);
  border: 1px solid var(--dsw-alias-border-l2);
  border-radius: var(--dsw-radius-sm, 6px);
  padding: 3px 8px;
  pointer-events: none;
}
.rg-empty-canvas {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--dsw-alias-label-tertiary);
  font-size: 13px;
  pointer-events: none;
}

/* SVG nodes and edges */
.rg-edge { stroke: var(--dsw-alias-border-l3); stroke-width: 1.2; fill: none; }
.rg-edge[data-dimmed] { opacity: 0.18; }
.rg-edge[data-highlight] { stroke: var(--dsw-alias-brand-primary); stroke-width: 1.8; }
.rg-edge[data-selected] { stroke: var(--dsw-alias-brand-primary); stroke-width: 2.2; }
.rg-edge-hit { stroke: transparent; stroke-width: 14; fill: none; cursor: pointer; }
.rg-edge-label {
  font-size: 10px;
  fill: var(--dsw-alias-label-tertiary);
  paint-order: stroke;
  stroke: var(--dsw-alias-bg-base);
  stroke-width: 3px;
  text-anchor: middle;
  pointer-events: none;
}
.rg-node { cursor: pointer; }
.rg-node circle.rg-node-dot { fill: var(--rg-node-color, var(--dsw-alias-label-tertiary)); stroke: var(--dsw-alias-bg-base); stroke-width: 2; }
.rg-node[data-dimmed] { opacity: 0.22; }
.rg-node text {
  fill: var(--dsw-alias-label-secondary);
  text-anchor: middle;
  pointer-events: none;
  paint-order: stroke;
  stroke: var(--dsw-alias-bg-base);
  stroke-width: 3px;
}
.rg-node[data-highlight] text, .rg-node:hover text { fill: var(--dsw-alias-label-primary); font-weight: 500; }
.rg-node circle.rg-node-ring {
  fill: none;
  stroke: var(--dsw-alias-brand-primary);
  stroke-width: 2;
}
.rg-node:focus-visible { outline: none; }
.rg-node:focus-visible circle.rg-node-dot { stroke: var(--dsw-alias-brand-primary); stroke-width: 3; }

/* Filter bar */
.rg-filters {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 6px;
  align-items: center;
  padding: 6px 16px;
  border-bottom: 1px solid var(--dsw-alias-border-l2);
  background: var(--dsw-alias-bg-layer-1);
  max-height: 96px;
  overflow-y: auto;
}
.rg-filter-group-label { font-size: 11px; color: var(--dsw-alias-label-tertiary); margin-right: 2px; }
.rg-chip {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 2px 8px;
  border-radius: 999px;
  border: 1px solid var(--dsw-alias-border-l2);
  color: var(--dsw-alias-label-secondary);
  font-size: 11px;
  white-space: nowrap;
}
.rg-chip:hover { background: var(--dsw-alias-interactive-bg-hover); }
.rg-chip[data-on] {
  border-color: var(--rg-chip-color, var(--dsw-alias-brand-primary));
  color: var(--dsw-alias-label-primary);
  background: var(--dsw-alias-bg-layer-2);
}
.rg-chip-dot { width: 7px; height: 7px; border-radius: 50%; background: var(--rg-chip-color, currentColor); flex: none; }

/* Ledger */
.rg-ledger {
  border-top: 1px solid var(--dsw-alias-border-l2);
  background: var(--dsw-alias-bg-layer-1);
  height: 188px;
  display: flex;
  flex-direction: column;
  min-height: 0;
}
.rg-ledger-head {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 16px;
  color: var(--dsw-alias-label-tertiary);
  font-size: 11px;
  border-bottom: 1px solid var(--dsw-alias-border-l2);
}
.rg-ledger-rows { overflow-y: auto; flex: 1; min-height: 0; }
.rg-row {
  display: grid;
  grid-template-columns: 110px 1fr auto;
  gap: 12px;
  width: 100%;
  text-align: left;
  padding: 5px 16px;
  align-items: center;
  border-bottom: 1px solid var(--dsw-alias-border-l1);
}
.rg-row:hover { background: var(--dsw-alias-interactive-bg-hover); }
.rg-row[data-selected] { background: var(--dsw-alias-bg-multi-select); }
.rg-row-title { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.rg-row-id { color: var(--dsw-alias-label-tertiary); font-family: var(--ds-font-family-code, monospace); font-size: 11px; }
.rg-row-time { color: var(--dsw-alias-label-tertiary); font-size: 11px; white-space: nowrap; }

/* Inspector */
.rg-inspector {
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  width: 348px;
  max-width: 90%;
  background: var(--dsw-alias-bg-layer-1);
  border-left: 1px solid var(--dsw-alias-border-l2);
  box-shadow: -12px 0 28px -18px rgba(0, 0, 0, 0.35);
  display: flex;
  flex-direction: column;
  min-height: 0;
  z-index: 3;
}
.rg-inspector-head {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 12px 14px 8px;
  border-bottom: 1px solid var(--dsw-alias-border-l2);
}
.rg-inspector-title { margin: 0; font-size: 14px; font-weight: 600; flex: 1; word-break: break-word; }
.rg-inspector-body { overflow-y: auto; flex: 1; min-height: 0; padding: 10px 14px 16px; }
.rg-inspector-actions { display: flex; gap: 6px; padding: 8px 14px; border-top: 1px solid var(--dsw-alias-border-l2); flex-wrap: wrap; }
.rg-section { margin-top: 14px; }
.rg-section-title {
  font-size: 11px;
  font-weight: 600;
  color: var(--dsw-alias-label-tertiary);
  margin: 0 0 6px;
}
.rg-content {
  white-space: pre-wrap;
  word-break: break-word;
  font-size: 12.5px;
  color: var(--dsw-alias-label-primary);
  max-height: 260px;
  overflow-y: auto;
  background: var(--dsw-alias-bg-layer-2);
  border-radius: var(--dsw-radius-sm, 6px);
  padding: 8px 10px;
  margin: 0;
}
.rg-content-markdown { white-space: normal; }
.rg-content[data-empty] { color: var(--dsw-alias-label-tertiary); font-style: italic; background: none; padding: 0; }
.rg-meta { font-size: 11px; overflow-x: auto; margin: 0; color: var(--dsw-alias-label-secondary); }
.rg-edge-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 2px; }
.rg-edge-item {
  display: flex;
  align-items: center;
  gap: 6px;
  width: 100%;
  text-align: left;
  padding: 4px 6px;
  border-radius: var(--dsw-radius-sm, 6px);
  font-size: 12px;
}
.rg-edge-item:hover { background: var(--dsw-alias-interactive-bg-hover); }
.rg-edge-select { display: flex; align-items: center; gap: 6px; flex: 1; min-width: 0; text-align: left; }
.rg-edge-kind {
  font-size: 10px;
  color: var(--dsw-alias-label-tertiary);
  border: 1px solid var(--dsw-alias-border-l2);
  border-radius: 999px;
  padding: 0 7px;
  white-space: nowrap;
  flex: none;
}
.rg-edge-target { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.rg-edge-remove { color: var(--dsw-alias-state-error-primary); opacity: 0; flex: none; padding: 0 4px; }
.rg-edge-item:hover .rg-edge-remove, .rg-edge-remove:focus-visible { opacity: 1; }
.rg-kind-chip {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 11px;
  color: var(--dsw-alias-label-secondary);
}
.rg-kind-chip .rg-chip-dot { width: 8px; height: 8px; }

/* Edge popover */
.rg-edge-popover {
  position: absolute;
  z-index: 4;
  background: var(--dsw-alias-bg-layer-3);
  border: 1px solid var(--dsw-alias-border-l2);
  border-radius: var(--dsw-radius-md, 8px);
  box-shadow: 0 10px 28px -12px rgba(0, 0, 0, 0.4);
  padding: 8px 10px;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
}

/* History */
.rg-history { flex: 1; min-height: 0; display: flex; overflow: hidden; }
.rg-history-list { width: 380px; max-width: 46%; border-right: 1px solid var(--dsw-alias-border-l2); overflow-y: auto; }
.rg-history-item {
  display: block;
  width: 100%;
  text-align: left;
  padding: 8px 16px;
  border-bottom: 1px solid var(--dsw-alias-border-l1);
}
.rg-history-item:hover { background: var(--dsw-alias-interactive-bg-hover); }
.rg-history-item[data-selected] { background: var(--dsw-alias-bg-multi-select); }
.rg-history-op { font-family: var(--ds-font-family-code, monospace); font-size: 11px; color: var(--dsw-alias-state-business-primary); }
.rg-history-summary { font-size: 12px; color: var(--dsw-alias-label-primary); margin-top: 1px; }
.rg-history-meta { font-size: 11px; color: var(--dsw-alias-label-tertiary); margin-top: 2px; display: flex; gap: 8px; }
.rg-history-detail { flex: 1; min-width: 0; overflow-y: auto; padding: 14px 18px; }
.rg-history-range { display: flex; align-items: center; gap: 6px; margin-bottom: 12px; flex-wrap: wrap; }
.rg-history-range input { width: 76px; }
.rg-diff-group { margin-bottom: 14px; }
.rg-diff-title { font-size: 12px; font-weight: 600; margin: 0 0 6px; }
.rg-diff-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 2px; }
.rg-diff-list button {
  text-align: left;
  font-family: var(--ds-font-family-code, monospace);
  font-size: 11.5px;
  padding: 2px 6px;
  border-radius: var(--dsw-radius-sm, 6px);
  color: var(--dsw-alias-label-secondary);
}
.rg-diff-list button:hover { background: var(--dsw-alias-interactive-bg-hover); color: var(--dsw-alias-label-primary); }
.rg-diff-list [data-added] { color: var(--dsw-alias-state-success-primary); }
.rg-diff-list [data-removed] { color: var(--dsw-alias-state-error-primary); }
.rg-history-note { color: var(--dsw-alias-state-warn-primary); font-size: 12px; margin-bottom: 10px; }

/* Audit */
.rg-audit { flex: 1; min-height: 0; overflow-y: auto; padding: 14px 18px; }
.rg-audit-clean {
  color: var(--dsw-alias-state-success-primary);
  padding: 24px 0;
  text-align: center;
}
.rg-audit-count {
  font-family: var(--ds-font-family-code, monospace);
  color: var(--dsw-alias-label-tertiary);
  margin-left: 6px;
}
.rg-audit-list { list-style: none; margin: 0 0 16px; padding: 0; display: flex; flex-direction: column; gap: 2px; }
.rg-audit-list button {
  text-align: left;
  font-family: var(--ds-font-family-code, monospace);
  font-size: 11.5px;
  padding: 3px 6px;
  border-radius: var(--dsw-alias-sm, 6px);
  color: var(--dsw-alias-label-secondary);
  width: 100%;
}
.rg-audit-list button:hover { background: var(--dsw-alias-interactive-bg-hover); color: var(--dsw-alias-label-primary); }
.rg-audit-list .rg-warn { color: var(--dsw-alias-state-warn-primary); }

/* Dialogs */
.rg-overlay {
  position: fixed;
  inset: 0;
  background: var(--dsw-alias-bg-mask-2);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10;
}
.rg-dialog {
  background: var(--dsw-alias-bg-layer-1);
  border: 1px solid var(--dsw-alias-border-l2);
  border-radius: var(--dsw-radius-lg, 12px);
  box-shadow: 0 24px 64px -24px rgba(0, 0, 0, 0.5);
  width: 440px;
  max-width: calc(100vw - 48px);
  max-height: calc(100vh - 96px);
  display: flex;
  flex-direction: column;
  padding: 16px;
}
.rg-dialog-title { margin: 0 0 12px; font-size: 14px; font-weight: 600; word-break: break-all; }
.rg-form { display: flex; flex-direction: column; gap: 10px; overflow-y: auto; min-height: 0; }
.rg-field { display: flex; flex-direction: column; gap: 4px; }
.rg-field-label { font-size: 11px; color: var(--dsw-alias-label-tertiary); }
.rg-field-hint { font-size: 11px; color: var(--dsw-alias-label-tertiary); }
.rg-field-error { font-size: 11px; color: var(--dsw-alias-state-error-primary); }
.rg-form textarea { min-height: 96px; resize: vertical; }
.rg-dialog-actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 14px; }
.rg-dialog-body { color: var(--dsw-alias-label-secondary); font-size: 12.5px; }

/* States */
.rg-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  color: var(--dsw-alias-label-tertiary);
  padding: 32px;
  text-align: center;
}
.rg-state-title { color: var(--dsw-alias-label-primary); font-weight: 600; margin: 0; }
.rg-state-detail { font-family: var(--ds-font-family-code, monospace); font-size: 11.5px; color: var(--dsw-alias-state-error-primary); word-break: break-all; }
.rg-skeleton {
  height: 12px;
  width: min(320px, 60%);
  border-radius: 6px;
  background: var(--dsw-alias-bg-skeleton);
}

/* Toast */
.rg-toast {
  position: absolute;
  top: 12px;
  right: 12px;
  z-index: 8;
  max-width: min(420px, 80%);
  background: var(--dsw-alias-toast-bg);
  color: var(--dsw-alias-toast-label);
  border-radius: var(--dsw-radius-md, 8px);
  padding: 8px 12px;
  font-size: 12px;
  box-shadow: 0 12px 32px -12px rgba(0, 0, 0, 0.45);
  word-break: break-word;
}
.rg-toast[data-tone='error'] { color: var(--dsw-alias-state-error-secondary); }

/* Finance workspace */
.rg-edge { stroke: var(--rg-edge-color, var(--dsw-alias-border-l3)); }
.rg-kind-label { color: var(--dsw-alias-label-secondary); }
.rg-node-finance-icon { color: var(--dsw-alias-label-primary-inverted); pointer-events: none; }
.rg-finance-kind-icon, .rg-finance-edge-icon { display: inline-block; flex: none; vertical-align: -2px; }
.rg-finance-workspace { flex: 1; min-height: 0; display: grid; grid-template-columns: 176px minmax(0, 1fr); position: relative; }
.rg-finance-nav { min-height: 0; overflow-y: auto; padding: 12px 8px; background: var(--dsw-alias-bg-layer-1); border-right: 1px solid var(--dsw-alias-border-l2); }
.rg-finance-nav-title { padding: 2px 8px 12px; font-size: 13px; font-weight: 600; display: flex; flex-direction: column; gap: 2px; }
.rg-finance-nav-title span { color: var(--dsw-alias-label-tertiary); font-family: var(--ds-font-family-code, monospace); font-size: 10px; font-weight: 400; }
.rg-finance-nav button { display: block; width: 100%; padding: 6px 9px; text-align: left; border-radius: var(--dsw-radius-sm, 6px); color: var(--dsw-alias-label-secondary); font-size: 12px; white-space: nowrap; }
.rg-finance-nav button:hover { background: var(--dsw-alias-interactive-bg-hover); color: var(--dsw-alias-label-primary); }
.rg-finance-nav button[data-active] { background: var(--dsw-alias-bg-layer-2); color: var(--dsw-alias-label-primary); font-weight: 500; }
.rg-finance-nav .rg-finance-nav-refresh { margin-top: 12px; border-top: 1px solid var(--dsw-alias-border-l2); border-radius: 0; padding-top: 12px; color: var(--dsw-alias-label-tertiary); }
.rg-finance-main { min-width: 0; min-height: 0; overflow-y: auto; position: relative; }
.rg-finance-section { width: 100%; max-width: 1500px; padding: 18px 22px 42px; }
.rg-finance-section-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; margin-bottom: 16px; }
.rg-finance-section-head h2 { margin: 0; font-size: 16px; line-height: 1.4; font-weight: 600; }
.rg-finance-section-head p { margin: 4px 0 0; max-width: 75ch; color: var(--dsw-alias-label-secondary); font-size: 12px; }
.rg-finance-section h3 { margin: 0 0 10px; font-size: 13px; font-weight: 600; }
.rg-finance-section h4 { margin: 0 0 8px; font-size: 12px; font-weight: 600; }
.rg-finance-block { padding: 16px 0; border-top: 1px solid var(--dsw-alias-border-l2); min-width: 0; }
.rg-finance-block-description { margin: -4px 0 12px; color: var(--dsw-alias-label-secondary); font-size: 12px; max-width: 75ch; }
.rg-finance-block-heading { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 10px; }
.rg-finance-block-heading h3 { margin: 0; }
.rg-finance-two-column { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 22px; }
.rg-finance-two-column > .rg-finance-block { min-width: 0; }
.rg-workflow-next { display: flex; align-items: center; justify-content: space-between; gap: 18px; margin: 4px 0 22px; padding: 16px 0; border-top: 1px solid var(--dsw-alias-border-l2); border-bottom: 1px solid var(--dsw-alias-border-l2); }
.rg-workflow-next > div:first-child { min-width: 0; }
.rg-workflow-next h3 { margin: 0 0 4px; font-size: 15px; }
.rg-workflow-next p { max-width: 72ch; margin: 0; color: var(--dsw-alias-label-secondary); font-size: 12px; }
.rg-workflow-next-actions { display: flex; flex: none; flex-wrap: wrap; justify-content: flex-end; gap: 8px; }
.rg-workflow-layout { display: grid; grid-template-columns: minmax(320px, .9fr) minmax(360px, 1.1fr); gap: 28px; }
.rg-workflow-ledger, .rg-workflow-recent { min-width: 0; }
.rg-workflow-ledger > h3, .rg-workflow-recent > h3 { margin: 0 0 10px; }
.rg-workflow-ledger ol { list-style: none; margin: 0; padding: 0; border-top: 1px solid var(--dsw-alias-border-l2); }
.rg-workflow-ledger li { border-bottom: 1px solid var(--dsw-alias-border-l1); }
.rg-workflow-ledger li > button { display: flex; align-items: center; justify-content: space-between; gap: 12px; width: 100%; min-height: 58px; padding: 9px 6px; text-align: left; border-radius: var(--dsw-radius-sm, 6px); }
.rg-workflow-ledger li > button:hover, .rg-workflow-recent > div > button:hover { background: var(--dsw-alias-interactive-bg-hover); }
.rg-workflow-ledger li[data-state='next'] > button { background: var(--dsw-alias-bg-multi-select); }
.rg-workflow-ledger li > button > span:first-child { min-width: 0; }
.rg-workflow-ledger strong { display: block; margin-bottom: 3px; font-size: 13px; }
.rg-workflow-ledger strong + span { color: var(--dsw-alias-label-secondary); font-size: 11px; }
.rg-workflow-ledger .rg-finance-badge[data-status='complete'] { color: var(--dsw-alias-state-success-primary); }
.rg-workflow-ledger .rg-finance-badge[data-status='next'] { color: var(--dsw-alias-label-primary); border-color: var(--dsw-alias-border-l3); }
.rg-workflow-ledger .rg-finance-block-description { margin-top: 10px; }
.rg-workflow-recent > div { border-top: 1px solid var(--dsw-alias-border-l2); }
.rg-workflow-recent > div > button { display: grid; grid-template-columns: auto minmax(0, 1fr) auto; align-items: center; gap: 6px 10px; width: 100%; padding: 10px 6px; text-align: left; border-bottom: 1px solid var(--dsw-alias-border-l1); border-radius: var(--dsw-radius-sm, 6px); }
.rg-workflow-recent-title { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.rg-workflow-recent-title code { display: block; overflow: hidden; text-overflow: ellipsis; color: var(--dsw-alias-label-tertiary); font-size: 10px; }
.rg-workflow-recent time { color: var(--dsw-alias-label-tertiary); font-family: var(--ds-font-family-code, monospace); font-size: 10px; white-space: nowrap; }
.rg-workflow-recent .rg-finance-node-provenance { grid-column: 2 / -1; color: var(--dsw-alias-label-tertiary); font-size: 10px; overflow-wrap: anywhere; }

.rg-finance-node-provenance { grid-column: 2; color: var(--dsw-alias-label-tertiary); font-size: 10px; overflow-wrap: anywhere; }
.rg-finance-form { display: flex; flex-direction: column; gap: 12px; }
.rg-finance-fields-inline { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 10px; align-items: end; }
.rg-finance-field { display: flex; flex-direction: column; gap: 4px; min-width: 0; }
.rg-finance-field input, .rg-finance-field select, .rg-finance-field textarea { width: 100%; min-height: 31px; }
.rg-finance-field-label { color: var(--dsw-alias-label-secondary); font-size: 11px; }
.rg-finance-field-hint { color: var(--dsw-alias-label-tertiary); font-size: 10px; }
.rg-finance-form-actions { display: flex; justify-content: flex-end; gap: 8px; }
.rg-finance-form-error { margin: 0; color: var(--dsw-alias-state-error-primary); font-size: 11px; overflow-wrap: anywhere; }
.rg-finance-json { min-height: 300px; resize: vertical; font-family: var(--ds-font-family-code, monospace); font-size: 11px; line-height: 1.55; tab-size: 2; }
.rg-finance-metadata-fields { border: 0; border-top: 1px solid var(--dsw-alias-border-l1); padding: 12px 0 0; margin: 0; min-width: 0; }
.rg-finance-metadata-fields legend { padding: 0 6px 0 0; color: var(--dsw-alias-label-secondary); font-size: 11px; }
.rg-finance-metadata-fields > .rg-finance-field { margin-top: 10px; }
.rg-finance-operation { min-height: 28px; display: flex; align-items: center; gap: 8px; margin: 6px 0; color: var(--dsw-alias-label-tertiary); font-size: 11px; overflow-wrap: anywhere; }
.rg-finance-operation[data-status='success'] { color: var(--dsw-alias-state-success-primary); }
.rg-finance-operation[data-status='error'] { color: var(--dsw-alias-state-error-primary); }
.rg-finance-inline-skeleton { display: inline-block; width: 72px; height: 9px; border-radius: 4px; background: var(--dsw-alias-bg-skeleton); }
.rg-finance-result { margin-top: 10px; min-width: 0; }
.rg-finance-summary { display: flex; flex-wrap: wrap; gap: 4px 22px; margin: 0 0 12px; }
.rg-finance-summary > div { min-width: 108px; padding: 4px 0; }
.rg-finance-summary dt { color: var(--dsw-alias-label-tertiary); font-size: 10px; }
.rg-finance-summary dd { margin: 2px 0 0; color: var(--dsw-alias-label-primary); font-size: 12px; overflow-wrap: anywhere; }
.rg-finance-table-wrap { max-width: 100%; overflow-x: auto; margin: 8px 0 12px; }
.rg-finance-table { width: 100%; min-width: 560px; border-collapse: collapse; text-align: left; font-size: 11px; font-variant-numeric: tabular-nums; }
.rg-finance-table th { padding: 6px 9px; color: var(--dsw-alias-label-tertiary); font-weight: 500; border-bottom: 1px solid var(--dsw-alias-border-l2); white-space: nowrap; }
.rg-finance-table td { padding: 7px 9px; border-bottom: 1px solid var(--dsw-alias-border-l1); color: var(--dsw-alias-label-secondary); vertical-align: top; overflow-wrap: anywhere; }
.rg-finance-table tbody tr:hover { background: var(--dsw-alias-interactive-bg-hover); }
.rg-finance-table-note { color: var(--dsw-alias-label-tertiary); font-size: 10px; }
.rg-finance-subsection { margin-top: 16px; }
.rg-finance-provenance { margin: 12px 0; padding-top: 10px; border-top: 1px solid var(--dsw-alias-border-l1); }
.rg-finance-section-label { display: block; margin-bottom: 6px; color: var(--dsw-alias-label-secondary); font-size: 11px; font-weight: 500; }
.rg-finance-provenance dl { display: flex; flex-wrap: wrap; gap: 5px 18px; margin: 0; }
.rg-finance-provenance dl > div { min-width: 130px; max-width: 100%; }
.rg-finance-provenance dt { display: inline; color: var(--dsw-alias-label-tertiary); font-size: 10px; }
.rg-finance-provenance dd { display: inline; margin: 0 0 0 5px; color: var(--dsw-alias-label-secondary); font-family: var(--ds-font-family-code, monospace); font-size: 10px; overflow-wrap: anywhere; }
.rg-finance-provenance-empty { color: var(--dsw-alias-label-tertiary); font-size: 10px; }
.rg-finance-raw { margin: 10px 0; }
.rg-finance-raw summary { cursor: pointer; color: var(--dsw-alias-label-secondary); font-size: 11px; }
.rg-finance-raw pre { max-height: 380px; overflow: auto; padding: 10px; background: var(--dsw-alias-bg-layer-2); border-radius: var(--dsw-radius-sm, 6px); color: var(--dsw-alias-label-secondary); font-size: 10.5px; line-height: 1.5; white-space: pre-wrap; overflow-wrap: anywhere; }
.rg-finance-empty { padding: 20px 8px; color: var(--dsw-alias-label-tertiary); font-size: 12px; text-align: center; border-top: 1px solid var(--dsw-alias-border-l1); }
.rg-finance-badge { display: inline-flex; align-items: center; min-height: 22px; padding: 1px 7px; border: 1px solid var(--dsw-alias-border-l2); border-radius: 999px; color: var(--dsw-alias-label-secondary); font-family: var(--ds-font-family-code, monospace); font-size: 10px; white-space: nowrap; }
.rg-finance-record { border-top: 1px solid var(--dsw-alias-border-l1); padding: 8px 0; }
.rg-finance-record > summary { display: grid; grid-template-columns: minmax(140px, 1fr) auto; gap: 3px 10px; align-items: center; cursor: pointer; padding: 5px; border-radius: var(--dsw-radius-sm, 6px); }
.rg-finance-record > summary:hover { background: var(--dsw-alias-interactive-bg-hover); }
.rg-finance-record > summary code { color: var(--dsw-alias-label-tertiary); font-size: 10px; overflow-wrap: anywhere; }
.rg-finance-record > summary .rg-finance-node-provenance { grid-column: 1 / -1; }
.rg-finance-search-results article, .rg-finance-prediction-list article, .rg-finance-saved-list article { padding: 10px 4px; border-top: 1px solid var(--dsw-alias-border-l1); }
.rg-finance-search-results article > div, .rg-finance-prediction-list article > div, .rg-finance-saved-list article > div { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
.rg-finance-search-results code, .rg-finance-prediction-list code, .rg-finance-saved-list code { color: var(--dsw-alias-label-tertiary); font-size: 10px; overflow-wrap: anywhere; }
.rg-finance-search-results p, .rg-finance-prediction-list p, .rg-finance-saved-list p { max-height: 96px; overflow: auto; white-space: pre-wrap; color: var(--dsw-alias-label-secondary); font-size: 11px; }
.rg-finance-saved-list article > .rg-prediction-summary, .rg-finance-prediction-list article > .rg-prediction-summary { display: block; margin: 12px 0; }
.rg-prediction-summary > p { max-height: none; margin: 0 0 12px; font-size: 13px; line-height: 1.6; overflow-wrap: anywhere; }
.rg-prediction-summary .rg-finance-summary { margin-bottom: 10px; }
.rg-prediction-summary .rg-finance-summary dt { font-size: 12px; }
.rg-prediction-summary .rg-finance-summary dd { font-size: 14px; font-variant-numeric: tabular-nums; }
.rg-prediction-summary .rg-finance-raw summary { font-size: 12px; }
.rg-finance-timeline { list-style: none; padding: 0; margin: 0; }
.rg-finance-timeline li { display: grid; grid-template-columns: minmax(130px, .45fr) minmax(160px, 1fr); gap: 12px; padding: 9px 0; border-top: 1px solid var(--dsw-alias-border-l1); }
.rg-finance-timeline time { color: var(--dsw-alias-label-tertiary); font-family: var(--ds-font-family-code, monospace); font-size: 10px; overflow-wrap: anywhere; }
.rg-finance-timeline strong, .rg-finance-timeline code { display: block; }
.rg-finance-timeline code { color: var(--dsw-alias-label-tertiary); font-size: 10px; }
.rg-finance-timeline .rg-finance-node-provenance { display: block; margin-top: 3px; }
.rg-finance-edge-legend { display: inline-flex; gap: 10px; }
.rg-finance-edge-legend > span { display: inline-flex; align-items: center; gap: 4px; }

/* Financial SVG charts and linked module views */
.rg-chart-frame { min-width: 0; margin: 16px 0 20px; }
.rg-chart-frame-head { display: flex; align-items: flex-start; flex-wrap: wrap; gap: 8px 12px; margin-bottom: 10px; }
.rg-chart-frame-head > div:first-child { flex: 1; min-width: 180px; }
.rg-chart-frame-head h3 { margin: 0; }
.rg-chart-frame-head p { margin: 3px 0 0; max-width: 75ch; color: var(--dsw-alias-label-secondary); font-size: 11px; }
.rg-chart-controls { flex: none; max-width: 100%; }
.rg-chart-meta { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 5px 16px; margin: 6px 0; color: var(--dsw-alias-label-tertiary); font-size: 10px; }
.rg-chart-legend { display: flex; flex-wrap: wrap; gap: 6px 14px; }
.rg-chart-legend > span { display: inline-flex; align-items: center; gap: 5px; }
.rg-chart-legend > span::before { content: ''; width: 12px; height: 2px; background: var(--dsw-alias-state-business-primary); }
.rg-chart-legend > span[data-series='volume']::before { background: var(--dsw-alias-label-tertiary); }
.rg-chart-legend > span[data-series='positive']::before { background: var(--dsw-alias-state-success-primary); }
.rg-chart-legend > span[data-series='negative']::before { background: var(--dsw-alias-state-error-primary); }
.rg-chart-legend > span[data-series='base']::before { height: 8px; border: 2px double var(--dsw-alias-brand-primary); background: none; }
.rg-chart-legend > span[data-series='reference']::before { background: var(--dsw-alias-label-tertiary); border-top: 1px dashed var(--dsw-alias-label-tertiary); }
.rg-chart-canvas { min-width: 0; }
.rg-chart-canvas svg { display: block; max-width: 100%; height: auto; }
.rg-chart-grid { stroke: var(--dsw-alias-border-l1); stroke-width: 1; }
.rg-chart-axis { stroke: var(--dsw-alias-border-l2); stroke-width: 1; }
.rg-chart-zero { stroke: var(--dsw-alias-label-tertiary); stroke-width: 1; }
.rg-chart-axis-label { fill: var(--dsw-alias-label-tertiary); font-size: 10px; font-variant-numeric: tabular-nums; }
.rg-chart-axis-title { fill: var(--dsw-alias-label-secondary); font-size: 10px; }
.rg-chart-line { fill: none; stroke: var(--dsw-alias-state-business-primary); stroke-width: 1.8; stroke-linecap: round; stroke-linejoin: round; }
.rg-chart-line-point { fill: var(--dsw-alias-state-business-primary); }
.rg-chart-candle line { stroke: currentColor; stroke-width: 1.2; }
.rg-chart-candle rect { fill: currentColor; }
.rg-chart-candle[data-direction='up'] { color: var(--dsw-alias-state-success-primary); }
.rg-chart-candle[data-direction='down'] { color: var(--dsw-alias-state-error-primary); }
.rg-chart-volume { fill: var(--dsw-alias-label-tertiary); opacity: .22; }
.rg-chart-crosshair { stroke: var(--dsw-alias-brand-primary); stroke-width: 1; stroke-dasharray: 3 3; pointer-events: none; }
.rg-market-chart { position: relative; min-width: 0; }
.rg-market-chart > svg { width: 100%; touch-action: pan-y; }
.rg-market-chart > svg:focus-visible { outline: none; box-shadow: 0 0 0 var(--dsw-focus-ring-width, 2px) var(--dsw-alias-brand-primary); border-radius: var(--dsw-radius-sm, 6px); }
.rg-chart-tooltip { position: absolute; top: 24px; z-index: 2; width: 220px; max-width: 46%; padding: 8px 10px; transform: translateX(8px); pointer-events: none; background: var(--dsw-alias-bg-layer-3); border: 1px solid var(--dsw-alias-border-l2); border-radius: var(--dsw-radius-md, 8px); box-shadow: 0 10px 24px -14px rgba(0,0,0,.45); font-size: 10px; }
.rg-chart-tooltip[data-side='left'] { transform: translateX(calc(-100% - 8px)); }
.rg-chart-tooltip strong, .rg-chart-tooltip > span { display: block; overflow-wrap: anywhere; }
.rg-chart-tooltip > span { color: var(--dsw-alias-label-tertiary); }
.rg-chart-tooltip dl { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 3px 10px; margin: 6px 0 0; }
.rg-chart-tooltip dl > div { display: flex; justify-content: space-between; gap: 5px; }
.rg-chart-tooltip dt { color: var(--dsw-alias-label-tertiary); }
.rg-chart-tooltip dd { margin: 0; font-variant-numeric: tabular-nums; }
.rg-chart-hint { margin: 6px 0; max-width: 90ch; color: var(--dsw-alias-label-tertiary); font-size: 10px; }
.rg-chart-source { display: grid; grid-template-columns: 64px minmax(0, 1fr); gap: 10px; padding-top: 8px; border-top: 1px solid var(--dsw-alias-border-l1); }
.rg-chart-source > span { color: var(--dsw-alias-label-tertiary); font-size: 10px; padding-top: 12px; }
.rg-chart-source .rg-finance-provenance { margin-top: 0; }
.rg-chart-data { margin-top: 8px; }
.rg-chart-data > summary { cursor: pointer; color: var(--dsw-alias-label-secondary); font-size: 11px; }
.rg-chart-inline-facts { display: flex; flex-wrap: wrap; gap: 6px 24px; margin: 0 0 12px; }
.rg-chart-inline-facts dt { color: var(--dsw-alias-label-tertiary); font-size: 10px; }
.rg-chart-inline-facts dd { margin: 2px 0 0; color: var(--dsw-alias-label-primary); font-size: 12px; font-variant-numeric: tabular-nums; }
.rg-chart-warnings { margin: 10px 0; padding: 8px 10px 8px 28px; background: var(--dsw-alias-bg-layer-2); border-radius: var(--dsw-radius-sm, 6px); color: var(--dsw-alias-state-warn-primary); font-size: 11px; }
.rg-sparkline { width: 180px; }
.rg-sparkline text { fill: var(--dsw-alias-label-tertiary); font-size: 9px; }

.rg-market-layout { display: grid; grid-template-columns: minmax(210px, 250px) minmax(0, 1fr); gap: 24px; }
.rg-market-watchlist, .rg-market-main { min-width: 0; }
.rg-market-watchlist-rows { border-top: 1px solid var(--dsw-alias-border-l1); }
.rg-market-watchlist-rows > article { display: grid; grid-template-columns: minmax(0, 1fr) auto; align-items: center; gap: 6px; border-bottom: 1px solid var(--dsw-alias-border-l1); }
.rg-market-watchlist-select { display: grid; grid-template-columns: auto minmax(0, 1fr); gap: 2px 8px; width: 100%; min-width: 0; padding: 9px 6px; text-align: left; border-radius: var(--dsw-radius-sm, 6px); }
.rg-market-watchlist-select:hover { background: var(--dsw-alias-interactive-bg-hover); }
.rg-market-watchlist-select[data-selected] { background: var(--dsw-alias-bg-multi-select); }
.rg-market-watchlist-rows strong { font-variant-numeric: tabular-nums; }
.rg-market-watchlist-select > span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: var(--dsw-alias-label-secondary); font-size: 11px; }
.rg-market-watchlist-rows .rg-finance-node-provenance { grid-column: 1 / -1; }
.rg-market-watchlist-rows .rg-watchlist-toggle { margin-right: 4px; white-space: nowrap; }
.rg-finance-search-select { align-items: flex-start; gap: 8px; }
.rg-finance-search-select > button:first-child { flex: 1; min-width: 0; padding: 0; text-align: left; }
.rg-finance-search-select > button:first-child:hover strong { text-decoration: underline; }
.rg-finance-search-select .rg-watchlist-toggle { flex: none; white-space: nowrap; }
.rg-market-quote { margin-top: 10px; border-top: 1px solid var(--dsw-alias-border-l1); }
.rg-market-quote-head { display: flex; align-items: flex-start; justify-content: space-between; flex-wrap: wrap; gap: 8px 16px; padding: 12px 0 6px; }
.rg-market-quote-head > div { display: flex; align-items: baseline; flex-wrap: wrap; gap: 4px 10px; }
.rg-market-quote-head strong { font-size: 18px; }
.rg-market-quote-head b { font-size: 24px; font-weight: 600; font-variant-numeric: tabular-nums; }
.rg-market-quote-head span { color: var(--dsw-alias-label-secondary); font-size: 11px; }
.rg-market-quote [data-direction='positive'] { color: var(--dsw-alias-state-success-primary); }
.rg-market-quote [data-direction='negative'] { color: var(--dsw-alias-state-error-primary); }
.rg-market-accordion > summary { display: flex; grid-template-columns: none; justify-content: space-between; }
.rg-finance-subtabs { width: fit-content; max-width: 100%; margin-bottom: 14px; }
.rg-finance-workspace .rg-finance-subtabs { display: flex; gap: 28px; padding: 0; background: transparent; border-radius: 0; border-bottom: 1px solid var(--dsw-alias-border-l2); overflow-x: auto; }
[data-rg-root] .rg-finance-subtabs .rg-tab { flex: none; padding: 10px 0 11px; border-radius: 0; border-bottom: 2px solid transparent; background: transparent; color: var(--dsw-alias-label-secondary); font-size: 13px; white-space: nowrap; }
[data-rg-root] .rg-finance-subtabs .rg-tab:hover { color: var(--dsw-alias-label-primary); }
[data-rg-root] .rg-finance-subtabs .rg-tab[aria-selected='true'] { color: var(--dsw-alias-brand-primary); border-bottom-color: var(--dsw-alias-brand-primary); font-weight: 600; }
.rg-finance-manual > summary { padding: 14px 0; border-top: 1px solid var(--dsw-alias-border-l2); color: var(--dsw-alias-label-secondary); cursor: pointer; }
.rg-finance-manual > summary[hidden] { display: none; }

.rg-allocation-bars, .rg-scenario-bars { border-top: 1px solid var(--dsw-alias-border-l1); }
.rg-allocation-row { display: grid; grid-template-columns: minmax(130px, .8fr) minmax(150px, 1fr) minmax(150px, 1fr); align-items: center; gap: 12px; width: 100%; padding: 8px 6px; text-align: left; border-bottom: 1px solid var(--dsw-alias-border-l1); }
.rg-allocation-row:hover, .rg-scenario-bars > button:hover { background: var(--dsw-alias-interactive-bg-hover); }
.rg-allocation-row[data-selected], .rg-scenario-bars > button[data-selected], .rg-finance-table tr[data-selected] { background: var(--dsw-alias-bg-multi-select); }
.rg-allocation-label, .rg-scenario-bars > button > span { min-width: 0; overflow-wrap: anywhere; }
.rg-allocation-label small, .rg-scenario-bars small { display: block; color: var(--dsw-alias-label-tertiary); font-size: 10px; }
.rg-allocation-row svg, .rg-scenario-bars svg { width: 100%; }
.rg-allocation-row svg text, .rg-scenario-bars svg text { fill: var(--dsw-alias-label-secondary); font-size: 8px; font-variant-numeric: tabular-nums; }
.rg-chart-weight { fill: var(--dsw-alias-state-business-primary); opacity: .75; }
.rg-chart-pnl[data-direction='positive'] { fill: var(--dsw-alias-state-success-primary); }
.rg-chart-pnl[data-direction='negative'] { fill: var(--dsw-alias-state-error-primary); }
.rg-scenario-bars > button { display: grid; grid-template-columns: minmax(150px, .65fr) minmax(200px, 1.35fr); align-items: center; gap: 16px; width: 100%; padding: 8px 6px; text-align: left; border-bottom: 1px solid var(--dsw-alias-border-l1); }
.rg-finance-table-link { text-align: left; color: var(--dsw-alias-label-primary); overflow-wrap: anywhere; }
.rg-finance-table-link:hover { text-decoration: underline; }
.rg-chart-matrix-scroll { max-width: 100%; overflow-x: auto; }
.rg-sensitivity-matrix { min-width: 520px; }
.rg-sensitivity-cell { fill: var(--dsw-alias-brand-primary); stroke: var(--dsw-alias-border-l1); }
.rg-sensitivity-matrix [role='button'] { cursor: pointer; }
.rg-sensitivity-matrix [role='button']:hover .rg-sensitivity-cell, .rg-sensitivity-matrix [role='button']:focus-visible .rg-sensitivity-cell { stroke: var(--dsw-alias-brand-primary); stroke-width: 2; }
.rg-sensitivity-matrix [role='button']:focus-visible { outline: none; }
.rg-sensitivity-base-outer, .rg-sensitivity-base-inner { fill: none; stroke: var(--dsw-alias-brand-primary); pointer-events: none; }
.rg-sensitivity-base-outer { stroke-width: 2; }
.rg-sensitivity-base-inner { stroke-width: 1; }
.rg-sensitivity-value { fill: var(--dsw-alias-label-primary); font-size: 12px; font-variant-numeric: tabular-nums; pointer-events: none; }
.rg-chart-selection { margin: 8px 0 0; color: var(--dsw-alias-label-secondary); font-size: 11px; font-variant-numeric: tabular-nums; }
.rg-calibration-plot { width: min(480px, 100%); }
.rg-chart-reference { stroke: var(--dsw-alias-label-tertiary); stroke-width: 1; stroke-dasharray: 4 4; }
.rg-calibration-bin circle { fill: var(--dsw-alias-state-business-primary); fill-opacity: .65; stroke: var(--dsw-alias-bg-base); stroke-width: 1.5; }
.rg-finance-provenance-list { min-width: 0; }
.rg-finance-provenance-name { margin: 4px 0; color: var(--dsw-alias-label-secondary); font-size: 11px; overflow-wrap: anywhere; }
.rg-finance-provenance-name code { display: block; color: var(--dsw-alias-label-tertiary); font-size: 10px; overflow-wrap: anywhere; }
.rg-finance-badge[data-status='stale'] { color: var(--dsw-alias-state-warn-primary); }
.rg-finance-badge[data-status='met'] { color: var(--dsw-alias-state-success-primary); }
.rg-finance-badge[data-status='missing'] { color: var(--dsw-alias-state-warn-primary); }
.rg-finance-badge[data-status='manual'] { color: var(--dsw-alias-label-tertiary); }
.rg-visually-hidden { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; border: 0; }

/* Five-minute guide and first-use nudge */
.rg-workflow-head-actions { display: flex; flex-wrap: wrap; align-items: center; justify-content: flex-end; gap: 8px; }
.rg-guide-nudge { display: flex; align-items: center; justify-content: space-between; gap: 14px; margin: 4px 0 16px; padding: 11px 14px; border: 1px solid var(--dsw-alias-border-l2); border-radius: var(--dsw-radius-md, 8px); background: var(--dsw-alias-bg-layer-2); }
.rg-guide-nudge > div:first-child { min-width: 0; }
.rg-guide-nudge strong { display: block; margin-bottom: 2px; font-size: 12px; }
.rg-guide-nudge p { margin: 0; max-width: 82ch; color: var(--dsw-alias-label-secondary); font-size: 11px; }
.rg-guide-nudge-actions { display: flex; flex: none; flex-wrap: wrap; gap: 6px; }
.rg-guide { padding-top: 22px; }
.rg-guide-hero { display: grid; grid-template-columns: minmax(0, 1fr) auto; align-items: end; gap: 20px 32px; padding-bottom: 18px; border-bottom: 1px solid var(--dsw-alias-border-l2); }
.rg-guide-kicker { margin: 0 0 7px; color: var(--dsw-alias-label-tertiary); font-family: var(--ds-font-family-code, monospace); font-size: 10px; letter-spacing: .08em; }
.rg-guide-hero h2 { margin: 0; max-width: 26ch; font-size: 21px; line-height: 1.25; font-weight: 600; text-wrap: balance; }
.rg-guide-lede { max-width: 70ch; margin: 8px 0 0; color: var(--dsw-alias-label-secondary); font-size: 12.5px; }
.rg-guide-facts { display: flex; flex-wrap: wrap; gap: 4px 14px; margin: 11px 0 0; color: var(--dsw-alias-label-tertiary); font-size: 10.5px; }
.rg-guide-facts > span { display: inline-flex; align-items: center; gap: 5px; }
.rg-guide-facts > span::before { content: ''; width: 4px; height: 4px; border-radius: 50%; background: currentColor; }
.rg-guide-hero-actions { display: flex; flex-wrap: wrap; justify-content: flex-end; gap: 8px; }
.rg-guide-state { display: flex; align-items: center; justify-content: space-between; gap: 14px; margin: 16px 0 24px; padding: 9px 12px; border: 1px solid var(--dsw-alias-border-l2); border-radius: var(--dsw-radius-sm, 6px); background: var(--dsw-alias-bg-layer-1); }
.rg-guide-state[data-empty] { border-inline-start: 2px solid var(--dsw-alias-state-business-primary); }
.rg-guide-state p { margin: 0; max-width: 82ch; color: var(--dsw-alias-label-secondary); font-size: 11.5px; }
.rg-guide-state .rg-btn { flex: none; }
.rg-guide-layout { display: grid; grid-template-columns: minmax(250px, 292px) minmax(0, 1fr); align-items: start; gap: 34px; }
.rg-guide-rail { min-width: 0; }
.rg-guide-block-head { display: flex; align-items: baseline; justify-content: space-between; gap: 10px; }
.rg-guide-block-head h3 { margin: 0 0 4px; font-size: 12px; font-weight: 600; }
.rg-guide-block-note { margin: 0 0 10px; color: var(--dsw-alias-label-tertiary); font-size: 10.5px; }
.rg-guide-roadmap-block { padding-bottom: 18px; }
.rg-guide-roadmap { display: block; width: 100%; max-width: 300px; height: auto; overflow: visible; }
.rg-guide-roadmap-path { fill: none; stroke: var(--dsw-alias-border-l2); stroke-width: 1.2; stroke-dasharray: 3 4; }
.rg-guide-stage { cursor: pointer; outline: none; }
.rg-guide-stage-dot { fill: var(--dsw-alias-bg-layer-1); stroke: var(--dsw-alias-border-l3); stroke-width: 1.4; }
.rg-guide-stage-number { fill: var(--dsw-alias-label-tertiary); font-family: var(--ds-font-family-code, monospace); font-size: 10px; }
.rg-guide-stage-name { fill: var(--dsw-alias-label-secondary); font-size: 11px; font-weight: 500; }
.rg-guide-stage-count { fill: var(--dsw-alias-label-tertiary); font-size: 9.5px; }
.rg-guide-stage-status { fill: var(--dsw-alias-label-tertiary); font-size: 9px; }
.rg-guide-stage[data-state='complete'] .rg-guide-stage-dot { stroke: var(--dsw-alias-state-success-primary); }
.rg-guide-stage[data-state='complete'] .rg-guide-stage-status { fill: var(--dsw-alias-state-success-primary); }
.rg-guide-stage[data-state='next'] .rg-guide-stage-dot { fill: var(--dsw-alias-bg-multi-select); stroke: var(--dsw-alias-state-business-primary); stroke-width: 2; }
.rg-guide-stage[data-state='next'] .rg-guide-stage-name { fill: var(--dsw-alias-label-primary); font-weight: 600; }
.rg-guide-stage[data-state='next'] .rg-guide-stage-status { fill: var(--dsw-alias-label-primary); }
.rg-guide-stage:hover .rg-guide-stage-dot { stroke: var(--dsw-alias-label-primary); }
.rg-guide-stage:focus-visible .rg-guide-stage-dot { stroke: var(--dsw-alias-brand-primary); stroke-width: 3; }
.rg-guide-courses-block { padding-top: 16px; border-top: 1px solid var(--dsw-alias-border-l2); }
.rg-guide-courses { display: flex; flex-direction: column; margin-top: 8px; border-top: 1px solid var(--dsw-alias-border-l2); }
.rg-guide-course { display: grid; grid-template-columns: 22px minmax(0, 1fr) auto; align-items: start; gap: 8px; width: 100%; padding: 10px 6px; text-align: start; border-bottom: 1px solid var(--dsw-alias-border-l1); border-radius: var(--dsw-radius-sm, 6px); }
.rg-guide-course:hover { background: var(--dsw-alias-interactive-bg-hover); }
.rg-guide-course[data-active] { background: var(--dsw-alias-bg-multi-select); }
.rg-guide-course-index { padding-top: 1px; color: var(--dsw-alias-label-tertiary); font-family: var(--ds-font-family-code, monospace); font-size: 10px; }
.rg-guide-course-copy { min-width: 0; }
.rg-guide-course-copy strong { display: block; font-size: 12px; font-weight: 500; line-height: 1.35; }
.rg-guide-course-copy small { display: block; margin-top: 3px; color: var(--dsw-alias-label-tertiary); font-size: 10.5px; line-height: 1.4; }
.rg-guide-course-badge { align-self: center; color: var(--dsw-alias-state-business-primary); font-family: var(--ds-font-family-code, monospace); font-size: 9px; white-space: nowrap; }
.rg-guide-detail { min-width: 0; outline: none; }
.rg-guide-detail-head { padding-bottom: 14px; border-bottom: 1px solid var(--dsw-alias-border-l2); }
.rg-guide-detail-head h3 { margin: 8px 0 5px; font-size: 18px; line-height: 1.3; font-weight: 600; text-wrap: balance; }
.rg-guide-detail-head > p { max-width: 74ch; margin: 0; color: var(--dsw-alias-label-secondary); font-size: 12px; }
.rg-guide-outcome { margin-top: 9px !important; padding-inline-start: 10px; border-inline-start: 2px solid var(--dsw-alias-border-l3); }
.rg-guide-outcome strong { color: var(--dsw-alias-label-primary); }
.rg-guide-cutoff { display: block; margin-top: 3px; color: var(--dsw-alias-label-tertiary); font-family: var(--ds-font-family-code, monospace); font-size: 10px; overflow-wrap: anywhere; }
.rg-guide-text-list { margin: 0; padding-inline-start: 16px; color: var(--dsw-alias-label-secondary); font-size: 11px; }
.rg-guide-text-list li { margin: 3px 0; }
.rg-guide-meta, .rg-guide-steps, .rg-guide-demo, .rg-guide-prompts, .rg-guide-expected, .rg-guide-limits, .rg-guide-jumps { padding: 16px 0; border-bottom: 1px solid var(--dsw-alias-border-l1); }
.rg-guide-meta h4, .rg-guide-steps h4, .rg-guide-demo h4, .rg-guide-prompts h4, .rg-guide-expected h4, .rg-guide-limits h4, .rg-guide-jumps h4 { margin: 0 0 9px; font-size: 12px; font-weight: 600; }
.rg-guide-meta dl { display: grid; gap: 9px; margin: 0; }
.rg-guide-meta dl > div { display: grid; grid-template-columns: 120px minmax(0, 1fr); gap: 12px; }
.rg-guide-meta dt { color: var(--dsw-alias-label-tertiary); font-size: 10.5px; }
.rg-guide-meta dd { min-width: 0; margin: 0; color: var(--dsw-alias-label-secondary); font-size: 11.5px; }
.rg-guide-prerequisites { display: flex; flex-direction: column; gap: 6px; list-style: none; margin: 0; padding: 0; }
.rg-guide-prerequisites li { display: flex; flex-wrap: wrap; align-items: center; gap: 6px 8px; }
.rg-guide-prerequisites .rg-btn { margin-inline-start: auto; }
.rg-guide-steps ol { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 11px; }
.rg-guide-steps li { display: grid; grid-template-columns: 22px minmax(0, 1fr); gap: 9px; }
.rg-guide-step-number { display: inline-flex; align-items: center; justify-content: center; width: 20px; height: 20px; border: 1px solid var(--dsw-alias-border-l2); border-radius: 50%; color: var(--dsw-alias-label-tertiary); font-family: var(--ds-font-family-code, monospace); font-size: 9.5px; }
.rg-guide-steps strong { display: block; font-size: 11.5px; font-weight: 500; }
.rg-guide-steps p { max-width: 78ch; margin: 2px 0 0; color: var(--dsw-alias-label-secondary); font-size: 11px; }
.rg-guide-demo { min-width: 0; }
.rg-guide-demo > p { max-width: 78ch; margin: 0 0 10px; color: var(--dsw-alias-label-secondary); font-size: 11.5px; }
.rg-guide-demo-meta { display: grid; gap: 5px; margin: 0 0 12px; }
.rg-guide-demo-meta > div { display: grid; grid-template-columns: 110px minmax(0, 1fr); gap: 10px; }
.rg-guide-demo-meta dt { color: var(--dsw-alias-label-tertiary); font-size: 10px; }
.rg-guide-demo-meta dd { min-width: 0; margin: 0; color: var(--dsw-alias-label-secondary); font-size: 10.5px; overflow-wrap: anywhere; }
.rg-guide-demo-meta a { color: var(--dsw-alias-state-business-primary); text-underline-offset: 3px; }
.rg-guide-demo-actions { display: flex; flex-wrap: wrap; gap: 6px; }
.rg-guide-copy-status { margin: 7px 0 0; color: var(--dsw-alias-state-success-primary); font-size: 10.5px; }
.rg-guide-copy-status[data-error] { color: var(--dsw-alias-state-error-primary); }
.rg-guide-json { margin-top: 8px; }
.rg-guide-json summary { cursor: pointer; color: var(--dsw-alias-label-secondary); font-size: 10.5px; }
.rg-guide-json pre { max-height: 260px; margin: 8px 0 0; padding: 10px; overflow: auto; border-radius: var(--dsw-radius-sm, 6px); background: var(--dsw-alias-bg-layer-2); color: var(--dsw-alias-label-secondary); font-size: 10px; line-height: 1.5; white-space: pre-wrap; overflow-wrap: anywhere; }
.rg-guide-ticker { display: grid; grid-template-columns: 120px minmax(120px, 220px); align-items: center; gap: 4px 10px; margin: 0 0 12px; }
.rg-guide-ticker > span { color: var(--dsw-alias-label-secondary); font-size: 11px; }
.rg-guide-ticker small { grid-column: 2; color: var(--dsw-alias-label-tertiary); font-size: 10px; }
.rg-guide-prompt { padding: 10px 0; border-top: 1px solid var(--dsw-alias-border-l1); }
.rg-guide-prompt-head { display: flex; align-items: center; justify-content: space-between; gap: 10px; margin-bottom: 6px; }
.rg-guide-prompt-head strong { font-size: 11.5px; font-weight: 500; }
.rg-guide-prompt pre { max-height: 220px; margin: 0; padding: 9px 10px; overflow: auto; border: 1px solid var(--dsw-alias-border-l1); border-radius: var(--dsw-radius-sm, 6px); background: var(--dsw-alias-bg-layer-2); color: var(--dsw-alias-label-secondary); font-size: 10.5px; line-height: 1.55; white-space: pre-wrap; overflow-wrap: anywhere; }
.rg-guide-prompt-note { margin: 5px 0 0; color: var(--dsw-alias-label-tertiary); font-size: 10px; }
.rg-guide-prompt-unavailable { margin: 0; padding: 9px 10px; border: 1px dashed var(--dsw-alias-border-l2); border-radius: var(--dsw-radius-sm, 6px); color: var(--dsw-alias-label-tertiary); font-size: 10.5px; }
.rg-guide-note { margin: 14px 0; padding-inline-start: 10px; border-inline-start: 2px solid var(--dsw-alias-border-l3); color: var(--dsw-alias-label-secondary); font-size: 11px; }
.rg-guide-expected ul { margin: 0; padding-inline-start: 17px; }
.rg-guide-expected li { margin: 3px 0; color: var(--dsw-alias-label-secondary); font-size: 11px; }
.rg-guide-expected p { margin: 0; max-width: 78ch; color: var(--dsw-alias-label-secondary); font-size: 11.5px; }
.rg-guide-limits ul { margin: 0; padding-inline-start: 17px; }
.rg-guide-limits li { margin: 3px 0; color: var(--dsw-alias-label-tertiary); font-size: 10.5px; }
.rg-guide-course-duration { display: block; margin-top: 2px; color: var(--dsw-alias-label-tertiary); font-size: 9.5px; }
.rg-guide-step-action { display: inline-flex; align-items: center; margin-inline-start: 6px; padding: 0 6px; border: 1px solid var(--dsw-alias-border-l2); border-radius: 999px; color: var(--dsw-alias-label-secondary); font-size: 9.5px; font-weight: 400; line-height: 1.7; vertical-align: 1px; }
.rg-guide-step-section { margin-top: 4px; min-height: 24px; color: var(--dsw-alias-state-business-primary); font-size: 10.5px; text-decoration: underline; text-underline-offset: 3px; }
.rg-guide-step-section:hover { color: var(--dsw-alias-label-primary); }
.rg-guide-demo-notice { max-width: 78ch; margin: 0 0 10px; color: var(--dsw-alias-label-tertiary); font-size: 10.5px; }
.rg-guide-jumps { border-bottom: 0; }
.rg-guide-jumps > div { display: flex; flex-wrap: wrap; gap: 6px; }

@media (max-width: 900px) {
  .rg-workflow-layout { grid-template-columns: minmax(0, 1fr); gap: 24px; }
  .rg-market-layout { grid-template-columns: minmax(0, 1fr); gap: 12px; }
  .rg-market-watchlist { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 18px; }
  .rg-guide-layout { grid-template-columns: minmax(0, 1fr); gap: 24px; }
  .rg-guide-rail { display: grid; grid-template-columns: minmax(230px, 280px) minmax(0, 1fr); gap: 22px; align-items: start; }
  .rg-guide-roadmap-block { padding-bottom: 0; }
}
@media (max-width: 720px) {
  .rg-workflow-next { align-items: flex-start; flex-direction: column; }
  .rg-workflow-next-actions { justify-content: flex-start; }
  .rg-workflow-recent > div > button { grid-template-columns: auto minmax(0, 1fr); }
  .rg-workflow-recent time { grid-column: 2; }
  .rg-workflow-recent .rg-finance-node-provenance { grid-column: 2; }
  .rg-market-watchlist { grid-template-columns: minmax(0, 1fr); gap: 0; }
  .rg-chart-frame-head { align-items: stretch; }
  .rg-chart-controls { width: 100%; overflow-x: auto; }
  .rg-chart-controls .rg-tabs { width: fit-content; }
  .rg-chart-controls .rg-tab { white-space: nowrap; }
  .rg-chart-canvas { overflow-x: auto; }
  .rg-market-chart { min-width: 760px; }
  .rg-market-chart > svg { touch-action: pan-x pan-y; }
  .rg-market-chart .rg-chart-axis-label, .rg-market-chart .rg-chart-axis-title { font-size: 14px; }
  .rg-chart-source { grid-template-columns: minmax(0, 1fr); gap: 0; }
  .rg-chart-source > span { padding-top: 8px; }
  .rg-allocation-row { grid-template-columns: minmax(100px, .8fr) minmax(120px, 1.2fr); }
  .rg-allocation-row > svg:last-child { grid-column: 2; }
  .rg-allocation-label { grid-row: 1 / span 2; }
  .rg-scenario-bars > button { grid-template-columns: minmax(100px, .7fr) minmax(140px, 1.3fr); gap: 10px; }
  .rg-chart-tooltip { max-width: 58%; }
  .rg-guide-hero { grid-template-columns: minmax(0, 1fr); align-items: start; }
  .rg-guide-hero h2 { font-size: 19px; }
  .rg-guide-hero-actions { justify-content: flex-start; }
  .rg-guide-state { align-items: flex-start; flex-direction: column; }
  .rg-guide-rail { display: contents; }
  .rg-guide-courses-block { order: 1; padding-top: 0; border-top: 0; }
  .rg-guide-detail { order: 2; }
  .rg-guide-roadmap-block { order: 3; padding-top: 16px; border-top: 1px solid var(--dsw-alias-border-l2); }
  .rg-guide-courses { flex-direction: row; overflow-x: auto; padding-bottom: 4px; border-top: 0; gap: 6px; }
  .rg-guide-course { min-width: 220px; border: 1px solid var(--dsw-alias-border-l2); border-radius: var(--dsw-radius-md, 8px); }
  .rg-guide-course-badge { display: none; }
  .rg-guide-roadmap { max-width: 340px; }
  .rg-guide-demo-meta > div, .rg-guide-meta dl > div { grid-template-columns: minmax(0, 1fr); gap: 2px; }
  .rg-guide-ticker { grid-template-columns: minmax(0, 1fr); }
  .rg-guide-ticker small { grid-column: 1; }
}

/* Inbox and evidence Library */
.rg-inbox-entry-tabs { display: flex; align-items: center; gap: 2px; width: fit-content; max-width: 100%; padding: 2px; background: var(--dsw-alias-bg-layer-2); border-radius: var(--dsw-radius-md, 8px); }
.rg-inbox > .rg-finance-section-head { flex-wrap: wrap; }
.rg-inbox > .rg-finance-section-head .rg-finance-badge { max-width: 100%; white-space: normal; overflow-wrap: anywhere; }
.rg-inbox-entry-tabs button { min-height: 30px; padding: 4px 12px; border-radius: var(--dsw-radius-sm, 6px); color: var(--dsw-alias-label-secondary); font-size: 12px; }
.rg-inbox-entry-tabs button:hover { background: var(--dsw-alias-interactive-bg-hover); color: var(--dsw-alias-label-primary); }
.rg-inbox-entry-tabs button[data-active] { background: var(--dsw-alias-bg-layer-1); color: var(--dsw-alias-label-primary); font-weight: 500; }
.rg-inbox-clip-input { min-height: 240px; }
.rg-inbox-file-meta { display: flex; flex-wrap: wrap; gap: 8px 28px; margin: 0; padding: 10px 0; border-top: 1px solid var(--dsw-alias-border-l1); border-bottom: 1px solid var(--dsw-alias-border-l1); }
.rg-inbox-file-meta dt { color: var(--dsw-alias-label-tertiary); font-size: 10px; }
.rg-inbox-file-meta dd { margin: 2px 0 0; color: var(--dsw-alias-label-secondary); font-size: 12px; overflow-wrap: anywhere; }
.rg-inbox-outcomes { display: grid; grid-template-columns: repeat(6, minmax(72px, 1fr)); gap: 0; margin: 0 0 14px; border-top: 1px solid var(--dsw-alias-border-l1); border-bottom: 1px solid var(--dsw-alias-border-l1); }
.rg-inbox-outcomes > div { padding: 10px 12px; border-right: 1px solid var(--dsw-alias-border-l1); }
.rg-inbox-outcomes > div:last-child { border-right: 0; }
.rg-inbox-outcomes dt { color: var(--dsw-alias-label-tertiary); font-size: 10px; }
.rg-inbox-outcomes dd { margin: 2px 0 0; color: var(--dsw-alias-label-primary); font-size: 17px; font-variant-numeric: tabular-nums; }
.rg-inbox-partial { padding: 8px 10px; background: var(--dsw-alias-bg-layer-2); border-radius: var(--dsw-radius-sm, 6px); color: var(--dsw-alias-state-warn-primary); font-size: 12px; }
.rg-inbox-entry-list { margin: 6px 0; border-top: 1px solid var(--dsw-alias-border-l1); padding-top: 6px; }
.rg-inbox-entry-list summary { cursor: pointer; color: var(--dsw-alias-label-secondary); font-size: 11px; }
.rg-inbox-entry-list ul { margin: 6px 0; padding-left: 20px; color: var(--dsw-alias-label-secondary); font-size: 11px; }
.rg-inbox-entry-list li { margin: 3px 0; overflow-wrap: anywhere; }
.rg-inbox-plan { margin-top: 16px; }
.rg-inbox-plan ul { list-style: none; padding: 0; margin: 0; }
.rg-inbox-plan li { display: grid; grid-template-columns: auto minmax(100px, 1fr) minmax(120px, 1.2fr); gap: 8px; align-items: center; padding: 6px 0; border-top: 1px solid var(--dsw-alias-border-l1); }
.rg-inbox-plan li code { color: var(--dsw-alias-label-tertiary); font-size: 10px; overflow-wrap: anywhere; }
.rg-inbox-confirm { display: flex; align-items: center; justify-content: space-between; gap: 18px; margin-top: 16px; padding-top: 14px; border-top: 1px solid var(--dsw-alias-border-l2); }
.rg-inbox-confirm p { max-width: 72ch; margin: 0; color: var(--dsw-alias-label-secondary); font-size: 11px; }
.rg-inbox-confirm .rg-btn { flex: none; }
.rg-inbox-success { display: flex; align-items: center; justify-content: space-between; gap: 16px; padding: 14px 0; border-top: 1px solid var(--dsw-alias-border-l2); color: var(--dsw-alias-state-success-primary); }
.rg-inbox-success > div:first-child { display: flex; flex-direction: column; gap: 2px; }
.rg-inbox-success span { color: var(--dsw-alias-label-secondary); font-family: var(--ds-font-family-code, monospace); font-size: 11px; }

.rg-library-section { max-width: none; height: 100%; min-height: 0; padding-bottom: 0; display: flex; flex-direction: column; }
.rg-library-toolbar { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; margin-bottom: 12px; }
.rg-library-toolbar > input[type='search'] { flex: 1 1 240px; min-width: 160px; }
.rg-library-toolbar > select { flex: 0 1 170px; min-width: 130px; }
.rg-library { flex: 1; min-height: 360px; display: grid; grid-template-columns: minmax(270px, .38fr) minmax(0, .62fr); border-top: 1px solid var(--dsw-alias-border-l2); }
.rg-library-list { min-width: 0; min-height: 0; overflow-y: auto; border-right: 1px solid var(--dsw-alias-border-l2); }
.rg-library-list-head { position: sticky; top: 0; z-index: 1; display: flex; justify-content: space-between; gap: 8px; padding: 7px 10px; background: var(--dsw-alias-bg-layer-1); border-bottom: 1px solid var(--dsw-alias-border-l1); color: var(--dsw-alias-label-tertiary); font-size: 10px; }
.rg-library-list > button { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 5px 10px; width: 100%; padding: 10px; text-align: left; border-bottom: 1px solid var(--dsw-alias-border-l1); }
.rg-library-list > button:hover { background: var(--dsw-alias-interactive-bg-hover); }
.rg-library-list > button[data-selected] { background: var(--dsw-alias-bg-multi-select); }
.rg-library-row-title { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: var(--dsw-alias-label-primary); }
.rg-library-row-title code { display: block; overflow: hidden; text-overflow: ellipsis; color: var(--dsw-alias-label-tertiary); font-size: 10px; }
.rg-library-row-meta { grid-column: 1; display: flex; flex-wrap: wrap; gap: 2px 8px; color: var(--dsw-alias-label-tertiary); font-size: 10px; }
.rg-library-row-meta time { overflow-wrap: anywhere; }
.rg-library-list > button > .rg-finance-badge { grid-column: 2; grid-row: 1 / span 2; align-self: start; }
.rg-finance-badge[data-status='quarantined'] { color: var(--dsw-alias-state-warn-primary); }
.rg-finance-badge[data-status='error'], .rg-finance-badge[data-status='rejected'] { color: var(--dsw-alias-state-error-primary); }
.rg-library-preview { min-width: 0; min-height: 0; overflow-y: auto; padding: 16px 18px 28px; }
.rg-library-preview-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; padding-bottom: 12px; border-bottom: 1px solid var(--dsw-alias-border-l2); }
.rg-library-preview-head > div { min-width: 0; }
.rg-library-preview-head h3 { margin: 7px 0 2px; font-size: 15px; overflow-wrap: anywhere; }
.rg-library-preview-head code { color: var(--dsw-alias-label-tertiary); font-size: 10px; overflow-wrap: anywhere; }
.rg-library-back { display: none; }
.rg-library-facts { display: flex; flex-wrap: wrap; gap: 8px 24px; margin: 12px 0 18px; }
.rg-library-facts > div { min-width: 110px; }
.rg-library-facts dt { color: var(--dsw-alias-label-tertiary); font-size: 10px; }
.rg-library-facts dd { margin: 2px 0 0; color: var(--dsw-alias-label-secondary); font-size: 11px; overflow-wrap: anywhere; }
.rg-library-content-section { margin-top: 18px; }
.rg-library-original { max-height: 460px; overflow: auto; margin: 0; padding: 12px 14px; background: var(--dsw-alias-bg-layer-2); border-radius: var(--dsw-radius-sm, 6px); color: var(--dsw-alias-label-primary); font-family: inherit; font-size: 12px; line-height: 1.7; white-space: pre-wrap; overflow-wrap: anywhere; }
.rg-library-original mark { padding: 1px 0; background: var(--dsw-alias-bg-multi-select); color: var(--dsw-alias-label-primary); box-shadow: inset 0 -1px var(--dsw-alias-brand-primary); }
.rg-library-detail-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; margin-top: 18px; }
.rg-library-detail-grid p { margin: 0; color: var(--dsw-alias-label-secondary); font-size: 12px; overflow-wrap: anywhere; }
.rg-library-tags { display: flex; flex-wrap: wrap; gap: 5px; }
.rg-library-annotations { list-style: none; padding: 0; margin: 0; }
.rg-library-annotations > li { padding: 12px 0; border-top: 1px solid var(--dsw-alias-border-l1); }
.rg-library-annotations blockquote { margin: 0 0 8px; padding: 6px 10px; background: var(--dsw-alias-bg-layer-2); border-radius: var(--dsw-radius-sm, 6px); color: var(--dsw-alias-label-primary); font-size: 12px; white-space: pre-wrap; overflow-wrap: anywhere; }
.rg-library-annotations p { margin: 5px 0; color: var(--dsw-alias-label-secondary); font-size: 11px; }
.rg-library-annotations b { color: var(--dsw-alias-label-tertiary); font-weight: 500; margin-right: 5px; }
.rg-library-quote-context { display: flex; flex-direction: column; gap: 3px; }
.rg-library-locator { margin-top: 7px; color: var(--dsw-alias-label-secondary); font-size: 11px; }
.rg-library-locator code { display: block; margin-top: 3px; white-space: pre-wrap; overflow-wrap: anywhere; }
.rg-library-hash { display: block; margin-top: 7px; color: var(--dsw-alias-label-tertiary); font-size: 10px; overflow-wrap: anywhere; }
.rg-library-partial { margin: 12px 0; padding: 10px; background: var(--dsw-alias-bg-layer-2); border-radius: var(--dsw-radius-sm, 6px); color: var(--dsw-alias-state-warn-primary); font-size: 11px; }
.rg-library-partial ul { margin-bottom: 0; padding-left: 18px; }

/* Research runs, hypotheses, and report reading */
.rg-library-actions { display: flex; flex-wrap: wrap; align-items: end; gap: 8px; margin: 0 0 14px; }
.rg-library-compile-as-of { display: flex; flex-direction: column; gap: 3px; min-width: min(230px, 100%); color: var(--dsw-alias-label-tertiary); font-size: 10px; }
.rg-library-compile-as-of input { min-width: 210px; }
.rg-research-runs { border-top: 1px solid var(--dsw-alias-border-l2); margin: 0 0 16px; }
.rg-research-run { padding: 10px 0; border-bottom: 1px solid var(--dsw-alias-border-l1); min-width: 0; }
.rg-research-run-head { display: flex; flex-wrap: wrap; align-items: center; gap: 6px 12px; }
.rg-research-run-head strong { font-size: 12px; }
.rg-research-run-head code { color: var(--dsw-alias-label-tertiary); font-size: 10px; overflow-wrap: anywhere; }
.rg-research-run-head .rg-btn { margin-left: auto; }
.rg-research-run p { margin: 4px 0 0; color: var(--dsw-alias-label-secondary); font-size: 11px; }
.rg-research-run[data-status='completed'] .rg-research-run-head strong { color: var(--dsw-alias-state-success-primary); }
.rg-research-run[data-status='failed'] .rg-research-run-head strong, .rg-research-run-error { color: var(--dsw-alias-state-error-primary) !important; }
.rg-research-run[data-status='timeout'] .rg-research-run-head strong, .rg-research-warning { color: var(--dsw-alias-state-warn-primary); }
.rg-research-session { display: block; margin-top: 4px; color: var(--dsw-alias-label-tertiary); font-size: 10px; }
.rg-research-session code { overflow-wrap: anywhere; }
.rg-research-artifacts, .rg-hypothesis-related { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 8px; }
.rg-research-warning { margin: 10px 0; padding: 8px 10px; background: var(--dsw-alias-bg-layer-2); border-radius: var(--dsw-radius-sm, 6px); font-size: 11px; }
.rg-research-note { margin: 10px 0; color: var(--dsw-alias-label-secondary); font-size: 11px; max-width: 75ch; }

.rg-hypotheses-section, .rg-reports-section { max-width: none; height: 100%; min-height: 0; padding-bottom: 0; display: flex; flex-direction: column; overflow-y: auto; }
.rg-hypotheses { flex: 1 0 420px; min-height: 420px; display: grid; grid-template-columns: minmax(260px, .34fr) minmax(0, .66fr); border-top: 1px solid var(--dsw-alias-border-l2); }
.rg-hypothesis-list { min-width: 0; min-height: 0; overflow-y: auto; border-right: 1px solid var(--dsw-alias-border-l2); }
.rg-hypothesis-list > button { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 4px 10px; width: 100%; padding: 10px; text-align: left; border-bottom: 1px solid var(--dsw-alias-border-l1); }
.rg-hypothesis-list > button:hover { background: var(--dsw-alias-interactive-bg-hover); }
.rg-hypothesis-list > button[data-selected] { background: var(--dsw-alias-bg-multi-select); }
.rg-hypothesis-list > button > .rg-finance-badge { grid-column: 1; justify-self: start; }
.rg-hypothesis-list > button > strong { grid-column: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.rg-hypothesis-list > button > code { grid-column: 1; color: var(--dsw-alias-label-tertiary); font-size: 10px; overflow: hidden; text-overflow: ellipsis; }
.rg-hypothesis-list > button > span:last-child { grid-column: 2; grid-row: 1 / span 3; align-self: start; color: var(--dsw-alias-label-secondary); font-variant-numeric: tabular-nums; }
.rg-hypothesis-detail { min-width: 0; min-height: 0; overflow-y: auto; padding: 16px 18px 30px; }
.rg-hypothesis-detail-head, .rg-report-reader-head { display: flex; align-items: flex-start; justify-content: space-between; flex-wrap: wrap; gap: 12px; padding-bottom: 12px; border-bottom: 1px solid var(--dsw-alias-border-l2); }
.rg-hypothesis-detail-head > div, .rg-report-reader-head > div { min-width: 0; flex: 1; }
.rg-hypothesis-detail-head h3, .rg-report-reader-head h3 { margin: 7px 0 2px; font-size: 15px; overflow-wrap: anywhere; }
.rg-hypothesis-detail-head code, .rg-report-reader-head code { color: var(--dsw-alias-label-tertiary); font-size: 10px; overflow-wrap: anywhere; }
.rg-hypothesis-back, .rg-report-back { display: none; }
.rg-hypothesis-thesis { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px 20px; margin: 16px 0; }
.rg-hypothesis-thesis > div:first-child, .rg-hypothesis-thesis > div:last-child { grid-column: 1 / -1; }
.rg-hypothesis-thesis dt { color: var(--dsw-alias-label-tertiary); font-size: 10px; }
.rg-hypothesis-thesis dd { margin: 4px 0 0; color: var(--dsw-alias-label-primary); font-size: 12px; white-space: pre-wrap; overflow-wrap: anywhere; }
.rg-hypothesis-thesis ul { margin: 0; padding-left: 18px; }
.rg-hypothesis-evidence > article { position: relative; padding: 10px 70px 10px 0; border-top: 1px solid var(--dsw-alias-border-l1); }
.rg-hypothesis-evidence article > button { display: flex; flex-direction: column; align-items: flex-start; max-width: 100%; text-align: left; overflow-wrap: anywhere; }
.rg-hypothesis-evidence article > button:hover strong { text-decoration: underline; }
.rg-hypothesis-evidence code { color: var(--dsw-alias-label-tertiary); font-size: 10px; overflow-wrap: anywhere; }
.rg-hypothesis-evidence dl { display: grid; gap: 4px; margin: 7px 0 0; max-width: 70ch; }
.rg-hypothesis-evidence dl > div { display: grid; grid-template-columns: max-content minmax(0, 1fr); gap: 8px; min-width: 0; align-items: start; }
.rg-hypothesis-evidence dt { color: var(--dsw-alias-label-tertiary); font-size: 12px; line-height: 1.5; }
.rg-hypothesis-evidence dd { margin: 0; color: var(--dsw-alias-label-secondary); font-size: 13px; line-height: 1.6; overflow-wrap: anywhere; }
.rg-hypothesis-evidence article > .rg-finance-badge { position: absolute; top: 10px; right: 0; }
.rg-hypothesis-evidence article > .rg-finance-badge[data-direction='contradicts'] { color: var(--dsw-alias-state-error-primary); }
.rg-version-chain, .rg-hypothesis-history { list-style: none; padding: 0; margin: 0; }
.rg-version-chain li { border-top: 1px solid var(--dsw-alias-border-l1); }
.rg-version-chain li[data-current] { background: var(--dsw-alias-bg-multi-select); }
.rg-version-chain button { display: grid; grid-template-columns: minmax(120px, 1fr) minmax(120px, 1fr) auto; gap: 4px 12px; width: 100%; padding: 8px 6px; text-align: left; align-items: center; }
.rg-version-chain button:hover { background: var(--dsw-alias-interactive-bg-hover); }
.rg-version-chain code, .rg-version-chain time { color: var(--dsw-alias-label-tertiary); font-size: 10px; overflow-wrap: anywhere; }
.rg-hypothesis-history li { display: grid; grid-template-columns: minmax(140px, .4fr) minmax(160px, 1fr); gap: 4px 12px; padding: 8px 0; border-top: 1px solid var(--dsw-alias-border-l1); }
.rg-hypothesis-history code { color: var(--dsw-alias-label-tertiary); font-size: 10px; }
.rg-hypothesis-history span { color: var(--dsw-alias-label-secondary); font-size: 11px; }
.rg-hypothesis-history time { grid-column: 2; color: var(--dsw-alias-label-tertiary); font-size: 10px; }

.rg-start-research { flex: none; }
.rg-start-research .rg-finance-block-heading > div { min-width: 0; }
.rg-start-research .rg-finance-block-heading h3 { margin: 0; }
.rg-start-research .rg-finance-block-description { margin: 4px 0 0; }
.rg-research-gate { border: 0; padding: 0; margin: 0; }
.rg-research-gate legend { padding: 0; margin-bottom: 6px; color: var(--dsw-alias-label-secondary); font-size: 11px; }
.rg-research-gate > div { display: flex; flex-wrap: wrap; gap: 6px; }
.rg-research-gate button { padding: 6px 10px; border: 1px solid var(--dsw-alias-border-l2); border-radius: var(--dsw-radius-sm, 6px); color: var(--dsw-alias-label-secondary); }
.rg-research-gate button:hover { background: var(--dsw-alias-interactive-bg-hover); }
.rg-research-gate button[data-active] { background: var(--dsw-alias-bg-multi-select); color: var(--dsw-alias-label-primary); border-color: var(--dsw-alias-brand-primary); }
.rg-research-gate p { margin: 6px 0 0; color: var(--dsw-alias-label-tertiary); font-size: 11px; max-width: 75ch; }
.rg-reports { flex: 1 0 460px; min-height: 460px; display: grid; grid-template-columns: minmax(250px, .3fr) minmax(0, .7fr); border-top: 1px solid var(--dsw-alias-border-l2); }
.rg-report-list { min-width: 0; min-height: 0; overflow-y: auto; border-right: 1px solid var(--dsw-alias-border-l2); }
.rg-report-list > button { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 4px 10px; width: 100%; padding: 10px; text-align: left; border-bottom: 1px solid var(--dsw-alias-border-l1); }
.rg-report-list > button:hover { background: var(--dsw-alias-interactive-bg-hover); }
.rg-report-list > button[data-selected] { background: var(--dsw-alias-bg-multi-select); }
.rg-report-list strong, .rg-report-list code { grid-column: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.rg-report-list code, .rg-report-list time { color: var(--dsw-alias-label-tertiary); font-size: 10px; }
.rg-report-list .rg-finance-badge { grid-column: 2; grid-row: 1 / span 2; align-self: start; }
.rg-report-list time { grid-column: 1 / -1; overflow-wrap: anywhere; }
.rg-report-reader { min-width: 0; min-height: 0; overflow-y: auto; padding: 16px 18px 30px; }
.rg-report-reading-layout { display: grid; grid-template-columns: 210px minmax(0, 1fr); gap: 24px; margin-top: 18px; }
.rg-report-outline { min-width: 0; padding-right: 16px; border-right: 1px solid var(--dsw-alias-border-l1); color: var(--dsw-alias-label-secondary); font-size: 11px; }
.rg-report-outline h4 { margin: 0 0 8px; }
.rg-report-outline h4:not(:first-child) { margin-top: 22px; }
.rg-report-outline ol, .rg-report-outline ul { list-style: none; padding: 0; margin: 0; }
.rg-report-outline li { padding: 4px 0; overflow-wrap: anywhere; }
.rg-report-outline ol li[data-level='2'] { padding-left: 10px; }
.rg-report-outline ol li[data-level='3'] { padding-left: 20px; }
.rg-report-outline ol li[data-level='4'], .rg-report-outline ol li[data-level='5'], .rg-report-outline ol li[data-level='6'] { padding-left: 30px; }
.rg-report-outline button { display: flex; flex-direction: column; align-items: flex-start; text-align: left; }
.rg-report-outline button:hover span { text-decoration: underline; }
.rg-report-outline code { color: var(--dsw-alias-label-tertiary); font-size: 9px; overflow-wrap: anywhere; }
.rg-report-markdown { min-width: 0; max-width: 76ch; overflow-wrap: anywhere; }

@media (max-width: 900px) {
  .rg-hypotheses { grid-template-columns: minmax(230px, .38fr) minmax(0, .62fr); }
  .rg-reports { grid-template-columns: minmax(220px, .34fr) minmax(0, .66fr); }
  .rg-report-reading-layout { grid-template-columns: 170px minmax(0, 1fr); gap: 16px; }
  .rg-finance-two-column { grid-template-columns: minmax(0, 1fr); gap: 12px; }
  .rg-inbox-outcomes { grid-template-columns: repeat(3, minmax(72px, 1fr)); }
  .rg-inbox-outcomes > div:nth-child(3) { border-right: 0; }
  .rg-inbox-outcomes > div:nth-child(-n+3) { border-bottom: 1px solid var(--dsw-alias-border-l1); }
  .rg-library { grid-template-columns: minmax(240px, .42fr) minmax(0, .58fr); }
}
@media (max-width: 720px) {
  .rg-finance-workspace { display: flex; flex-direction: column; }
  .rg-finance-nav { display: flex; align-items: center; gap: 3px; overflow-x: auto; overflow-y: hidden; padding: 6px 8px; border-right: 0; border-bottom: 1px solid var(--dsw-alias-border-l2); }
  .rg-finance-nav-title { display: none; }
  .rg-finance-nav button { width: auto; flex: none; padding: 5px 8px; }
  .rg-finance-nav .rg-finance-nav-refresh { margin: 0 0 0 auto; padding: 5px 8px; border-top: 0; border-radius: var(--dsw-radius-sm, 6px); }
  .rg-finance-main { flex: 1; }
  .rg-finance-section { padding: 12px 12px 32px; }
  .rg-finance-section-head { margin-bottom: 12px; }
  .rg-finance-timeline li { grid-template-columns: minmax(0, 1fr); gap: 4px; }
}
@media (max-width: 480px) {
  .rg-finance-fields-inline { grid-template-columns: minmax(0, 1fr); }
  .rg-finance-summary { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 4px 12px; }
  .rg-finance-summary > div { min-width: 0; }
  .rg-finance-section-head { flex-direction: column; }
  .rg-inbox-outcomes { grid-template-columns: repeat(2, minmax(72px, 1fr)); }
  .rg-inbox-outcomes > div, .rg-inbox-outcomes > div:nth-child(3) { border-right: 1px solid var(--dsw-alias-border-l1); border-bottom: 1px solid var(--dsw-alias-border-l1); }
  .rg-inbox-outcomes > div:nth-child(2n) { border-right: 0; }
  .rg-inbox-outcomes > div:nth-last-child(-n+2) { border-bottom: 0; }
  .rg-inbox-confirm, .rg-inbox-success { align-items: stretch; flex-direction: column; }
  .rg-inbox-confirm .rg-btn { width: 100%; }
  .rg-inbox-plan li { grid-template-columns: auto minmax(0, 1fr); }
  .rg-inbox-plan li code { grid-column: 1 / -1; }
  .rg-library-detail-grid { grid-template-columns: minmax(0, 1fr); }
  .rg-guide-hero-actions, .rg-guide-demo-actions, .rg-guide-jumps > div { width: 100%; }
  .rg-guide-hero-actions .rg-btn, .rg-guide-demo-actions .rg-btn, .rg-guide-jumps .rg-btn { flex: 1 1 auto; }
  .rg-guide-nudge { align-items: stretch; flex-direction: column; }
  .rg-guide-nudge-actions { flex-direction: column; }
  .rg-guide-nudge-actions .rg-btn { width: 100%; }
  .rg-guide-course { min-width: 200px; }
  .rg-guide-state .rg-btn { width: 100%; }
}

/* Narrow viewports: inspector becomes a bottom sheet, ledger shortens. */
@media (max-width: 720px) {
  .rg-header { padding: 8px 10px; gap: 6px 8px; }
  .rg-search { min-width: 140px; flex: 1 1 100%; order: 5; }
  .rg-ledger { height: 132px; }
  .rg-inspector {
    top: auto;
    left: 0;
    width: auto;
    max-height: 62%;
    border-left: none;
    border-top: 1px solid var(--dsw-alias-border-l2);
    box-shadow: 0 -12px 28px -18px rgba(0, 0, 0, 0.35);
  }
  .rg-history { flex-direction: column; }
  .rg-history-list { width: auto; max-width: none; border-right: none; border-bottom: 1px solid var(--dsw-alias-border-l2); max-height: 40%; }
  .rg-row { grid-template-columns: 84px 1fr; }
  .rg-row-time { display: none; }
  .rg-library-section { min-height: 560px; }
  .rg-library { display: block; min-height: 0; }
  .rg-library-list { height: 100%; border-right: 0; }
  .rg-library-preview { height: 100%; padding: 12px 0 24px; }
  .rg-library[data-drill='list'] .rg-library-preview { display: none; }
  .rg-library[data-drill='preview'] .rg-library-list { display: none; }
  .rg-library-back { display: inline-flex; flex: none; }
  .rg-library-preview-head { flex-wrap: wrap; }
  .rg-library-preview-head > div { order: 3; flex: 1 1 100%; }
  .rg-library-toolbar > select { flex: 1 1 140px; }
  .rg-hypotheses-section, .rg-reports-section { min-height: 560px; }
  .rg-hypotheses, .rg-reports { display: block; flex-basis: 480px; min-height: 480px; }
  .rg-hypothesis-list, .rg-report-list { height: 100%; border-right: 0; }
  .rg-hypothesis-detail, .rg-report-reader { height: 100%; padding: 12px 0 24px; }
  .rg-hypotheses[data-drill='list'] .rg-hypothesis-detail, .rg-reports[data-drill='list'] .rg-report-reader { display: none; }
  .rg-hypotheses[data-drill='detail'] .rg-hypothesis-list, .rg-reports[data-drill='reader'] .rg-report-list { display: none; }
  .rg-hypothesis-back, .rg-report-back { display: inline-flex; flex: none; }
  .rg-hypothesis-detail-head > div, .rg-report-reader-head > div { order: 3; flex: 1 1 100%; }
  .rg-report-reading-layout { grid-template-columns: minmax(0, 1fr); }
  .rg-report-outline { padding: 0 0 16px; border-right: 0; border-bottom: 1px solid var(--dsw-alias-border-l1); }
  .rg-report-markdown { max-width: 100%; }
  .rg-version-chain button { grid-template-columns: minmax(0, 1fr); }
  .rg-version-chain time { grid-column: 1; }
}

/* Bounded shell parity and narrow-viewport finish. */
[data-rg-root] { min-width: 0; max-width: 100%; overflow: hidden; }
.rg-mode-panel { flex: 1; min-height: 0; display: flex; flex-direction: column; }
.rg-header, .rg-tabs, .rg-filters { min-width: 0; max-width: 100%; }
.rg-filters { overflow-x: hidden; }
.rg-search { min-height: 32px; }
.rg-row { grid-template-columns: 110px minmax(0, 1fr) auto; }
.rg-row-title { min-width: 0; }
.rg-row-id { overflow-wrap: anywhere; }
.rg-node-hit { fill: transparent; }
.rg-edge-remove {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 28px;
  min-height: 28px;
  opacity: 0.7;
}
.rg-edge-remove:hover, .rg-edge-remove:focus-visible { opacity: 1; }
.rg-edge-popover { max-width: calc(100% - 24px); flex-wrap: wrap; }
.rg-edge-popover > span { min-width: 0; overflow-wrap: anywhere; }
.rg-toast { z-index: 20; }

@media (max-width: 720px) {
  .rg-row { grid-template-columns: 84px minmax(0, 1fr); }
  .rg-header .rg-spacer { display: none; }
  .rg-dialog { max-width: calc(100vw - 24px); max-height: calc(100vh - 48px); }
}

@media (pointer: coarse) {
  [data-rg-root] input, [data-rg-root] select { min-height: 40px; }
  .rg-btn, .rg-finance-nav button { min-height: 40px; }
  .rg-tab { min-height: 40px; }
  .rg-chip { min-height: 36px; }
  .rg-icon-btn { width: 44px; height: 44px; }
  .rg-edge-select, .rg-edge-remove { min-height: 40px; }
  .rg-edge-remove { min-width: 40px; opacity: 1; }
  .rg-row, .rg-history-item { min-height: 44px; }
}

@media (prefers-reduced-motion: no-preference) {
  .rg-node, .rg-edge { transition: opacity 150ms ease-out; }
  .rg-toast { transition: opacity 150ms ease-out; }
}

${FINANCE_SHELL_STYLE}
${DISCOVERY_STYLE}
${SCREENING_STYLE}
${EVENTS_STYLE}
${CATALOG_STYLE}
${GRAPH_POLISH_STYLE}
${FINANCE_FINISH_STYLE}
${ASSET_STYLE}
${FINANCE_REFINEMENT_STYLE}
${LIBRARY_STYLE}
${STOCK_CHART_STYLE}
${STOCK_DETAIL_STYLE}
${STOCK_SECTIONS_STYLE}
${STOCK_SHELL_STYLE}
${STOCK_FOLLOW_STYLE}
${VIEWPOINT_STYLE}
${REPORT_HISTORY_STYLE}
${VIRTUAL_FUND_STYLE}
${VIRTUAL_FUND_OVERVIEW_STYLE}
${FINANCE_ASIDE_CONTEXT_STYLE}
`
