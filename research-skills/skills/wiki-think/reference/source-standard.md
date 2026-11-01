# Source 页标准

Source 是 wiki 的"阅读者"。它读一份原始材料，提炼出事实和观点，标注可信度。

## GATE — 什么才值得建 source

建 source 的成本低，漏掉信息的成本高。**宁可多建，不可漏建。**

通过条件（满足任一即可）：
- 有具体数字或事实（不要求 wiki 里没有 — 独立确认同样有价值）
- 回答了 ENVISION Question 或挑战了 Belief
- 从不同框架/角度到达已有结论（三角验证）
- 持有和 wiki 主流判断相反的立场（反面信号）
- 来自高 credibility 一手源（Tegus/ThirdBridge 专家访谈几乎总是通过）

不通过：纯转述新闻 / 零观点零数据的泛泛而谈 / 和已有 source 用相同框架说相同结论且无新数据。

**真正的质量控制在 CONNECT 阶段**，不在 GATE。GATE 的工作是"别漏"，CONNECT 的工作是"哪些真正改变判断"。

| 材料类型 | 一般建不建 | 为什么 |
|---|---|---|
| Tegus / Third Bridge 专家访谈 | **建** | 一手独家，市场看不到 |
| 基金季度信件核心判断 | **建** | 顶级投资者的独立判断 |
| webclipper 纪要/深度文章 | **视内容** | 有独家 fact 或独立 view 就建 |
| sell-side 研报 | **一般不建** | qmd 能搜到就行，除非有独家数据 |
| 日常新闻 | **不建** | 噪音 |

## 格式

```yaml
---
type: source
name: 描述性名称
origin: Third Bridge / Tegus / fund-letter / sell-side / 专家访谈 / memo / news
date: YYYY-MM-DD
who: 人名（身份）
credibility: high / medium / low
tags: [相关标签]
---
```

```markdown
# {谁} — {主题}

## Facts（客观事实，可独立验证）
- **关键数字加粗** → 含义。标来源。

## Views（主观判断，标 [谁]）
- [人名] "直接引用" → 含义。标 bullish / bearish / neutral。

## Gaps（这个人没说什么？）
- 没讨论 X → 可能的原因

## Credibility Notes
- 为什么给这个等级
```

## 条目限制

- **Facts ≤10 条，Views ≤5 条** — 不是行数限制，是条目数。一条 fact 可以 2-3 行写清上下文。超过 10+5 说明你在搬运不在提炼。
- **不漏不重** — 同一个 fact 在整个 wiki 只出现一次。重复的标"与 [[source-xxx]] 一致"。

## Credibility 判定

| 等级 | 条件 | 例子 |
|---|---|---|
| **high** | 一手经验 + 无明显利益冲突 | 前员工谈前雇主技术 / 直接客户谈供应商 |
| **medium** | 二手分析或有潜在 bias 的一手 | sell-side / 前员工谈前雇主估值 |
| **low** | 传闻 / 社媒 / 未署名 | 小红书帖子 / 匿名论坛 |

## Supersession

新数据取代旧数据时，**删旧加新**，不追加。

```
旧：[Cankaya, 2025-10] AI TAM $300-350B
新：[Cankaya, 2026-03] AI TAM $800B [supersedes: 原 $300-350B]
```

追加式编制让页面越来越长、互相矛盾的数据共存。读者不知道哪个是最新的。
