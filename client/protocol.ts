/**
 * Browser-side protocol client for the research-graph workbench. Builds the
 * `/research-graph <json>` command line, resolves the session the command runs
 * on, and parses the command result text back into the shared
 * {@link GraphResponse} union — the same wire shape the host's tools and
 * slash command speak (`src/protocol.ts`). Nothing here mocks graph data:
 * every answer comes from an executed command.
 * @module dsh-research-graph/client/protocol
 */

import type { GraphRequest, GraphResponse } from '../src/protocol.ts'
import type { JsonValue } from '../src/graph.ts'

/** Slash command the workbench dispatches through. */
export const COMMAND_NAME = 'research-graph'
export const FINANCE_COMMAND_NAME = 'finance'

/** Forward-compatible finance request; the Host remains the op validator. */
export interface FinanceCommandRequest {
  readonly op: string
  readonly input?: JsonValue | undefined
  readonly [extra: string]: unknown
}

/** Minimal structural face of `ctx.remote.commands` used by the workbench. */
export interface CommandsRemoteLike {
  execute(
    sessionId: string,
    line: string,
    attachments: readonly unknown[],
  ): Promise<RemoteResultLike<CommandExecutionLike | undefined>>
}

/** Subset of the wire `RemoteResult` union. */
export type RemoteResultLike<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: { readonly code: string; readonly message: string } }

/** One settled command execution as the remote returns it. */
export interface CommandExecutionLike {
  readonly result?: { readonly kind: string; readonly text?: string }
}

/** Session-list row fields the session resolution reads. */
export interface SessionSummaryLike {
  readonly id: string
  /** Local retention counts by source; `mainView` marks the session shown in the main column. */
  readonly retainedBy?: Readonly<Partial<Record<string, number>>>
}

/** Session-list snapshot fields the session resolution reads. */
export interface SessionListLike {
  readonly ids: readonly string[]
  readonly byId: Readonly<Record<string, SessionSummaryLike | undefined>>
}

/** Client-side failure codes for the hops around the graph wire protocol. */
export type ClientProtocolErrorCode = 'NO_SESSION' | 'TRANSPORT' | 'COMMAND_UNMATCHED' | 'COMMAND_ERROR' | 'BAD_PAYLOAD'

/** Structured failure raised by {@link executeGraphCommand}; never a raw throw. */
export class ClientProtocolError extends Error {
  override readonly name = 'ClientProtocolError'

  constructor(readonly code: ClientProtocolErrorCode, message: string) {
    super(message)
    this.name = 'ClientProtocolError'
  }
}

/** Serialize one wire request as the slash-command line. */
export function commandLine(request: GraphRequest): string {
  return `/${COMMAND_NAME} ${JSON.stringify(request)}`
}

export function financeCommandLine(request: FinanceCommandRequest): string {
  return `/${FINANCE_COMMAND_NAME} ${JSON.stringify(request)}`
}

/**
 * Pick the session the workbench's commands run on. The graph itself is
 * Host-global, but command execution is addressed to an agent, so the
 * session displayed in the main conversation (retained by `mainView`) is the
 * natural addressee; the first listed session is the fallback, and
 * `undefined` reports that no session exists yet.
 * @param list - the session-list snapshot.
 * @returns the session id to address, or undefined when the list is empty.
 */
export function resolveGraphSession(list: SessionListLike): string | undefined {
  for (const id of list.ids) {
    const row = list.byId[id]
    if (row !== undefined && (row.retainedBy?.mainView ?? 0) > 0) return id
  }
  return list.ids[0]
}

/**
 * Parse the command result text into a wire response. The host renders the
 * JSON-mode response as pretty-printed JSON on success and as
 * `CODE: message` on failure, so both shapes are accepted here.
 * @param execution - the settled command execution.
 * @returns the wire response.
 */
export function parseExecutionResult(execution: CommandExecutionLike): GraphResponse {
  const result = execution.result
  if (result === undefined) throw new ClientProtocolError('BAD_PAYLOAD', 'command execution carried no result')
  if (result.kind === 'error') {
    const text = result.text ?? 'command failed'
    // /finance JSON mode returns a structured failure even when the command
    // result itself is an error. Keep its code for recovery such as a first Follow.
    try {
      const parsed: unknown = JSON.parse(text)
      if (typeof parsed === 'object' && parsed !== null && 'ok' in parsed && parsed.ok === false
        && 'error' in parsed && typeof parsed.error === 'object' && parsed.error !== null
        && 'code' in parsed.error && typeof parsed.error.code === 'string'
        && 'message' in parsed.error && typeof parsed.error.message === 'string') {
        return { ok: false, error: { code: parsed.error.code, message: parsed.error.message } }
      }
    } catch {
      // Research-graph and human commands retain their CODE: message format.
    }
    const separator = text.indexOf(': ')
    const code = separator > 0 ? text.slice(0, separator) : 'COMMAND_ERROR'
    return { ok: false, error: { code, message: separator > 0 ? text.slice(separator + 2) : text } }
  }
  if (result.kind !== 'success' || typeof result.text !== 'string' || result.text.length === 0) {
    throw new ClientProtocolError('BAD_PAYLOAD', `unexpected command result kind ${JSON.stringify(result.kind)}`)
  }
  let parsed: unknown
  try {
    parsed = JSON.parse(result.text)
  } catch {
    throw new ClientProtocolError('BAD_PAYLOAD', 'command result text is not JSON')
  }
  if (typeof parsed !== 'object' || parsed === null || typeof (parsed as { ok?: unknown }).ok !== 'boolean') {
    throw new ClientProtocolError('BAD_PAYLOAD', 'command result JSON is not a graph response')
  }
  return parsed as GraphResponse
}

/**
 * Execute one wire request against the host through the session's command
 * channel and return the parsed response. Every hop failure settles as a
 * structured `{ ok: false }` response with a client-side code, so callers
 * handle one union.
 * @param remote - `ctx.remote.commands` (structurally).
 * @param sessionId - session the command runs on; undefined fails with `NO_SESSION`.
 * @param request - the wire request.
 * @returns the wire response, or a client-side failure with the same shape.
 */
async function executeCommand(
  remote: CommandsRemoteLike,
  sessionId: string | undefined,
  command: string,
  line: string,
): Promise<GraphResponse> {
  if (sessionId === undefined) {
    return { ok: false, error: { code: 'NO_SESSION', message: `no session is available to run the ${command} command` } }
  }
  let settled: RemoteResultLike<CommandExecutionLike | undefined>
  try {
    settled = await remote.execute(sessionId, line, [])
  } catch (error: unknown) {
    return { ok: false, error: { code: 'TRANSPORT', message: error instanceof Error ? error.message : String(error) } }
  }
  if (!settled.ok) return { ok: false, error: { code: settled.error.code, message: settled.error.message } }
  if (settled.value === undefined) {
    return { ok: false, error: { code: 'COMMAND_UNMATCHED', message: `the /${command} command is not registered on this host` } }
  }
  try {
    return parseExecutionResult(settled.value)
  } catch (error: unknown) {
    if (error instanceof ClientProtocolError) return { ok: false, error: { code: error.code, message: error.message } }
    return { ok: false, error: { code: 'BAD_PAYLOAD', message: String(error) } }
  }
}

export async function executeGraphCommand(
  remote: CommandsRemoteLike,
  sessionId: string | undefined,
  request: GraphRequest,
): Promise<GraphResponse> {
  return executeCommand(remote, sessionId, COMMAND_NAME, commandLine(request))
}

export async function executeFinanceCommand(
  remote: CommandsRemoteLike,
  sessionId: string | undefined,
  request: FinanceCommandRequest,
): Promise<GraphResponse> {
  return executeCommand(remote, sessionId, FINANCE_COMMAND_NAME, financeCommandLine(request))
}
