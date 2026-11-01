# Earnings 方法与审查 Reference

> 来源：Prism snapshot 中 `equity-research/skills/earnings-preview` 与 `earnings-analysis`，Apache License 2.0（`../LICENSE`）。
>
> 修改声明（2026-10-30，dsh-research-graph）：保留财季核对、beat/miss、指引、部门/经营指标与来源审查；重写为 preview/review 双模式和图谱 deliverable。加入发布前共识冻结、prediction 到期结算、统一 metadata 与 `finance_model`，移除固定页数、DOCX 图表数量和未提供依赖。

## 材料优先级

1. 公司 earnings release 与监管 filing 原文。
2. 同期 presentation/supplement 和带 speaker、start/end 的 transcript。
3. 发布前保存的共识与自身 prediction。
4. 独立数据 provider 与高质量公开材料，仅作补充或交叉检查。

标题、财季、财年和 releaseAvailableAt 必须交叉一致。10-Q/10-K 可能晚于 release 数日，不能倒填为 release 时已见；可以分别用于“首次反应”和“ filing 后复核”两个截面。

## Beat/Miss 口径

| 项目 | 必需字段 | 禁忌 |
|---|---|---|
| Actual | period、unit、currency、GAAP basis、availableAt | 混用相邻财季 |
| Consensus | provider、asOf/availableAt、样本口径 | 使用发布后更新的 consensus |
| Own prediction | 原始 expectedValue、created asOf、runId | 看到结果后修改预测 |
| Variance | finance_model runId、operator、unit | 零分母百分比、LLM 心算 |

Ratio 指标用百分点变化与相对变化时分别标记。GAAP 与 non-GAAP 不用同一个 beat/miss 数字。共识缺失不是 miss，证据不全时写“不可比较”。

## Preview 结构

- 标的、财季、发布时间与 preview asOf。
- 发布前共识与自身预测并列，各自来源和口径。
- 关键指标按重要性排序，并说明为什么能改变论文。
- Bear/Base/Bull 的可证伪经营条件。
- 即将到期的 prediction 与对应 catalyst，dueAt 明确。

## Review 结构

- 结论先行：哪些指标可比较，哪些不可比较。
- Actual vs 发布前 consensus vs 原始 prediction。
- 分部/地区/产品和经营指标，区分价格、销量、mix 与一次性项。
- 当前指引 vs 此前指引，注明两个 availableAt。
- 论文影响与反证；估值如需改变则完整重跑。
- prediction 结算表：pending/met/missed/indeterminate，附 resolves 边证据。
- 数据缺口与下一次复核时间。

## Evaluator 检查

Evaluator 先独立验证日期与数字，再读叙事。重点寻找：错误财季、事后共识、旧 transcript、复权/汇率混用、扣非口径混淆、被事后改写的预测，以及没有证据的归因。修正必须引用具体材料和模型 runId；不得为了生成强烈评级而绕过不确定性。
