'use server'

import { db } from '@/db/client'
import { users } from '@/db/schema'
import { eq, and, count } from 'drizzle-orm'
import bcrypt from 'bcryptjs'
import { auth } from '@/lib/auth'
import { isAdmin } from '@/lib/rbac'
import { writeAuditLog } from '@/lib/audit'
import { redirect } from 'next/navigation'

async function requireAdmin() {
  const session = await auth()
  if (!session?.user) redirect('/login')
  if (!isAdmin(session.user as any)) throw new Error('Forbidden')
  return session
}

export async function getUsers(organizationId: string) {
  return db.query.users.findMany({
    where: eq(users.organizationId, organizationId),
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

  const passwordHash = await bcrypt.hash(password, 12)
  const [user] = await db.insert(users).values({
    name, email, passwordHash, role,
    organizationId: orgId,
    isActive: 'true',
  }).returning()

  await writeAuditLog({
    action: 'user.create',
    entityType: 'user',
    entityId: user.id,
    userId: session.user.id,
    organizationId: orgId,
    after: { name, email, role },
  })
}

export async function updateUserRole(userId: string, role: 'admin' | 'contributor' | 'viewer') {
  const session = await requireAdmin()
  const orgId = session.user.organizationId!

  const before = await db.query.users.findFirst({ where: eq(users.id, userId) })
  await db.update(users).set({ role, updatedAt: new Date() }).where(
    and(eq(users.id, userId), eq(users.organizationId, orgId))
  )

  await writeAuditLog({
    action: 'user.role_changed',
    entityType: 'user',
    entityId: userId,
    userId: session.user.id,
    organizationId: orgId,
    before: { role: before?.role },
    after: { role },
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

  await db.update(users).set({ isActive: 'false', updatedAt: new Date() }).where(
    and(eq(users.id, userId), eq(users.organizationId, orgId))
  )

  await writeAuditLog({
    action: 'user.deactivate',
    entityType: 'user',
    entityId: userId,
    userId: session.user.id,
    organizationId: orgId,
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

  await db.delete(users).where(and(eq(users.id, userId), eq(users.organizationId, orgId)))

  await writeAuditLog({
    action: 'user.delete',
    entityType: 'user',
    entityId: userId,
    userId: session.user.id,
    organizationId: orgId,
    before: { name: target?.name, email: target?.email },
  })
}
