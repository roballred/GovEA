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

## Success Criteria

The following outcomes indicate Content Management is working well for a 1–3 person government IT department 6 months after deployment:

- A contributor can create, link, and publish an application record without training — the form is self-explanatory and enforces required relationships before publish
- A Viewer can tell whether the content they are reading is current — the published date is visible without scrolling or clicking
- A contributor can find any existing content record using search in under 30 seconds
- The GovEA traceability rule (Applications → Capabilities → Personas) is never violated in published content — the system blocks or prompts before publish if a required link is missing
- Taxonomy terms are used consistently — contributors select from existing terms rather than inventing new ones for the same concept

## Rules
- Published content is the only content visible to Viewers — workflow state gates all display
- The core GovEA constraint must be enforced at publish time: Applications must link to Capabilities; Capabilities must link to Personas
- All content changes are versioned and auditable

## Links
- Depends on: IAM
