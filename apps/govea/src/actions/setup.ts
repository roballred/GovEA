'use server'

import { db } from '@/db/client'
import { users, organizations } from '@/db/schema'
import { count } from 'drizzle-orm'
import bcrypt from 'bcryptjs'
import { redirect } from 'next/navigation'
import { writeAuditLog } from '@/lib/audit'

export async function isSetupComplete(): Promise<boolean> {
  const [result] = await db.select({ count: count() }).from(users)
  return result.count > 0
}

export async function runSetup(formData: FormData) {
  const setupDone = await isSetupComplete()
  if (setupDone) redirect('/login')

  const name = formData.get('name') as string
  const email = formData.get('email') as string
  const password = formData.get('password') as string
  const orgName = formData.get('orgName') as string

  if (!name || !email || !password || !orgName) {
    throw new Error('All fields are required')
  }

  const passwordHash = await bcrypt.hash(password, 12)

  const [org] = await db.insert(organizations).values({
    name: orgName,
    slug: orgName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, ''),
  }).returning()

  const [user] = await db.insert(users).values({
    name,
    email,
    passwordHash,
    role: 'admin',
    organizationId: org.id,
    isActive: 'true',
  }).returning()

  await writeAuditLog({
    action: 'setup.complete',
    entityType: 'user',
    entityId: user.id,
    organizationId: org.id,
    after: { name: user.name, email: user.email, role: user.role },
  })

  redirect('/login')
}
