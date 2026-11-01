import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import type { GraphNode } from '../../src/graph.ts'
import {
  PredictionMarketDetail,
  contractHistoryPoints,
  predictionMarketRecords,
} from '../../client/ui/FinanceEvents.tsx'

const contractNode = (predictionMarket: GraphNode['metadata']['predictionMarket']): GraphNode => ({
  id: 'catalyst:binary-contract',
  kind: 'catalyst',
  title: 'Will the example threshold be crossed?',
  content: '',
  createdAt: 1,
  updatedAt: 1,
  metadata: { predictionMarket },
})

describe('prediction market internal detail', () => {
  it('renders a complete binary detail without borrowing unsupported multi-outcome values', () => {
    const contract = predictionMarketRecords([contractNode({
      topic: 'Technology',
      probability: .62,
      resolutionDate: '2026-12-31',
      volume: 240000,
      history: [.35, .42, .62],
      criteria: 'Resolve from the named public source.',
      sourceUrl: 'https://example.test/contract',
      provider: 'Example Market',
      asOf: '2026-11-01',
      outcomes: ['$1.75-$2.0T', 'OpenAI', 'SpaceX'],
    })])[0]
    expect(contract).toBeDefined()

    const html = renderToStaticMarkup(createElement(PredictionMarketDetail, {
      contract: contract!,
      related: [],
      demo: false,
      locale: 'en',
      onResearch: vi.fn(),
      onBack: vi.fn(),
      onSelect: vi.fn(),
    }))

    expect(html).toContain('Back to markets')
    expect(html).toContain('rg-event-detail')
    expect(html).toContain('rg-contract-history')
    expect(html).toContain('<polyline')
    expect(html).toContain('Yes · 62%')
    expect(html).toContain('No · 38%')
    expect(html).toContain('Binary · Yes / No')
    expect(html).toContain('Example Market')
    expect(html).toContain('https://example.test/contract')
    expect(html).toContain('More markets')
    expect(html).not.toContain('$1.75-$2.0T')
    expect(html).not.toContain('>OpenAI<')
    expect(html).not.toContain('>SpaceX<')
  })

  it('inverts only the validated history for No and leaves invalid probabilities missing', () => {
    expect(contractHistoryPoints([0], 'yes')).toBe('56.00,196.00')
    expect(contractHistoryPoints([0], 'no')).toBe('56.00,40.00')
    expect(contractHistoryPoints([1], 'yes')).toBe('56.00,40.00')
    expect(contractHistoryPoints([1], 'no')).toBe('56.00,196.00')

    const invalid = predictionMarketRecords([contractNode({
      probability: 1.2,
      history: [-.1, .2, .8, 1.1],
      sourceUrl: '',
    })])[0]
    expect(invalid).toMatchObject({ probability: null, history: [.2, .8], source: '', sourceName: '' })
  })
})
