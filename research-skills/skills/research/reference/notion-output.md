# 图谱 Deliverable 输出契约

> 由 `research/SKILL.md` 引用。文件名仅为兼容既有素材路径而保留；实际输出只进入 research graph。

## 节点

每次研究创建 `deliverable`，正文为干净 Markdown，包含标题、研究截面、结论、核心论证、反方、估值/风险、证据缺口和来源索引。相关 source/raw/question/claim/belief/signal/valuation/catalyst/prediction 分开建节点，不把全部证据塞进一个不可查询的大字段。knowledge-compiler 只提供假说底稿；只有用户明确选择 research/deep-research 后才创建 deliverable。

最终用一个原子 `finance_graph plan` 写入 deliverable 和本轮新增节点/边，不逐节点补写。所有来源必须先 get 完整节点；统一 metadata 与 contentHash 对实际产物内容负责，不复制证据哈希冒充报告哈希。

## Markdown 正文

正文面向研究读者，而不是运行诊断。标题之后先给一句研究截面和核心判断，再展开机制、反证、风险与证据缺口。默认使用各级标题、短段落、项目符号和窄表格；不把内部角色、轮次、工具返回或审查痕迹写进终稿。

技术追踪信息留在图谱：正常报告正文、标题行、免责声明行和来源区都不展示 `source:*` / `raw:*` / `run:*` 等节点或运行 ID，也不附 `contentHash`、模型 runId、provider 原始响应或哈希清单。必要的 ID、哈希、`cite`、`derived_from`、`supersedes` 和完整 provenance 继续保存在 deliverable 及其关联节点/边的 metadata 与 `audit` 中；去掉正文技术字段不能减少这些关系。

正文引用使用可读编号，例如 `[1]`。每个编号在末尾“来源与证据”中对应一条：

```markdown
1. **<实际材料标题>** — <实际出版方或公司>, <已知发布日期；仅有可得时间时明确写“可得日期”>。原文：“<逐字短引>”；位置：<页码、表格/行列、章节或 transcript segment>。
```

来源行只使用已 get 的真实节点、raw 正文与 provenance：

- 标题取材料自身的实际标题，或 provenance 中明确表示文档名的字段；不得用节点 ID、URL 或自动摘要代替标题。
- 出版方或公司只在字段确实指向材料发布者时展示；`provider` 若只是抓取/数据供应工具，不能冒充出版方。
- 发布日期优先使用材料明确记录的发布时间；只有 `availableAt` 可信地代表公众可得时间时才展示为“可得日期”。不得把 `asOf`、`fetchedAt` 或报告生成时间写成发布日期。
- 短引必须逐字取自实际 raw，并保留原语言；位置只在真实 locator 存在时写明。没有细粒度 locator 时写“全文”，不得补造页码、章节、表格位置或时间戳。
- 不得编造标题、出版方、日期或 URL。字段缺失时明确写“标题未记录”“出版方未知”或省略可选信息，不根据 URL、文件名、公司简称或常识补全。

每个正文引用仍须有对应的 `deliverable -[cite]-> source/raw`；正文编号只是可读呈现，不替代图谱关系。

## 关系

- `deliverable -[derived_from]->` 基础稿和实际使用的编译 question/claim/belief/signal。
- `deliverable -[cite]-> source/raw`；保留 `raw -[supports|contradicts]-> claim`。
- 真实研究 session 存在时，`session -[produces]-> deliverable`。
- 新版 `deliverable -[supersedes]->` 旧版，旧版不删除。
- `valuation -[values]-> instrument`。
- `catalyst -[catalyzes]-> instrument`；实际事件到期后 `prediction -[resolves]-> instrument/catalyst`。
- 组合只使用 holds 与 exposure_to，不另建平行关系。

## Metadata 与审计

所有金融节点和证据边使用 `../../finance-source-ingest/references/evidence-card.md` 的统一 metadata。update metadata 是整体替换，因此先 get 再合并。

图谱写入和审计完成后，正常对话的最终回复直接呈现 `deliverable` 的读者版 Markdown，至少包括结论、核心论证和“来源与证据”；不要用节点 id、哈希或审计明细代替报告正文。交付节点 id、runId、哈希、完整 provenance 与 audit 结果保留在 metadata 和审计记录中，仅在用户要求追踪或排查时作为简短附注展示。

完成后运行 `research_graph_query` 的 `audit`，确保没有新增悬空 references。不向外部笔记、文档或账户系统发布，不生成交易指令。
