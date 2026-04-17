'use client'

import { useState, useRef, useTransition, useEffect } from 'react'
import { createDomainValue } from '@/actions/taxonomy'
import { Label } from '@/components/ui/label'

interface Props {
  /** Initial selected value (the domain name string) */
  defaultValue?: string | null
  /** Existing domain value names fetched server-side */
  options: string[]
  /** form field name — defaults to "domain" */
  name?: string
  label?: string
  required?: boolean
}

/**
 * Combobox for the capability/glossary domain field.
 * Shows existing taxonomy domain values as options, allows typing to filter,
 * and creates a new taxonomy value ad-hoc when the user types something new.
 */
export function DomainCombobox({
  defaultValue,
  options: initialOptions,
  name = 'domain',
  label = 'Domain',
  required = false,
}: Props) {
  const [options, setOptions] = useState(initialOptions)
  const [selected, setSelected] = useState(defaultValue ?? '')
  const [query, setQuery] = useState(defaultValue ?? '')
  const [open, setOpen] = useState(false)
  const [isCreating, startCreate] = useTransition()
  const containerRef = useRef<HTMLDivElement>(null)

  // Close on outside click
  useEffect(() => {
    function onPointerDown(e: PointerEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
        // If user typed something that doesn't match a selection, revert query
        if (!options.some(o => o.toLowerCase() === query.toLowerCase())) {
          setQuery(selected)
        }
      }
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [options, query, selected])

  const filtered = query
    ? options.filter(o => o.toLowerCase().includes(query.toLowerCase()))
    : options

  const exactMatch = options.some(o => o.toLowerCase() === query.trim().toLowerCase())
  const canCreate = query.trim().length > 0 && !exactMatch

  function select(value: string) {
    setSelected(value)
    setQuery(value)
    setOpen(false)
  }

  function clear() {
    setSelected('')
    setQuery('')
    setOpen(false)
  }

  function handleCreate() {
    const name = query.trim()
    if (!name) return
    startCreate(async () => {
      const created = await createDomainValue(name)
      setOptions(prev => [...prev, created].sort((a, b) => a.localeCompare(b)))
      select(created)
    })
  }

  return (
    <div className="space-y-1.5" ref={containerRef}>
      {label && (
        <Label htmlFor={`combobox-${name}`}>
          {label}
          {required && <span className="text-destructive ml-0.5">*</span>}
        </Label>
      )}

      {/* Hidden field carries the real value to the form */}
      <input type="hidden" name={name} value={selected} />

      <div className="relative">
        <input
          id={`combobox-${name}`}
          type="text"
          autoComplete="off"
          value={query}
          required={required}
          placeholder={initialOptions.length > 0 ? 'Select or type to create…' : 'Type a domain name…'}
          onChange={e => {
            setQuery(e.target.value)
            setSelected(e.target.value) // keep in sync while typing
            setOpen(true)
          }}
          onFocus={() => setOpen(true)}
          className="h-9 w-full rounded-md border border-input bg-transparent px-3 pr-8 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
        />
        {selected && (
          <button
            type="button"
            onClick={clear}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground text-base leading-none"
            tabIndex={-1}
            aria-label="Clear"
          >
            ×
          </button>
        )}

        {/* Dropdown */}
        {open && (filtered.length > 0 || canCreate) && (
          <div className="absolute z-20 mt-1 w-full rounded-md border bg-popover shadow-md max-h-52 overflow-y-auto">
            {filtered.map(opt => (
              <button
                key={opt}
                type="button"
                onPointerDown={e => { e.preventDefault(); select(opt) }}
                className={`w-full text-left px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground transition-colors ${selected === opt ? 'bg-accent/60 font-medium' : ''}`}
              >
                {opt}
              </button>
            ))}
            {canCreate && (
              <button
                type="button"
                onPointerDown={e => { e.preventDefault(); handleCreate() }}
                disabled={isCreating}
                className="w-full text-left px-3 py-2 text-sm text-blue-600 hover:bg-blue-50 transition-colors border-t flex items-center gap-1.5"
              >
                <span className="font-medium">+</span>
                {isCreating ? `Creating "${query.trim()}"…` : `Create "${query.trim()}"`}
              </button>
            )}
          </div>
        )}

        {/* No results, no create (empty query) */}
        {open && filtered.length === 0 && !canCreate && initialOptions.length > 0 && (
          <div className="absolute z-20 mt-1 w-full rounded-md border bg-popover shadow-md px-3 py-2 text-sm text-muted-foreground">
            No matches
          </div>
        )}
      </div>
    </div>
  )
}
