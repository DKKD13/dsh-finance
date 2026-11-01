import { chmod, readFile, writeFile } from 'node:fs/promises'
import { createServer } from 'node:http'
import { join } from 'node:path'
import { Context } from '@deepseek-ai/cordis'
import { afterEach, describe, expect, it } from 'vitest'
import { FinanceService } from '../../src/finance/service.ts'
import { ResearchGraphService, resolveConfig } from '../../src/service.ts'
import { makeTempDir } from './fixtures.ts'

const cleanups: (() => Promise<void>)[] = []
afterEach(async () => {
  while (cleanups.length > 0) await cleanups.pop()?.()
})

describe('pure-local real HTTP and CLI integration', () => {
  it('fetches localhost OpenBB and executes a real no-LLM CLI fixture in one atomic graph revision', async () => {
    const requests: string[] = []
    const server = createServer((request, response) => {
      requests.push(request.url ?? '')
      if (request.url?.startsWith('/api/v1/equity/price/quote?')) {
        response.writeHead(200, { 'content-type': 'application/json' })
        response.end(JSON.stringify({ results: [{ date: '2026-01-09T00:00:00Z', symbol: 'AAA', close: 123.45 }] }))
      } else {
        response.writeHead(404)
        response.end()
      }
    })
    await new Promise<void>((resolve, reject) => {
      server.once('error', reject)
      server.listen(0, '127.0.0.1', () => resolve())
    })
    cleanups.push(async () => { await new Promise<void>(resolve => server.close(() => resolve())) })
    const address = server.address()
    if (address === null || typeof address === 'string') throw new Error('missing local test port')

    const temp = await makeTempDir('finance-local')
    cleanups.push(temp.cleanup)
    const cli = join(temp.dir, 'alphasift-fixture')
    await writeFile(cli, `#!/usr/bin/env node\nconsole.log(JSON.stringify({ args: process.argv.slice(2), rows: [{ symbol: 'AAA', score: 1 }] }))\n`, 'utf8')
    await chmod(cli, 0o755)

    const at = '2026-01-10T00:00:00.000Z'
    const ctx = new Context()
    const config = resolveConfig({
      dataDir: join(temp.dir, 'data'), autoIndexSkills: false,
      openbbBaseUrl: `http://127.0.0.1:${address.port}`, alphaSiftPath: cli,
    }, join(temp.dir, 'skills'))
    const graph = new ResearchGraphService(ctx, config)
    const finance = new FinanceService(ctx, graph, config, { now: () => at })
    const result = await finance.fetchSources({
      asOf: at, runId: 'pure-local-run', dryRun: false,
      requests: [
        { source: 'openbb', route: '/api/v1/equity/price/quote', query: { symbol: 'AAA' } },
        { source: 'alphasift', args: ['screen', 'AAA'] },
      ],
    })
    expect(result).toMatchObject({ revision: 1, changed: true, dryRun: false, errors: [], counts: { accepted: 2 } })
    expect(requests).toEqual(['/api/v1/equity/price/quote?symbol=AAA'])
    const snapshot = await graph.snapshot()
    expect(snapshot.nodes.map(node => node.kind).sort()).toEqual(['raw', 'raw', 'session', 'source', 'source'])
    expect(snapshot.edges).toHaveLength(6)
    const cliRaw = snapshot.nodes.find(node => node.kind === 'raw' && node.metadata.provider === 'alphasift')
    expect(cliRaw?.metadata.data).toMatchObject({ args: ['screen', 'AAA', '--no-llm', '--no-post-analysis'] })
    expect(cliRaw?.metadata.provenance).toMatchObject({ shell: false, llm: false, postAnalysis: false })
    const persisted = JSON.parse(await readFile(join(temp.dir, 'data', 'graph.json'), 'utf8')) as { revision: number; history: { op: string }[] }
    expect(persisted.revision).toBe(1)
    expect(persisted.history.map(entry => entry.op)).toEqual(['finance.source.ingest'])
  })
})
