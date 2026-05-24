import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { isInstanceAdmin } from '@/lib/rbac'
import { safeCallbackUrl, defaultLandingPath } from '@/lib/auth-redirect'

/**
 * Role-aware post-signin bouncer.
 *
 * Routing order:
 *   1. An explicit, safe `callbackUrl` always wins (preserves deep-links).
 *   2. Otherwise, fall back to `defaultLandingPath(role, isInstanceAdmin)`
 *      — see that helper for the role-based routing rule.
 */
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

  redirect(defaultLandingPath({
    role: session.user.role,
    isInstanceAdmin: isInstanceAdmin(session.user),
  }))
}
