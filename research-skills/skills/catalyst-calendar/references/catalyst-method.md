# Catalyst 方法与时间语义 Reference

> 来源：Prism snapshot 的上游文件 equity-research/skills/catalyst-calendar/SKILL.md（上游路径，非包内引用），Apache License 2.0（`../LICENSE`）。
>
> 修改声明（2026-10-30，dsh-research-graph）：保留事件分类、定期核验、影响优先级与过去事件复盘；改为图谱节点/边与 Markdown deliverable。新增 announced/scheduled/available 时间区分、prediction 到期结算和防未来泄漏；移除交易 positioning、Excel 与外部日历依赖。

## 事件分类

- 财务：财报、股东大会、investor day、债务到期与再融资。
- 公司：产品、合同、并购、管理层变化、lockup。
- 行业：会议、监管决定、行业数据与供应链事件。
- 宏观：央行、CPI、就业、GDP 与公开地缘政治日程。

## 优先级不是交易评级

Impact 高/中/低由潜在基本面敏感度、覆盖范围、证据可靠性和时间临近度共同决定。不要用“高影响”推导“应该买入”。二元事件只表示结果分布可能不连续，不表示方向已知。

## 周期性核验

临近事件重新核验官方日期；保留 originalScheduledFor、updatedScheduledFor 和 supersedes 关系。延期或取消也是事实，不静默删除。实际结果另建发生后的证据，避免覆盖发布前快照。

## Prediction 结算

预测只能在 dueAt 或事先定义的客观结算条件满足后结算。met/missed 的阈值必须在预测创建时固定；indeterminate 用于事件取消、口径改变或证据不足。用 `finance_memory` 的 `due/resolve` 完成到期结算，用 `finance_briefing` 的 `evaluate` 汇总误差与校准，不请求不存在的 `finance_model` 校准 action；结算报告必须能回到原 prediction contentHash 和实际证据。
