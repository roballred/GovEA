'use server'

import { db } from '@/db/client'
import { emailSettings, emailDeliveryLog } from '@/db/schema'
import { eq, desc, lt, count } from 'drizzle-orm'
import { auth } from '@/lib/auth'
import { isAdmin } from '@/lib/rbac'
import { redirect } from 'next/navigation'
import { writeAuditLog } from '@/lib/audit'
import { revalidatePath } from 'next/cache'
import { encryptCredential } from '@/lib/email/credential-cipher'
import { sendMail } from '@/lib/email/transport'

async function requireAdmin() {
  const session = await auth()
  if (!session?.user) redirect('/login')
  if (!isAdmin(session.user)) throw new Error('Forbidden')
  return session
}

export type SaveEmailSettingsResult = { ok: true } | { ok: false; error: string }

const VALID_TLS_MODES = ['none', 'starttls', 'tls'] as const
type TlsMode = (typeof VALID_TLS_MODES)[number]

/**
 * Per-org SMTP configuration save (#528).
 *
 * - Plaintext password from the form is encrypted at-rest via
 *   `lib/email/credential-cipher.ts`.
 * - If the form's `password` field is blank, existing settings retain
 *   their previous ciphertext — the UI uses this to let admins edit
 *   other fields without re-entering credentials.
 * - A literal `__clear__` value clears the password (no auth).
 */
export async function saveEmailSettings(formData: FormData): Promise<SaveEmailSettingsResult> {
  const session = await requireAdmin()
  const orgId = session.user.organizationId!

  const host = (formData.get('host') as string || '').trim()
  const portRaw = formData.get('port') as string
  const port = parseInt(portRaw || '0', 10)
  const username = ((formData.get('username') as string) || '').trim() || null
  const passwordRaw = (formData.get('password') as string) || ''
  const tlsModeRaw = ((formData.get('tlsMode') as string) || 'starttls').trim()
  const fromName = ((formData.get('fromName') as string) || '').trim()
  const fromAddress = ((formData.get('fromAddress') as string) || '').trim()
  const enabled = formData.get('enabled') === 'on'

  if (!host) return { ok: false, error: 'SMTP host is required' }
  if (!port || port <= 0 || port > 65535) return { ok: false, error: 'Port must be between 1 and 65535' }
  if (!VALID_TLS_MODES.includes(tlsModeRaw as TlsMode)) return { ok: false, error: 'Invalid TLS mode' }
  if (!fromName) return { ok: false, error: 'From name is required' }
  if (!fromAddress.includes('@')) return { ok: false, error: 'From address must be a valid email' }

  const tlsMode = tlsModeRaw as TlsMode

  const existing = await db.query.emailSettings.findFirst({ where: eq(emailSettings.organizationId, orgId) })

  // Password handling:
  //   blank      → keep existing ciphertext (or stay null if never set)
  //   "__clear__" → null it out (no auth)
  //   anything else → encrypt and store
  let passwordEncrypted: string | null
  if (passwordRaw === '') {
    passwordEncrypted = existing?.passwordEncrypted ?? null
  } else if (passwordRaw === '__clear__') {
    passwordEncrypted = null
  } else {
    passwordEncrypted = encryptCredential(passwordRaw)
  }

  await db.transaction(async (tx) => {
    if (existing) {
      await tx.update(emailSettings).set({
        host, port, username, passwordEncrypted, tlsMode, fromName, fromAddress, enabled,
        updatedBy: session.user.id, updatedAt: new Date(),
      }).where(eq(emailSettings.organizationId, orgId))
    } else {
      await tx.insert(emailSettings).values({
        organizationId: orgId, host, port, username, passwordEncrypted, tlsMode, fromName, fromAddress, enabled,
        createdBy: session.user.id, updatedBy: session.user.id,
      })
    }
    await writeAuditLog(tx, {
      action: 'email_settings.save',
      entityType: 'instance_settings',
      entityId: orgId,
      userId: session.user.id,
      organizationId: orgId,
      // Never log the credential. Log only the structural changes.
      after: { host, port, username, tlsMode, fromName, fromAddress, enabled, passwordSet: passwordEncrypted !== null },
    })
  })

  revalidatePath('/settings')
  revalidatePath('/dashboard')
  return { ok: true }
}

export type EmailSettingsForUi = {
  host: string
  port: number
  username: string | null
  passwordSet: boolean // never the actual password
  tlsMode: TlsMode
  fromName: string
  fromAddress: string
  enabled: boolean
  updatedAt: Date
} | null

export async function getEmailSettingsForUi(): Promise<EmailSettingsForUi> {
  const session = await auth()
  if (!session?.user) redirect('/login')
  if (!isAdmin(session.user)) throw new Error('Forbidden')
  const orgId = session.user.organizationId!

  const row = await db.query.emailSettings.findFirst({
    where: eq(emailSettings.organizationId, orgId),
  })
  if (!row) return null
  return {
    host: row.host,
    port: row.port,
    username: row.username,
    passwordSet: row.passwordEncrypted !== null,
    tlsMode: row.tlsMode,
    fromName: row.fromName,
    fromAddress: row.fromAddress,
    enabled: row.enabled,
    updatedAt: row.updatedAt,
  }
}

/**
 * Whether the caller's org has saved SMTP settings. Used by the dashboard
 * banner without disclosing any settings to non-admins.
 */
export async function isEmailConfigured(orgId: string): Promise<boolean> {
  const row = await db.query.emailSettings.findFirst({
    where: eq(emailSettings.organizationId, orgId),
    columns: { organizationId: true },
  })
  return row !== undefined
}

export type SendTestResult = { ok: true; durationMs: number } | { ok: false; error: string }

/**
 * Send a test email to the admin's own address (capability rule).
 * Records the attempt in `email_delivery_log` regardless of outcome.
 */
export async function sendTestEmail(): Promise<SendTestResult> {
  const session = await requireAdmin()
  const orgId = session.user.organizationId!
  const userEmail = session.user.email
  if (!userEmail) return { ok: false, error: 'Your account has no email address on file' }

  const settings = await db.query.emailSettings.findFirst({ where: eq(emailSettings.organizationId, orgId) })
  if (!settings) return { ok: false, error: 'No SMTP settings configured. Save settings first, then send a test email.' }

  const message = {
    to: userEmail,
    subject: 'GovEA SMTP test',
    body: 'This is a test email from your GovEA installation. If you received it, outbound email is configured correctly.',
  }
  const result = await sendMail(message, settings)

  // Record the attempt and prune to last 200 rows per org.
  await db.transaction(async (tx) => {
    await tx.insert(emailDeliveryLog).values({
      organizationId: orgId,
      toAddress: userEmail,
      subject: message.subject,
      status: result.ok ? 'sent' : 'failed',
      errorMessage: result.ok ? null : result.error,
      durationMs: result.durationMs,
      sentByUserId: session.user.id,
      isTest: true,
    })

    // Cheap retention pass — keep the most-recent 200 per org. Done in the
    // same transaction so test sends never balloon the log unboundedly.
    const total = await tx.select({ n: count() })
      .from(emailDeliveryLog)
      .where(eq(emailDeliveryLog.organizationId, orgId))
    const overflow = (total[0]?.n ?? 0) - 200
    if (overflow > 0) {
      // Find the createdAt threshold of the oldest row that should survive.
      const survivors = await tx.select({ createdAt: emailDeliveryLog.createdAt })
        .from(emailDeliveryLog)
        .where(eq(emailDeliveryLog.organizationId, orgId))
        .orderBy(desc(emailDeliveryLog.createdAt))
        .limit(200)
      const cutoff = survivors[survivors.length - 1]?.createdAt
      if (cutoff) {
        await tx.delete(emailDeliveryLog).where(lt(emailDeliveryLog.createdAt, cutoff))
      }
    }

    await writeAuditLog(tx, {
      action: 'email_settings.test_send',
      entityType: 'instance_settings',
      entityId: orgId,
      userId: session.user.id,
      organizationId: orgId,
      after: { to: userEmail, status: result.ok ? 'sent' : 'failed' },
    })
  })

  revalidatePath('/settings')
  return result.ok ? { ok: true, durationMs: result.durationMs } : { ok: false, error: result.error }
}

export type EmailDeliveryLogRow = {
  id: string
  toAddress: string
  subject: string
  status: 'sent' | 'failed'
  errorMessage: string | null
  durationMs: number | null
  isTest: boolean
  createdAt: Date
}

export async function getRecentEmailDeliveries(limit = 25): Promise<EmailDeliveryLogRow[]> {
  const session = await auth()
  if (!session?.user) redirect('/login')
  if (!isAdmin(session.user)) throw new Error('Forbidden')
  const orgId = session.user.organizationId!

  const rows = await db.select({
    id: emailDeliveryLog.id,
    toAddress: emailDeliveryLog.toAddress,
    subject: emailDeliveryLog.subject,
    status: emailDeliveryLog.status,
    errorMessage: emailDeliveryLog.errorMessage,
    durationMs: emailDeliveryLog.durationMs,
    isTest: emailDeliveryLog.isTest,
    createdAt: emailDeliveryLog.createdAt,
  })
    .from(emailDeliveryLog)
    .where(eq(emailDeliveryLog.organizationId, orgId))
    .orderBy(desc(emailDeliveryLog.createdAt))
    .limit(limit)
  return rows
}
