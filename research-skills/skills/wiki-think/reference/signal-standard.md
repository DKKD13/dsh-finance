# Signal 页标准

Signal 是一篇投资备忘录 — 像一个基本面分析师写给自己的 PM 看的。不是主题百科，不是材料拼接。如果写完说不出"long 什么 / short 什么"，它还不是 signal。

## 四个必答问题

一篇好的 signal 必须回答这四个问题。怎么组织、什么格式、写多长 — 随便。但答案必须有：

1. **到底发生了什么？（机制）** — 不是"A 导致 B"，是**为什么** A 导致 B，什么条件下不导致，因果链条走到底。
2. **市场为什么错了？（预期差）** — 共识是什么，你和共识差在哪，这个差距值多少钱。没有预期差 = 不是 alpha。
3. **怎么赚钱？（Position）** — 具体标的、方向、为什么是这个不是那个。
4. **什么会让你认错？（Kill）** — 具体、可观察、有时间窗。不是 risk factors 清单。

## 更新规则

### 加 evidence
编织进正文叙事。不是 append bullet point。新证据应该**强化或修正**已有论证，不是简单堆砌。

### 加 contradiction
同样编织进叙事。标矛盾类型：
- **scope** — 时间/条件不同导致的表面矛盾（两个人都没错）
- **data** — 同一变量相反数字，硬矛盾（至少一个人错了）
- **framework** — 不同分析框架得出不同结论（需判断哪个更适用）

### 调 conviction
同时更新 frontmatter 数字 + 在正文说明理由。不允许改数字不说为什么。

### 更新 last_verified
每次碰到就更新为今天日期。

## Frontmatter

```yaml
---
type: signal
name: slug-name
status: active | watching | archived
conviction: 0-100
last_verified: YYYY-MM-DD
deadline: YYYY-MM-DD   # 下一个真实催化剂，不要用默认值
tags: [...]
---
```

Conviction 独立评估。如果多个 signal 的 conviction 都是同一个数字，说明在偷懒。

## Conviction Decay

与 deadline 挂钩，不用固定 -10/月。好的 thesis 常需要 3-6 个月等验证，固定衰减会误杀慢热 signal。

```
距 deadline > 60 天  → 不衰减
距 deadline 30-60 天 → 每月 -5
距 deadline < 30 天  → 每月 -15
deadline 已过        → 每月 -20

收到 contradicts     → conviction -15
收到 supports        → conviction +5（上限 100）
conviction < 20      → stale
conviction < 10      → archived
```

## 数量控制

**Active 上限 15 个。**

超过 15 意味着不够聚焦。新建前问：能合并到已有的吗？能用 Position 表达吗？有 ≥2 独立源吗？三条都满足 → 可以建，但如果已有 15 个 → 先 archive conviction 最低的。

## 涌现规则

不是"遇到有趣的就建"。

1. ≥2 个独立 source 指向同一判断 → 候选
2. 候选可以用 Position 表达 → watching
3. Alex 认为值得 → active

## 写作风格

**标题是一句判断。** 读标题就知道 long 还是 short。

- ❌ "软件护城河到底在哪一层？"
- ✅ "AI 只杀简单 SaaS，复杂工作流护城河反而加深"

**正文是连贯分析文章** — Stratechery 风格。每段推进一个论点，结尾读者知道 so what。反方不单独列，编织进叙事。引用原文不转述。中英文自然混合。

## 第一性原理层次

**表层**："AI capex 增长 → 物理基础设施受益。" ← 新闻标题。

**机制层**："capex 一旦转化为 TSMC 的 wafer start 和 GEV 的 gas turbine 订单，就变成了 12-18 个月的物理交付周期，不可逆转。" ← 分析。

**反事实层**："如果这个判断完全错了，最可能的故事是什么？" ← 压力测试。
