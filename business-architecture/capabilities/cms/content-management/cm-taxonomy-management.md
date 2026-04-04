# Capability: Taxonomy Management

## What It Does
The system must provide a hierarchical categorization system that content items can be tagged against. GovEA ships with a default government capability taxonomy that agencies can customize to match their structure.

## Personas
- **CMS Administrator** — manages taxonomy terms; customizes the default taxonomy to fit the agency
- **Content Viewer** — navigates and filters content by taxonomy term

## Behaviors
- Define taxonomy vocabularies (e.g. Capability Domain, Jurisdiction Type)
- Add, edit, and delete taxonomy terms within a vocabulary
- Organize terms in a hierarchy (parent/child relationships)
- Tag content items with one or more taxonomy terms
- Filter content lists by taxonomy term
- Ship a default government capability taxonomy (10 domains, 50+ sub-domains) as a seed

## Default Government Capability Taxonomy Domains
Administrative Services, Public Safety, Infrastructure & Public Works, Community Development, Health & Human Services, Parks/Recreation/Culture, Transportation, Information Technology, Finance & Revenue, Legislative & Executive

## Rules
- Deleting a taxonomy term does not delete content tagged with it — the tag is removed from the content item
- Taxonomy vocabularies and terms must be scoped to an organization
- Taxonomy terms must be unique within their vocabulary for that organization
- The default taxonomy is editable — agencies can rename, add, or remove terms
- A content item may be tagged with terms from multiple vocabularies

## Links
- Depends on: Content Types
- Related: Content Authoring, Content Search & Filtering
