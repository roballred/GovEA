'use client'

import { useCallback, useState, type ReactNode } from 'react'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

/**
 * Shared confirmation dialog (#870).
 *
 * Replaces ad-hoc `window.confirm()` prompts with the styled, accessible Dialog
 * primitive (focus trap, ESC, labelled by title + described by body). Exposed as
 * a promise-based hook so a synchronous-looking flow stays readable:
 *
 *   const { confirm, confirmDialog } = useConfirmDialog()
 *   // …
 *   if (await confirm({ title: 'Publish anyway?', description: msg })) { … }
 *   // render {confirmDialog} once in the component tree
 *
 * `confirm()` resolves `true` on the confirm button and `false` on cancel /
 * dismiss (ESC, overlay, close).
 */
export interface ConfirmOptions {
  title: string
  description?: ReactNode
  confirmLabel?: string
  cancelLabel?: string
  /** Use `destructive` for delete-style actions; defaults to the primary style. */
  variant?: 'default' | 'destructive'
}

interface PendingConfirm extends ConfirmOptions {
  resolve: (result: boolean) => void
}

export function useConfirmDialog() {
  const [pending, setPending] = useState<PendingConfirm | null>(null)

  const confirm = useCallback(
    (options: ConfirmOptions) =>
      new Promise<boolean>((resolve) => {
        setPending({ ...options, resolve })
      }),
    [],
  )

  const settle = useCallback((result: boolean) => {
    setPending((current) => {
      current?.resolve(result)
      return null
    })
  }, [])

  const confirmDialog = (
    <Dialog open={!!pending} onOpenChange={(open) => { if (!open) settle(false) }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{pending?.title}</DialogTitle>
          {/* Always render a description node so the dialog is described, not
              just labelled (avoids Radix's missing-aria-describedby warning). */}
          <DialogDescription className={pending?.description ? undefined : 'sr-only'}>
            {pending?.description ?? 'Confirm this action.'}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => settle(false)}>
            {pending?.cancelLabel ?? 'Cancel'}
          </Button>
          <Button variant={pending?.variant ?? 'default'} onClick={() => settle(true)}>
            {pending?.confirmLabel ?? 'Confirm'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )

  return { confirm, confirmDialog }
}
