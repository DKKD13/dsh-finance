import { describe, expect, it } from 'vitest'
import { executeFinanceCommand, financeCommandLine } from '../../client/protocol.ts'
import type { CommandsRemoteLike } from '../../client/protocol.ts'

describe('finance client protocol', () => {
  it('serializes forward-compatible finance requests without validating ops locally', () => {
    expect(financeCommandLine({ op: 'market.quote', input: { symbol: 'AAPL' } }))
      .toBe('/finance {"op":"market.quote","input":{"symbol":"AAPL"}}')
    expect(financeCommandLine({ op: 'market.history', input: { symbol: 'AAPL', interval: '1d' } }))
      .toContain('/finance {"op":"market.history"')
  })

  it('uses the same response parser and preserves Host errors', async () => {
    const remote: CommandsRemoteLike = {
      async execute() {
        return { ok: true, value: { result: { kind: 'error', text: 'NOT_IMPLEMENTED: no market provider configured' } } }
      },
    }
    expect(await executeFinanceCommand(remote, 'session-1', { op: 'market.quote', input: { symbol: 'AAPL' } }))
      .toEqual({ ok: false, error: { code: 'NOT_IMPLEMENTED', message: 'no market provider configured' } })
  })

  it('reports missing sessions and commands honestly', async () => {
    const unmatched: CommandsRemoteLike = { async execute() { return { ok: true, value: undefined } } }
    expect(await executeFinanceCommand(unmatched, undefined, { op: 'graph.stats' }))
      .toEqual({ ok: false, error: { code: 'NO_SESSION', message: 'no session is available to run the finance command' } })
    expect(await executeFinanceCommand(unmatched, 'session-1', { op: 'graph.stats' }))
      .toEqual({ ok: false, error: { code: 'COMMAND_UNMATCHED', message: 'the /finance command is not registered on this host' } })
  })

  it('dispatches the exact JSON line on the supplied session', async () => {
    const seen: string[] = []
    const remote: CommandsRemoteLike = {
      async execute(sessionId, line) {
        seen.push(`${sessionId} ${line}`)
        return { ok: true, value: { result: { kind: 'success', text: '{"ok":true,"revision":4,"result":{"revision":4}}' } } }
      },
    }
    const response = await executeFinanceCommand(remote, 'session-main', { op: 'graph.stats' })
    expect(seen).toEqual(['session-main /finance {"op":"graph.stats"}'])
    expect(response).toEqual({ ok: true, revision: 4, result: { revision: 4 } })
  })
})
