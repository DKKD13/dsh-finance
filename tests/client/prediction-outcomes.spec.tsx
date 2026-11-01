import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import type { GraphNode } from '../../src/graph.ts'
import {
  PredictionMarketDetail,
  earningsWeekStart,
  filterPredictionHistory,
  predictionMarketDemoContracts,
  predictionMarketRecords,
  predictionOutcomeView,
} from '../../client/ui/FinanceEvents.tsx'

function node(metadata: GraphNode['metadata']): GraphNode {
  return {
    id: 'catalyst:multi-outcome',
    kind: 'catalyst',
    title: 'Which company will lead?',
    content: '',
    createdAt: 1,
    updatedAt: 1,
    metadata,
  }
}

const outcomes = [
  {
    name: 'SpaceX',
    probability: .57,
    history: [
      { at: '2026-10-30T00:00:00Z', probability: .48 },
      { at: '2026-10-30T05:00:00Z', probability: .52 },
      { at: '2026-10-30T05:30:00Z', probability: .55 },
      { at: '2026-10-30T06:00:00Z', probability: .57 },
    ],
  },
  {
    name: 'Anthropic',
    probability: .42,
    history: [
      { at: '2026-10-30T00:00:00Z', probability: .51 },
      { at: '2026-10-30T05:00:00Z', probability: .47 },
      { at: '2026-10-30T05:30:00Z', probability: .44 },
      { at: '2026-10-30T06:00:00Z', probability: .42 },
    ],
  },
  { name: 'OpenAI', probability: .01, history: [] },
]

function multiContract() {
  return predictionMarketRecords([node({
    predictionMarket: {
      topic: 'Technology',
      resolutionDate: '2026-12-31',
      volume: 7000000,
      criteria: 'Resolve from the named public source.',
      sourceUrl: 'https://example.test/multi',
      provider: 'Example Market',
      asOf: '2026-10-30T06:00:00Z',
      outcomes: ['ignored nested outcome'],
    },
    outcomes,
  })])[0]!
}

describe('prediction market multi-outcomes', () => {
  it('accepts only the validated top-level metadata.outcomes shape', () => {
    const contract = multiContract()
    expect(contract.outcomeDataState).toBe('valid')
    expect(contract.outcomes.map(outcome => outcome.name)).toEqual(['SpaceX', 'Anthropic', 'OpenAI'])
    expect(contract.outcomes[0]?.history[0]).toEqual({
      at: '2026-10-30T00:00:00Z',
      probability: .48,
    })
    expect(contract.outcomes.flatMap(outcome => outcome.history).every(point => point.at === '2026-10-30T00:00:00Z' || point.at === '2026-10-30T05:00:00Z' || point.at === '2026-10-30T05:30:00Z' || point.at === '2026-10-30T06:00:00Z')).toBe(true)
  })

  it('ignores an invalid explicit outcome array without overwriting binary fields', () => {
    const contract = predictionMarketRecords([node({
      predictionMarket: {
        probability: .62,
        history: [.42, .62],
        provider: 'Binary fixture',
      },
      outcomes: [
        { name: 'A', probability: .5, history: [{ at: 'not-a-date', probability: .5 }] },
        { name: 'B', probability: .5 },
      ],
    })])[0]!
    expect(contract.outcomeDataState).toBe('invalid')
    expect(contract.outcomes).toEqual([])
    expect(contract.probability).toBe(.62)
    expect(contract.history).toEqual([.42, .62])
  })

  it('filters timestamped history from its latest explicit point and preserves timestamps', () => {
    const contract = multiContract()
    const oneHour = filterPredictionHistory(contract.outcomes[0]!.history, '1h')
    const sixHours = filterPredictionHistory(contract.outcomes[0]!.history, '6h')
    expect(oneHour.map(point => point.at)).toEqual([
      '2026-10-30T05:00:00Z',
      '2026-10-30T05:30:00Z',
      '2026-10-30T06:00:00Z',
    ])
    expect(sixHours.map(point => point.at)).toEqual([
      '2026-10-30T00:00:00Z',
      '2026-10-30T05:00:00Z',
      '2026-10-30T05:30:00Z',
      '2026-10-30T06:00:00Z',
    ])
    expect(filterPredictionHistory(contract.outcomes[0]!.history, 'max')).toEqual(contract.outcomes[0]!.history)

    const spanning = [
      { at: '2026-09-01T00:00:00Z', probability: .2 },
      { at: '2026-09-30T07:00:00Z', probability: .25 },
      { at: '2026-10-20T06:00:00Z', probability: .35 },
      { at: '2026-10-23T07:00:00Z', probability: .4 },
      { at: '2026-10-29T07:00:00Z', probability: .45 },
      { at: '2026-10-30T06:00:00Z', probability: .5 },
    ]
    expect(filterPredictionHistory(spanning, '1d').map(point => point.at)).toEqual([
      '2026-10-29T07:00:00Z',
      '2026-10-30T06:00:00Z',
    ])
    expect(filterPredictionHistory(spanning, '1w').map(point => point.at)).toEqual([
      '2026-10-23T07:00:00Z',
      '2026-10-29T07:00:00Z',
      '2026-10-30T06:00:00Z',
    ])
    expect(filterPredictionHistory(spanning, '1m').map(point => point.at)).toEqual([
      '2026-09-30T07:00:00Z',
      '2026-10-20T06:00:00Z',
      '2026-10-23T07:00:00Z',
      '2026-10-29T07:00:00Z',
      '2026-10-30T06:00:00Z',
    ])
  })

  it('changes the selected probability and plotted points by outcome index', () => {
    const contract = multiContract()
    const spacex = predictionOutcomeView(contract, 0, 'max')
    const anthropic = predictionOutcomeView(contract, 1, 'max')
    expect(spacex?.outcome.probability).toBe(.57)
    expect(anthropic?.outcome.probability).toBe(.42)
    expect(spacex?.points).not.toBe(anthropic?.points)
    expect(spacex?.points.startsWith('56.00,')).toBe(true)
    expect(anthropic?.points.startsWith('56.00,')).toBe(true)
  })

  it('renders multi-outcome controls and an honest empty-history state', () => {
    const contract = multiContract()
    const html = renderToStaticMarkup(createElement(PredictionMarketDetail, {
      contract,
      related: [],
      demo: false,
      locale: 'en',
      onResearch: vi.fn(),
      onBack: vi.fn(),
      onSelect: vi.fn(),
    }))
    expect(html).toContain('Probability history range')
    expect(html).toContain('1H')
    expect(html).toContain('MAX')
    expect(html).toContain('SpaceX · 57%')
    expect(html).toContain('Anthropic · 42%')
    expect(html).toContain('data-outcome="SpaceX"')
    expect(html).toContain('Multi-outcome · 3 entries')
    expect(html).not.toContain('Binary · Yes / No')

    const noHistory = predictionMarketRecords([node({
      predictionMarket: { topic: 'Technology' },
      outcomes: [
        { name: 'A', probability: .6, history: [] },
        { name: 'B', probability: .4, history: [] },
      ],
    })])[0]!
    const emptyHtml = renderToStaticMarkup(createElement(PredictionMarketDetail, {
      contract: noHistory,
      related: [],
      demo: false,
      locale: 'en',
      onResearch: vi.fn(),
      onBack: vi.fn(),
      onSelect: vi.fn(),
    }))
    expect(emptyHtml).toContain('No timestamped probability history is available for the selected outcome.')
    expect(emptyHtml).not.toContain('<polyline')
  })

  it('marks the multi-outcome demo fixture as synthetic', () => {
    const contract = predictionMarketDemoContracts.find(item => item.id === 'demo:ipo-cap')
    expect(contract?.outcomes).toHaveLength(3)
    const html = renderToStaticMarkup(createElement(PredictionMarketDetail, {
      contract: contract!,
      related: [],
      demo: true,
      locale: 'en',
      onResearch: vi.fn(),
      onBack: vi.fn(),
      onSelect: vi.fn(),
    }))
    expect(html).toContain('Synthetic demo')
    expect(html).toContain('Synthetic multi-outcome fixture. No real contract or live probability is represented.')
    expect(html).toContain('Largest IPO by market cap in 2026?')
    expect(html).toContain('SpaceX · 57%')
  })

  it('returns the local Monday for Today without changing the explicit example week', () => {
    expect(earningsWeekStart(new Date('2026-11-01T12:00:00+08:00'))).toBe('2026-10-26')
    expect(earningsWeekStart(new Date(Number.NaN))).toBe('')
  })
})
