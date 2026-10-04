import { HubBreadcrumbs } from '@/components/layout/hub-breadcrumbs'
import { NotificationsButton } from '@/features/notifications/components/notifications-button'
import { IconButton } from '@/components/ui/icon-button'
import { useState } from 'react'
import MenuRounded from '@mui/icons-material/MenuRounded'
import { ActiveRoutes } from '@/features/overview/components/active-routes'
import { PlanningSummary } from '@/features/overview/components/planning-summary'

export function OverviewPage({ onNavigate, onOpenNavigation, navigationOpen }: { onNavigate: (page: string) => void; onOpenNavigation: () => void; navigationOpen: boolean }) {
  const [date, setDate] = useState('2026-09-26')
  const planningDate = new Intl.DateTimeFormat('en-GB', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date(`${date}T12:00:00`))
  return (
    <div className="overview-canvas">
      <header className="overview-header">
        <div>
          <div className="flex items-center gap-wp-space-lg">
            <IconButton type="button" aria-label="Open navigation" aria-expanded={navigationOpen} aria-controls="main-navigation" className="mobile-menu" onClick={onOpenNavigation}>
              <MenuRounded fontSize="inherit" />
            </IconButton>
            <h1 className="type-display-lg-medium">Delivery Overview</h1>
          </div>
          <p className="mt-wp-space-md text-wp-text-tertiary type-text-sm-regular">Planning for {planningDate}</p>
        </div>
        <NotificationsButton />
      </header>
      <HubBreadcrumbs />
      <ActiveRoutes onNavigate={onNavigate} />
      <PlanningSummary date={date} onDateChange={setDate} onNavigate={onNavigate} />
    </div>
  )
}
