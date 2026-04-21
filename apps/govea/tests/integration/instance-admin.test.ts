/**
 * Integration tests: requireInstanceAdmin guard (#239)
 *
 * Verifies that:
 * - An authenticated instance_admin user passes the guard
 * - An org-scoped admin is rejected (Forbidden)
 * - A contributor is rejected
 * - A viewer is rejected
 * - An unauthenticated request redirects to /login
 */
import { vi, describe, it, expect, beforeAll, afterAll } from 'vitest'
import { requireInstanceAdmin } from '@/lib/instance-admin'
import { createTestOrg, createTestUser, cleanupOrg, makeSession, type TestUser } from './helpers/db'

const mockAuth = vi.hoisted(() => vi.fn())
vi.mock('@/lib/auth', () => ({ auth: mockAuth }))

const mockRedirect = vi.hoisted(() => vi.fn((url: string): never => { throw new Error(`REDIRECT:${url}`) }))
vi.mock('next/navigation', () => ({ redirect: mockRedirect }))

describe('requireInstanceAdmin', () => {
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

  it('allows a user with instanceRole=instance_admin', async () => {
    mockAuth.mockResolvedValue(makeSession(admin, { instanceRole: 'instance_admin' }))
    const session = await requireInstanceAdmin()
    expect(session.user.instanceRole).toBe('instance_admin')
  })

  it('throws Forbidden for an org-scoped admin', async () => {
    mockAuth.mockResolvedValue(makeSession(admin))
    await expect(requireInstanceAdmin()).rejects.toThrow('Forbidden')
  })

  it('throws Forbidden for a contributor', async () => {
    mockAuth.mockResolvedValue(makeSession(contributor))
    await expect(requireInstanceAdmin()).rejects.toThrow('Forbidden')
  })

  it('throws Forbidden for a viewer', async () => {
    mockAuth.mockResolvedValue(makeSession(viewer))
    await expect(requireInstanceAdmin()).rejects.toThrow('Forbidden')
  })

  it('redirects to /login when unauthenticated', async () => {
    mockAuth.mockResolvedValue(null)
    await expect(requireInstanceAdmin()).rejects.toThrow('REDIRECT:/login')
  })
})
