import { useSyncExternalStore } from 'react'
import type { ReactNode } from 'react'
import type { ResearchOperation, ResearchState, ResearchStore } from '../research-store.ts'
import type { Translate } from '../store.ts'

export function useResearch(store: ResearchStore): ResearchState {
  return useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot)
}

export function ResearchRuns({ store, t, kind, sourceId, hypothesisId, onOpenArtifact }: {
  readonly store: ResearchStore
  readonly t: Translate
  readonly kind: 'compile' | 'research' | 'review'
  readonly sourceId?: string
  readonly hypothesisId?: string
  readonly onOpenArtifact: (id: string) => void
}) {
  const state = useResearch(store)
  const operations = state.operations.filter(operation => operation.request.kind === kind
    && (sourceId === undefined || operation.request.kind === 'compile' && operation.request.sourceIds.includes(sourceId))
    && (hypothesisId === undefined || operation.request.kind === 'review' && operation.request.hypothesisId === hypothesisId))
  if (operations.length === 0) return null
  return (
    <section className="rg-research-runs" aria-label={t(`research.runs.${kind}`)}>
      {operations.map(operation => <ResearchRun key={operation.runId} operation={operation} store={store} t={t} onOpenArtifact={onOpenArtifact} />)}
    </section>
  )
}

function ResearchRun({ operation, store, t, onOpenArtifact }: {
  readonly operation: ResearchOperation
  readonly store: ResearchStore
  readonly t: Translate
  readonly onOpenArtifact: (id: string) => void
}) {
  const retryable = operation.status === 'failed' || operation.status === 'timeout'
  return (
    <article className="rg-research-run" data-status={operation.status}>
      <div className="rg-research-run-head">
        <strong>{t(`research.status.${operation.status}`)}</strong>
        <code>{operation.runId}</code>
        {retryable && <button type="button" className="rg-btn" onClick={() => { store.retry(operation.runId) }}>{t('research.retry')}</button>}
      </div>
      {operation.request.kind === 'review' && <p className="rg-research-review-target">{t(`research.review.mode.${operation.request.mode}`)} · <code>{operation.request.hypothesisId}</code> · {operation.request.asOf}</p>}
      <p>{t(`research.statusDetail.${operation.status}`, { count: operation.artifactIds.length })}</p>
      {operation.sessionId !== null && <span className="rg-research-session">Session <code>{operation.sessionId}</code></span>}
      {operation.error !== null && <p className="rg-research-run-error" role="alert">{operation.error.code}: {operation.error.message}</p>}
      {operation.artifactIds.length > 0 && <div className="rg-research-artifacts">{operation.artifactIds.map(id => <button type="button" className="rg-chip" key={id} onClick={() => { onOpenArtifact(id) }}>{id}</button>)}</div>}
    </article>
  )
}

export function ResearchGraphBoundary({ phase, error, t, onRefresh, children }: {
  readonly phase: 'loading' | 'ready' | 'error'
  readonly error: { readonly code: string; readonly message: string } | null
  readonly t: Translate
  readonly onRefresh: () => Promise<void>
  readonly children: ReactNode
}) {
  if (phase === 'loading') return <div className="rg-state" role="status"><div className="rg-skeleton" /><div className="rg-skeleton" style={{ width: 'min(420px, 72%)' }} /><span>{t('research.loading')}</span></div>
  if (phase === 'error') return <div className="rg-state" role="alert"><p className="rg-state-title">{t('research.errorTitle')}</p><p className="rg-state-detail">{error?.code}: {error?.message}</p><button type="button" className="rg-btn" data-primary onClick={() => { void onRefresh() }}>{t('state.error.retry')}</button></div>
  return <>{children}</>
}
