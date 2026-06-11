import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { SignOutButton } from '@/components/sign-out-button'
import { db } from '@/db/client'
import { organizations } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { getTheme, themeToStyleString } from '@/lib/themes'
import type { Role } from '@/lib/rbac'
import { isInstanceAdmin } from '@/lib/rbac'
import { AppShell } from '@/components/app-shell'
import { AdminNoticeBanner } from '@/components/admin-notice-banner'
import { getCurrentModuleSettings } from '@/lib/get-enabled-modules'
import { getMyUnreadCount } from '@/actions/notifications'
import { getMyActiveOrganizations } from '@/actions/active-org'
import { OrgSwitcher } from '@/components/org-switcher'

const ROLE_BADGE_CLASS: Record<Role, string> = {
  admin: 'bg-violet-100 text-violet-800 border-violet-200',
  contributor: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  viewer: 'bg-slate-100 text-slate-700 border-slate-200',
}

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session?.user) redirect('/login')

  const role = session.user.role

  // Unread notification count for the nav badge (#581). Fetched at the
  // layout level so the badge is up-to-date on every navigation; the
  // /notifications page itself revalidates this path after mark-read.
  const unreadNotificationCount = await getMyUnreadCount()

  // #693 slice 3b — active-org switcher data. Component self-hides for
  // single-membership users, so this is a no-op cost for the common case.
  const myOrganizations = await getMyActiveOrganizations()

  // Load org settings (theme + enabled modules)
  let themeStyle = ''
  let enabledModules: Record<string, boolean> = {}
  if (session.user.organizationId) {
    const [org, moduleSettings] = await Promise.all([
      db.query.organizations.findFirst({
        where: eq(organizations.id, session.user.organizationId),
      }),
      getCurrentModuleSettings(),
    ])
    if (org) {
      const theme = getTheme(org.theme)
      themeStyle = themeToStyleString(theme)
      enabledModules = moduleSettings.effectiveEnabledModules
    }
  }

  // Sign-out posts to a deploy-stable route handler (#759) — passed as a
  // slot to the client shell.
  const signOutSlot = <SignOutButton />

  return (
    <AppShell
      role={role}
      email={session.user.email ?? ''}
      roleBadgeClass={ROLE_BADGE_CLASS[role]}
      themeStyle={themeStyle}
      isInstanceAdmin={isInstanceAdmin(session.user)}
      enabledModules={enabledModules}
      unreadNotificationCount={unreadNotificationCount}
      orgSwitcherSlot={<OrgSwitcher orgs={myOrganizations} />}
      signOutSlot={signOutSlot}
    >
      {session.user.organizationId && (
        <AdminNoticeBanner orgId={session.user.organizationId} />
      )}
      {children}
    </AppShell>
  )
}
