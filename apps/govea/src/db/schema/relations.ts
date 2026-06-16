import { relations } from 'drizzle-orm'
import { capabilities, capabilityPersonas, capabilityRelationships } from './capabilities'
import { applications, applicationCapabilities } from './applications'
import { personas, personaTags } from './personas'
import { taxonomyTerms, entityTaxonomyDefinitions, entityTaxonomyValues } from './taxonomy'
import { organizations } from './organizations'
import { valueStreams, valueStreamStages, valueStreamStageCapabilities, valueStreamPersonas, valueStreamCapabilities } from './value-streams'
import { strategicObjectives, objectiveCapabilities, objectiveValueStreams } from './objectives'
import { goals, goalObjectives } from './goals'
import { strategies, strategyGoals, strategyCapabilities, strategyValueStreams, strategyInitiatives } from './strategies'
import { users } from './users'
import { initiatives, initiativeCapabilities, initiativeObjectives, initiativeApplications } from './initiatives'
import { adrs, adrCapabilities, adrApplications, adrInitiatives, adrObjectives } from './adrs'
import { principles, principleAdrs, principleCapabilities } from './principles'
import { glossaryTerms, glossaryTermSources } from './glossary'
import { services, serviceCapabilities, servicePersonas, serviceValueStreams } from './services'

// ─── Capabilities ────────────────────────────────────────────────────────────

export const capabilitiesRelations = relations(capabilities, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [capabilities.organizationId],
    references: [organizations.id],
  }),
  capabilityPersonas: many(capabilityPersonas),
  valueStreamStageCapabilities: many(valueStreamStageCapabilities),
  valueStreamCapabilities: many(valueStreamCapabilities),
  objectiveCapabilities: many(objectiveCapabilities),
  initiativeCapabilities: many(initiativeCapabilities),
  strategyCapabilities: many(strategyCapabilities),
  applicationCapabilities: many(applicationCapabilities),
  adrCapabilities: many(adrCapabilities),
  principleCapabilities: many(principleCapabilities),
  // Parent-child hierarchy: rows where this cap is the parent (→ its children)
  childRelationships: many(capabilityRelationships, { relationName: 'cap_parent_side' }),
  // Parent-child hierarchy: rows where this cap is the child (→ its parents)
  parentRelationships: many(capabilityRelationships, { relationName: 'cap_child_side' }),
}))

export const capabilityRelationshipsRelations = relations(capabilityRelationships, ({ one }) => ({
  parent: one(capabilities, {
    fields: [capabilityRelationships.parentId],
    references: [capabilities.id],
    relationName: 'cap_parent_side',
  }),
  child: one(capabilities, {
    fields: [capabilityRelationships.childId],
    references: [capabilities.id],
    relationName: 'cap_child_side',
  }),
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
  valueStreamCapabilities: many(valueStreamCapabilities),
  objectiveValueStreams: many(objectiveValueStreams),
  strategyValueStreams: many(strategyValueStreams),
}))

export const valueStreamCapabilitiesRelations = relations(valueStreamCapabilities, ({ one }) => ({
  valueStream: one(valueStreams, {
    fields: [valueStreamCapabilities.valueStreamId],
    references: [valueStreams.id],
  }),
  capability: one(capabilities, {
    fields: [valueStreamCapabilities.capabilityId],
    references: [capabilities.id],
  }),
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

// ─── Goals ───────────────────────────────────────────────────────────────────

export const goalsRelations = relations(goals, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [goals.organizationId],
    references: [organizations.id],
  }),
  strategyGoals: many(strategyGoals),
  goalObjectives: many(goalObjectives),
}))

// ─── Strategies ──────────────────────────────────────────────────────────────

export const strategiesRelations = relations(strategies, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [strategies.organizationId],
    references: [organizations.id],
  }),
  owner: one(users, {
    fields: [strategies.ownerUserId],
    references: [users.id],
  }),
  strategyGoals: many(strategyGoals),
  strategyCapabilities: many(strategyCapabilities),
  strategyValueStreams: many(strategyValueStreams),
  strategyInitiatives: many(strategyInitiatives),
}))

export const strategyGoalsRelations = relations(strategyGoals, ({ one }) => ({
  strategy: one(strategies, { fields: [strategyGoals.strategyId], references: [strategies.id] }),
  goal: one(goals, { fields: [strategyGoals.goalId], references: [goals.id] }),
}))

export const strategyCapabilitiesRelations = relations(strategyCapabilities, ({ one }) => ({
  strategy: one(strategies, { fields: [strategyCapabilities.strategyId], references: [strategies.id] }),
  capability: one(capabilities, { fields: [strategyCapabilities.capabilityId], references: [capabilities.id] }),
}))

export const strategyValueStreamsRelations = relations(strategyValueStreams, ({ one }) => ({
  strategy: one(strategies, { fields: [strategyValueStreams.strategyId], references: [strategies.id] }),
  valueStream: one(valueStreams, { fields: [strategyValueStreams.valueStreamId], references: [valueStreams.id] }),
}))

export const strategyInitiativesRelations = relations(strategyInitiatives, ({ one }) => ({
  strategy: one(strategies, { fields: [strategyInitiatives.strategyId], references: [strategies.id] }),
  initiative: one(initiatives, { fields: [strategyInitiatives.initiativeId], references: [initiatives.id] }),
}))

export const goalObjectivesRelations = relations(goalObjectives, ({ one }) => ({
  goal: one(goals, {
    fields: [goalObjectives.goalId],
    references: [goals.id],
  }),
  objective: one(strategicObjectives, {
    fields: [goalObjectives.objectiveId],
    references: [strategicObjectives.id],
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
  initiativeObjectives: many(initiativeObjectives),
  adrObjectives: many(adrObjectives),
  goalObjectives: many(goalObjectives),
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

// ─── Initiatives ─────────────────────────────────────────────────────────────

export const initiativesRelations = relations(initiatives, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [initiatives.organizationId],
    references: [organizations.id],
  }),
  initiativeCapabilities: many(initiativeCapabilities),
  initiativeObjectives: many(initiativeObjectives),
  initiativeApplications: many(initiativeApplications),
  strategyInitiatives: many(strategyInitiatives),
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

// ─── Services ─────────────────────────────────────────────────────────────────

export const servicesRelations = relations(services, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [services.organizationId],
    references: [organizations.id],
  }),
  serviceCapabilities: many(serviceCapabilities),
  servicePersonas: many(servicePersonas),
  serviceValueStreams: many(serviceValueStreams),
}))

export const serviceCapabilitiesRelations = relations(serviceCapabilities, ({ one }) => ({
  service: one(services, {
    fields: [serviceCapabilities.serviceId],
    references: [services.id],
  }),
  capability: one(capabilities, {
    fields: [serviceCapabilities.capabilityId],
    references: [capabilities.id],
  }),
}))

export const servicePersonasRelations = relations(servicePersonas, ({ one }) => ({
  service: one(services, {
    fields: [servicePersonas.serviceId],
    references: [services.id],
  }),
  persona: one(personas, {
    fields: [servicePersonas.personaId],
    references: [personas.id],
  }),
}))

export const serviceValueStreamsRelations = relations(serviceValueStreams, ({ one }) => ({
  service: one(services, {
    fields: [serviceValueStreams.serviceId],
    references: [services.id],
  }),
  valueStream: one(valueStreams, {
    fields: [serviceValueStreams.valueStreamId],
    references: [valueStreams.id],
  }),
}))

// ─── Taxonomy ─────────────────────────────────────────────────────────────────

export const taxonomyTermsRelations = relations(taxonomyTerms, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [taxonomyTerms.organizationId],
    references: [organizations.id],
  }),
  parent: one(taxonomyTerms, {
    fields: [taxonomyTerms.parentId],
    references: [taxonomyTerms.id],
    relationName: 'term_parent_child',
  }),
  children: many(taxonomyTerms, {
    relationName: 'term_parent_child',
  }),
  entityDefinitions: many(entityTaxonomyDefinitions),
  entityValues: many(entityTaxonomyValues),
}))

export const entityTaxonomyDefinitionsRelations = relations(entityTaxonomyDefinitions, ({ one }) => ({
  organization: one(organizations, {
    fields: [entityTaxonomyDefinitions.organizationId],
    references: [organizations.id],
  }),
  taxonomyType: one(taxonomyTerms, {
    fields: [entityTaxonomyDefinitions.taxonomyTypeId],
    references: [taxonomyTerms.id],
  }),
}))

export const entityTaxonomyValuesRelations = relations(entityTaxonomyValues, ({ one }) => ({
  organization: one(organizations, {
    fields: [entityTaxonomyValues.organizationId],
    references: [organizations.id],
  }),
  term: one(taxonomyTerms, {
    fields: [entityTaxonomyValues.taxonomyTermId],
    references: [taxonomyTerms.id],
  }),
}))
