'use client'

import { Button } from '@/components/ui/button'

/**
 * Print/export trigger (#559).
 *
 * Wraps the browser's native `window.print()` — combined with the
 * `@media print` rules in globals.css and the `data-print-hide` markers
 * on the app shell, the result is a clean handout that:
 *
 *   - Drops sidebar, header, role badge, sign-out, theme controls
 *   - Surfaces the PrintCoverSheet (if present) as the first thing
 *     on the printed page
 *   - Keeps the page content
 *
 * V1 deliberately uses `window.print()` rather than headless-Chrome /
 * server PDF rendering. The issue's "cheap wins first" cut: the
 * browser print dialog already does the right thing with a print
 * stylesheet, and any modern OS lets the user "Save as PDF" from
 * there. Server-rendered PDF would be a follow-up if we ever need
 * to schedule briefing emails (also called out in the issue).
 *
 * The button itself has `data-print-keep` so the print stylesheet
 * doesn't hide it from the preview pane in browsers that render
 * actionable elements during print preview.
 */
export function PrintExportButton({ label = 'Print / Export PDF' }: { label?: string }) {
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      data-print-keep
      data-print-hide="true" // hide from the actual printed output, kept for preview
      onClick={() => { if (typeof window !== 'undefined') window.print() }}
      className="gap-1.5"
    >
      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <polyline points="6 9 6 2 18 2 18 9" />
        <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
        <rect x="6" y="14" width="12" height="8" />
      </svg>
      {label}
    </Button>
  )
}
