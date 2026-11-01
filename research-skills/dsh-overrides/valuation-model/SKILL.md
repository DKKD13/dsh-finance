---
name: valuation-model
description: >-
  可复算的 DCF、反向 DCF 与可比公司估值。用于内在价值、三情景、WACC、敏感性和股权桥；所有计算只能由确定性 finance_model 执行并写入 valuation 图谱节点。
---

# Valuation Model

先读 `references/dcf-method.md`。估值是把证据转成假设，再由同一个确定性模型复算，不是让 LLM 编一个目标价。

## 不可谈判的规则

1. **唯一估值入口**：DCF 与 comps 分别只调用 `finance_model` 的 `dcf` / `comps`。不可用 LLM 心算、临时 Python、Excel 公式或另一个估值引擎替代；schema 不支持的方法明确不执行。
2. **时间截面**：输入必须满足 `availableAt <= asOf`。历史估值不能使用事后财报、事后共识或当前股价；fetchedAt 不能替代 availableAt。
3. **输入与假设分离**：历史实际值、市场价格、用户假设、模型输出分别标记。WACC 若仅为 schema 输入，就标为假设，不能声称由模型从 CAPM 推导。
4. **不修正系数造假**：Bear/Base/Bull 必须对应不同经营故事，场景 probability 合计为 1；不能只把同一个故事机械乘系数。
5. **只研究不交易**：输出估值区间、风险和待验证项，不输出或执行任何订单。

## 工作流

### 1. 定义标的与估值日

用 `finance_graph` 的 `search/get` 或 `research_graph_*` 读取 instrument。确认币种、财务/股数单位、财年、netDebt=debt-cash、sharesOutstanding 和价格日期。

### 2. 收集并冻结输入

外部结构化数据通过 `finance_market_data` 的 `ingest` 接收；`fetch` 不可用时保留缺口。公开财报和可比材料按 `financial-data-rigor` 归一化，按 `../finance-source-ingest/references/evidence-card.md` 溯源。缺输入时留白，不拿训练记忆填数。

### 3. 选择方法

- 有可持续 FCFF：调用 dcf，必要时用 comps 交叉检查。
- 高增长：准备分阶段 revenue/ebit/cash-flow schedules；可用多次确定性 dcf 调用做反推，但没有独立 reverse-dcf action 时不宣称有。
- 亏损早期或周期极端：以 comps/正常化情景为主，不强行 perpetuity DCF。
- 银行、保险等金融企业：不用普通 FCFF/WACC 模板；schema 不支持就不算。

### 4. 提交确定性模型

`dcf` input 按实际 schema 提供 instrument、currency、units、sharesOutstanding、scenarios 与可选 sensitivity。每个 scenario 提供 name/probability/wacc/terminalGrowth/taxRate 及 incomeStatement、cashFlowStatement、balanceSheet。模型返回 afterTaxEbit、FCFF、折现因子、terminal value、EV、equityValue、perShare 和 warnings。

`comps` input 提供 targetMetric、basis、peers、netDebt/sharesOutstanding（按方法需要）与统一 metadata。保存 runId/contentHash；同一输入必须得到同一输出。失败就修正输入并完整重跑，不手工改结果。

报告必须区分 `targetMetric` 的指标金额、币种与规模，`sharesOutstanding` 的股数单位，以及 `peers.multiple` 的倍数；只有倍数写“×”，不能把指标金额写成倍数。每股结果明确写币种/股，美元写 `USD/股`；金额与股数的规模须与实际模型输入一致。

### 5. 审查经济含义

检查 terminal growth < WACC、概率合计、稳态再投资与增长一致、股数/现金/债务单位一致、netDebt 符号、终值折现时点一致、敏感性轴包含 Base 且中心值一致。终值占比只是诊断，不用武断区间替代分析。

comps 必须区分 enterprise/equity basis、trailing/forward、GAAP/non-GAAP 与不同财年；目标 instrument 不得进入自己的 peer median。

### 6. 写入图谱

`finance_model` 已原子写入 valuation 与 `valuation -[values]-> instrument`，不要重复创建一套估值关系。相关结论用 `finance_graph` 的原子 `plan` 写 claim/证据链，最终报告用 `finance_briefing` 的 `record` 写 deliverable。

节点和边的 metadata 均带 provider、asOf、availableAt、fetchedAt、contentHash、runId、provenance。另存 method、模型输入与 warnings/diagnostics；不得只保存一个目标价。

默认交付对本地已实际写入的文件使用 Markdown 可点击链接，提供实际可打开的产物入口，不只给纯路径。

## 来源与修改声明

方法论参考本地 Prism `financial-services-plugins` 的 DCF（Apache-2.0，随包 `LICENSE`）。2026-10-30 已重写并修正 WACC 权重、终值折现与股权桥等规则，删除 Office/Excel/recalc 工作流及未提供的 MCP 依赖；详见 `references/dcf-method.md` 的修改声明。
