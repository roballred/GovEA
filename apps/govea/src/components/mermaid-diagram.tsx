'use client'

import { useEffect, useRef, useState } from 'react'

export function MermaidDiagram({ chart }: { chart: string }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function render() {
      const mermaid = (await import('mermaid')).default
      mermaid.initialize({
        startOnLoad: false,
        // #740 — chart text is built from user-controlled data (capability
        // names/relationships). 'strict' makes mermaid HTML-escape labels and
        // disables click-event/script handlers in the rendered SVG.
        securityLevel: 'strict',
        theme: 'base',
        themeVariables: {
          fontFamily: 'system-ui, -apple-system, sans-serif',
          fontSize: '13px',
        },
      })

      try {
        const id = `mermaid-${Math.random().toString(36).slice(2)}`
        const { svg } = await mermaid.render(id, chart)
        if (!cancelled && containerRef.current) {
          containerRef.current.innerHTML = svg
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Diagram error')
      }
    }

    render()
    return () => { cancelled = true }
  }, [chart])

  if (error) {
    return (
      <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive font-mono">
        {error}
      </div>
    )
  }

  return (
    <div
      ref={containerRef}
      className="w-full overflow-x-auto rounded-lg border border-border bg-card p-4 [&_svg]:max-w-full [&_svg]:h-auto"
    />
  )
}
