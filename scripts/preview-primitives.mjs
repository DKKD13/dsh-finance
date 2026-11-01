const DEFAULT_LABELS = {
  code: {
    copyLabel: 'Copy code',
    copiedLabel: 'Copied',
    toolbarLabels: { codeLabel: 'Code', wrapLabel: 'Wrap lines', unwrapLabel: 'Unwrap lines' },
  },
  footnotes: 'Footnotes',
}

function safeUrl(value) {
  const url = value.trim()
  if (/^(https?:|mailto:)/i.test(url) || /^[#/]/.test(url)) return url
  return undefined
}

function withoutHtml(value) {
  return value
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, '')
    .replace(/<[^>]+>/g, '')
}

function slug(value, fallback) {
  const normalized = value.toLowerCase().trim().replace(/[^\p{Letter}\p{Number}]+/gu, '-').replace(/^-|-$/g, '')
  return normalized || fallback
}

function inlineNodes(React, source, omitHtml, keyPrefix = 'inline', depth = 0) {
  const text = omitHtml ? withoutHtml(source) : source
  if (depth > 4) return [text]
  const pattern = /(`[^`\n]+`|!\[[^\]\n]*\]\([^\)\n]+\)|\[[^\]\n]+\]\([^\)\n]+\)|\[\^[^\]\n]+\]|\*\*[^*\n]+\*\*|__[^_\n]+__|\*[^*\n]+\*|_[^_\n]+_)/g
  const nodes = []
  let cursor = 0
  let match
  while ((match = pattern.exec(text)) !== null) {
    if (match.index > cursor) nodes.push(text.slice(cursor, match.index))
    const token = match[0]
    const key = `${keyPrefix}-${match.index}`
    if (token.startsWith('`')) {
      nodes.push(React.createElement('code', { key }, token.slice(1, -1)))
    } else if (token.startsWith('![')) {
      const parts = /^!\[([^\]]*)\]\(([^)]+)\)$/.exec(token)
      nodes.push(React.createElement('span', { key, className: 'dsh-preview-markdown-image-alt' }, parts?.[1] ?? ''))
    } else if (token.startsWith('[^')) {
      const id = token.slice(2, -1)
      nodes.push(React.createElement('sup', { key, className: 'dsh-preview-markdown-footnote-ref' },
        React.createElement('a', { href: `#dsh-preview-footnote-${slug(id, 'note')}` }, id)))
    } else if (token.startsWith('[')) {
      const parts = /^\[([^\]]+)\]\(([^)]+)\)$/.exec(token)
      const label = parts?.[1] ?? token
      const destination = parts?.[2]?.trim().split(/\s+["']/)[0] ?? ''
      const href = safeUrl(destination)
      const children = inlineNodes(React, label, omitHtml, `${key}-label`, depth + 1)
      nodes.push(href === undefined
        ? React.createElement(React.Fragment, { key }, ...children)
        : React.createElement('a', {
            key,
            href,
            ...(href.startsWith('#') ? {} : { target: '_blank', rel: 'noreferrer noopener' }),
          }, ...children))
    } else if (token.startsWith('**') || token.startsWith('__')) {
      nodes.push(React.createElement('strong', { key }, ...inlineNodes(React, token.slice(2, -2), omitHtml, `${key}-strong`, depth + 1)))
    } else {
      nodes.push(React.createElement('em', { key }, ...inlineNodes(React, token.slice(1, -1), omitHtml, `${key}-em`, depth + 1)))
    }
    cursor = match.index + token.length
  }
  if (cursor < text.length) nodes.push(text.slice(cursor))
  return nodes
}

function isTableDivider(line) {
  return /^\s*\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?\s*$/.test(line)
}

function tableCells(line) {
  const trimmed = line.trim().replace(/^\|/, '').replace(/\|$/, '')
  return trimmed.split(/(?<!\\)\|/).map(cell => cell.trim().replace('\\|', '|'))
}

function startsBlock(lines, index) {
  const line = lines[index] ?? ''
  return /^\s*(```|~~~)/.test(line)
    || /^\s{0,3}#{1,6}\s+/.test(line)
    || /^\s*([-+*]|\d+[.)])\s+/.test(line)
    || /^\s*>/.test(line)
    || /^\s*(\*\s*){3,}$/.test(line)
    || /^\s*(-\s*){3,}$/.test(line)
    || /^\s*\[\^[^\]]+\]:/.test(line)
    || (index + 1 < lines.length && line.includes('|') && isTableDivider(lines[index + 1] ?? ''))
}

function blockNodes(React, text, omitHtml, labels) {
  const source = (omitHtml ? text.replace(/<!--[\s\S]*?-->/g, '').replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, '') : text).replace(/\r\n?/g, '\n')
  const lines = source.split('\n')
  const blocks = []
  const footnotes = []
  let index = 0
  while (index < lines.length) {
    const line = lines[index] ?? ''
    if (line.trim().length === 0 || (omitHtml && /^\s*<[^>]+>\s*$/.test(line))) {
      index += 1
      continue
    }
    const key = `block-${index}`
    const fence = /^\s*(```|~~~)\s*([^\s`]*)/.exec(line)
    if (fence !== null) {
      const marker = fence[1]
      const language = fence[2] ?? ''
      const body = []
      index += 1
      while (index < lines.length && !(lines[index] ?? '').trim().startsWith(marker)) {
        body.push(lines[index] ?? '')
        index += 1
      }
      if (index < lines.length) index += 1
      blocks.push(React.createElement(CodeBlock, { key, React, code: body.join('\n'), language, labels: labels.code }))
      continue
    }
    const heading = /^\s{0,3}(#{1,6})\s+(.+?)\s*#*\s*$/.exec(line)
    if (heading !== null) {
      const level = heading[1].length
      const content = heading[2]
      blocks.push(React.createElement(`h${level}`, { key, id: `dsh-preview-heading-${slug(withoutHtml(content), String(index))}` }, ...inlineNodes(React, content, omitHtml, key)))
      index += 1
      continue
    }
    const footnote = /^\s*\[\^([^\]]+)\]:\s*(.*)$/.exec(line)
    if (footnote !== null) {
      footnotes.push({ id: footnote[1], text: footnote[2], key })
      index += 1
      continue
    }
    if (index + 1 < lines.length && line.includes('|') && isTableDivider(lines[index + 1] ?? '')) {
      const headers = tableCells(line)
      const rows = []
      index += 2
      while (index < lines.length && (lines[index] ?? '').includes('|') && (lines[index] ?? '').trim().length > 0) {
        rows.push(tableCells(lines[index] ?? ''))
        index += 1
      }
      blocks.push(React.createElement('div', { key, className: 'dsh-preview-markdown-table-wrap', role: 'region', tabIndex: 0 },
        React.createElement('table', null,
          React.createElement('thead', null, React.createElement('tr', null, ...headers.map((cell, cellIndex) => React.createElement('th', { key: cellIndex, scope: 'col' }, ...inlineNodes(React, cell, omitHtml, `${key}-h-${cellIndex}`))))),
          React.createElement('tbody', null, ...rows.map((row, rowIndex) => React.createElement('tr', { key: rowIndex }, ...headers.map((_, cellIndex) => React.createElement('td', { key: cellIndex }, ...inlineNodes(React, row[cellIndex] ?? '', omitHtml, `${key}-${rowIndex}-${cellIndex}`)))))))))
      continue
    }
    if (/^\s*([-+*]|\d+[.)])\s+/.test(line)) {
      const ordered = /^\s*\d+[.)]\s+/.test(line)
      const items = []
      const itemPattern = ordered ? /^\s*\d+[.)]\s+(.+)$/ : /^\s*[-+*]\s+(.+)$/
      while (index < lines.length) {
        const item = itemPattern.exec(lines[index] ?? '')
        if (item === null) break
        items.push(React.createElement('li', { key: index }, ...inlineNodes(React, item[1], omitHtml, `${key}-${index}`)))
        index += 1
      }
      blocks.push(React.createElement(ordered ? 'ol' : 'ul', { key }, ...items))
      continue
    }
    if (/^\s*>/.test(line)) {
      const quote = []
      while (index < lines.length && /^\s*>/.test(lines[index] ?? '')) {
        quote.push((lines[index] ?? '').replace(/^\s*>\s?/, ''))
        index += 1
      }
      blocks.push(React.createElement('blockquote', { key }, ...blockNodes(React, quote.join('\n'), omitHtml, labels).blocks))
      continue
    }
    if (/^\s*(\*\s*){3,}$/.test(line) || /^\s*(-\s*){3,}$/.test(line)) {
      blocks.push(React.createElement('hr', { key }))
      index += 1
      continue
    }
    const paragraph = [line]
    index += 1
    while (index < lines.length && (lines[index] ?? '').trim().length > 0 && !startsBlock(lines, index) && !(omitHtml && /^\s*<[^>]+>\s*$/.test(lines[index] ?? ''))) {
      paragraph.push(lines[index] ?? '')
      index += 1
    }
    blocks.push(React.createElement('p', { key }, ...inlineNodes(React, paragraph.join('\n'), omitHtml, key)))
  }
  return { blocks, footnotes }
}

async function copyText(text) {
  if (globalThis.navigator?.clipboard?.writeText !== undefined) {
    await globalThis.navigator.clipboard.writeText(text)
    return
  }
  if (globalThis.document === undefined) throw new Error('Clipboard unavailable')
  const field = document.createElement('textarea')
  field.value = text
  field.style.position = 'fixed'
  field.style.opacity = '0'
  document.body.append(field)
  field.select()
  const copied = document.execCommand('copy')
  field.remove()
  if (!copied) throw new Error('Clipboard unavailable')
}

function CodeBlock({ React, code, language, labels }) {
  const [wrapped, setWrapped] = React.useState(false)
  const [copied, setCopied] = React.useState(false)
  const copy = async () => {
    try {
      await copyText(code)
      setCopied(true)
    } catch {
      setCopied(false)
    }
  }
  return React.createElement('figure', { className: 'dsh-preview-markdown-code', 'data-wrapped': wrapped || undefined },
    React.createElement('figcaption', null,
      React.createElement('span', null, language || labels.toolbarLabels.codeLabel),
      React.createElement('span', { className: 'dsh-preview-markdown-code-actions' },
        React.createElement('button', { type: 'button', onClick: () => { setWrapped(value => !value) }, 'aria-pressed': wrapped }, wrapped ? labels.toolbarLabels.unwrapLabel : labels.toolbarLabels.wrapLabel),
        React.createElement('button', { type: 'button', onClick: () => { void copy() } }, copied ? labels.copiedLabel : labels.copyLabel))),
    React.createElement('pre', null, React.createElement('code', { className: language ? `language-${language}` : undefined }, code)),
    React.createElement('span', { className: 'dsh-preview-visually-hidden', 'aria-live': 'polite' }, copied ? labels.copiedLabel : ''))
}

export function createPreviewPrimitives(React) {
  function MarkdownText({ text, labels = DEFAULT_LABELS, omitHtml = false, variant = 'body' }) {
    const resolved = {
      ...DEFAULT_LABELS,
      ...labels,
      code: {
        ...DEFAULT_LABELS.code,
        ...labels.code,
        toolbarLabels: { ...DEFAULT_LABELS.code.toolbarLabels, ...labels.code?.toolbarLabels },
      },
    }
    const { blocks, footnotes } = blockNodes(React, String(text ?? ''), omitHtml, resolved)
    return React.createElement('div', { className: `dsh-preview-markdown dsh-preview-markdown-${variant}` },
      ...blocks,
      footnotes.length > 0 && React.createElement('section', { className: 'dsh-preview-markdown-footnotes', 'aria-label': resolved.footnotes },
        React.createElement('h2', null, resolved.footnotes),
        React.createElement('ol', null, ...footnotes.map(note => React.createElement('li', { key: note.key, id: `dsh-preview-footnote-${slug(note.id, 'note')}` }, ...inlineNodes(React, note.text, omitHtml, note.key))))))
  }
  return { MarkdownText }
}
