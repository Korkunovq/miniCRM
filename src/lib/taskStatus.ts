import type { TaskStatus, UserRole } from '../types/database'

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  new: 'Новая',
  in_progress: 'В работе',
  on_review: 'На проверке',
  accepted: 'Принята',
  revision: 'На доработке',
}

export const TASK_STATUS_COLORS: Record<TaskStatus, string> = {
  new: 'default',
  in_progress: 'processing',
  on_review: 'warning',
  accepted: 'success',
  revision: 'error',
}

export type TransitionAction = {
  key: string
  label: string
  targetStatus: TaskStatus
  requiresComment?: boolean
}

export function getAvailableActions(
  status: TaskStatus,
  role: UserRole,
  isAssignee: boolean,
): TransitionAction[] {
  const actions: TransitionAction[] = []

  if (status === 'new' && isAssignee) {
    actions.push({
      key: 'start',
      label: 'Взять в работу',
      targetStatus: 'in_progress',
    })
  }
  if (status === 'in_progress' && isAssignee) {
    actions.push({
      key: 'review',
      label: 'Отправить на проверку',
      targetStatus: 'on_review',
    })
  }
  if (status === 'on_review' && role === 'assigner') {
    actions.push(
      {
        key: 'accept',
        label: 'Принять',
        targetStatus: 'accepted',
      },
      {
        key: 'revision',
        label: 'Вернуть на доработку',
        targetStatus: 'revision',
        requiresComment: true,
      },
    )
  }
  if (status === 'revision' && isAssignee) {
    actions.push({
      key: 'resume',
      label: 'Снова в работу',
      targetStatus: 'in_progress',
    })
  }

  return actions
}
