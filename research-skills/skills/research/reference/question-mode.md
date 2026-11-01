# Mode 2: Question Research — 完整 workflow

Question research 的目标不是"这个股票值不值得下注"，是"**这个命题的 mechanism 是什么 + 有什么跨 domain 的机会 + market 什么时候才 price in**"。

Ticker research 的 FEV 三层在这里不适用 — Question 不一定映射到单一 ticker，答案可能是 position basket、timing 窗口、或"这个命题还不成熟，先观察"。

## 前提 — ENVISION 是 anchor

Mode 2 **必须** 从 `investor-wiki/wiki/ENVISION.md` 的某个 Q 开始。如果用户的问题不对应到 Q1-Q5，先询问：

- "你研究的这个命题，对应 ENVISION 哪个 Q？如果是新 Q，先让我把它补到 ENVISION 再开始。"

不要绕过 ENVISION 做脱锚研究 — 那样的产出不会被 signal 层使用。

## Workflow

```
Phase 1: Generator 拆维度
  ├── 读 ENVISION 对应 Q（为什么关心 / 当前工作假设 / 子问题 / hunt targets / kill criteria）
  ├── 基于 Q 列 5-8 个研究维度（见 dimension-templates.md）
  ├── 优先级排序：哪些维度最能 move conviction / 找 mechanism
  └── 产出：维度清单 + 每个维度的核心问题

Phase 2: Generator 派 subagent 并行 inventory
  ├── 3-5 个最关键维度 → subagent 并行（general-purpose 类型）
  ├── 1-3 个次要维度 → 自己做（WebSearch / 读 wiki）
  ├── 每个 subagent 产出：inventory + key datapoints + 该维度独立 judgment
  └── 并行，不顺序

Phase 3: Generator 整合 draft
  ├── 处理 subagent 之间的冲突：不强行 aggregation，给独立 judgment
  ├── 整合 cross-dimension pattern（最关键的 insight 往往在维度之间的连接）
  ├── 产出 position / timing / kill 建议（R:R 不必精确到 DCF，但要有方向 + 量级）
  └── draft essay，3000-5000 字

Phase 4: Evaluator 独立审查
  ├── 独立 spawn（general-purpose）
  ├── 只给 ENVISION Q + 最终 draft — 不给 subagent 过程材料
  ├── 先独立想"这个 Q 应该有哪些维度" → 再对照 draft 挑问题
  ├── 6 项审查标准（下面）
  └── PASS / CONTINUE（附具体改进要求）

Phase 5: CONTINUE → Generator 重写干净版 → Evaluator 再审
  ├── 无轮次上限
  └── 不是打补丁 — 是基于 feedback 重新讲一遍故事

Phase 6: PASS → 发布
  └── 写到 workspace/research/Q{N}-{topic}-{date}.md
```

## Generator 的纪律

### 1. 不重复 ticker mode 的 FEV 推理

Mode 2 不做 F（Fundamentals）E（Expectations）V（Valuation）三层。Question 的关键结构通常是 **mechanism + spillover + timing**。

### 2. 维度之间要有 connection

好的 Question research 的最大 insight 来自**跨维度连接**，不是单维度深度。例：

- 单维度：ARM Holdings 是云端 Agentic 的受益方
- 跨维度：ARM 同时是云端（维度 X）+ edge PC/phone（维度 Y）+ humanoid 底层（维度 Z）+ 中国国产化（维度 W）的受益方 → across-path winner

整合时必须主动找这种 connection。如果跨维度看不到 pattern，说明维度拆得不对或 subagent 做得浅。

### 3. 冲突不中庸

subagent 之间冲突时（例：Agent A 说 Intel short，Agent C 说 Intel long option），**不强行折中到"Intel neutral"**。给独立 judgment — 要么 side 一方给理由，要么识别 timing / sizing 让两者共存。

参考 Alex 的 memory："Research ≠ aggregation — Research 必须产出独立 edge / original insight / mechanism 判断；把 R2 bear + Tegus bull + 中立专家拼接成中庸结论是 failure mode"。

### 4. Position 建议必须 actionable

Essay 结尾必须给：
- 具体标的（或 basket）
- Size 建议（不需要精确，量级即可 — "核心 5-8%"、"卫星 1-3%"、"option-like 1-3%"）
- Timing（现在 / 等 X 信号 / 等 Y% drawdown）
- Kill criteria（什么会让我改判断）

如果所有维度研究后发现**没有 actionable position**（命题不成熟 / 不可投资 / timing 太早），**诚实写出来** — 这是 valid Pass（但不是 ticker mode 的 deep-research Pass，是"命题待成熟"的观察 Pass）。

## 6 项 Evaluator 审查标准

Evaluator 独立研究 Q 之后，对照 draft 审这 6 项。任何一项失败 → CONTINUE。

### 1. 维度完整性

问：这个 Q 应该被哪些维度拆解？draft 漏了关键维度吗？

常见遗漏：
- 缺反事实（thesis 失败场景）
- 缺历史类比（regime shift timing）
- 缺地缘 / 政策维度（结构性约束）
- 缺生态 / 软件架构（底层锁定 vs 表面观察）

### 2. Mechanism 深度

问：每个维度是停留在罗列 datapoints，还是真的深到 "why + how"？

典型浅层：
- "NVDA share 可能从 80% 掉到 60%" — 没说 why
- "ARM 是 across-path winner" — 没说具体 licensing fee mechanism

深层：
- "NVDA share 掉是因为 Agentic task 里 LLM token 占比 < GPU 主导时代。具体算术：LLM token 35% × GPU 吃 90% = GPU 32%"
- "ARM licensing fee 是 per-chip small fee × 十亿级芯片量，不依赖哪家赢，只要 ARM architecture 被用"

### 3. Judgment 独立性

问：跨 subagent 的冲突是怎么处理的？有没有强行 aggregation 给中庸结论？

扫查：
- 冲突被识别了吗（显式列出两方 claim）
- 冲突被 resolved 还是被 hidden 了
- Resolution 是独立 judgment 还是简单取平均

失败例：Agent A 说 Intel short，Agent C 说 Intel long option → draft 写"Intel neutral" = 失败

通过例：draft 写"我倾向 Agent C 的 option-like long，理由是：估值已 price-in 极悲观（forward PE 15x），x86 AI SIMD 在 Agentic 结构性受益，任何 upside 都是 asymmetric。但不是 core long — 1-3% option-like"

### 4. Evidence-to-Position 链

问：从 evidence 到 position 建议的推理链是否完整可验证？

扫查每个 position 建议：
- 对应到哪些 evidence
- 推理过程是否可追溯（不是 "综合判断，买 X"）
- Sizing 的依据是什么

### 5. Confirmation Bias 反方扫描

问：是否主动 hunt 了**挑战 thesis** 的 source，还是所有 evidence 都指向 thesis 成立？

扫查：
- 反事实维度是否真的找了 thesis 失败的 scenario，还是找了"thesis 仍然成立但形式不同"的 scenario
- 有没有 independent source 说 "这个 thesis 是错的"
- 有没有承认 "我找不到 bear source" 作为 gap

失败例：反事实段落列 3 个 scenario，全部指向 "thesis 成立" → 失败

### 6. Timing & Sizing 校准

问：Position size 和 timing 是否和 evidence confidence 对齐？

扫查：
- conviction 70 的 signal 被 size 成 10% 仓位？→ 不校准
- "等 drawdown 40% 加仓" 是否讨论了"如果 drawdown 不来的 opportunity cost"
- timing 窗口和 catalyst 是否绑定具体可验证事件

## Evaluator 的 PASS 标准

6 项全过，且：
- 终稿零迭代痕迹（不提 subagent / Phase / 轮次）
- Cross-dimension pattern 至少 1 个（整合价值体现）
- Position 建议有具体标的 + size + timing + kill
- 字数 3000-5000（短于 3000 = 深度不足；超 5000 = 注水）

## Evaluator 的纪律（避免 confident 但错的 feedback）

Evaluator 也会犯错。特别是在"挑数字错误"时 — 如果 Evaluator 自己算错 / 把 trailing 和 forward 混了 / 引用的 datapoint 过时，会产生"看起来 rigorous 实际错误"的 CONTINUE。

**Evaluator 必须在给 CONTINUE P0 feedback 前做 fact-check**：

1. **如果挑某个数字错误** — 必须自己用 WebSearch / yfinance / 公开 source verify，不能只是觉得"应该不是这个数字"
2. **如果挑某个 claim 没 mechanism** — 必须列出至少 2 个具体遗漏的 mechanism element，不能只说"深度不够"
3. **如果挑反事实 / confirmation bias** — 必须给出至少 2 个 specific 的 alternative scenario，不能只说"反事实不够反"
4. **如果挑 sizing 不校准** — 必须给出一个具体的 alternative sizing 逻辑，不能只说"理由模糊"

## Generator 写 draft 时的数字 claim 纪律（Meta lesson from Q2 iteration）

**每个 factual 数字 claim 必须 inline verify**。Mode 2 多轮迭代最大的 failure mode 是**每轮都在不同位置犯 trailing/forward 混淆 / IPO timing 错 / 融资轮次混淆**等 factual 错。Evaluator 挑到一个，Generator 修完又在别处引入新的同类错。根因是数字 claim 的 verification 不在 Generator 流程里，只在 Evaluator 的反复 catch 里。

**规则**：
1. Draft 里出现 "forward PE X / Fwd P/S X / growth X% / ARR $X / IPO timing" 等 factual claim 时，**必须当时 WebSearch verify**（至少 2 个独立 source cross-check）
2. Verify 后的数字在 draft 里用 `[数字 — verify: source1 / source2 日期]` 格式标注
3. **Trailing vs Forward / Current vs Projected / Gross vs Net 必须显式区分** — 用缩写 TTM / Fwd / NTM / LTM 标出，不写裸 "PE X"
4. IPO timing 必须 cross-check multiple sources（TechCrunch / Sacra / The Information / company filings），IPO 融资历史的不同轮次必须**分别查**，不融合
5. Consensus growth / ARR 必须有出处（yfinance / seekingalpha / stockanalysis）

**违反这条的后果**：每轮迭代 30-50% 的 Evaluator 精力浪费在 catching 数字错误上，本来应该花在 mechanism / scenario / judgment 上。

## Generator 收到 CONTINUE 后的纪律

同样关键 — Generator 不能盲从 CONTINUE。

**每条 P0 feedback 必须 fact-check 再决定采纳**：
1. 如果 Evaluator 挑数字错误 → Generator 用独立 source verify，如果 Evaluator 自己错了，在 v2 draft 顶部标注 "Evaluator v1 错误，保留原数字"，不盲目改
2. 如果 P0 feedback 事实上是错的（Evaluator 自己错了）→ 在 v2 draft 里 reject 这条 feedback 并解释为什么
3. 只有 verify 后 feedback 仍然成立，才在 v2 draft 修改
4. 被 verify 后 reject 的 feedback，放到 v2 顶部的 "Evaluator v1 错误清单" 里供记录

这个纪律防止 "Evaluator confident 但错误" 污染 Generator v2。Research ≠ aggregation — 不光 subagent 冲突要 independent judgment，Evaluator feedback 也要 independent judgment。

## 输出路径

`investor-wiki/workspace/research/Q{N}-{topic}-{date}.md`

例：`Q1-cpu回归-deep-2026-04-16.md`、`Q2-agent-harness-2026-04-20.md`

**不自动发布到 wiki/** — 发布到 wiki 需要用户明说。workspace/ 是研究产出区，wiki/ 是判断沉淀区。

## 与 wiki-think signal 的接口

Mode 2 产出的 essay **不是 signal**。它是 signal 的**输入素材**。

后续流程：
1. Alex 读 Mode 2 essay
2. Alex 决定是否把某个 position 表达升级为 signal
3. wiki-think skill（编织 或 审视）把 essay 内容编织进对应 signal
4. Signal 的 ENVISION Q 字段指向对应 Q

Mode 2 的 essay 可以被多个 signal 引用（通过 `[[Q{N}-xxx-{date}]]` 链接）。

## 与 deep-research skill 的关系

- deep-research skill 是 **Mode 1 的延伸**（ticker 深度版，启发者驱动）
- Mode 2 **不需要 deep-research** — 因为 Mode 2 本身已经是 question 层的深度
- 如果 Mode 2 在某个具体 ticker 上需要进一步深挖（例：Q1 研究之后要深挖 AMD），**回到 Mode 1 + deep-research**
