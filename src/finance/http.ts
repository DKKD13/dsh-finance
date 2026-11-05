import { lookup as dnsLookup } from 'node:dns'
import { isIP } from 'node:net'
import { GraphError } from '../graph.ts'

export type FetchLike = (input: URL, init: RequestInit) => Promise<Response>
export type LookupLike = (hostname: string, options: { all: true; verbatim: true }) => Promise<readonly { address: string; family: number }[]>

export interface SafeHttpOptions {
  readonly timeoutMs?: number
  readonly maxBytes?: number
  readonly fetch?: FetchLike
  readonly lookup?: LookupLike
}

export interface HttpPayload {
  readonly status: number
  readonly finalUrl: string
  readonly contentType: string | null
  readonly lastModified: string | null
  readonly bytes: Uint8Array
  readonly text: string
}

interface RequestOptions {
  readonly allowLoopback?: boolean
  readonly accept?: string
  readonly userAgent?: string
}

const DEFAULT_TIMEOUT_MS = 10_000
const DEFAULT_MAX_BYTES = 16 * 1024 * 1024
const MAX_REDIRECTS = 3

function defaultLookup(hostname: string, options: { all: true; verbatim: true }): Promise<{ address: string; family: number }[]> {
  return new Promise((resolve, reject) => {
    dnsLookup(hostname, options, (error, addresses) => {
      if (error) reject(error)
      else resolve(addresses)
    })
  })
}

function ipv4Number(address: string): number | undefined {
  const parts = address.split('.')
  if (parts.length !== 4) return undefined
  let value = 0
  for (const part of parts) {
    if (!/^\d{1,3}$/u.test(part)) return undefined
    const number = Number(part)
    if (number > 255) return undefined
    value = value * 256 + number
  }
  return value >>> 0
}

function inIpv4Range(address: number, base: string, bits: number): boolean {
  const network = ipv4Number(base)
  if (network === undefined) return false
  const mask = bits === 0 ? 0 : (0xffffffff << (32 - bits)) >>> 0
  return (address & mask) === (network & mask)
}

function privateIpv4(address: string): boolean {
  const number = ipv4Number(address)
  if (number === undefined) return true
  return [
    ['0.0.0.0', 8], ['10.0.0.0', 8], ['100.64.0.0', 10], ['127.0.0.0', 8],
    ['169.254.0.0', 16], ['172.16.0.0', 12], ['192.0.0.0', 24], ['192.0.2.0', 24],
    ['192.168.0.0', 16], ['198.18.0.0', 15], ['198.51.100.0', 24],
    ['203.0.113.0', 24], ['224.0.0.0', 4], ['240.0.0.0', 4],
  ].some(([base, bits]) => inIpv4Range(number, base as string, bits as number))
}

function privateAddress(address: string): boolean {
  const normalized = address.toLowerCase().split('%')[0] ?? ''
  if (isIP(normalized) === 4) return privateIpv4(normalized)
  if (isIP(normalized) === 6) {
    if (normalized === '::' || normalized === '::1') return true
    if (normalized.startsWith('::ffff:')) {
      const mapped = normalized.slice(7)
      return isIP(mapped) === 4 ? privateIpv4(mapped) : true
    }
    return normalized.startsWith('fc') || normalized.startsWith('fd')
      || normalized.startsWith('fe8') || normalized.startsWith('fe9')
      || normalized.startsWith('fea') || normalized.startsWith('feb')
      || normalized.startsWith('ff') || normalized.startsWith('2001:db8:')
  }
  return true
}

function loopbackHostname(hostname: string): boolean {
  const normalized = hostname.toLowerCase().replace(/\.$/u, '')
  if (normalized === 'localhost' || normalized === '::1') return true
  const address = ipv4Number(normalized)
  return address !== undefined && inIpv4Range(address, '127.0.0.0', 8)
}

function parseUrl(input: string | URL): URL {
  let url: URL
  try {
    url = input instanceof URL ? new URL(input) : new URL(input)
  } catch {
    throw new GraphError('INVALID_URL', 'source URL must be a valid absolute HTTP(S) URL')
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new GraphError('UNSAFE_URL', 'only HTTP(S) source URLs are allowed')
  }
  if (url.username.length > 0 || url.password.length > 0) {
    throw new GraphError('UNSAFE_URL', 'source URLs must not contain credentials')
  }
  return url
}

function displayUrl(url: URL): string {
  return `${url.protocol}//${url.host}${url.pathname}`
}

export class SafeHttp {
  private readonly fetchImpl: FetchLike
  private readonly lookupImpl: LookupLike
  private readonly timeoutMs: number
  private readonly maxBytes: number

  constructor(options: SafeHttpOptions = {}) {
    this.fetchImpl = options.fetch ?? (globalThis.fetch.bind(globalThis) as FetchLike)
    this.lookupImpl = options.lookup ?? defaultLookup
    this.timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS
    this.maxBytes = options.maxBytes ?? DEFAULT_MAX_BYTES
    if (!Number.isSafeInteger(this.timeoutMs) || this.timeoutMs < 1 || this.timeoutMs > 60_000) {
      throw new GraphError('INVALID_CONFIG', 'httpTimeoutMs must be an integer between 1 and 60000')
    }
    if (!Number.isSafeInteger(this.maxBytes) || this.maxBytes < 1 || this.maxBytes > 64 * 1024 * 1024) {
      throw new GraphError('INVALID_CONFIG', 'httpMaxBytes must be an integer between 1 and 67108864')
    }
  }

  private async validate(urlInput: string | URL, allowLoopback: boolean): Promise<URL> {
    const url = parseUrl(urlInput)
    const hostname = url.hostname.replace(/^\[|\]$/gu, '')
    if (allowLoopback && !loopbackHostname(hostname)) {
      throw new GraphError('UNSAFE_URL', 'the loopback HTTP exception only admits localhost or a loopback IP')
    }
    let addresses: readonly { address: string; family: number }[]
    try {
      addresses = await this.lookupImpl(hostname, { all: true, verbatim: true })
    } catch {
      throw new GraphError('UNAVAILABLE', `could not resolve ${url.hostname}`)
    }
    if (addresses.length === 0) throw new GraphError('UNAVAILABLE', `could not resolve ${url.hostname}`)
    if (addresses.some(entry => allowLoopback ? !loopbackHostname(entry.address) : privateAddress(entry.address))) {
      throw new GraphError('UNSAFE_URL', `refusing non-public network address for ${url.hostname}`)
    }
    return url
  }

  async request(urlInput: string | URL, options: RequestOptions = {}): Promise<HttpPayload> {
    const allowLoopback = options.allowLoopback ?? false
    let url = await this.validate(urlInput, allowLoopback)
    const controller = new AbortController()
    let timedOut = false
    const timer = setTimeout(() => {
      timedOut = true
      controller.abort()
    }, this.timeoutMs)
    try {
      for (let redirect = 0; redirect <= MAX_REDIRECTS; redirect += 1) {
        let response: Response
        try {
          response = await this.fetchImpl(url, {
            method: 'GET',
            redirect: 'manual',
            signal: controller.signal,
            headers: {
              accept: options.accept ?? 'application/json, application/xml, text/xml, text/plain;q=0.8',
              'user-agent': options.userAgent ?? 'deepseek-harness-finance-plugin/0.1 public-research',
            },
          })
        } catch {
          if (timedOut) throw new GraphError('TIMEOUT', `request timed out for ${displayUrl(url)}`)
          throw new GraphError('UNAVAILABLE', `request failed for ${displayUrl(url)}`)
        }
        if ([301, 302, 303, 307, 308].includes(response.status)) {
          const location = response.headers.get('location')
          if (!location) throw new GraphError('UNAVAILABLE', `redirect from ${displayUrl(url)} had no location`)
          if (redirect === MAX_REDIRECTS) throw new GraphError('UNAVAILABLE', `too many redirects for ${displayUrl(url)}`)
          url = await this.validate(new URL(location, url), allowLoopback)
          continue
        }
        if (!response.ok) throw new GraphError('UNAVAILABLE', `HTTP ${response.status} from ${displayUrl(url)}`)
        const length = Number(response.headers.get('content-length') ?? '0')
        if (Number.isFinite(length) && length > this.maxBytes) {
          throw new GraphError('HTTP_TOO_LARGE', `response from ${displayUrl(url)} exceeds ${this.maxBytes} bytes`)
        }
        const bytes = await this.readBytes(response, url)
        return {
          status: response.status,
          finalUrl: url.toString(),
          contentType: response.headers.get('content-type'),
          lastModified: response.headers.get('last-modified'),
          bytes,
          text: new TextDecoder().decode(bytes),
        }
      }
      throw new GraphError('UNAVAILABLE', `request failed for ${displayUrl(url)}`)
    } finally {
      clearTimeout(timer)
    }
  }

  private async readBytes(response: Response, url: URL): Promise<Uint8Array> {
    const chunks: Uint8Array[] = []
    let total = 0
    const append = (chunk: Uint8Array): void => {
      total += chunk.byteLength
      if (total > this.maxBytes) throw new GraphError('HTTP_TOO_LARGE', `response from ${displayUrl(url)} exceeds ${this.maxBytes} bytes`)
      chunks.push(chunk)
    }
    try {
      if (response.body === null) {
        append(new Uint8Array(await response.arrayBuffer()))
      } else {
        const reader = response.body.getReader()
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          if (value !== undefined) append(value)
        }
      }
    } catch (error: unknown) {
      if (error instanceof GraphError) throw error
      if (timedOutFrom(error)) throw new GraphError('TIMEOUT', `request timed out for ${displayUrl(url)}`)
      throw new GraphError('UNAVAILABLE', `could not read response from ${displayUrl(url)}`)
    }
    const output = new Uint8Array(total)
    let offset = 0
    for (const chunk of chunks) {
      output.set(chunk, offset)
      offset += chunk.byteLength
    }
    return output
  }
}

function timedOutFrom(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'name' in error && error.name === 'AbortError'
}

export function canonicalHttpUrl(input: string | URL): string {
  const url = parseUrl(input)
  url.hash = ''
  const retained = [...url.searchParams.entries()]
    .filter(([key]) => !/^utm_/iu.test(key) && !['fbclid', 'gclid', 'mc_cid', 'mc_eid'].includes(key.toLowerCase()))
    .sort(([leftKey, leftValue], [rightKey, rightValue]) => leftKey.localeCompare(rightKey) || leftValue.localeCompare(rightValue))
  url.search = ''
  for (const [key, value] of retained) url.searchParams.append(key, value)
  return url.toString()
}
