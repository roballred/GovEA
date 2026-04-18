'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { PersonaEditForm } from '@/components/persona-edit-form'

interface PersonaEditSectionProps {
  personaId: string
  initial: {
    name: string
    description: string | null
    type: string | null
    status: 'draft' | 'published' | 'archived'
    visibility: 'org' | 'connections' | 'instance'
    tagIds: string[]
  }
  personaTypes: { id: string; name: string }[]
  tags: { id: string; name: string }[]
}

/**
 * Renders an "Edit" button. When clicked, expands an inline edit form.
 * Designed to sit as a standalone section between the header and the divider.
 */
export function PersonaEditButton({ personaId, initial, personaTypes, tags }: PersonaEditSectionProps) {
  const [editing, setEditing] = useState(false)

  if (editing) {
    return (
      <PersonaEditForm
        personaId={personaId}
        initial={initial}
        personaTypes={personaTypes}
        tags={tags}
        onCancel={() => setEditing(false)}
      />
    )
  }

  return (
    <div className="flex justify-end">
      <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
        Edit persona
      </Button>
    </div>
  )
}
