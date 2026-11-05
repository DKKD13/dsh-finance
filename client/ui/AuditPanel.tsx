/**
 * Audit mode: the integrity report — broken edges, dangling metadata
 * references, unresolved import targets, and orphan nodes — with
 * click-through to the affected node on the canvas.
 * @module deepseek-harness-finance-plugin/client/ui/AuditPanel
 */

import { useWorkbench } from './common.ts'
import type { ViewProps } from './common.ts'

/** The integrity audit view. */
export function AuditPanel({ store, t }: ViewProps) {
  const state = useWorkbench(store)
  const audit = state.audit

  if (audit === null && state.auditError !== null) {
    return <div className="rg-state" role="alert"><p className="rg-state-title">{t('audit.errorTitle')}</p><p className="rg-state-detail">{state.auditError.code}: {state.auditError.message}</p><button type="button" className="rg-btn" data-primary disabled={state.auditLoading} onClick={() => { void store.loadAudit() }}>{t('state.error.retry')}</button></div>
  }
  if (audit === null) {
    return (
      <div className="rg-state" role="status">
        <div className="rg-skeleton" />
        <div className="rg-skeleton" />
      </div>
    )
  }

  const clean = audit.brokenEdges.length === 0 && audit.brokenRefs.length === 0
    && audit.unresolvedRefs.length === 0 && audit.orphans.length === 0

  const jumpToNode = (id: string) => {
    store.revealNode(id)
  }

  return (
    <div className="rg-audit">
      <div className="rg-history-range">
        <h3 className="rg-section-title" style={{ fontSize: 13, margin: 0 }}>{t('audit.title')}</h3>
        <span className="rg-spacer" />
        <button type="button" className="rg-btn" disabled={state.auditLoading} onClick={() => { void store.loadAudit() }}>{t('audit.refresh')}</button>
      </div>
      {state.auditError !== null && <div className="rg-finance-form-error" role="alert"><p>{t('audit.errorTitle')}: {state.auditError.code}: {state.auditError.message}</p><button type="button" className="rg-btn" disabled={state.auditLoading} onClick={() => { void store.loadAudit() }}>{t('state.error.retry')}</button></div>}
      {clean && <p className="rg-audit-clean">{t('audit.clean')}</p>}
      <AuditSection title={t('audit.brokenEdges')} count={audit.brokenEdges.length}>
        {audit.brokenEdges.map(edge => (
          <li key={edge.id}>
            <button type="button" className="rg-warn" onClick={() => { jumpToNode(edge.from) }}>
              {edge.id}
            </button>
          </li>
        ))}
      </AuditSection>
      <AuditSection title={t('audit.brokenRefs')} count={audit.brokenRefs.length}>
        {audit.brokenRefs.map(ref => (
          <li key={`${ref.node}→${ref.reference}`}>
            <button type="button" className="rg-warn" onClick={() => { jumpToNode(ref.node) }}>
              {ref.node} → {ref.reference}
            </button>
          </li>
        ))}
      </AuditSection>
      <AuditSection title={t('audit.unresolvedRefs')} count={audit.unresolvedRefs.length}>
        {audit.unresolvedRefs.map(ref => (
          <li key={`${ref.node}→${ref.target}`}>
            <button type="button" className="rg-warn" onClick={() => { jumpToNode(ref.node) }}>
              {ref.node} → {ref.target}
            </button>
          </li>
        ))}
      </AuditSection>
      <AuditSection title={t('audit.orphans')} count={audit.orphans.length}>
        {audit.orphans.map(id => (
          <li key={id}>
            <button type="button" onClick={() => { jumpToNode(id) }}>{id}</button>
          </li>
        ))}
      </AuditSection>
    </div>
  )
}

/** One audit category, hidden when empty. */
function AuditSection({ title, count, children }: {
  readonly title: string
  readonly count: number
  readonly children: React.ReactNode
}) {
  if (count === 0) return null
  return (
    <section className="rg-section">
      <h4 className="rg-diff-title">{title}<span className="rg-audit-count">{count}</span></h4>
      <ul className="rg-audit-list">{children}</ul>
    </section>
  )
}
