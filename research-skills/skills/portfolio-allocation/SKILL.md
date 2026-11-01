---
name: portfolio-allocation
description: Use when user wants to allocate capital, rebalance portfolio, size positions, or express investment views quantitatively. Covers Black-Litterman, Kelly, Risk Parity, backtesting.
---

# Portfolio Allocation

## 核心原则

- **人力资本是最大隐形持仓** — 科技从业者应低配科技股
- **BL 决定地图，Kelly 决定兵力** — BL 做资产配置，Kelly 做个股定仓
- **Half Kelly + 5% 上限** — 永远假设自己高估了判断准确度
- **回测是设预期，不是预测** — 知道"正常波动范围"，不恐慌卖出

## 9 步工作流

```
profile → macro views → BL 资产配置 → 个股研究 → Kelly 定仓 
→ 回测验证 → 分批执行 → 监控 → 季度复盘
```

## Step 1: 投资者画像

总资产 / 期限 / 最大回撤承受 / 职业稳定性 / 人力资本相关性 / 地域偏好。
**职业不稳定 → 现金缓冲 = 9-12 个月生活费（不可谈判）**

## Step 2: Black-Litterman

| 输入 | 来源 | 备注 |
|---|---|---|
| Σ 协方差 | `returns.cov() × 252` | daily 历史 |
| w_market | 市值权重 | 例: VTI 45% / TLT 20% |
| π 均衡收益 | `δ × Σ × w_market` | δ ≈ 2.5 |
| P, Q | 你的观点矩阵 | 例: "GOOG vs VTI +8%" |
| Ω 置信度 | 见下表 | omega 越小 = BL 越偏向你 |

| 你的感觉 | 置信度 | BL 反应 |
|---|---|---|
| 信息优势+硬数据 | 70-90% | 大幅偏移 |
| 逻辑+缺数据 | 40-60% | 适度偏移 |
| 直觉/趋势 | 20-40% | 小幅偏移 |
| 不确定 | <20% | 基本不动 |

输出 `w_bl` — BL 闭式解，用 PyPortfolioOpt。

## Step 3: 个股研究 → Kelly 定仓

研究流程：`research` → `valuation` → `hypothesis-thinking`

**[REFERENCE]** Alpha 衰减速度见 `_alex-profile.md` §1：Laffont 衰减最快 → 短持仓+频繁 review；冯柳几乎不衰减 → 耐心持有。

### Kelly 定仓
`f* = (pb − q) / b` → **实际仓位 = min(f*/2, 5%)** — 永远 Half Kelly + 5% 上限。Kelly 假设已知概率，但你的 p 是估计 → 必须 haircut。

| Kelly 值 | 行动 |
|---|---|
| > 5% | 按 5% 上限 |
| 1-5% | 按 Kelly 值 |
| 0-1% | 不值得 |
| ≤ 0 | **不要碰** |

### Conviction 评分

| 维度（权重） | 1 分 | 3 分 | 5 分 |
|---|---|---|---|
| Alpha 独特性 (30%) | 大众共识 | 差异化角度 | 独家深度 |
| 催化剂明确 (25%) | 模糊 | 大致时间 | 明确事件+日期 |
| 估值安全边际 (25%) | <10% | 20-30% | >40% |
| 可证伪性 (20%) | 模糊 | 可量化 | 已设止损 |

| 总分 | 仓位 |
|---|---|
| 4.0-5.0 | 3-5% |
| 3.0-3.9 | 1-2% |
| 2.0-2.9 | <1% |
| <2.0 | 0% |

## Step 4: 仓位约束（不可谈判）

- 单只个股 ≤ 5%
- 单一行业 ≤ 15%
- Satellite 合计 ≤ 30%
- 科技股 Satellite ≤ 10%（职业已是科技暴露）
- 现金缓冲 ≥ 9-12 月生活费

## Step 5: 回测验证

`vectorbt` 信号回测 + `quantstats` HTML 报告。`fees=0.001`, `freq='1D'`。

| 指标 | 合格线 |
|---|---|
| Sharpe | > 0.5 |
| Max Drawdown | < 你的承受极限 |
| Calmar | > 0.5 |
| Win Rate (月) | > 60% |

**心态**：回测是"正常范围"预期，不是预测未来。前瞻 CAGR 按回测 60-70%。

## Step 6: 分批部署

新资金分 6 个月：
- Week 1: 25% 现金缓冲+黄金（防御先行）
- Week 2-4: 25% 核心指数 (VTI / VXUS)
- M2-3: 25% 因子+区域
- M4-6: 25% 剩余股票+Satellite

账户：IBKR (美股) | Futu (港股/中) | 国内 (A 股/现金)

## Step 7: 交易信号

```
TICKER: {ticker}
Action: BUY / SELL / HOLD
Price: $X | Target: $Y (DCF Base) | Stop: $Z
Size: X% | R:R: X.X:1
Catalyst: [事件]
Why now: [一句话]
```

**BUY**: price < Base + 催化剂 + R:R > 1.5:1 + conf > 60
**SELL**: kill 触发 或 price > Bull
**不交易**: 差距 <10% 或 conf <50 或 无近期催化剂

## Step 8: Kill Criteria

| 条件 | 动作 |
|---|---|
| 个股核心假设被证伪 | 当天清仓 |
| 单地区亏 >40% | 砍到中性 (3-5%) |
| 单股 >5% | 减到 5% |
| 失业 | 停部署，缓冲加到 18 月 |

## Step 9: 季度复盘

- 重跑 Kelly
- 更新 BL 的 P / Q
- 偏离目标 >5% → 再平衡
- 跑 quantstats 检查正常范围
- `flex-memory remember`

## 常见错误

| 错误 | 正确 |
|---|---|
| 科技人重仓科技 | 对冲人力资本 |
| 一次 All-in | 6 个月部署 |
| Kelly 不加上限 | Half Kelly + 5% |
| 因为某月亏改策略 | 查回测正常范围 |
| 只看收益不看回撤 | Sharpe / Calmar > 收益 |
| 回测 21% 期望 21% | 前瞻打 6-7 折 |
| 没有现金缓冲 | 9-12 月是承受回撤的前提 |
