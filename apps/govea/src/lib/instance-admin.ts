'use server'

import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { isInstanceAdmin } from '@/lib/rbac'

export async function requireInstanceAdmin() {
  const session = await auth()
  if (!session?.user) redirect('/login')
  if (!isInstanceAdmin(session.user)) throw new Error('Forbidden')
  return session
}
