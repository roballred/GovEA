// Recipe system: JSON-driven configuration and data setup
export interface Recipe {
  name: string
  version: string
  steps: RecipeStep[]
}

export interface RecipeStep {
  type: 'seed' | 'configure' | 'migrate'
  payload: unknown
}

export async function applyRecipe(_recipe: Recipe): Promise<void> {
  // TODO: implement step execution
}
