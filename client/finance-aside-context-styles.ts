export const FINANCE_ASIDE_CONTEXT_STYLE = `
.rg-aside-context {
  display: grid;
  gap: 8px;
}
.rg-aside-context-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}
.rg-aside-context-label {
  display: inline-flex;
  padding: 2px 6px;
  border-radius: 4px;
  color: var(--dsw-alias-label-secondary);
  background: var(--dsw-alias-bg-layer-2);
  font-size: 9px;
  font-weight: 500;
}
.rg-aside-context-list {
  display: grid;
}
.rg-aside-context-row {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 8px 0;
  border: 0;
  border-bottom: 1px solid var(--dsw-alias-border-l1);
  color: var(--dsw-alias-label-primary);
  background: transparent;
  text-align: left;
}
.rg-aside-context-row:hover {
  background: var(--dsw-alias-interactive-bg-hover);
}
.rg-aside-context-copy {
  display: grid;
  gap: 2px;
  min-width: 0;
}
.rg-aside-context-copy strong,
.rg-aside-context-copy small {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.rg-aside-context-copy strong {
  font-size: 11px;
  font-weight: 550;
}
.rg-aside-context-copy small,
.rg-aside-context-value small {
  color: var(--dsw-alias-label-tertiary);
  font-size: 9px;
}
.rg-aside-context-value {
  display: grid;
  justify-items: end;
  gap: 2px;
  color: var(--dsw-alias-label-secondary);
  font-size: 10px;
  font-variant-numeric: tabular-nums;
}
.rg-aside-context-value small[data-up='true'] {
  color: var(--dsw-alias-state-success-primary);
}
.rg-aside-context-value small[data-up='false'] {
  color: var(--dsw-alias-state-error-primary);
}
.rg-aside-context-related {
  display: grid;
  gap: 3px;
  width: 100%;
  padding: 10px;
  border: 1px solid var(--dsw-alias-border-l1);
  border-radius: 7px;
  color: var(--dsw-alias-label-primary);
  background: var(--dsw-alias-bg-layer-2);
  text-align: left;
}
.rg-aside-context-related:hover {
  border-color: var(--dsw-alias-border-l2);
}
.rg-aside-context-related strong {
  font-size: 11px;
  font-weight: 550;
}
.rg-aside-context-related small,
.rg-aside-context-empty {
  color: var(--dsw-alias-label-tertiary);
  font-size: 9px;
  line-height: 1.45;
}
`
