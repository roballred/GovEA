'use client'

import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

interface CoverageTileLabelProps {
  label: string
  tooltip?: string
}

export function CoverageTileLabel({ label, tooltip }: CoverageTileLabelProps) {
  if (!tooltip) return <>{label}</>
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="underline decoration-dotted underline-offset-2 cursor-help">{label}</span>
      </TooltipTrigger>
      <TooltipContent>{tooltip}</TooltipContent>
    </Tooltip>
  )
}
