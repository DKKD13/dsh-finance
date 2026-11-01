import { useId, useMemo, useState } from 'react'
import type { CSSProperties } from 'react'

export interface ResearchCommandNode {
  readonly seq: number
  readonly time: number
  readonly commandId: string
  readonly name: string | null
  readonly args: string | null
  readonly outcome: {
    readonly kind: 'success' | 'error'
    readonly text?: string
    readonly sourceEventSeq?: number
  } | null
}

export interface ResearchCommandViewProps {
  readonly node: ResearchCommandNode
  readonly locale?: string
}

const OUTPUT_PREVIEW_LIMIT = 16_000
const ERROR_PREVIEW_LIMIT = 800
const OPERATION_LABEL_LIMIT = 96

const COPY = {
  zh: {
    finance: '金融',
    researchGraph: '研究图谱',
    running: '运行中',
    done: '完成',
    failed: '失败',
    showResult: '查看结果',
    hideResult: '收起结果',
    waiting: '正在等待命令完成…',
    commandFailed: '命令执行失败。',
    financeFailed: '金融命令执行失败。',
    financeNotConfigured: '金融数据源尚未配置。',
    financeUnavailable: '金融数据服务暂时不可用。',
    financeInvalidRequest: '金融请求无效，请检查输入。',
    financeNoSession: '当前没有可用的对话。',
    financeUnmatched: '当前环境未注册金融命令。',
    technicalDetails: '技术详情',
    download: '下载完整输出',
    rawJson: '原始 JSON',
    rawOutput: '原始输出',
    errorLimited: (limit: string) => `错误预览限制为 ${limit} 个字符。`,
    previewLimited: (limit: string, total: string) => `预览限制为 ${limit} / ${total} 个字符。`,
  },
  en: {
    finance: 'Finance',
    researchGraph: 'Research graph',
    running: 'Running',
    done: 'Done',
    failed: 'Failed',
    showResult: 'Show result',
    hideResult: 'Hide result',
    waiting: 'Waiting for the command to finish…',
    commandFailed: 'Command failed.',
    financeFailed: 'Finance command failed.',
    financeNotConfigured: 'A finance data provider is not configured.',
    financeUnavailable: 'Finance data is temporarily unavailable.',
    financeInvalidRequest: 'The finance request is invalid. Check the input.',
    financeNoSession: 'No conversation is available.',
    financeUnmatched: 'The finance command is not registered in this environment.',
    technicalDetails: 'Technical details',
    download: 'Download full output',
    rawJson: 'Raw JSON',
    rawOutput: 'Raw output',
    errorLimited: (limit: string) => `Error preview limited to ${limit} characters.`,
    previewLimited: (limit: string, total: string) => `Preview limited to ${limit} of ${total} characters.`,
  },
} as const

function operationFromArgs(args: string | null): string | null {
  const value = args?.trim()
  if (value === undefined || !value.startsWith('{')) return null
  try {
    const parsed: unknown = JSON.parse(value)
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return null
    const operation = (parsed as Record<string, unknown>).op
    return typeof operation === 'string' && operation.length > 0
      ? operation.slice(0, OPERATION_LABEL_LIMIT)
      : null
  } catch {
    return null
  }
}

export function isJsonCommandOutput(text: string): boolean {
  const start = text.trimStart()[0]
  if (start !== '{' && start !== '[') return false
  try {
    JSON.parse(text)
    return true
  } catch {
    return false
  }
}

export function boundedCommandOutput(text: string, limit = OUTPUT_PREVIEW_LIMIT): {
  readonly preview: string
  readonly truncated: boolean
} {
  return { preview: text.slice(0, limit), truncated: text.length > limit }
}

function structuredErrorCode(text: string | undefined): string | null {
  if (text === undefined) return null
  try {
    const parsed: unknown = JSON.parse(text)
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return null
    const error = (parsed as Record<string, unknown>).error
    if (typeof error !== 'object' || error === null || Array.isArray(error)) return null
    const code = (error as Record<string, unknown>).code
    return typeof code === 'string' ? code : null
  } catch {
    return null
  }
}

function safeFilenamePart(value: string): string {
  const normalized = value.toLowerCase().replace(/[^a-z0-9._-]+/g, '-').replace(/^-+|-+$/g, '')
  return normalized.slice(0, 80) || 'output'
}

/** Download the untouched command text. This function only runs after an explicit user action. */
export function downloadCommandOutput(text: string, command: string, operation: string | null, json: boolean): void {
  const type = json ? 'application/json;charset=utf-8' : 'text/plain;charset=utf-8'
  const filename = `dsh-${safeFilenamePart(command)}-${safeFilenamePart(operation ?? 'output')}.${json ? 'json' : 'txt'}`
  const objectUrl = URL.createObjectURL(new Blob([text], { type }))
  const anchor = document.createElement('a')
  anchor.href = objectUrl
  anchor.download = filename
  anchor.click()
  setTimeout(() => URL.revokeObjectURL(objectUrl), 1000)
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

const errorSummaryStyle: CSSProperties = {
  margin: 0,
  color: 'var(--dsw-alias-state-error-primary)',
}

const detailsStyle: CSSProperties = {
  display: 'grid',
  gap: 6,
  color: 'var(--dsw-alias-label-secondary)',
  fontSize: 12,
}

const detailsSummaryStyle: CSSProperties = {
  width: 'fit-content',
  color: 'var(--dsw-alias-label-tertiary)',
  cursor: 'pointer',
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

/** Compact command row contributed for `/finance` and `/research-graph`. */
export function ResearchCommandView({ node, locale }: ResearchCommandViewProps) {
  const [expanded, setExpanded] = useState(false)
  const bodyId = useId()
  const copy = locale?.startsWith('en') === true ? COPY.en : COPY.zh
  const command = node.name ?? 'command'
  const label = command === 'finance' ? copy.finance : command === 'research-graph' ? copy.researchGraph : command
  const operation = operationFromArgs(node.args)
  const raw = node.outcome?.text
  const running = node.outcome === null
  const failed = node.outcome?.kind === 'error'
  const errorCode = failed && command === 'finance' ? structuredErrorCode(raw) : null
  const json = useMemo(
    () => expanded && !running && !failed && raw !== undefined && isJsonCommandOutput(raw),
    [expanded, failed, raw, running],
  )
  const error = failed ? boundedCommandOutput(raw ?? copy.commandFailed, ERROR_PREVIEW_LIMIT) : null
  const output = !running && !failed && raw !== undefined ? boundedCommandOutput(raw) : null
  const stateLabel = running ? copy.running : failed ? copy.failed : copy.done
  const errorSummary = command === 'finance'
    ? errorCode === 'NO_SESSION'
      ? copy.financeNoSession
      : errorCode === 'COMMAND_UNMATCHED'
        ? copy.financeUnmatched
        : errorCode === 'NOT_CONFIGURED' || errorCode === 'NOT_IMPLEMENTED'
          ? copy.financeNotConfigured
          : errorCode === 'TRANSPORT' || errorCode === 'UNAVAILABLE'
            ? copy.financeUnavailable
            : errorCode === 'INVALID_REQUEST'
              ? copy.financeInvalidRequest
              : copy.financeFailed
    : copy.commandFailed

  return (
    <div style={cardStyle} data-research-command={command} data-state={running ? 'running' : failed ? 'error' : 'success'}>
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
        <strong style={{ flex: 'none', fontWeight: 500 }}>{label}</strong>
        <span style={summaryStyle}>{operation === null ? stateLabel : `${operation} · ${stateLabel}`}</span>
        {!running && !failed && raw !== undefined && (
          <button
            type="button"
            style={toggleStyle}
            aria-expanded={expanded}
            aria-controls={expanded ? bodyId : undefined}
            onClick={() => setExpanded(value => !value)}
          >
            {expanded ? copy.hideResult : copy.showResult}
          </button>
        )}
      </div>

      {running && <span role="status" style={{ color: 'var(--dsw-alias-label-tertiary)' }}>{copy.waiting}</span>}

      {error !== null && (
        <div id={bodyId} role="alert" style={{ display: 'grid', gap: 6 }}>
          <p style={errorSummaryStyle}>{errorSummary}</p>
          <details style={detailsStyle}>
            <summary style={detailsSummaryStyle}>{copy.technicalDetails}</summary>
            <pre style={errorBoxStyle}>{error.preview}</pre>
            <div style={footerStyle}>
              <span>{error.truncated ? copy.errorLimited(ERROR_PREVIEW_LIMIT.toLocaleString()) : copy.rawOutput}</span>
              <button type="button" style={downloadStyle} onClick={() => downloadCommandOutput(raw ?? error.preview, command, operation, isJsonCommandOutput(raw ?? ''))}>
                {copy.download}
              </button>
            </div>
          </details>
        </div>
      )}

      {expanded && output !== null && raw !== undefined && (
        <div id={bodyId} style={{ display: 'grid', gap: 6 }}>
          <pre style={bodyStyle}>{output.preview}</pre>
          <div style={footerStyle}>
            <span>{output.truncated ? copy.previewLimited(OUTPUT_PREVIEW_LIMIT.toLocaleString(), raw.length.toLocaleString()) : json ? copy.rawJson : copy.rawOutput}</span>
            {(json || output.truncated) && (
              <button type="button" style={downloadStyle} onClick={() => downloadCommandOutput(raw, command, operation, json)}>
                {copy.download}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
