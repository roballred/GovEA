'use server'

import { db } from '@/db/client'
import { users, organizations, organizationSettings } from '@/db/schema'
import { count } from 'drizzle-orm'
import bcrypt from 'bcryptjs'
import { redirect } from 'next/navigation'
import { writeAuditLog } from '@/lib/audit'
// Import-light subpath — the @govcore/auth root pulls next-auth → next/server,
// which vitest can't resolve (see lib/password.ts). Setup runs before any org
// exists, so there's no per-org policy: core falls back to its minimum length.
import { validatePassword } from '@govcore/auth/password'

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

  const pwValidation = validatePassword(password)
  if (!pwValidation.valid) throw new Error(pwValidation.message)

  const passwordHash = await bcrypt.hash(password, 12)

  await db.transaction(async (tx) => {
    const [org] = await tx.insert(organizations).values({
      name: orgName,
      slug: orgName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, ''),
    }).returning()

    await tx.insert(organizationSettings).values({ organizationId: org.id })

    const [user] = await tx.insert(users).values({
      name,
      email,
      passwordHash,
      role: 'admin',
      organizationId: org.id,
      isActive: true,
    }).returning()

    await writeAuditLog(tx, {
      action: 'setup.complete',
      entityType: 'user',
      entityId: user.id,
      organizationId: org.id,
      after: { name: user.name, email: user.email, role: user.role },
    })
  })

  redirect('/login')
}
