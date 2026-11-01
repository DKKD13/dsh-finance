import { GraphError } from '../graph.ts'

interface XmlNode {
  readonly name: string
  readonly attributes: Record<string, string>
  readonly children: XmlNode[]
  text: string
}

export interface FeedEntry {
  readonly url?: string
  readonly title: string
  readonly content: string
  readonly publishedAt?: string
  readonly author?: string
  readonly videoId?: string
}

function localName(name: string): string {
  return (name.split(':').pop() ?? name).toLowerCase()
}

function decodeEntities(input: string): string {
  const named: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' }
  return input.replace(/&(#x[\da-f]+|#\d+|amp|lt|gt|quot|apos|nbsp);/giu, (entity, code: string) => {
    if (code.startsWith('#x') || code.startsWith('#X')) {
      const value = Number.parseInt(code.slice(2), 16)
      return Number.isSafeInteger(value) && value <= 0x10ffff ? String.fromCodePoint(value) : entity
    }
    if (code.startsWith('#')) {
      const value = Number.parseInt(code.slice(1), 10)
      return Number.isSafeInteger(value) && value <= 0x10ffff ? String.fromCodePoint(value) : entity
    }
    return named[code.toLowerCase()] ?? entity
  })
}

function parseAttributes(input: string): Record<string, string> {
  const attributes: Record<string, string> = {}
  for (const match of input.matchAll(/([^\s=]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/gu)) {
    const name = match[1]
    if (name !== undefined) attributes[localName(name)] = decodeEntities(match[2] ?? match[3] ?? '')
  }
  return attributes
}

function parseXml(xml: string): XmlNode {
  if (/<!DOCTYPE|<!ENTITY/iu.test(xml)) throw new GraphError('INVALID_FEED', 'DTD and entity declarations are not admitted in feeds')
  const document: XmlNode = { name: '#document', attributes: {}, children: [], text: '' }
  const stack: XmlNode[] = [document]
  let offset = 0
  while (offset < xml.length) {
    const parent = stack.at(-1) as XmlNode
    const next = xml.indexOf('<', offset)
    if (next < 0) {
      parent.text += decodeEntities(xml.slice(offset))
      break
    }
    parent.text += decodeEntities(xml.slice(offset, next))
    if (xml.startsWith('<![CDATA[', next)) {
      const end = xml.indexOf(']]>', next + 9)
      if (end < 0) throw new GraphError('INVALID_FEED', 'unterminated CDATA section')
      parent.text += xml.slice(next + 9, end)
      offset = end + 3
      continue
    }
    if (xml.startsWith('<!--', next)) {
      const end = xml.indexOf('-->', next + 4)
      if (end < 0) throw new GraphError('INVALID_FEED', 'unterminated XML comment')
      offset = end + 3
      continue
    }
    if (xml.startsWith('<?', next)) {
      const end = xml.indexOf('?>', next + 2)
      if (end < 0) throw new GraphError('INVALID_FEED', 'unterminated XML processing instruction')
      offset = end + 2
      continue
    }
    const end = xml.indexOf('>', next + 1)
    if (end < 0) throw new GraphError('INVALID_FEED', 'unterminated XML tag')
    const tag = xml.slice(next + 1, end).trim()
    offset = end + 1
    if (tag.startsWith('!')) continue
    if (tag.startsWith('/')) {
      if (stack.length > 1) stack.pop()
      continue
    }
    const selfClosing = tag.endsWith('/')
    const body = selfClosing ? tag.slice(0, -1).trim() : tag
    const nameMatch = /^([^\s]+)/u.exec(body)
    if (!nameMatch) continue
    const node: XmlNode = {
      name: localName(nameMatch[1] as string),
      attributes: parseAttributes(body.slice((nameMatch[1] as string).length)),
      children: [],
      text: '',
    }
    parent.children.push(node)
    if (!selfClosing) stack.push(node)
    if (stack.length > 256) throw new GraphError('INVALID_FEED', 'feed XML nesting exceeds 256 levels')
  }
  return document
}

function descendants(node: XmlNode, name: string): XmlNode[] {
  const output: XmlNode[] = []
  for (const child of node.children) {
    if (child.name === name) output.push(child)
    output.push(...descendants(child, name))
  }
  return output
}

function child(node: XmlNode, name: string): XmlNode | undefined {
  return node.children.find(entry => entry.name === name)
}

function nodeText(node: XmlNode | undefined): string | undefined {
  if (node === undefined) return undefined
  const text = `${node.text} ${node.children.map(entry => nodeText(entry) ?? '').join(' ')}`
    .replace(/<[^>]*>/gu, ' ')
    .replace(/\s+/gu, ' ')
    .trim()
  return text.length > 0 ? decodeEntities(text) : undefined
}

function attr(node: XmlNode | undefined, name: string): string | undefined {
  const value = node?.attributes[name]
  return value !== undefined && value.trim().length > 0 ? value.trim() : undefined
}

export function parseFeed(xml: string): FeedEntry[] {
  const root = parseXml(xml).children[0]
  if (root === undefined || !['rss', 'feed', 'rdf'].includes(root.name)) {
    throw new GraphError('INVALID_FEED', 'document is not an RSS or Atom feed')
  }
  const entries = root.name === 'feed' ? root.children.filter(node => node.name === 'entry') : descendants(root, 'item')
  return entries.slice(0, 100).map(entry => {
    const links = entry.children.filter(node => node.name === 'link')
    const atomLink = links.find(node => attr(node, 'rel') === 'alternate') ?? links.find(node => attr(node, 'rel') === undefined) ?? links[0]
    const rssLink = nodeText(atomLink)
    const link = rssLink ?? attr(atomLink, 'href') ?? nodeText(child(entry, 'guid'))
    const content = nodeText(child(entry, 'encoded')) ?? nodeText(child(entry, 'content'))
      ?? nodeText(child(entry, 'description')) ?? nodeText(child(entry, 'summary'))
      ?? nodeText(descendants(entry, 'description')[0]) ?? ''
    const publishedAt = nodeText(child(entry, 'pubdate')) ?? nodeText(child(entry, 'published'))
      ?? nodeText(child(entry, 'updated')) ?? nodeText(child(entry, 'date'))
    const author = nodeText(child(entry, 'author')) ?? nodeText(child(entry, 'creator'))
      ?? nodeText(descendants(entry, 'author')[0])
    const videoId = nodeText(descendants(entry, 'videoid')[0])
    return {
      ...(link === undefined ? {} : { url: link }),
      title: nodeText(child(entry, 'title')) ?? link ?? 'Untitled feed entry',
      content,
      ...(publishedAt === undefined ? {} : { publishedAt }),
      ...(author === undefined ? {} : { author }),
      ...(videoId === undefined ? {} : { videoId }),
    }
  })
}

export function parseOpml(xml: string): { url: string; title: string }[] {
  const root = parseXml(xml).children[0]
  if (root?.name !== 'opml') throw new GraphError('INVALID_OPML', 'document is not OPML')
  const seen = new Set<string>()
  const feeds: { url: string; title: string }[] = []
  for (const outline of descendants(root, 'outline')) {
    const url = attr(outline, 'xmlurl')
    if (url === undefined || seen.has(url)) continue
    seen.add(url)
    feeds.push({ url, title: attr(outline, 'title') ?? attr(outline, 'text') ?? url })
    if (feeds.length === 20) break
  }
  return feeds
}
