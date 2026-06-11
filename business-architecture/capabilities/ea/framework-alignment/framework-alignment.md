# Capability: Framework Alignment

**Scope:** v1

## What It Does

The system must allow organizations to align GovEA content to external architecture frameworks such as TOGAF without replacing GovEA's EasyEA-based, people-centered operating model. Framework alignment is an optional overlay: it helps trained architects produce familiar views and evidence, while preserving plain-language content for government practitioners and stakeholders.

## Personas

- **Enterprise Architect (Central IT)** — needs to show that enterprise reference architecture and governance outputs align to recognized architecture practice without forcing agencies into a compliance-heavy tool
- **Agency EA Coordinator** — needs to map local capabilities, applications, initiatives, and decisions to enterprise or TOGAF concepts when useful, while preserving agency autonomy
- **CMS Administrator** — needs to enable, configure, and maintain framework overlays without code changes
- **Department Director** — benefits from clearer reports and better-governed architecture content, but should not need to understand TOGAF terminology

> ⚠️ Enterprise Architect, Agency EA Coordinator, CMS Administrator, and Department Director are currently **Assumed** personas. GovEA has still shipped a narrow TOGAF-alignment slice to reduce procurement and demo friction, but broader framework work should remain gated by real user validation.

## Sub-Capabilities

| Capability | File | Status | Description |
|---|---|---|---|
| Framework Reference Management | [fa-framework-reference-management.md](./fa-framework-reference-management.md) | Not implemented | Store external framework references separately from GovEA's authoritative capability definitions |
| Framework Mapping | [fa-framework-mapping.md](./fa-framework-mapping.md) | Partially implemented | Map capability and application records to TOGAF Architecture Domains; broader framework concept mapping remains future work |
| ADM Phase Alignment | [fa-adm-phase-alignment.md](./fa-adm-phase-alignment.md) | Partially implemented | Optionally tag architecture work to TOGAF ADM phases for TOGAF-aware teams; ADM Phase taxonomy + ADM Coverage report ship via the TOGAF recipe |
| TOGAF-Aligned Reporting | [fa-togaf-reporting.md](./fa-togaf-reporting.md) | Partially implemented | Generate TOGAF-friendly reports from existing GovEA content |
| Framework Overlay Configuration | [fa-framework-overlay-configuration.md](./fa-framework-overlay-configuration.md) | Partially implemented | Allow admins to enable, disable, and configure optional framework overlays per organization |

## Reference Sources

Framework reference sources are inputs to capability design, not GovEA capability definitions. TOGAF support starts with [togaf-reference.md](./togaf-reference.md), which records how GovEA intends to treat TOGAF as optional alignment material.

## Rules

- Framework alignment must be opt-in per organization.
- GovEA's core relationship model remains EasyEA-first: personas, capabilities, services, applications, objectives, initiatives, principles, and decisions.
- TOGAF labels must not be required for ordinary content creation.
- Plain-language views for Department Directors and other non-architect stakeholders must remain free of framework jargon by default.
- Framework mappings can support reporting and governance, but they must not override GovEA's authoritative capability definitions.

## Success Criteria

- A TOGAF-aware enterprise architect can find Architecture Domain and ADM-phase mapping affordances on capability and application detail pages without leaving the standard authoring surface
- A non-architect Department Director can browse the same repository without encountering TOGAF jargon by default — framework-audience taxonomy is invisible to them
- Installing the framework recipe is a per-org admin action; removing its taxonomy hides framework affordances with no downstream content destruction
- The Architecture Vision and TOGAF Application Landscape reports reflect current published content automatically; no separate data-entry surface is required

## Out of Scope

| Item | Rationale |
|---|---|
| Mandatory TOGAF workflow | Small government teams should not have to run the full ADM to use GovEA effectively |
| Formal notation modelling | ArchiMate, BPMN, UML, SysML, and similar notation tooling remains outside v1 scope |
| Full meta-model customization | Framework overlays map to the GovEA model; they do not replace it |
| Reproducing proprietary or licensed framework text | GovEA may reference external frameworks and store user-provided source citations, but should not embed restricted framework content beyond what is allowed |

## Design Principle

Framework support should increase credibility without increasing friction. A TOGAF-trained architect should be able to recognize the structure of the work, while an agency practitioner should still experience GovEA as a simple mission-to-technology repository.

## Implementation Status

Framework alignment is taxonomy-and-recipe-backed (ADR-0002; #665/#671 arc). The earlier hard-coded `framework-overlay` module, its settings toggle, and the `framework_mappings` table have been removed:

- TOGAF is enabled per organization by installing the taxonomy-backed recipe, which creates the Architecture Domain and ADM Phase taxonomy types (org-scoped, opt-in, idempotent re-install)
- Capability and application records are classified against those types through the ordinary entity-taxonomy UI
- The Reports area derives TOGAF Application Landscape and ADM Coverage from the taxonomy when the recipe is present; the generic Architecture Vision report provides a framework-friendly summary for all orgs
- Framework taxonomy types carry `audience: 'framework'`, keeping framework jargon out of viewer-role and stakeholder views by default

Still not shipped:

- Admin-managed framework reference records
- Broader framework mappings beyond the current TOGAF domain/phase slice (including per-mapping rationale, dropped with the legacy table)
- A standalone Recipes admin surface (install currently rides the TOGAF Starter pack flow; #780)
- Frameworks other than TOGAF

## Links

- Depends on: Content Management — Content Relationships, IAM — Role-Based Access Control
- Related: Portfolio (Capabilities, Applications), Repository & Modelling (TOGAF reports), Admin Configuration (recipe install via starter content)
