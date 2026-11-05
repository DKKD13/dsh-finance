import { createElement } from 'react'
import { renderToString } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import { FinanceStore } from '../../client/finance-store.ts'
import { InboxPanel } from '../../client/ui/InboxPanel.tsx'
import type { Translate } from '../../client/store.ts'

const t: Translate = key => key

function fixture() {
  const request = vi.fn(async () => ({ ok: true as const, revision: 0, result: {} }))
  return { store: new FinanceStore({ request }, t), request }
}

describe('unsubmitted Inbox drafts', () => {
  it('restores URL, Clip, source and cutoff from the same workspace store on remount', () => {
    const { store, request } = fixture()
    store.updateInboxDraft({ source: 'youtube', url: 'https://example.com/private-draft', clipText: 'UNSUBMITTED_CLIP', asOf: '2026-10-31T00:00:00Z' })
    store.setSection('markets')
    store.setSection('inbox')
    const render = (initialEntry: 'clip' | 'url') => renderToString(createElement(InboxPanel, { store, t, nodes: [], initialEntry, onOpenGraph: () => {} }))
    expect(render('clip')).toContain('UNSUBMITTED_CLIP')
    expect(render('clip')).toContain('2026-10-31T00:00:00Z')
    expect(render('url')).toContain('https://example.com/private-draft')
    expect(render('url')).toContain('value="youtube" selected=""')
    expect(request).not.toHaveBeenCalled()
    expect(store.getSnapshot().operations.ingest.status).toBe('idle')
    expect(store.getSnapshot().operations.inboxCommit.status).toBe('idle')
  })

  it('keeps drafts separate from other stores and does not persist them across a new store', () => {
    const first = fixture().store
    first.updateInboxDraft({ clipText: 'PRIVATE_CLIP' })
    expect(first.getInboxDraft().clipText).toBe('PRIVATE_CLIP')
    expect(fixture().store.getInboxDraft()).toEqual({ source: 'rss', url: '', clipText: '', file: null, asOf: '' })
    expect(fixture().store.getInboxDraft().clipText).toBe('')
  })

  it('does not restore preview confirmation authority with the input', () => {
    const { store, request } = fixture()
    store.updateInboxDraft({ clipText: 'INPUT_ONLY' })
    const html = renderToString(createElement(InboxPanel, { store, t, nodes: [], initialEntry: 'clip', onOpenGraph: () => {} }))
    expect(html).toContain('INPUT_ONLY')
    expect(html).not.toContain('class="rg-inbox-preview"')
    expect(html).not.toContain('class="rg-inbox-confirm"')
    expect(request).not.toHaveBeenCalled()
  })
})
