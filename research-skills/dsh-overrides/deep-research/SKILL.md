---
name: deep-research
description: 深度研究。在 research 的图谱基础稿之上，通过对抗性提问、历史类比、价格反推与独立证据复核寻找市场认知差。默认使用 finance_* 与 research_graph_*。
---

# Deep Research

在 `research` 产出的基础稿 `deliverable` 之上，回答“市场在哪里可能错了”，或诚实确认没有可验证认知差。

## 触发与前提

疑似触发时先确认：1 = 启动 Deep Research，2 = 留在当前 research 加深，3 = 跳过。只有用户选择 1 才启动。

必须提供或能检索到基础稿节点 id 及其 asOf；没有就先运行 research。不得把一份无来源文本当成已验证基础稿。

## 致命纪律

1. 聚焦一个核心问题，非核心维度不平均用力。
2. 关键数字必须对比同一时间、同一口径的共识或自身预测。
3. 管理层观点、事实、共识和分析推断分层。
4. 找不到 edge 可以 Pass，不硬挤高 conviction。
5. 终稿不展示内部角色、轮次或审查痕迹。
6. 不新建持久 Agent loop、Store 或 LLM client；Generator 与 Inspirer/Evaluator 是当前流程中的角色。

## 共享数据边界

- 只读 `finance_*` 数据工具按实际 schema 获取公开数据；`research_graph_*` 负责全部研究状态。
- 新来源先经 `../finance-source-ingest/SKILL.md`，数字按 `../financial-data-rigor/SKILL.md` 核验。
- 所有断言遵守 `availableAt <= asOf`。历史类比也只能使用所选截面已知的结局信息，不能把后见之明伪装成当时预测。
- DCF、可比估值、组合估值和敏感性只经 `finance_model`；没有手工 DCF 或第二估值引擎。普通增长率、占比、百分点、基点、加总和单位换算使用宿主实际可用的 Python/JavaScript 执行工具，记录原始输入、公式与单位；不把普通算术塞进 dcf/comps/portfolio，也不猜不存在的 action 或心算。
- 视频证据使用 `../video-deep-reader/SKILL.md` 并保留 segment 时间戳。

## 流程

### Phase 1：Inspirer — Asymmetry Hunt

快速读基础稿，随后独立寻找证据，而不是先被其论证锚定。详细指引见 `reference/inspirer.md`。

1. **精确共识**：保存共识 provider、口径和 availableAt，确认它在研究截面前公开。
2. **历史类比**：找 2-3 个结构类比，写清相似、不同和 base rate；不把结局直接套到当前。
3. **价格反推**：需要反 DCF 时调用 `../valuation-model/SKILL.md`，只接受 `finance_model` 输出。
4. **利益相关者机制**：从客户、供应商、竞对、员工或监管者的实际决策解释 why/how。
5. **反证扫描**：主动寻找能推翻核心论文的材料，保留 contradicts。

产出 8-12 个具体问题和一个核心认知差候选；没有可验证 edge 时进入 Pass。

### Phase 2：Generator — Deep Dig

围绕核心问题补齐证据链和数字推导。

- 基础稿及既有 claim/belief/signal 是待审分析，不是事实真值；重要主张须回到实际 source/raw，并主动纠正而非继承旧逻辑错误。
- 关键数字回到 source/raw；估值、敏感性等模型输入按共享数据边界使用 `finance_model`，普通增长率、占比、百分点、基点和单位换算使用宿主 Python/JavaScript，不手算或猜 action。
- 判断排他归因或净贡献时，须核对完整分解及所有分项的正负抵消；仅知部分分项为正，不能排除另一分项贡献全部或超过全部净增量。若分解已穷尽且符号与可比性有据，可推导成立的界限，不必伪造缺失金额或精确份额。缺分母、基数或口径时写 unknown，不改成零或确定不可能；增长率反推只能称条件式 implied denominator，不得冒充披露的会计值。
- 相对月份、“近期”等模糊时间词只保留原文的区间/先后限制；重叠或相对表述不能推出事件已包含或排除于某期，也不能推出贡献为零。分别写清实际事件时间 unknown 与“不可据此归因于该期”的证据边界。
- 定量桥只有在会计基础、分子分母和可比期间一致时才是条件式推导；缺基础时写 unknown，不能把不可比写成实际差异。输入带舍入时，要么明确哪些输入视为精确并列出舍入假设，要么对全部输入做边界；不得制造超出精度的伪精确值。
- 任何“逐字引文/直接引用”声明，写前都用实际可用的 Python/JavaScript 对每个 raw 引文片段做精确子串核验，保留全部内部词和限定词；核验失败就标为转述。新事实建 claim，催化建 `catalyst -[catalyzes]-> instrument`，预测建带 dueAt 的 prediction。

### Phase 3：追问与独立复核

Inspirer 针对最弱推理环节追问，每轮引入新证据，不重复泛问题。Evaluator 另按 `../research/reference/evaluator.md` 检查时间、来源、模型和报告一致性；两种角色不混成格式 QA。

反馈必须具体且可验证。Generator 先核实再采纳，需要改模型时完整重跑；不得为了达成一致而隐藏合理分歧。

### Phase 4：干净交付

**完整报告**：Thesis + conviction、共识画像、单一论证链、价格隐含预期、最强反面、催化/时间窗、证据缺口。估值引用 valuation 节点，不手改数字。

**Pass note**：说明检验过哪些候选、为何不成立或不可验证、当前还缺什么证据。Pass 与完整报告都写 `deliverable`，新版用 supersedes，旧版保留。

用户给出正文长度上限时，写入前用实际可用的 Python/JavaScript 核验最终用户可见正文，计入拉丁字母、数字和标点，不只数汉字；没有明确计数单位时采用保守 Unicode codepoints 并说明口径。不得写入硬编码的通用长度上限。

两种输出都遵守 `../research/reference/notion-output.md`，并用一个原子 `finance_graph plan` 写入最终 deliverable 与本轮新增节点/边：`deliverable -[derived_from]->` 连接基础稿和实际使用的编译 claim/belief/signal，`deliverable -[cite]->` 连接实际 get 读取的 source/raw；保留 supports/contradicts，真实 session 存在时以 `session -[produces]-> deliverable` 记录产出。统一 runId/asOf/availableAt/provider/contentHash/provenance，不补造数字或引用。知识编译本身不创建 deliverable；只有用户明确选择 deep-research 后才进入本交付阶段。

定量预测不得因本次叙事改变而事后修改。到期后由 `../flex-memory/SKILL.md` 或 `../catalyst-calendar/SKILL.md` 结算。

## 输出与审查

不写外部文件树或发布系统。完整报告或 Pass note 写入 `deliverable` 后，对话最终回复直接呈现同一份读者版 Markdown，至少包括结论、关键依据和“来源与证据”；不得用节点 id、哈希或审计明细代替报告正文。运行 `research_graph_query` 的 `audit`，确保没有新增悬空 references；节点 id、provenance 与审计结果保留在 metadata 和审计记录中，仅在用户要求追踪或排查时作为简短附注展示。

只输出研究结论和待验证事项，不输出买卖、清仓或下单指令。

## 分层加载

| 任务 | Read |
|---|---|
| Inspirer | `reference/inspirer.md` |
| Evaluator | `../research/reference/evaluator.md` |
| 估值 | `../valuation-model/SKILL.md` |
| 数据与证据 | `../financial-data-rigor/SKILL.md` |
| 投资哲学 | `../_investment-philosophy.md` 全文 |

## 新产物的时间与阅读顺序

研究截面 asOf 与材料发布/可用时间分别保留。保存本次新 deliverable 或 review 前读取真实系统时钟，以实际生成可用时间填写新产物的 availableAt 和实际生成/读取时间 fetchedAt，不把旧资料日期、截面或未来日末倒填成新产物时间。只有 `finance_graph` 的 `action: "plan"`、`input` 为完整 `{nodes,edges}` 对象时，适用 finance deliverable 的 contentHash 补全语义；不得与 `research_graph_admin.apply_plan` 的通用 `graph.plan` 混用。写入后必须通过 `get`/readback 核验实际 hash，缺失或不匹配时报告未知，不手写或复制无关哈希；本地文件哈希只放 provenance 并说明校验对象。真实 runId/sessionId 存在才携带，不编造。

向用户先交付判断、关键依据、最强反方和仍缺的证据，再给可打开的报告/原文链接。内部 id、哈希和协议检查保留在 metadata 或末尾核验附录；不要让用户靠阅读工具日志理解研究结果。
