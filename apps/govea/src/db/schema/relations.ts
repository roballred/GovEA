import { relations } from 'drizzle-orm'
import { capabilities, capabilityPersonas } from './capabilities'
import { applications, applicationCapabilities } from './applications'
import { personas, personaTypes } from './personas'
import { organizations } from './organizations'

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
}))

export const personaTypesRelations = relations(personaTypes, ({ one }) => ({
  organization: one(organizations, {
    fields: [personaTypes.organizationId],
    references: [organizations.id],
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
