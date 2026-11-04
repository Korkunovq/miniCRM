import { useState } from 'react'
import { Button, Input, Modal, Space, message } from 'antd'
import { supabase } from '../lib/supabase'
import { getAvailableActions } from '../lib/taskStatus'
import type { Task, TaskStatus } from '../types/database'
import type { UserRole } from '../types/database'

type Props = {
  task: Task
  role: UserRole
  userId: string
  onChanged: () => void
}

export function TaskActions({ task, role, userId, onChanged }: Props) {
  const [loading, setLoading] = useState(false)
  const [commentOpen, setCommentOpen] = useState(false)
  const [pendingStatus, setPendingStatus] = useState<TaskStatus | null>(null)
  const [comment, setComment] = useState('')

  const isAssignee = task.assignee_id === userId
  const actions = getAvailableActions(task.status, role, isAssignee)

  const runTransition = async (newStatus: TaskStatus, transitionComment?: string) => {
    setLoading(true)
    try {
      const { error } = await supabase.rpc('transition_task_status', {
        p_task_id: task.id,
        p_new_status: newStatus,
        p_comment: transitionComment ?? null,
      })
      if (error) throw error
      message.success('Статус обновлён')
      onChanged()
    } catch (e) {
      message.error(e instanceof Error ? e.message : 'Не удалось сменить статус')
    } finally {
      setLoading(false)
      setCommentOpen(false)
      setComment('')
      setPendingStatus(null)
    }
  }

  if (actions.length === 0) return null

  return (
    <>
      <Space wrap>
        {actions.map((action) => (
          <Button
            key={action.key}
            type="primary"
            loading={loading}
            onClick={() => {
              if (action.requiresComment) {
                setPendingStatus(action.targetStatus)
                setCommentOpen(true)
              } else {
                void runTransition(action.targetStatus)
              }
            }}
          >
            {action.label}
          </Button>
        ))}
      </Space>
      <Modal
        title="Комментарий к доработке"
        open={commentOpen}
        okText="Вернуть на доработку"
        cancelText="Отмена"
        confirmLoading={loading}
        onCancel={() => {
          setCommentOpen(false)
          setComment('')
          setPendingStatus(null)
        }}
        onOk={() => {
          if (!comment.trim()) {
            message.warning('Укажите комментарий')
            return
          }
          if (pendingStatus) void runTransition(pendingStatus, comment.trim())
        }}
      >
        <Input.TextArea
          rows={4}
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Что нужно исправить"
        />
      </Modal>
    </>
  )
}
