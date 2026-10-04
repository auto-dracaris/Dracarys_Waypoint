import { Outlet, useLocation } from 'react-router-dom'
import { StyledEngineProvider } from '@mui/material/styles'
import { useHubController } from '@/features/hub/use-hub-controller'
import { useUser } from '@/features/auth/user-context'
import { NotificationsPanel } from '@/features/notifications/components/notifications-panel'
import { Sidebar } from './sidebar'
import { StageNotice } from '@/components/ui/stage-notice'
import '@/styles/overview.css'

export function HubLayout() {
  const hub = useHubController()
  const location = useLocation()
  const { user } = useUser()
  const profile = user ? { name: `${user.firstName} ${user.lastName}`, initials: `${user.firstName[0] ?? ''}${user.lastName[0] ?? ''}`.toUpperCase(), status: 'Signed in' } : undefined
  const notice = (
    <StageNotice title={hub.notice} onClose={() => hub.setNotice(null)} returnLabel={hub.isPlanning || hub.isPublished ? 'Back to plan' : hub.isOperations ? 'Back to loading review' : undefined} />
  )
  return (
    <StyledEngineProvider enableCssLayer>
      <div className="overview-shell">
        <Sidebar
          profile={profile}
          open={hub.navigationOpen}
          collapsed={hub.sidebarCollapsed}
          onToggleCollapsed={() => hub.setSidebarCollapsed((previous) => !previous)}
          onClose={() => hub.setNavigationOpen(false)}
          onNavigate={hub.navigate}
          activePage={
            hub.isVehicles
              ? 'Vehicles'
              : hub.isOutlets
                ? 'Outlets'
                : hub.isTeam
                  ? 'Team'
                  : hub.isOrders
                    ? 'Orders'
                    : hub.isPlanning || hub.isPublished
                      ? 'Planning'
                      : hub.isOperations
                        ? 'Operations'
                        : location.pathname === '/profile' ? 'Profile' : location.pathname === '/knowledge' ? 'Knowledge base' : 'Overview'
          }
        />
        <main className="overview-main">
          <Outlet context={hub} />
        </main>
        {notice}
        {hub.notificationsOpen && <NotificationsPanel items={hub.notifications} onRead={hub.readNotifications} onAction={hub.openNotification} onClose={() => hub.setNotificationsOpen(false)} />}
      </div>
    </StyledEngineProvider>
  )
}
