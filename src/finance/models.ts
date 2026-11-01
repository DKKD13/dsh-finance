import { GraphError } from '../graph.ts'
import type { CompsInput, DcfInput, DcfScenarioInput } from './types.ts'

const UNIT_SCALE = { units: 1, thousands: 1e3, millions: 1e6, billions: 1e9 } as const

function finite(value: number, field: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new GraphError('INVALID_NUMBER', `${field} must be a finite number`)
  }
  return value
}

function positive(value: number, field: string): number {
  finite(value, field)
  if (value <= 0) throw new GraphError('INVALID_NUMBER', `${field} must be greater than zero`)
  return value
}

function schedule(values: number[], field: string, years: number | undefined): number[] {
  if (!Array.isArray(values) || values.length === 0 || (years !== undefined && values.length !== years)) {
    throw new GraphError('ARRAY_LENGTH_MISMATCH', `${field} must have the same non-zero length as the other statement schedules`)
  }
  values.forEach((value, index) => finite(value, `${field}[${index}]`))
  return values
}

function discountScenario(scenario: DcfScenarioInput, wacc: number, terminalGrowth: number, sharesOutstanding: number, units: DcfInput['units']) {
  const revenue = schedule(scenario.incomeStatement.revenue, `${scenario.name}.incomeStatement.revenue`, undefined)
  const years = revenue.length
  const ebit = schedule(scenario.incomeStatement.ebit, `${scenario.name}.incomeStatement.ebit`, years)
  const depreciation = schedule(scenario.cashFlowStatement.depreciation, `${scenario.name}.cashFlowStatement.depreciation`, years)
  const capitalExpenditure = schedule(scenario.cashFlowStatement.capitalExpenditure, `${scenario.name}.cashFlowStatement.capitalExpenditure`, years)
  const workingCapitalChange = schedule(scenario.cashFlowStatement.workingCapitalChange, `${scenario.name}.cashFlowStatement.workingCapitalChange`, years)
  const freeCashFlow = ebit.map((value, index) => value * (1 - scenario.taxRate)
    + (depreciation[index] as number)
    - (capitalExpenditure[index] as number)
    - (workingCapitalChange[index] as number))
  const discountFactors = freeCashFlow.map((_, index) => (1 + wacc) ** (index + 1))
  const discountedFreeCashFlow = freeCashFlow.map((value, index) => value / (discountFactors[index] as number))
  const terminalFreeCashFlow = (freeCashFlow[years - 1] as number) * (1 + terminalGrowth)
  const terminalValue = terminalFreeCashFlow / (wacc - terminalGrowth)
  const discountedTerminalValue = terminalValue / ((1 + wacc) ** years)
  const enterpriseValue = discountedFreeCashFlow.reduce((sum, value) => sum + value, 0) + discountedTerminalValue
  const equityValue = enterpriseValue - scenario.balanceSheet.netDebt
  const perShare = equityValue * UNIT_SCALE[units.financials] / (sharesOutstanding * UNIT_SCALE[units.shares])
  return {
    years,
    incomeStatement: revenue.map((value, index) => ({
      year: index + 1,
      revenue: value,
      ebit: ebit[index] as number,
      taxRate: scenario.taxRate,
      afterTaxEbit: (ebit[index] as number) * (1 - scenario.taxRate),
    })),
    cashFlowStatement: freeCashFlow.map((value, index) => ({
      year: index + 1,
      depreciation: depreciation[index] as number,
      capitalExpenditure: capitalExpenditure[index] as number,
      workingCapitalChange: workingCapitalChange[index] as number,
      freeCashFlow: value,
      discountFactor: discountFactors[index] as number,
      discountedFreeCashFlow: discountedFreeCashFlow[index] as number,
    })),
    balanceSheet: {
      netDebt: scenario.balanceSheet.netDebt,
      ...(scenario.balanceSheet.debt === undefined ? {} : { debt: scenario.balanceSheet.debt }),
      ...(scenario.balanceSheet.cash === undefined ? {} : { cash: scenario.balanceSheet.cash }),
      enterpriseValue,
      equityValue,
    },
    terminal: { freeCashFlow: terminalFreeCashFlow, value: terminalValue, discountedValue: discountedTerminalValue },
    enterpriseValue,
    equityValue,
    perShare,
  }
}

/** Deterministic scenario-weighted FCFF DCF with statement schedules and sensitivity. */
export function calculateDcf(input: DcfInput) {
  if (!input.currency || input.currency.toUpperCase() !== input.instrument.currency.toUpperCase()) {
    throw new GraphError('UNIT_MISMATCH', 'DCF currency must match the instrument currency')
  }
  if (!(input.units.financials in UNIT_SCALE) || !(input.units.shares in UNIT_SCALE)) {
    throw new GraphError('INVALID_UNITS', 'DCF units must be units, thousands, millions, or billions')
  }
  const sharesOutstanding = positive(input.sharesOutstanding, 'sharesOutstanding')
  if (!Array.isArray(input.scenarios) || input.scenarios.length === 0) {
    throw new GraphError('INVALID_SCENARIOS', 'DCF requires at least one scenario')
  }
  const names = new Set<string>()
  let probabilityTotal = 0
  const warnings: string[] = []
  for (const scenario of input.scenarios) {
    if (!scenario.name || names.has(scenario.name)) throw new GraphError('INVALID_SCENARIOS', 'scenario names must be non-empty and unique')
    names.add(scenario.name)
    finite(scenario.probability, `${scenario.name}.probability`)
    if (scenario.probability < 0 || scenario.probability > 1) throw new GraphError('INVALID_PROBABILITY', `${scenario.name} probability must be in [0, 1]`)
    probabilityTotal += scenario.probability
    finite(scenario.wacc, `${scenario.name}.wacc`)
    finite(scenario.terminalGrowth, `${scenario.name}.terminalGrowth`)
    if (scenario.wacc <= scenario.terminalGrowth) throw new GraphError('WACC_NOT_ABOVE_GROWTH', `${scenario.name}: WACC must be greater than terminal growth`)
    finite(scenario.taxRate, `${scenario.name}.taxRate`)
    if (scenario.taxRate < 0 || scenario.taxRate > 1) throw new GraphError('INVALID_TAX_RATE', `${scenario.name}: taxRate must be in [0, 1]`)
    finite(scenario.balanceSheet.netDebt, `${scenario.name}.balanceSheet.netDebt`)
    if (scenario.balanceSheet.debt !== undefined && scenario.balanceSheet.cash !== undefined) {
      finite(scenario.balanceSheet.debt, `${scenario.name}.balanceSheet.debt`)
      finite(scenario.balanceSheet.cash, `${scenario.name}.balanceSheet.cash`)
      if (Math.abs(scenario.balanceSheet.debt - scenario.balanceSheet.cash - scenario.balanceSheet.netDebt) > 1e-8) {
        throw new GraphError('BALANCE_SHEET_MISMATCH', `${scenario.name}: netDebt must equal debt minus cash`)
      }
    }
    if (scenario.wacc - scenario.terminalGrowth < 0.02) warnings.push(`${scenario.name}: WACC less terminal growth is below 2 percentage points`)
  }
  if (Math.abs(probabilityTotal - 1) > 1e-9) {
    throw new GraphError('INVALID_PROBABILITY', `scenario probabilities must sum to 1, got ${probabilityTotal}`)
  }

  const scenarios = input.scenarios.map(scenario => {
    const result = discountScenario(scenario, scenario.wacc, scenario.terminalGrowth, sharesOutstanding, input.units)
    if (result.cashFlowStatement.some(row => row.freeCashFlow < 0)) warnings.push(`${scenario.name}: at least one forecast free cash flow is negative`)
    return { name: scenario.name, probability: scenario.probability, wacc: scenario.wacc, terminalGrowth: scenario.terminalGrowth, ...result }
  })
  const weighted = scenarios.reduce((totals, scenario) => ({
    enterpriseValue: totals.enterpriseValue + scenario.enterpriseValue * scenario.probability,
    equityValue: totals.equityValue + scenario.equityValue * scenario.probability,
    perShare: totals.perShare + scenario.perShare * scenario.probability,
  }), { enterpriseValue: 0, equityValue: 0, perShare: 0 })

  let sensitivity: unknown = undefined
  if (input.sensitivity !== undefined) {
    const base = input.scenarios.find(scenario => scenario.name === 'base')
    if (base === undefined) throw new GraphError('INVALID_SENSITIVITY', 'sensitivity requires a scenario named "base"')
    const { waccValues, terminalGrowthValues } = input.sensitivity
    if (!Array.isArray(waccValues) || !Array.isArray(terminalGrowthValues)
      || !waccValues.includes(base.wacc) || !terminalGrowthValues.includes(base.terminalGrowth)) {
      throw new GraphError('INVALID_SENSITIVITY', 'sensitivity axes must include the base WACC and terminal growth')
    }
    const baseValue = scenarios.find(scenario => scenario.name === 'base')?.perShare as number
    const rows = waccValues.map(wacc => ({
      wacc: finite(wacc, 'sensitivity.waccValues'),
      values: terminalGrowthValues.map(terminalGrowth => {
        finite(terminalGrowth, 'sensitivity.terminalGrowthValues')
        if (wacc <= terminalGrowth) throw new GraphError('WACC_NOT_ABOVE_GROWTH', 'every sensitivity WACC must exceed terminal growth')
        return {
          terminalGrowth,
          perShare: wacc === base.wacc && terminalGrowth === base.terminalGrowth
            ? baseValue
            : discountScenario(base, wacc, terminalGrowth, sharesOutstanding, input.units).perShare,
        }
      }),
    }))
    sensitivity = { metric: 'perShare', center: { wacc: base.wacc, terminalGrowth: base.terminalGrowth, perShare: baseValue }, rows }
  }
  if (input.units.financials !== input.units.shares) warnings.push('financial and share units differ; per-share conversion applies their declared scale factors')
  return {
    method: 'dcf' as const,
    currency: input.currency,
    units: { ...input.units, perShare: `${input.currency}/share` },
    probabilityTotal,
    scenarios,
    weighted,
    ...(sensitivity === undefined ? {} : { sensitivity }),
    warnings,
  }
}

function median(values: number[]): number {
  const sorted = [...values].sort((left, right) => left - right)
  const middle = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 1
    ? sorted[middle] as number
    : ((sorted[middle - 1] as number) + (sorted[middle] as number)) / 2
}

/** Comparable-company valuation; the target can never enter its own peer median. */
export function calculateComps(input: CompsInput) {
  finite(input.targetMetric, 'targetMetric')
  if (!Array.isArray(input.peers)) throw new GraphError('INVALID_PEERS', 'peers must be an array')
  const peers = input.peers.filter(peer => peer.id !== input.instrument.id)
  if (peers.length === 0) throw new GraphError('NO_PEERS', 'comps requires at least one peer other than the target')
  peers.forEach((peer, index) => {
    if (!peer.id) throw new GraphError('INVALID_PEERS', `peers[${index}].id must be non-empty`)
    finite(peer.multiple, `peers[${index}].multiple`)
  })
  const multiple = median(peers.map(peer => peer.multiple))
  const impliedValue = multiple * input.targetMetric
  const netDebt = input.netDebt ?? 0
  finite(netDebt, 'netDebt')
  const enterpriseValue = input.basis === 'enterprise' ? impliedValue : null
  const equityValue = input.basis === 'enterprise' ? impliedValue - netDebt : impliedValue
  if (input.basis !== 'enterprise' && input.basis !== 'equity') throw new GraphError('INVALID_BASIS', 'basis must be enterprise or equity')
  if (input.sharesOutstanding !== undefined) positive(input.sharesOutstanding, 'sharesOutstanding')
  const warnings = input.peers.length === peers.length ? [] : ['target instrument was excluded from the peer median']
  if (peers.some(peer => peer.multiple <= 0)) warnings.push('at least one peer multiple is non-positive')
  return {
    method: 'comps' as const,
    currency: input.currency,
    basis: input.basis,
    targetMetric: input.targetMetric,
    peerMedian: multiple,
    peerIds: peers.map(peer => peer.id),
    impliedValue,
    enterpriseValue,
    equityValue,
    ...(input.sharesOutstanding === undefined ? {} : { perShare: equityValue / input.sharesOutstanding }),
    warnings,
  }
}
