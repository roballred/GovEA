import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { isAdmin } from '@/lib/rbac'
import { buildArchiveExport, recordExport } from '@/lib/backup-export'

/**
 * GET /api/backup/archive — combined recipe+content export (#529).
 *
 * Admin-only. Returns a JSON file and updates `lastExportAt` / `lastExportBytes`.
 * This is the "back up the whole system" shape — restored via the import
 * action shipping in PR2 of #529.
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

  const out = await buildArchiveExport(session.user.organizationId)
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
