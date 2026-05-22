# Capability: Cloud Discovery Integration

## What It Does

The system must ingest the infrastructure topology of cloud environments — AWS, Azure, and GCP — to keep the application estate current without requiring architects to manually track what is deployed where. Cloud infrastructure changes continuously; any architecture repository that depends on manual updates will lag behind within days.

The specific pain this solves: government IT teams have adopted cloud services faster than their architecture documentation has kept pace. The CMDB captures some of this, but cloud-native resources (serverless functions, managed services, container workloads) are often absent from traditional CMDB CI classes. Cloud discovery fills that gap.

## Implementation Status

**Not implemented.** This document is the design specification for that future work.

## Personas

- **Enterprise Architect (Central IT)** — needs to know what is actually running in cloud accounts, not just what was approved at procurement; cloud sprawl is a known risk in government IT and requires visibility before it can be governed
- **Agency EA Coordinator** — needs to surface cloud resources that exist in their agency's accounts but have no corresponding EA application record; shadow cloud is the new shadow IT
- **Junior EA Analyst** — tasked with keeping application records current; cloud discovery removes the need to manually track resource provisioning events

## Behaviors

- Connect to one or more cloud accounts per org:
  - AWS: via AWS Config, Organizations API, or read-only IAM role
  - Azure: via Azure Resource Manager API and optional Azure Arc for hybrid resources
  - GCP: via GCP Asset Inventory API
- Discover deployed resources and classify them by GovEA object type:
  - VMs, container clusters, and serverless compute → surface as potential Application-backing technology
  - Managed databases → surface as data platform records (when Data Architecture is built)
  - API gateways → feed into API Management integration (see `int-api-management.md`)
- Map discovered resources to existing GovEA Application records where a match can be made by name, tag, or metadata
- Surface unmatched cloud resources — resources with no GovEA application record — as a completeness gap signal on the admin dashboard
- Show per-application: cloud region, resource count, and last-activity timestamp derived from cloud telemetry

## Rules

- Cloud discovery requires read-only permissions only; GovEA never provisions, modifies, or deletes cloud resources
- Cloud credentials (IAM roles, service principals) are stored securely in org-level settings and never exposed in the UI or API
- Discovered resources are surfaced as suggestions, not automatic records — no Application record is created without architect confirmation
- Resource matching is heuristic and explicitly marked as such in the UI; architects must confirm matches before they are persisted
- Discovery scope is bounded to explicitly configured cloud accounts; GovEA does not attempt to discover accounts it has not been given credentials for

## Implementation Notes

- AWS Organizations API enables multi-account discovery from a management account — relevant for state-level IT organisations managing multiple agency accounts
- Azure Management Groups provide an analogous multi-subscription scope
- For GovFederal deployments on GovCloud partitions (AWS GovCloud, Azure Government), the API endpoints differ and must be configurable per org rather than hard-coded

## Links

- Depends on: `po-application-portfolio`, `rm-repository-completeness`, `ac-admin-dashboard`
- Related: `int-itsm-cmdb.md`, `int-api-management.md`
