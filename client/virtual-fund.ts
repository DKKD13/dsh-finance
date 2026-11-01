export interface FundSeat {
  id: string
  name: string
  role: string
  initials: string
  persona: string
  quote?: string
  sym?: string
  px?: number
  chg?: number
  dir?: 'b' | 's' | 'h'
  dirLabel?: string
  conv?: number
  take?: string
  memory: readonly (readonly [string, string])[]
}

export interface FundEvent {
  id: string
  at: number
  dur: number
  type:
    | 'run'
    | 'note'
    | 'plan'
    | 'intent'
    | 'check'
    | 'order'
    | 'fill'
    | 'review'
    | 'memory'
    | 'wiki'
  from: string
  to?: string
  who: string
  text: string
  meta: string
  span?: number
  memTarget?: string
}

export const FUND_ANALYSTS: readonly FundSeat[] = [
  {
    id: 'nvda',
    sym: 'NVDA',
    name: '半导体分析师',
    role: '研究分析师',
    px: 142.1,
    chg: 1.8,
    dir: 'b',
    dirLabel: '看多',
    conv: 0.88,
    persona: '集中度纪律优先；算力周期长期看多',
    initials: 'SB',
    take: 'Blackwell 出货超预期，需求没放缓；但权重 25.5% 触顶 → 控制仓位，不加。',
    memory: [
      ['核心', 'Blackwell 出货超预期，数据中心需求强劲'],
      ['警告', '权重 25.5% 超过 PM 划定上限'],
      ['周期', '算力投资周期刚进入加速段'],
    ],
  },
  {
    id: 'googl',
    sym: 'GOOGL',
    name: '互联网分析师',
    role: '研究分析师',
    px: 151.2,
    chg: 0.4,
    dir: 'h',
    dirLabel: '持有',
    conv: 0.71,
    persona: '广告周期敏感，偏防御',
    initials: 'LC',
    take: '广告收入稳、云增速回升，未见 AI 反噬搜索；维持持有。',
    memory: [
      ['核心', '搜索广告护城河仍稳'],
      ['观察', '云业务增速拐点已现'],
      ['教训', '上次过早减仓错过反弹'],
    ],
  },
  {
    id: 'cost',
    sym: 'COST',
    name: '消费分析师',
    role: '研究分析师',
    px: 961.8,
    chg: -0.3,
    dir: 'h',
    dirLabel: '持有',
    conv: 0.78,
    persona: '看护城河与续费率，慢变量',
    initials: 'ZC',
    take: '月度续费率 92.9%，会员费提价未被抗拒；护城河稳固，维持。',
    memory: [
      ['核心', '续费率 92.9%，提价不敏感'],
      ['模型', '同店增长假设 5%→4.5%'],
      ['观察', '零售承压但会员盘稳'],
    ],
  },
  {
    id: 'jpm',
    sym: 'JPM',
    name: '银行分析师',
    role: '研究分析师',
    px: 248.9,
    chg: 0.6,
    dir: 'b',
    dirLabel: '加仓',
    conv: 0.74,
    persona: '盯净息差与拨备，偏周期',
    initials: 'MH',
    take: '净息差见底回升、拨备释放，资本回报改善；可小幅加。',
    memory: [
      ['核心', '净息差已见底，Q2 回升'],
      ['模型', '拨备率下调 10bp'],
      ['观察', '大行资本充足率健康'],
    ],
  },
  {
    id: 'unh',
    sym: 'UNH',
    name: '医疗分析师',
    role: '研究分析师',
    px: 498.9,
    chg: -1.1,
    dir: 's',
    dirLabel: '看空',
    conv: 0.44,
    persona: '政策风险第一，信念随听证调整',
    initials: 'HY',
    take: '听证排期推进、合规成本不确定；政策未完全定价，建议减、保留缓冲。',
    memory: [
      ['核心', '政策不确定性尚未完全定价'],
      ['教训', '信念 0.48→0.44，用听证事件修正'],
      ['观察', '医疗板块整体承压'],
    ],
  },
  {
    id: 'aapl',
    sym: 'AAPL',
    name: '科技分析师',
    role: '研究分析师',
    px: 214,
    chg: 0.2,
    dir: 'h',
    dirLabel: '持有',
    conv: 0.62,
    persona: '看供应链与服务收入，不追高',
    initials: 'MQ',
    take: '供应链向好、服务收入小增；估值不便宜，维持不加。',
    memory: [
      ['核心', '服务收入占比继续提升'],
      ['观察', '供应链订单小幅上修'],
      ['计划', '下一档加仓价 $198'],
    ],
  },
]

export const FUND_PM: FundSeat = {
  id: 'pm',
  name: '基金经理',
  role: '组合经理 · 编排',
  initials: 'LF',
  persona: '纪律优先：25% 单标的上限不例外',
  quote: '集中度触到上限，必须减一点——不是因为看空，是因为规则。',
  memory: [
    ['规则', '单标的权重硬上限 25%，不例外'],
    ['教训', '上次过早减 COST 错过 8%'],
    ['观察', '半导体占组合 25.5%'],
  ],
}

export const FUND_REVIEWER: FundSeat = {
  id: 'reviewer',
  name: '复盘官',
  role: '复盘 · 记忆 · 知识库',
  initials: 'RV',
  persona: '只看证据：命中/错过/归因，不写情绪',
  quote: '今天错了 38bp，错在没把政策折价算进仓位，不是错在看多。',
  memory: [
    ['规则', '只写不改，知识库只增'],
    ['观察', '政策类事件需要独立折价项'],
  ],
}

export const FUND_EVENTS: readonly FundEvent[] = [
  {
    id: 'analyst-nvda-run',
    at: 0.03,
    dur: 0.035,
    type: 'run',
    from: 'nvda',
    who: '半导体分析师',
    text: '拉取 NVDA 行情 + 基本面 + 自有记忆',
    meta: 'analyst_run · nvda',
    span: 0.05,
  },
  {
    id: 'analyst-googl-run',
    at: 0.038,
    dur: 0.035,
    type: 'run',
    from: 'googl',
    who: '互联网分析师',
    text: '拉取 GOOGL 行情 + 基本面 + 自有记忆',
    meta: 'analyst_run · googl',
    span: 0.05,
  },
  {
    id: 'analyst-cost-run',
    at: 0.046,
    dur: 0.035,
    type: 'run',
    from: 'cost',
    who: '消费分析师',
    text: '拉取 COST 行情 + 基本面 + 自有记忆',
    meta: 'analyst_run · cost',
    span: 0.05,
  },
  {
    id: 'analyst-jpm-run',
    at: 0.054,
    dur: 0.035,
    type: 'run',
    from: 'jpm',
    who: '银行分析师',
    text: '拉取 JPM 行情 + 基本面 + 自有记忆',
    meta: 'analyst_run · jpm',
    span: 0.05,
  },
  {
    id: 'analyst-unh-run',
    at: 0.062,
    dur: 0.035,
    type: 'run',
    from: 'unh',
    who: '医疗分析师',
    text: '拉取 UNH 行情 + 基本面 + 自有记忆',
    meta: 'analyst_run · unh',
    span: 0.05,
  },
  {
    id: 'analyst-aapl-run',
    at: 0.07,
    dur: 0.035,
    type: 'run',
    from: 'aapl',
    who: '科技分析师',
    text: '拉取 AAPL 行情 + 基本面 + 自有记忆',
    meta: 'analyst_run · aapl',
    span: 0.05,
  },
  {
    id: 'analyst-nvda-note',
    at: 0.1,
    dur: 0.035,
    type: 'note',
    from: 'nvda',
    to: 'pm',
    who: '半导体分析师',
    text: 'Blackwell 出货超预期，需求没放缓；但权重 25.5% 触顶 → 控制仓位，不加。',
    meta: 'research_notes · 看多 0.88',
  },
  {
    id: 'analyst-googl-note',
    at: 0.13,
    dur: 0.035,
    type: 'note',
    from: 'googl',
    to: 'pm',
    who: '互联网分析师',
    text: '广告收入稳、云增速回升，未见 AI 反噬搜索；维持持有。',
    meta: 'research_notes · 持有 0.71',
  },
  {
    id: 'analyst-cost-note',
    at: 0.16,
    dur: 0.035,
    type: 'note',
    from: 'cost',
    to: 'pm',
    who: '消费分析师',
    text: '月度续费率 92.9%，会员费提价未被抗拒；护城河稳固，维持。',
    meta: 'research_notes · 持有 0.78',
  },
  {
    id: 'analyst-jpm-note',
    at: 0.19,
    dur: 0.035,
    type: 'note',
    from: 'jpm',
    to: 'pm',
    who: '银行分析师',
    text: '净息差见底回升、拨备释放，资本回报改善；可小幅加。',
    meta: 'research_notes · 加仓 0.74',
  },
  {
    id: 'analyst-unh-note',
    at: 0.22,
    dur: 0.035,
    type: 'note',
    from: 'unh',
    to: 'pm',
    who: '医疗分析师',
    text: '听证排期推进、合规成本不确定；政策未完全定价，建议减、保留缓冲。',
    meta: 'research_notes · 看空 0.44',
  },
  {
    id: 'analyst-aapl-note',
    at: 0.25,
    dur: 0.035,
    type: 'note',
    from: 'aapl',
    to: 'pm',
    who: '科技分析师',
    text: '供应链向好、服务收入小增；估值不便宜，维持不加。',
    meta: 'research_notes · 持有 0.62',
  },
  {
    id: 'pm-plan',
    at: 0.42,
    dur: 0.035,
    type: 'plan',
    from: 'pm',
    to: 'exec',
    who: '基金经理',
    text: '读 6 份观点 + 持仓 + 现金 → 日计划：NVDA −2%，JPM +0.5%，其余维持。',
    meta: 'daily_plans · 2 条意图 · 回链 3 篇笔记',
    span: 0.05,
  },
  {
    id: 'pm-intent-nvda-sell',
    at: 0.475,
    dur: 0.035,
    type: 'intent',
    from: 'pm',
    to: 'exec',
    who: '基金经理',
    text: '意图①：卖出 NVDA 2%（回链 #41 半导体、#45 医疗）',
    meta: 'intent · sell NVDA 2%',
  },
  {
    id: 'pm-intent-jpm-buy',
    at: 0.495,
    dur: 0.035,
    type: 'intent',
    from: 'pm',
    to: 'exec',
    who: '基金经理',
    text: '意图②：买入 JPM 0.5%（回链 #43 银行）',
    meta: 'intent · buy JPM 0.5%',
  },
  {
    id: 'exec-check',
    at: 0.6,
    dur: 0.035,
    type: 'check',
    from: 'exec',
    who: '执行 · 风控',
    text: '确定性代码校验 4/4 通过（非模型）：集中度、现金线、覆盖集、单笔上限。',
    meta: 'risk/checks.py · 无 LLM 调用',
    span: 0.05,
  },
  {
    id: 'exec-order-nvda',
    at: 0.645,
    dur: 0.035,
    type: 'order',
    from: 'exec',
    to: 'broker',
    who: '执行 · 风控',
    text: '提交纸面成交 NVDA −2% @ 142.10',
    meta: 'orders · submitted',
  },
  {
    id: 'exec-order-jpm',
    at: 0.665,
    dur: 0.035,
    type: 'order',
    from: 'exec',
    to: 'broker',
    who: '执行 · 风控',
    text: '提交纸面成交 JPM +0.5% @ 248.90',
    meta: 'orders · submitted',
  },
  {
    id: 'broker-fill',
    at: 0.705,
    dur: 0.035,
    type: 'fill',
    from: 'broker',
    who: 'Alpaca 纸面',
    text: '2 笔全部成交，持仓与现金已回灌（本地表=缓存，Alpaca 为准）',
    meta: 'fills ×2 · synced',
    span: 0.04,
  },
  {
    id: 'reviewer-review',
    at: 0.83,
    dur: 0.035,
    type: 'review',
    from: 'reviewer',
    who: '复盘官',
    text: '复盘 #7：组合 +0.44%，跑赢基准 21bp。NVDA 减仓踩在急跌前，命中；UNH 未折价政策风险，错过。',
    meta: 'reflections · 归因 2 条',
    span: 0.06,
  },
  {
    id: 'reviewer-memory-nvda',
    at: 0.875,
    dur: 0.035,
    type: 'memory',
    from: 'reviewer',
    to: 'shelf',
    who: '复盘官',
    text: '写记忆 → 半导体分析师：「集中度触顶时，先减再看多」',
    meta: 'analyst_memory · 唯一跨 agent 写',
    memTarget: 'nvda',
  },
  {
    id: 'reviewer-memory-unh',
    at: 0.895,
    dur: 0.035,
    type: 'memory',
    from: 'reviewer',
    to: 'shelf',
    who: '复盘官',
    text: '写记忆 → 医疗分析师：「政策类事件需独立折价项」',
    meta: 'analyst_memory · 唯一跨 agent 写',
    memTarget: 'unh',
  },
  {
    id: 'reviewer-wiki-concentration',
    at: 0.925,
    dur: 0.035,
    type: 'wiki',
    from: 'reviewer',
    to: 'shelf',
    who: '复盘官',
    text: '知识库 +1：《集中度纪律与减仓时点》',
    meta: 'wiki_entries · 只增不改',
  },
]

export const FUND_STAGES: readonly { at: number; label: string; name: string }[] = [
  { at: 0.02, label: '07:30', name: '数据 · 研究' },
  { at: 0.4, label: '08:45', name: 'PM 决策' },
  { at: 0.58, label: '09:30', name: '确定性执行' },
  { at: 0.82, label: '16:30', name: '复盘 · 写记忆' },
]

function minutes(value: string): number {
  const [hours = '0', mins = '0'] = value.split(':')
  return Number(hours) * 60 + Number(mins)
}

export function fundTime(t: number): string {
  const marks = [
    [0.02, '07:30'],
    [0.4, '08:45'],
    [0.58, '09:30'],
    [0.82, '16:30'],
    [1, '17:00'],
  ] as const

  for (let index = 0; index < marks.length - 1; index += 1) {
    const start = marks[index]
    const end = marks[index + 1]
    if (!start || !end) continue
    const [at, label] = start
    const [nextAt, nextLabel] = end
    if (t <= nextAt) {
      const fraction = (t - at) / (nextAt - at)
      const value =
        minutes(label) +
        (minutes(nextLabel) - minutes(label)) * Math.max(0, Math.min(1, fraction))
      const roundedMinutes = Math.round(value)
      return `${String(Math.floor(roundedMinutes / 60)).padStart(2, '0')}:${String(
        roundedMinutes % 60,
      ).padStart(2, '0')}`
    }
  }

  return '17:00'
}

export function fundSnapshot(t: number): {
  time: string
  notes: number
  hasPlan: boolean
  checked: boolean
  fills: number
  reviewed: boolean
  memories: number
  wiki: number
  completed: readonly FundEvent[]
  active: readonly FundEvent[]
} {
  const time = Math.max(0, Math.min(1, t))
  const completed = FUND_EVENTS.filter((event) => event.at <= time)
  const active = FUND_EVENTS.filter(
    (event) => event.at <= time && time < event.at + (event.span ?? event.dur),
  )

  return {
    time: fundTime(time),
    notes: completed.filter((event) => event.type === 'note').length,
    hasPlan: completed.some((event) => event.type === 'plan'),
    checked: completed.some((event) => event.type === 'check'),
    fills: completed.filter((event) => event.type === 'fill').length * 2,
    reviewed: completed.some((event) => event.type === 'review'),
    memories: completed.filter((event) => event.type === 'memory').length,
    wiki: completed.filter((event) => event.type === 'wiki').length,
    completed,
    active,
  }
}

const analystIds = new Set(FUND_ANALYSTS.map((seat) => seat.id))
const emptyPermissions = {
  read: [] as readonly string[],
  write: [] as readonly string[],
  blocked: [] as readonly string[],
}

export function fundSeatPermissions(id: string): {
  read: readonly string[]
  write: readonly string[]
  blocked: readonly string[]
} {
  if (analystIds.has(id)) {
    return {
      read: [`research_notes:${id}`, `analyst_memory:${id}`],
      write: [`research_notes:${id}`, `analyst_memory:${id}`],
      blocked: ['orders', 'fills', 'wiki_entries'],
    }
  }

  switch (id) {
    case 'pm':
      return {
        read: ['research_notes', 'holdings', 'cash'],
        write: ['daily_plans'],
        blocked: ['analyst_memory', 'orders'],
      }
    case 'reviewer':
      return {
        read: ['reflections', 'analyst_memory', 'wiki_entries'],
        write: ['reflections', 'analyst_memory', 'wiki_entries'],
        blocked: [],
      }
    case 'exec':
      return {
        read: ['daily_plans', 'intents', 'holdings'],
        write: ['orders', 'fills', 'holdings'],
        blocked: ['conversation'],
      }
    case 'broker':
      return {
        read: ['orders', 'fills', 'holdings'],
        write: [],
        blocked: [],
      }
    case 'shelf':
      return {
        read: ['analyst_memory', 'wiki_entries'],
        write: [],
        blocked: [],
      }
    default:
      return emptyPermissions
  }
}
