import { createElement } from 'react'
import { renderToString } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import { LazyDetails, RawJson } from '../../client/ui/FinanceCommon.tsx'
import { en } from '../../client/locales.ts'
import type { Translate } from '../../client/store.ts'

const t: Translate = key => en[key as keyof typeof en] ?? key

describe('LazyDetails render boundary', () => {
  it('does not evaluate or mount a closed body, but renders an initially open body', () => {
    const closedBody = vi.fn(() => createElement('pre', null, 'heavy'))
    const closed = renderToString(createElement(LazyDetails, { summary: 'Heavy', children: closedBody }))
    expect(closed).toContain('<summary>Heavy</summary>')
    expect(closed).not.toContain('<pre>')
    expect(closedBody).not.toHaveBeenCalled()

    const openBody = vi.fn(() => createElement('pre', null, 'heavy'))
    const open = renderToString(createElement(LazyDetails, { summary: 'Heavy', defaultOpen: true, children: openBody }))
    expect(open).toContain('<pre>heavy</pre>')
    expect(openBody).toHaveBeenCalledTimes(1)
  })

  it('defers Raw JSON stringify until expansion', () => {
    const circular: { self?: unknown } = {}
    circular.self = circular
    expect(() => renderToString(createElement(RawJson, { value: circular, t }))).not.toThrow()
    const html = renderToString(createElement(RawJson, { value: circular, t }))
    expect(html).toContain('Raw JSON')
    expect(html).not.toContain('<pre>')
  })
})
