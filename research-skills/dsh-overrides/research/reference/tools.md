# Research 工具与图谱契约

> 由 `../SKILL.md` 引用。只描述宿主既定接口；某个工具未注册或 schema 不支持时应明确阻塞相应步骤，不伪造能力。

## 数据与计算

- `finance_*`：宿主即将提供的只读金融工具族。只按运行时可发现的准确工具名和 schema 调用，不推测 action、provider 或字段。
- `finance_model`：唯一确定性数值与估值入口。增长率、误差、WACC、DCF、敏感性、权重、预测校准和单位换算都使用它；不可用时保留输入并报告阻塞。

不要另写本地计算脚本、Store、Agent loop 或 LLM client。

## 图谱

| 工具 | 用途 |
|---|---|
| `research_graph_node` | create/get/update/remove/list 节点；update metadata 前必须先 get 并合并完整记录 |
| `research_graph_edge` | add/remove 关系；两端节点必须已经存在 |
| `research_graph_query` | search/backlinks/audit/stats/diff；历史比较使用明确 revision |
| `research_graph_admin` | 仅在用户明确要求时 rebuild_skills/export_markdown，不作为研究默认步骤 |

## 常用节点与边

- 研究：instrument、source、raw、claim、question、belief、memory、deliverable。
- 金融：portfolio、position、valuation、catalyst、prediction。
- 证据：cite、supports、contradicts、derived_from、supersedes。
- 组合：portfolio -[holds]-> position；position -[exposure_to]-> instrument。
- 估值与事件：valuation -[values]-> instrument；catalyst -[catalyzes]-> instrument；catalyst -[resolves]-> prediction。

## 时间与写入

所有金融节点和证据边包含 provider/asOf/availableAt/fetchedAt/contentHash/runId/provenance。历史查询先固定 asOf，只接纳 availableAt 不晚于该截面的材料。原始预测不被结算覆盖，实际事件通过 resolves 关联。

完成后运行 audit；任何 unresolvedRefs 或 brokenRefs 都应在交付前解释并处理。
