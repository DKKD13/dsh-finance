---
name: hypothesis-thinking
description: 结构化思维框架。当需要对不确定问题形成判断、追踪证据、更新置信度，或按 runId/hypothesisId/asOf 审查既有 question/claim/belief/signal 时触发。适用于投资研究、产品决策、技术选型等假说驱动场景。
---

# Hypothesis Thinking

**好的思考不是堆结论，是把问题拆开 → 形成假说 → 用证据检验 → 不断更新判断。**

```
Question → MECE Decompose → Hypothesis → Evidence → Updated Confidence → Synthesize
```

非线性。新证据出现 → 回到假说 → 更新。

## 1. 提问

一句话，明确，可回答。
- 投资："GOOG 在 AI 时代能维持搜索护城河吗？"
- 产品："用户会主动用 AI chat 吗？"
- 技术："微服务还是单体？"

## 2. MECE 拆解

把大问题拆成不重不漏的子问题：

```
GOOG 护城河能否持续？
├── 技术：AI 搜索的技术壁垒在哪？
├── 用户：用户行为会怎么变？
├── 商业：广告模型在 AI 搜索下能运转吗？
└── 竞争：谁威胁、威胁多大？
```

## 3. 形成假说

每个子问题给出初始判断 + 置信度：

```
H1: 数据飞轮是结构性护城河，AI 搜索强化而非削弱 — conf 65%
H2: 用户在传统/AI 之间分流但不完全迁移 — conf 55%
H3: 广告模型需重大调整但不会崩溃 — conf 50%
```

## 4. 证据卡片

每条证据标记：

| 属性 | 说明 |
|---|---|
| **方向** | supports / refutes / neutral；写入图谱的反向关系使用 contradicts |
| **可靠性** | 0-1。完整信任分级见 `../_investment-philosophy.md` §3 |
| **独立性** | 0-1（和已有证据的独立程度） |
| **新奇性** | 0-1（相对市场共识的意外程度） |

**高质量证据 = 一手 + 独立 + surprising**

## 5. 置信度更新（贝叶斯式）

| 证据强度 | 调整 |
|---|---|
| 强支持（可靠 >0.7 + 独立 >0.7） | +5~10 |
| 弱支持 | +1~3 |
| 强反驳 | −10~15 |
| 弱反驳 | −3~5 |

上述幅度只适用于确有新证据且可靠性、独立性已核验的人工分析。没有校准依据时优先使用定性等级，不制造精确百分比。

## 6. Kill Criteria

**提前定义放弃假说的条件。触发就杀。**

```
Kill H1 if: Google 搜索份额连续 2 季度下降 >3pp
Kill H3 if: 广告 CPC 连续 2 季度下降 >20%
```

## 7. 综合判断

加权所有假说置信度。**不是投票，是权重**：
- 哪个假说对结论影响最大？
- 假说间矛盾？矛盾本身是信号

## 8. 显式 review：生成独立审查，不覆盖原节点

仅在用户同时显式提供以下三个值时进入本模式：

```text
runId=<本次审查的真实运行 id>
hypothesisId=<既有 question/claim/belief/signal 节点 id；字段名保留兼容>
asOf=<ISO-8601 研究截面>
```

缺任一项就不创建节点，不编造 runId、目标 id、截面、证据、置信度、时间或版本。review 是独立 `deliverable`，不是原节点的更新，也不是新的研究终稿。

### 8.1 读取指定审查目标与真实关系

1. 用 `finance_graph` 的 `get` 读取 `hypothesisId`。节点必须存在且 kind 为 `question`、`claim`、`belief` 或 `signal`；按实际 kind 审查，不强制改写成另一 kind，claim 的既有 `metadata.claimType` 原样保留。否则停止并报告实际不匹配。
2. 用 `research_graph_query` 的 `snapshot` 读取同一 revision 的完整节点/边集合，精确筛选 `hypothesis -[cite|derived_from]-> evidence` 与 `raw/evidence -[supports|contradicts]-> hypothesis`。以实际边的另一端为证据 id，不依赖 metadata.references 是否完整，也不把其他假说的证据混入。
3. 对 snapshot 筛出的每个实际证据节点，再用 `finance_graph` 的 `get` 读取完整正文和 metadata；source/raw 链都要核对，不能只凭标题、摘要或 search hit 作结论。snapshot 中没有的关系就不存在，不得凭语义补造。
4. 记录实际边方向、节点 id、contentHash、provider、asOf/availableAt、provenance、reliability 和 independence。`cite` 只表示实际引用，不自动等于支持；supports/contradicts 只采用真实指向该 hypothesisId 的入边。
5. 写入前用 `finance_graph` 的 `search` 查询同一 runId，并逐个 `get` 精确匹配项。若该 runId 已对应另一假说或不同审查内容，停止并报告冲突；不得覆盖既有 review，也不自行生成“下一版本”。

### 8.2 时间门与证据有效性

- 每条用于审查的证据都必须有合法 `availableAt <= asOf` 和证据自身 `metadata.asOf <= asOf`。缺失、无效或越过任一截面的证据排除出结论，并列入 `evidenceGaps`；不得用 `fetchedAt`、capture 时间或当前时间偷填。
- `quarantined` / `rejected` 证据不得支撑结论。原始节点与派生节点都要核对，不能只检查 claim 上的摘要。
- 审查目标自身的 temporal lineage 明确表明它在 asOf 后才可用时，停止审查；字段缺失则记录 lineage 缺口，不能补造。
- 只有相对审查目标创建或上一次 review 之后**新增或新关联**、且通过上述时间门的真实证据才算新证据。重读旧材料、改写措辞、重复引用、同一内容的新 deliverable 或同源转载都不算新证据。先后关系无法确认时按“没有可确认的新证据”处理并说明原因。

### 8.3 反证独立性与置信度

对每条 `contradicts` 证据逐项记录：证据 id、实际上游/转载组、独立性为 `independent / dependent / unknown`、可靠性及理由。综合审查目标的 evidence 卡与边 metadata；转载、同源 PR、同一上游数据、相同 contentHash 或同一 source/raw 链不算多份独立反证。缺失 independence 时只能标 `unknown` 和证据缺口，不能默认独立。

- `confidenceBefore` 原样复制审查目标的 `metadata.confidence`；不存在则为 `null` 并记录缺口。
- **没有可确认的新证据时，`confidenceAfter` 必须与 `confidenceBefore` 完全一致。** 不得虚构升降、百分比、校准、状态迁移、`supersedes` 或新假说版本。
- 确有新证据时也只能根据实际支持/反证强度与独立性作有据可查的调整；没有校准依据就沿用定性等级并写理由，不把未知反证独立性当作强反证。
- `killCriteria` 保留审查目标的真实条件；没有则使用空数组并记录缺口。逐条给 `triggered / not_triggered / unknown` 及证据，触发只在 review 中报告，不在本流程改写原节点或自动交易。
- 审查目标及其实际关联的旧分析都是待核验对象，不是证据真值。时间区间重叠不等于包含；跨期期数或门槛须有来源或用户依据，否则不得沿袭为必需条件。
- 对每个“排除、唯一、所有、主要、完全”等强命题，先写明量词范围和总体分解，再用实际可用的 Python/JavaScript 检验满足已知约束的反例。某分项为正不等于其余项合计净正，也不能据此排除该分项贡献 100% 或超过 100% 的净增量。分解不全或不可比时不得判定，允许 `unknown`；仅当分解穷尽、基期可比且各项符号有据时，可推导逻辑成立的界限；没有金额时不得伪造精确份额。
- 从舍入值反推只能称为条件式 implied approximation；分子口径、会计基础或可比期间未核验时，不得把结果写成已披露的实际金额或其他会计值。
- 命题与候选反例条件冲突时，应把冲突留给直接证据核验，不得据此判定反例不可执行；无法核验时标 `unknown`。

### 8.4 一次原子写入 review session 与 deliverable

正文第一段必须是用户可读的结论和判断是否改变；不得以 runId、reviewOf、revision、asOf 或内部节点 id 开场。之后列依据与仍缺的证据，再列实际采用/排除证据、反证独立性和 killCriteria 复核；内部字段只放末尾核验附录及 metadata。所有数字、引文与结论必须能回到实际读取的节点；不知道就写未知。保留材料实际文种与审计状态：新闻稿、未经审计报表、监管申报和审计财报不得互相冒称。若读取的是摘录，必须说明摘录范围，不能把摘录未包含的内容断言为整份原始文件未披露。增长、占比和基点使用宿主实际可用的 Python/JavaScript 工具复算，保留未四舍五入的输入后才格式化；不心算、不用 dcf/comps/portfolio 代替普通算术。

写入前读取真实系统时钟，两个新节点都必须有真实生成可用时间 availableAt 和实际读取/生成时间 fetchedAt。asOf 仍是用户研究截面；即使依据是旧资料，新 review 也不是当年已存在的证据。不得用截面、原材料发布日期、未来日末或猜测时间填新产物的 availableAt。

只创建以下两个新节点，**不要把审查目标或既有证据节点放进 plan.nodes**，以免 upsert 覆盖其标题、正文或 metadata：

- `session:review:<runId>`：kind `session`，记录本次实际输入、采用/排除项和产物索引；
- `deliverable:review:<runId>`：kind `deliverable`，正文为上述 review。

两个节点的 metadata 都包含真实 `runId`、`reviewOf: hypothesisId`、`status`、`asOf`、`availableAt`、`fetchedAt` 和 `provider: "hypothesis-thinking"`。deliverable 还必须包含 `confidenceBefore`、`confidenceAfter`、`killCriteria`、`evidenceGaps`；session 的完成状态为 `reviewed`，证据不足时 deliverable 可用 `insufficient_evidence`，不得把缺口写成通过。`references` 只列审查目标、实际引用证据及同一 plan 的另一新节点。本流程只用 `finance_graph` 的 `action: "plan"` 与完整 `input` 对象写入；不要改用 `research_graph_admin.apply_plan`，两条路径的金融校验与 hash 处理不同。此金融写入路径会为非编译 deliverable 的实际正文补 `contentHash`；模型不要手写、猜测或复制无关 hash，必须用后续 get/readback 核对保存值，缺失或不一致则报告未通过。

在同一个 `finance_graph` 的 `plan` 中只建立实际关系，方向固定为：

```text
session:review:<runId> -[produces]-> deliverable:review:<runId>
deliverable:review:<runId> -[derived_from]-> hypothesisId
deliverable:review:<runId> -[cite]-> 实际采用的证据节点
```

不为凑数创建 supports/contradicts，不创建 supersedes，不逐节点 create、逐边 add 或用第二次 plan 拼凑。所有 session、deliverable 与边必须在**一次原子 plan** 中成功写入；校验失败时只修正完整草稿，不把失败说成已完成。

### 8.5 核验与诚实交付

当前 Host 的 finance 接口已足够，**不要调用不存在的 `review_status`**。写入后用 `finance_graph` 的 `search` 按 runId 搜索 `session` / `deliverable`，过滤 `metadata.runId` 与 `reviewOf` 的精确匹配，再 `get` 两个预期 id；用 `backlinks` 核对 produces/derived_from/cite，用 `research_graph_query` 的 `audit` 检查新增悬空引用。

如同时交付本地 Markdown 文件，必须把同一份完整正文写入文件和图谱，保存后分别读回逐字比较；不得二次改写标点、换行或再生成正文后声称完全一致，差异应修复或明确报告。

文件使用提交后读回节点的实际 `content` 字符串写入，不另加末尾换行。保存过程若规范化输入，以实际节点正文为文件依据；不要仅为本地文件格式差异另行更新研究节点。逐字节比较失败时不得报告完全一致。

只有原子 plan 确认且两个节点与必要边均实际存在，才报告 `reviewed`、revision 和节点 id。plan 未确认、查询失败或结果不完整时报告状态未知/未完成，不把 search accepted、草稿或部分结果说成 review 已完成。

## 关键原则

- **图谱只有支持没有反驳，只表示当前图谱未记录反证关系；不能据此判断反证检索是否做过，也不能推出全局无证据或无风险。**
- **Kill 触发 = EXIT，不 rationalize**；review 负责记录，不擅自执行动作
- **置信度 >80 需要强独立证据**
- **定期 review 未关闭的假说** — 假说不是写了就完了
- **假说是工具不是立场** — 更新置信度不是认输，是学到了；没有新证据则不更新
