import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const read = rel => readFileSync(join(ROOT, rel), 'utf8')
const skill = read('research-skills/dsh-overrides/visualizer/SKILL.md')
const reports = read('client/ui/ReportsPanel.tsx')

test('DSH visualizer default keeps raw HTML out of the graph Markdown renderer', () => {
  assert.match(reports, /MarkdownText text=\{protectReportCurrency\(active\.content\)\}[\s\S]*omitHtml/)
  assert.match(skill, /Default: DSH mode/)
  assert.match(skill, /standalone, self-contained HTML/)
  assert.match(skill, /Markdown-native graph summary/)
  assert.match(skill, /no raw HTML blocks/)
  assert.match(skill, /Do not assume it is embedded in a graph report/)
  doesNotContainDefaultMode('inline HTML')
})

test('DSH links follow the verified native Markdown file-link contract', () => {
  for (const text of [
    '[Visual HTML](<relative/or/absolute/path/report-visual.html>)',
    '[Markdown summary](<relative/or/absolute/path/report-visual-summary.md>)',
    '[Original report](<relative/or/absolute/path/report.md>)',
    '`present` tool',
    'Do not invent `dsh-resource:`, `dsh-app:`, or `file://` URLs',
    'Do not add a custom file-link UI or change `omitHtml`',
  ]) assert.ok(skill.includes(text), `visualizer contract missing: ${text}`)
})

test('visualizer output is evidence-bound and preserves source and safety boundaries', () => {
  for (const text of [
    'Never overwrite the source report',
    'source node, source document, URL, filing, transcript',
    '`asOf` or `availableAt`',
    'reported fact from a calculation',
    'mark missing, conflicting, stale, or unverifiable data as unknown',
    'Do not add a new data source, API call, dependency',
    'inline CSS and inline SVG',
    'Use no JavaScript, `<iframe>`',
    'Provenance:',
  ]) assert.ok(skill.includes(text), `visualizer evidence rule missing: ${text}`)
})

test('explicit Obsidian mode preserves the original inline-HTML capability', () => {
  const obsidian = skill.slice(skill.indexOf('## Obsidian mode'))
  assert.match(obsidian, /Only after the user explicitly requests Obsidian/)
  assert.match(obsidian, /zero `<iframe>`, zero `<script>`, and no `<style>` block/)
  assert.match(obsidian, /inline `style="\.\.\."` and inline SVG/)
  assert.match(obsidian, /Preserve the original source report unchanged/)
})

function doesNotContainDefaultMode(forbidden) {
  const defaultMode = skill.slice(skill.indexOf('## Default DSH output'), skill.indexOf('## Obsidian mode'))
  assert.ok(!new RegExp(`insert[^\\n]*${forbidden}`, 'i').test(defaultMode))
}
