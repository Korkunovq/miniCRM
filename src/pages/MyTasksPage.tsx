import { useCallback, useEffect, useState } from 'react'
import { Table, Typography, message } from 'antd'
import { Link } from 'react-router-dom'
import dayjs from 'dayjs'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { TaskStatusTag } from '../components/TaskStatusTag'
import type { ConstructionObject, Task } from '../types/database'

type Row = Task & { object?: ConstructionObject | null }

export function MyTasksPage() {
  const { profile } = useAuth()
  const [tasks, setTasks] = useState<Row[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!profile) return
    setLoading(true)
    const { data, error } = await supabase
      .from('tasks')
      .select('*, object:construction_objects(*)')
      .eq('assignee_id', profile.id)
      .order('created_at', { ascending: false })
    if (error) message.error(error.message)
    else setTasks((data ?? []) as Row[])
    setLoading(false)
  }, [profile])

  useEffect(() => {
    void load()
  }, [load])

  return (
    <>
      <Typography.Title level={3}>Мои задачи</Typography.Title>
      <Table
        rowKey="id"
        loading={loading}
        dataSource={tasks}
        columns={[
          {
            title: 'Задача',
            dataIndex: 'title',
            render: (title: string, row: Row) => (
              <Link to={`/tasks/${row.id}`}>{title}</Link>
            ),
          },
          {
            title: 'Объект',
            render: (_: unknown, row: Row) =>
              row.object ? (
                <Link to={`/objects/${row.object.id}`}>{row.object.name}</Link>
              ) : (
                '—'
              ),
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
    </>
  )
}
