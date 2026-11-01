# Valuation Reference

> 由 `research/SKILL.md` 估值部分引用。进入估值时 Read 此文件。

## 方法选择

| 公司类型 | 方法 | 原因 |
|---------|------|------|
| 成熟盈利 (AAPL, MSFT) | DCF + Comps | 稳定 FCF 可折现 |
| 高增长盈利 (NVDA, META) | DCF + Comps | DCF 捕捉增长价值 |
| 亏损/早期 (RIVN, biotech) | 纯 Comps | 无正 FCF，用 EV/Revenue |
| 周期股极端位 | Comps 为主 | 当前盈利不代表正常能力 |

DCF 不是填表。每个假设背后都是一个投资判断 — 你的增速假设比 consensus 高 7pp，因为什么？说清楚。

## WACC

**必须从 CAPM 推导**（10Y Treasury → β → ERP → Ke → WACC），不准凭感觉写。

典型范围：
- 大盘稳定 7-9%
- 成长股 9-12%
- 高风险 12-15%

**Terminal growth 必须 < WACC**，且 Terminal growth 一般在 2.0-3.5%。

## Bear / Base / Bull 三场景

每次必须给三场景。单点估值是虚假精确。每个场景不只是调参数，而是讲一个不同的故事。

| 维度 | Bear | Base | Bull |
|------|------|------|------|
| Revenue growth | 历史低位 | Consensus | 历史高位 |
| Margin | 压缩 | 稳定 | 扩张 |
| WACC | +1% | CAPM 算值 | -1% |
| Terminal growth | 2.0-2.5% | 2.5-3.0% | 3.0-4.0% |

## 三表联动检查（DCF 前必做）

- P&L → BS → CF 联动
- BS 平衡 (A=L+E)
- CF 回连 BS
- NI 联动

## 交叉验证

1. **DCF implied P/E vs Comps peer median** — 偏离 >2x 需检查假设
2. **TV/EV 比例** — 50-70% 正常，>75% 说明近期 FCF 被低估
3. **单位复查** — revenue $M? shares 实际数? net_cash 正负号? WACC 用小数还是百分数?

## 卖方数据对比

```bash
python ~/tools/kb.py search "{TICKER} revenue forecast target price" --top 5
```

如果本地 `kb.py` 没有相关卖方数据，用 `WebSearch` 补（优先 SEC / 公司 IR / earnings transcript）。

| 偏差 | 含义 |
|---|---|
| <±10% | 合理 |
| ±10-25% | 需要解释 |
| >±25% | 重大偏离，必须说明依据 |

## Revenue Growth 怎么定

拉历史财报算 3 年 CAGR。Y1-2 参考 guidance/consensus ± 你的调整。Y3-4 渐降至行业平均。Y5 接近 terminal growth (2.5-3.5%)。

**验证**：Y1 不应比历史 CAGR 偏离 >50%。

## Margin 怎么定

Gross margin 取最近 3 年中位数。OpEx 基于 Revenue（不是 Gross Profit）。D&A 从现金流量表取，别省略。CapEx 要判断**周期性 vs 结构性** — 对重金投入的科技公司，做"当前 CapEx"和"正常化 CapEx"的对比 sensitivity。

## 常见错误

| 错误 | 后果 |
|------|---------|
| 忘了 D&A | Fair value 偏低 |
| shares_outstanding 用了百万 | 离谱 1000x |
| net_cash 符号反了 | 净负债公司被高估 |
| growth_rates 用百分数不用小数 | 模型爆炸 |
| 机械外推当前 CapEx | 高投入期公司被严重低估 |
| 只给一个 Fair Value | 虚假精确，必须三场景 |
| 给了估值不说"贵不贵" | 没回答根本问题 |
| 用 trailing 数据做 forward 估值 | 高估增长股 / 低估周期股 — 估值必须 forward-looking |

## DCF Excel 模型产出

研究报告的估值部分必须附带 `.xlsx` DCF 模型。可以用以下任一方式生成：

1. **`financial-analysis:dcf-model` skill**（推荐） — 从 SEC filings + 研究数据构建完整 DCF，自动产出 .xlsx
2. **`financial-analysis:dcf` skill** — 带 comps-informed terminal multiples 的 DCF
3. **Python openpyxl 手动构建** — 当上述 skill 不适用时

### 模型必须包含

| Sheet | 内容 |
|---|---|
| **Assumptions** | 增长率、margin、WACC、terminal growth — Bear/Base/Bull 三列 |
| **Income Statement** | 5 年预测 + 历史 3 年 |
| **Cash Flow** | OCF → CapEx → FCF bridge，每年每场景 |
| **DCF** | WACC 推导 + FCFF 折现 + Terminal Value + equity bridge |
| **Sensitivity** | Fair value = f(WACC, terminal growth) 矩阵 |
| **Comps** | 可比公司 multiples（至少 P/E, EV/Revenue, EV/EBITDA）|

输出到 `investor-wiki/workspace/research/models/{ticker}-dcf.xlsx`。

报告正文中的估值数字必须与 Excel 模型一致。两者打架 = 报告废。

## ✅ 完成判据

Bear / Base / Bull 三场景已展开 + R:R 比值已计算 + 1 个明确的 kill criteria + 三表联动已对账 + **DCF Excel 模型已产出**。
