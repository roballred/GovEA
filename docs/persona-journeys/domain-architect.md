# Persona Journey — Domain Architect

**Persona file:** [`business-architecture/personas/domain-architect.md`](../../business-architecture/personas/domain-architect.md)
**Capability anchors:** [`rm-end-to-end-traceability`](../../business-architecture/capabilities/ea/repository-modelling/rm-end-to-end-traceability.md), [`rm-architecture-debt`](../../business-architecture/capabilities/ea/repository-modelling/rm-architecture-debt.md), [`ac-feature-management`](../../business-architecture/capabilities/cms/admin-configuration/ac-feature-management.md); candidate new — domain-scoped contribution, change notifications, technology catalog.
**Walk audited:** 2026-05-19 — thirteenth persona walk under epic [#515](https://github.com/roballred/GovEA/issues/515) ([sub-issue #580](https://github.com/roballred/GovEA/issues/580))
**Persona validation status:** Assumed.

## Method

Live browser walk on the worktree preview at port 3001. Signed in as `carol@govea.dev` (Contributor — the closest proxy for a Domain Architect, who contributes domain-specific records but does not own the EA practice).

This walk's distinctive lens vs. prior walks:

- **Enterprise Architect** ([#552](https://github.com/roballred/GovEA/issues/552)) owns the practice — concerned with the whole portfolio.
- **Data Modeler / Enterprise Data Architect** ([#569](https://github.com/roballred/GovEA/issues/569), [#572](https://github.com/roballred/GovEA/issues/572)) own a single surface (`/data` metamodel).
- **Domain Architect** is a contributor with deep expertise in *one slice* (data, security, network, integration) who exercises the **mainline EA surfaces** — Applications, Capabilities, ADRs, Debt — not just `/data`.

The persona file's critical insight is foundational: *"Domain architects are the primary contributors to EA repository data quality in established practices… Building contribution workflows, change notifications, and cross-domain relationship navigation for this persona is the most direct path to a repository that stays accurate and useful as the practice matures."*

## Canonical journey

1. Sign in as Contributor (Riverdale Contributor shortcut).
2. Open Applications list — assess domain-scope navigation.
3. Open an Application detail (Microsoft Entra ID — security architect's territory).
4. Edit / contribute via the Application detail page.
5. Open ADR list/detail (security/data category filtering).
6. Open Debt creation surface for a domain-specific risk.
7. Open Capability detail with domain-relevant artefacts.
8. Open the TOGAF Application Landscape report (natural domain-architect landing page).
9. Look for domain-scoped contribution permissions and change-notification affordances.

## Step-by-step outcomes

| # | Step | Outcome | Notes |
|---|---|---|---|
| 1 | Sign in as Contributor | **Works** | Dev shortcut "Riverdale Contributor" landed as Carol; manual `carol@govea.dev` + `dev-password` also intended path. Same friction noted in [#548](https://github.com/roballred/GovEA/issues/548). |
| 2 | Applications list | **Works** ✅ | Filterable by **lifecycle status, workflow status, domain, hosting model, application type**. A domain architect with a Network or Integration lens can filter to Integration Platform; a security architect can filter to apps tagged Information Technology. Healthy multi-axis filter set. |
| 3 | Application detail (Microsoft Entra ID) | **Works (with gaps)** | Vendor, hosting, linked Capabilities, ADRs, Initiatives, Strategic Objectives, Decommission Impact, Orphaned Capabilities all surface. **Missing for the persona:** no first-class technology / product / protocol record (a security architect's view of an IdP wants more than `vendor: Microsoft, hosting: saas`); no domain-owner attribution; no inbound dependency view ("what trusts this IdP?"). |
| 4 | Edit Application | **Partial** | No `/applications/[id]/edit` route — editing happens inline via the detail page's `+ Add` affordances on each linked-objects panel (capabilities, ADRs, initiatives, debt). The top-level fields (name, description, vendor, hosting, lifecycle) are not visibly editable from this surface for a Contributor. Gap referenced under [#556](https://github.com/roballred/GovEA/issues/556) (Viewer/Contributor experience epic). |
| 5 | ADR list / detail | **Works** ✅ | Strong fit for the persona. Category filter exposes **Architecture / Data / Process / Security / Technology** — a security architect filters to category=Security; a data architect to category=Data. ADR detail has Context / Decision / Consequences sections plus linked Capabilities / Applications / Initiatives / Objectives and an Architecture-Debt panel. |
| 6 | Debt creation (`/debt/new?applicationId=…`) | **Works** ✅ | Full form: title, description, debtType, severity, status, visibility, target resolution date, `security_sensitive` checkbox, multi-object linking. A security architect can record a CVE-linked item and trigger the auto-flag rule ([`rm-architecture-debt`](../../business-architecture/capabilities/ea/repository-modelling/rm-architecture-debt.md)). Debt list page (`/debt`) filters by severity/status/type; lands empty on the Riverdale seed (no debt items seeded) — feature shipped, content gap. |
| 7 | Capability detail (Digital Identity & Authentication) | **Works** ✅ | Sub-capabilities, Behaviors, Rules, Personas, Applications, Strategic Objectives, Initiatives, ADRs, Cross-Org Links, Change Impact, Principles. The richest surface for a domain architect to author for their slice. **Edit capability** button is exposed (Contributor can edit). |
| 8 | TOGAF Application Landscape report | **Partial → seed-data gap** | `/reports/togaf/application-landscape` lists **7 / 7 applications "Not yet mapped"**. The field exists on capabilities; the seed simply doesn't populate it. Persona's natural domain landing page is empty out of the box. Gap [#582](https://github.com/roballred/GovEA/issues/582). |
| 9 | Domain-scoped contribution / change notifications | **Missing** | No domain-owner attribution on any object; no warning when a non-owner Contributor edits an object owned by another domain architect; no subscribe-to-changes affordance anywhere. Persona pain points #4 ("changes in adjacent domains do not notify the architect") and #5 ("other contributors can inadvertently overwrite domain records, with no notification") are unaddressed. Gap [#581](https://github.com/roballred/GovEA/issues/581). |

**Tally:** 4 works · 3 partial · 1 missing · 1 sign-in friction.

## Findings

### Gaps filed (new)

| Issue | Severity | Summary |
|---|---|---|
| [#581](https://github.com/roballred/GovEA/issues/581) | Medium-High (persona-foundational) | No domain-scoped contribution permissions; no change-notification affordances. Persona's two stated pains (overwrite-protection and adjacent-change awareness) are unaddressed. Sketch: optional domain-owner attribution on capability/ADR/application + non-blocking warning gate on non-owner edits, plus per-object and per-domain subscription with email delivery (depends on [#528](https://github.com/roballred/GovEA/issues/528)). |
| [#582](https://github.com/roballred/GovEA/issues/582) | Low (seed-data) | `/reports/togaf/application-landscape` shows 7/7 applications unmapped because seed capabilities have no TOGAF Architecture Domain set. Concrete table of suggested mappings in the issue. |

### Existing gaps that apply equally

- [#556](https://github.com/roballred/GovEA/issues/556) — Viewer/Contributor experience epic; covers the inline-only edit pattern surfaced at step 4.
- [#578](https://github.com/roballred/GovEA/issues/578) — Self-service dependency-impact view. The Domain Architect's *"what trusts this IdP?"* question is the same impact-shape question filed under the Programme Director walk; not re-filed here.
- [#549](https://github.com/roballred/GovEA/issues/549) — `/traceability` top-level entry; a domain architect benefits from a "show me my domain's traces" landing.
- [#528](https://github.com/roballred/GovEA/issues/528) — Email configuration; precondition for [#581](https://github.com/roballred/GovEA/issues/581)'s notification half.

### Considered but not filed

- **Technology / product catalog as first-class objects.** Currently only `vendor` (free-text) and `hosting_model` (enum) capture technology data on an application. A security architect documenting "TLS termination point" or a data architect documenting "logical data store kind = PostgreSQL 15" has no first-class home. This is design-shaped, not a bug — flagging as a candidate future capability rather than a gap-of-record. Worth a separate design issue if the audit later confirms practitioner demand.
- **Nav label "Decisions" → `/adrs` URL mismatch.** Paper-cut only; the nav link works, the URL just doesn't match the label. Not worth a discrete issue.

### Persona-validation note

Persona is **Assumed**. The persona file's distinction from Agency EA Coordinator is sharp (specialist vs. generalist; deep domain vs. broad agency). The critical-insight quote about data quality is the testable hypothesis: if real domain architects don't adopt GovEA without the contribution-workflows / change-notifications / cross-domain-navigation triad, the model holds. If they adopt it without those, the model is wrong. [#581](https://github.com/roballred/GovEA/issues/581) is the adoption test.

## Strong positives — particularly relevant to this persona

- **ADR category filter** (Architecture / Data / Process / Security / Technology) is exactly the axis a domain architect uses to find their work. No prior persona walk centred on this filter — it's a small affordance with outsized fit for the specialist contributor.
- **Debt creation form is excellent.** `security_sensitive` auto-flag, multi-object linking, severity + type taxonomy, and target resolution date together cover the persona's "surface domain risks through the model rather than ad-hoc escalation" goal end-to-end. The form is more capable than the rest of the build's authoring surfaces.
- **Capability detail's Behaviors + Rules + Cross-Org Links + Change Impact** combination is the right place for a security/data architect to author governance content. The persona's authoring need has a real home.
- **Architecture debt panel on every object** (Application, Capability, ADR) normalises domain-risk authoring across the surfaces a domain architect already visits.

## Cumulative state after thirteen walks

- **3 / 16 personas remaining**: consultant-si, early-maturity-practice-lead, business-stakeholder.
- This walk produced **two net-new gaps** ([#581](https://github.com/roballred/GovEA/issues/581), [#582](https://github.com/roballred/GovEA/issues/582)) and re-confirmed several from the pile. Pattern remains stable.
- [#581](https://github.com/roballred/GovEA/issues/581) is the audit's **first articulation of domain-scoped governance** — a class of capability the build doesn't have today but is mentioned across multiple persona files (Domain Architect, Agency EA Coordinator). Worth being on the strategic backlog.

## Recommended follow-up

1. **[#582](https://github.com/roballred/GovEA/issues/582)** is a small, concrete seed fix — could ship alongside any other seed change. Low effort, raises the perceived completeness of the TOGAF report from "not implemented" to "demonstrated."
2. **[#581](https://github.com/roballred/GovEA/issues/581)** is a strategic capability. Not the next sprint, but the audit has now twice asked for event/notification plumbing (also under [#578](https://github.com/roballred/GovEA/issues/578)) — bundling them into a single "change-event substrate" foundation is the leverage move.
3. **Next persona walks (3 remaining):**
   - [`consultant-si`](../../business-architecture/personas/consultant-si.md) — outside-systems-integrator perspective; multi-tenant / data-handoff concerns.
   - [`early-maturity-practice-lead`](../../business-architecture/personas/early-maturity-practice-lead.md) — small EA practice setup lens; would exercise onboarding/seeding decisions.
   - [`business-stakeholder`](../../business-architecture/personas/business-stakeholder.md) — applies symmetrically to Viewer/Elected-Official but with a different question shape.

   Recommend **`early-maturity-practice-lead`** next — exercises onboarding/setup, which has been touched obliquely but never centered, and is the most likely walk to surface gaps that block first-time adopters. Consultant-SI and Business-Stakeholder are both natural close-out walks for the audit.
