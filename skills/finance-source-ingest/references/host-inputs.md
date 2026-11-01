# 宿主工具参数

以下是工具调用的完整外层结构，尖括号必须替换成真实值。`input` 是 JSON 对象，不是 JSON 字符串。不要运行开发脚本、直接修改 graph.json 或重新实例化 Store 来绕过工具。

## RSS / Atom 等受支持来源

```json
{"action":"fetch","input":{"source":"rss","url":"<真实 feed URL>","runId":"<本次 runId>","asOf":"<确认后的 ISO-8601 截面>","dryRun":true}}
```

`source` 必填。支持 yahoo、sec、openbb、alphasift/alpha-sift、rss/atom/feed、opml、youtube；各 provider 仍需其真实请求参数。没有 `web`、`url`、`public-web` fetch provider。网页文章不是 RSS feed。

若预览返回 `items`，改用 `action:"ingest"`，把返回的实际对象数组放入 `input.items`，保留同一 runId、asOf，设 `input.dryRun:false`，提交已经审阅的同一批原文。

再次 `fetch` 会再次访问上游，内容可能变化；它不等于提交刚才的预览。

## 一般公开网页

先使用当前宿主真正可用的网页读取工具取得完整原文、原始 URL 和可核对的发布时间，再调用 `finance_ingest`：

```json
{
  "action":"ingest",
  "input":{
    "items":[{
      "provider":"<实际发布方>",
      "canonicalUrl":"<原文 URL>",
      "title":"<原文标题>",
      "content":"<实际读到的完整原文，不能换成模型摘要>",
      "asOf":"<本次研究截面>",
      "availableAt":"<有依据的材料可用时间>",
      "fetchedAt":"<本次实际读取时间>",
      "provenance":{"url":"<原文 URL>","locator":"<实际段落、页码或选择器>"}
    }],
    "runId":"<本次 runId>",
    "asOf":"<同一研究截面>",
    "dryRun":true
  }
}
```

宿主根据 `content` 计算 SHA-256；可以省略 `contentHash`。若传入哈希，必须是同一原文的实际哈希。三个时间字段都必填，不知道 `availableAt` 就不要编造，使用允许未知时间的 Clip/File 隔离路径或报告缺失。

检查预览的 sourceIds/rawIds、时间门和错误后，用完全相同的 items、runId、asOf 与 `dryRun:false` 提交。以工具返回的真实 source/raw ID 为准；不要根据 URL 自己猜 ID。随后用 `finance_graph` 的 `get` 或 `research_graph_node` 的 `get` 读回。

## 简报工具的外层参数

`finance_briefing.prepare/evaluate` 的 asOf/query/kinds 位于工具参数顶层，放进 `input` 会被忽略：

```json
{"action":"prepare","asOf":"<确认后的截面>","query":"AAPL","kinds":["source","claim"]}
```

```json
{"action":"evaluate","asOf":"<确认后的截面>"}
```

只有 `record` 使用 `input`，正文为当前会话实际撰写的 Markdown：

```json
{"action":"record","input":{"id":"<本次 deliverable ID>","title":"<标题>","content":"<Markdown 正文>","references":["<实际存在的 source ID>"],"metadata":{"provider":"daily-digest","asOf":"<研究截面>","availableAt":"<本次新报告实际生成可用时间>","fetchedAt":"<实际生成时间>","runId":"<本次 runId>","sessionId":"<当前真实 DSH session ID>","provenance":{"sourceRefs":["<实际 source ID>"]}}}}
```

新报告的 availableAt 是本次实际生成可用时间，先读真实时钟；研究截面 asOf 和原材料发布日期分别保留，不能把旧材料日期或研究截面复制成新报告的可用时间。contentHash 由 Host 根据完整记录计算，勿用本地 Markdown 文件哈希覆盖 Host 记录哈希；本地文件哈希另存 provenance，并说明校验对象。

保存后读回 deliverable、引用和实际 revision，不能把 prepare 或 dryRun 视为已保存。
