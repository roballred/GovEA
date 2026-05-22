# Capability: Taxonomy Management

## What It Does

The system must allow organizations to define a controlled classification vocabulary — organized as **Types** (top-level categories) and **Values** (the terms within each type) — and use those values to classify capabilities, glossary terms, and other content. GovEA ships with a default government domain taxonomy that agencies can customize.

The current implementation covers the Domain dimension: the `domain` field on capabilities and glossary terms is driven by the "Domain" taxonomy type, giving organizations a consistent, centrally managed vocabulary rather than per-record free text.

## Personas

- **CMS Administrator** — creates and manages taxonomy types and values; controls the domain vocabulary for the organization
- **Agency EA Coordinator / Contributor** — selects a domain when creating or editing a capability or glossary term; creates new domain values ad hoc without leaving the form
- **Content Viewer** — navigates and filters content by domain; sees consistent domain labels across capabilities, glossary, and the dashboard

## Fields

### Taxonomy Term

| Field | Type | Notes |
|---|---|---|
| `id` | UUID | Primary key |
| `organizationId` | UUID | Org-scoped — terms are not shared across orgs |
| `parentId` | UUID \| null | `null` = Type (top-level); non-null = Value under a Type |
| `name` | text | Display name, e.g. "Domain" (Type) or "Information Technology" (Value) |
| `slug` | text | Auto-generated from name; used for lookups (e.g. `domain`) |
| `description` | text \| null | Optional — describes what belongs in this type or value |
| `sortOrder` | text \| null | Optional numeric string; lower values sort first |

## Behaviors
- Define taxonomy types (for example `Domain`)
- Add, edit, and delete taxonomy values within a type
- Organize values under a type using parent/child relationships where needed
- Tag content items with taxonomy values
- Filter content lists by taxonomy value
- Seed a standard government Domain vocabulary with 10 starter values
- Create new domain values inline from capability and glossary forms when the needed value does not already exist

## Seeded Domain Values
Administrative Services, Public Safety, Infrastructure & Public Works, Community Development, Health & Human Services, Parks/Recreation/Culture, Transportation, Information Technology, Finance & Revenue, Legislative & Executive

## Rules
- Taxonomy types and values are scoped to the organization — they are never shared across orgs or visible instance-wide
- Taxonomy values must be unique within their type for that organization
- The seeded Domain vocabulary is editable — agencies can rename, add, or remove values
- Capability and glossary forms should prefer taxonomy-backed Domain values rather than free-text drift
- Only Admins and Contributors may create or edit taxonomy terms; only Admins may delete them
- Deleting a type cascade-deletes all its values — orphaned values with no type are not permitted
- Deleting a type or value does **not** remove the stored domain string from existing capabilities or glossary terms; those records retain their value until edited
- `createDomainValue` deduplicates case-insensitively within the org — calling it with "IT" when "it" exists returns the existing term
- Slug is auto-generated from the name and is used for system lookups (the "Domain" type is found by `slug = 'domain'`)

### Taxonomy Management Page

- List all taxonomy types for the organization, each expanded to show its values
- Show a count of values on each type header row
- Create a new type with name, optional description, optional sort order
- Add a value to a type from the type row (without navigating away)
- Edit name, description, and sort order for any type or value
- Delete a type (and all its values) with a warning showing how many values will be removed
- Delete a value from a type
- Empty state explains the Types → Values model and prompts the admin to create the first type

### Domain Field on Capabilities and Glossary (DomainCombobox)

- The domain field on capability and glossary create/edit forms renders as a combobox
- Displays existing domain values (children of the "Domain" type) as selectable options
- Filters the option list as the user types
- When the typed text does not match any existing value, shows a **+ Create "X"** option
- Selecting "Create X" calls `createDomainValue` server action, which:
  1. Finds or creates the "Domain" taxonomy type (slug `domain`) for the org
  2. Deduplicates case-insensitively — if "IT" already exists, typing "it" returns the existing value
  3. Creates the new value and returns its name
  4. Adds it to the local option list immediately — no page reload required
- Falls back to a free-text input if no "Domain" type exists and the combobox has no options

### Domain Filter and Dashboard

- The domain filter dropdown on the Capabilities table uses the live domain values from the data (not the taxonomy query), so it always reflects what's actually in use
- The Capabilities by Domain section on the dashboard shows clickable domain chips derived from the same data
- Both update automatically when new domain values are created ad hoc

## Default Government Domain Taxonomy

Seeded via `DEV=true pnpm db:seed`. Creates a **Domain** type with 10 values:

| Value | Sort Order |
|---|---|
| Administrative Services | 0 |
| Public Safety | 10 |
| Infrastructure & Public Works | 20 |
| Community Development | 30 |
| Health & Human Services | 40 |
| Parks, Recreation & Culture | 50 |
| Transportation | 60 |
| Information Technology | 70 |
| Finance & Revenue | 80 |
| Legislative & Executive | 90 |

All seed capabilities and glossary terms are mapped to one of these values.

## Implementation Status

| Behavior | Status |
|---|---|
| Taxonomy management page — types and values CRUD | ✅ Implemented |
| Domain combobox with ad-hoc value creation | ✅ Implemented |
| Domain field on capabilities | ✅ Implemented |
| Domain field on glossary terms | ✅ Implemented |
| Default government domain taxonomy seed | ✅ Implemented |
| Multiple taxonomy types (beyond Domain) | ✅ Data model supports it; UI creates/manages them |
| Domain field on other content types (ADRs, initiatives, etc.) | 🔲 Not yet |
| Taxonomy-driven filtering on all list pages | 🔲 Partial — capabilities and glossary only |
| Cross-org shared taxonomy / instance-level terms | 🔲 Deferred |

## Links

- Depends on: IAM — Role-Based Access Control
- Enables: Content Management — Capabilities, Glossary
- Related: Content Search & Filtering, Admin Dashboard (Capabilities by Domain)
