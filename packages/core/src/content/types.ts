import { z } from 'zod'

// ---------------------------------------------------------------------------
// Field type definitions
// Each field type describes how data is stored, validated, and displayed.
// Apps define content types by composing these field descriptors.
// ---------------------------------------------------------------------------

export type FieldType =
  | 'text'
  | 'textarea'
  | 'richtext'
  | 'number'
  | 'boolean'
  | 'date'
  | 'select'
  | 'multiselect'
  | 'relation'
  | 'taxonomy'
  | 'email'
  | 'url'

interface BaseField {
  name: string
  label?: string
  required?: boolean
  description?: string
}

export interface TextField extends BaseField {
  type: 'text' | 'textarea' | 'email' | 'url'
  placeholder?: string
  maxLength?: number
}

export interface RichTextField extends BaseField {
  type: 'richtext'
}

export interface NumberField extends BaseField {
  type: 'number'
  min?: number
  max?: number
  decimals?: number
}

export interface BooleanField extends BaseField {
  type: 'boolean'
  defaultValue?: boolean
}

export interface DateField extends BaseField {
  type: 'date'
}

export interface SelectField extends BaseField {
  type: 'select' | 'multiselect'
  options: Array<{ label: string; value: string }>
}

export interface RelationField extends BaseField {
  type: 'relation'
  to: string          // content type name
  many?: boolean      // true = many-to-many, false = many-to-one
}

export interface TaxonomyField extends BaseField {
  type: 'taxonomy'
  taxonomy: string    // taxonomy slug e.g. 'capability-domains'
  many?: boolean
}

export type FieldDefinition =
  | TextField
  | RichTextField
  | NumberField
  | BooleanField
  | DateField
  | SelectField
  | RelationField
  | TaxonomyField

// ---------------------------------------------------------------------------
// Workflow states — every content item moves through these statuses
// ---------------------------------------------------------------------------

export type WorkflowStatus = 'draft' | 'published' | 'archived'

export const WORKFLOW_TRANSITIONS: Record<WorkflowStatus, WorkflowStatus[]> = {
  draft:     ['published'],
  published: ['draft', 'archived'],
  archived:  ['draft'],
}

// ---------------------------------------------------------------------------
// Content type definition — the core unit of the CMS pattern
// ---------------------------------------------------------------------------

export interface ContentTypeDefinition {
  name: string                      // unique slug e.g. 'capability'
  label: string                     // display name e.g. 'Capability'
  labelPlural?: string              // e.g. 'Capabilities'
  description?: string
  fields: FieldDefinition[]
  workflow?: boolean                // enable draft/published/archived (default: true)
  audit?: boolean                   // log all changes (default: true)
  permissions?: string[]            // roles that can create/edit items of this type
  icon?: string                     // lucide icon name for UI
  titleField?: string               // which field is the display title (default: 'name' or 'title')
}

// ---------------------------------------------------------------------------
// Runtime content item — what gets stored and passed around at runtime
// ---------------------------------------------------------------------------

export interface ContentItem {
  id: string
  type: string                      // content type name
  status: WorkflowStatus
  createdAt: Date
  updatedAt: Date
  createdById: string
  data: Record<string, unknown>     // the field values
}

// ---------------------------------------------------------------------------
// Zod schema helpers — generate validation schema from field definitions
// ---------------------------------------------------------------------------

function fieldToZod(field: FieldDefinition): z.ZodTypeAny {
  let schema: z.ZodTypeAny

  switch (field.type) {
    case 'text':
    case 'textarea':
    case 'richtext':
    case 'email':
    case 'url': {
      let s = z.string()
      if ('maxLength' in field && field.maxLength) s = s.max(field.maxLength)
      if (field.type === 'email') s = s.email()
      if (field.type === 'url') s = s.url()
      schema = s
      break
    }
    case 'number':
      schema = z.number()
      break
    case 'boolean':
      schema = z.boolean()
      break
    case 'date':
      schema = z.coerce.date()
      break
    case 'select':
      schema = z.string()
      break
    case 'multiselect':
      schema = z.array(z.string())
      break
    case 'relation':
      schema = field.many ? z.array(z.string()) : z.string()
      break
    case 'taxonomy':
      schema = field.many ? z.array(z.string()) : z.string()
      break
    default:
      schema = z.unknown()
  }

  return field.required ? schema : schema.optional().nullable()
}

export function buildZodSchema(fields: FieldDefinition[]): z.ZodObject<z.ZodRawShape> {
  const shape: z.ZodRawShape = {}
  for (const field of fields) {
    shape[field.name] = fieldToZod(field)
  }
  return z.object(shape)
}
