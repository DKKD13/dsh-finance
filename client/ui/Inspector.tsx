/**
 * Node inspector: the selected node's full record, its outgoing edges and
 * backlinks with per-edge removal, and the entry points for editing,
 * deleting, and linking. All mutations run through the store's wire actions.
 * @module dsh-research-graph/client/ui/Inspector
 */

import { MarkdownText } from '@deepseek-ai/dsh-client-ui-primitives'
import { protectReportCurrency } from '../report-markdown.ts'
import { incidentEdges, visibleNodes } from '../store.ts'
import { useWorkbench } from './common.ts'
import type { ViewProps } from './common.ts'

/** The selected node's detail sheet. */
export function Inspector({ store, t }: ViewProps) {
  const state = useWorkbench(store)
  const node = state.selectedId === null ? undefined : state.nodes.find(candidate => candidate.id === state.selectedId)
  if (node === undefined) return null
  const hiddenByFilter = !visibleNodes(state).some(candidate => candidate.id === node.id)
  const zh = t('inspector.close') === '关闭详情'
  const { out, incoming } = incidentEdges(state.edges, node.id)
  const metadataText = Object.keys(node.metadata).length === 0 ? null : JSON.stringify(node.metadata, null, 2)
  const readingContent = ['claim', 'belief', 'signal', 'question', 'deliverable'].includes(node.kind)

  return (
    <aside className="rg-inspector" aria-label={node.title}>
      {hiddenByFilter && (
        <div className="rg-inspector-filtered" role="status">
          <span>{zh ? '当前筛选不显示此节点。' : 'This node is outside the current filters.'}</span>
          <button type="button" className="rg-btn" onClick={() => { store.revealNode(node.id) }}>
            {zh ? '清除筛选并定位' : 'Clear filters & show node'}
          </button>
        </div>
      )}
      <div className="rg-inspector-head">
        <h2 className="rg-inspector-title">{node.title}</h2>
        <button type="button" className="rg-icon-btn" aria-label={t('inspector.close')} onClick={() => { store.select(null) }}>
          <svg width={14} height={14} viewBox="0 0 14 14" aria-hidden><path d="M3 3l8 8M11 3l-8 8" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" fill="none" /></svg>
        </button>
      </div>
      <div className="rg-inspector-body">
        <span className="rg-kind-chip">
          <span className="rg-chip-dot" style={{ background: `var(--rg-kind-${node.kind})` }} />
          {t(`kind.${node.kind}`)}
        </span>
        <div className="rg-section">
          <button
            type="button"
            className="rg-row-id"
            style={{ background: 'none', border: 'none', padding: 0, cursor: 'copy', textAlign: 'left' }}
            title={t('inspector.copyId')}
            onClick={() => {
              void navigator.clipboard?.writeText(node.id).then(() => { store.flash(t('inspector.idCopied')) })
            }}
          >
            {node.id}
          </button>
        </div>
        <div className="rg-section">
          <h3 className="rg-section-title">{t('inspector.content')}</h3>
          {node.content.length === 0
            ? <p className="rg-content" data-empty>{t('inspector.emptyContent')}</p>
            : readingContent
              ? <div className="rg-content rg-content-markdown"><MarkdownText text={protectReportCurrency(node.content)} omitHtml labels={{
                code: {
                  copyLabel: t('reports.markdown.copy'), copiedLabel: t('reports.markdown.copied'),
                  toolbarLabels: { codeLabel: t('reports.markdown.code'), wrapLabel: t('reports.markdown.wrap'), unwrapLabel: t('reports.markdown.unwrap') },
                },
                footnotes: t('reports.markdown.footnotes'),
              }} /></div>
              : <pre className="rg-content">{node.content}</pre>}
        </div>
        {metadataText !== null && (
          <div className="rg-section">
            <h3 className="rg-section-title">{t('inspector.metadata')}</h3>
            <pre className="rg-meta">{metadataText}</pre>
          </div>
        )}
        <div className="rg-section">
          <h3 className="rg-section-title">{t('inspector.outgoing')} ({out.length})</h3>
          <EdgeList store={store} t={t} edges={out} otherEnd="to" />
        </div>
        <div className="rg-section">
          <h3 className="rg-section-title">{t('inspector.backlinks')} ({incoming.length})</h3>
          <EdgeList store={store} t={t} edges={incoming} otherEnd="from" />
        </div>
      </div>
      <div className="rg-inspector-actions">
        <button type="button" className="rg-btn" data-primary onClick={() => { store.openEditor({ kind: 'edit', id: node.id }) }}>
          {t('inspector.edit')}
        </button>
        <button type="button" className="rg-btn" onClick={() => { store.openLinking(node.id) }}>
          {t('inspector.addEdge')}
        </button>
        <button type="button" className="rg-btn" data-danger onClick={() => { store.confirmRemove(node.id) }}>
          {t('inspector.delete')}
        </button>
      </div>
    </aside>
  )
}

/** One list of edges with select-on-click and explicit removal. */
function EdgeList({ store, t, edges, otherEnd }: ViewProps & {
  readonly edges: readonly import('../../src/graph.ts').GraphEdge[]
  readonly otherEnd: 'from' | 'to'
}) {
  const state = useWorkbench(store)
  if (edges.length === 0) return null
  return (
    <ul className="rg-edge-list">
      {edges.map(edge => {
        const targetId = edge[otherEnd]
        const target = state.nodes.find(node => node.id === targetId)
        return (
          <li key={edge.id}>
            <div className="rg-edge-item">
              <button type="button" className="rg-edge-select" onClick={() => { store.revealNode(targetId) }}>
                <span className="rg-edge-kind">{t(`edge.${edge.kind}`)}</span>
                <span className="rg-edge-target">{target?.title ?? targetId}</span>
              </button>
              <button
                type="button"
                className="rg-edge-remove"
                aria-label={t('edge.remove')}
                disabled={state.busy !== null}
                onClick={() => { void store.removeEdge(edge.id) }}
              >
                <svg width={12} height={12} viewBox="0 0 12 12" aria-hidden><path d="M2.5 2.5l7 7M9.5 2.5l-7 7" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" fill="none" /></svg>
              </button>
            </div>
          </li>
        )
      })}
    </ul>
  )
}
