---
name: wiki-think
description: 投研思考引擎，两种图谱模式。编织：调用 knowledge-compiler 把 ready source/raw 提炼成问题和假说。审视：围绕已有 signal/claim 主动寻找支持与反证、检查可靠性独立性并更新假说。触发词：编译知识 / think loop / 处理 raw / 审视 / 验证 signal。
---

# Wiki Think

两种思维模式都只在 DSH research graph 工作：**编织证据，审视假说**。不再读取或写入私有 vault、`raw/` 文件树、ENVISION、_log 或 _nav，不生成交易/下单指令。

## 确认门控

任何疑似触发都先让用户选择：

1. **编织** — 将已入库 ready source/raw 交给 `knowledge-compiler`。
2. **审视** — 围绕一个已有 signal/claim 检查证据与反证。
3. 跳过。

用户已明确给出模式与目标时无需重复确认。两种模式都只使用当前真实 DSH Session；不得新建第二 LLM runtime、持久 Agent loop、私有 Store 或外部文件知识库。

## 模式一：编织

1. 新材料必须先按 `../finance-source-ingest/SKILL.md` 入库，取得真实 ingest runId、source/raw 的 availableAt 和 sourceIds。缺失 availableAt、quarantined、future、hash/provenance 不完整或没有关联 raw 的材料不得进入。
2. 另行确定研究截面 `asOf`，不要把它和 ingest 时间或派生产物 `availableAt` 混成同一个值。当前任务先读取真实 host clock；历史任务可以明确选择更早截面。source/raw 的 availableAt 晚于用户历史截面时拒绝或隔离，不得为了通过时间门把 asOf 改到未来。输入新的真实编译 runId、ready sourceIds 和该 asOf，完整执行 `../knowledge-compiler/SKILL.md`。不要另写一套文件编译流程。
3. 逐个 `finance_graph get` 原文与 locator 后再判断 surprise、fact/view、credibility 和独立性。没有增量的材料可以排除并说明原因，但不要修改或删除原始 source/raw。
4. 产出仅为 question、`claimType=hypothesis` 的 claim，以及适用时的 belief/signal；使用一次原子 `finance_graph plan` 和 compile metadata。`metadata.evidence` 中只要声明实际 supports/contradicts，同次 plan 就必须写入对应的 `raw -[supports|contradicts]-> claim` typed edge；不能只有 metadata，也不能没有依据却制造反证。关系使用 answers/cite/supports/contradicts/derived_from/produces。

编织不是最终研究报告，不创建 deliverable。需要报告时由用户另选 research 或 deep-research。

## 模式二：审视

### 1. 读取与定位薄弱环节

用 `finance_graph` 的 `get` 读取目标 signal/claim 全文，再读取其 evidence、source/raw、相关 question/belief 与 supports/contradicts 边。用带 asOf 的 `search` 找既有相反证据，凡引用 search hit 必须再 `get`。确认当前假说、killCriteria、confidence 和证据独立性，不做没有原文依据的判断。

### 2. 主动寻找反证

围绕最薄弱且可证伪的一环寻找新公开材料。新材料只能经 `../finance-source-ingest/SKILL.md` 入库，并遵守同一 availableAt/asOf 时间门；未配置的 provider 或私有旧工具不可用时诚实报告，不用训练记忆补数字。

重点检查：scope/data/framework 矛盾、应该存在却缺失的证据、转载与同源造成的假独立。不得把多个转载当三角验证，也不得为凑 supports/contradicts 制造冲突。

### 3. 更新假说图谱

- 新证据只来自已 get 的 ready source/raw；记录真实 locator、reliability 与 independence。
- 更新 signal/belief 时保留原假说历史：新版本用显式 id 和 `supersedes` 连接旧版，旧版不删除；不得事后篡改旧预测或编造精确 confidence。
- killCriteria 必须可观察；数值阈值只能来自证据或明确标为待验证假设。
- 新 claim 仍为 `claimType=hypothesis`。若形成新的编译 run，所有新节点/边遵守 knowledge-compiler 的 compileRunId/runId/provider/asOf/availableAt/provenance/contentHash 契约，并用一次原子 `finance_graph plan` 提交。保留研究截面 `asOf` 与实际派生 `availableAt` 的区别；metadata 中声明的实际 supports/contradicts 必须有同次 plan 的 raw→claim typed edge。
- 运行 `research_graph_query` 的 `audit`，交付真实节点 id、revision、最强反方、证据缺口和仍待验证事项。

审视产物仍不是最终报告，不写 deliverable，不自动进入 research/deep-research。

## 分层加载

| 需要时 | 读什么 |
|---|---|
| 来源与原文标准 | `reference/source-standard.md` |
| signal/假说标准 | `reference/signal-standard.md` |
| 编译 session 复核记录 | `reference/reflect-standard.md` |
| 证据入库 | `../finance-source-ingest/SKILL.md` |
| 知识编译完整契约 | `../knowledge-compiler/SKILL.md` |
| 投资哲学 | `../_investment-philosophy.md` |

所有产出只用于研究和风险讨论，不生成或执行任何交易或下单指令。
