---
name: knowledge-compiler
description: 将已入库、ready 且未越过时间门的 source/raw 编译为可证伪的研究假说图谱。输入 runId/sourceIds/asOf，逐个读取真实原文和 locator，生成 question、claimType=hypothesis 的 claim，以及适用时的 belief/signal，并用一次原子 finance_graph plan 提交；不生成最终研究报告。
---

# Knowledge Compiler

把证据材料编译成**可继续研究的问题与假说**，不是写最终报告。最终报告只能由用户随后明确选择 `research` 或 `deep-research` 生成；本技能不得创建 `deliverable`，不得把编译结果表述成研究终稿。

## 唯一运行边界

- 只在当前真实 DSH Session 中推理和调用 Host 工具。不得新建或调用第二个 LLM runtime、持久 Agent loop、私有 Store、子 Agent 或外部模型 API。
- Host 的 `compile_prepare` / `compile_status` 只做确定性图读取；它们不是模型，也不会代替本技能生成假说。
- 不写 vault、外部笔记或发布系统，不执行交易或下单，不用训练记忆补充来源中没有的数字或引语。

## 输入

```text
/knowledge-compiler
runId=<本次编译的真实运行 id>
sourceIds=<逗号分隔的 source 节点 id>
asOf=<ISO-8601 研究截面>
```

三个输入都必须显式存在。不要编造 runId、source id、asOf、DSH session id、provider、数字、阈值、引文或 locator。`sourceIds` 可以来自一次 ingest 的返回，但编译 runId 必须准确对应当前这次编译。

## 流程

### 1. 只读准备与时间门

调用 `finance_graph` 的 `compile_prepare`：

```json
{
  "action": "compile_prepare",
  "input": {
    "runId": "<runId>",
    "sourceIds": ["source:..."],
    "asOf": "<asOf>"
  }
}
```

保存返回的 `preparedAt`、`candidates` 与 `rejected`。只有 `candidates` 中的 source/raw 可以参与推理。`quarantined`、非 ready、缺失 raw/provenance、哈希不符、`availableAt > asOf` 或来源自身 `asOf` 越过截面的记录必须排除，并在最终结果中保留 rejected 原因；不得通过改用 capture 时间、删除时间字段或引用其他版本绕过。

`preparedAt` 是 Host 实际准备候选的时间。派生产物的 `availableAt` 使用这个真实值，不冒充原始材料的发布时间。

### 2. 逐个读取真实内容，再搜索反证

对每个 candidate 按顺序执行，而不是只凭标题或摘要生成结论：

1. 用 `finance_graph` 的 `get` 读取完整 `sourceId`，再用 `get` 读取完整 `rawId`；有 `captureId` 时也读取 capture。核对 raw 正文、contentHash、provider、availableAt/asOf、provenance 与 locators。
2. 用 `finance_graph` 的 `search` 带同一 `asOf` 搜索相关既有 question/claim/belief/signal 和可能相反的材料。凡实际用于论证或判重的 search hit，都必须再 `get` 完整节点后才能引用。
3. 记录实际使用的精确 locator。没有页码/segment 等细粒度 locator 时，只能引用真实 raw 节点并明确“全文”，不得虚构页码、段落、表格或时间戳。

search/get 都是只读步骤。不得把 prepare 返回之外的 source/raw 偷换进本次 sourceIds；如需补充新证据，应先另走 `finance-source-ingest`，再由用户决定是否发起新的编译 run。

### 3. 形成问题与假说

- 至少建立一个具体 `question`，并为它建立可证伪的 `claim`；每个 claim 的 `metadata.claimType` 必须是 `hypothesis`。
- 只有证据支持当前解释时才建 `belief`；只有存在可跟踪、可失效的信号时才建 `signal`。不适用时不强行补齐。
- 区分原文事实、来源作者观点与当前 Session 的分析推断。转载、同源 PR 或同一上游数据不算独立验证。
- 主动保留支持与反对证据；证据不足时降低 confidence 或明确不建 claim，不把假设写成事实。

每个 claim 必须包含：

```json
{
  "claimType": "hypothesis",
  "killCriteria": ["可观察、会使假说失效的条件；阈值只能来自证据或明确标为待验证假设"],
  "confidence": {
    "level": "low|medium|high",
    "rationale": "基于实际证据覆盖、可靠性和独立性的理由"
  },
  "evidence": [
    {
      "sourceId": "source:...",
      "rawId": "raw:...",
      "locator": "真实 locator 或 raw 全文节点",
      "relation": "supports|contradicts|cite",
      "reliability": { "level": "low|medium|high", "rationale": "为什么可信或不可信" },
      "independence": { "group": "真实上游/转载组", "rationale": "与其他证据是否同源、为何独立" }
    }
  ]
}
```

belief/signal 适用时同样保留 killCriteria、confidence 和 evidence 评估。confidence 默认使用上述定性等级及理由；没有校准依据时不得制造精确百分比、收益率、目标价或其他数字。

### 4. 组装单次原子 GraphPlan

所有新节点使用确定性的显式 id，例如 `question:compile:<runId>:q1`、`claim:compile:<runId>:h1`、`belief:compile:<runId>:b1`、`signal:compile:<runId>:s1`，并创建一个 `session:compile:<runId>` 节点。session 的 `metadata.status` 为 `compiled`，正文只记录本次实际输入、采用/排除项和产物索引，不写报告。

每个新节点和每条新边的 metadata 都必须包含：

- `compileRunId` 与 `runId`：都等于输入 runId；
- `provider`: `knowledge-compiler`；
- `asOf`: 输入研究截面；
- `availableAt`: 本次 prepare 的真实 `preparedAt`；
- `provenance`: 至少含真实 `sourceRefs`、使用的 raw/locator 和 `compiler: "knowledge-compiler"`；
- `provenance.dshSessionId`: **仅当当前 DSH Session 的真实 id 已由宿主明确提供时**写入；无法获得就省略，禁止占位或猜测。

模型不要手算或编造 `contentHash`。编译标记节点/边经 `finance_graph plan` 提交时，Host 会根据实际 canonical 内容与 metadata 推导并写入 `contentHash`；若调用方提供错误哈希，Host 会拒绝整个 plan。`metadata.references` 只列真实存在或同一 plan 中创建的节点。

按实际语义建立关系，方向不得颠倒：

- `claim -[answers]-> question`；
- `claim/belief/signal -[cite]-> source/raw`；
- `raw -[supports|contradicts]-> claim`；
- `claim -[derived_from]-> raw`，belief/signal 用 `derived_from` 连接其实际上游 claim/belief；
- `session:compile:<runId> -[produces]-> 本次每个 question/claim/belief/signal`。

只在关系真实存在时创建 supports/contradicts；不得为了凑关系制造冲突。所有边也携带上述完整 compile metadata。

把全部 session/question/claim/belief/signal 与边放进**一个** `finance_graph` 的 `plan` 调用。不得用逐节点 create、逐边 add 或第二次写 plan 拼凑；校验失败时先修正完整草稿，确保只有一次成功的原子提交。不得包含 deliverable。

### 5. 验证与交付编译结果

1. 用 `finance_graph` 的 `compile_status` 按 runId 查询。只有原子 plan 已落图且编译 session 存在时才会返回 `status: "compiled"`；它不代表 prompt accepted，也不推断外部 Session 生命周期。
2. 用 `finance_graph` 的 `get` 抽查每个产物，确认 Host 已写入真实 contentHash、来源和关系完整；运行 `research_graph_query` 的 `audit`，不得新增悬空引用。
3. 返回 runId、revision、产物 id、采用/排除来源与证据缺口，并明确说“这是知识编译假说，不是最终研究报告”。是否继续由用户选择；不要自动启动 research/deep-research。

若 plan 未确认或状态查询超时，结果应报告为**未知**，不能把 accepted、prepare 成功或部分草稿说成 compiled。
