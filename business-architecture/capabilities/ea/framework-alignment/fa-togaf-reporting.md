# Capability: TOGAF-Aligned Reporting

## What It Does

The system must generate TOGAF-friendly reports from GovEA content for organizations that enable a TOGAF overlay. Reports should translate GovEA's mission-first repository into familiar architecture outputs without requiring duplicate documentation.

## Personas

- **Enterprise Architect (Central IT)** — needs reports that show architecture content, governance, and roadmap evidence in language recognizable to TOGAF-trained stakeholders
- **Agency EA Coordinator** — needs to produce credible architecture outputs without maintaining parallel TOGAF documents manually
- **Department Director** — needs plain-language summaries derived from the same source data, not framework-heavy reports

## Behaviors

- Generate an Architecture Vision-style summary from objectives, capabilities, stakeholders, and scope
- Generate a capability map and application landscape using existing portfolio records
- Generate a standards, principles, and decision summary from principles and ADRs
- Generate a roadmap or migration summary from initiatives and strategic objectives
- Include source links back to the underlying GovEA records

## Rules

- TOGAF-aligned reports must be generated from existing GovEA content and mappings.
- Reports must disclose gaps rather than hiding missing source content.
- Reports intended for non-architect audiences must use plain-language titles and summaries.
- Reports must not imply formal TOGAF compliance unless the organization has explicitly validated its process against that standard.

## Implementation Status

Partially implemented — reports read recipe-installed taxonomy (ADR-0002; #665/#671 arc).

Current shipped slice:

- `Architecture Vision` report generates a plain-language architecture summary from existing GovEA records for all orgs
- `Application Landscape` and `ADM Coverage` reports appear under Reports when the TOGAF recipe's taxonomy is present (recipe-presence detection — no toggle), built on the generic group-by-taxonomy report engine
- Reports disclose repository gaps rather than hiding them
- Reports link back to the underlying GovEA records

Not yet shipped:

- Additional TOGAF-style outputs beyond Architecture Vision, Application Landscape, and ADM Coverage
- Reporting driven by richer framework mappings beyond domain and phase classifications
- A broader configurable reporting surface for multiple frameworks

## Links

- Depends on: Framework Mapping, ADM Phase Alignment, End-to-End Traceability, Planning & Roadmap
- Related: Reporting & Documentation target surface, Repository Completeness
