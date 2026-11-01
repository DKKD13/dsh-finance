import type { RemoteResultLike } from './protocol.ts'

export type SessionRunStatus = 'accepted' | 'running' | 'completed' | 'failed' | 'timeout'

export interface SessionRunError {
  readonly code: string
  readonly message: string
}

export interface SessionRunState {
  readonly status: SessionRunStatus
  readonly runId: string
  readonly sessionId: string | null
  readonly artifactIds: readonly string[]
  readonly error: SessionRunError | null
}

export interface SessionSnapshotLike {
  readonly running: boolean
  readonly removed: boolean
  readonly openState: 'cold' | 'loading' | 'open' | 'error'
  readonly openError: SessionRunError | null
  readonly promptError: { readonly error: SessionRunError } | null
  readonly lastAgentError: string | null
}

export interface SessionLike {
  getSnapshot(): SessionSnapshotLike
  prompt(
    content: readonly { readonly type: 'text'; readonly text: string }[],
    mode: 'queue',
  ): Promise<RemoteResultLike<{ readonly accepted: true }>>
}

export interface SessionReferenceLike {
  readonly ready: Promise<unknown>
  readonly binding: { readonly session: SessionLike }
}

export interface SessionControllerLike {
  using<T>(
    sessionId: string,
    options: { readonly source: 'controllerOperation' },
    operation: (reference: SessionReferenceLike) => T | Promise<T>,
  ): Promise<T>
}

export interface SessionPromptInput {
  readonly sessions: SessionControllerLike
  readonly sessionId: string | undefined
  readonly runId: string
  readonly text: string
  readonly observeArtifacts: (runId: string) => Promise<readonly string[]>
  readonly timeoutMs?: number
  readonly pollIntervalMs?: number
  readonly onTransition?: (state: SessionRunState) => void
}

const TIMEOUT = Symbol('timeout')

function delay(ms: number): Promise<typeof TIMEOUT> {
  return new Promise(resolve => { setTimeout(() => { resolve(TIMEOUT) }, ms) })
}

async function raceTimeout<T>(promise: Promise<T>, ms: number): Promise<T | typeof TIMEOUT> {
  let timer: ReturnType<typeof setTimeout> | undefined
  const timeout = new Promise<typeof TIMEOUT>(resolve => {
    timer = setTimeout(() => { resolve(TIMEOUT) }, ms)
  })
  try {
    return await Promise.race([promise, timeout])
  } finally {
    if (timer !== undefined) clearTimeout(timer)
  }
}

function state(
  status: SessionRunStatus,
  runId: string,
  sessionId: string | null,
  artifactIds: readonly string[] = [],
  error: SessionRunError | null = null,
): SessionRunState {
  return { status, runId, sessionId, artifactIds, error }
}

function failure(runId: string, sessionId: string | null, code: string, message: string): SessionRunState {
  return state('failed', runId, sessionId, [], { code, message })
}

function unknownTimeout(runId: string, sessionId: string, detail?: string): SessionRunState {
  return state('timeout', runId, sessionId, [], {
    code: 'TIMEOUT_RESULT_UNKNOWN',
    message: `the prompt outcome is unknown; the Session may still finish and no completion was verified${detail === undefined ? '' : ` (${detail})`}`,
  })
}

function sessionFailure(runId: string, sessionId: string, snapshot: SessionSnapshotLike): SessionRunState | undefined {
  if (snapshot.removed) return failure(runId, sessionId, 'SESSION_REMOVED', 'the Session was removed before completion was verified')
  if (snapshot.openState === 'error') {
    return failure(runId, sessionId, snapshot.openError?.code ?? 'SESSION_OPEN_ERROR', snapshot.openError?.message ?? 'the Session could not be opened')
  }
  if (snapshot.promptError !== null) {
    return failure(runId, sessionId, snapshot.promptError.error.code, snapshot.promptError.error.message)
  }
  if (snapshot.lastAgentError !== null) return failure(runId, sessionId, 'SESSION_AGENT_ERROR', snapshot.lastAgentError)
  return undefined
}

async function supervise(
  session: SessionLike,
  input: SessionPromptInput,
  timeoutMs: number,
  pollIntervalMs: number,
): Promise<SessionRunState> {
  const { runId, sessionId, text, observeArtifacts, onTransition } = input
  const id = sessionId as string
  const deadline = Date.now() + timeoutMs
  const prompt = session.prompt([{ type: 'text', text }], 'queue')
  const admission = await raceTimeout(prompt, Math.max(0, deadline - Date.now()))
  if (admission === TIMEOUT) return unknownTimeout(runId, id, 'prompt admission did not settle')
  if (!admission.ok) return failure(runId, id, admission.error.code, admission.error.message)

  onTransition?.(state('accepted', runId, id))
  onTransition?.(state('running', runId, id))

  let observationError: string | undefined
  while (Date.now() < deadline) {
    const snapshot = session.getSnapshot()
    const failed = sessionFailure(runId, id, snapshot)
    if (failed !== undefined) return failed

    if (!snapshot.running) {
      const observed = await raceTimeout(
        observeArtifacts(runId).then(ids => ({ ids }), error => ({ error })),
        Math.max(0, deadline - Date.now()),
      )
      if (observed === TIMEOUT) return unknownTimeout(runId, id, 'graph verification did not settle')
      if ('error' in observed) {
        observationError = observed.error instanceof Error ? observed.error.message : String(observed.error)
      } else {
        observationError = undefined
        const settled = session.getSnapshot()
        const settledFailure = sessionFailure(runId, id, settled)
        if (settledFailure !== undefined) return settledFailure
        if (!settled.running && observed.ids.length > 0) {
          return state('completed', runId, id, observed.ids)
        }
      }
    }

    const remaining = deadline - Date.now()
    if (remaining <= 0) break
    await delay(Math.min(pollIntervalMs, remaining))
  }
  return unknownTimeout(runId, id, observationError)
}

/** Queue a prompt on the real DSH Session and verify both idle and expected graph artifacts. */
export async function runSessionPrompt(input: SessionPromptInput): Promise<SessionRunState> {
  const { sessions, sessionId, runId, onTransition } = input
  const timeoutMs = input.timeoutMs ?? 10 * 60 * 1000
  const pollIntervalMs = input.pollIntervalMs ?? 1000
  if (sessionId === undefined) return failure(runId, null, 'NO_SESSION', 'no Session is available for this prompt')
  try {
    const result = await sessions.using(sessionId, { source: 'controllerOperation' }, async reference => {
      await reference.ready
      const session = reference.binding.session
      const initial = session.getSnapshot()
      if (initial.openState !== 'open') {
        return failure(runId, sessionId, initial.openError?.code ?? 'SESSION_NOT_OPEN', initial.openError?.message ?? `Session is ${initial.openState}, not open`)
      }
      const result = await supervise(session, input, timeoutMs, pollIntervalMs)
      onTransition?.(result)
      return result
    })
    return result
  } catch (error: unknown) {
    const result = failure(runId, sessionId, 'SESSION_TRANSPORT', error instanceof Error ? error.message : String(error))
    onTransition?.(result)
    return result
  }
}
