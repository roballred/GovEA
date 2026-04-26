# Relationship Visualization — Design

**Issue:** [#281](https://github.com/roballred/GovEA/issues/281)
**Status:** First slice implemented (capability focal map)

---

## Decisions

### Rendering: app-native SVG

Relationship maps are rendered as inline SVG in React components. No D3, no external graph library, no PlantUML as the runtime surface.

Rationale:
- SVG integrates with React state (hover, click) without a separate runtime
- Layout is deterministic — no force simulation means no jitter or non-reproducible positions
- Accessible with `role`, `aria-label`, keyboard navigation, and `<title>` elements
- Scales responsively via `viewBox`

PlantUML and Mermaid remain useful for capability design, ADRs, and issue discussion but are not the in-product visualization layer.

### Layout: deterministic columns

Maps use a left-to-right column layout. Columns are fixed:
- **Left column** — upstream context (what justifies this object)
- **Center** — focal object (always rendered prominent)
- **Right column** — downstream delivery (what this object produces or connects to)

This creates a consistent reading direction: mission → capability → technology/people.

Force-directed layouts are explicitly rejected. They produce different results on each render, make it hard to predict where to look, and degrade with larger node counts.

### Scope: focal-object views only

Each map is centered on one object. The first slice centers on a Capability. There is no "show me everything" graph. This is a product constraint, not a technical one — the data model could support a full graph but readability would collapse.

### Hop limit: 1-hop in v1

The first slice shows only direct relationships (1 hop from the focal node). 2-hop expansion is a follow-on.

### Coexistence with traceability

The relationship map complements the existing traceability view, it does not replace it. The traceability view is better for deep drill-down and gap identification. The map is better for orientation and communication. Both are accessible from the capability detail page.

---

## First slice: Capability focal map

### Surface

`/capabilities/[id]/map` — dedicated route, linked from the capability detail page header.

Chose a dedicated route over an inline panel to:
- keep the detail page clean
- allow the map to use more horizontal space (max-w-4xl vs max-w-3xl)
- follow the same pattern as the existing traceability route

### Data

Reuses `getCapabilityTrace(id)` from `src/actions/traceability.ts`. No new queries needed. The existing trace includes all 1-hop relationships: objectives, applications, personas, initiatives, ADRs, principles.

The map renders: **objectives** (left), **applications + personas** (right). Initiatives, ADRs, and principles are excluded from v1 — they're available via the traceability view.

### Layout algorithm

```
Canvas width: 700px (viewBox, scales responsively)

Left col:   x=0,   width=170
Center:     x=250, width=200
Right col:  x=530, width=170

Horizontal gap between columns: 80px (edge routing space)
Vertical gap between sibling nodes: 14px
Vertical padding top/bottom: 32px

Node height (satellite): 56px
Node height (focal): 68px

Canvas height: PAD*2 + max(leftCount, rightCount, 1) * (NH + GY) - GY
               minimum: 200px
```

Edges are cubic bezier curves: `M x1 y1 C mx y1, mx y2, x2 y2` where `mx = x1 + (x2-x1)*0.5`. This creates symmetric S-curves.

### Color coding

| Node type   | Background  | Border       | Text         |
|-------------|-------------|--------------|--------------|
| Focal       | slate-900   | slate-900    | white        |
| Objective   | violet-50   | violet-300   | violet-800   |
| Application | slate-50    | slate-200    | slate-900    |
| Persona     | indigo-50   | indigo-200   | indigo-800   |

Edge lines: slate-300 default, indigo-500 on hover of adjacent node, slate-100 (dim) when a different node is hovered.

### Interaction

- **Hover node** — node border turns indigo, adjacent edges turn indigo, non-adjacent edges dim
- **Click node** — `router.push(href)` navigates to entity detail page
- **Keyboard** — nodes are `tabIndex={0}` with `onKeyDown` for Enter/Space
- **Empty state** — when a column has no nodes, a dashed amber placeholder appears with a plain-language message

### Accessibility

- SVG has `role="img"` and `aria-label`
- `<title>` element inside SVG for screen readers
- Each node has `role="button"` and `aria-label` with name + sublabel
- Each node is keyboard-focusable

### Visibility rules

`getCapabilityTrace` already enforces `canReadFederatedEntity` on the focal capability. Nodes in the map are the same relationships already visible via the traceability page — no new visibility logic needed.

---

## Component

`src/components/capability-map.tsx` — client component (`'use client'`).

Props: `{ trace: CapabilityTrace }`

The component:
1. Computes node and edge layout positions (pure function, no side effects)
2. Renders SVG with column axis labels, edges (behind nodes), nodes
3. Manages hover state via `useState`
4. Navigates on click via `useRouter`
5. Renders an HTML legend below the SVG

---

## Follow-on slices

These are not in scope for the first implementation but are the natural next steps:

| Slice | Surface | Notes |
|-------|---------|-------|
| 2 | Application focal map | Application → Capabilities → Objectives + Personas |
| 3 | 2-hop expansion toggle | Show neighbors of neighbors on demand |
| 4 | Service focal map | Persona → Service → Capabilities → Applications |
| 5 | Objective focal map | Objective → Capabilities → Applications |
| 6 | Matrix view | Capabilities × Applications heatmap |

Follow-on implementation issues should be opened once the first slice is validated.

---

## Explicit non-goals (permanent)

- No whole-repository "show me everything" graph
- No force-directed layout as default
- No formal notation (ArchiMate, BPMN, UML)
- The map never replaces table/detail access — it complements it
