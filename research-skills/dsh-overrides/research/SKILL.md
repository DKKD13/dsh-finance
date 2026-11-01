---
name: research
description: 投研深度分析。双 mode — Ticker（某只股票 FEV 三层 + DCF + R:R）/ Question（围绕研究命题的多维度深挖）。默认使用 finance_* 与 research_graph_*，产出可审计图谱 deliverable。
---

# Research

## Mode Selection Gate

疑似触发时先确认：**1 = Ticker Research，2 = Question Research，3 = 跳过**。只有用户明确选择后进入对应模式。单一事实问答不自动扩展成完整研究。

两个 mode 共享：一手材料优先、寻找反证、断言强度匹配证据、统一时间/metadata、Generator + Evaluator 审查。这里的角色是当前工作流内的顺序步骤，**不新建持久 Agent loop、Store 或 LLM client**。

## 共享硬约束

- 数据通过宿主实际注册的只读 `finance_*` 工具获取，按各工具 schema 调用；知识与关系使用 `research_graph_node`、`research_graph_edge`、`research_graph_query`。
- 原始材料先按 `../finance-source-ingest/SKILL.md` 入库，关键数字按 `../financial-data-rigor/SKILL.md` 归一化和交叉验证。
- 每个事实满足 `availableAt <= asOf`。历史研究不能用当前数据库中的事后共识、财报或价格；fetchedAt 不是 availableAt。
- DCF、可比估值、组合估值和敏感性必须使用确定性的 `finance_model`，不得手写另一估值引擎。普通增长率、占比、百分点、基点、加总和单位换算使用宿主实际可用的 Python/JavaScript 执行工具，记录原始输入、公式与单位；它们不是 dcf/comps/portfolio 操作，不猜不存在的计算 action，也不使用 LLM 心算。
- 最终只写图谱 `deliverable` 和关联节点，不写外部笔记/发布系统，不执行交易或下单。

### 内容与审查保真

- 时间段判断须保留边界：重叠或同现不等于包含；没有明确起止点时，不得写成期内、已完成或完整观察。
- 增速和占比不能替代绝对贡献或因果强度。贡献须使用同期基数与完整分子、分母，并纳入其他分项及正负抵消；证据不足时写待查或不可判定。
- 观察事实、分析推断和证据充分性分开陈述，复合 claim 应拆分；kill criterion 只能否定同一精确命题，后续新增证据不能推翻“当时现有证据不足”的历史判断。
- 若使用 Generator/Evaluator 子步骤，须等待并读取其终态实际结果后再纳入；pending、interrupted、incomplete、unknown 原样保留，不得写成已完成或 PASS。本条不要求 spawn、新 loop、retry 或特定工具。

## 统一 Deliverable 契约（两种 mode 共同遵守）

可先用 `../knowledge-compiler/SKILL.md` 把 ready source/raw 编译成 question/hypothesis/belief/signal；编译结果只是研究底稿，不是报告。最终研究必须由用户明确选择本技能后才创建 `deliverable`。

最终交付按 `reference/notion-output.md` 执行：用一个原子 `finance_graph plan` 写入 deliverable 及本轮新增节点/边。`deliverable -[derived_from]->` 连接实际使用的编译产物或基础稿，`deliverable -[cite]->` 连接实际读取的 source/raw；保留 raw 对 claim 的 supports/contradicts，真实 session 存在时用 `session -[produces]-> deliverable`，新版用 `deliverable -[supersedes]-> 旧 deliverable`。所有引用必须先 get 完整节点，统一 runId/asOf/availableAt/provider/contentHash/provenance，不编数字或来源。交付前用 `research_graph_query` 的 `audit` 检查。

# Mode 1: Ticker Research

## 研究问题

回答“在这个价格与证据截面下，价值、预期和风险是否不对称”，同时区分：

- **Fundamentals**：生意如何产生现金流，驱动与壁垒是什么。
- **Expectations**：当前价格与发布前共识隐含什么。
- **Valuation**：你的假设与市场假设差多少，哪些证据会推翻你。

先扫描再聚焦到 1-2 个核心驱动。核心驱动需要连续论证和反证，非核心维度保持必要上下文，不为了页数平铺。

## 工作流

### 1. 固定标的和时间

用 `research_graph_query` 查 instrument、既有 deliverable、valuation、claim、prediction 与 catalyst；用 `research_graph_node` 读取完整节点。确认代码、市场、币种、财年和 asOf。

按 `../flex-memory/SKILL.md` recall 历史教训，但记忆只指导问题，不能作为最新数值来源。

### 2. 建立证据底稿

优先监管 filing、公司 IR、技术文档和带时间戳 transcript。管理层观点、provider 数据、市场共识与分析推断分别建 claim；重要矛盾保留 supports/contradicts，不强行平均。

视频使用 `../video-deep-reader/SKILL.md`，任何引语保留 segment start/end。来源不足时明确写缺口，不用训练记忆补数。

### 3. 形成可证伪论文

围绕核心驱动写：机制、关键数字、最强反方、催化剂、kill criteria。需要跟踪的定量预测建立 prediction，固定 expectedValue、confidence、asOf 与 dueAt，事后不得修改原预测。

### 4. 估值

使用 `../valuation-model/SKILL.md` 与 `../valuation-model/references/dcf-method.md`。DCF、反向 DCF、comps、三情景和敏感性全部经 `finance_model` 完整计算。估值结果建 `valuation -[values]-> instrument`，正文数字必须与模型输出一致。

不适用普通 FCFF 的公司选择模型支持的方法；不支持就明确不算，不能手工补一个目标价。

### 5. 独立 Evaluator

先让 Evaluator 独立核对时间、来源和关键模型，再读 Generator 结论。审查标准见 `reference/evaluator.md`。CONTINUE 必须指出具体证据/公式/时间和修正方式；Generator 验证反馈后完整重跑，不盲从不实审查，也不无限迭代到强行 PASS。

### 6. 交付

生成干净的 `deliverable`：结论、核心驱动、反方、估值、催化、风险、证据缺口与复算记录。用 cite/derived_from/supersedes 保留链条，并运行 `research_graph_query` 的 `audit`。

完成后可提示用户是否选择 `deep-research`，不自动启动。

# Mode 2: Question Research

先读 `reference/question-mode.md` 与 `reference/dimension-templates.md`。围绕用户命题拆 5-8 个维度，重点寻找 mechanism、跨维度连接、timing 和反事实，不机械套 ticker FEV/DCF。

问题节点使用 `question`，研究判断使用 `claim`/`belief`，最终写 `deliverable`。若命题不成熟或不可证伪，诚实给出观察结论，不强行映射成仓位建议。

## 分层加载

| 任务 | Read |
|---|---|
| 证据 ingestion | `../finance-source-ingest/SKILL.md` |
| 数据核验 | `../financial-data-rigor/SKILL.md` |
| 估值 | `../valuation-model/SKILL.md` |
| 财报 | `../equity-earnings/SKILL.md` |
| 催化与预测结算 | `../catalyst-calendar/SKILL.md` |
| 论文漂移 | `../thesis-drift/SKILL.md` |
| 预测校准 | `../flex-memory/SKILL.md` |
| Evaluator | `reference/evaluator.md` |
| 图谱输出契约 | `reference/notion-output.md`（兼容保留的旧文件名） |
| 投资哲学 | `../_investment-philosophy.md` §1-§3 |

所有产出只用于研究与风险讨论，不生成买卖、清仓或下单指令。

## 新产物的时间与阅读顺序

研究截面 asOf 与材料发布/可用时间分别保留。保存本次新 deliverable 或 review 前读取真实系统时钟，以实际生成可用时间填写新产物的 availableAt 和实际生成/读取时间 fetchedAt，不把旧资料日期、截面或未来日末倒填成新产物时间。Host 对完整记录生成 contentHash；本地文件哈希只放 provenance 并说明校验对象，不能覆盖 Host hash。真实 runId/sessionId 存在才携带，不编造。

向用户先交付判断、关键依据、最强反方和仍缺的证据，再给可打开的报告/原文链接。内部 id、哈希和协议检查保留在 metadata 或末尾核验附录；不要让用户靠阅读工具日志理解研究结果。
