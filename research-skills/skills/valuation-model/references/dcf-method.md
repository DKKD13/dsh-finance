# 确定性 DCF 与估值审查 Reference

> 来源：Prism snapshot 的上游文件 financial-services-plugins/financial-analysis/skills/dcf-model/SKILL.md（上游路径，非包内引用），Apache License 2.0（`../LICENSE`）。原许可证未附额外 NOTICE 文件。
>
> 修改声明（2026-10-30，dsh-research-graph）：保留现金流推导、三情景、来源注释和完整敏感性思想；全部改为 `finance_model` + 图谱交付。修正原文以 net debt 计算 WACC 债务权重、净现金导致负权重、终值时点含混等问题；删除 Office JS/openpyxl/recalc、私有 MCP 和强制 xlsx 产出。本文是修正后的重写，不是上游原文副本。

## 1. 时间与输入契约

所有实际值、市场价格、利率、beta、共识与可比公司数据都带统一证据 metadata。估值日 `asOf` 之后才公开的信息不得进入模型；在历史截面重跑时尤其如此。原始输入、经营假设与模型输出分表保存。

金额统一为一种货币和一个数量级，股数统一为股或百万股之一。输入中显式记录 `currency`、`unit`、`period`、`gaapBasis`、`priceBasis`。模型输出带 `runId`、`inputHash/contentHash` 和模型版本。

## 2. FCFF 推导

统一使用以下符号，CapEx 与营运资本增加均以正数输入：

```text
Revenue_t = Revenue_(t-1) × (1 + growth_t)
EBIT_t = Revenue_t × EBIT_margin_t
NOPAT_t = EBIT_t × (1 - cash_tax_rate_t)
FCFF_t = NOPAT_t + D&A_t - CapEx_t - ΔNWC_t
ΔNWC_t = NWC_t - NWC_(t-1)
```

OpEx 比率以 Revenue 为分母，不以 Gross Profit 为分母。亏损年度、负税率或异常税收不得静默 clamp；交给模型诊断并解释。若从 CFO 出发，不能直接把含利息的 CFO - CapEx 当作 unlevered FCFF，必须先作一致调整。

## 3. WACC 的正确口径

```text
Ke = Rf + beta × ERP
Kd_after_tax = Kd_pre_tax × (1 - tax_rate)
E = 当前股权市场价值
D = 用于资本结构的债务市场价值（缺少时清楚标注账面近似）
WACC = Ke × E/(E+D) + Kd_after_tax × D/(E+D)
```

**权重分母是 E+D，不是 E+Net Debt；D 不用 Net Debt。** 现金在股权桥处理，净现金不会形成负债务权重。无债务时 WACC=Ke。租赁、养老金、少数股东权益等是否计入 D 或其他桥项必须一致，不能重复扣除。

Rf、beta、ERP、Kd 与税率都要有 asOf 和来源，不允许先写 10% 再补故事。

## 4. 折现与终值

显式期若采用年中约定，第 t 年 FCFF 的折现期为 `t-0.5`。终值必须定义时点：

```text
TV_N = FCFF_(N+1) / (WACC - g)
FCFF_(N+1) = FCFF_N × (1+g)
PV(TV_N) = TV_N / (1+WACC)^N
```

这里 `TV_N` 是**第 N 年末**价值，所以用 N 年折现；不得一边称其为年末终值一边使用 N-0.5。若模型选择其他约定，必须在 schema 中明确并全模型一致。硬性要求 `g < WACC`，并检查 g 与长期经济/再投资假设是否相容。

## 5. 股权桥

```text
EV = Σ PV(FCFF_t) + PV(TV_N)
Equity Value = EV - Debt + Cash - 其他明确且未重复的优先索偿项
Implied Price = Equity Value / Diluted Shares
```

Debt、Cash 和股数使用同一估值日与单位。净现金为负 Net Debt 时，等价于加回现金，但报告要展示原始 Debt/Cash，避免符号错误。当前价格只用于比较与反向 DCF，不回填公平价值。

## 6. 三情景与敏感性

Bear/Base/Bull 各自说明收入、利润率、再投资与资本成本为何构成一致故事。场景假设逐年排列，不能只有单点增长率。

敏感性至少覆盖 WACC × terminal growth；必要时增加增长 × margin。每个格子都由 `finance_model` 完整重算 DCF，禁止线性近似或手填。行列数为奇数，中心输入精确等于 Base，中心输出必须与 Base 每股价值完全一致。

终值占 EV 比例、implied multiples、ROIC 与再投资率是诊断信号，不是机械合格线。极端结果被标记并解释，不能悄悄删除。

## 7. Evaluator 修正版审查

Evaluator 先独立核对证据与模型，再读结论；不能只做格式 QA，也不能无限迭代到强行 PASS。依次检查：

1. 时间门：是否存在 `availableAt > asOf` 的输入。
2. 来源门：关键输入是否有原始定位与统一 metadata，共识是否确为估值日前快照。
3. 算术门：仅认可 `finance_model` 的中间量和完整重跑记录。
4. 公式门：WACC 用 E+D 与总债务口径，终值时点一致，股权桥不重复扣项。
5. 经济门：三情景是不同故事，稳态增长/再投资/利润率不矛盾。
6. 输出门：敏感性中心一致，报告数字与 valuation 节点一致，无交易指令。

发现问题时给出具体输入、公式或证据及修正要求，由 Generator 完整重跑。若只是审美偏好或没有证据的不同观点，不得阻塞交付；保留为分歧项。
