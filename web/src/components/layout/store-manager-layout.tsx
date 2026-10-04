import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { useUser } from '@/features/auth/user-context'
import { fetchPlacementOptions } from '@/features/store-manager/api'
import { outletLabel } from '@/features/store-manager/order-format'
import MenuRounded from '@mui/icons-material/MenuRounded'
import { Sidebar } from '@/components/layout/sidebar'
import { loadSidebarCollapsed, saveSidebarCollapsed } from '@/lib/sidebar-preferences'
import '@/styles/store-manager/layout.css'

export function StoreManagerLayout() {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, accessToken, logout } = useUser()
  const [navigationOpen, setNavigationOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(loadSidebarCollapsed)
  useEffect(() => {
    saveSidebarCollapsed(sidebarCollapsed)
  }, [sidebarCollapsed])
  // The outlet this store manager orders for; the request fails while none is linked.
  const [outletName, setOutletName] = useState('')
  useEffect(() => {
    if (!accessToken) return
    let stale = false
    fetchPlacementOptions(accessToken).then(
      (options) => {
        if (!stale) setOutletName(outletLabel(options.outlet))
      },
      () => {
        if (!stale) setOutletName('No outlet assigned')
      },
    )
    return () => {
      stale = true
    }
  }, [accessToken])

  const activePage = location.pathname.includes('/delivery/') || location.pathname.includes('/deliveries')
    ? 'Deliveries'
    : location.pathname.includes('/orders') ? 'Orders'
      : location.pathname.includes('/profile') ? 'Profile' : 'Overview'
  const routes: Record<string, string> = {
    Overview: '/store-manager',
    Orders: '/store-manager/orders',
    Deliveries: '/store-manager/deliveries',
    Profile: '/store-manager/profile',
  }

  // RequireRole only renders this layout for a signed-in store manager.
  if (!user) return null

  return (
    <div className={`store-manager-shell ${location.pathname === '/store-manager/profile' ? 'store-profile-shell' : ''}`}>
      <Sidebar
        role="Store Manager"
        hubLabel={outletName || 'Store Manager'}
        open={navigationOpen}
        collapsed={sidebarCollapsed}
        onToggleCollapsed={() => setSidebarCollapsed((previous) => !previous)}
        onClose={() => setNavigationOpen(false)}
        activePage={activePage}
        profile={{
          name: `${user.firstName} ${user.lastName}`,
          initials: `${user.firstName[0] ?? ''}${user.lastName[0] ?? ''}`.toUpperCase(),
          status: 'Signed in',
        }}
        onNavigate={(page) => {
          if (page === 'Log out') logout()
          else if (routes[page]) navigate(routes[page])
        }}
      />

      <div className="store-manager-content">
        <button type="button" className="store-navigation-toggle type-text-sm-medium" aria-label="Open navigation" aria-controls="main-navigation" aria-expanded={navigationOpen} onClick={() => setNavigationOpen(true)}>
          <MenuRounded fontSize="inherit" />
          <span>Menu</span>
        </button>
        <Outlet />
      </div>
    </div>
  )
}
