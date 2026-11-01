import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'
import { dirname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const DEST = join(ROOT, 'skills')
const read = rel => readFileSync(join(DEST, rel), 'utf8')
const catalog = JSON.parse(read('catalog.json'))

function walk(dir, base = dir) {
  const out = []
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) out.push(...walk(full, base))
    else if (entry.isFile()) out.push(relative(base, full).split('\\').join('/'))
  }
  return out
}

test('knowledge-compiler 注册为第 21 个 core skill，并连接 ingest 与用户可选报告流程', () => {
  const entry = catalog.skills.find(skill => skill.name === 'knowledge-compiler')
  assert.ok(entry)
  assert.equal(entry.kind, 'core')
  assert.equal(entry.path, 'knowledge-compiler/SKILL.md')
  assert.deepEqual(entry.relations.map(rel => rel.target), ['finance-source-ingest', 'research', 'deep-research'])
  assert.match(entry.externalDependencies.join(' | '), /当前真实 DSH Session/)
  assert.ok(catalog.skills.find(skill => skill.name === 'finance-source-ingest').relations.some(rel => rel.target === 'knowledge-compiler'))
  assert.ok(catalog.skills.find(skill => skill.name === 'wiki-think').relations.some(rel => rel.target === 'knowledge-compiler'))
})

test('知识编译契约覆盖时间门、逐节点读取、假说字段、证据独立性与一次原子提交', () => {
  const skill = read('knowledge-compiler/SKILL.md')
  for (const text of [
    'runId', 'sourceIds', 'asOf', 'compile_prepare', 'compile_status', 'quarantined',
    'availableAt > asOf', '`get`', '`search`', 'claimType', 'hypothesis', 'killCriteria',
    'confidence', 'reliability', 'independence', 'provenance.dshSessionId', 'contentHash',
    'answers', 'supports', 'contradicts', 'cite', 'derived_from', 'produces',
  ]) assert.ok(skill.includes(text), `knowledge-compiler 缺 ${text}`)
  assert.ok(skill.indexOf('### 1. 只读准备与时间门') < skill.indexOf('### 2. 逐个读取真实内容，再搜索反证'))
  assert.ok(skill.indexOf('### 2. 逐个读取真实内容，再搜索反证') < skill.indexOf('### 3. 形成问题与假说'))
  assert.ok(skill.indexOf('### 3. 形成问题与假说') < skill.indexOf('### 4. 组装单次原子 GraphPlan'))
  assert.match(skill, /一个\*\* `finance_graph` 的 `plan` 调用/)
  assert.match(skill, /不得创建 `deliverable`/)
  assert.match(skill, /不是最终研究报告/)
  assert.match(skill, /不得新建或调用第二个 LLM runtime/)
  assert.match(skill, /无法获得就省略，禁止占位或猜测/)
  assert.match(skill, /现有 Host 会在原子提交前确定性补全并校验它/)
  assert.match(skill, /metadataWithoutContentHash/)
  assert.match(skill, /canonical JSON 会递归按对象 key 排序/)
  assert.match(skill, /如果自行提供一个错误 hash，Host 会拒绝整个 plan/)
})

test('finance-source-ingest 与 wiki-think 已迁到图谱编译链，不再引用旧私有 vault 管线', () => {
  const ingest = read('finance-source-ingest/SKILL.md')
  assert.match(ingest, /finance-source-ingest → knowledge-compiler/)
  assert.match(ingest, /\/knowledge-compiler/)
  assert.match(ingest, /ready\/时间门/)
  assert.match(ingest, /不生成研究假说或最终报告/)
  for (const rel of walk(join(DEST, 'wiki-think')).filter(rel => rel.endsWith('.md'))) {
    const content = read(join('wiki-think', rel))
    for (const forbidden of [
      'D:\\', 'D:/研究空间', 'INVESTOR_WIKI_ROOT', 'investor-wiki/',
      'wiki/sources/', 'wiki/_log.md', 'workspace/portfolio/',
      'kb.py', 'sources.py', 'qmd', 'yfinance',
    ]) assert.ok(!content.includes(forbidden), `${rel}: 仍含旧私有路径/工具 ${forbidden}`)
  }
  assert.match(read('wiki-think/SKILL.md'), /完整执行 `\.\.\/knowledge-compiler\/SKILL\.md`/)
})

test('research/deep-research 统一 deliverable、原子 plan 与实际来源边', () => {
  for (const rel of ['research/SKILL.md', 'deep-research/SKILL.md']) {
    const content = read(rel)
    assert.match(content, /finance_graph plan/)
    assert.match(content, /deliverable -\[derived_from\]->/)
    assert.match(content, /deliverable -\[cite\]->/)
    assert.match(content, /用户明确选择/)
  }
  const output = read('research/reference/notion-output.md')
  assert.match(output, /session -\[produces\]-> deliverable/)
  assert.match(output, /prediction -\[resolves\]-> instrument\/catalyst/)
  assert.match(read('finance-source-ingest/references/evidence-card.md'), /raw -\[supports\|contradicts\]-> claim/)
})
