// State machine: draft → published → archived
export type WorkflowStatus = 'draft' | 'published' | 'archived'

const TRANSITIONS: Record<WorkflowStatus, WorkflowStatus[]> = {
  draft: ['published'],
  published: ['draft', 'archived'],
  archived: [],
}

export function canTransition(from: WorkflowStatus, to: WorkflowStatus): boolean {
  return TRANSITIONS[from].includes(to)
}

export function allowedTransitions(from: WorkflowStatus): WorkflowStatus[] {
  return TRANSITIONS[from]
}
