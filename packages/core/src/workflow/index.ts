// ---------------------------------------------------------------------------
// Workflow / Status State Machine
// Content items move through statuses. The transition map enforces which
// moves are legal. Apps can define custom workflows or use the standard one.
// ---------------------------------------------------------------------------

export type WorkflowStatus = 'draft' | 'published' | 'archived'

export interface WorkflowDefinition {
  name: string
  initialStatus: WorkflowStatus
  transitions: Partial<Record<WorkflowStatus, WorkflowStatus[]>>
}

// Standard workflow used by most content types
export const STANDARD_WORKFLOW: WorkflowDefinition = {
  name: 'standard',
  initialStatus: 'draft',
  transitions: {
    draft:     ['published'],
    published: ['draft', 'archived'],
    archived:  ['draft'],
  },
}

// Immediate-publish workflow — no draft step (e.g. taxonomy terms)
export const IMMEDIATE_WORKFLOW: WorkflowDefinition = {
  name: 'immediate',
  initialStatus: 'published',
  transitions: {
    published: ['archived'],
    archived:  ['published'],
  },
}

const workflows = new Map<string, WorkflowDefinition>([
  [STANDARD_WORKFLOW.name, STANDARD_WORKFLOW],
  [IMMEDIATE_WORKFLOW.name, IMMEDIATE_WORKFLOW],
])

export function registerWorkflow(workflow: WorkflowDefinition): void {
  workflows.set(workflow.name, workflow)
}

export function getWorkflow(name: string): WorkflowDefinition {
  const wf = workflows.get(name)
  if (!wf) throw new Error(`Workflow "${name}" is not registered.`)
  return wf
}

export function canTransition(
  workflow: WorkflowDefinition,
  from: WorkflowStatus,
  to: WorkflowStatus
): boolean {
  const allowed = workflow.transitions[from] ?? []
  return allowed.includes(to)
}

export function getAvailableTransitions(
  workflow: WorkflowDefinition,
  current: WorkflowStatus
): WorkflowStatus[] {
  return workflow.transitions[current] ?? []
}

// Human-readable labels for statuses
export const STATUS_LABELS: Record<WorkflowStatus, string> = {
  draft:     'Draft',
  published: 'Published',
  archived:  'Archived',
}

export const STATUS_COLORS: Record<WorkflowStatus, string> = {
  draft:     'bg-yellow-100 text-yellow-800',
  published: 'bg-green-100 text-green-800',
  archived:  'bg-gray-100 text-gray-600',
}
