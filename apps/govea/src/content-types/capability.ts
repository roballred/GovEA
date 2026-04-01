import { defineContentType } from '@govea/core'

export const capabilityContentType = defineContentType({
  name: 'capability',
  label: 'Capability',
  labelPlural: 'Capabilities',
  description: 'What the organization does — described as an outcome, not a process. Hierarchical. Every capability traces to at least one persona.',
  icon: 'zap',
  titleField: 'name',
  workflow: true,
  audit: true,
  permissions: ['admin', 'contributor'],
  fields: [
    {
      name: 'name',
      label: 'Capability Name',
      type: 'text',
      required: true,
      placeholder: 'e.g. Issue Building Permits',
      description: 'Use plain language. Describe what the organization delivers, not how it does it.',
    },
    {
      name: 'description',
      label: 'Description',
      type: 'richtext',
      description: 'What does this capability deliver? What would break if it disappeared?',
    },
    {
      name: 'domain',
      label: 'Capability Domain',
      type: 'taxonomy',
      taxonomy: 'capability-domains',
      description: 'The functional area this capability belongs to.',
    },
    {
      name: 'parentId',
      label: 'Parent Capability',
      type: 'relation',
      to: 'capability',
      many: false,
      description: 'Leave blank for top-level capabilities. Use to build a capability map hierarchy.',
    },
    {
      name: 'personas',
      label: 'Personas Served',
      type: 'relation',
      to: 'persona',
      many: true,
      required: true,
      description: 'Who does this capability serve? At least one persona is required.',
    },
    {
      name: 'owningDepartment',
      label: 'Owning Department',
      type: 'text',
      placeholder: 'e.g. Planning & Development',
    },
    {
      name: 'maturityLevel',
      label: 'Maturity Level',
      type: 'select',
      options: [
        { label: 'Initial — ad hoc, undocumented', value: 'initial' },
        { label: 'Managed — repeatable with some documentation', value: 'managed' },
        { label: 'Defined — standardized and documented', value: 'defined' },
        { label: 'Quantitatively Managed — metrics-driven', value: 'quantitative' },
        { label: 'Optimizing — continuous improvement', value: 'optimizing' },
      ],
    },
    {
      name: 'strategicImportance',
      label: 'Strategic Importance',
      type: 'select',
      options: [
        { label: 'Core — mission-critical, primary purpose', value: 'core' },
        { label: 'Supporting — enables core capabilities', value: 'supporting' },
        { label: 'Enabling — infrastructure and utilities', value: 'enabling' },
      ],
    },
    // Optional framework overlays — never required
    {
      name: 'togafTag',
      label: 'TOGAF Capability Name',
      type: 'text',
      description: 'Optional. Maps this capability to a TOGAF Business Capability if using TOGAF overlay.',
    },
    {
      name: 'safeTag',
      label: 'SAFe Epic / Value Stream',
      type: 'text',
      description: 'Optional. Maps this capability to a SAFe Epic or Value Stream if using SAFe overlay.',
    },
  ],
})
