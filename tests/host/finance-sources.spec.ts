import { describe, expect, it, vi } from 'vitest'
import { SafeHttp } from '../../src/finance/http.ts'
import type { FetchLike, LookupLike } from '../../src/finance/http.ts'
import { FinanceDataPlane } from '../../src/finance/sources.ts'
import type { ExecFileLike } from '../../src/finance/sources.ts'

const now = '2026-01-10T00:00:00.000Z'
const publicLookup: LookupLike = async () => [{ address: '93.184.216.34', family: 4 }]
const localLookup: LookupLike = async hostname => hostname === 'localhost'
  ? [{ address: '127.0.0.1', family: 4 }]
  : [{ address: '93.184.216.34', family: 4 }]

function json(data: unknown, headers: Record<string, string> = {}, status = 200): Response {
  return new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json', ...headers } })
}

function text(data: string, headers: Record<string, string> = {}, status = 200): Response {
  return new Response(data, { status, headers: { 'content-type': 'text/plain', ...headers } })
}

function plane(fetch: FetchLike, config: ConstructorParameters<typeof FinanceDataPlane>[0] = {}, execFile?: ExecFileLike) {
  return new FinanceDataPlane(config, { fetch, lookup: publicLookup, now: () => now, ...(execFile === undefined ? {} : { execFile }) })
}

describe('safe public HTTP', () => {
  it('blocks private addresses and redirects before fetch and redacts query secrets', async () => {
    const fetch = vi.fn<FetchLike>(async () => json({ ok: true }))
    const privateHttp = new SafeHttp({ fetch, lookup: async () => [{ address: '10.0.0.4', family: 4 }] })
    await expect(privateHttp.request('https://example.com/data?api_key=do-not-print')).rejects.toMatchObject({ code: 'UNSAFE_URL' })
    expect(fetch).not.toHaveBeenCalled()

    const redirectFetch = vi.fn<FetchLike>(async () => text('', {}, 302))
    redirectFetch.mockImplementation(async () => new Response(null, { status: 302, headers: { location: 'https://internal.example/path?token=do-not-print' } }))
    const redirectHttp = new SafeHttp({
      fetch: redirectFetch,
      lookup: async hostname => [{ address: hostname === 'internal.example' ? '127.0.0.1' : '93.184.216.34', family: 4 }],
    })
    const failure = await redirectHttp.request('https://public.example/start').catch((error: unknown) => error)
    expect(failure).toMatchObject({ code: 'UNSAFE_URL' })
    expect(String(failure)).not.toContain('do-not-print')
    expect(redirectFetch).toHaveBeenCalledTimes(1)
  })

  it('enforces byte limits and timeouts without exposing response bodies', async () => {
    const large = new SafeHttp({ fetch: async () => text('secret-body'), lookup: publicLookup, maxBytes: 4 })
    const tooLarge = await large.request('https://example.com/secret?token=hidden').catch((error: unknown) => error)
    expect(tooLarge).toMatchObject({ code: 'HTTP_TOO_LARGE' })
    expect(String(tooLarge)).not.toContain('secret-body')
    expect(String(tooLarge)).not.toContain('hidden')

    const slowFetch: FetchLike = async (_url, init) => new Promise((_resolve, reject) => {
      init.signal?.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')))
    })
    const slow = new SafeHttp({ fetch: slowFetch, lookup: publicLookup, timeoutMs: 5 })
    await expect(slow.request('https://example.com/slow')).rejects.toMatchObject({ code: 'TIMEOUT' })
  })
})

describe('real provider response normalization with mocked transport', () => {
  it('normalizes Yahoo quote, history and FX without credentials', async () => {
    const urls: string[] = []
    const fetch: FetchLike = async url => {
      urls.push(url.toString())
      if (url.searchParams.get('range') === '1mo') {
        return json({ chart: { result: [{ meta: { symbol: 'AAPL', currency: 'USD' }, timestamp: [1767225600, 1767312000], indicators: { quote: [{ open: [10, 11], high: [12, 13], low: [9, 10], close: [11, 12], volume: [100, 120] }], adjclose: [{ adjclose: [10.5, 11.5] }] } }], error: null } })
      }
      const symbol = decodeURIComponent(url.pathname.split('/').at(-1) ?? '')
      return json({ chart: { result: [{ meta: { symbol, currency: symbol.endsWith('=X') ? 'USD' : 'USD', regularMarketPrice: 123.45, regularMarketTime: 1767312000, regularMarketVolume: 1000, longName: 'Apple Inc.', fiftyTwoWeekHigh: 150, firstTradeDate: 345479400 } }], error: null } })
    }
    const data = plane(fetch)
    const quote = await data.fetch({ source: 'yahoo', kind: 'quote', symbol: 'AAPL' })
    expect(quote.dryRun).toBe(true)
    expect(quote.items[0]).toMatchObject({ provider: 'yahoo', title: 'AAPL quote', availableAt: '2026-01-02T00:00:00.000Z' })
    expect(quote.items[0]?.contentHash).toMatch(/^sha256:/)
    expect(quote.items[0]?.data).toMatchObject({ regularMarketPrice: 123.45, longName: 'Apple Inc.', fiftyTwoWeekHigh: 150, firstTradeDate: 345479400 })
    expect(quote.items[0]?.data).not.toHaveProperty('postMarketPrice')
    expect(quote.items[0]?.provenance).toMatchObject({ endpoint: 'v8/finance/chart', priceBasis: 'regularMarketPrice, unadjusted' })

    const history = await data.fetch({ source: 'yahoo', kind: 'history', symbol: 'AAPL' })
    expect(history.items[0]).toMatchObject({
      availableAt: now,
      data: { bars: [{ adjustedClose: 10.5 }, { adjustedClose: 11.5 }] },
    })
    const fx = await data.fetch({ source: 'yahoo', kind: 'fx', from: 'EUR', to: 'USD' })
    expect(fx.items[0]).toMatchObject({
      title: 'EURUSD=X FX rate',
      availableAt: '2026-01-02T00:00:00.000Z',
      data: { symbol: 'EURUSD=X', currency: 'USD', regularMarketPrice: 123.45, regularMarketTime: '2026-01-02T00:00:00.000Z' },
      provenance: { endpoint: 'v8/finance/chart', priceBasis: 'regularMarketPrice, unadjusted' },
    })
    expect(urls.join('\n')).toContain('EURUSD%3DX')
    expect(urls.every(url => !/api.?key|token|cookie/i.test(url))).toBe(true)
  })

  describe('Yahoo history explicit UTC window', () => {
    const fetchedAt = '2026-11-01T12:00:00.000Z'
    const dailyBars = [
      { timestamp: '2026-10-28T23:59:59.000Z', open: 0.10, high: 0.12, low: 0.09, close: 0.11, volume: 100, adjustedClose: 0.105 },
      { timestamp: '2026-10-29T00:00:00.000Z', open: 0.20, high: 0.22, low: 0.19, close: 0.21, volume: 200, adjustedClose: 0.205 },
      { timestamp: '2026-10-30T00:00:00.000Z', open: 0.30, high: 0.32, low: 0.29, close: 0.31, volume: 300, adjustedClose: 0.305 },
      { timestamp: '2026-10-31T00:00:00.000Z', open: 0.40, high: 0.42, low: 0.39, close: 0.41, volume: 400, adjustedClose: 0.405 },
      { timestamp: '2026-10-31T00:00:01.000Z', open: 0.50, high: 0.52, low: 0.49, close: 0.51, volume: 500, adjustedClose: 0.505 },
    ]
    const subsecondBars = dailyBars.map((bar, index) => ({ ...bar, timestamp: [
      '2026-10-29T00:00:00.000Z', '2026-10-29T00:00:00.250Z', '2026-10-29T00:00:00.500Z',
      '2026-10-29T00:00:00.750Z', '2026-10-29T00:00:01.000Z',
    ][index]! }))
    function historyPlane(bars: readonly (typeof dailyBars)[number][], urls: URL[]) {
      const fetch: FetchLike = async url => {
        urls.push(url)
        return json({ chart: { result: [{
          meta: { symbol: 'DOGE-USD', currency: 'USD', exchangeName: 'CCC' },
          timestamp: bars.map(bar => Date.parse(bar.timestamp) / 1000),
          indicators: {
            quote: [{ open: bars.map(bar => bar.open), high: bars.map(bar => bar.high), low: bars.map(bar => bar.low), close: bars.map(bar => bar.close), volume: bars.map(bar => bar.volume) }],
            adjclose: [{ adjclose: bars.map(bar => bar.adjustedClose) }],
          },
        }], error: null } })
      }
      return new FinanceDataPlane({}, { fetch, lookup: publicLookup, now: () => fetchedAt })
    }

    it.each([
      { label: 'date-only bounds', start: '2026-10-29', end: '2026-10-31', bars: dailyBars, expected: [dailyBars[1], dailyBars[2]], period1: '1793232000', period2: '1793404800' },
      { label: 'equivalent offset ISO bounds', start: '2026-10-28T19:00:00-05:00', end: '2026-10-31T09:00:00+09:00', bars: dailyBars, expected: [dailyBars[1], dailyBars[2]], period1: '1793232000', period2: '1793404800' },
      { label: 'subsecond offset bounds', start: '2026-10-29T08:00:00.250+08:00', end: '2026-10-28T19:00:00.750-05:00', bars: subsecondBars, expected: [subsecondBars[1], subsecondBars[2]], period1: '1793232000', period2: '1793232001' },
    ])('keeps only [start,end) bars for $label without shifting observation fields', async ({ start, end, bars, expected, period1, period2 }) => {
      const urls: URL[] = []
      const result = await historyPlane(bars, urls).fetch({ source: 'yahoo', kind: 'history', symbol: 'DOGE-USD', start, end, interval: '1d' })
      expect(urls[0]?.searchParams.get('period1')).toBe(period1)
      expect(urls[0]?.searchParams.get('period2')).toBe(period2)
      expect(urls[0]?.searchParams.has('range')).toBe(false)
      expect(result.errors).toEqual([])
      expect(result.items).toHaveLength(1)
      const item = result.items[0]!
      expect(item.data).toEqual({ symbol: 'DOGE-USD', currency: 'USD', exchangeName: 'CCC', bars: expected })
      expect(JSON.parse(item.content)).toEqual(item.data)
      expect(item).toMatchObject({ availableAt: fetchedAt, fetchedAt, asOf: fetchedAt, provenance: {
        observationAt: fetchedAt, publicationAt: null, barTimestampBasis: 'Yahoo timestamp is the bar start',
      } })
    })

    it('preserves all timestamped bars for a preset range without explicit bounds', async () => {
      const urls: URL[] = []
      const result = await historyPlane(dailyBars, urls).fetch({ source: 'yahoo', kind: 'history', symbol: 'DOGE-USD', range: '1mo', interval: '1d' })
      expect(urls[0]?.searchParams.get('range')).toBe('1mo')
      expect(urls[0]?.searchParams.has('period1')).toBe(false)
      expect(urls[0]?.searchParams.has('period2')).toBe(false)
      expect(result.items[0]?.data).toEqual({ symbol: 'DOGE-USD', currency: 'USD', exchangeName: 'CCC', bars: dailyBars })
    })

    it('returns UNAVAILABLE when every returned bar is outside the explicit window', async () => {
      const data = historyPlane([dailyBars[0]!, dailyBars[3]!, dailyBars[4]!], [])
      await expect(data.fetch({ source: 'yahoo', kind: 'history', symbol: 'DOGE-USD', start: '2026-10-29', end: '2026-10-31' })).rejects.toMatchObject({ code: 'UNAVAILABLE' })
    })

    it('retains the existing UNAVAILABLE contract for an empty upstream history', async () => {
      const data = historyPlane([], [])
      await expect(data.fetch({ source: 'yahoo', kind: 'history', symbol: 'DOGE-USD', start: '2026-10-29', end: '2026-10-31' })).rejects.toMatchObject({ code: 'UNAVAILABLE' })
    })
  })

  it.each([
    { interval: '1m', timestamp: 1768003140, iso: '2026-01-09T23:59:00.000Z', adjustedClose: 103.25 },
    { interval: '1d', timestamp: 1767969000, iso: '2026-01-09T14:30:00.000Z', adjustedClose: 102.5 },
    { interval: '1wk', timestamp: 1767623400, iso: '2026-01-05T14:30:00.000Z', adjustedClose: 101.75 },
    { interval: '1mo', timestamp: 1767364200, iso: '2026-01-02T14:30:00.000Z', adjustedClose: 100.5 },
  ])('uses fetchedAt for Yahoo $interval history with an unfinished last bar', async ({ interval, timestamp, iso, adjustedClose }) => {
    const urls: URL[] = []
    const fetch: FetchLike = async url => {
      urls.push(url)
      return json({
        chart: {
          result: [{
            meta: {
              symbol: 'AUDIT',
              currency: 'USD',
              exchangeName: 'NMS',
              exchangeTimezoneName: 'America/New_York',
              regularMarketTime: timestamp,
              currentTradingPeriod: {
                pre: { timezone: 'EST', start: 1767963600, end: 1767969000, gmtoffset: -18000 },
                regular: { timezone: 'EST', start: 1767969000, end: 1767992400, gmtoffset: -18000 },
                post: { timezone: 'EST', start: 1767992400, end: 1768003200, gmtoffset: -18000 },
              },
              dataGranularity: interval,
            },
            timestamp: [timestamp],
            indicators: {
              quote: [{ open: [100], high: [105], low: [99], close: [104], volume: [12345] }],
              adjclose: [{ adjclose: [adjustedClose] }],
            },
          }],
          error: null,
        },
      })
    }
    const history = await plane(fetch).fetch({
      source: 'yahoo', kind: 'history', symbol: 'AUDIT', range: '1mo', interval,
    })
    const item = history.items[0]

    expect(urls[0]?.searchParams.get('interval')).toBe(`${interval}`)
    expect(item).toMatchObject({
      availableAt: now,
      fetchedAt: now,
      asOf: now,
      data: {
        symbol: 'AUDIT',
        currency: 'USD',
        exchangeName: 'NMS',
        bars: [{ timestamp: iso, open: 100, high: 105, low: 99, close: 104, volume: 12345, adjustedClose }],
      },
      provenance: {
        endpoint: 'v8/finance/chart',
        observationAt: now,
        publicationAt: null,
        availableAtBasis: 'observation of the returned payload; historical publication is not established',
        barTimestampBasis: 'Yahoo timestamp is the bar start',
        adjustment: 'provider adjustedClose and unadjusted OHLC retained separately; adjustedClose may be retrospective',
      },
    })
    expect(item?.availableAt).not.toBe(iso)
    expect(item?.content).toContain(`"timestamp":"${iso}"`)
  })

  it('requires SEC contact and uses ticker plus XBRL responses with the configured User-Agent', async () => {
    const unconfigured = plane(async () => json({}))
    await expect(unconfigured.fetch({ source: 'sec', kind: 'ticker', symbol: 'AAPL' })).rejects.toMatchObject({ code: 'NOT_CONFIGURED' })

    const userAgents: string[] = []
    const fetch: FetchLike = async (url, init) => {
      userAgents.push(String((init.headers as Record<string, string>)['user-agent']))
      expect(init.headers).not.toHaveProperty('authorization')
      expect(init.headers).not.toHaveProperty('cookie')
      if (url.hostname === 'www.sec.gov') {
        return json({ '0': { cik_str: 320193, ticker: 'AAPL', title: 'Apple Inc.' } }, { 'last-modified': 'Wed, 31 Dec 2025 00:00:00 GMT' })
      }
      expect(url.pathname).toBe('/api/xbrl/companyconcept/CIK0000320193/us-gaap/Revenues.json')
      return json({ entityName: 'Apple Inc.', units: { USD: [{ end: '2025-12-31', filed: '2026-01-05', val: 100, form: '10-K' }] } })
    }
    const data = plane(fetch, { secContact: 'research@example.com' })
    const ticker = await data.fetch({ source: 'sec', kind: 'ticker', symbol: 'AAPL' })
    expect(ticker.items[0]?.data).toEqual([{ cik_str: 320193, ticker: 'AAPL', title: 'Apple Inc.' }])
    const xbrl = await data.fetch({ source: 'sec', kind: 'xbrl', symbol: 'AAPL', fact: 'Revenues' })
    expect(xbrl.items[0]?.availableAt).toBe('2026-01-05T00:00:00.000Z')
    expect(userAgents.every(agent => agent.includes('research@example.com'))).toBe(true)
  })

  it('restricts OpenBB routes and runs AlphaSift only with fixed no-LLM CLI flags', async () => {
    const requested: URL[] = []
    const fetch: FetchLike = async url => {
      requested.push(url)
      return json({ results: [{ date: '2026-01-09T00:00:00Z', close: 123 }] })
    }
    const data = new FinanceDataPlane({ openbbBaseUrl: 'http://localhost:8000' }, { fetch, lookup: localLookup, now: () => now })
    const result = await data.fetch({ source: 'openbb', route: '/api/v1/equity/price/quote', query: { symbol: 'AAPL' } })
    expect(result.items[0]?.provider).toBe('openbb')
    expect(requested[0]?.origin).toBe('http://localhost:8000')
    await expect(data.fetch({ source: 'openbb', route: '/api/v1/orders/submit' })).rejects.toMatchObject({ code: 'ROUTE_NOT_ALLOWED' })

    const execFile = vi.fn<ExecFileLike>(async () => ({ stdout: '{"rows":[{"symbol":"AAPL"}]}', stderr: '' }))
    const cli = plane(async () => json({}), { alphaSiftPath: '/mock/alphasift' }, execFile)
    const screened = await cli.fetch({ source: 'alphasift', args: ['screen', 'AAPL'] })
    expect(screened.items[0]?.canonicalUrl).toMatch(/^alphasift:\/\/screen\//)
    expect(execFile).toHaveBeenCalledWith('/mock/alphasift', ['screen', 'AAPL', '--no-llm', '--no-post-analysis'], expect.objectContaining({ encoding: 'utf8' }))
    const options = execFile.mock.calls[0]?.[2]
    expect(options?.env).not.toHaveProperty('OPENAI_API_KEY')
    expect(options).not.toHaveProperty('shell')
  })

  it('parses RSS, Atom and OPML while isolating one failed feed', async () => {
    const rss = `<?xml version="1.0"?><rss version="2.0"><channel><item><title>Market &amp; Company</title><link>https://news.example.com/story?utm_source=rss&amp;id=7</link><pubDate>Wed, 31 Dec 2025 12:00:00 GMT</pubDate><description><![CDATA[<p>Original <b>body</b></p>]]></description></item></channel></rss>`
    const atom = `<?xml version="1.0"?><feed xmlns="http://www.w3.org/2005/Atom"><entry><title>Second source</title><link rel="alternate" href="https://two.example.com/entry"/><updated>2026-01-02T00:00:00Z</updated><content>Atom body</content></entry></feed>`
    const opml = `<opml version="2.0"><body><outline text="Two" xmlUrl="https://two.example.com/feed"/><outline text="Broken" xmlUrl="https://broken.example.com/feed"/></body></opml>`
    const fetch: FetchLike = async url => {
      if (url.hostname === 'news.example.com') return text(rss, { 'content-type': 'application/rss+xml' })
      if (url.hostname === 'two.example.com') return text(atom, { 'content-type': 'application/atom+xml' })
      if (url.hostname === 'broken.example.com') return text('failure containing token=hidden', {}, 503)
      if (url.hostname === 'list.example.com') return text(opml, { 'content-type': 'text/x-opml' })
      throw new Error('unexpected')
    }
    const data = plane(fetch)
    const feed = await data.fetch({ source: 'rss', url: 'https://news.example.com/rss' })
    expect(feed.items[0]).toMatchObject({ canonicalUrl: 'https://news.example.com/story?id=7', title: 'Market & Company', content: 'Original body' })
    const batch = await data.fetch({ source: 'opml', url: 'https://list.example.com/opml' })
    expect(batch.items).toHaveLength(1)
    expect(batch.items[0]?.title).toBe('Second source')
    expect(batch.errors).toHaveLength(1)
    expect(batch.errors[0]?.code).toBe('UNAVAILABLE')
    expect(batch.errors[0]?.message).not.toContain('hidden')
  })

  it('retrieves YouTube feed and timedtext segments without Cookie or invented transcript', async () => {
    const player = {
      videoDetails: { title: 'Public earnings call' },
      microformat: { playerMicroformatRenderer: { publishDate: '2026-01-03' } },
      captions: { playerCaptionsTracklistRenderer: { captionTracks: [{ baseUrl: 'https://www.youtube.com/api/timedtext?v=abc123xyz&lang=en', languageCode: 'en', kind: 'asr' }] } },
    }
    const headers: RequestInit['headers'][] = []
    const fetch: FetchLike = async (url, init) => {
      headers.push(init.headers)
      if (url.pathname === '/watch') return text(`<script>var ytInitialPlayerResponse = ${JSON.stringify(player)};</script>`, { 'content-type': 'text/html' })
      if (url.pathname === '/api/timedtext') {
        expect(url.searchParams.get('fmt')).toBe('json3')
        return json({ events: [
          { tStartMs: 1000, dDurationMs: 2500, segs: [{ utf8: 'Revenue ' }, { utf8: 'grew.' }] },
          { tStartMs: 4000, dDurationMs: 1000, segs: [{ utf8: 'Margins held.' }] },
        ] })
      }
      if (url.pathname === '/feeds/videos.xml') {
        return text(`<feed xmlns="http://www.w3.org/2005/Atom" xmlns:yt="http://www.youtube.com/xml/schemas/2015"><entry><yt:videoId>abc123xyz</yt:videoId><title>Video</title><link rel="alternate" href="https://www.youtube.com/watch?v=abc123xyz"/><published>2026-01-03T00:00:00Z</published><content>Description</content></entry></feed>`, { 'content-type': 'application/atom+xml' })
      }
      throw new Error('unexpected')
    }
    const data = plane(fetch)
    const transcript = await data.fetch({ source: 'youtube', kind: 'transcript', videoId: 'abc123xyz', lang: 'en' })
    expect(transcript.items[0]?.segments).toHaveLength(2)
    expect(transcript.items[0]?.segments?.[0]).toMatchObject({ segmentId: 'seg-0001', speaker: 'Unknown', startSeconds: 1, endSeconds: 3.5, text: 'Revenue grew.', deepLink: 'https://www.youtube.com/watch?v=abc123xyz&t=1s' })
    expect(transcript.items[0]?.provenance).toMatchObject({ cookie: false, automaticCaptions: true })
    const feed = await data.fetch({ source: 'youtube', kind: 'feed', channelId: 'UC123456' })
    expect(feed.items[0]?.canonicalUrl).toBe('https://www.youtube.com/watch?v=abc123xyz')
    for (const header of headers) expect(header).not.toHaveProperty('cookie')
  })
})
