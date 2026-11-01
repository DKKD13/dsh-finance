#!/usr/bin/env node
/**
 * migrate-skills.mjs — 将 research-skills/skills 完整迁移为插件内 skills/。
 *
 * 用法：
 *   node scripts/migrate-skills.mjs          # 重新生成 skills/（幂等，先清空再写入）
 *   node scripts/migrate-skills.mjs --check  # 只校验 skills/ 与迁移结果一致，不写盘
 *
 * 迁移 = 全量复制 + research-skills/dsh-overrides 的完整运行版本
 *        + 本文件中显式声明的 DSH 兼容修复（TRANSFORMS）+ 随包许可证。
 * override 优先于 TRANSFORMS，适用于需要整体重写而非局部替换的技能。
 * 每条局部修复都是「必须命中」的替换：源文件漂移导致找不到原文时直接报错，
 * 不会静默产出半迁移内容。catalog.json 由本脚本在迁移后扫描生成。
 */
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const SRC = join(ROOT, 'research-skills', 'skills')
const OVERRIDES = join(ROOT, 'research-skills', 'dsh-overrides')
const DEST = join(ROOT, 'skills')
const CHECK_ONLY = process.argv.includes('--check')

// ---------------------------------------------------------------------------
// 兼容修复声明。key 为相对 research-skills/skills 的路径。
// rule: [find, replace] 字符串替换（必须命中）；或 { all: [find, replace] } 全局替换
// （必须至少命中一次）；或 (content: string) => string 函数。
// ---------------------------------------------------------------------------

/** @type {Record<string, Array<[string, string] | { all: [string, string] } | ((c: string) => string)>>} */
const TRANSFORMS = {
  '_investment-philosophy.md': [
    [
      '> Reference 文件，**不是 skill**。Claude 不会自动加载。',
      '> Reference 文件，**不是 skill**（无 frontmatter），宿主（DSH）不会把它注册成技能，也不会自动加载。',
    ],
  ],

  'flex-memory/SKILL.md': [
    (content) => {
      const fm = content.match(/^\*\*\*\n([\s\S]*?)\n\*\*\*\n/)
      if (!fm) throw new Error('flex-memory/SKILL.md: 找不到 *** frontmatter 块')
      const fields = fm[1].split('\n').map(l => l.trim()).filter(Boolean)
      if (!fields.some(l => l.startsWith('name:')) || !fields.some(l => l.startsWith('description:'))) {
        throw new Error('flex-memory/SKILL.md: frontmatter 缺 name/description')
      }
      let out = `---\n${fields.join('\n')}\n---\n` + content.slice(fm[0].length)
      // 去掉上游 pandoc 转换残留的转义（\~ \$ \[ \] 在代码块里是字面量，会破坏命令）
      out = out.replace(/\\([~$[\]])/g, '$1')
      return out
    },
    ['或 `_alex-profile.md` §4', '或 `../_investment-philosophy.md` §4'],
    [
      '**结构化经验 → 更好的方法论 → 更好的预测**。不靠梯度更新，不靠微调。',
      '**结构化经验 → 更好的方法论 → 更好的预测**。不靠梯度更新，不靠微调。\n\n'
      + '> **外部依赖**：`~/tools/memory.py` 是用户本地的私有记忆 CLI，**不随本插件分发**。'
      + '未安装时跳过记忆相关操作，或把命令路径替换为实际安装位置。',
    ],
  ],

  'research/SKILL.md': [
    ['`_alex-profile.md` §3', '`../_investment-philosophy.md` §3'],
    { all: ['`_investment-philosophy.md`', '`../_investment-philosophy.md`'] },
    [
      '每次分析按以下顺序获取信息，不要跳过前面直接 web_search：\n',
      '每次分析按以下顺序获取信息，不要跳过前面直接 web_search：\n\n'
      + '> **外部依赖**：`kb.py` / `sources.py` / `qmd` 以及 `investor-wiki/` vault 都是用户本地的私有工具与资料，'
      + '**不随本插件分发**。未配置时跳过对应步骤，用 WebSearch 与 yfinance 补位。\n',
    ],
  ],

  'research/reference/tools.md': [
    ['由 `research/SKILL.md` 引用', '由 `../SKILL.md` 引用'],
    [
      '## 1. 本地知识库（第一优先）',
      '> **外部依赖**：本文件中 `kb.py` / `sources.py` / `qmd` 均为用户本地私有工具，**不随本插件分发**；未配置时跳过对应步骤。\n\n'
      + '## 1. 本地知识库（第一优先）',
    ],
    ['（junction 到 D:/investor-letters/）', '（可软链到本地信件目录，路径自行配置）'],
  ],

  'research/reference/dimension-templates.md': [
    ['本地 wiki 扫 `D:\\研究空间\\investor-wiki\\wiki\\`', '本地 wiki 扫 `${INVESTOR_WIKI_ROOT}/wiki/`（用户本地 vault 根目录，自行配置）'],
  ],

  'deep-research/SKILL.md': [
    { all: ['`_investment-philosophy.md`', '`../_investment-philosophy.md`'] },
    ['| `reference/valuation.md` |', '| `../research/reference/valuation.md`（属于 research skill） |'],
    ['| `reference/tools.md` |', '| `../research/reference/tools.md`（属于 research skill） |'],
    ['| `reference/notion-output.md` |', '| `../research/reference/notion-output.md`（属于 research skill） |'],
  ],

  'deep-research/reference/inspirer.md': [
    ['由 `deep-research/SKILL.md` 引用', '由 `../SKILL.md` 引用'],
    ['**[READ]** `_investment-philosophy.md` 全文', '**[READ]** `../../_investment-philosophy.md` 全文'],
    [
      '如果不确定搭档 name，读 team config: `~/.claude/teams/{team-name}/config.json`，找 `members` 列表里的 `name` 字段。',
      '如果不确定搭档 name，直接向 team-lead 确认当前 team 的成员列表（`members` 中各自的 `name` 字段），不要凭 agent type 名猜测。',
    ],
    [
      '用 WebSearch + kb.py 搜索：',
      '用 WebSearch + kb.py（用户本地私有工具，**不随本插件分发**；未配置时只用 WebSearch）搜索：',
    ],
  ],

  'report-digest/SKILL.md': [
    ['参见 `_alex-profile.md` §3。', '参见 `../_investment-philosophy.md` §3（信任锚分级）。'],
  ],

  // 各 reference 文件顶部的「由 X 引用」说明，修正为包内真实相对路径
  'research/reference/valuation.md': [
    ['由 `research/SKILL.md` 估值部分引用', '由 `../SKILL.md` 估值部分引用'],
  ],
  'research/reference/evaluator.md': [
    ['由 `research/SKILL.md` 引用', '由 `../SKILL.md` 引用'],
  ],
  'research/reference/notion-output.md': [
    ['由 `research/SKILL.md` 引用', '由 `../SKILL.md` 引用'],
  ],
  'visualizer/references/design-system.md': [
    ['由 `visualizer/SKILL.md` 引用', '由 `../SKILL.md` 引用'],
  ],

  'hypothesis-thinking/SKILL.md': [
    ['完整信任分级见 `_alex-profile.md` §3', '完整信任分级见 `../_investment-philosophy.md` §3'],
  ],

  'portfolio-allocation/SKILL.md': [
    ['Alpha 衰减速度见 `_alex-profile.md` §1', 'Alpha 衰减速度见 `../_investment-philosophy.md` §1'],
  ],

  'wiki-think/SKILL.md': [
    ['| 判断投资哲学 | `_investment-philosophy.md` |', '| 判断投资哲学 | `../_investment-philosophy.md` |'],
    ['开始前 **[READ]** `investor-wiki/wiki/ENVISION.md`。', '开始前 **[READ]** `${INVESTOR_WIKI_ROOT}/wiki/ENVISION.md`（vault 根目录见文末「Vault 路径」）。'],
    ['sources.py 看最新 RSS', 'sources.py（外部私有工具，不随本插件分发，未配置则跳过）看最新 RSS'],
    [
      [
        '## Vault 路径\n\n',
        '- Raw 材料：`D:/研究空间/investor-wiki/raw/`\n',
        '- Wiki 编译层：`D:/研究空间/investor-wiki/wiki/`\n',
        '- Workspace：`D:/研究空间/investor-wiki/workspace/`\n',
        '- ENVISION：`D:/研究空间/investor-wiki/wiki/ENVISION.md`\n',
        '- _log：`D:/研究空间/investor-wiki/wiki/_log.md`',
      ].join(''),
      [
        '## Vault 路径\n\n',
        '以下路径全部基于可配置占位符 `${INVESTOR_WIKI_ROOT}`（用户本地的 investor-wiki / Obsidian vault 根目录，**不随本插件分发**，使用前自行绑定）：\n\n',
        '- Raw 材料：`${INVESTOR_WIKI_ROOT}/raw/`\n',
        '- Wiki 编译层：`${INVESTOR_WIKI_ROOT}/wiki/`\n',
        '- Workspace：`${INVESTOR_WIKI_ROOT}/workspace/`\n',
        '- ENVISION：`${INVESTOR_WIKI_ROOT}/wiki/ENVISION.md`\n',
        '- _log：`${INVESTOR_WIKI_ROOT}/wiki/_log.md`',
      ].join(''),
    ],
  ],

  'daily-digest/SKILL.md': [
    [
      '**Project root:** `D:\\项目开发\\RSS-Notion`\n**Obsidian vault:** `D:\\研究空间\\AI_Daily`',
      '**Project root:** `$RSS_NOTION_ROOT`\n**Obsidian vault:** `$OBSIDIAN_DAILY_DIR`\n\n'
      + '> **外部依赖（均不随本插件分发，需用户自行安装配置）**：\n'
      + '> - RSS-Notion 管线项目（含 `pipeline_io.py`、`prompts/`、`delivery/notion_writer.py`），根目录由环境变量 `RSS_NOTION_ROOT` 指定\n'
      + '> - Notion 集成凭据（由管线项目自身管理）\n'
      + '> - Obsidian 日记目录，由环境变量 `OBSIDIAN_DAILY_DIR` 指定\n'
      + '> - `yfinance`（pip 包），用于拉取行情',
    ],
    { all: ['D:\\项目开发\\RSS-Notion', '$RSS_NOTION_ROOT'] },
    { all: ['D:\\研究空间\\AI_Daily', '$OBSIDIAN_DAILY_DIR'] },
  ],

  'daily-digest/market-watch.md': [
    [
      'Append a 📈 市场观察 section to today\'s daily report (Notion + Obsidian).',
      'Append a 📈 市场观察 section to today\'s daily report (Notion + Obsidian).\n\n'
      + '> **外部依赖**：RSS-Notion 管线项目（根目录由 `$RSS_NOTION_ROOT` 指定）、Notion 凭据、Obsidian 日记目录（`$OBSIDIAN_DAILY_DIR`）均**不随本插件分发**，需用户自行配置。详见 `SKILL.md`（daily-digest）的「外部依赖」说明。',
    ],
    { all: ['D:\\项目开发\\RSS-Notion', '$RSS_NOTION_ROOT'] },
    { all: ['D:\\研究空间\\AI_Daily', '$OBSIDIAN_DAILY_DIR'] },
  ],

  'product-review/SKILL.md': [
    ['Setup → Browse → Feature Test → Edge Cases → Report → Commit', 'Setup → Browse → Feature Test → Edge Cases → Report → Deliver'],
    ['> Date: YYYY-MM-DD | Reviewer: AI PM (Claude)', '> Date: YYYY-MM-DD | Reviewer: AI PM'],
    [
      [
        '## Phase 6: Commit\n\n',
        '```bash\n',
        'git add docs/superpowers/product-review.md\n',
        'git commit -m "docs: product review with N screenshots"\n',
        '```',
      ].join(''),
      [
        '## Phase 6: Deliver\n\n',
        '向用户交付报告路径与截图索引，总结 P0/P1 发现。',
        '**绝不自动执行 `git add` / `git commit` / `git push`** — 是否提交、何时提交由用户决定；',
        '用户明确要求提交时，再按用户指定的 message 执行。',
      ].join(''),
    ],
  ],

  'planning-with-files/SKILL.md': [
    (content) => {
      const fm = content.match(/^---\n([\s\S]*?)\n---\n/)
      if (!fm) throw new Error('planning-with-files/SKILL.md: 找不到 frontmatter')
      if (!fm[1].includes('hooks:')) throw new Error('planning-with-files/SKILL.md: 预期存在 hooks 字段')
      // DSH 不支持 Claude hooks / allowed-tools，只保留 DSH 认识的字段
      const next = [
        '---',
        'name: planning-with-files',
        'description: Implements Manus-style file-based planning to organize and track progress on complex tasks. Creates task_plan.md, findings.md, and progress.md. Use when asked to plan out, break down, or organize a multi-step project, research task, or any work requiring >5 tool calls. Supports file-based session recovery across context resets.',
        'user-invocable: true',
        'metadata:',
        '  version: "2.23.0"',
        '---',
      ].join('\n') + '\n'
      return next + content.slice(fm[0].length)
    },
    [
      'Work like Manus: Use persistent markdown files as your "working memory on disk."',
      'Work like Manus: Use persistent markdown files as your "working memory on disk."\n\n'
      + '> **DSH 兼容说明**：本 skill 原版依赖 Claude Code hooks（PreToolUse / Stop 等）自动重读计划文件。'
      + '**DSH 不支持 Claude hooks**，相关行为改为纪律性约定 — 模型需自觉遵守下面的「Read Before Decide / Update After Act」。'
      + '`${PLANNING_SKILL_DIR}` 指本 skill 的安装目录（DSH 加载 skill 时会在 Resources 信息中给出实际路径）。',
    ],
    [
      '```bash\n# Linux/macOS\n$(command -v python3 || command -v python) ${CLAUDE_PLUGIN_ROOT}/scripts/session-catchup.py "$(pwd)"\n```\n\n'
      + '```powershell\n# Windows PowerShell\n& (Get-Command python -ErrorAction SilentlyContinue).Source "$env:USERPROFILE\\.claude\\skills\\planning-with-files\\scripts\\session-catchup.py" (Get-Location)\n```',
      '```bash\n# 注意：session-catchup.py 读取的是 Claude Code 的会话存档（~/.claude/projects），\n'
      + '# 在 DSH 下不可用（DSH 会话存储格式不同）。脚本保留在 scripts/ 仅供移植参考；\n'
      + '# DSH 下的等价做法：直接重读三个计划文件 + git diff 恢复上下文。\n'
      + '$(command -v python3 || command -v python) ${PLANNING_SKILL_DIR}/scripts/session-catchup.py "$(pwd)"\n```',
    ],
    ['- **Templates** are in `${CLAUDE_PLUGIN_ROOT}/templates/`', '- **Templates** are in `${PLANNING_SKILL_DIR}/templates/`'],
    ['| Skill directory (`${CLAUDE_PLUGIN_ROOT}/`) |', '| Skill directory (`${PLANNING_SKILL_DIR}/`) |'],
    [
      '- `scripts/init-session.sh` — Initialize all planning files\n- `scripts/check-complete.sh` — Verify all phases complete\n- `scripts/session-catchup.py` — Recover context from previous session (v2.2.0)',
      '- `scripts/init-session.sh` — Initialize all planning files（`.ps1` 为 Windows PowerShell 等价版本，功能相同）\n'
      + '- `scripts/check-complete.sh` — Verify all phases complete（同上，有 `.ps1` 版本）\n'
      + '- `scripts/session-catchup.py` — Recover context from previous session（**Claude Code 专用**，DSH 下不可用，见上文）',
    ],
    [
      '## Security Boundary\n\nThis skill uses a PreToolUse hook to re-read `task_plan.md` before every tool call. Content written to `task_plan.md` is injected into context repeatedly — making it a high-value target for indirect prompt injection.',
      '## Security Boundary\n\nDSH 不支持 Claude hooks — 原版在每个工具调用前自动重读 `task_plan.md` 的 PreToolUse hook 在 DSH 下不存在，'
      + '重读计划文件依赖模型自觉遵守「Read Before Decide」纪律。`task_plan.md` 会被反复读入上下文，'
      + '因此它仍是间接提示注入的高价值目标，必须遵守以下隔离原则：',
    ],
  ],

  'huashu-nuwa/SKILL.md': [
    { all: ['.claude/skills', '${DSH_SKILLS_DIR}'] },
    [
      '**收到确认后立即执行**，在调研之前完成：\n',
      '**收到确认后立即执行**，在调研之前完成：\n\n'
      + '> `${DSH_SKILLS_DIR}` 是可配置占位符：在 DSH 中通常是 `~/.dsh/skills`（用户级）或 `<项目>/.dsh/skills`（项目级）。\n',
    ],
  ],

  'huashu-nuwa/examples/x-mastery-mentor/SKILL.md': [
    // 裸文件名指向的是本 skill 的 references/ 文件，补全为真实相对路径
    { all: ['`writing-workshop.md`', '`references/writing-workshop.md`'] },
    { all: ['`algorithm-niche.md`', '`references/algorithm-niche.md`'] },
    { all: ['`growth-monetization.md`', '`references/growth-monetization.md`'] },
    { all: ['`mental-models-heuristics.md`', '`references/mental-models-heuristics.md`'] },
    { all: ['`quality-analytics.md`', '`references/quality-analytics.md`'] },
  ],

  'huashu-nuwa/scripts/merge_research.py': [
    ['python3 merge_research.py .claude/skills/elon-musk-perspective', 'python3 merge_research.py ~/.dsh/skills/elon-musk-perspective'],
  ],

  'huashu-nuwa/scripts/quality_check.py': [
    ['python3 quality_check.py .claude/skills/elon-musk-perspective/SKILL.md', 'python3 quality_check.py ~/.dsh/skills/elon-musk-perspective/SKILL.md'],
  ],

  'planning-with-files/scripts/session-catchup.py': [
    [
      'Analyzes the previous session to find unsynced context after the last\nplanning file update. Designed to run on SessionStart.',
      'Analyzes the previous session to find unsynced context after the last\n'
      + 'planning file update. Designed to run on SessionStart.\n\n'
      + 'NOTE: reads Claude Code session storage (~/.claude/projects) and is NOT\n'
      + 'functional under DSH (different session format). Kept for reference/porting.',
    ],
  ],
}

// ---------------------------------------------------------------------------
// catalog.json 的手工补充信息（外部依赖与跨技能关系无法从文件内容自动推断）
// ---------------------------------------------------------------------------

/** @type {Record<string, string[]>} */
const EXTERNAL_DEPS = {
  'virtual-fund': ['finance_virtual_fund（宿主持久化模拟账本）', 'DSH 原生 schedule_*（可选，实际可用后开启）', '公开数据来源与历史可用时间'],
  'research': ['公开金融数据 provider（由宿主只读 finance_* 实际配置）', 'finance_model（宿主确定性计算工具）'],
  'deep-research': ['同 research；需先有 research 的图谱基础稿'],
  'flex-memory': ['finance_briefing.evaluate（宿主确定性预测评估）'],
  'daily-digest': ['公开来源读取能力（宿主已有网页/只读 finance_*）', 'finance_model（宿主确定性计算工具）'],
  'market-watch': ['公开行情 provider（由宿主只读 finance_* 实际配置）', 'finance_model（宿主确定性计算工具）'],
  'wiki-think': ['finance_graph（宿主图谱接口）', '公开来源读取能力（宿主已有网页/只读 finance_*）'],
  'knowledge-compiler': ['当前真实 DSH Session（唯一模型运行时）', 'finance_graph（宿主图谱接口）'],
  'portfolio-allocation': ['公开金融数据 provider（由宿主只读 finance_* 实际配置）', 'finance_model（宿主确定性计算工具）'],
  'product-review': ['Playwright + headless Chromium', '被测应用需已启动'],
  'visualizer': ['DSH 原生 HTML/Markdown 预览（默认）', 'Obsidian（仅显式选择时使用）'],
  'huashu-nuwa': ['yt-dlp（download_subtitles.sh）', 'python3'],
  'planning-with-files': ['python3（session-catchup.py 仅 Claude Code 可用，DSH 下无效）'],
  'hypothesis-thinking': ['finance_graph / research_graph_query（宿主图谱只读与原子写入接口）'],
  'report-digest': [],
  'mrbeast-perspective': ['python3（scripts/）', 'yt-dlp（fetch_youtube_subtitles.sh）'],
  'financial-data-rigor': ['公开金融数据 provider（由宿主只读 finance_* 实际配置）', 'finance_model（宿主确定性计算工具）'],
  'thesis-drift': ['finance_graph / research_graph_query（宿主图谱只读与原子写入接口）', 'finance_model（宿主确定性计算工具）'],
  'valuation-model': ['finance_model（宿主确定性估值工具；不可用时不估值）'],
  'equity-earnings': ['公开财报/共识 provider（由宿主只读 finance_* 实际配置）', 'finance_model（宿主确定性计算工具）'],
  'catalyst-calendar': ['公开官方日历/公告读取能力', 'finance_briefing.evaluate（宿主确定性校准汇总）'],
  'portfolio-weekly': ['公开行情 provider（由宿主只读 finance_* 实际配置）', 'finance_model（宿主确定性计算工具）'],
  'finance-source-ingest': ['公开来源读取能力（宿主已有网页/只读 finance_*）'],
  'video-deep-reader': ['带 segment 时间戳的公开 transcript（用户提供或宿主已有只读能力）'],
}

/** @type {Record<string, Array<{ type: string, target: string, note?: string }>>} */
const RELATIONS = {
  'research': [
    { type: 'reads', target: 'shared:_investment-philosophy.md', note: '§1-§3 投资哲学 / 信任分级' },
    { type: 'uses', target: 'finance-source-ingest', note: '公开材料先入图谱证据链' },
    { type: 'uses', target: 'knowledge-compiler', note: '可消费编译假说，最终报告由用户显式选择后生成' },
    { type: 'uses', target: 'financial-data-rigor', note: '关键数字归一化与交叉验证' },
    { type: 'uses', target: 'valuation-model', note: '唯一确定性估值路径' },
    { type: 'suggests', target: 'deep-research', note: '基础稿完成后由用户决定是否深挖' },
    { type: 'suggests', target: 'report-digest', note: '只需摘要而非完整分析时' },
  ],
  'deep-research': [
    { type: 'requires', target: 'research', note: '必须先有 research 的图谱基础稿' },
    { type: 'reads', target: 'shared:_investment-philosophy.md', note: '全文' },
    { type: 'uses', target: 'knowledge-compiler', note: '读取编译假说与来源边，不把假说当最终报告' },
    { type: 'uses', target: 'valuation-model', note: '反向 DCF 与敏感性' },
  ],
  'knowledge-compiler': [
    { type: 'requires', target: 'finance-source-ingest', note: '只读取已入库 ready source/raw' },
    { type: 'suggests', target: 'research', note: '编译不是报告，由用户另选研究流程' },
    { type: 'suggests', target: 'deep-research', note: '编译不是报告，由用户另选深挖流程' },
  ],
  'report-digest': [
    { type: 'reads', target: 'shared:_investment-philosophy.md', note: '§3 信任锚分级' },
    { type: 'alternative-to', target: 'research', note: '摘要场景，不做基本面分析' },
  ],
  'hypothesis-thinking': [
    { type: 'reads', target: 'shared:_investment-philosophy.md', note: '§3 证据可靠性分级' },
  ],
  'portfolio-allocation': [
    { type: 'uses', target: 'research', note: '个股研究' },
    { type: 'uses', target: 'valuation-model', note: '估值情景只引用完整模型结果' },
    { type: 'uses', target: 'portfolio-weekly', note: '持续组合复核' },
    { type: 'uses', target: 'flex-memory', note: '预测校准与复盘' },
    { type: 'reads', target: 'shared:_investment-philosophy.md', note: '§1 Alpha 衰减速度→复核周期' },
  ],
  'flex-memory': [
    { type: 'uses', target: 'financial-data-rigor', note: '实际值与预测使用同口径证据' },
  ],
  'wiki-think': [
    { type: 'reads', target: 'shared:_investment-philosophy.md', note: '判断投资哲学' },
    { type: 'uses', target: 'knowledge-compiler', note: '编织模式统一走图谱知识编译' },
  ],
  'daily-digest': [
    { type: 'bundles', target: 'market-watch', note: 'Phase 4 市场观察；market-watch 可独立运行' },
    { type: 'uses', target: 'finance-source-ingest', note: '每日公开材料采集' },
    { type: 'uses', target: 'video-deep-reader', note: '长视频保留 segment 时间戳' },
    { type: 'uses', target: 'catalyst-calendar', note: '事件与到期预测' },
  ],
  'market-watch': [
    { type: 'standalone-of', target: 'daily-digest', note: '可独立运行，也可作为 daily-digest Phase 4' },
  ],
  'visualizer': [
    { type: 'consumes', target: 'research', note: '可视化 research / deep-research 产出的报告' },
  ],
  'huashu-nuwa': [
    { type: 'generates', target: 'examples:*', note: 'examples/ 下 15 个成品视角技能均为女娲蒸馏产物；新蒸馏的 skill 写入 ${DSH_SKILLS_DIR}' },
  ],
  'finance-source-ingest': [
    { type: 'suggests', target: 'knowledge-compiler', note: 'ready sourceIds 进入假说编译' },
    { type: 'suggests', target: 'financial-data-rigor', note: '关键金融数字进一步归一化与交叉验证' },
    { type: 'suggests', target: 'video-deep-reader', note: '视频材料保留 segment 时间戳' },
  ],
  'financial-data-rigor': [
    { type: 'reads', target: 'finance-source-ingest', note: '统一证据卡 metadata' },
  ],
  'thesis-drift': [
    { type: 'uses', target: 'financial-data-rigor', note: '新旧快照的同口径核验' },
    { type: 'uses', target: 'valuation-model', note: '需要重新估值时完整重跑' },
  ],
  'valuation-model': [
    { type: 'uses', target: 'financial-data-rigor', note: '模型输入的时间与口径门' },
    { type: 'reads', target: 'finance-source-ingest', note: '证据卡与统一 metadata' },
  ],
  'equity-earnings': [
    { type: 'uses', target: 'valuation-model', note: '财报后需要估值时完整重跑' },
    { type: 'uses', target: 'catalyst-calendar', note: 'catalyzes/resolves 与到期结算' },
    { type: 'suggests', target: 'thesis-drift', note: '比较财报前后论文' },
  ],
  'catalyst-calendar': [
    { type: 'suggests', target: 'equity-earnings', note: '财报类事件前瞻与复核' },
    { type: 'suggests', target: 'portfolio-weekly', note: '组合周报消费催化日历' },
  ],
  'portfolio-weekly': [
    { type: 'uses', target: 'catalyst-calendar', note: '事件与 prediction 到期结算' },
    { type: 'uses', target: 'equity-earnings', note: '财报周复核' },
    { type: 'uses', target: 'thesis-drift', note: '持仓论文漂移' },
    { type: 'uses', target: 'flex-memory', note: '预测校准' },
  ],
  'video-deep-reader': [
    { type: 'uses', target: 'finance-source-ingest', note: '统一证据卡与时间门' },
    { type: 'uses', target: 'financial-data-rigor', note: '视频金融数字需外部原始披露复核' },
  ],
}

// ---------------------------------------------------------------------------
// 迁移执行
// ---------------------------------------------------------------------------

/** 递归列出目录下所有文件（相对路径，POSIX 分隔符）。 */
function walk(dir, base = dir) {
  const out = []
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) out.push(...walk(full, base))
    else if (entry.isFile()) out.push(relative(base, full).split('\\').join('/'))
  }
  return out
}

function applyTransforms(rel, content) {
  const rules = TRANSFORMS[rel]
  if (!rules) return content
  for (const rule of rules) {
    if (typeof rule === 'function') {
      content = rule(content)
    } else if (Array.isArray(rule)) {
      const [find, replace] = rule
      if (!content.includes(find)) throw new Error(`${rel}: 找不到待修复原文: ${JSON.stringify(find.slice(0, 80))}`)
      content = content.replace(find, replace)
    } else {
      const { all: [find, replace] } = rule
      if (!content.includes(find)) throw new Error(`${rel}: 找不到待全局替换原文: ${JSON.stringify(find.slice(0, 80))}`)
      content = content.split(find).join(replace)
    }
  }
  return content
}

/** 极简 frontmatter 解析：足够识别 name/description（含 YAML 块标量）。 */
export function parseSkillFrontmatter(content) {
  const m = content.match(/^---\n([\s\S]*?)\n---\n/)
  if (!m) return undefined
  const data = {}
  const lines = m[1].split('\n')
  for (let i = 0; i < lines.length; i++) {
    const kv = lines[i].match(/^([A-Za-z0-9_-]+):\s*(.*)$/)
    if (!kv) continue
    const [, key, value] = kv
    if (value === '|' || value === '|-' || value === '>' || value === '>-') {
      const block = []
      while (i + 1 < lines.length && /^\s+\S/.test(lines[i + 1])) block.push(lines[++i].trim())
      data[key] = block.join('\n')
    } else if (value !== '') {
      data[key] = value.replace(/^["']|["']$/g, '')
    }
  }
  return { data, body: content.slice(m[0].length) }
}

/** 扫描目标文件集合，产出可注册技能清单（任何带合法 frontmatter 的 .md）。 */
export function collectSkills(files, readFile) {
  const skills = []
  for (const rel of files) {
    if (!rel.endsWith('.md')) continue
    const parsed = parseSkillFrontmatter(readFile(rel))
    if (!parsed || typeof parsed.data.name !== 'string' || typeof parsed.data.description !== 'string') continue
    const dir = rel.includes('/') ? rel.slice(0, rel.lastIndexOf('/')) : ''
    const kind = dir.startsWith('huashu-nuwa/examples/')
      ? 'example'
      : rel.endsWith('/SKILL.md')
        ? 'core'
        : 'nested'
    const resources = files
      .filter(f => dir !== '' && f.startsWith(dir + '/') && f !== rel)
      .map(f => f.slice(dir.length + 1))
      .sort()
    skills.push({
      name: parsed.data.name,
      path: rel,
      kind,
      description: parsed.data.description.replace(/\s+/g, ' ').trim(),
      ...(resources.length > 0 ? { resources } : {}),
      externalDependencies: EXTERNAL_DEPS[parsed.data.name] ?? [],
      ...(RELATIONS[parsed.data.name] ? { relations: RELATIONS[parsed.data.name] } : {}),
    })
  }
  skills.sort((a, b) => a.path.localeCompare(b.path))
  return skills
}

function buildCatalog() {
  const files = [...planned.keys()]
  const readFile = (rel) => planned.get(rel).toString('utf8')
  const skills = collectSkills(files, readFile)
  const usedByPhilosophy = Object.entries(RELATIONS)
    .filter(([, rels]) => rels.some(r => r.target === 'shared:_investment-philosophy.md'))
    .map(([name]) => name)
    .sort()
  return {
    $schema: 'https://json.schemastore.org/catalog.json',
    version: 1,
    generatedBy: 'scripts/migrate-skills.mjs（重新运行即可再生成，请勿手改）',
    note: '供 Host 做可选优化（如批量注册嵌套技能、预热外部依赖检测）；Host 不依赖本文件也能工作 —— 顶层技能由 DSH 的标准技能发现机制直接注册。',
    skillsRoot: 'skills',
    skills,
    sharedReferences: [
      {
        path: '_investment-philosophy.md',
        kind: 'shared-reference',
        note: '无 frontmatter，不作为技能注册；各 skill 经相对路径显式 Read。',
        usedBy: usedByPhilosophy,
        sections: {
          '§1': '三种 Alpha 来源（含衰减特征）',
          '§2': '信号检测',
          '§3': '信任锚分级',
          '§4': '历史预测偏差（复盘回填）',
          '§7': '报告质量哲学',
        },
      },
    ],
  }
}

// ---------------------------------------------------------------------------
// 主流程：计算全部目标内容（内存中），然后统一写盘或校验
// ---------------------------------------------------------------------------

if (!existsSync(SRC)) throw new Error(`源目录不存在: ${SRC}`)

const sourceRels = walk(SRC)
const sourceRelSet = new Set(sourceRels)
if (existsSync(OVERRIDES)) {
  for (const rel of walk(OVERRIDES)) {
    if (!sourceRelSet.has(rel)) throw new Error(`override 没有对应的上游文件: ${rel}`)
  }
}

/** @type {Map<string, Buffer>} relpath → 目标内容 */
const planned = new Map()
for (const rel of sourceRels) {
  const overridePath = join(OVERRIDES, rel)
  const hasOverride = existsSync(overridePath)
  const buf = readFileSync(hasOverride ? overridePath : join(SRC, rel))
  const text = decodeText(buf)
  if (text === undefined) {
    planned.set(rel, buf) // 二进制素材（图片等）原样复制
  } else {
    // 统一为 LF：上游混合 CRLF/LF，CRLF 会让 DSH 的 frontmatter 与脚本 shebang 解析变得脆弱
    const normalized = text.replace(/\r\n/g, '\n')
    const output = hasOverride ? normalized : applyTransforms(rel, normalized)
    planned.set(rel, Buffer.from(output, 'utf8'))
  }
}

const LICENSE_COPIES = {
  'thesis-drift/LICENSE': 'licenses/ai-berkshire-MIT.txt',
  'financial-data-rigor/LICENSE': 'licenses/ai-berkshire-MIT.txt',
  'valuation-model/LICENSE': 'licenses/prism-financial-services-plugins-Apache-2.0.txt',
  'equity-earnings/LICENSE': 'licenses/prism-financial-services-plugins-Apache-2.0.txt',
  'catalyst-calendar/LICENSE': 'licenses/prism-financial-services-plugins-Apache-2.0.txt',
  'THIRD_PARTY_NOTICES.md': 'THIRD_PARTY_NOTICES.md',
}
for (const [rel, source] of Object.entries(LICENSE_COPIES)) {
  const sourcePath = join(ROOT, source)
  if (!existsSync(sourcePath)) throw new Error(`随包许可/声明不存在: ${source}`)
  planned.set(rel, readFileSync(sourcePath))
}

/** 能按 UTF-8 无损解码且不含 NUL 即视为文本，否则按二进制处理。 */
function decodeText(buf) {
  if (buf.includes(0)) return undefined
  const text = new TextDecoder('utf-8', { fatal: true })
  try {
    return text.decode(buf)
  } catch {
    return undefined
  }
}

const catalog = buildCatalog()
planned.set('catalog.json', Buffer.from(JSON.stringify(catalog, null, 2) + '\n', 'utf8'))

const changed = []
for (const [rel, buf] of planned) {
  const destPath = join(DEST, rel)
  const existing = existsSync(destPath) ? readFileSync(destPath) : undefined
  if (existing !== undefined && existing.equals(buf)) continue
  changed.push(rel)
  if (!CHECK_ONLY) {
    mkdirSync(dirname(destPath), { recursive: true })
    writeFileSync(destPath, buf)
  }
}

// 目标目录里不允许存在计划外的残留文件
const stale = existsSync(DEST) ? walk(DEST).filter(rel => !planned.has(rel)) : []
if (!CHECK_ONLY) {
  for (const rel of stale) rmSync(join(DEST, rel))
}

if (CHECK_ONLY) {
  if (changed.length > 0 || stale.length > 0) {
    console.error('skills/ 与迁移结果不一致：')
    for (const rel of changed) console.error(`  内容不同: ${rel}`)
    for (const rel of stale) console.error(`  多余文件: ${rel}`)
    process.exit(1)
  }
  console.log(`OK: skills/ 与迁移结果一致（${planned.size} 个文件，含 catalog.json）`)
} else {
  console.log(`迁移完成：${planned.size} 个文件（新增/更新 ${changed.length}，清理 ${stale.length}）`)
  console.log(`注册技能：${catalog.skills.length}（core ${catalog.skills.filter(s => s.kind === 'core').length} / example ${catalog.skills.filter(s => s.kind === 'example').length} / nested ${catalog.skills.filter(s => s.kind === 'nested').length}）`)
}
