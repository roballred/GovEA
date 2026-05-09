import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { db } from '@/db/client'
import { organizations } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { ThemeSelector } from '@/components/theme-selector'
import { ModuleToggles } from '@/components/module-toggles'
import { FrameworkToggles } from '@/components/framework-toggles'
import { ConfidenceSettingsForm } from '@/components/confidence-settings'
import { CompletenessSettingsForm } from '@/components/completeness-settings'
import { CustomFieldsManager } from '@/components/custom-fields-manager'
import { isAdmin } from '@/lib/rbac'
import type { ConfidenceSettings, CompletenessSettings } from '@/db/schema'
import { DEFAULT_COMPLETENESS_SETTINGS } from '@/db/schema'
import { getCurrentModuleSettings } from '@/lib/get-enabled-modules'
import { getCustomFieldSchema } from '@/actions/custom-fields'

const DEFAULT_CONFIDENCE: ConfidenceSettings = {
  enabled: false,
  narrative: null,
  suppressBelowPercent: 50,
  authenticatedVisibility: false,
  publicVisibility: false,
}

const DEFAULT_COMPLETENESS: CompletenessSettings = DEFAULT_COMPLETENESS_SETTINGS

export default async function SettingsPage() {
  const session = await auth()
  if (!session?.user) redirect('/login')
  if (!isAdmin(session.user)) redirect('/dashboard')

  const [org, moduleSettings, appCustomFields] = await Promise.all([
    session.user.organizationId
      ? db.query.organizations.findFirst({
          where: eq(organizations.id, session.user.organizationId),
        })
      : Promise.resolve(null),
    getCurrentModuleSettings(),
    session.user.organizationId
      ? getCustomFieldSchema(session.user.organizationId, 'application')
      : Promise.resolve([]),
  ])

  const activeTheme = org?.theme ?? 'govea'
  const enabledModules = moduleSettings.orgEnabledModules
  const instanceDisabledModules = moduleSettings.instanceDisabledModules
  const confidenceSettings = org?.confidenceSettings ?? DEFAULT_CONFIDENCE
  const completenessSettings = org?.completenessSettings ?? DEFAULT_COMPLETENESS

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
            — no data is deleted and you can re-enable them at any time. If a module is turned off
            by the site admin for the whole instance, it will be locked here.
          </p>
        </div>
        <ModuleToggles initialModules={enabledModules} lockedModules={instanceDisabledModules} />
      </section>

      <hr />

      <section className="space-y-4">
        <div>
          <h2 className="text-base font-semibold">Framework Overlays</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Optional framework integrations. These are opt-in and off by default — enable only what your organization actively uses.
          </p>
        </div>
        <FrameworkToggles initialModules={enabledModules} lockedModules={instanceDisabledModules} />
      </section>

      <hr />

      <section className="space-y-4">
        <div>
          <h2 className="text-base font-semibold">Application Custom Fields</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Define additional fields for your application inventory. Values are stored per record and included in CSV exports.
          </p>
        </div>
        <CustomFieldsManager entityType="application" initialFields={appCustomFields} />
      </section>

      <hr />

      <section className="space-y-4">
        <div>
          <h2 className="text-base font-semibold">Repository Completeness</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Tune how completeness signals are calculated for your organization.
          </p>
        </div>
        <CompletenessSettingsForm initial={completenessSettings} />
      </section>

      <hr />

      <section className="space-y-4">
        <div>
          <h2 className="text-base font-semibold">Repository Confidence</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Publish a plain-language confidence summary so stakeholders can judge how current
            and trustworthy the repository is — without exposing internal draft or quality details.
          </p>
        </div>
        <ConfidenceSettingsForm initial={confidenceSettings} />
      </section>
    </div>
  )
}
