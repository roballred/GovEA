'use server'

import { db } from '@/db/client'
import { users } from '@/db/schema'
import { eq, and, count } from 'drizzle-orm'
import bcrypt from 'bcryptjs'
import { auth } from '@/lib/auth'
import { isAdmin } from '@/lib/rbac'
import { writeAuditLog } from '@/lib/audit'
import { validatePassword } from '@/lib/password'
import { getOrgSecuritySettings } from '@/lib/security-policy'
import { redirect } from 'next/navigation'

async function requireAdmin() {
  const session = await auth()
  if (!session?.user) redirect('/login')
  if (!isAdmin(session.user)) throw new Error('Forbidden')
  return session
}

export async function getUsers() {
  const session = await requireAdmin()
  const orgId = session.user.organizationId!

  return db.query.users.findMany({
    where: eq(users.organizationId, orgId),
    columns: {
      id: true,
      name: true,
      email: true,
      role: true,
      isActive: true,
    },
    orderBy: (u, { asc }) => [asc(u.name)],
  })
}

export async function createUser(formData: FormData) {
  const session = await requireAdmin()
  const orgId = session.user.organizationId!

  const name = formData.get('name') as string
  const email = formData.get('email') as string
  const password = formData.get('password') as string
  const role = formData.get('role') as 'admin' | 'contributor' | 'viewer'

  const policy = await getOrgSecuritySettings(orgId)
  const pwValidation = validatePassword(password, policy)
  if (!pwValidation.valid) throw new Error(pwValidation.message)

  // Guard against duplicate email across orgs (users.email is globally unique, #269)
  const existing = await db.query.users.findFirst({ where: eq(users.email, email) })
  if (existing) throw new Error('A user with that email address already exists.')

  const passwordHash = await bcrypt.hash(password, 12)
  await db.transaction(async (tx) => {
    const [user] = await tx.insert(users).values({
      name, email, passwordHash, role,
      organizationId: orgId,
      isActive: 'true',
    }).returning()

    await writeAuditLog(tx, {
      action: 'user.create',
      entityType: 'user',
      entityId: user.id,
      userId: session.user.id,
      organizationId: orgId,
      after: { name, email, role },
    })
  })
}

export async function updateUserRole(userId: string, role: 'admin' | 'contributor' | 'viewer') {
  const session = await requireAdmin()
  const orgId = session.user.organizationId!

  const before = await db.query.users.findFirst({ where: eq(users.id, userId) })
  await db.transaction(async (tx) => {
    await tx.update(users).set({ role, updatedAt: new Date() }).where(
      and(eq(users.id, userId), eq(users.organizationId, orgId))
    )

    await writeAuditLog(tx, {
      action: 'user.role_changed',
      entityType: 'user',
      entityId: userId,
      userId: session.user.id,
      organizationId: orgId,
      before: { role: before?.role },
      after: { role },
    })
  })
}

export async function deactivateUser(userId: string) {
  const session = await requireAdmin()
  const orgId = session.user.organizationId!

  const [adminCount] = await db.select({ count: count() }).from(users).where(
    and(eq(users.organizationId, orgId), eq(users.role, 'admin'), eq(users.isActive, 'true'))
  )
  const target = await db.query.users.findFirst({ where: eq(users.id, userId) })
  if (target?.role === 'admin' && adminCount.count <= 1) {
    throw new Error('Cannot deactivate the last admin')
  }

  await db.transaction(async (tx) => {
    await tx.update(users).set({ isActive: 'false', updatedAt: new Date() }).where(
      and(eq(users.id, userId), eq(users.organizationId, orgId))
    )

    await writeAuditLog(tx, {
      action: 'user.deactivate',
      entityType: 'user',
      entityId: userId,
      userId: session.user.id,
      organizationId: orgId,
    })
  })
}

export async function deleteUser(userId: string) {
  const session = await requireAdmin()
  const orgId = session.user.organizationId!

  const [adminCount] = await db.select({ count: count() }).from(users).where(
    and(eq(users.organizationId, orgId), eq(users.role, 'admin'))
  )
  const target = await db.query.users.findFirst({ where: eq(users.id, userId) })
  if (target?.role === 'admin' && adminCount.count <= 1) {
    throw new Error('Cannot delete the last admin')
  }

  await db.transaction(async (tx) => {
    await tx.delete(users).where(and(eq(users.id, userId), eq(users.organizationId, orgId)))

    await writeAuditLog(tx, {
      action: 'user.delete',
      entityType: 'user',
      entityId: userId,
      userId: session.user.id,
      organizationId: orgId,
      before: { name: target?.name, email: target?.email },
    })
  })
}

export async function reactivateUser(userId: string) {
  const session = await requireAdmin()
  const orgId = session.user.organizationId!

  await db.transaction(async (tx) => {
    await tx.update(users).set({ isActive: 'true', updatedAt: new Date() }).where(
      and(eq(users.id, userId), eq(users.organizationId, orgId))
    )

    await writeAuditLog(tx, {
      action: 'user.reactivate',
      entityType: 'user',
      entityId: userId,
      userId: session.user.id,
      organizationId: orgId,
    })
  })
}

export async function editUser(userId: string, formData: FormData) {
  const session = await requireAdmin()
  const orgId = session.user.organizationId!

  const name = formData.get('name') as string
  const email = formData.get('email') as string
  const role = formData.get('role') as 'admin' | 'contributor' | 'viewer'
  const newPassword = formData.get('password') as string | null

  const before = await db.query.users.findFirst({ where: eq(users.id, userId) })

  // Guard against duplicate email across orgs when email is being changed (#269)
  if (email !== before?.email) {
    const existing = await db.query.users.findFirst({ where: eq(users.email, email) })
    if (existing) throw new Error('A user with that email address already exists.')
  }

  // Last-admin guard for role demotion
  if (before?.role === 'admin' && role !== 'admin') {
    const [adminCount] = await db.select({ count: count() }).from(users).where(
      and(eq(users.organizationId, orgId), eq(users.role, 'admin'), eq(users.isActive, 'true'))
    )
    if (adminCount.count <= 1) throw new Error('Cannot demote the last admin')
  }

  const updates: Partial<typeof users.$inferInsert> = {
    name,
    email,
    role,
    updatedAt: new Date(),
  }

  if (newPassword) {
    const policy = await getOrgSecuritySettings(orgId)
    const pwValidation = validatePassword(newPassword, policy)
    if (!pwValidation.valid) throw new Error(pwValidation.message)
    updates.passwordHash = await bcrypt.hash(newPassword, 12)
    // #527 — reset password-change clock + clear lockout state when an
    // admin resets a user's password. Mirrors the self-service path.
    updates.lastPasswordChangedAt = new Date()
    updates.failedLoginAttempts = 0
    updates.lockoutUntil = null
  }

  await db.transaction(async (tx) => {
    await tx.update(users).set(updates).where(
      and(eq(users.id, userId), eq(users.organizationId, orgId))
    )

    await writeAuditLog(tx, {
      action: 'user.edit',
      entityType: 'user',
      entityId: userId,
      userId: session.user.id,
      organizationId: orgId,
      before: { name: before?.name, email: before?.email, role: before?.role },
      after: { name, email, role },
    })
  })
}
