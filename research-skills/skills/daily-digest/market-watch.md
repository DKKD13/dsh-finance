---
name: market-watch
description: Fetch current stock prices via WebSearch and append 📈 市场观察 to today's Notion daily report + Obsidian. Standalone — can run independently of /daily-digest. Invoke with /market-watch.
---

# Market Watch — 市场观察

Append a 📈 市场观察 section to today's daily report (Notion + Obsidian).

## Step 1: Find today's report

Check if today's report exists:

```bash
cd "D:\项目开发\RSS-Notion" && ls output/$(date +%Y-%m-%d)/tiered.json 2>/dev/null && echo "FOUND" || echo "NOT_FOUND"
```

If found, read the tiered.json to get today's headlines for cross-referencing.
If not found, ask the user for the Notion page URL or ID.

## Step 2: Get the Notion page ID

Look for `REPORT_PAGE_ID` in today's pipeline output, or extract from the Notion URL:
- URL format: `https://www.notion.so/AI-Daily-YYYY-MM-DD-<32hex>`
- Page ID: insert dashes into the 32-hex suffix: `XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX`

## Step 3: Fetch market data via WebSearch

Search for current/latest closing prices:
- **M7**: AAPL, MSFT, GOOGL, AMZN, NVDA, META, TSLA
- **Semis**: AVGO, SMH, SOXX
- **Indices**: SPY, QQQ

## Step 4: Build insights

Write 3-4 "核心 read" insights connecting stock moves to today's AI/tech headlines:
- Lead with the price move (e.g. "GOOGL +3.9%")
- Connect to a specific headline event
- Your analysis of implications

## Step 5: Append to Notion

Build Notion blocks and append via Python:

```bash
cd "D:\项目开发\RSS-Notion" && python -c "
import asyncio, json
from dotenv import load_dotenv; load_dotenv()
from delivery.notion_writer import (
    _heading2, _heading3, _paragraph, _callout_block,
    _plain_text, _bold_text, _divider, _table_block,
    _get_notion_client, _run_sync,
)

PAGE_ID = '{page_id}'
blocks = [
    _divider(),
    _heading2('📈 市场观察 ({date} 收盘)'),
    # ... construct price table, insights, disclaimer ...
]

async def push():
    client = _get_notion_client()
    await _run_sync(client.blocks.children.append, block_id=PAGE_ID, children=blocks)
    print('OK')
asyncio.run(push())
"
```

## Step 6: Append to Obsidian

Append markdown to `D:\研究空间\AI_Daily\{date}.md`:

```markdown
---

## 📈 市场观察 ({date} 收盘)

**指数** · SPY $XXX · QQQ $XXX

| 代码 | 收盘 | 涨跌 |
| --- | --- | --- |
| NVDA | $XXX | +X.X% |
| ... | ... | ... |

### 今日核心 read

> [!info] 1. GOOGL +X.X% — 与某头条事件的关联
> 分析内容...

> [!note] 2. ...
> ...

> [!warning] 数据来自 Web Search，盘后可能微调，仅供参考。
```
