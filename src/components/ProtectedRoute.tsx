import { Navigate, Outlet } from 'react-router-dom'
import { Spin } from 'antd'
import { useAuth } from '../context/AuthContext'

export function ProtectedRoute() {
  const { session, profile, loading } = useAuth()

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}>
        <Spin size="large" />
      </div>
    )
  }

  if (!session) {
    return <Navigate to="/login" replace />
  }

  if (!profile) {
    return (
      <div style={{ maxWidth: 480, margin: '48px auto', padding: 24 }}>
        <p>
          Вход выполнен, но профиль не найден. Администратор должен добавить запись в
          таблицу <code>profiles</code> с вашим id и ролью.
        </p>
      </div>
    )
  }

  return <Outlet />
}
