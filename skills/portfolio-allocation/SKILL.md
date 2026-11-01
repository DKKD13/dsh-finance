---
name: portfolio-allocation
description: Use for portfolio snapshot, allocation exposure and valuation scenario research. Uses finance_market_data, finance_model portfolio/dcf/comps and research_graph_*; never places orders or fabricates unsupported backtests.
---

# Portfolio Allocation

## 核心原则

- 人力资本是隐形暴露，组合分析不能只看单个 ticker。
- 只输出研究情景、风险与待验证事项，**绝不生成或执行订单**。
- 不伪造模型能力：当前 `finance_model` 的既定 action 为 dcf/comps/portfolio；Black-Litterman、Kelly、风险平价和历史回测没有受支持 action 时明确标为未执行，不另写引擎。

## 1. 投资者与组合快照

记录期限、流动性需求、最大回撤承受、职业/地域/币种暴露和用户预设约束。仅使用用户主动提供的非敏感持仓或图谱已有 portfolio/position，不连接券商或读取账户凭据。

关系固定为 `portfolio -[holds]-> position`、`position -[exposure_to]-> instrument`。所有快照带统一 metadata 与 asOf；缺数量/成本时不编造。

提交 `finance_model` 的 `portfolio` 前，先按 symbol + currency 查询图谱并 get 已有 instrument 完整节点；匹配时复用其真实 instrumentId，作为 position.instrument.id 传入，并保留已核实的节点内容与 metadata。只有确认不存在匹配项才新建；不得仅按 ticker 默造第二套 ID（例如已有 instrument:watchlist:AAPL 时再建 instrument:AAPL）。多个匹配无法确认时先报告歧义，不再新增重复身份。

## 2. 数据与研究输入

外部结构化行情通过 `finance_market_data` 的 `ingest` 接收；在线 `fetch` 不可用时保留缺口。按 `../financial-data-rigor/SKILL.md` 核验。个股研究调用 `research`，估值调用 `../valuation-model/SKILL.md`，论文复核调用 `../thesis-drift/SKILL.md`。

Alpha 衰减与复核周期参考 `../_investment-philosophy.md` §1，但历史 memory 只用于提问，不作为最新数据来源。

## 3. 组合与估值情景

调用 `finance_model` 的 `portfolio`，提交 point-in-time positions、直接 FX 快照和统一 metadata，取得权重、原币/基准币价值、未实现盈亏与 HHI 等输出，并由工具原子写入 holds/exposure_to。不要请求不存在的 BL/Kelly/backtest action。

估值情景只调用 dcf/comps。WACC 等假设若模型只接受为输入，就明确标为假设而非模型推导；任何不受支持的优化或回测均不执行、不心算。

## 4. 风险约束与暴露

按用户规则检查单标的、行业、地区、币种、共同驱动和流动性暴露。现金缓冲与人力资本作为风险背景，不假定普适比例。风险触发器只表示“需要复核/补证据/重新估值”，不会自动减仓、清仓或执行再平衡。

若未来需要使用历史回测，必须先有受支持的确定性 point-in-time 工具，并保证成分、财报、共识按当时 availableAt 可见，计入退市、费用和复权；当前没有该能力时直接报告限制。

## 5. 研究情景交付

输出可以是多个已实际计算的 allocation/valuation scenario 及各自风险，不写买卖方向、股数指令或执行时间。估值锚只引用 valuation 节点，催化只引用有官方时间的 catalyst。

报告持久化前一次组齐完整 Markdown 正文、当前真实 sessionId 和正文 hash；sessionId 未提供时明确缺口，不编造。对同一完整正文的 UTF-8 字节实际计算 SHA-256，作为 deliverable 的 metadata.contentHash（正文 body hash），不复制来源 hash。用同一个 `finance_graph` plan（action 为 plan，input 直接含 nodes/edges）提交 deliverable 及 `deliverable -[derived_from]-> 实际组合`、`deliverable -[cite]-> 实际使用的 source/raw`。来源须先 get 核实且确实用于本报告，无依据不造 cite；metadata.sources、metadata.references 或 references 边不能代替这些 typed 边。不要先建空报告再逐边补写；plan 失败修正同一完整草稿，仍失败则明确报告未完成。

若另存 Markdown 文件，以成功提交后读回的 deliverable.content 为唯一正文，文件与图谱逐字节一致，不二次生成、改空白或补末尾换行；实际读回文件与节点，核对正文、字节数和 SHA-256，同时核实同次 plan 的 derived_from/cite 边。临时文件与 rename 可遵循已有约定，不引入新机制，也不声称文件和图谱具有全局事务。

需要持续监控时使用 `../portfolio-weekly/SKILL.md`；需要预测校准时使用 `../flex-memory/SKILL.md`。周报用 `finance_briefing` 的 `record` 写入图谱 deliverable，通用审计用 `research_graph_*`。

## 常见错误

| 错误 | 正确做法 |
|---|---|
| 把配置输出当订单 | 仅作为带不确定性的研究情景 |
| 请求不存在的 BL/Kelly/回测 action | 报告未执行与能力缺口 |
| 心算权重或估值 | 只使用 finance_model 的受支持 action |
| 用当前修订数据回填历史 | 按 availableAt 重放；无 point-in-time 数据则停止 |
| 风险触发即自动交易 | 只触发复核，由用户另行决定 |
| 复制持仓关系到多套存储 | 只使用图谱 holds/exposure_to |
