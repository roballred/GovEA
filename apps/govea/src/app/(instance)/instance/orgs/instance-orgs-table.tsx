'use client'

import { useState, useTransition, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import { createOrg } from '@/actions/instance'

const TIER_BADGE: Record<string, { label: string; cls: string }> = {
  community: { label: 'Community', cls: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300' },
  standard:  { label: 'Standard',  cls: 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300' },
  premium:   { label: 'Premium',   cls: 'bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300' },
  enterprise:{ label: 'Enterprise',cls: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300' },
}

type OrgRow = {
  id: string
  name: string
  slug: string
  userCount: number
  createdAt: Date
  suspendedAt: Date | null
  isSystemOrg: boolean | null
  supportTier: string | null
}

interface Props {
  orgs: OrgRow[]
}

function toSlug(name: string) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

export function InstanceOrgsTable({ orgs }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [slugEdited, setSlugEdited] = useState(false)
  const [slug, setSlug] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const nameRef = useRef<HTMLInputElement>(null)

  function handleNameChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (!slugEdited) setSlug(toSlug(e.target.value))
  }

  function handleOpen(val: boolean) {
    setOpen(val)
    if (val) {
      setSlug('')
      setSlugEdited(false)
      setError(null)
    }
  }

  function handleCreate(formData: FormData) {
    setError(null)
    startTransition(async () => {
      try {
        const result = await createOrg(formData)
        setOpen(false)
        router.push(`/instance/orgs/${result.id}`)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Something went wrong')
      }
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Organisations</h1>
          <p className="text-muted-foreground mt-1">
            All organisations on this instance. The platform system org is included and labeled — it cannot be suspended or targeted for break-glass.
          </p>
        </div>
        <Button size="sm" onClick={() => handleOpen(true)}>+ New organisation</Button>
      </div>

      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Slug</TableHead>
              <TableHead>Tier</TableHead>
              <TableHead>Users</TableHead>
              <TableHead>Created</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orgs.map((org) => (
              <TableRow key={org.id}>
                <TableCell>
                  <Link href={`/instance/orgs/${org.id}`} className="font-medium hover:underline">
                    {org.name}
                  </Link>
                  {org.isSystemOrg && (
                    <span className="ml-2 inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                      Platform
                    </span>
                  )}
                </TableCell>
                <TableCell className="font-mono text-sm text-muted-foreground">{org.slug}</TableCell>
                <TableCell>
                  {org.supportTier && TIER_BADGE[org.supportTier] ? (
                    <span className={cn(
                      'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
                      TIER_BADGE[org.supportTier].cls,
                    )}>
                      {TIER_BADGE[org.supportTier].label}
                    </span>
                  ) : (
                    <span className="text-muted-foreground text-xs">—</span>
                  )}
                </TableCell>
                <TableCell>{org.userCount}</TableCell>
                <TableCell className="text-muted-foreground whitespace-nowrap">
                  {org.createdAt.toLocaleDateString()}
                </TableCell>
                <TableCell>
                  <span className={cn(
                    'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
                    org.suspendedAt
                      ? 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400'
                      : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400'
                  )}>
                    {org.suspendedAt ? 'Suspended' : 'Active'}
                  </span>
                </TableCell>
              </TableRow>
            ))}
            {orgs.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                  No organisations yet — create one to get started.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={open} onOpenChange={handleOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New organisation</DialogTitle>
          </DialogHeader>
          <form action={handleCreate} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="org-name">Name</Label>
              <Input
                id="org-name"
                name="name"
                ref={nameRef}
                required
                autoFocus
                onChange={handleNameChange}
                placeholder="City of Springfield"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="org-slug">Slug</Label>
              <Input
                id="org-slug"
                name="slug"
                required
                value={slug}
                onChange={(e) => { setSlugEdited(true); setSlug(e.target.value) }}
                placeholder="city-of-springfield"
                pattern="^[a-z0-9]([a-z0-9-]*[a-z0-9])?$"
                title="Lowercase letters, numbers, and hyphens only"
                className="font-mono"
              />
              <p className="text-xs text-muted-foreground">
                Used in URLs. Lowercase, letters, numbers, and hyphens only.
              </p>
            </div>
            {error && (
              <p className="rounded-md bg-destructive/10 border border-destructive/20 px-3 py-2 text-sm text-destructive">
                {error}
              </p>
            )}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? 'Creating…' : 'Create organisation'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
