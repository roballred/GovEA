# Capability: Integration

**Scope:** v2

## What It Does

GovEA must connect to the operational, business, and governance systems that government IT already runs — not require architects to maintain a parallel data store that diverges from reality the moment the meeting ends. The integration capability family defines how GovEA ingests, reconciles, and exchanges data with adjacent systems to keep the architecture repository grounded in what is actually deployed, funded, and running.

Integration is split into four tiers reflecting urgency and the category of system being connected. Tier 1 (Operational Data) is the highest priority for v1 government deployments; Tiers 2–4 are roadmap work.

## Personas

- **Enterprise Architect (Central IT)** — needs architecture records that reflect operational reality, not what was documented at procurement; manual reconciliation between the EA repository and CMDB/ITSM is the most-cited time cost in the 2026 market research
- **Agency EA Coordinator** — needs to demonstrate that their agency's capability map is grounded in real applications and funded programmes; without integration, every EA artefact is a snapshot that ages from the moment it is saved
- **Domain Architect** — needs the EA repository to stay current with active delivery without requiring manual updates after every sprint
- **Junior EA Analyst** — responsible for data quality maintenance; integration removes the manual reconciliation work that currently crowds out analysis

> ⚠️ Enterprise Architect, Agency EA Coordinator, and Domain Architect are **Assumed** personas for integration-specific behaviors. Capabilities in this group carry elevated implementation risk until those personas are validated through direct user research.

## Sub-Capabilities

### Tier 1 — Operational Data (highest priority)

| Capability | File | Status | Description |
|---|---|---|---|
| ITSM & CMDB Synchronisation | [int-itsm-cmdb.md](./int-itsm-cmdb.md) | Not implemented | Bi-directional sync with ServiceNow ITSM and CMDB to keep application and incident data current |
| DevOps Tool Integration | [int-devops.md](./int-devops.md) | Not implemented | Connections to Jira, Azure DevOps, GitHub, GitLab to align architecture with delivery velocity |
| Cloud Discovery Integration | [int-cloud-discovery.md](./int-cloud-discovery.md) | Not implemented | Ingestion from AWS Config, Azure RM, GCP Asset Inventory to keep infrastructure topology current |

### Tier 2 — Business Systems (critical gaps)

| Capability | File | Status | Description |
|---|---|---|---|
| PPM / Project Portfolio Integration | [int-ppm.md](./int-ppm.md) | Not implemented | Planview, Clarity PPM, MS Project Online — aligns EA roadmaps with funded programme portfolios |
| ERP & Financial System Integration | [int-erp-financial.md](./int-erp-financial.md) | Not implemented | SAP S/4HANA, Oracle Financials, Workday — grounds cost modelling in financial actuals |
| HR & Organisation Design Integration | [int-hr-org.md](./int-hr-org.md) | Not implemented | Workday HCM, SAP SuccessFactors — maintains current org structures and roles in the EA model |

### Tier 3 — Governance Systems

| Capability | File | Status | Description |
|---|---|---|---|
| Data Governance Platform Integration | [int-data-governance.md](./int-data-governance.md) | Not implemented | Collibra, Alation, Microsoft Purview — eliminates parallel data lineage maintenance |
| API Management Platform Integration | [int-api-management.md](./int-api-management.md) | Not implemented | MuleSoft, Apigee, Kong, Azure APIM — integration architecture mapped here, not by hand |
| BI & Analytics Platform Integration | [int-bi-analytics.md](./int-bi-analytics.md) | Not implemented | Power BI, Tableau, Qlik — EA data feeds enterprise analytics without manual export |

### Tier 4 — Emerging (standard within 2 years)

| Capability | File | Status | Description |
|---|---|---|---|
| AI / ML Asset Registry Integration | Deferred | Not defined | Azure ML, AWS SageMaker, Databricks — maps deployed models to applications, data, and decisions |
| Infrastructure-as-Code Integration | Deferred | Not defined | Terraform, Ansible, Pulumi — IaC is the authoritative infrastructure source; EA must follow it |
| Low-Code / No-Code Platform Integration | Deferred | Not defined | Power Platform, Salesforce, ServiceNow App Engine — shadow low-code is the new shadow IT |

### Foundational (cross-tier)

| Capability | File | Status | Description |
|---|---|---|---|
| REST API | [int-rest-api.md](./int-rest-api.md) | Not implemented | Readable/writeable API for custom integration with bespoke systems, CMDBs, and project tools |

## Out of Scope for v1

| Market Capability | Rationale |
|---|---|
| Process Mining Integration | Celonis and UiPath Process Mining compare how processes actually run against how they are modelled. High analytical value but requires process execution data that most state and local government IT teams do not yet have instrumented. Deferred to v2 pending validation. |
| GRC Platform Integration | RSA Archer, ServiceNow GRC, MetricStream. Overlap with governance capabilities exists, but GRC-platform-specific integration requires customer-specific configuration that the standard GovEA data model cannot pre-wire. Deferred. |
| Security Posture Integration | Tenable, Qualys, CrowdStrike, Microsoft Defender. Not available in any reviewed commercial EA tool as of 2026. Emerging category; deferred to v2. |
| Survey & Crowdsourced Data Collection | Distributes surveys to application owners to auto-update the repository. Valuable for repository completeness but does not fit the phased integration priority and requires a separate notification/workflow surface. Handled by `rm-repository-completeness`. |

## Market Research Context

The 2026 EA tool market research identified integration as the most underserved capability area across all reviewed commercial tools. Key findings:

- **PPM integration is a critical gap** — absent from most tools. EA roadmaps that do not trace to funded programmes are planning fiction.
- **HR & org design integration is absent** from all reviewed tools. Operating model views become stale as soon as headcount or org structure changes.
- **API management integration does not exist** in any reviewed tool. Architects map integration architecture by hand from API gateway console exports.
- **ERP integration is largely absent** — only SAP-native tools (HOPEX) provide it, and only for SAP customers.

These gaps are not primarily technical; they reflect a product philosophy in commercial EA tools that treats integration as a premium connector feature rather than a first-class data quality requirement. GovEA's integration tier structure is a direct response.

## Design Principle

Data quality is an architecture problem, not an operations problem. Every integration capability exists to close the gap between what the repository says and what is actually deployed, funded, and running. An EA model that architects do not trust is an EA model nobody uses. Integration is how GovEA earns that trust over time, even as the estate changes beneath it.

## Success Criteria

- An architect can answer "is this application still running, and where?" by viewing the GovEA application record — without leaving the tool to check CMDB or the cloud console
- Capability and application records reflect operational reality within the configured sync cadence; staleness is surfaced when integration credentials lapse
- Adding a new integration target follows a documented pattern (auth, mapping, reconciliation report) rather than requiring bespoke code per system
- No integration ever writes back to a system of record without an explicit user-initiated action and audit trail entry

## Rules

- Integration is opt-in per org and per integration target — no integration starts collecting data without an Admin action
- GovEA is never the system of record for operational data (CIs, tickets, deploys, funding lines); integrations populate context, they do not replace upstream sources
- All integrations apply the same RBAC and visibility rules as the rest of GovEA — federated content never escapes its org or visibility scope through an integration channel
- Conflict resolution between GovEA-authored content and integration-sourced content is explicit — automatic overwrite of architect-authored fields is not permitted
- Credentials for outbound integration calls are encrypted at rest; secrets never appear in plaintext in the UI or audit log

## Implementation Status

Planned — not yet implemented. The Tier 1–3 sub-capability files describe the target shape; none are wired into the product. The foundational REST API (#382) is the first slice and remains design-stage. Track integration progress through the individual sub-capability issues and the parent #382.

## Links

- Depends on: IAM — Role-Based Access Control, IAM — Audit Trail, Admin Configuration — Security Settings
- Enables: Portfolio (Applications, Capabilities), Planning (Initiatives), Repository & Modelling (Architecture Debt)
- Related: Data Architecture, Framework Alignment
