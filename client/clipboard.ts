/**
 * Clipboard helper for copyable guide prompts. The async Clipboard API is used
 * when the shell grants it; a hidden textarea + execCommand is the fallback for
 * local shells and older browsers. Both paths are injectable for tests, and the
 * DOM faces are structural so this module also type-checks in the Node program.
 * @module dsh-research-graph/client/clipboard
 */

export interface ClipboardFace {
  writeText(text: string): Promise<void>
}

interface TextAreaLike {
  value: string
  readonly style: Record<string, string>
  setAttribute(name: string, value: string): void
  select(): void
  remove(): void
}

interface SelectionLike {
  readonly rangeCount: number
  getRangeAt(index: number): unknown
  removeAllRanges(): void
  addRange(range: unknown): void
}

interface DocumentLike {
  readonly body: { append(node: TextAreaLike): void } | null
  createElement(tag: 'textarea'): TextAreaLike
  getSelection(): SelectionLike | null
  execCommand?(command: string): boolean
}

interface NavigatorLike {
  readonly clipboard?: ClipboardFace
}

export interface ClipboardEnvironment {
  readonly clipboard?: ClipboardFace
  readonly document?: DocumentLike
}

function defaultEnvironment(): ClipboardEnvironment {
  const navigatorValue = (globalThis as unknown as { readonly navigator?: NavigatorLike }).navigator
  const documentValue = (globalThis as unknown as { readonly document?: DocumentLike }).document
  return {
    ...(navigatorValue?.clipboard === undefined ? {} : { clipboard: navigatorValue.clipboard }),
    ...(documentValue === undefined ? {} : { document: documentValue }),
  }
}

/**
 * Copy one string. Returns true only when a write was performed; permission
 * denial and missing document APIs return false so the caller can say so.
 * @param text - exact text to copy (never trimmed or rewritten).
 * @param environment - clipboard/document faces; defaults to the page's.
 */
export async function copyToClipboard(text: string, environment: ClipboardEnvironment = defaultEnvironment()): Promise<boolean> {
  if (environment.clipboard !== undefined) {
    try {
      await environment.clipboard.writeText(text)
      return true
    } catch {
      // Fall through to the DOM path; some embedded shells deny the async API.
    }
  }
  const document = environment.document
  if (document === undefined || document.body === null) return false
  const area = document.createElement('textarea')
  area.value = text
  area.setAttribute('readonly', '')
  area.setAttribute('aria-hidden', 'true')
  area.style['position'] = 'fixed'
  area.style['top'] = '-1000px'
  area.style['opacity'] = '0'
  document.body.append(area)
  const selection = document.getSelection()
  const previous = selection === null || selection.rangeCount === 0 ? null : selection.getRangeAt(0)
  area.select()
  try {
    return typeof document.execCommand === 'function' && document.execCommand('copy')
  } catch {
    return false
  } finally {
    area.remove()
    if (previous !== null && selection !== null) {
      selection.removeAllRanges()
      selection.addRange(previous)
    }
  }
}
