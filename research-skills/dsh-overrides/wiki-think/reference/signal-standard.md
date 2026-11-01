# Graph Signal / Hypothesis 标准

> 由 `../SKILL.md` 引用。signal 是可跟踪的研究假说，不是交易备忘录或订单。

## 必答问题

1. **机制**：证据支持什么因果链，在哪些条件下不成立？
2. **预期差**：来源中的共识或既有 belief 是什么，当前假说差异在哪里？没有证据时明确未知。
3. **可验证性**：什么未来公开证据能支持或推翻它，实际 deadline/catalyst 是什么？
4. **Kill criteria**：哪些可观察条件使假说失效？不得用泛泛 risk factors 代替。

## 节点契约

编译产生的 claim 必须使用 `metadata.claimType = "hypothesis"`。claim、belief、signal 按适用情况包含：

- `killCriteria`：可观察条件；数字阈值必须有证据或明确标为待验证假设；
- `confidence`：定性 level 与 rationale；没有校准时不得制造精确百分比；
- `evidence`：每项含真实 sourceId/rawId/locator/relation，以及 reliability 和 independence 的 level/group/rationale；
- 统一 compile metadata：compileRunId/runId/provider/asOf/availableAt/contentHash/provenance，dshSessionId 仅在宿主真实提供时记录。

标题应是一句可证伪判断，正文清楚区分事实、来源观点和当前分析。证据不足时保持低 confidence 或不建 signal。

## 关系与更新

- claim -[answers]-> question；
- claim/belief/signal -[cite]-> source/raw；
- raw -[supports|contradicts]-> claim；
- 派生节点用 derived_from 连接实际上游，编译 session 用 produces 连接本轮产物。

新证据应改变论证结构或明确为什么不改变，不只堆叠引用。矛盾标记为 scope/data/framework 并保留双方。更新版本通过 `supersedes` 保留历史，不修改旧预测，不用固定公式机械加减 confidence。

所有写操作使用一次原子 `finance_graph plan`；signal 不是 deliverable，最终报告由用户另选 research/deep-research。
