import { ContentTypeDefinition } from './types'

// ---------------------------------------------------------------------------
// Content Type Registry
// A singleton that holds all registered content types for an application.
// Apps call registerContentType() at startup. The registry is then used by
// UI components, API routes, and the audit system to understand data shapes.
// ---------------------------------------------------------------------------

class ContentTypeRegistry {
  private types = new Map<string, ContentTypeDefinition>()

  register(definition: ContentTypeDefinition): void {
    if (this.types.has(definition.name)) {
      throw new Error(
        `Content type "${definition.name}" is already registered. Each content type name must be unique.`
      )
    }

    // Apply sensible defaults
    const withDefaults: ContentTypeDefinition = {
      workflow: true,
      audit: true,
      labelPlural: `${definition.label}s`,
      titleField: 'name',
      ...definition,
    }

    this.types.set(definition.name, withDefaults)
  }

  get(name: string): ContentTypeDefinition {
    const type = this.types.get(name)
    if (!type) {
      throw new Error(
        `Content type "${name}" is not registered. Make sure to call registerContentType() before using it.`
      )
    }
    return type
  }

  getAll(): ContentTypeDefinition[] {
    return Array.from(this.types.values())
  }

  has(name: string): boolean {
    return this.types.has(name)
  }

  getRelationTypes(typeName: string): string[] {
    const type = this.get(typeName)
    return type.fields
      .filter(f => f.type === 'relation')
      .map(f => (f as { to: string }).to)
  }
}

// Singleton — one registry per application process
export const registry = new ContentTypeRegistry()

// Convenience function for the registration call pattern
export function defineContentType(definition: ContentTypeDefinition): ContentTypeDefinition {
  registry.register(definition)
  return definition
}
