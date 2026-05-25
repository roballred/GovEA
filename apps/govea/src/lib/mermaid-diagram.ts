import type { CapabilityTrace, ObjectiveTrace, ServiceTrace } from '@/actions/traceability'

type TraceData = CapabilityTrace | ObjectiveTrace | ServiceTrace

function nid(prefix: string, id: string): string {
  return `${prefix}_${id.replace(/-/g, '_')}`
}

function label(primary: string, secondary?: string | null): string {
  const safe = (s: string) => s.replace(/"/g, "'")
  return secondary
    ? `["${safe(primary)}\n${safe(secondary)}"]`
    : `["${safe(primary)}"]`
}

function capabilityDiagram(trace: CapabilityTrace): string {
  const lines: string[] = ['graph LR']
  const focal = nid('cap', trace.id)
  const initiativeNodes = new Set<string>()

  lines.push(`  ${focal}${label(trace.name, trace.domain)}:::capability`)

  for (const g of trace.goals) {
    const n = nid('goal', g.id)
    lines.push(`  ${n}${label(g.name, g.planningHorizon)}:::goal`)
  }

  for (const o of trace.objectives) {
    const n = nid('obj', o.id)
    lines.push(`  ${n}${label(o.name, o.timeHorizon)}:::objective`)
    for (const g of o.goals ?? []) {
      lines.push(`  ${nid('goal', g.id)} --> ${n}`)
    }
    for (const i of o.initiatives ?? []) {
      const ini = nid('ini', i.id)
      if (!initiativeNodes.has(ini)) {
        lines.push(`  ${ini}${label(i.name, i.status)}:::initiative`)
        initiativeNodes.add(ini)
      }
      lines.push(`  ${n} -.-> ${ini}`)
      lines.push(`  ${ini} -.-> ${focal}`)
    }
    lines.push(`  ${n} --> ${focal}`)
  }

  for (const a of trace.applications) {
    const n = nid('app', a.id)
    lines.push(`  ${n}${label(a.name, a.vendor)}:::application`)
    lines.push(`  ${focal} --> ${n}`)
  }

  for (const p of trace.personas) {
    const n = nid('per', p.id)
    lines.push(`  ${n}${label(p.name, p.type)}:::persona`)
    lines.push(`  ${focal} --- ${n}`)
  }

  for (const i of trace.initiatives) {
    const n = nid('ini', i.id)
    if (!initiativeNodes.has(n)) {
      lines.push(`  ${n}${label(i.name, i.status)}:::initiative`)
      initiativeNodes.add(n)
    }
    lines.push(`  ${n} -.-> ${focal}`)
  }

  for (const a of trace.adrs) {
    const n = nid('adr', a.id)
    lines.push(`  ${n}${label(a.number, a.title)}:::adr`)
    lines.push(`  ${n} -.-> ${focal}`)
  }

  for (const p of trace.principles) {
    const n = nid('pri', p.id)
    lines.push(`  ${n}${label(p.name)}:::principle`)
    lines.push(`  ${n} -.-> ${focal}`)
  }

  lines.push('')
  lines.push('  classDef goal        fill:#ecfeff,stroke:#67e8f9,color:#155e75')
  lines.push('  classDef capability fill:#0f172a,stroke:#0f172a,color:#fff,rx:8')
  lines.push('  classDef objective  fill:#f5f3ff,stroke:#c4b5fd,color:#5b21b6')
  lines.push('  classDef application fill:#f8fafc,stroke:#e2e8f0,color:#0f172a')
  lines.push('  classDef persona    fill:#eef2ff,stroke:#c7d2fe,color:#3730a3')
  lines.push('  classDef initiative fill:#f0fdf4,stroke:#bbf7d0,color:#166534')
  lines.push('  classDef adr        fill:#fff7ed,stroke:#fed7aa,color:#9a3412')
  lines.push('  classDef principle  fill:#fdf4ff,stroke:#e9d5ff,color:#6b21a8')

  return lines.join('\n')
}

function objectiveDiagram(trace: ObjectiveTrace): string {
  const lines: string[] = ['graph LR']
  const focal = nid('obj', trace.id)

  lines.push(`  ${focal}${label(trace.name, trace.timeHorizon)}:::objective`)

  for (const g of trace.goals) {
    const n = nid('goal', g.id)
    lines.push(`  ${n}${label(g.name, g.planningHorizon)}:::goal`)
    lines.push(`  ${n} --> ${focal}`)
  }

  for (const i of trace.initiatives) {
    const n = nid('ini', i.id)
    lines.push(`  ${n}${label(i.name, i.status)}:::initiative`)
    lines.push(`  ${n} -.-> ${focal}`)
  }

  for (const c of trace.capabilities) {
    const cn = nid('cap', c.id)
    lines.push(`  ${cn}${label(c.name, c.domain)}:::capability`)
    lines.push(`  ${focal} --> ${cn}`)

    for (const a of c.applications) {
      const an = nid('app', a.id)
      lines.push(`  ${an}${label(a.name, a.vendor)}:::application`)
      lines.push(`  ${cn} --> ${an}`)
    }
  }

  lines.push('')
  lines.push('  classDef goal        fill:#ecfeff,stroke:#67e8f9,color:#155e75')
  lines.push('  classDef objective  fill:#f5f3ff,stroke:#c4b5fd,color:#5b21b6')
  lines.push('  classDef capability fill:#0f172a,stroke:#0f172a,color:#fff')
  lines.push('  classDef application fill:#f8fafc,stroke:#e2e8f0,color:#0f172a')
  lines.push('  classDef initiative fill:#f0fdf4,stroke:#bbf7d0,color:#166534')

  return lines.join('\n')
}

function serviceDiagram(trace: ServiceTrace): string {
  const lines: string[] = ['graph LR']
  const focal = nid('svc', trace.id)

  lines.push(`  ${focal}${label(trace.name)}:::service`)

  for (const p of trace.personas) {
    const n = nid('per', p.id)
    lines.push(`  ${n}${label(p.name, p.type)}:::persona`)
    lines.push(`  ${n} --> ${focal}`)
  }

  for (const c of trace.capabilities) {
    const cn = nid('cap', c.id)
    lines.push(`  ${cn}${label(c.name, c.domain)}:::capability`)
    lines.push(`  ${focal} --> ${cn}`)

    for (const a of c.applications) {
      const an = nid('app', a.id)
      lines.push(`  ${an}${label(a.name, a.vendor)}:::application`)
      lines.push(`  ${cn} --> ${an}`)
    }
  }

  lines.push('')
  lines.push('  classDef service    fill:#0f172a,stroke:#0f172a,color:#fff')
  lines.push('  classDef persona    fill:#eef2ff,stroke:#c7d2fe,color:#3730a3')
  lines.push('  classDef capability fill:#e0f2fe,stroke:#bae6fd,color:#0c4a6e')
  lines.push('  classDef application fill:#f8fafc,stroke:#e2e8f0,color:#0f172a')

  return lines.join('\n')
}

export function traceToMermaid(trace: TraceData): string {
  switch (trace.kind) {
    case 'capability': return capabilityDiagram(trace)
    case 'objective':  return objectiveDiagram(trace)
    case 'service':    return serviceDiagram(trace)
  }
}
