# Capability: Content Management

**Scope:** v1

## What It Does
The system must provide a complete content management foundation — defining content structure, authoring content items, managing their lifecycle, organizing them with taxonomy, linking them together, and enabling users to find what they need. In the current product, core authoring and relationships are strong, while repository-wide search and fully consistent workflow behavior are still maturing.

## Personas
- **CMS Administrator** — manages all content management functions; defines structure, authors and publishes content
- **Content Viewer** — reads published content and navigates relationships and taxonomy to find relevant information

## Sub-Capabilities

| Capability | File | Description |
|---|---|---|
| Content Types | [cm-content-types.md](./cm-content-types.md) | Define and configure content type schemas without code |
| Content Authoring | [cm-content-authoring.md](./cm-content-authoring.md) | Create, edit, and preview content items |
| Content Workflow | [cm-content-workflow.md](./cm-content-workflow.md) | Draft → Published → Archived lifecycle management |
| Content Versioning | [cm-content-versioning.md](./cm-content-versioning.md) | Change history, diffs, and version restore |
| Taxonomy Management | [cm-taxonomy-management.md](./cm-taxonomy-management.md) | Hierarchical categorization with a default government taxonomy |
| Content Relationships | [cm-content-relationships.md](./cm-content-relationships.md) | Link content items and enforce GovEA relationship rules |
| Content Search & Filtering | [cm-content-search-filtering.md](./cm-content-search-filtering.md) | Full-text search and attribute-based filtering |

## Success Criteria

The following outcomes indicate Content Management is working well for a 1–3 person government IT department 6 months after deployment:

- A contributor can create, link, and publish an application record without training — the form is self-explanatory and enforces required relationships before publish
- A Viewer can tell whether the content they are reading is current — the published date is visible without scrolling or clicking
- A contributor can find any existing content record using the current filters, taxonomy, and navigation in under 30 seconds
- The GovEA traceability rule (Applications → Capabilities → Personas) is never violated in published content — the system blocks or prompts before publish if a required link is missing
- Taxonomy terms are used consistently — contributors select from existing terms rather than inventing new ones for the same concept

## Rules
- Published content is the only content visible to Viewers for the core content model — workflow state gates those displays
- The core GovEA constraint must be enforced at publish time: Applications must link to Capabilities; Capabilities must link to Personas
- All content changes are auditable today; full version history and restore are future work

## Implementation Status
Shipped (v1, partial). Authoring, the standard `draft / published / archived` workflow, content relationships with publish-time enforcement, and taxonomy-backed Domain values are all shipped. User-defined content types (`cm-content-types`) and full version history with diff/restore (`cm-content-versioning`) are not yet implemented — see those sub-capability files for details.

## Deferred to v2

**Content quality / completeness monitoring** — a dedicated capability covering completeness scoring, quality flags, and trend reporting across the repository is deferred to v2. The Admin Dashboard surfaces a basic completeness summary in v1 (percentage of published items with all recommended fields populated), which is sufficient for early adopters. Full quality monitoring requires a larger repository to be meaningful and validated user need beyond what v1 personas confirm.

## Links
- Depends on: IAM
