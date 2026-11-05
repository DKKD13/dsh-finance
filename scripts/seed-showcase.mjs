#!/usr/bin/env node
// Explicit opt-in fixtures for the disposable preview server only.
// Never connect this script to a personal graph, a native DSH server or a broker.
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createHash } from 'node:crypto'

const base = new URL(process.argv[2] ?? 'http://127.0.0.1:48941')
if (!['127.0.0.1', 'localhost', '[::1]'].includes(base.hostname)) throw new Error('Only an isolated loopback preview is allowed')
const page = await fetch(new URL('/scripts/preview.html', base)).then(r => r.text())
if (!page.includes('Dev-only preview harness')) throw new Error('This is not the disposable preview server')
const asOf = '2026-01-09T21:00:00.000Z'
const hash = value => 'sha256:' + createHash('sha256').update(value).digest('hex')
async function request(route, body) {
  const result = await fetch(new URL(route, base), { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }).then(r => r.json())
  if (!result.ok) throw new Error(JSON.stringify(result.error))
  return result.result
}
const graph = body => request('/research-graph', body)
const finance = body => request('/finance', body)
const existing = await graph({ op: 'graph.snapshot' })
if (existing.nodes.some(n => !['skill:research', 'skill:deep-research', 'skill:daily-digest', 'persona:nikita', 'source:paper-attention', 'claim:scaling', 'question:eval', 'deliverable:weekly', 'memory:pref-dark', 'instrument:aapl'].includes(n.id))) {
  throw new Error('Preview already has non-default data; start a fresh preview server instead of overwriting it')
}
for (const node of existing.nodes) await graph({ op: 'node.remove', id: node.id, cascade: true })
const catalog = JSON.parse(await readFile(new URL('../skills/catalog.json', import.meta.url)))
const nodes = catalog.skills.map(skill => {
  const kind = skill.kind === 'example' ? 'persona' : 'skill'
  return { id: `${kind}:${skill.name}`, kind, title: skill.name, content: skill.description, metadata: { description: skill.description, path: skill.path, showcase: true } }
})
const edges = []
const sourceSpecs = [
  ['apple', 'Apple · FY2025 第四季度业绩公告', 'https://www.apple.com/newsroom/2025/10/apple-reports-fourth-quarter-results/', '2025-10-30T00:00:00.000Z', 'Apple Newsroom', '公司披露产品、服务及不同地区的季度经营表现。研究时需要把收入、利润率、现金流与管理层展望放在一起核对。', '**先看增长的来源，再看增长的质量。**\n\n- 区分产品与服务收入，检查结构变化。\n- 结合现金流核对利润表现。\n- 将管理层展望与后续实际结果对照。\n\n这是基于公开公告的示例摘要，请回到原文核验。'],
  ['fed', 'Federal Reserve · 货币政策声明', 'https://www.federalreserve.gov/newsevents/pressreleases/monetary20250618a.htm', '2025-06-18T18:00:00.000Z', 'Federal Reserve', 'The Committee seeks to achieve maximum employment and inflation at the rate of 2 percent over the longer run.', '关注政策目标、通胀与就业之间的关系。将政策表述作为研究背景，避免把单次声明等同于未来利率路径。\n\n示例摘要；原始链接保留在材料旁。'],
  ['nvidia', 'NVIDIA · 季度研究材料索引', 'https://investor.nvidia.com/financial-info/financial-reports-and-sec-filings/default.aspx', '2025-11-20T00:00:00.000Z', 'NVIDIA Investor Relations', '研究清单：阅读公开财务报告，核对数据中心业务、供给、客户集中度和资本开支披露。此条为示例材料索引，不包含付费访谈或私人研报。', '本材料组织了需要从公司公开披露中核验的问题：需求是否转化为收入、交付节奏如何变化，以及增长对应的成本和风险。\n\n不把研究问题当作已经证实的结论。'],
]
for (const [key, title, canonicalUrl, availableAt, provider, content, summary] of sourceSpecs) {
  const id = `source:showcase-${key}`, rawId = `raw:showcase-${key}`, contentHash = hash(content)
  nodes.push({ id, kind: 'source', title, content, metadata: { provider, canonicalUrl, availableAt, asOf, contentHash, rawId, topic: key === 'fed' ? '宏观与估值' : '公司研究', tags: ['公开资料', '示例'], aiSummary: { text: summary, sourceContentHash: contentHash, model: '示例摘要', generatedAt: asOf }, showcase: true } })
  nodes.push({ id: rawId, kind: 'raw', title: `${title} · 阅读材料`, content, metadata: { sourceId: id, provider, availableAt, asOf, canonicalUrl, contentHash, annotations: [{ exact: key === 'apple' ? '收入、利润率、现金流' : content.slice(0, 18), note: '回到原始材料核对，保留研究上下文。', tags: ['待核验'] }], showcase: true } })
  edges.push({ from: rawId, to: id, kind: 'derived_from' })
}
const bull = 'belief:showcase-bull', bear = 'belief:showcase-bear'
nodes.push({ id: bull, kind: 'belief', title: '服务业务的持续性，能否支持更稳定的盈利质量？', content: '## 多头思路\n\n研究重点是收入结构与现金流的持续性。若高毛利业务占比提升，盈利对单一产品周期的依赖可能下降。\n\n### 需要的证据\n\n- 连续期间的分部披露\n- 毛利率与现金流的一致性\n- 留存、定价与新增需求\n\n这是演示观点，不是对公司的投资结论。', metadata: { stance: 'bull', confidence: 'medium', asOf, killCriteria: ['增长主要来自一次性因素', '现金流不能支持盈利改善'], showcase: true } })
nodes.push({ id: bear, kind: 'belief', title: '业务表现改善，是否已经被估值充分计入？', content: '## 空头思路\n\n把“好业务”和“好价格”分开讨论。先明确市场隐含的增长与利润率，再检查它们对贴现率和资本开支的敏感性。\n\n### 要核对什么\n\n1. 价格隐含了怎样的经营路径？\n2. 如果增长放缓，估值会如何变化？\n3. 哪些证据能够推翻当前担忧？\n\n这是用于界面展示的示例假说。', metadata: { stance: 'bear', confidence: 'medium', asOf, killCriteria: ['新增证据证明预期过于保守', '估值回落，风险补偿改善'], showcase: true } })
edges.push({ from: bull, to: 'source:showcase-apple', kind: 'based_on' }, { from: bear, to: 'source:showcase-fed', kind: 'based_on' }, { from: bull, to: bear, kind: 'tensions' })
nodes.push({ id: 'deliverable:showcase-research', kind: 'deliverable', title: '公司研究 · 增长来源与估值里的预期', content: '# 公司研究：先问三个问题\n\n## 研究结论\n\n这是一份展示报告结构的示例。判断需要同时回答业务变化、价格预期与反方证据，不能由一张走势图替代。\n\n## 1. 增长来自哪里\n\n从公开公告拆解收入构成、利润率与现金流，区分事实与解释。\n\n## 2. 价格要求什么\n\n将明确的假设送入 DCF 与敏感性计算，保存输入与时间。\n\n## 3. 什么会改变判断\n\n保留反方证据、证伪条件与待回答的问题，便于下一次复盘。\n\n## 来源\n\n- Apple Newsroom：季度业绩公告\n- Federal Reserve：货币政策声明\n\n示例报告，非投资建议。', metadata: { provider: 'research-skill', skill: 'research', asOf, runId: 'showcase-research', references: ['source:showcase-apple', 'source:showcase-fed'], showcase: true, visualArtifact: 'showcase/showcase-research-visual.html' } })
edges.push({ from: 'deliverable:showcase-research', to: 'source:showcase-apple', kind: 'cite' }, { from: 'deliverable:showcase-research', to: 'source:showcase-fed', kind: 'cite' })
await graph({ op: 'graph.plan', plan: { nodes, edges } })
// Real minimal HTML visual so the showcase report's artifact entry never
// points at a missing file; written under the repo's disposable showcase dir.
const visualDir = fileURLToPath(new URL('../showcase/', import.meta.url))
await mkdir(visualDir, { recursive: true })
await writeFile(join(visualDir, 'showcase-research-visual.html'), `<!doctype html>
<html lang="zh"><head><meta charset="utf-8"><title>Showcase · 研究可视化</title></head>
<body><h1>公司研究 · 增长来源与估值里的预期</h1><p>示例研究可视化：区分事实与解释，核对来源与日期。非投资建议。</p></body></html>
`, 'utf8')
const fundId = 'portfolio:showcase-fund'
await finance({ op: 'fund.configure', input: { id: fundId, title: 'Research Lab · 示例基金', initialCash: 1000000, currency: 'USD', startingAt: '2025-12-01T00:00:00.000Z' } })
const researchers = [
  ['pm', '基金经理', 'manager', ['AAPL', 'MSFT', 'NVDA'], '综合证据与估值', '组合研究与风险回报', '汇总研究员观点，记录组合判断。'],
  ['nvda', '半导体研究员', 'analyst', ['NVDA'], '从产业链回到财报', '算力、供给与资本开支', '对照需求、交付与现金流，保留反方证据。'],
  ['googl', '互联网研究员', 'analyst', ['GOOGL'], '产品与经营交叉验证', '搜索、广告与云业务', '跟踪产品变化如何传导到经营指标。'],
  ['cost', '消费研究员', 'analyst', ['COST'], '重视经营细节', '会员、客流与定价', '区分销量、价格与收入结构。'],
  ['jpm', '银行研究员', 'analyst', ['JPM'], '资产负债表优先', '利率、存款与信用', '核对收益与风险是否匹配。'],
  ['unh', '医疗研究员', 'analyst', ['UNH'], '关注政策与单位经济', '政策、成本与经营质量', '跟踪影响盈利的关键不确定性。'],
  ['aapl', '科技研究员', 'analyst', ['AAPL', 'MSFT'], '产品周期与现金流', '服务生态与盈利质量', '将经营披露与原有假说对照。'],
  ['reviewer', '研究复盘员', 'reviewer', ['AAPL', 'MSFT', 'NVDA'], '把事实与解释分开', '预测、反证与研究变化', '记录哪些判断得到验证，哪些需要修正。'],
]
for (const [key, title, role, tickers, researchStyle, focus, task] of researchers) await finance({ op: 'fund.researcher', input: { id: `session:showcase-${key}`, fundId, title, role, avatarKey: key, tickers, researchStyle, focus, task, enabled: false } })
for (let day = 0; day < 28; day++) {
  const at = new Date(Date.UTC(2025, 11, 2 + day, 21)).toISOString()
  const quotes = [['AAPL', 210], ['MSFT', 420], ['NVDA', 140]].map(([symbol, initial], i) => ({ symbol, currency: 'USD', price: +(initial * (1 + day * .0018 + .007 * Math.sin(day * .45 + i))).toFixed(2), availableAt: at }))
  const priceNodes = quotes.map(q => ({ id: `source:showcase-price-${q.symbol}-${day}`, kind: 'source', title: `${q.symbol} · 合成示例报价`, content: JSON.stringify(q), metadata: { provider: 'showcase.synthetic', ownerSkill: 'virtual-fund', availableAt: at, asOf: at, contentHash: hash(JSON.stringify(q)), data: q, showcase: true } }))
  const rawPrices = priceNodes.map(n => ({ ...n, id: n.id.replace('source:', 'raw:'), kind: 'raw', metadata: { ...n.metadata, sourceId: n.id } }))
  await graph({ op: 'graph.plan', plan: { nodes: [...priceNodes, ...rawPrices], edges: rawPrices.map(n => ({ from: n.id, to: n.metadata.sourceId, kind: 'derived_from' })) } })
  await finance({ op: 'fund.advance', input: { fundId, asOf: at, prices: quotes.map((q, i) => ({ symbol: q.symbol, price: q.price, availableAt: at, sourceId: priceNodes[i].id })), trades: day === 0 ? [{ symbol: 'AAPL', quantity: 1000 }, { symbol: 'MSFT', quantity: 200 }, { symbol: 'NVDA', quantity: 800 }] : [], summary: '合成输入计算的纸面快照，仅用于展示。' } })
}
const events = researchers.map(([key, title, , symbols], i) => ({ id: `deliverable:showcase-desk-${key}`, kind: 'deliverable', title: ['本期研究清单：先核对证据，再讨论组合', '算力研究：把需求与交付节奏放在一起', '产品更新：关注商业化路径的变化', '消费观察：区分客流与提价的影响', '银行研究：拆解利率与信用风险', '医疗跟踪：记录尚未解决的问题', '科技研究：从产品周期回到现金流', '研究复盘：哪些判断需要补充证据'][i], content: `## ${title} · 示例研究\n\n这是一条用于展示的工位记录。下一步：核对原始材料，检查已有判断，补充最有力的反方证据。\n\n未启动持续覆盖计划；此内容不是后台运行结果。`, metadata: { fundId, researcherId: `session:showcase-${key}`, instruments: symbols, asOf, provider: 'showcase.example', showcase: true } }))
await graph({ op: 'graph.plan', plan: { nodes: events, edges: [] } })
console.log('Showcase ready: actual components, disposable local graph, synthetic prices and paper-fund snapshots. No model or broker was contacted.')
