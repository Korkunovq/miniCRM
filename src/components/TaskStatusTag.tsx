import { Tag } from 'antd'
import type { TaskStatus } from '../types/database'
import { TASK_STATUS_COLORS, TASK_STATUS_LABELS } from '../lib/taskStatus'

export function TaskStatusTag({ status }: { status: TaskStatus }) {
  return (
    <Tag color={TASK_STATUS_COLORS[status]}>{TASK_STATUS_LABELS[status]}</Tag>
  )
}
