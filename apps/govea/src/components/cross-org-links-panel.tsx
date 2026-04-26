'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import type { CrossOrgLinkItem, CrossOrgLinkType, CrossOrgTargetOption } from '@/actions/cross-org-links'

interface Props {
  entityLabel: string
  approved: CrossOrgLinkItem[]
  inboundPending: CrossOrgLinkItem[]
  outboundPending: CrossOrgLinkItem[]
  outboundRejected: CrossOrgLinkItem[]
  availableTargets: CrossOrgTargetOption[]
  canRequest: boolean
  canApprove: boolean
  requestAction: (targetId: string, linkType: CrossOrgLinkType) => Promise<void>
  approveAction: (linkId: string) => Promise<void>
  rejectAction: (linkId: string, reason?: string) => Promise<void>
  withdrawAction: (linkId: string) => Promise<void>
  revokeAction?: (linkId: string) => Promise<void>
}

const LINK_TYPE_STYLES: Record<CrossOrgLinkType, string> = {
  implements: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  extends: 'bg-blue-50 text-blue-700 border-blue-200',
  maps_to: 'bg-violet-50 text-violet-700 border-violet-200',
}

const VISIBILITY_LABELS: Record<CrossOrgTargetOption['visibility'], string> = {
  connections: 'Connected orgs',
  instance: 'Instance-wide',
}

export function CrossOrgLinksPanel({
  entityLabel,
  approved,
  inboundPending,
  outboundPending,
  outboundRejected,
  availableTargets,
  canRequest,
  canApprove,
  requestAction,
  approveAction,
  rejectAction,
  withdrawAction,
  revokeAction,
}: Props) {
  const [isPending, startTransition] = useTransition()
  const [showRequest, setShowRequest] = useState(false)
  const [targetId, setTargetId] = useState('')
  const [linkType, setLinkType] = useState<CrossOrgLinkType>('implements')
  const [rejectingLinkId, setRejectingLinkId] = useState<string | null>(null)
  const [rejectionReason, setRejectionReason] = useState('')

  function handleRequest() {
    if (!targetId) return
    startTransition(async () => {
      await requestAction(targetId, linkType)
      setTargetId('')
      setLinkType('implements')
      setShowRequest(false)
    })
  }

  function openReject(linkId: string) {
    setRejectingLinkId(linkId)
    setRejectionReason('')
  }

  function cancelReject() {
    setRejectingLinkId(null)
    setRejectionReason('')
  }

  function confirmReject(linkId: string) {
    startTransition(async () => {
      await rejectAction(linkId, rejectionReason.trim() || undefined)
      cancelReject()
    })
  }

  function run(action: () => Promise<void>) {
    startTransition(async () => {
      await action()
    })
  }

  const hasAnyLinks = approved.length > 0 || inboundPending.length > 0 || outboundPending.length > 0 || outboundRejected.length > 0
  if (!hasAnyLinks && !canRequest && !canApprove) return null

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between min-h-[1.75rem]">
        <h2 className="text-lg font-semibold">Cross-Org Links</h2>
        {canRequest && availableTargets.length > 0 && (
          <button
            type="button"
            onClick={() => setShowRequest(v => !v)}
            className="text-xs font-medium text-primary hover:text-primary/80 transition-colors"
          >
            {showRequest ? 'Cancel' : '+ Request link'}
          </button>
        )}
      </div>

      <p className="text-sm text-muted-foreground">
        Use approval-based federation links for cross-org {entityLabel.toLowerCase()} alignment. Local relationship controls stay inside one organization.
      </p>

      {showRequest && (
        <div className="rounded-lg border bg-card p-4 space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="space-y-1.5 text-sm">
              <span className="text-muted-foreground">Target {entityLabel.toLowerCase()}</span>
              <select
                value={targetId}
                onChange={e => setTargetId(e.target.value)}
                className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
              >
                <option value="">Select a target…</option>
                {availableTargets.map(target => (
                  <option key={target.id} value={target.id}>
                    {target.name} · {target.organizationName} · {VISIBILITY_LABELS[target.visibility]}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-1.5 text-sm">
              <span className="text-muted-foreground">Relationship type</span>
              <select
                value={linkType}
                onChange={e => setLinkType(e.target.value as CrossOrgLinkType)}
                className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
              >
                <option value="implements">Implements</option>
                <option value="extends">Extends</option>
                <option value="maps_to">Maps To</option>
              </select>
            </label>
          </div>

          <div className="flex justify-end">
            <button
              type="button"
              onClick={handleRequest}
              disabled={!targetId || isPending}
              className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground disabled:opacity-50 hover:bg-primary/90 transition-colors"
            >
              {isPending ? 'Sending…' : 'Send request'}
            </button>
          </div>
        </div>
      )}

      {!hasAnyLinks ? (
        <p className="text-sm text-muted-foreground">No cross-org links yet.</p>
      ) : (
        <div className={cn('space-y-4', isPending && 'opacity-60')}>
          {approved.length > 0 && (
            <section className="space-y-2">
              <h3 className="text-sm font-medium">Approved</h3>
              {approved.map(link => (
                <div key={link.id} className="flex items-center gap-2">
                  <div className="flex-1 min-w-0">
                    <Link href={link.peerHref} className="flex items-center justify-between rounded-lg border bg-card px-4 py-3 hover:bg-muted/50 transition-colors">
                      <div className="space-y-1">
                        <div className="font-medium text-sm">{link.peerName}</div>
                        <div className="text-xs text-muted-foreground">{link.peerOrganizationName}</div>
                      </div>
                      <span className={cn('inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium', LINK_TYPE_STYLES[link.linkType])}>
                        {link.linkType.replaceAll('_', ' ')}
                      </span>
                    </Link>
                    {link.flaggedForReview && (
                      <div className="flex items-start gap-1.5 mt-1 px-1 text-xs text-amber-600">
                        <svg className="h-3.5 w-3.5 shrink-0 mt-px" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                        </svg>
                        <span>Flagged for review — {link.flagReason ?? 'visibility changed by a connected org'}</span>
                      </div>
                    )}
                  </div>
                  {canRequest && (
                    <button
                      type="button"
                      onClick={() => run(() => withdrawAction(link.id))}
                      disabled={isPending}
                      className="shrink-0 rounded-md p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all disabled:opacity-30"
                      aria-label={`Withdraw link to ${link.peerName}`}
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                  {canApprove && revokeAction && (
                    <button
                      type="button"
                      onClick={() => run(() => revokeAction(link.id))}
                      disabled={isPending}
                      className="shrink-0 rounded-md px-2.5 py-1.5 text-xs font-medium text-muted-foreground hover:text-destructive hover:bg-destructive/10 border border-border hover:border-destructive/20 transition-all disabled:opacity-30"
                      aria-label={`Revoke link to ${link.peerName}`}
                    >
                      Revoke
                    </button>
                  )}
                </div>
              ))}
            </section>
          )}

          {inboundPending.length > 0 && (
            <section className="space-y-2">
              <h3 className="text-sm font-medium">Awaiting your approval</h3>
              {inboundPending.map(link => (
                <div key={link.id} className="rounded-lg border bg-card px-4 py-3 space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="font-medium text-sm">{link.peerName}</div>
                      <div className="text-xs text-muted-foreground">{link.peerOrganizationName}</div>
                    </div>
                    <span className={cn('inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium', LINK_TYPE_STYLES[link.linkType])}>
                      {link.linkType.replaceAll('_', ' ')}
                    </span>
                  </div>
                  {canApprove && (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => run(() => approveAction(link.id))}
                          disabled={isPending}
                          className="rounded-md px-3 py-1.5 text-xs font-medium text-emerald-700 hover:bg-emerald-50 border border-emerald-200 disabled:opacity-50"
                        >
                          Approve
                        </button>
                        <button
                          type="button"
                          onClick={() => openReject(link.id)}
                          disabled={isPending}
                          className="rounded-md px-3 py-1.5 text-xs font-medium text-destructive hover:bg-destructive/10 border border-destructive/20 disabled:opacity-50"
                        >
                          Reject
                        </button>
                      </div>

                      {rejectingLinkId === link.id && (
                        <div className="rounded-md border border-destructive/20 bg-destructive/5 p-3 space-y-3">
                          <label className="block space-y-1.5 text-sm">
                            <span className="text-muted-foreground">Optional rejection reason</span>
                            <textarea
                              value={rejectionReason}
                              onChange={e => setRejectionReason(e.target.value)}
                              rows={3}
                              autoFocus
                              disabled={isPending}
                              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50"
                              placeholder={`Explain why ${link.peerName} is not a fit right now`}
                            />
                          </label>
                          <div className="flex items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={cancelReject}
                              disabled={isPending}
                              className="rounded-md px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground border border-border disabled:opacity-50"
                            >
                              Cancel
                            </button>
                            <button
                              type="button"
                              onClick={() => confirmReject(link.id)}
                              disabled={isPending}
                              className="rounded-md px-3 py-1.5 text-xs font-medium text-destructive hover:bg-destructive/10 border border-destructive/20 disabled:opacity-50"
                            >
                              {isPending ? 'Rejecting…' : 'Confirm rejection'}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </section>
          )}

          {outboundPending.length > 0 && (
            <section className="space-y-2">
              <h3 className="text-sm font-medium">Pending outbound requests</h3>
              {outboundPending.map(link => (
                <div key={link.id} className="rounded-lg border bg-card px-4 py-3 flex items-center justify-between gap-3">
                  <div>
                    <div className="font-medium text-sm">{link.peerName}</div>
                    <div className="text-xs text-muted-foreground">{link.peerOrganizationName}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={cn('inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium', LINK_TYPE_STYLES[link.linkType])}>
                      {link.linkType.replaceAll('_', ' ')}
                    </span>
                    <button
                      type="button"
                      onClick={() => run(() => withdrawAction(link.id))}
                      disabled={isPending}
                      className="rounded-md px-3 py-1.5 text-xs font-medium text-destructive hover:bg-destructive/10 border border-destructive/20 disabled:opacity-50"
                    >
                      Withdraw
                    </button>
                  </div>
                </div>
              ))}
            </section>
          )}

          {outboundRejected.length > 0 && (
            <section className="space-y-2">
              <h3 className="text-sm font-medium">Rejected requests</h3>
              {outboundRejected.map(link => (
                <div key={link.id} className="rounded-lg border bg-card px-4 py-3 space-y-1">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="font-medium text-sm">{link.peerName}</div>
                      <div className="text-xs text-muted-foreground">{link.peerOrganizationName}</div>
                    </div>
                    <span className={cn('inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium', LINK_TYPE_STYLES[link.linkType])}>
                      {link.linkType.replaceAll('_', ' ')}
                    </span>
                  </div>
                  {link.rejectionReason && (
                    <p className="text-xs text-muted-foreground">{link.rejectionReason}</p>
                  )}
                </div>
              ))}
            </section>
          )}
        </div>
      )}
    </div>
  )
}
