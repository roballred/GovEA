# Base Item Foundation for Reusable Taxonomy and Shared Content Behavior

**Related issue:** [#349](https://github.com/roballred/GovEA/issues/349)  
**Status:** Partially implemented

---

## Summary

GovEA currently supports taxonomy-backed fields only where a specific entity has been wired for them in code. That works for today's hardcoded cases, but it does not scale to the broader product direction where administrators can define reusable classification structures and apply them across multiple item types without developer intervention.

This document proposes and now partially validates a **base item foundation** for GovEA. The key idea is:

- treat core content records as a shared family of **items**
- move reusable concerns such as taxonomy assignment onto that shared layer
- keep entity-specific tables for entity-specific fields

This is intentionally **foundational**, not a full meta-model rewrite. The near-term goal is to create a shared platform layer that lets applications, capabilities, initiatives, ADRs, and similar records opt into common behaviors without bespoke one-off implementation each time.

Since this note was first drafted, GovEA has shipped the first two real pilots of the shared taxonomy model:

- applications as the initial shared taxonomy-backed extension surface
- capabilities as the second entity pilot, including `Capability Priority`

The broader multi-entity rollout is still future work, but the direction is no longer only conceptual.

---

## Problem

Today, GovEA has two different configuration stories:

1. **Taxonomy UI** lets administrators define Types and Values
2. **Application code** decides which entities can actually use those values

That creates a real gap:

- a CMS Administrator can create a new taxonomy type
- but that type does not become usable on applications, capabilities, ADRs, or other records unless a developer adds a field and UI for it

This limits the usefulness of Taxonomy Management and works against the documented direction in `cm-content-types.md`, where taxonomy fields should behave more like reusable building blocks.

There is also a broader structural problem: several cross-cutting concerns are repeatedly implemented per entity rather than modeled once for all content items.

Examples:

- taxonomy-backed classification
- status / workflow signaling
- visibility
- audit metadata
- common detail rendering sections
- filter and badge rendering

Without a shared base, every new reusable feature becomes a per-entity retrofit.

---

## Goals

1. Define a shared conceptual model for GovEA content items.
2. Make taxonomy assignment reusable across supported entity types.
3. Preserve existing entity-specific tables and workflows where they are still the right fit.
4. Avoid a disruptive all-at-once meta-model rewrite.
5. Create a foundation that can support later shared behaviors beyond taxonomy.

---

## Non-Goals

- Replace all existing entity tables with a single polymorphic mega-table.
- Deliver full user-defined content types in this slice.
- Standardize every workflow/status model immediately.
- Rebuild all list pages, reports, and detail pages in one pass.
- Introduce public plugin-style schema mutation for arbitrary custom entities.

This proposal is about **shared foundations**, not unlimited customization.

---

## Current State

The current model mixes several patterns:

- **Capabilities** store a `domain` text field and use the `Domain` taxonomy type.
- **Glossary terms** also use the `Domain` taxonomy type.
- **Personas** store `type` as text and use taxonomy-backed persona tags through a junction table.
- **Principles** store `principle_type` as taxonomy-backed text.
- **Applications** do not directly store taxonomy assignment for domain; domain is inferred through linked capabilities.

This means GovEA already has the concept of taxonomy-backed classification, but it is implemented in inconsistent ways:

- direct text field
- text field plus type-specific lookup
- junction table
- derived classification

That inconsistency makes reuse harder and increases implementation cost for every new classification surface.

---

## Proposed Direction

Introduce a logical **base item layer** for core content records.

### What is a base item?

A base item is a GovEA record that:

- belongs to an organization
- has an identity and title/name
- participates in visibility and workflow rules
- can carry taxonomy assignments
- can appear in shared filtering, badges, and detail rendering patterns

Candidate item types:

- application
- capability
- persona
- service
- value stream
- strategic objective
- initiative
- ADR
- principle
- glossary term

This is primarily a **shared platform contract**, not necessarily a single physical table on day one.

---

## Core Design Decision

### Decision

Adopt a **shared base-item model at the platform layer**, while keeping entity-specific tables for entity-specific data.

### Why

This gives GovEA a reusable foundation without forcing a risky table collapse or inheritance-heavy rewrite.

It means we can add cross-cutting capabilities once, then let item types opt in.

### What this avoids

- a fragile “one table for everything” schema
- rewriting all server actions at once
- forcing all entities into identical field semantics too early

---

## Base Item Capabilities

The first capability to move onto the shared layer should be **taxonomy assignment**.

Longer term, the same base can also support:

- common status metadata
- visibility metadata
- standardized chips/badges
- common “about this item” detail sections
- generic filter configuration
- shared audit and change-summary rendering

Taxonomy is the best first slice because:

- the problem is visible today
- the user need is clear
- the design pressure already exists across multiple entities
- it creates a reusable pattern for later shared features

---

## Taxonomy on the Base Item Layer

### Supported taxonomy types per item type

Each item type should declare which taxonomy types it supports.

Possible shape:

```sql
entity_taxonomy_definitions
- id
- organization_id
- entity_type           -- application, capability, initiative, etc.
- taxonomy_type_id      -- top-level taxonomy type
- selection_mode        -- single | multi
- required              -- boolean
- sort_order
```

This is the configuration layer.

It answers:

- which taxonomy types can be used on a given item type?
- is this single-select or multi-select?
- is it required?
- what order should the UI render it in?

### Selected taxonomy values per item

Use a shared junction table for actual selections.

Possible shape:

```sql
entity_taxonomy_values
- id
- organization_id
- entity_type
- entity_id
- taxonomy_term_id
```

This is the assignment layer.

It answers:

- which taxonomy values are selected on this item?

### UI behavior

Create and edit forms should:

- load supported taxonomy definitions for the item type
- render taxonomy inputs dynamically
- save selected term IDs through a shared path

Detail pages should:

- display assigned taxonomy values grouped by taxonomy type

List pages should:

- support filtering by those taxonomy values where practical

---

## Important Architectural Constraint

### Base item does not require immediate physical table inheritance

The safest interpretation of “base item” in GovEA is:

- **logical shared abstraction first**
- **shared infrastructure second**
- **physical schema convergence only where it clearly helps**

That means we do **not** need to begin by creating an `items` table and migrating every entity onto it.

Instead, we can:

1. define which entity types are treated as base items
2. build shared cross-cutting features against the base-item contract
3. evaluate later whether a physical `items` table adds enough value to justify migration cost

This keeps the design approval surface much smaller and reduces implementation risk.

---

## Migration Strategy

### Phase 0 — Design approval

- agree on the base-item concept
- agree that taxonomy is the first shared capability on that base
- agree which entity types are in scope for the first rollout

### Phase 1 — Shared taxonomy infrastructure

- add `entity_taxonomy_definitions`
- add `entity_taxonomy_values`
- add read/write helpers for shared taxonomy assignment
- add UI loading for supported taxonomy definitions

### Phase 2 — First entity pilot

Recommended pilot: **applications**

Why applications:

- they currently have no direct reusable taxonomy-backed classification field
- the user need is easy to understand
- the surface is important but bounded

Suggested first generic field:

- `Application Type`

### Phase 3 — Display and filtering

- render taxonomy chips on application detail pages
- support list filtering for the pilot field

### Phase 4 — Migration / coexistence review

Decide how existing hardcoded cases should relate to the new generic model:

- migrate `Domain` for capabilities and glossary
- migrate `Persona Type`
- migrate `Principle Type`
- or allow temporary coexistence while the platform stabilizes

### Phase 5 — Broader rollout

Expand to additional item types once the UX and data model are validated.

---

## Coexistence and Migration Notes

The existing taxonomy-backed fields should not be ripped out immediately.

A safer path is:

- build the generic model
- prove it on one item type
- then decide case by case whether to migrate existing fields

This matters because current implementations are not all equivalent:

- some store text labels
- some store slugs
- some store term IDs through a junction table

Forcing a universal migration too early would add unnecessary risk and slow adoption of the base-item foundation itself.

---

## Benefits

### Product benefits

- administrators can create reusable classification structures that actually become usable
- item types gain configurable taxonomy support without bespoke development each time
- GovEA moves closer to its documented content-type direction

### Engineering benefits

- one shared pattern instead of many field-specific implementations
- lower marginal cost for new classification fields
- better consistency across UI, actions, and filters
- a platform foundation that can later support more than taxonomy

### Governance benefits

- clearer explanation of what is configurable versus what is still code-defined
- easier approval path for future reusable item behavior

---

## Risks

### Risk: over-generalizing too early

If the base-item abstraction tries to solve every future problem now, it will become vague and hard to implement.

Mitigation:

- keep the first implementation focused on taxonomy assignment only
- treat other shared capabilities as future extensions, not day-one scope

### Risk: hidden migration complexity

Existing taxonomy-backed fields use different storage patterns.

Mitigation:

- allow coexistence during rollout
- do not require immediate migration of all existing fields

### Risk: UX becomes too abstract

A generic engine can produce confusing forms if every taxonomy type looks the same regardless of context.

Mitigation:

- support labels, required flags, selection mode, and display order in the definition table
- pilot on one item type before expanding

### Risk: base-item language gets mistaken for meta-model customization

GovEA explicitly does not promise unrestricted meta-model mutation in v1.

Mitigation:

- keep this positioned as reusable shared behavior for built-in item types
- do not frame it as user-defined arbitrary entities

---

## Alternatives Considered

### Option A — Keep wiring taxonomy per entity

This is the current model.

Pros:

- low immediate change cost

Cons:

- repeats work
- does not solve the admin configuration gap
- keeps taxonomy only partially useful

### Option B — One giant `items` table for all content

Pros:

- extreme uniformity

Cons:

- high migration risk
- harder to preserve entity-specific semantics
- unnecessary for the problem we are trying to solve right now

### Option C — Logical base item plus shared feature tables

Pros:

- solves the immediate reuse problem
- preserves current entity tables
- creates a path for future shared behaviors

Cons:

- requires some duplication to remain during transition

**Recommended:** Option C

---

## Approval Questions

Before implementation, reviewers should explicitly confirm:

1. Is the logical base-item direction the right level of abstraction for GovEA now?
2. Is taxonomy assignment the right first shared capability to move onto that base?
3. Is a pilot on applications the safest first implementation?
4. Should existing hardcoded taxonomy fields coexist temporarily rather than be migrated immediately?
5. Is this still consistent with GovEA’s current “fixed meta-model, reusable extensions” direction?

---

## Recommendation

Approve the **base-item foundation** as a platform direction, with the following implementation stance:

- logical base-item contract, not immediate physical table unification
- taxonomy assignment as the first shared capability
- application pilot first
- coexistence with current hardcoded taxonomy-backed fields during rollout

This creates a practical, reviewable foundation for broader configurability without forcing GovEA into an over-generalized architecture too early.

---

## Related

- [#349](https://github.com/roballred/GovEA/issues/349) — reusable taxonomy types across item types
- [`business-architecture/capabilities/cms/content-management/cm-taxonomy-management.md`](../../business-architecture/capabilities/cms/content-management/cm-taxonomy-management.md)
- [`business-architecture/capabilities/cms/content-management/cm-content-types.md`](../../business-architecture/capabilities/cms/content-management/cm-content-types.md)
- [`docs/data-model.md`](../data-model.md)
