import { Children, createElement, isValidElement } from 'react'
import type { ReactElement, ReactNode } from 'react'
import { renderToString } from 'react-dom/server'
import { join } from 'node:path'
import { Context } from '@deepseek-ai/cordis'
import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('@deepseek-ai/dsh-client-ui-primitives', () => ({
  MarkdownText: ({ text }: { text: string }) => text,
}))
import { FinanceService } from '../../src/finance/service.ts'
import { executeFinanceRequest } from '../../src/finance/protocol.ts'
import type { FinanceRequest } from '../../src/finance/protocol.ts'
import type { DcfInput, FinanceMetadataInput, PortfolioInput } from '../../src/finance/types.ts'
import { executeGraphRequest } from '../../src/protocol.ts'
import { ResearchGraphService, resolveConfig } from '../../src/service.ts'
import { FinanceStore } from '../../client/finance-store.ts'
import type { FinanceGateway } from '../../client/finance-store.ts'
import { WorkbenchStore } from '../../client/store.ts'
import type { GraphGateway, Translate } from '../../client/store.ts'
import { en, zh } from '../../client/locales.ts'
import { WorkbenchPage } from '../../client/ui/WorkbenchPage.tsx'
import { CalibrationResult } from '../../client/ui/FinanceMemory.tsx'
import { CatalystTimeline } from '../../client/ui/FinancePanels.tsx'
import { VirtualFundPanel } from '../../client/ui/VirtualFundPanel.tsx'
import { formatSnapshotDateTime, VirtualFundOverview } from '../../client/ui/VirtualFundOverview.tsx'
import type { GraphNode } from '../../src/graph.ts'
import { makeTempDir } from '../host/fixtures.ts'

const overviewHooks = vi.hoisted(() => ({ isolated: false }))
vi.mock('react', async importOriginal => {
  const actual = await importOriginal<typeof import('react')>()
  return {
    ...actual,
    useEffect: (...args: Parameters<typeof actual.useEffect>) => overviewHooks.isolated ? undefined : actual.useEffect(...args),
    useRef: (initial: unknown) => overviewHooks.isolated ? { current: initial } : actual.useRef(initial),
    useState: (initial: unknown) => overviewHooks.isolated
      ? [typeof initial === 'function' ? initial() : initial, () => {}]
      : actual.useState(initial),
  }
})

const cleanups: (() => Promise<void>)[] = []
afterEach(async () => {
  while (cleanups.length > 0) await cleanups.pop()?.()
})

const at = '2026-01-10T00:00:00.000Z'

function fundOverviewFixture(timestamps: readonly string[], positions: readonly { symbol: string; quantity: number; price: number; value: number }[] = []) {
  const fund: GraphNode = {
    id: 'portfolio:fund:intraday',
    kind: 'portfolio',
    title: 'Intraday Fund',
    content: '',
    metadata: { virtualFund: { initialCash: 1000000, currency: 'USD', startingAt: '2026-11-01T00:00:00Z' } },
    createdAt: 1,
    updatedAt: 1,
  }
  const snapshots: GraphNode[] = timestamps.map((asOf, index) => ({
    id: `session:fund:intraday:${index}`,
    kind: 'session',
    title: `Intraday snapshot ${index}`,
    content: '',
    metadata: {
      type: 'fund-snapshot',
      fundId: fund.id,
      asOf,
      nav: 1000000 + index * 500,
      cash: 990000,
      positions: positions.map(position => ({ ...position })),
      sourceIds: ['source:aapl-price'],
      summary: `Persisted valuation ${index + 1}`,
    },
    createdAt: index + 1,
    updatedAt: index + 1,
  }))
  return { fund, snapshots }
}

function meta(runId: string): FinanceMetadataInput {
  return { provider: 'fixture.external', asOf: at, availableAt: at, fetchedAt: at, runId, provenance: { sourceRefs: [`fixture://${runId}`] } }
}

function translate(dictionary: Record<string, string>): Translate {
  return (key, params) => {
    const template = dictionary[key] ?? key
    if (params === undefined) return template
    return Object.entries(params).reduce((text, [name, value]) => text.replaceAll(`{${name}}`, String(value)), template)
  }
}

const instrument = { id: 'instrument:a', title: 'A Corp', symbol: 'AAA', currency: 'USD', metadata: meta('instrument') }
const dcfInput: DcfInput = {
  instrument, currency: 'USD', units: { financials: 'millions', shares: 'millions' }, sharesOutstanding: 10,
  scenarios: [{ name: 'base', probability: 1, wacc: 0.1, terminalGrowth: 0.02, taxRate: 0.2, incomeStatement: { revenue: [1000], ebit: [100] }, cashFlowStatement: { depreciation: [10], capitalExpenditure: [20], workingCapitalChange: [5] }, balanceSheet: { netDebt: 100 } }],
  sensitivity: { waccValues: [0.09, 0.1, 0.11], terminalGrowthValues: [0.01, 0.02, 0.03] }, metadata: meta('dcf'),
}
const portfolioInput: PortfolioInput = {
  portfolio: { id: 'portfolio:p', title: 'Main portfolio', metadata: meta('portfolio-meta') }, baseCurrency: 'USD', asOf: at, metadata: meta('portfolio'),
  positions: [{ id: 'position:p', quantity: 2, price: 100, costBasisPerUnit: 80, metadata: meta('position'), instrument: { id: 'instrument:eur', title: 'EUR Co', currency: 'EUR', metadata: meta('eur') } }],
  fx: [{ from: 'EUR', to: 'USD', rate: 1.2, asOf: at, availableAt: at, provider: 'fixture.fx' }],
}

async function setup() {
  const temp = await makeTempDir('client-finance-render')
  cleanups.push(temp.cleanup)
  const ctx = new Context()
  const graph = new ResearchGraphService(ctx, resolveConfig({ dataDir: join(temp.dir, 'data'), autoIndexSkills: false }, join(temp.dir, 'skills')))
  const service = new FinanceService(ctx, graph)
  await service.dcf(dcfInput)
  await service.portfolio(portfolioInput)
  await service.recordPrediction({
    id: 'prediction:p', title: 'A rises', instrumentId: 'instrument:a', resolutionDate: at,
    catalyst: { id: 'catalyst:earnings', title: 'Earnings release', metadata: meta('catalyst') },
    prediction: { predictedDirection: 'up', predictedValue: 130, probability: 0.8 }, metadata: meta('prediction'),
  })
  const graphGateway: GraphGateway = { request: request => executeGraphRequest(graph, request) }
  const gateway: FinanceGateway = { request: request => executeFinanceRequest(service, request as FinanceRequest) }
  const workbench = new WorkbenchStore(graphGateway, translate(en))
  await workbench.load()
  const finance = new FinanceStore(gateway, translate(en), () => workbench.load())
  await finance.load()
  workbench.setMode('finance')
  return { workbench, finance, service, graph }
}

function render(rig: Awaited<ReturnType<typeof setup>>, dictionary: Record<string, string> = en): string {
  return renderToString(createElement(WorkbenchPage, { store: rig.workbench, finance: rig.finance, t: translate(dictionary) }))
}

describe('finance workspace rendering', () => {
  it.each(['zh-CN', 'en'])('counts coverage reports only for their explicit saved instruments (%s)', locale => {
    const { fund } = fundOverviewFixture([])
    const researcher: GraphNode = {
      id: 'session:cross-sector', kind: 'session', title: 'Technology analyst', content: '',
      metadata: { type: 'fund-researcher', fundId: fund.id, tickers: ['AAPL', 'NVDA'] }, createdAt: 1, updatedAt: 1,
    }
    const report: GraphNode = {
      id: 'deliverable:aapl-only', kind: 'deliverable', title: 'AAPL memo', content: 'AAPL only; no NVDA research',
      metadata: { fundId: fund.id, researcherId: researcher.id, instruments: ['AAPL', 'aapl'] }, createdAt: 2, updatedAt: 2,
    }
    const otherResearcher = { ...researcher, id: 'session:second-analyst', metadata: { ...researcher.metadata, tickers: ['AAPL'] } }
    const secondReport = { ...report, id: 'deliverable:aapl-second', metadata: { ...report.metadata, researcherId: otherResearcher.id, instruments: ['aapl'] } }
    const unknownScope = { ...report, id: 'deliverable:unknown-scope', metadata: { fundId: fund.id, researcherId: researcher.id } }
    const otherFund = { ...report, id: 'deliverable:other-fund', metadata: { ...report.metadata, fundId: 'portfolio:other', instruments: ['NVDA'] } }
    const html = renderToString(createElement(VirtualFundPanel, { locale, nodes: [fund, researcher, otherResearcher, report, secondReport, unknownScope, otherFund] }))
    const archive = html.match(/<section class="rg-vfund-archive">[\s\S]*?<\/section>/)?.[0] ?? ''
    const counts = Object.fromEntries([...archive.matchAll(/<strong>([^<]+)<\/strong><small>([^<]+)<\/small>/g)].map(match => [match[1], match[2]]))
    expect(counts.AAPL).toBe(locale.startsWith('zh') ? '2 份研究' : '2 reports')
    expect(counts.NVDA).toBe(locale.startsWith('zh') ? '等待首份研究' : 'Awaiting first research')
  })

  it.each([['zh-CN', true], ['en', true], ['zh-CN', false], ['en', false]] as const)(
    'discusses with the fund manager or uses a read-only fallback (%s, manager=%s)', (locale, hasManager) => {
      const { fund } = fundOverviewFixture([])
      const analyst: GraphNode = {
        id: 'session:analyst', kind: 'session', title: 'Fund Manager', content: '',
        metadata: { type: 'fund-researcher', role: 'analyst', fundId: fund.id, sessionId: 'analyst-conversation' }, createdAt: 1, updatedAt: 1,
      }
      const manager: GraphNode = {
        ...analyst, id: 'session:manager', title: '基金经理',
        metadata: { type: 'fund-researcher', role: 'manager', fundId: fund.id, sessionId: 'manager-conversation' },
      }
      const otherManager: GraphNode = {
        ...manager, id: 'session:other-manager',
        metadata: { ...manager.metadata, fundId: 'portfolio:other', sessionId: 'other-manager-conversation' },
      }
      const onResearch = vi.fn<(question: string, sessionId?: string) => void>()
      overviewHooks.isolated = true
      try {
        const walk = (node: ReactNode): ReactElement<Record<string, unknown>>[] => Children.toArray(node).flatMap(child =>
          isValidElement<Record<string, unknown>>(child) ? [child, ...walk(child.props.children as ReactNode)] : [])
        const tree = VirtualFundPanel({ locale, nodes: [fund, analyst, otherManager, ...(hasManager ? [manager] : [])], onResearch })
        const label = locale.startsWith('zh') ? '与基金经理讨论' : 'Discuss with the manager'
        const button = walk(tree).find(node => node.type === 'button' && Children.toArray(node.props.children as ReactNode).join('').includes(label))
        expect(button).toBeDefined()
        ;(button!.props.onClick as () => void)()
        expect(onResearch).toHaveBeenCalledTimes(1)
        const [prompt, sessionId] = onResearch.mock.calls[0]!
        expect(prompt).not.toMatch(/advance|推进|询问.*日期|Ask which as-of date/iu)
        expect(prompt).toContain(`fundId=${JSON.stringify(fund.id)}`)
        expect(prompt).not.toContain(otherManager.id)
        expect(prompt).not.toContain(analyst.id)
        if (hasManager) {
          expect(prompt).toContain(`researcherId=${JSON.stringify(manager.id)}`)
          expect(sessionId).toBe('manager-conversation')
        } else {
          expect(prompt).toContain(locale.startsWith('zh') ? '只读基金当前截面和现有研究记录' : 'Read only this fund’s current snapshot and existing research records')
          expect(prompt).not.toContain('researcherId=')
          expect(sessionId).toBeUndefined()
        }
      } finally {
        overviewHooks.isolated = false
      }
    },
  )

  it('keeps Complete first valuation wired to the advance action', () => {
    const { fund } = fundOverviewFixture([])
    const onResearch = vi.fn<(question: string, sessionId?: string) => void>()
    overviewHooks.isolated = true
    try {
      const walk = (node: ReactNode): ReactElement<Record<string, unknown>>[] => Children.toArray(node).flatMap(child =>
        isValidElement<Record<string, unknown>>(child) ? [child, ...walk(child.props.children as ReactNode)] : [])
      const overview = walk(VirtualFundPanel({ locale: 'en', nodes: [fund], initialView: 'overview', onResearch }))
        .find(node => node.type === VirtualFundOverview)
      expect(overview).toBeDefined()
      const button = walk(VirtualFundOverview(overview!.props as unknown as Parameters<typeof VirtualFundOverview>[0]))
        .find(node => node.type === 'button' && node.props.children === 'Complete first valuation')
      expect(button).toBeDefined()
      ;(button!.props.onClick as () => void)()
      expect(onResearch).toHaveBeenCalledTimes(1)
      expect(onResearch.mock.calls[0]![0]).toContain('finance_virtual_fund advance')
    } finally {
      overviewHooks.isolated = false
    }
  })

  it.each(['zh-CN', 'en'])('shows the exact researcher title and a localized fallback in the overview (%s)', locale => {
    const { fund, snapshots } = fundOverviewFixture(['2026-11-01T00:17:29Z'])
    const researcher: GraphNode = {
      id: 'session:researcher-chenxing-h-aapl', kind: 'session', title: '苹果科技分析师', content: '',
      metadata: { type: 'fund-researcher', fundId: fund.id }, createdAt: 1, updatedAt: 1,
    }
    const event: GraphNode = {
      id: 'deliverable:fund:research', kind: 'deliverable', title: 'Apple research', content: 'Saved report',
      metadata: { fundId: fund.id, researcherId: researcher.id, asOf: '2026-11-01T00:17:29Z' }, createdAt: 1, updatedAt: 1,
    }
    const props = { locale, fund, snapshots, events: [event], onOpenOffice: () => undefined, onOpenSeat: vi.fn() }
    const html = renderToString(createElement(VirtualFundPanel, {
      locale, nodes: [fund, ...snapshots, researcher, event], initialView: 'overview',
    }))
    expect(html).toContain('苹果科技分析师')
    expect(html).not.toContain('researcher chenxing h aapl')
    expect(html).not.toContain(researcher.id)

    const fallback = locale.startsWith('zh') ? '基金研究员' : 'Fund researcher'
    for (const researchers of [undefined, [{ ...researcher, id: researcher.id.toUpperCase(), title: 'Wrong researcher' }]]) {
      const missingHtml = renderToString(createElement(VirtualFundOverview, { ...props, researchers }))
      expect(missingHtml).toContain(fallback)
      expect(missingHtml).not.toContain('Wrong researcher')
      expect(missingHtml).not.toContain('researcher chenxing h aapl')
      expect(missingHtml).not.toContain(researcher.id)
    }

    // Inspect and invoke the real button handler in Node, without a browser.
    overviewHooks.isolated = true
    try {
      const walk = (node: ReactNode): ReactElement<Record<string, unknown>>[] => Children.toArray(node).flatMap(child =>
        isValidElement<Record<string, unknown>>(child) ? [child, ...walk(child.props.children as ReactNode)] : [])
      const buttons = walk(VirtualFundOverview({ ...props, researchers: [researcher] }))
      const open = buttons.find(node => node.type === 'button' && node.props.children === (locale.startsWith('zh') ? '打开研究员' : 'Open researcher'))
      expect(open).toBeDefined()
      ;(open!.props.onClick as () => void)()
      expect(props.onOpenSeat).toHaveBeenCalledTimes(1)
      expect(props.onOpenSeat).toHaveBeenCalledWith(researcher.id)
    } finally {
      overviewHooks.isolated = false
    }
  })

  it('uses UTC clock labels and detailed snapshot time for an intraday valuation series', () => {
    const { fund, snapshots } = fundOverviewFixture([
      '2026-11-01T00:17:29Z',
      '2026-11-01T00:18:50Z',
      '2026-11-01T00:22:26Z',
    ])
    const html = renderToString(createElement(VirtualFundOverview, {
      locale: 'en',
      fund,
      snapshots,
      onOpenOffice: () => undefined,
      onOpenSeat: () => undefined,
    }))

    expect(html).toContain('00:17 UTC')
    expect(html).toContain('00:18 UTC')
    expect(html).toContain('00:22 UTC')
    expect(html).toContain('00:22:26 UTC')
    expect(formatSnapshotDateTime(Date.parse('2026-11-01T00:17:29Z'), 'en')).toContain('00:17:29 UTC')
  })

  it('keeps dates on a short cross-day axis and preserves the date-only long-history axis', () => {
    const crossDay = fundOverviewFixture([
      '2026-11-01T23:58:00Z',
      '2026-11-02T00:02:00Z',
    ])
    const crossDayHtml = renderToString(createElement(VirtualFundOverview, {
      locale: 'en',
      fund: crossDay.fund,
      snapshots: crossDay.snapshots,
      onOpenOffice: () => undefined,
      onOpenSeat: () => undefined,
    }))
    expect(crossDayHtml).toContain('Nov 1')
    expect(crossDayHtml).toContain('Nov 2')
    expect(crossDayHtml).toContain('23:58 UTC')
    expect(crossDayHtml).toContain('00:02 UTC')

    const longHistory = fundOverviewFixture([
      '2026-10-10T00:00:00Z',
      '2026-10-20T00:00:00Z',
    ])
    const longHtml = renderToString(createElement(VirtualFundOverview, {
      locale: 'en',
      fund: longHistory.fund,
      snapshots: longHistory.snapshots,
      onOpenOffice: () => undefined,
      onOpenSeat: () => undefined,
    }))
    expect(longHtml).toContain('Oct 10')
    expect(longHtml).toContain('Oct 20')
    expect(longHtml).not.toContain('00:00 UTC')
  })

  it.each([
    { timezone: 'Asia/Shanghai', clock: '20:00:01', localDate: 'Nov 1, 2026', localZhDate: '2026年11月1日' },
    { timezone: 'America/Los_Angeles', clock: '00:30:01', localDate: 'Oct 30, 2026', localZhDate: '2026年10月30日' },
  ])('keeps daily valuation dates in UTC and research dates local ($timezone)', ({ timezone, clock, localDate, localZhDate }) => {
    const previousTimezone = process.env.TZ
    process.env.TZ = timezone
    try {
      const timestamps = [`2026-10-30T${clock}Z`, `2026-10-31T${clock}Z`]
      // Ensure the host timezone really crosses a date boundary; do not pass vacuously in UTC.
      expect(new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(timestamps[1]!))).toBe(localDate)
      const { fund, snapshots } = fundOverviewFixture(timestamps)
      const events: GraphNode[] = snapshots.map((snapshot, index) => ({
        id: `deliverable:fund:timezone:${index}`, kind: 'deliverable', title: `Local research ${index}`, content: '',
        metadata: { fundId: fund.id, researcherId: 'session:researcher:timezone', asOf: timestamps[index]! },
        createdAt: index + 1, updatedAt: index + 1,
      }))
      for (const locale of ['en', 'zh-CN']) {
        const dates = locale === 'en' ? ['Oct 30, 2026', 'Oct 31, 2026'] : ['2026年10月30日', '2026年10月31日']
        const axisDates = locale === 'en' ? ['Oct 30', 'Oct 31'] : ['10月30日', '10月31日']
        const label = locale === 'en' ? 'Valuation date (UTC)' : '估值日期（UTC）'
        const render = (savedSnapshots: readonly GraphNode[]) => renderToString(createElement(VirtualFundOverview, {
          locale, fund, snapshots: savedSnapshots, events, onOpenOffice: () => undefined, onOpenSeat: () => undefined,
        }))
        const html = render(snapshots)
        expect(html).toMatch(new RegExp(`<dt>[^<]*</dt><dd><strong>${dates[1]}</strong>`))
        expect(html).toContain(`<dt>${label}</dt>`)
        for (const axisDate of axisDates) expect(html).toContain(`>${axisDate}</text>`)
        expect(html).not.toContain(`${clock.slice(0, 5)} UTC`)
        for (const [index, snapshot] of snapshots.entries()) {
          const single = render([snapshot])
          expect(single).toMatch(new RegExp(`<dt>[^<]*</dt><dd><strong>${dates[index]}</strong>`))
          expect(single).toContain(`${dates[index]} · 0 ${locale === 'en' ? 'positions' : '个持仓'}`)
          expect(formatSnapshotDateTime(Date.parse(timestamps[index]!), locale)).toContain(dates[index])
        }
        const researchDate = locale === 'en' ? localDate : localZhDate
        expect(html).toMatch(new RegExp(`<time[^>]*>${researchDate}</time>`))
        expect(html).toContain(`<small>${researchDate}</small>`)
      }
    } finally {
      if (previousTimezone === undefined) delete process.env.TZ
      else process.env.TZ = previousTimezone
    }
  })

  it('renders holdingsOnly from the latest real snapshot without chart or research surfaces', () => {
    const { fund, snapshots } = fundOverviewFixture([
      '2026-11-01T00:17:29Z',
      '2026-11-01T00:18:50Z',
      '2026-11-01T00:22:26Z',
    ])
    const latestOnly = snapshots.map((snapshot, index) => ({
      ...snapshot,
      metadata: {
        ...snapshot.metadata,
        positions: index === snapshots.length - 1
          ? [{ symbol: 'AAPL', quantity: 50, price: 200, value: 10000 }]
          : [{ symbol: 'MSFT', quantity: 10, price: 100, value: 1000 }],
      },
    }))
    const html = renderToString(createElement(VirtualFundOverview, {
      locale: 'en',
      fund,
      snapshots: latestOnly,
      holdingsOnly: true,
      onOpenOffice: () => undefined,
      onOpenSeat: () => undefined,
    }))

    expect(html).toContain('Intraday Fund')
    expect(html).toContain('$1,001,000')
    expect(html).toContain('AAPL')
    expect(html).toContain('50')
    expect(html).not.toContain('MSFT')
    expect(html).toContain('Invested')
    expect(html).not.toContain('Valuation history')
    expect(html).not.toContain('Recent research')
    expect(html).not.toContain('<svg')
  })

  it('retains the existing fund and first-valuation empty guidance in holdingsOnly mode', () => {
    const { fund } = fundOverviewFixture([])
    const noFund = renderToString(createElement(VirtualFundOverview, {
      locale: 'en',
      snapshots: [],
      holdingsOnly: true,
      onOpenOffice: () => undefined,
      onOpenSeat: () => undefined,
    }))
    const noSnapshot = renderToString(createElement(VirtualFundOverview, {
      locale: 'en',
      fund,
      snapshots: [],
      holdingsOnly: true,
      onOpenOffice: () => undefined,
      onOpenSeat: () => undefined,
    }))

    expect(noFund).toContain('Create a virtual fund')
    expect(noFund).toContain('Create fund')
    expect(noSnapshot).toContain('Complete the first valuation')
    expect(noSnapshot).toContain('Complete first valuation')
  })

  it('keeps the graph-backed research activity after moving the main workflow catalog', async () => {
    const rig = await setup()
    rig.finance.setSection('activity')
    const html = render(rig)
    expect(html).toContain('Research workflow')
    expect(html).toContain('Workflow ledger')
    expect(html).toContain('Start with a real source')
    expect(html).toContain('A rises')
    expect(html).toContain('Finance')
    expect(html).toContain('History')
    expect(html).toContain('Audit')
    expect(html).toContain('rg-workflow-ledger')
  })

  it('renders real DCF assumptions and sensitivity cells', async () => {
    const rig = await setup()
    rig.finance.setSection('valuations')
    const html = render(rig)
    expect(html).toContain('Scenario assumptions &amp; results')
    expect(html).toContain('Sensitivity — per share')
    expect(html).toContain('71.25')
    expect(html).toContain('Terminal growth')
    expect(html).toContain('Raw JSON')
    expect(html).toContain('fixture.external')
  })

  it('keeps multiple saved valuation bodies unmounted until their own disclosure opens', async () => {
    const rig = await setup()
    await rig.service.dcf({ ...dcfInput, instrument: { ...dcfInput.instrument, id: 'instrument:b', symbol: 'BBB' } })
    await rig.workbench.load()
    rig.finance.setSection('valuations')
    const html = render(rig)
    expect(html.match(/class="rg-finance-record"/g) ?? []).toHaveLength(2)
    expect(html).not.toContain('rg-sensitivity-matrix')
    expect(html).not.toContain('rg-scenario-bars')
    expect(html).not.toContain('<pre>')
  })

  it('keeps legacy portfolio holdings inside Virtual fund without a duplicate primary navigation item', async () => {
    const rig = await setup()
    rig.finance.setSection('portfolio')
    const html = render(rig)
    expect(html).toMatch(/<button[^>]*id="rg-finance-tab-virtual-fund"[^>]*aria-selected="true"/u)
    expect(html).not.toContain('id="rg-finance-tab-portfolio"')
    expect(html).toMatch(/<button[^>]*id="rg-vfund-tab-portfolio"[^>]*aria-selected="true"/u)
    expect(html).toContain('Main portfolio')
    expect(html).toContain('FX snapshots used')
    expect(html).toContain('EUR/USD')
    expect(html).toContain('fixture.fx')
    expect(html).toContain('Base market value')
    expect(html).toContain('240')
    expect(html).toMatch(/class="rg-finance-table-link"[^>]*>EUR Co<\/button>/u)
  })

  it('reads fund.state contracts from graph-backed fund fixtures', async () => {
    const rig = await setup()
    const fundId = 'portfolio:fund:render'
    await rig.graph.createNode({
      id: fundId, kind: 'portfolio', title: 'Render Fund', content: '',
      metadata: { virtualFund: { initialCash: 1000000, currency: 'USD', startingAt: '2026-10-01T00:00:00Z' } },
    })
    for (const [id, title, ticker, role] of [
      ['session:fund:manager', 'Fund Manager', 'AAPL', 'manager'],
      ['session:fund:nvda', 'NVDA Analyst', 'NVDA', 'analyst'],
      ['session:fund:googl', 'GOOGL Analyst', 'GOOGL', 'analyst'],
      ['session:fund:cost', 'COST Analyst', 'COST', 'analyst'],
      ['session:fund:jpm', 'JPM Analyst', 'JPM', 'analyst'],
      ['session:fund:reviewer', 'Risk Reviewer', 'UNH', 'reviewer'],
    ] as const) {
      await rig.graph.createNode({
        id, kind: 'session', title, content: `Research ${ticker}`,
        metadata: {
          type: 'fund-researcher', fundId, tickers: [ticker], researchStyle: 'Traceable',
          focus: ticker, task: `Review ${ticker}`, role, enabled: false,
        },
      })
    }
    await rig.graph.createNode({
      id: 'session:fund:snapshot', kind: 'session', title: 'Render snapshot', content: '',
      metadata: {
        type: 'fund-snapshot', fundId, asOf: '2026-10-10T00:00:00Z', nav: 1025000, cash: 1000000,
        positions: [{ symbol: 'NVDA', quantity: 100, price: 250, value: 25000 }], sourceIds: [], summary: 'Saved render fixture',
      },
    })
    await rig.workbench.load()

    const response = await executeFinanceRequest(rig.service, { op: 'fund.state', input: { fundId } })
    expect(response.ok).toBe(true)
    if (!response.ok) throw new Error(response.error.message)
    expect(response.result).toMatchObject({
      funds: [expect.objectContaining({ id: fundId, title: 'Render Fund' })],
      researchers: expect.arrayContaining([
        expect.objectContaining({ id: 'session:fund:manager', title: 'Fund Manager' }),
        expect.objectContaining({ id: 'session:fund:reviewer', title: 'Risk Reviewer' }),
      ]),
      snapshots: [expect.objectContaining({ id: 'session:fund:snapshot', metadata: expect.objectContaining({ nav: 1025000 }) })],
    })

    rig.finance.setSection('virtual-fund')
    const html = render(rig)
    expect(html).toContain('Render Fund')
    expect((html.match(/class="rg-vfund-node rg-vfund-station"/g) ?? [])).toHaveLength(6)
    expect(html).toContain('$1,025,000')
    expect(html).toContain('NVDA Analyst')
    expect(html).toContain('Risk Reviewer')
  })

  it('renders legacy invalid fund currencies as literal values instead of throwing', () => {
    const fund: GraphNode = {
      id: 'portfolio:fund:legacy', kind: 'portfolio', title: 'Legacy Fund', content: '',
      metadata: { virtualFund: { initialCash: 1000000, currency: 'ZZZ', startingAt: '2026-10-01T00:00:00Z' } },
      createdAt: 1, updatedAt: 1,
    }
    const snapshot: GraphNode = {
      id: 'session:fund:legacy:snapshot', kind: 'session', title: 'Legacy snapshot', content: '',
      metadata: {
        type: 'fund-snapshot', fundId: fund.id, asOf: '2026-10-10T00:00:00Z', nav: 1000000, cash: 1000000,
        positions: [], sourceIds: [],
      },
      createdAt: 1, updatedAt: 1,
    }
    const office = renderToString(createElement(VirtualFundPanel, { locale: 'en', nodes: [fund, snapshot], initialView: 'office' }))
    const overview = renderToString(createElement(VirtualFundPanel, { locale: 'en', nodes: [fund, snapshot], initialView: 'overview' }))
    expect(office).toMatch(/ZZZ\s+1,000,000/u)
    expect(overview).toMatch(/ZZZ\s+1,000,000/u)
  })

  it('separates catalyst, prediction, and calibration tabs while retaining real records', async () => {
    const rig = await setup()
    await rig.finance.loadDue('2026-01-11T00:00:00.000Z')
    rig.finance.setSection('predictions')
    const html = render(rig)
    expect(html).toContain('rg-predictions-tab-catalysts')
    expect(html).toContain('rg-predictions-tab-calibration')
    expect(html).toContain('Due predictions')
    expect(html).toContain('A rises')
    expect(html).toContain('Resolve this prediction')
    const catalysts = renderToString(createElement(CatalystTimeline, { nodes: rig.workbench.getSnapshot().nodes, t: translate(en) }))
    expect(catalysts).toContain('rg-finance-timeline')
    expect(catalysts).toContain('Earnings release')
  })

  it('renders prepared briefing content and deterministic evaluation', async () => {
    const rig = await setup()
    await rig.finance.prepareBriefing('2026-01-11T00:00:00.000Z')
    await rig.finance.evaluateBriefing('2026-01-11T00:00:00.000Z')
    rig.finance.setSection('briefing')
    const html = render(rig)
    expect(html).toContain('Finance briefing — 2026-01-11')
    expect(html).toContain('pending_due')
    expect(html).toContain('Use prepared content')
  })

  it('shows an honest provider error and no fabricated quote', async () => {
    const rig = await setup()
    const offline = new FinanceStore({
      request: request => request.op === 'market.fetch'
        ? Promise.resolve({ ok: false, error: { code: 'UNAVAILABLE', message: 'provider offline' } })
        : executeFinanceRequest(rig.service, request as FinanceRequest),
    }, translate(en))
    await offline.load()
    await offline.fetchQuote('AAA')
    offline.setSection('market')
    const html = renderToString(createElement(WorkbenchPage, { store: rig.workbench, finance: offline, t: translate(en) }))
    expect(html).toContain('UNAVAILABLE: provider offline')
    expect(html).not.toContain('123.45')
  })

  it('keeps sample mode explicit at the workspace level without repeated local demo badges', async () => {
    const rig = await setup()
    rig.finance.setSection('watchlist')
    const html = render(rig)

    expect(html).toContain('<label>Page data<!-- --> <select aria-label="Page data mode">')
    expect(html).toContain('<option value="demo" selected="">Example data</option>')
    expect(html).toContain('<option value="real">My data</option>')
    expect(html).toContain('Apple')
    expect(html).toContain('BTC-USD')
    expect(html).toContain('Unfollow AAPL')
    expect(html).toContain('Unfollow BTC-USD')
    expect(html).not.toContain('Synthetic examples')
    expect(html).not.toContain('Demo · synthetic scenarios')
    expect(html).not.toContain('Small demo')
    expect(html).not.toContain('Synthetic demo data')
  })

  it('renders finance navigation and kind labels in Chinese', async () => {
    const rig = await setup()
    rig.finance.setSection('activity')
    const html = render(rig, zh)
    expect(html).toContain('研究工作流')
    expect(html).toContain('工作流台账')
    expect(html).toContain('采集')
    expect(html).toContain('假说')
    expect(html).toContain('虚拟基金')
    expect(html).toContain('预测')
  })
})

describe('calibration warnings visibility', () => {
  it('surfaces the Host small-sample warning outside Raw JSON', () => {
    const value = {
      asOf: '2026-10-30T00:00:00Z',
      due: 2,
      resolved: 2,
      errors: 0,
      pendingDue: 0,
      directionalAccuracy: 0.5,
      brierScore: 0.21,
      brierCount: 4,
      calibrationBins: [],
      evaluations: [],
      warnings: ['small calibration sample: 4 determinate prediction(s); interpret bins cautiously (30+ recommended)'],
    }
    const html = renderToString(createElement(CalibrationResult, { value, t: translate(en) }))
    const warningAt = html.indexOf('small calibration sample: 4 determinate prediction(s)')
    expect(warningAt).toBeGreaterThanOrEqual(0)
    expect(html).toContain('rg-chart-warnings')
    // The visible notice must come from the result body itself, not only the collapsed Raw JSON block.
    const rawAt = html.indexOf('rg-finance-raw')
    expect(rawAt === -1 || warningAt < rawAt).toBe(true)
  })

  it('renders nothing extra when the Host returns no warnings', () => {
    const value = { asOf: '2026-10-30T00:00:00Z', brierScore: null, brierCount: 0, calibrationBins: [], evaluations: [], warnings: [] }
    const html = renderToString(createElement(CalibrationResult, { value, t: translate(en) }))
    expect(html).not.toContain('rg-chart-warnings')
  })
})

describe('virtual fund selection persistence', () => {
  const fundNode = (id: string, title: string, currency: string): GraphNode => ({
    id, kind: 'portfolio', title, content: '',
    metadata: { virtualFund: { initialCash: 1000000, currency, startingAt: '2026-11-01T00:00:00Z' } },
    createdAt: 1, updatedAt: 1,
  })

  it('restores the chosen fund after the panel remounts within a tab session', () => {
    const usd = fundNode('portfolio:fund:usd', 'USD Fund', 'USD')
    const hkd = fundNode('portfolio:fund:hkd', 'HKD Fund', 'HKD')
    const saved = new Map<string, string>()
    vi.stubGlobal('sessionStorage', {
      getItem: (key: string) => saved.get(key) ?? null,
      setItem: (key: string, value: string) => { saved.set(key, String(value)) },
      removeItem: (key: string) => { saved.delete(key) },
    })
    overviewHooks.isolated = true
    try {
      const walk = (node: ReactNode): ReactElement<Record<string, unknown>>[] => Children.toArray(node).flatMap(child =>
        isValidElement<Record<string, unknown>>(child) ? [child, ...walk(child.props.children as ReactNode)] : [])
      const findSelect = (tree: ReactNode) => walk(tree).find(node => node.type === 'select' && node.props['aria-label'] === 'Choose fund')

      const first = findSelect(VirtualFundPanel({ locale: 'en', nodes: [usd, hkd] }))
      expect(first).toBeDefined()
      expect(first!.props.value).toBe(usd.id)
      ;(first!.props.onChange as (event: { target: { value: string } }) => void)({ target: { value: hkd.id } })
      expect(saved.get('dsh-finance.virtual-fund-selection.v1')).toBe(hkd.id)

      const remounted = findSelect(VirtualFundPanel({ locale: 'en', nodes: [usd, hkd] }))
      expect(remounted).toBeDefined()
      expect(remounted!.props.value).toBe(hkd.id)
    } finally {
      overviewHooks.isolated = false
      vi.unstubAllGlobals()
    }
  })

  it('falls back to the first fund when the saved fund no longer exists', () => {
    const usd = fundNode('portfolio:fund:usd', 'USD Fund', 'USD')
    const hkd = fundNode('portfolio:fund:hkd', 'HKD Fund', 'HKD')
    vi.stubGlobal('sessionStorage', {
      getItem: () => 'portfolio:fund:deleted',
      setItem: () => undefined,
      removeItem: () => undefined,
    })
    overviewHooks.isolated = true
    try {
      const walk = (node: ReactNode): ReactElement<Record<string, unknown>>[] => Children.toArray(node).flatMap(child =>
        isValidElement<Record<string, unknown>>(child) ? [child, ...walk(child.props.children as ReactNode)] : [])
      const tree = VirtualFundPanel({ locale: 'en', nodes: [usd, hkd] })
      const select = walk(tree).find(node => node.type === 'select' && node.props['aria-label'] === 'Choose fund')
      expect(select).toBeDefined()
      expect(select!.props.value).toBe(usd.id)
    } finally {
      overviewHooks.isolated = false
      vi.unstubAllGlobals()
    }
  })
})
