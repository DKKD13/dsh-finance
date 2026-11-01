import { describe, expect, it } from 'vitest'
import type { GraphNode } from '../../src/graph.ts'
import { effectiveAvailableAt, isYahooHistoryNode, timestamp } from '../../src/finance/metadata.ts'

const availableAt = '2026-01-01T00:00:00.000Z'
const fetchedAt = '2026-01-03T00:00:00.000Z'
const historyProvenance = {
  endpoint: 'v8/finance/chart',
  adjustment: 'provider adjustedClose and unadjusted OHLC retained separately',
}

function node(kind: 'source' | 'raw', metadata: Record<string, unknown>): GraphNode {
  return {
    id: `${kind}:test`, kind, title: `${kind} test`, content: kind === 'raw' ? '{"bars":[]}' : 'https://finance.example/chart',
    createdAt: 1, updatedAt: 1, metadata,
  } as GraphNode
}

describe('finance calendar timestamps', () => {
  it.each([
    '2026-02-30',
    '2026-02-30T00:00:00Z',
    '2026-02-29T12:00:00+08:00',
    '2024-02-30T12:00:00-05:00',
    '1900-02-29',
    '2100-02-29',
    '2026-04-31',
    '2026-2-30',
  ])('rejects nonexistent calendar day %s', value => {
    expect(() => timestamp(value, 'availableAt')).toThrow(expect.objectContaining({ code: 'INVALID_TIMESTAMP' }))
  })

  it.each([
    ['2024-02-29', '2024-02-29T00:00:00.000Z'],
    ['2000-02-29T00:00:00Z', '2000-02-29T00:00:00.000Z'],
    ['2024-02-29T00:30:00+14:00', '2024-02-28T10:30:00.000Z'],
    ['2024-02-29T23:30:00-12:00', '2024-03-01T11:30:00.000Z'],
    ['2024-02-29T12:34:56.789+0530', '2024-02-29T07:04:56.789Z'],
    ['2024-02-29T24:00:00Z', '2024-03-01T00:00:00.000Z'],
    ['0000-02-29', '0000-02-29T00:00:00.000Z'],
    ['+010000-02-29', '+010000-02-29T00:00:00.000Z'],
  ])('preserves the instant for %s', (value, expected) => {
    expect(timestamp(value, 'availableAt')).toBe(Date.parse(expected))
  })
})

describe('effective finance availability', () => {
  it('uses fetchedAt as a floor for old and new Yahoo history source/raw nodes', () => {
    const oldSource = node('source', {
      provider: 'yahoo', availableAt, fetchedAt, asOf: availableAt, provenance: historyProvenance,
    })
    const oldRaw = node('raw', {
      provider: 'yahoo', availableAt, fetchedAt, asOf: availableAt, provenance: historyProvenance,
      data: { bars: [] },
    })
    const currentRaw = node('raw', {
      provider: 'yahoo', availableAt: fetchedAt, fetchedAt, asOf: availableAt, provenance: historyProvenance,
      data: { bars: [] },
    })

    expect(isYahooHistoryNode(oldSource)).toBe(true)
    expect(isYahooHistoryNode(oldRaw)).toBe(true)
    expect(effectiveAvailableAt(oldSource)?.value).toBe(fetchedAt)
    expect(effectiveAvailableAt(oldRaw)?.value).toBe(fetchedAt)
    expect(effectiveAvailableAt(currentRaw)?.value).toBe(fetchedAt)
  })

  it('fails closed for Yahoo history without a valid fetchedAt', () => {
    const missing = node('raw', {
      provider: 'yahoo', availableAt, asOf: availableAt, provenance: historyProvenance, data: { bars: [] },
    })
    const invalid = node('source', {
      provider: 'yahoo', availableAt, fetchedAt: 'not-a-time', asOf: availableAt, provenance: historyProvenance,
    })

    expect(isYahooHistoryNode(missing)).toBe(true)
    expect(effectiveAvailableAt(missing)).toBeUndefined()
    expect(isYahooHistoryNode(invalid)).toBe(true)
    expect(effectiveAvailableAt(invalid)).toBeUndefined()
  })

  it('does not apply history gating to Yahoo quotes or non-Yahoo bar records', () => {
    const quote = node('source', {
      provider: 'yahoo', availableAt, fetchedAt, asOf: availableAt,
      provenance: { endpoint: 'v8/finance/chart', priceBasis: 'regularMarketPrice, unadjusted' },
    })
    const other = node('raw', {
      provider: 'fixture.market', availableAt, fetchedAt, asOf: availableAt,
      provenance: historyProvenance, data: { bars: [] },
    })

    expect(isYahooHistoryNode(quote)).toBe(false)
    expect(effectiveAvailableAt(quote)?.value).toBe(availableAt)
    expect(isYahooHistoryNode(other)).toBe(false)
    expect(effectiveAvailableAt(other)?.value).toBe(availableAt)
  })

  it('resolves source/raw values independently when their fetchedAt times differ', () => {
    const later = '2026-01-04T00:00:00.000Z'
    const source = node('source', {
      provider: 'yahoo', availableAt, fetchedAt, asOf: availableAt, provenance: historyProvenance,
    })
    const raw = node('raw', {
      provider: 'yahoo', availableAt, fetchedAt: later, asOf: availableAt, provenance: historyProvenance,
      data: { bars: [] },
    })

    expect(effectiveAvailableAt(source)?.value).toBe(fetchedAt)
    expect(effectiveAvailableAt(raw)?.value).toBe(later)
  })
})
