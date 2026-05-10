import { Card, CardContent } from '@/components/ui/card'
import { getCompletenessTrend, type TrendPoint } from '@/lib/completeness-trend'
import { cn } from '@/lib/utils'

interface CompletenessTrendProps {
  orgId: string
  /** How many days back to chart. Defaults to 90. */
  daysBack?: number
}

/**
 * Sparkline of the completeness score over the configured window.
 * Renders nothing if there is no snapshot history yet (org just enabled
 * the snapshot pipeline).
 *
 * Inline SVG, no chart libraries. Accessible via a textual fallback in
 * the title attribute.
 */
export async function CompletenessTrend({ orgId, daysBack = 90 }: CompletenessTrendProps) {
  const points = await getCompletenessTrend(orgId, daysBack)

  if (points.length === 0) return null

  const latest = points[points.length - 1]
  const oldest = points[0]
  const delta = latest.score - oldest.score

  return (
    <Card>
      <CardContent className="pt-4 pb-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Completeness trend
            </p>
            <p className="text-sm text-muted-foreground mt-0.5">
              {latest.score}% today
              {points.length > 1 && (
                <>
                  {' · '}
                  <span className={cn(
                    delta > 0 && 'text-green-700 dark:text-green-400',
                    delta < 0 && 'text-amber-600 dark:text-amber-400',
                  )}>
                    {delta > 0 ? '+' : ''}{delta}pt over {points.length} days
                  </span>
                </>
              )}
            </p>
          </div>
          <Sparkline points={points} />
        </div>
      </CardContent>
    </Card>
  )
}

function Sparkline({ points }: { points: TrendPoint[] }) {
  if (points.length < 2) {
    // Single data point — show a flat marker rather than nothing
    return (
      <span className="text-xs text-muted-foreground">
        Not enough history yet
      </span>
    )
  }

  const width = 160
  const height = 32
  const pad = 2

  const xs = points.map((_, i) => pad + (i / (points.length - 1)) * (width - 2 * pad))
  const ys = points.map(p => {
    const score = Math.max(0, Math.min(100, p.score))
    return height - pad - (score / 100) * (height - 2 * pad)
  })

  const path = xs.map((x, i) => `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${ys[i].toFixed(1)}`).join(' ')

  const title = `${points[0].score}% on ${points[0].date} → ${points.at(-1)!.score}% on ${points.at(-1)!.date}`

  return (
    <svg
      role="img"
      aria-label={title}
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className="text-primary"
    >
      <title>{title}</title>
      <path
        d={path}
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle
        cx={xs.at(-1)!.toFixed(1)}
        cy={ys.at(-1)!.toFixed(1)}
        r={2}
        fill="currentColor"
      />
    </svg>
  )
}
