import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { isInstanceAdmin } from '@/lib/rbac'
import { safeCallbackUrl } from '@/lib/auth-redirect'

// Role-aware post-signin bouncer (#520). Instance admins land on /instance;
// everyone else lands on /dashboard. An explicit, safe `callbackUrl` always
// wins over the role-based default.
export default async function AuthRedirectPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>
}) {
  const session = await auth()
  if (!session?.user) redirect('/login')

  const params = await searchParams
  if (params.callbackUrl) {
    const explicit = safeCallbackUrl(params.callbackUrl, '')
    if (explicit) redirect(explicit)
  }

  if (isInstanceAdmin(session.user)) redirect('/instance')
  redirect('/dashboard')
}
