---
name: portfolio-weekly
description: >-
  每周组合复核与风险暴露报告。用于持仓快照、集中度、估值/催化变化、预测校准和论文漂移；输出图谱 deliverable，仅研究建议，不连接账户或下单。
---

# Portfolio Weekly

把本周新证据与既有组合分开：先还原上周可知信息，再评估本周变化。不得用周末才知道的结果改写周初预测。

## 1. 读取组合，不连接账户

仅使用用户主动提供的非敏感持仓数量/权重，或图谱已有 portfolio/position。不得读取券商账户、cookie 或密钥，不自动导入对账单。

沿用唯一持仓关系：

```text
portfolio -[holds]-> position
position -[exposure_to]-> instrument
```

缺数量时只做暴露与证据复核，不编造市值或成本。所有节点带统一 provider/asOf/availableAt/fetchedAt/contentHash/runId/provenance；用户提供的持仓 provider 标为用户输入，asOf 是快照时间。

## 2. 冻结上周与本周截面

用 `finance_graph` 的 `search/get` 和 `research_graph_query` 读取上周 deliverable、prediction、catalyst、valuation 与 claim；需要时用 `diff` 比较 revision。分别记录 `weekStartAsOf` 和 `weekEndAsOf`，每项新证据必须落在其可用时间窗内。调用 `finance_briefing` 的 `prepare` 取得本周截面的证据卡。

## 3. 更新公开数据与事件

外部结构化行情通过 `finance_market_data` 的 `ingest` 进入；`fetch` 不可用时保留缺口。按 `financial-data-rigor` 核验，用 `catalyst-calendar` 检查事件，用 `equity-earnings` 处理财报；需要时调用 `thesis-drift`，不要复制其实现。

组合权重、币种暴露和集中度只调用 `finance_model` 的 `portfolio`；估值只调用 dcf/comps。不要用不存在的 model action 计算其他指标，不用 LLM 心算或旧价格冒充当前值。

## 4. 复核风险与预测

报告单标的、行业、地区、币种和共同驱动暴露；区分事实暴露与主观判断。集中度阈值只作为用户事先约定的风险规则，不自动转化为交易。

用 `finance_memory` 的 `due` 查到期预测，证据充分后调用 `resolve`。结算方向为 `prediction -[resolves]-> instrument/catalyst`，记录 outcome/resolvedAt/targetId；未到期保持 pending，证据不足在 outcome 标 indeterminate 并按 schema 选择 error + warnings 或继续 pending。调用 `finance_briefing` 的 `evaluate` 汇总校准，不重写历史 confidence。

## 5. 生成图谱周报

调用 `finance_briefing` 的 `record` 创建 `deliverable`，固定结构：

1. 两个时间截面与数据完整度。
2. 组合/持仓/标的快照及暴露表。
3. 本周新事实、反证和论文漂移。
4. 估值变化（仅引用 valuation-model 的完整重跑结果）。
5. 催化日历与 prediction 结算。
6. 风险观察、缺失数据和下周需验证问题。

用 `finance_graph` 的原子 `plan` 建 produces/derived_from/cite/supersedes 关系并保留历史。报告可以建议“复核、补证据、重新估值、与用户讨论风险预算”，**不得生成买卖、清仓或下单指令**。
