const form = document.querySelector('#settings')
const status = document.querySelector('#status')
const recentList = document.querySelector('#recent')
const fields = ['endpoint', 'token', 'topic', 'tags', 'note']
let submitting = false

function settings() {
  return Object.fromEntries(fields.map(field => [field, document.querySelector(`#${field}`).value]))
}

function renderRecent(items) {
  recentList.replaceChildren()
  if (!items.length) {
    const empty = document.createElement('li')
    const text = document.createElement('small')
    text.textContent = 'No imports yet.'
    empty.append(text)
    recentList.append(empty)
    return
  }
  for (const item of items) {
    const row = document.createElement('li')
    const title = document.createElement('strong')
    title.textContent = item.title || 'Untitled'
    const time = document.createElement('time')
    time.dateTime = item.at || ''
    time.textContent = item.at ? new Date(item.at).toLocaleString() : ''
    const detail = document.createElement('small')
    detail.textContent = item.ok
      ? `${item.kind} · ${item.status || 'received'}${item.revision === undefined ? '' : ` · rev ${item.revision}`}`
      : `${item.kind} · ${item.error || 'failed'}`
    row.append(title, time, detail)
    recentList.append(row)
  }
}

async function load() {
  const stored = await chrome.storage.local.get(['settings', 'recent'])
  for (const field of fields) {
    if (typeof stored.settings?.[field] === 'string') document.querySelector(`#${field}`).value = stored.settings[field]
  }
  if (!stored.settings?.endpoint) document.querySelector('#endpoint').value = 'http://127.0.0.1:47643'
  renderRecent(Array.isArray(stored.recent) ? stored.recent.slice(0, 10) : [])
}

form.addEventListener('submit', async event => {
  event.preventDefault()
  if (submitting) return
  const mode = event.submitter?.dataset.mode === 'selection' ? 'selection' : 'page'
  const values = settings()
  submitting = true
  for (const button of form.querySelectorAll('button')) button.disabled = true
  status.removeAttribute('data-error')
  status.textContent = mode === 'selection' ? 'Clipping selection…' : 'Clipping page…'
  try {
    await chrome.storage.local.set({ settings: values })
    const response = await chrome.runtime.sendMessage({ type: 'dsh-clipper/import', mode, settings: values })
    if (!response?.ok) throw new Error(response?.error || 'Import failed')
    const revision = response.result?.revision
    status.textContent = `Imported${revision === undefined ? '' : ` at revision ${revision}`}.`
  } catch (error) {
    status.dataset.error = 'true'
    status.textContent = error instanceof Error ? error.message : String(error)
  } finally {
    submitting = false
    for (const button of form.querySelectorAll('button')) button.disabled = false
    const stored = await chrome.storage.local.get('recent')
    renderRecent(Array.isArray(stored.recent) ? stored.recent.slice(0, 10) : [])
  }
})

void load()
