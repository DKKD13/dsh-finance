/**
 * Bundle smoke test: rebuilds dist/client.js with the real build script, then
 * loads it against a fake module-table sink and asserts the registration id,
 * the shared-React externals, and the plugin face the shell composes.
 */
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { z } from 'zod'

const ROOT = join(__dirname, '..', '..')

interface RegisteredModule {
  id: string
  factory: (require: (spec: string) => unknown) => Record<string, unknown>
}

describe('client bundle', () => {
  it('registers as deepseek-harness-finance-plugin with platform externals only', () => {
    execFileSync('node', [join(ROOT, 'scripts', 'build-client.mjs')], { cwd: ROOT, stdio: 'pipe' })
    const code = readFileSync(join(ROOT, 'dist', 'client.js'), 'utf8')
    expect(code.startsWith('window.__ModuleLoader__.load({ id: "deepseek-harness-finance-plugin"')).toBe(true)
    expect(code).toContain('require("react")')
    expect(code).toContain('require("react/jsx-runtime")')
    expect(code).toContain('require("@deepseek-ai/dsh-client-ui-primitives")')
    expect(code).not.toContain('ReactCurrentOwner')
    expect(code).not.toContain('react.production')
  })

  it('the factory evaluates to a plugin with inject and apply', () => {
    const registered: RegisteredModule[] = []
    const sink = { load: (entry: RegisteredModule) => { registered.push(entry) } }
    const globals = globalThis as Record<string, unknown>
    globals['window'] = { __ModuleLoader__: sink }
    try {
      // Evaluate the artifact exactly as the shell does: a plain script.
      new Function(readFileSync(join(ROOT, 'dist', 'client.js'), 'utf8'))()
    } finally {
      delete globals['window']
    }
    expect(registered).toHaveLength(1)
    const entry = registered[0]
    expect(entry?.id).toBe('deepseek-harness-finance-plugin')
    const reactStub = new Proxy({}, { get: () => () => null })
    const plugin = entry?.factory((spec: string) => {
      if (spec === 'react' || spec === 'react/jsx-runtime') return reactStub
      if (spec === '@deepseek-ai/dsh-client-ui-primitives') return { MarkdownText: () => null }
      if (spec === '@deepseek-ai/cordis') return { Service: class { constructor(readonly ctx: unknown, readonly name: string) {} } }
      if (spec === 'zod') return z
      throw new Error(`unexpected require: ${spec}`)
    })
    expect(typeof plugin?.['apply']).toBe('function')
    expect(plugin?.['inject']).toEqual(['slots', 'layout', 'locale', 'remote', 'remote.commands', 'sessions', 'conversation', 'uiWorkspace', 'workspaces'])
  })
})
