---
name: financial-data-rigor
description: >-
  金融数据获取、口径归一化、多源交叉验证与证据卡写入。用于行情、财报、共识、汇率或任何关键金融数字进入研究之前；强制时间截面、统一 metadata 与确定性计算。
---

# Financial Data Rigor

任何关键数字都必须可定位、可复算、可按历史时点重放。不能用“模型记得”“搜索摘要写着”代替原始证据。

## 硬边界

- 结构化外部行情通过 `finance_market_data` 的 `ingest` 接收；`fetch` 返回 NOT_IMPLEMENTED 时明确报告在线取数不可用，绝不编造报价。公开文档可用宿主已有网页/文件能力读取。
- 图谱使用 `finance_graph` 的 `get/search/plan/import_artifact` 与既有 `research_graph_*`；不新建 Store，不编造 provider、字段、endpoint 或返回值。
- DCF、comps、组合快照分别只使用 `finance_model` 的 `dcf/comps/portfolio`。其他差异率或换算仅使用宿主实际提供的确定性能力；没有支持时并列原值并标“未复算”，不得心算或另写引擎。
- 数值比较不等于因果解释。税项放大同比不等于它解释了全部变化；缺少连续且口径可比的经营证据时，只能写“不足以证明经营加速”，不能断言“非经营加速”，也不能仅因同比差异否定经营加速。
- 每个数据点先固定 `asOf`。历史研究只能使用 `availableAt <= asOf` 的证据；`fetchedAt` 较晚不会把后来才公开的信息变成当时可见。
- `availableAt` 不明的材料进入 quarantine，不得支持历史断言。不得用文件修改时间猜测发布时间。
- 本技能仅用于只读研究；不连接券商，不生成或执行订单，不自动交易或再平衡。
- 不读取或分发私有报告、账户、cookie、token 或其他凭据。

## 工作流

### 1. 固定标的与截面

用 `finance_graph` 的 `search/get` 或 `research_graph_query` 查已有 instrument，再通过原子 `plan` 创建缺失节点。记录市场、代码、币种、会计标准、财年和复权口径；同名公司与 ADR/原股不得混为同一标的。

### 2. 获取原始数据

优先公司/监管披露，其次有明确时间和口径的结构化 provider，再次高质量公开资料。保存原始输入或用户提供的公开材料，不先改写再丢弃原文。视频材料必须保留 segment 起止时间，使用 `video-deep-reader`。

### 3. 归一化，而不是抹平差异

逐项核对：财季/财年、单季/累计、LTM/NTM、实际/预测；金额和股数单位；币种与汇率时点；GAAP/non-GAAP、diluted/basic、合并/母公司；当前实际价格与历史复权序列、ADR 比率。

不同口径不是互相“验证”。先转换成同口径；无法转换就并列展示并降低置信度。

### 4. 建证据卡并交叉验证

按 `../finance-source-ingest/references/evidence-card.md` 建卡。转载同一 provider 只算一个来源。关键数字至少由一个原始披露加一个真正独立来源核对；只有单一来源时明确标记。

不得机械地把 1% 当成所有指标的普适容差：零值、比率、百分点、极小数和不同会计口径分别处理。没有适用的确定性计算能力时不输出差异率；重大差异回到原始披露，禁止静默取平均。

### 5. 写入图谱

QuantMind/DSA ResearchArtifact 用 `finance_graph` 的 `import_artifact`；其他 source/raw/claim/instrument 和 cite/supports/contradicts 关系用一个原子 `plan` 写入。冲突证据并存，不覆盖旧证据。最终以 `finance_briefing` 的 `record` 或图谱 deliverable 记录截面、缺口、冲突与复算记录。

保存核验 deliverable 时，`metadata.sessionId` 只使用宿主明确提供的当前 DSH conversation id（如启动提示中的 `Current DSH conversation`）；这是原生对话身份，不是图谱 session 节点 id。source/raw 的导入 session 只记录材料导入，不能作为本次核验报告的生产者；不因它已经存在就复用，也不得改写旧导入 session 的身份。

需要 `session -[produces]-> deliverable` 时，先以真实 DSH conversation id 用 `finance_graph` 的 `search`（`kinds: ["session"]`）查找，再 `get` 核实唯一候选的 `metadata.sessionId` 与当前对话完全一致。没有匹配时，在本次同一 plan 的 `nodes` 中新增一个显式且不冲突 id 的 `kind: "session"` 图谱记录，记录真实 `metadata.sessionId` 和本轮 `runId`；它仅描述已有真实对话，不创建或冒称新的 Host 会话。未获得真实对话 id、匹配不唯一或无法确认身份时，停止要求该生产关系的图谱提交并说明缺口，不能借用其他 session 凑边。

一次提交前组齐完整 deliverable、必要的新 session 节点、实际读取 source/raw 的 `cite` 及 `produces`；`produces.from` 必须是上述已核实或同次新增的 session 图谱 id，`to` 是本次 deliverable id，不能只写 metadata 代替边。提交前检查实际请求含这些 nodes/edges，提交后以真实响应和读回结果核对生产者身份；若已经分次补边，如实报告，不把最终补齐称为过去一次原子提交。

最终对话默认给自然语言核验结论、必要的口径/证据缺口和实际可打开的产物入口，正文不超过 250 个 Unicode 字符，遵守用户更具体的正文与字数要求。对本地已实际写入的文件，用 Markdown 可点击链接提供产物入口，不只给纯路径。内部 ID、哈希、JSON 和 plan/audit 明细保留在 metadata 或核验记录，只有用户要求追溯或排查时才展示；省略技术字段不能减少实际来源和图谱关系。

更新会替换完整 metadata，因此先读取旧节点，保留已有合法字段，再合并本次变更。

## 交付前检查

- 每个关键数字都有 provider、asOf、availableAt、fetchedAt、contentHash、runId、provenance。
- 所有时间均为带时区的 ISO 8601；所有数值均带单位、币种和期间。
- 任一 `availableAt > asOf` 的证据均未参与历史结论。
- DCF/comps/portfolio 都有对应 `finance_model` runId；其他指标没有伪造不存在的 model action。
- 图谱 `research_graph_query` 的 `audit` 无新增悬空引用。

## 来源与修改声明

本技能的多源核验思想参考 xbtlin/ai-berkshire 的 `financial-data`（MIT，固定版本见随包 `LICENSE`）。2026-10-30 由 dsh-research-graph 重写：移除上游私有工具调用，加入统一时间/metadata、图谱证据卡与 `finance_model` 约束。未迁移上游研究报告、账户数据或凭据。

## Host：原生财务面板写入

仅当用户明确要求为某个标的“整理财务面板”或等价动作，并且已有来源和标的均可确认时使用本节。普通财务问题、阅读财报或研究请求不等于授权写 UI 数据。

### 1. 先读，再决定节点

1. 用 `finance_graph.search/get` 按用户给出的 `symbol` 找 instrument；同时 `get` 用户选定或已导入的 `source` 与对应 `raw`。
2. 只有一个 instrument 的 `metadata.symbol`、`metadata.ticker` 或 `metadata.instrument.symbol` 精确匹配时，更新该节点。多个匹配、来源与标的对不上或无法唯一定位时停止并报告，不猜 id。
3. 没有 instrument 时，才可在用户已明确给出 symbol、发行人和币种的情况下创建新节点：`kind` 必须为 `instrument`，`id` 使用当前图中不冲突的明确 id，`metadata.symbol` 必须来自真实标的信息。不得用 source/raw/claim 冒充 instrument。
4. 更新已有 instrument 属完整 upsert：先保留其完整 `title`、`content` 和全部已有合法 metadata，再合并本次字段；不能只发送 `financials` 而丢掉 watchlist 等旧字段。
5. 参与面板的来源必须同时满足 `source.metadata.asOf <= 请求的 asOf` 与 `source.metadata.availableAt <= 请求的 asOf`。期间结束日不是发布时间；不得把后来披露的财报倒填进更早截面。

### 2. StockSections 接受的财务外形

`instrument.metadata.financials` 使用：

```text
{unit, currency, annual[], quarter[], ttm[]}
```

- `unit` 必填，只使用 `thousands | millions | billions`；`currency` 必填，使用真实 ISO 币种。
- `annual`、`quarter`、`ttm` 都是数组。每个 period 只写 `{id, label, values, sourceId}`；`sourceId` 必须是本轮实际读取、且通过时间门的 source 节点 id。
- `values` 中只放来源披露或 Host 可确定性复算的有限数值。金额按 `unit` 统一；百分比类比率写成 0–100 的百分数数值，例如 `7.94` 表示 `7.94%`、`47.18` 表示 `47.18%`，不能写成 `0.0794` 或 `0.4718`。百分点只用于两个百分数之差或增长贡献，并须单独说明为 pp。EPS 保持“币种/股”，例如 `1.85` 表示 `US$1.85/share`，不能按 millions 缩放。
- 现金流出保持原符号，例如 capex 现金支出写负数。没有来源的值省略；不得用 `0`、演示值或估算值填空。来源没有 TTM 时写 `ttm: []`，不得由季度相加臆造。
- UI 显示键为：`income`：`revenue,costOfRevenue,grossProfit,operatingExpenses,operatingIncome,pretaxIncome,netIncome,dilutedEPS`；`balance`：`totalAssets,currentAssets,cash,receivables,inventory,totalLiabilities,currentLiabilities,totalDebt,equity`；`cashFlow`：`operatingCashFlow,capex,freeCashFlow,investingCashFlow,financingCashFlow,netCashChange`；`segments`：`iphoneRevenue,macRevenue,ipadRevenue,wearablesRevenue,servicesRevenue,activeDevices,paidSubscriptions`；`adjusted`：`adjustedRevenue,adjustedGrossProfit,adjustedOperatingIncome,adjustedNetIncome,adjustedEPS`；`ratios`：`grossMargin,operatingMargin,netMargin,currentRatio,debtToEquity,returnOnEquity,peRatio,priceToSales`。`keyStats` 还显示 `marketCap,enterpriseValue,ebitda,ebitdaMargin,revenueGrowth,epsGrowth` 等字段。
- 只写真实口径。GAAP、non-GAAP 和 adjusted 字段不得互相代填；防止重复列示。没有价格来源时不写 `marketCap`、`enterpriseValue`、`peRatio`、`priceToSales`；没有真实预测/卖方证据时不写任何 consensus、target 或 valuation 字段。

### 3. 确定性复算

直接披露值逐项取自已读取的 `raw` 或 `source.data`。同比和比率必须在当前模型回合使用 Host 计算能力或短脚本计算，并保留公式；不要心算，也不要在代码中用正则或文本模板猜财务语义。例如：

- `revenueGrowth = (currentRevenue / priorRevenue - 1) * 100`
- `grossMargin = grossProfit / revenue * 100`
- capex 已按负数存储时，`freeCashFlow = operatingCashFlow + capex`

将每个派生字段按期间逐条写入同一 instrument 的 `metadata.financialsProvenance.derivations`。每条记录必须同时给出：

- `periodId`：该派生值在 `financials.annual/quarter/ttm` 中所属的 period id。
- `key`：该派生值在对应 period `values` 中的字段名。
- `inputs`：公式实际使用的全部有限数值输入。键名写成 `<sourcePeriodId>.<sourceField>`；如果输入复用另一个期间的披露值，必须显式保留真实来源期间，不能因为展示期间相同就省略。
- `formula`：只使用 `inputs` 键名和数值常量的确定性表达式。
- `result`：按公式和数值单位得到、并已按写入精度舍入的结果。

覆盖规则：

- 每个已写入 `values` 的非直接披露字段都必须有且只有一条与该 `periodId + key` 完全匹配的 derivation。不能因为 annual 与 Q4 使用同一张期末资产负债表，就省略 Q4 的独立记录。
- 例如 Q4 的 `totalDebt` 仍要单独记录；若商业票据、短期 term debt 和长期 term debt 复用同日期 annual balance，则 inputs 使用该 balance period id 与实际字段名组成的键，而 derivation 的 `periodId` 写 Q4 的 period id。
- 没有写入的派生字段不需要空白 derivation；不能为了凑覆盖先写值再补记录。

最小记录形状：

```text
{periodId:"<reportedPeriodId>", key:"totalDebt", inputs:{"<balanceSourcePeriodId>.commercialPaper":"<finite source value>", "<balanceSourcePeriodId>.currentTermDebt":"<finite source value>", "<balanceSourcePeriodId>.nonCurrentTermDebt":"<finite source value>"}, formula:"<formula over the input keys>", result:"<deterministically rounded result>"}
```

以上尖括号内容是结构占位，不是可提交值。

Q4 比率只能在该期间有相应原始依据且公式语义成立时写入：单季利润率使用单季损益表；点时 `currentRatio`、`debtToEquity` 可使用同日期末资产负债表；增长率必须使用可比的 prior-period 输入。若季度 `returnOnEquity` 没有明确的年化或来源口径，就省略该值及 derivation，不得把 annual ROE 倒填到 Q4，也不得把未年化单季 ROE 当作年度 ROE。

提交前做纯机械检查：从各 period `values` 找出所有预先定义的非直接披露字段，按 `periodId + key` 与 derivations 做一一匹配；检查 `inputs` 均为有限数值且每个键带有真实来源期间，`formula` 只引用 inputs/常量，`result` 与 `values` 和确定性重算完全一致。代码只负责这些存在性、覆盖和数值校验；财务字段语义、期间选择、GAAP/adjusted 口径以及是否具备原始依据仍由提示和模型判断，禁止用正则或字段名猜财务含义。

`sourceContentHash` 原样记录来源节点 `metadata.contentHash`；它是 Host 对完整 raw 内容生成的 canonical SHA-256。不得用 HTML/PDF/抽取文本的文件哈希、source 节点 URL 的哈希或 instrument 自身哈希替换它。若已有 instrument 自带 `contentHash`，原样保留。

原子 plan 只使用结构示意；所有 id、标题、原 metadata、来源字段、时间和 run provenance 都必须从本轮实际 `get` 结果与当前请求生成。

### 4. 一次原子 plan

用一次 `finance_graph` 调用同时写入完整 instrument upsert 和
`instrument -[cite]-> source` 关系。必须先 `get` 当前 instrument、source 和
raw，再生成 plan：

- instrument 的 `id`、`title`、`content` 取自当前 get；metadata 先完整保留当前 get 的全部合法字段，再合并本次字段。
- 每个 period 的 `sourceId` 取自本轮确认且通过时间门的 source id。
- `financialsProvenance.sourceContentHash` 原样取当前 source metadata 的 `contentHash`；`runId`、`asOf`、`availableAt`、`fetchedAt` 和 provider 取本轮真实请求与 source get，不沿用历史样例。
- `derivations` 按上一节为每个已写入的派生字段逐条生成，不得用一条 annual 记录代替 Q4。
- 同一个 plan 的 `nodes` 写完整 instrument upsert，`edges` 写本轮 `cite`，不得拆成两次写入。

以下是不可执行的形状示意；尖括号占位和说明文字都不能提交：

```text
{
  action: "plan",
  input: {
    nodes: [{
      id: "<instrument id from actual get>",
      kind: "instrument",
      title: "<current title from actual get>",
      content: "<current content from actual get>",
      metadata: {
        ...<all existing metadata from actual get>,
        currency: "<current request currency>",
        units: { financials: "<actual source unit>" },
        financials: { unit: "<actual unit>", currency: "<actual currency>", annual: [...], quarter: [...], ttm: [...] },
        financialsProvenance: {
          asOf: "<current request asOf>",
          sourceIds: ["<source id from actual get>"],
          sourceContentHash: "<source.metadata.contentHash from actual get>",
          runId: "<current run id>",
          derivations: [{
            periodId: "<period id>",
            key: "<written derived field>",
            inputs: { "<sourcePeriodId>.<sourceField>": "<finite source value>" },
            formula: "<formula over the input keys>",
            result: "<deterministically rounded result>"
          }]
        }
      }
    }],
    edges: [{
      from: "<same instrument id>",
      to: "<same source id>",
      kind: "cite",
      metadata: {
        sourceId: "<same source id>",
        sourceContentHash: "<same current source contentHash>",
        asOf: "<current request asOf>",
        availableAt: "<source.metadata.availableAt from actual get>",
        fetchedAt: "<current fetch time>",
        provider: "<source.metadata.provider from actual get>",
        runId: "<current run id>",
        provenance: { sourceRefs: ["<same source id>"] }
      }
    }]
  }
}
```

提交前替换全部占位，并核对：原 metadata 未丢；financial period、sourceId
和 hash 与当前 get 一致；每个派生值都有逐期间 derivation；`cite` 与完整
instrument 在同一 plan 中。提交后必须 `finance_graph.get` 读回同一
instrument，确认 kind、完整 metadata、期间、unit/currency、sourceId 时间门、
cite 边和 Host revision/diff。工具报错说明整个 plan 未提交；修正完整草稿
后重新提交，不拆节点和边，也不复制历史 run/source/hash 或写第二套 source/raw。
