/**
 * Bridge from panel UI to optional host navigation services.
 *
 * The workbench panels render outside the conversation slots, so they cannot
 * receive the file-open owner props a `tool.call.toolview` gets. `apply()`
 * probes the shell for the host sidebar-right navigator once at activation
 * and registers it here; panels read it at interaction time. A host without
 * the service simply leaves the navigator undefined and entry buttons surface
 * that as feedback instead of silently doing nothing.
 */

/** Navigation the installed host provides and this bundle consumes. */
export interface HostNavigator {
  /**
   * Open one workspace file in the host's sidebar document preview.
   * @returns whether the request was handed to the host.
   */
  openFilePreview(sessionId: string, path: string): boolean | Promise<boolean>
}

export interface HostNavigationServices {
  readonly uiWorkspace?: { openSession(sessionId: string): void }
  readonly sidebarRight?: {
    readonly mounted?: { getSnapshot(): string | undefined }
    openResource?(address: string): void
  }
  readonly sessions: {
    using<T>(sessionId: string, options: { readonly source: 'controllerOperation' }, operation: (reference: { readonly ready: Promise<unknown> }) => T | Promise<T>): Promise<T>
  }
}

function nextFrame(): Promise<void> {
  return new Promise(resolve => {
    if (typeof requestAnimationFrame === 'function') requestAnimationFrame(() => { resolve() })
    else setTimeout(resolve, 0)
  })
}

/** A global panel must reveal its owning conversation before the per-session sidebar can navigate. */
export function createHostNavigator(services: HostNavigationServices): HostNavigator | undefined {
  const sidebar = services.sidebarRight
  const mounted = sidebar?.mounted
  const openResource = sidebar?.openResource
  const navigation = services.uiWorkspace
  if (typeof openResource !== 'function' || mounted === undefined || navigation === undefined) return undefined
  return {
    openFilePreview: (sessionId, path) => services.sessions.using(sessionId, { source: 'controllerOperation' }, async reference => {
      await reference.ready
      navigation.openSession(sessionId)
      // The host publishes `mounted` before React adopts the arriving sidebar store.
      await nextFrame()
      await nextFrame()
      if (mounted.getSnapshot() !== sessionId) throw new Error('The artifact conversation is no longer selected.')
      openResource.call(sidebar, filePreviewAddress(sessionId, path))
      return true
    }),
  }
}

let navigator: HostNavigator | undefined

/** Install or clear the navigator; called by `apply()` (and cleared on dispose). */
export function registerHostNavigator(next: HostNavigator | undefined): void {
  navigator = next
}

/** The navigator probed at activation, when the host provides one. */
export function hostNavigator(): HostNavigator | undefined {
  return navigator
}

/**
 * Build the `dsh-resource://file/session/…` address the host sidebar document
 * preview claims. Segments are encoded individually, keeping `:` literal for
 * Windows drive letters — exactly the spelling the installed host's
 * `sessionFileAddress` produces and `parseFileAddress` reads back. Empty
 * segments are preserved on purpose: they carry the leading `/` of an
 * absolute path, which the host read API accepts alongside workspace-relative
 * paths; dropping them would silently re-root an absolute record inside the
 * workspace.
 */
export function filePreviewAddress(sessionId: string, path: string): string {
  const normalized = path.replace(/\\/g, '/').replace(/^(?:\.\/)+/, '')
  const encodeSegment = (segment: string) => encodeURIComponent(segment).replace(/%3A/gi, ':')
  const encodedPath = normalized.split('/').map(encodeSegment).join('/')
  return `dsh-resource://file/session/${encodeSegment(sessionId)}/${encodedPath}`
}
