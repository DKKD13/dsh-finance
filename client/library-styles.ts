/**
 * Library reading workspace. This stylesheet is registered with the existing
 * client bundle; it deliberately relies on the DSH token layer for both themes.
 */
export const LIBRARY_STYLE = `
.rg-library-section {
  min-height: 0;
  padding-bottom: 0;
}
.rg-library-section > .rg-finance-section-head {
  align-items: center;
  margin-bottom: 12px;
}
.rg-library-section > .rg-finance-section-head h2 {
  font-size: 14px;
  font-weight: 550;
  letter-spacing: -.01em;
}
.rg-library-section > .rg-finance-section-head p {
  max-width: 76ch;
  margin-top: 3px;
  font-size: 12px;
  line-height: 1.55;
}
.rg-library {
  flex: 1;
  display: grid;
  grid-template-columns: 270px minmax(0, 1fr);
  min-height: 480px;
  height: calc(100dvh - 340px);
  overflow: hidden;
  border: 1px solid var(--dsw-alias-border-l2);
  border-radius: var(--dsw-radius-md, 8px);
  background: var(--dsw-alias-bg-base);
}
.rg-library-list {
  position: relative;
  min-width: 0;
  min-height: 0;
  overflow-y: auto;
  border-right: 1px solid var(--dsw-alias-border-l2);
  background: var(--dsw-alias-bg-layer-1);
}
.rg-library-list-head {
  position: sticky;
  top: 0;
  z-index: 5;
  display: flex;
  justify-content: space-between;
  gap: 8px;
  min-height: 28px;
  padding: 7px 10px;
  border-bottom: 1px solid var(--dsw-alias-border-l1);
  background: var(--dsw-alias-bg-layer-1);
  color: var(--dsw-alias-label-tertiary);
  font-size: 11px;
  font-weight: 500;
}
.rg-library-toolbar {
  position: sticky;
  top: 28px;
  z-index: 4;
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 7px;
  width: auto;
  margin: 0;
  padding: 9px;
  border-bottom: 1px solid var(--dsw-alias-border-l1);
  background: var(--dsw-alias-bg-layer-1);
}
.rg-library-group-tabs {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 2px;
  width: 100%;
  padding: 2px;
  border-radius: var(--dsw-radius-sm, 6px);
  background: var(--dsw-alias-bg-layer-2);
}
.rg-library-group-tabs button {
  display: flex;
  min-width: 0;
  min-height: 34px;
  align-items: center;
  justify-content: center;
  gap: 4px;
  padding: 4px 5px;
  border-radius: var(--dsw-radius-sm, 6px);
  color: var(--dsw-alias-label-secondary);
  font-size: 11px;
  line-height: 1.25;
}
.rg-library-group-tabs button > span {
  min-width: 0;
  text-align: center;
  line-height: 1.25;
}
.rg-library-group-tabs button small {
  color: var(--dsw-alias-label-tertiary);
  font-size: 9px;
  font-variant-numeric: tabular-nums;
}
.rg-library-group-tabs button[data-active] {
  background: var(--dsw-alias-bg-base);
  color: var(--dsw-alias-label-primary);
  box-shadow: 0 1px 2px rgba(0, 0, 0, .08);
}
.rg-library-toolbar .rg-inbox-entry-tabs {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 2px;
  width: 100%;
  padding: 2px;
  border: 0;
  border-radius: var(--dsw-radius-sm, 6px);
  background: transparent;
}
.rg-library-toolbar .rg-inbox-entry-tabs button {
  display: flex;
  min-width: 0;
  min-height: 28px;
  align-items: center;
  justify-content: flex-start;
  gap: 4px;
  padding: 4px 3px;
  border-radius: var(--dsw-radius-sm, 6px);
  font-size: 12px;
}
.rg-library-toolbar .rg-inbox-entry-tabs button > span {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.rg-library-toolbar .rg-inbox-entry-tabs button small {
  margin-left: auto;
  color: var(--dsw-alias-label-tertiary);
  font-size: 10px;
  font-variant-numeric: tabular-nums;
}
.rg-library-toolbar .rg-inbox-entry-tabs button[data-active] {
  background: var(--dsw-alias-bg-base);
  box-shadow: 0 1px 2px rgba(0, 0, 0, .08);
}
.rg-library-node-icon {
  flex: none;
  color: currentColor;
}
.rg-library-toolbar > input[type='search'] {
  width: 100%;
  min-width: 0;
  min-height: 30px;
  padding: 5px 8px;
  font-size: 12px;
}
.rg-library-global-matches {
  display: grid;
  grid-template-columns: auto repeat(3, minmax(0, 1fr));
  align-items: center;
  gap: 3px;
  color: var(--dsw-alias-label-tertiary);
  font-size: 9px;
}
.rg-library-global-matches > span {
  padding-right: 2px;
}
.rg-library-global-matches button {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 3px;
  min-width: 0;
  padding: 3px;
  border-radius: var(--dsw-radius-sm, 6px);
  color: var(--dsw-alias-label-secondary);
  font-size: 9px;
}
.rg-library-global-matches button:hover,
.rg-library-global-matches button[data-active] {
  background: var(--dsw-alias-interactive-bg-hover);
  color: var(--dsw-alias-label-primary);
}
.rg-library-global-matches button span {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.rg-library-global-matches button small {
  font-variant-numeric: tabular-nums;
}
.rg-library-filter-row {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 5px;
}
.rg-library-filter-more {
  border-top: 1px solid var(--dsw-alias-border-l1);
  padding-top: 5px;
}
.rg-library-filter-more > summary {
  min-height: 24px;
  color: var(--dsw-alias-label-secondary);
  font-size: 11px;
  cursor: pointer;
}
.rg-library-filter-more[open] > summary {
  margin-bottom: 5px;
}
.rg-library-tool-toggle {
  display: grid;
  grid-template-columns: 16px minmax(0, 1fr) auto;
  align-items: center;
  gap: 5px;
  margin-top: 6px;
  color: var(--dsw-alias-label-secondary);
  font-size: 11px;
  line-height: 1.35;
}
.rg-library-tool-toggle input {
  margin: 0;
}
.rg-library-tool-toggle small {
  color: var(--dsw-alias-label-tertiary);
  font-size: 9px;
  font-variant-numeric: tabular-nums;
}
.rg-library-hidden-count {
  margin: 5px 0 0;
  color: var(--dsw-alias-label-tertiary);
  font-size: 10px;
  line-height: 1.45;
}
.rg-library-filter-row select {
  min-width: 0;
  min-height: 28px;
  padding: 4px 22px 4px 7px;
  font-size: 12px;
}
.rg-library-directories {
  border-top: 1px solid var(--dsw-alias-border-l1);
  padding-top: 6px;
}
.rg-library-directories summary,
.rg-library-research-tools > summary,
.rg-library-advanced > summary {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  min-height: 24px;
  color: var(--dsw-alias-label-secondary);
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  list-style: none;
}
.rg-library-directories summary::-webkit-details-marker,
.rg-library-research-tools > summary::-webkit-details-marker,
.rg-library-advanced > summary::-webkit-details-marker {
  display: none;
}
.rg-library-directories summary::before,
.rg-library-research-tools > summary::before,
.rg-library-advanced > summary::before {
  width: 5px;
  height: 5px;
  border-right: 1px solid currentColor;
  border-bottom: 1px solid currentColor;
  content: '';
  transform: rotate(-45deg);
}
.rg-library-directories[open] > summary::before,
.rg-library-research-tools[open] > summary::before,
.rg-library-advanced[open] > summary::before {
  transform: rotate(45deg);
}
.rg-library-directories summary span:first-child,
.rg-library-research-tools > summary,
.rg-library-advanced > summary {
  flex: 1;
}
.rg-library-directories summary span:last-child {
  color: var(--dsw-alias-label-tertiary);
  font-size: 11px;
  font-variant-numeric: tabular-nums;
}
.rg-library-directories > div {
  display: grid;
  gap: 1px;
  padding: 3px 0 1px 12px;
}
.rg-library-directories > div button {
  display: flex;
  min-width: 0;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 4px 6px;
  border-radius: var(--dsw-radius-sm, 6px);
  color: var(--dsw-alias-label-secondary);
  text-align: left;
  font-size: 12px;
}
.rg-library-directories > div button:hover {
  background: var(--dsw-alias-interactive-bg-hover);
  color: var(--dsw-alias-label-primary);
}
.rg-library-directories > div button[aria-pressed='true'] {
  color: var(--dsw-alias-label-primary);
  font-weight: 550;
}
.rg-library-directories > div button span {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.rg-library-directories > div button small {
  flex: none;
  color: var(--dsw-alias-label-tertiary);
  font-size: 10px;
  font-variant-numeric: tabular-nums;
}
.rg-library-list > button {
  position: relative;
  display: grid;
  grid-template-columns: 16px minmax(0, 1fr) auto;
  gap: 2px 7px;
  width: 100%;
  min-width: 0;
  min-height: 70px;
  padding: 9px 9px;
  border: 0;
  border-bottom: 1px solid var(--dsw-alias-border-l1);
  border-radius: 0;
  background: transparent;
  text-align: left;
}
.rg-library-list > button:hover {
  background: var(--dsw-alias-interactive-bg-hover);
}
.rg-library-list > button[data-selected] {
  background: var(--dsw-alias-bg-multi-select);
}
.rg-library-row-icon {
  grid-column: 1;
  grid-row: 1 / span 2;
  align-self: start;
  padding-top: 1px;
  color: var(--dsw-alias-label-tertiary);
}
.rg-library-list > button[data-selected] .rg-library-row-icon {
  color: var(--dsw-alias-label-primary);
}
.rg-library-row-title {
  grid-column: 2;
  grid-row: 1;
  min-width: 0;
  overflow: hidden;
  color: var(--dsw-alias-label-primary);
  font-size: 12px;
  font-weight: 500;
  line-height: 1.35;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.rg-library-row-title code {
  margin-top: 1px;
  color: var(--dsw-alias-label-tertiary);
  font-size: 10px;
  font-weight: 400;
  line-height: 1.3;
}
.rg-library-row-meta {
  grid-column: 2;
  grid-row: 2;
  min-width: 0;
  overflow: hidden;
  color: var(--dsw-alias-label-tertiary);
  font-size: 10px;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.rg-library-row-meta time {
  overflow: hidden;
  text-overflow: ellipsis;
}
.rg-library-list > button > .rg-finance-badge {
  grid-column: 3;
  grid-row: 1 / span 2;
  align-self: center;
  max-width: 60px;
  padding: 2px 5px;
  border: 1px solid var(--dsw-alias-border-l2);
  border-radius: 999px;
  color: var(--dsw-alias-label-tertiary);
  font-size: 10px;
  font-weight: 500;
  line-height: 1.25;
  overflow-wrap: anywhere;
  white-space: normal;
}
.rg-library-list > button > .rg-finance-badge[data-status='available'],
.rg-library-list > button > .rg-finance-badge[data-status='accepted'],
.rg-library-list > button > .rg-finance-badge[data-status='compiled'] {
  color: var(--dsw-alias-label-secondary);
}
.rg-library-list > button > .rg-finance-badge[data-status='quarantined'] {
  border-color: color-mix(in srgb, var(--dsw-alias-state-warn-primary) 32%, transparent);
  color: var(--dsw-alias-state-warn-primary);
}
.rg-library-list > button > .rg-finance-badge[data-status='error'],
.rg-library-list > button > .rg-finance-badge[data-status='rejected'] {
  border-color: color-mix(in srgb, var(--dsw-alias-state-error-primary) 32%, transparent);
  color: var(--dsw-alias-state-error-primary);
}
.rg-library-preview {
  min-width: 0;
  min-height: 0;
  overflow-y: auto;
  padding: 0;
  background: var(--dsw-alias-bg-base);
}
.rg-library-detail-toolbar {
  display: none;
}
.rg-library-preview-head {
  position: sticky;
  top: 0;
  z-index: 3;
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: start;
  gap: 16px;
  padding: 16px 24px 14px;
  border-bottom: 1px solid var(--dsw-alias-border-l1);
  background: color-mix(in srgb, var(--dsw-alias-bg-base) 94%, transparent);
  backdrop-filter: blur(10px);
}
.rg-library-preview-head > div {
  min-width: 0;
}
.rg-library-document-heading {
  grid-column: 1;
}
.rg-library-document-kind {
  display: flex;
  align-items: center;
  gap: 6px;
  color: var(--dsw-alias-label-tertiary);
  font-size: 11px;
}
.rg-library-document-kind > span + span::before {
  margin-right: 6px;
  content: '·';
}
.rg-library-preview-head h3 {
  max-width: 42ch;
  margin: 7px 0 3px;
  color: var(--dsw-alias-label-primary);
  font-size: 23px;
  font-weight: 600;
  letter-spacing: -.025em;
  line-height: 1.18;
  overflow-wrap: anywhere;
}
.rg-library-preview-head code {
  display: block;
  color: var(--dsw-alias-label-tertiary);
  font-size: 11px;
  overflow-wrap: anywhere;
}
.rg-library-preview-actions {
  grid-column: 2;
}
.rg-library-preview-actions .rg-btn {
  min-height: 30px;
  padding: 5px 9px;
  color: var(--dsw-alias-label-secondary);
  font-size: 12px;
  white-space: normal;
}
.rg-library-back {
  display: none;
}
.rg-library-reader-layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  align-items: start;
}
.rg-library-document {
  min-width: 0;
  padding: 24px 32px 32px;
}
.rg-library-content-section {
  margin-top: 0;
}
.rg-library-reading h4 {
  margin: 0;
  color: var(--dsw-alias-label-tertiary);
  font-size: 11px;
  font-weight: 500;
}
[data-rg-root] .rg-library-original {
  max-width: 72ch;
  max-height: none;
  overflow: visible;
  margin: 0;
  padding: 20px 0 0;
  border: 0;
  border-top: 1px solid var(--dsw-alias-border-l1);
  border-radius: 0;
  background: transparent;
  color: var(--dsw-alias-label-primary);
  font-family: var(--dsh-font-family-text-default, system-ui);
  font-size: 14px;
  line-height: 1.82;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}
.rg-library-original mark {
  padding: 0;
  background: var(--dsw-alias-bg-multi-select);
  color: var(--dsw-alias-label-primary);
  box-shadow: inset 0 -1px var(--dsw-alias-brand-primary);
}
.rg-library-partial {
  max-width: 72ch;
  margin: 0 0 18px;
  padding: 9px 0;
  border-top: 1px solid var(--dsw-alias-border-l1);
  border-bottom: 1px solid var(--dsw-alias-border-l1);
  border-radius: 0;
  background: transparent;
  color: var(--dsw-alias-state-warn-primary);
  font-size: 12px;
}
.rg-library-inspector {
  min-width: 0;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  border-top: 1px solid var(--dsw-alias-border-l1);
  background: var(--dsw-alias-bg-layer-1);
}
.rg-library-inspector-section {
  padding: 14px;
  border-bottom: 1px solid var(--dsw-alias-border-l1);
}
.rg-library-inspector-section:first-child {
  padding-top: 17px;
}
.rg-library-inspector-section h4,
.rg-library-research-tools > summary,
.rg-library-advanced > summary {
  margin: 0 0 9px;
  color: var(--dsw-alias-label-secondary);
  font-size: 11px;
  font-weight: 600;
  letter-spacing: .015em;
}
.rg-library-facts {
  display: grid;
  gap: 9px;
  margin: 0;
}
.rg-library-facts > div {
  min-width: 0;
}
.rg-library-facts dt {
  color: var(--dsw-alias-label-tertiary);
  font-size: 10px;
}
.rg-library-facts dd {
  margin: 2px 0 0;
  color: var(--dsw-alias-label-secondary);
  font-size: 12px;
  line-height: 1.45;
  overflow-wrap: anywhere;
}
.rg-library-detail-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 12px;
  margin-top: 0;
}
.rg-library-detail-grid p {
  margin: 0;
  color: var(--dsw-alias-label-secondary);
  font-size: 12px;
  line-height: 1.5;
  overflow-wrap: anywhere;
}
.rg-library-tags {
  gap: 4px;
}
.rg-library-tags .rg-finance-badge {
  padding: 2px 5px;
  border: 1px solid var(--dsw-alias-border-l1);
  border-radius: 999px;
  color: var(--dsw-alias-label-secondary);
  font-size: 10px;
}
.rg-library-inspector-empty {
  margin: 0;
  color: var(--dsw-alias-label-tertiary);
  font-size: 12px;
}
.rg-library-relations {
  display: grid;
  gap: 2px;
  margin: 0;
  padding: 0;
  list-style: none;
}
.rg-library-relations button {
  display: grid;
  grid-template-columns: 15px minmax(0, 1fr);
  gap: 7px;
  width: 100%;
  min-width: 0;
  padding: 6px 4px;
  border-radius: var(--dsw-radius-sm, 6px);
  color: var(--dsw-alias-label-secondary);
  text-align: left;
}
.rg-library-relations button:hover {
  background: var(--dsw-alias-interactive-bg-hover);
}
.rg-library-relation-missing {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  padding: 6px 4px;
  color: var(--dsw-alias-label-tertiary);
}
.rg-library-relation-missing strong,
.rg-library-relation-missing small {
  display: block;
  overflow-wrap: anywhere;
}
.rg-library-relation-missing strong {
  font-size: 11px;
  font-weight: 500;
}
.rg-library-relation-missing small {
  margin-top: 2px;
  font-size: 10px;
}
.rg-library-relations button > span {
  min-width: 0;
}
.rg-library-relations strong,
.rg-library-relations small {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.rg-library-relations strong {
  color: var(--dsw-alias-label-primary);
  font-size: 12px;
  font-weight: 500;
}
.rg-library-relations small {
  margin-top: 2px;
  color: var(--dsw-alias-label-tertiary);
  font-size: 10px;
}
.rg-library-inspector .rg-library-research-tools,
.rg-library-inspector .rg-library-advanced {
  padding: 12px 14px;
}
.rg-library-research-tools > summary,
.rg-library-advanced > summary {
  display: flex;
  margin: 0;
}
.rg-library-research-tools[open] > summary,
.rg-library-advanced[open] > summary {
  margin-bottom: 10px;
}
.rg-library-actions {
  display: grid;
  align-items: stretch;
  gap: 6px;
  margin: 0;
}
.rg-library-actions .rg-btn {
  min-height: 28px;
  padding: 4px 7px;
  font-size: 11px;
  white-space: normal;
}
.rg-library-compile-as-of {
  min-width: 0;
  gap: 4px;
  font-size: 10px;
}
.rg-library-compile-as-of input {
  width: 100%;
  min-width: 0;
  min-height: 28px;
  padding: 4px 6px;
  font-size: 11px;
}
.rg-library-inspector .rg-research-runs {
  margin: 10px 0 0;
}
.rg-library-inspector .rg-research-run {
  padding: 8px 0;
}
.rg-library-inspector .rg-research-run p,
.rg-library-inspector .rg-research-run span {
  font-size: 11px;
  line-height: 1.45;
}
.rg-library-annotations {
  display: grid;
  gap: 0;
}
.rg-library-annotations > li {
  padding: 9px 0;
}
.rg-library-annotations > li:first-child {
  padding-top: 0;
  border-top: 0;
}
.rg-library-annotations blockquote {
  margin-bottom: 6px;
  padding: 7px 8px;
  border-radius: 0;
  background: var(--dsw-alias-bg-layer-2);
  font-size: 12px;
  line-height: 1.55;
}
.rg-library-annotations p,
.rg-library-locator {
  font-size: 11px;
  line-height: 1.45;
}
.rg-library-advanced .rg-finance-provenance {
  margin: 0;
}
.rg-library-advanced .rg-finance-provenance-list,
.rg-library-advanced .rg-finance-raw {
  margin-top: 9px;
}

.rg-library-row-title {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  white-space: normal;
  line-height: 1.5;
  font-size: 12px;
}
.rg-library-row-meta time { display: inline; }
.rg-library-document-date,
.rg-library-summary-meta {
  color: var(--dsw-alias-label-tertiary);
  font-size: 11px;
}
.rg-library-preview-head { backdrop-filter: none; background: var(--dsw-alias-bg-base); }
.rg-library-summary {
  padding-bottom: 22px;
  margin-bottom: 22px;
  border-bottom: 1px solid var(--dsw-alias-border-l2);
}
.rg-library-summary-head,
.rg-library-original-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
}
.rg-library-summary-head h4,
.rg-library-original-head h4 {
  margin: 0;
  color: var(--dsw-alias-label-primary);
  font-size: 13px;
  font-weight: 600;
}
.rg-library-summary-head .rg-btn { min-height: 28px; padding: 4px 9px; font-size: 11px; }
.rg-library-summary-empty { margin: 0; color: var(--dsw-alias-label-secondary); line-height: 1.7; font-size: 13px; }
.rg-library-summary-text { max-width: 72ch; font-size: 14px; line-height: 1.8; }
.rg-library-summary-meta { margin: 12px 0 0; }
.rg-library-extracted { margin: 0 0 24px; font-size: 12px; }
.rg-library-extracted summary { cursor: pointer; font-weight: 500; }
.rg-library-extracted summary span { margin-left: 6px; color: var(--dsw-alias-label-tertiary); }
.rg-library-extracted ul { list-style: none; padding: 4px 0 0; }
.rg-library-extracted li + li { border-top: 1px solid var(--dsw-alias-border-l1); }
.rg-library-extracted button { display: flex; width: 100%; justify-content: space-between; gap: 12px; padding: 9px 0; text-align: left; line-height: 1.6; }
.rg-library-extracted button:hover { color: var(--dsw-alias-brand-primary); }
.rg-library-original-head a,
.rg-library-original-head > span { min-width: 0; color: var(--dsw-alias-label-secondary); font-size: 11px; overflow-wrap: anywhere; }
.rg-library-original-link { text-decoration: none; }
[data-rg-root] .rg-library-markdown { white-space: normal; padding-top: 12px; }
.rg-library-markdown table { display: block; max-width: 100%; overflow-x: auto; font-size: 12px; }
.rg-library-markdown p:first-child { margin-top: 0; }
.rg-library-inspector > .rg-library-advanced { grid-column: 1 / -1; }
@media (max-width: 1180px) {
  .rg-library-reader-layout {
    grid-template-columns: minmax(0, 1fr);
  }
  .rg-library-inspector {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    border-top: 1px solid var(--dsw-alias-border-l2);
    border-left: 0;
  }
  .rg-library-inspector-section {
    border-right: 1px solid var(--dsw-alias-border-l1);
  }
}
@media (max-width: 900px) {
  .rg-library {
    grid-template-columns: 220px minmax(0, 1fr);
  }
  .rg-library-document {
    padding-right: 26px;
    padding-left: 26px;
  }
}
@media (max-width: 720px) {
  .rg-library {
    display: block;
    min-height: 0;
    overflow: visible;
    border: 0;
    border-radius: 0;
    background: transparent;
  }
  .rg-library-list {
    height: 100%;
    border-right: 0;
  }
  .rg-library[data-drill='list'] .rg-library-preview {
    display: none;
  }
  .rg-library[data-drill='preview'] .rg-library-list {
    display: none;
  }
  .rg-library-preview {
    height: 100%;
    overflow-y: visible;
  }
  .rg-library-detail-toolbar {
    display: grid;
    position: static;
    padding: 9px 12px;
    border-bottom: 1px solid var(--dsw-alias-border-l1);
    background: var(--dsw-alias-bg-base);
  }
  .rg-library-preview-head {
    position: static;
    grid-template-columns: minmax(0, 1fr) auto;
    gap: 8px;
    padding: 12px 16px 14px;
    background: var(--dsw-alias-bg-base);
    backdrop-filter: none;
  }
  .rg-library-back {
    display: inline-flex;
    grid-column: 1 / -1;
    justify-self: start;
    min-height: 30px;
  }
  .rg-library-document-heading {
    grid-column: 1 / -1;
    grid-row: 2;
  }
  .rg-library-preview-actions {
    grid-column: 1 / -1;
    grid-row: 3;
  }
  .rg-library-preview-actions .rg-btn {
    width: 100%;
  }
  .rg-library-preview-head h3 {
    max-width: none;
    font-size: 23px;
  }
  .rg-library-document {
    padding: 22px 16px 36px;
  }
  .rg-library-original {
    font-size: 15px;
    line-height: 1.78;
  }
  .rg-library-inspector {
    display: block;
    border-top: 1px solid var(--dsw-alias-border-l2);
  }
  .rg-library-inspector-section {
    border-right: 0;
  }
}
`
