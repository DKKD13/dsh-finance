# QuantMind 风格证据卡与统一 Metadata

证据卡把“材料原文”和“模型断言”分开。每张卡只承载一个可核验断言或一个不可分割的事实组，允许支持、反驳和无法判定三种结果。

## 统一 metadata

金融工作流创建或更新的 source/raw/claim/instrument/valuation/catalyst/prediction/deliverable 节点，以及承载证据的边，都必须包含以下字段：

```json
{
  "provider": "actual-provider-or-user-supplied-public-source",
  "asOf": "2026-01-31T16:00:00-05:00",
  "availableAt": "2026-01-31T16:01:12-05:00",
  "fetchedAt": "2026-02-02T09:00:00Z",
  "contentHash": "sha256:<64-lowercase-hex>",
  "runId": "actual-host-run-id",
  "provenance": {
    "kind": "filing|release|transcript|market-data|public-web|user-public-material",
    "url": "https://...",
    "document": "document title",
    "locator": "page/table/segment id",
    "upstreamProvider": "original provider if republished",
    "license": "source license or terms identifier"
  }
}
```

规则：

- 所有时间是真实、带时区的 ISO 8601；不得用本次运行时间回填发布日期。
- `asOf` 是研究截面，`availableAt` 是公众首次可得时间，`fetchedAt` 是本次抓取时间，三者不可互换。
- `contentHash` 对原始材料或工具明确指定的 canonical payload 计算；记录哈希对象，不能对摘要哈希后冒充原文哈希。
- `runId` 使用真实 Host/工具运行 id；provider 使用实际名称。缺失时标 `missing` 并 quarantine，不得编造看似合法的值。
- `provenance` 至少能定位到 URL/文档与页码、表格、行列或 transcript segment；转载必须保留 upstreamProvider。
- metadata update 是完整替换：先读旧节点并合并合法旧字段，避免无声丢失 provenance。

## 卡片正文

```markdown
## Claim
一句可证伪断言；区分事实、管理层说法、共识和分析推断。

## Evidence
> 原文短引，保留原语言与上下文。

- Source node: source:...
- Locator: page/table/segment + start/end（视频必需）
- Evidence type: supports / contradicts / neutral
- Observed at: ...
- Available at: ...

## Transformations
原始单位/币种/口径 → 统一单位/币种/口径；列出 finance_model runId。

## Assessment
置信度、反证、仍缺什么。证据不足时写 indeterminate，不写强结论。
```

## 时间门

历史截面只允许 `availableAt <= asOf`。发布日期只有日期而无时间时，保守记录日期与来源时区，并标记时间精度；若这可能跨越财报/结算边界，则不用于该边界之前。未来信息只能进入 quarantine，不能通过删除时间字段绕过。

## 关系

- `claim/belief/signal/deliverable -[cite]-> source/raw`：引用实际读取的证据。
- `raw -[supports|contradicts]-> claim`：证据对假说的真实方向；没有冲突时不制造 contradicts。
- `claim -[answers]-> question`，派生判断用 `derived_from` 连接实际上游。
- `session -[produces]->` 连接该次实际产生的编译节点或 deliverable。
- `deliverable -[derived_from]->` 连接基础稿/编译产物；新版 deliverable 用 `supersedes` 连接旧版。
- `valuation -[values]-> instrument`，`catalyst -[catalyzes]-> instrument`。
- `prediction -[resolves]-> instrument/catalyst`：只在到期且有实际证据时创建。

先查已有节点再创建；冲突证据并存，不覆盖。knowledge-compiler 不创建 deliverable，最终报告由用户另选 research/deep-research。完成后用 `research_graph_query` 的 `audit` 检查 references 与边。
