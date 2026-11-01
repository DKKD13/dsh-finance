# 维度 Templates — Mode 2 的常用研究维度

这是 question research 常用的**维度清单 + 每个维度要追问什么**。不是必须全用，是拆维度时的 reference。

通常一次研究挑 5-8 个维度 — 太少（<4）覆盖不够，太多（>8）subagent 效率低。

---

## 维度 1: 基础判断（必做）

**核心问题**：现有证据拼出来的 landscape 是什么？方向性和幅度性各自 conviction 多少？

- 扫现有 wiki sources — 找相关一手材料
- 扫 raw — 是否有遗漏材料没建 source
- 识别孤证 vs 独立多源
- 区分 **方向判断**（高 conv）vs **幅度判断**（通常低 conv）
- Mechanism 推演 — 如果有关键数字，用第一性原理算一遍是否合理

**典型产出**：Paltashev 60-70% CPU 负载是孤证 + 激励方向利己。方向 conv 70（5 条独立证据），幅度 conv 40（单一 point estimate）。

---

## 维度 2: 历史类比钟摆

**核心问题**：这个命题像历史上哪次 regime shift？那次的 timing / shape 告诉我们什么？

- 找 2-3 个历史 compute / business / technology regime shift 案例
- 每个案例精确到年份：早期信号 / 市场 consensus 形成 / full repricing 节点
- Cross-case pattern：
  - 从早期信号到 full price in 需要多久
  - Repricing shape（跳变 vs 线性）
  - Pre-repricing drawdown 量级
  - Last-follower capitulation 的 trigger 类型（tech event vs numbers-level）

**典型产出**：3 个 case（CUDA / AMD Epyc / ARM 手机）共同 pattern：full price in 8-14 年，早期信号到重估 gap 3-4 年（contrarian 窗口），repricing shape 是 60% 涨幅集中在 13-19 个月。

**何时必做**：当命题涉及 "市场多久才 price in" 的 timing 问题（即几乎所有 regime shift 类命题）。

---

## 维度 3: Spillover / 跨 domain 机会

**核心问题**：这个命题在主 domain 之外，有没有更大的 TAM 或更好的受益方？

- 主 domain 是什么（例：云端 AI）
- 相邻 domains（例：edge / mobile / automotive / physical AI / enterprise on-prem）
- 每个相邻 domain 的 TAM 和 timing
- 跨 domain 共同受益方（across-path winner）

**典型产出**：CPU 回归主在云端，但真正大 TAM 是 edge PC/phone（$120B vs humanoid $15-30B）。across-path winner 是 ARM Holdings（所有 domain 底层都是 ARM IP）。

**何时必做**：当命题可能不只发生在主 domain（大多数技术 thesis 都 qualify）。

---

## 维度 4: 叙事转换的速度（meta）

**核心问题**：如果 thesis 对，market 多久才让你赚到钱？Early believer 要熬多久？

- 类似的历史 regime shift 的 repricing 节奏
- Pre-repricing drawdown 的量级（痛苦期）
- Last-follower 的 trigger 类型
- 现在相对 regime shift 的哪个阶段

**典型产出**：现在是 year-2 of 5，60% 涨幅会集中在 future 某 13-19 个月。中间会有 40-60% drawdown 的标配痛苦期。

**何时必做**：Position timing 判断关键时。和维度 2 有重叠但 focus 不同 — 维度 2 看整体 pattern，维度 4 聚焦**你现在的 position timing**。

---

## 维度 5: 技术反例 / 证伪

**核心问题**：现有 thesis 的核心技术假设有没有反例？哪些"硬约束"其实已经被证伪？

- 识别 thesis 的关键技术假设（通常专家访谈里的一句论断）
- 主动找反例 — 已有技术 / 已有产品是否打破这个假设
- 反例在什么条件下成立 vs 不成立

**典型产出**：Paltashev 说 "ARM binary translation 是硬约束" → Apple Rosetta 2 做到 78-90% 原生性能，AWS Graviton 50%+ migration 都是反例。修正理解：在 concentrated 控制力场景下（Apple / hyperscaler / 国家）binary translation 不是障碍；只在 legacy enterprise 仍是。

**何时必做**：核心 thesis 依赖某个"不可能"的论断时。

---

## 维度 6: 生态 / 软件架构

**核心问题**：支撑这个命题的软件生态 / 架构是否 structurally 锁定了 thesis？

- 相关的 framework / protocol / standard
- 它们的架构是 CPU-bound / GPU-bound / agnostic
- Vendor 的 roadmap 是否和 thesis 一致
- Developer adoption 趋势

**典型产出**：LangGraph / Temporal / AutoGen 的架构"orchestrate thoughts not compute" — 整个 agentic 软件生态 structurally CPU-bound。这是独立于芯片层的第三方 confirmation。

**何时必做**：当 thesis 是 long-duration 趋势（不是短期事件），软件生态的锁定力是重要 confirmation。

---

## 维度 7: 地缘 / 政策

**核心问题**：地缘政治 / 监管 / 政策约束会如何改变这个命题的受益方？

- 出口限制 / 贸易战 / tech decoupling 对供应链的影响
- 国家级国产化趋势（中国 / 欧盟 / 印度）
- 监管路径（反垄断 / 隐私 / AI safety）对竞争格局的影响

**典型产出**：中国 ARM-based Kunpeng + x86 Hygon 国产化 → Intel 永久丢失中国市场（structural bear），ARM Holdings 通过 architecture licensing 结构性受益。

**何时必做**：命题涉及跨国供应链、大 tech 公司、或受监管行业时。

---

## 维度 8: 反事实 / 证伪 scenarios

**核心问题**：如果我完全错了，最可能是什么 scenario？每个 scenario 的概率 + 早期信号？

- 列 3 个 thesis 失败 scenarios
- 每个 scenario 的 mechanism（不只是 "thesis 错了"，是"错在哪一步"）
- 每个 scenario 的概率估计
- 每个 scenario 的早期 detectable signal

**关键纪律**：**必须找 thesis 失败的 scenario，不是 "thesis 换个形式仍然成立" 的 scenario**。

失败例：Q1 CPU 回归的反事实
- ❌ "如果 Groq LPU 吃掉 orchestration，CPU 份额下降" — 但这仍然 bear NVDA，thesis 部分成立
- ✓ "如果端到端 vision-to-action model 把 tool call internalize，整个 agentic workflow 折叠回 GPU-heavy" — 这才是真正 bear CPU 回归 thesis

**何时必做**：任何有 position 建议的研究。Confirmation bias 对冲。

---

## 维度 9: Meta 整合（必做，在最后）

**核心问题**：8 个维度连起来看，有没有**单维度看不到**的 cross-dimension pattern？

- 列表对比所有维度受益方
- 找跨多个维度的 across-path winner
- 找跨维度的共同 timing 信号
- 识别**和 market consensus 最不一样**的判断

**典型产出**：所有路径底层都是 ARM → ARM Holdings 是唯一 across-path winner（不是 AMD 也不是 Intel）。市场定价已经 reflect "AI PC" 故事但**未 reflect "agentic CPU across ALL architectures"** → 这是最大错价。

**何时必做**：每次都做。这是 Question research 整合价值的核心体现。没有 cross-dimension pattern 的 essay 就是 8 个 subagent 报告拼接，不是 research。

---

## 选维度的 heuristic

- 必做：1（基础）+ 8（反事实）+ 9（meta）
- 如果命题涉及 regime shift：加 2 + 4
- 如果命题可能跨 domain：加 3
- 如果 thesis 依赖"硬约束"：加 5
- 如果 long-duration 趋势：加 6
- 如果涉及跨国 / 监管：加 7

**典型配置**：
- "某技术趋势的投资机会" → 1 + 2 + 3 + 4 + 5 + 6 + 8 + 9（8 个）
- "某公司的护城河是否持续" → 1 + 5 + 6 + 7 + 8 + 9（6 个）
- "某政策事件的 implication" → 1 + 3 + 7 + 8 + 9（5 个）

## 每个维度的 subagent prompt 骨架

```
你是 Alex 的研究员。围绕 Q{N}（原文贴入）做维度 {X} 的 landscape inventory。

目标：不是完整分析，是**给 Generator 最有判断价值的 evidence**。

输出要求：
1. [具体产出格式 — 见 dimension-templates.md 对应维度]
2. 字数 2500-3500
3. 独立 judgment：告诉我 "根据证据，这个维度的 takeaway 是什么"，不要只罗列

工具：WebSearch 主力 + 本地 wiki 扫 `D:\研究空间\investor-wiki\wiki\`

严格禁止：
- 不建新 source（这是 inventory 不是 ingest）
- 不写 ticker-level 分析（这是 Mode 2 不是 Mode 1）
- 不中庸 aggregation
```

具体每个维度的 full prompt 模板见各自维度的 workflow 描述。
