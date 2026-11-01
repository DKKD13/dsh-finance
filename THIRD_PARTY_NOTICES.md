# Third-Party Notices

本文件记录统一金融技能新增或适配的第三方方法论。迁移脚本会把本文件复制到实际发布目录 `skills/THIRD_PARTY_NOTICES.md`，并把对应许可证复制到各技能目录；仅保留仓库根目录副本不算完成随包分发。

## xbtlin/ai-berkshire — MIT

- 上游：https://github.com/xbtlin/ai-berkshire
- 固定只读版本：`5dbb9b9e4e6cf4b74e94167f25892d983cffc476`
- Copyright (c) 2026 xbtlin。
- 完整许可证：`licenses/ai-berkshire-MIT.txt`；发布包内为 `skills/thesis-drift/LICENSE` 与 `skills/financial-data-rigor/LICENSE`。
- 获取的 canonical 原文：`skills/thesis-drift.md`、`skills/financial-data.md`，以及 Codex 适配层 `codex-skills/thesis-drift/SKILL.md`。canonical 原文固定保存在 `research-skills/upstream/ai-berkshire/`，不作为运行指令打包。
- `thesis-drift`：保留“事实/价格/措辞分离”和五维度漂移思想；2026-10-30 改为图谱快照、统一时间/metadata、`finance_model` 和到期结算，删除上游命令、目录与交易动作。
- `financial-data-rigor`：参考多源核验思想；2026-10-30 重写 provider 独立性、口径、证据卡、时间门和图谱交付。
- 未复制上游研究报告、实盘/账户材料、图片、密钥或其他凭据。

## Prism financial-services-plugins — Apache-2.0

- 本地只读来源：`.reference/Prism/financial-services-plugins`，snapshot commit `673ead143ae050d740cdf64d37ec763c488d96e4`。
- 上游项目标识：Claude for Financial Services Plugins。
- 完整许可证：`licenses/prism-financial-services-plugins-Apache-2.0.txt`；发布包内随 `valuation-model`、`equity-earnings`、`catalyst-calendar` 各自的 `LICENSE`。
- 上游许可证没有附带额外 NOTICE 文件，未在所使用的 SKILL.md 中发现单独版权行；保留 Apache-2.0 全文及原有归属，不添加虚构版权人。
- `valuation-model/references/dcf-method.md`：基于 DCF 方法论修正后重写。修正 WACC 的 E+D/总债务权重、净现金负权重、终值折现时点与股权桥；删除 Office JS/openpyxl/recalc、xlsx 强制交付及私有 MCP 依赖，改为 `finance_model` 与图谱 valuation。
- `equity-earnings/references/earnings-method.md`：基于 earnings-preview/earnings-analysis 重写，加入发布前共识冻结、prediction 到期结算与防未来泄漏，删除固定 DOCX/图表交付要求。
- `catalyst-calendar/references/catalyst-method.md`：基于 catalyst-calendar 重写，加入 announced/scheduled/available 时间语义、catalyzes/resolves 与图谱 deliverable，删除交易 positioning 和外部日历依赖。
- 每个修改后的 reference 文件顶部另带显著修改声明。

## 既有素材

原有 27 个 `SKILL.md`、嵌套 `market-watch` 及全部既有素材继续由 `research-skills/skills/` 全量迁移。`huashu-nuwa/LICENSE` 等原有许可证仍随原目录复制，不因本次金融迁移删除。DSH 兼容 override 只改变运行版本，上游源文件保持可审计。
