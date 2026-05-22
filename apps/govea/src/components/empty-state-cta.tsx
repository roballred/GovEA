'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'

/**
 * Inline empty-state CTA for catalog pages (#587 follow-up).
 *
 * Surfaced by the Early-Maturity Practice Lead persona walk:
 *   "Inline empty-state CTAs uses plain language: 'No capabilities yet.
 *    Add your first, or start from a template.'"
 *
 * Renders prominently when a catalog has zero records for the caller's
 * org — distinct from the in-table "no matches for these filters"
 * message. Three flavours of guidance:
 *
 *   - Primary: "Add your first X" — triggers the create dialog via
 *     `onAdd`. Only rendered when the caller can create (admin /
 *     contributor) — the parent decides.
 *   - Secondary: "Apply a starter pack" — links to /settings#starter-content
 *     where #605 shipped the actual starter-content picker. Only
 *     rendered for admins via `canApplyStarterPack`.
 *   - Tertiary copy: short description of what this entity is + why
 *     it's worth filling in. Plain-language by design — the persona
 *     reading this is learning on the job.
 *
 * Sibling component to FirstSignInModal (which shows once on dashboard
 * sign-in) — same persona, same intent: meet a brand-new admin where
 * they are, with concrete next steps.
 */
export function EmptyStateCTA({
  entityLabel,
  description,
  onAdd,
  canApplyStarterPack,
}: {
  /** Singular noun, lowercased: "capability", "application", etc. */
  entityLabel: string
  /** One-sentence plain-language hint about what the entity captures. */
  description: string
  /** Triggers the create dialog. Absent = the caller can't create. */
  onAdd?: () => void
  /** If true, render the secondary "Apply a starter pack" CTA. Typically admin-only. */
  canApplyStarterPack?: boolean
}) {
  return (
    <div className="rounded-lg border bg-card p-12 text-center space-y-4">
      <div>
        <p className="text-base font-medium">No {entityLabel}s yet.</p>
        <p className="text-sm text-muted-foreground mt-1.5 max-w-md mx-auto">{description}</p>
      </div>
      <div className="flex items-center justify-center gap-3 flex-wrap pt-1">
        {onAdd && (
          <Button onClick={onAdd} size="sm">
            Add your first {entityLabel}
          </Button>
        )}
        {canApplyStarterPack && (
          <Link
            href="/settings#starter-content"
            className="text-sm text-muted-foreground hover:text-foreground underline underline-offset-2"
          >
            …or start from a template
          </Link>
        )}
      </div>
    </div>
  )
}
