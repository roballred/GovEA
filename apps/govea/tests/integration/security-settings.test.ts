/**
 * Integration tests: per-org security settings (#527)
 *
 * Covers:
 *   - saveSecuritySettings clamps out-of-range values + persists JSONB
 *   - validatePassword honours each per-org rule (length, upper, lower, digit, special)
 *   - createUser / editUser enforce the org's policy
 *   - changeOwnPassword: requires current, validates new, updates timestamps + clears lockout
 *   - changeOwnPassword: rejects reuse of the same password
 *   - isPasswordExpired: 0 = disabled, threshold elapsed = expired, missing timestamp = expired
 *
 * Auth-callback lockout behaviour is exercised separately via a unit-style
 * test on validatePassword + getOrgSecuritySettings; the full NextAuth
 * authorize() path requires the full provider setup and isn't worth
 * mocking when the underlying logic is already covered.
 */
import { vi, describe, it, expect, beforeAll, afterAll } from 'vitest'
import { db } from '@/db/client'
import {
  organizations, users, auditLog,
  DEFAULT_SECURITY_SETTINGS,
} from '@/db/schema'
import { and, eq } from 'drizzle-orm'
import { randomUUID } from 'node:crypto'
import bcrypt from 'bcryptjs'
import { saveSecuritySettings, getSecuritySettingsForUi } from '@/actions/security-settings'
import { changeOwnPassword } from '@/actions/change-password'
import { createUser, editUser } from '@/actions/users'
import { validatePassword, FALLBACK_MIN_LENGTH } from '@/lib/password'
import { isPasswordExpired, mergeWithDefaults } from '@/lib/security-policy'
import {
  createTestOrg, createTestUser, cleanupOrg, makeSession, type TestUser,
} from './helpers/db'

const mockAuth = vi.hoisted(() => vi.fn())
vi.mock('@/lib/auth', () => ({ auth: mockAuth }))

function policyFormData(overrides: Partial<{
  passwordMinLength: number
  requireUppercase: 'on' | ''
  requireLowercase: 'on' | ''
  requireDigit: 'on' | ''
  requireSpecial: 'on' | ''
  sessionTimeoutMinutes: number
  lockoutThreshold: number
  lockoutDurationMinutes: number
  passwordExpiryDays: number
}> = {}) {
  const fd = new FormData()
  fd.set('passwordMinLength', String(overrides.passwordMinLength ?? 12))
  if (overrides.requireUppercase) fd.set('requireUppercase', overrides.requireUppercase)
  if (overrides.requireLowercase) fd.set('requireLowercase', overrides.requireLowercase)
  if (overrides.requireDigit) fd.set('requireDigit', overrides.requireDigit)
  if (overrides.requireSpecial) fd.set('requireSpecial', overrides.requireSpecial)
  fd.set('sessionTimeoutMinutes', String(overrides.sessionTimeoutMinutes ?? 60))
  fd.set('lockoutThreshold', String(overrides.lockoutThreshold ?? 5))
  fd.set('lockoutDurationMinutes', String(overrides.lockoutDurationMinutes ?? 30))
  fd.set('passwordExpiryDays', String(overrides.passwordExpiryDays ?? 0))
  return fd
}

describe('security settings (#527)', () => {
  let orgId: string
  let admin: TestUser
  let viewer: TestUser

  beforeAll(async () => {
    const org = await createTestOrg()
    orgId = org.id
    ;[admin, viewer] = await Promise.all([
      createTestUser(orgId, 'admin'),
      createTestUser(orgId, 'viewer'),
    ])
  })

  afterAll(() => cleanupOrg(orgId))

  // ── DEFAULT + merge behaviour ─────────────────────────────────────────────

  it('getSecuritySettingsForUi returns defaults for a fresh org', async () => {
    mockAuth.mockResolvedValue(makeSession(admin))
    const settings = await getSecuritySettingsForUi()
    expect(settings).toEqual(DEFAULT_SECURITY_SETTINGS)
  })

  it('mergeWithDefaults fills missing keys without overriding stored ones', () => {
    // Stored has only passwordMinLength; everything else should pick up defaults.
    const merged = mergeWithDefaults({ passwordMinLength: 16 } as unknown as ReturnType<typeof mergeWithDefaults>)
    expect(merged.passwordMinLength).toBe(16)
    expect(merged.requireUppercase).toBe(DEFAULT_SECURITY_SETTINGS.requireUppercase)
    expect(merged.lockoutThreshold).toBe(DEFAULT_SECURITY_SETTINGS.lockoutThreshold)
  })

  // ── Save + clamp ──────────────────────────────────────────────────────────

  it('saveSecuritySettings persists + clamps out-of-range values', async () => {
    mockAuth.mockResolvedValue(makeSession(admin))
    // Submit a deliberately hostile passwordMinLength of -1; expect clamp to 6.
    const fd = policyFormData({ passwordMinLength: -1, requireDigit: 'on', sessionTimeoutMinutes: 2 })
    await saveSecuritySettings(fd)
    const org = await db.query.organizations.findFirst({ where: eq(organizations.id, orgId) })
    expect(org?.securitySettings?.passwordMinLength).toBe(6)
    expect(org?.securitySettings?.requireDigit).toBe(true)
    expect(org?.securitySettings?.sessionTimeoutMinutes).toBe(5) // clamped from 2 → min 5
    const audit = await db.select().from(auditLog).where(and(
      eq(auditLog.entityId, orgId),
      eq(auditLog.action, 'security_settings.update'),
    ))
    expect(audit.length).toBeGreaterThan(0)
  })

  it('saveSecuritySettings rejects non-admin callers', async () => {
    mockAuth.mockResolvedValue(makeSession(viewer))
    await expect(saveSecuritySettings(policyFormData())).rejects.toThrow(/Forbidden/i)
  })

  // ── validatePassword honours per-org policy ───────────────────────────────

  it('validatePassword: each rule fires the right error message', () => {
    const strict = {
      passwordMinLength: 12,
      requireUppercase: true,
      requireLowercase: true,
      requireDigit: true,
      requireSpecial: true,
      sessionTimeoutMinutes: 60,
      lockoutThreshold: 5,
      lockoutDurationMinutes: 30,
      passwordExpiryDays: 0,
    }
    expect(validatePassword('', strict)).toMatchObject({ valid: false })
    expect(validatePassword('Short1!', strict)).toMatchObject({ valid: false, message: expect.stringMatching(/12/) })
    expect(validatePassword('alllowercase1!', strict)).toMatchObject({ valid: false, message: expect.stringMatching(/uppercase/i) })
    expect(validatePassword('ALLUPPERCASE1!', strict)).toMatchObject({ valid: false, message: expect.stringMatching(/lowercase/i) })
    expect(validatePassword('NoDigitsHerePlease!', strict)).toMatchObject({ valid: false, message: expect.stringMatching(/digit/i) })
    expect(validatePassword('NoSpecials12345', strict)).toMatchObject({ valid: false, message: expect.stringMatching(/special/i) })
    expect(validatePassword('ValidPass1!xyz', strict)).toEqual({ valid: true })
  })

  it('validatePassword without policy uses FALLBACK_MIN_LENGTH only', () => {
    expect(FALLBACK_MIN_LENGTH).toBe(8)
    expect(validatePassword('abcdefgh')).toEqual({ valid: true })
    expect(validatePassword('short')).toMatchObject({ valid: false })
    // Without a policy, no complexity rules fire — same as pre-#527.
    expect(validatePassword('lowercase-only-no-digits')).toEqual({ valid: true })
  })

  // ── createUser + editUser enforce the org policy ──────────────────────────

  it('createUser rejects a password that violates the saved policy', async () => {
    // Org policy already requires digits (set above).
    mockAuth.mockResolvedValue(makeSession(admin))
    const fd = new FormData()
    fd.set('name', 'New User')
    fd.set('email', `noviolate-${randomUUID().slice(0, 6)}@test.example`)
    fd.set('password', 'lowercase-but-no-digit')
    fd.set('role', 'viewer')
    await expect(createUser(fd)).rejects.toThrow(/digit/i)
  })

  it('admin editUser password reset clears lockout + resets timestamp', async () => {
    // Seed: put viewer into a locked-out state with old password.
    const lockUntil = new Date(Date.now() + 60_000)
    await db.update(users).set({
      failedLoginAttempts: 5,
      lockoutUntil: lockUntil,
      lastPasswordChangedAt: new Date('2024-01-01'),
    }).where(eq(users.id, viewer.id))

    mockAuth.mockResolvedValue(makeSession(admin))
    const fd = new FormData()
    fd.set('name', viewer.name)
    fd.set('email', viewer.email)
    fd.set('role', 'viewer')
    fd.set('password', 'BrandNewPassword123!')
    await editUser(viewer.id, fd)

    const after = await db.query.users.findFirst({ where: eq(users.id, viewer.id) })
    expect(after?.failedLoginAttempts).toBe(0)
    expect(after?.lockoutUntil).toBeNull()
    expect(after?.lastPasswordChangedAt && after.lastPasswordChangedAt > new Date('2024-12-01')).toBe(true)
  })

  // ── Self-service change password ─────────────────────────────────────────

  it('changeOwnPassword: wrong current password is rejected, attempt is audited', async () => {
    // Set a known password for viewer.
    const hash = await bcrypt.hash('CurrentPass1234!', 12)
    await db.update(users).set({ passwordHash: hash }).where(eq(users.id, viewer.id))

    mockAuth.mockResolvedValue(makeSession(viewer))
    const fd = new FormData()
    fd.set('currentPassword', 'wrong')
    fd.set('newPassword', 'NewPass1234567!')
    fd.set('confirmPassword', 'NewPass1234567!')
    const result = await changeOwnPassword(fd)
    expect(result.ok).toBe(false)

    const audit = await db.select().from(auditLog).where(and(
      eq(auditLog.entityId, viewer.id),
      eq(auditLog.action, 'auth.password_change_failed'),
    ))
    expect(audit.length).toBeGreaterThan(0)
  })

  it('changeOwnPassword: mismatched confirmation rejected', async () => {
    mockAuth.mockResolvedValue(makeSession(viewer))
    const fd = new FormData()
    fd.set('currentPassword', 'CurrentPass1234!')
    fd.set('newPassword', 'NewPassA1234567!')
    fd.set('confirmPassword', 'DifferentPass!')
    const result = await changeOwnPassword(fd)
    expect(result.ok).toBe(false)
    expect((result as { message: string }).message).toMatch(/do not match/i)
  })

  it('changeOwnPassword: reusing the same password is rejected', async () => {
    mockAuth.mockResolvedValue(makeSession(viewer))
    const fd = new FormData()
    fd.set('currentPassword', 'CurrentPass1234!')
    fd.set('newPassword', 'CurrentPass1234!')
    fd.set('confirmPassword', 'CurrentPass1234!')
    const result = await changeOwnPassword(fd)
    expect(result.ok).toBe(false)
    expect((result as { message: string }).message).toMatch(/different/i)
  })

  it('changeOwnPassword: success updates lastPasswordChangedAt + clears lockout state', async () => {
    // Re-set viewer's password to a known state, then lock them out.
    const hash = await bcrypt.hash('CurrentPass1234!', 12)
    await db.update(users)
      .set({ passwordHash: hash, failedLoginAttempts: 3, lockoutUntil: new Date(Date.now() + 60_000), lastPasswordChangedAt: new Date('2024-01-01') })
      .where(eq(users.id, viewer.id))

    mockAuth.mockResolvedValue(makeSession(viewer))
    const fd = new FormData()
    fd.set('currentPassword', 'CurrentPass1234!')
    fd.set('newPassword', 'BrandNewPassword1!')
    fd.set('confirmPassword', 'BrandNewPassword1!')
    const result = await changeOwnPassword(fd)
    expect(result.ok).toBe(true)

    const after = await db.query.users.findFirst({ where: eq(users.id, viewer.id) })
    expect(after?.failedLoginAttempts).toBe(0)
    expect(after?.lockoutUntil).toBeNull()
    expect(after?.lastPasswordChangedAt && after.lastPasswordChangedAt > new Date('2024-12-01')).toBe(true)
    // Bcrypt comparison should succeed against the new password.
    expect(await bcrypt.compare('BrandNewPassword1!', after!.passwordHash!)).toBe(true)
  })

  // ── isPasswordExpired ────────────────────────────────────────────────────

  it('isPasswordExpired: 0 days = always not expired', () => {
    expect(isPasswordExpired(new Date('2000-01-01'), 0)).toBe(false)
    expect(isPasswordExpired(null, 0)).toBe(false)
  })

  it('isPasswordExpired: threshold elapsed → expired', () => {
    const fortyDaysAgo = new Date(Date.now() - 40 * 24 * 60 * 60 * 1000)
    expect(isPasswordExpired(fortyDaysAgo, 30)).toBe(true)
    expect(isPasswordExpired(fortyDaysAgo, 90)).toBe(false)
  })

  it('isPasswordExpired: missing timestamp treated as expired (strict)', () => {
    expect(isPasswordExpired(null, 30)).toBe(true)
    expect(isPasswordExpired(undefined, 30)).toBe(true)
  })
})
