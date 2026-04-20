/**
 * Shared password policy for all credential-creation paths.
 *
 * Keeping the rule in one place means setup, createUser, and editUser
 * all enforce the same constraint. Update PASSWORD_MIN_LENGTH here to
 * change the policy everywhere at once.
 *
 * OWASP A07 — Identification and Authentication Failures
 */

export const PASSWORD_MIN_LENGTH = 8

export type PasswordValidationResult =
  | { valid: true }
  | { valid: false; message: string }

export function validatePassword(password: string | null | undefined): PasswordValidationResult {
  if (!password || password.trim() === '') {
    return { valid: false, message: 'Password is required' }
  }
  if (password.length < PASSWORD_MIN_LENGTH) {
    return {
      valid: false,
      message: `Password must be at least ${PASSWORD_MIN_LENGTH} characters`,
    }
  }
  return { valid: true }
}
