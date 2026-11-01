import { describe, expect, it } from 'vitest'

import {
  FUND_ANALYSTS,
  FUND_EVENTS,
  FUND_PM,
  FUND_REVIEWER,
  FUND_STAGES,
  fundSeatPermissions,
  fundSnapshot,
  fundTime,
} from '../../client/virtual-fund.ts'

describe('virtual fund data', () => {
  it('derives snapshots as a rewind-safe pure function of time', () => {
    const late = fundSnapshot(0.93)
    const early = fundSnapshot(0.1)
    const lateAgain = fundSnapshot(0.93)

    expect(lateAgain).toEqual(late)
    expect(early).toMatchObject({
      notes: 1,
      hasPlan: false,
      checked: false,
      fills: 0,
      reviewed: false,
      memories: 0,
      wiki: 0,
    })
    expect(fundSnapshot(-1)).toEqual(fundSnapshot(0))
    expect(fundSnapshot(2)).toEqual(fundSnapshot(1))
  })

  it('keeps the source timeline and the applyState stage counts', () => {
    expect(FUND_STAGES).toEqual([
      { at: 0.02, label: '07:30', name: '数据 · 研究' },
      { at: 0.4, label: '08:45', name: 'PM 决策' },
      { at: 0.58, label: '09:30', name: '确定性执行' },
      { at: 0.82, label: '16:30', name: '复盘 · 写记忆' },
    ])
    expect(fundTime(-1)).toBe('07:30')
    expect(fundTime(0.4)).toBe('08:45')
    expect(fundTime(0.58)).toBe('09:30')
    expect(fundTime(0.82)).toBe('16:30')
    expect(fundTime(2)).toBe('17:00')
    expect(fundTime(0.17)).toBe('08:00')
    expect(fundTime(0.17)).not.toContain(':60')

    expect(FUND_EVENTS).toHaveLength(23)
    expect(FUND_EVENTS.every((event) => typeof event.dur === 'number')).toBe(true)
    expect(FUND_EVENTS.every((event) => Number.isFinite(event.dur))).toBe(true)
    expect(fundSnapshot(0.25)).toMatchObject({ notes: 6, fills: 0 })
    expect(fundSnapshot(0.42)).toMatchObject({ hasPlan: true })
    expect(fundSnapshot(0.6)).toMatchObject({ checked: true })
    expect(fundSnapshot(0.705)).toMatchObject({ fills: 2 })
    expect(fundSnapshot(1)).toMatchObject({
      reviewed: true,
      memories: 2,
      wiki: 1,
      notes: 6,
      hasPlan: true,
      checked: true,
      fills: 2,
    })
    expect(fundSnapshot(0.705).active.map((event) => event.id)).toEqual(['broker-fill'])
    expect(fundSnapshot(0.75).active).toEqual([])
  })

  it('uses stable unique IDs for every seat and event', () => {
    const seats = [...FUND_ANALYSTS, FUND_PM, FUND_REVIEWER]
    const allIds = [...seats.map((seat) => seat.id), ...FUND_EVENTS.map((event) => event.id)]

    expect(seats.map((seat) => seat.id)).toEqual([
      'nvda',
      'googl',
      'cost',
      'jpm',
      'unh',
      'aapl',
      'pm',
      'reviewer',
    ])
    expect(FUND_EVENTS.map((event) => event.id)).toEqual([
      'analyst-nvda-run',
      'analyst-googl-run',
      'analyst-cost-run',
      'analyst-jpm-run',
      'analyst-unh-run',
      'analyst-aapl-run',
      'analyst-nvda-note',
      'analyst-googl-note',
      'analyst-cost-note',
      'analyst-jpm-note',
      'analyst-unh-note',
      'analyst-aapl-note',
      'pm-plan',
      'pm-intent-nvda-sell',
      'pm-intent-jpm-buy',
      'exec-check',
      'exec-order-nvda',
      'exec-order-jpm',
      'broker-fill',
      'reviewer-review',
      'reviewer-memory-nvda',
      'reviewer-memory-unh',
      'reviewer-wiki-concentration',
    ])
    expect(new Set(allIds).size).toBe(allIds.length)
    expect(FUND_EVENTS.every((event, index) => index === 0 || event.at >= FUND_EVENTS[index - 1]!.at)).toBe(
      true,
    )
  })

  it('describes the prototype drawer permission boundaries', () => {
    const analyst = fundSeatPermissions('nvda')
    expect(analyst.write).toEqual(['research_notes:nvda', 'analyst_memory:nvda'])
    expect(analyst.blocked).toEqual(expect.arrayContaining(['orders', 'fills', 'wiki_entries']))

    const pm = fundSeatPermissions('pm')
    expect(pm.write).toEqual(['daily_plans'])
    expect(pm.blocked).toEqual(expect.arrayContaining(['analyst_memory', 'orders']))

    const reviewer = fundSeatPermissions('reviewer')
    expect(reviewer.write).toEqual(['reflections', 'analyst_memory', 'wiki_entries'])
    expect(reviewer.blocked).toEqual([])

    const exec = fundSeatPermissions('exec')
    expect(exec.write).toEqual(expect.arrayContaining(['orders', 'fills']))
    expect(exec.write).not.toContain('analyst_memory')

    expect(fundSeatPermissions('broker').write).toEqual([])
    expect(fundSeatPermissions('shelf').write).toEqual([])
    expect(fundSeatPermissions('unknown')).toEqual({ read: [], write: [], blocked: [] })
  })
})
