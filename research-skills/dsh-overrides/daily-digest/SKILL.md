---
name: daily-digest
description: Run the daily public-source digest — ingest and cluster evidence, preserve video timestamps, write a graph deliverable, and append market observation through market-watch. Invoke with /daily-digest.
---

# Daily Digest — Graph Pipeline

每天按同一 runId 和 asOf 产出一份可审计 `deliverable`。不再依赖外部日报管线、笔记发布或私有记忆工具；不新建 Store、Agent loop 或 LLM client。

## Phase 1：确定截面与采集

记录真实 runId、fetchedAt 和本次 asOf。公开材料统一交给 `../finance-source-ingest/SKILL.md`；调用前读 `../finance-source-ingest/references/host-inputs.md` 的实际参数。一般公司公告先由宿主网页读取工具取原文，再 `finance_ingest.ingest`；没有 `fetch source:web`。外部结构化行情用 `finance_market_data` 的 `ingest`，在线 `fetch` 不可用时不编造数据。

`fetchedAt` 取该次来源抓取实际返回的时间；抓取工具未提供时，读取宿主当前时钟并记录取得材料的时刻。不要按预计完成时间、整分钟或历史研究截面填写，也不要给已取得的材料补一个未来时间。`availableAt`、`asOf` 与 `fetchedAt` 各自保留含义；发布时间只有日期时，明确精度和保守边界。

- 一手/官方、深度研究、长内容/播客、社交/社区、开源/技术/论文尽量均衡。
- 视频和播客必须交给 `../video-deep-reader/SKILL.md`，保留 segment start/end、speaker 与原文。
- 拒绝私有报告、账户与凭据；不可访问的来源记为 rejected，不绕过权限。
- `availableAt > asOf` 或时间不明材料 quarantine，不进入当日结论。

## Phase 2：事件聚类与编辑分层

先调用 `finance_briefing` 的 `prepare`，把 asOf/query/kinds 放在工具参数顶层（不放进 input），取得同一时间截面的证据卡，再合并重复报道。转载同一上游不算多源确认。

选择 2-3 个 headline、4-6 个 noteworthy、8-12 个 glance，并保留约 20% 的探索性内容。每个条目写清 event_title、原始来源数、最佳原始 URL、事实摘要与推断边界、反面和未知项。估值/组合数字仅引用 `finance_model` 的 dcf/comps/portfolio 输出；预测指标仅引用 `finance_briefing` 的 evaluate，其他计算没有确定性能力时不输出。

需要同比、增长贡献或单位换算时，用宿主计算工具或短脚本重算，保留原始数值、公式、分母和结果单位，不凭心算补数字。绝对增加额、占总增加额的比例、对总收入增速的百分点贡献是三个不同量：最后一项的分母是上期总收入；百分比、百分点与基点不得互换。

## Phase 3：写图谱证据与日报

QuantMind/DSA 材料用 `finance_graph` 的 `import_artifact`；其他 source/raw/claim/instrument 与关系用原子 `plan`，必要时辅以 `research_graph_node` / `research_graph_edge`。更新前先读取并合并完整 metadata。

调用 `finance_briefing` 的 `record` 创建 `deliverable`，正文包含：

`record` 的精确信封为 `{action:"record",input:{id,title,content,references,metadata:{provider,asOf,availableAt,fetchedAt,runId,sessionId,provenance}}}`。只有入口确实提供的 sessionId/runId 才填写；不得把自定 QA 标签称作宿主执行 id。`content` 是完整 Markdown，`references` 只列实际存在且读过的节点。

新生成日报的 `asOf` 可以是用户确认的历史研究截面，但它自身的 `availableAt` 必须取本次正文生成后、提交前实际读取的时钟，不能复制历史截面或原文发布时间。原始材料的发布时间和抓取时间保留在对应 source/raw 与 provenance 内；报告整理时间不能倒填为来源时间。提交前再次核对三者含义，避免让新分析在过去截面的查询中提前可见。

省略 `metadata.contentHash`，让 Host 对这次完整 record 输入计算 canonical JSON 哈希；不得提交后再用 Markdown 文件哈希覆盖它。文件校验值另存为 `provenance.localArtifact.contentSha256`，并注明 subject 是本地 Markdown UTF-8 字节。需要补充审计信息时先读完整节点并保留原有 Host hash；不要为把文件与节点 hash 做成相同值而改写任一哈希。正文和文件是否相同用实际字节比较独立验证。

同时交付本地 Markdown 时，先读回已保存节点的实际 `content`，用这一个字符串写入文件，不另加末尾换行、不重新生成标点；再读回文件逐字节比较。若保存过程规范化了原始输入，以真实节点正文为文件依据，不能把“只差换行”称作完全相同，也不要仅为消除文件格式差异而重写研究节点。

1. 研究日期、对象及最值得读者知道的结论。
2. 今日主线、headline、noteworthy、glance；材料不足时减少条目，不填充内容。
3. 每条新闻的来源链接、证据节点和事实/推断边界。
4. 视频主题时间轴，所有引语附 segment 时间戳。
5. 数据冲突、缺口和次日跟踪问题。
6. 审计附录：asOf、runId、抓取时间、采集统计、quarantine/rejected 统计、节点与文件校验信息。正文先呈现研究内容，技术记录留在附录。

图谱节点就是交付与后续查询的事实源，不写外部日报管线。

## Phase 4：市场观察与校准

按 `market-watch.md` 更新行情与金融事件。使用 `../catalyst-calendar/SKILL.md` 和 `finance_memory` 的 `due/resolve` 处理到期 prediction；财报使用 `../equity-earnings/SKILL.md`。调用 `finance_briefing` 的 `evaluate` 汇总校准结果，不重写历史预测。

市场观察并入同一日报或创建关联 deliverable，保留相同 runId 与清晰 asOf。

## Phase 5：审计与摘要

运行 `research_graph_query` 的 `audit`，检查悬空 references、重复节点和缺失时间字段。最终先呈现简报结论、关键数字、待核对问题和可打开的报告文件；冲突与缺口明确写出。内部 deliverable id、采集统计、视频 segment 覆盖、prediction 结算数量与审计明细保留在 metadata 或核验附录，不以内部字段替代读者能用的简报。

不生成或执行任何交易指令。
