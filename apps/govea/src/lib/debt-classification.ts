/**
 * Pure helpers for debt-item classification (#381 PR-1).
 *
 * Lives outside the 'use server' module so client forms can run the same
 * detection live without a network round-trip. The server action runs the
 * same function on save — keeping client preview and server enforcement
 * aligned by construction.
 */
import type { DebtType } from '@/db/schema'

const SECURITY_KEYWORDS = /\b(CVE|vulnerability|exploit|unpatched|advisory)\b/i

/**
 * Per `rm-architecture-debt.md` §Rules: auto-flag when description or
 * acceptanceRationale contain security keywords. The tech-record CVE rule
 * (lifecycle-risk + linked CVE) is deferred to PR-4.
 */
export function detectSecuritySensitive(input: {
  debtType: DebtType
  description?: string | null
  acceptanceRationale?: string | null
}): boolean {
  if (input.description && SECURITY_KEYWORDS.test(input.description)) return true
  if (input.acceptanceRationale && SECURITY_KEYWORDS.test(input.acceptanceRationale)) return true
  return false
}
