import { useId, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { financeOperation } from '../finance-store.ts'
import {
  describeInboxFile,
  displayInboxEntry,
  formatFileSize,
  inferInboxMimeType,
  INBOX_FILE_ACCEPT,
  isSupportedInboxFile,
  parseClipperJson,
  readInboxPreview,
  readInboxReviewItems,
} from '../inbox.ts'
import { asRecord, Field, FinanceEmpty, OperationStatus, RawJson, useFinance } from './FinanceCommon.tsx'
import type { FinancePanelProps } from './FinanceCommon.tsx'

type InboxEntry = 'url' | 'clip' | 'file'

interface InboxPanelProps extends FinancePanelProps {
  readonly onOpenGraph: (id?: string) => void
  readonly initialEntry?: InboxEntry
}

function EntryList({ title, entries, open = false }: { readonly title: string; readonly entries: readonly unknown[]; readonly open?: boolean }) {
  if (entries.length === 0) return null
  return (
    <details className="rg-inbox-entry-list" open={open}>
      <summary>{title} ({entries.length})</summary>
      <ul>{entries.map((entry, index) => <li key={`${displayInboxEntry(entry)}-${index}`}>{displayInboxEntry(entry)}</li>)}</ul>
    </details>
  )
}

export function InboxPanel({ store, t, onOpenGraph, initialEntry = 'url' }: InboxPanelProps) {
  const tabId = useId()
  const state = useFinance(store)
  const previewOperation = financeOperation(state, 'ingest')
  const commitOperation = financeOperation(state, 'inboxCommit')
  const preview = readInboxPreview(previewOperation.result)
  const draft = store.getInboxDraft()
  const [entry, setEntry] = useState<InboxEntry>(initialEntry)
  const [source, setSource] = useState<'rss' | 'youtube'>(draft.source)
  const [url, setUrl] = useState(draft.url)
  const [clipText, setClipText] = useState(draft.clipText)
  const [file, setFile] = useState<File | null>(draft.file)
  const [asOf, setAsOf] = useState(draft.asOf)
  const [validation, setValidation] = useState<string | null>(null)
  const [readingFile, setReadingFile] = useState(false)
  const [inputRevision, setInputRevision] = useState(0)
  const [submittedInput, setSubmittedInput] = useState<{ readonly entry: InboxEntry; readonly revision: number } | null>(null)
  const [commitPreview, setCommitPreview] = useState<unknown>(null)
  const fileReadToken = useRef(0)
  const reviewMatchesInput = submittedInput?.entry === entry && submittedInput.revision === inputRevision
  const commitMatchesPreview = reviewMatchesInput && commitPreview !== null && commitPreview === previewOperation.result
  const previewLoading = reviewMatchesInput && previewOperation.status === 'loading' || readingFile
  const commitLoading = commitMatchesPreview && commitOperation.status === 'loading'
  const commitComplete = commitMatchesPreview && commitOperation.status === 'success'
  const reviewItems = preview === undefined ? [] : readInboxReviewItems(preview.items)
  const statusLabel = (status: string): string => {
    if (status === 'accepted' || status === 'ready') return t('finance.inbox.accepted')
    if (status === 'duplicate') return t('finance.inbox.duplicates')
    if (status === 'quarantined') return t('finance.inbox.quarantined')
    if (status === 'rejected') return t('finance.inbox.rejected')
    if (status === 'preview') return t('finance.inbox.previewStatus')
    return status
  }

  const invalidateInput = () => {
    fileReadToken.current += 1
    store.invalidateInboxInput()
    setReadingFile(false)
    setInputRevision(value => value + 1)
    setSubmittedInput(null)
    setCommitPreview(null)
    setValidation(null)
  }

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    const cutoff = asOf.trim()
    const reviewedAsOf = cutoff.length > 0 ? cutoff : undefined
    setValidation(null)
    setSubmittedInput({ entry, revision: inputRevision })
    setCommitPreview(null)
    if (entry === 'url') {
      try {
        const parsed = new URL(url)
        if (!['http:', 'https:'].includes(parsed.protocol) || parsed.username.length > 0 || parsed.password.length > 0) throw new Error('public URL required')
        await store.previewUrl(source, parsed.toString(), reviewedAsOf)
      } catch {
        setSubmittedInput(null)
        setValidation(t('finance.inbox.invalidUrl'))
      }
      return
    }
    if (entry === 'clip') {
      try {
        const clip = parseClipperJson(clipText)
        await store.previewClip(clip, reviewedAsOf)
      } catch (error: unknown) {
        setSubmittedInput(null)
        setValidation(`${t('finance.inbox.invalidClip')}: ${error instanceof Error ? error.message : String(error)}`)
      }
      return
    }
    if (file === null) {
      setSubmittedInput(null)
      setValidation(t('finance.inbox.fileRequired'))
      return
    }
    if (!isSupportedInboxFile(file.name)) {
      setSubmittedInput(null)
      setValidation(t('finance.inbox.unsupportedFile'))
      return
    }
    const token = fileReadToken.current + 1
    fileReadToken.current = token
    setReadingFile(true)
    try {
      const descriptor = await describeInboxFile(file)
      if (fileReadToken.current === token) await store.previewFile(descriptor, reviewedAsOf)
    } catch (error: unknown) {
      if (fileReadToken.current === token) {
        setSubmittedInput(null)
        setValidation(`${t('finance.inbox.fileReadError')}: ${error instanceof Error ? error.message : String(error)}`)
      }
    } finally {
      if (fileReadToken.current === token) setReadingFile(false)
    }
  }

  const commitResult = asRecord(commitOperation.result)
  const committedRevision = typeof commitResult?.revision === 'number' ? commitResult.revision : state.revision
  const committedSource = Array.isArray(commitResult?.sourceIds) && typeof commitResult.sourceIds[0] === 'string'
    ? commitResult.sourceIds[0]
    : preview?.plannedNodes.find(node => node.kind === 'source')?.id
  const hasInput = entry === 'url' ? url.trim().length > 0 : entry === 'clip' ? clipText.trim().length > 0 : file !== null

  return (
    <section className="rg-finance-section rg-inbox" aria-labelledby="rg-finance-inbox-title">
      <div className="rg-finance-section-head">
        <div><h2 id="rg-finance-inbox-title">{t('finance.inbox.title')}</h2><p>{t('finance.inbox.description')}</p></div>
        <span className="rg-finance-badge">{t('finance.inbox.previewBadge')}</span>
      </div>

      <div className="rg-inbox-entry-tabs" role="tablist" aria-label={t('finance.inbox.entryLabel')}>
        {(['url', 'clip', 'file'] as const).map((value, index) => (
          <button key={value} id={`${tabId}-tab-${value}`} type="button" role="tab" aria-selected={entry === value} aria-controls={`${tabId}-panel`} tabIndex={entry === value ? 0 : -1} data-active={entry === value || undefined}
            onClick={() => { setEntry(value); invalidateInput() }}
            onKeyDown={event => {
              const values = ['url', 'clip', 'file'] as const
              const next = event.key === 'ArrowLeft' ? (index + values.length - 1) % values.length : event.key === 'ArrowRight' ? (index + 1) % values.length : event.key === 'Home' ? 0 : event.key === 'End' ? values.length - 1 : -1
              const nextValue = values[next]
              if (nextValue === undefined) return
              event.preventDefault()
              event.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>('[role="tab"]').item(next).focus()
              setEntry(nextValue)
              invalidateInput()
            }}>{t(`finance.inbox.entry.${value}`)}</button>
        ))}
      </div>

      <section id={`${tabId}-panel`} className="rg-finance-block" role="tabpanel" aria-labelledby={`${tabId}-tab-${entry}`}>
        <form className="rg-finance-form" onSubmit={event => { void submit(event) }}>
          {entry === 'url' && <div className="rg-finance-fields-inline">
            <Field label={t('finance.inbox.sourceLabel')}><select value={source} onChange={event => { const source = event.target.value as 'rss' | 'youtube'; setSource(source); store.updateInboxDraft({ source }); invalidateInput() }}><option value="rss">{t('finance.inbox.source.rss')}</option><option value="youtube">{t('finance.inbox.source.youtube')}</option></select></Field>
            <Field label={t('finance.inbox.urlLabel')} hint={t('finance.inbox.urlHint')}><input required type="url" value={url} onChange={event => { setUrl(event.target.value); store.updateInboxDraft({ url: event.target.value }); invalidateInput() }} placeholder={source === 'rss' ? 'https://example.com/feed.xml' : 'https://www.youtube.com/watch?v=…'} /></Field>
          </div>}
          {entry === 'clip' && <Field label={t('finance.inbox.clipJson')} hint={t('finance.inbox.clipHint')}>
            <textarea required className="rg-finance-json rg-inbox-clip-input" value={clipText} onChange={event => { setClipText(event.target.value); store.updateInboxDraft({ clipText: event.target.value }); invalidateInput() }} spellCheck={false} rows={14} placeholder={'{"schema":"dsh.clipper/v1","kind":"page","content":{"text":"…"}}'} />
          </Field>}
          {entry === 'file' && <>
            <Field label={t('finance.inbox.file')} hint={t('finance.inbox.fileHint')}>
              <input type="file" accept={INBOX_FILE_ACCEPT} onChange={event => {
                const file = event.target.files?.[0] ?? null
                setFile(file)
                store.updateInboxDraft({ file })
                invalidateInput()
              }} />
            </Field>
            {file !== null && <dl className="rg-inbox-file-meta"><div><dt>{t('finance.inbox.fileName')}</dt><dd>{file.name}</dd></div><div><dt>{t('finance.inbox.fileType')}</dt><dd>{inferInboxMimeType(file.name, file.type)}</dd></div><div><dt>{t('finance.inbox.fileSize')}</dt><dd>{formatFileSize(file.size)}</dd></div></dl>}
          </>}
          <Field label={t('finance.inbox.dateLabel')} hint={t('finance.inbox.dateHint')}><input value={asOf} onChange={event => { setAsOf(event.target.value); store.updateInboxDraft({ asOf: event.target.value }); invalidateInput() }} placeholder="2026-10-31T00:00:00Z" /></Field>
          {validation !== null && <p className="rg-finance-form-error" role="alert">{validation}</p>}
          <div className="rg-finance-form-actions"><button className="rg-btn" data-primary type="submit" disabled={previewLoading || !hasInput}>{readingFile ? t('finance.inbox.readingFile') : t('finance.inbox.previewAction')}</button></div>
        </form>
        <OperationStatus operation={reviewMatchesInput ? previewOperation : { status: 'idle', result: null, error: null }} t={t} idle={t('finance.inbox.previewIdle')} />
      </section>

      {reviewMatchesInput && previewOperation.status === 'success' && preview !== undefined && <section className="rg-finance-block rg-inbox-preview" aria-labelledby="rg-inbox-preview-title">
        <div className="rg-finance-block-heading"><h3 id="rg-inbox-preview-title">{t('finance.inbox.previewTitle')}</h3></div>
        <dl className="rg-inbox-outcomes">
          <div><dt>{t('finance.inbox.received')}</dt><dd>{preview.received}</dd></div>
          <div><dt>{t('finance.inbox.accepted')}</dt><dd>{preview.accepted}</dd></div>
          <div><dt>{t('finance.inbox.duplicates')}</dt><dd>{preview.duplicates.length}</dd></div>
          <div><dt>{t('finance.inbox.quarantined')}</dt><dd>{preview.quarantined.length}</dd></div>
          <div><dt>{t('finance.inbox.rejected')}</dt><dd>{preview.rejected.length}</dd></div>
          <div><dt>{t('finance.inbox.errors')}</dt><dd>{preview.errors.length}</dd></div>
        </dl>
        {(preview.errors.length > 0 || preview.rejected.length > 0) && preview.items.length > 0 && <p className="rg-inbox-partial" role="status">{t('finance.inbox.partial')}</p>}
        <section className="rg-inbox-plan" aria-label={t('finance.inbox.previewedItems')}>
          <h4>{t('finance.inbox.previewedItems')}</h4>
          {reviewItems.length === 0 ? <FinanceEmpty>{t('finance.inbox.noNodes')}</FinanceEmpty> : <ul>
            {reviewItems.map((item, index) => <li key={`${item.provider ?? 'item'}:${item.url ?? item.title ?? item.content ?? index}`}>
              <span className="rg-finance-badge">{item.provider ?? t('finance.inbox.itemType')}</span>
              <div>
                <strong>{item.title ?? item.url ?? t('finance.inbox.untitledNode')}</strong>
                {item.url !== undefined && item.url !== item.title && <a href={item.url} target="_blank" rel="noreferrer noopener">{item.url}</a>}
                {item.content !== undefined && <p><small>{item.provider === 'feed' ? t('finance.inbox.feedSummary') : t('finance.inbox.contentPreview')}</small> {item.content}</p>}
              </div>
              <span className="rg-finance-badge">{statusLabel(item.status)}</span>
            </li>)}
          </ul>}
        </section>
        <EntryList title={t('finance.inbox.duplicates')} entries={preview.duplicates} />
        <EntryList title={t('finance.inbox.quarantined')} entries={preview.quarantined} />
        <EntryList title={t('finance.inbox.rejected')} entries={preview.rejected} />
        <EntryList title={t('finance.inbox.errors')} entries={preview.errors} open />
        <details className="rg-inbox-entry-list">
          <summary>{t('finance.inbox.technicalNodes')} ({preview.plannedNodes.length})</summary>
          {preview.plannedNodes.length === 0 ? <FinanceEmpty>{t('finance.inbox.noNodes')}</FinanceEmpty> : <ul>{preview.plannedNodes.map(node => <li key={node.id}><span className="rg-finance-badge">{node.kind === undefined ? t('finance.inbox.itemType') : t(`kind.${node.kind}`)}</span><span>{node.title ?? t('finance.inbox.untitledNode')}</span><span aria-hidden /></li>)}</ul>}
        </details>
        <RawJson value={previewOperation.result} t={t} label={t('finance.inbox.responseJson')} />
        {!commitComplete && <div className="rg-inbox-confirm">
          <p>{t('finance.inbox.commitHint')}</p>
          <button type="button" className="rg-btn" data-primary disabled={commitLoading || previewLoading || !preview.dryRun || preview.items.length === 0} onClick={() => { setCommitPreview(previewOperation.result); void store.commitInbox() }}>{t('finance.inbox.commitAction')}</button>
        </div>}
      </section>}

      {reviewMatchesInput && previewOperation.status === 'success' && preview === undefined && <div className="rg-state" role="alert"><p className="rg-state-title">{t('finance.inbox.invalidResponse')}</p></div>}
      {commitMatchesPreview && commitOperation.status === 'error' && commitOperation.error !== null && <p className="rg-finance-form-error" role="alert">{t('finance.inbox.commitError', { message: commitOperation.error.message, code: commitOperation.error.code })}</p>}
      {commitMatchesPreview && commitOperation.status === 'loading' && <div className="rg-finance-operation" role="status"><span className="rg-finance-inline-skeleton" /><span>{t('finance.inbox.committing')}</span></div>}
      {commitMatchesPreview && commitOperation.status === 'success' && <section className="rg-inbox-success" aria-label={t('finance.inbox.successTitle')}>
        <div><strong>{t('finance.inbox.successTitle')}</strong><span>{t('finance.inbox.successRevision', { revision: committedRevision })}</span></div>
        <div className="rg-finance-form-actions">
          <button type="button" className="rg-btn" onClick={() => { store.setSection('library') }}>{t('finance.inbox.openLibrary')}</button>
          <button type="button" className="rg-btn" onClick={() => { onOpenGraph(committedSource) }}>{t('finance.inbox.openGraph')}</button>
        </div>
      </section>}
    </section>
  )
}
