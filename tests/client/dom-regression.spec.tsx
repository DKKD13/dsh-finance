import { execFileSync, spawn } from 'node:child_process'
import type { ChildProcess } from 'node:child_process'
import { once } from 'node:events'
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { createServer } from 'node:net'
import { join } from 'node:path'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

const ROOT = join(__dirname, '..', '..')
const CHROME = process.env.CHROME_BIN ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const longBars = Array.from({ length: 600 }, (_, index) => ({
  timestamp: new Date(Date.UTC(2026, 0, 1 + index)).toISOString(),
  open: 123456780.123456 + index,
  high: 123456790.123456 + index,
  low: 123456770.123456 + index,
  close: 123456785.123456 + index,
  adjustedClose: 123456785.123456 + index,
  volume: 1000 + index,
}))

let server: ChildProcess | undefined
let chrome: ChildProcess | undefined
let socket: WebSocket | undefined
let profile = ''
let previewPort = 0
let marketFixture = false
const failOnce = new Set<string>()
let cdp: (method: string, params?: Record<string, unknown>) => Promise<any>

async function waitFor<T>(read: () => Promise<T | false | null | undefined>, label: string, timeout = 12000): Promise<T> {
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

async function availablePort(): Promise<number> {
  const listener = createServer()
  listener.listen(0, '127.0.0.1')
  await once(listener, 'listening')
  const address = listener.address()
  if (address === null || typeof address === 'string') throw new Error('No loopback port')
  const port = address.port
  await new Promise<void>(resolve => listener.close(() => { resolve() }))
  return port
}

async function stop(child: ChildProcess | undefined): Promise<void> {
  if (child === undefined || child.exitCode !== null || child.signalCode !== null) return
  const exited = once(child, 'exit')
  child.kill('SIGTERM')
  const timeout = setTimeout(() => {
    if (child.exitCode === null && child.signalCode === null) child.kill('SIGKILL')
  }, 3000)
  await exited
  clearTimeout(timeout)
}

async function evaluate(expression: string): Promise<any> {
  const response = await cdp('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true })
  if (response.exceptionDetails) throw new Error(response.exceptionDetails.exception?.description ?? response.exceptionDetails.text)
  return response.result?.value
}

async function click(selector: string, text?: string): Promise<void> {
  await waitFor(() => evaluate(`(() => {
    const element = [...document.querySelectorAll(${JSON.stringify(selector)})].find(candidate => ${text === undefined ? 'true' : `candidate.textContent.trim() === ${JSON.stringify(text)}`} && candidate.getClientRects().length > 0)
    if (!element) return false
    element.click()
    return true
  })()`), `click ${selector}${text === undefined ? '' : `: ${text}`}`)
}

async function enterFinance(): Promise<void> {
  if (await evaluate(`Boolean(document.querySelector('.rg-finance-workspace'))`)) return
  await click('.rg-header [role="tab"]', 'Finance')
}

async function selectFinanceSection(text: string): Promise<void> {
  if (text === 'Hypotheses') text = 'Bull & bear views'
  if (text === 'Reports') text = 'Research history'
  if (text === 'Portfolio') {
    if (await evaluate(`Boolean(document.querySelector('[data-asset-page]'))`)) await click('.rg-pf-brand')
    await click('#rg-finance-tab-virtual-fund')
    await click('#rg-vfund-tab-portfolio')
    return
  }
  if (text === 'Crypto' || text === 'Prediction markets') {
    if (await evaluate(`Boolean(document.querySelector('[data-asset-page]'))`)) await click('.rg-pf-brand')
    await click('#rg-finance-tab-markets')
    await click('.rg-pf-market-nav button', text)
    return
  }
  if (await evaluate(`([...document.querySelectorAll('.rg-finance-nav button')].some(node => node.textContent.trim() === ${JSON.stringify(text)}))`)) {
    await click('.rg-finance-nav button', text)
    return
  }
  if (!await evaluate(`document.querySelector('.rg-pf-more').open`)) await click('.rg-pf-more > summary')
  await click('.rg-pf-more button', text)
}

async function selectFinanceRoute(section: string): Promise<void> {
  if (await evaluate(`Boolean(document.querySelector('[data-asset-page]'))`)) await click('.rg-pf-brand')
  if (section === 'politicians') { await selectFinanceSection('Politicians'); return }
  if (section === 'crypto' || section === 'prediction-markets') await click('#rg-finance-tab-markets')
  await click(`#rg-finance-tab-${section}`)
}

async function openMode(mode: string): Promise<void> {
  if (await evaluate(`Boolean(document.querySelector('.rg-pf-more'))`)) {
    await click('.rg-pf-more > summary')
    await click('.rg-pf-more button', mode === 'Graph' ? 'Knowledge graph' : mode)
  } else await click('.rg-header [role="tab"]', mode)
}

async function focus(selector: string, index = 0): Promise<void> {
  await waitFor(() => evaluate(`(() => {
    const element = [...document.querySelectorAll(${JSON.stringify(selector)})].filter(candidate => candidate.getClientRects().length > 0)[${index}]
    if (!element) return false
    element.focus()
    return document.activeElement === element
  })()`), `focus ${selector}[${index}]`)
}

async function setValue(selector: string, value: string, index = 0): Promise<void> {
  await waitFor(() => evaluate(`(() => {
    const element = [...document.querySelectorAll(${JSON.stringify(selector)})].filter(candidate => candidate.getClientRects().length > 0)[${index}]
    if (!element) return false
    const prototype = element instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : element instanceof HTMLSelectElement ? HTMLSelectElement.prototype : HTMLInputElement.prototype
    Object.getOwnPropertyDescriptor(prototype, 'value').set.call(element, ${JSON.stringify(value)})
    element.dispatchEvent(new Event('input', { bubbles: true }))
    element.dispatchEvent(new Event('change', { bubbles: true }))
    return true
  })()`), `set ${selector}[${index}]`)
}

async function press(key: 'ArrowLeft' | 'ArrowRight' | 'ArrowUp' | 'ArrowDown' | 'Home' | 'End' | 'Enter' | 'Escape'): Promise<void> {
  const keys = {
    ArrowLeft: ['ArrowLeft', 37], ArrowRight: ['ArrowRight', 39], ArrowUp: ['ArrowUp', 38], ArrowDown: ['ArrowDown', 40],
    Home: ['Home', 36], End: ['End', 35], Enter: ['Enter', 13], Escape: ['Escape', 27],
  } as const
  const [code, windowsVirtualKeyCode] = keys[key]
  await cdp('Input.dispatchKeyEvent', { type: 'keyDown', key, code, windowsVirtualKeyCode, ...(key === 'Enter' ? { text: '\r' } : {}) })
  await cdp('Input.dispatchKeyEvent', { type: 'keyUp', key, code, windowsVirtualKeyCode })
}

async function viewport(width: number, height = 844): Promise<void> {
  await cdp('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: false })
}

async function seed(pathname: string, body: Record<string, unknown>): Promise<void> {
  const response = await fetch(`http://127.0.0.1:${previewPort}${pathname}`, {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body),
  })
  const result = await response.json() as { ok: boolean; error?: { message: string } }
  if (!result.ok) throw new Error(result.error?.message ?? `Seed failed: ${pathname}`)
}

beforeAll(async () => {
  execFileSync(process.execPath, [join(ROOT, 'scripts', 'build-client.mjs')], { cwd: ROOT, stdio: 'pipe' })
  await mkdir(join(ROOT, '.verification'), { recursive: true })
  profile = await mkdtemp(join(ROOT, '.verification', 'client-dom-'))
  previewPort = await availablePort()
  let serverOutput = ''
  server = spawn(process.execPath, ['scripts/preview-server.mjs', String(previewPort)], { cwd: ROOT, stdio: ['ignore', 'pipe', 'pipe'] })
  server.stdout?.on('data', chunk => { serverOutput += String(chunk) })
  server.stderr?.on('data', chunk => { serverOutput += String(chunk) })
  await waitFor(async () => serverOutput.includes(`http://127.0.0.1:${previewPort}/`) ? true : null, `preview server: ${serverOutput}`)
  await seed('/research-graph', { op: 'node.create', node: { id: 'source:other', kind: 'source', title: 'Other evidence', content: 'Other original text' } })
  await seed('/research-graph', { op: 'node.create', node: { id: 'catalyst:earnings', kind: 'catalyst', title: 'Earnings catalyst', content: '', metadata: { instrumentId: 'instrument:aapl', asOf: '2026-01-10' } } })

  const debuggerPort = await availablePort()
  chrome = spawn(CHROME, [
    '--headless=new', `--remote-debugging-port=${debuggerPort}`, `--user-data-dir=${profile}`,
    '--no-first-run', '--no-default-browser-check', '--disable-background-networking', '--disable-component-update',
    '--disable-extensions', '--disable-sync', '--mute-audio', 'about:blank',
  ], { stdio: 'ignore' })
  const targets = await waitFor(async () => {
    const response = await fetch(`http://127.0.0.1:${debuggerPort}/json/list`)
    const pages = await response.json() as { type: string; webSocketDebuggerUrl: string }[]
    return pages.find(target => target.type === 'page') ?? null
  }, 'Chrome page target')
  socket = new WebSocket(targets.webSocketDebuggerUrl)
  await new Promise<void>((resolve, reject) => {
    socket?.addEventListener('open', () => { resolve() }, { once: true })
    socket?.addEventListener('error', () => { reject(new Error('CDP socket failed')) }, { once: true })
  })
  let sequence = 0
  const pending = new Map<number, { resolve: (value: any) => void; reject: (error: Error) => void; method: string }>()
  cdp = (method, params = {}) => new Promise((resolve, reject) => {
    const id = ++sequence
    pending.set(id, { resolve, reject, method })
    socket?.send(JSON.stringify({ id, method, params }))
  })
  socket.addEventListener('message', event => {
    const message = JSON.parse(String(event.data))
    if (typeof message.id === 'number') {
      const request = pending.get(message.id)
      if (request === undefined) return
      pending.delete(message.id)
      if (message.error) request.reject(new Error(`${request.method}: ${message.error.message}`))
      else request.resolve(message.result ?? {})
      return
    }
    if (message.method !== 'Fetch.requestPaused') return
    const params = message.params
    const request = params.request
    let operation: { op?: string; input?: { kind?: string; symbol?: string } } = {}
    try { operation = JSON.parse(request.postData ?? '{}') } catch {}
    const op = operation.op ?? ''
    if (failOnce.delete(op)) {
      void cdp('Fetch.fulfillRequest', {
        requestId: params.requestId, responseCode: 200, responseHeaders: [{ name: 'content-type', value: 'application/json' }],
        body: Buffer.from(JSON.stringify({ ok: false, error: { code: `${op.replaceAll('.', '_').toUpperCase()}_OFFLINE`, message: `${op} unavailable` } })).toString('base64'),
      })
      return
    }
    if (marketFixture && request.url.endsWith('/finance') && op === 'market.fetch') {
      const symbol = operation.input?.symbol ?? 'AAPL'
      const data = operation.input?.kind === 'quote'
        ? { symbol, regularMarketPrice: 123456785.123456, currency: 'USD' }
        : { symbol, currency: 'USD', bars: longBars }
      void cdp('Fetch.fulfillRequest', {
        requestId: params.requestId, responseCode: 200, responseHeaders: [{ name: 'content-type', value: 'application/json' }],
        body: Buffer.from(JSON.stringify({ ok: true, revision: 0, result: { items: [{ data }] } })).toString('base64'),
      })
      return
    }
    void cdp('Fetch.continueRequest', { requestId: params.requestId })
  })
  await cdp('Page.enable')
  await cdp('Runtime.enable')
  await cdp('Fetch.enable', { patterns: [{ urlPattern: '*', requestStage: 'Request' }] })
  await viewport(1280, 900)
  await cdp('Page.navigate', { url: `http://127.0.0.1:${previewPort}/scripts/preview.html?lang=en&theme=light` })
  await waitFor(() => evaluate(`[...document.querySelectorAll('button')].some(button => button.textContent.trim() === 'Finance')`), 'client bundle')
}, 30000)

afterAll(async () => {
  socket?.close()
  await stop(chrome)
  await stop(server)
  if (profile.length > 0) {
    // Chrome can finish cache writes shortly after its parent exits on CI.
    for (let attempt = 0; attempt < 10; attempt++) {
      try {
        await rm(profile, { recursive: true, force: true })
        break
      } catch (error) {
        const code = (error as NodeJS.ErrnoException).code
        if ((code !== 'ENOTEMPTY' && code !== 'EBUSY') || attempt === 9) throw error
        await new Promise(resolve => setTimeout(resolve, 100))
      }
    }
  }

})

describe('real DOM regressions', () => {
  it('groups stocks, crypto and prediction markets under Markets with keyboard navigation', async () => {
    await enterFinance()
    expect(await evaluate(`document.querySelector('.rg-pf-assistant') === null`)).toBe(true)
    await click('.rg-pf-assistant-button')
    await waitFor(() => evaluate(`document.querySelector('.rg-pf-assistant textarea') !== null`), 'Finance assistant opened from header')
    await click('.rg-pf-assistant-head button[aria-label="Close finance assistant"]')
    await waitFor(() => evaluate(`document.querySelector('.rg-pf-assistant') === null`), 'Finance assistant hidden by default after close')
    await click('#rg-finance-tab-markets')
    expect(await evaluate(`document.querySelectorAll('.rg-pf-primary [role="tab"]')[1].textContent`)).toBe('Workflow')
    expect(await evaluate(`document.querySelector('.rg-pf-primary #rg-finance-tab-politicians') === null`)).toBe(true)
    expect(await evaluate(`document.querySelector('#rg-finance-tab-hypotheses').textContent`)).toBe('Bull & bear views')
    expect(await evaluate(`document.querySelectorAll('.rg-pf-primary #rg-finance-tab-crypto, .rg-pf-primary #rg-finance-tab-prediction-markets').length`)).toBe(0)
    await focus('.rg-pf-market-nav [role="tab"]', 0)
    await press('ArrowRight')
    expect(await evaluate(`document.activeElement.id === 'rg-finance-tab-crypto' && document.activeElement.getAttribute('aria-selected') === 'true' && document.querySelector('#rg-finance-tab-markets').getAttribute('aria-selected') === 'true'`)).toBe(true)
    await press('End')
    expect(await evaluate(`document.activeElement.id === 'rg-finance-tab-prediction-markets' && document.querySelector('#rg-finance-content').getAttribute('aria-labelledby') === document.activeElement.id`)).toBe(true)
    await press('Home')
    expect(await evaluate(`document.activeElement.id`)).toBe('rg-finance-market-tab-markets')
  }, 30000)

  it('opens Finance discovery sections and preserves the graph while browsing demo data', async () => {
    await enterFinance()
    const readRevision = async () => fetch(`http://127.0.0.1:${previewPort}/research-graph`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ op: 'graph.snapshot' }) }).then(response => response.json()).then(result => result.revision)
    const before = await readRevision()
    const evidence = join(ROOT, '.verification', 'finance-20261101')
    await mkdir(evidence, { recursive: true })
    const sections = ['markets', 'crypto', 'earnings', 'prediction-markets', 'screener', 'politicians', 'watchlist', 'overview']
    const snapshots = []
    for (const section of sections) {
      await selectFinanceRoute(section)
      await waitFor(() => evaluate(`Boolean(document.querySelector('.rg-pf-page-content h2')) && ${section === 'politicians' ? "document.querySelector('[data-finance-section=politicians]').getAttribute('aria-current') === 'page'" : `document.querySelector('#rg-finance-tab-${section}').getAttribute('aria-selected') === 'true'`}`), `loaded ${section}`)
      expect(await evaluate(`document.documentElement.scrollWidth <= innerWidth`)).toBe(true)
      snapshots.push({ section, title: await evaluate(`document.querySelector('.rg-pf-page-content h2').textContent`), text: await evaluate(`document.querySelector('.rg-pf-page-content').innerText`) })
      const shot = await cdp('Page.captureScreenshot', { format: 'png' })
      await writeFile(join(evidence, `${section}-desktop.png`), Buffer.from(shot.data, 'base64'))
    }
    expect(await readRevision()).toBe(before)
    await writeFile(join(evidence, 'sections.json'), JSON.stringify({ previewOnly: true, beforeRevision: before, afterRevision: await readRevision(), snapshots }, null, 2))
    await viewport(390)
    for (const section of ['markets', 'earnings', 'overview']) {
      await click(`#rg-finance-tab-${section}`)
      expect(await evaluate(`document.documentElement.scrollWidth <= innerWidth`)).toBe(true)
      const shot = await cdp('Page.captureScreenshot', { format: 'png' })
      await writeFile(join(evidence, `${section}-mobile.png`), Buffer.from(shot.data, 'base64'))
    }
    await viewport(1280, 900)
  }, 40000)

  it('uses roving Inbox tabs with keyboard selection and a labelled panel', async () => {
    await enterFinance()
    await selectFinanceSection('Inbox')
    await waitFor(() => evaluate(`document.querySelectorAll('.rg-inbox-entry-tabs [role="tab"][tabindex="0"]').length === 1`), 'one Inbox tab stop')
    await focus('.rg-inbox-entry-tabs [role="tab"]', 0)
    await press('ArrowRight')
    expect(await evaluate(`(() => {
      const active = document.activeElement
      const panel = document.querySelector('.rg-inbox [role="tabpanel"]')
      return active.getAttribute('role') === 'tab' && active.getAttribute('aria-selected') === 'true' && active.textContent.trim() === 'Paste clip' && panel?.getAttribute('aria-labelledby') === active.id
    })()`)).toBe(true)
    await press('End')
    expect(await evaluate(`document.activeElement.textContent.trim()`)).toBe('Upload file')
    await press('Home')
    expect(await evaluate(`document.activeElement.textContent.trim()`)).toBe('Feed or video')
    expect(await evaluate(`document.querySelectorAll('.rg-inbox-entry-tabs [role="tab"][tabindex="0"]').length`)).toBe(1)
  }, 30000)

  it('filters screens, fictional disclosures and dated earnings, then prepares research without copying demo figures', async () => {
    await enterFinance()
    await viewport(1280, 900)
    await click('#rg-finance-tab-screener')
    await click('.rg-screen-preset', 'Mega-cap valueLarge companies with lower earnings multiples')
    expect(await evaluate(`(() => { const rows=[...document.querySelectorAll('.rg-screen-table tbody tr')];return rows.length > 0 && rows.every(row => Number(row.children[2].textContent.replaceAll(',','')) >= 500 && Number(row.children[3].textContent) <= 30) })()`)).toBe(true)
    await setValue('.rg-screen-filter input[type="number"]', '0', 1)
    expect(await evaluate(`document.querySelectorAll('.rg-screen-table tbody tr').length`)).toBe(0)
    await click('.rg-screen-button', 'Reset')
    expect(await evaluate(`document.querySelectorAll('.rg-screen-table tbody tr').length`)).toBe(12)

    await selectFinanceRoute('politicians')
    await setValue('.rg-screen-filter select', 'D', 0)
    await setValue('.rg-screen-filter select', 'Buy', 1)
    expect(await evaluate(`document.querySelectorAll('.rg-politics-table tbody tr').length`)).toBe(2)
    expect(await evaluate(`[...document.querySelectorAll('.rg-politics-table tbody tr')].every(row => row.textContent.includes('(fictional)') && row.querySelector('.rg-politics-party')?.textContent.includes('D') && row.textContent.includes('HOUSE') && row.textContent.includes('Buy'))`)).toBe(true)
    await click('.rg-politics-name')
    await click('#rg-politics-transactions-tab')
    expect(await evaluate(`document.querySelectorAll('.rg-politics-detail .rg-politics-table tbody tr').length`)).toBe(2)
    expect(await evaluate(`document.querySelector('.rg-politics-detail .rg-politics-table').textContent.includes('Sell')`)).toBe(true)
    await click('#rg-politics-holdings-tab')
    expect(await evaluate(`document.querySelector('#rg-politics-holdings-panel .rg-politics-holdings-table') === null`)).toBe(true)
    await click('.rg-politics-clear')
    expect(await evaluate(`[...document.querySelectorAll('.rg-screen-filter select')].map(select => select.value).join(',')`)).toBe('D,Buy')
    await setValue('.rg-screen-filter input[type="date"]', '2027-01-01')
    expect(await evaluate(`document.querySelectorAll('.rg-politics-table tbody tr').length`)).toBe(0)

    await click('#rg-finance-tab-earnings')
    await click('.dsh-events-day')
    expect(await evaluate(`document.querySelectorAll('.rg-event-table tbody tr').length`)).toBe(2)
    await setValue('.dsh-events-controls select', 'PM')
    expect(await evaluate(`document.querySelectorAll('.rg-event-table tbody tr').length`)).toBe(1)
    await click('.rg-event-company')
    await click('.rg-event-actions button', 'Pre-earnings brief')
    const question = await evaluate(`document.querySelector('.rg-pf-assistant textarea').value`)
    expect(question).toContain('AAPL')
    expect(question).toContain('must not be used as evidence')
    expect(question).not.toContain('1.60')

    await selectFinanceRoute('prediction-markets')
    await click('.dsh-events-chip', 'Macro')
    expect(await evaluate(`document.querySelectorAll('.rg-contract-card').length`)).toBe(1)
    await click('.rg-contract-card')
    const yes = await evaluate(`document.querySelector('.rg-contract-history polyline').getAttribute('points')`)
    await click('.rg-event-actions button', 'No · 36%')
    expect(await evaluate(`document.querySelector('.rg-contract-history polyline').getAttribute('points')`)).not.toBe(yes)
    await setValue('.rg-pf-statusbar select', 'real')
    expect(await evaluate(`document.querySelectorAll('.rg-contract-card').length`)).toBe(0)
    await setValue('.rg-pf-statusbar select', 'demo')
  }, 30000)

  it('keeps catalog hover introductions and opens workflow cards in the fallback assistant without native conversations', async () => {
    await enterFinance()
    const snapshot = async () => fetch(`http://127.0.0.1:${previewPort}/research-graph`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ op: 'graph.snapshot' }) }).then(response => response.json())
    const before = await snapshot()
    await click('#rg-finance-tab-watchlist')
    await click('button[aria-label="Unfollow AAPL"]')
    expect(await evaluate(`document.querySelectorAll('.rg-discovery-table tbody tr').length`)).toBe(2)
    expect((await snapshot()).revision).toBe(before.revision)
    await click('#rg-finance-tab-overview')
    expect(await evaluate(`document.querySelectorAll('.rg-catalog-task').length`)).toBe(3)
    await focus('.rg-catalog-task')
    await waitFor(() => evaluate(`document.querySelector('.rg-skill-preview')?.matches(':popover-open')`), 'Skill introduction on focus')
    expect(await evaluate(`document.querySelector('.rg-skill-preview code').textContent`)).toBe('/' + await evaluate(`document.querySelector('.rg-catalog-task').dataset.skill`))
    await press('Escape')
    expect(await evaluate(`document.querySelector('.rg-skill-preview') === null`)).toBe(true)
    await evaluate(`document.querySelector('.rg-catalog-grid').style.marginTop = '1000px'; document.querySelector('.rg-catalog-task:last-child').focus()`)
    await waitFor(() => evaluate(`document.querySelector('.rg-skill-preview code')?.textContent === '/' + document.querySelector('.rg-catalog-task:last-child').dataset.skill`), 'focused Skill remains described after automatic scroll')
    await evaluate(`document.querySelector('.rg-catalog-grid').style.marginTop = ''`)
    await press('Escape')
    await click('.rg-catalog-task')
    await waitFor(() => evaluate(`document.querySelector('.rg-pf-assistant textarea')?.value.includes('This workflow needs')`), 'workflow prompt in editable assistant')
    expect(await evaluate(`document.querySelector('.rg-catalog-modal, .rg-catalog-config, .rg-conversation-dialog') === null`)).toBe(true)
    expect(await evaluate(`document.querySelector('.rg-pf-assistant textarea').readOnly`)).toBe(false)
    await setValue('.rg-pf-assistant textarea', 'Edited workflow question')
    expect(await evaluate(`document.querySelector('.rg-pf-assistant textarea').value`)).toBe('Edited workflow question')
    expect((await snapshot()).revision).toBe(before.revision)
    expect(await evaluate(`document.querySelectorAll('.rg-research-run').length`)).toBe(0)
    await click('.rg-pf-assistant button[type="submit"]')
    expect(await evaluate(`document.querySelector('.rg-pf-assistant [role="alert"]').textContent`)).toContain('native DSH conversation')
    await click('button[aria-label="Remove Skill"]')
    await click('#rg-finance-tab-reports')
    expect(await evaluate(`document.querySelector('.rg-research-gate') === null`)).toBe(true)
    await click('.rg-report-history-head-actions button', 'Start Research')
    expect(await evaluate(`document.querySelectorAll('.rg-research-gate button[aria-pressed="false"]').length`)).toBe(3)
    expect(await evaluate(`document.querySelector('.rg-start-research button[type="submit"]').disabled`)).toBe(true)
  }, 30000)

  it('restores Market submissions, keeps long axes visible, and mounts heavy details only on demand', async () => {
    marketFixture = true
    await enterFinance()
    await selectFinanceSection('Market')
    await setValue('.rg-market-main input[placeholder="AAPL"]', 'AAPL', 0)
    await setValue('.rg-market-main input[placeholder="AAPL"]', 'AAPL', 1)
    await setValue('.rg-market-main .rg-finance-block:first-child input[placeholder="2026-10-30T00:00:00Z"]', '2026-01-10T00:00:00Z')
    await setValue('.rg-market-main .rg-finance-block:nth-child(2) select', '5d', 1)
    await setValue('.rg-market-main .rg-finance-block:nth-child(2) select', '1h', 2)
    await click('button', 'Request quote')
    await waitFor(() => evaluate(`document.querySelector('.rg-market-quote-head strong')?.textContent === 'AAPL'`), 'quote')
    await click('button', 'Request history')
    await click('button[aria-label="OHLC + volume"]')
    await waitFor(() => evaluate(`document.querySelectorAll('.rg-chart-candle').length === 150`), 'aggregated history')

    expect(await evaluate(`document.querySelector('.rg-chart-data table') === null && document.querySelectorAll('.rg-market-main .rg-finance-raw pre').length === 0`)).toBe(true)
    expect(await evaluate(`document.querySelector('.rg-chart-data summary')?.textContent`)).toBe('Exact data (600 rows)')
    expect(await evaluate(`[...document.querySelectorAll('.rg-market-chart .rg-chart-axis-label')].slice(0, 5).every(label => label.getBBox().x >= 0)`)).toBe(true)
    await viewport(390)
    expect(await evaluate(`document.documentElement.scrollWidth <= innerWidth && [...document.querySelectorAll('.rg-market-chart .rg-chart-axis-label')].slice(0, 5).every(label => label.getBBox().x >= 0)`)).toBe(true)
    await viewport(1280, 900)

    await click('.rg-chart-data > summary')
    await waitFor(() => evaluate(`document.querySelectorAll('.rg-chart-data tbody tr').length === 600`), '600 exact rows')
    expect(await evaluate(`document.querySelector('.rg-chart-data tbody tr')?.children[1]?.textContent`)).toBe('123456780.123456')
    await click('.rg-market-accordion > summary')
    await waitFor(() => evaluate(`document.body.innerText.includes('Earnings catalyst')`), 'catalyst')
    await click('.rg-market-accordion > summary', 'Sources & raw responses')
    await waitFor(() => evaluate(`document.querySelectorAll('.rg-market-accordion .rg-finance-raw').length === 2`), 'source disclosures')
    expect(await evaluate(`document.querySelectorAll('.rg-market-accordion .rg-finance-raw pre').length`)).toBe(0)
    await click('.rg-market-accordion .rg-finance-raw > summary')
    await waitFor(() => evaluate(`document.querySelector('.rg-market-accordion .rg-finance-raw pre')?.textContent.includes('123456785.123456') === true`), 'raw JSON on first expansion')

    await selectFinanceSection('Portfolio')
    await selectFinanceSection('Market')
    await click('.rg-stock-detail-advanced > summary')
    expect(await evaluate(`(() => {
      const symbols = [...document.querySelectorAll('.rg-market-main input[placeholder="AAPL"]')].map(input => input.value)
      const selects = [...document.querySelectorAll('.rg-market-main .rg-finance-block:nth-child(2) select')].map(select => select.value)
      return symbols.every(value => value === 'AAPL') && selects.join(',') === 'range,5d,1h' && document.querySelectorAll('.rg-chart-frame[data-stale], .rg-market-quote[data-stale]').length === 0
    })()`)).toBe(true)
    expect(await evaluate(`document.querySelector('.rg-market-main .rg-finance-block:first-child input[placeholder="2026-10-30T00:00:00Z"]').value`)).toBe('2026-01-10T00:00:00Z')
    expect(await evaluate(`document.querySelector('.rg-market-accordion .rg-finance-badge')?.textContent`)).toBe('1')

    await setValue('.rg-market-main .rg-finance-block:nth-child(2) select', '1mo', 1)
    await waitFor(() => evaluate(`document.querySelector('.rg-chart-frame')?.dataset.stale === 'true'`), 'edited range is stale')
    await setValue('.rg-market-main .rg-finance-block:nth-child(2) select', '5d', 1)
    await waitFor(() => evaluate(`document.querySelector('.rg-chart-frame')?.dataset.stale !== 'true'`), 'restored range is current')
    await setValue('.rg-market-main input[placeholder="AAPL"]', 'MSFT', 0)
    await waitFor(() => evaluate(`document.querySelector('.rg-market-quote')?.dataset.stale === 'true'`), 'edited symbol is stale')
    await setValue('.rg-market-main input[placeholder="AAPL"]', 'AAPL', 0)
    await waitFor(() => evaluate(`document.querySelector('.rg-market-quote')?.dataset.stale !== 'true'`), 'restored symbol is current')
    marketFixture = false
  }, 30000)

  it('routes Workflow actions and recent records to their real destinations', async () => {
    await enterFinance()
    await selectFinanceSection('Activity')
    await waitFor(() => evaluate(`document.querySelector('.rg-workflow-ledger')?.textContent.includes('Sources in graph: 2') === true && document.querySelector('.rg-workflow-ledger')?.textContent.includes('Compiled sessions: 0') === true`), 'Workflow graph counts')
    await click('button', 'Compile source')
    await waitFor(() => evaluate(`document.querySelector('.rg-library-preview h3')?.textContent === 'Other evidence'`), 'Workflow Compile deep link')

    await selectFinanceSection('Activity')
    await evaluate(`(() => { const button = [...document.querySelectorAll('.rg-workflow-recent button')].find(candidate => candidate.querySelector('code')?.textContent === 'deliverable:weekly'); button.click(); return true })()`)
    await waitFor(() => evaluate(`document.querySelector('.rg-report-reader h3')?.textContent === '周报 2026-W44'`), 'Workflow report deep link')

    await selectFinanceSection('Activity')
    await evaluate(`(() => { const button = [...document.querySelectorAll('.rg-workflow-recent button')].find(candidate => candidate.querySelector('code')?.textContent === 'claim:scaling'); button.click(); return true })()`)
    await waitFor(() => evaluate(`document.querySelector('.rg-hypothesis-detail h3')?.textContent === '规模假设'`), 'Workflow hypothesis deep link')
  }, 30000)

  it('persists explicit watchlist add/remove across reloads and restores the selected symbol', async () => {
    await enterFinance()
    await selectFinanceSection('Market')
    await setValue('.rg-market-main input[placeholder="AAPL"]', 'AAPL', 0)
    await click('button[aria-label="Add AAPL to watchlist"]')
    await waitFor(() => evaluate(`document.querySelector('.rg-market-watchlist-select')?.textContent.includes('AAPL') === true`), 'watchlist add')
    let persisted = await fetch(`http://127.0.0.1:${previewPort}/finance`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ op: 'graph.get', id: 'instrument:aapl' }) }).then(response => response.json())
    expect(persisted.result.metadata.watchlist).toBe(true)
    expect(persisted.result.metadata.watchlistProvenance.operation).toBe('finance.graph.plan')

    await setValue('.rg-market-main input[placeholder="AAPL"]', 'MSFT', 0)
    await click('.rg-market-watchlist-select')
    expect(await evaluate(`[...document.querySelectorAll('.rg-market-main input[placeholder="AAPL"]')].every(input => input.value === 'AAPL')`)).toBe(true)

    await cdp('Page.reload', { ignoreCache: true })
    await waitFor(() => evaluate(`[...document.querySelectorAll('.rg-header [role="tab"]')].some(button => button.textContent.trim() === 'Finance')`), 'reload after add')
    await enterFinance()
    await selectFinanceSection('Market')
    await waitFor(() => evaluate(`document.querySelector('.rg-market-watchlist-select')?.textContent.includes('AAPL') === true`), 'watchlist restored after reload')
    await click('.rg-market-watchlist-select')
    expect(await evaluate(`[...document.querySelectorAll('.rg-market-main input[placeholder="AAPL"]')].every(input => input.value === 'AAPL')`)).toBe(true)

    await click('button[aria-label="Remove AAPL from watchlist"]')
    await waitFor(() => evaluate(`document.querySelector('.rg-market-watchlist-select') === null`), 'watchlist remove')
    await cdp('Page.reload', { ignoreCache: true })
    await waitFor(() => evaluate(`[...document.querySelectorAll('.rg-header [role="tab"]')].some(button => button.textContent.trim() === 'Finance')`), 'reload after remove')
    await enterFinance()
    await selectFinanceSection('Market')
    await waitFor(() => evaluate(`document.querySelector('.rg-market-watchlist-select') === null && document.querySelector('.rg-market-watchlist')?.textContent.includes('No watched instruments') === true`), 'empty watchlist after reload')
    persisted = await fetch(`http://127.0.0.1:${previewPort}/finance`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ op: 'graph.get', id: 'instrument:aapl' }) }).then(response => response.json())
    expect(persisted.result.metadata.watchlist).toBe(false)
  }, 40000)

  it('recovers History and Audit from independent failures and supports roving History options', async () => {
    failOnce.add('history.list')
    await openMode('History')
    await waitFor(() => evaluate(`document.querySelector('.rg-mode-panel [role="alert"]')?.textContent.includes('HISTORY_LIST_OFFLINE') === true`), 'History error')
    expect(await evaluate(`document.querySelectorAll('.rg-mode-panel .rg-skeleton').length`)).toBe(0)
    await click('.rg-mode-panel .rg-state button', 'Retry')
    await waitFor(() => evaluate(`document.querySelectorAll('.rg-history-item').length > 0`), 'History retry')
    expect(await evaluate(`document.querySelectorAll('.rg-history-item[tabindex="0"]').length`)).toBe(1)
    await focus('.rg-history-item', 0)
    await press('ArrowDown')
    await waitFor(() => evaluate(`document.activeElement?.getAttribute('aria-selected') === 'true'`), 'History ArrowDown')
    await press('Home')
    await waitFor(() => evaluate(`document.activeElement === document.querySelector('.rg-history-item') && document.activeElement.getAttribute('aria-selected') === 'true'`), 'History Home')
    await press('End')
    await waitFor(() => evaluate(`document.activeElement === [...document.querySelectorAll('.rg-history-item')].at(-1) && document.activeElement.getAttribute('aria-selected') === 'true'`), 'History End')

    failOnce.add('audit')
    await openMode('Audit')
    await waitFor(() => evaluate(`document.querySelector('.rg-mode-panel [role="alert"]')?.textContent.includes('AUDIT_OFFLINE') === true`), 'Audit error')
    expect(await evaluate(`document.querySelectorAll('.rg-mode-panel .rg-skeleton').length`)).toBe(0)
    await click('.rg-mode-panel .rg-state button', 'Retry')
    await waitFor(() => evaluate(`document.querySelector('.rg-audit') !== null`), 'Audit retry')
  }, 30000)

  it('keeps one Graph node and one Ledger option in the Tab order and synchronizes arrow focus', async () => {
    await openMode('Graph')
    await waitFor(() => evaluate(`document.querySelectorAll('.rg-node').length > 0`), 'Graph nodes')
    expect(await evaluate(`document.querySelectorAll('.rg-node[tabindex="0"]').length`)).toBe(1)
    expect(await evaluate(`document.querySelectorAll('.rg-ledger [role="option"][tabindex="0"]').length`)).toBe(1)
    await focus('.rg-node[tabindex="0"]')
    await press('ArrowRight')
    await waitFor(() => evaluate(`document.activeElement?.matches('.rg-node') && document.activeElement.getAttribute('aria-pressed') === 'true'`), 'Graph focus and selection')
    await focus('.rg-ledger [role="option"][tabindex="0"]')
    await press('ArrowDown')
    await waitFor(() => evaluate(`document.activeElement?.getAttribute('role') === 'option' && document.activeElement.getAttribute('aria-selected') === 'true'`), 'Ledger ArrowDown')
    await press('Home')
    await waitFor(() => evaluate(`document.activeElement === document.querySelector('.rg-ledger [role="option"]') && document.activeElement.getAttribute('aria-selected') === 'true'`), 'Ledger Home')
    await press('End')
    await waitFor(() => evaluate(`document.activeElement === [...document.querySelectorAll('.rg-ledger [role="option"]')].at(-1) && document.activeElement.getAttribute('aria-selected') === 'true'`), 'Ledger End')
  }, 30000)

  it('reveals a Library source in the graph, selects it and centers its dot after rendering', async () => {
    await viewport(1280, 900)
    await enterFinance()
    await selectFinanceSection('Library')
    await click('.rg-library-list > button')
    const targetId = await evaluate(`document.querySelector('.rg-library-list > button[data-selected]').dataset.nodeId`)
    expect(targetId).toBeTruthy()
    await click('.rg-library-advanced > summary')
    await click('.rg-library-preview button', 'Open source in Graph')
    await waitFor(() => evaluate(`(() => {
      const node = [...document.querySelectorAll('.rg-node')].find(node => node.dataset.node === ${JSON.stringify(targetId)})
      const dot = node?.querySelector('.rg-node-dot')?.getBoundingClientRect()
      const canvas = document.querySelector('.rg-canvas')?.getBoundingClientRect()
      return node?.getAttribute('aria-pressed') === 'true' && dot && canvas &&
        Math.abs(dot.x + dot.width / 2 - canvas.x - canvas.width / 2) < 2 &&
        Math.abs(dot.y + dot.height / 2 - canvas.y - canvas.height / 2) < 2
    })()`), 'selected source centered after graph effects')
    expect(await evaluate(`document.querySelector('.rg-inspector .rg-row-id')?.textContent`)).toBe(targetId)
  }, 30000)

  it('connects Library tabs and restores drill focus, including a removed trigger fallback', async () => {
    await viewport(390)
    await enterFinance()
    await selectFinanceSection('Library')
    expect(await evaluate(`document.querySelectorAll('.rg-library-toolbar [role="tab"][tabindex="0"]').length`)).toBe(1)
    await focus('.rg-library-toolbar [role="tab"]', 0)
    await press('ArrowRight')
    expect(await evaluate(`document.activeElement.getAttribute('aria-selected') === 'true' && document.activeElement.id.endsWith('-tab-insights')`)).toBe(true)
    await press('Home')
    expect(await evaluate(`document.activeElement.id.endsWith('-tab-materials')`)).toBe(true)

    await evaluate(`(() => { window.__drillTrigger = document.querySelector('.rg-library-list > button'); window.__drillTrigger.focus(); return true })()`)
    await press('Enter')
    await waitFor(() => evaluate(`document.activeElement?.matches('.rg-library-preview h3')`), 'Library detail focus')
    await focus('.rg-library-back')
    await press('Enter')
    await waitFor(() => evaluate(`document.activeElement === window.__drillTrigger`), 'Library trigger focus restoration')

    await evaluate(`(() => { window.__drillTrigger = [...document.querySelectorAll('.rg-library-list > button')].find(button => button.textContent.includes('Attention Is All You Need')); window.__drillTrigger.focus(); return true })()`)
    await press('Enter')
    await waitFor(() => evaluate(`document.activeElement?.matches('.rg-library-preview h3')`), 'second Library detail focus')
    await setValue('.rg-library-toolbar input[type="search"]', 'Other evidence')
    await waitFor(() => evaluate(`window.__drillTrigger.isConnected === false && document.querySelector('.rg-library-preview h3')?.textContent === 'Other evidence'`), 'removed Library trigger')
    await focus('.rg-library-back')
    await press('Enter')
    await waitFor(() => evaluate(`document.activeElement?.matches('.rg-library-list-head')`), 'Library fallback focus')
    await setValue('.rg-library-toolbar input[type="search"]', '')
  }, 30000)

  it('moves focus into Hypotheses and Reports details and back to their triggering rows', async () => {
    await viewport(390)
    for (const [section, list, detail, back] of [
      ['Bull & bear views', '.rg-hypothesis-list > button', '.rg-hypothesis-detail h3', '.rg-hypothesis-back'],
      ['Research history', '.rg-report-history-select', '.rg-report-reader h3', '.rg-report-back'],
    ] as const) {
      await selectFinanceSection(section)
      await evaluate(`(() => { window.__drillTrigger = document.querySelector(${JSON.stringify(list)}); window.__drillTrigger.focus(); return true })()`)
      await press('Enter')
      await waitFor(() => evaluate(`document.activeElement?.matches(${JSON.stringify(detail)})`), `${section} detail focus`)
      if (section === 'Research history') expect(await evaluate(`document.querySelector('.rg-report-markdown').getBoundingClientRect().top < document.querySelector('.rg-report-outline').getBoundingClientRect().top`)).toBe(true)
      await focus(back)
      await press('Enter')
      await waitFor(() => evaluate(`document.activeElement === window.__drillTrigger`), `${section} trigger focus restoration`)
    }
  }, 30000)
  it('reveals the active finance section in the narrow horizontal navigation', async () => {
    await viewport(390, 844)
    await enterFinance()
    await selectFinanceSection('Activity')
    await waitFor(() => evaluate(`Boolean(document.querySelector('.rg-workflow-section'))`), 'finance activity')
    await selectFinanceSection('Portfolio')
    await waitFor(() => evaluate(`(() => {
      const nav = document.querySelector('.rg-pf-primary')
      const active = nav?.querySelector('button[data-active]')
      if (!nav || !active) return false
      const navRect = nav.getBoundingClientRect()
      const activeRect = active.getBoundingClientRect()
      return active.textContent.trim() === 'Virtual fund' && activeRect.left >= navRect.left && activeRect.right <= navRect.right
    })()`), 'active Virtual fund revealed')
    expect(await evaluate(`document.querySelector('.rg-pf-primary')?.scrollLeft > 0`)).toBe(true)

    await cdp('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] })
    await selectFinanceSection('Activity')
    await selectFinanceSection('Portfolio')
    await waitFor(() => evaluate(`(() => {
      const nav = document.querySelector('.rg-pf-primary')
      const active = nav?.querySelector('button[data-active]')
      if (!nav || !active) return false
      const navRect = nav.getBoundingClientRect()
      const activeRect = active.getBoundingClientRect()
      return active.textContent.trim() === 'Virtual fund' && activeRect.left >= navRect.left && activeRect.right <= navRect.right
    })()`), 'reduced-motion active Virtual fund revealed')
    expect(await evaluate(`matchMedia('(prefers-reduced-motion: reduce)').matches`)).toBe(true)
    await cdp('Emulation.setEmulatedMedia', { features: [] })
    await viewport(1280, 900)
  }, 30000)

  it('saves manually entered holdings through the real service and rejects future source dates', async () => {
    await enterFinance()
    await selectFinanceSection('Portfolio')
    await setValue('.rg-portfolio-meta input', 'Manual test portfolio', 0)
    await setValue('.rg-portfolio-meta input', 'USD', 1)
    await setValue('.rg-portfolio-meta input', '2026-10-30T00:00', 2)
    await setValue('.rg-portfolio-meta input', '2026-10-31T00:00', 3)
    for (const [index, value] of ['AAPL', '2', '100', '80'].entries()) await setValue('.rg-portfolio-entry-table input', value, index)
    await click('.rg-portfolio-entry button[type="submit"]')
    await waitFor(() => evaluate(`document.querySelector('.rg-finance-section')?.textContent.includes('FUTURE_DATA') === true`), 'future source rejected by Host')
    expect(await evaluate(`document.querySelector('.rg-finance-section').textContent.includes('Manual test portfolio')`)).toBe(false)
    await setValue('.rg-portfolio-meta input', '2026-10-29T00:00', 3)
    await click('.rg-portfolio-entry button[type="submit"]')
    await waitFor(() => evaluate(`document.querySelector('.rg-finance-record')?.textContent.includes('Manual test portfolio') === true`), 'manual portfolio saved')
    expect(await evaluate(`document.querySelector('.rg-finance-record').textContent.includes('200')`)).toBe(true)
    expect(await evaluate(`document.querySelector('.rg-finance-record').textContent.includes('manual')`)).toBe(true)
    expect(await evaluate(`document.querySelector('.rg-portfolio-advanced').open`)).toBe(false)
    await click('.rg-portfolio-entry button', 'Add holding')
    expect(await evaluate(`document.querySelectorAll('.rg-portfolio-entry-table tbody tr').length`)).toBe(2)
    await click('.rg-portfolio-entry-table tbody tr:last-child button')
    expect(await evaluate(`document.querySelectorAll('.rg-portfolio-entry-table tbody tr').length`)).toBe(1)
  }, 30000)

  it('shows an explicit failure when research is started without a usable DSH session', async () => {
    await enterFinance()
    await click('.rg-pf-assistant-button')
    await setValue('.rg-pf-assistant textarea', 'Verify the original public filing for AAPL. Do not use demo figures.')
    await click('.rg-pf-assistant button', 'Start research')
    await waitFor(() => evaluate(`document.querySelector('.rg-research-run[data-status="failed"] [role="alert"]')?.textContent.length > 0`), 'visible research session failure')
    expect(await evaluate(`document.querySelectorAll('.rg-research-run[data-status="completed"]').length`)).toBe(0)
    expect(await evaluate(`document.querySelectorAll('.rg-research-artifacts button').length`)).toBe(0)
  }, 30000)

  it('prepares New research directly in a native draft without opening a chooser', async () => {
    await viewport(1280, 900)
    await evaluate(`(() => {
      const preview = window.__preview
      const main = preview.mains.get(preview.selectedPanel) ?? [...preview.mains.values()][0]
      window.__conversationCalls = []
      window.__conversationOpened = []
      const conversations = {
        list: () => [
          { id: 'session:existing', title: 'Existing research', cwd: null, running: false, updatedAt: 0 },
          { id: 'session:researcher', title: 'Fund researcher', cwd: null, running: false, updatedAt: 0 },
          { id: 'session:research', title: 'Fund research', cwd: null, running: false, updatedAt: 0 },
          { id: 'session:fund:nvda', title: 'NVDA researcher', cwd: null, running: false, updatedAt: 0 },
        ],
        currentId: () => 'session:existing',
        open: id => { window.__conversationOpened.push(id) },
        prepare: async input => {
          window.__conversationCalls.push({ ...input, text: typeof input.text === 'function' ? input.text(input.sessionId ?? 'session:new') : input.text })
          return { sessionId: input.sessionId ?? 'session:new', status: input.sessionId ? 'preserved' : 'applied' }
        }
      }
      preview.root.render(React.createElement(main.component, { t: preview.t, ...main.options.inject(), conversations }))
      return true
    })()`)
    await click('#rg-finance-tab-reports')
    await click('.rg-report-history-head-actions button', 'New research')
    await waitFor(() => evaluate(`window.__conversationCalls.length === 1`), 'direct native draft')
    expect(await evaluate(`document.querySelector('.rg-conversation-dialog, .rg-catalog-modal') === null`)).toBe(true)
    const calls = await evaluate(`window.__conversationCalls`)
    expect(calls).toHaveLength(1)
    expect(calls[0].sessionId).toBeUndefined()
    expect(calls[0].text).toMatch(/^\/research\nrunId=run:/)
    expect(calls[0].text).toContain('mode=Question')
    expect(calls[0].text).toContain('Markdown')
    expect(calls[0].text).toContain('metadata.sessionId')
    expect(calls[0].text).toContain('"session:new"')
  }, 30000)

  it('carries the stock, chosen source and research focus directly into native prepare', async () => {
    await evaluate('window.__conversationCalls = []')
    await setValue('.rg-pf-search input', 'AAPL')
    await evaluate('document.querySelector(".rg-pf-search").requestSubmit()')
    await waitFor(() => evaluate(`document.querySelector('.rg-stock-detail-identity strong')?.textContent === 'AAPL'`), 'stock identity')
    expect(await evaluate(`document.querySelector('.rg-pf-header-actions .rg-pf-assistant-button') !== null`)).toBe(true)
    if (await evaluate(`document.querySelector('.rg-pf-assistant') !== null`)) await click('.rg-pf-assistant-head button[aria-label="Close finance assistant"]')
    expect(await evaluate(`document.querySelector('.rg-pf-assistant') === null`)).toBe(true)
    await click('.rg-pf-assistant-button')
    await waitFor(() => evaluate(`document.querySelector('.rg-pf-assistant .rg-research-context')?.textContent.includes('AAPL')`), 'company context')
    await click('.rg-research-source-menu summary')
    await setValue('.rg-research-source-menu input[type="search"]', 'Other evidence')
    await click('.rg-research-source-list input[type="checkbox"]')
    await click('.rg-research-source-menu footer button', 'Done')
    await click('.rg-research-skill-menu summary')
    await click('.rg-research-skill-menu button', 'Research a company/research')
    await setValue('.rg-pf-assistant textarea', 'Focus on recurring services revenue')
    await click('.rg-pf-assistant button[type="submit"]')
    await waitFor(() => evaluate('window.__conversationCalls.length === 1'), 'prepared contextual draft')
    expect(await evaluate(`document.querySelector('.rg-conversation-dialog') === null`)).toBe(true)
    const [prepared] = await evaluate('window.__conversationCalls')
    expect(prepared.text).toContain('mode=Ticker ticker=AAPL')
    expect(prepared.text).toContain('source:other')
    expect(prepared.text).toContain('Focus on recurring services revenue')
    expect(prepared.text).toContain('demo figures are not research evidence')
    expect(prepared.text).toContain('"session:new"')
    expect(prepared.text).toContain('metadata.sessionId')
  }, 30000)

  it('hands the exact workflow Skill directly to native prepare without a research wrapper', async () => {
    await evaluate('window.__conversationCalls = []')
    await click('.rg-pf-brand')
    await click('#rg-finance-tab-overview')
    await click('.rg-catalog-task[data-skill="daily-digest"]')
    await waitFor(() => evaluate('window.__conversationCalls.length === 1'), 'exact Skill native draft')
    expect(await evaluate(`document.querySelector('.rg-catalog-modal, .rg-catalog-config, .rg-conversation-dialog') === null`)).toBe(true)
    const [prepared] = await evaluate('window.__conversationCalls')
    expect(prepared.text).toMatch(/^\/daily-digest\nrunId=run:/)
    expect(prepared.text).toContain('This workflow needs')
    expect(prepared.text).toContain('ask me one concise question')
    expect(prepared.text).not.toMatch(/^\/research/)
    expect(prepared.text).toContain('metadata.sessionId')
    expect(prepared.text).toContain('"session:new"')
  }, 30000)

  it('prepares a material summary with readable copy and preserves the exact source version instructions', async () => {
    await evaluate('window.__conversationCalls = []')
    await click('#rg-finance-tab-library')
    await setValue('.rg-library-toolbar input[type="search"]', 'Other evidence')
    await click('.rg-library-summary button')
    await waitFor(() => evaluate('window.__conversationCalls.length === 1'), 'summary native draft')
    expect(await evaluate(`document.querySelector('.rg-conversation-dialog') === null`)).toBe(true)
    const [prepared] = await evaluate('window.__conversationCalls')
    expect(prepared.text).toContain('Summarize the key facts')
    expect(prepared.text).toContain('source:other')
    expect(prepared.text).toContain('metadata.aiSummary')
    expect(prepared.text).toContain('actual source contentHash')
    expect(prepared.text).toMatch(/[Pp]reserve all existing metadata/u)
  }, 30000)


  it('reads saved fund state, explains initial failures, and drives desks, holdings, conversations and NAV history', async () => {
    const readRevision = async () => fetch(`http://127.0.0.1:${previewPort}/research-graph`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ op: 'graph.snapshot' }) }).then(response => response.json()).then(result => result.revision)
    const before = await readRevision()
    await evaluate('window.__conversationCalls = []')
    await click('#rg-finance-tab-overview')
    failOnce.add('fund.state')
    await click('#rg-finance-tab-virtual-fund')
    await waitFor(() => evaluate(`document.querySelector('.rg-vfund-error[role="alert"]')?.textContent.includes('FUND_STATE_OFFLINE') === true`), 'initial fund.state failure')
    expect(await evaluate(`document.querySelector('.rg-vfund-loading')?.textContent`)).toContain('will appear when records can be read again')
    expect(await evaluate(`document.body.textContent.includes('Create virtual fund')`)).toBe(false)
    await click('#rg-vfund-tab-overview')
    expect(await evaluate(`document.querySelector('.rg-vfund-loading')?.textContent`)).toContain('will appear when records can be read again')
    expect(await evaluate(`document.body.textContent.includes('Create fund')`)).toBe(false)
    await click('.rg-vfund-error button', 'Retry')
    await waitFor(() => evaluate(`document.querySelector('.rg-vfund-overview-empty') !== null && document.querySelector('.rg-vfund-error') === null`), 'empty fund overview after retry')
    expect(await evaluate(`document.querySelector('.rg-vfund-overview-empty').textContent`)).toContain('Create a virtual fund')
    await click('#rg-vfund-tab-office')
    await waitFor(() => evaluate(`document.querySelector('.rg-vfund-welcome') !== null`), 'empty fund office after retry')
    expect(await evaluate(`document.querySelector('.rg-vfund-welcome').textContent`)).toContain('Build your virtual research team')

    const fundId = 'portfolio:fund:fixture'
    await seed('/research-graph', { op: 'node.create', node: {
      id: fundId, kind: 'portfolio', title: 'Fixture Alpha Fund', content: '',
      metadata: { virtualFund: { initialCash: 1000000, currency: 'USD', startingAt: '2026-10-01T00:00:00Z' } },
    } })
    const researchers = [
      ['manager', 'Fund Manager', 'AAPL', 'manager', 'Session manager', 'portfolio'],
      ['nvda', 'NVDA Analyst', 'NVDA', 'analyst', 'Bottom-up', 'semiconductors'],
      ['googl', 'GOOGL Analyst', 'GOOGL', 'analyst', 'Quality growth', 'platforms'],
      ['cost', 'COST Analyst', 'COST', 'analyst', 'Consumer moat', 'retail'],
      ['jpm', 'JPM Analyst', 'JPM', 'analyst', 'Cycle aware', 'banks'],
      ['reviewer', 'Risk Reviewer', 'UNH', 'reviewer', 'Counterevidence', 'portfolio risk'],
    ] as const
    for (const [key, title, ticker, role, style, focus] of researchers) {
      await seed('/research-graph', { op: 'node.create', node: {
        id: `session:fund:${key}`, kind: 'session', title, content: `Research ${ticker}`,
        metadata: {
          type: 'fund-researcher', fundId, tickers: [ticker], researchStyle: style, focus,
          task: `Maintain a traceable ${ticker} research record`, role, enabled: false,
          sessionId: `session:fund:${key}`,
        },
      } })
    }
    await seed('/research-graph', { op: 'node.create', node: {
      id: 'session:fund:snapshot:start', kind: 'session', title: 'Fund snapshot start', content: '',
      metadata: { type: 'fund-snapshot', fundId, asOf: '2026-10-01T00:00:00Z', nav: 1000000, cash: 1000000, positions: [], sourceIds: [], summary: 'Starting valuation' },
    } })
    await seed('/research-graph', { op: 'node.create', node: {
      id: 'session:fund:snapshot:latest', kind: 'session', title: 'Fund snapshot latest', content: '',
      metadata: {
        type: 'fund-snapshot', fundId, asOf: '2026-10-10T00:00:00Z', nav: 1025000, cash: 1000000,
        positions: [
          { symbol: 'NVDA', quantity: 100, price: 100, value: 10000 },
          { symbol: 'ZZZ', quantity: 100, price: 150, value: 15000 },
        ],
        sourceIds: [], summary: 'Saved valuation',
      },
    } })
    await seed('/research-graph', { op: 'node.create', node: {
      id: 'deliverable:fund:nvda:note', kind: 'deliverable', title: 'NVDA evidence review', content: 'Reviewed demand and valuation evidence.',
      metadata: { fundId, researcherId: 'session:fund:nvda', sessionId: 'session:research', asOf: '2026-10-10T00:00:00Z' },
    } })

    await click('#rg-finance-tab-overview')
    await click('#rg-finance-tab-virtual-fund')
    await waitFor(() => evaluate(`document.querySelectorAll('.rg-vfund-station').length === 6`), 'saved researchers')
    expect(await evaluate(`document.querySelectorAll('.rg-vfund-monitor').length`)).toBe(6)
    expect(await evaluate(`document.querySelectorAll('.rg-vfund-coverage .rg-pf-monogram').length`)).toBe(6)
    await waitFor(() => evaluate(`[...document.querySelectorAll('.rg-vfund-colleague img')].length === 6 && [...document.querySelectorAll('.rg-vfund-colleague img')].every(img => img.complete && img.naturalWidth > 0)`), 'researcher avatars')
    expect(await evaluate(`document.querySelector('.rg-vfund-room').textContent.includes('NVDA') && document.querySelector('.rg-vfund-room').textContent.includes('UNH')`)).toBe(true)

    await click('.rg-vfund-heading-actions button', '+ Create research desk')
    await waitFor(() => evaluate('window.__conversationCalls.length === 1'), 'create desk native draft')
    expect(await evaluate(`document.querySelector('.rg-conversation-dialog') === null`)).toBe(true)
    expect((await evaluate('window.__conversationCalls'))[0].text).toContain('Create a research desk')
    expect((await evaluate('window.__conversationCalls'))[0].text).toContain(fundId)

    await click('.rg-vfund-station[data-seat="session:fund:nvda"]')
    await waitFor(() => evaluate(`document.querySelector('.rg-vfund-drawer') !== null`), 'researcher drawer')
    await waitFor(() => evaluate(`document.querySelector('.rg-vfund-drawer-portrait')?.complete && document.querySelector('.rg-vfund-drawer-portrait')?.naturalWidth > 0`), 'drawer avatar')
    const drawer = await evaluate(`document.querySelector('.rg-vfund-drawer').textContent`)
    expect(drawer).toContain('Responsibilities')
    expect(drawer).toContain('Research style')
    expect(drawer).toContain('Bottom-up')
    expect(drawer).toContain('NVDA')
    await press('Escape')
    expect(await evaluate(`document.querySelector('.rg-vfund-drawer') === null && document.activeElement?.dataset.seat === 'session:fund:nvda'`)).toBe(true)

    await click('.rg-vfund-station[data-seat="session:fund:nvda"]')
    await click('#rg-vfund-tab-overview')
    expect(await evaluate(`document.querySelector('.rg-vfund-drawer') === null`)).toBe(true)
    await waitFor(() => evaluate(`document.querySelector('.rg-vfund-overview-line') !== null && document.querySelector('.rg-vfund-overview-area') !== null`), 'saved NAV history')
    expect(await evaluate(`document.querySelector('.rg-vfund-overview-nav strong').textContent`)).toBe('$1,025,000.00')

    await evaluate(`[...document.querySelectorAll('.rg-vfund-overview-asset')].find(button => button.querySelector('strong')?.textContent === 'NVDA').click()`)
    await waitFor(() => evaluate(`document.activeElement?.getAttribute('aria-label') === 'Close seat details'`), 'holding ownership drawer')
    expect(await evaluate(`document.querySelector('.rg-vfund-drawer h3')?.textContent`)).toBe('NVDA Analyst')
    await press('Escape')
    expect(await evaluate(`document.activeElement?.id === 'rg-vfund-tab-office'`)).toBe(true)

    await click('#rg-vfund-tab-overview')
    await evaluate(`[...document.querySelectorAll('.rg-vfund-overview-asset')].find(button => button.querySelector('strong')?.textContent === 'ZZZ').click()`)
    await waitFor(() => evaluate('window.__conversationCalls.length === 2'), 'missing-owner holding research')
    const holdingDraft = (await evaluate('window.__conversationCalls'))[1]
    expect(holdingDraft.text).toMatch(/^\/virtual-fund\n/)
    const holdingTask = holdingDraft.text.match(/^Task: (.+)$/m)
    expect(holdingTask).not.toBeNull()
    expect(JSON.parse(holdingTask![1])).toContain('symbol="ZZZ"')
    expect(holdingDraft.text).toContain(fundId)

    await click('#rg-vfund-tab-office')
    await click('.rg-vfund-station[data-seat="session:fund:nvda"]')
    await click('.rg-vfund-drawer-actions > button[data-primary]')
    await waitFor(() => evaluate('window.__conversationCalls.length === 3'), 'researcher conversation draft')
    const conversationDraft = (await evaluate('window.__conversationCalls'))[2]
    expect(conversationDraft.sessionId).toBe('session:fund:nvda')
    expect(conversationDraft.text).toContain('session:fund:nvda')
    expect(conversationDraft.text).toContain('Current DSH conversation: "session:fund:nvda"')
    expect(await readRevision()).toBeGreaterThan(before)
  }, 30000)

  it('renders view Markdown and prepares bounded AI review drafts without changing the view', async () => {
    await viewport(1280, 1000)
    await seed('/research-graph', { op: 'node.create', node: {
      id: 'belief:polish', kind: 'belief', title: 'Markdown view',
      content: '## Why it holds\n\n**Revenue grows** from $100 to $120.\n\n- Verify the source\n- Check retention\n\n<script>window.__badView = true</script>',
      metadata: { stance: 'bull', confidence: 'high', killCriteria: ['**Churn** exceeds the disclosed threshold.'] },
    } })
    await seed('/research-graph', { op: 'edge.add', edge: { from: 'belief:polish', to: 'source:other', kind: 'based_on' } })
    await click('#rg-finance-tab-hypotheses')
    await click('.rg-pf-statusbar button')
    await click('.rg-hypothesis-list > button[data-node-id="belief:polish"]')
    await waitFor(() => evaluate(`document.querySelector('.rg-hypothesis-markdown h2')?.textContent === 'Why it holds'`), 'view Markdown heading')
    expect(await evaluate(`document.querySelector('.rg-hypothesis-markdown strong')?.textContent`)).toBe('Revenue grows')
    expect(await evaluate(`document.querySelector('.rg-hypothesis-markdown').textContent`)).toContain('\\$100 to \\$120')
    expect(await evaluate(`document.querySelectorAll('.rg-hypothesis-markdown li').length >= 2`)).toBe(true)
    expect(await evaluate(`window.__badView === undefined && !document.querySelector('.rg-hypothesis-markdown script')`)).toBe(true)
    expect(await evaluate(`document.querySelector('.rg-hypothesis-criteria strong')?.textContent`)).toBe('Churn')
    expect(await evaluate(`document.querySelector('.rg-hypothesis-manual-review').open`)).toBe(false)
    expect(await evaluate(`document.querySelectorAll('.rg-view-classify [role="radio"]').length`)).toBe(2)
    expect(await evaluate(`document.querySelectorAll('.rg-view-classify [role="radio"][tabindex="0"]').length`)).toBe(1)
    const readRevision = async () => fetch(`http://127.0.0.1:${previewPort}/research-graph`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ op: 'graph.snapshot' }) }).then(response => response.json()).then(result => result.revision)
    const before = await readRevision()
    for (const [index, skill] of ['hypothesis-thinking', 'hypothesis-thinking', 'thesis-drift'].entries()) {
      await evaluate('window.__conversationCalls = []')
      const clickedAt = Date.now()
      await click(`.rg-hypothesis-ai-actions > button:nth-child(${index + 1})`)
      await waitFor(() => evaluate('window.__conversationCalls.length === 1'), 'AI view research draft')
      expect(await evaluate(`document.querySelector('.rg-conversation-dialog') === null`)).toBe(true)
      const [prepared] = await evaluate('window.__conversationCalls')
      expect(prepared.text).toMatch(new RegExp(`^/${skill}\\n`))
      expect(prepared.text).toContain('source:other')
      expect(prepared.text).not.toContain('source:paper-attention')
      expect(prepared.text).toContain('confidence')
      expect(prepared.text).toContain('asOf=')
      const cutoff = /asOf="([^"]+)"/u.exec(prepared.text)?.[1]
      expect(cutoff).toBeDefined()
      expect(Date.parse(cutoff as string)).toBeGreaterThanOrEqual(clickedAt)
      expect(Date.parse(cutoff as string)).toBeLessThanOrEqual(Date.now())
      expect(prepared.text).toContain('metadata.sessionId')
    }
    expect(await readRevision()).toBe(before)
    await click('.rg-hypothesis-cutoff [role="radio"]', 'Custom date')
    expect(await evaluate(`[...document.querySelectorAll('.rg-hypothesis-ai-actions button')].every(b=>b.disabled)`)).toBe(true)
    await setValue('.rg-hypothesis-cutoff input[type="date"]', '2026-10-31')
    expect(await evaluate(`[...document.querySelectorAll('.rg-hypothesis-ai-actions button')].every(b=>!b.disabled)`)).toBe(true)
  }, 30000)

})
