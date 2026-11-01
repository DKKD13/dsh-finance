import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const read = rel => readFileSync(join(ROOT, rel), 'utf8')
const hypothesis = read('skills/hypothesis-thinking/SKILL.md')
const drift = read('skills/thesis-drift/SKILL.md')
const catalog = JSON.parse(read('skills/catalog.json'))

test('两个假说审查 Skill 共用显式输入、真实关系、时间门和反证独立性契约', () => {
  for (const [name, skill] of [['hypothesis-thinking', hypothesis], ['thesis-drift', drift]]) {
    for (const text of [
      'runId', 'hypothesisId', 'asOf', 'metadata.claimType', 'finance_graph', 'research_graph_query', 'snapshot',
      'cite', 'derived_from', 'supports', 'contradicts', 'availableAt <= asOf',
      'quarantined', 'rejected', 'evidenceGaps', 'independent / dependent / unknown',
      'confidenceBefore', 'confidenceAfter', 'killCriteria', 'reviewOf', 'produces',
      'session:review:<runId>', 'deliverable:review:<runId>', 'references', 'contentHash',
    ]) assert.ok(skill.includes(text), `${name} 缺 ${text}`)
    assert.match(skill, /不要把(?:原假说|审查目标)或既有证据(?:节点)?放进 plan\.nodes/)
    assert.match(skill, /一次原子 plan/)
    assert.match(skill, /不得.*覆盖|不覆盖原假说/)
    assert.match(skill, /没有可确认的新证据/)
    assert.match(skill, /不创建 supersedes|不自动创建版本号|不得制造漂移、置信度变化、新 claim 或 supersedes 版本/)
    assert.match(skill, /finance 接口/)
    assert.match(skill, /(?:不要调用不存在的|不假定存在) `review_status`/)
    assert.match(skill, /search[\s\S]*get[\s\S]*backlinks[\s\S]*audit/)
  }
})

test('hypothesis-thinking 无新证据时保持置信度并只生成独立 review', () => {
  assert.match(hypothesis, /`confidenceAfter` 必须与 `confidenceBefore` 完全一致/)
  assert.match(hypothesis, /不得虚构升降、百分比、校准、状态迁移、`supersedes` 或新假说版本/)
  assert.match(hypothesis, /provider: "hypothesis-thinking"/)
  assert.match(hypothesis, /不把未知反证独立性当作强反证/)
  assert.match(hypothesis, /不在本流程改写(?:原假说|审查目标|原节点)或自动交易/)
})

test('thesis-drift 以 drift 结论替代伪造变化，并保留五维度与确定性数值复核', () => {
  for (const text of ['Improved / Unchanged / Weakened / 无法判断', '估值锚点', '核心假设', '管理层质量', '竞争护城河', 'finance_model', 'provider: "thesis-drift"', '`drift`']) {
    assert.ok(drift.includes(text), `thesis-drift 缺 ${text}`)
  }
  assert.match(drift, /没有可确认的新证据时不得制造漂移、置信度变化、新 claim 或 supersedes 版本/)
  assert.match(drift, /同义改写不是漂移/)
  assert.match(drift, /不输出买卖或下单指令/)
})

test('迁移 catalog 声明真实 Host 依赖且 skill 总数为 38', () => {
  assert.equal(catalog.skills.length, 38)
  assert.equal(catalog.skills.filter(skill => skill.kind === 'core').length, 22)
  for (const name of ['hypothesis-thinking', 'thesis-drift']) {
    const entry = catalog.skills.find(skill => skill.name === name)
    assert.ok(entry, `catalog 缺 ${name}`)
    assert.match(entry.externalDependencies.join(' | '), /finance_graph/)
    assert.match(entry.externalDependencies.join(' | '), /research_graph_query/)
  }
  assert.match(catalog.skills.find(skill => skill.name === 'thesis-drift').externalDependencies.join(' | '), /finance_model/)
})
