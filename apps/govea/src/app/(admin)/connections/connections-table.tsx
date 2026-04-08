'use client'

import { useState, useTransition } from 'react'
import type { OrgConnection, Organization } from '@/db/schema'
import { requestConnection, acceptConnection, rejectConnection, removeConnection } from '@/actions/connections'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'

interface Props {
  connections: OrgConnection[]
  otherOrgs: Pick<Organization, 'id' | 'name' | 'slug'>[]
  orgId: string
}

const STATUS_STYLES: Record<string, string> = {
  active: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  pending: 'bg-amber-100 text-amber-800 border-amber-200',
  rejected: 'bg-red-100 text-red-700 border-red-200',
}

export function ConnectionsTable({ connections, otherOrgs, orgId }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [requestOpen, setRequestOpen] = useState(false)
  const [removeTarget, setRemoveTarget] = useState<OrgConnection | null>(null)

  const refresh = () => router.refresh()

  // Partition connections by direction and status
  const active = connections.filter(c => c.status === 'active')
  const outboundPending = connections.filter(c => c.status === 'pending' && c.fromOrgId === orgId)
  const inboundPending = connections.filter(c => c.status === 'pending' && c.toOrgId === orgId)

  // Orgs that don't already have any connection row (active, pending, or rejected)
  const connectedOrgIds = new Set(connections.flatMap(c => [c.fromOrgId, c.toOrgId]))
  const availableOrgs = otherOrgs.filter(o => !connectedOrgIds.has(o.id))

  function orgName(id: string) {
    return otherOrgs.find(o => o.id === id)?.name ?? id
  }

  async function handleRequest(formData: FormData) {
    const targetOrgId = formData.get('targetOrgId') as string
    startTransition(async () => {
      await requestConnection(targetOrgId)
      setRequestOpen(false)
      refresh()
    })
  }

  async function handleAccept(connectionId: string) {
    startTransition(async () => {
      await acceptConnection(connectionId)
      refresh()
    })
  }

  async function handleReject(connectionId: string) {
    startTransition(async () => {
      await rejectConnection(connectionId)
      refresh()
    })
  }

  async function handleRemove() {
    if (!removeTarget) return
    startTransition(async () => {
      await removeConnection(removeTarget.id)
      setRemoveTarget(null)
      refresh()
    })
  }

  return (
    <div className="space-y-8">
      {/* Inbound requests */}
      {inboundPending.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold">Incoming requests</h2>
            <span className="inline-flex items-center rounded-full bg-amber-100 text-amber-800 border border-amber-200 px-2 py-0.5 text-xs font-medium">
              {inboundPending.length}
            </span>
          </div>
          <div className="rounded-lg border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Organization</TableHead>
                  <TableHead>Requested</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {inboundPending.map(c => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{orgName(c.fromOrgId)}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">{new Date(c.createdAt).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost" size="sm"
                          onClick={() => handleAccept(c.id)}
                          disabled={isPending}
                          className="h-7 px-2 text-xs text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                        >
                          Accept
                        </Button>
                        <Button
                          variant="ghost" size="sm"
                          onClick={() => handleReject(c.id)}
                          disabled={isPending}
                          className="h-7 px-2 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
                        >
                          Reject
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </section>
      )}

      {/* Active connections */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold">Active connections</h2>
          <Button onClick={() => setRequestOpen(true)} size="sm" disabled={availableOrgs.length === 0}>
            + Request connection
          </Button>
        </div>
        <div className="rounded-lg border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Organization</TableHead>
                <TableHead>Connected since</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {active.length === 0 && (
                <TableRow>
                  <TableCell colSpan={3} className="text-center text-muted-foreground py-8">
                    No active connections yet. Request one to start sharing content.
                  </TableCell>
                </TableRow>
              )}
              {active.map(c => {
                const peerId = c.fromOrgId === orgId ? c.toOrgId : c.fromOrgId
                return (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{orgName(peerId)}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">{new Date(c.updatedAt).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <Button
                        variant="ghost" size="sm"
                        onClick={() => setRemoveTarget(c)}
                        disabled={isPending}
                        className="h-7 px-2 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
                      >
                        Remove
                      </Button>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      </section>

      {/* Outbound pending */}
      {outboundPending.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold">Pending outbound requests</h2>
          <div className="rounded-lg border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Organization</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Requested</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {outboundPending.map(c => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{orgName(c.toOrgId)}</TableCell>
                    <TableCell>
                      <span className={cn('inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium', STATUS_STYLES[c.status])}>
                        Awaiting response
                      </span>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">{new Date(c.createdAt).toLocaleDateString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </section>
      )}

      {/* Request dialog */}
      <Dialog open={requestOpen} onOpenChange={setRequestOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request connection</DialogTitle>
          </DialogHeader>
          {availableOrgs.length === 0 ? (
            <p className="text-sm text-muted-foreground">All organizations on this installation are already connected or have a pending request.</p>
          ) : (
            <form action={handleRequest} className="space-y-3">
              <div className="space-y-1.5">
                <p className="text-sm text-muted-foreground">The target organization&apos;s admin will need to accept before the connection becomes active.</p>
                <select name="targetOrgId" required className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring">
                  <option value="">Select an organization…</option>
                  {availableOrgs.map(o => (
                    <option key={o.id} value={o.id}>{o.name}</option>
                  ))}
                </select>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setRequestOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={isPending}>{isPending ? 'Sending…' : 'Send request'}</Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Remove confirm dialog */}
      <Dialog open={!!removeTarget} onOpenChange={open => { if (!open) setRemoveTarget(null) }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Remove connection</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">
            Remove the connection with <strong>{removeTarget ? orgName(removeTarget.fromOrgId === orgId ? removeTarget.toOrgId : removeTarget.fromOrgId) : ''}</strong>?
            Content shared via this connection will no longer be visible to either organization.
          </p>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setRemoveTarget(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleRemove} disabled={isPending}>
              {isPending ? 'Removing…' : 'Remove connection'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
