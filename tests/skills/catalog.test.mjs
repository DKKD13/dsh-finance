/**
 * catalog.json 测试：目录与磁盘真实状态一致，关系与共享引用可解析。
 *
 * 运行：node --test tests/skills/
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { dirname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const DEST = join(ROOT, 'skills')

const catalog = JSON.parse(readFileSync(join(DEST, 'catalog.json'), 'utf8'))

function walk(dir, base = dir) {
  const out = []
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) out.push(...walk(full, base))
    else if (entry.isFile()) out.push(relative(base, full).split('\\').join('/'))
  }
  return out.sort()
}

/** 独立重发现：任何带合法 frontmatter（--- 定界、name/description 非空）的 .md。 */
function rediscover() {
  return walk(DEST).filter((rel) => {
    if (!rel.endsWith('.md')) return false
    const content = readFileSync(join(DEST, rel), 'utf8')
    if (!content.startsWith('---\n')) return false
    const end = content.indexOf('\n---\n', 4)
    if (end < 0) return false
    const raw = content.slice(4, end)
    return /^name:\s*\S/m.test(raw) && /^description:\s*\S/m.test(raw)
  })
}

test('catalog 基本结构', () => {
  assert.equal(catalog.version, 1)
  assert.equal(catalog.skillsRoot, 'skills')
  assert.ok(Array.isArray(catalog.skills))
  assert.ok(Array.isArray(catalog.sharedReferences))
  assert.match(catalog.note, /Host 不依赖本文件/)
})

test('catalog 与磁盘一致：每个条目路径存在，且覆盖所有可注册技能文件', () => {
  const listed = catalog.skills.map(s => s.path).sort()
  const discovered = rediscover()
  assert.deepEqual(listed, discovered,
    `catalog 与磁盘不一致：仅 catalog 有 [${listed.filter(p => !discovered.includes(p))}]，磁盘独有 [${discovered.filter(p => !listed.includes(p))}]`)
  for (const skill of catalog.skills) {
    assert.ok(existsSync(join(DEST, skill.path)), `${skill.path} 不存在`)
    assert.match(skill.name, /^[a-z0-9]+(?:-[a-z0-9]+)*$/, `${skill.name} 不是合法 kebab-case`)
    assert.ok(skill.description.length > 0)
    assert.ok(['core', 'example', 'nested'].includes(skill.kind), `${skill.name} kind 非法`)
    assert.ok(Array.isArray(skill.externalDependencies), `${skill.name} 缺 externalDependencies`)
    for (const res of skill.resources ?? []) {
      assert.ok(existsSync(join(DEST, dirname(skill.path), res)), `${skill.name} 的 resource ${res} 不存在`)
    }
  }
})

test('catalog 数量：core 22 / example 15 / nested 1，总计 38', () => {
  const count = kind => catalog.skills.filter(s => s.kind === kind).length
  assert.equal(count('core'), 22)
  assert.equal(count('example'), 15)
  assert.equal(count('nested'), 1)
  assert.equal(catalog.skills.length, 38)
  assert.equal(catalog.skills.find(s => s.kind === 'nested').name, 'market-watch')
})

test('catalog 关系可解析：target 是已知技能名、examples:* 通配或 shared: 引用', () => {
  const names = new Set(catalog.skills.map(s => s.name))
  const shared = new Set(catalog.sharedReferences.map(r => `shared:${r.path}`))
  for (const skill of catalog.skills) {
    for (const rel of skill.relations ?? []) {
      const ok = names.has(rel.target) || rel.target === 'examples:*' || shared.has(rel.target)
      assert.ok(ok, `${skill.name} 的关系指向未知目标 ${rel.target}`)
    }
  }
})

test('共享引用 _investment-philosophy.md：路径存在、不作为技能注册、usedBy 与 relations 吻合', () => {
  const ref = catalog.sharedReferences.find(r => r.path === '_investment-philosophy.md')
  assert.ok(ref, 'catalog 缺 _investment-philosophy.md 共享引用')
  assert.ok(existsSync(join(DEST, ref.path)))
  assert.ok(!catalog.skills.some(s => s.path === ref.path), '共享引用不应作为技能列出')
  const fromRelations = catalog.skills
    .filter(s => (s.relations ?? []).some(r => r.target === 'shared:_investment-philosophy.md'))
    .map(s => s.name)
    .sort()
  assert.deepEqual(ref.usedBy, fromRelations)
})

test('金融依赖只声明公开 provider 与 Host 接口，不再声明旧私有管线', () => {
  const depsOf = name => (catalog.skills.find(s => s.name === name)?.externalDependencies ?? []).join(' | ')
  for (const name of ['research', 'deep-research', 'flex-memory', 'daily-digest', 'market-watch', 'portfolio-allocation']) {
    assert.doesNotMatch(depsOf(name), /kb\.py|sources\.py|memory\.py|RSS-Notion|Notion|Obsidian|PyPortfolioOpt|vectorbt|quantstats/)
  }
  for (const name of ['research', 'valuation-model', 'equity-earnings', 'portfolio-weekly']) {
    assert.match(depsOf(name), /finance_model/)
  }
  assert.match(depsOf('flex-memory'), /finance_briefing\.evaluate/)
  assert.match(depsOf('finance-source-ingest'), /公开来源/)
  assert.match(depsOf('video-deep-reader'), /segment 时间戳/)
  assert.match(depsOf('product-review'), /Playwright/)
})
