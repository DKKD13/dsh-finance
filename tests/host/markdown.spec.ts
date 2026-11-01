import { describe, expect, it } from 'vitest'
import { GraphError } from '../../src/graph.ts'
import {
  extractDeclaredDependencies,
  extractMarkdownLinks,
  extractMentionedSkills,
  extractReadReferences,
  isExternalTarget,
  nodeFileName,
  parseMarkdown,
  renderNodeMarkdown,
  rewriteMarkdownDestinations,
} from '../../src/markdown.ts'

describe('markdown', () => {
  it('parses frontmatter including folded multi-line descriptions', () => {
    const parsed = parseMarkdown([
      '---',
      'name: beta-skill',
      'description: |',
      '  folded',
      '  multi-line',
      '---',
      '',
      '# Body',
      '',
    ].join('\n'), 'test.md')
    expect(parsed.frontmatter?.name).toBe('beta-skill')
    expect(parsed.frontmatter?.description).toBe('folded\nmulti-line\n')
    expect(parsed.body).toBe('\n# Body\n')
  })

  it('returns body untouched without frontmatter and rejects malformed YAML loudly', () => {
    expect(parseMarkdown('# Plain\n', 'plain.md')).toEqual({ body: '# Plain\n' })
    expect(() => parseMarkdown('---\n: bad: [yaml\n---\nbody\n', 'bad.md')).toThrowError(GraphError)
    expect(() => parseMarkdown('---\n- 1\n- 2\n---\nbody\n', 'list.md')).toThrowError(GraphError)
  })

  it('extracts local Markdown links and skips external targets', () => {
    const body = 'See [details](reference/details.md "t"), [web](https://x.dev/a), [anchor](#s), [mail](mailto:a@b.c).'
    const links = extractMarkdownLinks(body)
    expect(links).toEqual([{ text: 'details', target: 'reference/details.md' }])
    expect(isExternalTarget('https://x.dev')).toBe(true)
    expect(isExternalTarget('#local')).toBe(true)
    expect(isExternalTarget('reference/details.md')).toBe(false)
  })

  it('extracts READ reference markers', () => {
    const body = '回复 2 → 跳转到（**[READ]** `reference/question-mode.md`）然后再 [READ] `tools.md` 一次。'
    expect(extractReadReferences(body)).toEqual(['reference/question-mode.md', 'tools.md'])
  })

  it('extracts declared dependencies from the accepted frontmatter keys', () => {
    expect(extractDeclaredDependencies({ dependencies: ['a', 'b'] }, 's')).toEqual(['a', 'b'])
    expect(extractDeclaredDependencies({ depends: ['a'], skills: ['b'] }, 's')).toEqual(['a', 'b'])
    expect(extractDeclaredDependencies(undefined, 's')).toEqual([])
    expect(() => extractDeclaredDependencies({ dependencies: 'a' }, 's')).toThrowError(GraphError)
  })

  it('finds backticked mentions of known skills only', () => {
    const known = new Set(['alpha-skill', 'beta-skill'])
    expect(extractMentionedSkills('uses `alpha-skill` and `unknown-thing` twice `alpha-skill`', known, 'beta-skill')).toEqual(['alpha-skill'])
    expect(extractMentionedSkills('self `beta-skill` mention', known, 'beta-skill')).toEqual([])
  })

  it('renders mirror Markdown with frontmatter and links section', () => {
    const text = renderNodeMarkdown(
      { id: 'skill:alpha', kind: 'skill', title: 'alpha', content: 'Body text.\n', metadata: { managedBy: 'm' }, updatedAt: 0 },
      [{ to: 'skill:beta', kind: 'references' }],
    )
    expect(text).toContain('id: skill:alpha')
    expect(text).toContain('kind: skill')
    expect(text).toContain('# alpha')
    expect(text).toContain('Body text.')
    expect(text).toContain('- **references** → `skill:beta`')
    expect(text.endsWith('\n')).toBe(true)
  })

  it('derives filesystem-safe mirror file names', () => {
    expect(nodeFileName('skill:research')).toBe('skill_research.md')
    expect(nodeFileName('reference:alpha-skill/reference/details.md')).toBe('reference_alpha-skill_reference_details.md.md')
  })

  it('rewrites actual local destinations while preserving labels, code, external links and HTML attributes', async () => {
    const source = [
      '---', 'example: "[frontmatter](file.md)"', '---',
      '[doc](file.md#heading "Title") and [space](<目录/一 (二).md>)',
      '[![badge](https://example.com/badge.svg)](file.md)',
      '![local](image.png) [web](https://example.com) [anchor](#section)',
      '<img src="image.png" alt="portrait" data-src="leave.png" title="src=wrong.png">',
      "<a href='file.md'>read</a>",
      '`[inline](file.md)` and `` [long ` code](file.md) ``',
      '```md', '[fenced](file.md)', '```',
      '~~~', '<img src="file.md">', '~~~',
      '    [indented](file.md)',
      '<!-- [comment](file.md) -->',
      '<pre>[literal](file.md)</pre>',
    ].join('\n')
    const seen: string[] = []
    const result = await rewriteMarkdownDestinations(source, async target => {
      seen.push(target)
      return `export/${encodeURIComponent(target)}`
    })
    expect(seen).toEqual(['file.md#heading', '目录/一 (二).md', 'file.md', 'image.png', 'image.png', 'file.md'])
    expect(result).toContain('[doc](export/file.md%23heading "Title")')
    expect(result).toContain('[space](<export/%E7%9B%AE%E5%BD%95%2F%E4%B8%80%20(%E4%BA%8C).md>)')
    expect(result).toContain('<img src="export/image.png" alt="portrait" data-src="leave.png" title="src=wrong.png">')
    for (const sample of ['example: "[frontmatter](file.md)"', '`[inline](file.md)`', '`` [long ` code](file.md) ``', '[fenced](file.md)', '    [indented](file.md)', '<!-- [comment](file.md) -->', '<pre>[literal](file.md)</pre>']) expect(result).toContain(sample)
    expect(await rewriteMarkdownDestinations(source, async () => undefined)).toBe(source)
  })

  it('preserves link offsets after emoji inside code and code-formatted link labels', async () => {
    const source = '```\n🙂 [code](leave.md)\n```\n[`references/research/`](references/research/)\n'
    const targets: string[] = []
    const result = await rewriteMarkdownDestinations(source, async target => {
      targets.push(target)
      return 'directory.md'
    })
    expect(targets).toEqual(['references/research/'])
    expect(result).toBe('```\n🙂 [code](leave.md)\n```\n[`references/research/`](directory.md)\n')
  })

  it('ignores Markdown-looking HTML attribute values and recognizes quoted greater-than signs', async () => {
    const source = '<img alt="[example](LICENSE)" title="1 > 0" src="image.jpg"> [real](LICENSE)'
    const seen: string[] = []
    const result = await rewriteMarkdownDestinations(source, async target => { seen.push(target); return `new/${target}` })
    expect(seen).toEqual(['image.jpg', 'LICENSE'])
    expect(result).toBe('<img alt="[example](LICENSE)" title="1 > 0" src="new/image.jpg"> [real](new/LICENSE)')
  })

  it('preserves code in quote/list containers and unclosed raw code blocks', async () => {
    for (const source of ['> ```md\n> [literal](LICENSE)\n> ````\n', '- ```\n  [literal](LICENSE)\n  ````\n', '<pre>\n[literal](LICENSE)\n']) {
      const seen: string[] = []
      expect(await rewriteMarkdownDestinations(source, async target => { seen.push(target); return 'changed.md' })).toBe(source)
      expect(seen).toEqual([])
    }
  })
})
