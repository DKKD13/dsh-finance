---
name: flex-memory
description: FLEX 图谱记忆循环。仅在用户主动要求反思、季度复盘或预测校准时触发；默认使用 finance_memory 与 finance_briefing，保留原始预测并防止未来信息泄漏。
---

# FLEX Memory

**结构化经验 → 更好的方法论 → 更好的预测**。不靠梯度更新、微调、外部记忆 CLI 或另一套 Store。

## 数据契约

- 预测与问题记忆默认使用 `finance_memory`；校准汇总使用 `finance_briefing`；通用审计使用 `research_graph_*`。
- 统一 metadata：provider、asOf、availableAt、fetchedAt、contentHash、runId、provenance。
- 记忆只保存推理与教训，**永远重新获取最新数据**，不把旧数值当现价或最新财报。

## 5 个操作

### 1. recall（分析前）

调用 `finance_memory` 的 `recall`，传 asOf 与可选 query，读取当时可见的 prediction/memory。需要 deliverable 时再用 `research_graph_query`。优先呈现 error/warning 与反证，不把不同口径案例混用。

### 2. predict（有明确可验证预测时）

调用 `finance_memory` 的 `record_prediction`，input 包含 id、title、可选 instrumentId/catalyst、resolutionDate、prediction JSON 与统一 metadata。prediction JSON 固定 metric、operator、expectedValue/range、probability/confidence、settlementRule 和输入 evidence ids。

结算规则必须在创建时固定，包括实际值来源、口径、阈值和 indeterminate 条件。创建后不得修改原 prediction、asOf 或 resolutionDate；新观点另建 prediction。

### 3. calibrate（只结算到期预测）

1. 调用 `finance_memory` 的 `due` 获取 resolutionDate 已到且 pending 的预测，并读取原始快照。
2. 实际证据必须在客观结算条件满足后公开，availableAt 晚于预测 asOf；不得使用事后修订值或事后共识。
3. 未到期保持 pending。事件取消、口径改变或证据不足时，在 outcome 标 indeterminate，并按 schema 选择 error + warnings 或继续 pending，不强行 met/missed。
4. 证据充分后调用 `finance_memory` 的 `resolve`，传 id、outcome、status=resolved、resolvedAt、targetId 与统一 metadata。工具保留原 content，并以 `prediction -[resolves]-> instrument/catalyst` 记录结算方向；不要再手写反向边。
5. 需要错误/警告记忆时调用 `record_issue`，链接原始 prediction 与实际证据。

调用 `finance_briefing` 的 `evaluate` 获取方向准确率、absoluteError 和可用时的 Brier score；不要请求 `finance_model` 执行不存在的校准 action。单次结果不能包装成统计能力。

### 4. remember（分析或结算后）

memory 分 factual / pattern / strategic 与 golden / warning。好记忆写清“原预期 → 实际 → 偏差原因 → 下次如何改”，链接原始 prediction、实际证据与 resolve/evaluate runId；碎片评价不入库。factual 下次仍需重新验证。

### 5. reflect（用户主动复盘）

结合 `finance_memory` 的 recall 与 `finance_briefing` 的 evaluate，使用 `finance_briefing` 的 `record` 生成 deliverable：样本范围、时间门、误差分布、连续高估/低估、反例和方法改进建议。

不得自动改写 SKILL.md 或删除失败预测。方法更新通过新的 claim/deliverable 与 supersedes 表达，待用户明确决定是否修改技能。

## 去重与审计

同 instrument + metric + asOf + settlementRule 的 prediction 先查再建；相似 memory 合并时保留全部 provenance。完成后运行 `research_graph_query` 的 `audit`。

本技能只做校准和复盘，不输出交易或下单指令。数据核验见 `../financial-data-rigor/SKILL.md`。
