/** Protocol-client tests: command-line shape, session resolution, result parsing. */
import { describe, expect, it } from 'vitest'
import {
  ClientProtocolError,
  commandLine,
  executeGraphCommand,
  executeFinanceCommand,
  parseExecutionResult,
  resolveGraphSession,
} from '../../client/protocol.ts'
import type { CommandsRemoteLike, SessionListLike } from '../../client/protocol.ts'

function sessions(list: [string, Record<string, number>?][]): SessionListLike {
  return {
    ids: list.map(([id]) => id),
    byId: Object.fromEntries(list.map(([id, retainedBy]) => [id, retainedBy === undefined ? { id } : { id, retainedBy }])),
  }
}

describe('client protocol', () => {
  it('serializes a request as the JSON-mode command line', () => {
    expect(commandLine({ op: 'stats' })).toBe('/research-graph {"op":"stats"}')
    expect(commandLine({ op: 'node.get', id: 'claim:a' })).toBe('/research-graph {"op":"node.get","id":"claim:a"}')
  })

  it('prefers the session retained by the main view, then the first listed', () => {
    expect(resolveGraphSession(sessions([['s-1'], ['s-2', { mainView: 1 }]]))).toBe('s-2')
    expect(resolveGraphSession(sessions([['s-1'], ['s-2']]))).toBe('s-1')
    expect(resolveGraphSession({ ids: [], byId: {} })).toBeUndefined()
  })

  it('parses a success result payload into the wire response', () => {
    const response = parseExecutionResult({
      result: { kind: 'success', text: JSON.stringify({ ok: true, revision: 7, result: { nodes: 2 } }) },
    })
    expect(response).toEqual({ ok: true, revision: 7, result: { nodes: 2 } })
  })

  it('parses a host error line into a failed wire response', () => {
    const response = parseExecutionResult({ result: { kind: 'error', text: 'MISSING_NODE: node "ghost" does not exist' } })
    expect(response).toEqual({ ok: false, error: { code: 'MISSING_NODE', message: 'node "ghost" does not exist' } })
  })

  it('preserves structured finance failure codes through the command transport', async () => {
    const failure = { ok: false, error: { code: 'MISSING_NODE', message: 'node "instrument:watchlist:AAPL" does not exist' } }
    const remote: CommandsRemoteLike = {
      async execute() { return { ok: true, value: { result: { kind: 'error', text: JSON.stringify(failure, null, 2) } } } },
    }
    expect(await executeFinanceCommand(remote, 's-1', { op: 'graph.get', id: 'instrument:watchlist:AAPL' })).toEqual(failure)
    expect(parseExecutionResult({ result: { kind: 'error', text: '{invalid JSON' } })).toEqual({ ok: false, error: { code: 'COMMAND_ERROR', message: '{invalid JSON' } })
  })

  it('rejects malformed result payloads', () => {
    expect(() => parseExecutionResult({})).toThrowError(ClientProtocolError)
    expect(() => parseExecutionResult({ result: { kind: 'success', text: 'not json' } })).toThrowError(ClientProtocolError)
    expect(() => parseExecutionResult({ result: { kind: 'success', text: '[1,2]' } })).toThrowError(ClientProtocolError)
  })

  it('maps every failure hop onto the wire failure shape', async () => {
    const failing: CommandsRemoteLike = {
      async execute() { return { ok: false, error: { code: 'rpc/unavailable', message: 'host unreachable' } } },
    }
    expect(await executeGraphCommand(failing, 's-1', { op: 'stats' }))
      .toEqual({ ok: false, error: { code: 'rpc/unavailable', message: 'host unreachable' } })

    const unmatched: CommandsRemoteLike = { async execute() { return { ok: true, value: undefined } } }
    const missed = await executeGraphCommand(unmatched, 's-1', { op: 'stats' })
    expect(missed.ok).toBe(false)
    expect(missed.ok === false && missed.error.code).toBe('COMMAND_UNMATCHED')

    const throwing: CommandsRemoteLike = { async execute() { throw new Error('socket closed') } }
    const transport = await executeGraphCommand(throwing, 's-1', { op: 'stats' })
    expect(transport.ok).toBe(false)
    expect(transport.ok === false && transport.error.code).toBe('TRANSPORT')

    const noSession = await executeGraphCommand(failing, undefined, { op: 'stats' })
    expect(noSession.ok).toBe(false)
    expect(noSession.ok === false && noSession.error.code).toBe('NO_SESSION')
  })

  it('round-trips a request through a scripted remote', async () => {
    const seen: string[] = []
    const remote: CommandsRemoteLike = {
      async execute(sessionId, line) {
        seen.push(`${sessionId} ${line}`)
        return { ok: true, value: { result: { kind: 'success', text: '{"ok":true,"revision":1,"result":{"revision":1,"nodes":[],"edges":[]}}' } } }
      },
    }
    const response = await executeGraphCommand(remote, 's-9', { op: 'graph.snapshot' })
    expect(seen).toEqual(['s-9 /research-graph {"op":"graph.snapshot"}'])
    expect(response.ok).toBe(true)
    expect(response.ok && response.revision).toBe(1)
  })
})
