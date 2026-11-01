/**
 * 内容完整性测试：skills/ 是 research-skills/skills 的全量迁移 + 显式兼容修复。
 *
 * 运行：node --test tests/skills/
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const SRC = join(ROOT, 'research-skills', 'skills')
const DEST = join(ROOT, 'skills')

function walk(dir, base = dir) {
  const out = []
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) out.push(...walk(full, base))
    else if (entry.isFile()) out.push(relative(base, full).split('\\').join('/'))
  }
  return out.sort()
}

function read(rel) {
  return readFileSync(join(DEST, rel), 'utf8')
}

const SKILL_NAME = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

function parseFrontmatter(content) {
  if (!content.startsWith('---\n')) return undefined
  const end = content.indexOf('\n---\n', 4)
  if (end < 0) return undefined
  return { raw: content.slice(4, end), body: content.slice(end + 5) }
}

function frontmatterValue(raw, key) {
  const m = raw.match(new RegExp(`^${key}:\\s*(.*)$`, 'm'))
  if (!m) return undefined
  if (m[1] === '|' || m[1] === '|-') {
    const lines = raw.slice(raw.indexOf(m[0]) + m[0].length).replace(/^\n/, '').split('\n')
    const block = []
    for (const line of lines) {
      if (/^\s+\S/.test(line)) block.push(line.trim())
      else break
    }
    return block.join('\n')
  }
  return m[1].trim()
}

/** 所有可注册技能文件（带合法 frontmatter 的 .md）。 */
function discoverSkills() {
  return walk(DEST).filter((rel) => {
    if (!rel.endsWith('.md')) return false
    const fm = parseFrontmatter(read(rel))
    return fm !== undefined && frontmatterValue(fm.raw, 'name') && frontmatterValue(fm.raw, 'description')
  })
}

const CORE_SKILLS = [
  'catalyst-calendar', 'daily-digest', 'deep-research', 'equity-earnings',
  'finance-source-ingest', 'financial-data-rigor', 'flex-memory', 'huashu-nuwa',
  'hypothesis-thinking', 'knowledge-compiler', 'planning-with-files', 'portfolio-allocation',
  'portfolio-weekly', 'product-review', 'report-digest', 'research',
  'virtual-fund', 'thesis-drift', 'valuation-model', 'video-deep-reader', 'visualizer', 'wiki-think',
]

const EXAMPLE_SKILLS = [
  'andrej-karpathy-perspective', 'elon-musk-perspective', 'feynman-perspective',
  'ilya-sutskever-perspective', 'mrbeast-perspective', 'munger-perspective',
  'naval-perspective', 'paul-graham-perspective', 'steve-jobs-perspective',
  'sun-yuchen-perspective', 'taleb-perspective', 'trump-perspective',
  'x-mastery-mentor', 'zhang-yiming-perspective', 'zhangxuefeng-perspective',
]

test('迁移脚本幂等：skills/ 与 scripts/migrate-skills.mjs 的产出一致', () => {
  execFileSync(process.execPath, [join(ROOT, 'scripts', 'migrate-skills.mjs'), '--check'], { stdio: 'pipe' })
})

test('数量：22 个核心技能 + 15 个成品视角技能 + 1 个嵌套技能，总计 38；实际 SKILL.md 为 37', () => {
  const skills = discoverSkills()
  assert.equal(skills.length, 38, `预期 38 个可注册技能，实际 ${skills.length}: ${skills.join(', ')}`)
  assert.equal(walk(DEST).filter(rel => rel.endsWith('/SKILL.md')).length, 37)
  for (const name of CORE_SKILLS) {
    assert.ok(skills.includes(`${name}/SKILL.md`), `缺核心技能 ${name}/SKILL.md`)
  }
  for (const name of EXAMPLE_SKILLS) {
    assert.ok(skills.includes(`huashu-nuwa/examples/${name}/SKILL.md`), `缺成品视角技能 ${name}`)
  }
  assert.ok(skills.includes('daily-digest/market-watch.md'), '缺嵌套技能 market-watch')
})

test('完整性：research-skills/skills 的每个源文件都迁移到了 skills/ 相同相对路径', () => {
  const missing = walk(SRC).filter(rel => !existsSync(join(DEST, rel)))
  assert.deepEqual(missing, [], `以下源文件没有迁移：${missing.join(', ')}`)
})

test('frontmatter 合法：--- 定界、name/description 齐全、name 为 kebab-case 且与目录同名', () => {
  for (const rel of discoverSkills()) {
    const content = read(rel)
    assert.ok(!content.startsWith('***'), `${rel}: frontmatter 仍是旧的 *** 定界`)
    const fm = parseFrontmatter(content)
    assert.ok(fm, `${rel}: 缺 frontmatter`)
    const name = frontmatterValue(fm.raw, 'name')
    const description = frontmatterValue(fm.raw, 'description')
    assert.ok(name && SKILL_NAME.test(name), `${rel}: name "${name}" 不符合 DSH 技能名规则`)
    assert.ok(description && description.length > 0, `${rel}: 缺 description`)
    assert.ok(!/^hooks:/m.test(fm.raw), `${rel}: frontmatter 含 Claude hooks 字段，DSH 不支持`)
    assert.ok(!/^allowed-tools:/m.test(fm.raw), `${rel}: frontmatter 含 Claude allowed-tools 字段`)
    if (rel.endsWith('/SKILL.md')) {
      const dirName = rel.slice(0, -'/SKILL.md'.length).split('/').pop()
      assert.equal(name, dirName, `${rel}: frontmatter name 与目录名不一致`)
    }
  }
})

test('共享引用 _investment-philosophy.md 存在且不被当作技能（无 frontmatter）', () => {
  const rel = '_investment-philosophy.md'
  assert.ok(existsSync(join(DEST, rel)))
  assert.equal(parseFrontmatter(read(rel)), undefined, `${rel} 不应有 frontmatter`)
  assert.ok(!discoverSkills().includes(rel), `${rel} 不应出现在可注册技能里`)
})

test('无旧悬空引用：_alex-profile.md 的引用全部改到 _investment-philosophy.md 对应章节', () => {
  assert.ok(!existsSync(join(DEST, '_alex-profile.md')), '_alex-profile.md 不应存在（上游本来就没有）')
  for (const rel of walk(DEST)) {
    if (!rel.endsWith('.md')) continue
    assert.ok(!read(rel).includes('_alex-profile'), `${rel}: 仍引用不存在的 _alex-profile.md`)
  }
  // §3 信任锚分级 / §1 Alpha 衰减 / §4 历史预测偏差 都真实存在于目标文件
  const philosophy = read('_investment-philosophy.md')
  for (const section of ['## §1.', '## §3.', '## §4.']) {
    assert.ok(philosophy.includes(section), `_investment-philosophy.md 缺 ${section}`)
  }
})

test('无硬编码 Windows / Claude 专有路径（examples 调研素材中的历史记录除外）', () => {
  const FORBIDDEN = [
    ['D:\\', 'Windows 盘符路径'],
    ['D:/研究空间', 'Windows 盘符路径'],
    ['D:/investor-letters', 'Windows 盘符路径'],
    ['CLAUDE_PLUGIN_ROOT', 'Claude 插件环境变量'],
    ['$env:USERPROFILE', 'PowerShell 专有变量'],
    ['powershell.exe', 'PowerShell 调用'],
    ['.claude/', 'Claude 专有目录'],
  ]
  const isExempt = rel => rel.startsWith('huashu-nuwa/examples/') && !rel.endsWith('SKILL.md')
  for (const rel of walk(DEST)) {
    if (!/\.(md|py|sh|ps1)$/.test(rel) || isExempt(rel)) continue
    const content = read(rel).split('~/.claude/projects').join('') // 该字面量仅用于「Claude 专用、DSH 不可用」的显式说明
    for (const [pattern, label] of FORBIDDEN) {
      assert.ok(!content.includes(pattern), `${rel}: 仍含${label} ${pattern}`)
    }
  }
})

test('product-review 不自动 git commit；planning-with-files 不假装 Claude hooks 可用', () => {
  const pr = read('product-review/SKILL.md')
  assert.ok(!/^git (add|commit|push)/m.test(pr), 'product-review 仍含自动 git 命令')
  assert.ok(pr.includes('绝不自动执行'), 'product-review 缺「不自动提交」的显式约束')
  const pwf = read('planning-with-files/SKILL.md')
  assert.ok(pwf.includes('DSH 不支持 Claude hooks'), 'planning-with-files 缺 hooks 不可用的显式说明')
  assert.ok(!/^ hooks:/m.test(pwf.split('---')[1] ?? ''), 'planning-with-files frontmatter 仍含 hooks')
})

test('五个升级技能及其 reference 不再依赖旧私有管线或第二计算引擎', () => {
  const upgraded = ['research/', 'deep-research/', 'daily-digest/', 'flex-memory/', 'portfolio-allocation/']
  const forbidden = [
    'kb.py', 'sources.py', 'memory.py', 'RSS-Notion', 'Notion', 'Obsidian',
    'investor-wiki', 'yfinance', 'PyPortfolioOpt', 'vectorbt', 'quantstats', 'financial_rigor.py',
  ]
  for (const rel of walk(DEST)) {
    if (!upgraded.some(prefix => rel.startsWith(prefix)) || !/\.(md|py|sh|ps1)$/.test(rel)) continue
    for (const pattern of forbidden) assert.ok(!read(rel).includes(pattern), `${rel}: 仍含旧依赖 ${pattern}`)
  }
  for (const rel of ['research/SKILL.md', 'deep-research/SKILL.md', 'flex-memory/SKILL.md', 'portfolio-allocation/SKILL.md']) {
    assert.ok(read(rel).includes('research_graph_'), `${rel}: 未默认使用图谱接口`)
    assert.ok(read(rel).includes('finance_model'), `${rel}: 未使用确定性 finance_model`)
  }
})

test('八个金融技能覆盖时间门、图谱交付、segment 时间戳、到期结算与禁止交易', () => {
  const financeSkills = [
    'financial-data-rigor', 'virtual-fund', 'thesis-drift', 'valuation-model', 'equity-earnings',
    'catalyst-calendar', 'portfolio-weekly', 'finance-source-ingest', 'video-deep-reader',
  ]
  for (const name of financeSkills) {
    const content = read(`${name}/SKILL.md`)
    assert.ok(content.includes('research_graph_'), `${name}: 缺图谱接口`)
    assert.ok(content.includes('finance_'), `${name}: 缺金融接口约束`)
    assert.ok(/不.{0,12}(交易|下单)|不得生成或执行订单|绝不生成或执行订单/.test(content), `${name}: 缺禁止交易边界`)
  }
  const rigor = read('financial-data-rigor/SKILL.md')
  assert.ok(rigor.includes('只读研究'), 'financial-data-rigor: 缺只读研究边界')
  assert.ok(rigor.includes('不自动交易或再平衡'), 'financial-data-rigor: 缺禁止自动交易/再平衡边界')
  const catalyst = read('catalyst-calendar/SKILL.md')
  assert.ok(catalyst.includes('`finance_memory`'), 'catalyst-calendar: 缺 finance_memory')
  assert.ok(catalyst.includes('`due`') && catalyst.includes('`resolve`'), 'catalyst-calendar: 缺真实到期结算 action')
  assert.ok(catalyst.includes('`finance_briefing` 的 `evaluate`'), 'catalyst-calendar: 校准汇总必须使用 finance_briefing.evaluate')
  assert.ok(catalyst.includes('prediction -[resolves]-> instrument/catalyst'), 'catalyst-calendar: resolves 方向错误')
  assert.ok(!catalyst.includes('catalyst -[resolves]-> prediction'), 'catalyst-calendar: 仍含反向 resolves 边')
  assert.ok(read('catalyst-calendar/references/catalyst-method.md').includes('`finance_briefing` 的 `evaluate`'), 'catalyst-method: 仍请求不存在的校准 action')
  assert.ok(read('daily-digest/SKILL.md').includes('deliverable'))
  assert.ok(read('video-deep-reader/SKILL.md').includes('segment start/end'))
  assert.ok(read('flex-memory/SKILL.md').includes('availableAt'))
  assert.ok(read('flex-memory/SKILL.md').includes('resolutionDate'), 'flex-memory: 缺真实 prediction resolutionDate 字段')
  assert.ok(read('flex-memory/SKILL.md').includes('resolves'))
  const dcf = read('valuation-model/references/dcf-method.md')
  assert.ok(dcf.includes('E/(E+D)') && dcf.includes('D/(E+D)'))
  assert.ok(dcf.includes('PV(TV_N) = TV_N / (1+WACC)^N'))
  assert.ok(dcf.includes('finance_model'))
})

test('MIT/Apache 许可证与修改声明随包，ai-berkshire 原文仅作上游证据保存', () => {
  const copies = {
    'thesis-drift/LICENSE': 'licenses/ai-berkshire-MIT.txt',
    'financial-data-rigor/LICENSE': 'licenses/ai-berkshire-MIT.txt',
    'valuation-model/LICENSE': 'licenses/prism-financial-services-plugins-Apache-2.0.txt',
    'equity-earnings/LICENSE': 'licenses/prism-financial-services-plugins-Apache-2.0.txt',
    'catalyst-calendar/LICENSE': 'licenses/prism-financial-services-plugins-Apache-2.0.txt',
    'THIRD_PARTY_NOTICES.md': 'THIRD_PARTY_NOTICES.md',
  }
  for (const [dest, source] of Object.entries(copies)) {
    assert.ok(readFileSync(join(DEST, dest)).equals(readFileSync(join(ROOT, source))), `${dest}: 未与许可源一致`)
  }
  assert.match(read('thesis-drift/LICENSE'), /MIT License[\s\S]*Copyright \(c\) 2026 xbtlin/)
  assert.match(read('valuation-model/LICENSE'), /Apache License[\s\S]*Version 2\.0/)
  const upstream = readFileSync(join(ROOT, 'research-skills', 'upstream', 'ai-berkshire', 'thesis-drift.md'), 'utf8')
  assert.ok(upstream.includes('# 投资论文漂移检测：分清事实变化与措辞变化'))
  assert.ok(upstream.includes('financial_rigor.py'), '上游原文未完整保留')
  assert.ok(!read('thesis-drift/SKILL.md').includes('financial_rigor.py'))
  for (const rel of [
    'valuation-model/references/dcf-method.md',
    'equity-earnings/references/earnings-method.md',
    'catalyst-calendar/references/catalyst-method.md',
  ]) assert.ok(read(rel).includes('修改声明（2026-10-30'), `${rel}: 缺显著修改声明`)
})

// ---------------------------------------------------------------------------
// 悬空引用扫描：反引号内的 .md 相对路径必须解析到包内真实文件。
// 以下是不解析的类别（工作区产出物 / 占位符 / 上游调研素材中的历史路径）。
// ---------------------------------------------------------------------------

const SKIP_EXACT = new Set([
  // planning-with-files 在用户项目里创建的工作文件
  'task_plan.md', 'progress.md', 'findings.md',
  // x-mastery-mentor 在用户工作区创建的工作文件
  'profile.md', 'strategy.md', 'todo.md',
  // 女娲蒸馏流程中 agent 写入目标 skill 目录的产物文件名（表格里的输出名）
  '01-writings.md', '02-conversations.md', '03-expression-dna.md',
  '04-external-views.md', '05-decisions.md', '06-timeline.md',
  'references/research/01-06.md', 'references/research/0X-xxx.md',
  // 上游内容中引用的历史报告文件（举例子，不是包内引用）
  'Q2-agent-harness-2026-04-20.md', 'Q1-cpu回归-deep-2026-04-16.md',
])

const SKIP_PREFIX = [
  'investor-wiki/', 'workspace/', 'wiki/', 'docs/', 'output/',
  '07-调研与分析/', '04-写作参考/', // 原作者本机目录，出现在调研素材正文里
]

function isCheckableRef(ref, fromRel) {
  if (fromRel === 'THIRD_PARTY_NOTICES.md') return false // 许可声明含上游仓库路径，不是包内链接
  if (SKIP_EXACT.has(ref)) return false
  if (SKIP_PREFIX.some(p => ref.startsWith(p))) return false
  if (ref.startsWith('/')) return false
  if (/[{}*$[\]<>？\s]/.test(ref)) return false
  // 调研素材（examples/**/references/）是历史正文，不做引用解析
  if (fromRel.startsWith('huashu-nuwa/examples/') && !fromRel.endsWith('SKILL.md')) return false
  return true
}

test('无悬空相对引用：反引号 .md 路径都能解析到包内真实文件', () => {
  const dangling = []
  for (const rel of walk(DEST)) {
    if (!rel.endsWith('.md')) continue
    const content = read(rel)
    for (const m of content.matchAll(/`([^`\n]+\.md)`/g)) {
      const ref = m[1]
      if (!isCheckableRef(ref, rel)) continue
      const target = resolve(join(DEST, dirname(rel)), ref)
      if (!existsSync(target)) dangling.push(`${rel} -> ${ref}`)
    }
  }
  assert.deepEqual(dangling, [], `悬空引用：\n${dangling.join('\n')}`)
})

test('图片与脚本素材存在', () => {
  const assets = [
    'huashu-nuwa/6-agents-parallel.png',
    'huashu-nuwa/advisory-board.png',
    'huashu-nuwa/cover-distill-minds.png',
    'huashu-nuwa/wechat-qrcode.jpg',
    'huashu-nuwa/scripts/download_subtitles.sh',
    'huashu-nuwa/scripts/merge_research.py',
    'huashu-nuwa/scripts/quality_check.py',
    'huashu-nuwa/scripts/srt_to_transcript.py',
    'huashu-nuwa/examples/mrbeast-perspective/scripts/analyze_titles.py',
    'huashu-nuwa/examples/mrbeast-perspective/scripts/fetch_youtube_subtitles.sh',
    'huashu-nuwa/examples/mrbeast-perspective/scripts/retention_curve_checker.py',
    'huashu-nuwa/examples/mrbeast-perspective/scripts/thumbnail_audit.py',
    'planning-with-files/scripts/init-session.sh',
    'planning-with-files/scripts/check-complete.sh',
    'planning-with-files/scripts/session-catchup.py',
    'planning-with-files/templates/task_plan.md',
    'planning-with-files/templates/findings.md',
    'planning-with-files/templates/progress.md',
  ]
  const missing = assets.filter(rel => !existsSync(join(DEST, rel)))
  assert.deepEqual(missing, [], `缺素材：${missing.join(', ')}`)

  // markdown / HTML 中的本地图片引用必须存在
  const missingImg = []
  for (const rel of walk(DEST)) {
    if (!rel.endsWith('.md')) continue
    const content = read(rel)
    for (const m of content.matchAll(/!\[[^\]]*\]\(([^)]+)\)|<img\s[^>]*src="([^"]+)"/g)) {
      const src = m[1] ?? m[2]
      if (!src || src.startsWith('http') || src.startsWith('$')) continue
      if (!existsSync(resolve(join(DEST, dirname(rel)), src))) missingImg.push(`${rel} -> ${src}`)
    }
  }
  assert.deepEqual(missingImg, [], `缺图片：\n${missingImg.join('\n')}`)
})

test('迁移不丢内容：除声明过修复的文件外，迁移结果与源文件逐字节一致（CRLF 归一化为 LF）', () => {
  const TRANSFORMED = [
    '_investment-philosophy.md',
    'flex-memory/SKILL.md',
    'research/SKILL.md',
    'research/reference/tools.md',
    'research/reference/valuation.md',
    'research/reference/dimension-templates.md',
    'research/reference/evaluator.md',
    'research/reference/notion-output.md',
    'research/reference/question-mode.md',
    'thesis-drift/SKILL.md',
    'deep-research/SKILL.md',
    'deep-research/reference/inspirer.md',
    'report-digest/SKILL.md',
    'hypothesis-thinking/SKILL.md',
    'portfolio-allocation/SKILL.md',
    'wiki-think/SKILL.md',
    'wiki-think/reference/source-standard.md',
    'wiki-think/reference/signal-standard.md',
    'wiki-think/reference/reflect-standard.md',
    'daily-digest/SKILL.md',
    'daily-digest/market-watch.md',
    'product-review/SKILL.md',
    'planning-with-files/SKILL.md',
    'planning-with-files/scripts/session-catchup.py',
    'huashu-nuwa/SKILL.md',
    'huashu-nuwa/examples/x-mastery-mentor/SKILL.md',
    'huashu-nuwa/scripts/merge_research.py',
    'huashu-nuwa/scripts/quality_check.py',
    'visualizer/references/design-system.md',
    // Explicit full DSH runtime overrides, also checked by migration idempotence.
    'portfolio-weekly/SKILL.md',
    'finance-source-ingest/SKILL.md',
    'video-deep-reader/SKILL.md',
    'knowledge-compiler/SKILL.md',
    'equity-earnings/SKILL.md',
    'financial-data-rigor/SKILL.md',
    'virtual-fund/SKILL.md',
    'valuation-model/SKILL.md',
    'visualizer/SKILL.md',
  ]
  for (const rel of walk(SRC)) {
    if (TRANSFORMED.includes(rel)) continue
    const src = readFileSync(join(SRC, rel))
    const dest = readFileSync(join(DEST, rel))
    if (src.equals(dest)) continue
    assert.equal(dest.toString('utf8'), src.toString('utf8').replace(/\r\n/g, '\n'),
      `${rel}: 未声明修复但内容与源文件（LF 归一化后）不一致`)
  }
})
