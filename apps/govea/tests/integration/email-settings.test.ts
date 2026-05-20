/**
 * Integration tests: email settings server actions (#528)
 *
 * Covers:
 *  - saveEmailSettings: admin-only; validates required fields; encrypts
 *    password at-rest; idempotent update
 *  - getEmailSettingsForUi: password never round-trips as plaintext (only
 *    `passwordSet: boolean`); admin-only
 *  - sendTestEmail: records an attempt in emailDeliveryLog regardless of
 *    outcome; v1 transport returns the "not yet implemented" failure
 *  - isEmailConfigured: returns true after save, false before
 *  - getRecentEmailDeliveries: returns logged attempts, admin-only
 *  - Credential cipher: encrypt → decrypt round-trip works; sealed value
 *    looks nothing like the plaintext password
 */
import { vi, describe, it, expect, beforeAll, afterAll } from 'vitest'
import { db } from '@/db/client'
import { emailSettings, emailDeliveryLog } from '@/db/schema'
import { eq } from 'drizzle-orm'
import {
  saveEmailSettings, sendTestEmail, getEmailSettingsForUi,
  getRecentEmailDeliveries, isEmailConfigured,
} from '@/actions/email-settings'
import { encryptCredential, decryptCredential } from '@/lib/email/credential-cipher'
import {
  createTestOrg, createTestUser, cleanupOrg, makeSession, type TestUser,
} from './helpers/db'

const mockAuth = vi.hoisted(() => vi.fn())
vi.mock('@/lib/auth', () => ({ auth: mockAuth }))

function settingsForm(overrides: Record<string, string | undefined> = {}): FormData {
  const fd = new FormData()
  for (const [k, v] of Object.entries({
    host: 'smtp.example.com',
    port: '587',
    username: 'admin',
    password: 's3cret-password',
    tlsMode: 'starttls',
    fromName: 'GovEA Test',
    fromAddress: 'govea@example.com',
    enabled: 'on',
    ...overrides,
  })) {
    if (v !== undefined) fd.set(k, v)
  }
  return fd
}

describe('email settings (#528)', () => {
  let orgId: string
  let admin: TestUser
  let contributor: TestUser

  beforeAll(async () => {
    const org = await createTestOrg()
    orgId = org.id
    ;[admin, contributor] = await Promise.all([
      createTestUser(orgId, 'admin'), // factory generates a unique email
      createTestUser(orgId, 'contributor'),
    ])
  })

  afterAll(() => cleanupOrg(orgId))

  describe('credential cipher', () => {
    it('round-trips encrypted text', () => {
      const sealed = encryptCredential('s3cret-password')
      expect(sealed).not.toContain('s3cret')
      expect(decryptCredential(sealed)).toBe('s3cret-password')
    })

    it('produces different ciphertext for the same plaintext (random IV)', () => {
      const a = encryptCredential('same-plaintext')
      const b = encryptCredential('same-plaintext')
      expect(a).not.toBe(b)
      expect(decryptCredential(a)).toBe(decryptCredential(b))
    })
  })

  describe('saveEmailSettings', () => {
    it('rejects non-admin', async () => {
      mockAuth.mockResolvedValue(makeSession(contributor))
      await expect(saveEmailSettings(settingsForm())).rejects.toThrow('Forbidden')
    })

    it('admin can save initial settings', async () => {
      mockAuth.mockResolvedValue(makeSession(admin))
      const r = await saveEmailSettings(settingsForm())
      expect(r.ok).toBe(true)

      const row = await db.query.emailSettings.findFirst({ where: eq(emailSettings.organizationId, orgId) })
      expect(row).toBeDefined()
      expect(row?.host).toBe('smtp.example.com')
      expect(row?.port).toBe(587)
      expect(row?.passwordEncrypted).not.toBe('s3cret-password')
      expect(row?.passwordEncrypted).toBeTruthy()
      expect(decryptCredential(row!.passwordEncrypted!)).toBe('s3cret-password')
    })

    it('blank password keeps existing ciphertext on edit', async () => {
      mockAuth.mockResolvedValue(makeSession(admin))
      const before = await db.query.emailSettings.findFirst({ where: eq(emailSettings.organizationId, orgId) })
      const beforeCt = before?.passwordEncrypted
      const r = await saveEmailSettings(settingsForm({ host: 'smtp.changed.com', password: '' }))
      expect(r.ok).toBe(true)
      const after = await db.query.emailSettings.findFirst({ where: eq(emailSettings.organizationId, orgId) })
      expect(after?.host).toBe('smtp.changed.com')
      expect(after?.passwordEncrypted).toBe(beforeCt)
    })

    it('__clear__ password removes the credential', async () => {
      mockAuth.mockResolvedValue(makeSession(admin))
      const r = await saveEmailSettings(settingsForm({ password: '__clear__' }))
      expect(r.ok).toBe(true)
      const row = await db.query.emailSettings.findFirst({ where: eq(emailSettings.organizationId, orgId) })
      expect(row?.passwordEncrypted).toBeNull()
      // Restore so later tests have a stored password
      await saveEmailSettings(settingsForm({ password: 's3cret-password' }))
    })

    it('rejects invalid host / port / fromAddress', async () => {
      mockAuth.mockResolvedValue(makeSession(admin))
      const noHost = await saveEmailSettings(settingsForm({ host: '' }))
      expect(noHost).toEqual({ ok: false, error: expect.stringContaining('host') })
      const badPort = await saveEmailSettings(settingsForm({ port: '0' }))
      expect(badPort).toEqual({ ok: false, error: expect.stringContaining('Port') })
      const badEmail = await saveEmailSettings(settingsForm({ fromAddress: 'not-an-email' }))
      expect(badEmail).toEqual({ ok: false, error: expect.stringContaining('From address') })
    })
  })

  describe('getEmailSettingsForUi', () => {
    it('never returns the plaintext password — only passwordSet boolean', async () => {
      mockAuth.mockResolvedValue(makeSession(admin))
      const ui = await getEmailSettingsForUi()
      expect(ui).toBeDefined()
      // Confirm the UI shape has no `password` or `passwordEncrypted` keys
      expect(Object.keys(ui!)).not.toContain('password')
      expect(Object.keys(ui!)).not.toContain('passwordEncrypted')
      expect(ui!.passwordSet).toBe(true)
    })

    it('rejects non-admin', async () => {
      mockAuth.mockResolvedValue(makeSession(contributor))
      await expect(getEmailSettingsForUi()).rejects.toThrow('Forbidden')
    })
  })

  describe('isEmailConfigured', () => {
    it('returns true when settings exist for the org', async () => {
      expect(await isEmailConfigured(orgId)).toBe(true)
    })

    it('returns false for an org with no settings', async () => {
      const empty = await createTestOrg()
      expect(await isEmailConfigured(empty.id)).toBe(false)
      await cleanupOrg(empty.id)
    })
  })

  describe('sendTestEmail', () => {
    it('records an attempt in emailDeliveryLog with isTest=true and the v1 stub error', async () => {
      mockAuth.mockResolvedValue(makeSession(admin))
      const result = await sendTestEmail()
      // The v1 stub transport returns an explicit "not yet implemented" failure.
      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.error).toContain('SMTP transport not yet implemented')
      }

      const log = await db.select().from(emailDeliveryLog).where(eq(emailDeliveryLog.organizationId, orgId))
      const lastEntry = log[log.length - 1]
      expect(lastEntry.toAddress).toBe(admin.email)
      expect(lastEntry.isTest).toBe(true)
      expect(lastEntry.status).toBe('failed') // expected in v1 stub
    })

    it('returns a no-settings error when called before save', async () => {
      const empty = await createTestOrg()
      const emptyAdmin = await createTestUser(empty.id, 'admin') // factory generates a unique email
      mockAuth.mockResolvedValue(makeSession(emptyAdmin))
      const r = await sendTestEmail()
      expect(r.ok).toBe(false)
      if (!r.ok) expect(r.error).toContain('No SMTP settings configured')
      await cleanupOrg(empty.id)
    })

    it('rejects non-admin', async () => {
      mockAuth.mockResolvedValue(makeSession(contributor))
      await expect(sendTestEmail()).rejects.toThrow('Forbidden')
    })
  })

  describe('getRecentEmailDeliveries', () => {
    it('returns the recent log for the caller org', async () => {
      mockAuth.mockResolvedValue(makeSession(admin))
      const rows = await getRecentEmailDeliveries(10)
      expect(rows.length).toBeGreaterThan(0)
      // Sanity-check structure
      const r = rows[0]
      expect(r).toMatchObject({
        toAddress: expect.any(String),
        subject: expect.any(String),
        status: expect.stringMatching(/sent|failed/),
        isTest: expect.any(Boolean),
      })
    })

    it('rejects non-admin', async () => {
      mockAuth.mockResolvedValue(makeSession(contributor))
      await expect(getRecentEmailDeliveries()).rejects.toThrow('Forbidden')
    })
  })
})
