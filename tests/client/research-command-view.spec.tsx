import { createElement } from 'react'
import { renderToString } from 'react-dom/server'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  boundedCommandOutput,
  downloadCommandOutput,
  isJsonCommandOutput,
  ResearchCommandView,
} from '../../client/ui/ResearchCommandView.tsx'
import type { ResearchCommandNode } from '../../client/ui/ResearchCommandView.tsx'

function command(text: string | undefined, kind: 'success' | 'error' = 'success'): ResearchCommandNode {
  return {
    seq: 1,
    time: 1,
    commandId: 'command-1',
    name: 'finance',
    args: ' {"op":"graph.snapshot"}',
    outcome: { kind, ...(text === undefined ? {} : { text }) },
  }
}

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('research command renderer', () => {
  it('bounds a done-only history row whose command name is not loaded', () => {
    const raw = 'history-result-'.repeat(130_000)
    const html = renderToString(createElement(ResearchCommandView, {
      node: { ...command(raw), name: null, args: null },
    }))
    expect(html).toContain('data-research-command="command"')
    expect(html).toContain('查看结果')
    expect(html).not.toContain('history-result-')
    expect(html.length).toBeLessThan(10_000)
  })

  it('keeps a 1.7 MB JSON payload out of the collapsed DOM and bounds expansion', () => {
    const pathological = '# heading <script>alert("not markup")</script>\n'.repeat(40_000)
    const raw = JSON.stringify({ op: 'graph.snapshot', content: pathological, marker: 'END_OF_FULL_PAYLOAD' })
    expect(raw.length).toBeGreaterThan(1_700_000)
    expect(isJsonCommandOutput(raw)).toBe(true)

    const html = renderToString(createElement(ResearchCommandView, { node: command(raw), locale: 'en' }))
    expect(html).toContain('Finance')
    expect(html).toContain('graph.snapshot')
    expect(html).toContain('Show result')
    expect(html).not.toContain('<pre')
    expect(html).not.toContain('# heading')
    expect(html).not.toContain('END_OF_FULL_PAYLOAD')
    expect(html.length).toBeLessThan(10_000)

    const output = boundedCommandOutput(raw)
    expect(output.preview).toHaveLength(16_000)
    expect(output.truncated).toBe(true)
    expect(output.preview).toContain('<script>alert(\\"not markup\\")</script>')
    expect(output.preview).not.toContain('END_OF_FULL_PAYLOAD')
  })

  it('shows a concise Chinese error and keeps the raw response folded in technical details', () => {
    const text = JSON.stringify({
      ok: false,
      error: { code: 'UNAVAILABLE', message: 'Provider rejected the request' },
      diagnostic: '<b>raw markup stays text</b>',
      marker: 'AFTER_ERROR_PREVIEW',
    }, null, 2)
    const html = renderToString(createElement(ResearchCommandView, { node: command(text, 'error'), locale: 'en' }))
    expect(html).toContain('Finance data is temporarily unavailable.')
    expect(html).toContain('role="alert"')
    expect(html).toMatch(/<details(?![^>]*\bopen(?:=|\s|>))[^>]*><summary[^>]*>Technical details<\/summary>/)
    expect(html).toContain('Provider rejected the request')
    expect(html).toContain('Download full output')
  })

  it('uses Chinese technical-detail copy by default and bounds oversized raw errors', () => {
    const text = JSON.stringify({
      ok: false,
      error: { code: 'UNAVAILABLE', message: 'offline' },
      diagnostic: `${'detail '.repeat(120)}AFTER_ERROR_PREVIEW`,
    })
    const html = renderToString(createElement(ResearchCommandView, { node: command(text, 'error') }))
    expect(html).toContain('金融数据服务暂时不可用。')
    expect(html).toContain('技术详情')
    expect(html).toContain('错误预览限制为 800 个字符。')
    expect(html).not.toContain('AFTER_ERROR_PREVIEW')
  })

  it('downloads the exact source string through a user-click action with mocked URL APIs', async () => {
    vi.useFakeTimers()
    const raw = JSON.stringify({ op: 'graph.snapshot', content: '# exact\n<raw>&bytes', marker: 'FULL' })
    const createObjectURL = vi.fn(() => 'blob:research-command')
    const revokeObjectURL = vi.fn()
    const click = vi.fn()
    const anchor = { href: '', download: '', click }
    vi.stubGlobal('URL', { createObjectURL, revokeObjectURL })
    vi.stubGlobal('document', { createElement: vi.fn(() => anchor) })

    downloadCommandOutput(raw, 'finance', 'graph.snapshot', true)

    expect(createObjectURL).toHaveBeenCalledTimes(1)
    const blob = createObjectURL.mock.calls.at(0)?.at(0) as Blob | undefined
    expect(blob).toBeInstanceOf(Blob)
    if (blob === undefined) throw new Error('missing command output Blob')
    expect(Buffer.from(await blob.arrayBuffer()).equals(Buffer.from(raw, 'utf8'))).toBe(true)
    expect(anchor.download).toBe('dsh-finance-graph.snapshot.json')
    expect(click).toHaveBeenCalledTimes(1)
    expect(revokeObjectURL).not.toHaveBeenCalled()
    vi.runAllTimers()
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:research-command')
  })

  it('uses Chinese by default and switches the inline copy for English', () => {
    const zh = renderToString(createElement(ResearchCommandView, { node: command('{"ok":true}') }))
    expect(zh).toContain('金融')
    expect(zh).toContain('完成')
    expect(zh).toContain('查看结果')

    const en = renderToString(createElement(ResearchCommandView, { node: command('{"ok":true}'), locale: 'en-US' }))
    expect(en).toContain('Finance')
    expect(en).toContain('Done')
    expect(en).toContain('Show result')
  })
})
