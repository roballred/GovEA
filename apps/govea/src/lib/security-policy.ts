/**
 * Per-org security policy resolver (#527).
 *
 * Centralises the "merge org-stored settings with defaults" step so that
 * every enforcement path (auth lockout, password validation, session
 * timeout, expiry check) gets the same shape regardless of whether the
 * org has saved settings yet.
 *
 * Per-key fallback (not a wholesale fallback): if `requireDigit` is missing
 * we default to false but keep the explicit `passwordMinLength` the admin
 * has saved. JSONB partial saves should never silently flip stricter
 * controls off.
 */
import { db } from '@/db/client'
import { organizations, DEFAULT_SECURITY_SETTINGS } from '@/db/schema'
import type { SecuritySettings } from '@/db/schema'
import { eq } from 'drizzle-orm'

export async function getOrgSecuritySettings(orgId: string): Promise<SecuritySettings> {
  const org = await db.query.organizations.findFirst({
    where: eq(organizations.id, orgId),
    columns: { securitySettings: true },
  })
  return mergeWithDefaults(org?.securitySettings)
}

/**
 * Merge a partial / nullable stored policy with the defaults, key-by-key.
 * Used by getOrgSecuritySettings and the settings form's `initial` prop.
 */
export function mergeWithDefaults(stored: SecuritySettings | null | undefined): SecuritySettings {
  if (!stored) return { ...DEFAULT_SECURITY_SETTINGS }
  return {
    passwordMinLength:     stored.passwordMinLength     ?? DEFAULT_SECURITY_SETTINGS.passwordMinLength,
    requireUppercase:      stored.requireUppercase      ?? DEFAULT_SECURITY_SETTINGS.requireUppercase,
    requireLowercase:      stored.requireLowercase      ?? DEFAULT_SECURITY_SETTINGS.requireLowercase,
    requireDigit:          stored.requireDigit          ?? DEFAULT_SECURITY_SETTINGS.requireDigit,
    requireSpecial:        stored.requireSpecial        ?? DEFAULT_SECURITY_SETTINGS.requireSpecial,
    sessionTimeoutMinutes: stored.sessionTimeoutMinutes ?? DEFAULT_SECURITY_SETTINGS.sessionTimeoutMinutes,
    lockoutThreshold:      stored.lockoutThreshold      ?? DEFAULT_SECURITY_SETTINGS.lockoutThreshold,
    lockoutDurationMinutes: stored.lockoutDurationMinutes ?? DEFAULT_SECURITY_SETTINGS.lockoutDurationMinutes,
    passwordExpiryDays:    stored.passwordExpiryDays    ?? DEFAULT_SECURITY_SETTINGS.passwordExpiryDays,
  }
}

/**
 * Returns true when the user's password has expired per the org policy.
 * `passwordExpiryDays === 0` means expiry is disabled.
 */
export function isPasswordExpired(
  lastPasswordChangedAt: Date | null | undefined,
  passwordExpiryDays: number,
): boolean {
  if (!passwordExpiryDays || passwordExpiryDays <= 0) return false
  if (!lastPasswordChangedAt) return true // be strict if unknown
  const ms = Date.now() - new Date(lastPasswordChangedAt).getTime()
  const days = ms / (24 * 60 * 60 * 1000)
  return days >= passwordExpiryDays
}
