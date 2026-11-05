import type { GraphEdge, GraphNode, NodeKind } from '../src/graph.ts'

export const HYPOTHESIS_KINDS = ['question', 'claim', 'belief', 'signal'] as const
export type HypothesisKind = typeof HYPOTHESIS_KINDS[number]
export type ResearchMode = 'ticker' | 'question' | 'deep'
export type ReviewMode = 'thinking' | 'drift'
export type ViewStance = 'bull' | 'bear'

/** Market direction is authored metadata; evidence support is a different relation. */
export function viewStance(node: GraphNode): ViewStance | undefined {
  return node.metadata.stance === 'bull' || node.metadata.stance === 'bear' ? node.metadata.stance : undefined
}

export type ResearchRequest =
  | { readonly kind: 'compile'; readonly sourceIds: readonly string[]; readonly asOf?: string }
  | { readonly kind: 'research'; readonly mode: 'ticker'; readonly ticker: string; readonly asOf?: string }
  | { readonly kind: 'research'; readonly mode: 'question'; readonly question: string; readonly asOf?: string }
  | { readonly kind: 'research'; readonly mode: 'deep'; readonly question: string; readonly baseReportId: string; readonly asOf?: string }
  | { readonly kind: 'review'; readonly mode: ReviewMode; readonly hypothesisId: string; readonly asOf: string }

export interface OutlineEntry {
  readonly level: number
  readonly text: string
}

export interface HypothesisEvidence {
  readonly direction: 'supports' | 'contradicts' | 'related'
  readonly edge: GraphEdge
  readonly node: GraphNode
}

export function knowledgeCompilerPrompt(runId: string, sourceIds: readonly string[], asOf?: string): string {
  const cutoff = asOf === undefined || asOf.trim().length === 0 ? '' : ` asOf=${asOf.trim()}`
  return `/knowledge-compiler\nrunId=${runId} sourceIds=${sourceIds.join(',')}${cutoff}`
}

export function researchPrompt(runId: string, request: Extract<ResearchRequest, { kind: 'research' }>): string {
  const asOf = request.asOf === undefined || request.asOf.trim().length === 0 ? '' : ` asOf=${request.asOf.trim()}`
  if (request.mode === 'ticker') return `/research\nrunId=${runId} mode=Ticker ticker=${request.ticker.trim()}${asOf}`
  if (request.mode === 'question') return `/research\nrunId=${runId} mode=Question question=${JSON.stringify(request.question.trim())}${asOf}`
  return `/deep-research\nrunId=${runId} baseReportId=${request.baseReportId.trim()} question=${JSON.stringify(request.question.trim())}${asOf}`
}

/** Skill package files and binary assets are explicitly marked by the importer. */
export function isResearchSource(node: GraphNode): boolean {
  return (node.kind === 'source' || node.kind === 'raw') && node.metadata.managedBy !== 'dsh-research-graph/import' && node.metadata.binary !== true
}

/** Explicit UI selections are references for the Skill to read, never evidence by themselves. */
export function researchContextPrompt(context: { readonly ticker?: string | undefined; readonly sourceIds?: readonly string[] | undefined }, nodes: readonly GraphNode[]): string {
  const ticker = context.ticker?.trim().toUpperCase()
  if (ticker && !/^[A-Z^][A-Z0-9.^=_-]{0,19}$/u.test(ticker)) throw new Error('Invalid research ticker')
  const sourceIds = [...new Set(context.sourceIds ?? [])]
  for (const id of sourceIds) {
    if (!nodes.some(node => node.id === id && isResearchSource(node))) throw new Error(`Selected source is unavailable: ${id}`)
  }
  if (!ticker && sourceIds.length === 0) return ''
  return [
    ticker ? `Company context: ticker=${JSON.stringify(ticker)}.` : '',
    sourceIds.length ? `Selected source node IDs: ${JSON.stringify(sourceIds)}. Read the full nodes with research_graph tools before using or citing them; retain their availability dates and report missing evidence.` : '',
    'UI quotes, forecasts and demo figures are not research evidence. Retrieve and verify original sources.',
  ].filter(Boolean).join('\n')
}

export function reviewPrompt(runId: string, request: Extract<ResearchRequest, { kind: 'review' }>): string {
  const skill = request.mode === 'thinking' ? 'hypothesis-thinking' : 'thesis-drift'
  return `/${skill}\nrunId=${runId} hypothesisId=${request.hypothesisId.trim()} asOf=${request.asOf.trim()}`
}

export function expectedArtifactKinds(request: ResearchRequest): readonly NodeKind[] {
  return request.kind === 'compile' ? HYPOTHESIS_KINDS : ['deliverable']
}

function containsRunId(value: unknown, runId: string, depth = 0): boolean {
  if (depth > 12) return false
  if (typeof value === 'string') return value === runId
  if (Array.isArray(value)) return value.some(entry => containsRunId(entry, runId, depth + 1))
  if (typeof value !== 'object' || value === null) return false
  return Object.entries(value).some(([key, entry]) => key === 'runId' && typeof entry === 'string'
    ? entry === runId
    : containsRunId(entry, runId, depth + 1))
}

export function expectedArtifactIds(nodes: readonly GraphNode[], runId: string, kinds: readonly NodeKind[]): string[] {
  const expected = new Set<string>(kinds)
  return nodes.filter(node => expected.has(node.kind) && containsRunId(node.metadata, runId)).map(node => node.id).sort()
}

export function reportOutline(markdown: string): OutlineEntry[] {
  const outline: OutlineEntry[] = []
  let fence: string | undefined
  for (const line of markdown.split(/\r?\n/u)) {
    const boundary = /^\s*(`{3,}|~{3,})/u.exec(line)
    if (boundary !== null) {
      const marker = boundary[1]?.[0]
      if (fence === undefined) fence = marker
      else if (fence === marker) fence = undefined
      continue
    }
    if (fence !== undefined) continue
    const heading = /^(#{1,6})\s+(.+?)\s*#*\s*$/u.exec(line)
    if (heading !== null) outline.push({ level: heading[1]?.length ?? 1, text: heading[2] ?? '' })
  }
  return outline
}

export function versionChain(active: GraphNode, nodes: readonly GraphNode[], edges: readonly GraphEdge[]): GraphNode[] {
  const byId = new Map(nodes.map(node => [node.id, node]))
  const ids = new Set<string>([active.id])
  let changed = true
  while (changed) {
    changed = false
    for (const edge of edges) {
      if (edge.kind !== 'supersedes') continue
      if (ids.has(edge.from) && !ids.has(edge.to)) { ids.add(edge.to); changed = true }
      if (ids.has(edge.to) && !ids.has(edge.from)) { ids.add(edge.from); changed = true }
    }
  }
  return [...ids].flatMap(id => {
    const node = byId.get(id)
    return node?.kind === active.kind && node !== undefined ? [node] : []
  }).sort((left, right) => left.createdAt - right.createdAt || left.id.localeCompare(right.id))
}

export function hypothesisEvidence(active: GraphNode, nodes: readonly GraphNode[], edges: readonly GraphEdge[]): HypothesisEvidence[] {
  const byId = new Map(nodes.map(node => [node.id, node]))
  const evidence: HypothesisEvidence[] = []
  for (const edge of edges) {
    if (edge.to === active.id && (edge.kind === 'supports' || edge.kind === 'contradicts')) {
      const node = byId.get(edge.from)
      if (node !== undefined) evidence.push({ direction: edge.kind, edge, node })
    } else if (edge.from === active.id && (edge.kind === 'based_on' || edge.kind === 'derived_from' || edge.kind === 'informed_by')) {
      const node = byId.get(edge.to)
      if (node !== undefined) evidence.push({ direction: 'related', edge, node })
    }
  }
  return evidence.sort((left, right) => left.edge.id.localeCompare(right.edge.id))
}

export function relatedResearchNodes(active: GraphNode, nodes: readonly GraphNode[], edges: readonly GraphEdge[]): { predictions: GraphNode[]; reports: GraphNode[] } {
  const byId = new Map(nodes.map(node => [node.id, node]))
  const related = new Set<string>()
  for (const edge of edges) {
    if (edge.from === active.id) related.add(edge.to)
    if (edge.to === active.id) related.add(edge.from)
  }
  const predictions: GraphNode[] = []
  const reports: GraphNode[] = []
  for (const id of related) {
    const node = byId.get(id)
    if (node?.kind === 'prediction') predictions.push(node)
    if (node?.kind === 'deliverable') reports.push(node)
  }
  return {
    predictions: predictions.sort((left, right) => left.id.localeCompare(right.id)),
    reports: reports.sort((left, right) => left.id.localeCompare(right.id)),
  }
}

export interface ReportCitation {
  readonly id: string
  readonly node?: GraphNode
}

export function reportCitations(active: GraphNode, nodes: readonly GraphNode[], edges: readonly GraphEdge[]): ReportCitation[] {
  const byId = new Map(nodes.map(node => [node.id, node]))
  const ids = new Set<string>()
  for (const edge of edges) {
    if (edge.from === active.id && (edge.kind === 'cite' || edge.kind === 'derived_from' || edge.kind === 'references' || edge.kind === 'based_on')) ids.add(edge.to)
  }
  const references = active.metadata.references
  if (Array.isArray(references)) for (const id of references) if (typeof id === 'string') ids.add(id)
  return [...ids].sort().map(id => {
    const node = byId.get(id)
    return node === undefined ? { id } : { id, node }
  })
}

function hasRunIdField(value: unknown, depth = 0): boolean {
  if (depth > 8 || typeof value !== 'object' || value === null) return false
  if (Array.isArray(value)) return value.some(entry => hasRunIdField(entry, depth + 1))
  return Object.entries(value).some(([key, entry]) => key === 'runId' ? typeof entry === 'string' && entry.length > 0 : hasRunIdField(entry, depth + 1))
}

export function historicalResearch(node: GraphNode): boolean {
  if (node.kind !== 'deliverable') return false
  if (typeof node.metadata.reviewOf === 'string') return false
  const runId = typeof node.metadata.runId === 'string' ? node.metadata.runId : ''
  const provider = typeof node.metadata.provider === 'string' ? node.metadata.provider.toLowerCase() : ''
  return !/^review(?:$|[:._-])/iu.test(runId) && !/(?:thesis-drift|hypothesis-thinking)/u.test(provider)
}

export function reportOrigin(node: GraphNode): 'briefing' | 'skill' | 'deliverable' {
  if (node.metadata.briefing === true) return 'briefing'
  if (hasRunIdField(node.metadata) || typeof node.metadata.skill === 'string' || typeof node.metadata.researchMode === 'string') return 'skill'
  return 'deliverable'
}


/** File contexts can exist even when a blank or archived session is omitted from conversation choices. */
export function visualArtifactSessionId(metadata: Record<string, unknown> | undefined, fallback?: string): string | undefined {
  const recorded = metadata?.sessionId
  return typeof recorded === 'string' && recorded.trim().length > 0 ? recorded : fallback
}

/**
 * A usable `metadata.visualArtifact` entry: an HTML path the installed host's
 * sidebar document preview can read. The host contract (`sessionFileAddress`)
 * accepts workspace-relative paths and absolute paths alike; absolute records
 * from earlier machines therefore stay openable when the file still exists,
 * and surface the host's own not-found state when it does not. URLs, parent
 * traversal, UNC shares and non-HTML values render no entry rather than a
 * broken one.
 */
export function visualArtifactPath(metadata: Record<string, unknown> | undefined): string | undefined {
  const value = metadata?.visualArtifact
  if (typeof value !== 'string') return undefined
  const raw = value.trim()
  if (raw.length === 0 || raw.length > 240 || !/\.html?$/iu.test(raw)) return undefined
  if (raw.includes('://') || raw.startsWith('\\\\')) return undefined
  if (/^[A-Za-z]:[\\/]/u.test(raw)) {
    // Windows drive path: hand the host the `/`-separated spelling it accepts.
    const path = raw.replace(/\\/g, '/')
    if (path.split('/').some(segment => segment === '..' || segment === '.' || segment === '')) return undefined
    return path
  }
  if (raw.startsWith('/')) {
    const segments = raw.split('/').slice(1)
    if (segments.some(segment => segment === '..' || segment === '.' || segment === '' || segment.includes('\\'))) return undefined
    return raw
  }
  if (raw.startsWith('\\')) return undefined
  if (raw.split('/').some(segment => segment === '..' || segment === '.' || segment.includes('\\'))) return undefined
  return raw
}

/**
 * Whether a report records a visual artifact whose path shape this bundle
 * cannot open (e.g. legacy absolute paths). Such records still exist and
 * must surface as "present but not locatable", never as "no artifact".
 */
export function hasVisualArtifact(metadata: Record<string, unknown> | undefined): boolean {
  const value = metadata?.visualArtifact
  if (typeof value !== 'string') return false
  return value.trim().length > 0 && visualArtifactPath(metadata) === undefined
}

export function displayAssessment(value: unknown): string {
  if (typeof value === 'string') return value
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return '—'
  const record = value as Record<string, unknown>
  const label = typeof record.level === 'string' ? record.level : typeof record.group === 'string' ? record.group : undefined
  const rationale = typeof record.rationale === 'string' ? record.rationale : undefined
  if (label !== undefined || rationale !== undefined) return [label, rationale].filter(entry => entry !== undefined).join(' — ')
  return JSON.stringify(value) ?? '—'
}

export function displayConfidence(value: unknown): string {
  if (typeof value === 'number' && Number.isFinite(value)) return value >= 0 && value <= 1 ? `${Math.round(value * 100)}%` : `${value}%`
  return displayAssessment(value)
}

export function killCriteria(node: GraphNode): string[] {
  const value = node.metadata.killCriteria
  if (typeof value === 'string') return value.trim().length === 0 ? [] : [value]
  if (Array.isArray(value)) return value.filter((entry): entry is string => typeof entry === 'string' && entry.trim().length > 0)
  return []
}
