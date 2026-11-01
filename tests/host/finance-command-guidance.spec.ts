import { describe, expect, it, vi } from 'vitest'
import type { Context } from '@deepseek-ai/cordis'
import type { CommandDefinition, CommandInvocation } from '@deepseek-ai/dsh-commands'
import { registerFinanceCommand } from '../../src/finance/commands.ts'
import type { FinanceService } from '../../src/finance/service.ts'
import { buildPrompt, guideLessons, lessonById, lessonCutoff } from '../../client/tutorial.ts'

function harness(stats = vi.fn(async () => ({ revision: 3, nodes: 2, edges: 1 }))) {
  let definition: CommandDefinition | undefined
  const context = {
    commands: {
      register(candidate: CommandDefinition) {
        definition = candidate
        return () => { definition = undefined }
      },
    },
  } as unknown as Context
  const finance = { stats } as unknown as FinanceService
  registerFinanceCommand(context, finance)
  if (definition === undefined) throw new Error('finance command was not registered')
  const run = (rawInput: string) => definition?.handler({
    commandId: 'cmd-guidance',
    agent: undefined,
    rawInput,
    attachments: [],
    signal: new AbortController().signal,
  } as unknown as CommandInvocation)
  return { run, stats }
}

describe('/finance command guidance', () => {
  it('shows a Chinese-first quick start for empty input', async () => {
    const { run, stats } = harness()
    const result = await run('')
    expect(result?.kind).toBe('success')
    expect(result?.text).toContain('DSH Finance · 快速开始')
    expect(result?.text).toContain('/finance guide first-chain')
    expect(result?.text).toContain('/research')
    expect(result?.text).toContain('不会替你启动研究')
    expect(stats).not.toHaveBeenCalled()
  })

  it('routes prose-shaped unknown input to one honest research entry without classifying it', async () => {
    const { run, stats } = harness()
    const chinese = await run('分析一下贵州茅台最新财报')
    const english = await run('what should I research next')
    expect(chinese?.kind).toBe('error')
    expect(english?.kind).toBe('error')
    expect(chinese?.text).toContain('没有执行这项输入，也没有启动模型或写入图谱')
    expect(chinese?.text).toContain('Open Finance in the sidebar')
    expect(chinese?.text).toContain('/finance guide first-chain')
    expect(chinese?.text).toContain('`/research`')
    expect(chinese?.text).toContain('没有对输入做语义分类')
    expect(english?.text?.replace('what', '分析一下贵州茅台最新财报')).toBe(chinese?.text)
    expect(stats).not.toHaveBeenCalled()
  })

  it('keeps mechanical typos, missing arguments and malformed JSON on their existing errors', async () => {
    const { run, stats } = harness()
    const typo = await run('stat')
    expect(typo?.kind).toBe('error')
    expect(typo?.text).toContain('Unknown subcommand "stat"')
    expect(typo?.text).toContain('Usage: /finance')
    expect(typo?.text).not.toContain('统一入口说明')

    const missing = await run('show')
    expect(missing?.kind).toBe('error')
    expect(missing?.text).toBe('show requires a node id.')

    const malformed = await run('{"op":"graph.stats"')
    expect(malformed?.kind).toBe('error')
    expect(malformed?.text).toContain('Usage: /finance')
    expect(malformed?.text).not.toContain('统一入口说明')
    expect(stats).not.toHaveBeenCalled()
  })

  it('preserves known human and JSON dispatch contracts', async () => {
    const { run, stats } = harness()
    const human = await run('stats')
    expect(human).toEqual({ kind: 'success', text: 'revision 3: 2 nodes, 1 edges' })
    expect(stats).toHaveBeenCalledTimes(1)

    const json = await run('{"op":"graph.stats"}')
    expect(json?.kind).toBe('success')
    expect(json?.text).toContain('"ok": true')
    expect(json?.text).toContain('"revision": 3')
    expect(json?.text).toContain('"nodes": 2')

    const unknownOp = await run('{"op":"not-a-finance-op"}')
    expect(unknownOp?.kind).toBe('error')
    expect(unknownOp?.text).toContain('"code": "UNKNOWN_OP"')
    expect(unknownOp?.text).not.toContain('统一入口说明')
    expect(stats).toHaveBeenCalledTimes(2)
  })
})

describe('guide lesson 5 source availability', () => {
  it('defaults guide copy to Chinese with a workflow entry independent of section ids', () => {
    const lessons = guideLessons(undefined)
    expect(lessons[0]?.title).toContain('公开剪藏')
    expect(lessons.every(lesson => lesson.summary.includes('Workflow'))).toBe(true)
    expect(lessons.every(lesson => lesson.summary.includes('Market'))).toBe(true)
    expect(lessons.every(lesson => lesson.summary.includes('Reports'))).toBe(true)
  })

  it('keeps availableAt and asOf as explicit user inputs without using capturedAt', () => {
    const lesson = lessonById('web-clipper')
    expect(lessonCutoff('web-clipper', new Date('2026-11-01T12:00:00.000Z'))).toBeUndefined()
    const built = buildPrompt(lesson?.prompt ?? '', { asOf: '2026-11-01T12:00:00.000Z' }, 'guide:fixed-run')
    expect(built.text).toContain('"availableAt":"<published-or-available ISO>"')
    expect(built.text).toContain('"asOf":"<explicit asOf ISO>"')
    expect(built.text).not.toContain('2026-11-01T12:00:00.000Z')
    expect(built.text).not.toContain('capturedAt')
  })
})
