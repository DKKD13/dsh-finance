import { describe, expect, it, vi } from 'vitest'
import { launchResearchConversation } from '../../client/conversation-launch.ts'
import type {
  ConversationGateway,
  ConversationPrepareInput,
  ConversationPrepareResult,
} from '../../client/conversations.ts'
import type { ConversationSeed } from '../../client/conversation-seed.ts'
import type { GraphNode, NodeKind } from '../../src/graph.ts'

function node(id: string, kind: NodeKind = 'source', metadata: GraphNode['metadata'] = {}): GraphNode {
  return { id, kind, title: id, content: id, metadata, createdAt: 1, updatedAt: 1 }
}

function harness(prepare: ConversationGateway['prepare'], sessionIds: readonly string[] = []) {
  const open = vi.fn(async (_id: string) => undefined)
  const send = vi.fn()
  const access = {
    list: () => sessionIds.map(id => ({
      id,
      title: id,
      cwd: null,
      running: false,
      updatedAt: 0,
    })),
    currentId: () => null,
    open,
    prepare,
    send,
  }
  return { access, open, send }
}

function renderedText(input: ConversationPrepareInput, actualId = 'session:actual'): string {
  return typeof input.text === 'function' ? input.text(actualId) : input.text
}

describe('launchResearchConversation', () => {
  it('prepares a workflow draft with the exact Skill and actual conversation id without sending', async () => {
    const prepare = vi.fn(async (_input: ConversationPrepareInput): Promise<ConversationPrepareResult> => ({
      sessionId: 'session:actual',
      status: 'applied',
    }))
    const h = harness(prepare, ['session:current'])
    const seed: ConversationSeed = {
      mode: 'question',
      question: 'Review Apple latest earnings',
      skillName: 'equity-earnings',
    }

    await expect(launchResearchConversation(h.access, seed, [], 'en', 'session:current')).resolves.toEqual({
      sessionId: 'session:actual',
      status: 'applied',
    })

    expect(prepare).toHaveBeenCalledOnce()
    const input = prepare.mock.calls[0]?.[0]
    expect(input).toMatchObject({ sessionId: 'session:current' })
    expect(input).not.toHaveProperty('clearPreviousDraft')
    const prompt = renderedText(input!)
    expect(prompt).toMatch(/^\/equity-earnings\nrunId=run:[0-9a-f-]+\nTask: "Review Apple latest earnings"/u)
    expect(prompt).toContain('Current DSH conversation: "session:actual"')
    expect(prompt).toContain('ask one concise question first')
    expect(h.open).not.toHaveBeenCalled()
    expect(h.send).not.toHaveBeenCalled()
  })

  it('passes ticker, selected sources, and a trimmed cutoff into the prepared draft', async () => {
    const prepare = vi.fn(async (_input: ConversationPrepareInput): Promise<ConversationPrepareResult> => ({
      sessionId: 'session:ticker',
      status: 'applied',
    }))
    const h = harness(prepare)
    const seed: ConversationSeed = {
      mode: 'ticker',
      ticker: ' AAPL ',
      question: 'Focus on margin durability',
      sourceIds: ['source:apple'],
      asOf: ' 2026-10-31T00:00:00Z ',
    }

    await launchResearchConversation(h.access, seed, [node('source:apple')], 'en')

    expect(prepare).toHaveBeenCalledOnce()
    const input = prepare.mock.calls[0]?.[0]
    expect(input).not.toHaveProperty('sessionId')
    expect(input).not.toHaveProperty('clearPreviousDraft')
    const prompt = renderedText(input!, 'session:ticker')
    expect(prompt).toMatch(/^\/research\nrunId=run:[0-9a-f-]+ mode=Ticker ticker=AAPL asOf=2026-10-31T00:00:00Z/u)
    expect(prompt).toContain('Company context: ticker="AAPL".')
    expect(prompt).toContain('Selected source node IDs: ["source:apple"].')
    expect(prompt).toContain('Research focus: "Focus on margin durability"')
    expect(prompt).toContain('Current DSH conversation: "session:ticker"')
    expect(h.open).not.toHaveBeenCalled()
    expect(h.send).not.toHaveBeenCalled()
  })

  it('rejects a missing selected source before preparing or opening a draft', async () => {
    const prepare = vi.fn(async (_input: ConversationPrepareInput): Promise<ConversationPrepareResult> => ({
      sessionId: 'session:unexpected',
      status: 'applied',
    }))
    const h = harness(prepare)

    await expect(launchResearchConversation(h.access, {
      mode: 'question',
      question: 'Use the filing',
      sourceIds: ['source:missing'],
    }, [], 'en')).rejects.toThrow('Selected source is unavailable: source:missing')

    expect(prepare).not.toHaveBeenCalled()
    expect(h.open).not.toHaveBeenCalled()
    expect(h.send).not.toHaveBeenCalled()
  })

  it('rejects a missing summary source before preparing or opening a draft', async () => {
    const prepare = vi.fn(async (_input: ConversationPrepareInput): Promise<ConversationPrepareResult> => ({
      sessionId: 'session:unexpected',
      status: 'applied',
    }))
    const h = harness(prepare)

    await expect(launchResearchConversation(h.access, {
      mode: 'question',
      question: 'Summarize the filing',
      sourceSummaryId: 'source:missing',
    }, [], 'en')).rejects.toThrow('SOURCE_UNAVAILABLE')

    expect(prepare).not.toHaveBeenCalled()
    expect(h.open).not.toHaveBeenCalled()
    expect(h.send).not.toHaveBeenCalled()
  })

  it('binds a Library summary to persisted content instead of a title-only RSS hash', async () => {
    const prepare = vi.fn(async (_input: ConversationPrepareInput): Promise<ConversationPrepareResult> => ({
      sessionId: 'session:summary',
      status: 'applied',
    }))
    const h = harness(prepare)

    await launchResearchConversation(h.access, {
      mode: 'question',
      question: 'Summarize the article',
      sourceSummaryId: 'source:rss-article',
    }, [node('source:rss-article')], 'en')

    const prompt = renderedText(prepare.mock.calls[0]![0])
    expect(prompt).toContain('When full persisted raw is available, use only that material')
    expect(prompt).toContain('do not fetch external sources or perform external validation unless explicitly requested')
    expect(prompt).toContain('apply these summary limits even when the surrounding workflow asks for a report')
    expect(prompt).toContain('3–5 key facts')
    expect(prompt).toContain('at most 600 Unicode characters, counting Latin letters, digits, punctuation, locations and caveats too')
    expect(prompt).toContain('For an English summary, use at most 400 words.')
    expect(prompt).toContain('round only once to the precision actually shown in the summary')
    expect(prompt).toContain('For every number, identify its period and unit')
    expect(prompt).toContain('label it as disclosed or computed')
    expect(prompt).toContain('preserve quarterly versus annual periods and accounting basis')
    expect(prompt).toContain('Use a real calculation tool to check every calculation and numeric comparison')
    expect(prompt).toContain('Never state an unchecked numeric relationship')
    expect(prompt).toContain('Do not infer author intent, editorial position or implications from omissions')
    expect(prompt).toContain('Preserve source identity and original source dates')
    expect(prompt).toContain('title-only, URL-only, a stub')
    expect(prompt).toContain('finance_ingest action "ingest"')
    expect(prompt).toContain('persist the exact full text as a new source/raw revision')
    expect(prompt).toContain('Use the actual source contentHash')
    expect(prompt).toContain("sourceContentHash must equal that source's metadata.contentHash")
    expect(prompt).toContain('do not copy the selected source hash blindly')
    expect(prompt).toContain('Preserve all existing metadata and the original material')
    expect(prompt).toContain('keep the old title/URL source and raw unchanged')
    expect(prompt).toContain('do not write aiSummary')
    expect(prompt).toContain('ask one targeted question')
    expect(h.send).not.toHaveBeenCalled()
  })

  it('opens a preserved draft without retrying or overwriting it', async () => {
    const prepare = vi.fn(async (_input: ConversationPrepareInput): Promise<ConversationPrepareResult> => ({
      sessionId: 'session:preserved',
      status: 'preserved',
    }))
    const h = harness(prepare, ['session:preserved'])

    await expect(launchResearchConversation(h.access, {
      mode: 'question',
      question: 'Prepare a replacement draft',
    }, [], 'en', 'session:preserved')).resolves.toEqual({
      sessionId: 'session:preserved',
      status: 'preserved',
    })

    expect(prepare).toHaveBeenCalledOnce()
    expect(prepare.mock.calls[0]?.[0]).not.toHaveProperty('clearPreviousDraft')
    expect(h.open).toHaveBeenCalledOnce()
    expect(h.open).toHaveBeenCalledWith('session:preserved')
    expect(h.send).not.toHaveBeenCalled()
  })

  it('creates a safe draft when a linked conversation is unavailable while retaining its historical reference', async () => {
    const prepare = vi.fn(async (_input: ConversationPrepareInput): Promise<ConversationPrepareResult> => ({
      sessionId: 'session:recovery',
      status: 'applied',
    }))
    const h = harness(prepare, ['session:current'])

    await expect(launchResearchConversation(h.access, {
      mode: 'question',
      question: 'Continue the saved research',
    }, [], 'en', 'session:removed')).resolves.toEqual({
      sessionId: 'session:recovery',
      status: 'applied',
    })

    expect(prepare).toHaveBeenCalledOnce()
    const input = prepare.mock.calls[0]?.[0]
    expect(input).not.toHaveProperty('sessionId')
    expect(input).not.toHaveProperty('clearPreviousDraft')
    const prompt = renderedText(input!, 'session:recovery')
    expect(prompt).toContain('The previous conversation "session:removed" is unavailable.')
    expect(prompt).toContain('preserve the original conversation reference in its history')
    expect(prompt).toContain('Current DSH conversation: "session:recovery"')
    expect(h.open).not.toHaveBeenCalled()
    expect(h.send).not.toHaveBeenCalled()
  })

  it('surfaces a blocked conversation as an error without opening it', async () => {
    const prepare = vi.fn(async (_input: ConversationPrepareInput): Promise<ConversationPrepareResult> => ({
      sessionId: 'session:blocked',
      status: 'blocked',
    }))
    const h = harness(prepare)

    await expect(launchResearchConversation(h.access, {
      mode: 'question',
      question: 'Start research',
    }, [], 'en')).rejects.toThrow('CONVERSATION_BLOCKED')

    expect(h.open).not.toHaveBeenCalled()
    expect(h.send).not.toHaveBeenCalled()
  })

  it('propagates transport errors from draft preparation', async () => {
    const error = new Error('transport offline')
    const prepare = vi.fn(async (_input: ConversationPrepareInput): Promise<ConversationPrepareResult> => {
      throw error
    })
    const h = harness(prepare)

    await expect(launchResearchConversation(h.access, {
      mode: 'question',
      question: 'Start research',
    }, [], 'en')).rejects.toBe(error)

    expect(h.open).not.toHaveBeenCalled()
    expect(h.send).not.toHaveBeenCalled()
  })
})
