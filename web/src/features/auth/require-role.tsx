import { Navigate, Outlet } from 'react-router-dom'
import { ROLE_HOME, type User } from './api'
import { useUser } from './user-context'

// A UX guard only; the API's own role guard is what actually protects the data.
export function RequireRole({ role }: { role: User['role'] }) {
  const { user } = useUser()
  if (!user) return <Navigate to="/login" replace />
  if (user.role !== role) return <Navigate to={ROLE_HOME[user.role] ?? '/login'} replace />
  return <Outlet />
}
