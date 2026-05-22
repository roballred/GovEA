'use server'

/**
 * Security settings server actions (#527).
 *
 * Admin-only read/write. The settings live as JSONB on the organizations
 * row, validated + clamped at save time so a hostile form post can't
 * push an impossible policy (e.g. minLength = -1, sessionTimeout = 0
 * meaning "never expire") into the org.
 *
 * Per the capability rule ("changes apply to future logins"), saving does
 * NOT terminate existing sessions — the new policy is read on the next
 * authorize() call (lockout / login validation), the next password set
 * (validation), and per-request in the jwt callback (session timeout
 * enforcement).
 */
import { db } from '@/db/client'
import { organizations, DEFAULT_SECURITY_SETTINGS } from '@/db/schema'
import type { SecuritySettings } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { auth } from '@/lib/auth'
import { isAdmin } from '@/lib/rbac'
import { writeAuditLog } from '@/lib/audit'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { mergeWithDefaults } from '@/lib/security-policy'

async function requireAdmin() {
  const session = await auth()
  if (!session?.user) redirect('/login')
  if (!isAdmin(session.user)) throw new Error('Forbidden')
  return session
}

export async function getSecuritySettingsForUi(): Promise<SecuritySettings> {
  const session = await auth()
  if (!session?.user) redirect('/login')
  if (!session.user.organizationId) return DEFAULT_SECURITY_SETTINGS
  const org = await db.query.organizations.findFirst({
    where: eq(organizations.id, session.user.organizationId),
    columns: { securitySettings: true },
  })
  return mergeWithDefaults(org?.securitySettings)
}

/** Clamp a form-submitted integer so a hostile post can't bypass UI mins/maxes. */
function clampInt(value: string | FormDataEntryValue | null, min: number, max: number, fallback: number): number {
  const n = typeof value === 'string' ? parseInt(value, 10) : NaN
  if (!Number.isFinite(n)) return fallback
  return Math.max(min, Math.min(max, n))
}

export async function saveSecuritySettings(formData: FormData): Promise<void> {
  const session = await requireAdmin()
  const orgId = session.user.organizationId!

  const settings: SecuritySettings = {
    passwordMinLength: clampInt(formData.get('passwordMinLength'), 6, 128, DEFAULT_SECURITY_SETTINGS.passwordMinLength),
    requireUppercase: formData.get('requireUppercase') === 'on',
    requireLowercase: formData.get('requireLowercase') === 'on',
    requireDigit:     formData.get('requireDigit')     === 'on',
    requireSpecial:   formData.get('requireSpecial')   === 'on',
    // Session timeout: 5 minutes minimum (anything shorter is unusable),
    // 30 days max. Stored as minutes — converted to seconds when handed
    // to NextAuth.
    sessionTimeoutMinutes: clampInt(formData.get('sessionTimeoutMinutes'), 5, 60 * 24 * 30, DEFAULT_SECURITY_SETTINGS.sessionTimeoutMinutes),
    // Lockout threshold: 0 = disabled, otherwise 3–20 (NIST 800-63B
    // recommends a "small number"; we cap at 20 to prevent footguns).
    lockoutThreshold: clampInt(formData.get('lockoutThreshold'), 0, 20, DEFAULT_SECURITY_SETTINGS.lockoutThreshold),
    lockoutDurationMinutes: clampInt(formData.get('lockoutDurationMinutes'), 1, 60 * 24, DEFAULT_SECURITY_SETTINGS.lockoutDurationMinutes),
    // Password expiry: 0 = disabled, otherwise 30 days minimum. NIST 800-63B
    // famously deprecated forced periodic rotation, but many agency baselines
    // still require it — make it configurable, default-off.
    passwordExpiryDays: clampInt(formData.get('passwordExpiryDays'), 0, 365 * 2, DEFAULT_SECURITY_SETTINGS.passwordExpiryDays),
  }

  await db.transaction(async (tx) => {
    await tx.update(organizations)
      .set({ securitySettings: settings, updatedAt: new Date() })
      .where(eq(organizations.id, orgId))
    await writeAuditLog(tx, {
      action: 'security_settings.update',
      entityType: 'organization',
      entityId: orgId,
      userId: session.user.id,
      organizationId: orgId,
      after: settings,
    })
  })

  revalidatePath('/settings')
  revalidatePath('/settings/security')
}
