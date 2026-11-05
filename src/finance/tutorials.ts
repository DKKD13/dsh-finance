/**
 * Teaching manifest for the finance workspace: pure data plus lookups, with no
 * imports, DOM or Node APIs, so the Host command and the browser bundle share
 * one source of truth. Every lesson step names a section that really exists in
 * the workspace, and every prompt is display-only — nothing here is executed.
 * @module deepseek-harness-finance-plugin/finance/tutorials
 */

/** Sections rendered by the finance workspace, in navigation order. */
export const TUTORIAL_SECTIONS = [
  'overview',
  'inbox',
  'library',
  'hypotheses',
  'reports',
  'market',
  'portfolio',
  'valuations',
  'predictions',
  'briefing',
] as const

export type TutorialSection = typeof TUTORIAL_SECTIONS[number]

/** English section names used by the Host guide; the client localizes its own UI. */
export const TUTORIAL_SECTION_LABELS: Readonly<Record<TutorialSection, string>> = {
  overview: 'Workflow',
  inbox: 'Inbox',
  library: 'Library',
  hypotheses: 'Hypotheses',
  reports: 'Reports',
  market: 'Market',
  portfolio: 'Portfolio',
  valuations: 'Valuations',
  predictions: 'Predictions',
  briefing: 'Briefing',
}

/** One step: where to go, what to do, and an optional prompt to copy manually. */
export interface TutorialStep {
  readonly title: string
  readonly detail: string
  readonly section: TutorialSection
  /** Name of the control the user operates, when the step has a single one. */
  readonly action?: string
  /** Prompt text shown for copying; the guide and the Host never send it. */
  readonly prompt?: string
}

/** One end-to-end teaching path through the real workspace. */
export interface TutorialLesson {
  readonly id: string
  readonly title: string
  readonly summary: string
  readonly duration: string
  readonly goal: string
  readonly prerequisites: readonly string[]
  readonly steps: readonly TutorialStep[]
  /** Headline prompt of the lesson, shown for copying; never executed. */
  readonly prompt?: string
  readonly expected: string
  readonly asOf: string
  readonly runId: string
  readonly limits: readonly string[]
  /** True when the lesson expects the demo clip block at the end of the guide. */
  readonly demoClip?: boolean
}

/**
 * Public excerpt of Apple's FY2025 Q4 results release, reproduced from the
 * workspace verification fixture `.verification/kth-ui-chain/evidence/ui-clip-input.json`.
 * The excerpt is verbatim; it is not the full release, and the capture time is
 * later than the publication date on purpose (capture is not availability).
 */
export interface TutorialDemoClip {
  readonly schema: 'dsh.clipper/v1'
  readonly type: 'selection'
  readonly title: string
  readonly url: string
  readonly capturedAt: string
  readonly availableAt: string
  readonly asOf: string
  readonly topic: string
  readonly tags: readonly string[]
  readonly content: { readonly text: string }
  readonly annotations: readonly {
    readonly exact: string
    readonly prefix: string
    readonly suffix: string
    readonly note: string
    readonly tags: readonly string[]
  }[]
  readonly provenance: {
    readonly extension: string
    readonly capturedAt: string
    readonly availableAtBasis: string
    readonly sourceUrl: string
    readonly notice: string
  }
}

/** Provenance of the demo material: publisher, date basis and public fixture. */
export const TUTORIAL_DEMO_SOURCE = {
  publisher: 'Apple Newsroom',
  url: 'https://www.apple.com/newsroom/2025/10/apple-reports-fourth-quarter-results/',
  publicationDate: '2025-10-30',
  availableAt: '2025-10-30T00:00:00.000Z',
  fixture: '.verification/kth-ui-chain/evidence/ui-clip-input.json',
  excerptOnly: true,
  notice: 'Two-paragraph verbatim excerpt of a public Apple press release, reproduced from the workspace verification fixture. Not the full release and not investment advice.',
} as const

const COMPILE_PROMPT = '/knowledge-compiler\nrunId=<compile:UUID> sourceIds=<source:…> asOf=<ISO>'
const QUESTION_RESEARCH_PROMPT = '/research\nrunId=<research:UUID> mode=Question question="<one answerable question>" asOf=<ISO>'
const TICKER_RESEARCH_PROMPT = '/research\nrunId=<research:UUID> mode=Ticker ticker=AAPL asOf=<ISO>'
const DEEP_RESEARCH_PROMPT = '/deep-research\nrunId=<research:UUID> baseReportId=<deliverable:…> question="<core disagreement>" asOf=<ISO>'
const THINKING_PROMPT = '/hypothesis-thinking\nrunId=<review:UUID> hypothesisId=<claim:…> asOf=<ISO>'
const DRIFT_PROMPT = '/thesis-drift\nrunId=<review:UUID> hypothesisId=<claim:…> asOf=<ISO>'
const WEEKLY_PROMPT = '/portfolio-weekly\nrunId=<weekly:UUID> asOf=<weekEnd ISO>'
const SOURCE_FETCH_PROMPT = '/finance source-fetch {"source":"rss","url":"<public feed URL>","dryRun":true,"asOf":"<explicit asOf ISO>"}'
const CLIP_IMPORT_PROMPT = '/finance clip-import {"bundle":{"schema":"dsh.clipper/v1","type":"selection","url":"<https-URL>","availableAt":"<published-or-available ISO>","content":{"text":"<verbatim excerpt>"}},"asOf":"<explicit asOf ISO>","dryRun":true}'

const COMMON_PREREQUISITE = 'A DSH Session running this plugin, with the finance workspace reachable from the sidebar.'
const COMMON_LIMITS: readonly string[] = [
  'Prompts are shown for copying; this guide never sends them and never invokes a model.',
  'The guide reads only the bundled manifest: no graph write, no network request, no LLM call.',
  'Research only: no brokerage connection, no orders, no trades, no investment advice.',
]

/** Every lesson, in recommended order. */
export const TUTORIAL_LESSONS: readonly TutorialLesson[] = [
  {
    id: 'first-chain',
    title: 'From a public clip to a cited report',
    summary: 'Import one public clip, compile it into bull and bear views, then start research in a native conversation.',
    duration: '≈15 min',
    goal: 'Produce one cited research report from real public material without inventing a single number.',
    prerequisites: [
      COMMON_PREREQUISITE,
      'The imported Apple demo source, with its exact source URL and a known availableAt no later than the 2025-10-31 cutoff.',
    ],
    steps: [
      {
        title: 'Preview the demo clip',
        detail: 'Open Add a source → Paste clip, paste the demo clip JSON printed below, set asOf to 2025-10-31T00:00:00.000Z and preview the import. Preview writes nothing.',
        section: 'inbox',
        action: 'Preview import',
      },
      {
        title: 'Confirm and import',
        detail: 'Check received 1 / accepted 1, no quarantine, and the planned source, raw and clip records. Press Confirm and import to save this preview in one revision.',
        section: 'inbox',
        action: 'Confirm and import',
      },
      {
        title: 'Verify the evidence',
        detail: 'Select the imported Apple demo source in Library and read the excerpt, annotation, source URL and availableAt 2025-10-30. The URL must match this demo and availableAt must be known and no later than the lesson cutoff; other or future sources do not qualify.',
        section: 'library',
        action: 'Select the source',
      },
      {
        title: 'Compile knowledge in Library',
        detail: 'In Library, open Compile for the same demo source, keep the same asOf and submit. The /knowledge-compiler prompt (shape shown) uses a fresh runId and produces questions, falsifiable claims and a compile session.',
        section: 'library',
        action: 'Compile',
        prompt: COMPILE_PROMPT,
      },
      {
        title: 'Read before you conclude',
        detail: 'Open each question and claim in Bull & bear views: confidence, supports/contradicts evidence, reliability and recorded gaps. A claim is a hypothesis to test, not a result.',
        section: 'hypotheses',
        action: 'Select a hypothesis',
      },
      {
        title: 'Start research in a native conversation',
        detail: 'Open Finance assistant, enter one answerable question and the same source and asOf, then continue in the native conversation. You review and send the request yourself. Read saved results in Research history.',
        section: 'reports',
        action: 'Open Finance assistant',
        prompt: QUESTION_RESEARCH_PROMPT,
      },
      {
        title: 'Read the cited deliverable',
        detail: 'In Research history, open the new report: outline, citations, provenance and version chain. Every number must trace back to the imported Apple release; record the gaps instead of filling them.',
        section: 'reports',
        action: 'Open the report',
      },
    ],
    prompt: COMPILE_PROMPT,
    expected: 'A public clip becomes source/raw evidence, then question and claim nodes, then one deliverable whose citations point back to that source; the graph only moves when you commit the import, compile, or run research.',
    asOf: '2025-10-31T00:00:00.000Z — one day after the 2025-10-30 publication; use this same cutoff for ingest, compile and research.',
    runId: 'compile:<uuid> from Library Compile, then research:<uuid> from native conversation research; paste each one verbatim and never reuse a runId across runs.',
    limits: [
      ...COMMON_LIMITS,
      'The demo clip is a two-paragraph excerpt, not the full Apple release; do not treat it as the whole filing.',
    ],
    demoClip: true,
  },
  {
    id: 'ticker-deep-research',
    title: 'Ticker research, valuation and a deep dive',
    summary: 'Fix one ticker and cutoff, attach primary evidence, model it, then run an explicit deep-research pass.',
    duration: '≈40 min',
    goal: 'Answer whether value, expectations and risk are asymmetric at one price and evidence cutoff, and show the work.',
    prerequisites: [
      COMMON_PREREQUISITE,
      'A public ticker and a cutoff where every fetched field satisfies availableAt ≤ asOf.',
    ],
    steps: [
      {
        title: 'Fix the ticker and cutoff',
        detail: 'Search the symbol, then fetch Quote and History. Yahoo fetches are read-only dry runs; a provider that is not configured leaves a visible gap instead of a number.',
        section: 'market',
        action: 'Request quote + history',
      },
      {
        title: 'Import and compile the evidence',
        detail: 'Import the filing, transcript or prepared remarks through Inbox — URL, clip or PDF/DOCX — then select the source here, keep the same asOf and press Compile. Only ready sources inside the cutoff are candidates.',
        section: 'library',
        action: 'Compile',
        prompt: COMPILE_PROMPT,
      },
      {
        title: 'Run the deterministic models',
        detail: 'Fill the DCF template with explicit units, shares, WACC, terminal growth and tax, then submit; add comps with named peers. Quote valuation numbers only from finance_model output.',
        section: 'valuations',
        action: 'Run DCF / comps',
      },
      {
        title: 'Create the falsifiable claim',
        detail: 'From the selected source in Library press New hypothesis from evidence: kind claim, thesis with mechanism, kill criteria, confidence and evidence direction. Keep the strongest counter-evidence attached.',
        section: 'library',
        action: 'New hypothesis from evidence',
      },
      {
        title: 'Read the claim against its evidence',
        detail: 'Open the claim in Hypotheses: confidence, supports/contradicts edges, reliability and the recorded gaps. A claim is a hypothesis to test, never a conclusion to publish.',
        section: 'hypotheses',
        action: 'Open claim',
      },
      {
        title: 'Research explicitly, then deep-dive',
        detail: 'Choose mode Ticker and submit; once the base report exists, choose mode Deep with its id to look for a verifiable edge or to record an honest Pass.',
        section: 'reports',
        action: 'Ticker → Deep',
        prompt: DEEP_RESEARCH_PROMPT,
      },
      {
        title: 'Freeze one testable prediction',
        detail: 'Record direction, value, probability and a resolution date, then settle it only after that date with the observed outcome; the resolved record keeps the original prediction.',
        section: 'predictions',
        action: 'Record prediction',
      },
    ],
    prompt: TICKER_RESEARCH_PROMPT,
    expected: 'A ticker deliverable that cites evidence and model output, plus a deep-research outcome that either names a falsifiable edge or states Pass.',
    asOf: 'One ISO cutoff for every fetch, compile and research run, e.g. 2025-10-31T00:00:00.000Z; fetchedAt is not availableAt.',
    runId: 'research:<uuid> for the ticker run and a second research:<uuid> for the deep run, which also needs baseReportId=<deliverable:…>.',
    limits: [
      ...COMMON_LIMITS,
      '“No verifiable edge” is a valid outcome; the guide never promises alpha or a price target.',
    ],
  },
  {
    id: 'hypothesis-review-drift',
    title: 'Review a claim without rewriting history',
    summary: 'Read the evidence, choose a thinking or drift review, then settle only what is due.',
    duration: '≈20 min',
    goal: 'Separate a real evidence change from a wording change while keeping the original claim and predictions auditable.',
    prerequisites: [
      COMMON_PREREQUISITE,
      'A claim with at least one supports or contradicts edge, and a review cutoff at or after that evidence.',
    ],
    steps: [
      {
        title: 'Pick a live claim',
        detail: 'Open a claim that already has evidence edges. Read confidence, reliability and the recorded gaps before deciding that anything has changed.',
        section: 'hypotheses',
        action: 'Select a claim',
      },
      {
        title: 'Choose the review mode',
        detail: 'Fill the review cutoff, then choose Thinking Review to stress-test the reasoning or Drift Review to compare two dated snapshots. Both stay disabled without a cutoff.',
        section: 'hypotheses',
        action: 'Thinking / Drift',
        prompt: THINKING_PROMPT,
      },
      {
        title: 'Read the review deliverable',
        detail: 'The review is written as a new deliverable and session; the claim and the earlier report are not edited in place, so old and new can be compared side by side.',
        section: 'reports',
        action: 'Open review',
        prompt: DRIFT_PROMPT,
      },
      {
        title: 'Compare, do not conflate',
        detail: 'Use the version chain, citations and dates to see whether evidence actually changed. A rephrasing or a price move alone is not thesis drift.',
        section: 'reports',
        action: 'Version chain',
      },
      {
        title: 'Settle only what is due',
        detail: 'Load due predictions at the review cutoff. Resolve with the observed outcome and leave unresolved ones pending with a warning; never rewrite past confidence.',
        section: 'predictions',
        action: 'Load due → Resolve prediction',
      },
    ],
    prompt: DRIFT_PROMPT,
    expected: 'One review deliverable that states what changed, what did not, and which predictions were settled — with the original claim still intact.',
    asOf: 'The review cutoff must be at or after the evidence it judges, e.g. 2025-10-31T00:00:00.000Z; Drift Review also needs an older snapshot.',
    runId: 'review:<uuid> from the review click, plus hypothesisId=<claim:…> copied from the node you opened.',
    limits: [
      ...COMMON_LIMITS,
      'A review never edits the original claim, confidence or prediction; an earlier cutoff cannot see later evidence.',
    ],
  },
  {
    id: 'portfolio-weekly',
    title: 'One weekly portfolio pass',
    summary: 'Snapshot holdings you share, refresh public data, settle due predictions, then record and calibrate the week.',
    duration: '≈25 min',
    goal: 'Explain what changed for the portfolio this week, what is missing, and what to verify next week.',
    prerequisites: [
      COMMON_PREREQUISITE,
      'Non-sensitive holdings you choose to type in; this never reads a brokerage account.',
      'weekStartAsOf and weekEndAsOf fixed before reading any new evidence.',
    ],
    steps: [
      {
        title: 'Snapshot the holdings you share',
        detail: 'Submit the portfolio JSON with quantities or weights you are willing to record. Missing quantities stay missing; the Host does not invent market value or cost.',
        section: 'portfolio',
        action: 'Run portfolio snapshot',
      },
      {
        title: 'Refresh the public observations',
        detail: 'Fetch the quotes you rely on at the week cutoff. Fetch is a dry run; an unavailable provider remains an explicit gap rather than a stale number.',
        section: 'market',
        action: 'Request quote + history',
      },
      {
        title: 'Settle the week',
        detail: 'Load due predictions at weekEndAsOf, resolve what the evidence actually supports, and leave the rest pending with a warning instead of forcing an outcome.',
        section: 'predictions',
        action: 'Load due → Resolve prediction',
      },
      {
        title: 'Prepare the cutoff',
        detail: 'Prepare briefing at weekEndAsOf. The card text is deterministic graph content; Prepare does not invoke a model or rewrite history.',
        section: 'briefing',
        action: 'Prepare briefing',
      },
      {
        title: 'Record the weekly deliverable',
        detail: 'Fill id, title and metadata, press Use prepared content, then Record briefing. The deliverable references the prepared cards and is a research record, not advice.',
        section: 'briefing',
        action: 'Record briefing',
      },
      {
        title: 'Check calibration',
        detail: 'Evaluate briefing scores resolved predictions only and flags pending ones. Past confidence values are never rewritten by calibration.',
        section: 'predictions',
        action: 'Evaluate briefing',
      },
      {
        title: 'Read next week from last week',
        detail: 'Next week start from this deliverable as oldAsOf so later facts cannot be backfilled into an earlier week.',
        section: 'reports',
        action: 'Open report',
      },
    ],
    prompt: WEEKLY_PROMPT,
    expected: 'One weekly deliverable with an explicit cutoff, exposure view, settled predictions and calibration, reusable as next week’s baseline.',
    asOf: 'weekEndAsOf for every step in the pass, e.g. 2025-10-31T00:00:00.000Z; keep the prior week’s deliverable as oldAsOf.',
    runId: 'weekly:<uuid> for the pass; every node written in it must carry that runId.',
    limits: [
      ...COMMON_LIMITS,
      'Holdings are limited to what you type; no account connection, no rebalancing and no automatic recommendations.',
    ],
  },
  {
    id: 'web-clipper',
    title: 'Capture a page or a file as evidence',
    summary: 'Preview a feed, clip bundle or local file, commit one revision, then confirm the time gate.',
    duration: '≈10 min',
    goal: 'Turn a real public page or file into one auditable source with an honest availableAt.',
    prerequisites: [
      COMMON_PREREQUISITE,
      'The material’s publication date, or an explicit statement that it is unknown.',
      'Optional: the MV3 extension needs clipperHttp.enabled, a token file and an exact allowed Origin; pasting into Inbox needs neither.',
    ],
    steps: [
      {
        title: 'Preview a public URL or feed',
        detail: 'Paste an RSS/Atom feed or YouTube link and press Preview import: source.fetch runs with dryRun and writes nothing. A single article page belongs in Clip or File instead.',
        section: 'inbox',
        action: 'Preview import',
        prompt: SOURCE_FETCH_PROMPT,
      },
      {
        title: 'Preview a clip or a file',
        detail: 'Clip accepts dsh.clipper/v1 JSON; File accepts MD, TXT, HTML, CSV, OPML, PDF and DOCX. Both preview first and reject unsupported types before writing. Use the page’s own availableAt; omit it if unknown so the Host quarantines instead of guessing.',
        section: 'inbox',
        action: 'Preview import',
      },
      {
        title: 'Commit one atomic revision',
        detail: 'Read received/accepted/duplicates/quarantined/rejected and the planned nodes, then Confirm atomic import. One click commits one revision or nothing at all.',
        section: 'inbox',
        action: 'Confirm atomic import',
      },
      {
        title: 'Confirm the temporal gate',
        detail: 'Select the source in Library and check provider, availableAt, asOf and contentHash. Material published after your cutoff stays quarantined and cannot be compiled.',
        section: 'library',
        action: 'Select the source',
      },
      {
        title: 'Watch the ledger move',
        detail: 'Collect turns complete on the new source and the next stage becomes Compile; a reload shows the same state because it is derived from the graph.',
        section: 'overview',
        action: 'Open workflow',
      },
    ],
    prompt: CLIP_IMPORT_PROMPT,
    expected: 'One source with raw text, annotations, provider and content hash — committed as exactly one revision or visibly quarantined.',
    asOf: 'Choose and type the cutoff yourself, e.g. 2025-10-31T00:00:00.000Z for the demo; the guide never fills asOf from the current clock. Anything you import must satisfy availableAt ≤ your cutoff.',
    runId: 'Imports generate run-<hash> unless you supply one; copy the exact id from the preview instead of inventing it.',
    limits: [
      ...COMMON_LIMITS,
      'Capture time is not availability: capturedAt never substitutes for availableAt, and unknown publication dates are not guessed. Use the page’s own availableAt or omit it and let the Host quarantine; fill asOf explicitly.',
    ],
  },
]

/** Short names people actually type; resolved before failing on an unknown id. */
export const TUTORIAL_ALIASES: Readonly<Record<string, string>> = {
  'file-ingest': 'web-clipper',
  clipper: 'web-clipper',
  ticker: 'ticker-deep-research',
  drift: 'hypothesis-review-drift',
  portfolio: 'portfolio-weekly',
  'first-report': 'first-chain',
}

/** Canonical lesson ids, in recommended order. */
export function tutorialLessonIds(): string[] {
  return TUTORIAL_LESSONS.map(lesson => lesson.id)
}

/** Resolve an id or alias (case-insensitive) to its lesson. */
export function findTutorialLesson(id: string): TutorialLesson | undefined {
  const needle = id.trim().toLowerCase()
  if (needle.length === 0) return undefined
  const canonical = TUTORIAL_ALIASES[needle] ?? needle
  return TUTORIAL_LESSONS.find(lesson => lesson.id === canonical)
}

/** The public Apple excerpt used by the guided first chain. */
export const TUTORIAL_DEMO_CLIP: TutorialDemoClip = {
  schema: 'dsh.clipper/v1',
  type: 'selection',
  title: 'Apple FY2025 Q4 results — revenue and Services evidence',
  url: 'https://www.apple.com/newsroom/2025/10/apple-reports-fourth-quarter-results/',
  capturedAt: '2026-10-31T12:33:09.000Z',
  availableAt: '2025-10-30T00:00:00.000Z',
  asOf: '2025-10-31T00:00:00.000Z',
  topic: 'KTH UI continuous knowledge production',
  tags: ['public-research', 'apple', 'fy2025-q4'],
  content: {
    text: 'Apple today announced financial results for its fiscal 2025 fourth quarter ended September 27, 2025. The Company posted quarterly revenue of $102.5 billion, up 8 percent year over year. Diluted earnings per share was $1.85, up 13 percent year over year on an adjusted basis.\n\n“Today, Apple is very proud to report a September quarter revenue record of $102.5 billion, including a September quarter revenue record for iPhone and an all-time revenue record for Services,” said Tim Cook, Apple’s CEO. “In September, we were thrilled to launch our best iPhone lineup ever, including iPhone 17, iPhone 17 Pro and Pro Max, and iPhone Air. In addition, we launched the fantastic AirPods Pro 3 and the all-new Apple Watch lineup. When combined with the recently announced MacBook Pro and iPad Pro with the powerhouse M5 chip, we are excited to be sharing our most extraordinary lineup of products as we head into the holiday season.”',
  },
  annotations: [
    {
      exact: 'quarterly revenue of $102.5 billion, up 8 percent year over year',
      prefix: 'The Company posted ',
      suffix: '. Diluted earnings',
      note: 'Observed result only; this single press release does not establish forward Services durability or independence from hardware cyclicality.',
      tags: ['observed-result'],
    },
  ],
  provenance: {
    extension: 'kth-ui-chain-public-research',
    capturedAt: '2026-10-31T12:33:09.000Z',
    availableAtBasis: 'publication date shown on the public Apple Newsroom page; normalized to 00:00:00Z',
    sourceUrl: 'https://www.apple.com/newsroom/2025/10/apple-reports-fourth-quarter-results/',
    notice: TUTORIAL_DEMO_SOURCE.notice,
  },
}
