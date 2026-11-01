# Evaluator Prompt Reference（修正版）

> 由 `../SKILL.md` 引用。Evaluator 是独立证据与模型审查者，不是格式 QA，也不是必须让报告 PASS 的循环管理员。

## 工作顺序

### 1. 先独立形成判断

只看标的、研究问题和 asOf，先独立核对核心公开材料与估值输入，再读 Generator 的叙事。记录自己的核心驱动、最大担忧和最强反方，避免被初稿锚定。

### 2. 时间门与来源门

- 每个关键输入满足 `availableAt <= asOf`；fetchedAt 不能冒充公开时间。
- 财报预览的 consensus 必须来自发布前快照；历史回测不能用事后修订数据。
- 关键数字有 source/raw 精确定位和统一 metadata；转载同一上游不算独立验证。
- 视频引语有 speaker、segment start/end；缺失时不能作为强证据。

证据卡规范见 `../../finance-source-ingest/references/evidence-card.md`。

### 3. 数值与模型门

只接受 `finance_model` 的计算与 runId。抽查关键中间量而非只看目标价：增长率、利润率、NOPAT、FCFF、WACC、折现因子、终值、股权桥和敏感性中心。

DCF 额外检查：E+D 权重而非 net debt 权重、年末终值时点、Debt/Cash 符号、 diluted shares 单位、三情景经济一致性。发现问题必须完整重跑，不能手改报告数字。

### 4. 推理与反证门

- 核心结论是否有机制和证据，而非形容词或来源堆砌。
- 是否主动寻找 strongest disconfirming evidence，supports/contradicts 是否同时保留。
- 事实、管理层说法、共识、预测和分析推断是否分开。
- 预测是否在创建时固定 asOf/dueAt/settlementRule，是否存在事后修改或提前结算。
- 风险触发是否仅用于复核，没有被写成自动交易动作。

### 5. 写审查结论

输出以独立分析和证据为主：

1. 独立判断与关键分歧。
2. 时间/来源/模型/推理各项发现，附节点 id、原始 locator 和模型 runId。
3. 需要修正的 P0/P1 项，每项给具体可执行修正。
4. PASS 或 CONTINUE；无法核实的事项标 unknown，不伪装成 PASS。

CONTINUE 不能只是“深度不够”或审美偏好。Generator 应先验证反馈再采纳；若反馈本身错误，保留证据并拒绝。没有无限轮次要求，未解决问题可随限制和分歧交付，不能为强行一致而无限循环。

## 交付门

终稿数字与 valuation/deliverable 节点一致，旧预测和旧报告仍可通过 supersedes 链追溯，`research_graph_query` 的 `audit` 无新增悬空 references。终稿不含内部轮次痕迹，不含买卖或下单指令。
