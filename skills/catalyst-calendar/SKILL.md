---
name: catalyst-calendar
description: >-
  构建与复盘金融催化日历。用于财报、产品、监管、行业与宏观事件；以 catalyst/prediction 节点记录时间、证据、影响链和到期结算，不输出交易指令。
---

# Catalyst Calendar

方法细节见 `references/catalyst-method.md`。日历是带证据的时间序列，不是未经核实的日期列表。

## 1. 确定范围与截面

确认 coverage universe、开始/结束日期、时区与 `asOf`。用 `finance_graph` 的 `search/get` 和 `research_graph_query` 查现有 instrument、position、catalyst、prediction，避免重复。公开事件通过已有网页能力读取；外部结构化数据用 `finance_market_data` 的 `ingest`，不假设在线 fetch 可用。

## 2. 核验事件

优先公司 IR、监管日历和官方会议日程。每个事件区分 announcedAt、availableAt、scheduledFor 与 asOf；scheduledFor 含时区和 pre-market/after-hours（若已知），status 为 scheduled/occurred/postponed/cancelled/unknown。

只有 `availableAt <= asOf` 的事件进入该截面。未来不得被写成已发生；日期未官方确认时标 estimated，不给伪精确时间。

## 3. 建影响链

可用 `finance_memory` 的 `record_prediction` 同时创建 catalyst 和 `catalyst -[catalyzes]-> instrument`；无预测的独立事件用 `finance_graph` 的原子 `plan`。宏观事件可连接多个 instrument，但每条边都要写 mechanism、direction、horizon 与 confidence，不把相关性当因果。

与持仓关联时沿用 `portfolio -[holds]-> position`、`position -[exposure_to]-> instrument`，不要复制一套持仓关系。

`finance_graph plan` 的节点是完整 upsert，不是局部 patch：省略 `content` 会清空正文，`metadata` 整体替换。更新已有节点先 `get`，带回完整 `content` 与合并后的全部 `metadata`；将 `sessionId`、与实际正文一致的 `contentHash` 和最终字段一次组齐再原子提交，不得为修正 metadata 拆成三次或多次 plan。非 compiler deliverable 的传入哈希与正文不一致时，整个 plan 以 `CONTENT_HASH_MISMATCH` 拒绝，不会提交。

## 4. 关联预测与结算

调用 `finance_memory` 的 `record_prediction`，input 包含 resolutionDate、prediction JSON、可选 instrumentId/catalyst 和统一 metadata。原始预测不得在看到结果后修改。

用 `due` 查到期预测。实际公开证据满足结算条件后调用 `resolve`，传 id、outcome、resolvedAt、targetId、status 与 metadata；工具创建 `prediction -[resolves]-> instrument/catalyst`，不要手写反向的 catalyst→prediction 边。无法判定时在 outcome 标 indeterminate，并按 schema 选择 error + warnings 或继续 pending；未到期保持 pending。

结算所用 actual 的 availableAt 必须满足结算条件且晚于原预测 asOf。校准汇总使用 `finance_briefing` 的 `evaluate`，不请求不存在的 finance_model 校准 action。

## 5. 输出

用 `finance_briefing` 的 `record` 生成按时间排序的 deliverable：本周、下周、后续季度、已延期/取消、待结算与已结算。每项包含官方来源、时区、影响链和证据缺口；可选给 `equity-earnings` 或 `portfolio-weekly` 使用，但不自动启动其他流程，不给买卖或下单建议。

写入后运行 `research_graph_query` 的 `audit`，确认没有新增悬空边或 references。

## 来源与修改声明

参考 Prism `equity-research/skills/catalyst-calendar`（Apache-2.0，随包 `LICENSE`）。2026-10-30 重写：删除 Excel/Calendar/仓位前置建议依赖，加入图谱 catalyzes/resolves、时间截面、到期结算与统一 metadata。
