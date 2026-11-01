import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { createPreviewPrimitives } from '../../scripts/preview-primitives.mjs'

const { MarkdownText } = createPreviewPrimitives(React)
const labels = {
  code: {
    copyLabel: 'Copy',
    copiedLabel: 'Copied',
    toolbarLabels: { codeLabel: 'Code', wrapLabel: 'Wrap', unwrapLabel: 'Unwrap' },
  },
  footnotes: 'Notes',
}

function render(text: string, omitHtml = true): string {
  return renderToStaticMarkup(React.createElement(MarkdownText, { text, labels, omitHtml }))
}

describe('preview MarkdownText primitive', () => {
  it('renders structured Markdown instead of a blank placeholder', () => {
    const html = render('# Report\n\nA **bold** claim with `evidence`.\n\n- one\n- two\n\n| Scope | Value |\n| --- | ---: |\n| Revenue | 124 |')
    expect(html).toContain('<h1')
    expect(html).toContain('<strong>bold</strong>')
    expect(html).toContain('<code>evidence</code>')
    expect(html).toContain('<li>one</li>')
    expect(html).toContain('<table>')
    expect(html).toContain('<td>124</td>')
  })

  it('omits raw HTML and never injects it into the DOM', () => {
    const html = render('Safe <img src=x onerror=alert(1)> text\n\n<script>alert(1)</script>\n\n<div>block</div>')
    expect(html).toContain('Safe  text')
    expect(html).not.toContain('<img')
    expect(html).not.toContain('<script')
    expect(html).not.toContain('alert(1)')
    expect(html).not.toContain('<div>block</div>')
  })

  it('renders safe links and reduces unsafe destinations to text', () => {
    const html = render('[source](https://example.com/a) [bad](javascript:alert(1))')
    expect(html).toContain('href="https://example.com/a"')
    expect(html).toContain('rel="noreferrer noopener"')
    expect(html).not.toContain('href="javascript:')
    expect(html).toContain('bad')
  })

  it('provides labelled code controls and footnotes', () => {
    const html = render('```ts\nconst value = 1\n```\n\nClaim[^a]\n\n[^a]: Source note')
    expect(html).toContain('>Copy</button>')
    expect(html).toContain('>Wrap</button>')
    expect(html).toContain('const value = 1')
    expect(html).toContain('Notes')
    expect(html).toContain('Source note')
  })
})
