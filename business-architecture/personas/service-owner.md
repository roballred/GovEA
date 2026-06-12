# Persona: Service Owner

**Validation Status: Assumed** — drafted from the government product-operating-model literature (GDS Service Standard, USDS playbook, state CIO product-model guidance) and the 2026 EA market research. Must not drive implementation until validated through an interview with a real service owner or product manager in a state or local government agency.

## Role Type
Internal — Service Delivery Leadership (agency)

## Government Equivalent
The person accountable for a public-facing or internal government service as an ongoing concern — titles vary widely: Service Owner, Product Manager, Service Manager, Business Program Manager, or a division manager who "owns the permitting system" without any product title at all. In agencies adopting the product operating model this is an explicit role; in most agencies today it is implicit and discovered only when something breaks.

## Who They Are
The Service Owner is responsible for a service across its whole life — not for delivering a project that ends at go-live. They decide what the service should do next, justify its funding, answer for its performance, and are the person a Department Director calls when constituents complain.

They are not architects and will never open an EA tool to "do EA." They think in terms of the people the service serves, the outcomes it should produce, and the roadmap of improvements they can realistically fund. Architecture matters to them only as it answers their questions: what does this service depend on, what is the technology under it costing us, and what breaks if we change it.

Unlike the Programme Director, whose horizon is a delivery programme that ends, the Service Owner's horizon is indefinite — the service persists, accumulates users and obligations, and eventually needs a managed retirement.

## Goals
- Keep an accurate, shareable picture of what their service does, who it serves, and what it depends on — without maintaining a parallel spreadsheet
- Know where the service is in its life (discovery, live, retiring) and make that status legible to leadership and budget staff
- Tie funding asks to evidence: outcomes the service produces, gaps user research has surfaced, and the initiatives that would close them
- See early warning when the service's underlying applications or capabilities are flagged for decommissioning, debt, or risk
- Hand the service to a successor without the institutional knowledge leaving with them

## Pain Points
- Service knowledge lives in people's heads and project documents from the original build; nothing authoritative survives the project's end
- "Who owns this service?" has no reliable answer — ownership is a free-text field, an org chart guess, or a former employee
- Performance conversations happen without data: no agreed outcomes, no measures, only anecdotes and complaint volume
- Funding is project-shaped — money arrives to build, never to continuously improve — so the case for product-style investment must be rebuilt from scratch every budget cycle
- EA tools, where they exist, treat the service as an inventory row; nothing in them helps run the service as a product

## Critical Insight
The Service Owner will adopt an EA tool only if it makes their existing accountability easier — the service record must be the artifact they bring to budget and leadership conversations, not a duplicate they maintain for the architects' benefit. If keeping GovEA current is extra work on top of the "real" tracking, this persona will not do it; if the service record *is* the real tracking, they become the most active editor in the repository.

## Distinction from Programme Director

| | Programme Director | Service Owner |
|---|---|---|
| Horizon | A programme that ends | A service that persists |
| Decision type | Delivery sequencing | Service investment and improvement |
| Primary EA question | "What breaks if I decommission Y?" | "What should this service do next, and what does that cost?" |
| Engagement trigger | In-flight programme decisions | Budget cycles, performance reviews, succession |

## Relevant Capabilities
- Service Product Management (ea/service-product-management) — the practice this persona lives in
- Portfolio — Services (po-services) — the service record itself
- Portfolio — Value Streams (po-value-streams) — where their service participates in end-to-end value delivery
- Planning — Initiatives (pl-initiatives) — the funded change that touches their service
- Frontend Display — Traceability Views (fd-traceability-views) — "how does my service connect?"
