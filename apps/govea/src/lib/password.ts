/**
 * The bridge between GovEA's per-org security settings and `@govcore/auth`'s
 * password policy (#894).
 *
 * The policy *rules* (min length, character classes) and their validator now
 * live in `@govcore/auth` — import `validatePassword` / `FALLBACK_MIN_LENGTH`
 * from `@govcore/auth/password` rather than re-implementing them here. What
 * stays app-side is the mapping below, because GovEA reads its policy from a
 * typed `organization_settings` column while core takes a plain options bag.
 *
 * Import from the `@govcore/auth/password` subpath, never the package root: the
 * root entry pulls `createAuth` → `next-auth` → `next/server`, which vitest
 * cannot resolve, and that breaks every suite loading a module that imports it.
 *
 * OWASP A07 — Identification and Authentication Failures
 */
import type { SecuritySettings } from '@/db/schema'
import type { PasswordPolicy } from '@govcore/auth/password'

/**
 * Map GovEA's typed `SecuritySettings` column to `@govcore/auth`'s `PasswordPolicy`.
 * The password rules are 1:1 (min length + require upper/lower/digit/special), so
 * core enforces exactly the same policy; the extra `SecuritySettings` fields core
 * doesn't model (expiry, lockout thresholds) stay app-side. This lets the column
 * remain the source of truth while core owns the validation and the flows.
 */
export function securitySettingsToPolicy(s: SecuritySettings): PasswordPolicy {
  return {
    minLength: s.passwordMinLength,
    requireUppercase: s.requireUppercase,
    requireLowercase: s.requireLowercase,
    requireDigit: s.requireDigit,
    requireSpecial: s.requireSpecial,
  }
}
