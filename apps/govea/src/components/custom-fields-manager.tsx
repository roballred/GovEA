'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { saveCustomFieldSchema } from '@/actions/custom-fields'
import type { CustomFieldDefinition, CustomFieldType } from '@/db/schema'

const FIELD_TYPES: { value: CustomFieldType; label: string }[] = [
  { value: 'text', label: 'Text' },
  { value: 'number', label: 'Number' },
  { value: 'date', label: 'Date' },
  { value: 'url', label: 'URL' },
  { value: 'boolean', label: 'Yes / No' },
  { value: 'select', label: 'Select (single)' },
  { value: 'multiselect', label: 'Select (multiple)' },
]

const SELECT_CLASS = 'h-9 rounded-md border border-input bg-transparent px-3 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring'

interface Props {
  entityType: string
  initialFields: CustomFieldDefinition[]
}

export function CustomFieldsManager({ entityType, initialFields }: Props) {
  const [fields, setFields] = useState<CustomFieldDefinition[]>(initialFields)
  const [isPending, startTransition] = useTransition()
  const [saved, setSaved] = useState(false)

  // New field form state
  const [newName, setNewName] = useState('')
  const [newType, setNewType] = useState<CustomFieldType>('text')
  const [newRequired, setNewRequired] = useState(false)
  const [newOptions, setNewOptions] = useState('')

  function addField() {
    const name = newName.trim()
    if (!name) return
    if (fields.some(f => f.name.toLowerCase() === name.toLowerCase())) return

    const field: CustomFieldDefinition = {
      name,
      type: newType,
      required: newRequired,
      ...(needsOptions(newType) ? { options: newOptions.split(',').map(o => o.trim()).filter(Boolean) } : {}),
    }

    const updated = [...fields, field]
    setFields(updated)
    setNewName('')
    setNewType('text')
    setNewRequired(false)
    setNewOptions('')
    persist(updated)
  }

  function removeField(name: string) {
    const updated = fields.filter(f => f.name !== name)
    setFields(updated)
    persist(updated)
  }

  function persist(updated: CustomFieldDefinition[]) {
    startTransition(async () => {
      await saveCustomFieldSchema(entityType, updated)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    })
  }

  return (
    <div className="space-y-4">
      {fields.length === 0 ? (
        <p className="text-sm text-muted-foreground">No custom fields defined yet.</p>
      ) : (
        <div className="rounded-md border divide-y">
          {fields.map(f => (
            <div key={f.name} className="flex items-center justify-between px-3 py-2 text-sm">
              <div className="flex items-center gap-3">
                <span className="font-medium">{f.name}</span>
                <span className="text-xs text-muted-foreground bg-slate-100 rounded px-1.5 py-0.5">
                  {FIELD_TYPES.find(t => t.value === f.type)?.label ?? f.type}
                </span>
                {f.required && <span className="text-xs text-destructive">required</span>}
                {f.options && f.options.length > 0 && (
                  <span className="text-xs text-muted-foreground">{f.options.join(', ')}</span>
                )}
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
                onClick={() => removeField(f.name)}
                disabled={isPending}
              >
                Remove
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Add field form */}
      <div className="rounded-md border p-3 space-y-3 bg-muted/20">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Add field</p>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Field name</Label>
            <Input
              value={newName}
              onChange={e => setNewName(e.target.value)}
              placeholder="e.g. Contract Expiry"
              className="h-8 text-sm"
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addField() } }}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Type</Label>
            <select
              value={newType}
              onChange={e => setNewType(e.target.value as CustomFieldType)}
              className={SELECT_CLASS}
            >
              {FIELD_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
        </div>
        {needsOptions(newType) && (
          <div className="space-y-1.5">
            <Label className="text-xs">Options (comma-separated)</Label>
            <Input
              value={newOptions}
              onChange={e => setNewOptions(e.target.value)}
              placeholder="e.g. Public, Internal, Confidential"
              className="h-8 text-sm"
            />
          </div>
        )}
        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={newRequired}
              onChange={e => setNewRequired(e.target.checked)}
              className="rounded border-input"
            />
            Required
          </label>
          <div className="flex items-center gap-2">
            {saved && <span className="text-xs text-emerald-600">Saved</span>}
            <Button size="sm" onClick={addField} disabled={!newName.trim() || isPending}>
              Add field
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

function needsOptions(type: CustomFieldType) {
  return type === 'select' || type === 'multiselect'
}
