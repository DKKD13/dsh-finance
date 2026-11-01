import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { runSessionPrompt } from '../../client/session.ts'
import type { SessionControllerLike, SessionLike, SessionRunState, SessionSnapshotLike } from '../../client/session.ts'

function snapshot(patch: Partial<SessionSnapshotLike> = {}): SessionSnapshotLike {
  return {
    running: false,
    removed: false,
    openState: 'open',
    openError: null,
    promptError: null,
    lastAgentError: null,
    ...patch,
  }
}

function rig(initial = snapshot()) {
  let current = initial
  const session: SessionLike = {
    getSnapshot: () => current,
    prompt: vi.fn(async () => ({ ok: true as const, value: { accepted: true as const } })),
  }
  const using = vi.fn()
  const sessions: SessionControllerLike = {
    using: async (id, options, operation) => {
      using(id, options, operation)
      return operation({ ready: Promise.resolve(), binding: { session } })
    },
  }
  return {
    session,
    sessions,
    using,
    set: (patch: Partial<SessionSnapshotLike>) => { current = { ...current, ...patch } },
  }
}

function transitions(): { states: SessionRunState[]; onTransition: (state: SessionRunState) => void } {
  const states: SessionRunState[] = []
  return { states, onTransition: state => { states.push(state) } }
}

describe('real Session prompt supervision', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(0)
  })
  afterEach(() => {
    vi.clearAllTimers()
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('uses controllerOperation, skips graph reads while busy, and waits for matching artifacts after idle', async () => {
    const h = rig(snapshot({ running: true }))
    const events = transitions()
    let artifacts: readonly string[] = []
    const observe = vi.fn(async () => artifacts)
    const pending = runSessionPrompt({
      sessions: h.sessions,
      sessionId: 's-main',
      runId: 'compile:r-1',
      text: '/knowledge-compiler\nrunId=compile:r-1 sourceIds=source:a',
      pollIntervalMs: 10,
      timeoutMs: 1000,
      onTransition: events.onTransition,
      observeArtifacts: observe,
    })
    await vi.advanceTimersByTimeAsync(20)
    const busyReads = observe.mock.calls.length
    expect(events.states.map(state => state.status)).toEqual(['accepted', 'running'])

    // Session activity and graph persistence change independently of observation.
    h.set({ running: false })
    await vi.advanceTimersByTimeAsync(10)
    expect(observe).toHaveBeenCalledWith('compile:r-1')
    expect(events.states.some(state => state.status === 'completed')).toBe(false)
    artifacts = ['claim:r-1']
    await vi.advanceTimersByTimeAsync(10)
    const result = await pending

    expect(busyReads).toBe(0)
    expect(h.using).toHaveBeenCalledWith('s-main', { source: 'controllerOperation' }, expect.any(Function))
    expect(h.session.prompt).toHaveBeenCalledWith([{ type: 'text', text: '/knowledge-compiler\nrunId=compile:r-1 sourceIds=source:a' }], 'queue')
    expect(result.status).toBe('completed')
    expect(result.artifactIds).toEqual(['claim:r-1'])
    expect(events.states.map(state => state.status)).toEqual(['accepted', 'running', 'completed'])
  })

  it('does not treat acceptance or idle without the expected run artifact as completion', async () => {
    const h = rig()
    const events = transitions()
    const observe = vi.fn(async () => [])
    const pending = runSessionPrompt({
      sessions: h.sessions,
      sessionId: 's-main',
      runId: 'compile:missing',
      text: '/knowledge-compiler',
      observeArtifacts: observe,
      pollIntervalMs: 10,
      timeoutMs: 1000,
      onTransition: events.onTransition,
    })
    await vi.advanceTimersByTimeAsync(1000)
    const result = await pending
    expect(observe).toHaveBeenCalled()
    expect(result.status).toBe('timeout')
    expect(result.error?.code).toBe('TIMEOUT_RESULT_UNKNOWN')
    expect(events.states.map(state => state.status)).toEqual(['accepted', 'running', 'timeout'])
    expect(events.states.some(state => state.status === 'completed')).toBe(false)
  })

  it('does not read or complete from an artifact while the Session remains running through the deadline', async () => {
    const h = rig(snapshot({ running: true }))
    const observe = vi.fn(async () => ['deliverable:busy'])
    const pending = runSessionPrompt({
      sessions: h.sessions,
      sessionId: 's-main',
      runId: 'research:busy',
      text: '/research',
      observeArtifacts: observe,
      pollIntervalMs: 10,
      timeoutMs: 1000,
    })
    await vi.advanceTimersByTimeAsync(1000)
    const result = await pending
    expect(result.status).toBe('timeout')
    expect(result.error?.code).toBe('TIMEOUT_RESULT_UNKNOWN')
    expect(observe).not.toHaveBeenCalled()
  })

  it('rechecks Session idle after the graph read instead of using a stale snapshot', async () => {
    const h = rig()
    let finishRead!: (ids: readonly string[]) => void
    const read = new Promise<readonly string[]>(resolve => { finishRead = resolve })
    const observe = vi.fn(() => read)
    const pending = runSessionPrompt({
      sessions: h.sessions,
      sessionId: 's-main',
      runId: 'research:race',
      text: '/research',
      observeArtifacts: observe,
      pollIntervalMs: 10,
      timeoutMs: 1000,
    })
    await vi.advanceTimersByTimeAsync(0)
    expect(observe).toHaveBeenCalledTimes(1)
    h.set({ running: true })
    finishRead(['deliverable:race'])
    await vi.advanceTimersByTimeAsync(1000)
    const result = await pending
    expect(result.status).toBe('timeout')
    expect(result.error?.code).toBe('TIMEOUT_RESULT_UNKNOWN')
  })

  it('retries an idle graph rejection and completes only when a later read verifies the artifact', async () => {
    const h = rig()
    const events = transitions()
    const observe = vi.fn<(runId: string) => Promise<readonly string[]>>()
      .mockRejectedValueOnce(new Error('graph temporarily unavailable'))
      .mockResolvedValue(['deliverable:recovered'])
    const pending = runSessionPrompt({
      sessions: h.sessions,
      sessionId: 's-main',
      runId: 'research:recovered',
      text: '/research',
      observeArtifacts: observe,
      pollIntervalMs: 10,
      timeoutMs: 1000,
      onTransition: events.onTransition,
    })
    await vi.advanceTimersByTimeAsync(0)
    expect(events.states.map(state => state.status)).toEqual(['accepted', 'running'])
    await vi.advanceTimersByTimeAsync(10)
    const result = await pending
    expect(observe).toHaveBeenCalledTimes(2)
    expect(result).toMatchObject({ status: 'completed', artifactIds: ['deliverable:recovered'], error: null })
  })

  it.each([
    { name: 'removed', patch: { removed: true }, code: 'SESSION_REMOVED' },
    { name: 'prompt error', patch: { promptError: { error: { code: 'session/cancelled', message: 'prompt cancelled' } } }, code: 'session/cancelled' },
  ])('surfaces a $name while busy without reading the graph', async ({ patch, code }) => {
    const h = rig(snapshot({ running: true }))
    const observe = vi.fn(async () => [])
    const pending = runSessionPrompt({
      sessions: h.sessions,
      sessionId: 's-main',
      runId: 'research:interrupted',
      text: '/research',
      observeArtifacts: observe,
      pollIntervalMs: 10,
      timeoutMs: 1000,
    })
    await vi.advanceTimersByTimeAsync(20)
    h.set(patch)
    await vi.advanceTimersByTimeAsync(10)
    const result = await pending
    expect(result).toMatchObject({ status: 'failed', error: { code }, artifactIds: [] })
    expect(observe).not.toHaveBeenCalled()
  })

  it('returns a prompt rejection as failed rather than unknown or completed', async () => {
    const h = rig()
    h.session.prompt = vi.fn(async () => ({ ok: false as const, error: { code: 'session/busy', message: 'admission rejected' } }))
    const observe = vi.fn(async () => [])
    const result = await runSessionPrompt({
      sessions: h.sessions,
      sessionId: 's-main',
      runId: 'research:rejected',
      text: '/research',
      observeArtifacts: observe,
    })
    expect(result).toMatchObject({ status: 'failed', error: { code: 'session/busy', message: 'admission rejected' } })
    expect(observe).not.toHaveBeenCalled()
  })

  it('surfaces Session agent failures and open failures', async () => {
    const h = rig(snapshot({ lastAgentError: 'model failed' }))
    const agent = await runSessionPrompt({
      sessions: h.sessions,
      sessionId: 's-main',
      runId: 'research:error',
      text: '/research',
      observeArtifacts: async () => [],
    })
    expect(agent).toMatchObject({ status: 'failed', error: { code: 'SESSION_AGENT_ERROR', message: 'model failed' } })

    const closed = rig(snapshot({ openState: 'error', openError: { code: 'session/open', message: 'cannot open' } }))
    const opened = await runSessionPrompt({
      sessions: closed.sessions,
      sessionId: 's-main',
      runId: 'research:closed',
      text: '/research',
      observeArtifacts: async () => [],
    })
    expect(opened).toMatchObject({ status: 'failed', error: { code: 'session/open' } })
    expect(closed.session.prompt).not.toHaveBeenCalled()
  })

  it('reports an unsettled admission or graph verification as timeout with unknown outcome', async () => {
    const h = rig()
    h.session.prompt = vi.fn(() => new Promise<{ readonly ok: true; readonly value: { readonly accepted: true } }>(() => {}))
    const observe = vi.fn(async () => [])
    const admissionPending = runSessionPrompt({
      sessions: h.sessions,
      sessionId: 's-main',
      runId: 'research:pending',
      text: '/research',
      observeArtifacts: observe,
      timeoutMs: 1000,
    })
    await vi.advanceTimersByTimeAsync(1000)
    const admission = await admissionPending
    expect(admission).toMatchObject({ status: 'timeout', error: { code: 'TIMEOUT_RESULT_UNKNOWN' } })
    expect(observe).not.toHaveBeenCalled()

    const verifying = rig()
    const graphRead = vi.fn(() => new Promise<readonly string[]>(() => {}))
    const graphPending = runSessionPrompt({
      sessions: verifying.sessions,
      sessionId: 's-main',
      runId: 'research:verification',
      text: '/research',
      observeArtifacts: graphRead,
      timeoutMs: 1000,
    })
    await vi.advanceTimersByTimeAsync(1000)
    const graph = await graphPending
    expect(graphRead).toHaveBeenCalledTimes(1)
    expect(graph).toMatchObject({ status: 'timeout', error: { code: 'TIMEOUT_RESULT_UNKNOWN' } })
  })

  it('fails locally when no Session can be resolved', async () => {
    const h = rig()
    const result = await runSessionPrompt({
      sessions: h.sessions,
      sessionId: undefined,
      runId: 'compile:none',
      text: '/knowledge-compiler',
      observeArtifacts: async () => [],
    })
    expect(result).toMatchObject({ status: 'failed', sessionId: null, error: { code: 'NO_SESSION' } })
    expect(h.using).not.toHaveBeenCalled()
  })
})
