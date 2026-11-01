/**
 * Local visual finish for the graph surface. Every color comes from the DSH
 * token layer; the stylesheet is imported by client/styles.ts.
 * @module dsh-research-graph/client/graph-polish-styles
 */

export const GRAPH_POLISH_STYLE = `
.rg-canvas-wrap {
  background: var(--dsw-alias-bg-base);
}
.rg-canvas { color: var(--dsw-alias-label-secondary); }
.rg-canvas-grid-dot { fill: var(--dsw-alias-border-l2); opacity: 0.48; }
.rg-edge {
  stroke: var(--rg-edge-color, var(--dsw-alias-border-l3));
  stroke-width: 1;
  stroke-opacity: 0.34;
}
.rg-edge[data-dimmed] { opacity: 0.12; }
.rg-edge[data-highlight] {
  stroke: var(--rg-edge-color, var(--dsw-alias-brand-primary));
  stroke-width: 1.45;
  stroke-opacity: 0.78;
}
.rg-edge[data-selected] {
  stroke: var(--rg-edge-color, var(--dsw-alias-brand-primary));
  stroke-width: 1.8;
  stroke-opacity: 1;
}
.rg-edge-arrow { fill: var(--rg-edge-color, var(--dsw-alias-border-l3)); }
.rg-edge-arrow[data-highlight], .rg-edge-arrow[data-selected] {
  fill: var(--rg-edge-color, var(--dsw-alias-brand-primary));
}
.rg-edge-label {
  fill: var(--dsw-alias-label-secondary);
  font-size: 10px;
  letter-spacing: 0;
  paint-order: stroke;
  stroke: var(--dsw-alias-bg-base);
  stroke-width: 4px;
  stroke-linejoin: round;
}
.rg-node { cursor: pointer; }
.rg-node-halo {
  fill: var(--rg-node-color, var(--dsw-alias-label-tertiary));
  opacity: 0.07;
  pointer-events: none;
}
.rg-node circle.rg-node-dot {
  fill: var(--dsw-alias-bg-layer-1);
  stroke: var(--rg-node-color, var(--dsw-alias-label-tertiary));
  stroke-width: 1.6;
}
.rg-node[data-highlight] .rg-node-halo, .rg-node:hover .rg-node-halo {
  opacity: 0.13;
}
.rg-node[data-highlight] circle.rg-node-dot, .rg-node:hover circle.rg-node-dot {
  fill: var(--dsw-alias-bg-layer-2);
  stroke-width: 2;
}
.rg-node circle.rg-node-ring {
  fill: none;
  stroke: var(--dsw-alias-brand-primary);
  stroke-width: 1.8;
}
.rg-node text {
  fill: var(--dsw-alias-label-secondary);
  font-size: 11px;
  font-weight: 450;
  letter-spacing: 0;
}
.rg-node[data-label='false'] text {
  opacity: 0;
  pointer-events: none;
}
.rg-node[data-label='neighbors'] text {
  opacity: 0.76;
}
.rg-node[data-highlight] text, .rg-node:hover text {
  fill: var(--dsw-alias-label-primary);
  opacity: 1;
  font-weight: 550;
}
.rg-node-finance-icon {
  color: var(--rg-node-color, var(--dsw-alias-label-secondary));
  opacity: 0.92;
  pointer-events: none;
}
.rg-node:focus-visible { outline: none; }
.rg-node:focus-visible circle.rg-node-dot {
  stroke: var(--dsw-alias-brand-primary);
  stroke-width: 2.6;
}
.rg-canvas-controls {
  display: inline-flex;
  flex-direction: row;
  align-items: center;
  gap: 4px;
  padding: 3px;
  border: 1px solid var(--dsw-alias-border-l2);
  border-radius: var(--dsw-radius-md, 8px);
  background: var(--dsw-alias-bg-layer-1);
  box-shadow: 0 8px 22px -18px rgba(0, 0, 0, 0.5);
}
.rg-canvas-controls .rg-icon-btn {
  width: 30px;
  height: 30px;
  border: 0;
  border-radius: var(--dsw-radius-sm, 6px);
}
.rg-canvas-controls .rg-icon-btn[data-on='true'] {
  color: var(--dsw-alias-brand-primary);
  background: var(--dsw-alias-bg-multi-select);
}
.rg-canvas-controls-divider {
  width: 1px;
  height: 18px;
  background: var(--dsw-alias-border-l2);
}
.rg-canvas-focus-summary {
  position: absolute;
  top: 12px;
  left: 12px;
  display: flex;
  align-items: center;
  gap: 7px;
  max-width: min(360px, calc(100% - 24px));
  padding: 5px 8px;
  color: var(--dsw-alias-label-secondary);
  font-size: 11px;
  background: var(--dsw-alias-bg-layer-1);
  border: 1px solid var(--dsw-alias-border-l2);
  border-radius: var(--dsw-radius-sm, 6px);
}
.rg-canvas-focus-summary strong {
  color: var(--dsw-alias-label-primary);
  font-weight: 550;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.rg-inspector-filtered {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 14px;
  border-bottom: 1px solid var(--dsw-alias-border-l2);
  background: var(--dsw-alias-bg-layer-2);
  color: var(--dsw-alias-label-secondary);
  font-size: 11px;
}
.rg-inspector-filtered span { flex: 1; min-width: 0; }
.rg-inspector-filtered .rg-btn { flex: none; }
@media (max-width: 720px) {
  .rg-canvas-controls { left: 8px; bottom: 8px; gap: 2px; }
  .rg-canvas-controls .rg-icon-btn { width: 36px; height: 36px; }
  .rg-canvas-focus-summary {
    top: 8px;
    left: 8px;
    max-width: calc(100% - 16px);
  }
  .rg-inspector-filtered { align-items: flex-start; flex-direction: column; }
}
@media (prefers-reduced-motion: no-preference) {
  .rg-node, .rg-edge, .rg-node text, .rg-node-halo {
    transition: opacity 150ms ease-out, stroke-width 150ms ease-out, fill 150ms ease-out;
  }
}
`
