import { describe, expect, it, vi } from 'vitest'

vi.mock('@deepseek-ai/dsh-client-ui-primitives', () => ({ MarkdownText: () => null }))
import { mountWorkbenchRemote } from '../../client/index.tsx'
import type { ClientShell } from '../../client/index.tsx'

describe('workbench Remote lifecycle', () => {
  it('keeps the mounted namespace active until plugin disposal', async () => {
    let disposals = 0
    const effects: unknown[] = []
    const context = {
      remote: {
        commands: { execute: async () => { throw new Error('command transport must not be used by this mount') } },
        financeWorkbench: {
          graphSnapshot: async () => ({ ok: true as const, value: { ok: true as const, revision: 1, result: { nodes: [], edges: [] } } }),
          fundState: async () => ({ ok: true as const, value: { ok: true as const, revision: 1, result: {} } }),
        },
        $mount: async () => async () => { disposals += 1 },
      },
      inject: (_dependencies: string[], callback: (context: ClientShell) => void) => { callback(context) },
      effect: (setup: () => unknown) => { effects.push(setup()) },
    } as unknown as ClientShell
    const ready = mountWorkbenchRemote(context)
    expect(ready).toBeDefined()
    const mounted = await ready!
    expect(disposals).toBe(0)
    const result = await mounted!.context.remote.financeWorkbench!.graphSnapshot()
    expect(result.ok).toBe(true)
    expect(disposals).toBe(0)
    for (const effect of effects) if (typeof effect === 'function') await effect()
    expect(disposals).toBeGreaterThan(0)
  })
})
