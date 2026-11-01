# Valuation Reference

> 由 `../SKILL.md` 估值部分引用。完整、修正后的方法见 `../../valuation-model/references/dcf-method.md`。

## 唯一入口

估值工作统一调用 `../../valuation-model/SKILL.md`，所有计算只经 `finance_model`。本 reference 不再提供手工 Excel、临时 Python 或其他模型路径；工具不可用时明确阻塞，不手工给目标价。

## 方法选择

- 可持续正 FCFF：DCF + comps 交叉检查。
- 高增长：分阶段 DCF + 反向 DCF，检验当前价格隐含预期。
- 亏损早期/周期极端：comps 或正常化情景，避免强行永续 DCF。
- 银行/保险：不用普通 FCFF/WACC；仅使用 `finance_model` 明确支持的适配模型。

## 必查修正

1. WACC 权重为 E/(E+D) 与 D/(E+D)，D 不用 net debt，净现金不产生负权重。
2. FCFF = NOPAT + D&A - CapEx - ΔNWC，符号和单位一致。
3. 年末 terminal value 按对应年末时点折现，不与年中 FCFF 约定混用。
4. 股权桥分别展示 Debt 与 Cash，其他索偿项不重复扣除。
5. 敏感性每格由 `finance_model` 完整重算，中心格与 Base 完全一致。
6. 所有输入满足 availableAt <= asOf；报告数字与 valuation 节点及模型 runId 一致。

输出 `valuation -[values]-> instrument` 和关联 `deliverable`，不写外部模型文件，不生成交易指令。
