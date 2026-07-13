'use server'

/**
 * Self-service password change (#527).
 *
 * Reachable from /change-password — either voluntarily, or because middleware
 * redirected the user after their password expired per the org's
 * `passwordExpiryDays` policy.
 *
 * The flow itself now lives in `@govcore/auth` (`changePassword`, GovCore #66 —
 * GovEA #894): it verifies the current password, enforces the policy, rejects
 * reuse, rehashes, clears lockout, and stamps `lastPasswordChangedAt` (so the
 * expiry redirect keeps working), auditing `auth.password_changed` /
 * `auth.password_change_failed` — all in one transaction. This wrapper is the
 * thin GovEA seam: read the session, resolve the org's policy from the
 * `securitySettings` column (still the source of truth, mapped to core's
 * `PasswordPolicy`), and map the typed result to the form's `{ ok, message }`.
 */
import { changePassword } from '@govcore/auth'
import { redirect } from 'next/navigation'
import { db } from '@/db/client'
import { auth } from '@/lib/auth'
import { securitySettingsToPolicy } from '@/lib/password'
import { getOrgSecuritySettings } from '@/lib/security-policy'

export type ChangePasswordResult =
  | { ok: true }
  | { ok: false; message: string }

export async function changeOwnPassword(formData: FormData): Promise<ChangePasswordResult> {
  const session = await auth()
  if (!session?.user) redirect('/login')

  const currentPassword = (formData.get('currentPassword') as string) ?? ''
  const newPassword = (formData.get('newPassword') as string) ?? ''
  const confirmPassword = (formData.get('confirmPassword') as string) ?? ''

  // Confirmation match is a form concern; core takes only current + new.
  if (newPassword !== confirmPassword) {
    return { ok: false, message: 'New password and confirmation do not match' }
  }

  const policy = securitySettingsToPolicy(await getOrgSecuritySettings(session.user.organizationId))

  // rounds: 12 preserves GovEA's bcrypt cost factor (core defaults to 10).
  const result = await changePassword(db, {
    userId: session.user.id,
    currentPassword,
    newPassword,
    policy,
    rounds: 12,
  })

  if (result.ok) return { ok: true }

  // The flow moved to @govcore/auth, but keep GovEA's original form wording so
  // the UX (and the change-password tests) don't shift. weak-password falls
  // through to core's policy message (same rules, same phrasing).
  switch (result.reason) {
    case 'no-local-password':
      return { ok: false, message: 'Account does not have a local password (SSO-only)' }
    case 'current-incorrect':
      return { ok: false, message: 'Current password is incorrect' }
    case 'reused':
      return { ok: false, message: 'New password must be different from the current password' }
    default:
      return { ok: false, message: result.message }
  }
}
