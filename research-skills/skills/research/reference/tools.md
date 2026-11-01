# Research Tools Reference

> 由 `research/SKILL.md` 引用。**按 SKILL.md 信息源优先级顺序排列** — 每次研究先查本地，再用高质量源，最后 web_search 补漏；财务数据每次现拉。分析过程中随时调用，遇到新问题就去搜，不是开头搜一次就够了。

## 1. 本地知识库（第一优先）

独家材料 — 研报、10-K、访谈纪要、做空报告、已沉淀的历史分析。`investor-wiki/raw/` 和 `investor-wiki/wiki/` 是 Alex 的 edge，别人没有。**先查本地不可谈判**。

```bash
python ~/tools/kb.py search "查询" --top 5
python ~/tools/kb.py list --company TICKER
```

**语义检索**（优先于关键词 Grep）：
```bash
qmd query "natural language question here" --limit 10
qmd doc-query investor-wiki/raw/webclipper/文件名.md "specific question about this file"
```
`qmd query` 混合 BM25 + 向量语义 + LLM rerank，覆盖 wiki/ + raw/ 全量 640+ 文件。比 Grep 关键词匹配准确度高得多，尤其适合"围绕一个问题搜 10 次"的 deep research 场景。

也可以直接用 Read / Grep 工具进入：

- `investor-wiki/wiki/tickers/{ticker}.md` — 个股档案页
- `investor-wiki/wiki/funds/{fund}.md` — 基金档案页
- `investor-wiki/wiki/signal/{topic}.md` — 跨源投资主题
- `investor-wiki/wiki/sources/source-*.md` — 单份材料编译页
- `investor-wiki/raw/investor-letters/` — 原始基金信件（junction 到 D:/investor-letters/）

## 2. 高质量信息源（第二）

信号密度远高于泛搜索。37 个 RSS 源 + HN + ArXiv + Folo。

```bash
python ~/tools/sources.py rss "关键词" --top 10
python ~/tools/sources.py hn "关键词" --top 5
python ~/tools/sources.py arxiv "关键词" --top 5
python ~/tools/sources.py folo "关键词" --top 10
```

## 3. Web 搜索补漏（第三）

前两步没覆盖的缺口才用。优先一手材料：

`site:sec.gov` | 公司 IR | Earnings transcript | 技术文档 | GitHub issues | Reddit/HN 高质量讨论

## 4. 财务数据 — yfinance（每次现拉）

**永远获取最新数据，不依赖记忆**。历史财务数字会被新财报覆盖，股价和市值时时变化。

```bash
python -c "import yfinance as yf; t=yf.Ticker('TICKER'); print(t.financials.to_string())"
python -c "import yfinance as yf; t=yf.Ticker('TICKER'); print(t.cashflow.to_string())"
python -c "import yfinance as yf; t=yf.Ticker('TICKER'); print(t.balance_sheet.to_string())"
python -c "import yfinance as yf; t=yf.Ticker('TICKER'); print(t.info)"
python -c "import yfinance as yf; t=yf.Ticker('TICKER'); print(t.quarterly_financials.to_string())"
python -c "import yfinance as yf; t=yf.Ticker('TICKER'); print(t.quarterly_balance_sheet.to_string())"
```
