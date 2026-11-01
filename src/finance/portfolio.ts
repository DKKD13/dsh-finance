import { GraphError } from '../graph.ts'
import { assertAvailableBy, timestamp } from './metadata.ts'
import type { FxRateInput, PortfolioInput } from './types.ts'

function finite(value: number, field: string, minimum?: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || (minimum !== undefined && value < minimum)) {
    throw new GraphError('INVALID_NUMBER', `${field} must be finite${minimum === undefined ? '' : ` and at least ${minimum}`}`)
  }
  return value
}

function eligibleFx(input: PortfolioInput, from: string, to: string): FxRateInput {
  if (from === to) {
    return { from, to, rate: 1, asOf: input.asOf, availableAt: input.asOf, provider: 'identity' }
  }
  const candidates = input.fx.filter(rate => rate.from === from && rate.to === to)
  if (candidates.length === 0) throw new GraphError('MISSING_FX', `missing direct FX snapshot ${from}/${to}; portfolio conversion fails closed`)
  const eligible = candidates.filter(rate => timestamp(rate.asOf, `FX ${from}/${to}.asOf`) <= timestamp(input.asOf, 'portfolio.asOf')
    && timestamp(rate.availableAt, `FX ${from}/${to}.availableAt`) <= timestamp(input.asOf, 'portfolio.asOf'))
  if (eligible.length === 0) throw new GraphError('MISSING_FX', `no ${from}/${to} FX snapshot was available by ${input.asOf}`)
  eligible.sort((left, right) => timestamp(right.asOf, 'FX.asOf') - timestamp(left.asOf, 'FX.asOf'))
  const selected = eligible[0] as FxRateInput
  finite(selected.rate, `FX ${from}/${to}.rate`, Number.MIN_VALUE)
  if (!selected.provider) throw new GraphError('INVALID_METADATA', `FX ${from}/${to} provider is required`)
  return selected
}

/** Value positions in original currency and a direct, point-in-time FX base snapshot. */
export function calculatePortfolio(input: PortfolioInput) {
  timestamp(input.asOf, 'portfolio.asOf')
  if (!input.baseCurrency) throw new GraphError('INVALID_UNITS', 'baseCurrency is required')
  if (!Array.isArray(input.positions) || input.positions.length === 0) {
    throw new GraphError('EMPTY_PORTFOLIO', 'portfolio requires at least one position')
  }
  const ids = new Set<string>()
  const positions = input.positions.map(position => {
    if (ids.has(position.id)) throw new GraphError('DUPLICATE_POSITION', `position "${position.id}" occurs more than once`)
    ids.add(position.id)
    finite(position.quantity, `${position.id}.quantity`, 0)
    finite(position.price, `${position.id}.price`, 0)
    finite(position.costBasisPerUnit, `${position.id}.costBasisPerUnit`, 0)
    assertAvailableBy(position.metadata, input.asOf, `position "${position.id}"`)
    assertAvailableBy(position.instrument.metadata, input.asOf, `instrument "${position.instrument.id}"`)
    const currency = position.instrument.currency
    const marketValue = position.quantity * position.price
    const cost = position.quantity * position.costBasisPerUnit
    const unrealizedPnl = marketValue - cost
    const fx = eligibleFx(input, currency, input.baseCurrency)
    const baseMarketValue = marketValue * fx.rate
    return {
      id: position.id,
      instrumentId: position.instrument.id,
      currency,
      original: { quantity: position.quantity, price: position.price, costBasis: cost, marketValue, unrealizedPnl },
      fx: { from: fx.from, to: fx.to, rate: fx.rate, asOf: fx.asOf, availableAt: fx.availableAt, provider: fx.provider },
      base: { currency: input.baseCurrency, costBasis: cost * fx.rate, marketValue: baseMarketValue, unrealizedPnl: unrealizedPnl * fx.rate },
      weight: 0,
    }
  })
  const total = positions.reduce((sum, position) => sum + position.base.marketValue, 0)
  if (total <= 0) throw new GraphError('NON_POSITIVE_PORTFOLIO', 'base market value must be positive to compute weights')
  for (const position of positions) position.weight = position.base.marketValue / total
  const weights = positions.map(position => position.weight).sort((left, right) => right - left)
  const hhi = weights.reduce((sum, weight) => sum + weight * weight, 0)
  const byCurrency: Record<string, { marketValue: number; costBasis: number; unrealizedPnl: number }> = {}
  for (const position of positions) {
    const aggregate = byCurrency[position.currency] ?? { marketValue: 0, costBasis: 0, unrealizedPnl: 0 }
    aggregate.marketValue += position.original.marketValue
    aggregate.costBasis += position.original.costBasis
    aggregate.unrealizedPnl += position.original.unrealizedPnl
    byCurrency[position.currency] = aggregate
  }
  const warnings: string[] = []
  if ((weights[0] as number) > 0.25) warnings.push('largest position exceeds 25% of base market value')
  if (hhi > 0.2) warnings.push('portfolio HHI exceeds 0.20')
  return {
    asOf: input.asOf,
    baseCurrency: input.baseCurrency,
    positions,
    originalCurrencyTotals: byCurrency,
    totals: {
      marketValue: total,
      costBasis: positions.reduce((sum, position) => sum + position.base.costBasis, 0),
      unrealizedPnl: positions.reduce((sum, position) => sum + position.base.unrealizedPnl, 0),
    },
    concentration: {
      top1Weight: weights[0] as number,
      top5Weight: weights.slice(0, 5).reduce((sum, weight) => sum + weight, 0),
      hhi,
      effectivePositions: 1 / hhi,
    },
    warnings,
  }
}
