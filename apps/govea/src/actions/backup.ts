'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { auth } from '@/lib/auth'
import { isAdmin } from '@/lib/rbac'
import { importArchive, recordImport, BackupImportError } from '@/lib/backup-import'

/**
 * Server action invoked by /settings/backup&apos;s import form (#529 PR2).
 *
 * Two destructive-action gates the action enforces in addition to admin-role:
 *   1. The form supplies `confirm` = the literal string `RESTORE`.
 *      Mirrors the ac-backup-export capability rule: "the admin must
 *      confirm before proceeding." Typed token > checkbox because typing
 *      is hard to do accidentally.
 *   2. A JSON file must be present and parseable.
 *
 * On success, redirects back to /settings/backup with a success query
 * param the page can render. On validation failure, throws an Error that
 * Next.js surfaces in the form&apos;s error boundary.
 */
export async function importArchiveFromForm(formData: FormData): Promise<void> {
  const session = await auth()
  if (!session?.user) redirect('/login')
  if (!isAdmin(session.user)) throw new Error('Forbidden')
  if (!session.user.organizationId) throw new Error('No organization context')

  const confirm = (formData.get('confirm') as string ?? '').trim()
  if (confirm !== 'RESTORE') {
    throw new Error('Type RESTORE to confirm import (case-sensitive)')
  }

  const file = formData.get('file')
  if (!(file instanceof File) || file.size === 0) {
    throw new Error('Select an archive JSON file to import')
  }
  // 50 MB guard — the largest archive observed in dogfood is well under
  // 5 MB; anything past 50 MB is almost certainly the wrong file. Keeps
  // a malicious-or-mistaken upload from blowing the request body limit.
  if (file.size > 50 * 1024 * 1024) {
    throw new Error('Archive larger than 50 MB; aborting (check the file)')
  }

  const bytes = file.size
  const body = await file.text()

  try {
    await importArchive(session.user.organizationId, session.user.id, body)
    await recordImport(session.user.organizationId, bytes)
  } catch (e) {
    // BackupImportError messages are user-facing; other errors stay as-is.
    if (e instanceof BackupImportError) throw new Error(e.message)
    throw e
  }

  // Revalidate everything: import replaces almost the entire content
  // surface, so a per-route revalidate would miss something.
  revalidatePath('/', 'layout')
  redirect('/settings/backup?imported=1')
}
