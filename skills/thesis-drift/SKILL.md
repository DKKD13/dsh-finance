---
name: thesis-drift
description: "AI Berkshire skill: 投资论文漂移检测与既有假说审查：分清事实变化、证据变化与措辞变化。Source: skills/thesis-drift.md."
---

# 投资论文漂移检测：分清事实变化与措辞变化

> 适配说明：本文件源自 xbtlin/ai-berkshire 的 canonical 上游文件 skills/thesis-drift.md（上游路径，非包内引用），MIT 原文与版权见随包 `LICENSE`。由 dsh-research-graph 修改：改用图谱快照、只读 `finance_*` / `research_graph_*` 与确定性 `finance_model`；显式假说审查只新增 review deliverable/session，不覆盖原假说；删除上游命令、报告目录和交易动作，不迁移任何报告或账户数据。

对比同一标的的两个带日期论文快照，或按用户指定的假说做时点审查。目标是**只在证据变化时承认论文变化**：同义改写不是漂移，价格波动不自动等于基本面漂移。

## 输入与防未来泄漏

接受两个图谱节点 id、两个 revision，或用户明确提供的两份公开/自有研究快照。先确认公司、代码、币种与日期一致；跨公司或日期无法确认时停止，不凭记忆补基线。

- 旧快照固定在 `oldAsOf`，新快照固定在 `newAsOf`，且 `oldAsOf < newAsOf`。
- 每个截面只能使用对应 `availableAt <= asOf` 且证据自身 `metadata.asOf <= asOf` 的证据。新发生的事实不能倒填成旧时点已经知道。
- `fetchedAt` 是本次读取时间，不是发布时间。发布时间不明时标为无法判断，不能猜，也不能用 capture 时间或当前时间偷填。
- 缺少旧基线时只说明当前基线与缺口，明确“无法执行漂移检测”，不得根据市场印象生成一份“旧论文”。

当用户同时显式提供 `runId` / `hypothesisId` / `asOf` 时，进入第 6 节的**显式假说审查模式**；三个值缺一不可，不得自动编造。

## 快照对比流程

### 1. 读取快照与证据

用 `research_graph_query` 的 `diff` 比较 revision，或用 `research_graph_node` 读取两个 deliverable/claim 集合，再用 `finance_graph` 的 `get` 读取实际用于结论的完整证据节点。按 `financial-data-rigor` 核验来源、时间和口径。

抽取五个固定维度：估值锚点、核心假设、红线、管理层质量、竞争护城河。缺结构时标“结构缺失”；无法抽取的维度标“无法判断”，不得编造。

### 2. 证据归一化

| 维度 | 旧证据（含 asOf） | 新证据（含 asOf） | 口径是否一致 | 可验证性 |
|---|---|---|---|---|
| 估值锚点 | | | | |
| 核心假设 | | | | |
| 红线 | | | | |
| 管理层质量 | | | | |
| 竞争护城河 | | | | |

只比较证据与阈值，不比较文风。纯措辞、排序、语气和格式变化判为 Unchanged。重读旧材料、重复引用、同源转载或同一内容的新 deliverable 不算新证据。

### 3. 数值复核

DCF、可比估值、组合估值与敏感性必须调用 `finance_model`，不可用时不得另写估值引擎。已披露数值间的变化率、目标价差异、单位换算及普通算术使用宿主实际可用的 Python/JavaScript 执行工具，保留原始输入、公式与单位；不要为普通算术猜 dcf/comps/portfolio 参数或不存在的 action。没有对应执行工具则标“未复算”，不心算。

### 4. 逐维度判定

每个维度只给 **Improved / Unchanged / Weakened / 无法判断**：

- **估值锚点**：把价格变化和内在价值假设变化分开。安全边际收窄不证明生意恶化。
- **核心假设**：必须对应收入、利润率、现金流、订单、产能等可验证指标。
- **红线**：诚信、监管、业务衰退、竞对突破和管理层异常行为单独呈现，不被低估值抵消。
- **管理层质量**：依据实际资本配置与披露行为，不依据措辞强弱。
- **竞争护城河**：依据市占率、定价权、成本优势、网络效应或替代证据。

非 Unchanged 结论必须引用通过时间门的具体新证据节点；找不到证据就判 Unchanged 或无法判断。反证还需按第 6.3 节核验独立性，同源多份材料不能制造“多项独立漂移证据”。

### 5. 快照对比交付

报告依次包含：对比对象与两个时间截面、总体 drift 结论、五维度漂移表、事实/价格/措辞差异、`finance_model` 复算记录、证据缺口、下次跟踪重点。若用户同时给出 runId 与明确 reviewOf 节点，图谱写入同样遵守第 6.4 节的一次原子 review plan；不得逐节点创建或默认生成新 claim。

这里只更新研究状态，不输出买卖或下单指令。动作字段仅限“继续跟踪 / 需要补证据 / 重新估值 / 红线复核”。

## 6. 显式假说审查：drift review，不覆盖原假说

输入格式：

```text
runId=<本次审查的真实运行 id>
hypothesisId=<既有 claim 节点 id>
asOf=<ISO-8601 研究截面>
```

review 是独立 `deliverable`，不是原假说的新版本，也不是交易指令。缺输入、节点不存在、kind 不是 `claim` 或 `metadata.claimType` 不是 `hypothesis` 时停止并报告实际原因。

### 6.1 读取指定假说及 cite/derived_from/supports/contradicts

1. 用 `finance_graph` 的 `get` 读取指定假说；保存原始 confidence、killCriteria 与 temporal lineage，不在后续 plan 回传这个节点。
2. 用 `research_graph_query` 的 `snapshot` 读取同一 revision 的完整节点/边集合，精确筛选 `hypothesis -[cite|derived_from]-> evidence` 和 `raw/evidence -[supports|contradicts]-> hypothesis`。以真实边的另一端确定证据，不依赖 metadata.references 是否完整，也不混入其他假说的关系。
3. 对 snapshot 筛出的每个实际证据节点，再用 `finance_graph` 的 `get` 读完整正文与 metadata，并核对 source/raw 链。snapshot 没有的关系不得凭标题或语义补造。
4. `cite` 只代表实际引用，不自动等于 supports；supports/contradicts 只采用真实指向该 hypothesisId 的入边，找不到关系就写缺失。
5. 写入前用 `finance_graph` 的 `search` 查询 runId 并 `get` 精确匹配项。runId 已用于另一假说或不同审查时停止并报告冲突，不覆盖旧 review，不自动创建版本号。

### 6.2 时间门与新旧证据

- 采用证据必须有合法 `availableAt <= asOf` 和证据自身 `metadata.asOf <= asOf`；缺失、无效、未来或 `quarantined` / `rejected` 的记录不得支撑 drift 结论，排除项和原因进入 `evidenceGaps`。
- 原假说自身 temporal lineage 明确晚于 asOf 时停止；字段缺失则记录 lineage 缺口，不猜。
- 只有相对原假说创建或上一次 review 之后新增/新关联、且通过时间门的真实证据才算新证据。措辞变化、重复阅读、同源转载和相同内容的新包装均不算。先后关系无法确认时按没有可确认的新证据处理。

### 6.3 反证独立性与 drift / killCriteria

对每条 contradicts 证据列出证据 id、上游/转载组、reliability、independence 及 `independent / dependent / unknown` 判定理由。结合 claim evidence 卡和边 metadata 核验；同一 source/raw 链、相同 contentHash、同源 PR、通讯社转载或同一上游数据只算一个证据群。缺 independence 信息必须为 `unknown` 并列缺口，不得当成独立强反证。

- 总体和五维度 drift 只能为实际证据支持的 `Improved / Unchanged / Weakened / 无法判断`。**没有可确认的新证据时不得制造漂移、置信度变化、新 claim 或 supersedes 版本**；总体只能按事实写 Unchanged 或无法判断。
- 原假说有 confidence 时可在报告中原样记录 confidenceBefore；没有可确认的新证据时 confidenceAfter 必须相同，原字段缺失则两者为 null 并记录缺口。
- `killCriteria` 复制原假说的真实数组，没有则为空数组并记录缺口。逐项给 `triggered / not_triggered / unknown` 与证据；只在 review 报告触发，不改写原假说、不自动交易。
- 缺少后续披露或适用观察范围时，失效条件判 `unknown`，说明“本次采用材料未观察到触发证据”；不能因为图中无新材料就判 `not_triggered`。只有已读证据确实覆盖该条件与期间、并支持条件不成立时，才用 `not_triggered`。总体 Unchanged 与逐项 unknown 可以同时成立。
- 维度无法判断只说明依据不足，不能断言材料不存在相关数据。例如现金流表已有分红与回购金额时，可说不足以评价资本配置质量，不得说没有资本配置材料。

### 6.4 一次原子 finance_graph plan

review 正文至少包含 runId、reviewOf、status、asOf、总体 drift 结论、五维度表、实际采用/排除证据、时间门、反证独立性、killCriteria、证据缺口和下次跟踪重点。所有引文、数字和结论必须回到实际读取节点；不知道就写未知。

只创建 `session:review:<runId>` 与 `deliverable:review:<runId>` 两个新节点，**不要把原假说或既有证据放进 plan.nodes**。两个节点 metadata 均含真实 `runId`、`reviewOf: hypothesisId`、`status`、`asOf`、`provider: "thesis-drift"`；deliverable 另含 `drift`、`killCriteria`、`evidenceGaps`，有 confidence 时同时保留真实 before/after。session 完成状态为 `reviewed`，证据不足时 deliverable 可标 `insufficient_evidence`。references 只列真实节点；不要手造 contentHash，Host 会按 deliverable 实际正文补全缺失哈希。

在同一个 `finance_graph` 的 `plan` 中建立：

```text
session:review:<runId> -[produces]-> deliverable:review:<runId>
deliverable:review:<runId> -[derived_from]-> hypothesisId
deliverable:review:<runId> -[cite]-> 实际采用的证据节点
```

只在实际引用时创建 cite，不为凑数创建 supports/contradicts，不创建 supersedes。不得使用 `research_graph_node` 逐节点创建、逐边 add 或第二次 plan 拼凑；一次原子 plan 未确认就不能称为 reviewed。

### 6.5 查询与交付

沿用现有 finance 接口，不假定存在 `review_status`。用 `finance_graph` 的 `search` 按 runId 查询 session/deliverable，精确过滤 metadata.runId 与 reviewOf，再 `get` 预期节点；用 `backlinks` 核对 produces/derived_from/cite，用 `research_graph_query` 的 `audit` 检查悬空引用。

只有 plan 和节点/边核验均成功才报告 reviewed、revision 与实际 id。查询失败、plan 未确认或结果不完整时报告未知/未完成，不把草稿、search accepted 或部分写入伪装成完成。

需要另存本地 Markdown 时，提交成功后实际 get 新 deliverable，以返回的确切 content 字符串写文件，再读回逐字节核对；不要另加末尾换行，也不要把去除换行后的相等宣称为文件字节相同。

## 缺失基线输出

明确列出已找到的当前快照和缺失的历史基线。只有用户另行明确选择建立基线时才进入相应假说创建流程；不得根据市场印象生成“旧论文”，也不得把当前 review 写成历史版本。

## 新产物的时间与阅读顺序

研究截面 asOf 与材料发布/可用时间分别保留。保存本次新 deliverable 或 review 前读取真实系统时钟，以实际生成可用时间填写新产物的 availableAt 和实际生成/读取时间 fetchedAt，不把旧资料日期、截面或未来日末倒填成新产物时间。Host 对完整记录生成 contentHash；本地文件哈希只放 provenance 并说明校验对象，不能覆盖 Host hash。真实 runId/sessionId 存在才携带，不编造。

向用户先交付判断、关键依据、最强反方和仍缺的证据，再给可打开的报告/原文链接。内部 id、哈希和协议检查保留在 metadata 或末尾核验附录；不要让用户靠阅读工具日志理解研究结果。

默认对话答复用三句以内说明结论、主要依据及下一步，并给可点击报告入口；错误只说明阻碍和所需纠正。用户未请求技术核验时，不在对话展开 id 表、调用日志或完整核验附录，完整五维表与技术附录保留在报告中。
