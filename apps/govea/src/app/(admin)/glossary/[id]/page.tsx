import { auth } from '@/lib/auth'
import { redirect, notFound } from 'next/navigation'
import { getGlossaryTerm } from '@/actions/glossary'
import { canEdit } from '@/lib/rbac'
import { cn } from '@/lib/utils'
import Link from 'next/link'
import { MarkdownContent } from '@/components/markdown-content'
import { isSafeUrl } from '@/lib/url'
import { GlossaryEditButton } from '@/components/glossary-edit-button'

const STATUS_STYLES: Record<string, string> = {
  draft: 'bg-slate-100 text-slate-700 border-slate-200',
  published: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  archived: 'bg-amber-100 text-amber-800 border-amber-200',
}

const VISIBILITY_STYLES: Record<string, string> = {
  org: 'bg-slate-100 text-slate-600 border-slate-200',
  connections: 'bg-blue-100 text-blue-700 border-blue-200',
  instance: 'bg-violet-100 text-violet-700 border-violet-200',
}

const VISIBILITY_LABELS: Record<string, string> = {
  org: 'Org only',
  connections: 'Connected orgs',
  instance: 'Instance-wide',
}

export default async function GlossaryTermDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await auth()
  if (!session?.user) redirect('/login')

  const term = await getGlossaryTerm(id)
  if (!term) notFound()

  const editor = canEdit(session.user)
  const orgId = session.user.organizationId!
  const canMutate = editor && term.organizationId === orgId

  return (
    <div className="space-y-8 max-w-3xl">
      <Link href="/glossary" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
        ← Glossary
      </Link>

      <div className="space-y-3">
        <div className="flex items-start justify-between gap-4">
          <h1 className="text-2xl font-bold tracking-tight">{term.term}</h1>
          <div className="flex items-center gap-2 shrink-0">
            {term.domain && (
              <span className="inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium bg-slate-100 text-slate-600 border-slate-200">
                {term.domain}
              </span>
            )}
            <span className={cn('inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium', STATUS_STYLES[term.status])}>
              {term.status.charAt(0).toUpperCase() + term.status.slice(1)}
            </span>
            <span className={cn('inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium', VISIBILITY_STYLES[term.visibility])}>
              {VISIBILITY_LABELS[term.visibility]}
            </span>
          </div>
        </div>
      </div>

      {canMutate && (
        <GlossaryEditButton
          termId={id}
          sources={term.sources.map(s => ({ name: s.name, url: s.url, definition: s.definition }))}
          initial={{
            term: term.term,
            definition: term.definition,
            domain: term.domain,
            definitionSource: term.definitionSource,
            definitionSourceUrl: term.definitionSourceUrl,
            notes: term.notes,
            status: term.status,
            visibility: term.visibility,
          }}
        />
      )}

      <hr />

      <div className="space-y-6">
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold">Definition</h2>
            {term.definitionSource && (
              <span className="inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium bg-blue-50 text-blue-700 border-blue-200">
                {isSafeUrl(term.definitionSourceUrl)
                  ? <a href={term.definitionSourceUrl!} target="_blank" rel="noopener noreferrer" className="hover:underline">Source: {term.definitionSource}</a>
                  : <>Source: {term.definitionSource}</>
                }
              </span>
            )}
          </div>
          <MarkdownContent>{term.definition}</MarkdownContent>
        </div>

        {term.notes && (
          <div className="space-y-3">
            <h2 className="text-lg font-semibold">Notes</h2>
            <MarkdownContent>{term.notes}</MarkdownContent>
          </div>
        )}

        {term.sources && term.sources.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-lg font-semibold">Reference Sources</h2>
            <div className="space-y-3">
              {term.sources.map(source => (
                <div key={source.id} className="rounded-md border p-4 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">
                      {isSafeUrl(source.url)
                        ? <a href={source.url!} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">{source.name}</a>
                        : source.name
                      }
                    </span>
                    {term.definitionSource === source.name && (
                      <span className="inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium bg-emerald-50 text-emerald-700 border-emerald-200">
                        Active
                      </span>
                    )}
                  </div>
                  <MarkdownContent>{source.definition}</MarkdownContent>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="text-xs text-muted-foreground pt-4 border-t">
        Created {new Date(term.createdAt).toLocaleDateString()} · Updated {new Date(term.updatedAt).toLocaleDateString()}
      </div>
    </div>
  )
}
