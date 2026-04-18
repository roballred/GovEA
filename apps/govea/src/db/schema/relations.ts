import { relations } from 'drizzle-orm'
import { capabilities, capabilityPersonas } from './capabilities'
import { applications, applicationCapabilities } from './applications'
import { personas, personaTags } from './personas'
import { taxonomyTerms } from './taxonomy'
import { organizations } from './organizations'
import { valueStreams, valueStreamStages, valueStreamStageCapabilities, valueStreamPersonas } from './value-streams'
import { strategicObjectives, objectiveCapabilities, objectiveValueStreams, objectiveApplications } from './objectives'
import { initiatives, initiativeCapabilities, initiativeObjectives, initiativeApplications } from './initiatives'
import { adrs, adrCapabilities, adrApplications, adrInitiatives, adrObjectives } from './adrs'
import { principles, principleAdrs, principleCapabilities } from './principles'
import { glossaryTerms, glossaryTermSources } from './glossary'

// ─── Capabilities ────────────────────────────────────────────────────────────

export const capabilitiesRelations = relations(capabilities, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [capabilities.organizationId],
    references: [organizations.id],
  }),
  capabilityPersonas: many(capabilityPersonas),
  valueStreamStageCapabilities: many(valueStreamStageCapabilities),
  objectiveCapabilities: many(objectiveCapabilities),
  initiativeCapabilities: many(initiativeCapabilities),
  applicationCapabilities: many(applicationCapabilities),
  adrCapabilities: many(adrCapabilities),
  principleCapabilities: many(principleCapabilities),
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

// ─── Personas ────────────────────────────────────────────────────────────────

export const personasRelations = relations(personas, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [personas.organizationId],
    references: [organizations.id],
  }),
  capabilityPersonas: many(capabilityPersonas),
  personaTags: many(personaTags),
  valueStreamPersonas: many(valueStreamPersonas),
}))

export const personaTagsRelations = relations(personaTags, ({ one }) => ({
  persona: one(personas, {
    fields: [personaTags.personaId],
    references: [personas.id],
  }),
  tag: one(taxonomyTerms, {
    fields: [personaTags.tagId],
    references: [taxonomyTerms.id],
  }),
}))

// ─── Value Streams ───────────────────────────────────────────────────────────

export const valueStreamsRelations = relations(valueStreams, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [valueStreams.organizationId],
    references: [organizations.id],
  }),
  stages: many(valueStreamStages),
  valueStreamPersonas: many(valueStreamPersonas),
  objectiveValueStreams: many(objectiveValueStreams),
}))

export const valueStreamPersonasRelations = relations(valueStreamPersonas, ({ one }) => ({
  valueStream: one(valueStreams, {
    fields: [valueStreamPersonas.valueStreamId],
    references: [valueStreams.id],
  }),
  persona: one(personas, {
    fields: [valueStreamPersonas.personaId],
    references: [personas.id],
  }),
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

// ─── Strategic Objectives ────────────────────────────────────────────────────

export const strategicObjectivesRelations = relations(strategicObjectives, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [strategicObjectives.organizationId],
    references: [organizations.id],
  }),
  objectiveCapabilities: many(objectiveCapabilities),
  objectiveValueStreams: many(objectiveValueStreams),
  objectiveApplications: many(objectiveApplications),
  initiativeObjectives: many(initiativeObjectives),
  adrObjectives: many(adrObjectives),
}))

export const objectiveCapabilitiesRelations = relations(objectiveCapabilities, ({ one }) => ({
  objective: one(strategicObjectives, {
    fields: [objectiveCapabilities.objectiveId],
    references: [strategicObjectives.id],
  }),
  capability: one(capabilities, {
    fields: [objectiveCapabilities.capabilityId],
    references: [capabilities.id],
  }),
}))

export const objectiveValueStreamsRelations = relations(objectiveValueStreams, ({ one }) => ({
  objective: one(strategicObjectives, {
    fields: [objectiveValueStreams.objectiveId],
    references: [strategicObjectives.id],
  }),
  valueStream: one(valueStreams, {
    fields: [objectiveValueStreams.valueStreamId],
    references: [valueStreams.id],
  }),
}))

export const objectiveApplicationsRelations = relations(objectiveApplications, ({ one }) => ({
  objective: one(strategicObjectives, {
    fields: [objectiveApplications.objectiveId],
    references: [strategicObjectives.id],
  }),
  application: one(applications, {
    fields: [objectiveApplications.applicationId],
    references: [applications.id],
  }),
}))

// ─── Initiatives ─────────────────────────────────────────────────────────────

export const initiativesRelations = relations(initiatives, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [initiatives.organizationId],
    references: [organizations.id],
  }),
  initiativeCapabilities: many(initiativeCapabilities),
  initiativeObjectives: many(initiativeObjectives),
  initiativeApplications: many(initiativeApplications),
  adrInitiatives: many(adrInitiatives),
}))

export const initiativeCapabilitiesRelations = relations(initiativeCapabilities, ({ one }) => ({
  initiative: one(initiatives, {
    fields: [initiativeCapabilities.initiativeId],
    references: [initiatives.id],
  }),
  capability: one(capabilities, {
    fields: [initiativeCapabilities.capabilityId],
    references: [capabilities.id],
  }),
}))

export const initiativeObjectivesRelations = relations(initiativeObjectives, ({ one }) => ({
  initiative: one(initiatives, {
    fields: [initiativeObjectives.initiativeId],
    references: [initiatives.id],
  }),
  objective: one(strategicObjectives, {
    fields: [initiativeObjectives.objectiveId],
    references: [strategicObjectives.id],
  }),
}))

export const initiativeApplicationsRelations = relations(initiativeApplications, ({ one }) => ({
  initiative: one(initiatives, {
    fields: [initiativeApplications.initiativeId],
    references: [initiatives.id],
  }),
  application: one(applications, {
    fields: [initiativeApplications.applicationId],
    references: [applications.id],
  }),
}))

// ─── Applications ────────────────────────────────────────────────────────────

export const applicationsRelations = relations(applications, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [applications.organizationId],
    references: [organizations.id],
  }),
  applicationCapabilities: many(applicationCapabilities),
  initiativeApplications: many(initiativeApplications),
  objectiveApplications: many(objectiveApplications),
  adrApplications: many(adrApplications),
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

// ─── ADRs ─────────────────────────────────────────────────────────────────────

export const adrsRelations = relations(adrs, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [adrs.organizationId],
    references: [organizations.id],
  }),
  // Self-referential: the ADR this one was superseded by
  supersededByAdr: one(adrs, {
    fields: [adrs.supersededBy],
    references: [adrs.id],
    relationName: 'adr_supersession',
  }),
  // Self-referential: ADRs that this one supersedes (both sides required by Drizzle)
  supersedes: many(adrs, {
    relationName: 'adr_supersession',
  }),
  adrCapabilities: many(adrCapabilities),
  adrApplications: many(adrApplications),
  adrInitiatives: many(adrInitiatives),
  adrObjectives: many(adrObjectives),
  principleAdrs: many(principleAdrs),
}))

export const adrCapabilitiesRelations = relations(adrCapabilities, ({ one }) => ({
  adr: one(adrs, {
    fields: [adrCapabilities.adrId],
    references: [adrs.id],
  }),
  capability: one(capabilities, {
    fields: [adrCapabilities.capabilityId],
    references: [capabilities.id],
  }),
}))

export const adrApplicationsRelations = relations(adrApplications, ({ one }) => ({
  adr: one(adrs, {
    fields: [adrApplications.adrId],
    references: [adrs.id],
  }),
  application: one(applications, {
    fields: [adrApplications.applicationId],
    references: [applications.id],
  }),
}))

export const adrInitiativesRelations = relations(adrInitiatives, ({ one }) => ({
  adr: one(adrs, {
    fields: [adrInitiatives.adrId],
    references: [adrs.id],
  }),
  initiative: one(initiatives, {
    fields: [adrInitiatives.initiativeId],
    references: [initiatives.id],
  }),
}))

export const adrObjectivesRelations = relations(adrObjectives, ({ one }) => ({
  adr: one(adrs, {
    fields: [adrObjectives.adrId],
    references: [adrs.id],
  }),
  objective: one(strategicObjectives, {
    fields: [adrObjectives.objectiveId],
    references: [strategicObjectives.id],
  }),
}))

// ─── Principles ───────────────────────────────────────────────────────────────

export const principlesRelations = relations(principles, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [principles.organizationId],
    references: [organizations.id],
  }),
  principleAdrs: many(principleAdrs),
  principleCapabilities: many(principleCapabilities),
}))

export const principleAdrsRelations = relations(principleAdrs, ({ one }) => ({
  principle: one(principles, {
    fields: [principleAdrs.principleId],
    references: [principles.id],
  }),
  adr: one(adrs, {
    fields: [principleAdrs.adrId],
    references: [adrs.id],
  }),
}))

export const principleCapabilitiesRelations = relations(principleCapabilities, ({ one }) => ({
  principle: one(principles, {
    fields: [principleCapabilities.principleId],
    references: [principles.id],
  }),
  capability: one(capabilities, {
    fields: [principleCapabilities.capabilityId],
    references: [capabilities.id],
  }),
}))

// ─── Glossary ─────────────────────────────────────────────────────────────────

export const glossaryTermsRelations = relations(glossaryTerms, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [glossaryTerms.organizationId],
    references: [organizations.id],
  }),
  sources: many(glossaryTermSources),
}))

export const glossaryTermSourcesRelations = relations(glossaryTermSources, ({ one }) => ({
  term: one(glossaryTerms, {
    fields: [glossaryTermSources.termId],
    references: [glossaryTerms.id],
  }),
}))
