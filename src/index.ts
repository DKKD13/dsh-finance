/**
 * Host entry of the `deepseek-harness-finance-plugin` bundle. Mounts the
 * `ctx.researchGraph` and `ctx.finance` services, registers bundled skills,
 * four research tools plus six finance tools, both slash commands, and
 * (unless disabled) runs the first skills import once the store is reachable.
 * @module deepseek-harness-finance-plugin
 */

import { fileURLToPath } from 'node:url'
import type { Context } from '@deepseek-ai/cordis'
import z from '@deepseek-ai/schemastery'
import { registerGraphCommand } from './commands.ts'
import { ResearchGraphService, resolveConfig } from './service.ts'
import type { ResearchGraphConfig } from './service.ts'
import { registerSkillsProvider } from './skills-provider.ts'
import { registerGraphTools } from './tools.ts'
import { registerFinanceCommand } from './finance/commands.ts'
import { FinanceService } from './finance/service.ts'
import { registerFinanceTools } from './finance/tools.ts'
import { ClipperHttpServer } from './finance/clipper-http.ts'
import { FinanceWorkbenchRemote } from './finance/remote.ts'
import { FINANCE_WORKBENCH_TYPERT } from './finance/remote-contract.ts'
import type {} from '@deepseek-ai/dsh-typert-registry'

export const name = 'deepseek-harness-finance-plugin'
export const inject = ['skills', 'tools', 'commands']

export type { GraphRequest, GraphResponse, GraphSuccess, GraphFailure, GraphOp } from './protocol.ts'
export { GRAPH_OPS, executeGraphRequest, parseRequestJson } from './protocol.ts'
export { GraphError, NODE_KINDS, EDGE_KINDS } from './graph.ts'
export type { GraphNode, GraphEdge, GraphDiff, GraphAudit, GraphStats, NodeKind, EdgeKind } from './graph.ts'
export { GRAPH_SCHEMA_VERSION, GraphStore } from './store.ts'
export type { RevisionEntry } from './store.ts'
export { prepareGraphPlan } from './plan.ts'
export type { GraphPlan, GraphPlanNode, GraphPlanResult } from './plan.ts'
export { ResearchGraphService, resolveConfig } from './service.ts'
export type { ResearchGraphConfig, ResolvedResearchGraphConfig, ResearchGraphChange } from './service.ts'
export { FinanceService } from './finance/service.ts'
export { FinanceWorkbenchRemote } from './finance/remote.ts'
export { FINANCE_OPS, executeFinanceRequest, parseFinanceRequestJson } from './finance/protocol.ts'
export type { FinanceRequest, FinanceResponse, FinanceOp } from './finance/protocol.ts'
export { calculateDcf, calculateComps } from './finance/models.ts'
export { calculatePortfolio } from './finance/portfolio.ts'
export { FUND_AVATAR_KEYS, FUND_RESEARCHER_ROLES } from './finance/virtual-fund.ts'
export type {
  FundAdvanceInput,
  FundAdvanceResult,
  FundAvatarKey,
  FundConfigureInput,
  FundConfigureResult,
  FundPriceInput,
  FundResearcherInput,
  FundResearcherResult,
  FundResearcherRole,
  FundResearcherView,
  FundSnapshotPosition,
  FundSnapshotView,
  FundStateInput,
  FundStateResult,
  FundTradeInput,
  FundView,
  VirtualFundSettings,
} from './finance/virtual-fund.ts'
export { CLIPPER_SCHEMA, normalizeClipperBundle } from './finance/clipper.ts'
export { extractDocument, normalizeDocumentFiles, parseCsv } from './finance/documents.ts'
export { ClipperHttpServer, loadOrCreateClipperToken, resolveClipperHttpConfig } from './finance/clipper-http.ts'
export type { ClipperHttpConfig, ResolvedClipperHttpConfig, ClipperHttpAddress } from './finance/clipper-http.ts'
export type * from './finance/types.ts'

/** Schemastery config validated by the Loader before activation. */
export const Config: z<ResearchGraphConfig> = z.object({
  dataDir: z.string().description('Data directory holding graph.json; defaults to ~/.dsh-research-graph.'),
  skillsRoot: z.string().description('Skills root scanned by the provider and importer; defaults to the package skills/ directory.'),
  autoIndexSkills: z.boolean().default(true).description('Import the bundled skills into the graph on activation.'),
  writeMirror: z.boolean().default(false).description('Refresh the <dataDir>/mirror Markdown export after every mutation.'),
  historyLimit: z.number().step(1).min(1).default(256).description('Revision history entries retained for diff replay.'),
  secContact: z.string().required(false).description('SEC User-Agent contact used for explicit SEC requests.'),
  openbbBaseUrl: z.string().required(false).description('Existing localhost OpenBB HTTP(S) endpoint; only whitelisted read routes are allowed.'),
  alphaSiftPath: z.string().required(false).description('Local AlphaSift CLI executable; screen always uses --no-llm --no-post-analysis.'),
  alphaSiftBaseUrl: z.string().required(false).description('Legacy compatibility only; no AlphaSift HTTP screen API is contacted.'),
  httpTimeoutMs: z.number().step(1).min(1).max(60000).default(10000).description('Timeout for each public HTTP request.'),
  httpMaxBytes: z.number().step(1).min(1).max(67108864).default(16777216).description('Maximum bytes read per HTTP response.'),
  clipperHttp: z.object({
    enabled: z.boolean().required(false).description('Enable the authenticated loopback-only Clipper HTTP importer; disabled by default.'),
    host: z.union([z.const('127.0.0.1'), z.const('::1')]).required(false).description('Exact loopback bind address; never a wildcard.'),
    port: z.number().step(1).min(0).max(65535).required(false).description('Loopback TCP port; zero selects an ephemeral port.'),
    tokenFile: z.string().required(false).description('Persistent 0600 Bearer token file; token values are never accepted in config.'),
    allowedOrigins: z.array(z.string()).required(false).description('Exact browser/extension Origin whitelist; wildcard is forbidden.'),
    maxBodyBytes: z.number().step(1).min(1024).max(67108864).required(false).description('Maximum JSON or multipart request body size.'),
    requestTimeoutMs: z.number().step(1).min(100).max(60000).required(false).description('Loopback request body timeout.'),
  }).required(false).description('Disabled-by-default loopback Clipper and byte-only document HTTP importer.'),
})

/** Default skills root: the package `skills/` directory next to `dist/`. */
function defaultSkillsRoot(): string {
  return fileURLToPath(new URL('../skills', import.meta.url))
}

/**
 * Activate the host plugin. The first skills import runs in the background
 * of activation; a failure is logged loudly but must not block the plugin,
 * because the skills directory is optional bundle content.
 * @param ctx - plugin context.
 * @param config - validated row config.
 */
export function apply(ctx: Context, config: ResearchGraphConfig): void {
  const resolved = resolveConfig(config, defaultSkillsRoot())
  const graph = new ResearchGraphService(ctx, resolved)
  ctx.effect(() => registerSkillsProvider(ctx, resolved.skillsRoot), 'deepseek-harness-finance-plugin: skills provider')
  const finance = new FinanceService(ctx, graph, resolved)
  new FinanceWorkbenchRemote(ctx, graph, finance)
  ctx.inject(['typert'], typertContext => {
    typertContext.effect(() => {
      const registration = typertContext.typert.register(FINANCE_WORKBENCH_TYPERT)
      return async () => { (await registration)() }
    }, 'deepseek-harness-finance-plugin: workbench Remote')
  })
  registerGraphTools(ctx, graph)
  registerGraphCommand(ctx, graph)
  registerFinanceTools(ctx, finance)
  registerFinanceCommand(ctx, finance)
  if (resolved.clipperHttp.enabled) {
    const clipperHttp = new ClipperHttpServer(finance, resolved.clipperHttp)
    ctx.effect(async () => {
      const address = await clipperHttp.start()
      ctx.logger.info(`deepseek-harness-finance-plugin: Clipper loopback importer listening at ${address.url}`)
      return async () => { await clipperHttp.stop() }
    }, 'deepseek-harness-finance-plugin: Clipper loopback HTTP')
  }
  if (resolved.autoIndexSkills) {
    graph.initialImport = graph.rebuildFromSkills().then(
      () => undefined,
      (error: unknown) => {
        ctx.logger.warn(`deepseek-harness-finance-plugin: initial skills import failed: ${error instanceof Error ? error.message : String(error)}`)
      },
    )
  }
}
