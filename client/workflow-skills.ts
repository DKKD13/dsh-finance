import type { GraphNode } from '../src/graph.ts'

const PERSONA_TITLES: Readonly<Record<string, readonly [string, string]>> = {
  'andrej-karpathy-perspective': ['安德烈·卡帕西', 'Andrej Karpathy'],
  'elon-musk-perspective': ['埃隆·马斯克', 'Elon Musk'],
  'feynman-perspective': ['理查德·费曼', 'Richard Feynman'],
  'ilya-sutskever-perspective': ['伊利亚·苏茨克维', 'Ilya Sutskever'],
  'mrbeast-perspective': ['MrBeast', 'MrBeast'],
  'munger-perspective': ['查理·芒格', 'Charlie Munger'],
  'naval-perspective': ['纳瓦尔', 'Naval Ravikant'],
  'paul-graham-perspective': ['保罗·格雷厄姆', 'Paul Graham'],
  'steve-jobs-perspective': ['史蒂夫·乔布斯', 'Steve Jobs'],
  'sun-yuchen-perspective': ['孙宇晨', 'Justin Sun'],
  'taleb-perspective': ['纳西姆·塔勒布', 'Nassim Taleb'],
  'trump-perspective': ['唐纳德·特朗普', 'Donald Trump'],
  'x-mastery-mentor': ['X 运营导师', 'X/Twitter mentor'],
  'zhang-yiming-perspective': ['张一鸣', 'Zhang Yiming'],
  'zhangxuefeng-perspective': ['张雪峰', 'Zhang Xuefeng'],
}

const LABELS: Readonly<Record<string, string>> = {
  'virtual-fund': '虚拟基金', research: '公司与问题研究', 'deep-research': '深入已有报告',
  'knowledge-compiler': '知识编译', 'hypothesis-thinking': '投资假说论证',
  'thesis-drift': '投资假说变化复核', 'equity-earnings': '财报前瞻与复盘',
  'financial-data-rigor': '财务数据核验', 'valuation-model': '估值与敏感性分析',
  'finance-source-ingest': '网页与文件采集', 'catalyst-calendar': '催化事件日历',
  'portfolio-allocation': '组合配置分析', 'portfolio-weekly': '组合周度复核',
  'daily-digest': '每日研究简报', 'market-watch': '市场观察',
  'report-digest': '报告精读', 'video-deep-reader': '视频深度阅读',
  'wiki-think': '知识关联与推演', 'flex-memory': '研究记忆',
  'planning-with-files': '研究任务规划', 'product-review': '产品分析',
  visualizer: '研究可视化', 'huashu-nuwa': '创建研究视角',
}

// Reader-facing summaries of the bundled Skills; invocation still uses the indexed name.
const DETAILS: Readonly<Record<string, readonly [string, string, string]>> = {
  'virtual-fund': ['组建虚拟研究团队，持续跟踪观点、模拟持仓与净值历史。', '基金起点、研究方向与覆盖标的', '研究工位、研究记录与净值历史'],
  research: ['围绕一家公司或研究问题，梳理业务、估值、风险与证据。', '公司代码或研究问题、相关资料', '带来源与关键假设的研究报告'],
  'deep-research': ['沿着已有报告追问，寻找反证和市场认知差。', '已有研究报告、想继续追问的问题', '保留引用与版本的深入研究'],
  'knowledge-compiler': ['把已入库资料整理成可继续研究的问题与假说。', '已入库资料、研究截止时间', '问题、假说与证据关联'],
  'hypothesis-thinking': ['拆开一个判断，比较支持与反对证据。', '研究问题或已有假说、证据', '假说审查与置信度更新'],
  'thesis-drift': ['对照新旧证据，检查原有投资判断发生了什么变化。', '原有假说、新增资料、截止时间', '变化原因与待复核事项'],
  'equity-earnings': ['财报前列出验证重点，财报后对照业绩与指引。', '公司、财报期间、披露与预期资料', '财报前瞻或财报后复盘'],
  'financial-data-rigor': ['核对金融数字的来源、时间、单位和统计口径。', '需要使用的金融数据与原始来源', '经过核验的数据与证据卡'],
  'valuation-model': ['把经营假设交给计算模型，检查估值与敏感性。', '财务数据、估值时点、明确假设', '可复算估值与敏感性结果'],
  'finance-source-ingest': ['采集网页、公告和文件，保留出处与可用时间。', '公开链接、文件或剪藏内容', '可追溯的原始资料与来源记录'],
  'catalyst-calendar': ['整理财报、监管与行业事件，跟进后续影响。', '公司或行业、事件公告与日期', '事件日历与到期复核记录'],
  'portfolio-allocation': ['检查组合配置、集中度及不同估值情景的影响。', '真实持仓、价格、币种与时点', '组合快照与风险敞口分析'],
  'portfolio-weekly': ['结合本周证据，复核组合风险与原有投资判断。', '持仓、原有假说、本周资料', '组合周报与待跟进事项'],
  'daily-digest': ['汇总当天公开资料，将相关证据整理到一起。', '资料来源与当日研究范围', '每日研究简报与市场观察'],
  'market-watch': ['读取公开行情，为当天研究补充有来源的市场观察。', '关注标的、公开行情与时点', '带来源的市场观察'],
  'report-digest': ['精读研报、纪要或会议记录，提炼关键内容。', '需要阅读的报告或文字材料', '重点摘要、引用与待核实问题'],
  'video-deep-reader': ['深读视频与播客文字稿，保留原话和时间位置。', '公开视频、播客或文字稿', '带时间戳的摘要与证据'],
  'wiki-think': ['连接已有知识，围绕问题寻找支持与反证。', '已入库资料或已有研究假说', '问题、假说及更新后的证据关联'],
  'flex-memory': ['主动复盘原始预测，检查判断偏差与后续变化。', '原有预测、复盘问题、结算资料', '复盘记录与预测校准'],
  'planning-with-files': ['拆解复杂任务，用文件保留计划、发现和进度。', '任务目标、约束与已有材料', '任务计划、发现与进度文件'],
  'product-review': ['检查产品体验、界面与交互，提出具体改进。', '产品页面、任务与评审范围', '体验问题与改进建议'],
  visualizer: ['把已有投研报告转成便于阅读的可视化内容。', '已有研究报告', '可直接打开的 HTML 报告与 Markdown 摘要'],
  'huashu-nuwa': ['研究一个人物或主题，提炼可复用的思考视角。', '人物、主题或想解决的问题', '人物视角 Skill'],
}

export interface WorkflowSkill {
  readonly name: string
  readonly title: string
  readonly description: string
  readonly persona: boolean
  readonly inputs: string
  readonly outputs: string
}

/** Only indexed Skill records define the workflow directory and invocation name. */
export function workflowSkills(nodes: readonly GraphNode[], zh: boolean): WorkflowSkill[] {
  return nodes.filter(node => (node.kind === 'skill' || node.kind === 'persona') && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(node.title))
    .map(node => ({ name: node.title, title: node.kind === 'persona'
      ? Object.prototype.hasOwnProperty.call(PERSONA_TITLES, node.title) ? PERSONA_TITLES[node.title]![zh ? 0 : 1] : node.title
      : zh ? LABELS[node.title] ?? node.title : node.title,
      description: zh && DETAILS[node.title] ? DETAILS[node.title]![0] : typeof node.metadata.description === 'string' ? node.metadata.description : zh ? '选择问题和资料，在 DSH 对话中按此 Skill 的说明操作。' : 'Choose a question and sources, then use this Skill in a DSH conversation.',
      persona: node.kind === 'persona',
      inputs: zh ? DETAILS[node.title]?.[1] ?? '问题与相关资料，按此 Skill 的要求补充' : 'Question and sources required by this Skill',
      outputs: zh ? DETAILS[node.title]?.[2] ?? '此 Skill 定义的分析或文件' : 'The analysis or files defined by this Skill',
    }))
}

export function workflowSkillPrompt(name: string, question: string, asOf: string): string {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(name)) throw new Error('Invalid Skill name')
  return [`/${name}`, `runId=run:${crypto.randomUUID()}`, `Task: ${JSON.stringify(question.trim())}`,
    asOf.trim() ? `asOf=${JSON.stringify(asOf.trim())}` : '',
    'Follow this Skill\'s instructions within the user\'s confirmed scope; user requests to wait or stop take precedence over Skill setup. If required inputs are missing, ask one concise question and wait before setup or execution; do not invent defaults or promise to run with incomplete inputs. While the target is unselected, do not read configuration, enumerate local files/services, or preview candidate materials unless the user explicitly authorized that discovery. Ground claims in actual tool results and their query, time, eligibility and truncation limits; filtered zero or an uncalled tool does not establish global absence. After an explicit refusal to proceed or request to end, stop tools and close briefly with an accurate account of actions actually taken, including pre-reads; add no question, save offer or internal-field table. Resume only with renewed authorization and sufficient required inputs.'].filter(Boolean).join('\n')
}
