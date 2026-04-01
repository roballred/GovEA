// ---------------------------------------------------------------------------
// Taxonomy system
// Hierarchical categorization for content items. Taxonomies are registered
// by name and seeded via recipes. The UI renders them as selects or trees.
// ---------------------------------------------------------------------------

export interface TaxonomyTermInput {
  name: string
  slug: string
  parentSlug?: string
  order?: number
}

export interface TaxonomyTerm extends TaxonomyTermInput {
  id: string
  taxonomy: string
  children?: TaxonomyTerm[]
}

export interface TaxonomyDefinition {
  slug: string          // unique identifier e.g. 'capability-domains'
  label: string         // display name e.g. 'Capability Domains'
  hierarchical?: boolean
  terms?: TaxonomyTermInput[]  // optional seed terms
}

class TaxonomyRegistry {
  private taxonomies = new Map<string, TaxonomyDefinition>()

  register(definition: TaxonomyDefinition): void {
    this.taxonomies.set(definition.slug, definition)
  }

  get(slug: string): TaxonomyDefinition {
    const taxonomy = this.taxonomies.get(slug)
    if (!taxonomy) {
      throw new Error(`Taxonomy "${slug}" is not registered.`)
    }
    return taxonomy
  }

  getAll(): TaxonomyDefinition[] {
    return Array.from(this.taxonomies.values())
  }
}

export const taxonomyRegistry = new TaxonomyRegistry()

export function defineTaxonomy(definition: TaxonomyDefinition): TaxonomyDefinition {
  taxonomyRegistry.register(definition)
  return definition
}

// Build a flat list into a nested tree for display
export function buildTaxonomyTree(terms: TaxonomyTerm[]): TaxonomyTerm[] {
  const map = new Map<string, TaxonomyTerm>()
  const roots: TaxonomyTerm[] = []

  for (const term of terms) {
    map.set(term.slug, { ...term, children: [] })
  }

  for (const term of map.values()) {
    if (term.parentSlug) {
      const parent = map.get(term.parentSlug)
      if (parent) {
        parent.children = parent.children ?? []
        parent.children.push(term)
      }
    } else {
      roots.push(term)
    }
  }

  return roots.sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
}
