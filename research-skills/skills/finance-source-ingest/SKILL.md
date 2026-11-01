---
name: finance-source-ingest
description: >-
  将公开金融材料采集为可审计图谱证据。用于监管文件、公司公告、公开行情、网页、Clipper 和文档导入；统一时间、contentHash、runId、provenance/locator，生成 ready 或 quarantined 的 source/raw/session，并交给 knowledge-compiler 编译假说。
---

# Finance Source Ingest

证据卡与统一 metadata 见 `references/evidence-card.md`；调用前先读 `references/host-inputs.md` 中的实际工具参数。不要猜测 provider 或把一般网页传给 fetch。本技能只负责证据 ingestion、时间门和来源链，不生成研究假说或最终报告。后续链路固定为：

`finance-source-ingest → knowledge-compiler（question/hypothesis/belief/signal）→ 用户另选 research 或 deep-research（deliverable）`

## 接受与拒绝

接受公开监管披露、公司 IR、公开数据 provider、公开网页，以及用户明确提供且可合法处理的非敏感公开材料。拒绝私有研报、账户导出、券商连接、cookie、API key、token 和含凭据的 URL；发现后停止并要求提供净化后的公开版本，不把秘密写入图谱。

不新建 Store、Agent loop 或第二个 LLM runtime。使用 `finance_ingest`、`finance_market_data`、`finance_graph`、可用公开网页/文件读取能力与 `research_graph_*`；推理只能发生在当前真实 DSH Session。

## Ingest 流程

### 1. 固定 run 与 asOf

记录真实 runId 和研究截面 asOf。历史导入必须按材料当时的 availableAt 过滤，而不是把当前数据库状态当作历史状态。ingest runId 与后续编译 runId 各自对应真实操作，不得混用或伪造。

### 2. 保存原文与定位

先保存原始文本/公开返回，再提取。结构化外部行情用 `finance_market_data` 的 `ingest`；公开来源、Clipper 和 byte-only 文档分别使用 `finance_ingest` 的 `fetch` / `ingest` / `import_clip` / `import_documents`。`fetch` 只支持 yahoo、sec、openbb、alphasift（或 alpha-sift）、rss/atom/feed、opml、youtube；没有 web/url provider。一般网页先由宿主网页读取工具取得原文，再用 `ingest`，不要循环试字段。`fetch` 若返回 NOT_IMPLEMENTED 或 NOT_CONFIGURED，停止相应在线步骤，不生成替代数据。

每个来源记录实际 provider、原始 URL/文档名、发布日期、许可/使用条款和精确 locator。网页选区保留 TextQuote/selector，PDF 保留 page，transcript 保留 segment start/end。contentHash 对应原文或声明过的 canonical payload，不能对模型摘要计算后冒充原文哈希。

### 3. 时间门、去重与 ready 判定

- `availableAt > asOf` 或材料自身 `asOf > 研究 asOf`：quarantine，不能进入编译候选。
- availableAt 缺失：不提交要求此字段的 SourceItem，不用 fetchedAt 或 capturedAt 顶替。保留缺失记录，或使用允许未知时间并隔离材料的 Clip/File 导入。
- source/raw 必须同时存在且关联正确；`status` 为 accepted/ready（旧 ingest 的无 status 记录仍须通过全部其他门），quarantined/rejected 不得参与编译。
- 同 contentHash + provider + locator 视为重复；转载同一上游不当作独立验证。
- 材料更新时新建 source revision，并用 supersedes 保留链，不覆盖旧证据。

### 4. 预览与原子写入

所有 ingest 先 `dryRun:true` 检查 accepted/duplicates/quarantined/rejected/errors 和计划节点，只有明确提交时才用相同输入、runId/asOf 及 `dryRun:false`。Host 通过一次原子 plan 写 source/raw/session 与 derived_from/produces/supersedes；不要绕过 Host 逐节点伪造 ingestion。

已有 QuantMind 证据卡或 DSA ResearchArtifact 可用 `finance_graph` 的 `import_artifact` 保留 sourceRefs 与 cite。其他通用图维护才使用 `research_graph_node` / `research_graph_edge`；更新前必须读取完整节点并合并 metadata。

估值/组合计算只使用 `finance_model` 的 dcf/comps/portfolio；预测评估使用 `finance_briefing` 的 evaluate。其他计算没有宿主确定性能力时保留原值并标未复算，不心算补齐。

### 5. 交给知识编译

提交后运行 `research_graph_query` 的 `audit`，返回真实 runId、asOf、sourceIds/rawIds、revision 以及重复、隔离、拒绝和错误清单。只有已落图且通过 ready/时间门的 sourceIds 才能交给 `../knowledge-compiler/SKILL.md`：

```text
/knowledge-compiler
runId=<新的真实编译 runId>
sourceIds=<本次返回且 ready 的 source ids>
asOf=<同一研究截面>
```

不要把 ingest session 当最终报告，不要在 ingestion 中创建 deliverable，也不要自动启动 research/deep-research。编译由当前 DSH Session 执行；最终报告始终由用户另行选择。

## 完成标准

原文可定位、哈希可复算、时间可重放、来源不伪独立，source/raw/session 与 provenance 完整，且没有伪造在线 fetch 或不存在的计算 action。不把私有材料或凭据写入图谱，不生成或执行任何交易或下单指令。
