// Content type registry: define types declaratively
export interface FieldDefinition {
  name: string
  type: 'text' | 'textarea' | 'boolean' | 'number' | 'date' | 'reference' | 'taxonomy'
  required?: boolean
  label?: string
}

export interface ContentTypeDefinition {
  name: string
  fields: FieldDefinition[]
}

export class ContentTypeRegistry {
  private types = new Map<string, ContentTypeDefinition>()

  register(definition: ContentTypeDefinition): void {
    this.types.set(definition.name, definition)
  }

  get(name: string): ContentTypeDefinition | undefined {
    return this.types.get(name)
  }

  all(): ContentTypeDefinition[] {
    return Array.from(this.types.values())
  }
}
