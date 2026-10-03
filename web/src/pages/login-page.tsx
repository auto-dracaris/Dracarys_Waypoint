import { Navigate } from 'react-router-dom'
import { ROLE_HOME } from '@/features/auth/api'
import { LoginForm } from '@/features/auth/components/login-form'
import { useUser } from '@/features/auth/user-context'

export default function LoginPage() {
  const { user } = useUser()
  // Also performs the redirect after a successful login: the role picks the portal.
  const home = user && ROLE_HOME[user.role]
  if (home) return <Navigate to={home} replace />

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-slate-100 p-4">
      <LoginForm />
    </div>
  )
}
