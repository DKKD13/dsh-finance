import type { GraphEdge, GraphNode, JsonValue, NodeKind } from '../src/graph.ts'

export type LibraryKind = 'source' | 'raw' | 'session'
export type LibraryGroup = 'materials' | 'insights' | 'history'

/** Stable UI grouping. Every admitted graph kind belongs to exactly one group. */
export const LIBRARY_GROUP_KINDS = {
  materials: ['source', 'raw', 'reference'],
  insights: ['claim', 'question', 'belief', 'signal', 'catalyst', 'prediction'],
  history: ['session', 'deliverable', 'memory', 'skill', 'persona', 'script', 'instrument', 'portfolio', 'position', 'valuation'],
} as const satisfies Record<LibraryGroup, readonly NodeKind[]>

export const LIBRARY_GROUPS: readonly LibraryGroup[] = ['materials', 'insights', 'history']

export interface LibraryEntry {
  /** The node shown as the list row. */
  readonly primary: GraphNode
  /** Every persisted node represented by this row; never merged or rewritten. */
  readonly members: readonly GraphNode[]
  /** Explicit importer/skill package metadata; used only for default visibility. */
  readonly technical: boolean
}

export interface LibraryEntryFilters {
  readonly query: string
  readonly provider: string
  readonly status: string
  readonly includeTechnical?: boolean
}

export interface LibrarySelectionRoute {
  readonly group: LibraryGroup
  readonly primary: GraphNode
  readonly selected: GraphNode
  readonly members: readonly GraphNode[]
  readonly technical: boolean
}

export interface LibraryRelation {
  readonly edge: GraphEdge
  readonly peerId: string
  readonly peer?: GraphNode
  readonly direction: 'from' | 'to'
}

export interface LibraryAnnotation {
  readonly exact?: string
  readonly prefix?: string
  readonly suffix?: string
  readonly note?: string
  readonly tags: readonly string[]
  readonly locator?: JsonValue
  readonly annotationHash?: string
}

export interface LibraryFilters {
  readonly kind: LibraryKind
  readonly query: string
  readonly provider: string
  readonly status: string
}

function record(value: unknown): Record<string, unknown> | undefined {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? value as Record<string, unknown>
    : undefined
}

function strings(value: unknown): readonly string[] {
  return Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === 'string') : []
}

function metadataRecord(node: GraphNode, key: string): Record<string, unknown> | undefined {
  return record(record(node.metadata)?.[key])
}

export function libraryProvider(node: GraphNode): string {
  const metadata = record(node.metadata)
  return typeof metadata?.provider === 'string' ? metadata.provider : '—'
}

export function libraryStatus(node: GraphNode): string {
  const metadata = record(node.metadata)
  if (typeof metadata?.status === 'string') return metadata.status
  if (typeof metadata?.ingestStatus === 'string') return metadata.ingestStatus
  if (metadata?.quarantined === true) return 'quarantined'
  const ingestion = metadataRecord(node, 'ingestion')
  if (typeof ingestion?.status === 'string') return ingestion.status
  return 'available'
}

export function libraryTime(node: GraphNode): string {
  const metadata = record(node.metadata)
  for (const key of ['availableAt', 'asOf', 'fetchedAt']) {
    const value = metadata?.[key]
    if (typeof value === 'string' && value.length > 0) return value
  }
  const updatedAt = typeof node.updatedAt === 'number' && Number.isFinite(node.updatedAt) ? node.updatedAt : 0
  return new Date(updatedAt).toISOString()
}

/** Open only explicit public source locations, never a URL inferred from prose. */
export function libraryOriginalUrl(nodes: readonly GraphNode[]): string | undefined {
  for (const node of nodes) {
    const metadata = record(node.metadata)
    for (const container of [metadata, record(metadata?.provenance)]) {
      for (const key of ['canonicalUrl', 'sourceUrl', 'url']) {
        const value = container?.[key]
        if (typeof value !== 'string') continue
        try {
          const url = new URL(value)
          if (['https:', 'http:'].includes(url.protocol) && !url.username && !url.password) return url.href
        } catch { /* A stored file identifier is not a browser link. */ }
      }
    }
  }
  return undefined
}

export function libraryTitle(node: GraphNode, nodes: readonly GraphNode[]): string {
  if (node.title !== node.id) return node.title
  const related = relatedLibraryNodes(node, nodes)
  return related.capture?.title ?? node.title
}

export function libraryAiSummary(nodes: readonly GraphNode[]): { text: string; stale: boolean; model?: string; generatedAt?: string } | undefined {
  for (const node of nodes) {
    const summary = record(record(node.metadata)?.aiSummary)
    if (typeof summary?.text !== 'string' || !summary.text.trim()) continue
    return {
      text: summary.text,
      stale: typeof summary.sourceContentHash !== 'string' || summary.sourceContentHash !== record(node.metadata)?.contentHash,
      ...(typeof summary.model === 'string' ? { model: summary.model } : {}),
      ...(typeof summary.generatedAt === 'string' ? { generatedAt: summary.generatedAt } : {}),
    }
  }
  return undefined
}

export function libraryTopic(node: GraphNode): string | undefined {
  for (const container of [record(node.metadata), metadataRecord(node, 'clip'), metadataRecord(node, 'clipper'), metadataRecord(node, 'provenance')]) {
    if (typeof container?.topic === 'string' && container.topic.length > 0) return container.topic
  }
  return undefined
}

export function libraryTags(node: GraphNode): readonly string[] {
  const metadata = record(node.metadata)
  const direct = strings(metadata?.tags)
  const clip = record(metadata?.clip) ?? record(metadata?.clipper)
  return [...new Set([...direct, ...strings(clip?.tags)])]
}

function annotationsFrom(value: unknown): LibraryAnnotation[] {
  if (!Array.isArray(value)) return []
  return value.flatMap(entry => {
    const annotation = record(entry)
    if (annotation === undefined) return []
    const selector = record(annotation.selector)
    const textQuote = record(annotation.textQuote)
    const exact = annotation.exact ?? selector?.exact ?? textQuote?.exact
    const prefix = annotation.prefix ?? selector?.prefix ?? textQuote?.prefix
    const suffix = annotation.suffix ?? selector?.suffix ?? textQuote?.suffix
    return [{
      ...(typeof exact === 'string' ? { exact } : {}),
      ...(typeof prefix === 'string' ? { prefix } : {}),
      ...(typeof suffix === 'string' ? { suffix } : {}),
      ...(typeof annotation.note === 'string' ? { note: annotation.note } : {}),
      tags: strings(annotation.tags),
      ...(annotation.locator === undefined ? {} : { locator: annotation.locator as JsonValue }),
      ...(typeof annotation.annotationHash === 'string' ? { annotationHash: annotation.annotationHash } : {}),
    }]
  })
}

export function libraryAnnotations(nodes: readonly GraphNode[]): readonly LibraryAnnotation[] {
  const annotations = nodes.flatMap(node => {
    const metadata = record(node.metadata)
    return [
      ...annotationsFrom(metadata?.annotations),
      ...annotationsFrom(record(metadata?.clip)?.annotations),
      ...annotationsFrom(record(metadata?.clipper)?.annotations),
    ]
  })
  return annotations.filter((annotation, index) => {
    const identity = annotation.annotationHash ?? JSON.stringify(annotation)
    return annotations.findIndex(candidate => (candidate.annotationHash ?? JSON.stringify(candidate)) === identity) === index
  })
}

export function libraryErrors(node: GraphNode): readonly unknown[] {
  const metadata = record(node.metadata)
  const ingestion = metadataRecord(node, 'ingestion')
  return Array.isArray(ingestion?.errors) ? ingestion.errors : Array.isArray(metadata?.errors) ? metadata.errors : []
}

export function filterLibraryNodes(nodes: readonly GraphNode[], filters: LibraryFilters): GraphNode[] {
  const query = filters.query.trim().toLowerCase()
  const captures = new Map(nodes.filter(node => node.kind === 'reference').map(node => [node.id, node]))
  return nodes.filter(node => {
    if (node.kind !== filters.kind) return false
    if (filters.provider !== '' && libraryProvider(node) !== filters.provider) return false
    if (filters.status !== '' && libraryStatus(node) !== filters.status) return false
    if (query.length === 0) return true
    const captureId = record(node.metadata)?.captureId
    const capture = typeof captureId === 'string' ? captures.get(captureId) : undefined
    const evidence = capture === undefined ? [node] : [node, capture]
    const annotations = libraryAnnotations(evidence)
    const haystack = [
      node.id, node.title, node.content, libraryProvider(node), libraryTime(node), libraryStatus(node),
      capture === undefined ? libraryTopic(node) ?? '' : libraryTopic(capture) ?? '',
      ...evidence.flatMap(libraryTags), ...annotations.flatMap(annotation => [annotation.exact ?? '', annotation.note ?? '', ...annotation.tags]),
    ].join('\n').toLowerCase()
    return query.split(/\s+/u).every(token => haystack.includes(token))
  }).sort((left, right) => {
    const leftTime = Date.parse(libraryTime(left))
    const rightTime = Date.parse(libraryTime(right))
    if (Number.isFinite(leftTime) && Number.isFinite(rightTime) && leftTime !== rightTime) return rightTime - leftTime
    return right.updatedAt - left.updatedAt || left.id.localeCompare(right.id)
  })
}

export function relatedLibraryNodes(active: GraphNode, nodes: readonly GraphNode[]): { source?: GraphNode; raw?: GraphNode; capture?: GraphNode; session?: GraphNode } {
  const byId = new Map(nodes.map(node => [node.id, node]))
  const activeMetadata = record(active.metadata)
  const sourceId = active.kind === 'source'
    ? active.id
    : typeof activeMetadata?.sourceId === 'string'
      ? activeMetadata.sourceId
      : undefined
  const source = sourceId === undefined ? undefined : byId.get(sourceId)
  const rawId = active.kind === 'raw'
    ? active.id
    : typeof activeMetadata?.rawId === 'string'
      ? activeMetadata.rawId
      : typeof record(activeMetadata?.provenance)?.rawId === 'string'
        ? record(activeMetadata?.provenance)?.rawId as string
        : undefined
  const rawCandidate = rawId !== undefined
    ? byId.get(rawId)
    : source === undefined
      ? undefined
      : nodes.find(node => node.kind === 'raw' && record(node.metadata)?.sourceId === source.id)
  const rawOwner = record(rawCandidate?.metadata)?.sourceId
  const raw = rawCandidate?.kind === 'raw' && !(source !== undefined && typeof rawOwner === 'string' && rawOwner !== source.id)
    ? rawCandidate
    : undefined
  const captureId = active.kind === 'reference'
    ? active.id
    : typeof activeMetadata?.captureId === 'string'
      ? activeMetadata.captureId
      : typeof record(source?.metadata)?.captureId === 'string'
        ? record(source?.metadata)?.captureId as string
        : typeof record(raw?.metadata)?.captureId === 'string'
          ? record(raw?.metadata)?.captureId as string
          : undefined
  const captureCandidate = captureId === undefined ? undefined : byId.get(captureId)
  const captureOwner = record(captureCandidate?.metadata)?.sourceId
  const capture = captureCandidate?.kind === 'reference' && !(source !== undefined && typeof captureOwner === 'string' && captureOwner !== source.id)
    ? captureCandidate
    : undefined
  const references = [active, source, raw, capture].flatMap(node => node === undefined ? [] : strings(record(node.metadata)?.references))
  const sessionId = active.kind === 'session'
    ? active.id
    : typeof activeMetadata?.sessionId === 'string'
      ? activeMetadata.sessionId
      : typeof record(activeMetadata?.provenance)?.sessionId === 'string'
        ? record(activeMetadata?.provenance)?.sessionId as string
        : references.find(id => byId.get(id)?.kind === 'session')
  const session = sessionId === undefined ? undefined : byId.get(sessionId)
  return {
    ...(source === undefined ? {} : { source }),
    ...(raw === undefined ? {} : { raw }),
    ...(capture?.kind !== 'reference' ? {} : { capture }),
    ...(session?.kind !== 'session' ? {} : { session }),
  }
}

export function libraryGroupForKind(kind: NodeKind): LibraryGroup {
  if ((LIBRARY_GROUP_KINDS.materials as readonly NodeKind[]).includes(kind)) return 'materials'
  if ((LIBRARY_GROUP_KINDS.insights as readonly NodeKind[]).includes(kind)) return 'insights'
  return 'history'
}

/** Only explicit bundle-owner metadata classifies a record as technical. */
export function isLibraryTechnicalNode(node: GraphNode): boolean {
  const metadata = record(node.metadata)
  const imported = metadata?.managedBy === 'dsh-research-graph/import'
  const ownerSkill = metadata?.ownerSkill
  const path = metadata?.path
  const owner = typeof ownerSkill === 'string' && ownerSkill.trim().length > 0
  const ownedPath = imported && typeof path === 'string' && path.trim().length > 0
  return imported || owner || ownedPath
}

function materialMembers(primary: GraphNode, nodes: readonly GraphNode[]): readonly GraphNode[] {
  const byId = new Map(nodes.map(node => [node.id, node]))
  const primaryMetadata = record(primary.metadata)
  const linkedSource = primary.kind === 'source'
    ? primary
    : typeof primaryMetadata?.sourceId === 'string'
      ? byId.get(primaryMetadata.sourceId)
      : undefined
  const source = linkedSource?.kind === 'source' ? linkedSource : undefined
  const sourceMetadata = source === undefined ? undefined : record(source.metadata)
  const rawId = sourceMetadata?.rawId ?? record(sourceMetadata?.provenance)?.rawId
  const explicitRaw = typeof rawId === 'string' ? byId.get(rawId) : undefined
  const pairedRaws = source === undefined ? [] : nodes.filter(node => node.kind === 'raw'
    && (record(node.metadata)?.sourceId === source.id
      || (node === explicitRaw && record(node.metadata)?.sourceId === undefined)))
  const seeds = [primary, source, ...pairedRaws].filter((node): node is GraphNode => node !== undefined)
  const captureIds = new Set(seeds.flatMap(node => {
    const id = record(node.metadata)?.captureId
    return typeof id === 'string' ? [id] : []
  }))
  const captures = nodes.filter(node => node.kind === 'reference'
    && ((source !== undefined && record(node.metadata)?.sourceId === source.id)
      || (captureIds.has(node.id) && (record(node.metadata)?.sourceId === undefined || record(node.metadata)?.sourceId === source?.id))))
  // A citation is a relation, not proof that two records are the same material.
  return [...new Map([...seeds, ...captures].map(node => [node.id, node])).values()]
}

function entryTime(entry: LibraryEntry): number {
  const values = entry.members.map(node => Date.parse(libraryTime(node))).filter(Number.isFinite)
  return values.length === 0 ? entry.primary.updatedAt : Math.max(...values)
}

export function libraryGroupEntries(nodes: readonly GraphNode[], group: LibraryGroup, includeTechnical = false): LibraryEntry[] {
  const inGroup = nodes.filter(node => libraryGroupForKind(node.kind) === group && (includeTechnical || !isLibraryTechnicalNode(node)))
  if (group !== 'materials') return inGroup.map(primary => ({ primary, members: [primary], technical: isLibraryTechnicalNode(primary) })).sort((left, right) => entryTime(right) - entryTime(left) || left.primary.id.localeCompare(right.primary.id))

  const sourceEntries = inGroup.filter(node => node.kind === 'source').map(primary => ({ primary, members: materialMembers(primary, inGroup), technical: isLibraryTechnicalNode(primary) }))
  const sources = new Set(sourceEntries.map(entry => entry.primary.id))
  const attached = new Set(sourceEntries.flatMap(entry => entry.members.filter(node => node.id !== entry.primary.id).map(node => node.id)))
  for (const node of inGroup) {
    if (node.kind === 'source') continue
    const sourceId = record(node.metadata)?.sourceId
    if (typeof sourceId === 'string' && sources.has(sourceId)) attached.add(node.id)
  }
  const entries = [
    ...sourceEntries,
    ...inGroup.filter(node => node.kind !== 'source' && !attached.has(node.id)).map(primary => ({ primary, members: materialMembers(primary, inGroup), technical: isLibraryTechnicalNode(primary) })),
  ]
  return entries.sort((left, right) => entryTime(right) - entryTime(left) || left.primary.id.localeCompare(right.primary.id))
}

function entryMatches(entry: LibraryEntry, filters: LibraryEntryFilters): boolean {
  const query = filters.query.trim().toLowerCase()
  if (filters.provider !== '' && !entry.members.some(node => libraryProvider(node) === filters.provider)) return false
  if (filters.status !== '' && !entry.members.some(node => libraryStatus(node) === filters.status)) return false
  if (query.length === 0) return true
  const haystack = entry.members.flatMap(node => {
    const metadata = record(node.metadata)
    return [
      node.id, node.title, typeof node.content === 'string' ? node.content : '', libraryProvider(node), libraryTime(node), libraryStatus(node), libraryTopic(node) ?? '',
      ...libraryTags(node), JSON.stringify(metadata ?? {}),
      ...libraryAnnotations([node]).flatMap(annotation => [annotation.exact ?? '', annotation.note ?? '', ...annotation.tags]),
    ]
  }).join('\n').toLowerCase()
  return query.split(/\s+/u).every(token => haystack.includes(token))
}

export function filterLibraryEntries(entries: readonly LibraryEntry[], filters: LibraryEntryFilters): LibraryEntry[] {
  return entries.filter(entry => (filters.includeTechnical === true || !entry.technical) && entryMatches(entry, filters))
}

export function libraryGroupMatchCounts(nodes: readonly GraphNode[], query: string, includeTechnical = false): Record<LibraryGroup, number> {
  return Object.fromEntries(LIBRARY_GROUPS.map(group => [
    group,
    filterLibraryEntries(libraryGroupEntries(nodes, group, includeTechnical), { query, provider: '', status: '', includeTechnical }).length,
  ])) as Record<LibraryGroup, number>
}

export function libraryEntryForSelection(nodes: readonly GraphNode[], id: string): LibrarySelectionRoute | undefined {
  const selected = nodes.find(node => node.id === id)
  if (selected === undefined) return undefined
  const group = libraryGroupForKind(selected.kind)
  const entries = libraryGroupEntries(nodes, group, true)
  const entry = entries.find(candidate => candidate.primary.id === id)
    ?? entries.find(candidate => candidate.members.some(node => node.id === id))
  return entry === undefined
    ? { group, primary: selected, selected, members: [selected], technical: isLibraryTechnicalNode(selected) }
    : { group, primary: entry.primary, selected, members: entry.members, technical: entry.technical }
}

export function libraryRelations(active: GraphNode | undefined, nodes: readonly GraphNode[], edges: readonly GraphEdge[]): readonly LibraryRelation[] {
  if (active === undefined) return []
  const byId = new Map(nodes.map(node => [node.id, node]))
  const relations: LibraryRelation[] = []
  for (const edge of edges) {
    if (edge.from === active.id) {
      const peer = byId.get(edge.to)
      relations.push({ edge, peerId: edge.to, direction: 'from', ...(peer === undefined ? {} : { peer }) })
    } else if (edge.to === active.id) {
      const peer = byId.get(edge.from)
      relations.push({ edge, peerId: edge.from, direction: 'to', ...(peer === undefined ? {} : { peer }) })
    }
  }
  return relations.sort((left, right) => left.edge.kind.localeCompare(right.edge.kind) || left.peerId.localeCompare(right.peerId) || left.edge.id.localeCompare(right.edge.id))
}
