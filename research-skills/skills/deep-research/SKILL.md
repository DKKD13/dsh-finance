---
name: deep-research
description: 深度研究。启发者驱动的双Agent结构，在基础稿之上通过对抗性提问、历史类比、价格反推找到市场认知差。需要先有 research skill 的基础稿。
---

# Deep Research

在 `research` skill 产出的基础稿之上，通过**启发者驱动的对抗性探索**，找到市场认知差（或诚实地确认没有），产出有立场、有 conviction 的买方判断。

## 触发条件

疑似触发时（用户说"深挖"/"深度研究"/"conviction"/"第一性原理"等），**先确认再执行**：

```
检测到可能需要 Deep Research。请确认：

1. 启动 Deep Research（需要已有基础稿，耗时较长）
2. 在当前 research 流程内加深（不单独起 skill）
3. 不需要，继续当前工作

请回复 1/2/3。
```

只有用户回复 1 才启动。回复 2 则在当前对话中直接深挖。回复 3 跳过。

## 前提

必须先有基础稿（`{ticker}-final.md`）。如果没有，提示用户先跑 `research` skill。Deep Research 站在基础稿的数据和来源之上，用完全不同的思维方式重新审视。

## 核心理念

**基础稿解决"这家公司怎么样"。Deep Research 解决"市场在哪里可能错了"。**

AI 做研究的系统性缺陷：优化"看起来完整、平衡、专业"，导致每个判断都加对冲、5-6 个问题均匀覆盖、数据丰富但缺少"所以呢 vs consensus"。Deep Research 的存在就是为了对抗这个缺陷 — 不是通过更多信息，而是通过**更好的思维**。

## 致命纪律

1. **不加"但是"** — 反面论点集中在"我最可能错在哪"章节。正文推理链不断裂。
2. **不均匀覆盖** — 1 个核心问题占 50%+ 篇幅。非核心快速带过。
3. **不写裸数字** — 每个关键数字必须 vs consensus："我 $X vs Street $Y，差 $Z 因为..."
4. **不模糊 conviction** — 结尾 1-5 分。不能写"需要进一步观察"。
5. **不显示框架** — 输出是分析文章，不是方法论练习。不提"启发者问了什么"。
6. **不偷懒** — 技术差异必须拆到物理层 / 商业差异必须拆到客户决策层。
7. **允许 Pass** — 找不到认知差 = 诚实的 Pass，比硬挤一个 conviction 2/5 的报告有价值 100 倍。

---

## Agent Team — Generator + 启发者

Deep Research 是双 Agent 结构。**启发者不是 Evaluator 的升级 — 是完全不同的角色。**

### Spawn 约定（关键，违反会导致通信断链）

启发者和 Generator 都**必须**用 `general-purpose` subagent_type，**不能**用 `research-evaluator` 或 `research-generator`。

**原因**：`research-evaluator` / `research-generator` 的内置身份 prompt 是为基础稿 skill 的 Evaluator↔Generator 配对设计的。它们自带"我的搭档叫 research-evaluator/research-generator"的内置映射，会覆盖自定义 name。实测结果：Inspirer 和 Generator 把 SendMessage 发到 agentType 地址（死信），真实消息永远到不了对方手里，只能通过 team-lead 中转——而 team-lead 转述时会有损压缩，尤其把判断性问题压成检索任务。

**Spawn 时必须强调**：

```
你的搭档在 team 中的 name 是 `{inspirer|generator}`（不是 research-* 类型名）。
SendMessage 的 to 字段必须写这个 name。
错误示例: SendMessage to: "research-generator"  ← 死信
正确示例: SendMessage to: "generator"            ← 对方收到
```

### Team-lead 的行为约定

Team-lead（orchestrator）**不做消息转述**。收到 agent 的 idle 通知后：
- 不要把对方的长分析压缩成 3 句话转给对方
- 而是告诉对方 agent："你的搭档刚完成工作，**直接读他发给你的消息原文**（在你的 inbox）或**直接读他写的文件**"
- 转述会把判断问题压成检索任务，这是 deep research 思维深度的最大杀手

| | 基础稿的 Evaluator | Deep Research 的启发者 |
|---|---|---|
| **目标** | 报告质量（数据准确、格式对、覆盖全） | 思维质量（有没有原创洞察、像不像真的投资人） |
| **介入时机** | 报告写完之后 | 研究开始之前 + 每轮深挖之后 |
| **工作方式** | 检查 → 打分 → PASS/CONTINUE | 提问 → 挑战 → 追问 → 再提问 |
| **成功标准** | Gate checklist 全过 | "读完学到了新东西" |
| **失败模式** | 沦为 QA | 沦为泛问题清单 |

### 流程

```
Phase 1: 启发者 — Asymmetry Hunt
  ├── 读基础稿（快速，不逐行）
  ├── 独立搜索：Street consensus + 历史类比 + 价格反推
  ├── 用投资哲学框架生成启发式问题
  ├── 识别认知差候选
  ├── 判断：有潜在 edge → 选 1 个核心问题 → Phase 2
  │         没有 edge → Pass note → 结束
  └── 产出：8-12 个启发式问题 + 1 个核心认知差方向

Phase 2: Generator — Deep Dig（第一轮）
  ├── 围绕启发者选出的核心问题深挖
  ├── 继承 research skill 基本功
  ├── 商人视角 + 历史类比 + 数字推导
  └── 产出：深挖分析（不需要是完整报告格式）

Phase 3: 启发者 — 追问（可多轮）
  ├── 读 Generator 深挖结果
  ├── 追问：哪些问题没回答？哪些回答太浅？
  ├── 提出新的角度或反面证据
  └── 产出：追问 + 新问题

Phase 4: Generator — 补充深挖（可多轮）
  ├── 回应追问
  ├── 沿新方向搜索
  └── 产出：补充分析

... Phase 3-4 迭代，直到启发者认为核心问题已被充分探索 ...

Phase Final-A: Generator — 写终稿
  ├── 基于所有轮次的深挖，重新组织一份干净报告
  ├── conviction ≥ 3/5 → 完整报告
  └── conviction < 3/5 → Pass note（300-500 字）

Phase Final-B: Team-lead — Gate Check（机械检查，非启发者的活）
  ├── 迭代痕迹清零（不提启发者/Phase/轮次）
  ├── 关键数字抽样验证
  ├── 格式/引用一致性
  └── 通过 → 完成 / 不通过 → Generator 修复后再检查
```

**迭代轮次不设上限。** 启发者每轮追问必须比上一轮更深、更具体。如果启发者发现自己在重复相似的问题 → 告诉 team-lead "核心问题已充分探索，建议进入 Final"。

**关键：启发者和 Gate Check 是两个完全不同的职能。** 启发者只管思维质量（有没有原创洞察）。Gate Check 只管报告质量（数字对不对、格式对不对）。启发者绝不跑 gate checklist，Gate Check 绝不提启发式问题。混在一起 = 启发者退化成 Evaluator。

### 启发者详细指引

**[READ]** `reference/inspirer.md` — 启发者的完整 prompt reference。

### Generator 基本功

从 `research` SKILL.md 继承，不重写：
- 信息源优先级（本地 wiki → kb.py/sources.py → WebSearch → yfinance）
- 写作风格（Stratechery 叙事、段落 ≤200 字、blockquote + 脚注）
- 数字标来源
- 一手材料优先

### Generator 在 Deep Research 中的额外要求

在基础功之上，Generator 需要：

**商人视角还原**：分析任何公司时，至少从一个利益相关者的决策视角展开。不是"分析 Google 的广告护城河"，而是"如果我是年预算 5000 万的广告主 CMO，我为什么留在 Google？什么情况下我会走？" 利益相关者包括：客户、竞对、供应商、员工、监管者。

**历史类比验证**：启发者会提出历史类比方向，Generator 需要认真验证——类比的结构相似性在哪？不同在哪？那次的结局对这次有什么启示？不是装饰性的"这就像当年的 X"，是推理链的一环。

**数字推导链**：每个关键数字必须有中间步骤，从第一性原理推导。GOOGL-deep 的 5 层 TCO 分拆是正确做法。每一步标 vs consensus。

**价格为锚**：不是"我算出 fair value 是 $X"，而是"当前价格隐含了什么假设？这个假设合不合理？如果假设错了，价格应该到哪？"

---

## 产出

### 完整报告（conviction ≥ 3/5）

**完整买方报告**。500-900 行。

#### 结构原则：一条论证链，不是并列分析

终稿必须是**一个连贯的投资故事**，不是"3 个独立分析并排放"。多个深挖角度必须服务于同一个核心论点，像锁链的不同环节，不是散装饺子。

**反面教材**：Section 1 讲 Anthropic 风险，Section 2 讲 Capex 峰值，Section 3 讲 Search 交叉点——三个独立话题，读完不知道"到底是一个什么故事"。

**正面做法**：一个核心论点（如"D&A 时间炸弹"），然后三个角度论证同一个论点——Capex 推高 D&A 基数、Anthropic 不确定性放大回报风险、Search 减速压缩消化空间。三个角度指向同一个结论，读者跟一条思路走到底。

#### 结构模板（参考，跟着思路走）

1. **Thesis + 评级 + conviction + 价格锚点** — 前 10 行讲清楚
2. **基础稿定位** — "基础稿（`[[{ticker}-final]]`）已覆盖全貌。本报告深挖一个核心变量：……" 一句话说清和基础稿的关系
3. **共识画像** — Street 在想什么，当前价格隐含什么假设（200-300 字）
4. **核心论点** — 一句话：市场在哪里可能错了？
5. **论证链**（50%+ 篇幅）— 围绕核心论点，每个角度是锁链一环：
   - 角度 A → "所以呢" → 对核心论点的支撑
   - 角度 B → "所以呢" → 强化（A 自然过渡到 B）
   - 角度 C → "所以呢" → 收束到同一个结论
   - **角度之间有过渡句**，让读者看到逻辑怎么从 A 流到 B 流到 C
6. **价格分析** — 隐含预期反推 + 催化剂 + 时间窗口
7. **最强反面叙事** — "如果我错了，最可能错在哪？"
8. **行动框架** — 什么价格买 / 什么信号 kill / 仓位建议
9. 脚注

#### 写作纪律

- **不写并列 section**。三个独立话题 = 失败。想想它们怎么服务同一个论点。
- **每段自然回扣主线**。不是模板句"对投资判断的影响"，而是叙事自然收回来。
- **过渡不生硬**。"接下来看 Capex" = 失败。"Anthropic 的执行风险之所以重要，是因为它直接决定了 $500B capex 中有多少能产生回报" = 好的过渡。

### Pass Note（conviction < 3/5）

300-500 字，说清楚：
1. 市场当前定价隐含了什么假设
2. 你检验了哪些可能的认知差
3. 为什么这些认知差不成立（或不够大）
4. 结论：当前价格合理 / 没有 edge / 信息不足以判断

**Pass 不是偷懒 — 是经过充分思考后的诚实判断。** 一个好的 Pass note 需要和完整报告一样多的思考，只是结论不同。

---

## 写作规范

继承 research skill，加上：

- 不提"启发者"/"Phase"/"迭代"等内部流程 — 读者只看到分析本身
- 历史类比融入叙事，不单独成章（除非类比本身就是核心论点）
- 价格分析用 Obsidian 内联 HTML 可视化关键图表
  - `<div style="...">` + inline style，零 iframe/script/style 块
  - 亮色主题：`#f5f5f0` 背景、`#ffffff` 卡片、`#1a1a1a`/`#444` 文字
  - 图表用内联 SVG

## 投资哲学

**[READ]** `_investment-philosophy.md` 全文。

三种 Alpha 框架 + 信号检测 + 报告质量哲学 — 这些不是装饰，是启发者生成问题和 Generator 深挖的**思维引擎**。

## 和 research skill 的关系

| | research (基础稿) | deep-research |
|---|---|---|
| 定位 | 信息完整性 + 全貌 | 认知差发现 + 判断锐度 |
| 驱动方式 | Generator 自驱 + Evaluator QA | 启发者提问驱动 + Generator 深挖 |
| 核心问题 | 5-6 个均匀覆盖 | 1 个，50%+ 篇幅 |
| 数字处理 | 罗列 + 标来源 | 推导链 + 每步 vs consensus |
| 价格角色 | 估值模型产出 | 反推市场预期的工具 |
| 历史维度 | 基本不涉及 | 主动搜索类比 + 验证 |
| 立场 | 平衡（容易 50/50） | 有赌注（或诚实的 Pass） |
| 反面论点 | 散落在每段后 | 集中在风险章节，构建完整反面叙事 |
| 默认产出 | 完整报告（必须） | 完整报告 或 Pass note |

## 输出路径

- 完整报告：`investor-wiki/workspace/research/synthesis/{ticker}-deep.md`
- Pass note：`investor-wiki/workspace/research/synthesis/{ticker}-pass.md`
- 启发者记录：`investor-wiki/workspace/research/evaluations/inspire_{ticker}_r{N}.md`

## 分层加载

| 任务 | Read |
|---|---|
| 启发者角色 | `reference/inspirer.md` |
| 投资哲学（启发者 + Generator 都需要） | `_investment-philosophy.md` 全文 |
| 估值参考 | `reference/valuation.md` |
| 工具命令 | `reference/tools.md` |
| 输出路径 | `reference/notion-output.md` |
