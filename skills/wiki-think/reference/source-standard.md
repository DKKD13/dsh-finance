# Graph Source/Raw 标准

> 由 `../SKILL.md` 引用。source/raw 只能由真实 ingestion 产生，本文件不授权另建私有文件或第二套来源库。

## GATE — 什么值得进入后续编译

材料先通过 `finance-source-ingest` 的公开来源、安全和时间门。满足以下任一条件且具备新增信息时，可纳入 knowledge-compiler 候选：

- 有可核验事实、数字、直接经验或独立观点；
- 能回答既有 question，或支持/挑战既有 hypothesis；
- 从不同且真正独立的上游到达同一结论；
- 提供高质量反方证据。

纯重复转载、无增量摘抄或同源 PR 不算独立证据。没有增量可在编译 session 中记录排除原因，不删除原 source/raw。

## 必备图谱字段

source/raw 必须有真实关联、provider、asOf、availableAt、contentHash、runId 与 provenance。provenance/locator 应能回到 URL/文档以及实际的 page、table、row/column、selector/TextQuote 或 transcript segment；没有细粒度 locator 时只能引用 raw 全文，不能编造。

raw.content 是推理所读原文。source 保存公开定位与版本信息，capture 保留实际标注。claim 不能把模型摘要冒充 raw，也不能只引用标题。

## Facts、Views 与 Assessment

编译时分开记录：

- **Facts**：材料中可以独立核验的陈述及精确 locator；
- **Views**：来源作者的观点，保留谁在说及其利益背景；
- **Assessment**：当前 DSH Session 的 hypothesis、confidence、reliability 与 independence 评估。

credibility/reliability 必须有理由。一手经验、潜在利益冲突、二手转述、匿名与未核验信息不得混为同一等级。转载共享 upstreamProvider 时归入同一 independence group。

## Supersession

新材料更新旧版本时创建新 source/raw 并保留 `supersedes`，不得删除旧证据或把旧结论改写成事后已知结论。任何用于历史研究的新证据仍须满足 `availableAt <= asOf`。
