/**
 * Data Vault naming helpers (#570).
 *
 * The convention enforced (softly) on physical-table-name fields in the
 * Data Architecture forms. Hubs prefix `h_`, Satellites `s_`, Links `l_`,
 * matching the seed fixture data and the standard Data Vault 2.0
 * methodology. The DB stores free-text; these helpers exist so the UI can
 * suggest compliant names without blocking non-Data-Vault use.
 */

export type DataVaultPrefix = 'h' | 's' | 'l'

export const DATA_VAULT_PREFIX_LABELS: Record<DataVaultPrefix, string> = {
  h: 'Hub',
  s: 'Satellite',
  l: 'Link',
}

/**
 * Slugify a human name into a Data-Vault-friendly identifier fragment.
 * Lowercases, replaces non-alphanumerics with single underscores, trims
 * leading/trailing underscores. Empty input yields empty string.
 */
export function slugifyForDataVault(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
}

/**
 * Compose a suggested Data Vault physical-table name from an entity / link /
 * attribute name. Returns an empty string when the input slug is empty so
 * the caller can suppress the suggestion when there's nothing to suggest.
 */
export function suggestDataVaultName(prefix: DataVaultPrefix, name: string): string {
  const slug = slugifyForDataVault(name)
  return slug ? `${prefix}_${slug}` : ''
}

/**
 * True when a value already matches the expected Data Vault prefix.
 * Used to suppress redundant "Suggest" affordance once the user has typed
 * a compliant value.
 */
export function matchesDataVaultPrefix(prefix: DataVaultPrefix, value: string): boolean {
  return new RegExp(`^${prefix}_[a-z0-9_]+$`).test(value)
}
