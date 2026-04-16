import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { db } from '@/db/client'
import { organizations } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { ThemeSelector } from '@/components/theme-selector'

export default async function SettingsPage() {
  const session = await auth()
  if (!session?.user) redirect('/login')

  const org = session.user.organizationId
    ? await db.query.organizations.findFirst({
        where: eq(organizations.id, session.user.organizationId),
      })
    : null

  const activeTheme = org?.theme ?? 'govea'

  return (
    <div className="space-y-8">
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
    </div>
  )
}
