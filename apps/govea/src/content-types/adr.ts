import { defineContentType } from '@govea/core'

export const adrContentType = defineContentType({
  name: 'adr',
  label: 'Architecture Decision',
  labelPlural: 'Architecture Decisions',
  description: 'A significant architecture decision with context, rationale, and consequences. Based on the EasyEA ARB review format.',
  icon: 'file-check',
  titleField: 'title',
  workflow: false,   // ADRs use their own status field (proposed/accepted/deprecated)
  audit: true,
  permissions: ['admin', 'contributor'],
  fields: [
    {
      name: 'title',
      label: 'Decision Title',
      type: 'text',
      required: true,
      placeholder: 'e.g. Replace Legacy Permitting System with Accela',
    },
    {
      name: 'status',
      label: 'Status',
      type: 'select',
      required: true,
      options: [
        { label: 'Proposed — under consideration', value: 'proposed' },
        { label: 'Accepted — decision made', value: 'accepted' },
        { label: 'Deprecated — no longer applicable', value: 'deprecated' },
        { label: 'Superseded — replaced by a newer decision', value: 'superseded' },
      ],
    },
    {
      name: 'context',
      label: 'Context',
      type: 'richtext',
      description: 'Why was this decision needed? What problem or opportunity triggered it?',
    },
    {
      name: 'decision',
      label: 'Decision',
      type: 'richtext',
      description: 'What was decided? Be specific.',
    },
    {
      name: 'consequences',
      label: 'Consequences',
      type: 'richtext',
      description: 'What are the trade-offs? What does this decision foreclose? What risks does it introduce?',
    },
    {
      name: 'capabilities',
      label: 'Affected Capabilities',
      type: 'relation',
      to: 'capability',
      many: true,
    },
    {
      name: 'applications',
      label: 'Affected Applications',
      type: 'relation',
      to: 'application',
      many: true,
    },
    {
      name: 'arbStatus',
      label: 'ARB Review Status',
      type: 'select',
      options: [
        { label: 'Not Reviewed', value: 'not-reviewed' },
        { label: 'In Review', value: 'in-review' },
        { label: 'Approved', value: 'approved' },
        { label: 'Rejected', value: 'rejected' },
      ],
    },
    {
      name: 'arbFindings',
      label: 'ARB Findings',
      type: 'richtext',
      description: 'Output from the EasyEA ARB review — what was challenged, confirmed, or flagged.',
    },
  ],
})
