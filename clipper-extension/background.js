importScripts('payload.js')

const DEFAULT_SETTINGS = {
  endpoint: 'http://127.0.0.1:47643',
  token: '',
  topic: '',
  tags: '',
  note: '',
}

function captureCurrentPage(mode) {
  const selection = window.getSelection()
  if (mode === 'selection' && (!selection || selection.rangeCount === 0 || selection.isCollapsed)) {
    throw new Error('Select some page text before clipping a selection')
  }
  const range = mode === 'selection' && selection ? selection.getRangeAt(0) : null
  const text = range ? selection.toString() : document.body?.innerText || ''
  if (!text.trim()) throw new Error('The current page has no clippable text')

  function elementPath(element) {
    if (!element) return ''
    const parts = []
    let current = element
    while (current && current !== document.body && parts.length < 12) {
      const siblings = current.parentElement ? [...current.parentElement.children].filter(child => child.tagName === current.tagName) : [current]
      const suffix = siblings.length > 1 ? `:nth-of-type(${siblings.indexOf(current) + 1})` : ''
      parts.unshift(`${current.tagName.toLowerCase()}${current.id ? `#${current.id}` : ''}${suffix}`)
      current = current.parentElement
    }
    return parts.join(' > ')
  }

  let textQuote
  let locator = { path: '/' }
  if (range && selection) {
    const before = document.createRange()
    before.selectNodeContents(document.body)
    before.setEnd(range.startContainer, range.startOffset)
    const after = document.createRange()
    after.selectNodeContents(document.body)
    after.setStart(range.endContainer, range.endOffset)
    textQuote = {
      exact: selection.toString(),
      prefix: before.toString().slice(-160),
      suffix: after.toString().slice(0, 160),
    }
    const element = range.commonAncestorContainer.nodeType === Node.ELEMENT_NODE
      ? range.commonAncestorContainer
      : range.commonAncestorContainer.parentElement
    locator = {
      container: elementPath(element),
      startOffset: range.startOffset,
      endOffset: range.endOffset,
    }
  }
  return {
    kind: mode,
    url: location.href,
    title: document.title || location.href,
    capturedAt: new Date().toISOString(),
    text,
    ...(textQuote ? { textQuote } : {}),
    locator,
  }
}

async function activeTabId() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
  if (!tab?.id) throw new Error('No active tab is available')
  return tab.id
}

async function capture(mode, tabId) {
  const [result] = await chrome.scripting.executeScript({
    target: { tabId: tabId || await activeTabId() },
    func: captureCurrentPage,
    args: [mode],
  })
  if (result?.error) throw new Error(result.error)
  if (!result?.result) throw new Error('The page did not return clip content')
  return result.result
}

async function digestAnnotations(annotations) {
  const bytes = new TextEncoder().encode(JSON.stringify(annotations))
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  return `sha256:${[...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, '0')).join('')}`
}

async function addRecent(entry) {
  const { recent = [] } = await chrome.storage.local.get('recent')
  const next = [entry, ...recent].slice(0, 10)
  await chrome.storage.local.set({ recent: next })
}

async function importClip(mode, suppliedSettings, tabId) {
  const stored = await chrome.storage.local.get('settings')
  const settings = { ...DEFAULT_SETTINGS, ...(stored.settings || {}), ...(suppliedSettings || {}) }
  const startedAt = new Date().toISOString()
  try {
    const captured = await capture(mode, tabId)
    const provisional = globalThis.DSHClipperPayload.buildClip(captured, settings)
    const annotationHash = await digestAnnotations(provisional.annotations)
    const clip = globalThis.DSHClipperPayload.buildClip(captured, settings, annotationHash)
    const headers = { 'content-type': 'application/json' }
    if (settings.token) headers.authorization = `Bearer ${settings.token}`
    const request = globalThis.DSHClipperPayload.importRequest(clip, new Date().toISOString())
    const response = await fetch(globalThis.DSHClipperPayload.importUrl(settings.endpoint), {
      method: 'POST',
      headers,
      body: JSON.stringify(request),
      credentials: 'omit',
      cache: 'no-store',
    })
    const result = await response.json().catch(() => null)
    if (!response.ok || result?.ok === false) {
      throw new Error(result?.error?.message || `DSH import failed with HTTP ${response.status}`)
    }
    const entry = {
      at: startedAt,
      title: clip.title,
      url: clip.url,
      kind: clip.kind,
      ok: true,
      ...(typeof result?.revision === 'number' ? { revision: result.revision } : {}),
      ...(typeof result?.result?.status === 'string' ? { status: result.result.status } : {}),
    }
    await addRecent(entry)
    return { ok: true, result: result || {}, clip: { title: clip.title, kind: clip.kind, annotationHash } }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    await addRecent({ at: startedAt, title: 'Import failed', url: '', kind: mode, ok: false, error: message })
    return { ok: false, error: message }
  }
}

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({ id: 'dsh-clip-page', title: 'Clip page to DSH', contexts: ['page'] })
    chrome.contextMenus.create({ id: 'dsh-clip-selection', title: 'Clip selection to DSH', contexts: ['selection'] })
  })
})

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (!['dsh-clip-page', 'dsh-clip-selection'].includes(info.menuItemId)) return
  const mode = info.menuItemId === 'dsh-clip-selection' ? 'selection' : 'page'
  void importClip(mode, undefined, tab?.id)
})

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type !== 'dsh-clipper/import') return false
  void importClip(message.mode === 'selection' ? 'selection' : 'page', message.settings).then(sendResponse)
  return true
})
