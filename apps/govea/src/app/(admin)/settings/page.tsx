import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { db } from '@/db/client'
import { organizations } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { ThemeSelector } from '@/components/theme-selector'
import { StarterContentSection } from '@/components/starter-content-section'
import { getStarterContentStatus } from '@/actions/starter-content'
import { ModuleToggles } from '@/components/module-toggles'
import { ConfidenceSettingsForm } from '@/components/confidence-settings'
import { CompletenessSettingsForm } from '@/components/completeness-settings'
import { SecuritySettingsForm } from '@/components/security-settings-form'
import { getSecuritySettingsForUi } from '@/actions/security-settings'
import { CustomFieldsManager } from '@/components/custom-fields-manager'
import { EmailSettingsSection } from '@/components/email-settings-section'
import { getEmailSettingsForUi, getRecentEmailDeliveries } from '@/actions/email-settings'
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

  const [org, moduleSettings, appCustomFields, emailSettingsUi, emailDeliveries, securitySettings] = await Promise.all([
    session.user.organizationId
      ? db.query.organizations.findFirst({
          where: eq(organizations.id, session.user.organizationId),
        })
      : Promise.resolve(null),
    getCurrentModuleSettings(),
    session.user.organizationId
      ? getCustomFieldSchema(session.user.organizationId, 'application')
      : Promise.resolve([]),
    getEmailSettingsForUi(),
    getRecentEmailDeliveries(10),
    getSecuritySettingsForUi(),
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
          <h2 className="text-base font-semibold">Starter Content</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Apply the TOGAF 10 Starter pack so the catalog isn&rsquo;t empty before you&rsquo;ve built your own.
            It installs the TOGAF (Standard, 10th Edition) taxonomy, glossary, and principles, then a small
            framework-aligned sample repository. Each item ends with a plain-language marker so you can replace
            or delete it later. Re-applying the same pack skips items that already exist.
          </p>
        </div>
        <StarterContentSection removableByPack={await getStarterContentStatus()} />
      </section>

      <hr />

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
            — no data is deleted and you can re-enable them at any time. If an instance admin makes a
            module unavailable across the whole GovEA instance, it will be locked here.
          </p>
        </div>
        <ModuleToggles initialModules={enabledModules} lockedModules={instanceDisabledModules} />
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
          <h2 className="text-base font-semibold">Email Configuration</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Configure outbound SMTP for password resets, notifications, and system alerts.
            Credentials are encrypted at rest and never shown after saving.
            Test sends always go to your own address.
          </p>
        </div>
        <EmailSettingsSection
          initial={emailSettingsUi}
          recentDeliveries={emailDeliveries}
          adminEmail={session.user.email ?? null}
        />
      </section>

      <hr />

      <section className="space-y-4">
        <div>
          <h2 className="text-base font-semibold">Security</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Password policy, session timeout, account lockout, and password
            expiry. Changes apply to future logins and password changes —
            existing sessions are not immediately terminated. (#527)
          </p>
        </div>
        <SecuritySettingsForm initial={securitySettings} />
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
