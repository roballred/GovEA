'use client'

import { useState, useTransition } from 'react'
import {
  addStage, editStage, deleteStage, moveStage,
  addCapabilityToStage, removeCapabilityFromStage,
} from '@/actions/value-streams'
import type { ValueStreamStage, Capability } from '@/db/schema'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'

type StageWithCapabilities = ValueStreamStage & {
  stageCapabilities: { capability: Capability }[]
}

interface Props {
  valueStreamId: string
  stages: StageWithCapabilities[]
  capabilities: Capability[]
}

export function StageManager({ valueStreamId, stages, capabilities }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [addOpen, setAddOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<StageWithCapabilities | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<StageWithCapabilities | null>(null)
  const [newName, setNewName] = useState('')
  const [newDesc, setNewDesc] = useState('')

  const refresh = () => router.refresh()

  function handleAdd() {
    if (!newName.trim()) return
    startTransition(async () => {
      await addStage(valueStreamId, newName, newDesc)
      setNewName('')
      setNewDesc('')
      setAddOpen(false)
      refresh()
    })
  }

  function handleEdit() {
    if (!editTarget || !newName.trim()) return
    startTransition(async () => {
      await editStage(editTarget.id, newName, newDesc)
      setEditTarget(null)
      refresh()
    })
  }

  function handleDelete() {
    if (!deleteTarget) return
    startTransition(async () => {
      await deleteStage(deleteTarget.id)
      setDeleteTarget(null)
      refresh()
    })
  }

  function handleMove(stageId: string, direction: 'up' | 'down') {
    startTransition(async () => {
      await moveStage(stageId, direction)
      refresh()
    })
  }

  function handleAddCapability(stageId: string, capabilityId: string) {
    startTransition(async () => {
      await addCapabilityToStage(stageId, capabilityId)
      refresh()
    })
  }

  function handleRemoveCapability(stageId: string, capabilityId: string) {
    startTransition(async () => {
      await removeCapabilityFromStage(stageId, capabilityId)
      refresh()
    })
  }

  // Capabilities not yet linked to a given stage
  function availableCapabilities(stage: StageWithCapabilities) {
    const linked = new Set(stage.stageCapabilities.map(sc => sc.capability.id))
    return capabilities.filter(c => !linked.has(c.id))
  }

  return (
    <>
      {/* Add stage button */}
      <div className="pt-2">
        <Button variant="outline" size="sm" onClick={() => setAddOpen(true)} disabled={isPending}>
          + Add stage
        </Button>
      </div>

      {/* Per-stage edit controls (rendered below read view via portal-like pattern) */}
      <div className="space-y-2 mt-2">
        {stages.map((stage, idx) => (
          <div key={stage.id} className="rounded-lg border border-dashed border-muted-foreground/30 p-3 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs text-muted-foreground font-medium">Stage {idx + 1} controls</span>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="sm" disabled={isPending || idx === 0}
                  onClick={() => handleMove(stage.id, 'up')}
                  className="h-6 w-6 p-0 text-xs">↑</Button>
                <Button variant="ghost" size="sm" disabled={isPending || idx === stages.length - 1}
                  onClick={() => handleMove(stage.id, 'down')}
                  className="h-6 w-6 p-0 text-xs">↓</Button>
                <Button variant="ghost" size="sm" disabled={isPending}
                  onClick={() => { setEditTarget(stage); setNewName(stage.name); setNewDesc(stage.description ?? '') }}
                  className="h-6 px-2 text-xs">Edit</Button>
                <Button variant="ghost" size="sm" disabled={isPending}
                  onClick={() => setDeleteTarget(stage)}
                  className="h-6 px-2 text-xs text-destructive hover:text-destructive hover:bg-destructive/10">Remove</Button>
              </div>
            </div>

            {/* Capability assignment */}
            <div className="space-y-1.5">
              <p className="text-xs text-muted-foreground">Linked capabilities:</p>
              <div className="flex flex-wrap gap-1.5">
                {stage.stageCapabilities.map(({ capability }) => (
                  <span key={capability.id}
                    className="inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-medium bg-blue-50 text-blue-700 border-blue-200">
                    {capability.name}
                    <button
                      onClick={() => handleRemoveCapability(stage.id, capability.id)}
                      disabled={isPending}
                      className="ml-0.5 text-blue-400 hover:text-destructive leading-none"
                    >×</button>
                  </span>
                ))}
                {stage.stageCapabilities.length === 0 && (
                  <span className="text-xs text-muted-foreground">None</span>
                )}
              </div>
              {availableCapabilities(stage).length > 0 && (
                <select
                  defaultValue=""
                  disabled={isPending}
                  onChange={e => {
                    if (e.target.value) {
                      handleAddCapability(stage.id, e.target.value)
                      e.target.value = ''
                    }
                  }}
                  className="h-7 rounded-md border border-input bg-transparent px-2 text-xs shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                >
                  <option value="">+ Link capability…</option>
                  {availableCapabilities(stage).map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Add Stage Dialog */}
      <Dialog open={addOpen} onOpenChange={open => { if (!open) { setAddOpen(false); setNewName(''); setNewDesc('') } }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add stage</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Name</Label>
              <Input value={newName} onChange={e => setNewName(e.target.value)} placeholder="e.g. Submit application" autoFocus />
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <textarea value={newDesc} onChange={e => setNewDesc(e.target.value)} rows={2} placeholder="Optional"
                className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring resize-none" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setAddOpen(false); setNewName(''); setNewDesc('') }}>Cancel</Button>
            <Button onClick={handleAdd} disabled={isPending || !newName.trim()}>
              {isPending ? 'Adding…' : 'Add stage'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Stage Dialog */}
      <Dialog open={!!editTarget} onOpenChange={open => { if (!open) setEditTarget(null) }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit stage</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Name</Label>
              <Input value={newName} onChange={e => setNewName(e.target.value)} autoFocus />
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <textarea value={newDesc} onChange={e => setNewDesc(e.target.value)} rows={2}
                className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring resize-none" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditTarget(null)}>Cancel</Button>
            <Button onClick={handleEdit} disabled={isPending || !newName.trim()}>
              {isPending ? 'Saving…' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Stage Dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={open => { if (!open) setDeleteTarget(null) }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Remove stage</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">
            Remove stage <strong>{deleteTarget?.name}</strong>? Capability links for this stage will also be removed.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={isPending}>
              {isPending ? 'Removing…' : 'Remove'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
