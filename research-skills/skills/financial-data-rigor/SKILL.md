---
name: financial-data-rigor
description: >-
  金融数据获取、口径归一化、多源交叉验证与证据卡写入。用于行情、财报、共识、汇率或任何关键金融数字进入研究之前；强制时间截面、统一 metadata 与确定性计算。
---

# Financial Data Rigor

任何关键数字都必须可定位、可复算、可按历史时点重放。不能用“模型记得”“搜索摘要写着”代替原始证据。

## 硬边界

- 结构化外部行情通过 `finance_market_data` 的 `ingest` 接收；`fetch` 返回 NOT_IMPLEMENTED 时明确报告在线取数不可用，绝不编造报价。公开文档可用宿主已有网页/文件能力读取。
- 图谱使用 `finance_graph` 的 `get/search/plan/import_artifact` 与既有 `research_graph_*`；不新建 Store，不编造 provider、字段、endpoint 或返回值。
- DCF、comps、组合快照分别只使用 `finance_model` 的 `dcf/comps/portfolio`。其他差异率或换算仅使用宿主实际提供的确定性能力；没有支持时并列原值并标“未复算”，不得心算或另写引擎。
- 每个数据点先固定 `asOf`。历史研究只能使用 `availableAt <= asOf` 的证据；`fetchedAt` 较晚不会把后来才公开的信息变成当时可见。
- `availableAt` 不明的材料进入 quarantine，不得支持历史断言。不得用文件修改时间猜测发布时间。
- 本技能仅用于只读研究；不连接券商，不生成或执行订单，不自动交易或再平衡。
- 不读取或分发私有报告、账户、cookie、token 或其他凭据。

## 工作流

### 1. 固定标的与截面

用 `finance_graph` 的 `search/get` 或 `research_graph_query` 查已有 instrument，再通过原子 `plan` 创建缺失节点。记录市场、代码、币种、会计标准、财年和复权口径；同名公司与 ADR/原股不得混为同一标的。

### 2. 获取原始数据

优先公司/监管披露，其次有明确时间和口径的结构化 provider，再次高质量公开资料。保存原始输入或用户提供的公开材料，不先改写再丢弃原文。视频材料必须保留 segment 起止时间，使用 `video-deep-reader`。

### 3. 归一化，而不是抹平差异

逐项核对：财季/财年、单季/累计、LTM/NTM、实际/预测；金额和股数单位；币种与汇率时点；GAAP/non-GAAP、diluted/basic、合并/母公司；当前实际价格与历史复权序列、ADR 比率。

不同口径不是互相“验证”。先转换成同口径；无法转换就并列展示并降低置信度。

### 4. 建证据卡并交叉验证

按 `../finance-source-ingest/references/evidence-card.md` 建卡。转载同一 provider 只算一个来源。关键数字至少由一个原始披露加一个真正独立来源核对；只有单一来源时明确标记。

不得机械地把 1% 当成所有指标的普适容差：零值、比率、百分点、极小数和不同会计口径分别处理。没有适用的确定性计算能力时不输出差异率；重大差异回到原始披露，禁止静默取平均。

### 5. 写入图谱

QuantMind/DSA ResearchArtifact 用 `finance_graph` 的 `import_artifact`；其他 source/raw/claim/instrument 和 cite/supports/contradicts 关系用一个原子 `plan` 写入。冲突证据并存，不覆盖旧证据。最终以 `finance_briefing` 的 `record` 或图谱 deliverable 记录截面、缺口、冲突与复算记录。

更新会替换完整 metadata，因此先读取旧节点，保留已有合法字段，再合并本次变更。

## 交付前检查

- 每个关键数字都有 provider、asOf、availableAt、fetchedAt、contentHash、runId、provenance。
- 所有时间均为带时区的 ISO 8601；所有数值均带单位、币种和期间。
- 任一 `availableAt > asOf` 的证据均未参与历史结论。
- DCF/comps/portfolio 都有对应 `finance_model` runId；其他指标没有伪造不存在的 model action。
- 图谱 `research_graph_query` 的 `audit` 无新增悬空引用。

## 来源与修改声明

本技能的多源核验思想参考 xbtlin/ai-berkshire 的 `financial-data`（MIT，固定版本见随包 `LICENSE`）。2026-10-30 由 dsh-research-graph 重写：移除上游私有工具调用，加入统一时间/metadata、图谱证据卡与 `finance_model` 约束。未迁移上游研究报告、账户数据或凭据。
