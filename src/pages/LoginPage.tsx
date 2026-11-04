import { useEffect, useState } from 'react'
import { Button, Card, Form, Input, Typography, message } from 'antd'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export function LoginPage() {
  const { signIn, session } = useAuth()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (session) navigate('/', { replace: true })
  }, [session, navigate])

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
      }}
    >
      <Card style={{ width: '100%', maxWidth: 400 }}>
        <Typography.Title level={3} style={{ marginTop: 0 }}>
          Вход
        </Typography.Title>
        <Typography.Paragraph type="secondary">
          Регистрация отключена. Используйте учётную запись, созданную администратором.
        </Typography.Paragraph>
        <Form
          layout="vertical"
          onFinish={async (values: { email: string; password: string }) => {
            setLoading(true)
            try {
              await signIn(values.email, values.password)
              navigate('/', { replace: true })
            } catch {
              message.error('Неверный email или пароль')
            } finally {
              setLoading(false)
            }
          }}
        >
          <Form.Item
            label="Email"
            name="email"
            rules={[{ required: true, type: 'email' }]}
          >
            <Input autoComplete="email" />
          </Form.Item>
          <Form.Item
            label="Пароль"
            name="password"
            rules={[{ required: true }]}
          >
            <Input.Password autoComplete="current-password" />
          </Form.Item>
          <Button type="primary" htmlType="submit" block loading={loading}>
            Войти
          </Button>
        </Form>
      </Card>
    </div>
  )
}
