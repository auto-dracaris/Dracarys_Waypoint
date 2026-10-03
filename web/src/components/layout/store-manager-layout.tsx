import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { useUser } from '@/features/auth/user-context'
import { Sidebar } from '@/components/layout/store-manager-sidebar' // Path based on your structure

export function StoreManagerLayout() {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, logout } = useUser()

  const getActiveNavId = () => {
    if (location.pathname.includes('/deliveries')) return 'deliveries'
    if (location.pathname.includes('/orders')) return 'orders'
    return 'overview'
  }

  const navConfig = [
    { id: 'overview', label: 'Overview', iconName: 'home' as const, path: '/store-manager' },
    {
      id: 'orders',
      label: 'Orders',
      iconName: 'orders' as const,
      path: '/store-manager/orders',
    },
    {
      id: 'deliveries',
      label: 'Deliveries',
      iconName: 'deliveries' as const,
      path: '/store-manager/deliveries',
    },
  ]

  // RequireRole only renders this layout for a signed-in store manager.
  if (!user) return null

  return (
    <div className="w-full min-h-screen bg-stone-50 flex justify-start items-start">
      {/* Fixed Sidebar */}
      <Sidebar
        outletName="Fresh · Ja-Ela"
        activeNavId={getActiveNavId()}
        navItems={navConfig}
        user={{
          name: `${user.firstName} ${user.lastName}`,
          initials: `${user.firstName[0] ?? ''}${user.lastName[0] ?? ''}`.toUpperCase(),
          // store_manager -> Store Manager
          role: user.role.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
          status: 'Signed in',
        }}
        onNavSelect={(id) => {
          const target = navConfig.find((n) => n.id === id)
          if (target) navigate(target.path)
        }}
        onLogout={logout}
      />

      {/* Dynamic Page Content */}
      <div className="flex-1 overflow-y-auto h-screen">
        <Outlet />
      </div>
    </div>
  )
}
