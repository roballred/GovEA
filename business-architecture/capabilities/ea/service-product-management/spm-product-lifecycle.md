# Capability: Product Lifecycle

## What It Does

Every service carries an explicit lifecycle stage — where it is in its life as a product, from discovery through live operation to managed retirement. The stage is the first thing leadership asks about and the thing project-based management loses track of: services today are "done" the day the build project closes, with no recorded difference between a service being piloted, one serving the whole state, and one limping toward replacement.

Lifecycle stage is deliberately distinct from content workflow status: workflow status describes the *record* (draft/published), lifecycle stage describes the *service*.

## Personas

- **Service Owner** — asserts and updates the stage; uses it to frame budget and improvement conversations
- **Department Director** — reads stage distribution to understand where the portfolio is aging
- **Agency EA Coordinator** — uses stage to prioritize architecture attention (retiring services need decommission plans, not roadmaps)

## Behaviors

- Assign a lifecycle stage to a service from an org-level stage set (working assumption: GDS-style — discovery, alpha, beta, live, retiring, retired — shipped as a starter recipe and org-customizable as taxonomy)
- Record stage transitions with date and actor so the service's history is reconstructible
- Surface stage on the service detail page, list views, and portfolio reports
- Flag stale stages (e.g., a service "in discovery" for two years) rather than auto-changing them

## Rules

- Lifecycle stage is orthogonal to workflow status — a draft record may describe a live service
- Stage transitions are owner-asserted; the system never advances a stage automatically
- Stage sets are org-scoped taxonomy, installable via recipe, so frameworks other than GDS's can be adopted without code
- Retired services remain in the repository (history and traceability) — retirement is a stage, not a deletion

## Implementation Status

**Not implemented.** No lifecycle field or taxonomy exists on services; the recipe engine (#671 family) that would install stage sets is shipped and is the working substrate. Design and implementation are gated on persona validation (#668) per the group doc.

## Links

- Depends on: Portfolio — Services (po-services), Framework Alignment recipe-install machinery
- Enables: Service Portfolio Health (spm-service-portfolio-health)
- Related: Planning — Initiatives (pl-initiatives), Application Portfolio lifecycle/debt signals
