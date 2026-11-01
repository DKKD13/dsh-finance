import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import type { GraphNode } from '../../src/graph.ts'
import { isResearchSource, researchContextPrompt, researchPrompt } from '../research.ts'
import type { ResearchMode, ResearchRequest } from '../research.ts'
import type { ConversationGateway } from '../conversations.ts'
import { librarySummaryInstruction } from '../conversation-launch.ts'
import { workflowSkillPrompt } from '../workflow-skills.ts'

/** UI boundary; the shell adapter supplies real conversations and native navigation. */
export type ConversationAccess = ConversationGateway

export type { ConversationSeed } from '../conversation-seed.ts'
import type { ConversationSeed } from '../conversation-seed.ts'

export function ConversationDialog({ access, seed, reports, sources = [], locale, onClose }: {
  readonly access: ConversationAccess
  readonly seed: ConversationSeed
  readonly reports: readonly GraphNode[]
  readonly sources?: readonly GraphNode[]
  readonly locale: string
  readonly onClose: () => void
}) {
  const dialog = useRef<HTMLDialogElement>(null)
  const zh = locale.startsWith('zh')
  const text = (cn: string, en: string) => zh ? cn : en
  const [mode, setMode] = useState(seed.mode)
  const [ticker, setTicker] = useState(seed.ticker ?? '')
  const [question, setQuestion] = useState(seed.question ?? '')
  const [baseReportId, setBaseReportId] = useState(seed.baseReportId ?? reports[0]?.id ?? '')
  const [asOf, setAsOf] = useState(seed.asOf ?? '')
  const [sessionId, setSessionId] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const sessions = access.list()
  const selectedSources = (seed.sourceIds ?? []).flatMap(id => sources.filter(node => node.id === id && isResearchSource(node)))
  const missingSource = (seed.sourceIds ?? []).some(id => !selectedSources.some(node => node.id === id)) || !!seed.sourceSummaryId && !selectedSources.some(node => node.id === seed.sourceSummaryId && node.kind === 'source')
  const ready = !missingSource && (mode === 'ticker' ? !!ticker.trim() : !!question.trim() && (mode !== 'deep' || reports.some(report => report.id === baseReportId)))
  useEffect(() => { dialog.current?.showModal() }, [])
  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (!ready || busy) return
    setBusy(true); setError('')
    const cutoff = asOf.trim() ? { asOf: asOf.trim() } : {}
    const request: Extract<ResearchRequest, { kind: 'research' }> = mode === 'ticker'
      ? { kind: 'research', mode, ticker: ticker.trim(), ...cutoff }
      : mode === 'question' ? { kind: 'research', mode, question: question.trim(), ...cutoff }
        : { kind: 'research', mode, question: question.trim(), baseReportId, ...cutoff }
    try {
      const context = researchContextPrompt({ ticker, sourceIds: seed.sourceIds }, sources)
      const summaryInstruction = seed.sourceSummaryId ? librarySummaryInstruction(seed.sourceSummaryId) : ''
      const prompt = [seed.skillName ? workflowSkillPrompt(seed.skillName, question, asOf) : researchPrompt(`run:${crypto.randomUUID()}`, request), context, summaryInstruction, mode === 'ticker' && question.trim() ? `Research focus: ${JSON.stringify(question.trim())}` : ''].filter(Boolean).join('\n\n')
      const result = await access.prepare({ ...(sessionId ? { sessionId } : {}), text: actualSessionId => seed.skillName ? `${prompt}\n\nCurrent DSH conversation: ${JSON.stringify(actualSessionId)}` : `${prompt}\n\n${text('请以 Markdown 输出研究报告，保留来源引用、关键假设和不确定性。', 'Write the research report in Markdown, keeping source citations, key assumptions and uncertainty.')}\n${text('保存 deliverable 时，把本次真实对话标识写入 metadata.sessionId，便于从报告返回原对话：', 'When saving the deliverable, set metadata.sessionId to this actual conversation reference so the report can return here: ')}${JSON.stringify(actualSessionId)}` })
      if (result.status !== 'applied') throw new Error(result.status === 'preserved'
        ? text('这个对话已有未发送内容，已保留。请选择新对话，或先处理原草稿。', 'This conversation has an unsent draft, which was preserved. Choose a new conversation or finish that draft first.')
        : text('对话暂时不能接收草稿，请选择其他对话。', 'This conversation cannot receive a draft right now. Choose another conversation.'))
      onClose()
    } catch (cause) {
      const detail = cause instanceof Error ? cause.message : String(cause)
      setError(detail === 'DSH_WORKSPACE_REQUIRED'
        ? text('请先在 DSH 主站添加一个工作区，再开始研究。', 'Add a workspace in DSH before starting research.')
        : text('无法进入对话。', 'Could not open the conversation.') + ' ' + detail)
      setBusy(false)
    }
  }
  return <dialog ref={dialog} className="rg-conversation-dialog rg-catalog-modal" aria-labelledby="rg-conversation-title" onCancel={event => { if (busy) event.preventDefault(); else onClose() }}>
    <header><div><h3 id="rg-conversation-title">{text('在对话中研究', 'Research in a conversation')}</h3><p>{text('准备问题后，进入 DSH 对话继续。', 'Prepare the question, then continue in DSH.')}</p></div><button type="button" className="rg-btn" disabled={busy} onClick={onClose} aria-label={text('关闭', 'Close')}>×</button></header>
    <form onSubmit={event => { void submit(event) }}>
      <fieldset disabled={busy}>
        {!seed.skillName && <div className="rg-conversation-modes" role="group" aria-label={text('研究方式', 'Research mode')}>{(['ticker', 'question', 'deep'] as const).map(value => <button type="button" key={value} aria-pressed={mode === value} onClick={() => setMode(value)}>{value === 'ticker' ? text('公司研究', 'Company') : value === 'question' ? text('问题研究', 'Question') : text('深入已有报告', 'Deep research')}</button>)}</div>}
        <span className="rg-conversation-skill">{seed.skillName ? `/${seed.skillName}` : `${mode === 'deep' ? '/deep-research' : '/research'} · Markdown`}</span>
        {(mode !== 'ticker' && ticker || selectedSources.length > 0) && <div className="rg-research-context" aria-label={text('研究上下文', 'Research context')}>
          {mode !== 'ticker' && ticker && <span>@ {ticker}</span>}{selectedSources.map(source => <span key={source.id} title={source.title}><span className="rg-research-chip-label">{source.title}</span></span>)}
        </div>}
        {mode === 'ticker' ? <label>{text('股票代码', 'Ticker')}<input required value={ticker} onChange={event => setTicker(event.target.value)} placeholder="AAPL" /></label> : <label>{text('你想研究什么？', 'What would you like to research?')}<textarea required rows={4} value={question} onChange={event => setQuestion(event.target.value)} /></label>}
        {mode === 'ticker' && <label>{text('研究重点（可选）', 'Research focus (optional)')}<textarea rows={2} value={question} onChange={event => setQuestion(event.target.value)} /></label>}
        {mode === 'deep' && <label>{text('从哪份报告继续', 'Continue from a report')}<select required value={baseReportId} onChange={event => setBaseReportId(event.target.value)}><option value="">{text('选择已有报告', 'Choose a report')}</option>{reports.map(report => <option key={report.id} value={report.id}>{report.title}</option>)}</select>{reports.length === 0 && <small>{text('先完成一份公司或问题研究，再深入分析。', 'Complete a company or question report first.')}</small>}</label>}
        <label>{text('进入哪个对话', 'Conversation')}<select value={sessionId} onChange={event => setSessionId(event.target.value)}><option value="">{text('新建研究对话', 'New research conversation')}</option>{sessions.map(session => <option key={session.id} value={session.id}>{session.title}</option>)}</select></label>
        <details><summary>{text('截止时间', 'As-of cutoff')}</summary><label>{text('研究截止时间（可选）', 'As-of cutoff (optional)')}<input value={asOf} onChange={event => setAsOf(event.target.value)} placeholder="2026-10-31T00:00:00Z" /></label></details>
      </fieldset>
      {missingSource && <p role="alert">{text('所选资料已不可用。请关闭窗口，重新选择资料。', 'A selected source is no longer available. Close this dialog and select sources again.')}</p>}
      {error && <p role="alert">{error}</p>}
      <footer><small>{text('问题会放进输入框，由你在对话中发送。', 'The question is prepared in the composer for you to send.')}</small><button type="submit" className="rg-btn" data-primary disabled={!ready || busy}>{busy ? text('正在准备…', 'Preparing…') : text('进入对话', 'Open conversation')}</button></footer>
    </form>
  </dialog>
}
