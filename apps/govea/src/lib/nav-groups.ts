/**
 * Pure logic for the admin sidebar's collapsible nav-group state (#479).
 *
 * Lives outside the React component so it can be unit-tested without a DOM,
 * and so the rules ("which groups default open?", "what's the storage key
 * shape?") are visible in one place rather than scattered through the
 * component body.
 *
 * Storage shape: `localStorage` keyed `nav.group.<group-slug>.open`, value
 * `'1'` for open or `'0'` for collapsed. Missing keys fall back to the
 * default-open rule below.
 */

/**
 * Groups that default to **open** when the user has no stored preference.
 * Everything else (Strategy, Reports, Configuration, Data Architecture
 * once we add more nav-heavy modules) defaults to **collapsed** per #479
 * scope so a new install does not start with a wall of nav items.
 *
 * NOTE: Data Architecture defaults open per #479; once authoring/admin
 * load expands further it can move to default-collapsed without breaking
 * stored preferences.
 */
const DEFAULT_OPEN_GROUPS = new Set<string>([
  'Business Architecture',
  'Data Architecture',
  'Portfolio',
])

/** Normalises a group label into a storage-safe slug. */
export function groupSlug(label: string): string {
  return label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

/** Storage key for a group's open/closed state. */
export function groupStorageKey(label: string): string {
  return `nav.group.${groupSlug(label)}.open`
}

/** True if the group defaults to open when no preference is stored. */
export function defaultGroupOpen(label: string): boolean {
  return DEFAULT_OPEN_GROUPS.has(label)
}

/**
 * Resolve a group's current open/closed state from storage, falling back
 * to the default-open rule when the key is missing or malformed.
 *
 * `storage` is parameterised so tests can pass an in-memory shim and the
 * caller can pass `null` during SSR.
 */
export function readGroupOpen(
  label: string,
  storage: Pick<Storage, 'getItem'> | null | undefined,
): boolean {
  if (!storage) return defaultGroupOpen(label)
  try {
    const raw = storage.getItem(groupStorageKey(label))
    if (raw === '1') return true
    if (raw === '0') return false
    return defaultGroupOpen(label)
  } catch {
    // Quota / disabled-storage / private-mode edge cases — fall through.
    return defaultGroupOpen(label)
  }
}

/** Persist a group's open/closed state. No-op if `storage` is unavailable. */
export function writeGroupOpen(
  label: string,
  open: boolean,
  storage: Pick<Storage, 'setItem'> | null | undefined,
): void {
  if (!storage) return
  try {
    storage.setItem(groupStorageKey(label), open ? '1' : '0')
  } catch {
    // Quota exceeded or storage disabled — preference is lost for this
    // session, which is acceptable; the UI continues to work.
  }
}
