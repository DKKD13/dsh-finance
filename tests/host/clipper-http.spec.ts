import { readFile, stat } from 'node:fs/promises'
import { request as httpRequest } from 'node:http'
import { connect } from 'node:net'
import { join } from 'node:path'
import { Context } from '@deepseek-ai/cordis'
import { afterEach, describe, expect, it } from 'vitest'
import { ClipperHttpServer, resolveClipperHttpConfig } from '../../src/finance/clipper-http.ts'
import type { ClipperHttpConfig } from '../../src/finance/clipper-http.ts'
import { FinanceService } from '../../src/finance/service.ts'
import { ResearchGraphService, resolveConfig } from '../../src/service.ts'
import { makeTempDir } from './fixtures.ts'

const cleanups: (() => Promise<void>)[] = []
afterEach(async () => {
  while (cleanups.length > 0) await cleanups.pop()?.()
})

const asOf = '2026-02-01T00:00:00.000Z'
const bundle = {
  schema: 'dsh.clipper/v1',
  clips: [{ type: 'page', title: 'HTTP clip', url: 'https://example.com/http', availableAt: asOf, content: { text: 'loopback body' } }],
}

interface LocalResponse {
  status: number
  headers: Record<string, string | string[] | undefined>
  text: string
  json: { ok: boolean; result?: { revision: number; clipIds?: string[]; documentIds?: string[] }; error?: { code: string; message: string } }
}

function localRequest(url: string, options: { method?: string; headers?: Record<string, string>; body?: string } = {}): Promise<LocalResponse> {
  return new Promise((resolve, reject) => {
    const request = httpRequest(url, { method: options.method ?? 'GET', headers: options.headers }, response => {
      const chunks: Buffer[] = []
      response.on('data', chunk => chunks.push(Buffer.from(chunk)))
      response.on('end', () => {
        const text = Buffer.concat(chunks).toString('utf8')
        resolve({ status: response.statusCode ?? 0, headers: response.headers, text, json: (text.length > 0 ? JSON.parse(text) : { ok: true }) as LocalResponse['json'] })
      })
    })
    request.on('error', reject)
    request.end(options.body)
  })
}

async function setup(overrides: ClipperHttpConfig = {}) {
  const temp = await makeTempDir('clipper-http')
  cleanups.push(temp.cleanup)
  const resolved = resolveConfig({ dataDir: join(temp.dir, 'data'), autoIndexSkills: false }, join(temp.dir, 'skills'))
  const graph = new ResearchGraphService(new Context(), resolved)
  const finance = new FinanceService(new Context(), graph)
  const config = resolveClipperHttpConfig({
    enabled: true,
    port: 0,
    tokenFile: join(temp.dir, 'token'),
    allowedOrigins: ['https://app.example.com'],
    ...overrides,
  }, temp.dir)
  const server = new ClipperHttpServer(finance, config)
  cleanups.push(() => server.stop())
  const address = await server.start()
  const token = await readFile(address.tokenFile, 'utf8')
  return { temp, graph, finance, config, server, address, token }
}

function auth(token: string, origin?: string): Record<string, string> {
  return { authorization: `Bearer ${token}`, 'content-type': 'application/json', ...(origin === undefined ? {} : { origin }) }
}

describe('secure loopback Clipper HTTP', () => {
  it('is disabled by default and rejects non-loopback binds and wildcard origins', async () => {
    const temp = await makeTempDir('clipper-disabled')
    cleanups.push(temp.cleanup)
    const config = resolveConfig({ dataDir: join(temp.dir, 'data'), autoIndexSkills: false }, temp.dir)
    expect(config.clipperHttp.enabled).toBe(false)
    expect(JSON.stringify(config)).not.toContain('Bearer ')
    await expect(stat(config.clipperHttp.tokenFile)).rejects.toMatchObject({ code: 'ENOENT' })
    expect(() => resolveClipperHttpConfig({ enabled: true, host: '0.0.0.0' as '127.0.0.1' }, temp.dir)).toThrow(/127\.0\.0\.1 or ::1/u)
    expect(() => resolveClipperHttpConfig({ enabled: true, allowedOrigins: ['*'] }, temp.dir)).toThrow(/wildcards/u)
  })

  it('serves health, requires a persistent 256-bit Bearer token, and imports clips and bytes', async () => {
    const { graph, finance, config, server, address, token } = await setup()
    expect(Buffer.from(token, 'base64url')).toHaveLength(32)
    expect((await stat(address.tokenFile)).mode & 0o777).toBe(0o600)
    expect(JSON.stringify(config)).not.toContain(token)

    const health = await localRequest(`${address.url}/clipper/v1/health`)
    expect(health).toMatchObject({ status: 200, json: { ok: true, service: 'dsh-clipper' } })
    expect((await localRequest(`${address.url}/clipper/v1/import`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' })).status).toBe(401)
    const wrong = await localRequest(`${address.url}/clipper/v1/import`, { method: 'POST', headers: auth('A'.repeat(43)), body: JSON.stringify({ bundle, asOf }) })
    expect(wrong.status).toBe(401)
    expect(wrong.text).not.toContain(token)

    const imported = await localRequest(`${address.url}/clipper/v1/import`, {
      method: 'POST', headers: auth(token), body: JSON.stringify({ bundle, dryRun: false, asOf, runId: 'http-clip' }),
    })
    expect(imported).toMatchObject({ status: 200, json: { ok: true, result: { revision: 1 } } })
    expect(imported.json.result?.clipIds).toHaveLength(1)
    const document = await localRequest(`${address.url}/clipper/v1/files`, {
      method: 'POST', headers: auth(token),
      body: JSON.stringify({ files: [{ name: 'local.txt', mimeType: 'text/plain', dataBase64: Buffer.from('HTTP document').toString('base64') }], dryRun: false, asOf, runId: 'http-doc' }),
    })
    expect(document).toMatchObject({ status: 200, json: { ok: true, result: { revision: 2 } } })
    expect(document.json.result?.documentIds).toHaveLength(1)
    expect(await graph.currentRevision()).toBe(2)

    await server.stop()
    const restarted = new ClipperHttpServer(finance, config)
    cleanups.push(() => restarted.stop())
    const restartedAddress = await restarted.start()
    expect(await readFile(restartedAddress.tokenFile, 'utf8')).toBe(token)
    expect((await stat(restartedAddress.tokenFile)).mode & 0o777).toBe(0o600)
    const replay = await localRequest(`${restartedAddress.url}/clipper/v1/import`, {
      method: 'POST', headers: auth(token), body: JSON.stringify({ bundle, dryRun: false, asOf, runId: 'http-clip' }),
    })
    expect(replay.json.result?.revision).toBe(2)
  })

  it('enforces exact Host, Origin and CORS whitelists without wildcard credentials', async () => {
    const { address, token } = await setup()
    const wrongHost = await localRequest(`${address.url}/clipper/v1/health`, { headers: { host: 'evil.example.com' } })
    expect(wrongHost).toMatchObject({ status: 403, json: { error: { code: 'HOST_REJECTED' } } })
    const rejectedOrigin = await localRequest(`${address.url}/clipper/v1/health`, { headers: { origin: 'https://evil.example.com' } })
    expect(rejectedOrigin).toMatchObject({ status: 403, json: { error: { code: 'ORIGIN_REJECTED' } } })
    const allowed = await localRequest(`${address.url}/clipper/v1/health`, { headers: { origin: 'https://app.example.com' } })
    expect(allowed.status).toBe(200)
    expect(allowed.headers['access-control-allow-origin']).toBe('https://app.example.com')
    expect(allowed.headers['access-control-allow-credentials']).toBeUndefined()
    expect(allowed.headers['access-control-allow-origin']).not.toBe('*')

    const preflight = await localRequest(`${address.url}/clipper/v1/import`, {
      method: 'OPTIONS',
      headers: { origin: 'https://app.example.com', 'access-control-request-method': 'POST', 'access-control-request-headers': 'authorization, content-type' },
    })
    expect(preflight.status).toBe(204)
    expect(preflight.headers['access-control-allow-origin']).toBe('https://app.example.com')
    expect(preflight.headers['access-control-allow-credentials']).toBeUndefined()
    expect((await localRequest(`${address.url}/clipper/v1/import`, { method: 'GET', headers: auth(token) })).status).toBe(405)
    expect((await localRequest(`${address.url}/not-found`, { headers: auth(token) })).status).toBe(404)
  })

  it('accepts real multipart FormData with dryRun, commit, and idempotent replay', async () => {
    const { graph, address, token } = await setup()
    const send = async (dryRun: boolean) => {
      const form = new FormData()
      form.append('asOf', asOf)
      form.append('dryRun', String(dryRun))
      form.append('runId', 'multipart-document')
      form.append('files', new Blob(['real multipart document'], { type: 'text/plain' }), 'multipart.txt')
      const response = await fetch(`${address.url}/clipper/v1/files`, {
        method: 'POST',
        headers: { authorization: `Bearer ${token}` },
        body: form,
      })
      const text = await response.text()
      return { status: response.status, text, json: JSON.parse(text) as { ok: boolean; result?: { revision: number; changed: boolean; status: string; documentIds: string[] } } }
    }

    const preview = await send(true)
    expect(preview).toMatchObject({ status: 200, json: { ok: true, result: { revision: 0, changed: false, status: 'preview' } } })
    expect(await graph.currentRevision()).toBe(0)
    const committed = await send(false)
    expect(committed).toMatchObject({ status: 200, json: { ok: true, result: { revision: 1, changed: true, status: 'imported' } } })
    expect(committed.json.result?.documentIds).toHaveLength(1)
    const document = await graph.getNode(committed.json.result?.documentIds[0] as string)
    expect(document?.content).toBe('real multipart document')
    expect(document?.metadata.provenance).toMatchObject({ fileName: 'multipart.txt', format: 'txt', scriptsExecuted: false, linksFetched: false })
    const replay = await send(false)
    expect(replay).toMatchObject({ status: 200, json: { ok: true, result: { revision: 1, changed: false, status: 'unchanged' } } })
    expect(replay.text).not.toContain(token)
    expect(await graph.currentRevision()).toBe(1)
  })

  it('serializes concurrent imports into atomic revisions', async () => {
    const { finance, graph, address, token } = await setup()
    const original = finance.importClipper.bind(finance)
    let active = 0
    let maximum = 0
    finance.importClipper = async input => {
      active += 1
      maximum = Math.max(maximum, active)
      await new Promise(resolve => setTimeout(resolve, 20))
      try {
        return await original(input)
      } finally {
        active -= 1
      }
    }
    const responses = await Promise.all(Array.from({ length: 4 }, (_, index) => localRequest(`${address.url}/clipper/v1/import`, {
      method: 'POST', headers: auth(token),
      body: JSON.stringify({ bundle: { clips: [{ ...bundle.clips[0], url: `https://example.com/${index}`, content: { text: `body ${index}` } }] }, dryRun: false, asOf, runId: `serial-${index}` }),
    })))
    expect(responses.every(response => response.status === 200)).toBe(true)
    expect(maximum).toBe(1)
    expect(await graph.currentRevision()).toBe(4)
    expect((await graph.revisions()).map(entry => entry.revision)).toEqual([1, 2, 3, 4])
  })

  it('caps request bodies and times out incomplete requests', async () => {
    const { address, token } = await setup({ maxBodyBytes: 1024, requestTimeoutMs: 100 })
    const tooLarge = await localRequest(`${address.url}/clipper/v1/import`, {
      method: 'POST', headers: auth(token), body: JSON.stringify({ bundle, asOf, padding: 'x'.repeat(2048) }),
    })
    expect(tooLarge).toMatchObject({ status: 413, json: { error: { code: 'REQUEST_TOO_LARGE' } } })

    const port = address.port
    const raw = await new Promise<string>((resolve, reject) => {
      const socket = connect(port, '127.0.0.1', () => {
        socket.write(`POST /clipper/v1/import HTTP/1.1\r\nHost: 127.0.0.1:${port}\r\nAuthorization: Bearer ${token}\r\nContent-Type: application/json\r\nContent-Length: 100\r\nConnection: close\r\n\r\n{`)
      })
      const chunks: Buffer[] = []
      socket.on('data', chunk => chunks.push(Buffer.from(chunk)))
      socket.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')))
      socket.on('error', reject)
      setTimeout(() => socket.destroy(), 2000).unref()
    })
    expect(raw).toContain('408')
    expect(raw).toContain('TIMEOUT')
  })
})
