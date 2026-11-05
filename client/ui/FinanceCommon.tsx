import { useSyncExternalStore } from 'react'
import type { FormEvent, ReactNode } from 'react'
import type { GraphNode, JsonValue, NodeKind, EdgeKind } from '../../src/graph.ts'
import type { JsonObject } from '../../src/finance/types.ts'
import type { FinanceOperationState, FinanceSection, FinanceState, FinanceStore } from '../finance-store.ts'
import { parseFinanceObject } from '../finance-store.ts'
import type { Translate } from '../store.ts'

export const FINANCE_NODE_KINDS = ['instrument', 'portfolio', 'position', 'valuation', 'catalyst', 'prediction'] as const
export const FINANCE_EDGE_KINDS = ['holds', 'exposure_to', 'values', 'catalyzes', 'resolves'] as const

export interface FinancePanelProps {
  readonly store: FinanceStore
  readonly t: Translate
  readonly nodes: readonly GraphNode[]
}

export function useFinance(store: FinanceStore): FinanceState {
  return useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot)
}

export function isFinanceNodeKind(kind: NodeKind): boolean {
  return (FINANCE_NODE_KINDS as readonly string[]).includes(kind)
}

export function isFinanceEdgeKind(kind: EdgeKind): boolean {
  return (FINANCE_EDGE_KINDS as readonly string[]).includes(kind)
}

export function FinanceKindIcon({ kind, size = 14 }: { readonly kind: NodeKind; readonly size?: number }) {
  if (!isFinanceNodeKind(kind)) return null
  return (
    <svg className="rg-finance-kind-icon" width={size} height={size} viewBox="0 0 16 16" aria-hidden>
      <g fill="none" stroke="currentColor" strokeWidth={1.35} strokeLinecap="round" strokeLinejoin="round">
        {kind === 'instrument' && <><path d="M2.5 12.5 6 8.8l2.4 2 5-6" /><path d="M10.5 4.8h2.9v2.9" /></>}
        {kind === 'portfolio' && <><rect x="2.3" y="4.8" width="11.4" height="8" rx="1.3" /><path d="M5.5 4.8V3.4c0-.6.4-1 1-1h3c.6 0 1 .4 1 1v1.4M2.5 8.2h11" /></>}
        {kind === 'position' && <><ellipse cx="8" cy="4.3" rx="5" ry="2" /><path d="M3 4.3v3.6c0 1.1 2.2 2 5 2s5-.9 5-2V4.3M3 8v3.4c0 1.1 2.2 2 5 2s5-.9 5-2V8" /></>}
        {kind === 'valuation' && <><path d="M2.5 3h5.2l5.8 5.8-4.7 4.7-5.8-5.8z" /><circle cx="5.3" cy="5.7" r=".8" /><path d="m7.2 9.7 2.1-2.1M7.5 7.4h.1M9.5 9.6h.1" /></>}
        {kind === 'catalyst' && <><circle cx="8" cy="8" r="5.4" /><path d="M8 4.5V8l2.4 1.5M12.9 2.7l1.1-1" /></>}
        {kind === 'prediction' && <><circle cx="7.3" cy="7.3" r="4.8" /><circle cx="7.3" cy="7.3" r="2.2" /><path d="m10.5 10.5 3 3M11.8 3.3l1.5-1.5.6 1.6 1.6.6-1.5 1.5" /></>}
      </g>
    </svg>
  )
}

export function FinanceEdgeIcon({ kind, size = 13 }: { readonly kind: EdgeKind; readonly size?: number }) {
  if (!isFinanceEdgeKind(kind)) return null
  return (
    <svg className="rg-finance-edge-icon" width={size} height={size} viewBox="0 0 16 16" aria-hidden>
      <g fill="none" stroke="currentColor" strokeWidth={1.35} strokeLinecap="round" strokeLinejoin="round">
        {kind === 'holds' && <><path d="M3 5.5h10v7H3zM5.5 5.5v-2h5v2" /></>}
        {kind === 'exposure_to' && <><path d="M3 12.5 12.5 3M6 3h6.5v6.5" /></>}
        {kind === 'values' && <><path d="M3 4h7l3 3-5 5-5-5z" /><circle cx="5.5" cy="6.5" r=".6" /></>}
        {kind === 'catalyzes' && <><path d="M8 2.5v3M8 10.5v3M2.5 8h3M10.5 8h3M4.1 4.1l2.1 2.1M9.8 9.8l2.1 2.1M11.9 4.1 9.8 6.2M6.2 9.8l-2.1 2.1" /></>}
        {kind === 'resolves' && <><circle cx="8" cy="8" r="5.5" /><path d="m5.2 8.2 1.8 1.8 3.9-4" /></>}
      </g>
    </svg>
  )
}

export function OperationStatus({ operation, t, idle }: {
  readonly operation: FinanceOperationState
  readonly t: Translate
  readonly idle: string
}) {
  return (
    <div className="rg-finance-operation" data-status={operation.status} role={operation.status === 'error' ? 'alert' : 'status'}>
      {operation.status === 'idle' && <span>{idle}</span>}
      {operation.status === 'loading' && <><span className="rg-finance-inline-skeleton" /><span>{t('finance.state.loading')}</span></>}
      {operation.status === 'success' && <span>{t('finance.state.success')}</span>}
      {operation.status === 'error' && operation.error !== null && <span>{operation.error.code}: {operation.error.message}</span>}
    </div>
  )
}

export function Field({ label, hint, children }: { readonly label: string; readonly hint?: string; readonly children: ReactNode }) {
  return (
    <label className="rg-finance-field">
      <span className="rg-finance-field-label">{label}</span>
      {children}
      {hint !== undefined && <span className="rg-finance-field-hint">{hint}</span>}
    </label>
  )
}

export function JsonObjectForm({ template, submitLabel, busy, t, onSubmit }: {
  readonly template: JsonObject
  readonly submitLabel: string
  readonly busy: boolean
  readonly t: Translate
  readonly onSubmit: (input: JsonObject) => Promise<boolean>
}) {
  const [text, setText] = useStateLocal(JSON.stringify(template, null, 2))
  const [error, setError] = useStateLocal<string | null>(null)
  const submit = (event: FormEvent) => {
    event.preventDefault()
    try {
      const input = parseFinanceObject(text)
      setError(null)
      void onSubmit(input)
    } catch (cause: unknown) {
      setError(`${t('finance.json.invalid')}: ${cause instanceof Error ? cause.message : String(cause)}`)
    }
  }
  return (
    <form className="rg-finance-form" onSubmit={submit}>
      <Field label={t('finance.json.input')} hint={t('finance.json.hint')}>
        <textarea className="rg-finance-json" value={text} onChange={event => { setText(event.target.value) }} spellCheck={false} rows={18} aria-invalid={error !== null} />
      </Field>
      {error !== null && <p className="rg-finance-form-error" role="alert">{error}</p>}
      <div className="rg-finance-form-actions"><button type="submit" className="rg-btn" data-primary disabled={busy}>{submitLabel}</button></div>
    </form>
  )
}

// Isolated aliases keep form components SSR-compatible without a DOM dependency.
import { useState as useStateLocal } from 'react'

export function asRecord(value: unknown): Record<string, unknown> | undefined {
  return typeof value === 'object' && value !== null && !Array.isArray(value) ? value as Record<string, unknown> : undefined
}

export function operationResult(value: JsonValue | null): unknown {
  const record = asRecord(value)
  return record !== undefined && record.result !== undefined ? record.result : value
}

export function nodeResult(node: GraphNode): unknown {
  return node.metadata.result ?? node.content
}

const PROVENANCE_FIELDS = ['provider', 'asOf', 'availableAt', 'fetchedAt', 'contentHash', 'runId'] as const

export function ProvenanceList({ value, t }: { readonly value: unknown; readonly t: Translate }) {
  const records: Record<string, unknown>[] = []
  const visited = new Set<object>()
  const signatures = new Set<string>()
  const collect = (entry: unknown, depth: number): void => {
    if (depth > 10 || entry === null || typeof entry !== 'object') return
    if (visited.has(entry)) return
    visited.add(entry)
    if (Array.isArray(entry)) {
      for (const item of entry) collect(item, depth + 1)
      return
    }
    const record = entry as Record<string, unknown>
    if (record.provenance !== undefined || ['asOf', 'availableAt', 'fetchedAt', 'contentHash', 'runId'].some(key => record[key] !== undefined)) {
      const signature = JSON.stringify([...PROVENANCE_FIELDS.map(field => record[field]), record.canonicalUrl, record.provenance])
      if (!signatures.has(signature)) {
        signatures.add(signature)
        records.push(record)
      }
    }
    for (const nested of Object.values(record)) collect(nested, depth + 1)
  }
  collect(value, 0)
  if (records.length === 0) return <p className="rg-finance-provenance-empty">{t('finance.provenance.empty')}</p>
  return (
    <div className="rg-finance-provenance-list">
      {records.map((record, index) => <section className="rg-finance-provenance" key={index}>
        <span className="rg-finance-section-label">{records.length === 1 ? t('finance.provenance.title') : t('finance.provenance.source', { index: index + 1, total: records.length })}</span>
        {(typeof record.title === 'string' || typeof record.canonicalUrl === 'string') && <p className="rg-finance-provenance-name">{displayValue(record.title)}{typeof record.canonicalUrl === 'string' && <code>{record.canonicalUrl}</code>}</p>}
        <dl>
          {PROVENANCE_FIELDS.filter(field => typeof record[field] === 'string').map(field => (
            <div key={field}><dt>{t(`finance.provenance.${field}`)}</dt><dd>{String(record[field])}</dd></div>
          ))}
        </dl>
        {record.provenance !== undefined && <RawJson value={record.provenance} t={t} label={t('finance.provenance.details')} />}
      </section>)}
    </div>
  )
}

export function Provenance({ value, t }: { readonly value: unknown; readonly t: Translate }) {
  return <ProvenanceList value={value} t={t} />
}

export function LazyDetails({ id, className, summary, defaultOpen = false, children }: {
  readonly id?: string
  readonly className?: string | undefined
  readonly summary: ReactNode
  readonly defaultOpen?: boolean
  readonly children: () => ReactNode
}) {
  const [open, setOpen] = useStateLocal(defaultOpen)
  const [mounted, setMounted] = useStateLocal(defaultOpen)
  return (
    <details id={id} className={className} open={open} onToggle={event => {
      const next = event.currentTarget.open
      setOpen(next)
      if (next) setMounted(true)
    }}>
      <summary>{summary}</summary>
      {mounted ? children() : null}
    </details>
  )
}

export function RawJson({ value, t, label }: { readonly value: unknown; readonly t: Translate; readonly label?: string }) {
  return <LazyDetails className="rg-finance-raw" summary={label ?? t('finance.rawJson')}>{() => <pre>{JSON.stringify(value, null, 2)}</pre>}</LazyDetails>
}

export function NodeProvenance({ node, t }: { readonly node: GraphNode; readonly t: Translate }) {
  const provider = typeof node.metadata.provider === 'string' ? node.metadata.provider : undefined
  const asOf = typeof node.metadata.asOf === 'string' ? node.metadata.asOf : undefined
  return <span className="rg-finance-node-provenance">{[provider, asOf].filter(Boolean).join(' · ') || t('finance.provenance.empty')}</span>
}

export function FinanceEmpty({ children }: { readonly children: ReactNode }) {
  return <div className="rg-finance-empty">{children}</div>
}

export function sectionForKind(kind: NodeKind): FinanceSection {
  if (kind === 'instrument') return 'market'
  if (kind === 'portfolio' || kind === 'position') return 'portfolio'
  if (kind === 'valuation') return 'valuations'
  return 'predictions'
}

export function formatNumber(value: unknown): string {
  return typeof value === 'number' && Number.isFinite(value)
    ? new Intl.NumberFormat(undefined, { maximumFractionDigits: 6 }).format(value)
    : String(value ?? '—')
}

/** Rates and fractions (WACC, terminal growth, tax rate, probability) read as percents. */
export function formatPercent(value: unknown): string {
  return typeof value === 'number' && Number.isFinite(value)
    ? new Intl.NumberFormat(undefined, { style: 'percent', maximumFractionDigits: 2 }).format(value)
    : String(value ?? '—')
}

/** Money-like amounts: two decimals for whole-and-larger magnitudes, more precision below 1. */
export function formatAmount(value: unknown): string {
  if (typeof value !== 'number' || !Number.isFinite(value)) return String(value ?? '—')
  const fractionDigits = Math.abs(value) >= 1 ? { minimumFractionDigits: 2, maximumFractionDigits: 2 } : { minimumFractionDigits: 0, maximumFractionDigits: 6 }
  return new Intl.NumberFormat(undefined, fractionDigits).format(value)
}

export function displayValue(value: unknown): string {
  if (typeof value === 'number') return formatNumber(value)
  if (typeof value === 'boolean') return value ? 'true' : 'false'
  if (typeof value === 'string') return value
  if (value === null || value === undefined) return '—'
  return JSON.stringify(value)
}
