import { getConfidenceSummary, formatConfidenceDate } from '@/lib/confidence'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'

interface ConfidenceSummaryProps {
  orgId: string
}

const LABEL_STYLES: Record<string, string> = {
  'actively maintained': 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  'under development':   'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
  'getting started':     'bg-muted text-muted-foreground',
}

export async function ConfidenceSummary({ orgId }: ConfidenceSummaryProps) {
  const { label, lastUpdated, shouldShow, narrative } = await getConfidenceSummary(orgId)

  if (!shouldShow) return null

  return (
    <Card>
      <CardContent className="pt-4 pb-4">
        <div className="flex flex-wrap items-start gap-3">
          <span
            className={cn(
              'inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold capitalize shrink-0',
              LABEL_STYLES[label],
            )}
          >
            {label}
          </span>
          <div className="flex-1 min-w-0 space-y-1">
            {narrative && (
              <p className="text-sm text-foreground leading-relaxed">{narrative}</p>
            )}
            {lastUpdated && (
              <p className="text-xs text-muted-foreground">
                Last updated {formatConfidenceDate(lastUpdated)}
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
