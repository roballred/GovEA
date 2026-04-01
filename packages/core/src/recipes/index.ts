// ---------------------------------------------------------------------------
// Recipe / Seed System
// Recipes are JSON structures that describe data to be created on first run.
// Inspired by OrchardCore's recipe system — they make container deployments
// repeatable and let agencies customise their setup without code changes.
// ---------------------------------------------------------------------------

export interface RecipeTaxonomyStep {
  type: 'taxonomy'
  taxonomy: string
  terms: Array<{
    name: string
    slug: string
    parentSlug?: string
    order?: number
    children?: Array<{ name: string; slug: string; order?: number }>
  }>
}

export interface RecipeContentStep {
  type: 'content'
  contentType: string
  items: Array<Record<string, unknown>>
}

export interface RecipeSettingsStep {
  type: 'settings'
  settings: Record<string, unknown>
}

export type RecipeStep = RecipeTaxonomyStep | RecipeContentStep | RecipeSettingsStep

export interface Recipe {
  name: string
  description?: string
  version: string
  steps: RecipeStep[]
}

// Recipe runner type — apps provide the implementation backed by their DB
export type RecipeRunner = (recipe: Recipe) => Promise<{ success: boolean; errors: string[] }>

let _runner: RecipeRunner | null = null

export function configureRecipeRunner(runner: RecipeRunner): void {
  _runner = runner
}

export async function runRecipe(recipe: Recipe): Promise<{ success: boolean; errors: string[] }> {
  if (!_runner) {
    throw new Error('No recipe runner configured. Call configureRecipeRunner() before running recipes.')
  }
  return _runner(recipe)
}

// Load a recipe from a JSON object (used in API routes and seed scripts)
export function loadRecipe(json: unknown): Recipe {
  if (typeof json !== 'object' || json === null) {
    throw new Error('Recipe must be a JSON object')
  }
  const r = json as Record<string, unknown>
  if (!r.name || !r.steps || !Array.isArray(r.steps)) {
    throw new Error('Recipe must have name and steps array')
  }
  return json as Recipe
}
