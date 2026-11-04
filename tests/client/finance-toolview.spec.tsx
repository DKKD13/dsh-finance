import { createElement } from 'react'
import { renderToString } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import {
  FINANCE_TOOL_VIEW_TOOLS,
  FinanceToolView,
} from '../../client/ui/FinanceToolView.tsx'
import type { FinanceToolBlock } from '../../client/ui/FinanceToolView.tsx'
import { createHostNavigator, filePreviewAddress, hostNavigator, registerHostNavigator } from '../../client/host-nav.ts'
import { hasVisualArtifact, visualArtifactPath, visualArtifactSessionId } from '../../client/research.ts'

function resultBlock(name: string, argsRaw: string | undefined, content: string, isError = false): FinanceToolBlock {
  return { name, call: argsRaw === undefined ? null : { name, argsRaw }, content: [{ type: 'text', text: content }], isError }
}

describe('visual artifact file context', () => {
  it('keeps the recorded file session when the conversation chooser omits it', () => {
    const metadata = { sessionId: 'session-tool-only', visualArtifact: 'report.html' }
    expect(visualArtifactSessionId(metadata)).toBe('session-tool-only')
    expect(visualArtifactSessionId(metadata, 'session-current')).toBe('session-tool-only')
  })

  it('uses a known fallback only when no recorded file session is present', () => {
    expect(visualArtifactSessionId({}, 'session-current')).toBe('session-current')
    expect(visualArtifactSessionId({ sessionId: ' ' }, 'session-current')).toBe('session-current')
    expect(visualArtifactSessionId({ sessionId: 17 })).toBeUndefined()
    expect(visualArtifactSessionId(undefined)).toBeUndefined()
  })
})

describe('finance tool process view', () => {
  it('registers a keyed view for every own host tool', () => {
    expect(FINANCE_TOOL_VIEW_TOOLS).toHaveLength(11)
    for (const tool of [
      'finance_market_data', 'finance_ingest', 'finance_model', 'finance_graph',
      'finance_memory', 'finance_briefing', 'finance_virtual_fund',
      'research_graph_node', 'research_graph_edge', 'research_graph_query', 'research_graph_admin',
    ]) expect(FINANCE_TOOL_VIEW_TOOLS).toContain(tool)
  })

  it('describes a settled finance_model dcf call in Chinese', () => {
    const html = renderToString(createElement(FinanceToolView, {
      callId: 'call-1',
      toolName: 'finance_model',
      phase: 'result',
      block: resultBlock('finance_model', '{"action":"dcf","input":{"symbol":"AAPL"}}', '{"ok":true,"value":{"valuation":"…”}}'),
    }))
    expect(html).toContain('data-finance-tool="finance_model"')
    expect(html).toContain('data-state="success"')
    expect(html).toContain('金融')
    expect(html).toContain('DCF 估值计算')
    expect(html).toContain('完成')
    expect(html).toContain('查看详情')
    // The raw result stays out of the collapsed row.
    expect(html).not.toContain('"valuation"')
  })

  it('describes a graph query call with its search detail in English', () => {
    const html = renderToString(createElement(FinanceToolView, {
      callId: 'call-2',
      toolName: 'research_graph_query',
      phase: 'result',
      locale: 'en',
      block: resultBlock('research_graph_query', '{"action":"search","query":"CoWoS packaging capacity"}', '{"hits":3}'),
    }))
    expect(html).toContain('Research graph')
    expect(html).toContain('Searching the graph')
    expect(html).toContain('“CoWoS packaging capacity”')
    expect(html).toContain('Done')
    expect(html).not.toContain('{"hits":3}')
  })

  it('renders running and preparing phases without result material', () => {
    const running = renderToString(createElement(FinanceToolView, {
      callId: 'call-3',
      toolName: 'finance_memory',
      phase: 'start',
      block: { name: 'finance_memory', argsRaw: '{"action":"recall","query":"AAPL"}' },
    }))
    expect(running).toContain('data-phase="start"')
    expect(running).toContain('data-state="running"')
    expect(running).toContain('正在等待工具完成…')
    expect(running).toContain('“AAPL”')
    expect(running).not.toContain('查看详情')

    const preparing = renderToString(createElement(FinanceToolView, {
      callId: 'call-4',
      toolName: 'research_graph_node',
      phase: 'preparing',
      block: {},
    }))
    expect(preparing).toContain('data-phase="preparing"')
    expect(preparing).toContain('准备调用…')
  })

  it('shows a bounded failure summary for a settled error call', () => {
    const html = renderToString(createElement(FinanceToolView, {
      callId: 'call-5',
      toolName: 'finance_market_data',
      phase: 'result',
      block: resultBlock('finance_market_data', '{"action":"fetch"}', 'TRANSPORT: upstream unreachable', true),
    }))
    expect(html).toContain('data-state="error"')
    expect(html).toContain('失败')
    expect(html).toContain('TRANSPORT: upstream unreachable')
    expect(html).toContain('查看详情')
  })

  it('keeps a huge JSON result out of the collapsed DOM', () => {
    const payload = JSON.stringify({ rows: 'x'.repeat(400_000) })
    const html = renderToString(createElement(FinanceToolView, {
      callId: 'call-6',
      toolName: 'finance_graph',
      phase: 'result',
      block: resultBlock('finance_graph', '{"action":"stats"}', payload),
    }))
    expect(html).not.toContain('x'.repeat(1000))
    expect(html.length).toBeLessThan(10_000)
  })

  it('falls back to the raw action name for unknown actions', () => {
    const html = renderToString(createElement(FinanceToolView, {
      callId: 'call-7',
      toolName: 'research_graph_admin',
      phase: 'result',
      block: resultBlock('research_graph_admin', '{"action":"future_action"}', '{}'),
    }))
    expect(html).toContain('future_action')
  })
})

describe('host navigator bridge', () => {
  it('opens a ready conversation before navigating its mounted sidebar', async () => {
    const events: string[] = []
    let mounted: string | undefined
    const navigator = createHostNavigator({
      sessions: { using: async (_id, _options, operation) => operation({ ready: Promise.resolve().then(() => { events.push('ready') }) }) },
      uiWorkspace: { openSession: id => { events.push(`session:${id}`); mounted = id } },
      sidebarRight: { mounted: { getSnapshot: () => mounted }, openResource: address => { events.push(address) } },
    })
    await expect(navigator?.openFilePreview('session-report', 'report.html')).resolves.toBe(true)
    expect(events).toEqual(['ready', 'session:session-report', 'dsh-resource://file/session/session-report/report.html'])
  })

  it('does not put an old request into a different conversation sidebar', async () => {
    let opened = false
    const navigator = createHostNavigator({
      sessions: { using: async (_id, _options, operation) => operation({ ready: Promise.resolve() }) },
      uiWorkspace: { openSession() {} },
      sidebarRight: { mounted: { getSnapshot: () => 'session-other' }, openResource: () => { opened = true } },
    })
    await expect(navigator?.openFilePreview('session-report', 'report.html')).rejects.toThrow('no longer selected')
    expect(opened).toBe(false)
  })

  it('builds the sidebar file-preview address per-segment', () => {
    expect(filePreviewAddress('s 1', 'reports/tsmc visual.html'))
      .toBe('dsh-resource://file/session/s%201/reports/tsmc%20visual.html')
  })

  it('keeps absolute paths absolute in the sidebar file-preview address', () => {
    expect(filePreviewAddress('s1', '/home/wangzhenhao/native-workspace/abs-visual.html'))
      .toBe('dsh-resource://file/session/s1//home/wangzhenhao/native-workspace/abs-visual.html')
    expect(filePreviewAddress('s1', 'C:\\work\\report.html'))
      .toBe('dsh-resource://file/session/s1/C:/work/report.html')
  })

  it('registers and clears the probed navigator', () => {
    registerHostNavigator({ openFilePreview: () => true })
    expect(hostNavigator()?.openFilePreview('s', 'a.html')).toBe(true)
    registerHostNavigator(undefined)
    expect(hostNavigator()).toBeUndefined()
  })
})

describe('visual artifact entry validation', () => {
  it('accepts workspace-relative HTML paths unchanged', () => {
    expect(visualArtifactPath({ visualArtifact: 'reports/a-visual.html' })).toBe('reports/a-visual.html')
    expect(visualArtifactPath({ visualArtifact: 'a-visual.htm' })).toBe('a-visual.htm')
    expect(visualArtifactPath({ visualArtifact: '../a.html' })).toBeUndefined()
    expect(visualArtifactPath({ visualArtifact: 'a/../b.html' })).toBeUndefined()
    expect(visualArtifactPath({ visualArtifact: './a.html' })).toBeUndefined()
    expect(visualArtifactPath({ visualArtifact: 'https://x/a.html' })).toBeUndefined()
    expect(visualArtifactPath({ visualArtifact: 'a.md' })).toBeUndefined()
    expect(visualArtifactPath({ visualArtifact: 'a\\b.html' })).toBeUndefined()
    expect(visualArtifactPath({ visualArtifact: 42 })).toBeUndefined()
    expect(visualArtifactPath({})).toBeUndefined()
    expect(visualArtifactPath(undefined)).toBeUndefined()
  })

  it('accepts absolute HTML paths the host file preview can read', () => {
    expect(visualArtifactPath({ visualArtifact: '/home/wangzhenhao/native-workspace/abs-visual.html' }))
      .toBe('/home/wangzhenhao/native-workspace/abs-visual.html')
    expect(visualArtifactPath({ visualArtifact: 'C:\\work\\report.html' })).toBe('C:/work/report.html')
    expect(visualArtifactPath({ visualArtifact: 'D:/work/report.htm' })).toBe('D:/work/report.htm')
    expect(visualArtifactPath({ visualArtifact: '/abs/../a.html' })).toBeUndefined()
    expect(visualArtifactPath({ visualArtifact: '/abs//a.html' })).toBeUndefined()
    expect(visualArtifactPath({ visualArtifact: '//server/share/a.html' })).toBeUndefined()
    expect(visualArtifactPath({ visualArtifact: 'C:/../a.html' })).toBeUndefined()
    expect(visualArtifactPath({ visualArtifact: 'C:\\a\\..\\b.html' })).toBeUndefined()
    expect(visualArtifactPath({ visualArtifact: '/abs/a.md' })).toBeUndefined()
  })

  it('only marks shapes that stay non-openable as present-but-locatable-missing', () => {
    expect(hasVisualArtifact({ visualArtifact: '/abs/a.html' })).toBe(false)
    expect(hasVisualArtifact({ visualArtifact: 'https://x/a.html' })).toBe(true)
    expect(hasVisualArtifact({ visualArtifact: 'reports/a-visual.html' })).toBe(false)
    expect(hasVisualArtifact({ visualArtifact: '' })).toBe(false)
    expect(hasVisualArtifact({ visualArtifact: 42 })).toBe(false)
    expect(hasVisualArtifact(undefined)).toBe(false)
  })
})
