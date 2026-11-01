import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import vm from 'node:vm'
import { describe, expect, it } from 'vitest'

const ROOT = join(__dirname, '..', '..')

function payloadApi() {
  const context = { URL, Set, globalThis: {} as Record<string, unknown> }
  context.globalThis = context as unknown as Record<string, unknown>
  vm.runInNewContext(readFileSync(join(ROOT, 'clipper-extension', 'payload.js'), 'utf8'), context)
  return (context as unknown as { DSHClipperPayload: {
    buildClip(captured: Record<string, unknown>, settings: Record<string, string>, hash?: string): Record<string, unknown>
    importRequest(clip: Record<string, unknown>, asOf: string): Record<string, unknown>
    importUrl(endpoint: string): string
  } }).DSHClipperPayload
}

describe('clean-room MV3 clipper', () => {
  it('builds a loopback-only extension with exactly the admitted permissions', () => {
    execFileSync('node', [join(ROOT, 'scripts', 'build-clipper.mjs')], { cwd: ROOT, stdio: 'pipe' })
    const manifest = JSON.parse(readFileSync(join(ROOT, 'dist', 'clipper', 'manifest.json'), 'utf8'))
    expect(manifest.manifest_version).toBe(3)
    expect(manifest.permissions.sort()).toEqual(['activeTab', 'contextMenus', 'scripting', 'storage'])
    expect(manifest.host_permissions).toEqual(['http://127.0.0.1/*', 'http://localhost/*', 'http://[::1]/*'])
    const background = readFileSync(join(ROOT, 'dist', 'clipper', 'background.js'), 'utf8')
    expect(background).not.toContain('chrome.tabs.create')
    expect(background).not.toContain('chrome.storage.sync')
    expect(background).toContain('.slice(0, 10)')
    expect(readFileSync(join(ROOT, 'dist', 'clipper', 'payload.js'), 'utf8')).toContain('/clipper/v1/import')
  })

  it('emits dsh.clipper/v1 TextQuote and notes without fabricating availableAt', () => {
    const api = payloadApi()
    const clip = api.buildClip({
      kind: 'selection', url: 'https://example.com', title: 'Example', capturedAt: '2026-01-01T00:00:00Z', text: 'alpha beta gamma',
      textQuote: { exact: 'beta', prefix: 'alpha ', suffix: ' gamma' }, locator: { container: 'p', startOffset: 6, endOffset: 10 },
    }, { topic: 'Finance', tags: 'claim, daily, claim', note: 'Keep this' }, 'sha256:annotations')
    expect(clip).toMatchObject({
      schema: 'dsh.clipper/v1', kind: 'selection', capturedAt: '2026-01-01T00:00:00Z', content: { text: 'alpha beta gamma' },
      annotations: [{ exact: 'beta', prefix: 'alpha ', suffix: ' gamma', note: 'Keep this', tags: ['claim', 'daily'], locator: { container: 'p', startOffset: 6, endOffset: 10 } }],
      annotationHash: 'sha256:annotations', topic: 'Finance',
    })
    expect(clip).not.toHaveProperty('availableAt')
    expect(api.importRequest(clip, '2026-01-02T00:00:00Z')).toEqual({ bundle: clip, dryRun: false, asOf: '2026-01-02T00:00:00Z' })
    expect(api.importUrl('http://127.0.0.1:47643')).toBe('http://127.0.0.1:47643/clipper/v1/import')
    expect(() => api.importUrl('https://example.com')).toThrow('loopback')
    expect(() => api.importUrl('http://user:pass@localhost:47643')).toThrow('credentials')
  })
})
