import type { Recipe } from './types'
import { togafRecipe } from './togaf'

/**
 * The built-in recipe catalog (#671 / #665). Recipes are defined in-repo as
 * data; the admin install surface (S1b) lists these and installs one via
 * installRecipe(). File-based / uploaded recipes are a deferred follow-on.
 */
export const RECIPE_CATALOG: Recipe[] = [togafRecipe]

/** Look up a built-in recipe by its stable slug. */
export function getRecipe(slug: string): Recipe | undefined {
  return RECIPE_CATALOG.find(r => r.slug === slug)
}
