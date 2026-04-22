'use client'

import { useState, useTransition, type ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'

interface ConfirmWithReasonProps {
  trigger: ReactNode
  title: string
  description: string
  placeholder?: string
  confirmLabel?: string
  destructive?: boolean
  onConfirm: (reason: string) => Promise<void>
}

export function ConfirmWithReason({
  trigger,
  title,
  description,
  placeholder = 'Enter reason…',
  confirmLabel = 'Confirm',
  destructive = false,
  onConfirm,
}: ConfirmWithReasonProps) {
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState('')
  const [error, setError] = useState('')
  const [isPending, startTransition] = useTransition()

  function handleOpenChange(next: boolean) {
    if (!isPending) {
      setOpen(next)
      if (!next) {
        setReason('')
        setError('')
      }
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
        await onConfirm(trimmed)
        setOpen(false)
        setReason('')
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred.')
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <div className="space-y-2 py-2">
          <Label htmlFor="reason">Reason</Label>
          <Textarea
            id="reason"
            rows={3}
            placeholder={placeholder}
            value={reason}
            onChange={e => setReason(e.target.value)}
            disabled={isPending}
          />
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={isPending}>
            Cancel
          </Button>
          <Button
            variant={destructive ? 'destructive' : 'default'}
            onClick={handleConfirm}
            disabled={isPending || !reason.trim()}
          >
            {isPending ? 'Working…' : confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
