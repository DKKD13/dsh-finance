---
name: daily-digest
description: Run the full AI daily digest pipeline — fetch sources, score/tier items, generate polished report, write to Notion + Obsidian, append market observation. One-click daily workflow. Invoke with /daily-digest.
---

# AI Daily Digest Pipeline

You are running the complete AI Daily Digest pipeline. This replaces `python main.py` — YOU are the LLM that does the editorial scoring and report generation.

**Project root:** `D:\项目开发\RSS-Notion`
**Obsidian vault:** `D:\研究空间\AI_Daily`

Follow each phase sequentially. Report progress after each phase.

---

## Phase 1: Fetch Sources + Load Preferences

Run the IO layer to fetch all 10 sources concurrently and load user preferences:

```bash
cd "D:\项目开发\RSS-Notion" && python pipeline_io.py fetch
```

This takes ~10 minutes (RSS enrichment is slow). Parse the output for:
- `SOURCES_JSON=<path>` — the file to read in Phase 2
- `TOTAL_ITEMS=<N>` — total items fetched

After it completes, read the sources.json file to get the items, clipper_text, interests_text, and source_stats_text.

---

## Phase 2: Editorial Scoring & Tiering (YOU are the LLM)

This is the core editorial step. Read the scoring prompt from:
`D:\项目开发\RSS-Notion\prompts\scorer_system.txt`

Then perform the scoring task:

**Input you need from sources.json:**
- `clipper_text` — user's recent Web Clipper saves (interest signal)
- `interests_text` — fallback if no clipper data
- `source_stats_text` — source fetch statistics for run report
- `items` array — all fetched articles (title, url, source_name, description)

**Your job:**
1. Read the clipper_text to understand user interests
2. Scan all items, perform event clustering (merge duplicates)
3. Select and tier: 2-3 headline, 4-6 noteworthy, 8-12 glance
4. Write daily_summary (50-100 chars) and run_report (200-300 char reflection)

**Output as valid JSON** (save to `output/{date}/tiered.json` via Write tool):
```json
{
  "headline": [
    {
      "event_title": "事件标题",
      "source_count": 5,
      "best_source_url": "https://...",
      "best_source_name": "来源名",
      "analysis": "200-300字深度分析",
      "related_sources": [
        {"title": "原文标题", "url": "...", "source_name": "...", "channel": "来源分类", "one_liner": "一句话"}
      ]
    }
  ],
  "noteworthy": [
    {
      "event_title": "事件标题",
      "source_count": 1,
      "best_source_url": "...",
      "best_source_name": "...",
      "summary": "80-100字",
      "insight": "一句话洞察",
      "related_sources": [...]
    }
  ],
  "glance": [
    {"title": "原文标题", "url": "...", "source_name": "...", "channel": "...", "one_liner": "一句话"}
  ],
  "daily_summary": "50-100字今日总结",
  "run_report": "200-300字筛选反思",
  "events_total": 76,
  "selected_total": 21
}
```

**Channel options (5 only):**
- "一手/官方"
- "深度研究"  
- "长内容/播客"
- "社交/社区/Twitter"
- "开源/技术/论文"

**Rules:**
- Each channel must appear at least once
- "长内容/播客" must have at least 2 items
- 20-30% surprise discovery space (not just matching clipper interests)
- Same event → merge, keep best source only

---

## Phase 3: Daily Report Polish (YOU are the LLM)

Read the report prompt from:
`D:\项目开发\RSS-Notion\prompts\report_system.txt`

Take your Phase 2 output + original source items as context. Generate a polished newsletter report:

```json
{
  "one_liner": "今日主线一句话（有态度、有节奏）",
  "headline": [
    {
      "event_title": "润色后的事件标题",
      "source_count": 5,
      "analysis": "150-250字，写'所以呢'——判断和推演，**关键数字加粗**",
      "best_source_url": "...",
      "best_source_name": "...",
      "related_sources": [...]
    }
  ],
  "noteworthy": [
    {
      "event_title": "...",
      "source_count": 1,
      "priority": "high|medium|low",
      "summary": "80-100字，**关键部分加粗**",
      "insight": "具体洞察",
      "best_source_url": "...",
      "best_source_name": "...",
      "related_sources": [...]
    }
  ],
  "glance": [{"title": "...", "source_name": "...", "url": "...", "channel": "...", "one_liner": "..."}],
  "signals": [{"keyword": "趋势词", "note": "1-2句为什么值得关注"}]
}
```

Now save the combined data for Phase 4. Write to `output/{date}/tiered.json`:
```json
{
  "date": "YYYY-MM-DD",
  "tiered": { ...Phase 2 JSON... },
  "report": { ...Phase 3 JSON... },
  "total_fetched": N
}
```

---

## Phase 4: Write to Notion

Run the IO layer to write to Notion:

```bash
cd "D:\项目开发\RSS-Notion" && python pipeline_io.py write "output/{date}/tiered.json"
```

Parse output for `REPORT_URL` and `REPORT_PAGE_ID`.

---

## Phase 5: Market Observation

### 5a: Fetch prices

Use yfinance to get closing prices for:
- **M7**: AAPL, MSFT, GOOGL, AMZN, NVDA, META, TSLA
- **Semis**: AVGO, SMH, SOXX
- **Indices**: SPY, QQQ

### 5b: Search investment community context

Use **WebSearch** to gather per-ticker context from:
- **Seeking Alpha**: analyst articles, market news, ratings for top movers
- **雪球 (xueqiu.com)**: Chinese investor discussions on key tickers
- **Financial media**: FT, Bloomberg, CNBC, Motley Fool recent coverage

Focus searches on the 3-4 stocks with biggest moves or strongest headline connections.
SA RSS feeds (already in sources.yaml) provide baseline items; WebSearch fills real-time gaps.

### 5c: Write integrated analysis

**For each of the 7 M7 + AVGO stocks**, write a section that covers:

1. **Price + one-line headline** as `heading_3` with emoji color code:
   - 🟢 = up >1%  🔴 = down >1%  🟡 = flat/small move
   - Format: `🟢 AVGO $371.55 (+4.69%) — Anthropic 芯片合约落地`

2. **TradingView chart embed** for top 3-4 stocks (biggest movers or most narrative-rich):
   ```
   {"type": "embed", "embed": {"url": "https://www.tradingview.com/widgetembed/?symbol=NASDAQ:{TICKER}&interval=D&theme=light&style=3&locale=en&hide_side_toolbar=1&allow_symbol_change=0&save_image=0&withdateranges=1"}}
   ```
   Only embed charts for stocks with substantial analysis. Skip for brief entries.

3. **Analysis paragraph** with:
   - What the market is discussing today (SA articles, 雪球 hot topics, media coverage)
   - Key numbers **bolded** ($revenue, +growth%, analyst targets)
   - Links inline: `[SA article title](url)`, `[雪球](xueqiu url)`
   - Connection to today's headlines from Phase 2 (e.g. "今日头条的开源模型繁荣 = 推理算力需求引擎")

4. **💡 Insight callout** (yellow_background) — one opinionated takeaway per stock

5. **🟣 Source lines** — same format as main report:
   `🟣 **Source** — [Article Title](url) — one-line note`

**Market overview** at top:
- `callout` blue_background with indices summary + key flow signals (CTA, geopolitical risk)

**Market summary** at bottom:
- `callout` yellow_background with 主线/暗线/风险/日历

**Disclaimer** at end:
- `callout` gray_background ⚠️

### 5d: Append to Notion

Write a Python script file to `D:\项目开发\RSS-Notion\tmp_market_push.py`, then execute it.
Use the same Notion block helpers as the main report:
- `_heading3`, `_paragraph`, `_callout_block`, `_plain_text`, `_bold_text`, `_link_text`, `_divider`
- TradingView embeds as `{"type": "embed", "embed": {"url": ...}}`
- Source lines as `p([t("🟣 "), b(source), t(" — "), a(title, url), t(" — " + note)])`
- Insight callouts as `_callout_block("💡", [t(text)], "yellow_background")`

Delete any existing market blocks before appending new ones.
Clean up the temp script after execution.

### 5e: Write Obsidian markdown

Write the same market observation to `D:\研究空间\AI_Daily\{date}.md`.

Format:
```markdown
## 📈 市场观察 ({date} 收盘)

| Ticker | 收盘价 | 日涨跌 | | Ticker | 收盘价 | 日涨跌 |
(compact two-column table for all tickers)

Overview paragraph with inline links.

---

### 🟢 AVGO $371.55 (+4.69%) — Headline
Analysis with **bold numbers**, [linked sources](url), and connection to today's headlines.
> [!tip] 💡 Insight callout

🟣 **Source** — [Title](url) — note
🟣 **Source** — [Title](url) — note

(repeat for each stock)

---

> [!abstract] 市场全景
> **主线/暗线/风险/日历**

> [!warning] 免责声明
```

---

## Phase 6: Obsidian Daily Report

Write the full daily report to Obsidian (not just market section).

Read the report JSON from Phase 3 and format as Obsidian markdown. Append or create the file at `D:\研究空间\AI_Daily\{date}.md`:

```markdown
# AI Daily Digest — {date}

> {one_liner}

## 📰 头条

### {headline.event_title}
{headline.analysis}
**来源**: [{best_source_name}]({best_source_url})

## 🔍 值得关注
...

## ⚡ 速览
| 标题 | 来源 | 一句话 |
| --- | --- | --- |
...

## 📡 信号雷达
...
```

---

## Phase 7: Maintenance

Run cleanup and sync tasks:

```bash
cd "D:\项目开发\RSS-Notion" && python pipeline_io.py maintain
```

---

## Phase 8: Summary

Print a final summary:
```
Pipeline 完成！
- 抓取: {total_fetched} 条 → 精选: {selected} 条 ({headline} headline / {noteworthy} noteworthy / {glance} glance)
- Notion 日报: {report_url}
- Notion inbox: {items_written} 条写入
- 市场观察: 已追加
- Obsidian: D:\研究空间\AI_Daily\{date}.md
- 维护: Deep Reader {n}页, Clipper {n}条, Cleanup {n}条
```
