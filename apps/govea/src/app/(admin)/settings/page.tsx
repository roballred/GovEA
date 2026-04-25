import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { db } from '@/db/client'
import { organizations } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { ThemeSelector } from '@/components/theme-selector'
import { ModuleToggles } from '@/components/module-toggles'
import { FrameworkToggles } from '@/components/framework-toggles'
import { isAdmin } from '@/lib/rbac'

export default async function SettingsPage() {
  const session = await auth()
  if (!session?.user) redirect('/login')
  if (!isAdmin(session.user)) redirect('/dashboard')

  const org = session.user.organizationId
    ? await db.query.organizations.findFirst({
        where: eq(organizations.id, session.user.organizationId),
      })
    : null

  const activeTheme = org?.theme ?? 'govea'
  const enabledModules = org?.enabledModules ?? {}

  return (
    <div className="space-y-8 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground mt-1">Organization configuration and preferences.</p>
      </div>

      <section className="space-y-4">
        <div>
          <h2 className="text-base font-semibold">Appearance</h2>
          <p className="text-sm text-muted-foreground mt-0.5">Choose a theme for your organization.</p>
        </div>
        <ThemeSelector activeTheme={activeTheme} />
      </section>

      <hr />

      <section className="space-y-4">
        <div>
          <h2 className="text-base font-semibold">Modules</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Disable modules your organization does not use. Hidden modules are removed from navigation
            — no data is deleted and you can re-enable them at any time.
          </p>
        </div>
        <ModuleToggles initialModules={enabledModules} />
      </section>

      <hr />

      <section className="space-y-4">
        <div>
          <h2 className="text-base font-semibold">Framework Alignment</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Optional overlays that add framework-specific labels and reports to your repository.
            Disabled by default — enabling an overlay never changes existing content.
          </p>
        </div>
        <FrameworkToggles initialModules={enabledModules} />
      </section>
    </div>
  )
}
