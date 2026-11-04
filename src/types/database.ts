export type UserRole = 'assigner' | 'executor'

export type TaskStatus =
  | 'new'
  | 'in_progress'
  | 'on_review'
  | 'accepted'
  | 'revision'

export type Profile = {
  id: string
  email: string
  full_name: string
  role: UserRole
  created_at: string
}

export type ConstructionObject = {
  id: string
  name: string
  address: string
  created_at: string
  updated_at: string
}

export type Task = {
  id: string
  object_id: string
  title: string
  description: string
  assignee_id: string
  author_id: string
  status: TaskStatus
  created_at: string
}

export type TaskStatusHistory = {
  id: string
  task_id: string
  from_status: TaskStatus | null
  to_status: TaskStatus
  changed_by: string
  comment: string | null
  created_at: string
}

export type TaskWithRelations = Task & {
  assignee?: Profile | null
  author?: Profile | null
  object?: ConstructionObject | null
}
