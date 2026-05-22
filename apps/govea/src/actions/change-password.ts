'use server'

/**
 * Self-service password change (#527).
 *
 * Reachable from /change-password — either voluntarily, or because the
 * middleware redirected the user after their password expired per the
 * org's `passwordExpiryDays` policy.
 *
 * Distinct from the admin-side `editUser` flow which can reset another
 * user's password without knowing the current one. This action ALWAYS
 * verifies the current password.
 */
import { db } from '@/db/client'
import { users } from '@/db/schema'
import { eq } from 'drizzle-orm'
import bcrypt from 'bcryptjs'
import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { writeAuditLog } from '@/lib/audit'
import { validatePassword } from '@/lib/password'
import { getOrgSecuritySettings } from '@/lib/security-policy'

export type ChangePasswordResult =
  | { ok: true }
  | { ok: false; message: string }

export async function changeOwnPassword(formData: FormData): Promise<ChangePasswordResult> {
  const session = await auth()
  if (!session?.user) redirect('/login')
  const userId = session.user.id

  const currentPassword = (formData.get('currentPassword') as string) ?? ''
  const newPassword = (formData.get('newPassword') as string) ?? ''
  const confirmPassword = (formData.get('confirmPassword') as string) ?? ''

  if (newPassword !== confirmPassword) {
    return { ok: false, message: 'New password and confirmation do not match' }
  }

  const user = await db.query.users.findFirst({ where: eq(users.id, userId) })
  if (!user || !user.passwordHash) {
    return { ok: false, message: 'Account does not have a local password (SSO-only)' }
  }

  const currentValid = await bcrypt.compare(currentPassword, user.passwordHash)
  if (!currentValid) {
    await writeAuditLog(db, {
      action: 'auth.password_change_failed',
      entityType: 'user',
      entityId: userId,
      userId,
      organizationId: user.organizationId,
      metadata: { reason: 'current_password_mismatch' },
    })
    return { ok: false, message: 'Current password is incorrect' }
  }

  // Validate against the org's policy. We could have skipped this for the
  // expiry-forced path, but a forced rotation that lets the user keep a
  // 4-character password is theater — enforce the policy unconditionally.
  const policy = await getOrgSecuritySettings(user.organizationId)
  const validation = validatePassword(newPassword, policy)
  if (!validation.valid) {
    return { ok: false, message: validation.message }
  }

  // Disallow reusing the current password — the bare minimum reuse check.
  // (A full N-password history is a separate column + much larger feature.)
  if (await bcrypt.compare(newPassword, user.passwordHash)) {
    return { ok: false, message: 'New password must be different from the current password' }
  }

  const newHash = await bcrypt.hash(newPassword, 12)
  const now = new Date()
  await db.transaction(async (tx) => {
    await tx.update(users)
      .set({
        passwordHash: newHash,
        lastPasswordChangedAt: now,
        // Successful password change also clears any lingering lockout state.
        failedLoginAttempts: 0,
        lockoutUntil: null,
        updatedAt: now,
      })
      .where(eq(users.id, userId))
    await writeAuditLog(tx, {
      action: 'auth.password_changed',
      entityType: 'user',
      entityId: userId,
      userId,
      organizationId: user.organizationId,
    })
  })

  return { ok: true }
}
