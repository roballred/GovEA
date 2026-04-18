/**
 * Integration tests: settings server actions
 *
 * Covers:
 *  - Role enforcement (admin only for setModuleEnabled / updateOrgTheme)
 *  - Correct DB mutation
 *  - Audit log written with accurate before/after state
 *  - Invalid input rejection
 */
import { vi, describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { setModuleEnabled, updateOrgTheme } from '@/actions/settings'
import {
  createTestOrg, createTestUser, cleanupOrg,
  makeSession, findOrg, getAuditLogs,
  type TestUser,
} from './helpers/db'

const mockAuth = vi.hoisted(() => vi.fn())
vi.mock('@/lib/auth', () => ({ auth: mockAuth }))

describe('settings / setModuleEnabled', () => {
  let orgId: string
  let admin: TestUser
  let contributor: TestUser
  let viewer: TestUser

  beforeAll(async () => {
    const org = await createTestOrg()
    orgId = org.id
    ;[admin, contributor, viewer] = await Promise.all([
      createTestUser(orgId, 'admin'),
      createTestUser(orgId, 'contributor'),
      createTestUser(orgId, 'viewer'),
    ])
  })

  afterAll(() => cleanupOrg(orgId))

  beforeEach(() => {
    mockAuth.mockResolvedValue(makeSession(admin))
  })

  // ── Happy path ─────────────────────────────────────────────────────────────

  it('admin can disable a module', async () => {
    await setModuleEnabled('personas', false)
    const org = await findOrg(orgId)
    expect(org?.enabledModules?.['personas']).toBe(false)
  })

  it('admin can re-enable a disabled module', async () => {
    await setModuleEnabled('personas', false)
    await setModuleEnabled('personas', true)
    const org = await findOrg(orgId)
    expect(org?.enabledModules?.['personas']).toBe(true)
  })

  it('toggling one module does not affect others', async () => {
    await setModuleEnabled('capabilities', false)
    await setModuleEnabled('personas', false)
    await setModuleEnabled('personas', true)

    const org = await findOrg(orgId)
    // personas re-enabled, capabilities still off
    expect(org?.enabledModules?.['personas']).toBe(true)
    expect(org?.enabledModules?.['capabilities']).toBe(false)

    // Restore
    await setModuleEnabled('capabilities', true)
  })

  // ── Audit logging ──────────────────────────────────────────────────────────

  it('writes an audit log entry with correct before/after state', async () => {
    const before = await getAuditLogs(orgId, 'settings.module_toggled')
    await setModuleEnabled('roadmap', false)
    const after = await getAuditLogs(orgId, 'settings.module_toggled')

    expect(after).toHaveLength(before.length + 1)

    const entry = after[after.length - 1]
    expect(entry.action).toBe('settings.module_toggled')
    expect(entry.userId).toBe(admin.id)
    expect(entry.organizationId).toBe(orgId)
    expect(entry.entityId).toBe(orgId)
    // roadmap was absent (= on), so before snapshot reflects that
    expect(entry.before).toMatchObject({ roadmap: true })
    expect(entry.after).toMatchObject({ roadmap: false })
  })

  it('records before=true for keys not yet in enabledModules (absent-key semantics)', async () => {
    // glossary should not yet be in the record for a fresh test org
    const org = await findOrg(orgId)
    expect(org?.enabledModules?.['glossary']).toBeUndefined()

    const _before = await getAuditLogs(orgId, 'settings.module_toggled')
    await setModuleEnabled('glossary', false)
    const after = await getAuditLogs(orgId, 'settings.module_toggled')

    const entry = after[after.length - 1]
    expect(entry.before).toMatchObject({ glossary: true }) // absent = true
    expect(entry.after).toMatchObject({ glossary: false })
  })

  // ── Role enforcement ───────────────────────────────────────────────────────

  it('contributor cannot toggle modules → throws Forbidden', async () => {
    mockAuth.mockResolvedValue(makeSession(contributor))
    await expect(setModuleEnabled('personas', false)).rejects.toThrow('Forbidden')
  })

  it('viewer cannot toggle modules → throws Forbidden', async () => {
    mockAuth.mockResolvedValue(makeSession(viewer))
    await expect(setModuleEnabled('personas', false)).rejects.toThrow('Forbidden')
  })

  it('unauthenticated call redirects to /login', async () => {
    mockAuth.mockResolvedValue(null)
    await expect(setModuleEnabled('personas', false)).rejects.toThrow(/REDIRECT:\/login/)
  })

  // ── Input validation ───────────────────────────────────────────────────────

  it('unknown module key is rejected', async () => {
    await expect(setModuleEnabled('totally-made-up' as never, false)).rejects.toThrow('Unknown module')
  })
})

describe('settings / updateOrgTheme', () => {
  let orgId: string
  let admin: TestUser
  let contributor: TestUser

  beforeAll(async () => {
    const org = await createTestOrg()
    orgId = org.id
    ;[admin, contributor] = await Promise.all([
      createTestUser(orgId, 'admin'),
      createTestUser(orgId, 'contributor'),
    ])
  })

  afterAll(() => cleanupOrg(orgId))

  it('admin can update the org theme', async () => {
    mockAuth.mockResolvedValue(makeSession(admin))
    await updateOrgTheme('servicenow')

    const org = await findOrg(orgId)
    expect(org?.theme).toBe('servicenow')
  })

  it('contributor cannot update theme → throws Forbidden', async () => {
    mockAuth.mockResolvedValue(makeSession(contributor))
    await expect(updateOrgTheme('servicenow')).rejects.toThrow('Forbidden')
  })
})
