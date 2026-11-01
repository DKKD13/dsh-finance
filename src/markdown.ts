/**
 * Markdown and frontmatter parsing for skill imports: YAML frontmatter,
 * inline links, `READ` reference markers, and skill dependency fields.
 * @module dsh-research-graph/markdown
 */

import yaml from 'js-yaml'
import { GraphError } from './graph.ts'
import type { JsonValue } from './graph.ts'

/** One parsed Markdown document: optional frontmatter plus the body. */
export interface ParsedMarkdown {
  /** Parsed YAML frontmatter object; absent when the file has no `---` block. */
  readonly frontmatter?: Record<string, unknown>
  /** Remaining Markdown body after the frontmatter block. */
  readonly body: string
}

/** One inline Markdown link. */
export interface MarkdownLink {
  /** Link label between the brackets. */
  readonly text: string
  /** Link target between the parentheses, excluding any title part. */
  readonly target: string
}

const FRONTMATTER = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/u
const LINK = /\[([^\]]*)\]\(([^)\s]+)(?:\s+"[^"]*")?\)/gu
const READ_REF = /\[READ\][\s*`]{0,6}`([^`]+)`/gu
const BACKTICK_TOKEN = /`([^`\n]+)`/gu

/**
 * Split a Markdown document into its YAML frontmatter and body. A malformed
 * YAML block fails loudly with the file subject in the message.
 * @param text - raw file content.
 * @param subject - file path used in error messages.
 * @returns parsed frontmatter and body.
 */
export function parseMarkdown(text: string, subject: string): ParsedMarkdown {
  const match = FRONTMATTER.exec(text)
  if (match === null) return { body: text }
  const raw = match[1]
  let frontmatter: unknown
  try {
    frontmatter = yaml.load(raw ?? '')
  } catch (error: unknown) {
    throw new GraphError(
      'FRONTMATTER_INVALID',
      `${subject}: frontmatter is not valid YAML: ${error instanceof Error ? error.message : String(error)}`,
    )
  }
  if (frontmatter === undefined || frontmatter === null) {
    return { body: text.slice(match[0].length) }
  }
  if (typeof frontmatter !== 'object' || Array.isArray(frontmatter)) {
    throw new GraphError('FRONTMATTER_INVALID', `${subject}: frontmatter must be a YAML mapping`)
  }
  return { frontmatter: frontmatter as Record<string, unknown>, body: text.slice(match[0].length) }
}

/** Whether a link target leaves the local filesystem (never followed). */
export function isExternalTarget(target: string): boolean {
  return /^(?:[a-z][a-z0-9+.-]*:|#|\/\/)/iu.test(target)
}

/**
 * Extract inline Markdown links, skipping external URLs, anchors, and
 * images-only targets (the `![alt](src)` form shares the syntax; the leading
 * `!` is stripped by the bracket match and the target is reported the same).
 * @param text - Markdown body.
 * @returns links in document order.
 */
export function extractMarkdownLinks(text: string): MarkdownLink[] {
  const links: MarkdownLink[] = []
  for (const match of text.matchAll(LINK)) {
    const target = match[2]
    if (target === undefined || isExternalTarget(target)) continue
    links.push({ text: match[1] ?? '', target })
  }
  return links
}

/**
 * Extract `READ` reference markers of the form `**[READ]** \`path\`` used by
 * the bundled skills to point at files that must be loaded.
 * @param text - Markdown body.
 * @returns referenced paths in document order.
 */
export function extractReadReferences(text: string): string[] {
  const refs: string[] = []
  for (const match of text.matchAll(READ_REF)) {
    const target = match[1]
    if (target !== undefined) refs.push(target.trim())
  }
  return refs
}

/**
 * Read declared skill dependencies from frontmatter. The keys `dependencies`,
 * `depends`, and `skills` are accepted; each must be a string array of skill
 * names. Unknown value types fail loudly.
 * @param frontmatter - parsed frontmatter, when present.
 * @param subject - file path used in error messages.
 * @returns declared dependency names.
 */
export function extractDeclaredDependencies(frontmatter: Record<string, unknown> | undefined, subject: string): string[] {
  if (frontmatter === undefined) return []
  const names: string[] = []
  for (const key of ['dependencies', 'depends', 'skills']) {
    const value = frontmatter[key]
    if (value === undefined) continue
    if (!Array.isArray(value) || value.some(entry => typeof entry !== 'string')) {
      throw new GraphError('FRONTMATTER_INVALID', `${subject}: frontmatter "${key}" must be an array of skill names`)
    }
    names.push(...value as string[])
  }
  return [...new Set(names)]
}

/**
 * Find backticked body tokens that exactly name a known skill, used as
 * implicit cross-skill references during import.
 * @param text - Markdown body.
 * @param knownSkills - skill names discovered in the same scan.
 * @param ownName - the skill being parsed; self mentions are ignored.
 * @returns matching skill names in document order, deduplicated.
 */
export function extractMentionedSkills(text: string, knownSkills: ReadonlySet<string>, ownName: string): string[] {
  const found: string[] = []
  const seen = new Set<string>()
  for (const match of text.matchAll(BACKTICK_TOKEN)) {
    const token = match[1]?.trim()
    if (token === undefined || token === ownName || !knownSkills.has(token) || seen.has(token)) continue
    seen.add(token)
    found.push(token)
  }
  return found
}

/**
 * Render one node as a Markdown mirror document: frontmatter carrying the
 * durable fields, the content body, and an outgoing-links section.
 * @param node - the node to render.
 * @param outgoing - edges leaving the node, rendered as a link list.
 * @param linkTo - optional relative href for an exported target node.
 * @returns the Markdown document.
 */
export function renderNodeMarkdown(
  node: { id: string; kind: string; title: string; content: string; metadata: Record<string, JsonValue>; updatedAt: number },
  outgoing: readonly { to: string; kind: string }[],
  linkTo?: (id: string) => string | undefined,
): string {
  const frontmatter = yaml.dump({
    id: node.id,
    kind: node.kind,
    title: node.title,
    updatedAt: new Date(node.updatedAt).toISOString(),
    ...(Object.keys(node.metadata).length > 0 ? { metadata: node.metadata } : {}),
  }, { noRefs: true, lineWidth: -1 }).trimEnd()
  const links = outgoing.length === 0
    ? []
    : ['', '## Links', '', ...outgoing.map(edge => {
        const href = linkTo?.(edge.to)
        return `- **${edge.kind}** → ${href ? nodeMarkdownLink(edge.to, href) : `\`${edge.to}\``}`
      })]
  return ['---', frontmatter, '---', '', `# ${node.title}`, '', node.content.trimEnd(), ...links, ''].join('\n')
}

/** A node id rendered as a code label linking to its exported document. */
export function nodeMarkdownLink(id: string, href: string): string {
  const delimiter = '`'.repeat(Math.max(0, ...[...id.matchAll(/`+/gu)].map(match => match[0].length)) + 1)
  const label = `${delimiter} ${id} ${delimiter}`
  return `[${label}](${href})`
}

/** Rewrite local inline-link/image and HTML href/src destinations, leaving code and labels intact. */
export async function rewriteMarkdownDestinations(
  text: string,
  destination: (target: string) => Promise<string | undefined>,
): Promise<string> {
  const blank = (value: string): string => value.replace(/[^\r\n]/g, ' ')
  let fence: string | undefined
  let masked = text.split(/(?<=\n)/u).map(line => {
    const content = line.replace(/^ {0,3}(?:>[ \t]?)+/u, '').replace(/^ {0,3}(?:[-+*]|\d+[.)])[ \t]+/u, '')
    const marker = /^ {0,3}(`{3,}|~{3,})/u.exec(content)?.[1]
    if (fence !== undefined) {
      if (marker !== undefined && marker[0] === fence[0] && marker.length >= fence.length && line.slice(line.indexOf(marker) + marker.length).trim() === '') fence = undefined
      return blank(line)
    }
    if (marker !== undefined) { fence = marker; return blank(line) }
    return /^(?: {4}|\t)/u.test(line) ? blank(line) : line
  }).join('')
  masked = masked.replace(/^---\r?\n[\s\S]*?\r?\n---(?:\r?\n|$)/u, blank)
    .replace(/<!--[\s\S]*?(?:-->|$)|<(pre|code|script|style)\b[^>]*>[\s\S]*?(?:<\/\1\s*>|$)/giu, blank)
  const escaped = (at: number): boolean => {
    let backslashes = 0
    while (at > 0 && masked[--at] === '\\') backslashes++
    return backslashes % 2 === 1
  }
  for (let at = 0; at < masked.length; at++) {
    if (masked[at] !== '`' || escaped(at)) continue
    const ticks = /^`+/u.exec(masked.slice(at))![0]
    let end = at + ticks.length
    while ((end = masked.indexOf(ticks, end)) !== -1) {
      if (masked[end - 1] !== '`' && masked[end + ticks.length] !== '`') break
      end += ticks.length
    }
    if (end !== -1) {
      const until = end + ticks.length
      masked = masked.slice(0, at) + blank(masked.slice(at, until)) + masked.slice(until)
      at = until - 1
    } else at += ticks.length - 1
  }
  const targets: { start: number; end: number }[] = []
  const htmlTag = /<\/?[a-z][a-z0-9:-]*\b(?:[^"'<>]|"[^"]*"|'[^']*')*>/giu
  const tags = [...masked.matchAll(htmlTag)]
  masked = masked.replace(htmlTag, blank)
  const brackets: number[] = []
  for (let at = 0; at < masked.length; at++) {
    if (escaped(at)) continue
    if (masked[at] === '[') brackets.push(at)
    if (masked[at] !== ']' || brackets.pop() === undefined || masked[at + 1] !== '(') continue
    let start = at + 2
    while (/[ \t]/u.test(masked[start] ?? '') && start < masked.length) start++
    let end = start
    if (masked[start] === '<') {
      start++
      end = masked.indexOf('>', start)
      if (end < start || /[\r\n]/u.test(masked.slice(start, end))) continue
    } else {
      let depth = 0
      for (; end < masked.length; end++) {
        if (escaped(end)) continue
        const char = masked[end]!
        if (char === '(') depth++
        else if (char === ')') { if (depth === 0) break; depth-- }
        else if (/\s/u.test(char)) break
      }
      if (depth !== 0) continue
    }
    const tail = masked.slice(end + (masked[end] === '>' ? 1 : 0))
    if (/^(?:[ \t]+(?:"[^"\r\n]*"|'[^'\r\n]*'|\([^()\r\n]*\)))?[ \t]*\)/u.test(tail) && end > start) targets.push({ start, end })
  }
  for (const tag of tags) {
    if (!/^<(?:a|img|source)\b/iu.test(tag[0])) continue
    for (const attribute of tag[0].matchAll(/\s+([^\s"'<>/=]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/giu)) {
      if (!/^(?:href|src)$/iu.test(attribute[1]!)) continue
      const value = attribute[2] ?? attribute[3] ?? attribute[4]
      if (!value) continue
      const start = tag.index! + attribute.index! + attribute[0].indexOf('=') + 1 + attribute[0].slice(attribute[0].indexOf('=') + 1).indexOf(value)
      targets.push({ start, end: start + value.length })
    }
  }
  let result = ''
  let cursor = 0
  for (const { start, end } of targets.sort((a, b) => a.start - b.start)) {
    if (start < cursor) continue
    const target = text.slice(start, end)
    const replacement = isExternalTarget(target) ? undefined : await destination(target)
    result += text.slice(cursor, start) + (replacement ?? target)
    cursor = end
  }
  return result + text.slice(cursor)
}

/** Filesystem-safe slug for one node id, used as the mirror file name. */
export function nodeFileName(id: string): string {
  return `${id.replace(/[^\p{Letter}\p{Number}._-]+/gu, '_')}.md`
}
