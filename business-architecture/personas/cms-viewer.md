# Persona: Content Viewer

**Validation Status: Assumed** — drafted without direct user research. Goals and pain points reflect plausible friction for non-technical government stakeholders but have not been confirmed through interviews with real department heads, elected officials, or budget staff. Must not drive front-end display decisions beyond what is already built until validated.

## Role Type
Internal / External — Front-end information consumer

## Who They Are
The Content Viewer is anyone who needs to read and navigate published content but has no responsibility for creating or managing it. In a government EA context this includes department heads, elected officials, budget staff, and external partners. They may log in via SSO or access public-facing views without authentication. They are not technical and have no interest in how the system works — only in finding the information they need quickly.

## Goals
- Find relevant information quickly without training or a manual
- View up-to-date, published content with confidence it reflects the current state
- Navigate relationships between content (e.g. which applications support a capability, which personas a capability serves)
- Access the system from any device without installing software
- Understand content without EA jargon — plain language where possible

## Pain Points
- Information is buried in spreadsheets, SharePoint folders, or EA tools nobody knows how to use
- Content is stale — no way to know if what they're reading is current
- No clear path from a question ("what systems does permitting use?") to an answer
- Login friction — SSO should just work; separate credentials are a barrier
- Dense, technical outputs designed for architects, not decision-makers

## Critical Insight
The Content Viewer will not come back if the first experience is confusing or the content feels out of date. Trust is built through clear navigation, visible publish dates, and outputs written for a general audience. SSO must work transparently — any login friction is a reason to go back to email and spreadsheets.

## Data Stored About This Persona

GovEA stores the following personal data about Content Viewer accounts:

| Data | Purpose | Retention |
|---|---|---|
| Full name | Display in UI and session | Retained for the life of the account |
| Email address | Authentication | Retained for the life of the account |
| Role assignment | Access control (Viewer) | Retained for the life of the account |
| Login timestamps | Audit trail | Subject to audit log retention policy (default: 12 months) |

**SSO users:** For users who authenticate via Microsoft Entra ID SSO, GovEA does not store a password. Name and email are provided by the identity provider at login and stored locally for display and audit purposes.

**No content interaction data is stored:** GovEA does not track which content items a Viewer reads, how long they spend on a page, or what they search for.

**Authority:** Data is collected under the agency's IT system administration authority. No data is shared with third parties.

**Access and deletion:** An Admin can deactivate a Viewer account. Deactivation prevents login but does not delete audit trail entries. Full account data deletion requires a database-level operation documented in the deployment guide.

## Relevant Capabilities
- Front-end content display and navigation
- Search and filtering
- SSO authentication (read-only access)
- Plain-language content presentation
