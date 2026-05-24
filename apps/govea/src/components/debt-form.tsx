'use client'

import { useMemo, useState, useTransition } from 'react'
import type { ArchitectureDebtItem, DebtSeverity, DebtStatus, DebtType } from '@/db/schema'
import { detectSecuritySensitive } from '@/lib/debt-classification'
import { cn } from '@/lib/utils'

interface PickerOption {
  id: string
  name: string
}

interface DebtFormProps {
  /** When provided, the form is in edit mode for this item. */
  initial?: ArchitectureDebtItem & {
    applicationIds: string[]
    capabilityIds: string[]
    adrIds: string[]
    initiativeIds: string[]
  }
  applications: PickerOption[]
  capabilities: PickerOption[]
  adrs: PickerOption[]
  initiatives: PickerOption[]
  /** Server action that handles submission. Returns either void (edit) or the
   *  new id (create). */
  action: (formData: FormData) => Promise<unknown>
  /** Where to send the user after a successful create / edit. */
  successHref?: string
  /** Quick-create prefills from the entity-detail page (#381 PR-2). Ignored
   *  when `initial` is provided (edit mode). */
  prefillApplicationIds?: string[]
  prefillCapabilityIds?: string[]
  prefillAdrIds?: string[]
  prefillInitiativeIds?: string[]
}

// Labels rewritten under #133 — the original taxonomy (decision-drift,
// known-shortcut, capability-gap) assumed formal EA vocabulary that the
// Agency EA Coordinator persona (an assumed persona often from IT operations
// or project management, not formal EA practice) could not be expected to
// recognise. Descriptions give the long form so the meaning is plain on hover
// without losing the structured DB slug. Slugs are unchanged.
const DEBT_TYPES: { value: DebtType; label: string; description: string }[] = [
  { value: 'lifecycle-risk', label: 'Lifecycle risk',                description: 'An application is approaching or has passed vendor support end' },
  { value: 'capability-gap', label: 'Unsupported capability',        description: 'A business capability has no application supporting it' },
  { value: 'decision-drift', label: 'Drift from a recorded decision', description: 'An ADR is being superseded by practice without a formal revision' },
  { value: 'known-shortcut', label: 'Deliberate trade-off',          description: 'A technical or architectural compromise was accepted on purpose; record it so it does not get forgotten' },
  { value: 'unreviewed',     label: 'Stale / unreviewed',            description: 'An object has not been updated or reviewed within the configured window' },
]

const SEVERITIES: { value: DebtSeverity; label: string }[] = [
  { value: 'critical', label: 'Critical' },
  { value: 'high',     label: 'High' },
  { value: 'medium',   label: 'Medium' },
  { value: 'low',      label: 'Low' },
]

const STATUSES: { value: DebtStatus; label: string }[] = [
  { value: 'draft',       label: 'Draft' },
  { value: 'published',   label: 'Published' },
  { value: 'in-progress', label: 'In progress' },
  { value: 'resolved',    label: 'Resolved' },
  { value: 'accepted',    label: 'Accepted' },
  { value: 'archived',    label: 'Archived' },
]

export function DebtForm({
  initial, applications, capabilities, adrs, initiatives, action, successHref,
  prefillApplicationIds, prefillCapabilityIds, prefillAdrIds, prefillInitiativeIds,
}: DebtFormProps) {
  const [title, setTitle] = useState(initial?.title ?? '')
  const [description, setDescription] = useState(initial?.description ?? '')
  const [debtType, setDebtType] = useState<DebtType>(initial?.debtType ?? 'lifecycle-risk')
  const [severity, setSeverity] = useState<DebtSeverity>(initial?.severity ?? 'medium')
  const [status, setStatus] = useState<DebtStatus>(initial?.status ?? 'draft')
  const [visibility, setVisibility] = useState<'org' | 'connections' | 'instance'>(initial?.visibility ?? 'org')
  const [targetResolutionDate, setTargetDate] = useState(initial?.targetResolutionDate ?? '')
  const [acceptanceRationale, setAcceptanceRationale] = useState(initial?.acceptanceRationale ?? '')
  const [securitySensitive, setSecuritySensitive] = useState(initial?.securitySensitive ?? false)
  const [overrideSecurity, setOverrideSecurity] = useState(false)
  // Edit mode honors `initial`; create mode honors `prefill*` from the URL.
  const [appIds, setAppIds] = useState<string[]>(initial?.applicationIds ?? prefillApplicationIds ?? [])
  const [capIds, setCapIds] = useState<string[]>(initial?.capabilityIds  ?? prefillCapabilityIds  ?? [])
  const [adrIds, setAdrIds] = useState<string[]>(initial?.adrIds         ?? prefillAdrIds         ?? [])
  const [initIds, setInitIds] = useState<string[]>(initial?.initiativeIds ?? prefillInitiativeIds ?? [])
  const [formError, setFormError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  // Live security-sensitivity detection mirrors what the server will do.
  const autoDetected = useMemo(
    () => detectSecuritySensitive({ debtType, description, acceptanceRationale }),
    [debtType, description, acceptanceRationale],
  )
  const showSecurityPrompt = autoDetected && !securitySensitive
  const totalLinks = appIds.length + capIds.length + adrIds.length + initIds.length

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setFormError(null)

    if (totalLinks === 0) {
      setFormError('Link at least one application, capability, ADR, or initiative.')
      return
    }
    if (status === 'accepted' && !acceptanceRationale.trim()) {
      setFormError('Acceptance rationale is required when status is "Accepted".')
      return
    }

    const fd = new FormData(e.currentTarget)
    // Submit selected ID arrays via the standard FormData multi-value mechanism
    appIds.forEach(id  => fd.append('applicationIds', id))
    capIds.forEach(id  => fd.append('capabilityIds', id))
    adrIds.forEach(id  => fd.append('adrIds', id))
    initIds.forEach(id => fd.append('initiativeIds', id))

    startTransition(async () => {
      try {
        await action(fd)
        if (successHref) window.location.href = successHref
      } catch (err) {
        setFormError(err instanceof Error ? err.message : 'Save failed')
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Title */}
      <div className="space-y-1.5">
        <label htmlFor="title" className="text-sm font-medium">Title</label>
        <input
          id="title" name="title" required
          value={title}
          onChange={e => setTitle(e.target.value)}
          className="w-full rounded-md border bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      </div>

      {/* Description */}
      <div className="space-y-1.5">
        <label htmlFor="description" className="text-sm font-medium">Description</label>
        <textarea
          id="description" name="description"
          value={description}
          onChange={e => setDescription(e.target.value)}
          rows={3}
          className="w-full rounded-md border bg-background px-3 py-2 text-sm resize-none"
        />
      </div>

      {/* Type / Severity / Status */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-1.5">
          <label htmlFor="debtType" className="text-sm font-medium">Type</label>
          <select id="debtType" name="debtType" value={debtType} onChange={e => setDebtType(e.target.value as DebtType)}
            className="w-full rounded-md border bg-background px-3 py-2 text-sm">
            {DEBT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
          <p className="text-xs text-muted-foreground">
            {DEBT_TYPES.find(t => t.value === debtType)?.description}
          </p>
        </div>
        <div className="space-y-1.5">
          <label htmlFor="severity" className="text-sm font-medium">Severity</label>
          <select id="severity" name="severity" value={severity} onChange={e => setSeverity(e.target.value as DebtSeverity)}
            className="w-full rounded-md border bg-background px-3 py-2 text-sm">
            {SEVERITIES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </div>
        <div className="space-y-1.5">
          <label htmlFor="status" className="text-sm font-medium">Status</label>
          <select id="status" name="status" value={status} onChange={e => setStatus(e.target.value as DebtStatus)}
            className="w-full rounded-md border bg-background px-3 py-2 text-sm">
            {STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </div>
      </div>

      {/* Visibility + target date */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label htmlFor="visibility" className="text-sm font-medium">Visibility</label>
          <select id="visibility" name="visibility" value={visibility} onChange={e => setVisibility(e.target.value as 'org' | 'connections' | 'instance')}
            className="w-full rounded-md border bg-background px-3 py-2 text-sm">
            <option value="org">Org (private)</option>
            <option value="connections">Connections</option>
            <option value="instance">Instance-wide</option>
          </select>
          <p className="text-xs text-muted-foreground">Defaults to Org. Cross-org sharing is an explicit opt-in.</p>
        </div>
        <div className="space-y-1.5">
          <label htmlFor="targetResolutionDate" className="text-sm font-medium">Target resolution date <span className="text-muted-foreground font-normal">(optional)</span></label>
          <input
            id="targetResolutionDate" name="targetResolutionDate" type="date"
            value={targetResolutionDate ?? ''}
            onChange={e => setTargetDate(e.target.value)}
            className="w-full rounded-md border bg-background px-3 py-2 text-sm"
          />
        </div>
      </div>

      {/* Acceptance rationale (required when status = accepted) */}
      {(status === 'accepted' || acceptanceRationale) && (
        <div className="space-y-1.5">
          <label htmlFor="acceptanceRationale" className="text-sm font-medium">
            Acceptance rationale {status === 'accepted' && <span className="text-red-600">*</span>}
          </label>
          <textarea
            id="acceptanceRationale" name="acceptanceRationale"
            value={acceptanceRationale}
            onChange={e => setAcceptanceRationale(e.target.value)}
            rows={3}
            className="w-full rounded-md border bg-background px-3 py-2 text-sm resize-none"
          />
          <p className="text-xs text-muted-foreground">
            Required when marking a debt item as Accepted (acknowledged with no plan to resolve).
          </p>
        </div>
      )}

      {/* security_sensitive */}
      <div className={cn('rounded-md border bg-card px-4 py-3 space-y-2', showSecurityPrompt && 'border-amber-300 bg-amber-50 dark:bg-amber-900/20')}>
        <div className="flex items-start gap-3">
          <input
            id="securitySensitive" name="securitySensitive" type="checkbox"
            checked={securitySensitive}
            onChange={e => setSecuritySensitive(e.target.checked)}
            className="mt-1"
          />
          <div className="text-sm">
            <label htmlFor="securitySensitive" className="font-medium">Security-sensitive</label>
            <p className="text-xs text-muted-foreground mt-0.5">
              When checked, this debt item is permanently restricted to Admin and Contributor users — Viewer-role users cannot see it even when published.
            </p>
          </div>
        </div>
        {showSecurityPrompt && (
          <div className="ml-6 space-y-2 text-sm">
            <p className="text-amber-900 dark:text-amber-200 font-medium">
              ⚠ This item contains language commonly associated with security-sensitive content (CVE, vulnerability, exploit, unpatched, advisory).
            </p>
            <p className="text-xs text-amber-800 dark:text-amber-300/80">
              By default the system will mark this as security-sensitive on save. To override, tick the box below — your decision will be recorded in the audit log.
            </p>
            <label className="flex items-center gap-2 text-xs text-amber-900 dark:text-amber-200">
              <input
                name="overrideSecuritySensitive" type="checkbox"
                checked={overrideSecurity}
                onChange={e => setOverrideSecurity(e.target.checked)}
              />
              I have reviewed this content and confirm it should NOT be marked security-sensitive.
            </label>
          </div>
        )}
      </div>

      {/* Linked architecture objects */}
      <div className="space-y-3">
        <div>
          <h3 className="text-sm font-medium">Linked architecture objects</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            At least one link is required. A debt item must be tied to specific applications, capabilities, decisions, or initiatives.
          </p>
        </div>
        <MultiSelect label="Applications" options={applications} selected={appIds} onChange={setAppIds} />
        <MultiSelect label="Capabilities" options={capabilities} selected={capIds} onChange={setCapIds} />
        <MultiSelect label="Decisions (ADRs)" options={adrs} selected={adrIds} onChange={setAdrIds} />
        <MultiSelect label="Initiatives (resolution path)" options={initiatives} selected={initIds} onChange={setInitIds} />
        <p className="text-xs text-muted-foreground">{totalLinks} link{totalLinks === 1 ? '' : 's'} selected</p>
      </div>

      {formError && (
        <p role="alert" className="text-sm text-red-600">{formError}</p>
      )}

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={isPending}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
        >
          {isPending ? 'Saving…' : initial ? 'Save changes' : 'Create debt item'}
        </button>
      </div>
    </form>
  )
}

function MultiSelect({ label, options, selected, onChange }: {
  label: string
  options: PickerOption[]
  selected: string[]
  onChange: (next: string[]) => void
}) {
  if (options.length === 0) return null
  return (
    <details className="rounded-md border bg-card px-4 py-2">
      <summary className="text-sm font-medium cursor-pointer">
        {label} <span className="text-muted-foreground font-normal">({selected.length})</span>
      </summary>
      <div className="mt-2 space-y-1.5 max-h-48 overflow-y-auto">
        {options.map(opt => (
          <label key={opt.id} className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={selected.includes(opt.id)}
              onChange={e => onChange(e.target.checked
                ? [...selected, opt.id]
                : selected.filter(id => id !== opt.id))}
            />
            {opt.name}
          </label>
        ))}
      </div>
    </details>
  )
}
