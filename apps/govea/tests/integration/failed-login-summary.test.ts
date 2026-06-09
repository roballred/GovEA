/**
 * Integration tests: getFailedLoginSummary (#720 slice 2 / #726)
 *
 * Aggregates failed-login telemetry (slice 1) by attempted email and by source
 * IP for instance-admin security review. Uses unique email/IP markers per run
 * so assertions target only this test's rows — audit_log is append-only
 * (immutability triggers block DELETE), so inserted rows aren't cleaned up.
 */
import { describe, it, expect, beforeAll } from 'vitest'
import { randomUUID } from 'node:crypto'
import { db } from '@/db/client'
import { auditLog } from '@/db/schema'
import { getFailedLoginSummary } from '@/lib/audit-view'

const tag = randomUUID().slice(0, 8)
const E1 = `e1-${tag}@attack.example`
const E2 = `e2-${tag}@attack.example`
const I1 = `198.51.100.${(parseInt(tag, 16) % 200) + 1}`
const I2 = `203.0.113.${(parseInt(tag.slice(1), 16) % 200) + 1}`

async function failRow(email: string, ip: string, createdAt?: Date) {
  await db.insert(auditLog).values({
    action: 'auth.login_failed',
    entityType: 'user',
    organizationId: null,
    metadata: { email, ip, reason: 'invalid_credentials', provider: 'local' },
    ...(createdAt ? { createdAt } : {}),
  })
}

describe('getFailedLoginSummary (#720 slice 2)', () => {
  beforeAll(async () => {
    // E1: 3 recent attempts from 2 IPs (I1 x2, I2 x1)
    await failRow(E1, I1)
    await failRow(E1, I1)
    await failRow(E1, I2)
    // E2: 1 recent attempt from I1
    await failRow(E2, I1)
    // An old E1/I1 attempt outside a 1-day window (must be excluded)
    await failRow(E1, I1, new Date(Date.now() - 30 * 24 * 60 * 60 * 1000))
  })

  it('groups by attempted email with attempt count + distinct IPs (windowed)', async () => {
    const { byEmail } = await getFailedLoginSummary({ sinceDays: 1, limit: 500 })
    const e1 = byEmail.find(r => r.email === E1)
    const e2 = byEmail.find(r => r.email === E2)
    expect(e1).toBeDefined()
    expect(e1!.attempts).toBe(3)        // old 30-day row excluded by the window
    expect(e1!.distinctIps).toBe(2)
    expect(e1!.lastAttempt).toBeTruthy()
    expect(e2!.attempts).toBe(1)
    expect(e2!.distinctIps).toBe(1)
  })

  it('groups by source IP with attempt count + distinct emails', async () => {
    const { byIp } = await getFailedLoginSummary({ sinceDays: 1, limit: 500 })
    const i1 = byIp.find(r => r.ip === I1)
    expect(i1).toBeDefined()
    expect(i1!.attempts).toBe(3)        // E1 x2 + E2 x1 within window
    expect(i1!.distinctEmails).toBe(2)  // E1 and E2
  })

  it('respects the time window (wide window includes the old attempt)', async () => {
    // 1-day window saw 3 (test above); a 60-day window also includes the
    // 30-day-old E1/I1 attempt → 4. Proves the window boundary actually filters.
    const { byEmail } = await getFailedLoginSummary({ sinceDays: 60, limit: 500 })
    const e1 = byEmail.find(r => r.email === E1)
    expect(e1).toBeDefined()
    expect(e1!.attempts).toBe(4)
  })
})
