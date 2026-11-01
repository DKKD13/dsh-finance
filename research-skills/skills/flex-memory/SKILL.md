***

name: flex-memory

description: FLEX 记忆循环。仅在用户主动要求反思、季度复盘、或预测校准时触发。不自动触发。



***

# FLEX Memory

**结构化经验 → 更好的方法论 → 更好的预测**。不靠梯度更新，不靠微调。

## 5 个操作

### 1. recall（分析前必须）



```
python \~/tools/memory.py recall "{topic}" --subject {TICKER} --top 5
```

警告优先呈现 / 检查过去犯过的错误 / 获取该公司或行业的历史经验

### 2. calibrate（分析前必须）



```
python \~/tools/memory.py calibrate --subject {TICKER}
```

检查到期预测，用最新数据填入实际值

### 3. remember（分析后必须）



```
python \~/tools/memory.py remember --subject {TICKER} --content "..." --level {level} \[--zone {zone}]
```

**3 层级**：



* **factual** — 数据发现："NVDA FY26 DC revenue \$193.7B"

* **pattern** — 分析模式："半导体 guidance 总是保守 10-15%"

* **strategic** — 战略判断："AI infra 周期 P/E 扩张结束，进入盈利兑现"

**双区**：



* **golden** — 成功策略 → 未来强化使用

* **warning** — 导致错误的模式 → 未来强制 surfaced

**好的记忆样式**：



```
NVDA FY26 DC revenue \$193.7B vs 我之前 \~\$150B 预期。

偏差来自低估 hyperscaler capex intensity — 我用历史 CAGR 线性外推，

但 AI 采用是 S 曲线。下次对平台转换中心的公司，

模型多个 capex 场景而非线性推。
```

**坏的记忆**：`"NVDA DC underestimated"` — 碎片，无推理过程

### 4. predict（有明确预测时）



```
python \~/tools/memory.py predict --subject {TICKER} --metric "FY27 rev growth" --value "32%" --confidence 0.7 --review-days 90
```

只记可验证的定量预测。`review-days` 默认 90。

### 5. reflect（周度手动）



```
python \~/tools/memory.py reflect
```

跨公司模式 / 校准统计 / 系统性偏差检测（连续 3+ 次 overestimate → 标记） / 建议更新 SKILL.md 或 `_alex-profile.md` §4

## 三向去重



* similarity ≥ 90%：跳过

* 70-90%：合并

* < 70%：新建

## 校准反馈循环



```
记录预测 → 90 天到期 → calibrate 提醒 → 填实际值 → 计算误差

→ 误差 >25% → 自动 warning → 连续 3+ overestimate → reflect 标"系统性高估"

→ 更新 SKILL.md → 加保守调整因子 → 下次自动用更好假设
```

## 记忆 ≠ 数据缓存



* **永远获取最新数据** — 不复用记忆中的数字

* **记推理** — 为什么得出结论 / 什么让你惊讶 / 犯了什么错

* **是背景** — 指导分析角度，不直接复制数字到输出