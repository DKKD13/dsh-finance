/**
 * Chinese presentation copy for the shared tutorial manifest. The manifest in
 * `src/finance/tutorials.ts` stays the single source for lesson structure,
 * prompts and the demo payload; this file only translates the fields the
 * browser displays. Missing translations fall back to the canonical English
 * lesson rather than inventing a different course.
 * @module dsh-research-graph/client/tutorial-i18n
 */

import type { TutorialLesson } from '../shared/tutorials.ts'

export interface LessonCopy {
  readonly title: string
  readonly summary: string
  readonly duration: string
  readonly goal: string
  readonly prerequisites: readonly string[]
  readonly steps: readonly {
    readonly title: string
    readonly detail: string
    readonly action?: string | undefined
  }[]
  readonly expected: string
  readonly asOf: string
  readonly runId: string
  readonly limits: readonly string[]
}

const COMMON_LIMITS_ZH: readonly string[] = [
  '提示词只用于复制；本指南从不发送，也不调用模型。',
  '指南只读共享清单：不写图谱、不联网、不调用 LLM。',
  '仅研究用途：不连接券商、不下单、不交易、不构成投资建议。',
]

const COMMON_PREREQUISITE_ZH = '运行本插件的 DSH Session，并且能从侧栏进入金融工作台。'

const ZH_LESSONS: Readonly<Record<string, LessonCopy | undefined>> = {
  'first-chain': {
    title: '从一段公开剪藏到有引用的报告',
    summary: '先导入一段公开剪藏，在资料库知识编译，再通过原生对话研究。',
    duration: '约 15 分钟',
    goal: '用真实公开材料产出一份有引用的研究报告，不编造任何数字。',
    prerequisites: [
      COMMON_PREREQUISITE_ZH,
      '已导入的 Apple 演示来源，来源 URL 必须一致，且 availableAt 已知并不晚于 2025-10-31 截止时间。',
    ],
    steps: [
      {
        title: '预览演示剪藏',
        detail: '打开添加资料 → 粘贴剪藏，粘贴下方的演示剪藏 JSON，把 asOf 设为 2025-10-31T00:00:00.000Z，再预览导入。预览不会保存。',
        action: '预览导入',
      },
      {
        title: '确认并导入',
        detail: '检查收到 1 / 接受 1、无隔离，以及计划中的来源、原文和剪藏记录，再点“确认并导入”。本次预览会一次保存，只增加一个修订。',
        action: '确认并导入',
      },
      {
        title: '核对证据',
        detail: '在资料库选中已导入的 Apple 演示来源，阅读原文、标注、来源 URL 和 availableAt 2025-10-30。URL 必须与演示一致，可用时间必须已知且不晚于本课截止时间；其他材料和未来材料不能替代。',
        action: '选择来源',
      },
      {
        title: '在资料库知识编译',
        detail: '在资料库选中同一演示来源，展开“知识编译”，保持同一 asOf 后提交。/knowledge-compiler 使用新的 runId，产出问题、可证伪论断和编译记录。',
        action: '知识编译',
      },
      {
        title: '先读再下结论',
        detail: '在多空观点打开每个问题和论断，阅读置信度、支持/反驳证据、可靠性以及记录下来的缺口。论断是待检验假说，不是结果。',
        action: '选择假说',
      },
      {
        title: '通过原生对话研究',
        detail: '打开金融助手，写一个可回答问题，带上同一来源和 asOf，再进入原生对话研究。由你核对并发送请求，在历史研究查看已保存的结果。',
        action: '打开金融助手',
      },
      {
        title: '阅读有引用的交付物',
        detail: '在历史研究打开新报告，查看大纲、引用、来源和版本链。每个数字都必须回到导入的 Apple 发布稿；缺口要记录，不能填满。',
        action: '打开报告',
      },
    ],
    expected: '公开剪藏变成 source/raw 证据，再变成问题和论断节点，最后成为一份引用回该 source 的 deliverable；只有你提交导入、编译或研究时图谱才移动。',
    asOf: '2025-10-31T00:00:00.000Z，即 2025-10-30 发布后的第二天；入库、编译和研究使用同一截止时间。',
    runId: '资料库知识编译产生 compile:<uuid>，原生对话研究产生 research:<uuid>；原样粘贴，绝不跨运行复用。',
    limits: [
      ...COMMON_LIMITS_ZH,
      '演示剪藏是两段摘录，不是 Apple 完整发布稿；不要把它当作完整财报。',
    ],
  },
  'ticker-deep-research': {
    title: '单票研究、估值与一次深化',
    summary: '固定一个标的和截止时间，接入一手证据、做确定性估值，再显式跑一次 Deep Research。',
    duration: '约 40 分钟',
    goal: '在一个价格和证据截面下回答价值、预期与风险是否不对称，并展示推导。',
    prerequisites: [
      COMMON_PREREQUISITE_ZH,
      '一个公开标的；所有抓取字段都满足 availableAt ≤ asOf。',
    ],
    steps: [
      {
        title: '固定标的和截止时间',
        detail: '搜索代码，然后请求 Quote 和 History。Yahoo 抓取是只读 dry-run；未配置 provider 会留下可见缺口，而不是数字。',
        action: '请求报价与历史',
      },
      {
        title: '导入并编译证据',
        detail: '通过收集箱导入公告、电话会或 prepared remarks（URL、clip 或 PDF/DOCX），回到资料库选中 source，保持同一 asOf 点编译。只有截止时间内 ready 的来源才是候选。',
        action: '编译',
      },
      {
        title: '运行确定性模型',
        detail: '用明确单位、股数、WACC、永续增长和税率填 DCF，提交；再用具名 peer 做 comps。估值数字只能来自 finance_model 输出。',
        action: '运行 DCF / comps',
      },
      {
        title: '创建可证伪论断',
        detail: '从资料库选中来源后点“从证据新建假说”：kind=claim，写机制、kill criteria、confidence 和证据方向。最强的反证也要保留。',
        action: '从证据新建假说',
      },
      {
        title: '对照证据读论断',
        detail: '在假说页打开 claim：confidence、支持/反驳边、可靠性和缺口。claim 是待检验假说，不是可发布结论。',
        action: '打开论断',
      },
      {
        title: '显式研究，再深化',
        detail: '选择 Ticker 模式提交；基础稿存在后，选择 Deep 模式并填它的 id，寻找可验证认知差，或诚实记录 Pass。',
        action: 'Ticker → Deep',
      },
      {
        title: '冻结一个可检验预测',
        detail: '记录方向、数值、概率和结算日期，到期后才用观察结果结算；结算记录保留原预测。',
        action: '记录预测',
      },
    ],
    expected: '一份引用证据和模型输出的单票 deliverable，以及一次明确写出可证伪认知差或 Pass 的深化结果。',
    asOf: '每次抓取、编译和研究使用同一个 ISO 截止时间，例如 2025-10-31T00:00:00.000Z；fetchedAt 不是 availableAt。',
    runId: 'Ticker 用 research:<uuid>；Deep 用第二个 research:<uuid>，还需要 baseReportId=<deliverable:…>。',
    limits: [
      ...COMMON_LIMITS_ZH,
      '“没有可验证认知差”是合法结果；指南不承诺 alpha 或目标价。',
    ],
  },
  'hypothesis-review-drift': {
    title: '审查论断，不改写历史',
    summary: '读证据，选择 thinking 或 drift 审查，只结算到期预测。',
    duration: '约 20 分钟',
    goal: '分清真实证据变化和措辞变化，同时保留原论断与预测的可审计性。',
    prerequisites: [
      COMMON_PREREQUISITE_ZH,
      '一个有至少一条 supports/contradicts 边的 claim，以及不早于该证据的审查截止时间。',
    ],
    steps: [
      {
        title: '选一个活跃论断',
        detail: '打开已有证据边的 claim，先读 confidence、可靠性和缺口，再判断是否有变化。',
        action: '选择论断',
      },
      {
        title: '选择审查模式',
        detail: '填写审查截止时间，再选 Thinking Review 检验推理，或 Drift Review 对比两个带日期快照。没有截止时间两者都禁用。',
        action: '审查 / 漂移',
      },
      {
        title: '阅读 review 交付物',
        detail: 'review 会写成新的 deliverable 和 session；原 claim 和更早报告不会被原地修改，旧稿和新稿可以并排比较。',
        action: '打开 review',
      },
      {
        title: '对比，不混为一谈',
        detail: '用版本链、引用和日期看证据是否真的变化。单纯改写或价格波动不等于论文漂移。',
        action: '版本链',
      },
      {
        title: '只结算到期的',
        detail: '在审查截止时间加载 due predictions，用观察结果结算；未解决保持 pending 并给警告，绝不改写过去的 confidence。',
        action: '加载到期 → 结算预测',
      },
    ],
    expected: '一份说明什么变了、什么没变、哪些预测已结算的 review deliverable，原 claim 保持完整。',
    asOf: '审查截止时间必须不早于它判断的证据，例如 2025-10-31T00:00:00.000Z；Drift 还需要更早快照。',
    runId: 'review 点击产生 review:<uuid>，并带上你打开的 hypothesisId=<claim:…>。',
    limits: [
      ...COMMON_LIMITS_ZH,
      '审查永不编辑原 claim、confidence 或预测；更早的截止时间看不到后来的证据。',
    ],
  },
  'portfolio-weekly': {
    title: '一次组合周度复核',
    summary: '快照你愿意提供的持仓，刷新公开数据，结算到期预测，再记录并校准这一周。',
    duration: '约 25 分钟',
    goal: '解释组合这一周发生了什么、缺什么、下周要验证什么。',
    prerequisites: [
      COMMON_PREREQUISITE_ZH,
      '你愿意输入的非敏感持仓；绝不读取券商账户。',
      '在读任何新证据前固定 weekStartAsOf 和 weekEndAsOf。',
    ],
    steps: [
      {
        title: '快照你愿意提供的持仓',
        detail: '提交包含数量或权重的 portfolio JSON。缺失数量保持缺失；Host 不编造市值或成本。',
        action: '运行组合快照',
      },
      {
        title: '刷新公开观察',
        detail: '在周边界抓取你依赖的行情。抓取是 dry-run；provider 不可用保留为显式缺口，而不是旧数字。',
        action: '请求报价与历史',
      },
      {
        title: '结算这一周',
        detail: '在 weekEndAsOf 加载 due predictions，只结算证据支持的结果，其余保持 pending 并给警告。',
        action: '加载到期 → 结算预测',
      },
      {
        title: '准备截止截面',
        detail: '在 weekEndAsOf 准备 briefing。卡片文本是确定性图谱内容；prepare 不调用模型，不改写历史。',
        action: '准备简报',
      },
      {
        title: '记录周报',
        detail: '填写 id、标题和 metadata，点“使用准备内容”，再记录 briefing。deliverable 引用准备好的卡片，是研究记录，不是建议。',
        action: '记录简报',
      },
      {
        title: '检查校准',
        detail: '评估 briefing 只评分 resolved 预测，并标出 pending。校准不会改写过去的 confidence。',
        action: '评估简报',
      },
      {
        title: '从上周读下周',
        detail: '下周把这份 deliverable 当作 oldAsOf，避免把后来的事实倒填进更早的一周。',
        action: '打开报告',
      },
    ],
    expected: '一份带明确截止时间、暴露视图、结算预测和校准的周报 deliverable，可作为下周基线复用。',
    asOf: '整轮使用 weekEndAsOf，例如 2025-10-31T00:00:00.000Z；上一周 deliverable 作为 oldAsOf。',
    runId: '整轮用 weekly:<uuid>；其中写入的每个节点都必须带同一 runId。',
    limits: [
      ...COMMON_LIMITS_ZH,
      '持仓只限于你输入的内容；不连接账户、不做再平衡、不自动给建议。',
    ],
  },
  'web-clipper': {
    title: '把页面或文件采集为证据',
    summary: '预览 feed、clip bundle 或本地文件，提交一次修订，再确认时间门。',
    duration: '约 10 分钟',
    goal: '把真实公开页面或文件变成一条有诚实 availableAt 的可审计 source。',
    prerequisites: [
      COMMON_PREREQUISITE_ZH,
      '材料的发布日期，或明确声明未知。',
      '可选：MV3 扩展需要 clipperHttp.enabled、token 文件和精确 allowed Origin；直接粘贴到收集箱不需要这些。',
    ],
    steps: [
      {
        title: '预览公开 URL 或 feed',
        detail: '粘贴 RSS/Atom feed 或 YouTube 链接，点预览导入：source.fetch 使用 dryRun，不写入。单篇文章应走 Clip 或 File。',
        action: '预览导入',
      },
      {
        title: '预览剪藏或文件',
        detail: 'Clip 接受 dsh.clipper/v1 JSON；File 接受 MD、TXT、HTML、CSV、OPML、PDF、DOCX。两者都先预览，不支持的类型在写入前拒绝。availableAt 必须来自页面；未知就省略，让 Host 隔离；asOf 由你自己填。',
        action: '预览导入',
      },
      {
        title: '提交一次原子修订',
        detail: '阅读 received/accepted/duplicates/quarantined/rejected 和计划节点，再点确认原子导入。一次点击提交一个 revision，否则什么都不写。',
        action: '确认原子导入',
      },
      {
        title: '确认时间门',
        detail: '在资料库选中 source，检查 provider、availableAt、asOf 和 contentHash。晚于截止时间的材料保持隔离，不能被编译。',
        action: '选择来源',
      },
      {
        title: '看台账移动',
        detail: '新 source 让“采集”变为完成，下一阶段成为“编译”；刷新后状态一致，因为它来自图谱。',
        action: '打开工作流',
      },
    ],
    expected: '一条带原文、标注、provider 和 contentHash 的 source，作为恰好一个 revision 提交，或明确隔离。',
    asOf: '自行填写截止时间，例如演示剪藏用 2025-10-31T00:00:00.000Z；指南不会用当前时钟代填。任何导入都必须满足 availableAt ≤ 截止时间。',
    runId: '导入会生成 run-<hash>，除非你显式提供；复制预览中的准确 id，不要自己发明。',
    limits: [
      ...COMMON_LIMITS_ZH,
      '采集时间不是可用时间：capturedAt 永不替代 availableAt，未知发布日期不猜。使用页面标注的 availableAt；未知就省略 availableAt，让 Host 隔离；asOf 必须显式填写，不用当前时钟。',
    ],
  },
}

function englishCopy(lesson: TutorialLesson): LessonCopy {
  return {
    title: lesson.title,
    summary: lesson.summary,
    duration: lesson.duration,
    goal: lesson.goal,
    prerequisites: lesson.prerequisites,
    steps: lesson.steps.map(step => ({
      title: step.title,
      detail: step.detail,
      ...(step.action === undefined ? {} : { action: step.action }),
    })),
    expected: lesson.expected,
    asOf: lesson.asOf,
    runId: lesson.runId,
    limits: lesson.limits,
  }
}

/** Current controls for lesson 1, kept here with its localized teaching copy. */
export function firstChainControlCopy(locale: string | undefined): Readonly<Record<string, string>> {
  return (locale?.toLowerCase().startsWith('zh') ?? true) ? {
    'guide.prereq.latestSource': '已导入本课 Apple 演示来源，URL 一致且可用时间不晚于本课截止时间。',
    'guide.open.latestSource': '打开演示来源',
    'guide.clip.copyOpen': '复制剪藏并打开添加资料',
    'guide.clip.openInbox': '打开添加资料',
    'guide.clip.copiedHint': '已复制。在添加资料 → 粘贴剪藏中粘贴，预览导入后点“确认并导入”保存。',
    'guide.clip.copyHint': '预览不会保存；只有点“确认并导入”才会写入。',
  } : {
    'guide.prereq.latestSource': 'The imported Apple demo source has the matching URL and a known availability at or before the lesson cutoff.',
    'guide.open.latestSource': 'Open demo source',
    'guide.clip.copyOpen': 'Copy clip and open Add a source',
    'guide.clip.openInbox': 'Open Add a source',
    'guide.clip.copiedHint': 'Copied. In Add a source → Paste clip, paste and preview the import, then press Confirm and import to save.',
    'guide.clip.copyHint': 'Preview does not save. Only Confirm and import writes the records.',
  }
}

/**
 * Localized display copy for one lesson. Chinese uses the checked map only when
 * its step count matches the canonical lesson; anything else falls back to the
 * shared English so structure and indices can never diverge.
 */
export function lessonCopy(lesson: TutorialLesson, locale: string | undefined): LessonCopy {
  if (locale !== undefined && locale.toLowerCase().startsWith('zh')) {
    const translated = ZH_LESSONS[lesson.id]
    if (translated !== undefined && translated.steps.length === lesson.steps.length) return translated
  }
  return englishCopy(lesson)
}

/** Test seam: the translated lesson ids, not their content. */
export function translatedLessonIds(): string[] {
  return Object.keys(ZH_LESSONS)
}
