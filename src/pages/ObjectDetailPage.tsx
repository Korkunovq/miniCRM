import { useCallback, useEffect, useState } from 'react'
import {
  Breadcrumb,
  Button,
  Form,
  Input,
  Modal,
  Select,
  Space,
  Table,
  Typography,
  message,
} from 'antd'
import { PlusOutlined } from '@ant-design/icons'
import { Link, useParams } from 'react-router-dom'
import dayjs from 'dayjs'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { TaskStatusTag } from '../components/TaskStatusTag'
import type { ConstructionObject, Profile, Task } from '../types/database'

type TaskRow = Task & { assignee?: Profile | null }

export function ObjectDetailPage() {
  const { objectId } = useParams<{ objectId: string }>()
  const { profile } = useAuth()
  const [object, setObject] = useState<ConstructionObject | null>(null)
  const [tasks, setTasks] = useState<TaskRow[]>([])
  const [executors, setExecutors] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [taskModal, setTaskModal] = useState(false)
  const [saving, setSaving] = useState(false)

  const isAssigner = profile?.role === 'assigner'

  const load = useCallback(async () => {
    if (!objectId) return
    setLoading(true)
    const [objRes, tasksRes] = await Promise.all([
      supabase.from('construction_objects').select('*').eq('id', objectId).maybeSingle(),
      supabase
        .from('tasks')
        .select('*, assignee:profiles!assignee_id(*)')
        .eq('object_id', objectId)
        .order('created_at', { ascending: false }),
    ])
    if (objRes.error) message.error(objRes.error.message)
    else setObject(objRes.data as ConstructionObject | null)
    if (tasksRes.error) message.error(tasksRes.error.message)
    else setTasks((tasksRes.data ?? []) as TaskRow[])
    setLoading(false)
  }, [objectId])

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
      .then(({ data, error }) => {
        if (error) message.error(error.message)
        else setExecutors((data ?? []) as Profile[])
      })
  }, [isAssigner])

  if (!objectId) return null

  return (
    <>
      <Breadcrumb
        style={{ marginBottom: 16 }}
        items={[
          { title: <Link to="/">Объекты</Link> },
          { title: object?.name ?? '…' },
        ]}
      />
      <Typography.Title level={3}>{object?.name ?? 'Объект'}</Typography.Title>
      {object && (
        <Typography.Paragraph type="secondary">{object.address}</Typography.Paragraph>
      )}
      <Space style={{ width: '100%', justifyContent: 'space-between', marginBottom: 16 }}>
        <Typography.Title level={5} style={{ margin: 0 }}>
          Задачи
        </Typography.Title>
        {isAssigner && (
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setTaskModal(true)}>
            Новая задача
          </Button>
        )}
      </Space>
      <Table
        rowKey="id"
        loading={loading}
        dataSource={tasks}
        pagination={false}
        columns={[
          {
            title: 'Название',
            dataIndex: 'title',
            render: (title: string, row: TaskRow) => (
              <Link to={`/tasks/${row.id}`}>{title}</Link>
            ),
          },
          {
            title: 'Исполнитель',
            render: (_: unknown, row: TaskRow) => row.assignee?.full_name ?? '—',
          },
          {
            title: 'Статус',
            dataIndex: 'status',
            render: (status: Task['status']) => <TaskStatusTag status={status} />,
          },
          {
            title: 'Создана',
            dataIndex: 'created_at',
            render: (v: string) => dayjs(v).format('DD.MM.YYYY HH:mm'),
          },
        ]}
      />
      <Modal
        title="Новая задача"
        open={taskModal}
        footer={null}
        destroyOnHidden
        onCancel={() => setTaskModal(false)}
      >
        <Form
          layout="vertical"
          onFinish={async (values: {
            title: string
            description: string
            assignee_id: string
          }) => {
            if (!profile || !objectId) return
            setSaving(true)
            try {
              const { error } = await supabase.from('tasks').insert({
                object_id: objectId,
                title: values.title,
                description: values.description ?? '',
                assignee_id: values.assignee_id,
                author_id: profile.id,
                status: 'new',
              })
              if (error) throw error
              message.success('Задача создана')
              setTaskModal(false)
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
          <Form.Item
            label="Исполнитель"
            name="assignee_id"
            rules={[{ required: true, message: 'Выберите исполнителя' }]}
          >
            <Select
              options={executors.map((e) => ({
                value: e.id,
                label: e.full_name,
              }))}
              placeholder="Исполнитель"
            />
          </Form.Item>
          <Button type="primary" htmlType="submit" loading={saving} block>
            Создать
          </Button>
        </Form>
      </Modal>
    </>
  )
}
