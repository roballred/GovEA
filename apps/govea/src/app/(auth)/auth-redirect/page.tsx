import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { isInstanceAdmin } from '@/lib/rbac'
import { safeCallbackUrl, postLoginDestination } from '@/lib/auth-redirect'
import { getMyActiveOrganizations } from '@/actions/active-org'

/**
 * Role-aware post-signin bouncer.
 *
 * Routing order:
 *   1. An explicit, safe `callbackUrl` always wins (preserves deep-links).
 *   2. Multi-org users choose their workspace on /select-org (#800).
 *   3. Otherwise, fall back to the role-based landing — see
 *      `postLoginDestination` for the rule.
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

  const memberships = await getMyActiveOrganizations()
  redirect(postLoginDestination({
    role: session.user.role,
    isInstanceAdmin: isInstanceAdmin(session.user),
    activeMembershipCount: memberships.length,
  }))
}
