---
name: video-deep-reader
description: >-
  深读公开视频与播客 transcript，保留 segment 起止时间、说话人和原文引用，提取可核验 claim 并写入图谱。用于 earnings call、访谈、演讲和长视频，不另建 LLM client。
---

# Video Deep Reader

视频不是一串失去坐标的摘要。每个事实、引语和推断都必须能跳回原始时间段。

## 输入边界

- 接受用户提供的公开视频 URL、公开 transcript 或合法获得的带时间戳字幕。
- 使用宿主已有的只读 transcript/网页能力或 `finance_*` 工具实际提供的功能；不新建下载服务、Agent loop、Store 或 LLM client。
- 无法获得 transcript 时明确阻塞，不仅凭标题、评论或模型记忆写“深读”。
- 不处理私有报告、账户、密钥或含凭据 URL。
- 不生成或执行任何交易或下单指令。

## 流程

### 1. 固定来源和时间

记录视频/音频 provider、URL、标题、作者、发布时间 availableAt、本次 fetchedAt、研究 asOf、真实 runId 与原始 transcript contentHash。历史研究仍执行 `availableAt <= asOf`。

### 2. 保留 segment 结构

将 transcript 规范化为一组不可丢失定位的 segment，保留 segment start/end：

```json
{
  "segmentId": "seg-0001",
  "speaker": "actual name or Unknown",
  "start": "00:12:31.400",
  "end": "00:12:48.100",
  "startSeconds": 751.4,
  "endSeconds": 768.1,
  "text": "original transcript text"
}
```

时间换算只使用确定性工具； speaker 不明就写 Unknown，不根据声音猜身份。保留原始语言、停顿所表达的保留语气和上下文，不把自动字幕错误静默改成“事实”。

先检查实际字幕和官方页面中的 speaker 标签、播放器与资源 ID，不仅依赖准备材料中的描述。若字幕存在纯说话人标签和同一 cue 内的交接，分别处理并保留混合 cue；不能把所有内容误归一个人，也不能宣称没有实际存在的标签或资源 ID。

`deepLink` 仅在已核实播放器支持该定位格式时添加。普通网页末尾拼接 `#t=` 或猜测 `?t=` 不等于可跳转播放；不能用 URL 的外观宣称定位成功。无法验证时省略 `deepLink`，给出官方原始链接、segmentId、精确起止时间，并明确需手动定位。引用链接的可播放性与字幕/时间定位的完整性分别验收。

### 3. 分段深读

先按主题聚类 segment，再提取：

- 可核验事实与具体数字；
- 说话人的观点、承诺、预测和保留条件；
- 与此前披露一致或矛盾的地方；
- 仍无法确认的问题。

每个观点必须标 speaker 和 `[start, end]`。引用原文与翻译并列，翻译不升级 certainty。视频中的预测应转交 `equity-earnings` 或 `catalyst-calendar` 建立带 dueAt 的 prediction，不能看到后续结果后倒改原预测。

### 4. 计算与证据卡

任何财务数字先按 `financial-data-rigor` 与外部原始披露核对。增速、误差、占比和时间或金额单位换算用宿主实际执行的 Python/JavaScript 确定性复算，记录输入、公式和输出；只有 DCF、comps、portfolio 这三类已提供的估值/组合运算使用 `finance_model`，不编造 calculate 等 action；视频里出现的数字也只是 claim，不自动成为事实。

按 `../finance-source-ingest/references/evidence-card.md` 建卡，provenance.locator 必须含 segmentId/start/end，原文引用不得脱离该 segment。

### 5. 图谱 deliverable

- `source`：视频本身及统一 metadata。
- `raw`：完整分段 transcript 或按稳定 segment 范围拆分的原文。
- `claim`：逐条事实/观点，使用 cite/supports/contradicts 连接 segment 证据。
- `deliverable`：摘要、主题时间轴、关键引语、事实核查、预测与待核验问题，使用 derived_from 保留来源链。

视频摘要中的每个主题也附时间段索引。交付前用 `research_graph_query` 的 `audit` 检查，不允许任何关键引语失去 segment 时间戳。

新摘要、claim 或 deliverable 的 availableAt/fetchedAt 使用实际生成时钟，原视频发布时间与研究 asOf 分开记录，不能把新产物倒填成视频发布当天已存在。若同一正文保存为文件与图谱，提交相同字符串并实际读回核对，不把文件 SHA 当作宿主 contentHash。
