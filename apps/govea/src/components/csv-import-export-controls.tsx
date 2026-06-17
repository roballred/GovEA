'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'

export type CsvImportResult = {
  created: number
  updated: number
  skipped: number
  errors: string[]
}

/**
 * Shared list-view CSV controls (#748): an "Export CSV" link plus an
 * "Import CSV" dialog with the same dry-run preview → confirm flow the
 * Capability/Application/Persona/ADR lists already use. Consolidating the
 * affordance here keeps labels, placement, and dialog behavior consistent
 * across every entity that gets list-view CSV.
 */
export function CsvImportExportControls({
  entityLabel,
  entityLabelPlural,
  exportHref,
  importAction,
  columnsHint,
}: {
  entityLabel: string
  entityLabelPlural?: string
  exportHref: string
  importAction: (formData: FormData, dryRun: boolean) => Promise<CsvImportResult>
  columnsHint: React.ReactNode
}) {
  const plural = entityLabelPlural ?? `${entityLabel}s`
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [open, setOpen] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<CsvImportResult | null>(null)
  const [result, setResult] = useState<CsvImportResult | null>(null)

  function openImport() {
    setOpen(true); setFile(null); setPreview(null); setResult(null)
  }
  function handlePreview() {
    if (!file) return
    startTransition(async () => {
      const fd = new FormData(); fd.append('csvFile', file)
      setPreview(await importAction(fd, true))
    })
  }
  function handleConfirm() {
    if (!file) return
    startTransition(async () => {
      const fd = new FormData(); fd.append('csvFile', file)
      setResult(await importAction(fd, false))
      setPreview(null); setFile(null); router.refresh()
    })
  }

  return (
    <div className="flex items-center gap-2">
      <a href={exportHref}>
        <Button variant="outline" size="sm">Export CSV</Button>
      </a>
      <Button variant="outline" size="sm" onClick={openImport}>Import CSV</Button>

      <Dialog open={open} onOpenChange={o => { if (!o) setOpen(false) }}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Import {plural}</DialogTitle></DialogHeader>
          <div className="space-y-4 text-sm">
            <p className="text-muted-foreground">
              {columnsHint} Existing {plural.toLowerCase()} are matched by <code className="bg-muted px-1 rounded">name</code> (case-insensitive) and updated.
            </p>

            {!result && (
              <div className="space-y-1.5">
                <Label>CSV file</Label>
                <Input
                  type="file"
                  accept=".csv,text/csv"
                  onChange={e => { setFile(e.target.files?.[0] ?? null); setPreview(null) }}
                />
              </div>
            )}

            {preview && !result && (
              <div className="rounded-md border bg-muted/30 p-3 space-y-1">
                <p className="font-medium">Preview</p>
                <p>Will create <strong>{preview.created}</strong> · update <strong>{preview.updated}</strong> · skip <strong>{preview.skipped}</strong></p>
                {preview.errors.length > 0 && (
                  <ul className="text-destructive space-y-0.5 mt-1">
                    {preview.errors.map((e, i) => <li key={i}>{e}</li>)}
                  </ul>
                )}
              </div>
            )}

            {result && (
              <div className="rounded-md border bg-emerald-50 border-emerald-200 p-3 space-y-1">
                <p className="font-medium text-emerald-800">Import complete</p>
                <p className="text-emerald-700">Created <strong>{result.created}</strong> · updated <strong>{result.updated}</strong> · skipped <strong>{result.skipped}</strong></p>
                {result.errors.length > 0 && (
                  <ul className="text-destructive space-y-0.5 mt-1">
                    {result.errors.map((e, i) => <li key={i}>{e}</li>)}
                  </ul>
                )}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              {result ? 'Close' : 'Cancel'}
            </Button>
            {!result && !preview && (
              <Button onClick={handlePreview} disabled={!file || isPending}>
                {isPending ? 'Checking…' : 'Preview'}
              </Button>
            )}
            {preview && !result && (
              <Button onClick={handleConfirm} disabled={isPending || preview.created + preview.updated === 0}>
                {isPending ? 'Importing…' : `Import ${preview.created + preview.updated} ${plural.toLowerCase()}`}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
