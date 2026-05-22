'use client'

/**
 * Hook + helper for unsaved-changes confirmation on dialog close (#567 Part A).
 *
 * Surfaced by the Junior EA Analyst persona walk:
 *   "Clicking Cancel silently discards changes. No warning."
 *
 * Usage:
 *
 *   const dirty = useDirtyTracker()
 *   <Dialog
 *     open={open}
 *     onOpenChange={(o) => { if (!o && !confirmDiscard(dirty)) return; setOpen(o) }}
 *   >
 *     <form onChange={dirty.markDirty} onSubmit={() => dirty.reset()}>
 *       ...
 *       <Button onClick={() => { if (confirmDiscard(dirty)) setOpen(false) }}>Cancel</Button>
 *     </form>
 *   </Dialog>
 *
 * The hook deliberately stays minimal — it does NOT auto-wire to a
 * specific Dialog component, because the form structure varies across
 * the codebase (some use Dialog, some inline forms, some controlled
 * inputs). Each caller decides where to mark-dirty and where to
 * confirm-discard.
 */
import { useCallback, useRef, useState } from 'react'

export interface DirtyTracker {
  isDirty: boolean
  markDirty: () => void
  reset: () => void
}

/**
 * Returns a dirty-tracker. `markDirty` flips the flag on the first
 * input change; `reset` clears it (call after a successful save).
 *
 * The internal ref is used so we can read the latest value from event
 * handlers without re-rendering on every keystroke.
 */
export function useDirtyTracker(): DirtyTracker {
  const [, setTick] = useState(0)
  const ref = useRef(false)
  const markDirty = useCallback(() => {
    if (!ref.current) {
      ref.current = true
      setTick(t => t + 1)
    }
  }, [])
  const reset = useCallback(() => {
    if (ref.current) {
      ref.current = false
      setTick(t => t + 1)
    }
  }, [])
  return { get isDirty() { return ref.current }, markDirty, reset }
}

/**
 * Returns true when the user is okay to close (either nothing was
 * changed, or they confirmed discarding). Returns false when the
 * dialog should stay open.
 */
export function confirmDiscard(tracker: DirtyTracker): boolean {
  if (!tracker.isDirty) return true
  if (typeof window === 'undefined') return true
  return window.confirm('You have unsaved changes. Discard them?')
}
