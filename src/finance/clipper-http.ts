import { createHash, randomBytes, timingSafeEqual } from 'node:crypto'
import { chmod, lstat, mkdir, readFile, writeFile } from 'node:fs/promises'
import { createServer } from 'node:http'
import type { IncomingMessage, Server, ServerResponse } from 'node:http'
import { dirname, join } from 'node:path'
import { GraphError } from '../graph.ts'
import type { GraphResponse } from '../protocol.ts'
import { executeFinanceRequest } from './protocol.ts'
import type { FinanceRequest } from './protocol.ts'
import type { FinanceService } from './service.ts'
import type { ClipperImportInput, DocumentImportInput, JsonObject } from './types.ts'

export interface ClipperHttpConfig {
  readonly enabled?: boolean
  readonly host?: '127.0.0.1' | '::1'
  readonly port?: number
  readonly tokenFile?: string
  readonly allowedOrigins?: string[]
  readonly maxBodyBytes?: number
  readonly requestTimeoutMs?: number
}

export interface ResolvedClipperHttpConfig {
  readonly enabled: boolean
  readonly host: '127.0.0.1' | '::1'
  readonly port: number
  readonly tokenFile: string
  readonly allowedOrigins: readonly string[]
  readonly maxBodyBytes: number
  readonly requestTimeoutMs: number
}

export interface ClipperHttpAddress {
  readonly host: '127.0.0.1' | '::1'
  readonly port: number
  readonly tokenFile: string
  readonly url: string
}

function validOrigin(origin: string): string {
  if (origin.includes('*') || /[\s\0]/u.test(origin)) throw new GraphError('INVALID_CONFIG', 'CORS origins must be exact values without wildcards or whitespace')
  if (/^chrome-extension:\/\/[a-z]{32}$/u.test(origin) || /^moz-extension:\/\/[a-z0-9-]+$/iu.test(origin)) return origin
  let url: URL
  try {
    url = new URL(origin)
  } catch {
    throw new GraphError('INVALID_CONFIG', `invalid CORS origin ${origin}`)
  }
  if ((url.protocol !== 'http:' && url.protocol !== 'https:') || url.username || url.password || url.search || url.hash
    || (url.pathname !== '' && url.pathname !== '/')) {
    throw new GraphError('INVALID_CONFIG', `invalid CORS origin ${origin}`)
  }
  return url.origin
}

export function resolveClipperHttpConfig(config: ClipperHttpConfig | undefined, dataDir: string): ResolvedClipperHttpConfig {
  const host = config?.host ?? '127.0.0.1'
  if (host !== '127.0.0.1' && host !== '::1') throw new GraphError('INVALID_CONFIG', 'clipperHttp.host must be exactly 127.0.0.1 or ::1')
  const port = config?.port ?? 47643
  if (!Number.isSafeInteger(port) || port < 0 || port > 65535) throw new GraphError('INVALID_CONFIG', 'clipperHttp.port must be an integer between 0 and 65535')
  const maxBodyBytes = config?.maxBodyBytes ?? 32 * 1024 * 1024
  if (!Number.isSafeInteger(maxBodyBytes) || maxBodyBytes < 1024 || maxBodyBytes > 64 * 1024 * 1024) {
    throw new GraphError('INVALID_CONFIG', 'clipperHttp.maxBodyBytes must be between 1024 and 67108864')
  }
  const requestTimeoutMs = config?.requestTimeoutMs ?? 10_000
  if (!Number.isSafeInteger(requestTimeoutMs) || requestTimeoutMs < 100 || requestTimeoutMs > 60_000) {
    throw new GraphError('INVALID_CONFIG', 'clipperHttp.requestTimeoutMs must be between 100 and 60000')
  }
  const tokenFile = config?.tokenFile ?? join(dataDir, 'clipper-token')
  if (tokenFile.length === 0 || tokenFile.includes('\0')) throw new GraphError('INVALID_CONFIG', 'clipperHttp.tokenFile must be a non-empty path without NUL')
  const allowedOrigins = [...new Set((config?.allowedOrigins ?? []).map(validOrigin))]
  return { enabled: config?.enabled ?? false, host, port, tokenFile, allowedOrigins, maxBodyBytes, requestTimeoutMs }
}

function validToken(token: string): boolean {
  if (!/^[A-Za-z0-9_-]{43}$/u.test(token)) return false
  return Buffer.from(token, 'base64url').length === 32
}

export async function loadOrCreateClipperToken(file: string): Promise<string> {
  await mkdir(dirname(file), { recursive: true })
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const stat = await lstat(file)
      if (!stat.isFile() || stat.isSymbolicLink()) throw new GraphError('TOKEN_FILE_UNSAFE', 'clipper token path must be a regular file, not a symlink')
      const token = (await readFile(file, 'utf8')).trim()
      if (!validToken(token)) throw new GraphError('TOKEN_FILE_INVALID', 'clipper token file is invalid; replace it with a new 256-bit token outside the running service')
      await chmod(file, 0o600)
      return token
    } catch (error: unknown) {
      if (typeof error !== 'object' || error === null || !('code' in error) || error.code !== 'ENOENT') throw error
    }
    const token = randomBytes(32).toString('base64url')
    try {
      await writeFile(file, token, { encoding: 'utf8', mode: 0o600, flag: 'wx' })
      await chmod(file, 0o600)
      return token
    } catch (error: unknown) {
      if (typeof error !== 'object' || error === null || !('code' in error) || error.code !== 'EEXIST') throw error
    }
  }
  throw new GraphError('TOKEN_FILE_UNSAFE', 'could not initialize the clipper token file')
}

function errorResponse(code: string, message: string): GraphResponse {
  return { ok: false, error: { code, message } }
}

function statusFor(error: GraphError): number {
  if (['UNAUTHORIZED', 'INVALID_AUTHORIZATION'].includes(error.code)) return 401
  if (['HOST_REJECTED', 'ORIGIN_REJECTED', 'LOOPBACK_REQUIRED'].includes(error.code)) return 403
  if (error.code === 'NOT_FOUND') return 404
  if (error.code === 'METHOD_NOT_ALLOWED') return 405
  if (error.code === 'REQUEST_TOO_LARGE' || error.code === 'DOCUMENT_TOO_LARGE') return 413
  if (error.code === 'TIMEOUT') return 408
  if (error.code.startsWith('INVALID') || error.code.endsWith('_REJECTED') || error.code.includes('UNSUPPORTED')) return 400
  return 400
}

function requestBody(request: IncomingMessage, maxBytes: number, timeoutMs: number): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    let total = 0
    let settled = false
    const finish = (error?: GraphError, value?: Buffer): void => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      request.off('data', onData)
      request.off('end', onEnd)
      request.off('aborted', onAborted)
      request.off('error', onError)
      if (error !== undefined) reject(error)
      else resolve(value ?? Buffer.alloc(0))
    }
    const onData = (value: Buffer | string): void => {
      const chunk = Buffer.isBuffer(value) ? value : Buffer.from(value)
      total += chunk.length
      if (total > maxBytes) {
        finish(new GraphError('REQUEST_TOO_LARGE', `request body exceeds ${maxBytes} bytes`))
        request.resume()
      } else chunks.push(chunk)
    }
    const onEnd = (): void => finish(undefined, Buffer.concat(chunks))
    const onAborted = (): void => finish(new GraphError('INVALID_REQUEST', 'request body was aborted'))
    const onError = (): void => finish(new GraphError('INVALID_REQUEST', 'request body could not be read'))
    const timer = setTimeout(() => {
      finish(new GraphError('TIMEOUT', 'request body timed out'))
      request.resume()
    }, timeoutMs)
    request.on('data', onData)
    request.once('end', onEnd)
    request.once('aborted', onAborted)
    request.once('error', onError)
  })
}

function parseBody(bytes: Buffer): JsonObject {
  let value: unknown
  try {
    value = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes))
  } catch {
    throw new GraphError('INVALID_JSON', 'request body must be valid UTF-8 JSON')
  }
  if (typeof value !== 'object' || value === null || Array.isArray(value)) throw new GraphError('INVALID_REQUEST', 'request body must be a JSON object')
  return value as JsonObject
}

async function parseMultipartBody(bytes: Buffer, contentType: string): Promise<DocumentImportInput> {
  let form: FormData
  try {
    form = await new Request('http://loopback.invalid/clipper/v1/files', {
      method: 'POST',
      headers: { 'content-type': contentType },
      body: new Uint8Array(bytes),
    }).formData()
  } catch {
    throw new GraphError('INVALID_MULTIPART', 'multipart file import requires a valid multipart/form-data body with a boundary')
  }
  const files: DocumentImportInput['files'][number][] = []
  const fields = new Map<string, string>()
  for (const [field, value] of form.entries()) {
    if (field === 'files') {
      if (typeof value === 'string') throw new GraphError('INVALID_MULTIPART', 'multipart files fields must contain file bytes')
      files.push({
        name: value.name,
        mimeType: value.type,
        dataBase64: Buffer.from(await value.arrayBuffer()).toString('base64'),
      })
      continue
    }
    if (!['asOf', 'dryRun', 'runId'].includes(field) || typeof value !== 'string' || fields.has(field)) {
      throw new GraphError('INVALID_MULTIPART', 'multipart fields are limited to unique asOf/dryRun/runId strings and repeated files')
    }
    fields.set(field, value)
  }
  const asOf = fields.get('asOf')
  if (asOf === undefined) throw new GraphError('INVALID_REQUEST', 'document.import requires a non-empty asOf')
  const dryRun = fields.get('dryRun')
  if (dryRun !== undefined && dryRun !== 'true' && dryRun !== 'false') {
    throw new GraphError('INVALID_REQUEST', 'multipart dryRun must be true or false')
  }
  const runId = fields.get('runId')
  return {
    files,
    asOf,
    ...(dryRun === undefined ? {} : { dryRun: dryRun === 'true' }),
    ...(runId === undefined ? {} : { runId }),
  }
}

function tokenMatches(supplied: string, expected: string): boolean {
  const left = createHash('sha256').update(supplied, 'utf8').digest()
  const right = createHash('sha256').update(expected, 'utf8').digest()
  return timingSafeEqual(left, right)
}

export class ClipperHttpServer {
  private server: Server | undefined
  private token: string | undefined
  private bound: ClipperHttpAddress | undefined
  private queue: Promise<unknown> = Promise.resolve()

  constructor(private readonly finance: FinanceService, private readonly config: ResolvedClipperHttpConfig) {
    if (!config.enabled) throw new GraphError('INVALID_CONFIG', 'ClipperHttpServer requires clipperHttp.enabled:true')
  }

  get address(): ClipperHttpAddress | undefined {
    return this.bound
  }

  async start(): Promise<ClipperHttpAddress> {
    if (this.bound !== undefined) return this.bound
    this.token = await loadOrCreateClipperToken(this.config.tokenFile)
    const server = createServer((request, response) => {
      void this.handle(request, response).catch(() => {
        if (!response.headersSent) this.send(response, 500, errorResponse('INTERNAL', 'local clipper request failed'))
        else if (!response.writableEnded) response.end()
      })
    })
    server.requestTimeout = this.config.requestTimeoutMs
    server.headersTimeout = this.config.requestTimeoutMs
    server.keepAliveTimeout = 1000
    this.server = server
    await new Promise<void>((resolve, reject) => {
      const onError = (error: Error): void => reject(error)
      server.once('error', onError)
      server.listen(this.config.port, this.config.host, () => {
        server.off('error', onError)
        resolve()
      })
    })
    const address = server.address()
    if (address === null || typeof address === 'string') throw new GraphError('UNAVAILABLE', 'clipper loopback server did not bind a TCP port')
    const hostname = this.config.host === '::1' ? '[::1]' : this.config.host
    this.bound = { host: this.config.host, port: address.port, tokenFile: this.config.tokenFile, url: `http://${hostname}:${address.port}` }
    return this.bound
  }

  async stop(): Promise<void> {
    const server = this.server
    this.server = undefined
    this.bound = undefined
    this.token = undefined
    if (server === undefined) return
    await new Promise<void>(resolve => {
      server.close(() => resolve())
      server.closeIdleConnections()
      server.closeAllConnections()
    })
    await this.queue
  }

  private serial<T>(run: () => Promise<T>): Promise<T> {
    const result = this.queue.then(run)
    this.queue = result.catch(() => undefined)
    return result
  }

  private send(response: ServerResponse, status: number, body: GraphResponse | { ok: true; service: string; version: number }, origin?: string): void {
    if (response.writableEnded) return
    const headers: Record<string, string> = {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      'x-content-type-options': 'nosniff',
      vary: 'Origin',
    }
    if (origin !== undefined) headers['access-control-allow-origin'] = origin
    response.writeHead(status, headers)
    response.end(JSON.stringify(body))
  }

  private expectedHost(): string {
    if (this.bound === undefined) throw new GraphError('UNAVAILABLE', 'clipper server is not listening')
    return this.config.host === '::1' ? `[::1]:${this.bound.port}` : `${this.config.host}:${this.bound.port}`
  }

  private origin(request: IncomingMessage): string | undefined {
    const origin = request.headers.origin
    if (origin === undefined) return undefined
    if (Array.isArray(origin) || !this.config.allowedOrigins.includes(origin)) {
      throw new GraphError('ORIGIN_REJECTED', 'request Origin is not in the clipper CORS whitelist')
    }
    return origin
  }

  private authorize(request: IncomingMessage): void {
    if (this.token === undefined) throw new GraphError('UNAVAILABLE', 'clipper server is not ready')
    const authorization = request.headers.authorization
    const match = typeof authorization === 'string' ? /^Bearer ([A-Za-z0-9_-]{43})$/u.exec(authorization) : null
    if (match === null || !tokenMatches(match[1] as string, this.token)) {
      throw new GraphError('UNAUTHORIZED', 'a valid 256-bit Bearer token is required')
    }
  }

  private validateRequest(request: IncomingMessage): void {
    const remote = request.socket.remoteAddress ?? ''
    const loopback = remote === '127.0.0.1' || remote === '::1' || remote === '::ffff:127.0.0.1'
    if (!loopback) throw new GraphError('LOOPBACK_REQUIRED', 'only loopback TCP clients are accepted')
    if (request.headers.host !== this.expectedHost()) throw new GraphError('HOST_REJECTED', 'Host must be the exact configured loopback address and port')
  }

  private async handle(request: IncomingMessage, response: ServerResponse): Promise<void> {
    let origin: string | undefined
    try {
      this.validateRequest(request)
      origin = this.origin(request)
      const path = new URL(request.url ?? '/', 'http://loopback.invalid').pathname
      if ((path === '/clipper/v1/health' || path === '/health') && request.method === 'GET') {
        this.send(response, 200, { ok: true, service: 'dsh-clipper', version: 1 }, origin)
        return
      }
      if (path !== '/clipper/v1/import' && path !== '/clipper/v1/files') throw new GraphError('NOT_FOUND', 'unknown clipper route')
      if (request.method === 'OPTIONS') {
        if (origin === undefined) throw new GraphError('ORIGIN_REJECTED', 'CORS preflight requires a whitelisted Origin')
        const requestedHeaders = request.headers['access-control-request-headers']
        if (typeof requestedHeaders === 'string' && requestedHeaders.split(',').some(header => !['authorization', 'content-type'].includes(header.trim().toLowerCase()))) {
          throw new GraphError('ORIGIN_REJECTED', 'CORS requested headers are limited to authorization and content-type')
        }
        response.writeHead(204, {
          'access-control-allow-origin': origin,
          'access-control-allow-methods': 'POST',
          'access-control-allow-headers': 'authorization, content-type',
          'access-control-max-age': '600',
          vary: 'Origin',
        })
        response.end()
        return
      }
      if (request.method !== 'POST') throw new GraphError('METHOD_NOT_ALLOWED', 'clipper imports require POST')
      this.authorize(request)
      const contentType = request.headers['content-type'] ?? ''
      const json = /^application\/json(?:\s*;\s*charset=utf-8)?\s*$/iu.test(contentType)
      const multipart = path === '/clipper/v1/files' && /^multipart\/form-data(?:\s*;|\s*$)/iu.test(contentType)
      if (!json && !multipart) throw new GraphError('INVALID_CONTENT_TYPE', 'Content-Type must be application/json, or multipart/form-data for file imports')
      if (request.headers['content-encoding'] !== undefined && request.headers['content-encoding'] !== 'identity') {
        throw new GraphError('INVALID_CONTENT_ENCODING', 'compressed request bodies are not accepted')
      }
      const declared = Number(request.headers['content-length'] ?? '0')
      if (Number.isFinite(declared) && declared > this.config.maxBodyBytes) throw new GraphError('REQUEST_TOO_LARGE', 'declared request body is too large')
      const result = await this.serial(async () => {
        const bytes = await requestBody(request, this.config.maxBodyBytes, this.config.requestTimeoutMs)
        const financeRequest: FinanceRequest = path === '/clipper/v1/import'
          ? { op: 'clipper.import', input: parseBody(bytes) as ClipperImportInput }
          : { op: 'document.import', input: multipart ? await parseMultipartBody(bytes, contentType) : parseBody(bytes) as DocumentImportInput }
        return executeFinanceRequest(this.finance, financeRequest)
      })
      this.send(response, result.ok ? 200 : 400, result, origin)
    } catch (error: unknown) {
      const failure = error instanceof GraphError ? error : new GraphError('INTERNAL', 'local clipper request failed')
      this.send(response, statusFor(failure), errorResponse(failure.code, failure.message), origin)
    }
  }
}
