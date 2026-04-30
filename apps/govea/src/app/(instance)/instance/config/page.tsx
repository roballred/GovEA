import { requireInstanceAdmin } from '@/lib/instance-admin'
import { db } from '@/db/client'
import { platformConfig } from '@/db/schema'
import { PlatformConfigForm } from '@/components/platform-config-form'

export default async function PlatformConfigPage() {
  await requireInstanceAdmin()

  const config = await db.query.platformConfig.findFirst() ?? null

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Platform Configuration</h1>
        <p className="text-muted-foreground mt-1">
          Instance-level settings that apply across all organisations. Changes are audit-logged.
        </p>
      </div>
      <PlatformConfigForm initial={config} />
    </div>
  )
}
