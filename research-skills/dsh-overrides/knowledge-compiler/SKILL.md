---
name: knowledge-compiler
description: 将已入库、ready 且未越过时间门的 source/raw 编译为可继续研究的问题图谱。输入 runId/sourceIds/asOf，逐个读取真实原文和 locator，按证据可支持度生成 question、适用时的 claimType=hypothesis claim，以及适用时的 belief/signal，并用一次原子 finance_graph plan 提交；不生成最终研究报告。
---

# Knowledge Compiler

把证据材料编译成**可继续研究的问题与假说**，不是写最终报告。最终报告只能由用户随后明确选择 `research` 或 `deep-research` 生成；本技能不得创建 `deliverable`，不得把编译结果表述成研究终稿。

## 唯一运行边界

- 只在当前真实 DSH Session 中推理和调用 Host 工具。不得新建或调用第二个 LLM runtime、持久 Agent loop、私有 Store、子 Agent 或外部模型 API。
- Host 的 `compile_prepare` / `compile_status` 只做确定性图读取；它们不是模型，也不会代替本技能生成假说。
- 不写 vault、外部笔记或发布系统，不执行交易或下单，不用训练记忆补充来源中没有的数字或引语。
- 产品用户不需要了解 Host 的 TypeScript 源码。下面的工具信封、`GraphPlan` 外形和哈希规则就是运行时契约；直接按此执行，不要为寻找这些契约去扫描实现源码或整台机器。

## 输入与提问

```text
/knowledge-compiler
runId=<本次编译的真实运行 id>
sourceIds=<逗号分隔的 source 节点 id>
asOf=<ISO-8601 研究截面>
```

三个输入都必须显式存在。不要编造 runId、source id、asOf、DSH session id、provider、数字、阈值、引文或 locator。`sourceIds` 可以来自一次 ingest 的返回，但编译 runId 必须准确对应当前这次编译。

`asOf` 是用户要研究的历史信息截面，不是 Host 当前时间，也不是派生产物时间。当前任务应先用真实 host clock 取值再传入，不得为了跨过某个 `preparedAt`、`availableAt` 或校验门而选择未来时间；历史任务可以明确选择早于当前时间和 `preparedAt` 的截面。source/raw 的 `availableAt > asOf` 时必须拒绝或隔离，不能反向抬高用户的历史 `asOf`。

如果缺少资料选择或研究截止日，先用普通对话只问一个简短的中文问题，不展示表单，不要求用户理解内部字段名、节点 id 或时间格式。优先根据当前上下文给出可读日期并保留“指定其他日期”的空间，例如“昨天（10月31日）”或“今天（11月1日）”。

推荐措辞：

> 请告诉我要编译哪份已入库资料，以及截止到昨天（10月31日）、今天（11月1日）还是其他日期。

上面的具体日期只演示 2026-11-01 的写法。实际提问必须按当前时区和对话日期换成用户能直接读懂的说法，并允许用户回复其他自然日期。

不要问“sourceIds 是什么”“asOf 的 ISO-8601 值是什么”，也不要把 runId、session id 或工具 JSON 写进面向用户的问题。用户回答自然语言后，由当前 Session 在工具参数和审计记录中完成技术映射；无法映射或缺少真实值时停止，不得猜填。

## Host 工具信封

以下字段层级是精确契约：

- `finance_graph` 的 `plan`：顶层 `input` **就是** `GraphPlan`，即 `input: {nodes, edges}`；不存在 `input.plan`。
- `finance_graph` 的 `compile_prepare`：顶层 `input: {runId, sourceIds, asOf}`。
- `finance_graph` 的 `compile_status`：顶层 `input: {runId}`。

```json
{
  "action": "compile_prepare",
  "input": {
    "runId": "<runId>",
    "sourceIds": ["<sourceId>"],
    "asOf": "<asOf>"
  }
}
```

```json
{
  "action": "plan",
  "input": {
    "nodes": [],
    "edges": []
  }
}
```

```json
{
  "action": "compile_status",
  "input": {
    "runId": "<runId>"
  }
}
```

`get`、`search` 使用工具外层字段；`plan` 与两个 compile action 的数据都放在顶层 `input`。不要把这些形状互相混用。

## 流程

### 1. 只读准备与时间门

调用 `finance_graph` 的 `compile_prepare`，严格使用上面的工具信封。

保存返回的 `preparedAt`、`candidates` 与 `rejected`。只有 `candidates` 中的 source/raw 可以参与推理。`quarantined`、非 ready、缺失 raw/provenance、哈希不符、`availableAt > asOf` 或来源自身 `asOf` 越过截面的记录必须排除，并在最终结果中保留 rejected 原因；不得通过改用 capture 时间、删除时间字段或引用其他版本绕过。

`preparedAt` 是 Host 实际准备候选的时间。派生产物的 `availableAt` 使用这个真实值，不冒充原始材料的发布时间。

研究截面与产物可用时间是两条独立时间轴：`asOf` 记录本次研究采用的信息截止点；`preparedAt` / 派生 `availableAt` 记录产物实际生成并可用的时间。历史 `asOf` 早于 `preparedAt` 是正常情况，不必也不得通过把 `asOf` 调到未来来消除差。只有在所有真实时间都合法时，才可把派生 `availableAt` 写成 Host 返回的实际 `preparedAt`。

### 2. 逐个读取真实内容，再搜索反证

对每个 candidate 按顺序执行，而不是只凭标题或摘要生成结论：

1. 用 `finance_graph` 的 `get` 读取完整 `sourceId`，再用 `get` 读取完整 `rawId`；有 `captureId` 时也读取 capture。核对 raw 正文、contentHash、provider、availableAt/asOf、provenance 与 locators。
2. 用 `finance_graph` 的 `search` 带同一 `asOf` 搜索相关既有 question/claim/belief/signal 和可能相反的材料。凡实际用于论证或判重的 search hit，都必须再 `get` 完整节点后才能引用。
3. 记录实际使用的精确 locator。没有页码/segment 等细粒度 locator 时，只能引用真实 raw 节点并明确“全文”，不得虚构页码、段落、表格或时间戳。

search/get 都是只读步骤。不得把 prepare 返回之外的 source/raw 偷换进本次 sourceIds；如需补充新证据，应先另走 `finance-source-ingest`，再由用户决定是否发起新的编译 run。

### 3. 形成问题与假说

- 至少建立一个具体 `question`。只有来源能支持可直接检验的世界命题时才建 `claim`；证据不足、口径限制或算术说明留在 question/session 正文。若无法在不发明阈值的情况下给出 `killCriteria`，也保留为待查 question。每个实际 claim 的 `metadata.claimType` 必须是 `hypothesis`。
- 只有证据支持当前解释时才建 `belief`；只有存在可跟踪、可失效的信号时才建 `signal`。不适用时不强行补齐。
- 区分原文事实、来源作者观点与当前 Session 的分析推断。转载、同源 PR 或同一上游数据不算独立验证。
- 主动保留支持与反对证据；证据不足时降低 confidence 或明确不建 claim，不把假设写成事实。

#### 内容保真最小约束

- 时间范围按明确起止点判断交集与包含；重叠或同现不等于包含。没有精确边界时，不得写成期间内、已完成或完整观察。
- 绝对额、存量或记录不等于同比增速、销量、收入贡献或因果驱动；缺少对应证据时列为待查，不写成事实或解释前提。
- 经验 `killCriteria` 只用于可被检验的世界 claim/预测；必须直接否定同一精确命题，并写明证据范围与观察期。允许未来数据按下述观察期否证预测；但后续证据不能改写“当时材料不足以判断”的历史充分性结论。
- 比较指标须写明完整分子、分母和基期。`signal` 的观察期须覆盖 `killCriteria` 所需的全部期间。阈值只能来自来源或用户任务；无依据时不得制造阈值，应写待查或一个简洁问题。

每个 claim 必须在节点 `metadata` 中包含：

```json
{
  "claimType": "hypothesis",
  "killCriteria": ["可观察、直接否定同一命题；数据范围及任何阈值须有来源或用户依据"],
  "confidence": {
    "level": "low|medium|high",
    "rationale": "基于实际证据覆盖、可靠性和独立性的理由"
  },
  "evidence": [
    {
      "sourceId": "<sourceId>",
      "rawId": "<rawId>",
      "locator": "<真实 locator 或“全文”>",
      "relation": "supports|contradicts|cite",
      "reliability": { "level": "low|medium|high", "rationale": "为什么可信或不可信" },
      "independence": { "group": "<真实上游/转载组>", "rationale": "与其他证据是否同源、为何独立" }
    }
  ]
}
```

belief/signal 适用时同样保留 killCriteria、confidence 和 evidence 评估。confidence 默认使用上述定性等级及理由；没有校准依据时不得制造精确百分比、收益率、目标价或其他数字。

`metadata.evidence` 是证据说明，不会自动生成图谱关系。对其中每一条 `relation: "supports"` 或 `relation: "contradicts"`，同一次成功提交的 GraphPlan 必须包含对应方向的 typed edge：`<rawId> -[supports]-> <claimId>` 或 `<rawId> -[contradicts]-> <claimId>`。不能在 metadata 中声明关系却只在图里写 `cite` / `derived_from`；也不能为了补齐关系凭空制造反证。多条 locator 复用同一 raw/claim/relation 时可落一条边，详细依据仍保留在 metadata。

### 4. 组装单次原子 GraphPlan

实际 Host `GraphPlan` 只有两个字段：

```text
GraphPlan = {
  nodes: Array<{id, kind, title, content, metadata}>,
  edges?: Array<{from, to, kind, metadata}>
}
```

`nodes` 必有，`edges` 写入时使用数组。节点 id 必须非空且同一 plan 内唯一；边的端点必须存在于完整图的最终节点集合中，`from` 与 `to` 不能相同，同一 `(from, to, kind)` 不能重复。边 id 由 Host 推导，模型不要填写。

所有新节点使用确定性的显式 id，例如 `question:compile:<runId>:q1`、`claim:compile:<runId>:h1`、`belief:compile:<runId>:b1`、`signal:compile:<runId>:s1`，并创建一个 `session:compile:<runId>` 节点。session 的 `metadata.status` 为 `compiled`，正文只记录本次实际输入、采用/排除项和产物索引，不写报告。

下面是一个**完整的最小 `plan.input` 契约骨架**。尖括号值只表示必须替换为真实值，不是可提交的 id、时间、locator 或事实；按实际证据删改内容与关系，不要照抄成虚构来源。

```json
{
  "nodes": [
    {
      "id": "session:compile:<runId>",
      "kind": "session",
      "title": "知识编译会话 <runId>",
      "content": "# 知识编译会话\n\n- compileRunId：<runId>\n- asOf：<asOf>\n- preparedAt：<preparedAt>\n- 采用：<实际采用的 sourceId/rawId 与理由>\n- 排除：<实际 rejected 原因与证据缺口>\n- 产物：<本次实际创建的 question/claim/belief/signal id>",
      "metadata": {
        "compileRunId": "<runId>",
        "runId": "<runId>",
        "provider": "knowledge-compiler",
        "asOf": "<asOf>",
        "availableAt": "<preparedAt>",
        "status": "compiled",
        "provenance": {
          "compiler": "knowledge-compiler",
          "sourceRefs": ["<sourceId>"],
          "rawRefs": ["<rawId>"],
          "locators": ["<真实 locator 或“全文”>"]
        }
      }
    },
    {
      "id": "question:compile:<runId>:q1",
      "kind": "question",
      "title": "<具体、可回答的问题；注明 asOf 证据边界>",
      "content": "<问题正文；区分已知事实、未知项与判断边界>",
      "metadata": {
        "compileRunId": "<runId>",
        "runId": "<runId>",
        "provider": "knowledge-compiler",
        "asOf": "<asOf>",
        "availableAt": "<preparedAt>",
        "provenance": {
          "compiler": "knowledge-compiler",
          "sourceRefs": ["<sourceId>"],
          "rawRefs": ["<rawId>"],
          "locators": ["<真实 locator 或“全文”>"]
        }
      }
    },
    {
      "id": "claim:compile:<runId>:h1",
      "kind": "claim",
      "title": "<可证伪的假说>",
      "content": "<假说正文；分开原文事实、推断与反证>",
      "metadata": {
        "compileRunId": "<runId>",
        "runId": "<runId>",
        "provider": "knowledge-compiler",
        "asOf": "<asOf>",
        "availableAt": "<preparedAt>",
        "claimType": "hypothesis",
        "killCriteria": ["<可观察的失效条件>"],
        "confidence": {
          "level": "low",
          "rationale": "<基于真实证据覆盖、可靠性和独立性的理由>"
        },
        "evidence": [
          {
            "sourceId": "<sourceId>",
            "rawId": "<rawId>",
            "locator": "<真实 locator 或“全文”>",
            "relation": "supports",
            "reliability": {
              "level": "medium",
              "rationale": "<真实可靠性理由>"
            },
            "independence": {
              "group": "<真实上游/转载组>",
              "rationale": "<真实独立性理由>"
            }
          }
        ],
        "provenance": {
          "compiler": "knowledge-compiler",
          "sourceRefs": ["<sourceId>"],
          "rawRefs": ["<rawId>"],
          "locators": ["<真实 locator 或“全文”>"]
        }
      }
    }
  ],
  "edges": [
    {
      "from": "session:compile:<runId>",
      "to": "question:compile:<runId>:q1",
      "kind": "produces",
      "metadata": {
        "compileRunId": "<runId>",
        "runId": "<runId>",
        "provider": "knowledge-compiler",
        "asOf": "<asOf>",
        "availableAt": "<preparedAt>",
        "provenance": {
          "compiler": "knowledge-compiler",
          "sourceRefs": ["<sourceId>"],
          "rawRefs": ["<rawId>"],
          "locators": ["<真实 locator 或“全文”>"]
        }
      }
    },
    {
      "from": "session:compile:<runId>",
      "to": "claim:compile:<runId>:h1",
      "kind": "produces",
      "metadata": {
        "compileRunId": "<runId>",
        "runId": "<runId>",
        "provider": "knowledge-compiler",
        "asOf": "<asOf>",
        "availableAt": "<preparedAt>",
        "provenance": {
          "compiler": "knowledge-compiler",
          "sourceRefs": ["<sourceId>"],
          "rawRefs": ["<rawId>"],
          "locators": ["<真实 locator 或“全文”>"]
        }
      }
    },
    {
      "from": "claim:compile:<runId>:h1",
      "to": "question:compile:<runId>:q1",
      "kind": "answers",
      "metadata": {
        "compileRunId": "<runId>",
        "runId": "<runId>",
        "provider": "knowledge-compiler",
        "asOf": "<asOf>",
        "availableAt": "<preparedAt>",
        "provenance": {
          "compiler": "knowledge-compiler",
          "sourceRefs": ["<sourceId>"],
          "rawRefs": ["<rawId>"],
          "locators": ["<真实 locator 或“全文”>"]
        }
      }
    },
    {
      "from": "claim:compile:<runId>:h1",
      "to": "<sourceId>",
      "kind": "cite",
      "metadata": {
        "compileRunId": "<runId>",
        "runId": "<runId>",
        "provider": "knowledge-compiler",
        "asOf": "<asOf>",
        "availableAt": "<preparedAt>",
        "provenance": {
          "compiler": "knowledge-compiler",
          "sourceRefs": ["<sourceId>"],
          "rawRefs": ["<rawId>"],
          "locators": ["<真实 locator 或“全文”>"]
        }
      }
    },
    {
      "from": "claim:compile:<runId>:h1",
      "to": "<rawId>",
      "kind": "cite",
      "metadata": {
        "compileRunId": "<runId>",
        "runId": "<runId>",
        "provider": "knowledge-compiler",
        "asOf": "<asOf>",
        "availableAt": "<preparedAt>",
        "provenance": {
          "compiler": "knowledge-compiler",
          "sourceRefs": ["<sourceId>"],
          "rawRefs": ["<rawId>"],
          "locators": ["<真实 locator 或“全文”>"]
        }
      }
    },
    {
      "from": "<rawId>",
      "to": "claim:compile:<runId>:h1",
      "kind": "supports",
      "metadata": {
        "compileRunId": "<runId>",
        "runId": "<runId>",
        "provider": "knowledge-compiler",
        "asOf": "<asOf>",
        "availableAt": "<preparedAt>",
        "provenance": {
          "compiler": "knowledge-compiler",
          "sourceRefs": ["<sourceId>"],
          "rawRefs": ["<rawId>"],
          "locators": ["<真实 locator 或“全文”>"]
        }
      }
    },
    {
      "from": "claim:compile:<runId>:h1",
      "to": "<rawId>",
      "kind": "derived_from",
      "metadata": {
        "compileRunId": "<runId>",
        "runId": "<runId>",
        "provider": "knowledge-compiler",
        "asOf": "<asOf>",
        "availableAt": "<preparedAt>",
        "provenance": {
          "compiler": "knowledge-compiler",
          "sourceRefs": ["<sourceId>"],
          "rawRefs": ["<rawId>"],
          "locators": ["<真实 locator 或“全文”>"]
        }
      }
    }
  ]
}
```

如创建 belief/signal，在 `nodes` 中加入对应节点，并为 session 增加 `produces` 边；belief/signal 使用 `derived_from` 连接实际上游 claim/belief，按需增加真实的 `cite`。只有真实成立的证据关系才建立 `supports` / `contradicts`，不得为了凑模板制造冲突；一旦在 `metadata.evidence` 中声明，它们必须在同一 GraphPlan 中有对应 typed edge。

每个新节点和每条新边的 metadata 都必须包含：

- `compileRunId` 与 `runId`：都等于输入 runId；
- `provider`: `knowledge-compiler`；
- `asOf`: 输入研究截面；
- `availableAt`: 本次 prepare 的真实 `preparedAt`；
- `provenance`: 至少含真实 `sourceRefs`、使用的 raw/locator 和 `compiler: "knowledge-compiler"`；
- `provenance.dshSessionId`: **仅当当前 DSH Session 的真实 id 已由宿主明确提供时**写入；无法获得就省略，禁止占位或猜测。

关系方向不得颠倒：

- `claim -[answers]-> question`；
- `claim/belief/signal -[cite]-> source/raw`；
- `raw -[supports|contradicts]-> claim`；
- `claim -[derived_from]-> raw`，belief/signal 用 `derived_from` 连接其实际上游 claim/belief；
- `session:compile:<runId> -[produces]-> 本次每个 question/claim/belief/signal`。

#### contentHash 的 Host 规则

模型**不要手算、填写或猜测 `contentHash`**，也从来源节点复制一个与派生节点内容无关的 hash。只要 plan 中有 `compileRunId`，现有 Host 会在原子提交前确定性补全并校验它：

- 节点 hash subject 是 `{id, kind, title, content}`，其中缺省 content 按空字符串；
- 边 hash subject 是 `{from, to, kind}`；
- 实际摘要对象是 `{...subject, metadata: metadataWithoutContentHash}`；
- canonical JSON 会递归按对象 key 排序，数组顺序保持不变，再用无空白的 `JSON.stringify` 序列化；
- 摘要为 `sha256:` 加该 UTF-8 JSON 的 SHA-256 十六进制结果。

如果自行提供一个错误 hash，Host 会拒绝整个 plan。最安全且与契约一致的做法是省略 `contentHash`，交给 Host 写入。以上算法只用于审计理解，不是要求模型在生成 plan 时执行。

校验还要求：同一 plan 只能有一个 `compileRunId`，且 plan 内每一个节点和边都必须带它；claim 的 `claimType` 必须为 `hypothesis`。`metadata.references` 只列真实存在或同一 plan 中创建的节点。

把全部 session/question/claim/belief/signal 与边放进**一个** `finance_graph` 的 `plan` 调用，外层使用 `action: "plan"`、`input: <上述 GraphPlan>`。不得用逐节点 create、逐边 add 或第二次写 plan 拼凑；校验失败时先修正完整草稿，确保只有一次成功的原子提交。不得包含 deliverable。

### 5. 验证与交付编译结果

1. 用 `finance_graph` 的 `compile_status`，向顶层 `input` 传入 `{runId}`。只有原子 plan 已落图且编译 session 存在时才会返回 `status: "compiled"`；它不代表 prompt accepted，也不推断外部 Session 生命周期。
2. 用 `finance_graph` 的 `get` 抽查每个产物，确认 Host 已写入真实 contentHash、来源和关系完整；逐项核对 `metadata.evidence` 的 supports/contradicts 与同次 plan 的 raw→claim typed edge 一一对应。运行 `research_graph_query` 的 `audit`，不得新增悬空引用。
3. 返回 runId、revision、产物 id、采用/排除来源与证据缺口，并明确说“这是知识编译假说，不是最终研究报告”。是否继续由用户选择；不要自动启动 research/deep-research。

若 plan 未确认或状态查询超时，结果应报告为**未知**，不能把 accepted、prepare 成功或部分草稿说成 compiled。
