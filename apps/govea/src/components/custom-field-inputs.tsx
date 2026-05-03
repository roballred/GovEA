'use client'

import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import type { CustomFieldDefinition } from '@/db/schema'

const SELECT_CLASS = 'h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring'

interface Props {
  fields: CustomFieldDefinition[]
  values?: Record<string, string>
}

export function CustomFieldInputs({ fields, values = {} }: Props) {
  if (fields.length === 0) return null

  return (
    <>
      {fields.map(field => {
        const inputName = `customData.${field.name}`
        const current = values[field.name] ?? ''

        return (
          <div key={field.name} className="space-y-1.5">
            <Label>
              {field.name}
              {field.required && <span className="text-destructive ml-0.5">*</span>}
            </Label>

            {field.type === 'text' && (
              <Input name={inputName} defaultValue={current} required={field.required} />
            )}

            {field.type === 'number' && (
              <Input type="number" name={inputName} defaultValue={current} required={field.required} />
            )}

            {field.type === 'date' && (
              <Input type="date" name={inputName} defaultValue={current} required={field.required} />
            )}

            {field.type === 'url' && (
              <Input type="url" name={inputName} defaultValue={current} placeholder="https://" required={field.required} />
            )}

            {field.type === 'boolean' && (
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id={inputName}
                  name={inputName}
                  value="true"
                  defaultChecked={current === 'true'}
                  className="rounded border-input"
                />
                <label htmlFor={inputName} className="text-sm text-muted-foreground">Yes</label>
              </div>
            )}

            {field.type === 'select' && (
              <select name={inputName} defaultValue={current} className={SELECT_CLASS} required={field.required}>
                <option value="">— Select —</option>
                {field.options?.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            )}

            {field.type === 'multiselect' && (
              <div className="rounded-md border border-input bg-transparent px-3 py-2 space-y-1 max-h-36 overflow-y-auto">
                {field.options?.map(o => {
                  const selected = current.split(',').map(s => s.trim()).includes(o)
                  return (
                    <label key={o} className="flex items-center gap-2 text-sm cursor-pointer">
                      <input
                        type="checkbox"
                        name={inputName}
                        value={o}
                        defaultChecked={selected}
                        className="rounded border-input"
                      />
                      {o}
                    </label>
                  )
                })}
              </div>
            )}
          </div>
        )
      })}
    </>
  )
}
