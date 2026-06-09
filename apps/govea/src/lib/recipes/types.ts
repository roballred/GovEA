// Recipe-install engine types (#671 / #665 S1).
//
// A *recipe* is a curated, framework-agnostic bundle of configuration + starter
// content that an admin installs into their org. The engine (install.ts) knows
// nothing about TOGAF or any specific framework — TOGAF is just recipe #1,
// defined as data (S2). See docs/design/togaf-recipe-reconciliation.md §9–§10.

export interface RecipeTaxonomyTerm {
  name: string
  slug: string
  description?: string
}

export interface RecipeTaxonomyBinding {
  /** Entity type the taxonomy applies to, e.g. 'capability', 'application'. */
  entityType: string
  selectionMode?: 'single' | 'multi'
  required?: boolean
}

export interface RecipeTaxonomyType {
  name: string
  /** Stable machine key; the install upserts by (org, parentId=null, slug). */
  slug: string
  description?: string
  /**
   * 'framework' marks a jargon-bearing type to hide from viewer-role users and
   * stakeholder reports (ADR-0001). Omit / null for general types.
   */
  audience?: 'framework' | null
  terms?: RecipeTaxonomyTerm[]
  /** Bind this type to entity types (the entity_taxonomy_definitions rows). */
  bindings?: RecipeTaxonomyBinding[]
}

export interface RecipeGlossaryTerm {
  term: string
  definition: string
  domain?: string
}

export interface RecipePrinciple {
  name: string
  title?: string
  description?: string
  rationale?: string
  implications?: string
  /** Slug of the principle-type taxonomy term; defaults to 'architecture'. */
  principleType?: string
}

export interface Recipe {
  /** Stable identifier, e.g. 'togaf'. */
  slug: string
  name: string
  version: string
  description?: string
  taxonomyTypes?: RecipeTaxonomyType[]
  glossaryTerms?: RecipeGlossaryTerm[]
  principles?: RecipePrinciple[]
  // Report presets are deferred until the report engine (S3 / #673) exists.
}

/** Counts of rows newly created by an install (updates-in-place are not counted). */
export interface InstallResult {
  taxonomyTypes: number
  taxonomyTerms: number
  bindings: number
  glossaryTerms: number
  principles: number
}
