import { useState } from 'react'
import type { FormEvent } from 'react'
import type { GraphNode } from '../../src/graph.ts'
import { discoveryDemoAssets, discoveryRecords } from './FinanceDiscovery.tsx'
import type { DiscoveryAsset } from './FinanceDiscovery.tsx'

interface Props {
  readonly nodes: readonly GraphNode[]
  readonly demo: boolean
  readonly locale?: string | undefined
  readonly onOpenSymbol: (symbol: string) => void
  readonly onResearch: (question: string) => void
}

interface Stock extends DiscoveryAsset {
  readonly pe: number | null
  readonly growth: number | null
  readonly lowDistance: number | null
}

const num = (value: unknown) => typeof value === 'number' && Number.isFinite(value) ? value : null
const str = (value: unknown) => typeof value === 'string' ? value : ''
const obj = (value: unknown): Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value) ? value as Record<string, unknown> : {}
const list = (value: unknown): readonly unknown[] => Array.isArray(value) ? value : []
const safeHttpUrl = (value: unknown) => {
  const url = str(value)
  return /^https?:\/\//i.test(url) ? url : ''
}

export function screenerRecords(nodes: readonly GraphNode[], demo: boolean): Stock[] {
  return (demo ? discoveryDemoAssets : discoveryRecords(nodes, false)).map((asset, index) => ({
    ...asset,
    pe: demo ? [28, 33, 42, 21, 39, 24, 13, 12, 48, 31, 19, 17][index] ?? null : num(asset.node?.metadata.pe),
    growth: demo ? [8, 16, 38, 12, 14, 22, 7, -3, 28, 6, -4, 9][index] ?? null : num(asset.node?.metadata.revenueGrowthPercent),
    lowDistance: demo ? 5 + index * 3 : num(asset.node?.metadata.distanceFrom52WeekLowPercent),
  }))
}

const PRESETS = [
  ['超大盘价值股', 'Mega-cap value', '大型公司，较低盈利倍数', 'Large companies with lower earnings multiples'],
  ['科技成长股', 'Technology growth', '寻找营收增长的科技公司', 'Technology companies growing revenue'],
  ['盈利软件与平台', 'Profitable platforms', '关注有盈利的科技与平台企业', 'Profitable technology and platform companies'],
  ['现金流研究', 'Cash-flow leaders', '研究自由现金流与资本配置', 'Research free cash flow and capital allocation'],
  ['接近 52 周低点', 'Near 52-week lows', '观察价格接近年度低点的公司', 'Companies trading near their annual lows'],
  ['营收下滑股', 'Declining revenue', '关注营收同比下降的公司', 'Companies reporting lower revenue'],
] as const

function ScreenIcon({ label }: { readonly label?: string }) {
  return <svg width="17" height="17" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.25" aria-hidden={label ? undefined : true} role={label ? 'img' : undefined}>
    {label && <title>{label}</title>}
    <rect x="2.25" y="3" width="13.5" height="10.5" rx="1.5"/>
    <path d="M5 6.25h8M5 9h8M5 11.75h4.75"/>
  </svg>
}

function ArrowIcon() {
  return <svg width="17" height="17" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
    <path d="M3.5 9h10M9.5 5l4 4-4 4"/>
  </svg>
}

function CloseIcon() {
  return <svg width="16" height="16" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
    <path d="m4.5 4.5 9 9M13.5 4.5l-9 9"/>
  </svg>
}

function ExternalLinkIcon() {
  return <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3" aria-hidden="true">
    <path d="M6.25 3.5h6.25V9.75M12.25 3.75 7 9M5 4.5H3.5v8h8V11"/>
  </svg>
}

export function ScreenerPanel({ nodes, demo, locale, onOpenSymbol, onResearch }: Props) {
  const zh = !locale || locale.startsWith('zh')
  const text = (cn: string, en: string) => zh ? cn : en
  const [ask, setAsk] = useState('')
  const [query, setQuery] = useState('')
  const [sector, setSector] = useState('')
  const [cap, setCap] = useState('')
  const [pe, setPe] = useState('')
  const [preset, setPreset] = useState(-1)
  const [show, setShow] = useState(false)
  const [researchPrepared, setResearchPrepared] = useState(false)
  const [selected, setSelected] = useState<string | null>(null)
  const [sort, setSort] = useState('cap')
  const [asc, setAsc] = useState(false)
  const all = screenerRecords(nodes, demo)
  const rows = all.filter(row =>
    `${row.symbol} ${row.name}`.toLowerCase().includes(query.toLowerCase())
    && (!sector || row.sector === sector)
    && (!cap || row.cap !== null && row.cap >= Number(cap))
    && (!pe || row.pe !== null && row.pe <= Number(pe))
    && (preset !== 1 || row.growth !== null && row.growth >= 10)
    && (preset !== 2 || row.pe !== null && row.pe > 0)
    && (preset !== 4 || row.lowDistance !== null && row.lowDistance <= 12)
    && (preset !== 5 || row.growth !== null && row.growth < 0),
  ).sort((a, b) => {
    const left = sort === 'pe' ? a.pe : sort === 'change' ? a.change : a.cap
    const right = sort === 'pe' ? b.pe : sort === 'change' ? b.change : b.cap
    return left === right ? 0 : left === null ? 1 : right === null ? -1 : (asc ? 1 : -1) * (left - right)
  })
  const active = rows.find(row => row.symbol === selected)
  const reset = () => {
    setQuery('')
    setSector('')
    setCap('')
    setPe('')
    setPreset(-1)
    setSelected(null)
    setResearchPrepared(false)
  }
  const choose = (index: number) => {
    reset()
    setShow(true)
    setPreset(index)
    if (index === 0) {
      setCap('500')
      setPe('30')
    }
    if (index === 1 || index === 2) setSector('Technology')
    if (index === 3) {
      setShow(false)
      setResearchPrepared(true)
      onResearch(text(
        '请筛选和研究自由现金流强劲的公司，基于最新可核验的公开财报，比较现金流质量和资本配置。不要使用界面合成数据作为证据。',
        'Screen and research cash-flow leaders using verified public filings. Compare cash-flow quality and capital allocation. Do not use synthetic UI data as evidence.',
      ))
    }
  }
  const order = (key: string) => {
    if (sort === key) setAsc(value => !value)
    else {
      setSort(key)
      setAsc(false)
    }
  }
  const submit = (event: FormEvent) => {
    event.preventDefault()
    if (ask.trim()) {
      setResearchPrepared(true)
      onResearch(`${ask.trim()}\nUse verified public financial records. Do not use synthetic screener data as evidence. Produce explicit screening criteria and cite sources.`)
    }
  }
  const number = (value: number | null) => value === null ? '—' : value.toLocaleString(zh ? 'zh-CN' : 'en-US', { maximumFractionDigits: 2 })

  return <section className="rg-pf-panel rg-screen">
    <div className="rg-screen-head">
      <div className="rg-screen-heading">
        <h2>{text('股票筛选器', 'Stock screener')}</h2>
      </div>
      <span className="rg-screen-provider"><ScreenIcon />{text('基于可核验资料', 'Source-backed')}</span>
    </div>
    <form className="rg-screen-ask" onSubmit={submit}>
      <textarea
        value={ask}
        onChange={event => setAsk(event.target.value)}
        aria-label={text('描述筛选条件', 'Describe your screen')}
        placeholder={text('例如：寻找估值合理、营收增长的科技公司', 'Find growing technology companies at reasonable valuations')}
        rows={2}
      />
      <button
        type="submit"
        className="rg-screen-submit"
        disabled={!ask.trim()}
        aria-label={text('提交研究问题', 'Submit research question')}
        title={text('提交研究问题', 'Submit research question')}
      >
        <ArrowIcon />
      </button>
    </form>
    {researchPrepared && <p className="rg-screen-research-status" role="status">{text('已准备研究问题。请在金融助手中选择对话继续；尚未执行财务筛选。', 'Research question prepared. Choose a conversation in the assistant to continue; no financial screen has run yet.')}</p>}
    <div className="rg-screen-section-title">
      <div>
        <h3>{text('热门筛选器', 'Popular screens')}</h3>
        <p>{text('选择一个起点，再用真实资料验证结果。', 'Choose a starting point, then verify the results against real sources.')}</p>
      </div>
    </div>
    <div className="rg-screen-presets">
      {PRESETS.map((item, index) => <button
        type="button"
        className="rg-screen-preset"
        key={item[1]}
        aria-pressed={preset === index}
        onClick={() => choose(index)}
      >
        <span className="rg-screen-preset-icon"><ScreenIcon /></span>
        <span>
          <strong>{item[zh ? 0 : 1]}</strong>
          <span>{item[zh ? 2 : 3]}</span>
        </span>
      </button>)}
    </div>
    <div className="rg-screen-footer-row">
      {!demo && <p className="rg-discovery-source">{text('使用已导入的资产指标；缺失数据不会当作零参加条件筛选。', 'Uses imported financial metrics. Missing data never counts as zero in filters.')}</p>}
      <button type="button" className="rg-screen-button" aria-expanded={show} onClick={() => setShow(value => !value)}>
        {show ? text('收起筛选结果', 'Hide results') : text('自定义筛选', 'Custom screen')}
      </button>
    </div>
    {show && <>
      <div className="rg-screen-filterbar">
        <label className="rg-screen-filter">
          <span>{text('名称或代码', 'Name or symbol')}</span>
          <input type="search" value={query} onChange={event => setQuery(event.target.value)}/>
        </label>
        <label className="rg-screen-filter">
          <span>{text('板块', 'Sector')}</span>
          <select value={sector} onChange={event => setSector(event.target.value)}>
            <option value="">{text('全部', 'All')}</option>
            {[...new Set(all.map(row => row.sector).filter(Boolean))].map(value => <option key={value}>{value}</option>)}
          </select>
        </label>
        <label className="rg-screen-filter">
          <span>{text('最低市值（十亿美元）', 'Min. market cap ($B)')}</span>
          <input type="number" min="0" value={cap} onChange={event => setCap(event.target.value)}/>
        </label>
        <label className="rg-screen-filter">
          <span>{text('最高 P/E', 'Max. P/E')}</span>
          <input type="number" min="0" value={pe} onChange={event => setPe(event.target.value)}/>
        </label>
        <button type="button" className="rg-screen-button" onClick={reset}>{text('重置', 'Reset')}</button>
      </div>
      <p className="rg-screen-resultbar">{rows.length} {text('家公司', 'companies')}</p>
      <div className="rg-screen-table-wrap">
        <table className="rg-pf-table rg-screen-table">
          <thead>
            <tr>
              <th>{text('公司', 'Company')}</th>
              <th>{text('板块', 'Sector')}</th>
              {[
                ['cap', text('市值（十亿美元）', 'Market cap ($B)')],
                ['pe', 'P/E'],
                ['change', text('涨跌幅', 'Change')],
              ].map(([key, label]) => <th key={key}>
                <button type="button" onClick={() => order(key ?? 'cap')}>{label} {sort === key ? asc ? '↑' : '↓' : ''}</button>
              </th>)}
            </tr>
          </thead>
          <tbody>{rows.map(row => <tr key={row.symbol}>
            <td>
              <button
                type="button"
                className="rg-screen-company"
                aria-expanded={selected === row.symbol}
                onClick={() => setSelected(current => current === row.symbol ? null : row.symbol)}
              >
                <strong>{row.symbol}</strong>
                <span>{row.name}</span>
              </button>
            </td>
            <td>{row.sector || '—'}</td>
            <td>{number(row.cap)}</td>
            <td>{number(row.pe)}</td>
            <td>{number(row.change)}{row.change === null ? '' : '%'}</td>
          </tr>)}</tbody>
        </table>
      </div>
      {rows.length === 0 && <p className="rg-screen-empty">{text('没有符合条件的公司。调整筛选或导入更多指标。', 'No matching companies. Adjust filters or import additional metrics.')}</p>}
      {active && <section className="rg-event-detail">
        <h3>{active.name} ({active.symbol})</h3>
        {!demo && <p>{text('来自已导入的指标记录。', 'From an imported financial record.')}</p>}
        <div className="rg-event-actions">
          <button type="button" className="rg-btn" onClick={() => onOpenSymbol(active.symbol)}>{text('查看公司', 'View company')}</button>
          <button
            type="button"
            className="rg-btn"
            onClick={() => onResearch(`Research ${active.symbol} using verified financial filings. Assess valuation, growth and risks; cite sources. Do not use synthetic screener metrics as evidence.`)}
          >
            {text('研究公司', 'Research company')}
          </button>
        </div>
      </section>}
    </>}
  </section>
}

interface Disclosure {
  readonly id: string
  readonly person: string
  readonly party: string
  readonly chamber: string
  readonly region: string
  readonly symbol: string
  readonly type: string
  readonly date: string
  readonly filed: string
  readonly amount: string
  readonly owner: string
  readonly source: string
}

interface PoliticianHolding {
  readonly id: string
  readonly person: string
  readonly asset: string
  readonly symbol: string
  readonly type: string
  readonly owner: string
  readonly min: string
  readonly max: string
  readonly asOf: string
  readonly source: string
}

const DISCLOSURES: readonly Disclosure[] = ['AAPL', 'MSFT', 'NVDA', 'AMZN', 'XOM', 'GOOGL', 'JPM', 'LLY'].map((symbol, i) => ({
  id: `demo:${i}`,
  person: ['Alex Morgan (fictional)', 'Taylor Reed (fictional)', 'Jordan Blake (fictional)', 'Casey Park (fictional)'][i % 4] ?? '',
  party: i % 2 ? 'R' : 'D',
  chamber: 'HOUSE',
  region: ['CA-00', 'TX-00', 'NY-00', 'WA-00'][i % 4] ?? '',
  symbol,
  type: i % 3 ? 'Buy' : 'Sell',
  date: `2026-10-${String(28 - i).padStart(2, '0')}`,
  filed: '2026-10-30',
  amount: i % 2 ? '$15,001–$50,000' : '$1,001–$15,000',
  owner: i % 2 ? 'Self' : 'Spouse',
  source: '',
}))

export function disclosureRecords(nodes: readonly GraphNode[]): Disclosure[] {
  return nodes.filter(node => Object.keys(obj(node.metadata.politicalDisclosure)).length > 0).map(node => {
    const d = obj(node.metadata.politicalDisclosure)
    return {
      id: node.id,
      person: str(d.person),
      party: str(d.party),
      chamber: str(d.chamber) || 'HOUSE',
      region: str(d.region),
      symbol: str(d.symbol),
      type: str(d.type),
      date: str(d.transactionDate),
      filed: str(d.filedDate),
      amount: str(d.amountRange),
      owner: str(d.owner),
      source: safeHttpUrl(d.sourceUrl),
    }
  })
}

export function politicianHoldingRecords(nodes: readonly GraphNode[]): PoliticianHolding[] {
  const records: PoliticianHolding[] = []
  for (const node of nodes) {
    const disclosure = obj(node.metadata.politicalDisclosure)
    const sources = [
      ...list(node.metadata.politicalHoldings).map((value, index) => ({ value, prefix: `node:${index}` })),
      ...list(disclosure.holdings).map((value, index) => ({ value, prefix: `disclosure:${index}` })),
    ]
    for (const { value, prefix } of sources) {
      const holding = obj(value)
      const person = str(holding.person) || str(disclosure.person)
      if (!person) continue
      const symbol = str(holding.symbol)
      records.push({
        id: `${node.id}:${prefix}`,
        person,
        asset: str(holding.asset) || str(holding.name) || symbol,
        symbol,
        type: str(holding.type),
        owner: str(holding.owner) || str(holding.ownerType),
        min: str(holding.min) || str(holding.minAmount),
        max: str(holding.max) || str(holding.maxAmount),
        asOf: str(holding.asOf) || str(holding.date),
        source: safeHttpUrl(holding.sourceUrl),
      })
    }
  }
  return records
}

const initials = (person: string) => {
  const words = person.replace(/\([^)]*\)/g, '').trim().split(/\s+/).filter(Boolean)
  return words.slice(0, 2).map(word => Array.from(word)[0] ?? '').join('').toUpperCase() || '—'
}

const sortDisclosures = (rows: readonly Disclosure[], ascending: boolean) => [...rows].sort((a, b) => (ascending ? 1 : -1) * a.date.localeCompare(b.date))

function DisclosureTable({
  rows,
  zh,
  selectedPerson,
  onSelect,
  onOpenSymbol,
}: {
  readonly rows: readonly Disclosure[]
  readonly zh: boolean
  readonly selectedPerson: string | null
  readonly onSelect: (person: string) => void
  readonly onOpenSymbol: (symbol: string) => void
}) {
  const text = (cn: string, en: string) => zh ? cn : en
  return <div className="rg-screen-table-wrap rg-politics-table-wrap">
    <table className="rg-pf-table rg-politics-table">
      <thead>
        <tr>
          <th>{text('政治人物', 'Politician')}</th>
          <th>{text('交易', 'Trade')}</th>
          <th>{text('交易日期', 'Transaction date')}</th>
          <th>{text('类型 / 持有人', 'Type / owner')}</th>
          <th>{text('提交日期', 'Filed')}</th>
          <th>{text('金额区间', 'Amount range')}</th>
          <th>{text('原始披露', 'Source')}</th>
        </tr>
      </thead>
      <tbody>{rows.map(row => <tr key={row.id}>
        <td data-label={text('政治人物', 'Politician')}>
          <button
            type="button"
            className="rg-politics-name"
            aria-expanded={selectedPerson === row.person}
            onClick={() => onSelect(row.person)}
          >
            <span className="rg-politics-avatar" aria-hidden="true">{initials(row.person)}</span>
            <span className="rg-politics-identity">
              <strong>{row.person || '—'}</strong>
              <span className="rg-politics-party" data-party={row.party}>
                <i />
                <span>{row.party || '—'}</span>
                <span>{row.chamber || '—'}</span>
                {row.region && <><span aria-hidden="true">·</span><span>{row.region}</span></>}
              </span>
            </span>
          </button>
        </td>
        <td data-label={text('交易', 'Trade')}>
          <button type="button" className="rg-politics-symbol" onClick={() => onOpenSymbol(row.symbol)} disabled={!row.symbol}>{row.symbol || '—'}</button>
        </td>
        <td data-label={text('交易日期', 'Transaction date')}>{row.date || '—'}</td>
        <td data-label={text('类型 / 持有人', 'Type / owner')}>
          <span className="rg-politics-trade"><strong>{row.type || '—'}</strong><span>{row.owner || '—'}</span></span>
        </td>
        <td data-label={text('提交日期', 'Filed')}>{row.filed || '—'}</td>
        <td data-label={text('金额区间', 'Amount range')}>{row.amount || '—'}</td>
        <td data-label={text('原始披露', 'Source')}>{row.source
          ? <a className="rg-politics-source-link" href={row.source} target="_blank" rel="noreferrer" aria-label={text('打开原始披露', 'Open original disclosure')}><ExternalLinkIcon /></a>
          : '—'}</td>
      </tr>)}</tbody>
    </table>
  </div>
}

export function PoliticiansPanel({ nodes, demo, locale, onOpenSymbol, onResearch }: Props) {
  const zh = !locale || locale.startsWith('zh')
  const text = (cn: string, en: string) => zh ? cn : en
  const [query, setQuery] = useState('')
  const [party, setParty] = useState('')
  const [type, setType] = useState('')
  const [after, setAfter] = useState('')
  const [asc, setAsc] = useState(false)
  const [selectedPerson, setSelectedPerson] = useState<string | null>(null)
  const [detailTab, setDetailTab] = useState<'holdings' | 'transactions'>('holdings')
  const sourceRows = demo ? DISCLOSURES : disclosureRecords(nodes)
  const rows = sortDisclosures(sourceRows.filter(row =>
    `${row.person} ${row.symbol}`.toLowerCase().includes(query.toLowerCase())
    && (!party || row.party === party)
    && (!type || row.type === type)
    && (!after || row.filed >= after),
  ), asc)
  const personRows = selectedPerson ? sortDisclosures(sourceRows.filter(row => row.person === selectedPerson), asc) : []
  const profile = personRows[0]
  const holdings = selectedPerson && !demo ? politicianHoldingRecords(nodes).filter(row => row.person === selectedPerson) : []
  const clearSelection = () => {
    setSelectedPerson(null)
    setDetailTab('holdings')
  }
  const researchPerson = () => {
    if (!profile) return
    const recordIds = personRows.map(row => row.id).filter(Boolean)
    onResearch(demo
      ? text(
        '请研究公开的政治人物股票交易披露来源和判断方法。界面中的虚构人物、交易、金额及证券代码只用于演示，绝不能作为证据引用。',
        'Research the sources and interpretation of public political trading disclosures. The fictional UI people, trades, amounts and symbols are demonstration-only and must not be cited as evidence.',
      )
      : text(
        `请核验政治人物 ${profile.person} 的公开交易披露，区分交易日与提交日，并只使用官方原始披露交叉验证。导入记录定位符：${recordIds.join('、')}。若没有显式持仓快照，不得从买卖记录推算当前持仓。`,
        `Verify public trading disclosures for ${profile.person}, distinguish transaction dates from filing dates, and cross-check official source filings. Imported record locators: ${recordIds.join(', ')}. Do not infer current holdings from buy/sell records without an explicit holdings snapshot.`,
      ))
  }

  return <section className="rg-pf-panel rg-screen rg-politics">
    <div className="rg-screen-head">
      <div className="rg-screen-heading">
        <h2>{text('交易活动', 'Trading activity')}</h2>
        {!demo && <p className="rg-screen-intro">{text('仅显示你显式导入的政治人物披露，不包含自动接入的实时数据库。', 'Only explicitly imported political disclosures. No live disclosure database is connected.')}</p>}
      </div>
    </div>
    {profile
      ? <section className="rg-politics-detail" aria-label={text('政治人物详情', 'Politician details')}>
        <header className="rg-politics-detail-head">
          <span className="rg-politics-avatar rg-politics-avatar-large" aria-hidden="true">{initials(profile.person)}</span>
          <div className="rg-politics-detail-identity">
            <h3>{profile.person}</h3>
            <p className="rg-politics-party" data-party={profile.party}>
              <i />
              <span>{profile.party || '—'}</span>
              <span>{profile.chamber || '—'}</span>
              {profile.region && <><span aria-hidden="true">·</span><span>{profile.region}</span></>}
            </p>
          </div>
          <button type="button" className="rg-politics-clear" onClick={clearSelection}>
            <CloseIcon />
            <span>{text('清除选择', 'Clear selection')}</span>
          </button>
        </header>
        <div className="rg-politics-events" role="tablist" aria-label={text('政治人物资料', 'Politician records')}>
          <button
            type="button"
            role="tab"
            id="rg-politics-holdings-tab"
            aria-selected={detailTab === 'holdings'}
            aria-controls="rg-politics-holdings-panel"
            data-active={detailTab === 'holdings' || undefined}
            onClick={() => setDetailTab('holdings')}
          >
            {text('持仓', 'Holdings')}
          </button>
          <button
            type="button"
            role="tab"
            id="rg-politics-transactions-tab"
            aria-selected={detailTab === 'transactions'}
            aria-controls="rg-politics-transactions-panel"
            data-active={detailTab === 'transactions' || undefined}
            onClick={() => setDetailTab('transactions')}
          >
            {text('交易记录', 'Transactions')} <span>{personRows.length}</span>
          </button>
        </div>
        {detailTab === 'holdings'
          ? <section id="rg-politics-holdings-panel" role="tabpanel" aria-labelledby="rg-politics-holdings-tab">
            {holdings.length > 0
              ? <div className="rg-screen-table-wrap">
                <table className="rg-pf-table rg-politics-holdings-table">
                  <thead>
                    <tr>
                      <th>{text('资产', 'Asset')}</th>
                      <th>{text('持有人', 'Owner')}</th>
                      <th>{text('类型', 'Type')}</th>
                      <th>{text('最小', 'Min')}</th>
                      <th>{text('最大', 'Max')}</th>
                      <th>{text('截至', 'As of')}</th>
                      <th>{text('原始披露', 'Source')}</th>
                    </tr>
                  </thead>
                  <tbody>{holdings.map(row => <tr key={row.id}>
                    <td><strong>{row.asset || '—'}</strong>{row.symbol && row.symbol !== row.asset && <small>{row.symbol}</small>}</td>
                    <td>{row.owner || '—'}</td>
                    <td>{row.type || '—'}</td>
                    <td>{row.min || '—'}</td>
                    <td>{row.max || '—'}</td>
                    <td>{row.asOf || '—'}</td>
                    <td>{row.source
                      ? <a className="rg-politics-source-link" href={row.source} target="_blank" rel="noreferrer" aria-label={text('打开原始披露', 'Open original disclosure')}><ExternalLinkIcon /></a>
                      : '—'}</td>
                  </tr>)}</tbody>
                </table>
              </div>
              : <div className="rg-politics-empty">
                <ScreenIcon />
                <strong>{text('没有显式持仓数据', 'No explicit holdings imported')}</strong>
                <p>{text(
                  '当前导入内容只有交易披露。买入和卖出记录不能证明此刻持有什么，也不会被用来推算持仓、成本或金额。',
                  'The imported records contain transactions only. Buy and sell disclosures do not establish current ownership and are not used to infer positions, cost, or value.',
                )}</p>
              </div>}
          </section>
          : <section id="rg-politics-transactions-panel" role="tabpanel" aria-labelledby="rg-politics-transactions-tab">
            <div className="rg-politics-detail-summary">
              <p>{text('以下包含该人物的全部已导入披露，不受当前列表筛选影响。', 'All imported disclosures for this person are shown; current list filters do not narrow this view.')}</p>
              <button type="button" className="rg-screen-button" onClick={() => setAsc(value => !value)}>
                {text('交易日期', 'Transaction date')} {asc ? '↑' : '↓'}
              </button>
            </div>
            <DisclosureTable
              rows={personRows}
              zh={zh}
              selectedPerson={selectedPerson}
              onSelect={person => {
                setSelectedPerson(person)
                setDetailTab('holdings')
              }}
              onOpenSymbol={onOpenSymbol}
            />
          </section>}
        <div className="rg-politics-detail-actions">
          <button type="button" className="rg-btn" onClick={researchPerson}>{text('研究公开披露', 'Research public disclosures')}</button>
          <button type="button" className="rg-btn" onClick={clearSelection}>{text('返回交易活动', 'Back to trading activity')}</button>
        </div>
      </section>
      : <>
        <div className="rg-screen-filterbar rg-politics-filterbar">
          <label className="rg-screen-filter" data-search="true">
            <span>{text('搜索人物或股票', 'Search person or stock')}</span>
            <input type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder={text('选择政治人物……', 'Choose a politician…')}/>
          </label>
          <label className="rg-screen-filter">
            <span>{text('党派', 'Party')}</span>
            <select value={party} onChange={event => setParty(event.target.value)}>
              <option value="">{text('全部', 'All')}</option>
              <option>D</option>
              <option>R</option>
              <option>I</option>
            </select>
          </label>
          <label className="rg-screen-filter">
            <span>{text('交易类型', 'Trade type')}</span>
            <select value={type} onChange={event => setType(event.target.value)}>
              <option value="">{text('全部', 'All')}</option>
              <option value="Buy">{text('买入', 'Buy')}</option>
              <option value="Sell">{text('卖出', 'Sell')}</option>
            </select>
          </label>
          <label className="rg-screen-filter">
            <span>{text('提交日期晚于', 'Filed after')}</span>
            <input type="date" value={after} onChange={event => setAfter(event.target.value)}/>
          </label>
          <button type="button" className="rg-screen-button" onClick={() => {
            setQuery('')
            setParty('')
            setType('')
            setAfter('')
          }}>{text('重置', 'Reset')}</button>
        </div>
        <div className="rg-politics-listbar">
          <p>{rows.length} {text('笔披露', 'disclosures')}</p>
          <button type="button" onClick={() => setAsc(value => !value)}>
            {text('交易日期', 'Transaction date')} {asc ? '↑' : '↓'}
          </button>
        </div>
        <DisclosureTable
          rows={rows}
          zh={zh}
          selectedPerson={selectedPerson}
          onSelect={person => {
            setSelectedPerson(person)
            setDetailTab('holdings')
          }}
          onOpenSymbol={onOpenSymbol}
        />
        {rows.length === 0 && <p className="rg-screen-empty">{text('没有符合条件的披露记录。', 'No matching disclosures.')}</p>}
      </>}
  </section>
}
