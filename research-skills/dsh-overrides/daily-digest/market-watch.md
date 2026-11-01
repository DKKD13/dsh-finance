---
name: market-watch
description: Fetch current public market data through finance_* and append a sourced market observation to today's graph deliverable. Standalone or part of /daily-digest. Invoke with /market-watch.
---

# Market Watch — 市场观察

可独立运行，也可作为 daily-digest 的市场部分。交付是图谱 `deliverable`，不是外部发布。

## 1. 找今日日报与固定截面

用 `research_graph_query` 搜索今日 daily deliverable 和最近 prediction/catalyst。记录 asOf、runId、市场时区和价格口径；没有日报时可独立创建市场观察。

## 2. 获取与核验行情

通过宿主实际提供的只读 `finance_*` 数据工具获取用户关注列表的价格和公开事件，按实际 schema 调用。关注列表可来自 instrument/position，不硬编码股票池。

先读 `../finance-source-ingest/references/host-inputs.md` 的完整输入结构。`finance_market_data` 的 `fetch` 返回 SourceItems；审阅后使用 `finance_ingest` 的 `ingest`，将同一批实际对象放入 `input.items` 并设 `dryRun:false`。保留返回的原文、data、provenance 和全部时间字段，不重建精简对象，也不把 fetchedAt 回填成研究截面。`finance_market_data.ingest` 仅接受 `{instrument:{id,title,currency,metadata},data:{...}}`，不能接收 SourceItems 或 items。遇到输入错误，核对结构与工具返回后修正；不要连续猜测包装格式或搜索开发进程。

按 `../financial-data-rigor/SKILL.md` 核对币种、市场、价格时间、复权与涨跌口径。当前实际价格和历史复权序列不得混用；数据缺失就留白，不用旧价或记忆补齐。优先引用提供方实际返回的涨跌字段；需要计算时列明同口径的输入与公式，通过当前宿主实际可用的代码执行工具计算并核对。`finance_model` 仅支持 DCF、comps、portfolio，不支持通用涨跌计算。

## 3. 建立事件与预测关系

重要事件使用 `../catalyst-calendar/SKILL.md`：catalyst -[catalyzes]-> instrument。将价格变化与新闻关联时区分相关和因果；没有证据就写“真因不明”。

到期 prediction 只能由实际证据通过 `catalyst -[resolves]-> prediction` 结算，记录 outcome/resolvedAt/evidenceNodeId；未到期保持 pending，不事后改预测。

## 4. 写市场观察

正文按用户确认的范围包含标的价格表与主要事实；只有用户要求且有证据时才加入指数、新闻联系、catalyst 或预测。缺失字段明确说明。每个关键数字有统一 metadata 和 source locator，管理层/媒体观点不写成事实。

先组装完整正文、当前真实 sessionId、实际引用与全部 metadata，通过 `finance_graph.plan` 一次原子提交 deliverable 和相关边；不分散为逐节点、逐边或事后修补写入。追加到已有日报时先 get 原节点，保留原正文和合并后的完整 metadata，避免完整 upsert 清空已有内容。新报告的 availableAt/fetchedAt 使用实际生成时间，不能复制旧材料日期或研究截面。保存后读回正文、引用、revision，并运行 `research_graph_query` 的 `audit`。不发布到外部笔记系统，不生成或执行交易指令。
