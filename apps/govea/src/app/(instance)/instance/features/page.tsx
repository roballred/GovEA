import { requireInstanceAdmin } from '@/lib/instance-admin'
import { getInstanceDisabledModules } from '@/lib/get-enabled-modules'
import { InstanceModuleToggles } from '@/components/instance-module-toggles'

export default async function InstanceFeaturesPage() {
  await requireInstanceAdmin()
  const disabledModules = await getInstanceDisabledModules()

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Feature Controls</h1>
        <p className="text-muted-foreground mt-1">
          Control which GovEA modules are available anywhere on this instance. Making a module unavailable
          here forces it off for every organization, even if an org admin previously enabled it.
        </p>
      </div>

      <div className="rounded-lg border bg-amber-50 px-4 py-3 text-sm text-amber-900 border-amber-200">
        Instance-wide module availability controls do not delete data. They only remove the related navigation
        and UI until the module is made available again.
      </div>

      <InstanceModuleToggles initialDisabledModules={disabledModules} />
    </div>
  )
}
