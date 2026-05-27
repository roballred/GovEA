/**
 * Pure logic for the admin sidebar's collapsible nav-group accordion (#662).
 *
 * Single-open accordion: at most one group expanded at a time. State is
 * stored in `localStorage` under the single key `nav.openGroup`, holding
 * either a group label (the currently-open group) or absent (all
 * collapsed). Replaces the per-group key shape introduced in #479 — those
 * older keys (`nav.group.<slug>.open`) are now ignored.
 *
 * Default-collapsed for every group on first load, per #662. The
 * containing-active-route guard lives in the component (it's a derived
 * UI decision, not storage).
 */

const STORAGE_KEY = 'nav.openGroup'

/** Normalises a group label into a storage-safe slug — used for aria-controls ids. */
export function groupSlug(label: string): string {
  return label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

/**
 * Resolve the currently-open group from storage, or null if none / unavailable.
 * Returns null when storage is missing, the key is absent, or the stored value
 * is empty.
 */
export function readOpenGroup(
  storage: Pick<Storage, 'getItem'> | null | undefined,
): string | null {
  if (!storage) return null
  try {
    const raw = storage.getItem(STORAGE_KEY)
    if (!raw) return null
    const trimmed = raw.trim()
    return trimmed.length > 0 ? trimmed : null
  } catch {
    // Quota / disabled-storage / private-mode — treat as "no preference".
    return null
  }
}

/**
 * Persist the currently-open group label, or clear it. Pass null (or undefined)
 * to clear. No-op when storage is unavailable.
 */
export function writeOpenGroup(
  label: string | null | undefined,
  storage: (Pick<Storage, 'setItem'> & Pick<Storage, 'removeItem'>) | null | undefined,
): void {
  if (!storage) return
  try {
    if (label == null || label.length === 0) {
      storage.removeItem(STORAGE_KEY)
    } else {
      storage.setItem(STORAGE_KEY, label)
    }
  } catch {
    // Quota exceeded or storage disabled — preference is lost for this
    // session; UI continues to work.
  }
}
