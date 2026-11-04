import { useCallback, useEffect, useState } from 'react'
import {
  Breadcrumb,
  Button,
  Descriptions,
  Form,
  Input,
  Modal,
  Select,
  Space,
  Table,
  Typography,
  message,
} from 'antd'
import { Link, useParams } from 'react-router-dom'
import dayjs from 'dayjs'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { TaskActions } from '../components/TaskActions'
import { TaskStatusTag } from '../components/TaskStatusTag'
import { TASK_STATUS_LABELS } from '../lib/taskStatus'
import type {
  ConstructionObject,
  Profile,
  Task,
  TaskStatusHistory,
  TaskWithRelations,
} from '../types/database'

export function TaskDetailPage() {
  const { taskId } = useParams<{ taskId: string }>()
  const { profile } = useAuth()
  const [task, setTask] = useState<TaskWithRelations | null>(null)
  const [history, setHistory] = useState<
    (TaskStatusHistory & { changer?: Profile | null })[]
  >([])
  const [executors, setExecutors] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [editOpen, setEditOpen] = useState(false)
  const [saving, setSaving] = useState(false)

  const isAssigner = profile?.role === 'assigner'

  const load = useCallback(async () => {
    if (!taskId) return
    setLoading(true)
    const taskRes = await supabase
      .from('tasks')
      .select(
        `
        *,
        assignee:profiles!assignee_id(*),
        author:profiles!author_id(*),
        object:construction_objects(*)
      `,
      )
      .eq('id', taskId)
      .maybeSingle()

    if (taskRes.error) {
      message.error(taskRes.error.message)
      setLoading(false)
      return
    }
    setTask(taskRes.data as TaskWithRelations)

    const histRes = await supabase
      .from('task_status_history')
      .select('*')
      .eq('task_id', taskId)
      .order('created_at', { ascending: true })

    if (histRes.error) message.error(histRes.error.message)
    else {
      const rows = (histRes.data ?? []) as TaskStatusHistory[]
      const ids = [...new Set(rows.map((r) => r.changed_by))]
      const { data: profs } = await supabase.from('profiles').select('*').in('id', ids)
      const map = new Map((profs ?? []).map((p) => [p.id, p as Profile]))
      setHistory(rows.map((r) => ({ ...r, changer: map.get(r.changed_by) ?? null })))
    }
    setLoading(false)
  }, [taskId])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    if (!isAssigner) return
    void supabase
      .from('profiles')
      .select('*')
      .eq('role', 'executor')
      .order('full_name')
      .then(({ data }) => setExecutors((data ?? []) as Profile[]))
  }, [isAssigner])

  if (!taskId || !profile) return null

  const object = task?.object as ConstructionObject | null | undefined

  return (
    <>
      <Breadcrumb
        style={{ marginBottom: 16 }}
        items={[
          { title: <Link to="/">Объекты</Link> },
          object
            ? { title: <Link to={`/objects/${object.id}`}>{object.name}</Link> }
            : { title: 'Объект' },
          { title: task?.title ?? 'Задача' },
        ]}
      />
      <Space style={{ width: '100%', justifyContent: 'space-between', marginBottom: 16 }}>
        <Typography.Title level={3} style={{ margin: 0 }}>
          {task?.title ?? 'Задача'}
        </Typography.Title>
        {isAssigner && task && (
          <Space>
            <Button onClick={() => setEditOpen(true)}>Редактировать</Button>
            <Button
              danger
              onClick={() => {
                Modal.confirm({
                  title: 'Удалить задачу?',
                  okText: 'Удалить',
                  okButtonProps: { danger: true },
                  cancelText: 'Отмена',
                  onOk: async () => {
                    const { error } = await supabase.from('tasks').delete().eq('id', task.id)
                    if (error) message.error(error.message)
                    else {
                      message.success('Удалено')
                      window.location.href = object ? `/objects/${object.id}` : '/'
                    }
                  },
                })
              }}
            >
              Удалить
            </Button>
          </Space>
        )}
      </Space>
      {task && (
        <>
          <Descriptions bordered column={1} size="small" style={{ marginBottom: 24 }}>
            <Descriptions.Item label="Статус">
              <TaskStatusTag status={task.status} />
            </Descriptions.Item>
            <Descriptions.Item label="Объект">
              {object ? (
                <Link to={`/objects/${object.id}`}>{object.name}</Link>
              ) : (
                '—'
              )}
            </Descriptions.Item>
            <Descriptions.Item label="Исполнитель">
              {task.assignee?.full_name ?? '—'}
            </Descriptions.Item>
            <Descriptions.Item label="Автор">
              {task.author?.full_name ?? '—'}
            </Descriptions.Item>
            <Descriptions.Item label="Создана">
              {dayjs(task.created_at).format('DD.MM.YYYY HH:mm')}
            </Descriptions.Item>
            <Descriptions.Item label="Описание">
              {task.description || '—'}
            </Descriptions.Item>
          </Descriptions>
          <Typography.Title level={5}>Действия</Typography.Title>
          <div style={{ marginBottom: 24 }}>
            <TaskActions
              task={task as Task}
              role={profile.role}
              userId={profile.id}
              onChanged={() => void load()}
            />
          </div>
          <Typography.Title level={5}>История статусов</Typography.Title>
          <Table
            rowKey="id"
            loading={loading}
            dataSource={history}
            pagination={false}
            columns={[
              {
                title: 'Когда',
                dataIndex: 'created_at',
                render: (v: string) => dayjs(v).format('DD.MM.YYYY HH:mm'),
              },
              {
                title: 'Кто',
                render: (_: unknown, row) => row.changer?.full_name ?? row.changed_by,
              },
              {
                title: 'Переход',
                render: (_: unknown, row) =>
                  `${row.from_status ? TASK_STATUS_LABELS[row.from_status] : '—'} → ${TASK_STATUS_LABELS[row.to_status]}`,
              },
              {
                title: 'Комментарий',
                dataIndex: 'comment',
                render: (c: string | null) => c ?? '—',
              },
            ]}
          />
        </>
      )}
      <Modal
        title="Редактировать задачу"
        open={editOpen}
        footer={null}
        destroyOnHidden
        onCancel={() => setEditOpen(false)}
      >
        {task && (
          <Form
            layout="vertical"
            initialValues={{
              title: task.title,
              description: task.description,
              assignee_id: task.assignee_id,
            }}
            onFinish={async (values: {
              title: string
              description: string
              assignee_id: string
            }) => {
              setSaving(true)
              try {
                const { error } = await supabase
                  .from('tasks')
                  .update({
                    title: values.title,
                    description: values.description,
                    assignee_id: values.assignee_id,
                  })
                  .eq('id', task.id)
                if (error) throw error
                message.success('Сохранено')
                setEditOpen(false)
                void load()
              } catch (e) {
                message.error(e instanceof Error ? e.message : 'Ошибка')
              } finally {
                setSaving(false)
              }
            }}
          >
            <Form.Item label="Название" name="title" rules={[{ required: true }]}>
              <Input />
            </Form.Item>
            <Form.Item label="Описание" name="description">
              <Input.TextArea rows={3} />
            </Form.Item>
            <Form.Item label="Исполнитель" name="assignee_id" rules={[{ required: true }]}>
              <Select
                options={executors.map((e) => ({ value: e.id, label: e.full_name }))}
              />
            </Form.Item>
            <Button type="primary" htmlType="submit" loading={saving} block>
              Сохранить
            </Button>
          </Form>
        )}
      </Modal>
    </>
  )
}
