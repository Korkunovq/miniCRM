import { useCallback, useEffect, useState } from 'react'
import {
  Button,
  Form,
  Input,
  Modal,
  Space,
  Table,
  Typography,
  message,
} from 'antd'
import { PlusOutlined } from '@ant-design/icons'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import type { ConstructionObject } from '../types/database'

export function ObjectsListPage() {
  const { profile } = useAuth()
  const [objects, setObjects] = useState<ConstructionObject[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editing, setEditing] = useState<ConstructionObject | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('construction_objects')
      .select('*')
      .order('name')
    if (error) message.error(error.message)
    else setObjects((data ?? []) as ConstructionObject[])
    setLoading(false)
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const isAssigner = profile?.role === 'assigner'

  return (
    <>
      <Space style={{ width: '100%', justifyContent: 'space-between', marginBottom: 16 }}>
        <Typography.Title level={3} style={{ margin: 0 }}>
          Объекты
        </Typography.Title>
        {isAssigner && (
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => {
              setEditing(null)
              setModalOpen(true)
            }}
          >
            Добавить объект
          </Button>
        )}
      </Space>
      <Table
        rowKey="id"
        loading={loading}
        dataSource={objects}
        pagination={false}
        columns={[
          {
            title: 'Название',
            dataIndex: 'name',
            render: (name: string, row: ConstructionObject) => (
              <Link to={`/objects/${row.id}`}>{name}</Link>
            ),
          },
          { title: 'Адрес', dataIndex: 'address' },
          ...(isAssigner
            ? [
                {
                  title: '',
                  key: 'actions',
                  render: (_: unknown, row: ConstructionObject) => (
                    <Space>
                      <Button
                        size="small"
                        onClick={() => {
                          setEditing(row)
                          setModalOpen(true)
                        }}
                      >
                        Изменить
                      </Button>
                      <Button
                        size="small"
                        danger
                        onClick={() => {
                          Modal.confirm({
                            title: 'Удалить объект?',
                            content: 'Будут удалены и все задачи по объекту.',
                            okText: 'Удалить',
                            okButtonProps: { danger: true },
                            cancelText: 'Отмена',
                            onOk: async () => {
                              const { error } = await supabase
                                .from('construction_objects')
                                .delete()
                                .eq('id', row.id)
                              if (error) message.error(error.message)
                              else {
                                message.success('Объект удалён')
                                void load()
                              }
                            },
                          })
                        }}
                      >
                        Удалить
                      </Button>
                    </Space>
                  ),
                },
              ]
            : []),
        ]}
      />
      <Modal
        title={editing ? 'Редактировать объект' : 'Новый объект'}
        open={modalOpen}
        footer={null}
        destroyOnHidden
        onCancel={() => setModalOpen(false)}
      >
        <Form
          layout="vertical"
          initialValues={editing ?? { name: '', address: '' }}
          key={editing?.id ?? 'new'}
          onFinish={async (values: { name: string; address: string }) => {
            setSaving(true)
            try {
              if (editing) {
                const { error } = await supabase
                  .from('construction_objects')
                  .update({
                    name: values.name,
                    address: values.address,
                    updated_at: new Date().toISOString(),
                  })
                  .eq('id', editing.id)
                if (error) throw error
                message.success('Сохранено')
              } else {
                const { error } = await supabase.from('construction_objects').insert(values)
                if (error) throw error
                message.success('Объект создан')
              }
              setModalOpen(false)
              void load()
            } catch (e) {
              message.error(e instanceof Error ? e.message : 'Ошибка сохранения')
            } finally {
              setSaving(false)
            }
          }}
        >
          <Form.Item label="Название" name="name" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item label="Адрес" name="address" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Button type="primary" htmlType="submit" loading={saving} block>
            Сохранить
          </Button>
        </Form>
      </Modal>
    </>
  )
}
