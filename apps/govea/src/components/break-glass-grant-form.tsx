'use client'

import { useState, useTransition, type ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

const TTL_OPTIONS = [
  { value: 60, label: '1 hour (no approval needed)' },
  { value: 240, label: '4 hours (requires second-admin approval)' },
  { value: 480, label: '8 hours (requires second-admin approval)' },
] as const

interface Props {
  trigger: ReactNode
  orgName: string
  onConfirm: (reason: string, ttlMinutes: number) => Promise<void>
}

export function BreakGlassGrantForm({ trigger, orgName, onConfirm }: Props) {
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState('')
  const [ttl, setTtl] = useState<number>(60)
  const [error, setError] = useState('')
  const [isPending, startTransition] = useTransition()

  function handleOpenChange(next: boolean) {
    if (isPending) return
    setOpen(next)
    if (!next) {
      setReason('')
      setTtl(60)
      setError('')
    }
  }

  function handleConfirm() {
    const trimmed = reason.trim()
    if (!trimmed) {
      setError('A reason is required.')
      return
    }
    setError('')
    startTransition(async () => {
      try {
        await onConfirm(trimmed, ttl)
        handleOpenChange(false)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred.')
      }
    })
  }

  const requiresApproval = ttl > 60

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Grant break-glass access</DialogTitle>
          <DialogDescription>
            Time-limited access to &quot;{orgName}&quot;. Sessions over 1 hour require a second instance admin to approve before they activate.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="bg-ttl">Duration</Label>
            <select
              id="bg-ttl"
              value={ttl}
              onChange={e => setTtl(Number(e.target.value))}
              disabled={isPending}
              className={cn(
                'flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm',
                'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
                'disabled:cursor-not-allowed disabled:opacity-50',
              )}
            >
              {TTL_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="bg-reason">Reason</Label>
            <Textarea
              id="bg-reason"
              rows={3}
              placeholder="e.g. User support request, incident investigation…"
              value={reason}
              onChange={e => setReason(e.target.value)}
              disabled={isPending}
            />
          </div>

          {requiresApproval && (
            <div className="rounded-md bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 px-3 py-2 text-xs text-amber-800 dark:text-amber-300">
              Pending state: this session will be created but inactive until a different instance admin approves it.
            </div>
          )}

          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={isPending}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={isPending || !reason.trim()}>
            {isPending ? 'Working…' : 'Grant access'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
