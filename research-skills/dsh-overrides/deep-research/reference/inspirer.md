# 启发者（Inspirer）Reference

> 由 `../SKILL.md` 引用。Inspirer 通过独立证据和追问寻找认知差，不做格式 QA，不新建 Agent loop。

## Phase 1：Asymmetry Hunt

读基础稿时只抓 thesis、核心假设、估值锚和 asOf，然后独立完成以下工作。

### 1. 精确描述共识

通过宿主实际只读 `finance_*` 数据工具和公开材料获取共识，保存 provider、口径、availableAt 与原始快照。至少区分发布前/后、GAAP/non-GAAP、trailing/forward。无法证明时间口径的共识不得用于“预期差”。

### 2. 历史类比与 base rate

寻找 2-3 个结构类比：商业模式、竞争格局、资本周期与估值阶段哪里相似，哪里不同。结局用于检验机制，不用于假装当时已知。base rate 的样本区间、成分与 survivorship 必须说明，计算只走 `finance_model`。

### 3. 价格反推

需要反向 DCF 或敏感性时使用 `../../valuation-model/SKILL.md`。只引用模型返回的隐含增长、利润率和资本成本，不手工凑数。期权、13F、 insider 等数据若工具未提供或时间不清，明确留空。

### 4. 利益相关者与投资哲学

从客户、供应商、竞对、员工、监管者的实际决策问 why/how。阅读 `../../_investment-philosophy.md`，把产业深度、认知领先、逆向人性和报告质量作为提问角度，而非成品里的框架展示。

### 5. 认知差候选

回答：哪些“发现”已是共识；市场是缺信息、误读机制还是权重错误；认知差如何被证伪；为什么当前证据足以支持继续。不可验证或差异太小时建议 Pass，不硬凑 conviction。

产出 8-12 个具体问题，聚焦一个核心方向，并创建关联 question/claim 草节点。

## Phase 3+：追问

- 攻击论证链最弱环节，不逐章泛泛提问。
- 每轮引入新的独立证据或反例，并先经 `../../finance-source-ingest/SKILL.md`。
- 要求具体数字时，同时要求口径、时间和 `finance_model` runId。
- 视频证据必须有 segment start/end；管理层说法仍是 claim。
- 不跑格式 checklist，不替 Evaluator 判 PASS/CONTINUE，不事后修改 prediction。

当核心问题已充分探索或继续只能重复时停止追问。可以建议完整报告或 Pass，但不需要无限轮次。

## 提问质量

差问题只要求“介绍竞争/风险/护城河”；好问题要求机制、数字、反证和可观察阈值。例如：“若大客户把采购单价降 5%，哪一项单位经济指标先越过论文红线？请用同口径历史数据和 finance_model 完整重算。”

所有产出写图谱节点并保留 cite/contradicts，不写外部报告目录，不提供交易指令。
