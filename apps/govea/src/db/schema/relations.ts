import { relations } from 'drizzle-orm'
import { capabilities, capabilityPersonas } from './capabilities'
import { applications, applicationCapabilities } from './applications'
import { personas, personaTags, personaTypes, tags } from './personas'
import { organizations } from './organizations'
import { valueStreams, valueStreamStages, valueStreamStageCapabilities } from './value-streams'

export const capabilitiesRelations = relations(capabilities, ({ many }) => ({
  capabilityPersonas: many(capabilityPersonas),
}))

export const capabilityPersonasRelations = relations(capabilityPersonas, ({ one }) => ({
  capability: one(capabilities, {
    fields: [capabilityPersonas.capabilityId],
    references: [capabilities.id],
  }),
  persona: one(personas, {
    fields: [capabilityPersonas.personaId],
    references: [personas.id],
  }),
}))

export const personasRelations = relations(personas, ({ many }) => ({
  capabilityPersonas: many(capabilityPersonas),
  personaTags: many(personaTags),
}))

export const tagsRelations = relations(tags, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [tags.organizationId],
    references: [organizations.id],
  }),
  personaTags: many(personaTags),
}))

export const personaTagsRelations = relations(personaTags, ({ one }) => ({
  persona: one(personas, {
    fields: [personaTags.personaId],
    references: [personas.id],
  }),
  tag: one(tags, {
    fields: [personaTags.tagId],
    references: [tags.id],
  }),
}))

export const personaTypesRelations = relations(personaTypes, ({ one }) => ({
  organization: one(organizations, {
    fields: [personaTypes.organizationId],
    references: [organizations.id],
  }),
}))

export const valueStreamsRelations = relations(valueStreams, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [valueStreams.organizationId],
    references: [organizations.id],
  }),
  stakeholderPersona: one(personas, {
    fields: [valueStreams.stakeholderPersonaId],
    references: [personas.id],
  }),
  stages: many(valueStreamStages),
}))

export const valueStreamStagesRelations = relations(valueStreamStages, ({ one, many }) => ({
  valueStream: one(valueStreams, {
    fields: [valueStreamStages.valueStreamId],
    references: [valueStreams.id],
  }),
  stageCapabilities: many(valueStreamStageCapabilities),
}))

export const valueStreamStageCapabilitiesRelations = relations(valueStreamStageCapabilities, ({ one }) => ({
  stage: one(valueStreamStages, {
    fields: [valueStreamStageCapabilities.stageId],
    references: [valueStreamStages.id],
  }),
  capability: one(capabilities, {
    fields: [valueStreamStageCapabilities.capabilityId],
    references: [capabilities.id],
  }),
}))

export const applicationsRelations = relations(applications, ({ many }) => ({
  applicationCapabilities: many(applicationCapabilities),
}))

export const applicationCapabilitiesRelations = relations(applicationCapabilities, ({ one }) => ({
  application: one(applications, {
    fields: [applicationCapabilities.applicationId],
    references: [applications.id],
  }),
  capability: one(capabilities, {
    fields: [applicationCapabilities.capabilityId],
    references: [capabilities.id],
  }),
}))
