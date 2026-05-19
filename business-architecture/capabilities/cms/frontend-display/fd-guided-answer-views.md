# Capability: Guided Answer Views

## What It Does
The system must answer common stakeholder questions with a structured result view that assembles the most relevant linked content into a direct, readable response instead of forcing the user to interpret multiple records manually.

## Personas
- **Department Director** — asks task-oriented questions like `what supports permitting?`
- **Budget & Performance Analyst** — asks investment-oriented questions like `what systems are being replaced?`
- **Elected Official** — asks plain-language oversight questions like `what is changing in this service area?`
- **Content Viewer** — needs a quick path to a direct answer without knowing GovEA's data model

## Behaviors
- Accept a guided question or search query and return a structured answer view
- Summarize the relevant capability, service, applications, initiatives, and objectives tied to that question
- Present the answer in plain language with links to the underlying records for deeper inspection
- Show why each returned record is relevant to the question
- Support presentation-ready or print-friendly formatting for briefing use

## Rules
- The answer view must optimize for clarity and directness, not exhaustive search-result volume
- Viewer-visible answers must include only records the current role is allowed to see
- The generated answer framing must avoid jargon and internal field names
- Search and answer confidence should be explainable when multiple related records are returned

## Implementation Status

**Shipped (v1, with entry-path friction).** `/answers?q=<query>` renders an assembled briefing-ready view grouped by Capabilities / Services / Applications / Initiatives / Objectives with a "Why relevant" rationale on each item. Confirmed during the Elected Official persona journey audit ([#546](https://github.com/roballred/GovEA/issues/546)).

Known gap: `/answers` with no query has no direct input field — the user has to detour through `/search` and click "Get guided answer →" to assemble an answer. Tracked at [#550](https://github.com/roballred/GovEA/issues/550) along with the "Capabilitys" pluralisation typo in the search results headings.

## Links
- Depends on: Content Management — Content Search & Filtering, Front-end Display — Content Display, Front-end Display — Relationship Navigation
- Related: Mission-to-Technology Traceability Views, Front-end Display — Portfolio Views
