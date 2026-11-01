export const STOCK_FOLLOW_STYLE = `
[data-rg-root] .rg-stock-detail-page .rg-stock-detail-actions {
  display: flex;
  align-items: center;
  gap: 24px;
}
[data-rg-root] .rg-stock-detail-page .rg-stock-follow-action {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 7px 0;
  border: 0;
  border-radius: var(--dsw-radius-sm, 6px);
  background: transparent;
  color: var(--dsw-alias-label-secondary);
  font-size: 14px;
  line-height: 1.25;
  white-space: nowrap;
}
[data-rg-root] .rg-stock-detail-page .rg-stock-follow-action:hover:not(:disabled),
[data-rg-root] .rg-stock-detail-page .rg-stock-follow-action[aria-pressed="true"] {
  background: transparent;
  color: var(--dsw-alias-label-primary);
}
[data-rg-root] .rg-stock-detail-page .rg-stock-follow-star {
  flex: none;
  width: 16px;
  height: 16px;
}
`
