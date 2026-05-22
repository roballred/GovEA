import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getAnswerContent, type AnswerItem, type AnswerSection } from '@/actions/answers'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { PrintExportButton } from '@/components/print-export'
import { PrintCoverSheet } from '@/components/print-cover-sheet'

interface AnswerPageProps {
  searchParams: Promise<{ q?: string }>
}

function AnswerCard({ item }: { item: AnswerItem }) {
  return (
    <Card>
      <CardContent className="py-4 px-5 space-y-2">
        <div className="flex items-start justify-between gap-3">
          <Link href={item.href} className="font-medium hover:underline text-sm leading-snug">
            {item.title}
          </Link>
          <Badge variant="outline" className="shrink-0 text-xs">
            {item.status}
          </Badge>
        </div>
        {item.description && (
          <p className="text-sm text-muted-foreground line-clamp-2">{item.description}</p>
        )}
        <p className="text-xs text-muted-foreground border-t pt-2">
          <span className="font-medium text-foreground">Why relevant: </span>
          {item.relevance}
        </p>
      </CardContent>
    </Card>
  )
}

function AnswerSectionBlock({ section }: { section: AnswerSection }) {
  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">{section.heading}</h2>
        <p className="text-sm text-muted-foreground">{section.subheading}</p>
      </div>
      <div className="space-y-3">
        {section.items.map(item => (
          <AnswerCard key={item.id} item={item} />
        ))}
      </div>
    </section>
  )
}

export default async function AnswerPage({ searchParams }: AnswerPageProps) {
  const session = await auth()
  if (!session?.user) redirect('/login')

  const { q } = await searchParams
  const query = q?.trim() ?? ''
  const hasQuery = query.length >= 2

  const answer = hasQuery ? await getAnswerContent(query) : null
  const totalItems = answer?.sections.reduce((sum, s) => sum + s.items.length, 0) ?? 0

  return (
    <div className="space-y-8 max-w-3xl">
      <div className="space-y-4">
        <Link
          href={query ? `/search?q=${encodeURIComponent(query)}` : '/search'}
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          ← Back to search results
        </Link>

        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="space-y-1">
            <h1 className="text-2xl font-bold tracking-tight">
              {query ? `"${query}"` : 'Guided Answer'}
            </h1>
            {answer && (
              <p className="text-sm text-muted-foreground">
                {totalItems === 0
                  ? 'No published content found for this question.'
                  : `${totalItems} item${totalItems === 1 ? '' : 's'} across ${answer.sections.length} area${answer.sections.length === 1 ? '' : 's'}`}
              </p>
            )}
          </div>
          {hasQuery && <PrintExportButton />}
        </div>
      </div>

      {/* Print cover sheet (#559). */}
      {hasQuery && <PrintCoverSheet orgName="" title={`Question: "${query}"`} />}

      <form action="/answers" method="get" className="flex gap-2">
        <input
          name="q"
          type="search"
          defaultValue={query}
          placeholder="Ask a question about your architecture…"
          autoFocus={!hasQuery}
          className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
        <button
          type="submit"
          className="rounded-md border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-muted transition-colors"
        >
          Answer
        </button>
      </form>

      {!hasQuery && (
        <div className="rounded-lg border border-dashed p-10 text-center space-y-3 text-muted-foreground">
          <p className="font-medium text-foreground">Ask a question about your architecture</p>
          {/* Example prompts as click-to-submit shortcuts (#550) — clearer
              than plain-text suggestions, which the audit found confused
              stakeholders who didn't realise the input above already exists. */}
          <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
            <span className="text-sm">Try:</span>
            {['permitting', 'replaced systems', 'digital services', 'financial reporting'].map(prompt => (
              <Link
                key={prompt}
                href={`/answers?q=${encodeURIComponent(prompt)}`}
                className="inline-flex items-center rounded-full border border-input bg-background px-3 py-1 text-xs font-medium hover:bg-muted transition-colors"
              >
                {prompt}
              </Link>
            ))}
          </div>
          <p className="text-xs pt-2">
            Results draw from published capabilities, services, applications, initiatives, and
            objectives — assembled for a stakeholder briefing, not raw search results.
          </p>
        </div>
      )}

      {hasQuery && totalItems === 0 && (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            No published content found for &ldquo;{query}&rdquo;. Try a broader term or check that
            relevant items are published.
          </CardContent>
        </Card>
      )}

      {hasQuery && totalItems > 0 && (
        <div className="space-y-10">
          {answer!.sections.map(section => (
            <AnswerSectionBlock key={section.heading} section={section} />
          ))}

          <p className="text-xs text-muted-foreground border-t pt-4">
            Generated from repository content &middot;{' '}
            {new Date().toLocaleDateString('en-US', {
              month: 'long',
              day: 'numeric',
              year: 'numeric',
            })}
          </p>
        </div>
      )}
    </div>
  )
}
