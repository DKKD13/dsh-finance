import { useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { MarkdownText } from '@deepseek-ai/dsh-client-ui-primitives'
import type { JsonObject } from '../../src/finance/types.ts'
import { financeOperation } from '../finance-store.ts'
import type { Translate } from '../store.ts'
import { asRecord, displayValue, Field, FinanceEmpty, LazyDetails, NodeProvenance, OperationStatus, Provenance, RawJson, useFinance } from './FinanceCommon.tsx'
import type { FinancePanelProps } from './FinanceCommon.tsx'
import { AutoTable, PrimitiveSummary, ResultWarnings } from './FinanceData.tsx'
import { CalibrationPlot } from './FinanceCharts.tsx'
import { CatalystTimeline } from './FinancePanels.tsx'
import type { ConversationSeed } from './ConversationDialog.tsx'
import { protectReportCurrency } from '../report-markdown.ts'

interface MemoryPanelProps extends FinancePanelProps {
  readonly onResearch?: ((question: string, skillName?: string, context?: Pick<ConversationSeed, 'asOf'>) => void) | undefined
}

interface MetadataDraft {
  readonly provider: string
  readonly asOf: string
  readonly availableAt: string
  readonly fetchedAt: string
  readonly url: string
}

const EMPTY_METADATA: MetadataDraft = { provider: '', asOf: '', availableAt: '', fetchedAt: '', url: '' }

function MetadataFields({ value, onChange, t }: { readonly value: MetadataDraft; readonly onChange: (value: MetadataDraft) => void; readonly t: Translate }) {
  return (
    <fieldset className="rg-finance-metadata-fields">
      <legend>{t('finance.metadata.title')}</legend>
      <div className="rg-finance-fields-inline rg-finance-fields-four">
        <Field label={t('finance.provenance.provider')}><input required value={value.provider} onChange={event => { onChange({ ...value, provider: event.target.value }) }} /></Field>
        <Field label={t('finance.provenance.asOf')}><input required value={value.asOf} onChange={event => { onChange({ ...value, asOf: event.target.value }) }} placeholder="2026-10-30T00:00:00Z" /></Field>
        <Field label={t('finance.provenance.availableAt')}><input required value={value.availableAt} onChange={event => { onChange({ ...value, availableAt: event.target.value }) }} placeholder="2026-10-30T00:00:00Z" /></Field>
        <Field label={t('finance.provenance.fetchedAt')}><input required value={value.fetchedAt} onChange={event => { onChange({ ...value, fetchedAt: event.target.value }) }} placeholder="2026-10-30T00:00:00Z" /></Field>
      </div>
      <Field label={t('finance.metadata.sourceUrl')} hint={t('finance.metadata.sourceUrlHint')}><input type="url" value={value.url} onChange={event => { onChange({ ...value, url: event.target.value }) }} placeholder="https://…" /></Field>
    </fieldset>
  )
}

function metadataInput(draft: MetadataDraft): JsonObject {
  return {
    provider: draft.provider,
    asOf: draft.asOf,
    availableAt: draft.availableAt,
    fetchedAt: draft.fetchedAt,
    provenance: draft.url.trim().length === 0 ? {} : { url: draft.url.trim() },
  }
}

function optionalNumber(value: string): number | undefined {
  return value.trim().length === 0 ? undefined : Number(value)
}

/** A finished calibration evaluation: summary numbers, visible Host warnings, the plot, details. */
export function CalibrationResult({ value, t }: { readonly value: unknown; readonly t: Translate }) {
  return <div className="rg-finance-result"><PrimitiveSummary value={value} /><ResultWarnings value={value} /><CalibrationPlot value={value} t={t} /><AutoTable value={value} t={t} /><RawJson value={value} t={t} /></div>
}

export function PredictionSummary({ value, t }: { readonly value: unknown; readonly t: Translate }) {
  const record = asRecord(value)
  const metadata = asRecord(record?.metadata)
  const prediction = asRecord(metadata?.prediction)
  const probability = prediction?.probability
  const resolutionDate = metadata?.resolutionDate
  const target = prediction?.expectedValue ?? prediction?.predictedValue
  return <div className="rg-prediction-summary">
    {prediction === undefined && typeof record?.content === 'string' && <p>{record.content}</p>}
    {typeof prediction?.metric === 'string' && <p>{prediction.metric}</p>}
    <dl className="rg-finance-summary">
      {typeof prediction?.direction === 'string' && <div><dt>{t('finance.predictions.direction')}</dt><dd>{prediction.direction}</dd></div>}
      {(typeof target === 'string' || (typeof target === 'number' && Number.isFinite(target))) && <div><dt>{t('finance.predictions.target')}</dt><dd>{typeof prediction?.operator === 'string' ? `${prediction.operator} ` : ''}{target}</dd></div>}
      {typeof probability === 'number' && Number.isFinite(probability) && probability >= 0 && probability <= 1 && <div><dt>{t('finance.valuation.columns.probability')}</dt><dd>{new Intl.NumberFormat(undefined, { style: 'percent', maximumFractionDigits: 1 }).format(probability)}</dd></div>}
      {typeof resolutionDate === 'string' && <div><dt>{t('finance.predictions.resolutionDate')}</dt><dd><time dateTime={resolutionDate}>{resolutionDate.replace('T', ' ').replace(/Z$/u, ' UTC')}</time></dd></div>}
    </dl>
    <RawJson value={value} t={t} label={t('finance.predictions.ruleDetails')} />
  </div>
}

export function PredictionsPanel({ store, t, nodes, onResearch }: MemoryPanelProps) {
  const state = useFinance(store)
  const recordOperation = financeOperation(state, 'recordPrediction')
  const dueOperation = financeOperation(state, 'due')
  const resolveOperation = financeOperation(state, 'resolve')
  const evaluateOperation = financeOperation(state, 'briefingEvaluate')
  const [tab, setTab] = useState<'catalysts' | 'predictions' | 'calibration'>('predictions')
  const [dueAsOf, setDueAsOf] = useState('')
  const [calibrationAsOf, setCalibrationAsOf] = useState('')
  const [id, setId] = useState('')
  const [title, setTitle] = useState('')
  const [instrumentId, setInstrumentId] = useState('')
  const [resolutionDate, setResolutionDate] = useState('')
  const [direction, setDirection] = useState('')
  const [predictedValue, setPredictedValue] = useState('')
  const [probability, setProbability] = useState('')
  const [predictionMetadata, setPredictionMetadata] = useState<MetadataDraft>(EMPTY_METADATA)
  const [resolveId, setResolveId] = useState('')
  const [resolveStatus, setResolveStatus] = useState<'resolved' | 'error'>('resolved')
  const [resolvedAt, setResolvedAt] = useState('')
  const [actualDirection, setActualDirection] = useState('')
  const [actualValue, setActualValue] = useState('')
  const [actual, setActual] = useState('')
  const [resolveMetadata, setResolveMetadata] = useState<MetadataDraft>(EMPTY_METADATA)
  const manualControls = useRef<HTMLDetailsElement>(null)
  const resolveInput = useRef<HTMLInputElement>(null)
  const dueQuery = useRef<{ asOf: string; operation: typeof dueOperation } | undefined>(undefined)
  const dueResult = asRecord(dueOperation.result)
  const duePredictions = Array.isArray(dueResult?.predictions) ? dueResult.predictions : []
  const predictions = nodes.filter(node => node.kind === 'prediction')
  const tabs = ['catalysts', 'predictions', 'calibration'] as const

  const record = (event: FormEvent) => {
    event.preventDefault()
    const predictedNumber = optionalNumber(predictedValue)
    const probabilityNumber = optionalNumber(probability)
    void store.recordPrediction({
      id, title, resolutionDate,
      ...(instrumentId.trim().length === 0 ? {} : { instrumentId: instrumentId.trim() }),
      prediction: {
        ...(direction.trim().length === 0 ? {} : { direction: direction.trim(), predictedDirection: direction.trim() }),
        ...(predictedNumber === undefined ? {} : { predictedValue: predictedNumber }),
        ...(probabilityNumber === undefined ? {} : { probability: probabilityNumber }),
      },
      metadata: metadataInput(predictionMetadata),
    })
  }

  const loadDue = (event: FormEvent) => {
    event.preventDefault()
    const request = store.loadDue(dueAsOf)
    dueQuery.current = { asOf: dueAsOf, operation: financeOperation(store.getSnapshot(), 'due') }
    void request
  }

  const resolve = async (event: FormEvent) => {
    event.preventDefault()
    const actualNumber = optionalNumber(actualValue)
    const success = await store.resolvePrediction({
      id: resolveId,
      status: resolveStatus,
      resolvedAt,
      outcome: {
        ...(actualDirection.trim().length === 0 ? {} : { actualDirection: actualDirection.trim() }),
        ...(actualNumber === undefined ? {} : { actualValue: actualNumber }),
        ...(actual === '' ? {} : { actual: actual === 'true' }),
      },
      metadata: metadataInput(resolveMetadata),
    })
    if (!success) return
    const latestDue = financeOperation(store.getSnapshot(), 'due')
    const asOf = latestDue.status === 'loading'
      ? dueQuery.current !== undefined && latestDue === dueQuery.current.operation ? dueQuery.current.asOf : undefined
      : asRecord(latestDue.result)?.asOf
    if ((latestDue.status === 'success' || latestDue.status === 'loading') && typeof asOf === 'string') {
      await store.loadDue(asOf)
    }
  }

  return (
    <section className="rg-finance-section" aria-labelledby="rg-finance-predictions-title">
      <div className="rg-finance-section-head"><div><h2 id="rg-finance-predictions-title">{t('finance.predictions.title')}</h2><p>{t('finance.predictions.description')}</p></div>{onResearch && <button type="button" className="rg-btn" data-primary onClick={() => { onResearch(t('finance.predictions.conversationPrompt'), 'flex-memory', dueAsOf.trim() ? { asOf: dueAsOf.trim() } : {}) }}>{t('finance.predictions.conversationAction')}</button>}</div>
      <div className="rg-tabs rg-finance-subtabs" role="tablist" aria-label={t('finance.predictions.title')}>{tabs.map((value, index) => <button
        key={value}
        id={`rg-predictions-tab-${value}`}
        type="button"
        role="tab"
        className="rg-tab"
        data-active={tab === value || undefined}
        aria-selected={tab === value}
        aria-controls="rg-predictions-tabpanel"
        tabIndex={tab === value ? 0 : -1}
        onClick={() => { setTab(value) }}
        onKeyDown={event => {
          const next = event.key === 'ArrowLeft' ? (index + tabs.length - 1) % tabs.length : event.key === 'ArrowRight' ? (index + 1) % tabs.length : event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : -1
          if (next < 0) return
          event.preventDefault()
          const value = tabs[next]
          if (value === undefined) return
          event.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>('[role="tab"]').item(next).focus()
          setTab(value)
        }}
      >{t(`finance.predictions.tab.${value}`)}</button>)}</div>
      <div id="rg-predictions-tabpanel" role="tabpanel" aria-labelledby={`rg-predictions-tab-${tab}`}>
        {tab === 'catalysts' && <section className="rg-finance-block"><h3>{t('finance.predictions.catalysts')}</h3><CatalystTimeline nodes={nodes} t={t} /></section>}
        {tab === 'calibration' && <section className="rg-finance-block"><h3>{t('finance.calibration.title')}</h3><p className="rg-finance-block-description">{t('finance.calibration.panelHint')}</p>
          <form className="rg-finance-form" onSubmit={(event: FormEvent) => { event.preventDefault(); void store.evaluateBriefing(calibrationAsOf) }}>
            <Field label={t('finance.provenance.asOf')}><input required value={calibrationAsOf} onChange={event => { setCalibrationAsOf(event.target.value) }} placeholder="2026-10-30T00:00:00Z" /></Field>
            <div className="rg-finance-form-actions"><button className="rg-btn" data-primary type="submit" disabled={evaluateOperation.status === 'loading'}>{t('finance.briefing.evaluateAction')}</button></div>
          </form>
          <OperationStatus operation={evaluateOperation} t={t} idle={t('finance.calibration.idle')} />
          {evaluateOperation.status === 'success' && <CalibrationResult value={evaluateOperation.result} t={t} />}
        </section>}
        {tab === 'predictions' && <>
          <div className="rg-finance-two-column">
            <section className="rg-finance-block"><h3>{t('finance.predictions.dueTitle')}</h3>
              <form className="rg-finance-form" onSubmit={loadDue}><Field label={t('finance.provenance.asOf')}><input required value={dueAsOf} onChange={event => { setDueAsOf(event.target.value) }} placeholder="2026-10-30T00:00:00Z" /></Field><div className="rg-finance-form-actions"><button className="rg-btn" data-primary type="submit" disabled={dueOperation.status === 'loading'}>{t('finance.predictions.dueAction')}</button></div></form>
              <OperationStatus operation={dueOperation} t={t} idle={t('finance.predictions.dueIdle')} />
              {dueOperation.status === 'success' && (duePredictions.length === 0 ? <FinanceEmpty>{t('finance.predictions.dueEmpty')}</FinanceEmpty> : <div className="rg-finance-prediction-list">{duePredictions.map((entry, index) => {
                const prediction = asRecord(entry)
                const predictionId = String(prediction?.id ?? '')
                return <article key={predictionId || index}><div><strong>{displayValue(prediction?.title)}</strong><code>{predictionId}</code></div><PredictionSummary value={entry} t={t} /><button type="button" className="rg-btn" onClick={() => {
                  setResolveId(predictionId)
                  if (manualControls.current) manualControls.current.open = true
                  resolveInput.current?.scrollIntoView({ block: 'center' })
                  resolveInput.current?.focus({ preventScroll: true })
                }}>{t('finance.predictions.resolveThis')}</button></article>
              })}</div>)}
            </section>
            <section className="rg-finance-block"><h3>{t('finance.predictions.saved')}</h3>{predictions.length === 0 ? <FinanceEmpty>{t('finance.predictions.empty')}</FinanceEmpty> : <div className="rg-finance-saved-list">{predictions.map(node => <article key={node.id}><div><strong>{node.title}</strong><span className="rg-finance-badge">{['pending', 'resolved', 'error'].includes(String(node.metadata.status)) ? t(`finance.predictions.state.${String(node.metadata.status)}`) : displayValue(node.metadata.status)}</span></div><PredictionSummary value={node} t={t} /><NodeProvenance node={node} t={t} /></article>)}</div>}</section>
          </div>
          <details className="rg-finance-manual" ref={manualControls} open={onResearch ? undefined : true}>
          <summary hidden={!onResearch}>{t('finance.predictions.manualControls')}</summary>
          <section className="rg-finance-block"><h3>{t('finance.predictions.recordTitle')}</h3>
            <form className="rg-finance-form" onSubmit={record}>
              <div className="rg-finance-fields-inline rg-finance-fields-four"><Field label={t('finance.id')}><input required value={id} onChange={event => { setId(event.target.value) }} placeholder="prediction:…" /></Field><Field label={t('finance.title')}><input required value={title} onChange={event => { setTitle(event.target.value) }} /></Field><Field label={t('finance.predictions.instrumentId')}><input value={instrumentId} onChange={event => { setInstrumentId(event.target.value) }} placeholder="instrument:…" /></Field><Field label={t('finance.predictions.resolutionDate')}><input required value={resolutionDate} onChange={event => { setResolutionDate(event.target.value) }} placeholder="2026-11-30T00:00:00Z" /></Field></div>
              <div className="rg-finance-fields-inline"><Field label={t('finance.predictions.direction')}><input value={direction} onChange={event => { setDirection(event.target.value) }} placeholder="up / down" /></Field><Field label={t('finance.predictions.predictedValue')}><input type="number" step="any" value={predictedValue} onChange={event => { setPredictedValue(event.target.value) }} /></Field><Field label={t('finance.predictions.probability')}><input type="number" min="0" max="1" step="any" value={probability} onChange={event => { setProbability(event.target.value) }} /></Field></div>
              <MetadataFields value={predictionMetadata} onChange={setPredictionMetadata} t={t} />
              <div className="rg-finance-form-actions"><button className="rg-btn" data-primary type="submit" disabled={recordOperation.status === 'loading'}>{t('finance.predictions.recordAction')}</button></div>
            </form><OperationStatus operation={recordOperation} t={t} idle={t('finance.predictions.recordIdle')} />
          </section>
          <section className="rg-finance-block"><h3>{t('finance.predictions.resolveTitle')}</h3>
            <form className="rg-finance-form" onSubmit={resolve}>
              <div className="rg-finance-fields-inline rg-finance-fields-four"><Field label={t('finance.predictions.predictionId')}><input ref={resolveInput} required value={resolveId} onChange={event => { setResolveId(event.target.value) }} placeholder="prediction:…" /></Field><Field label={t('finance.predictions.status')}><select value={resolveStatus} onChange={event => { setResolveStatus(event.target.value as 'resolved' | 'error') }}><option value="resolved">resolved</option><option value="error">error</option></select></Field><Field label={t('finance.predictions.resolvedAt')}><input required value={resolvedAt} onChange={event => { setResolvedAt(event.target.value) }} placeholder="2026-11-30T00:00:00Z" /></Field><Field label={t('finance.predictions.actualDirection')}><input value={actualDirection} onChange={event => { setActualDirection(event.target.value) }} placeholder="up / down" /></Field></div>
              <div className="rg-finance-fields-inline"><Field label={t('finance.predictions.actualValue')}><input type="number" step="any" value={actualValue} onChange={event => { setActualValue(event.target.value) }} /></Field><Field label={t('finance.predictions.actual')}><select value={actual} onChange={event => { setActual(event.target.value) }}><option value="">—</option><option value="true">true</option><option value="false">false</option></select></Field></div>
              <MetadataFields value={resolveMetadata} onChange={setResolveMetadata} t={t} />
              <div className="rg-finance-form-actions"><button className="rg-btn" data-primary type="submit" disabled={resolveOperation.status === 'loading'}>{t('finance.predictions.resolveAction')}</button></div>
            </form><OperationStatus operation={resolveOperation} t={t} idle={t('finance.predictions.resolveIdle')} />
          </section>
          </details>
        </>}
      </div>
    </section>
  )
}

export function BriefingPanel({ store, t, onResearch }: MemoryPanelProps) {
  const state = useFinance(store)
  const prepare = financeOperation(state, 'briefingPrepare')
  const recordOperation = financeOperation(state, 'briefingRecord')
  const evaluate = financeOperation(state, 'briefingEvaluate')
  const [prepareAsOf, setPrepareAsOf] = useState('')
  const [query, setQuery] = useState('')
  const [evaluateAsOf, setEvaluateAsOf] = useState('')
  const [id, setId] = useState('')
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [references, setReferences] = useState<string[]>([])
  const [metadata, setMetadata] = useState<MetadataDraft>(EMPTY_METADATA)
  const prepared = asRecord(prepare.result)
  const markdownLabels = { code: { copyLabel: t('reports.markdown.copy'), copiedLabel: t('reports.markdown.copied'), toolbarLabels: { codeLabel: t('reports.markdown.code'), wrapLabel: t('reports.markdown.wrap'), unwrapLabel: t('reports.markdown.unwrap') } }, footnotes: t('reports.markdown.footnotes') }
  const prepareBusy = prepare.status === 'loading'
  const recordBusy = recordOperation.status === 'loading'
  const evaluateBusy = evaluate.status === 'loading'
  const usePrepared = () => {
    setContent(typeof prepared?.content === 'string' ? prepared.content : '')
    const cards = Array.isArray(prepared?.cards) ? prepared.cards : []
    setReferences(cards.map(card => asRecord(card)?.id).filter((value): value is string => typeof value === 'string'))
  }
  const record = (event: FormEvent) => {
    event.preventDefault()
    void store.recordBriefing({ id, title, content, references, metadata: metadataInput(metadata) })
  }
  return (
    <section className="rg-finance-section" aria-labelledby="rg-finance-briefing-title">
      <div className="rg-finance-section-head"><div><h2 id="rg-finance-briefing-title">{t('finance.briefing.title')}</h2><p>{t('finance.briefing.description')}</p></div>{onResearch && <button type="button" className="rg-btn" data-primary onClick={() => { onResearch(t('finance.briefing.conversationPrompt'), 'daily-digest', prepareAsOf.trim() ? { asOf: prepareAsOf.trim() } : {}) }}>{t('finance.briefing.conversationAction')}</button>}</div>
      <details className="rg-finance-manual" open={onResearch ? undefined : true}>
      <summary hidden={!onResearch}>{t('finance.briefing.manualControls')}</summary>
      <section className="rg-finance-block">
        <h3>{t('finance.briefing.prepareTitle')}</h3>
        <form className="rg-finance-form" onSubmit={(event: FormEvent) => { event.preventDefault(); void store.prepareBriefing(prepareAsOf, query.trim()) }}>
          <div className="rg-finance-fields-inline"><Field label={t('finance.provenance.asOf')}><input required value={prepareAsOf} onChange={event => { setPrepareAsOf(event.target.value) }} placeholder="2026-10-30T00:00:00Z" /></Field><Field label={t('finance.briefing.query')}><input type="search" value={query} onChange={event => { setQuery(event.target.value) }} /></Field></div>
          <div className="rg-finance-form-actions"><button className="rg-btn" data-primary type="submit" disabled={prepareBusy}>{t('finance.briefing.prepareAction')}</button></div>
        </form>
        <OperationStatus operation={prepare} t={t} idle={t('finance.briefing.prepareIdle')} />
        {prepare.status === 'success' && <div className="rg-finance-result">
          <div className="rg-finance-form-actions"><button type="button" className="rg-btn" onClick={usePrepared}>{t('finance.briefing.usePrepared')}</button></div>
          <div className="rg-report-markdown"><MarkdownText text={protectReportCurrency(displayValue(prepared?.content))} labels={markdownLabels} omitHtml /></div>
          <LazyDetails className="rg-finance-record" summary={t('reports.citations')}>{() => <AutoTable value={prepared?.cards as import('../../src/graph.ts').JsonValue} t={t} />}</LazyDetails>
          <LazyDetails className="rg-finance-record" summary={t('finance.provenance.title')}>{() => <Provenance value={prepare.result} t={t} />}</LazyDetails>
          <RawJson value={prepare.result} t={t} />
        </div>}
      </section>
      <section className="rg-finance-block">
        <h3>{t('finance.briefing.recordTitle')}</h3>
        <form className="rg-finance-form" onSubmit={record}>
          <div className="rg-finance-fields-inline"><Field label={t('finance.id')}><input required value={id} onChange={event => { setId(event.target.value) }} placeholder="briefing:…" /></Field><Field label={t('finance.title')}><input required value={title} onChange={event => { setTitle(event.target.value) }} /></Field></div>
          <Field label={t('finance.briefing.content')} hint={t('finance.briefing.references', { count: references.length })}><textarea required rows={10} value={content} onChange={event => { setContent(event.target.value) }} /></Field>
          <MetadataFields value={metadata} onChange={setMetadata} t={t} />
          <div className="rg-finance-form-actions"><button className="rg-btn" data-primary type="submit" disabled={recordBusy}>{t('finance.briefing.recordAction')}</button></div>
        </form>
        <OperationStatus operation={recordOperation} t={t} idle={t('finance.briefing.recordIdle')} />
      </section>
      <section className="rg-finance-block">
        <h3>{t('finance.briefing.evaluateTitle')}</h3>
        <form className="rg-finance-form" onSubmit={(event: FormEvent) => { event.preventDefault(); void store.evaluateBriefing(evaluateAsOf) }}>
          <Field label={t('finance.provenance.asOf')}><input required value={evaluateAsOf} onChange={event => { setEvaluateAsOf(event.target.value) }} placeholder="2026-10-30T00:00:00Z" /></Field>
          <div className="rg-finance-form-actions"><button className="rg-btn" data-primary type="submit" disabled={evaluateBusy}>{t('finance.briefing.evaluateAction')}</button></div>
        </form>
        <OperationStatus operation={evaluate} t={t} idle={t('finance.briefing.evaluateIdle')} />
        {evaluate.status === 'success' && <div className="rg-finance-result"><PrimitiveSummary value={evaluate.result} /><ResultWarnings value={evaluate.result} /><AutoTable value={evaluate.result} t={t} /><RawJson value={evaluate.result} t={t} /></div>}
      </section>
      </details>
    </section>
  )
}
