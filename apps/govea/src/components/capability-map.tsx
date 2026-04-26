'use client'

import { useCallback, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { CapabilityTrace } from '@/actions/traceability'

// ── Layout constants ──────────────────────────────────────────────────────────

const NW  = 170   // satellite node width
const NH  = 56    // satellite node height
const FW  = 200   // focal node width
const FH  = 68    // focal node height
const GX  = 80    // horizontal gap between columns (edge routing space)
const GY  = 14    // vertical gap between sibling nodes
const PY  = 40    // vertical padding top/bottom

const LEFT_X  = 0
const FOC_X   = NW + GX            // 250
const RIGHT_X = NW + GX + FW + GX  // 530
const CVW     = RIGHT_X + NW        // 700 — total canvas width

// ── Color tokens (hex — used directly in SVG attributes) ──────────────────────

const COLORS = {
  focal: {
    fill: '#0f172a', stroke: '#0f172a',
    text: '#ffffff',  sub: '#94a3b8',
  },
  objective: {
    fill: '#f5f3ff', stroke: '#c4b5fd',
    text: '#5b21b6',  sub: '#7c3aed',
  },
  application: {
    fill: '#f8fafc', stroke: '#e2e8f0',
    text: '#0f172a',  sub: '#64748b',
  },
  persona: {
    fill: '#eef2ff', stroke: '#c7d2fe',
    text: '#3730a3',  sub: '#4f46e5',
  },
} as const

type NodeType = keyof typeof COLORS

const EDGE_DEFAULT = '#cbd5e1'
const EDGE_ACTIVE  = '#6366f1'
const EDGE_DIM     = '#f1f5f9'

const FONT = 'system-ui, -apple-system, sans-serif'

// ── Internal layout types ─────────────────────────────────────────────────────

interface LayoutNode {
  id: string
  type: NodeType
  label: string
  sub?: string
  href: string
  x: number; y: number; w: number; h: number
}

interface LayoutEdge {
  id: string
  sourceId: string
  targetId: string
  x1: number; y1: number
  x2: number; y2: number
}

// ── Layout computation (pure) ─────────────────────────────────────────────────

function computeLayout(trace: CapabilityTrace): {
  nodes: LayoutNode[]
  edges: LayoutEdge[]
  canvasHeight: number
} {
  const leftItems = trace.objectives.map(o => ({
    id: `obj-${o.id}`,
    type: 'objective' as NodeType,
    label: o.name,
    sub: o.timeHorizon ?? undefined,
    href: `/objectives/${o.id}`,
  }))

  const rightItems: Array<Omit<LayoutNode, 'x' | 'y' | 'w' | 'h'>> = [
    ...trace.applications.map(a => ({
      id: `app-${a.id}`,
      type: 'application' as NodeType,
      label: a.name,
      sub: a.vendor ?? undefined,
      href: `/applications/${a.id}`,
    })),
    ...trace.personas.map(p => ({
      id: `per-${p.id}`,
      type: 'persona' as NodeType,
      label: p.name,
      sub: p.type ?? undefined,
      href: `/personas/${p.id}`,
    })),
  ]

  // Canvas height driven by the tallest column
  const sideCount = Math.max(leftItems.length, rightItems.length, 1)
  const sideColH  = sideCount * NH + (sideCount - 1) * GY
  const canvasHeight = Math.max(sideColH, FH) + PY * 2

  const focalY = Math.round((canvasHeight - FH) / 2)

  const nodes: LayoutNode[] = []
  const edges: LayoutEdge[]  = []

  // Focal node
  nodes.push({
    id: 'focal',
    type: 'focal',
    label: trace.name,
    sub: trace.domain ?? undefined,
    href: `/capabilities/${trace.id}`,
    x: FOC_X, y: focalY, w: FW, h: FH,
  })

  // Left column — vertically centred
  const leftColH    = Math.max(leftItems.length, 1) * NH + (Math.max(leftItems.length, 1) - 1) * GY
  const leftStartY  = Math.round((canvasHeight - leftColH) / 2)

  leftItems.forEach((item, i) => {
    const y = leftStartY + i * (NH + GY)
    nodes.push({ ...item, x: LEFT_X, y, w: NW, h: NH })
    edges.push({
      id: `e-${item.id}`,
      sourceId: item.id,
      targetId: 'focal',
      x1: LEFT_X + NW, y1: y + NH / 2,
      x2: FOC_X,       y2: focalY + FH / 2,
    })
  })

  // Right column — vertically centred
  const rightColH   = Math.max(rightItems.length, 1) * NH + (Math.max(rightItems.length, 1) - 1) * GY
  const rightStartY = Math.round((canvasHeight - rightColH) / 2)

  rightItems.forEach((item, i) => {
    const y = rightStartY + i * (NH + GY)
    nodes.push({ ...item, x: RIGHT_X, y, w: NW, h: NH })
    edges.push({
      id: `e-focal-${item.id}`,
      sourceId: 'focal',
      targetId: item.id,
      x1: FOC_X + FW, y1: focalY + FH / 2,
      x2: RIGHT_X,    y2: y + NH / 2,
    })
  })

  return { nodes, edges, canvasHeight }
}

// ── Bezier path helper ────────────────────────────────────────────────────────

function bezierH(x1: number, y1: number, x2: number, y2: number): string {
  const mx = x1 + (x2 - x1) * 0.5
  return `M ${x1} ${y1} C ${mx} ${y1}, ${mx} ${y2}, ${x2} ${y2}`
}

// ── Truncate helper ───────────────────────────────────────────────────────────

function trunc(s: string, max: number): string {
  return s.length > max ? s.slice(0, max - 1) + '…' : s
}

// ── Node ──────────────────────────────────────────────────────────────────────

function MapNode({
  node,
  hoveredId,
  onEnter,
  onLeave,
  onActivate,
}: {
  node: LayoutNode
  hoveredId: string | null
  onEnter: (id: string) => void
  onLeave: () => void
  onActivate: (href: string) => void
}) {
  const c  = COLORS[node.type]
  const rx = 8

  const isHovered = hoveredId === node.id
  // Dim satellite nodes when a different satellite is hovered
  const isDimmed  =
    hoveredId !== null &&
    hoveredId !== node.id &&
    node.id !== 'focal' &&
    hoveredId !== 'focal'

  const label = trunc(node.label, node.type === 'focal' ? 26 : 22)
  const sub   = node.sub ? trunc(node.sub, 24) : undefined

  const labelY = node.y + (sub ? node.h / 2 - 9 : node.h / 2)
  const subY   = node.y + node.h / 2 + 10

  return (
    <g
      role="button"
      tabIndex={0}
      aria-label={`${node.label}${node.sub ? ` — ${node.sub}` : ''}`}
      style={{ cursor: 'pointer', opacity: isDimmed ? 0.3 : 1, transition: 'opacity 120ms' }}
      onMouseEnter={() => onEnter(node.id)}
      onMouseLeave={onLeave}
      onClick={() => onActivate(node.href)}
      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onActivate(node.href) } }}
    >
      <title>{node.label}{node.sub ? ` (${node.sub})` : ''}</title>

      <rect
        x={node.x} y={node.y} width={node.w} height={node.h}
        rx={rx} ry={rx}
        fill={c.fill}
        stroke={isHovered ? EDGE_ACTIVE : c.stroke}
        strokeWidth={isHovered ? 2 : 1}
        style={{ transition: 'stroke 120ms' }}
      />

      <text
        x={node.x + node.w / 2} y={labelY}
        textAnchor="middle" dominantBaseline="middle"
        fontSize={node.type === 'focal' ? 13 : 12}
        fontWeight={node.type === 'focal' ? 600 : 500}
        fill={c.text}
        style={{ fontFamily: FONT, userSelect: 'none' }}
      >
        {label}
      </text>

      {sub && (
        <text
          x={node.x + node.w / 2} y={subY}
          textAnchor="middle" dominantBaseline="middle"
          fontSize={10}
          fill={c.sub}
          style={{ fontFamily: FONT, userSelect: 'none' }}
        >
          {sub}
        </text>
      )}
    </g>
  )
}

// ── Empty-state placeholder ───────────────────────────────────────────────────

function GapNode({ x, y, message }: { x: number; y: number; message: string }) {
  return (
    <g>
      <rect
        x={x} y={y} width={NW} height={NH}
        rx={8} ry={8}
        fill="#fefce8" stroke="#fde68a" strokeWidth={1}
        strokeDasharray="4 3"
      />
      <text
        x={x + NW / 2} y={y + NH / 2}
        textAnchor="middle" dominantBaseline="middle"
        fontSize={10} fill="#92400e"
        style={{ fontFamily: FONT, userSelect: 'none' }}
      >
        {message}
      </text>
    </g>
  )
}

// ── Axis label ────────────────────────────────────────────────────────────────

function AxisLabel({ x, y, children }: { x: number; y: number; children: string }) {
  return (
    <text
      x={x} y={y}
      textAnchor="middle"
      fontSize={9} fontWeight={600}
      fill="#94a3b8"
      letterSpacing={1}
      style={{ fontFamily: FONT, textTransform: 'uppercase', userSelect: 'none' }}
    >
      {children}
    </text>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export function CapabilityMap({ trace }: { trace: CapabilityTrace }) {
  const router = useRouter()
  const [hoveredId, setHoveredId] = useState<string | null>(null)

  const onEnter    = useCallback((id: string) => setHoveredId(id), [])
  const onLeave    = useCallback(() => setHoveredId(null), [])
  const onActivate = useCallback((href: string) => router.push(href), [router])

  const { nodes, edges, canvasHeight } = computeLayout(trace)

  const hasNoLeft  = trace.objectives.length === 0
  const hasNoRight = trace.applications.length === 0 && trace.personas.length === 0

  const midY = Math.round(canvasHeight / 2)

  return (
    <div className="w-full overflow-x-auto rounded-lg border border-border bg-card">
      <svg
        viewBox={`0 0 ${CVW} ${canvasHeight}`}
        width="100%"
        style={{ minWidth: 420, display: 'block' }}
        role="img"
        aria-label={`Relationship map for capability: ${trace.name}`}
      >
        <title>Capability relationship map — {trace.name}</title>

        {/* Column axis labels */}
        <AxisLabel x={LEFT_X + NW / 2} y={14}>Objectives</AxisLabel>
        <AxisLabel x={FOC_X + FW / 2}  y={14}>Capability</AxisLabel>
        <AxisLabel x={RIGHT_X + NW / 2} y={14}>Applications & Personas</AxisLabel>

        {/* Empty-state gap nodes */}
        {hasNoLeft && (
          <GapNode x={LEFT_X} y={midY - NH / 2} message="No objectives linked" />
        )}
        {hasNoRight && (
          <GapNode x={RIGHT_X} y={midY - NH / 2} message="No apps or personas" />
        )}

        {/* Edges — rendered behind nodes */}
        {edges.map(edge => {
          const adjacent = hoveredId === edge.sourceId || hoveredId === edge.targetId
          const color =
            hoveredId === null  ? EDGE_DEFAULT :
            adjacent            ? EDGE_ACTIVE  : EDGE_DIM
          return (
            <path
              key={edge.id}
              d={bezierH(edge.x1, edge.y1, edge.x2, edge.y2)}
              fill="none"
              stroke={color}
              strokeWidth={adjacent && hoveredId !== null ? 2 : 1.5}
              style={{ transition: 'stroke 120ms, stroke-width 120ms' }}
            />
          )
        })}

        {/* Nodes */}
        {nodes.map(node => (
          <MapNode
            key={node.id}
            node={node}
            hoveredId={hoveredId}
            onEnter={onEnter}
            onLeave={onLeave}
            onActivate={onActivate}
          />
        ))}
      </svg>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 px-4 py-2.5 border-t border-border text-xs text-muted-foreground">
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
        <span className="ml-auto">Click any node to open its detail page</span>
      </div>
    </div>
  )
}
