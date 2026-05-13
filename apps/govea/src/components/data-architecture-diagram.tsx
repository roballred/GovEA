/**
 * Chen Notation visualization for the Data Architecture metamodel
 * (#363 PR-3 / #470). Server-rendered SVG — no client JS, no hydration.
 *
 * Layout is deterministic: entities placed in a horizontal row at the top,
 * sorted alphabetically; for each entity, its characterizing attributes
 * appear as ovals branching upward and its instantiating business keys as
 * underlined ovals branching downward. Edges across entities ("is related")
 * connect entity rectangles directly. Shared-attribute edges ("shares")
 * connect attribute ovals directly.
 *
 * Chen glyph conventions (per da-chen-visualization capability):
 *   Entity         → rectangle
 *   Attribute      → oval
 *   Business key   → oval with underlined text (Chen convention for keys)
 *   Relationship   → diamond, labeled with kind, placed midway on the edge
 *
 * Capability: da-chen-visualization
 * Persona: Enterprise Data Architect, Data Modeler
 */

import Link from 'next/link'
import type {
  DataArchitectureGraph, GraphEntityNode, GraphAttributeNode, GraphBusinessKeyNode,
} from '@/lib/data-architecture-graph'

// ── Layout constants ────────────────────────────────────────────────────────

const ENTITY_W = 160
const ENTITY_H = 56
const ATTR_W = 130
const ATTR_H = 36
const BK_W = 140
const BK_H = 36

const COL_W = ENTITY_W + 60          // horizontal stride per entity
const ROW_GAP = 24
const TOP_PAD = 80                   // space above entity row for attributes
const BOT_PAD = 60                   // space below entity row for business keys
const ENTITY_Y = TOP_PAD + 160       // y-coordinate of the entity row
const ATTR_BAND_Y = TOP_PAD          // y of the attribute cluster top
const BK_BAND_Y = ENTITY_Y + ENTITY_H + 40  // y of the business-key cluster top

const COLORS = {
  draft: {
    fill: '#f8fafc', stroke: '#94a3b8', text: '#475569',
  },
  published: {
    fill: '#ffffff', stroke: '#0f172a', text: '#0f172a',
  },
  archived: {
    fill: '#f1f5f9', stroke: '#cbd5e1', text: '#94a3b8',
  },
} as const

const EDGE = {
  'is-related':       { stroke: '#0f172a', dasharray: undefined, label: 'is related' },
  'characterized-by': { stroke: '#64748b', dasharray: undefined, label: undefined  }, // thin line from entity to attribute oval
  'shares':           { stroke: '#94a3b8', dasharray: '4 3',     label: 'shares' },
  'instantiates':     { stroke: '#0f172a', dasharray: undefined, label: 'instantiates' },
} as const

interface NodePos { x: number; y: number; w: number; h: number }

// ── Layout helpers ──────────────────────────────────────────────────────────

interface LaidOutGraph {
  width: number
  height: number
  entityPositions: Map<string, NodePos>
  attributePositions: Map<string, NodePos>
  bkPositions: Map<string, NodePos>
}

function computeLayout(graph: DataArchitectureGraph): LaidOutGraph {
  const entities = [...graph.entities].sort((a, b) => a.name.localeCompare(b.name))

  const entityPositions = new Map<string, NodePos>()
  const attributePositions = new Map<string, NodePos>()
  const bkPositions = new Map<string, NodePos>()

  // Group attributes per entity for cluster placement above each entity. An
  // attribute that characterizes multiple entities is assigned to its
  // alphabetically-first entity for layout purposes; cross-entity links are
  // still drawn correctly.
  const attrsByEntity = new Map<string, GraphAttributeNode[]>()
  const charEdges = graph.edges.filter(e => e.kind === 'characterized-by')
  for (const a of graph.attributes) {
    const owningEntityIds = charEdges
      .filter(e => e.targetId === a.id)
      .map(e => e.sourceId)
      .sort()
    const home = owningEntityIds[0] ?? '__orphan__'
    const list = attrsByEntity.get(home) ?? []
    list.push(a)
    attrsByEntity.set(home, list)
  }

  const bksByEntity = new Map<string, GraphBusinessKeyNode[]>()
  for (const bk of graph.businessKeys) {
    const list = bksByEntity.get(bk.owningEntityId) ?? []
    list.push(bk)
    bksByEntity.set(bk.owningEntityId, list)
  }

  // Place each entity + its cluster.
  let maxY = ENTITY_Y + ENTITY_H + BOT_PAD
  for (let i = 0; i < entities.length; i++) {
    const e = entities[i]
    const colX = i * COL_W + 40
    const cx = colX + ENTITY_W / 2

    entityPositions.set(e.id, { x: colX, y: ENTITY_Y, w: ENTITY_W, h: ENTITY_H })

    const eAttrs = (attrsByEntity.get(e.id) ?? []).slice().sort((a, b) => a.name.localeCompare(b.name))
    eAttrs.forEach((a, idx) => {
      const ax = cx - ATTR_W / 2
      const ay = ATTR_BAND_Y + idx * (ATTR_H + ROW_GAP)
      attributePositions.set(a.id, { x: ax, y: ay, w: ATTR_W, h: ATTR_H })
      const bottom = ay + ATTR_H
      if (bottom > maxY) maxY = bottom
    })

    const eBKs = (bksByEntity.get(e.id) ?? []).slice().sort((a, b) => a.name.localeCompare(b.name))
    eBKs.forEach((bk, idx) => {
      const bx = cx - BK_W / 2
      const by = BK_BAND_Y + idx * (BK_H + ROW_GAP)
      bkPositions.set(bk.id, { x: bx, y: by, w: BK_W, h: BK_H })
      const bottom = by + BK_H
      if (bottom > maxY) maxY = bottom
    })
  }

  // Orphan attributes (no characterized-by edge) get a row at the bottom.
  const orphans = (attrsByEntity.get('__orphan__') ?? []).slice().sort((a, b) => a.name.localeCompare(b.name))
  const orphanY = maxY + ROW_GAP * 2
  orphans.forEach((a, idx) => {
    attributePositions.set(a.id, {
      x: 40 + (idx % Math.max(1, entities.length || 1)) * COL_W + (COL_W - ATTR_W) / 2,
      y: orphanY + Math.floor(idx / Math.max(1, entities.length || 1)) * (ATTR_H + ROW_GAP),
      w: ATTR_W, h: ATTR_H,
    })
  })
  if (orphans.length > 0) {
    maxY = orphanY + Math.ceil(orphans.length / Math.max(1, entities.length || 1)) * (ATTR_H + ROW_GAP)
  }

  const width = Math.max(800, entities.length * COL_W + 80)
  const height = maxY + 40

  return { width, height, entityPositions, attributePositions, bkPositions }
}

// ── Renderer ────────────────────────────────────────────────────────────────

export function DataArchitectureDiagram({ graph }: { graph: DataArchitectureGraph }) {
  if (graph.entities.length === 0 && graph.attributes.length === 0 && graph.businessKeys.length === 0) {
    return (
      <div className="rounded-lg border bg-card p-6 text-sm text-muted-foreground">
        No metamodel objects yet. Create at least one entity to see it on the diagram.
      </div>
    )
  }

  const layout = computeLayout(graph)
  const { width, height, entityPositions, attributePositions, bkPositions } = layout

  // Resolve glyph centers for edge midpoint calculation.
  const center = (p: NodePos | undefined) => p ? ({ x: p.x + p.w / 2, y: p.y + p.h / 2 }) : null

  return (
    <div className="overflow-x-auto rounded-lg border bg-card">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        width={width} height={height}
        role="img"
        aria-label="Chen Notation diagram of the data architecture metamodel"
        style={{ display: 'block', minWidth: '100%' }}
      >
        {/* arrow marker for instantiates */}
        <defs>
          <marker id="arrow-instantiates" viewBox="0 0 10 10" refX="9" refY="5"
            markerWidth="7" markerHeight="7" orient="auto">
            <path d="M0,0 L10,5 L0,10 Z" fill="#0f172a" />
          </marker>
        </defs>

        {/* Edges first so nodes render on top */}
        {graph.edges.map((e, i) => {
          const a = center(entityPositions.get(e.sourceId) ?? attributePositions.get(e.sourceId))
          const b = center(
            e.kind === 'is-related' ? entityPositions.get(e.targetId)
            : e.kind === 'characterized-by' ? attributePositions.get(e.targetId)
            : e.kind === 'shares' ? attributePositions.get(e.targetId)
            : bkPositions.get(e.targetId), // instantiates → business key
          )
          if (!a || !b) return null
          const cfg = EDGE[e.kind]
          const midX = (a.x + b.x) / 2
          const midY = (a.y + b.y) / 2

          return (
            <g key={`e-${i}`}>
              <line
                x1={a.x} y1={a.y} x2={b.x} y2={b.y}
                stroke={cfg.stroke}
                strokeWidth={1.2}
                strokeDasharray={cfg.dasharray}
                markerEnd={e.kind === 'instantiates' ? 'url(#arrow-instantiates)' : undefined}
              />
              {/* Diamond glyph for labeled cross-object kinds */}
              {cfg.label && (
                <g transform={`translate(${midX} ${midY})`}>
                  <polygon
                    points="0,-9 14,0 0,9 -14,0"
                    fill="#ffffff"
                    stroke={cfg.stroke}
                    strokeWidth={1}
                  />
                  <text
                    x={0} y={3}
                    textAnchor="middle"
                    fontSize={9}
                    fontFamily="system-ui, sans-serif"
                    fill={cfg.stroke}
                  >
                    {cfg.label}
                  </text>
                </g>
              )}
            </g>
          )
        })}

        {/* Entities — rectangles */}
        {graph.entities.map(e => {
          const p = entityPositions.get(e.id)
          if (!p) return null
          const c = COLORS[e.status]
          return (
            <Link key={e.id} href={`/data/entities/${e.id}`}>
              <g transform={`translate(${p.x} ${p.y})`}>
                <rect width={p.w} height={p.h} fill={c.fill} stroke={c.stroke} strokeWidth={1.5} rx={3} />
                <text
                  x={p.w / 2} y={p.h / 2 + 4}
                  textAnchor="middle"
                  fontSize={13}
                  fontFamily="system-ui, sans-serif"
                  fontWeight={600}
                  fill={c.text}
                >
                  {truncate(e.name, 20)}
                </text>
                {e.physicalHubTableName && (
                  <text
                    x={p.w / 2} y={p.h / 2 + 18}
                    textAnchor="middle"
                    fontSize={10}
                    fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
                    fill={c.text}
                    opacity={0.6}
                  >
                    {truncate(e.physicalHubTableName, 22)}
                  </text>
                )}
              </g>
            </Link>
          )
        })}

        {/* Attributes — ovals */}
        {graph.attributes.map(a => {
          const p = attributePositions.get(a.id)
          if (!p) return null
          const c = COLORS[a.status]
          return (
            <Link key={a.id} href={`/data/attributes/${a.id}`}>
              <g transform={`translate(${p.x} ${p.y})`}>
                <ellipse
                  cx={p.w / 2} cy={p.h / 2}
                  rx={p.w / 2} ry={p.h / 2}
                  fill={c.fill} stroke={c.stroke} strokeWidth={1.2}
                />
                <text
                  x={p.w / 2} y={p.h / 2 + 4}
                  textAnchor="middle"
                  fontSize={12}
                  fontFamily="system-ui, sans-serif"
                  fill={c.text}
                >
                  {truncate(a.name, 16)}
                </text>
              </g>
            </Link>
          )
        })}

        {/* Business keys — ovals with underlined text (Chen key convention) */}
        {graph.businessKeys.map(bk => {
          const p = bkPositions.get(bk.id)
          if (!p) return null
          const c = COLORS[bk.status]
          const label = truncate(bk.name, 16)
          // approximate underline width for visual key indication
          const underlineW = Math.min(label.length * 7, p.w - 16)
          return (
            <Link key={bk.id} href={`/data/business-keys/${bk.id}`}>
              <g transform={`translate(${p.x} ${p.y})`}>
                <ellipse
                  cx={p.w / 2} cy={p.h / 2}
                  rx={p.w / 2} ry={p.h / 2}
                  fill={c.fill} stroke={c.stroke} strokeWidth={1.2}
                />
                <text
                  x={p.w / 2} y={p.h / 2 + 4}
                  textAnchor="middle"
                  fontSize={12}
                  fontFamily="system-ui, sans-serif"
                  fill={c.text}
                  fontWeight={500}
                >
                  {label}
                </text>
                <line
                  x1={(p.w - underlineW) / 2}
                  y1={p.h / 2 + 7}
                  x2={(p.w + underlineW) / 2}
                  y2={p.h / 2 + 7}
                  stroke={c.text}
                  strokeWidth={1}
                />
              </g>
            </Link>
          )
        })}
      </svg>
    </div>
  )
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function truncate(s: string, n: number): string {
  return s.length <= n ? s : s.slice(0, n - 1) + '…'
}
