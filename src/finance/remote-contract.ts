import { createTypertRemoteInfo } from '@deepseek-ai/dsh-typert-protocol'
import { z } from 'zod'

/**
 * Shared strict contract for Host registration and the Client mount. The Host
 * still validates every operation through the existing protocol dispatchers.
 */
export const FINANCE_WORKBENCH_REMOTE = createTypertRemoteInfo({
  package: 'deepseek-harness-finance-plugin',
  methods: {
    'financeWorkbench/graphSnapshot': {
      service: 'financeWorkbench',
      invocation: { kind: 'direct' },
      parameters: [],
      result: { mode: 'strict', typeSymbol: 'deepseek-harness-finance-plugin#GraphResponse', create: () => z.unknown() },
    },
    'financeWorkbench/fundState': {
      service: 'financeWorkbench',
      invocation: { kind: 'direct' },
      parameters: [{
        name: 'input',
        source: 'json',
        codec: { mode: 'strict', typeSymbol: 'deepseek-harness-finance-plugin#FundStateInput', create: () => z.strictObject({ fundId: z.string().optional(), knownRevision: z.number().int().nonnegative().optional() }) },
        strictCodec: { mode: 'strict', typeSymbol: 'deepseek-harness-finance-plugin#FundStateInput', create: () => z.strictObject({ fundId: z.string().optional(), knownRevision: z.number().int().nonnegative().optional() }) },
      }],
      result: { mode: 'strict', typeSymbol: 'deepseek-harness-finance-plugin#FinanceResponse', create: () => z.unknown() },
    },
  },
}, z)

export const FINANCE_WORKBENCH_TYPERT = {
  package: 'deepseek-harness-finance-plugin',
  face: 'host' as const,
  schemas: [],
  model: { services: [], events: [], objects: [] },
  invocations: FINANCE_WORKBENCH_REMOTE.descriptors,
}
