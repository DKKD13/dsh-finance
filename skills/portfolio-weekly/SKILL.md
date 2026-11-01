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

按每个持仓标的分别 `prepare` 和 `search`，用单个 symbol/已知名称检索 claim，并用已读 source ID 补查 sourceRefs 中关联的 claim，逐个 `get` 相关节点及其真实来源；多词整串零命中不代表无假说。分别写明未检索、未读、在已检索范围未找到；不得据此断言库中不存在。区分材料原始日期、节点可用时间与本周新披露；旧材料形成的本周可用假说仍需复核，不冒充本周新事实。

本轮 `asOf` 取真实宿主时钟并记录时区，用户给定周初/周末保持历史含义且不得晚于本轮 `asOf`；按 `availableAt <= asOf` 过滤，分别判断周初已知与本周新增可用节点，正文截面与 metadata 一致。缺持仓先询问；组合不存在或起止倒置则停止，不写报告。

## 3. 更新公开数据与事件

外部结构化行情通过 `finance_market_data` 的 `ingest` 进入；`fetch` 不可用时保留缺口。按 `financial-data-rigor` 核验，用 `catalyst-calendar` 检查事件，用 `equity-earnings` 处理财报；需要时调用 `thesis-drift`，不要复制其实现。

组合权重、币种暴露和集中度只调用 `finance_model` 的 `portfolio`；估值只调用 dcf/comps。不要用不存在的 model action 计算其他指标，不用 LLM 心算或旧价格冒充当前值。

提交前至少逐个 `get` 实际采用的 source 及各自 raw，核对原始值、时间和实际 raw 字节 hash；缺失或未读就标未核验，不补造来源。缺可比周初/周末价格时不算周收益，成本浮盈不等于周收益。

## 4. 复核风险与预测

报告单标的、行业、地区、币种和共同驱动暴露；区分事实暴露与主观判断。集中度阈值只作为用户事先约定的风险规则，不自动转化为交易。

用 `finance_memory` 的 `due` 查到期预测，证据充分后调用 `resolve`。结算方向为 `prediction -[resolves]-> instrument/catalyst`，记录 outcome/resolvedAt/targetId；未到期保持 pending，证据不足在 outcome 标 indeterminate 并按 schema 选择 error + warnings 或继续 pending。调用 `finance_briefing` 的 `evaluate` 汇总校准，不重写历史 confidence。

## 5. 生成图谱周报

先组齐完整 `deliverable`，通过现有 `finance_graph` 的 `plan` 一次保存正文、metadata 和全部关系，不先 `record` 再补边。固定结构：

1. 两个时间截面与数据完整度。
2. 组合/持仓/标的快照及暴露表。
3. 本周新事实、反证和论文漂移。
4. 估值变化（仅引用 valuation-model 的完整重跑结果）。
5. 催化日历与 prediction 结算。
6. 风险观察、缺失数据和下周需验证问题。

Markdown 表格前后各留一个空行，表格后段落另起；不把风险/缺口段落吞进表格。恢复使用新文件路径与新 deliverable ID，保留旧报告正文与 hash。

先写最终新文件并实际读回其 UTF-8 字节，用同一字节确定完整 `content`、SHA-256、`metadata.contentHash` 与 `provenance.localArtifact.contentSha256`，记录实际文件路径、真实 `sessionId`/`runId` 及时间；拿不到会话标识就报缺口，不编造。只发一次完整 `plan`（input 直接含 nodes/edges），同时提交 `deliverable -[derived_from]-> 实际组合`（恢复另连旧报告）、`deliverable -[cite]-> 每个实际使用的 source 和 raw`，引用研究结论也连实际使用的 claim。metadata.references 不能代替这些 typed 边；不把旧组合/source/raw 放进 plan.nodes 重写。已有真实 session 图节点才建 produces，有实际版本依据才建 supersedes，不伪造端点。

提交后实际读回文件、节点和全部关系，比较逐字节正文、字节数、两个 hash 与会话；不能凭模型自述 samebyte。plan 失败则报告未完成，修正完整草稿后才重试，不拆成 record/逐边补写；文件保存与图 plan 分别核验，不声称跨文件事务。

报告可以建议“复核、补证据、重新估值、与用户讨论风险预算”，**不得生成买卖、清仓或下单指令**。
