import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { isAdmin } from '@/lib/rbac'
import { db } from '@/db/client'
import { organizations } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { importArchiveFromForm } from '@/actions/backup'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

/** Format a byte count as a short human string ("1.2 MB", "850 KB", etc.). */
function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

/** Format a timestamp as a relative + absolute pair the operator can act on. */
function formatLastExport(at: Date | null, bytes: number | null): string {
  if (!at) return 'Never exported'
  const sizeStr = bytes != null ? `, ${formatBytes(bytes)}` : ''
  return `${at.toLocaleString()}${sizeStr}`
}

/**
 * /settings/backup — operational backup & export (#529 PR1 + PR2).
 *
 * Admin-only. Three download buttons (Recipe / Content / Archive); each
 * triggers a JSON file download via `/api/backup/*` and updates the
 * `lastExportAt` timestamp surfaced here and on the dashboard.
 *
 * Import (PR2): replaces the org&apos;s content + config with an uploaded
 * archive. Destructive; requires typing RESTORE to enable the submit
 * button. See `lib/backup-import.ts` for the wipe-then-restore replayer.
 */
export default async function BackupSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ imported?: string }>
}) {
  const session = await auth()
  if (!session?.user) redirect('/login')
  if (!isAdmin(session.user)) redirect('/dashboard')
  if (!session.user.organizationId) redirect('/dashboard')

  const params = await searchParams
  const showImportSuccess = params?.imported === '1'

  const org = await db.query.organizations.findFirst({
    where: eq(organizations.id, session.user.organizationId),
  })

  const lastExportStr = formatLastExport(org?.lastExportAt ?? null, org?.lastExportBytes ?? null)
  const lastImportStr = formatLastExport(org?.lastImportAt ?? null, org?.lastImportBytes ?? null)

  return (
    <div className="max-w-3xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Backup &amp; Export</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Download a full-fidelity snapshot of this organization for backup,
          migration to a new host, or restore after data loss. Exports never
          include user passwords, SMTP credentials, or the audit log
          (audit is append-only at the database layer and backed up
          separately).
        </p>
        <p className="text-xs text-muted-foreground mt-2">
          For external-tool consumption (Power BI, Excel hand-offs), the
          relationship-preserving data portability export is a separate,
          adjacent concern &mdash; tracked in{' '}
          <a href="https://github.com/roballred/GovEA/issues/86" target="_blank" rel="noopener noreferrer" className="underline">#86</a>.
        </p>
      </div>

      {showImportSuccess && (
        <div
          role="status"
          className="rounded-lg border border-emerald-300 bg-emerald-50 dark:bg-emerald-900/20 dark:border-emerald-700 px-4 py-3 text-sm"
        >
          <p className="font-medium text-emerald-900 dark:text-emerald-200">
            Archive imported successfully.
          </p>
          <p className="text-emerald-800 dark:text-emerald-300/80 mt-0.5">
            The organization&apos;s content and configuration have been replaced.
          </p>
        </div>
      )}

      <section className="rounded-lg border bg-card p-5 space-y-2">
        <div className="flex items-baseline justify-between gap-4">
          <h2 className="text-base font-semibold">Last export</h2>
          <span className="text-xs text-muted-foreground">{lastExportStr}</span>
        </div>
        <div className="flex items-baseline justify-between gap-4">
          <h2 className="text-base font-semibold">Last import</h2>
          <span className="text-xs text-muted-foreground">{lastImportStr}</span>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-base font-semibold">Export</h2>

        <div className="rounded-lg border bg-card p-5 space-y-3">
          <div>
            <h3 className="text-sm font-semibold">Recipe</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Configuration only &mdash; organization settings, taxonomy
              types and terms, custom-field definitions, enabled modules.
              No content rows. Use to provision a fresh install with the
              same shape.
            </p>
          </div>
          <div>
            <a
              href="/api/backup/recipe"
              download
              className="inline-flex items-center justify-center rounded-md border bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              Download recipe
            </a>
          </div>
        </div>

        <div className="rounded-lg border bg-card p-5 space-y-3">
          <div>
            <h3 className="text-sm font-semibold">Content</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Content rows only &mdash; personas, capabilities, applications,
              value streams, objectives, initiatives, ADRs, principles,
              glossary, services, debt items, and their relationships. No
              org settings.
            </p>
          </div>
          <div>
            <a
              href="/api/backup/content"
              download
              className="inline-flex items-center justify-center rounded-md border bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              Download content
            </a>
          </div>
        </div>

        <div className="rounded-lg border border-emerald-200 dark:border-emerald-900 bg-emerald-50/30 dark:bg-emerald-950/10 p-5 space-y-3">
          <div>
            <h3 className="text-sm font-semibold">
              Archive
              <span className="ml-2 inline-flex items-center rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 px-2 py-0.5 text-xs font-medium">
                Recommended
              </span>
            </h3>
            <p className="text-sm text-muted-foreground mt-1">
              Recipe and content in one bundle &mdash; the complete &ldquo;back
              up the whole system&rdquo; shape. This is the file you restore
              into a fresh host.
            </p>
          </div>
          <div>
            <a
              href="/api/backup/archive"
              download
              className="inline-flex items-center justify-center rounded-md border bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              Download archive
            </a>
          </div>
        </div>
      </section>

      <section className="rounded-lg border border-red-300 dark:border-red-900 bg-red-50/30 dark:bg-red-950/10 p-5 space-y-4">
        <div>
          <h2 className="text-base font-semibold text-red-900 dark:text-red-200">
            Import &mdash; destructive
          </h2>
          <p className="text-sm text-red-800 dark:text-red-300/80 mt-1">
            Replaces this organization&apos;s entire content and configuration
            with the uploaded archive. Users, audit log, and SMTP credentials
            are preserved. Federation connections are cleared. There is no
            undo &mdash; export an archive first if you might want one.
          </p>
        </div>
        <form action={importArchiveFromForm} className="space-y-4">
          <div>
            <Label htmlFor="file">Archive JSON file</Label>
            <Input
              id="file"
              name="file"
              type="file"
              accept="application/json,.json"
              required
            />
            <p className="text-xs text-muted-foreground mt-1">
              Must be an Archive export from this build (format 1.0).
              Recipe-only and content-only imports are not yet supported.
            </p>
          </div>
          <div>
            <Label htmlFor="confirm">
              Type <code className="rounded bg-red-100 dark:bg-red-950/40 px-1 py-0.5 text-[11px] font-mono">RESTORE</code> to enable import
            </Label>
            <Input
              id="confirm"
              name="confirm"
              type="text"
              placeholder="RESTORE"
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
              required
              pattern="RESTORE"
              title="Type RESTORE (case-sensitive) to confirm"
            />
          </div>
          <div>
            <Button type="submit" variant="destructive">
              Import archive (replaces current data)
            </Button>
          </div>
        </form>
      </section>
    </div>
  )
}
