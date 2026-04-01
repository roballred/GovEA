import { defineContentType } from '@govea/core'

export const personaContentType = defineContentType({
  name: 'persona',
  label: 'Persona',
  labelPlural: 'Personas',
  description: 'A real person type affected by the organization\'s technology. Every capability and application must trace to at least one persona.',
  icon: 'users',
  titleField: 'name',
  workflow: true,
  audit: true,
  permissions: ['admin', 'contributor'],
  fields: [
    {
      name: 'name',
      label: 'Role Name',
      type: 'text',
      required: true,
      placeholder: 'e.g. Building Inspector, Citizen Applying for Permit',
    },
    {
      name: 'roleType',
      label: 'Role Type',
      type: 'select',
      required: true,
      options: [
        { label: 'Citizen / Public', value: 'citizen' },
        { label: 'Staff / Employee', value: 'staff' },
        { label: 'Elected Official', value: 'elected' },
        { label: 'External Partner', value: 'external' },
      ],
    },
    {
      name: 'department',
      label: 'Department / Division',
      type: 'text',
      placeholder: 'e.g. Planning & Development',
    },
    {
      name: 'goals',
      label: 'Goals',
      type: 'richtext',
      description: 'What is this persona trying to achieve? What does success look like for them?',
    },
    {
      name: 'painPoints',
      label: 'Pain Points',
      type: 'richtext',
      description: 'What frustrates this persona about current technology or processes?',
    },
    {
      name: 'insights',
      label: 'Critical Insights',
      type: 'richtext',
      description: 'Key findings about this persona relevant to architecture decisions.',
    },
  ],
})
