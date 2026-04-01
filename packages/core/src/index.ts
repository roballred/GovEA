// @govea/core — CMS-pattern foundation for GovEA and future applications
//
// This package provides the building blocks for content-driven applications:
// content type registry, field types, taxonomy, RBAC, audit trail, workflow
// state machine, and the recipe/seed system.
//
// Apps use these primitives to define their data model declaratively, then
// wire them to their database and UI layer.

export * from './content/index'
export * from './taxonomy/index'
export * from './rbac/index'
export * from './audit/index'
export * from './workflow/index'
export * from './recipes/index'
