/**
 * Direction contract (impeccable seed 36586481, mode operate, assigned #6).
 * THESIS: a graph workbench as map-over-ledger — the interactive canvas owns
 * the top of the page, a synchronized node ledger anchors the bottom, and
 * both drive one selection; the refusal is the dashboard-of-cards operations
 * page. OWN-WORLD: the DSH native token layer verbatim (--dsw-alias-*),
 * kind-coded node accents drawn from the shell's static hue families, the
 * shell's own radius/ring/focus grammar — the page reads as a built-in panel.
 * STORY: an operator opens the panel and immediately sees what the graph
 * knows, what is selected, what changed (timeline), and what is broken
 * (audit) — then fixes it in place. FIRST VIEWPORT: header with search,
 * revision, and mode tabs; filter rail of kind chips; the canvas fills the
 * remaining space with the ledger strip beneath; the inspector sheets in
 * from the right on selection. FORM: candidate 6 of the grounded list
 * (split ledger + map), seed key 36586481.
 * FINISH: unreviewed and undocumented is unfinished; this build ends with
 * the finish review, the verdict, and DESIGN.md.
 *
 * Browser half of `dsh-research-graph`: the sidebar entry and the full-page
 * workbench. React arrives through the shell module table (`require`), never
 * bundled; all graph traffic goes through the shared wire protocol by
 * executing `/research-graph <json>` on the active session's agent.
 * @module dsh-research-graph/client
 */

import { useEffect, useSyncExternalStore } from 'react'
import type { GraphRequest, GraphResponse } from '../src/protocol.ts'
import { dictionaries } from './locales.ts'
import { executeFinanceCommand, executeGraphCommand, resolveGraphSession } from './protocol.ts'
import type { CommandsRemoteLike, FinanceCommandRequest, SessionListLike } from './protocol.ts'
import { FinanceStore } from './finance-store.ts'
import type { FinanceGateway } from './finance-store.ts'
import { WorkbenchStore } from './store.ts'
import type { GraphGateway, Translate } from './store.ts'
import { STYLE_TEXT } from './styles.ts'
import { WorkbenchPage } from './ui/WorkbenchPage.tsx'
import { runSessionPrompt } from './session.ts'
import type { SessionControllerLike } from './session.ts'
import { ResearchStore } from './research-store.ts'
import type { SessionPromptGateway } from './research-store.ts'
import { PANEL_ENTRIES, activatePanel, entryByPanelId } from './entries.tsx'
import type { PanelEntry } from './entries.tsx'
import { createConversationGateway } from './conversations.ts'
import type { ConversationBindingLike, ConversationGateway, ConversationGatewayDependencies, ConversationSessionsLike } from './conversations.ts'
import { ResearchCommandView } from './ui/ResearchCommandView.tsx'
import type { ResearchCommandViewProps } from './ui/ResearchCommandView.tsx'

/** Dictionary namespace registered with the shell locale service. */
export const NS = 'researchGraph'

/** The id shared by the original sidebar entry and its main panel. */
export const PANEL_ID = 'research-graph'

/** Services the workbench consumes from the shell. */
export const inject = ['slots', 'layout', 'locale', 'remote', 'remote.commands', 'sessions', 'conversation', 'uiWorkspace', 'workspaces']

/** Structural face of the shell context this bundle relies on. */
export interface ClientShell {
  readonly conversation?: ConversationGatewayDependencies<string, ConversationBindingLike, string>['conversation']
  readonly uiWorkspace?: ConversationGatewayDependencies<string, ConversationBindingLike, string>['navigation']
  readonly workspaces?: ConversationGatewayDependencies<string, ConversationBindingLike, string>['workspaces']
  readonly locale: {
    register(ns: string, dictionaries: Record<string, Record<string, string>>): () => void
    bind(ns: string): Translate
    getLocale?(): { readonly active: string }
    subscribe?(listener: () => void): () => void
  }
  readonly slots: {
    inject(name: string, register: () => unknown): unknown
    register(options: Record<string, unknown>, component: unknown): unknown
  }
  readonly remote: { readonly commands: CommandsRemoteLike }
  readonly layout?: {
    selectPanel?(panelId: string | null): void
    readonly panelInfo: {
      getSnapshot(): { readonly activePanelId: string | null }
      subscribe(listener: () => void): () => void
    }
  }
  readonly sessions: SessionControllerLike & {
    readonly list: { getSnapshot(): SessionListLike }
    create(opts?: Record<string, unknown>): Promise<string>
  }
  on(event: string, listener: () => void): unknown
  effect(setup: () => (() => void) | void, label?: string): unknown
}

/**
 * The store's gateway over the command channel: resolve the session the main
 * conversation shows (falling back to the first listed session, then to a
 * freshly created one), execute the JSON-mode command, parse the response.
 */
class RemoteGraphGateway implements GraphGateway {
  private creating: Promise<string> | undefined

  constructor(private readonly ctx: ClientShell) {}

  async sessionId(): Promise<string | undefined> {
    const resolved = resolveGraphSession(this.ctx.sessions.list.getSnapshot())
    if (resolved !== undefined) return resolved
    // No session exists yet: create the blank one the command can run on.
    this.creating ??= this.ctx.sessions.create().finally(() => { this.creating = undefined })
    try {
      return await this.creating
    } catch {
      return undefined
    }
  }

  async request(request: GraphRequest): Promise<GraphResponse> {
    return executeGraphCommand(this.ctx.remote.commands, await this.sessionId(), request)
  }
}

class RemoteFinanceGateway implements FinanceGateway {
  constructor(private readonly ctx: ClientShell, private readonly sessions: RemoteGraphGateway) {}

  async request(request: FinanceCommandRequest): Promise<GraphResponse> {
    return executeFinanceCommand(this.ctx.remote.commands, await this.sessions.sessionId(), request)
  }
}

class RemoteSessionPromptGateway implements SessionPromptGateway {
  constructor(private readonly ctx: ClientShell, private readonly sessions: RemoteGraphGateway) {}

  async run(input: Parameters<SessionPromptGateway['run']>[0]): ReturnType<SessionPromptGateway['run']> {
    return runSessionPrompt({
      ...input,
      sessions: this.ctx.sessions,
      sessionId: await this.sessions.sessionId(),
    })
  }
}

export { GraphPanelIcon } from './panel-icons.tsx'

/** Locale face the shell provides through `ctx.locale`; optional for older shells. */
export interface LocaleFace {
  getSnapshot(): string
  subscribe(listener: () => void): () => void
}

const DEFAULT_LOCALE_SUBSCRIBE = (): (() => void) => () => {}
const DEFAULT_LOCALE_SNAPSHOT = (): string => 'zh'
const DEFAULT_LOCALE_FACE: LocaleFace = { getSnapshot: DEFAULT_LOCALE_SNAPSHOT, subscribe: DEFAULT_LOCALE_SUBSCRIBE }

function ResearchCommandEntry({ node, localeFace }: ResearchCommandViewProps & { readonly localeFace?: LocaleFace }) {
  const locale = useSyncExternalStore(
    localeFace?.subscribe ?? DEFAULT_LOCALE_FACE.subscribe,
    localeFace?.getSnapshot ?? DEFAULT_LOCALE_FACE.getSnapshot,
    localeFace?.getSnapshot ?? DEFAULT_LOCALE_FACE.getSnapshot,
  )
  return <ResearchCommandView node={node} locale={locale} />
}

/** Loose slot-component props the shell hands to registered entries. */
interface SlotComponentProps {
  readonly t?: Translate
  readonly workbench?: WorkbenchStore
  readonly finance?: FinanceStore
  readonly research?: ResearchStore
  readonly conversations?: ConversationGateway | undefined
  readonly activateOnMount?: boolean
  readonly entry?: PanelEntry
  readonly localeFace?: LocaleFace
}

/** One main panel: unwraps the slot share and applies the entry's defaults on mount. */
function WorkbenchPageEntry({ t, workbench, finance, research, conversations, entry, localeFace, activateOnMount = true }: SlotComponentProps) {
  const locale = useSyncExternalStore(
    localeFace?.subscribe ?? DEFAULT_LOCALE_FACE.subscribe,
    localeFace?.getSnapshot ?? DEFAULT_LOCALE_FACE.getSnapshot,
    localeFace?.getSnapshot ?? DEFAULT_LOCALE_FACE.getSnapshot,
  )
  useEffect(() => {
    if (activateOnMount && entry !== undefined && workbench !== undefined) activatePanel(entry, workbench, finance)
  }, [entry, workbench, finance, activateOnMount])
  if (t === undefined || workbench === undefined || finance === undefined) return null
  return <WorkbenchPage store={workbench} finance={finance} research={research} conversations={conversations} t={t} titleKey={entry?.labelKey ?? 'header.title'} locale={locale} />
}

/**
 * Activate the client bundle: register the dictionaries, inject the
 * stylesheet, create shared stores, retain the keyed main addresses and expose
 * one Finance sidebar entrance. Its sidebar id addresses the matching main.
 * @param ctx - the shell context (structurally typed; the shell supplies it).
 */
export function apply(ctx: ClientShell): void {
  ctx.effect(() => ctx.locale.register(NS, dictionaries), 'dsh-research-graph: dictionaries')
  const t = ctx.locale.bind(NS)
  const localeFace: LocaleFace = {
    getSnapshot: () => ctx.locale.getLocale?.().active ?? 'zh',
    subscribe: listener => ctx.locale.subscribe?.(listener) ?? (() => {}),
  }
  // JSON workbench reads can contain the entire graph. Keep their transcript
  // cards small; the command's original result remains available on demand.
  // A history window may load a command result before its matching run event.
  // The shell dispatches that unnamed row with the empty key.
  for (const command of ['research-graph', 'finance', '']) {
    ctx.effect(() => ctx.slots.inject('conversation.chat.commandview', () => ctx.slots.register({
      name: 'conversation.chat.commandview',
      key: command,
      inject: () => ({ localeFace }),
    }, ResearchCommandEntry)) as (() => void) | void, `dsh-research-graph: ${command} command view`)
  }
  ctx.effect(() => {
    if (typeof document === 'undefined') return
    const style = document.createElement('style')
    style.dataset.plugin = 'dsh-research-graph'
    style.textContent = STYLE_TEXT
    document.head.append(style)
    return () => { style.remove() }
  }, 'dsh-research-graph: styles')

  const graphGateway = new RemoteGraphGateway(ctx)
  const store = new WorkbenchStore(graphGateway, t, typeof localStorage === 'undefined' ? undefined : localStorage)
  const finance = new FinanceStore(new RemoteFinanceGateway(ctx, graphGateway), t, () => store.load())
  const research = new ResearchStore(graphGateway, new RemoteSessionPromptGateway(ctx, graphGateway), () => store.load())
  const conversations = ctx.conversation && ctx.uiWorkspace && ctx.workspaces ? createConversationGateway({
    // This bundle keeps a small shell face; the native adapter is checked against the installed DSH SDK.
    sessions: ctx.sessions as unknown as ConversationSessionsLike<string, ConversationBindingLike, string>,
    conversation: ctx.conversation,
    navigation: ctx.uiWorkspace,
    workspaces: ctx.workspaces,
  }) : undefined

  // Native panel activation owns entry defaults. Responsive remounts must
  // preserve the selected section; older shells use the mount fallback.
  ctx.effect(() => {
    let previousPanel: string | null | undefined
    let previousEntry: string | undefined
    const activateActive = () => {
      const activePanel = ctx.layout?.panelInfo.getSnapshot().activePanelId
      if (activePanel === previousPanel) return
      previousPanel = activePanel
      const entry = entryByPanelId(activePanel)
      if (entry !== undefined) {
        if (previousEntry === entry.id) store.setMode(entry.mode)
        else activatePanel(entry, store, finance)
        previousEntry = entry.id
        // Native conversations can save research while this panel is away.
        void store.refresh()
      }
    }
    activateActive()
    return ctx.layout?.panelInfo.subscribe(activateActive)
  }, 'dsh-research-graph: panel activation')

  // A dropped connection invalidates the snapshot; reload on reset.
  ctx.on('connection/reset', () => { void store.refresh(); void finance.refresh() })

  const linkedAsset = typeof window === 'undefined' ? undefined : new URL(window.location.href).searchParams.get('asset')?.trim()
  let assetLinkOpened = false
  for (const entry of PANEL_ENTRIES) {
    const PanelIcon = entry.icon
    ctx.effect(() => {
      const disposeMain = ctx.slots.inject('main', () => {
        const dispose = ctx.slots.register({
          name: 'main',
          key: entry.id,
          locale: NS,
          inject: () => ({ workbench: store, finance, research, conversations, entry, localeFace, activateOnMount: ctx.layout === undefined }),
        }, WorkbenchPageEntry)
        if (!assetLinkOpened && entry.id === 'finance-workbench' && ctx.layout?.selectPanel && linkedAsset && /^[A-Za-z^][A-Za-z0-9.^=_-]{0,19}$/u.test(linkedAsset)) {
          assetLinkOpened = true
          ctx.layout.selectPanel(entry.id)
        }
        return dispose
      })
      // One user-facing entrance; retain every existing keyed main for deep links.
      const disposeSidebar = entry.id === 'finance-workbench' ? ctx.slots.inject('sidebar.panellist', () => ctx.slots.register({
        name: 'sidebar.panellist',
        id: entry.id,
        order: entry.order,
        label: () => t(entry.labelKey),
        locale: NS,
      }, PanelIcon)) : undefined
      return () => {
        if (typeof disposeSidebar === 'function') (disposeSidebar as () => void)()
        if (typeof disposeMain === 'function') (disposeMain as () => void)()
      }
    }, `dsh-research-graph: ${entry.id}`)
  }
}
