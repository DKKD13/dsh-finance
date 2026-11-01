#!/usr/bin/env node
/**
 * Dev-only preview host. Graph and finance commands use the real services over
 * one temporary GraphStore; only external provider responses are fixtures.
 * Not part of the shipped package. Usage: node scripts/preview-server.mjs [port]
 */
import { createServer } from 'node:http'
import { mkdir, mkdtemp, readFile, rm } from 'node:fs/promises'
import { extname, join, normalize } from 'node:path'
import { fileURLToPath } from 'node:url'
import { Context } from '@deepseek-ai/cordis'
import {
  FinanceService,
  ResearchGraphService,
  executeFinanceRequest,
  executeGraphRequest,
  resolveConfig,
} from '../dist/index.js'

const root = fileURLToPath(new URL('..', import.meta.url))
const port = Number(process.argv[2] ?? 48731)
const verificationDir = join(root, '.verification')
await mkdir(verificationDir, { recursive: true })
const temporaryDir = await mkdtemp(join(verificationDir, 'preview-'))
const previewAt = '2026-01-10T00:00:00.000Z'

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
}

// Preview-only provider fixture: no DNS or network request reaches a provider.
async function previewFetch(input) {
  const url = new URL(input)
  if (url.hostname === 'news.example.com' && url.pathname === '/rss') {
    const rss = `<?xml version="1.0"?><rss version="2.0"><channel><title>Preview research feed</title><item><title>Preview market evidence</title><link>https://news.example.com/story?utm_source=rss&amp;id=7</link><pubDate>Wed, 31 Dec 2025 12:00:00 GMT</pubDate><description><![CDATA[<p>Revenue quality improved as recurring sales offset one-time softness.</p>]]></description></item></channel></rss>`
    return new Response(rss, {
      status: 200,
      headers: { 'content-type': 'application/rss+xml; charset=utf-8', 'x-preview-only': 'true' },
    })
  }
  if (url.hostname !== 'query1.finance.yahoo.com') {
    return new Response('preview-only provider fixture: external providers are disabled', {
      status: 503,
      headers: { 'content-type': 'text/plain; charset=utf-8', 'x-preview-only': 'true' },
    })
  }
  const symbol = decodeURIComponent(url.pathname.split('/').at(-1) ?? 'AAPL').toUpperCase()
  // Dense, deterministic synthetic observations make the demo chart useful for
  // visual/interaction review. PREVIEW_ONLY stays visible in quote provenance.
  const interval = url.searchParams.get('interval') ?? '1d'
  const range = url.searchParams.get('range') ?? '1mo'
  const minutes = { '1m': 1, '5m': 5, '15m': 15, '30m': 30, '1h': 60 }
  const intraday = minutes[interval] !== undefined
  const defaultCount = intraday ? Math.max(7, Math.floor(390 / minutes[interval])) : range === 'max' ? 400 : range === '5y' ? 260 : range === '1d' ? 1 : range === '5d' ? 5 : range === '1mo' ? 22 : 90
  const step = intraday ? minutes[interval] * 60 : interval === '1wk' ? 604800 : interval === '1mo' ? 2592000 : 86400
  const finalTime = Date.parse('2026-01-09T20:59:00Z') / 1000
  const period1 = Number(url.searchParams.get('period1'))
  const period2 = Number(url.searchParams.get('period2'))
  const custom = url.searchParams.has('period1') && Number.isFinite(period1) && period2 > period1
  const customEnd = Math.min(period2, Date.parse('2026-01-10T00:00:00Z') / 1000)
  const count = custom ? Math.min(400, Math.max(0, Math.ceil((customEnd - period1) / step))) : defaultCount
  const timestamp = Array.from({ length: count }, (_, i) => custom ? period1 + i * step : finalTime - (count - 1 - i) * step)
  const close = timestamp.map((_, i) => { const point = i - count + 1; return +(344.63 + 2.1 * Math.sin(point * .041) + .42 * Math.sin(point * .31) + .22 * (Math.cos(point * .17) - 1) + .008 * point).toFixed(4) })
  const open = close.map((v, i) => i ? close[i - 1] : v + .18)
  const high = close.map((v, i) => Math.max(v, open[i]) + .12)
  const low = close.map((v, i) => Math.min(v, open[i]) - .12)
  const volume = close.map((_, i) => 12000 + Math.round(30000 * Math.abs(Math.sin(i * .13))) + (i > count * .9 ? 18000 : 0))
  const result = {
    meta: {
      symbol, currency: 'USD', longName: symbol === 'AAPL' ? 'Apple Inc.' : symbol,
      exchangeName: 'PREVIEW_ONLY', fullExchangeName: 'Synthetic preview fixture · no network',
      regularMarketPrice: 344.63, previousClose: 348.91, exchangeTimezoneName: 'America/New_York',
      regularMarketDayHigh: Math.max(...high), regularMarketDayLow: Math.min(...low),
      regularMarketVolume: volume.reduce((a, b) => a + b, 0), regularMarketTime: finalTime,
      fiftyTwoWeekHigh: 351.73, fiftyTwoWeekLow: 243.42,
    },
    timestamp,
    indicators: { quote: [{ open, high, low, close, volume }], adjclose: [{ adjclose: close }] },
  }
  return new Response(JSON.stringify({ chart: { result: [result], error: null } }), {
    status: 200,
    headers: { 'content-type': 'application/json', 'x-preview-only': 'true' },
  })
}

const ctx = new Context()
const config = resolveConfig({
  dataDir: join(temporaryDir, 'graph'),
  skillsRoot: join(temporaryDir, 'skills'),
  autoIndexSkills: false,
}, join(temporaryDir, 'skills'))
const graph = new ResearchGraphService(ctx, config)
const finance = new FinanceService(ctx, graph, config, {
  fetch: previewFetch,
  lookup: async () => [{ address: '93.184.216.34', family: 4 }],
  execFile: async () => { throw new Error('preview-only provider fixture: CLI execution is disabled') },
  now: () => previewAt,
})

const seed = [
  { id: 'skill:research', kind: 'skill', title: 'research', content: '# research\n\n通用研究技能。' },
  { id: 'skill:deep-research', kind: 'skill', title: 'deep-research', content: '# deep-research\n\n深度研究流程。' },
  { id: 'skill:daily-digest', kind: 'skill', title: 'daily-digest', content: '# daily-digest' },
  { id: 'persona:nikita', kind: 'persona', title: 'Nikita（海报设计师）', content: 'Persona 示例。' },
  { id: 'source:paper-attention', kind: 'source', title: 'Attention Is All You Need', content: 'Transformer 原始论文。' },
  { id: 'claim:scaling', kind: 'claim', title: '规模假设', content: '模型规模与数据规模共同决定上限。' },
  { id: 'question:eval', kind: 'question', title: '评测如何覆盖长尾？', content: '' },
  { id: 'deliverable:weekly', kind: 'deliverable', title: '周报 2026-W44', content: '# 周报' },
  { id: 'memory:pref-dark', kind: 'memory', title: '偏好：深色主题', content: '' },
]
for (const node of seed) await graph.createNode(node)
for (const [from, to, kind] of [
  ['skill:deep-research', 'skill:research', 'depends_on'],
  ['skill:research', 'source:paper-attention', 'references'],
  ['claim:scaling', 'source:paper-attention', 'based_on'],
  ['skill:deep-research', 'claim:scaling', 'produces'],
  ['question:eval', 'skill:daily-digest', 'informed_by'],
  ['deliverable:weekly', 'claim:scaling', 'contain'],
  ['persona:nikita', 'skill:research', 'uses'],
  ['claim:scaling', 'question:eval', 'seeks'],
]) await graph.addEdge({ from, to, kind })
await finance.ingestMarketData({
  instrument: {
    id: 'instrument:aapl',
    title: 'Apple Inc. (preview fixture)',
    symbol: 'AAPL',
    currency: 'USD',
    metadata: {
      provider: 'preview.fixture',
      asOf: previewAt,
      availableAt: '2026-01-09T00:00:00.000Z',
      fetchedAt: previewAt,
      provenance: { previewOnly: true, sourceRefs: [] },
    },
  },
  data: { regularMarketPrice: 124, currency: 'USD', previewOnly: true },
})

async function requestBody(req) {
  const chunks = []
  let bytes = 0
  for await (const chunk of req) {
    bytes += chunk.length
    if (bytes > 1024 * 1024) throw new Error('request body exceeds 1 MiB')
    chunks.push(chunk)
  }
  return Buffer.concat(chunks).toString('utf8')
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url ?? '/', 'http://x')
  if (req.method === 'POST' && (url.pathname === '/finance' || url.pathname === '/research-graph')) {
    try {
      const request = JSON.parse(await requestBody(req))
      const response = url.pathname === '/finance'
        ? await executeFinanceRequest(finance, request)
        : await executeGraphRequest(graph, request)
      res.writeHead(200, { 'content-type': TYPES['.json'], 'cache-control': 'no-store' })
      res.end(JSON.stringify(response))
    } catch (error) {
      res.writeHead(400, { 'content-type': TYPES['.json'], 'cache-control': 'no-store' })
      res.end(JSON.stringify({ ok: false, error: { code: 'INVALID_REQUEST', message: error instanceof Error ? error.message : String(error) } }))
    }
    return
  }
  let path
  try {
    path = normalize(join(root, decodeURIComponent(url.pathname)))
  } catch {
    res.writeHead(400).end('bad path')
    return
  }
  if (!path.startsWith(root)) {
    res.writeHead(403).end()
    return
  }
  readFile(path)
    .then(body => {
      res.writeHead(200, { 'content-type': TYPES[extname(path)] ?? 'application/octet-stream' })
      res.end(body)
    })
    .catch(() => { res.writeHead(404).end('not found') })
})

let closing = false
async function shutdown() {
  if (closing) return
  closing = true
  const closed = new Promise(resolve => server.close(resolve))
  server.closeAllConnections()
  await closed
  await rm(temporaryDir, { recursive: true, force: true })
}
for (const signal of ['SIGINT', 'SIGTERM']) {
  process.once(signal, () => { void shutdown().finally(() => { process.exit(0) }) })
}

server.listen(port, '127.0.0.1', () => {
  console.log(`preview: http://127.0.0.1:${port}/scripts/preview.html`)
  console.log('preview: real services + temporary GraphStore; external data is preview-only fixtures')
})
