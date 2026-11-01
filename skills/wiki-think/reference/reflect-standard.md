# 编译 Session 复核记录标准

> 由 `../SKILL.md` 引用。文件名仅为兼容既有素材路径而保留；实际记录是 graph `session`，不是私有日记文件。

每次知识编译或 signal 审视以真实 session 节点记录可审计过程，正文只包含：

1. 输入 runId、asOf、sourceIds 与实际 DSH session id（仅宿主明确提供时）；
2. prepare 返回的采用和 rejected/quarantined/future 清单及真实原因；
3. 实际读取的 raw/locator、形成的 question/hypothesis/belief/signal 节点索引；
4. 最重要支持、反证、同源独立性限制和仍缺证据；
5. 原子 plan revision、compile.status 与 audit 结果。

不得写内部虚构角色对话、模型自白、未发生的工具调用或伪造感受，不得把操作记录扩写成最终研究报告。统一 metadata 与 contentHash 由 knowledge-compiler 契约约束；旧 session 不覆盖，新的编译运行使用自己的真实 runId。
