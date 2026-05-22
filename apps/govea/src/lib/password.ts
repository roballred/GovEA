/**
 * Shared password policy for all credential-creation paths.
 *
 * Reads the per-org policy from the caller's `organizations.securitySettings`
 * row (#527). Callers that don't have a policy in hand (e.g. setup, where
 * no org exists yet) get the documented hard-coded fallback:
 * `FALLBACK_MIN_LENGTH = 8`.
 *
 * OWASP A07 — Identification and Authentication Failures
 */
import type { SecuritySettings } from '@/db/schema'

/** Fallback when no per-org policy is available (setup / pre-org paths). */
export const FALLBACK_MIN_LENGTH = 8

/** @deprecated retained as named export for back-compat with the original code path. */
export const PASSWORD_MIN_LENGTH = FALLBACK_MIN_LENGTH

export type PasswordValidationResult =
  | { valid: true }
  | { valid: false; message: string }

/**
 * Validate a password against an optional per-org policy. When `policy` is
 * undefined, the FALLBACK_MIN_LENGTH minimum is the only rule enforced —
 * matching the pre-#527 behavior so legacy callers don't accidentally
 * become more permissive than before.
 */
export function validatePassword(
  password: string | null | undefined,
  policy?: SecuritySettings | null,
): PasswordValidationResult {
  if (!password || password.trim() === '') {
    return { valid: false, message: 'Password is required' }
  }

  const minLength = policy?.passwordMinLength ?? FALLBACK_MIN_LENGTH
  if (password.length < minLength) {
    return { valid: false, message: `Password must be at least ${minLength} characters` }
  }

  if (policy?.requireUppercase && !/[A-Z]/.test(password)) {
    return { valid: false, message: 'Password must include at least one uppercase letter' }
  }
  if (policy?.requireLowercase && !/[a-z]/.test(password)) {
    return { valid: false, message: 'Password must include at least one lowercase letter' }
  }
  if (policy?.requireDigit && !/[0-9]/.test(password)) {
    return { valid: false, message: 'Password must include at least one digit' }
  }
  if (policy?.requireSpecial && !/[^A-Za-z0-9]/.test(password)) {
    return { valid: false, message: 'Password must include at least one special character' }
  }

  return { valid: true }
}
