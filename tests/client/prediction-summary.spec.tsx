import { Children, createElement, isValidElement } from 'react'
import type { ReactElement, ReactNode } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, describe, expect, it, vi } from 'vitest'
vi.mock('@deepseek-ai/dsh-client-ui-primitives', () => ({
  MarkdownText: ({ text }: { text: string }) => text,
}))
import { BriefingPanel, PredictionsPanel, PredictionSummary } from '../../client/ui/FinanceMemory.tsx'
import { FinanceStore } from '../../client/finance-store.ts'
import type { FinanceGateway } from '../../client/finance-store.ts'
import { en, zh } from '../../client/locales.ts'
import type { Translate } from '../../client/store.ts'
import type { GraphNode } from '../../src/graph.ts'
import { launchResearchConversation } from '../../client/conversation-launch.ts'
import type { ConversationPrepareInput } from '../../client/conversations.ts'

const t = (key: string) => key

describe('prediction summary', () => {
  it('preserves zero values and exact settlement time without exposing raw rules by default', () => {
    const html = renderToStaticMarkup(createElement(PredictionSummary, {
      t,
      value: {
        id: 'prediction:zero',
        content: '{"secretRule":"full original evidence"}',
        metadata: {
          resolutionDate: '2026-11-06T21:00:01Z',
          prediction: { metric: 'Public sample price', expectedValue: 0, operator: '>', probability: 0 },
        },
      },
    }))
    expect(html).toContain('Public sample price')
    expect(html).toContain('&gt; 0')
    expect(html).toContain('0%')
    expect(html).toMatch(/datetime="2026-11-06T21:00:01Z"/iu)
    expect(html).toContain('2026-11-06 21:00:01 UTC')
    expect(html).toContain('finance.predictions.ruleDetails')
    expect(html).not.toContain('full original evidence')
    expect(html).not.toContain('<details open')
  })

  it('keeps legacy text and renders only explicit valid probability fields', () => {
    const legacy = renderToStaticMarkup(createElement(PredictionSummary, { t, value: { content: 'Legacy <script>content</script>' } }))
    expect(legacy).toContain('Legacy &lt;script&gt;content&lt;/script&gt;')
    const invalid = renderToStaticMarkup(createElement(PredictionSummary, {
      t, value: { metadata: { prediction: { probability: 1.2, direction: 'down', predictedValue: 0 } } },
    }))
    expect(invalid).toContain('down')
    expect(invalid).toContain('<dd>0</dd>')
    expect(invalid).not.toContain('120%')
    expect(invalid).not.toContain('finance.valuation.columns.probability')
  })
})

describe.each([{ language: 'en', dictionary: en }, { language: 'zh', dictionary: zh }])('memory conversation entry ($language)', ({ language, dictionary }) => {
  const translate: Translate = key => dictionary[key as keyof typeof dictionary] ?? key
  const saved: GraphNode = {
    id: 'prediction:existing', kind: 'prediction', title: 'Existing prediction', content: '', createdAt: 1, updatedAt: 1,
    metadata: { status: 'pending', resolutionDate: '2028-02-29', prediction: { probability: 0, expectedValue: 0 } },
  }
  function setup() {
    const request = vi.fn(async () => ({ ok: false as const, error: { code: 'UNEXPECTED_REQUEST', message: 'Rendering must not request or write data' } }))
    return { request, store: new FinanceStore({ request }, translate), onResearch: vi.fn() }
  }

  it('keeps saved predictions visible and both manual forms inside a closed disclosure', () => {
    const rig = setup()
    const html = renderToStaticMarkup(createElement(PredictionsPanel, { store: rig.store, t: translate, nodes: [saved], onResearch: rig.onResearch }))
    const [overview, manual] = html.split('<details class="rg-finance-manual"')
    expect(overview).toContain(dictionary['finance.predictions.conversationAction'])
    expect(overview).toContain('Existing prediction')
    expect(overview).toContain('0%')
    expect(overview).toContain('aria-selected="true"')
    expect(manual).toBeDefined()
    expect(manual).toMatch(/^><summary>/u)
    expect(manual).toContain(renderToStaticMarkup(createElement('summary', null, dictionary['finance.predictions.manualControls'])))
    expect(manual).toContain(dictionary['finance.predictions.recordAction'])
    expect(manual).toContain(dictionary['finance.predictions.resolveAction'])
    expect(manual?.match(/<form /gu)).toHaveLength(2)
    expect(rig.request).not.toHaveBeenCalled()
    expect(rig.onResearch).not.toHaveBeenCalled()
  })

  it('places briefing preparation, recording and evaluation inside one closed disclosure', () => {
    const rig = setup()
    const html = renderToStaticMarkup(createElement(BriefingPanel, { store: rig.store, t: translate, nodes: [], onResearch: rig.onResearch }))
    const [heading, manual] = html.split('<details class="rg-finance-manual"')
    expect(heading).toContain(dictionary['finance.briefing.conversationAction'])
    expect(heading).not.toContain('<form')
    expect(manual).toMatch(/^><summary>/u)
    expect(manual).toContain(renderToStaticMarkup(createElement('summary', null, dictionary['finance.briefing.manualControls'])))
    expect(manual).toContain(dictionary['finance.briefing.prepareAction'])
    expect(manual).toContain(dictionary['finance.briefing.recordAction'])
    expect(manual).toContain(dictionary['finance.briefing.evaluateAction'])
    expect(manual?.match(/<form /gu)).toHaveLength(3)
    expect(rig.request).not.toHaveBeenCalled()
    expect(rig.onResearch).not.toHaveBeenCalled()
  })

  it('keeps all prediction forms open when conversation access is absent', () => {
    const rig = setup()
    const html = renderToStaticMarkup(createElement(PredictionsPanel, { store: rig.store, t: translate, nodes: [saved] }))
    const visible = html.replace(/<details(?![^>]*\bopen(?:=|\s|>))[^>]*>[\s\S]*?<\/details>/gu, '')
    expect(html).not.toContain(dictionary['finance.predictions.conversationAction'])
    expect(visible.match(/<form /gu)).toHaveLength(3)
    expect(visible).toContain('Existing prediction')
    expect(rig.request).not.toHaveBeenCalled()
  })

  it('keeps all briefing forms open when conversation access is absent', () => {
    const rig = setup()
    const html = renderToStaticMarkup(createElement(BriefingPanel, { store: rig.store, t: translate, nodes: [] }))
    const visible = html.replace(/<details(?![^>]*\bopen(?:=|\s|>))[^>]*>[\s\S]*?<\/details>/gu, '')
    expect(html).not.toContain(dictionary['finance.briefing.conversationAction'])
    expect(visible.match(/<form /gu)).toHaveLength(3)
    expect(rig.request).not.toHaveBeenCalled()
  })

  it.each([
    { skillName: 'flex-memory', promptKey: 'finance.predictions.conversationPrompt' },
    { skillName: 'daily-digest', promptKey: 'finance.briefing.conversationPrompt' },
  ] as const)('prepares the $skillName clarification draft without sending or requesting finance writes', async ({ skillName, promptKey }) => {
    const prepare = vi.fn(async (_input: ConversationPrepareInput) => ({ sessionId: 'session:memory-k', status: 'applied' as const }))
    const open = vi.fn(async () => undefined)
    const send = vi.fn()
    const question = dictionary[promptKey]
    const access = { list: () => [], currentId: () => null, prepare, open, send }
    await launchResearchConversation(access, {
      mode: 'question', skillName, question,
    }, [], language)
    expect(prepare).toHaveBeenCalledOnce()
    const input = prepare.mock.calls[0]![0]
    const draft = typeof input.text === 'function' ? input.text('session:memory-k') : input.text
    expect(draft).toMatch(new RegExp(`^/${skillName}\\n`))
    expect(draft).toContain(JSON.stringify(question))
    expect(draft).toContain('Current DSH conversation: "session:memory-k"')
    expect(send).not.toHaveBeenCalled()
    expect(open).not.toHaveBeenCalled()
  })
})


// Direct event-handler checks use the same isolated-hook pattern as market-restoration.
// Normal SSR cases below continue to use React's actual hooks.
const predictionHooks = vi.hoisted(() => ({
  isolated: false, states: [] as unknown[], refs: [] as { current: unknown }[], stateCursor: 0, refCursor: 0,
}))
vi.mock('react', async importOriginal => {
  const actual = await importOriginal<typeof import('react')>()
  return {
    ...actual,
    useSyncExternalStore: (...args: Parameters<typeof actual.useSyncExternalStore>) => predictionHooks.isolated ? args[1]() : actual.useSyncExternalStore(...args),
    useState: (initial: unknown) => {
      if (!predictionHooks.isolated) return actual.useState(initial)
      const index = predictionHooks.stateCursor++
      if (index === predictionHooks.states.length) predictionHooks.states.push(typeof initial === 'function' ? initial() : initial)
      return [predictionHooks.states[index], (next: unknown) => {
        predictionHooks.states[index] = typeof next === 'function' ? next(predictionHooks.states[index]) : next
      }]
    },
    useRef: (initial: unknown) => {
      if (!predictionHooks.isolated) return actual.useRef(initial)
      const index = predictionHooks.refCursor++
      if (index === predictionHooks.refs.length) predictionHooks.refs.push({ current: initial })
      return predictionHooks.refs[index]
    },
  }
})
afterEach(() => {
  predictionHooks.isolated = false
  predictionHooks.states = []
  predictionHooks.refs = []
  predictionHooks.stateCursor = predictionHooks.refCursor = 0
  vi.restoreAllMocks()
})

function predictionTree(store: FinanceStore) {
  predictionHooks.isolated = true
  predictionHooks.stateCursor = predictionHooks.refCursor = 0
  try { return PredictionsPanel({ store, t, nodes: [] }) }
  finally { predictionHooks.isolated = false }
}
function elements(node: ReactNode): ReactElement<Record<string, unknown>>[] {
  return Children.toArray(node).flatMap(child => isValidElement<Record<string, unknown>>(child)
    ? [child, ...elements(child.props.children as ReactNode)] : [])
}
function deferredResponse() {
  let resolve!: (value: Awaited<ReturnType<FinanceGateway['request']>>) => void
  const promise = new Promise<Awaited<ReturnType<FinanceGateway['request']>>>(done => { resolve = done })
  return { promise, resolve }
}
const cutoffA = '2026-11-01T10:14:23.809Z'
const cutoffB = '2026-11-01T10:16:00.000Z'
const duePrediction = { id: 'prediction:qa', title: 'Pending QA card', metadata: { status: 'pending' } }
function lifecycleRig(holdFirstB = false) {
  const resolution = deferredResponse()
  const oldDue = deferredResponse()
  let resolved = false
  let bRequests = 0
  const request = vi.fn<FinanceGateway['request']>(async input => {
    if (input.op === 'memory.resolve') {
      const response = await resolution.promise
      if (response.ok) resolved = true
      return response
    }
    if (input.op === 'memory.due') {
      const asOf = input.asOf
      if (typeof asOf !== 'string') throw new Error('memory.due requires a string asOf')
      if (holdFirstB && asOf === cutoffB && ++bRequests === 1) return oldDue.promise
      return { ok: true, revision: resolved ? 2 : 1, result: { asOf, predictions: resolved ? [] : [duePrediction] } }
    }
    throw new Error('Unexpected finance request')
  })
  const store = new FinanceStore({ request }, t)
  const forms = () => elements(predictionTree(store)).filter(element => element.type === 'form')
  const editCutoff = (value: string) => {
    const input = elements(forms()[0]!).find(element => element.type === 'input')!
    ;(input.props.onChange as (event: { target: { value: string } }) => void)({ target: { value } })
  }
  const submit = (index: number) => (forms()[index]!.props.onSubmit as (event: { preventDefault: () => void }) => Promise<void> | void)({ preventDefault() {} })
  const dueCalls = () => request.mock.calls.filter(([input]) => input.op === 'memory.due').map(([input]) => input.asOf)
  const inputValue = () => elements(forms()[0]!).find(element => element.type === 'input')!.props.value
  return { store, request, resolution, oldDue, editCutoff, submit, dueCalls, inputValue }
}

describe('prediction due refresh after settlement', () => {
  it('refreshes the last queried cutoff once and removes the settled card without replacing an unsent cutoff edit', async () => {
    const rig = lifecycleRig()
    await rig.store.loadDue(cutoffA)
    rig.editCutoff(cutoffB)
    const settling = rig.submit(2)
    expect(rig.dueCalls()).toEqual([cutoffA])
    rig.resolution.resolve({ ok: true, revision: 2, result: {} })
    await settling
    expect(rig.dueCalls()).toEqual([cutoffA, cutoffA])
    expect(rig.inputValue()).toBe(cutoffB)
    expect(rig.store.getSnapshot().operations.due.result).toMatchObject({ asOf: cutoffA, predictions: [] })
    expect(elements(predictionTree(rig.store)).some(element => element.props.children === duePrediction.title)).toBe(false)
  })

  it('does not refresh after a rejected settlement', async () => {
    const rig = lifecycleRig()
    await rig.store.loadDue(cutoffA)
    const previous = rig.store.getSnapshot().operations.due
    const settling = rig.submit(2)
    rig.resolution.resolve({ ok: false, error: { code: 'PREDICTION_NOT_DUE', message: 'Not due' } })
    await settling
    expect(rig.dueCalls()).toEqual([cutoffA])
    expect(rig.store.getSnapshot().operations.due).toBe(previous)
  })

  it('does not request due data when there was no previous query', async () => {
    const rig = lifecycleRig()
    rig.editCutoff(cutoffB)
    const settling = rig.submit(2)
    rig.resolution.resolve({ ok: true, revision: 2, result: {} })
    await settling
    expect(rig.dueCalls()).toEqual([])
    expect(rig.inputValue()).toBe(cutoffB)
  })

  it('refreshes a newer submitted query and ignores its older in-flight response', async () => {
    const rig = lifecycleRig(true)
    await rig.store.loadDue(cutoffA)
    const loads = vi.spyOn(rig.store, 'loadDue')
    const settling = rig.submit(2)
    rig.editCutoff(cutoffB)
    rig.submit(0)
    expect(rig.dueCalls()).toEqual([cutoffA, cutoffB])
    rig.resolution.resolve({ ok: true, revision: 2, result: {} })
    await settling
    expect(rig.dueCalls()).toEqual([cutoffA, cutoffB, cutoffB])
    rig.oldDue.resolve({ ok: true, revision: 1, result: { asOf: cutoffB, predictions: [duePrediction] } })
    await loads.mock.results[0]!.value
    expect(rig.store.getSnapshot().operations.due.result).toMatchObject({ asOf: cutoffB, predictions: [] })
    expect(rig.inputValue()).toBe(cutoffB)
  })

  it('calls pending awaiting resolution in both locales even for a past due date', () => {
    expect(zh['finance.predictions.state.pending']).toBe('待结算')
    expect(en['finance.predictions.state.pending']).toBe('Awaiting resolution')
    const translate: Translate = key => zh[key as keyof typeof zh] ?? key
    const rig = lifecycleRig()
    const html = renderToStaticMarkup(createElement(PredictionsPanel, { store: rig.store, t: translate, nodes: [{
      id: 'prediction:past', kind: 'prediction', title: 'Past due', content: '', createdAt: 1, updatedAt: 1,
      metadata: { status: 'pending', resolutionDate: '2025-01-01' },
    }] }))
    expect(html).toContain('待结算')
    expect(html).not.toContain('待到期')
    expect(rig.request).not.toHaveBeenCalled()
  })
})
