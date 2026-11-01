---
name: research
description: 投研深度分析。双 mode — Ticker（某只股票 FEV 三层 + DCF + R:R）/ Question（围绕 ENVISION Q 的多维度命题深挖）。触发时先 Mode Gate 确认。
---

# Research

## ⛔ Mode Selection Gate — 触发时先确认

这是高权重 skill。**任何疑似触发必须先确认 mode**。

```
检测到可能需要 Research。请确认模式：

1. Ticker 研究 — 围绕某只股票做 FEV 三层 + DCF + R:R 判断
   触发词例：研究 AMD / 分析 NVDA / 给我一份 GOOGL 报告
   
2. Question 研究 — 围绕某个命题（通常是 ENVISION Q1-Q5）做
   多维度 landscape + 跨维度整合 + position 建议（无 DCF）
   触发词例：研究 CPU 回归 / Agent harness 还有什么机会 / Q1 深挖
   
3. 不需要，跳过

请回复 1/2/3。
```

- 只有用户明确回复 1 → 进入 **Mode 1: Ticker Research**（下面所有内容）
- 回复 2 → 跳转到 **Mode 2: Question Research**（**[READ]** `reference/question-mode.md`，下面内容不适用）
- 回复 3 → 跳过

两个 mode 共享基础设施：一手材料优先 / 找矛盾 = alpha / 断言强度匹配证据 / Stratechery 叙事 / Generator + Evaluator 双 agent 架构 / 信息源优先级。但具体流程、产出格式、Evaluator 审查标准不同。

---

# Mode 1: Ticker Research

## 这份研究要回答什么

**"这个价格值不值得真钱下注？"**

超额收益 = 你的判断 − 市场判断。研究好公司不赚钱，研究市场低估的公司才赚钱。从第一秒起脑子里同时转两条线：这家公司**实际上**怎么样？市场**认为**它怎么样？差异在哪？

FEV 三层：
- **Fundamentals** — 生意怎么样？增长靠什么？壁垒能否持续？
- **Expectations** — 市场已 price in 什么？共识盲点在哪？
- **Valuation** — 你和市场分歧值多少？R:R 合理吗？

## 买方研究的标准

买方分析不是写百科全书。卖方面面俱到是因为他们服务所有客户；你只需要回答一个问题 — 这个价格值不值得下注。答案取决于 1-2 个核心驱动因素，不是 10 个均匀的段落。

**先扫后聚**：快速扫一圈建立全貌，然后识别"未来 12 个月股价主要由什么决定"，把搜索精力和分析深度集中在那里。非核心板块提供背景即可。结构跟着聚焦走 — 核心驱动因素值得独立成章、深度不设上限；非核心维度合并简洁带过，不需要和核心享有同等篇幅。判断标准：如果一个维度对 Buy/Sell/Hold 没有决定性影响，它最多值 1-2 段。卖方按维度平铺是因为服务所有客户；买方只服务一个问题。

**从产品和技术出发**。不说"技术很强"，说"它强在 X 难点上，因为 Y，竞争对手追不上 Z"。技术不停在参数对比，解释为什么 — 底层原理是什么，可持续吗。每个 jargon 第一次出现用一句话翻译成人话。

**一手材料优先**。完整信任分级见 `_alex-profile.md` §3。核心论点必须基于一手材料（SEC filing / 技术文档 / GitHub / 高质量社区讨论）。新闻和卖方研报只用于确认"共识是什么" — 它们告诉你市场怎么想，不告诉你事实是什么。厂商讲愿景，社区告诉你产品好不好用。

**找矛盾 = alpha**。数据源矛盾时不要绕过去 — 分析为什么矛盾。所有强结论必须被挑战。如果你搜完全是支持证据、没有任何反面 — 不是你对了，是你搜得不够。

**断言强度匹配证据**。强断言（充分数据支撑）/ 中等断言（合理推理但缺硬数据）/ 弱断言（证据不足，标"我的估算"）。公司披露数据标来源【来源, 日期】，推断用"可能 / 倾向于 / 我的估算"限定。

## 信息源优先级

每次分析按以下顺序获取信息，不要跳过前面直接 web_search：

1. **本地 wiki + raw 原始材料**（最高优先，独家 edge）:
   - `investor-wiki/wiki/tickers/{ticker}.md` — 已编译的个股知识页（含基金持仓、产业事件、历史分析）
   - `investor-wiki/wiki/signal/` — 跨源投资主题和矛盾追踪
   - `investor-wiki/wiki/sources/` — 已编译的底层证据页
   - `investor-wiki/raw/sell-side research/` — **原始卖方研报**（PDF），直接 Read 提取关键数据和判断
   - `investor-wiki/raw/webclipper/` — **Tegus/ThirdBridge 专家访谈、行业分析**，一手材料，信任度极高
   - `investor-wiki/raw/investor-letters/` — 基金信件原始文件
   - `python ~/tools/kb.py search` 和 `python ~/tools/kb.py list --company {TICKER}` 查索引
   - 这些是别人没有的独家材料。**先吃透本地再往外搜**。
2. **高质量信息源** — `python ~/tools/sources.py rss/hn/arxiv` 搜精选源。信号密度远高于泛搜索。
3. **Web 搜索补漏** — 前两步没覆盖的缺口才用。优先 SEC / 公司 IR / earnings transcript / 技术文档 / GitHub。
4. **财务数据** — yfinance 直接拉，每次现拉，不依赖记忆。

分析过程中随时搜，遇到新问题就去搜，不是开头搜一次就够了。

## 写作风格

**Stratechery by Ben Thompson 式叙事**。不是 bullet point 汇总，不是干博文，是完整的分析叙事：

- **每段 thesis-first**，一句明确论点，然后 3-5 段完整论证 — 推理过程、具体案例、反面考量。让读者跟着你思考，不只是接受结论。
- **大量引用**。每个核心论点至少 2-3 个独立信源支撑。引内部 wiki 材料（Tegus 专家访谈、基金信件、signal 页面）和外部一手材料（SEC filing、earnings transcript、技术文档）。旁征博引是研究广度的体现。
- **具体 > 抽象**。不说"Cloud 增长强劲"，说"Q4 Cloud $17.7B 同比 +48%，其中 Anthropic 在 4 月 7 日签了 3.5 GW TPU 合同——这意味着……"。用事实建立叙事，不是用形容词。
- **非核心板块也要有血肉**。核心驱动力写深，但 YouTube、Waymo、Other Bets 等也需要足够的上下文让读者理解全貌，不是一句话打发。买方报告要能反复翻阅、深度参考。
- 克制朴实，不用"赋能 / 闭环 / 抓手"。不复述厂商 narrative。不算了一堆数不回答"贵不贵"。
- **段落呼吸**。正文段落不超过 150-200 字（Obsidian 渲染约 5-6 行），逻辑转折处必须换段。长段落是可读性第一杀手。
- **引用格式**。直接引语用 `>` blockquote，来源用 Obsidian 脚注 `[^n]`，文末集中列出。不用 `【来源】` 行内引用——打断阅读节奏。间接转述和数据引用保留行内标注即可。

## 终稿的读者

终稿的读者是一个 PM，他有 15 分钟决定要不要花更多时间看这只股票。他不知道也不关心这份报告经过了几轮迭代、用了什么内部框架、Evaluator 提了什么意见。他只关心：这个价格值不值得下注，核心驱动是什么，风险在哪，安全边际多大。

你的方法论工具（FEV、Alpha 三层、四门框架）是思考的脚手架 — 脚手架帮你建好建筑，但不出现在成品里。Evaluator 的反馈是改进分析的输入，但迭代过程不是叙事的一部分。买方报告的 edge 体现在分析本身的深度和角度里，不需要单独声明"本报告的 edge 在哪"。如果读者看完分析还感受不到 edge，加一个总结段也救不了。

## 投资哲学 lens

**[READ]** `_investment-philosophy.md` §1-§2。

三种思维框架（产业深度 / 认知领先 / 逆向人性弱点）是分析时的思考角度，不是机械套用的模板。分析过程中自然运用这些视角去发现市场认知差。

## 估值

**[READ]** `reference/valuation.md`。

核心：每个假设背后都是一个投资判断。Bear / Base / Bull 三场景讲的是三个不同的故事，不是同一个故事调参数。单点估值是虚假精确。最终必须回答"贵不贵"。

## 结论的标准

方向 + 价格锚点 + 关键变量 + R:R + 催化剂（带时间窗）+ Kill criteria。

"好公司但太贵"是有效结论。"信息不够"也是。**不要为了有结论强行给结论。**

---

## Agent Team — 默认开启，不可选

严肃个股/行业分析**必须**走 Generator → Evaluator 迭代。

**为什么**：单 agent 会系统性 anchor 到初始 thesis。你写完一版分析后，"找矛盾"原则会在确认偏误下失效 — 你会逐条驳斥反面证据而不是吸收它。只有一个从不同起点出发的独立视角才能真正执行压力测试。

Generator 和 Evaluator 是 Agent Teams 中的独立实例，各有自己的 context 和工具。这个结构优势的关键在于：Evaluator 可以先做自己的独立研究，形成自己的判断，再读 Generator 的报告 — 从而避免被 Generator 的论证 anchor。

### 流程

1. Generator 完成分析（扫描 → 识别核心驱动 → 深挖 → 估值 → 结论）
2. Generator 通过消息将报告发给 Evaluator
3. Evaluator 独立审查（**[READ]** `reference/evaluator.md`）— 先做独立研究形成自己的判断，再读 Generator 报告
4. Evaluator 判定 PASS 或 CONTINUE（附具体改进要求）
5. CONTINUE → Generator 重写干净版（不是打补丁），Evaluator 再审
6. 无轮次上限 — 迭代直到 PASS

### PASS 后

Evaluator 判定 PASS 后：

**产出: 基础稿（Generator）。** Generator 基于最终轮的分析结论，重新组织一份面向 PM 的干净版本。

这不是"在最后一轮修订版上删除迭代引用"。而是把最终轮的分析结论作为输入，重新讲一遍故事。原因很简单：经过多轮迭代，报告的叙事弧已经碎了 — 它变成了"我先说了 X，被指出 Y，所以修正为 Z"。但 PM 不需要知道这个过程。他需要的是："核心驱动是 A 和 B，风险是 C，估值结论是 D"。

**基础稿完成后，提示用户是否启动 `deep-research` skill 做深度研究。** 不自动启动 — 由用户决定。

---

**基础稿的终稿硬约束**（违反任何一条 Evaluator 会 CONTINUE）：
- 零迭代痕迹 — 不提 R1/R2/Evaluator/轮次/审查
- 核心驱动每个至少 3 段连续叙事，不是 bullet 堆砌
- Bear/Base/Bull 各讲一个独立故事（≥3 段），不是同一模型调参数
- 收入占比 >10% 的业务线至少 2 段覆盖
- 所有关键数字标 [来源, 日期]
- 估值表内数字必须自洽（EBITDA - D&A = EBIT，每个年份）

### Generator 工具使用

Generator 必须**广泛且持续地**使用工具获取信息，不是开头搜一轮就停：

- **本地 wiki + kb.py**：每轮都应检查是否有遗漏的本地材料
- **sources.py**（RSS / HN / ArXiv / Folo）：信号密度远高于泛搜索，应主动多次调用不同关键词
- **WebSearch**：针对每个核心问题做专门搜索，不是一次泛搜了事
- **yfinance**：每次现拉财务数据，不依赖记忆
- **Generator 可以 spawn subagent** 并行搜索不同维度，加速信息获取

### 跳过条件（用户必须明说）

- "quick look" / "快速看一下" / "随便看看"
- "不用迭代" / "一轮就够"
- 单一具体问题，不是完整分析
- 仍在 idea generation 阶段

---

## 产出

**完整的买方深度研究报告** — 不是 executive summary，是能拿去做投资决策、能反复翻阅参考的完整分析。

- 核心驱动力写到"PM 读完能下单"的深度 — 推理链完整、证据充分、反面已 engage
- 非核心业务也需要足够上下文建立全貌，不是一句话打发
- 叙事中自然融入引用（wiki 材料、一手文档、专家访谈、卖方共识），让读者看到你的信息来源和判断依据
- **估值部分必须附带 DCF Excel 模型**（.xlsx）— 见 `reference/valuation.md` 的 DCF 模型产出要求
- 修订版重写干净，不在旧版上标改动

### 深度标准

长度是深度的结果，不是目标。但深度不足会导致报告沦为 executive summary。以下是各模块的**最低深度要求**——达不到说明分析不够深，不是该压缩：

| 模块 | 最低要求 | 为什么 |
|---|---|---|
| **核心驱动**（每个） | 5+ 段连续叙事，含推理链、具体数据、反面证据、一手来源引用 | 这是报告价值的 80%。3 段 = 观点陈述，5+ 段 = 可复现的论证 |
| **非核心业务** | 收入>10%的业务线各 2-3 段（含最新数据 + 增长逻辑 + 对整体 thesis 的影响） | PM 需要全貌才能下注，不是只看两个亮点 |
| **Bear / Base / Bull** | 各 3+ 段独立叙事（不同的世界观，不是调参数） | 单段 Bear = 没认真想过下行 |
| **竞争格局** | 3+ 段（谁在争、优势/劣势各是什么、护城河能持续多久） | 基本面判断的前提 |
| **估值** | 方法论 + 假设推导 + 敏感性讨论 + 与卖方对比，合计 5+ 段 | 拍个倍数乘个 EPS 不是估值 |
| **风险** | 3+ 个独立风险，每个 1-2 段（含量化影响和触发条件） | 风险列表 ≠ 风险分析 |

**参考刻度**: 一份完整的个股深度，终稿通常 500-800 行 markdown。低于 400 行大概率深度不足。超过 1000 行检查是否注水。这不是硬限，是校准直觉的刻度。

## 分层加载（Mode 1）

| 任务 | Read |
|---|---|
| 投资哲学 / 信任分级 | `_investment-philosophy.md` §1-§3 |
| 估值 | `reference/valuation.md` |
| Evaluator 审查（Ticker） | `reference/evaluator.md` |
| 工具命令 | `reference/tools.md` |
| Workspace / Wiki 输出 | `reference/notion-output.md` |
| 总结研报（不分析公司） | 用 `report-digest` skill |

---

# Mode 2: Question Research

围绕某个命题（通常是 ENVISION Q1-Q5）做多维度深挖 — 不是 ticker 分析。

**[READ]** `reference/question-mode.md` — Mode 2 的完整 workflow + Evaluator 审查标准

**[READ]** `reference/dimension-templates.md` — 常用维度 templates（历史类比钟摆 / spillover / 叙事转换 / 技术反例 / 生态层 / 地缘 / 反事实 / meta 整合）

## 共享基础设施（两 mode 都用）

- `_investment-philosophy.md` §1-§2 — 投资哲学 lens
- `reference/tools.md` — 工具命令（subagent / WebSearch / kb.py / sources.py）
- 信息源优先级：本地 wiki → sources.py → WebSearch → yfinance
- 写作风格：Stratechery 叙事、段落 ≤200 字、blockquote + 脚注

## Mode 2 vs Mode 1 核心差异

| | Ticker (Mode 1) | Question (Mode 2) |
|---|---|---|
| Focus | 某只股票值不值得 | 某个命题的 mechanism |
| 拆解方式 | FEV 三层 | 5-8 个自定义维度 |
| Agent 结构 | Generator ↔ Evaluator 迭代 | Generator (维度 subagent 并行) → 手动整合 → Evaluator 审查 |
| 产出 | `{ticker}-final.md` + DCF Excel | `Q{N}-{topic}-{date}.md` essay |
| 估值 | 必须（DCF） | 无（除非命题映射到 standalone ticker） |
| Pass 允许 | 只有 deep-research 允许 | 默认不允许（要给独立判断） |
| 输出路径 | `workspace/research/synthesis/` | `workspace/research/` |
