import { useMemo, useState } from 'react'
import type { CSSProperties } from 'react'
import {
  boundedCommandOutput,
  downloadCommandOutput,
  isJsonCommandOutput,
} from './ResearchCommandView.tsx'

/**
 * Chinese process view for this bundle's own Host tools, registered through
 * the keyed `tool.call.toolview` slot. It says what the tool read or computed
 * instead of showing a raw tool name and JSON arguments. The structural prop
 * faces below mirror the installed host contract documented in the
 * `@deepseek-ai/dsh-tools` package README (`tool.call.toolview` slot); extra
 * owner props the host supplies are ignored.
 */

/** Own tools the view registers for; exported so registration and tests share one list. */
export const FINANCE_TOOL_VIEW_TOOLS = [
  'finance_market_data',
  'finance_ingest',
  'finance_model',
  'finance_graph',
  'finance_memory',
  'finance_briefing',
  'finance_virtual_fund',
  'research_graph_node',
  'research_graph_edge',
  'research_graph_query',
  'research_graph_admin',
] as const

/** Loose structural faces of the host tool-call blocks (preparing needs no material). */
export interface FinanceToolBlock {
  readonly name?: string | null
  readonly argsRaw?: string | undefined
  readonly call?: { readonly name: string; readonly argsRaw: string } | null
  readonly content?: readonly { readonly type?: string; readonly text?: string }[]
  readonly isError?: boolean
  readonly error?: { readonly name?: string; readonly code?: string; readonly reason?: string } | undefined
}

export interface FinanceToolViewProps {
  readonly callId: string
  readonly toolName: string
  readonly phase: 'preparing' | 'start' | 'result'
  readonly block: FinanceToolBlock
  readonly locale?: string
}

const DETAIL_LIMIT = 48

type Bilingual = readonly [string, string]

const COPY = {
  zh: {
    finance: '金融',
    researchGraph: '研究图谱',
    preparing: '准备调用…',
    running: '运行中',
    done: '完成',
    failed: '失败',
    waiting: '正在等待工具完成…',
    callFailed: '工具执行失败。',
    showDetails: '查看详情',
    hideDetails: '收起详情',
    arguments: '参数',
    result: '结果',
    rawJson: '原始 JSON',
    rawOutput: '原始输出',
    download: '下载完整输出',
  },
  en: {
    finance: 'Finance',
    researchGraph: 'Research graph',
    preparing: 'Preparing…',
    running: 'Running',
    done: 'Done',
    failed: 'Failed',
    waiting: 'Waiting for the tool to finish…',
    callFailed: 'The tool call failed.',
    showDetails: 'Show details',
    hideDetails: 'Hide details',
    arguments: 'Arguments',
    result: 'Result',
    rawJson: 'Raw JSON',
    rawOutput: 'Raw output',
    download: 'Download full output',
  },
} as const

/** `[zh, en]` action labels per tool; unknown actions render as their raw name. */
const ACTION_LABELS: Record<string, Record<string, Bilingual>> = {
  finance_market_data: {
    fetch: ['读取行情数据', 'Fetching market data'],
    ingest: ['写入行情数据', 'Ingesting market data'],
  },
  finance_ingest: {
    fetch: ['抓取来源内容', 'Fetching source'],
    ingest: ['导入来源材料', 'Ingesting source'],
    import_clip: ['导入剪藏', 'Importing clip'],
    import_documents: ['导入本地文档', 'Importing documents'],
  },
  finance_model: {
    dcf: ['DCF 估值计算', 'Running DCF valuation'],
    comps: ['可比公司估值', 'Running comparable companies'],
    portfolio: ['组合快照计算', 'Computing portfolio snapshot'],
  },
  finance_graph: {
    plan: ['提交研究计划', 'Applying graph plan'],
    get: ['查看图谱节点', 'Reading graph node'],
    search: ['搜索研究图谱', 'Searching the graph'],
    stats: ['统计图谱规模', 'Reading graph stats'],
    import_artifact: ['导入研究证据', 'Importing artifact'],
    compile_prepare: ['准备知识编译', 'Preparing knowledge compile'],
    compile_status: ['查看知识编译状态', 'Reading compile status'],
  },
  finance_memory: {
    record_prediction: ['记录预测', 'Recording prediction'],
    record_issue: ['记录问题', 'Recording issue'],
    due: ['查看到期预测', 'Listing due predictions'],
    resolve: ['结算预测', 'Resolving prediction'],
    recall: ['回忆研究记录', 'Recalling memory'],
  },
  finance_briefing: {
    prepare: ['准备证据卡', 'Preparing evidence cards'],
    record: ['记录研究简报', 'Recording briefing'],
    evaluate: ['评估预测结果', 'Evaluating predictions'],
  },
  finance_virtual_fund: {
    state: ['读取模拟基金状态', 'Reading fund state'],
    configure: ['配置模拟基金', 'Configuring fund'],
    researcher: ['配置研究员', 'Configuring researcher'],
    advance: ['推进基金账本', 'Advancing fund ledger'],
  },
  research_graph_node: {
    create: ['创建图谱节点', 'Creating node'],
    get: ['查看图谱节点', 'Reading node'],
    update: ['更新图谱节点', 'Updating node'],
    remove: ['删除图谱节点', 'Removing node'],
    list: ['列出图谱节点', 'Listing nodes'],
  },
  research_graph_edge: {
    add: ['建立图谱关系', 'Adding relation'],
    remove: ['删除图谱关系', 'Removing relation'],
  },
  research_graph_query: {
    search: ['搜索研究图谱', 'Searching the graph'],
    backlinks: ['查看节点引用', 'Reading backlinks'],
    snapshot: ['读取图谱快照', 'Reading snapshot'],
    audit: ['检查引用完整性', 'Auditing references'],
    stats: ['统计图谱规模', 'Reading graph stats'],
    diff: ['对比图谱版本', 'Diffing revisions'],
  },
  research_graph_admin: {
    apply_plan: ['提交图谱计划', 'Applying graph plan'],
    rebuild_skills: ['重建技能子图', 'Rebuilding skills'],
    export_markdown: ['导出 Markdown', 'Exporting Markdown'],
  },
}

/** Arguments fields that best describe the call, in display priority order. */
const DETAIL_FIELDS = ['query', 'id', 'title', 'kind', 'source', 'symbol', 'dir', 'from', 'to'] as const

function parseArgs(raw: string | undefined): Record<string, unknown> | null {
  const value = raw?.trim()
  if (value === undefined || value.length === 0 || !value.startsWith('{')) return null
  try {
    const parsed: unknown = JSON.parse(value)
    return typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed) ? parsed as Record<string, unknown> : null
  } catch {
    return null
  }
}

function boundedDetail(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  if (trimmed.length === 0) return null
  return trimmed.length > DETAIL_LIMIT ? `${trimmed.slice(0, DETAIL_LIMIT)}…` : trimmed
}

function detailFromArgs(args: Record<string, unknown> | null): string | null {
  if (args === null) return null
  for (const field of DETAIL_FIELDS) {
    if (field === 'from' || field === 'to') {
      // Only edge endpoints carry from/to meaningfully; never show diff bounds.
      if (typeof args.action === 'string' && args.action !== 'add' && args.action !== 'remove') continue
    }
    const detail = boundedDetail(args[field])
    if (detail !== null) return detail
  }
  return null
}

function resultTextOf(block: FinanceToolBlock): string | undefined {
  const content = block.content
  if (!Array.isArray(content)) return undefined
  const text = content
    .filter((item): item is { readonly type: 'text'; readonly text: string } => item?.type === 'text' && typeof item.text === 'string')
    .map(item => item.text)
    .join('\n')
  return text.length > 0 ? text : undefined
}

const cardStyle: CSSProperties = {
  display: 'grid',
  gap: 8,
  width: '100%',
  minWidth: 0,
  boxSizing: 'border-box',
  padding: '10px 12px',
  border: '1px solid var(--dsw-alias-border-l1)',
  borderRadius: 8,
  background: 'var(--dsw-alias-bg-layer-1)',
  color: 'var(--dsw-alias-label-primary)',
  fontSize: 'var(--dsh-content-font-size-secondary, 13px)',
}

const headerStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  minWidth: 0,
}

const statusDotStyle: CSSProperties = {
  width: 7,
  height: 7,
  flex: 'none',
  borderRadius: '50%',
  background: 'var(--dsw-alias-label-caption)',
}

const summaryStyle: CSSProperties = {
  minWidth: 0,
  overflow: 'hidden',
  color: 'var(--dsw-alias-label-secondary)',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
}

const toggleStyle: CSSProperties = {
  marginLeft: 'auto',
  flex: 'none',
  padding: '3px 7px',
  border: '1px solid var(--dsw-alias-border-l2)',
  borderRadius: 6,
  background: 'transparent',
  color: 'var(--dsw-alias-label-secondary)',
  font: 'inherit',
  cursor: 'pointer',
}

const bodyStyle: CSSProperties = {
  minWidth: 0,
  maxHeight: 260,
  margin: 0,
  padding: '9px 10px',
  overflow: 'auto',
  border: '1px solid var(--dsw-alias-border-l1)',
  borderRadius: 6,
  background: 'var(--dsw-alias-markdown-code-block)',
  color: 'var(--dsw-alias-label-primary)',
  fontFamily: 'var(--ds-font-family-code, monospace)',
  fontSize: 12,
  lineHeight: 1.5,
  whiteSpace: 'pre-wrap',
  overflowWrap: 'anywhere',
}

const errorBoxStyle: CSSProperties = {
  ...bodyStyle,
  borderColor: 'var(--dsw-alias-state-error-primary)',
  color: 'var(--dsw-alias-state-error-primary)',
}

const detailRowStyle: CSSProperties = {
  display: 'grid',
  gap: 4,
  minWidth: 0,
}

const detailLabelStyle: CSSProperties = {
  margin: 0,
  color: 'var(--dsw-alias-label-tertiary)',
  fontSize: 11,
}

const footerStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 10,
  color: 'var(--dsw-alias-label-tertiary)',
  fontSize: 11,
}

const downloadStyle: CSSProperties = {
  flex: 'none',
  padding: '3px 7px',
  border: '1px solid var(--dsw-alias-border-l2)',
  borderRadius: 6,
  background: 'var(--dsw-alias-bg-layer-2)',
  color: 'var(--dsw-alias-label-secondary)',
  font: 'inherit',
  cursor: 'pointer',
}

const errorSummaryStyle: CSSProperties = {
  margin: 0,
  color: 'var(--dsw-alias-state-error-primary)',
}

/** Readable Chinese process row for one own-tool call (registered per tool name). */
export function FinanceToolView({ toolName, phase, block, locale }: FinanceToolViewProps) {
  const [expanded, setExpanded] = useState(false)
  const zh = locale?.startsWith('en') !== true
  const copy = zh ? COPY.zh : COPY.en
  const running = phase !== 'result'
  const failed = phase === 'result' && block.isError === true
  const argsRaw = phase === 'start' ? block.argsRaw : phase === 'result' ? block.call?.argsRaw ?? '' : undefined
  const args = useMemo(() => parseArgs(argsRaw), [argsRaw])
  const action = args !== null && typeof args.action === 'string' ? args.action : null
  const family = toolName.startsWith('finance_') ? copy.finance : copy.researchGraph
  const actionLabel = action === null ? null : (ACTION_LABELS[toolName]?.[action]?.[zh ? 0 : 1] ?? action)
  const detail = running && phase === 'preparing' ? null : detailFromArgs(args)
  const stateLabel = phase === 'preparing' ? copy.preparing : running ? copy.running : failed ? copy.failed : copy.done
  const resultText = phase === 'result' ? resultTextOf(block) : undefined
  const json = useMemo(() => resultText !== undefined && isJsonCommandOutput(resultText), [resultText])
  const output = !running && !failed && resultText !== undefined ? boundedCommandOutput(resultText) : null
  const errorText = failed ? resultText ?? block.error?.reason : undefined
  const error = failed ? boundedCommandOutput(errorText ?? copy.callFailed, 800) : null
  const expandable = !running && (resultText !== undefined || argsRaw !== undefined)

  return (
    <div style={cardStyle} data-finance-tool={toolName} data-phase={phase} data-state={running ? 'running' : failed ? 'error' : 'success'}>
      <div style={headerStyle}>
        <span
          aria-hidden="true"
          style={{
            ...statusDotStyle,
            background: running
              ? 'var(--dsw-alias-state-warn-primary)'
              : failed
                ? 'var(--dsw-alias-state-error-primary)'
                : 'var(--dsw-alias-state-success-primary)',
          }}
        />
        <strong style={{ flex: 'none', fontWeight: 500 }}>{family}</strong>
        <span style={summaryStyle}>
          {[actionLabel, phase === 'preparing' ? stateLabel : detail !== null ? `“${detail}”` : stateLabel, phase === 'preparing' || detail !== null ? stateLabel : null]
            .filter((part): part is string => part !== null && part.length > 0)
            .join(' · ')}
        </span>
        {expandable && (
          <button type="button" style={toggleStyle} aria-expanded={expanded} onClick={() => { setExpanded(value => !value) }}>
            {expanded ? copy.hideDetails : copy.showDetails}
          </button>
        )}
      </div>

      {running && <span role="status" style={{ color: 'var(--dsw-alias-label-tertiary)' }}>{copy.waiting}</span>}

      {failed && error !== null && (
        <p style={errorSummaryStyle}>{error.preview}</p>
      )}

      {expanded && (
        <div style={detailRowStyle}>
          {argsRaw !== undefined && argsRaw.trim().length > 0 && (
            <>
              <p style={detailLabelStyle}>{copy.arguments}</p>
              <pre style={bodyStyle}>{boundedCommandOutput(argsRaw, 4000).preview}</pre>
            </>
          )}
          {output !== null && resultText !== undefined && (
            <>
              <p style={detailLabelStyle}>{copy.result}</p>
              <pre style={bodyStyle}>{output.preview}</pre>
              <div style={footerStyle}>
                <span>{json ? copy.rawJson : copy.rawOutput}</span>
                <button type="button" style={downloadStyle} onClick={() => { downloadCommandOutput(resultText, toolName, action, json) }}>
                  {copy.download}
                </button>
              </div>
            </>
          )}
          {failed && errorText !== undefined && (
            <>
              <p style={detailLabelStyle}>{copy.result}</p>
              <pre style={errorBoxStyle}>{boundedCommandOutput(errorText, 4000).preview}</pre>
            </>
          )}
        </div>
      )}
    </div>
  )
}
