import { createElement } from 'react'
import type { ComponentType } from 'react'
import { renderToString } from 'react-dom/server'
import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('@deepseek-ai/dsh-client-ui-primitives', () => ({
  MarkdownText: ({ text }: { text: string }) => text,
}))
import { apply, inject, NS } from '../../client/index.tsx'
import { PANEL_ENTRIES } from '../../client/entries.tsx'
import { FINANCE_TOOL_VIEW_TOOLS } from '../../client/ui/FinanceToolView.tsx'
import { hostNavigator } from '../../client/host-nav.ts'
import type { PanelEntry } from '../../client/entries.tsx'
import { en } from '../../client/locales.ts'
import type { ClientShell } from '../../client/index.tsx'
import type { FinanceStore } from '../../client/finance-store.ts'
import type { ResearchStore } from '../../client/research-store.ts'
import type { WorkbenchStore } from '../../client/store.ts'

interface Seat {
  readonly options: Record<string, unknown>
  readonly component: unknown
}

function translate(key: string, params?: Record<string, unknown>): string {
  const template: string = en[key as keyof typeof en] ?? key
  if (params === undefined) return template
  return Object.entries(params).reduce((text, [name, value]) => text.replaceAll(`{${name}}`, String(value)), template)
}

function harness(initialPanel: string | null = null, supportsPanelSelection = true, sidebarAvailable = false) {
  const mains = new Map<string, Seat>()
  const sidebar = new Map<string, Seat>()
  const commands = new Map<string, Seat>()
  const toolviews = new Map<string, Seat>()
  const cleanups: Array<() => void> = []
  const listeners = new Set<() => void>()
  const mainRegistrations: Array<() => unknown> = []
  const capabilityInjections: string[][] = []
  let activePanelId = initialPanel
  let subscriptions = 0
  const selectPanel = vi.fn((id: string | null) => {
    if (id !== null) expect(mains.has(id)).toBe(true)
    activePanelId = id
    for (const listener of [...listeners]) listener()
  })
  const ctx = {
    inject: (dependencies: string[], callback: (context: ClientShell) => void): void => {
      capabilityInjections.push([...dependencies])
      if (sidebarAvailable) callback({
        ...ctx,
        uiWorkspace: { openSession: () => {} },
        sidebarRight: { mounted: { getSnapshot: () => 'session:one' }, openResource: () => {} },
      } as unknown as ClientShell)
    },
    locale: {
      register: () => () => {},
      bind: () => translate,
    },
    slots: {
      inject: (name: string, register: () => unknown) => {
        if (name === 'main') mainRegistrations.push(register)
        return register()
      },
      register: (options: Record<string, unknown>, component: unknown) => {
        const seat = { options, component }
        const map = options['name'] === 'main' ? mains : options['name'] === 'conversation.chat.commandview' ? commands : options['name'] === 'tool.call.toolview' ? toolviews : sidebar
        const id = String(options['name'] === 'sidebar.panellist' ? options['id'] : options['key'])
        map.set(id, seat)
        return () => {
          if (map.get(id)?.component === component) map.delete(id)
        }
      },
    },
    remote: {
      commands: {
        execute: async () => ({ ok: true, value: { result: { kind: 'success', text: JSON.stringify({ ok: true, revision: 0, result: { revision: 0, nodes: [], edges: [] } }) } } }),
      },
    },
    layout: {
      ...(supportsPanelSelection ? { selectPanel } : {}),
      panelInfo: {
        getSnapshot: () => ({ activePanelId }),
        subscribe: (listener: () => void) => {
          subscriptions += 1
          listeners.add(listener)
          return () => { subscriptions -= 1; listeners.delete(listener) }
        },
      },
    },
    sessions: {
      list: { getSnapshot: () => ({ ids: ['session:one'], byId: { 'session:one': { id: 'session:one', retainedBy: { mainView: 1 } } } }) },
      create: async () => 'session:one',
    },
    on: () => {},
    effect: (setup: () => (() => void) | void) => {
      const cleanup = setup()
      if (typeof cleanup === 'function') cleanups.push(cleanup)
    },
  }
  const dispose = () => { while (cleanups.length > 0) cleanups.pop()?.() }
  apply(ctx as unknown as ClientShell)
  return { mains, sidebar, commands, toolviews, capabilityInjections, selectPanel, dispose, reregisterMains: () => { for (const register of mainRegistrations) register() }, get activePanelId() { return activePanelId }, get subscriptions() { return subscriptions } }
}

function injectedSeat(seat: Seat | undefined): {
  workbench: WorkbenchStore
  finance: FinanceStore
  research: ResearchStore
  entry: PanelEntry
} {
  if (seat === undefined) throw new Error('missing seat')
  return (seat.options['inject'] as () => {
    workbench: WorkbenchStore
    finance: FinanceStore
    research: ResearchStore
    entry: PanelEntry
  })()
}

describe('unified Finance entrance and retained panel addresses', () => {
  afterEach(() => { vi.unstubAllGlobals() })

  it('keeps file preview optional without blocking Finance when its host service is absent', () => {
    expect(inject).not.toContain('sidebarRight')
    const unavailable = harness()
    try {
      expect(unavailable.mains.has('finance-workbench')).toBe(true)
      expect(unavailable.capabilityInjections).toContainEqual(['sidebarRight'])
      expect(unavailable.capabilityInjections).toContainEqual(['remote.schedule'])
      expect(hostNavigator()).toBeUndefined()
    } finally { unavailable.dispose() }
    const available = harness(null, true, true)
    try { expect(hostNavigator()).toBeDefined() } finally { available.dispose() }
    expect(hostNavigator()).toBeUndefined()
  })

  it.each(['AAPL', ' aapl ', '^GSPC', 'BRK-B', 'EURUSD=X'])('opens a valid shared asset %s only after its main is registered', (asset) => {
    vi.stubGlobal('window', { location: { href: `http://localhost/?asset=${encodeURIComponent(asset)}` } })
    const rig = harness()
    try {
      expect(rig.selectPanel).toHaveBeenCalledOnce()
      expect(rig.selectPanel).toHaveBeenCalledWith('finance-workbench')
      expect(rig.activePanelId).toBe('finance-workbench')
      const seat = injectedSeat(rig.mains.get('finance-workbench'))
      expect(seat.workbench.getSnapshot().mode).toBe('finance')
      expect(seat.finance.getSnapshot().section).toBe('markets')
      rig.selectPanel(null)
      rig.selectPanel.mockClear()
      rig.reregisterMains()
      expect(rig.selectPanel).not.toHaveBeenCalled()
      expect(rig.activePanelId).toBeNull()
    } finally {
      rig.dispose()
    }
  })

  it.each(['', '?symbol=AAPL', '?asset=', '?asset=123', '?asset=AAPL%20MSFT', '?asset=ABCDEFGHIJKLMNOPQRSTU', '?asset=%3Cscript%3E'])('preserves native chat for absent or invalid asset in %s', (query) => {
    vi.stubGlobal('window', { location: { href: `http://localhost/${query}` } })
    const rig = harness()
    try {
      expect(rig.selectPanel).not.toHaveBeenCalled()
      expect(rig.activePanelId).toBeNull()
    } finally {
      rig.dispose()
    }
  })

  it('keeps older layout faces without selectPanel compatible with asset links', () => {
    vi.stubGlobal('window', { location: { href: 'http://localhost/?asset=AAPL' } })
    const rig = harness(null, false)
    try {
      expect(rig.mains.has('finance-workbench')).toBe(true)
      expect(rig.selectPanel).not.toHaveBeenCalled()
      expect(rig.activePanelId).toBeNull()
    } finally {
      rig.dispose()
    }
  })

  it('keeps every main address with one visible Finance entrance', () => {
    const rig = harness()
    try {
      expect(inject).toEqual(['slots', 'layout', 'locale', 'remote', 'remote.commands', 'sessions', 'conversation', 'uiWorkspace', 'workspaces'])
      expect(rig.mains.size).toBe(PANEL_ENTRIES.length)
      expect(rig.sidebar.size).toBe(1)
      expect([...rig.sidebar.keys()]).toEqual(['finance-workbench'])
      expect([...rig.commands.keys()]).toEqual(['research-graph', 'finance', ''])
      expect([...rig.toolviews.keys()]).toEqual([...FINANCE_TOOL_VIEW_TOOLS])
      expect(PANEL_ENTRIES.map(entry => entry.id)).toContain('research-graph')
      expect(PANEL_ENTRIES.map(entry => entry.id)).toContain('finance-workbench')
      expect(PANEL_ENTRIES.map(entry => entry.id)).toContain('finance-library')
      expect(PANEL_ENTRIES.map(entry => entry.id)).toContain('finance-research')
      expect(PANEL_ENTRIES.map(entry => entry.id)).toContain('finance-market')
      expect(PANEL_ENTRIES.map(entry => entry.id)).toContain('finance-guide')
      expect(new Set(PANEL_ENTRIES.map(entry => entry.icon)).size).toBe(PANEL_ENTRIES.length)
    } finally {
      rig.dispose()
    }
  })

  it('routes the host locale into the registered tool process view (zh/en)', () => {
    const rig = harness()
    try {
      const seat = rig.toolviews.get('finance_market_data')
      expect(seat).toBeDefined()
      const block = {
        name: 'finance_market_data',
        call: { name: 'finance_market_data', argsRaw: '{"action":"fetch","symbol":"AAAA"}' },
        content: [{ type: 'text', text: '{"ok":true}' }],
        isError: false,
      }
      const owner = { callId: 'call-1', toolName: 'finance_market_data', phase: 'result', block }
      const render = (active: string) => renderToString(createElement(seat!.component as ComponentType<Record<string, unknown>>, {
        ...owner,
        localeFace: { getSnapshot: () => active, subscribe: () => () => {} },
      }))
      // Without the localeFace bridge the card would stay Chinese under an English host.
      expect(render('en')).toContain('Fetching market data')
      expect(render('en')).toContain('Done')
      expect(render('zh')).toContain('读取行情数据')
      expect(render('zh')).toContain('完成')
    } finally {
      rig.dispose()
    }
  })

  it('keeps labels, locales, and the shared stores aligned across every pair', () => {
    const rig = harness()
    try {
      const stores = PANEL_ENTRIES.map(entry => {
        const main = rig.mains.get(entry.id)
        const side = rig.sidebar.get(entry.id)
        expect(main?.options['key']).toBe(entry.id)
        if (entry.id === 'finance-workbench') expect(side?.options['id']).toBe(entry.id)
        expect(main?.options['locale']).toBe(NS)
        if (side) expect(side.options['locale']).toBe(NS)
        if (side) expect(side.options['order']).toBe(entry.order)
        if (side) expect((side.options['label'] as () => string)()).toBe(translate(entry.labelKey))
        return injectedSeat(main)
      })
      const first = stores[0]
      expect(first).toBeDefined()
      for (const stored of stores) {
        expect(stored.workbench).toBe(first?.workbench)
        expect(stored.finance).toBe(first?.finance)
        expect(stored.research).toBe(first?.research)
      }
    } finally {
      rig.dispose()
    }
  })

  it('initialises mode and section when an entry becomes active', () => {
    const rig = harness()
    try {
      const guide = injectedSeat(rig.mains.get('finance-guide'))
      expect(guide.workbench.getSnapshot().mode).toBe('graph')
      expect(guide.finance.getSnapshot().section).toBe('overview')
      rig.selectPanel('finance-library')
      expect(guide.workbench.getSnapshot().mode).toBe('finance')
      expect(guide.finance.getSnapshot().section).toBe('inbox')
      rig.selectPanel('finance-research')
      expect(guide.finance.getSnapshot().section).toBe('hypotheses')
      rig.selectPanel('finance-market')
      expect(guide.finance.getSnapshot().section).toBe('market')
      rig.selectPanel('finance-guide')
      expect(guide.finance.getSnapshot().section).toBe('guide')
      rig.selectPanel('research-graph')
      expect(guide.workbench.getSnapshot().mode).toBe('graph')
    } finally {
      rig.dispose()
    }
  })

  it('applies the active entry at registration time, including a direct panel address', () => {
    const rig = harness('finance-workbench')
    try {
      const seat = injectedSeat(rig.mains.get('finance-workbench'))
      expect(seat.workbench.getSnapshot().mode).toBe('finance')
      expect(seat.finance.getSnapshot().section).toBe('markets')
      expect(rig.subscriptions).toBe(1)
      seat.finance.setSection('market')
      rig.selectPanel('finance-workbench')
      expect(seat.finance.getSnapshot().section).toBe('market')
    } finally {
      rig.dispose()
    }
  })

  it('returns from a native conversation to the selected finance section and reloads saved research', async () => {
    const rig = harness('finance-workbench')
    try {
      const seat = injectedSeat(rig.mains.get('finance-workbench'))
      const reload = vi.spyOn(seat.workbench, 'refresh').mockResolvedValue()
      seat.finance.setSection('reports')
      rig.selectPanel(null)
      rig.selectPanel('finance-workbench')
      expect(seat.finance.getSnapshot().section).toBe('reports')
      expect(reload).toHaveBeenCalledOnce()
      rig.selectPanel('finance-library')
      expect(seat.finance.getSnapshot().section).toBe('inbox')
      rig.selectPanel(null)
      rig.selectPanel('finance-library')
      expect(seat.finance.getSnapshot().section).toBe('inbox')
      expect(reload).toHaveBeenCalledTimes(3)
    } finally {
      rig.dispose()
    }
  })

  it('disposes each main and sidebar registration together', () => {
    const rig = harness()
    rig.dispose()
    expect(rig.mains.size).toBe(0)
    expect(rig.sidebar.size).toBe(0)
    expect(rig.subscriptions).toBe(0)
  })

  it('draws active, distinct single-stroke icons for the sidebar', () => {
    const rig = harness()
    try {
      for (const entry of PANEL_ENTRIES) {
        const icon = entry.icon
        if (typeof icon !== 'function') throw new Error(`missing icon for ${entry.id}`)
        const html = renderToString(createElement(icon as ComponentType<{ size?: number; active?: boolean }>, { size: 18, active: true }))
        expect(html).toContain('<svg')
        expect(html).toContain('stroke="currentColor"')
        if (entry.id !== 'research-graph') expect(html).toContain('data-active="true"')
        expect(html).not.toContain('<img')
      }
    } finally {
      rig.dispose()
    }
  })
})
