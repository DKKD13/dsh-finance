import { createElement } from 'react'
import { renderToString } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import type { GraphNode } from '../../src/graph.ts'
import { EarningsPanel, earningsRecords, predictionMarketRecords } from '../../client/ui/FinanceEvents.tsx'
import { PoliticiansPanel, disclosureRecords, screenerRecords } from '../../client/ui/FinanceScreening.tsx'

const node = (kind: GraphNode['kind'], metadata: GraphNode['metadata']): GraphNode => ({ id: `${kind}:test`, kind, title: 'Private record', content: '', createdAt: 1, updatedAt: 1, metadata })
describe('new Finance surfaces keep data categories explicit', () => {
  it('excludes personal predictions and generic catalysts from external event datasets', () => {
    const nodes = [node('prediction', { probability: .8, status: 'pending' }), node('catalyst', { asOf: '2026-10-30' })]
    expect(predictionMarketRecords(nodes)).toEqual([])
    expect(earningsRecords(nodes)).toEqual([])
    expect(disclosureRecords(nodes)).toEqual([])
  })
  it('keeps absent metrics missing and rejects out-of-range external probabilities', () => {
    expect(screenerRecords([node('instrument', { symbol: 'REAL' })], false)[0]).toMatchObject({ pe: null, growth: null, price: null })
    const contract = predictionMarketRecords([node('catalyst', { predictionMarket: { probability: 1.5, history: [.2, 'bad', -1, 2, .8] } })])[0]
    expect(contract?.probability).toBeNull()
    expect(contract?.history).toEqual([.2, .8])
  })
  it('labels fictional political people and never presents them in real mode', () => {
    const props = { nodes: [], locale: 'en', onOpenSymbol: vi.fn(), onResearch: vi.fn() }
    const demo = renderToString(createElement(PoliticiansPanel, { ...props, demo: true }))
    const real = renderToString(createElement(PoliticiansPanel, { ...props, demo: false }))
    const fictionalPeople = ['Alex Morgan', 'Taylor Reed', 'Jordan Blake', 'Casey Park']
    for (const person of fictionalPeople) {
      expect(demo).toContain(`${person} (fictional)`)
      expect(real).not.toContain(person)
    }
    expect(real).not.toContain('(fictional)')
    expect(real).toContain('No matching disclosures')
    expect(props.onResearch).not.toHaveBeenCalled()
  })
  it('renders imported earnings without inventing estimates or reported values', () => {
    const props = { nodes: [node('catalyst', { earnings: { symbol: 'REAL', date: '2026-10-26', session: 'AM', epsActual: 2.5 } })], demo: false, locale: 'en', onOpenSymbol: vi.fn(), onResearch: vi.fn() }
    const html = renderToString(createElement(EarningsPanel, props)).replaceAll('<!-- -->', '')
    expect(html).toContain('REAL')
    expect(html).toContain('— / 2.50')
    expect(html).not.toContain('Synthetic schedule')
  })
})
