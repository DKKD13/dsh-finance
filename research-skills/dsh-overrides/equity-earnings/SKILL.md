---
name: equity-earnings
description: >-
  财报前瞻与财报后复核。用于 earnings preview、季度结果、beat/miss、指引与预测结算；冻结税前共识，避免事后信息泄漏，并产出图谱 deliverable。
---

# Equity Earnings

支持 `preview` 与 `review` 两种模式。先确认标的、财季、财报发布时间和研究截面；不把自然季度当作公司的财季。

详细方法与检查表见 `references/earnings-method.md`。

## 共同纪律

- 使用宿主现有只读 `finance_*` 数据工具和 `research_graph_*`，不假设未注册的 provider 或字段。
- DCF 与 comps 使用 `finance_model` 的真实动作；增长率、利润率、FCF、beat/miss 差值和单位换算等纯算术，通过宿主现有终端运行确定性脚本并保留公式、输入和输出，不虚构 `finance_model` 动作，也不凭模型心算。
- 数值比较不等于因果解释。税项放大同比不等于它解释了全部变化；缺少连续且口径可比的经营证据时，只能写“不足以证明经营加速”，不能断言“非经营加速”。
- 公司财年是否为 52 周，必须实际读取完整原页核实；只有片段或未经核实时，不补写“52 周”或据此断言期间一致。
- 每个关键事实符合 `../finance-source-ingest/references/evidence-card.md`，包括 provider/asOf/availableAt/fetchedAt/contentHash/runId/provenance。
- 财报发布之后的共识、修订、股价和 transcript 不得用于发布前预测。历史回测按当时的 availableAt 重放，而不是按数据库当前值重放。
- 不生成交易或下单指令。

## Preview：发布前

1. 用 `research_graph_node` / `research_graph_query` 读取 instrument、既有 valuation、claim、prediction 与 catalyst。
2. 固定 `asOf < releaseAvailableAt`，收集当时可见的此前财报、管理层指引、共识快照与行业指标。共识必须保存原始时间戳；无法证明是发布前的共识只能标为未知。
3. 列出 3-5 个关键指标及其口径：收入、EPS、利润率、FCF 和公司特定经营指标。区分 GAAP/non-GAAP、单季/累计和汇率。
4. 经 `finance_model` 生成 Bear/Base/Bull 数值情景。每个情景给出可证伪条件，不写目标仓位。
5. 创建 `prediction`，记录 metric、operator、expectedValue、confidence、asOf、dueAt 和输入 evidence ids。创建 `catalyst` 并以 `catalyzes` 连接 instrument。
6. 输出 preview `deliverable`，明确“这是发布前快照”，保存 runId 与所有输入哈希。

## Review：发布后

1. 先读取发布前 prediction 与 preview，不修改其原始值。获取实际 release、filing、presentation 和带时间戳 transcript；核对它们属于同一财季。
2. 仅用 release 当时的 availableAt 之前的共识计算 beat/miss。若无税前共识，报告实际值与自身预测差异，不补造“市场预期”。
3. 用 `finance_model` 返回绝对差、相对差和百分点变化；分母为零或口径不一致时不强行给百分比。
4. 把结果拆为价格/销量、一次性/持续性、公司/行业、实际/指引。管理层说法是 claim，不自动当事实；引用 transcript 必须带 segment 起止时间。
5. 到期 prediction 只能由实际可见证据结算。创建/更新实际结果对应的 `catalyst`，用 `catalyst -[resolves]-> prediction` 连接，metadata 记录 outcome、resolvedAt、evidenceNodeId 和误差模型 runId。未到期或证据不足仍为 pending，不能提前结算。
6. 若需更新估值，调用 `valuation-model` 完整重跑；若需比较论文，调用 `thesis-drift`。最终写入 review `deliverable`，保留 supersedes 链而不删除旧预测。

## 交付检查

财季与日期一致；共识是发布前快照；所有计算来自 `finance_model`；预测没有事后改写；transcript 引用有时间段；图谱关系与统一 metadata 完整；没有订单建议。

## Host：计算路由与交付

原始方法中的确定性计算要求保持成立。当前 Host 的 `finance_model` 只注册 `dcf`、`comps`、`portfolio` 三个 operation；本节只替换上文中“普通算术必须调用 finance_model”的工具路由，其余 source、时间、共识、prediction 和交付规则不变。不得调用不存在的 `growth`、`margin`、`variance`、`calc` 或类似 action，也不得把 DCF/comps 强行用于普通算术。

### 普通财务算术

同比、绝对差、相对差、百分点变化、毛利率/营业利润率/净利率、FCF、现金证券合计、债务合计、净现金、EPS 桥和其他非估值算术，使用当前 Host 实际可执行的 Python 或 JavaScript。脚本必须：

1. 接收从已读取 source/raw 取得的显式数值，以及明确单位、期间、GAAP/non-GAAP 口径；不得用正则或文本猜测财务语义。
2. 在源码或 stdout 中逐项打印 `key`、公式、输入、结果和单位；零分母、负基数、百分比与百分点、每股值与百万金额分别处理。
3. 用精确十进制输入（金额保留原始整数，EPS 保留原文小数位）；优先 Python `Decimal` 或等价精算方式。ratio 写百分数点，EPS 保持 currency/share。
4. 在写入报告前重读或 `cat` 脚本输出，并把每个采用结果及其公式、输入、单位和输出摘要写入报告；metadata 可另存 `provenance.calculations`。这是 Host 确定性计算，不是 `finance_model`，不得伪造 model runId。

只有实际执行 DCF、comps 或 portfolio 时才调用 `finance_model`，并严格使用对应 action/input。估值输入不足时停止估值，不为凑工具调用把收入、利润率或 FCF 塞进这些 schema。

### Preview 数值情景

Bear/Base/Bull 和共识/自身 prediction 的差值也走上述确定性脚本。情景假设必须来自用户明确输入、已入库预测或发布前可核来源；报告把它们标为 `self scenario`，不得冒充 consensus。没有真实依据时，不生成价格、release date、dueAt、probability 或 confidence，不创建对应 prediction/catalyst；只保留可证伪的文字条件与数据缺口。已有真实 confidence/dueAt 才按原值记录。

### Review 与 report

review 报告先给可比/不可比结论，再给 actual、发布前 consensus、原始 prediction、普通算术结果、驱动拆分、缺口。没有发布前可核验共识就标“未知/不可比”，不判 beat/miss；缺资料不能填零、写“不变”或写成负 surprise。预测结算只使用真实 outcome 与证据。

提交图谱时使用精确 `finance_briefing`：

```json
{"action":"record","input":{"id":"deliverable:<stable-id>","title":"<report title>","content":"<complete Markdown>","references":["<actually-read source/raw id>"],"metadata":{"provider":"<actual provider>","asOf":"<research cutoff>","availableAt":"<actual-clock-after-content-finalized>","fetchedAt":"<actual-clock>","runId":"<only-if-provided>","sessionId":"<only-if-provided>","provenance":{"sourceRefs":["<actually-read node ids>"],"calculations":[],"localArtifact":{"path":"<earnings path>","contentSha256":"<file sha>"}}}}}
```

尖括号是外形占位符，不是事实。先确认正文，再实际读取时钟并填新的 `availableAt`/`fetchedAt`；不得把历史 release 时间或 `asOf` 倒填成生成时间。真实 runId/sessionId 缺失时省略并记录缺口。省略 `metadata.contentHash`，让 Host 对完整 record 输入生成 canonical hash；本地 Markdown 文件 hash 只放 `provenance.localArtifact.contentSha256`。`finance_briefing.record` 只创建 deliverable 与 `metadata.references`，不会自动创建 `cite` 边；需要显式关系时再用合法 graph action 写入实际 `deliverable -[cite]-> source/raw`，并运行 audit。提交后用 `finance_graph` 的 `get` 读取 deliverable，比对正文、references、metadata 和时间字段；回读不一致时不得声称成功。
