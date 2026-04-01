import { defineContentType } from '@govea/core'

export const organizationContentType = defineContentType({
  name: 'organization',
  label: 'Organization',
  labelPlural: 'Organizations',
  description: 'A government agency, city, county, or department using GovEA.',
  icon: 'building-2',
  titleField: 'name',
  workflow: true,
  audit: true,
  permissions: ['admin'],
  fields: [
    {
      name: 'name',
      label: 'Organization Name',
      type: 'text',
      required: true,
      placeholder: 'e.g. City of Springfield — Department of Information Technology',
    },
    {
      name: 'jurisdictionType',
      label: 'Jurisdiction Type',
      type: 'select',
      required: true,
      options: [
        { label: 'City', value: 'city' },
        { label: 'County', value: 'county' },
        { label: 'State Agency', value: 'state' },
        { label: 'Special District', value: 'special-district' },
        { label: 'Regional Authority', value: 'regional' },
      ],
    },
    {
      name: 'state',
      label: 'State',
      type: 'text',
      required: true,
      placeholder: 'e.g. IL',
      maxLength: 2,
    },
    {
      name: 'populationServed',
      label: 'Population Served',
      type: 'number',
      description: 'Approximate number of residents served by this organization.',
    },
    {
      name: 'eaMaturityLevel',
      label: 'EA Maturity Level',
      type: 'select',
      options: [
        { label: '1 — Initial (no formal EA practice)', value: '1' },
        { label: '2 — Developing (EA in progress)', value: '2' },
        { label: '3 — Defined (documented, repeatable)', value: '3' },
        { label: '4 — Managed (metrics-driven)', value: '4' },
        { label: '5 — Optimizing (continuous improvement)', value: '5' },
      ],
    },
    {
      name: 'description',
      label: 'Description',
      type: 'textarea',
      placeholder: 'Brief description of the organization and its EA goals.',
    },
    {
      name: 'website',
      label: 'Website',
      type: 'url',
      placeholder: 'https://',
    },
  ],
})
