/**
 * The workbench's three dialogs: node create/edit, edge creation, and node
 * removal confirmation. All are fixed overlays with `role="dialog"`, Escape
 * to close, and submit through the store's wire actions; a failed submit
 * keeps the dialog open with the error surfaced by the store's notice.
 * @module dsh-research-graph/client/ui/Dialogs
 */

import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { EDGE_KINDS, NODE_KINDS } from '../../src/graph.ts'
import type { EdgeKind, NodeKind } from '../../src/graph.ts'
import { incidentEdges } from '../store.ts'
import { useWorkbench } from './common.ts'
import type { ViewProps } from './common.ts'

const FOCUSABLE = 'button:not(:disabled), input:not(:disabled), textarea:not(:disabled), select:not(:disabled), [tabindex="0"]'

/** Own initial focus, Tab containment, Escape, and focus restoration while open. */
function useDialogBehavior(onClose: () => void, open: boolean) {
  const ref = useRef<HTMLDivElement | null>(null)
  const closeRef = useRef(onClose)
  closeRef.current = onClose
  useEffect(() => {
    if (!open) return
    const dialog = ref.current
    if (dialog === null) return
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const items = () => [...dialog.querySelectorAll<HTMLElement>(FOCUSABLE)]
    const first = items()[0] ?? dialog
    first.focus()
    const onKey = (event: KeyboardEvent) => {
      const foreground = [...document.querySelectorAll<HTMLElement>('.rg-dialog[aria-modal="true"]')].at(-1)
      if (foreground !== dialog || event.defaultPrevented) return
      if (event.key === 'Escape') {
        event.preventDefault()
        event.stopPropagation()
        closeRef.current()
        return
      }
      if (event.key !== 'Tab') return
      const controls = items()
      const firstControl = controls[0] ?? dialog
      const lastControl = controls.at(-1) ?? dialog
      const outside = !dialog.contains(document.activeElement)
      if (outside || (event.shiftKey && document.activeElement === firstControl) || (!event.shiftKey && document.activeElement === lastControl)) {
        event.preventDefault()
        const target = event.shiftKey ? lastControl : firstControl
        target.focus()
      }
    }
    document.addEventListener('keydown', onKey, true)
    return () => {
      document.removeEventListener('keydown', onKey, true)
      if (previous?.isConnected) previous.focus()
    }
  }, [open])
  return ref
}

/** The node editor, for both create and edit. */
export function NodeEditorDialog({ store, t }: ViewProps) {
  const state = useWorkbench(store)
  const editor = state.editor
  const existing = editor?.kind === 'edit' ? state.nodes.find(node => node.id === editor.id) : undefined
  const [metadataError, setMetadataError] = useState(false)
  const closeRef = useRef<() => void>(() => {})
  closeRef.current = () => { store.openEditor(null) }
  const ref = useDialogBehavior(() => { closeRef.current() }, editor !== null)
  if (editor === null) return null

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    const title = String(data.get('title') ?? '').trim()
    if (title.length === 0) return
    const metadataText = String(data.get('metadata') ?? '').trim()
    let metadata: Record<string, unknown> | undefined
    if (metadataText.length > 0) {
      try {
        const parsed: unknown = JSON.parse(metadataText)
        if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) throw new Error('not an object')
        metadata = parsed as Record<string, unknown>
      } catch {
        setMetadataError(true)
        return
      }
    }
    setMetadataError(false)
    const content = String(data.get('content') ?? '')
    if (editor.kind === 'create') {
      const id = String(data.get('id') ?? '').trim()
      void store.createNode({
        ...(id.length > 0 ? { id } : {}),
        kind: String(data.get('kind') ?? 'claim') as NodeKind,
        title,
        ...(content.length > 0 ? { content } : {}),
        ...(metadata === undefined ? {} : { metadata }),
      })
      return
    }
    void store.updateNode(editor.id, {
      title,
      content,
      metadata: metadata ?? {},
    })
  }

  return (
    <div className="rg-overlay" onPointerDown={event => { if (event.target === event.currentTarget) store.openEditor(null) }}>
      <div ref={ref} className="rg-dialog" role="dialog" aria-modal="true" aria-label={t(editor.kind === 'create' ? 'editor.createTitle' : 'editor.editTitle')}>
        <h3 className="rg-dialog-title">{t(editor.kind === 'create' ? 'editor.createTitle' : 'editor.editTitle')}</h3>
        <form className="rg-form" onSubmit={onSubmit}>
          {editor.kind === 'create' && (
            <label className="rg-field">
              <span className="rg-field-label">{t('editor.id')}</span>
              <input name="id" placeholder="claim:my-note" />
              <span className="rg-field-hint">{t('editor.idHint')}</span>
            </label>
          )}
          {editor.kind === 'create' && (
            <label className="rg-field">
              <span className="rg-field-label">{t('editor.kind')}</span>
              <select name="kind" defaultValue="claim">
                {NODE_KINDS.map(kind => <option key={kind} value={kind}>{t(`kind.${kind}`)}</option>)}
              </select>
            </label>
          )}
          <label className="rg-field">
            <span className="rg-field-label">{t('editor.title')}</span>
            <input name="title" required defaultValue={existing?.title ?? ''} />
          </label>
          <label className="rg-field">
            <span className="rg-field-label">{t('editor.content')}</span>
            <textarea name="content" defaultValue={existing?.content ?? ''} />
          </label>
          <label className="rg-field">
            <span className="rg-field-label">{t('editor.metadata')}</span>
            <textarea
              name="metadata"
              defaultValue={existing === undefined ? '' : JSON.stringify(existing.metadata, null, 2)}
              style={{ minHeight: 64 }}
              aria-invalid={metadataError}
              onInput={() => { setMetadataError(false) }}
            />
            {metadataError && <span className="rg-field-error" role="alert">{t('editor.metadataInvalid')}</span>}
          </label>
          <div className="rg-dialog-actions">
            <button type="button" className="rg-btn" onClick={() => { store.openEditor(null) }}>{t('editor.cancel')}</button>
            <button type="submit" className="rg-btn" data-primary disabled={state.busy !== null}>
              {t(editor.kind === 'create' ? 'editor.create' : 'editor.save')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

/** The edge-creation dialog: a fixed source node, a target picker, a kind. */
export function LinkDialog({ store, t }: ViewProps) {
  const state = useWorkbench(store)
  const linking = state.linking
  const closeRef = useRef<() => void>(() => {})
  closeRef.current = () => { store.openLinking(null) }
  const ref = useDialogBehavior(() => { closeRef.current() }, linking !== null)
  if (linking === null) return null

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    const to = String(data.get('to') ?? '')
    if (!state.nodes.some(node => node.id === to)) return
    void store.addEdge({ from: linking.from, to, kind: String(data.get('kind') ?? 'references') as EdgeKind })
  }

  return (
    <div className="rg-overlay" onPointerDown={event => { if (event.target === event.currentTarget) store.openLinking(null) }}>
      <div ref={ref} className="rg-dialog" role="dialog" aria-modal="true" aria-label={t('link.title', { from: linking.from })}>
        <h3 className="rg-dialog-title">{t('link.title', { from: linking.from })}</h3>
        <form className="rg-form" onSubmit={onSubmit}>
          <label className="rg-field">
            <span className="rg-field-label">{t('link.to')}</span>
            <input name="to" list="rg-link-targets" required placeholder="node id" />
            <datalist id="rg-link-targets">
              {state.nodes.filter(node => node.id !== linking.from).map(node => (
                <option key={node.id} value={node.id}>{node.title}</option>
              ))}
            </datalist>
          </label>
          <label className="rg-field">
            <span className="rg-field-label">{t('link.kind')}</span>
            <select name="kind" defaultValue="references">
              {EDGE_KINDS.map(kind => <option key={kind} value={kind}>{t(`edge.${kind}`)}</option>)}
            </select>
          </label>
          <div className="rg-dialog-actions">
            <button type="button" className="rg-btn" onClick={() => { store.openLinking(null) }}>{t('editor.cancel')}</button>
            <button type="submit" className="rg-btn" data-primary disabled={state.busy !== null}>{t('link.create')}</button>
          </div>
        </form>
      </div>
    </div>
  )
}

/** The node-removal confirmation, naming the cascade cost up front. */
export function RemoveDialog({ store, t }: ViewProps) {
  const state = useWorkbench(store)
  const removing = state.removing
  const closeRef = useRef<() => void>(() => {})
  closeRef.current = () => { store.confirmRemove(null) }
  const ref = useDialogBehavior(() => { closeRef.current() }, removing !== null)
  if (removing === null) return null
  const incident = incidentEdges(state.edges, removing.id)
  const edgeCount = incident.out.length + incident.incoming.length

  return (
    <div className="rg-overlay" onPointerDown={event => { if (event.target === event.currentTarget) store.confirmRemove(null) }}>
      <div ref={ref} className="rg-dialog" role="alertdialog" aria-modal="true" aria-label={t('remove.title', { id: removing.id })}>
        <h3 className="rg-dialog-title">{t('remove.title', { id: removing.id })}</h3>
        <p className="rg-dialog-body">
          {edgeCount > 0 ? t('remove.cascade', { count: edgeCount }) : null}
        </p>
        <div className="rg-dialog-actions">
          <button type="button" className="rg-btn" onClick={() => { store.confirmRemove(null) }}>{t('remove.cancel')}</button>
          <button
            type="button"
            className="rg-btn"
            data-danger
            disabled={state.busy !== null}
            onClick={() => { void store.removeNode(removing.id) }}
          >
            {t('remove.confirm')}
          </button>
        </div>
      </div>
    </div>
  )
}
