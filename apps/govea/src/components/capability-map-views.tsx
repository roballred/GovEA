'use client'

import { useState } from 'react'
import { CapabilityMap } from '@/components/capability-map'
import { MermaidDiagram } from '@/components/mermaid-diagram'
import type { CapabilityTrace } from '@/actions/traceability'

type View = 'map' | 'diagram'

export function CapabilityMapViews({
  trace,
  chart,
}: {
  trace: CapabilityTrace
  chart: string
}) {
  const [view, setView] = useState<View>('map')

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-1 rounded-lg border border-border bg-muted p-1 w-fit text-sm">
        <button
          onClick={() => setView('map')}
          className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
            view === 'map'
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Map
        </button>
        <button
          onClick={() => setView('diagram')}
          className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
            view === 'diagram'
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Diagram
        </button>
      </div>

      {view === 'map' && <CapabilityMap trace={trace} />}
      {view === 'diagram' && (
        <div className="space-y-3">
          <MermaidDiagram chart={chart} />
          <div className="flex flex-wrap gap-x-5 gap-y-1.5 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span className="inline-block w-3 h-3 rounded-sm bg-slate-900" />
              Capability
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block w-3 h-3 rounded-sm bg-violet-50 border border-violet-300" />
              Objective
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block w-3 h-3 rounded-sm bg-slate-50 border border-slate-200" />
              Application
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block w-3 h-3 rounded-sm bg-indigo-50 border border-indigo-200" />
              Persona
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block w-3 h-3 rounded-sm bg-green-50 border border-green-200" />
              Initiative
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block w-3 h-3 rounded-sm bg-orange-50 border border-orange-200" />
              ADR
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block w-3 h-3 rounded-sm bg-fuchsia-50 border border-purple-200" />
              Principle
            </span>
            <span className="ml-auto">Solid lines = direct dependency · Dashed = governance</span>
          </div>
        </div>
      )}
    </div>
  )
}
