import { eq } from 'drizzle-orm'
import { db } from '@/db/client'
import { organizations } from '@/db/schema'
import { getActiveActAsSession } from '@/lib/act-as'
import { endActAs } from '@/actions/act-as'
import { Button } from '@/components/ui/button'

export async function ActAsBanner() {
  const session = await getActiveActAsSession()
  if (!session) return null

  const target = await db.query.organizations.findFirst({
    where: eq(organizations.id, session.targetOrgId),
  })

  return (
    <div className="sticky top-0 z-50 bg-red-600 text-white text-sm shadow">
      <div className="mx-auto max-w-7xl px-4 py-2 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="font-semibold">Acting as</span>
          <span>{target?.name ?? 'unknown org'}</span>
          <span className="text-red-100">·</span>
          <span className="text-red-100">ends {session.expiresAt.toLocaleTimeString()}</span>
        </div>
        <form action={async () => { 'use server'; await endActAs() }}>
          <Button type="submit" size="sm" variant="secondary">End session</Button>
        </form>
      </div>
    </div>
  )
}
