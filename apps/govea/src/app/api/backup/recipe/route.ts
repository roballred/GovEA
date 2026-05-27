import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { isAdmin } from '@/lib/rbac'
import { buildRecipeExport, recordExport } from '@/lib/backup-export'

/**
 * GET /api/backup/recipe — recipe-only export (#529).
 *
 * Admin-only. Returns a JSON file (`Content-Disposition: attachment`) and
 * stamps `organizations.lastExportAt` / `lastExportBytes` for the dashboard.
 */
export async function GET() {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (!isAdmin(session.user)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  if (!session.user.organizationId) {
    return NextResponse.json({ error: 'No organization context' }, { status: 400 })
  }

  const out = await buildRecipeExport(session.user.organizationId)
  await recordExport(session.user.organizationId, out.bytes)

  return new NextResponse(out.body, {
    status: 200,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Disposition': `attachment; filename="${out.filename}"`,
      'Cache-Control': 'no-store',
    },
  })
}
