# Capability: Content Management

## What It Does
The system must provide a complete content management foundation — defining content structure, authoring content items, managing their lifecycle, organizing them with taxonomy, linking them together, and enabling users to find what they need.

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

## Rules
- Published content is the only content visible to Viewers — workflow state gates all display
- The core GovEA constraint must be enforced at publish time: Applications must link to Capabilities; Capabilities must link to Personas
- All content changes are versioned and auditable

## Deferred to v2

**Content quality / completeness monitoring** — a dedicated capability covering completeness scoring, quality flags, and trend reporting across the repository is deferred to v2. The Admin Dashboard surfaces a basic completeness summary in v1 (percentage of published items with all recommended fields populated), which is sufficient for early adopters. Full quality monitoring requires a larger repository to be meaningful and validated user need beyond what v1 personas confirm.

## Links
- Depends on: IAM
