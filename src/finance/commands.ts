import type { Context } from '@deepseek-ai/cordis'
import type { CommandResult } from '@deepseek-ai/dsh-commands'
import { GraphError } from '../graph.ts'
import { executeFinanceRequest, parseFinanceRequestJson } from './protocol.ts'
import type { FinanceRequest, FinanceResponse } from './protocol.ts'
import type { FinanceService } from './service.ts'
import { TUTORIAL_DEMO_CLIP, TUTORIAL_DEMO_SOURCE, TUTORIAL_LESSONS, TUTORIAL_SECTION_LABELS, findTutorialLesson, tutorialLessonIds } from './tutorials.ts'
import type { TutorialLesson } from './tutorials.ts'
import type { JsonObject } from './types.ts'

export const FINANCE_COMMAND_NAME = 'finance'

const USAGE = [
  'Usage: /finance <subcommand> — or one JSON request: /finance {"op":"graph.stats"}',
  '',
  'Human subcommands:',
  '  guide [id]                    Walk one guided path: real sections, prompts shown, never sent',
  '  stats                         Graph counts and current revision',
  '  show <id>                     Show one node',
  '  search <query>                Search the graph',
  '  due <asOf>                    Due, unresolved predictions',
  '  recall <asOf> [query]         Recall only predictions due by the cutoff',
  '  prepare <asOf>                Render a deterministic local evidence briefing',
  '  evaluate <asOf>               Evaluate due predictions locally',
  '  market-fetch|source-fetch <JSON>  Fetch real public data (dryRun defaults to true)',
  '  source-ingest <JSON>         Preview or atomically ingest normalized SourceItems',
  '  clip-import|document-import <JSON>  Import a Clipper bundle or byte-only documents',
  '  compile-prepare|compile-status <JSON>  Read compilation candidates or artifacts; never invokes an LLM',
  '  ingest|dcf|comps|portfolio|plan|import <JSON>',
  '  record-prediction|record-issue|resolve|record-briefing <JSON>',
  '',
  'JSON input uses the same dispatcher as finance_* tools. No command places trades.',
].join('\n')

const QUICK_START = [
  'DSH Finance · 快速开始',
  '',
  '1. 打开侧栏的 Finance（金融工作台），先看 Workflow，确认当前缺哪一步。',
  '2. 第一次使用时运行 /finance guide first-chain；指南只展示路径和可复制提示词，不会替你启动研究。',
  '3. 看行情进入 Market；要研究公司或问题，进入 Reports 手动选择 Ticker / Question，或由你显式运行已有研究 Skill `/research`。',
  '',
  '常用命令：',
  '  /finance guide [id]     查看实际页面步骤',
  '  /finance stats          查看当前图谱计数与 revision',
  '  /finance search <query> 搜索已有知识图谱',
  '  /finance help           查看完整命令契约',
  '',
  '真实模式没有数据时会显示空态；演示数据会明确标注，不写入真实图谱或持仓。',
  'JSON 模式保持可用：/finance {"op":"graph.stats"}',
].join('\n')

function unknownHumanInputGuidance(head: string): CommandResult {
  return {
    kind: 'error',
    text: [
      '没有执行这项输入，也没有启动模型或写入图谱。',
      `“${head}”不是已注册的 /finance 子命令。`,
      '',
      '可以从这里继续：',
      '  1. 打开侧栏 Finance（金融工作台），在 Workflow 查看下一步；Market 看行情，Reports 显式开始研究。',
      '  2. 先走完整首链：/finance guide first-chain',
      '  3. 研究公司或问题时，由你显式使用已有研究 Skill `/research`；本命令不会代你运行。',
      '',
      '这是统一入口说明，没有对输入做语义分类。',
      'English: Open Finance in the sidebar, check Workflow, and run `/finance guide first-chain`. Use Market for quotes and Reports (or explicitly run `/research`) to start research yourself. Nothing was run or written.',
    ].join('\n'),
  }
}

/**
 * Keep mechanical typos on the syntax-error path while routing prose-shaped
 * unknown input to one honest research entry. This is a grammar check only:
 * no keyword, company, ticker or language-semantic classification.
 */
function isProseShapedUnknown(input: string): boolean {
  const trimmed = input.trim()
  if (/\s/u.test(trimmed)) return true
  if (/[^\x00-\x7f]/u.test(trimmed)) return true
  return !/^[a-z][a-z0-9._-]*$/u.test(trimmed)
}

function jsonInput(tail: string): JsonObject {
  if (!tail) throw new GraphError('INVALID_REQUEST', 'a JSON input object is required')
  const parsed: unknown = JSON.parse(tail)
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw new GraphError('INVALID_REQUEST', 'input must be a JSON object')
  }
  return parsed as JsonObject
}

/** Sections a lesson visits, first occurrence only, in navigation wording. */
function sectionTrail(lesson: TutorialLesson): string {
  const seen = new Set<string>()
  const labels: string[] = []
  for (const step of lesson.steps) {
    if (seen.has(step.section)) continue
    seen.add(step.section)
    labels.push(TUTORIAL_SECTION_LABELS[step.section])
  }
  return labels.join(' → ')
}

function guideIndex(): string {
  const width = Math.max(...TUTORIAL_LESSONS.map(lesson => lesson.id.length))
  return [
    'finance guide — guided paths through the real workspace',
    'Each step names the section to open; prompts are shown for copying and are never sent by this command.',
    '',
    ...TUTORIAL_LESSONS.map(lesson => `  ${lesson.id.padEnd(width)}  ${lesson.title} · ${lesson.duration} · ${sectionTrail(lesson)}`),
    '',
    `Usage: /finance guide <id>   (ids: ${tutorialLessonIds().join(', ')})`,
  ].join('\n')
}

function guideLesson(lesson: TutorialLesson): string {
  const lines = [
    `finance guide · ${lesson.id} — ${lesson.title}`,
    `${lesson.duration} · ${lesson.steps.length} steps · ${lesson.summary}`,
    '',
    `Goal: ${lesson.goal}`,
    '',
    'Prerequisites:',
    ...lesson.prerequisites.map(item => `  - ${item}`),
    '',
    'Steps:',
  ]
  lesson.steps.forEach((step, index) => {
    const action = step.action === undefined ? '' : ` — ${step.action}`
    lines.push(`  ${index + 1}. [${TUTORIAL_SECTION_LABELS[step.section]}] ${step.title}${action}`)
    lines.push(`     ${step.detail}`)
    if (step.prompt !== undefined) {
      lines.push('     prompt (shown, never sent):')
      lines.push(...step.prompt.split('\n').map(line => `       ${line}`))
    }
  })
  lines.push('', 'Required:', `  asOf: ${lesson.asOf}`, `  runId: ${lesson.runId}`)
  lines.push('', `Expected: ${lesson.expected}`)
  lines.push('', 'Limits:', ...lesson.limits.map(item => `  - ${item}`))
  if (lesson.demoClip === true) {
    lines.push(
      '',
      'Demo clip — public Apple release, verbatim excerpt (not the full release):',
      `  source: ${TUTORIAL_DEMO_SOURCE.url}`,
      `  availableAt: ${TUTORIAL_DEMO_SOURCE.availableAt} (publication date ${TUTORIAL_DEMO_SOURCE.publicationDate})`,
      `  verification fixture: ${TUTORIAL_DEMO_SOURCE.fixture}`,
      '  paste into Inbox → Clip with asOf 2025-10-31T00:00:00.000Z:',
      JSON.stringify(TUTORIAL_DEMO_CLIP, null, 2),
    )
  }
  lines.push('', `Replay: /finance guide ${lesson.id}`)
  return lines.join('\n')
}

/** `/finance guide [id]` never reaches the JSON dispatcher or the graph. */
function guideCommand(raw: string): CommandResult | undefined {
  const [head, ...rest] = raw.split(/\s+/u)
  if (head !== 'guide') return undefined
  const target = rest.join(' ').trim()
  if (target.length === 0) return { kind: 'success', text: guideIndex() }
  const lesson = findTutorialLesson(target)
  if (lesson === undefined) {
    return {
      kind: 'error',
      text: `Unknown guide "${target}". Available: ${tutorialLessonIds().join(', ')}.\nUsage: /finance guide [id]`,
    }
  }
  return { kind: 'success', text: guideLesson(lesson) }
}

function humanRequest(input: string): FinanceRequest | { error: string; unknownSubcommand?: boolean } {
  const [head, ...rest] = input.split(/\s+/u)
  const tail = rest.join(' ')
  switch (head) {
    case 'stats': return { op: 'graph.stats' }
    case 'show': return tail ? { op: 'graph.get', id: tail } : { error: 'show requires a node id.' }
    case 'search': return tail ? { op: 'graph.search', query: tail } : { error: 'search requires a query.' }
    case 'due': return tail ? { op: 'memory.due', asOf: tail } : { error: 'due requires an asOf timestamp.' }
    case 'recall': {
      const [asOf, ...query] = rest
      return asOf ? { op: 'memory.recall', asOf, query: query.join(' ') } : { error: 'recall requires an asOf timestamp.' }
    }
    case 'prepare': return tail ? { op: 'briefing.prepare', input: { asOf: tail } } : { error: 'prepare requires an asOf timestamp.' }
    case 'evaluate': return tail ? { op: 'briefing.evaluate', asOf: tail } : { error: 'evaluate requires an asOf timestamp.' }
    case 'market-fetch': return { op: 'market.fetch', input: jsonInput(tail) }
    case 'source-fetch': return { op: 'source.fetch', input: jsonInput(tail) }
    case 'source-ingest': return { op: 'source.ingest', input: jsonInput(tail) }
    case 'clip-import':
    case 'import-clip':
    case 'clipper-import': return { op: 'clipper.import', input: jsonInput(tail) }
    case 'document-import':
    case 'documents-import':
    case 'import-documents': return { op: 'document.import', input: jsonInput(tail) }
    case 'compile-prepare': return { op: 'compile.prepare', input: jsonInput(tail) }
    case 'compile-status': return { op: 'compile.status', input: jsonInput(tail) }
    case 'ingest': return { op: 'market.ingest', input: jsonInput(tail) }
    case 'dcf': return { op: 'model.dcf', input: jsonInput(tail) }
    case 'comps': return { op: 'model.comps', input: jsonInput(tail) }
    case 'portfolio': return { op: 'portfolio.snapshot', input: jsonInput(tail) }
    case 'plan': return { op: 'graph.plan', input: jsonInput(tail) }
    case 'import': return { op: 'graph.import_artifact', input: jsonInput(tail) }
    case 'record-prediction': return { op: 'memory.record_prediction', input: jsonInput(tail) }
    case 'record-issue': return { op: 'memory.record_issue', input: jsonInput(tail) }
    case 'resolve': return { op: 'memory.resolve', input: jsonInput(tail) }
    case 'record-briefing': return { op: 'briefing.record', input: jsonInput(tail) }
    default: return { error: `Unknown subcommand "${head ?? ''}".\n${USAGE}`, unknownSubcommand: true }
  }
}

function renderJson(response: FinanceResponse): CommandResult {
  return { kind: response.ok ? 'success' : 'error', text: JSON.stringify(response, null, 2) }
}

export function registerFinanceCommand(ctx: Context, finance: FinanceService): void {
  ctx.commands.register({
    name: FINANCE_COMMAND_NAME,
    description: 'Point-in-time finance graph, deterministic models, prediction memory and briefings (no trading)',
    input: { hint: 'empty for quick start; <guide|stats|show|search|source-ingest|compile-prepare|compile-status|due|recall|prepare|evaluate> or JSON' },
    async handler(invocation): Promise<CommandResult> {
      const raw = invocation.rawInput.trim()
      if (!raw) return { kind: 'success', text: QUICK_START }
      if (raw === 'help') return { kind: 'success', text: USAGE }
      const guided = guideCommand(raw)
      if (guided !== undefined) return guided
      let request: FinanceRequest
      let jsonMode = false
      try {
        const parsed = parseFinanceRequestJson(raw)
        if (parsed !== undefined) {
          request = parsed
          jsonMode = true
        } else {
          const human = humanRequest(raw)
          if ('error' in human) {
            const [head = ''] = raw.split(/\s+/u)
            if (human.unknownSubcommand === true && isProseShapedUnknown(raw)) return unknownHumanInputGuidance(head)
            return { kind: 'error', text: String(human.error) }
          }
          request = human as FinanceRequest
        }
      } catch (error: unknown) {
        const message = error instanceof GraphError || error instanceof SyntaxError ? error.message : String(error)
        return { kind: 'error', text: `${message}\n${USAGE}` }
      }
      const response = await executeFinanceRequest(finance, request)
      if (jsonMode) return renderJson(response)
      if (!response.ok) return { kind: 'error', text: `${response.error.code}: ${response.error.message}` }
      if (request.op === 'briefing.prepare') {
        const result = response.result as { content?: string }
        return { kind: 'success', text: result.content ?? JSON.stringify(response.result, null, 2) }
      }
      if (request.op === 'graph.stats') {
        const stats = response.result as { revision: number; nodes: number; edges: number }
        return { kind: 'success', text: `revision ${stats.revision}: ${stats.nodes} nodes, ${stats.edges} edges` }
      }
      return { kind: 'success', text: JSON.stringify(response.result, null, 2) }
    },
  })
}
