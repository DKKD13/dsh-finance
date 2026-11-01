/**
 * First-use guide banner persistence. The banner is a one-line, dismissible
 * nudge on the Workflow home; dismissal is remembered locally and can be
 * replayed from the guide. Helpers accept a storage face so tests never touch
 * a real browser store.
 * @module dsh-research-graph/client/onboarding
 */

/** localStorage key for the dismissed Workflow-home guide banner. */
export const GUIDE_BANNER_STORAGE_KEY = 'dsh-research-graph.guide-banner.v1'

type StorageFace = {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
}

function storageOrUndefined(): StorageFace | undefined {
  return typeof localStorage === 'undefined' ? undefined : localStorage
}

/** Whether the user dismissed the first-use banner. Unreadable storage means "show". */
export function readGuideBannerDismissed(storage: StorageFace | undefined = storageOrUndefined()): boolean {
  if (storage === undefined) return false
  try {
    return storage.getItem(GUIDE_BANNER_STORAGE_KEY) === 'dismissed'
  } catch {
    return false
  }
}

/** Persist the banner's dismissed state; a storage failure leaves the page working. */
export function writeGuideBannerDismissed(dismissed: boolean, storage: StorageFace | undefined = storageOrUndefined()): void {
  if (storage === undefined) return
  try {
    if (dismissed) storage.setItem(GUIDE_BANNER_STORAGE_KEY, 'dismissed')
    else storage.setItem(GUIDE_BANNER_STORAGE_KEY, 'shown')
  } catch {
    // Privacy mode or quota: the banner simply reappears next mount.
  }
}
