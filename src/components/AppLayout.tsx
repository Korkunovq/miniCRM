import { Layout, Menu, Button, Typography, theme } from 'antd'
import {
  BuildOutlined,
  LogoutOutlined,
  UnorderedListOutlined,
} from '@ant-design/icons'
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const { Header, Content } = Layout

export function AppLayout() {
  const { profile, signOut } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const { token } = theme.useToken()

  const selectedKey = location.pathname.startsWith('/my-tasks')
    ? 'my-tasks'
    : 'objects'

  const menuItems = [
    {
      key: 'objects',
      icon: <BuildOutlined />,
      label: <Link to="/">Объекты</Link>,
    },
    ...(profile?.role === 'executor'
      ? [
          {
            key: 'my-tasks',
            icon: <UnorderedListOutlined />,
            label: <Link to="/my-tasks">Мои задачи</Link>,
          },
        ]
      : []),
  ]

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 24,
          background: token.colorBgContainer,
          borderBottom: `1px solid ${token.colorBorderSecondary}`,
        }}
      >
        <Typography.Title level={4} style={{ margin: 0, whiteSpace: 'nowrap' }}>
          Мини-CRM
        </Typography.Title>
        <Menu
          mode="horizontal"
          selectedKeys={[selectedKey]}
          items={menuItems}
          style={{ flex: 1, minWidth: 0, border: 'none' }}
        />
        <Typography.Text type="secondary" style={{ whiteSpace: 'nowrap' }}>
          {profile?.full_name} ·{' '}
          {profile?.role === 'assigner' ? 'Постановщик' : 'Исполнитель'}
        </Typography.Text>
        <Button
          icon={<LogoutOutlined />}
          onClick={async () => {
            await signOut()
            navigate('/login')
          }}
        >
          Выйти
        </Button>
      </Header>
      <Content style={{ padding: 24, maxWidth: 1100, margin: '0 auto', width: '100%' }}>
        <Outlet />
      </Content>
    </Layout>
  )
}
