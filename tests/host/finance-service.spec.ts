import { createHash } from 'node:crypto'
import { join } from 'node:path'
import { Context } from '@deepseek-ai/cordis'
import { afterEach, describe, expect, it } from 'vitest'
import { FinanceService } from '../../src/finance/service.ts'
import { executeFinanceRequest, FINANCE_OPS } from '../../src/finance/protocol.ts'
import { ResearchGraphService, resolveConfig } from '../../src/service.ts'
import { executeGraphRequest } from '../../src/protocol.ts'
import type { JsonValue } from '../../src/graph.ts'
import type { DcfInput, FinanceMetadataInput, PortfolioInput, PredictionInput } from '../../src/finance/types.ts'
import type { GraphPlan } from '../../src/plan.ts'
import { makeTempDir } from './fixtures.ts'

const cleanups: (() => Promise<void>)[] = []
afterEach(async () => {
  while (cleanups.length > 0) await cleanups.pop()?.()
})

const at = '2026-01-10T00:00:00.000Z'
function meta(runId: string, asOf = at): FinanceMetadataInput {
  return { provider: 'fixture.external', asOf, availableAt: asOf, fetchedAt: asOf, runId, provenance: { sourceRefs: [`fixture://${runId}`] } }
}

async function setup() {
  const temp = await makeTempDir('finance')
  cleanups.push(temp.cleanup)
  const ctx = new Context()
  const config = resolveConfig({ dataDir: join(temp.dir, 'data'), autoIndexSkills: false }, join(temp.dir, 'skills'))
  const graph = new ResearchGraphService(ctx, config)
  const finance = new FinanceService(ctx, graph)
  return { temp, ctx, graph, finance, config }
}

function marketInput(runId = 'market-1') {
  return {
    instrument: { id: 'instrument:a', title: 'A Corp', symbol: 'AAA', currency: 'USD', metadata: meta(runId) },
    data: { price: 123.45, volume: 1000, currency: 'USD' },
  }
}

function dcfInput(): DcfInput {
  return {
    instrument: marketInput('dcf-instrument').instrument,
    currency: 'USD',
    units: { financials: 'millions', shares: 'millions' },
    sharesOutstanding: 10,
    scenarios: [{
      name: 'base', probability: 1, wacc: 0.1, terminalGrowth: 0.02, taxRate: 0.2,
      incomeStatement: { revenue: [1000], ebit: [100] },
      cashFlowStatement: { depreciation: [10], capitalExpenditure: [20], workingCapitalChange: [5] },
      balanceSheet: { netDebt: 100 },
    }],
    metadata: meta('dcf-run'),
  }
}

function portfolioInput(): PortfolioInput {
  return {
    portfolio: { id: 'portfolio:p', title: 'P', metadata: meta('portfolio-meta') },
    baseCurrency: 'USD', asOf: at, metadata: meta('portfolio-run'),
    positions: [{
      id: 'position:p', quantity: 2, price: 100, costBasisPerUnit: 80, metadata: meta('position-run'),
      instrument: { id: 'instrument:eur', title: 'EUR Co', currency: 'EUR', metadata: meta('instrument-run') },
    }],
    fx: [{ from: 'EUR', to: 'USD', rate: 1.2, asOf: at, availableAt: at, provider: 'fixture.fx' }],
  }
}

const legacyYahooSource = 'source:legacy-yahoo-history'
const legacyYahooRaw = 'raw:legacy-yahoo-history'
const legacyYahooBarAt = '2026-01-01T00:00:00.000Z'
const legacyYahooFetchedAt = '2026-01-03T00:00:00.000Z'
const legacyYahooHash = 'sha256:legacy-yahoo-history'

function legacyYahooHistoryPlan(): GraphPlan {
  const provenance = {
    endpoint: 'v8/finance/chart',
    adjustment: 'provider adjustedClose and unadjusted OHLC retained separately',
    rawId: legacyYahooRaw,
  }
  return {
    nodes: [
      {
        id: legacyYahooSource, kind: 'source', title: 'AAPL historical prices', content: 'https://query1.finance.yahoo.com/v8/finance/chart/AAPL?interval=1d&range=1d',
        metadata: {
          provider: 'yahoo', asOf: legacyYahooBarAt, availableAt: legacyYahooBarAt, fetchedAt: legacyYahooFetchedAt,
          contentHash: legacyYahooHash, provenance,
        },
      },
      {
        id: legacyYahooRaw, kind: 'raw', title: 'AAPL historical prices — raw', content: '{"bars":[]}',
        metadata: {
          provider: 'yahoo', asOf: legacyYahooBarAt, availableAt: legacyYahooBarAt, fetchedAt: legacyYahooFetchedAt,
          contentHash: legacyYahooHash, provenance,
          sourceId: legacyYahooSource, data: { bars: [] },
        },
      },
      {
        id: 'claim:legacy-yahoo', kind: 'claim', title: 'Legacy Yahoo evidence claim', content: 'Uses the historical response.',
        metadata: { availableAt: legacyYahooBarAt, asOf: legacyYahooBarAt, references: [legacyYahooSource, legacyYahooRaw] },
      },
    ],
    edges: [],
  }
}

describe('FinanceService local host integration', () => {
  it('rejects malformed market instrument envelopes without an internal error or graph write', async () => {
    const { finance, graph } = await setup()
    const valid = marketInput()
    for (const instrument of [undefined, null, [], {}, { ...valid.instrument, id: '' }, { ...valid.instrument, title: '' }, { ...valid.instrument, metadata: null }]) {
      const input = JSON.parse(JSON.stringify({ instrument, data: valid.data })) as JsonValue
      const response = await executeFinanceRequest(finance, { op: 'market.ingest', input })
      expect(response.ok).toBe(false)
      expect(response.ok === false && response.error.code).toBe('INVALID_MARKET_DATA')
      expect(await graph.currentRevision()).toBe(0)
      expect((await graph.snapshot()).nodes).toHaveLength(0)
    }
    const existing = await executeFinanceRequest(finance, { op: 'market.ingest', input: valid })
    expect(existing.ok).toBe(true)
    const saved = await graph.getNode(valid.instrument.id)
    const invalid = await executeFinanceRequest(finance, { op: 'market.ingest', input: { data: { price: 1 } } })
    expect(invalid.ok).toBe(false)
    expect(await graph.currentRevision()).toBe(1)
    expect(await graph.getNode(valid.instrument.id)).toEqual(saved)
  })

  it('preserves legacy currency values and optional instrument fields on market ingest', async () => {
    const { finance, graph } = await setup()
    const { provider, asOf, availableAt, fetchedAt } = meta('legacy')
    const response = await executeFinanceRequest(finance, { op: 'market.ingest', input: {
      instrument: { id: 'instrument:legacy', title: 'Legacy observation', currency: '', metadata: { provider, asOf, availableAt, fetchedAt } },
      data: { observed: 1 },
    } })
    expect(response.ok).toBe(true)
    expect((await graph.getNode('instrument:legacy'))?.metadata).toMatchObject({ currency: '', symbol: 'Legacy observation' })
  })

  it('requires a real fetch request and ingests external structured data idempotently', async () => {
    const { finance, graph } = await setup()
    const fetch = await executeFinanceRequest(finance, { op: 'market.fetch' })
    expect(fetch.ok).toBe(false)
    expect(fetch.ok === false && fetch.error.code).toBe('INVALID_REQUEST')
    expect(await graph.currentRevision()).toBe(0)

    const first = await executeFinanceRequest(finance, { op: 'market.ingest', input: marketInput() })
    expect(first.ok).toBe(true)
    expect(first.ok && first.revision).toBe(1)
    const replay = await executeFinanceRequest(finance, { op: 'market.ingest', input: marketInput() })
    expect(replay.ok && replay.revision).toBe(1)
    expect(replay.ok && JSON.stringify(replay.result)).toContain('"changed":false')
    const instrument = await graph.getNode('instrument:a')
    expect(instrument?.metadata).toMatchObject({ provider: 'fixture.external', asOf: at, availableAt: at, fetchedAt: at, runId: 'market-1' })
    expect(instrument?.metadata.contentHash).toMatch(/^sha256:/)
    expect(instrument?.metadata.marketData).toMatchObject({ price: 123.45 })
    expect(FINANCE_OPS).toHaveLength(28)
    expect(FINANCE_OPS).toEqual(expect.arrayContaining(['fund.state', 'fund.configure', 'fund.researcher', 'fund.advance']))
  })

  it('persists one DCF run as one revision and restores it after restart', async () => {
    const { finance, graph, temp, config } = await setup()
    const first = await finance.dcf(dcfInput())
    expect(first.revision).toBe(1)
    expect(first.result.weighted.perShare).toBe(71.25)
    expect(first.changed).toBe(true)
    expect((await graph.snapshot()).nodes).toHaveLength(2)
    expect((await graph.snapshot()).edges[0]?.kind).toBe('values')
    expect((await finance.dcf(dcfInput())).revision).toBe(1)
    expect((await graph.revisions()).map(entry => entry.op)).toEqual(['finance.model.dcf'])

    const reopenedGraph = new ResearchGraphService(new Context(), config)
    const reopenedFinance = new FinanceService(new Context(), reopenedGraph)
    const restored = await reopenedGraph.getNode(first.valuationId)
    expect(restored?.metadata.contentHash).toMatch(/^sha256:/)
    expect((await reopenedFinance.stats()).revision).toBe(1)
    expect(temp.dir).toBeTruthy()
  })

  it('fails closed before portfolio persistence when FX is absent, then writes one atomic snapshot', async () => {
    const { finance, graph } = await setup()
    const invalid = portfolioInput()
    invalid.fx = []
    await expect(finance.portfolio(invalid)).rejects.toMatchObject({ code: 'MISSING_FX' })
    expect(await graph.currentRevision()).toBe(0)
    expect((await graph.snapshot()).nodes).toHaveLength(0)

    const result = await finance.portfolio(portfolioInput())
    expect(result.revision).toBe(1)
    expect(result.result.totals.marketValue).toBe(240)
    const snapshot = await graph.snapshot()
    expect(snapshot.nodes.map(node => node.kind).sort()).toEqual(['instrument', 'portfolio', 'position'])
    expect(snapshot.edges.map(edge => edge.kind).sort()).toEqual(['exposure_to', 'holds'])
    expect((await finance.portfolio(portfolioInput())).changed).toBe(false)
    expect(await graph.currentRevision()).toBe(1)
  })

  it.each([-0.1, 1.2, NaN, Infinity, '0.8', null])('prediction input rejects invalid probability %s before writing an embedded catalyst', async (probability) => {
    const { finance, graph, config } = await setup()
    await graph.createNode({ id: 'instrument:existing', kind: 'instrument', title: 'Existing instrument' })
    const before = await graph.snapshot()
    await expect(finance.recordPrediction({
      id: 'prediction:invalid', title: 'Invalid probability', instrumentId: 'instrument:existing',
      catalyst: { id: 'catalyst:uncommitted', title: 'Must not commit', metadata: meta('catalyst') },
      resolutionDate: at, prediction: { probability }, metadata: meta('invalid-prediction'),
    })).rejects.toMatchObject({ code: 'INVALID_PROBABILITY' })
    expect(await graph.snapshot()).toEqual(before)
    expect(await new ResearchGraphService(new Context(), config).snapshot()).toEqual(before)
  })

  it.each([
    '2026-02-30', '2026-02-29', '2026-02-30T00:00:00Z', '2026-02-29T12:00:00+08:00',
    '2026-04-31', '1900-02-29', '2100-02-29', '2026-2-30',
  ])('prediction input rejects nonexistent calendar day %s without any transaction writes', async (resolutionDate) => {
    const { finance, graph, config } = await setup()
    await graph.createNode({ id: 'instrument:existing', kind: 'instrument', title: 'Existing instrument' })
    const before = await graph.snapshot()
    const rejected = await executeFinanceRequest(finance, {
      op: 'memory.record_prediction',
      input: {
        id: 'prediction:invalid-date', title: 'Invalid date', instrumentId: 'instrument:existing',
        catalyst: { id: 'catalyst:uncommitted', title: 'Must not commit', metadata: meta('catalyst') },
        resolutionDate, prediction: { probability: 0.5 }, metadata: meta('invalid-date'),
      },
    })
    expect(rejected).toMatchObject({ ok: false, error: { code: 'INVALID_TIMESTAMP' } })
    expect(await graph.snapshot()).toEqual(before)
    expect(await new ResearchGraphService(new Context(), config).snapshot()).toEqual(before)
  })

  it.each([0, 1, undefined])('prediction input accepts probability %s, including omission', async (probability) => {
    const { finance, graph } = await setup()
    const prediction: PredictionInput['prediction'] = probability === undefined ? {} : { probability }
    const accepted = await executeFinanceRequest(finance, {
      op: 'memory.record_prediction',
      input: { id: 'prediction:valid', title: 'Valid probability', resolutionDate: at, prediction, metadata: meta('valid') },
    })
    expect(accepted).toMatchObject({ ok: true, revision: 1 })
    expect((await graph.getNode('prediction:valid'))?.metadata.prediction).toEqual(prediction)
  })

  it.each([
    '2028-02-29', '2028-02-29T00:00:00.000Z', '2028-02-29T00:15:00+14:00',
    '2028-02-29T23:45:00-05:00', '2026-01-10 00:00:00Z', '2026-2-28',
    '0000-02-29', '0096-02-29', '2000-02-29',
  ])('prediction input preserves supported valid resolutionDate %s', async (resolutionDate) => {
    const { finance, graph } = await setup()
    expect((await finance.recordPrediction({
      id: 'prediction:valid-date', title: 'Valid date', resolutionDate,
      prediction: {}, metadata: meta('valid-date'),
    })).revision).toBe(1)
    expect((await graph.getNode('prediction:valid-date'))?.metadata.resolutionDate).toBe(resolutionDate)
  })

  it('enforces due dates and point-in-time recall, then resolves and evaluates predictions', async () => {
    const { finance, graph } = await setup()
    await finance.ingestMarketData(marketInput())
    await finance.recordPrediction({
      id: 'prediction:p', title: 'A rises', instrumentId: 'instrument:a', resolutionDate: at,
      prediction: { predictedDirection: 'up', predictedValue: 130, probability: 0.8 }, metadata: meta('prediction-run'),
    })
    expect((await finance.recall('2026-01-09T23:59:59.000Z')).count).toBe(0)
    expect((await finance.due('2026-01-09T23:59:59.000Z')).count).toBe(0)
    await expect(finance.resolvePrediction({
      id: 'prediction:p', status: 'resolved', resolvedAt: '2026-01-09T23:59:59.000Z', outcome: { actualDirection: 'up' }, metadata: meta('early', '2026-01-09T23:59:59.000Z'),
    })).rejects.toMatchObject({ code: 'PREDICTION_NOT_DUE' })
    expect(await graph.currentRevision()).toBe(2)

    await finance.recordIssue({
      id: 'memory:future-warning', title: 'Later warning', severity: 'warning', message: 'not visible yet', references: ['instrument:a'], metadata: meta('warning-run', '2026-01-20T00:00:00.000Z'),
    })
    const resolved = await finance.resolvePrediction({
      id: 'prediction:p', status: 'resolved', resolvedAt: at,
      outcome: { actualDirection: 'up', actualValue: 132, actual: true }, metadata: meta('resolution-run'), warnings: ['small forecast miss'],
    })
    expect(resolved.revision).toBe(4)
    const recall = await finance.recall(at)
    expect(recall.count).toBe(1)
    expect(recall.memories[0]?.id).toBe('prediction:p')
    expect(recall.warnings).toBe(1)
    expect(recall.memories[0]?.metadata.predictionMetadata).toMatchObject({ runId: 'prediction-run' })
    const evaluation = await finance.evaluate({ asOf: at })
    expect(evaluation).toMatchObject({ due: 1, resolved: 1, pendingDue: 0, directionalAccuracy: 1, brierCount: 1 })
    expect(evaluation.brierScore).toBeCloseTo(0.04, 12)
    expect(evaluation.calibrationBins[8]).toEqual({
      lower: 0.8, upper: 0.9, count: 1, meanPredictedProbability: 0.8, observedFrequency: 1,
    })
    expect(evaluation.warnings).toContain('small calibration sample: 1 determinate prediction(s); interpret bins cautiously (30+ recommended)')
    expect((await graph.snapshot()).edges.some(edge => edge.kind === 'resolves')).toBe(true)
    expect((await finance.recall('2026-01-20T00:00:00.000Z')).count).toBe(2)
  })

  it('uses only determinate probabilities in ten calibration bins, including exact boundaries', async () => {
    const { finance, graph } = await setup()
    const cases = [
      { id: 'zero', probability: 0, actual: false as JsonValue },
      { id: 'low', probability: 0.05, actual: false as JsonValue },
      { id: 'boundary', probability: 0.1, actual: true as JsonValue },
      { id: 'decimal-boundary', probability: 0.3, actual: true as JsonValue },
      { id: 'one', probability: 1, actual: false as JsonValue },
      { id: 'indeterminate', probability: 0.5, actual: 'indeterminate' as JsonValue },
      { id: 'out-of-range', probability: 1.2, actual: true as JsonValue },
    ]
    for (const item of cases) {
      const prediction: PredictionInput = {
        id: `prediction:${item.id}`, title: item.id, resolutionDate: at,
        prediction: { probability: item.probability }, metadata: meta(`prediction-${item.id}`),
      }
      if (item.id === 'out-of-range') {
        // Restore legacy data directly; new recordPrediction calls reject this probability.
        await graph.createNode({
          id: prediction.id, kind: 'prediction', title: prediction.title, content: JSON.stringify(prediction.prediction),
          metadata: { ...prediction.metadata, status: 'pending', resolutionDate: at, prediction: prediction.prediction, warnings: [], references: [] },
        })
      } else {
        await finance.recordPrediction(prediction)
      }
      await finance.resolvePrediction({
        id: `prediction:${item.id}`, status: 'resolved', resolvedAt: at,
        outcome: { actual: item.actual }, metadata: meta(`resolution-${item.id}`),
      })
    }
    await finance.recordPrediction({
      id: 'prediction:pending', title: 'pending', resolutionDate: at,
      prediction: { probability: 0.5 }, metadata: meta('prediction-pending'),
    })
    await finance.recordPrediction({
      id: 'prediction:error', title: 'error', resolutionDate: at,
      prediction: { probability: 0.5 }, metadata: meta('prediction-error'),
    })
    await finance.resolvePrediction({
      id: 'prediction:error', status: 'error', resolvedAt: at,
      outcome: { actual: true }, metadata: meta('resolution-error'),
    })

    const evaluation = await finance.evaluate({ asOf: at })
    expect(evaluation).toMatchObject({ due: 9, resolved: 7, errors: 1, pendingDue: 1, brierCount: 5 })
    expect(evaluation.brierScore).toBeCloseTo(0.4605, 12)
    expect(evaluation.calibrationBins).toHaveLength(10)
    expect(evaluation.calibrationBins.reduce((total, bin) => total + bin.count, 0)).toBe(5)
    expect(evaluation.calibrationBins[0]).toEqual({
      lower: 0, upper: 0.1, count: 2, meanPredictedProbability: 0.025, observedFrequency: 0,
    })
    expect(evaluation.calibrationBins[1]).toEqual({
      lower: 0.1, upper: 0.2, count: 1, meanPredictedProbability: 0.1, observedFrequency: 1,
    })
    expect(evaluation.calibrationBins[3]).toEqual({
      lower: 0.3, upper: 0.4, count: 1, meanPredictedProbability: 0.3, observedFrequency: 1,
    })
    expect(evaluation.calibrationBins[9]).toEqual({
      lower: 0.9, upper: 1, count: 1, meanPredictedProbability: 1, observedFrequency: 0,
    })
    for (const [index, bin] of evaluation.calibrationBins.entries()) {
      expect(bin).toMatchObject({ lower: index / 10, upper: (index + 1) / 10 })
      if (bin.count === 0) expect(bin).toMatchObject({ meanPredictedProbability: null, observedFrequency: null })
    }
    expect(evaluation.evaluations.find(entry => entry.id === 'prediction:indeterminate')).not.toHaveProperty('brier')
    expect(evaluation.evaluations.find(entry => entry.id === 'prediction:out-of-range')).not.toHaveProperty('brier')
    expect(evaluation.warnings).toEqual([
      '1 due prediction(s) remain unresolved',
      'small calibration sample: 5 determinate prediction(s); interpret bins cautiously (30+ recommended)',
    ])

    const wire = await executeFinanceRequest(finance, { op: 'briefing.evaluate', asOf: at })
    expect(wire.ok).toBe(true)
    if (wire.ok) expect(wire.result).toMatchObject({ brierCount: 5 })
  })

  it('preserves null metrics and explicit empty bins without determinate outcomes', async () => {
    const { finance } = await setup()
    const evaluation = await finance.evaluate({ asOf: at })
    expect(evaluation).toMatchObject({ directionalAccuracy: null, brierScore: null, brierCount: 0, warnings: [] })
    expect(evaluation.calibrationBins).toHaveLength(10)
    for (const bin of evaluation.calibrationBins) {
      expect(bin).toMatchObject({ count: 0, meanPredictedProbability: null, observedFrequency: null })
    }
  })

  it('imports ResearchArtifact evidence with preserved lineage and prepares/records briefings without future leaks', async () => {
    const { finance, graph } = await setup()
    const artifact = {
      artifactType: 'QuantMindEvidenceCard', id: 'claim:evidence', kind: 'claim', claim: 'Margins recover',
      provider: 'quantmind.fixture', asOf: at, availableAt: at, fetchedAt: at,
      contentHash: 'sha256:original-artifact-hash', runId: 'artifact-run',
      provenance: { method: 'QuantMind', sourceRefs: ['fixture://source'] },
      sourceRefs: [{ url: 'https://example.invalid/filing', title: 'Filing' }],
      evidence: [{ note: 'reported margin' }],
    }
    const imported = await finance.importArtifacts(artifact)
    expect(imported.revision).toBe(1)
    expect(imported.artifactIds).toEqual(['claim:evidence'])
    expect((await finance.importArtifacts(artifact)).changed).toBe(false)
    const claim = await graph.getNode('claim:evidence')
    expect(claim?.metadata.contentHash).toBe('sha256:original-artifact-hash')
    expect(claim?.metadata.researchArtifact).toMatchObject({ artifactType: 'QuantMindEvidenceCard' })
    expect(claim?.metadata.references).toHaveLength(1)
    expect((await graph.snapshot()).edges[0]?.kind).toBe('cite')

    const before = await finance.prepareBriefing({ asOf: '2026-01-09T00:00:00.000Z' })
    expect(before.cards).toHaveLength(0)
    const prepared = await finance.prepareBriefing({ asOf: at })
    const preparedCards = prepared.cards as { id: string; evidence: { id: string; title?: string }[] }[]
    expect(preparedCards.map(card => card.id)).toContain('claim:evidence')
    expect(preparedCards[0]?.evidence[0]?.title).toBe('Filing')
    expect(prepared.content).toContain('Margins recover')
    const recorded = await finance.recordBriefing({
      id: 'deliverable:brief', title: 'Brief', content: prepared.content, references: ['claim:evidence'], metadata: meta('brief-run'),
    })
    expect(recorded.revision).toBe(2)
    expect((await graph.getNode('deliverable:brief'))?.metadata.references).toEqual(['claim:evidence'])
  })

  it('gates legacy Yahoo history and briefing references at fetchedAt without changing stored lineage', async () => {
    const { finance, graph } = await setup()
    await graph.applyPlan(legacyYahooHistoryPlan(), 'test.fixture', 'legacy Yahoo history')
    const before = await graph.snapshot()
    const beforeNodes = new Map(before.nodes.map(node => [node.id, node]))

    const earlySearch = await finance.search('AAPL historical prices', {
      asOf: '2026-01-02T00:00:00.000Z', kinds: ['source', 'raw'],
    })
    expect(earlySearch.hits).toEqual([])
    const earlyBriefing = await finance.prepareBriefing({
      asOf: '2026-01-02T00:00:00.000Z', kinds: ['claim'], query: 'Legacy Yahoo evidence',
    })
    expect(earlyBriefing.cards).toHaveLength(1)
    expect(earlyBriefing.cards[0]?.evidence).toEqual([])

    const currentSearch = await finance.search('AAPL historical prices', {
      asOf: legacyYahooFetchedAt, kinds: ['source', 'raw'],
    })
    expect(currentSearch.hits).toHaveLength(2)
    expect(currentSearch.hits.every(hit => hit.node.metadata.availableAt === legacyYahooFetchedAt)).toBe(true)
    const currentBriefing = await finance.prepareBriefing({
      asOf: legacyYahooFetchedAt, kinds: ['claim'], query: 'Legacy Yahoo evidence',
    })
    expect(currentBriefing.cards[0]?.evidence).toEqual([
      { id: legacyYahooSource, title: 'AAPL historical prices', contentHash: legacyYahooHash, availableAt: legacyYahooFetchedAt },
      { id: legacyYahooRaw, title: 'AAPL historical prices — raw', contentHash: legacyYahooHash, availableAt: legacyYahooFetchedAt },
    ])

    const after = await graph.snapshot()
    expect(after.revision).toBe(before.revision)
    for (const node of after.nodes) {
      if (node.id === legacyYahooSource || node.id === legacyYahooRaw) expect(node).toEqual(beforeNodes.get(node.id))
    }
  })

  it.each([
    { change: 'metadata-only', content: undefined },
    { change: 'changed body', content: '# Revised calendar\n' },
  ])('rejects a stale deliverable hash for $change without committing any plan changes', async ({ content }) => {
    const { finance, graph, config } = await setup()
    const id = 'deliverable:calendar'
    const original = '# Calendar\n\n2025-11-10 登记日\n'
    const contentHash = `sha256:${createHash('sha256').update(original, 'utf8').digest('hex')}`
    await finance.applyPlan({ nodes: [{ id, kind: 'deliverable', title: 'Calendar', content: original, metadata: { contentHash } }] })
    const before = await graph.snapshot()
    expect((await graph.getNode(id))?.content).toBe(original)

    const rejected = await executeFinanceRequest(finance, {
      op: 'graph.plan',
      plan: {
        nodes: [
          { id: 'claim:uncommitted', kind: 'claim', title: 'Must not commit' },
          {
            id, kind: 'deliverable', title: 'Calendar',
            ...(content === undefined ? {} : { content }),
            metadata: { contentHash, sessionId: 'session:metadata-repair' },
          },
        ],
        edges: [{ from: 'claim:uncommitted', to: id, kind: 'cite' }],
      },
    })
    expect(rejected).toMatchObject({ ok: false, error: { code: 'CONTENT_HASH_MISMATCH' } })
    expect(await graph.snapshot()).toEqual(before)
    const reopenedGraph = new ResearchGraphService(new Context(), config)
    expect(await reopenedGraph.snapshot()).toEqual(before)
  })

  it('accepts complete deliverable upserts and preserves body/hash on a metadata-only node update', async () => {
    const { finance, graph } = await setup()
    const id = 'deliverable:calendar'
    const original = '# Calendar\n\nOriginal date\n'
    await finance.applyPlan({ nodes: [{ id, kind: 'deliverable', title: 'Calendar', content: original }] })
    const content = '# Calendar\n\nCorrected date\n'
    const contentHash = `sha256:${createHash('sha256').update(content, 'utf8').digest('hex')}`
    const plan: GraphPlan = {
      nodes: [{ id, kind: 'deliverable', title: 'Updated calendar', content, metadata: { contentHash, sessionId: 'session:calendar' } }],
    }
    expect((await finance.applyPlan(plan)).revision).toBe(2)
    expect((await finance.applyPlan(plan)).changed).toBe(false)
    const updated = await executeGraphRequest(graph, {
      op: 'node.update', id, patch: { metadata: { ...plan.nodes[0]?.metadata, reviewed: true } },
    })
    expect(updated).toMatchObject({
      ok: true, revision: 3, result: { content, metadata: { contentHash, sessionId: 'session:calendar', reviewed: true } },
    })
  })

  it('fills only missing non-compile deliverable hashes from the actual body and replays after restart', async () => {
    const { finance, graph, config } = await setup()
    const content = '# 研究报告\n\n实际正文 ✅\n'
    const expected = `sha256:${createHash('sha256').update(content, 'utf8').digest('hex')}`
    const plan: GraphPlan = {
      nodes: [
        { id: 'source:external', kind: 'source', title: 'External source', content: 'https://example.com/evidence', metadata: { contentHash: 'sha256:external-source' } },
        { id: 'raw:external', kind: 'raw', title: 'External raw', content: 'Original evidence', metadata: { contentHash: 'sha256:external-raw' } },
        {
          id: 'deliverable:research', kind: 'deliverable', title: 'Research report', content,
          metadata: { provider: 'research', runId: 'research-plan', references: ['source:external', 'raw:external'] },
        },
      ],
      edges: [
        { from: 'deliverable:research', to: 'source:external', kind: 'cite' },
        { from: 'deliverable:research', to: 'raw:external', kind: 'derived_from' },
      ],
    }
    const applied = await executeFinanceRequest(finance, { op: 'graph.plan', plan })
    expect(applied.ok).toBe(true)
    expect(applied.ok && applied.revision).toBe(1)
    expect((await graph.getNode('deliverable:research'))?.metadata.contentHash).toBe(expected)
    expect((await graph.getNode('source:external'))?.metadata.contentHash).toBe('sha256:external-source')
    expect((await graph.getNode('raw:external'))?.metadata.contentHash).toBe('sha256:external-raw')

    const reopenedGraph = new ResearchGraphService(new Context(), config)
    const reopenedFinance = new FinanceService(new Context(), reopenedGraph)
    expect((await reopenedGraph.getNode('deliverable:research'))?.metadata.contentHash).toBe(expected)
    const replay = await executeFinanceRequest(reopenedFinance, { op: 'graph.plan', plan })
    expect(replay.ok).toBe(true)
    expect(replay.ok && replay.revision).toBe(1)
    expect(replay.ok && JSON.stringify(replay.result)).toContain('"changed":false')
    expect(await reopenedGraph.currentRevision()).toBe(1)
  })
})
