import { Remote, TypertRemoteService } from '@deepseek-ai/dsh-typert-protocol'
import type { Context } from '@deepseek-ai/cordis'
import { executeGraphRequest } from '../protocol.ts'
import type { GraphResponse } from '../protocol.ts'
import type { ResearchGraphService } from '../service.ts'
import { executeFinanceRequest } from './protocol.ts'
import type { FinanceResponse } from './protocol.ts'
import type { FinanceService } from './service.ts'
import type { FundStateInput } from './virtual-fund.ts'

/** Session-independent Remote reads; no Agent is resolved or resumed. */
export class FinanceWorkbenchRemote extends TypertRemoteService {
  constructor(ctx: Context, private readonly graph: ResearchGraphService, private readonly finance: FinanceService) {
    super(ctx, 'financeWorkbench')
  }

  @Remote
  async graphSnapshot(): Promise<GraphResponse> {
    return executeGraphRequest(this.graph, { op: 'graph.snapshot' })
  }

  @Remote
  async fundState(input: FundStateInput): Promise<FinanceResponse> {
    return executeFinanceRequest(this.finance, { op: 'fund.state', input: { ...input } })
  }
}
