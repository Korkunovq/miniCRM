import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { ConfigProvider } from 'antd'
import ruRU from 'antd/locale/ru_RU'
import { AuthProvider } from './context/AuthContext'
import { AppLayout } from './components/AppLayout'
import { ProtectedRoute } from './components/ProtectedRoute'
import { LoginPage } from './pages/LoginPage'
import { ObjectsListPage } from './pages/ObjectsListPage'
import { ObjectDetailPage } from './pages/ObjectDetailPage'
import { TaskDetailPage } from './pages/TaskDetailPage'
import { MyTasksPage } from './pages/MyTasksPage'

export default function App() {
  return (
    <ConfigProvider locale={ruRU}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route element={<ProtectedRoute />}>
              <Route element={<AppLayout />}>
                <Route index element={<ObjectsListPage />} />
                <Route path="objects/:objectId" element={<ObjectDetailPage />} />
                <Route path="tasks/:taskId" element={<TaskDetailPage />} />
                <Route path="my-tasks" element={<MyTasksPage />} />
              </Route>
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ConfigProvider>
  )
}
