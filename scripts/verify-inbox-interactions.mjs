#!/usr/bin/env node
import { spawn } from 'node:child_process'
import { once } from 'node:events'
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { createServer } from 'node:net'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('..', import.meta.url))
const evidenceDir = join(root, '.verification', 'ui-iteration')
const screenshotDir = join(evidenceDir, 'screenshots')
const chromeBinary = process.env.CHROME_BIN ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const checks = []
const screenshots = []
let server
let chrome
let socket

async function waitFor(read, label, timeout = 15000) {
  const deadline = Date.now() + timeout
  while (Date.now() < deadline) {
    try {
      const value = await read()
      if (value) return value
    } catch {}
    await new Promise(resolve => setTimeout(resolve, 40))
  }
  throw new Error(`Timed out: ${label}`)
}

async function availablePort() {
  const listener = createServer()
  listener.listen(0, '127.0.0.1')
  await once(listener, 'listening')
  const address = listener.address()
  if (address === null || typeof address === 'string') throw new Error('No loopback port')
  const port = address.port
  await new Promise(resolve => listener.close(resolve))
  return port
}

async function stop(child) {
  if (child === undefined || child.exitCode !== null || child.signalCode !== null) return
  const exited = once(child, 'exit')
  child.kill('SIGTERM')
  const timeout = setTimeout(() => {
    if (child.exitCode === null && child.signalCode === null) child.kill('SIGKILL')
  }, 3000)
  await exited
  clearTimeout(timeout)
}

async function main() {
  await mkdir(screenshotDir, { recursive: true })
  const profile = await mkdtemp(join(evidenceDir, 'inbox-chrome-'))
  const port = await availablePort()
  let serverOutput = ''
  server = spawn(process.execPath, ['scripts/preview-server.mjs', String(port)], {
    cwd: root,
    stdio: ['ignore', 'pipe', 'pipe'],
  })
  server.stdout.on('data', chunk => { serverOutput += String(chunk) })
  server.stderr.on('data', chunk => { serverOutput += String(chunk) })
  await waitFor(() => serverOutput.includes(`http://127.0.0.1:${port}/`), `preview server: ${serverOutput}`)

  chrome = spawn(chromeBinary, [
    '--headless=new',
    '--remote-debugging-port=0',
    `--user-data-dir=${profile}`,
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-background-networking',
    '--disable-component-update',
    '--disable-extensions',
    '--disable-sync',
    '--mute-audio',
    'about:blank',
  ], { stdio: 'ignore' })
  const activePort = await waitFor(async () => {
    try {
      return await readFile(join(profile, 'DevToolsActivePort'), 'utf8')
    } catch {
      return null
    }
  }, 'Chrome DevTools port')
  const debuggerPort = activePort.split(/\r?\n/u)[0]
  const targets = await waitFor(async () => {
    const response = await fetch(`http://127.0.0.1:${debuggerPort}/json/list`)
    const pages = await response.json()
    return pages.find(target => target.type === 'page')
  }, 'Chrome page target')

  socket = new WebSocket(targets.webSocketDebuggerUrl)
  await new Promise((resolve, reject) => {
    socket.addEventListener('open', resolve, { once: true })
    socket.addEventListener('error', reject, { once: true })
  })
  let sequence = 0
  const pending = new Map()
  socket.addEventListener('message', event => {
    const message = JSON.parse(String(event.data))
    if (typeof message.id !== 'number') return
    const request = pending.get(message.id)
    if (request === undefined) return
    pending.delete(message.id)
    if (message.error) request.reject(new Error(`${request.method}: ${message.error.message}`))
    else request.resolve(message.result ?? {})
  })
  const cdp = (method, params = {}) => new Promise((resolve, reject) => {
    const id = ++sequence
    pending.set(id, { resolve, reject, method })
    socket.send(JSON.stringify({ id, method, params }))
  })
  const evaluate = async expression => {
    const response = await cdp('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true })
    if (response.exceptionDetails) throw new Error(response.exceptionDetails.exception?.description ?? response.exceptionDetails.text)
    return response.result?.value
  }
  const hasText = text => evaluate(`document.body.innerText.includes(${JSON.stringify(text)})`)
  const click = async (selector, text) => {
    await waitFor(() => evaluate(`(() => {
      const element = [...document.querySelectorAll(${JSON.stringify(selector)})]
        .find(candidate => candidate.textContent.trim() === ${JSON.stringify(text)} && candidate.getClientRects().length > 0)
      if (!element) return false
      element.click()
      return true
    })()`), `clickable ${selector}: ${text}`)
  }
  const setValue = async (selector, value) => {
    await waitFor(() => evaluate(`(() => {
      const element = [...document.querySelectorAll(${JSON.stringify(selector)})].find(candidate => candidate.getClientRects().length > 0)
      if (!element) return false
      const prototype = element instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype
      Object.getOwnPropertyDescriptor(prototype, 'value').set.call(element, ${JSON.stringify(value)})
      element.dispatchEvent(new Event('input', { bubbles: true }))
      element.dispatchEvent(new Event('change', { bubbles: true }))
      return true
    })()`), `input ${selector}`)
  }
  const setFile = async path => {
    const nodeId = await waitFor(async () => {
      const document = await cdp('DOM.getDocument', { depth: 0 })
      const result = await cdp('DOM.querySelector', { nodeId: document.root.nodeId, selector: 'input[type="file"]' })
      return result.nodeId || null
    }, 'file input')
    await cdp('DOM.setFileInputFiles', { nodeId, files: [path] })
  }
  const capture = async name => {
    const { data } = await cdp('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false })
    const path = join(screenshotDir, name)
    await writeFile(path, Buffer.from(data, 'base64'))
    screenshots.push(path)
  }
  const emptyReview = async () => {
    const state = await evaluate(`({
      review: document.body.innerText.includes('Import review'),
      confirm: document.body.innerText.includes('Confirm atomic import'),
      success: document.body.innerText.includes('Import committed'),
      idle: document.body.innerText.includes('No preview yet.'),
    })`)
    if (state.review || state.confirm || state.success || !state.idle) throw new Error(`Stale Inbox review: ${JSON.stringify(state)}`)
  }

  try {
    await cdp('Page.enable')
    await cdp('Runtime.enable')
    await cdp('DOM.enable')
    await cdp('Emulation.setDeviceMetricsOverride', { width: 1280, height: 900, deviceScaleFactor: 1, mobile: false })
    await cdp('Page.navigate', { url: `http://127.0.0.1:${port}/scripts/preview.html?lang=en&theme=light` })
    await waitFor(() => evaluate(`[...document.querySelectorAll('button')].some(button => button.textContent.trim() === 'Finance')`), 'client bundle')
    await click('button', 'Finance')
    await click('.rg-finance-nav button', 'Inbox')
    await setValue('input[type="url"]', 'https://news.example.com/rss')
    await click('button', 'Preview import')
    await waitFor(() => hasText('Confirm atomic import'), 'URL review')
    await click('.rg-inbox-entry-tabs button', 'Clip JSON')
    await waitFor(() => evaluate(`Boolean(document.querySelector('.rg-inbox-clip-input'))`), 'empty Clip entry')
    await emptyReview()
    await capture('round2-inbox-clip-empty.png')
    checks.push('URL preview → empty Clip removes review and Confirm')

    await click('.rg-inbox-entry-tabs button', 'URL')
    await click('button', 'Preview import')
    await waitFor(() => hasText('Confirm atomic import'), 'second URL review')
    await setValue('input[type="url"]', 'https://news.example.com/rss?edited=confirm')
    await waitFor(async () => !(await hasText('Confirm atomic import')), 'edited Confirm invalidation')
    await emptyReview()
    checks.push('Editing URL removes the old review and Confirm')

    await click('button', 'Preview import')
    await waitFor(() => hasText('Confirm atomic import'), 'edited URL review')
    await click('button', 'Confirm atomic import')
    await waitFor(() => hasText('Import committed'), 'commit success')
    await setValue('input[type="url"]', 'https://news.example.com/rss?edited=success')
    await waitFor(async () => !(await hasText('Import committed')), 'edited success invalidation')
    await emptyReview()
    if (await hasText('Inbox items committed atomically.')) throw new Error('Stale commit toast remained after editing')
    checks.push('Editing after commit removes the old success card and toast')

    await click('button', 'Preview import')
    await waitFor(() => hasText('Confirm atomic import'), 'as-of review')
    await setValue('.rg-inbox input[placeholder="2026-10-31T00:00:00Z"]', '2026-12-31T00:00:00Z')
    await waitFor(async () => !(await hasText('Confirm atomic import')), 'as-of invalidation')
    await emptyReview()
    checks.push('Editing as-of removes the old review and Confirm')

    await click('.rg-inbox-entry-tabs button', 'File')
    await setFile(join(evidenceDir, 'fixtures', 'research-note.md'))
    await waitFor(() => hasText('research-note.md'), 'first file selection')
    await click('button', 'Preview import')
    await waitFor(() => hasText('Confirm atomic import'), 'file review')
    await setFile(join(evidenceDir, 'fixtures', 'research-page.html'))
    await waitFor(() => hasText('research-page.html'), 'second file selection')
    await emptyReview()
    checks.push('Changing the selected file removes the old review and Confirm')

    console.log(JSON.stringify({ ok: true, checks, screenshots }, null, 2))
  } finally {
    if (socket !== undefined) socket.close()
    await stop(chrome)
    await stop(server)
    await rm(profile, { recursive: true, force: true })
  }
}

main().catch(error => {
  console.error(error instanceof Error ? error.stack : error)
  process.exitCode = 1
})
