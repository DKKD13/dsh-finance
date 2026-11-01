# Mode 2: Question Research

> 由 `../SKILL.md` 引用。Question research 回答命题的 mechanism、跨维度连接与可证伪性，不机械映射为 ticker 估值或仓位建议。

## 1. 固定问题与截面

从用户命题创建/读取 `question`，记录 asOf、范围、已知子问题和 kill criteria。无需外部 wiki 或预设问题清单；若命题模糊，先让用户确认边界。

## 2. 拆维度并建立 inventory

选择 5-8 个真正能改变判断的维度，可从 `dimension-templates.md` 取历史类比、spillover、叙事转换、技术反例、生态、地缘、反事实与 meta 整合。每个维度列核心问题和所需证据，不为了数量平均分配篇幅。

通过宿主实际提供的只读 `finance_*` 数据工具与公开网页能力收集材料，统一经 `../../finance-source-ingest/SKILL.md`；图谱历史资料用 `research_graph_query` 检索。所有材料满足 availableAt <= asOf。

## 3. 跨维度整合

寻找维度之间的因果连接和冲突，不把多份意见平均成中庸结论。每个判断写清：证据 → 机制 → 反证 → 适用条件 → 可观察信号。数值推导只经 `finance_model`。

允许结论为“命题不成熟 / 不可验证 / 暂无独立 edge”。若用户需要风险情景，可以给方向、时间窗和 kill criteria，但不生成交易或下单指令。

## 4. Evaluator 审查

按 `evaluator.md` 先独立审查，再对照 draft，重点检查：

1. 是否漏掉能推翻结论的维度。
2. 是否解释 why/how，而不是罗列 datapoints。
3. 冲突是否被隐藏或机械折中。
4. 证据到判断的链是否可复算。
5. 是否真正寻找反事实和反面来源。
6. 时间、催化与预测是否使用当时信息且可结算。

反馈必须具体并经事实核验；不无限迭代，不强行 PASS。

## 5. 图谱交付

创建 `deliverable`，关联 question、claim、source 和必要 prediction/catalyst。报告包含单一主线、跨维度机制、最强反方、证据缺口和下次验证条件。用 derived_from/supersedes 保留历史并运行 audit。
