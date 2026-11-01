import type { GraphNode } from '../../src/graph.ts'
import type { FinanceSection } from '../finance-store.ts'
import { historicalResearch } from '../research.ts'
import { discoveryDemoAssets, discoveryRecords } from './FinanceDiscovery.tsx'
import { predictionMarketDemoContracts, predictionMarketRecords } from './FinanceEvents.tsx'
import { disclosureRecords } from './FinanceScreening.tsx'
import { AssetLogo } from './AssetLogo.tsx'
import { FINANCE_ASIDE_CONTEXT_STYLE } from '../finance-aside-context-styles.ts'

/** The personal research rail always reads real graph records, including in demo mode. */
export function FinanceAside({ nodes, demo, locale, section, onOpenSymbol, onOpenSection, onResearch }: {
  readonly nodes: readonly GraphNode[]
  readonly demo: boolean
  readonly locale: string
  readonly section?: FinanceSection | undefined
  readonly onOpenSymbol: (symbol: string) => void
  readonly onOpenSection: (section: FinanceSection) => void
  readonly onResearch: (question: string) => void
}) {
  const zh = locale.startsWith('zh')
  const text = (cn: string, en: string) => zh ? cn : en
  const instruments = [...discoveryRecords(nodes, false), ...discoveryRecords(nodes, true)]
  const watched = [
    ...instruments.flatMap(asset => asset.node && asset.records?.some(record => record.metadata.watchlist === true) ? [asset.node] : []),
    ...nodes.filter(node => node.kind === 'instrument' && node.metadata.watchlist === true && (typeof node.metadata.symbol !== 'string' || !node.metadata.symbol.trim())),
  ]
  const hypotheses = nodes.filter(node => node.kind === 'claim' || node.kind === 'question')
  const predictions = nodes.filter(node => node.kind === 'prediction')
  const sources = nodes.filter(node => node.kind === 'source')
  const reports = nodes.filter(historicalResearch)
  const contextSections: readonly FinanceSection[] = ['markets', 'screener', 'earnings', 'politicians', 'prediction-markets']
  const contextVisible = section !== undefined && contextSections.includes(section)
  const explicitInstruments = nodes.filter(node => node.kind === 'instrument' && typeof node.metadata.symbol === 'string')
  const relatedInstruments = section === 'politicians'
    ? [...new Set(disclosureRecords(nodes).map(row => row.symbol.trim().toUpperCase()).filter(Boolean))].map(symbol => ({
        id: symbol,
        symbol,
        title: explicitInstruments.find(node => String(node.metadata.symbol).trim().toUpperCase() === symbol)?.title ?? symbol,
      }))
    : instruments.map(asset => ({ id: asset.node?.id ?? asset.symbol, symbol: asset.symbol, title: asset.name }))
  const contracts = demo ? predictionMarketDemoContracts : predictionMarketRecords(nodes)
  const demoMovers = [...discoveryDemoAssets].sort((left, right) => Math.abs(right.change ?? 0) - Math.abs(left.change ?? 0)).slice(0, 3)
  const contextTitle = section === 'prediction-markets'
    ? text('相关预测市场', 'Related prediction markets')
    : section === 'earnings'
      ? text('相关标的', 'Related instruments')
      : section === 'politicians'
        ? demo ? text('样例标的', 'Example instruments') : text('相关交易标的', 'Related traded instruments')
        : text('相关标的', 'Relevant instruments')
  return <aside className="rg-pf-aside" aria-label={text('我的投研', 'My investment research')}>
    <style>{FINANCE_ASIDE_CONTEXT_STYLE}</style>
    <section>
      <div className="rg-pf-aside-head"><h3>{demo ? text('创建关注列表', 'Build a watchlist') : text('我的关注列表', 'My watchlist')}</h3><button type="button" onClick={() => onOpenSection('watchlist')}>{text('全部', 'View all')}</button></div>
      {!demo && <p className="rg-pf-aside-caption">{text('你的图谱记录 · 真实资料', 'Your graph records · Real sources')}</p>}
      <div className="rg-pf-watch-preview">{demo ? discoveryDemoAssets.slice(0, 5).map(asset => <button type="button" key={asset.symbol} className="rg-pf-aside-asset" onClick={() => onOpenSymbol(asset.symbol)}><AssetLogo symbol={asset.symbol} /><span><strong>{asset.name}</strong><small>{asset.symbol}</small></span><span className="rg-pf-aside-price">${asset.price?.toFixed(2)}<small>{asset.change !== null && asset.change > 0 ? '+' : ''}{asset.change?.toFixed(2)}%</small></span></button>) : watched.length === 0 ? <div className="rg-pf-aside-empty"><p>{text('还没有关注标的', 'No watched instruments yet')}</p><button type="button" onClick={() => onOpenSection('market')}>{text('搜索并添加股票', 'Find and follow a stock')}</button></div> : watched.slice(0, 5).map(node => {
        const symbol = typeof node.metadata?.symbol === 'string' ? node.metadata.symbol : node.content.trim()
        return <button type="button" className="rg-pf-aside-asset" key={node.id} onClick={() => symbol ? onOpenSymbol(symbol) : onOpenSection('watchlist')}>
          <AssetLogo symbol={symbol || node.title} /><span><strong>{node.title}</strong><small>{symbol || text('未记录代码', 'No symbol recorded')}</small></span><svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3" aria-hidden="true"><path d="m6 4 4 4-4 4"/></svg>
        </button>
      })}</div>
    </section>
    {contextVisible && <section className="rg-aside-context" aria-label={contextTitle}>
      <div className="rg-pf-aside-head rg-aside-context-head"><h3>{contextTitle}</h3></div>
      {demo && section === 'politicians' && <p className="rg-pf-aside-caption">{text('仅为样例标的，不代表真实政治披露。', 'Example instruments only, not actual political disclosures.')}</p>}
      {section === 'prediction-markets' && <button type="button" className="rg-aside-context-related" onClick={() => onOpenSection('prediction-markets')}><strong>{text('查看预测市场事件', 'Explore prediction market events')}</strong><small>{text('打开现有预测市场页面', 'Open the existing prediction markets page')}</small></button>}
      {demo && section !== 'prediction-markets' ? <div className="rg-aside-context-list">{demoMovers.map(asset => <button type="button" className="rg-aside-context-row" key={asset.symbol} onClick={() => onOpenSymbol(asset.symbol)}><AssetLogo symbol={asset.symbol} /><span className="rg-aside-context-copy"><strong>{asset.name}</strong><small>{asset.symbol}</small></span><span className="rg-aside-context-value">${asset.price?.toFixed(2)}<small data-up={asset.change === null ? undefined : asset.change >= 0}>{asset.change !== null && asset.change > 0 ? '+' : ''}{asset.change?.toFixed(2)}%</small></span></button>)}</div> : <>
        {section === 'prediction-markets' && contracts.slice(0, 3).map(contract => <button type="button" key={contract.id} className="rg-aside-context-row" onClick={() => onOpenSection('prediction-markets')}><span className="rg-aside-context-copy"><strong>{contract.title}</strong><small>{demo ? text('演示合约', 'Demo contract') : text('已导入外部合约', 'Imported external contract')}</small></span></button>)}
        {section !== 'prediction-markets' && relatedInstruments.slice(0, 3).map(node => {
          const symbol = node.symbol
          return <button type="button" key={node.id} className="rg-aside-context-row" onClick={() => onOpenSymbol(symbol)}><AssetLogo symbol={symbol} /><span className="rg-aside-context-copy"><strong>{node.title}</strong><small>{symbol}</small></span><svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3" aria-hidden="true"><path d="m6 4 4 4-4 4"/></svg></button>
        })}
        {(section === 'prediction-markets' ? contracts.length === 0 : relatedInstruments.length === 0) && <p className="rg-aside-context-empty">{text('当前没有显式导入的相关记录。', 'No explicitly imported related records yet.')}</p>}
      </>}
    </section>}
    <section>
      <div className="rg-pf-aside-head"><h3>{text('投资假说', 'Investment theses')}</h3><button type="button" onClick={() => onOpenSection('hypotheses')}>{text('审查', 'Review')}</button></div>
      {hypotheses.length === 0 ? <p className="rg-pf-aside-caption">{text('从原始资料建立可验证的假说。', 'Build testable theses from original sources.')}</p> : hypotheses.slice(0, 3).map(node => <button key={node.id} type="button" className="rg-pf-aside-record" onClick={() => onOpenSection('hypotheses')}>{node.title}<small>{node.kind === 'claim' ? text('假说', 'Thesis') : text('待研究问题', 'Open question')}</small></button>)}
    </section>
    <section>
      <div className="rg-pf-aside-head"><h3>{text('我的预测与复盘', 'My predictions')}</h3><button type="button" onClick={() => onOpenSection('predictions')}>{predictions.length}</button></div>
      <p className="rg-pf-aside-caption">{text('保留提出时点、依据和结算结果。', 'Keep the original date, rationale and resolution.')}</p>
      {predictions.slice(0, 2).map(node => <button type="button" key={node.id} className="rg-pf-aside-record" onClick={() => onOpenSection('predictions')}>{node.title}</button>)}
    </section>
    <section>
      <div className="rg-pf-aside-head"><h3>{text('研究资料', 'Research sources')}</h3><button type="button" onClick={() => onOpenSection('library')}>{sources.length}</button></div>
      <div className="rg-pf-aside-links"><button type="button" onClick={() => onOpenSection('inbox')}>{text('添加网页或文件', 'Add a page or file')}</button><button type="button" onClick={() => onOpenSection('reports')}>{text(`查看 ${reports.length} 份报告`, `Read ${reports.length} reports`)}</button><button type="button" onClick={() => onResearch(text('请基于我的真实资料和假说，生成一份带原文引用的投资研究简报，列明事实、推断和缺失证据。', 'Create an investment brief using my real sources and theses, with original citations. Separate facts, inferences and missing evidence.'))}>{text('用我的资料生成简报', 'Create a brief from my sources')}</button></div>
    </section>
  </aside>
}
