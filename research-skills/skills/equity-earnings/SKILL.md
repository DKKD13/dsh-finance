---
name: equity-earnings
description: >-
  财报前瞻与财报后复核。用于 earnings preview、季度结果、beat/miss、指引与预测结算；冻结税前共识，避免事后信息泄漏，并产出图谱 deliverable。
---

# Equity Earnings

支持 `preview` 与 `review` 两种模式。先确认标的、财季、财报发布时间和研究截面；不把自然季度当作公司的财季。

详细方法与检查表见 `references/earnings-method.md`。

## 共同纪律

- 使用宿主现有只读 `finance_*` 数据工具和 `research_graph_*`，不假设未注册的 provider 或字段。
- 所有 beat/miss、增长率、利润率变化、估值与单位换算仅由 `finance_model` 计算。
- 每个关键事实符合 `../finance-source-ingest/references/evidence-card.md`，包括 provider/asOf/availableAt/fetchedAt/contentHash/runId/provenance。
- 财报发布之后的共识、修订、股价和 transcript 不得用于发布前预测。历史回测按当时的 availableAt 重放，而不是按数据库当前值重放。
- 不生成交易或下单指令。

## Preview：发布前

1. 用 `research_graph_node` / `research_graph_query` 读取 instrument、既有 valuation、claim、prediction 与 catalyst。
2. 固定 `asOf < releaseAvailableAt`，收集当时可见的此前财报、管理层指引、共识快照与行业指标。共识必须保存原始时间戳；无法证明是发布前的共识只能标为未知。
3. 列出 3-5 个关键指标及其口径：收入、EPS、利润率、FCF 和公司特定经营指标。区分 GAAP/non-GAAP、单季/累计和汇率。
4. 经 `finance_model` 生成 Bear/Base/Bull 数值情景。每个情景给出可证伪条件，不写目标仓位。
5. 创建 `prediction`，记录 metric、operator、expectedValue、confidence、asOf、dueAt 和输入 evidence ids。创建 `catalyst` 并以 `catalyzes` 连接 instrument。
6. 输出 preview `deliverable`，明确“这是发布前快照”，保存 runId 与所有输入哈希。

## Review：发布后

1. 先读取发布前 prediction 与 preview，不修改其原始值。获取实际 release、filing、presentation 和带时间戳 transcript；核对它们属于同一财季。
2. 仅用 release 当时的 availableAt 之前的共识计算 beat/miss。若无税前共识，报告实际值与自身预测差异，不补造“市场预期”。
3. 用 `finance_model` 返回绝对差、相对差和百分点变化；分母为零或口径不一致时不强行给百分比。
4. 把结果拆为价格/销量、一次性/持续性、公司/行业、实际/指引。管理层说法是 claim，不自动当事实；引用 transcript 必须带 segment 起止时间。
5. 到期 prediction 只能由实际可见证据结算。创建/更新实际结果对应的 `catalyst`，用 `catalyst -[resolves]-> prediction` 连接，metadata 记录 outcome、resolvedAt、evidenceNodeId 和误差模型 runId。未到期或证据不足仍为 pending，不能提前结算。
6. 若需更新估值，调用 `valuation-model` 完整重跑；若需比较论文，调用 `thesis-drift`。最终写入 review `deliverable`，保留 supersedes 链而不删除旧预测。

## 交付检查

财季与日期一致；共识是发布前快照；所有计算来自 `finance_model`；预测没有事后改写；transcript 引用有时间段；图谱关系与统一 metadata 完整；没有订单建议。
