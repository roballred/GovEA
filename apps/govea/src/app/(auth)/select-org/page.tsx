import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { isInstanceAdmin } from '@/lib/rbac'
import { defaultLandingPath } from '@/lib/auth-redirect'
import { getMyActiveOrganizations } from '@/actions/active-org'
import { OrgSelectList } from '@/components/org-select-list'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

/**
 * Post-login organization choice for multi-org users (#800).
 *
 * The /auth-redirect bouncer sends users here when they hold more than one
 * active membership; everyone else never sees this page (and navigating here
 * directly with a single membership redirects straight to the landing).
 * Selection reuses the org switcher's server-authoritative mechanics.
 */
export default async function SelectOrgPage() {
  const session = await auth()
  if (!session?.user) redirect('/login')

  const organizations = await getMyActiveOrganizations()
  if (organizations.length <= 1) {
    redirect(defaultLandingPath({
      role: session.user.role,
      isInstanceAdmin: isInstanceAdmin(session.user),
    }))
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/30">
      <Card className="w-full max-w-md shadow-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold">Choose your organization</CardTitle>
          <p className="text-sm text-muted-foreground">
            You belong to {organizations.length} organizations. Pick the workspace
            to open — you can switch any time from the header.
          </p>
        </CardHeader>
        <CardContent>
          <OrgSelectList organizations={organizations} />
        </CardContent>
      </Card>
    </main>
  )
}
