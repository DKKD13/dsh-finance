function fencedCodeEnd(text: string, start: number): number {
  if (start !== 0 && text[start - 1] !== '\n') return -1
  const firstLineEnd = text.indexOf('\n', start)
  const openingEnd = firstLineEnd === -1 ? text.length : firstLineEnd
  const opening = /^ {0,3}(`{3,}|~{3,})/.exec(text.slice(start, openingEnd))
  if (opening === null) return -1
  const marker = opening[1] ?? ''
  const closing = new RegExp(`^ {0,3}${marker[0] ?? ''}{${marker.length},}\\s*$`)
  let cursor = firstLineEnd === -1 ? text.length : firstLineEnd + 1
  while (cursor < text.length) {
    const lineEnd = text.indexOf('\n', cursor)
    const end = lineEnd === -1 ? text.length : lineEnd
    if (closing.test(text.slice(cursor, end))) return lineEnd === -1 ? text.length : lineEnd + 1
    cursor = lineEnd === -1 ? text.length : lineEnd + 1
  }
  return text.length
}

function inlineCodeEnd(text: string, start: number): number {
  let ticks = 1
  while (text[start + ticks] === '`') ticks += 1
  let cursor = start + ticks
  while (cursor < text.length) {
    if (text[cursor] !== '`') {
      cursor += 1
      continue
    }
    let count = 1
    while (text[cursor + count] === '`') count += 1
    if (count === ticks) return cursor + count
    cursor += count
  }
  return -1
}

function inlineMathEnd(text: string, start: number): number {
  const first = text[start + 1]
  if (first === undefined || first === '$' || /\s/.test(first)) return -1
  const lineEnd = text.indexOf('\n', start + 1)
  const end = lineEnd === -1 ? text.length : lineEnd
  for (let cursor = start + 1; cursor < end; cursor += 1) {
    if (text[cursor] === '\\') {
      cursor += 1
      continue
    }
    if (text[cursor] !== '$') continue
    if (cursor === start + 1 || /\s/.test(text[cursor - 1] ?? '') || /\d/.test(text[cursor + 1] ?? '')) return -1
    return cursor + 1
  }
  return -1
}

export function protectReportCurrency(text: string): string {
  let output = ''
  let cursor = 0
  while (cursor < text.length) {
    const fenceEnd = fencedCodeEnd(text, cursor)
    if (fenceEnd !== -1) {
      output += text.slice(cursor, fenceEnd)
      cursor = fenceEnd
      continue
    }
    if (text[cursor] === '\\' && cursor + 1 < text.length) {
      output += text.slice(cursor, cursor + 2)
      cursor += 2
      continue
    }
    if (text[cursor] === '`') {
      const codeEnd = inlineCodeEnd(text, cursor)
      if (codeEnd !== -1) {
        output += text.slice(cursor, codeEnd)
        cursor = codeEnd
        continue
      }
    }
    if (text.startsWith('$$', cursor)) {
      const displayEnd = text.indexOf('$$', cursor + 2)
      if (displayEnd !== -1) {
        output += text.slice(cursor, displayEnd + 2)
        cursor = displayEnd + 2
        continue
      }
    }
    if (text[cursor] === '$') {
      const mathEnd = inlineMathEnd(text, cursor)
      if (mathEnd !== -1) {
        output += text.slice(cursor, mathEnd)
        cursor = mathEnd
        continue
      }
      output += '\\$'
      cursor += 1
      continue
    }
    output += text[cursor]
    cursor += 1
  }
  return output
}
