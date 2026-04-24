'use client'

import { useRef, useState } from 'react'
import { Bold, Code, Heading2, Italic, Link2, List, ListOrdered, SquareCode } from 'lucide-react'
import { MarkdownContent } from '@/components/markdown-content'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

type Transform = (value: string, start: number, end: number) => { value: string; start: number; end: number }

function wrapWith(prefix: string, suffix: string, placeholder = 'text'): Transform {
  return (value, s, e) => {
    const sel = value.slice(s, e) || placeholder
    const newValue = value.slice(0, s) + prefix + sel + suffix + value.slice(e)
    return { value: newValue, start: s + prefix.length, end: s + prefix.length + sel.length }
  }
}

function prependLine(prefix: string): Transform {
  return (value, s, e) => {
    const lineStart = value.lastIndexOf('\n', s - 1) + 1
    const newValue = value.slice(0, lineStart) + prefix + value.slice(lineStart)
    return { value: newValue, start: s + prefix.length, end: e + prefix.length }
  }
}

function insertLink(): Transform {
  return (value, s, e) => {
    const sel = value.slice(s, e)
    const text = sel || 'link text'
    const inserted = `[${text}](url)`
    const newValue = value.slice(0, s) + inserted + value.slice(e)
    const urlStart = s + text.length + 3
    return { value: newValue, start: urlStart, end: urlStart + 3 }
  }
}

const TOOLBAR = [
  { title: 'Bold', Icon: Bold, transform: wrapWith('**', '**', 'bold') },
  { title: 'Italic', Icon: Italic, transform: wrapWith('_', '_', 'italic') },
  { title: 'Heading', Icon: Heading2, transform: prependLine('## ') },
  { title: 'Bullet list', Icon: List, transform: prependLine('- ') },
  { title: 'Numbered list', Icon: ListOrdered, transform: prependLine('1. ') },
  { title: 'Link', Icon: Link2, transform: insertLink() },
  { title: 'Inline code', Icon: Code, transform: wrapWith('`', '`', 'code') },
  { title: 'Code block', Icon: SquareCode, transform: wrapWith('```\n', '\n```', 'code') },
]

interface MarkdownEditorProps {
  name: string
  defaultValue?: string
  value?: string
  onChange?: (value: string) => void
  placeholder?: string
  rows?: number
  label?: string
  id?: string
  required?: boolean
}

export function MarkdownEditor({
  name, defaultValue = '', value: valueProp, onChange, placeholder, rows = 3, label, id, required,
}: MarkdownEditorProps) {
  const isControlled = valueProp !== undefined
  const [internalValue, setInternalValue] = useState(defaultValue)
  const [mode, setMode] = useState<'edit' | 'preview'>('edit')
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const editorId = id ?? `md-editor-${name}`
  const value = isControlled ? valueProp! : internalValue

  function handleChange(v: string) {
    if (!isControlled) setInternalValue(v)
    onChange?.(v)
  }

  function applyTransform(transform: Transform) {
    const ta = textareaRef.current
    if (!ta) return
    const result = transform(ta.value, ta.selectionStart, ta.selectionEnd)
    handleChange(result.value)
    requestAnimationFrame(() => {
      ta.focus()
      ta.setSelectionRange(result.start, result.end)
    })
  }

  return (
    <div className="space-y-1.5">
      {label && <Label htmlFor={editorId}>{label}</Label>}
      <div className="rounded-md border border-input shadow-sm overflow-hidden">
        <div className="flex items-center gap-0.5 border-b border-input bg-muted/40 px-1.5 py-1">
          {TOOLBAR.map(({ title, Icon, transform }) => (
            <button
              key={title}
              type="button"
              title={title}
              disabled={mode === 'preview'}
              onMouseDown={e => {
                e.preventDefault()
                if (mode === 'edit') applyTransform(transform)
              }}
              className="rounded p-1 text-muted-foreground hover:bg-accent hover:text-accent-foreground disabled:opacity-30"
            >
              <Icon size={13} />
            </button>
          ))}
          <div className="ml-auto flex items-center rounded border border-input bg-background text-xs overflow-hidden">
            <button
              type="button"
              onClick={() => setMode('edit')}
              className={cn(
                'px-2.5 py-0.5 transition-colors',
                mode === 'edit' ? 'bg-primary text-primary-foreground font-medium' : 'text-muted-foreground hover:text-foreground',
              )}
            >
              Edit
            </button>
            <button
              type="button"
              onClick={() => setMode('preview')}
              className={cn(
                'px-2.5 py-0.5 transition-colors',
                mode === 'preview' ? 'bg-primary text-primary-foreground font-medium' : 'text-muted-foreground hover:text-foreground',
              )}
            >
              Preview
            </button>
          </div>
        </div>

        {/* Hidden input always carries the value for form submission */}
        <input type="hidden" name={name} value={value} required={required} />

        {mode === 'preview' ? (
          <div className="px-3 py-2 min-h-[60px]">
            {value.trim() ? (
              <MarkdownContent>{value}</MarkdownContent>
            ) : (
              <p className="text-sm text-muted-foreground italic">Nothing to preview</p>
            )}
          </div>
        ) : (
          <textarea
            ref={textareaRef}
            id={editorId}
            rows={rows}
            placeholder={placeholder}
            value={value}
            onChange={e => handleChange(e.target.value)}
            className="w-full px-3 py-2 text-sm bg-transparent focus:outline-none resize-none"
          />
        )}
      </div>
    </div>
  )
}
