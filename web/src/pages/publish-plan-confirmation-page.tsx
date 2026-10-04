import { HubBreadcrumbs } from '@/components/layout/hub-breadcrumbs'
import { IconButton } from '@/components/ui/icon-button'
import { useRef, useState } from 'react'
import MenuRounded from '@mui/icons-material/MenuRounded'
import CheckCircleOutlineRounded from '@mui/icons-material/CheckCircleOutlineRounded'
import InfoOutlined from '@mui/icons-material/InfoOutlined'
import ArrowForwardRounded from '@mui/icons-material/ArrowForwardRounded'
import RouteRounded from '@mui/icons-material/RouteRounded'
import LocalShippingRounded from '@mui/icons-material/LocalShippingRounded'
import DoneAllRounded from '@mui/icons-material/DoneAllRounded'
import RemoveCircleOutlineRounded from '@mui/icons-material/RemoveCircleOutlineRounded'
import { Button } from '@/components/ui/button'
import { TeamNotifications } from '@/features/planning/components/team-notifications'
import { RouteSchedule } from '@/features/planning/components/route-schedule'
import { planTotals } from '@/features/planning/data'
import type { PublishedPlan } from '@/features/planning/publication'
import '@/styles/vehicles.css'
import '@/styles/planning.css'
import '@/styles/publication.css'

export function PublishPlanConfirmationPage({
  publication,
  onResend,
  onOpenNavigation,
  navigationOpen,
}: {
  publication: PublishedPlan
  onResend: (staffId: string) => string | null
  onNavigate: (page: string) => void
  onOpenNavigation: () => void
  navigationOpen: boolean
}) {
  const [acknowledgementsOnly, setAcknowledgementsOnly] = useState(false)
  const [showTrips, setShowTrips] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const trips = useRef<HTMLHeadingElement>(null)
  const totals = planTotals(publication.plan)
  const publishedDate = new Intl.DateTimeFormat('en-GB', { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(`${publication.publishedDate}T12:00:00`))
  const deliveryDate = new Intl.DateTimeFormat('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(`${publication.plan.date}T12:00:00`))
  const metadata = `Version ${publication.version} • Published at ${publication.publishedTime}, ${publishedDate.replace(/^\w+, /, '')} • Depot: ${publication.depot}`
  const cards = [
    { label: 'Trips published', value: totals.routes, Icon: RouteRounded, tone: 'success' },
    { label: 'Vehicles assigned', value: new Set(publication.plan.routes.map((route) => route.vehicleId)).size, Icon: LocalShippingRounded, tone: 'default' },
    { label: 'Orders assigned', value: totals.assigned, Icon: DoneAllRounded, tone: 'success' },
    { label: 'Orders deferred', value: totals.deferred, Icon: RemoveCircleOutlineRounded, tone: 'warning' },
  ]
  function resend(id: string) {
    const result = onResend(id)
    setError(result ?? '')
    if (result) {
      setMessage('')
      return
    }
    const member = publication.notifications.find((item) => item.id === id)!
    setMessage(`Resend preview updated for ${member.name}. No notification was sent.`)
  }
  function viewAcknowledgements() {
    setAcknowledgementsOnly(true)
    requestAnimationFrame(() => document.getElementById('team-notifications-title')?.focus())
  }
  function viewTrips() {
    setShowTrips(true)
    requestAnimationFrame(() => {
      trips.current?.focus()
      trips.current?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' })
    })
  }
  return (
    <div className="overview-canvas publication-canvas">
      <header className="overview-header plan-page-header publication-screen">
        <div className="plan-page-title">
          <div className="flex items-center gap-wp-space-lg">
            <IconButton type="button" aria-label="Open navigation" aria-expanded={navigationOpen} aria-controls="main-navigation" className="mobile-menu" onClick={onOpenNavigation}>
              <MenuRounded fontSize="inherit" />
            </IconButton>
            <h1 className="type-display-lg-medium">Plan Published</h1>
          </div>
          <p className="type-text-sm-regular text-wp-text-secondary">
            {publishedDate} • {publication.depot}
          </p>
        </div>
        <Button className="publication-print-button" onClick={() => window.print()}>
          Print Plan Manifest
        </Button>
      </header>
      <HubBreadcrumbs className="publication-screen" />
      <section className="publication-success publication-screen" aria-labelledby="publication-success-title">
        <span className="publication-success-icon">
          <CheckCircleOutlineRounded fontSize="inherit" />
        </span>
        <div>
          <h2 id="publication-success-title" className="type-text-md-bold">
            Plan Published Successfully
          </h2>
          <p className="type-text-sm-regular">{metadata}</p>
        </div>
      </section>
      <section className="plan-summary publication-summary publication-screen" aria-label="Published plan summary">
        {cards.map(({ label, value, Icon, tone }) => (
          <div key={label} className={`fleet-stat fleet-stat--${tone}`}>
            <div>
              <Icon fontSize="inherit" />
              <span className="type-text-md-medium text-wp-text-secondary">{label}</span>
            </div>
            <strong className="type-display-xl-semibold">{value}</strong>
          </div>
        ))}
      </section>
      {message && (
        <p role="status" className="fleet-update-message type-text-sm-medium publication-screen">
          {message}
        </p>
      )}
      {error && (
        <p role="alert" className="publication-error type-text-sm-medium publication-screen">
          {error}
        </p>
      )}
      <div className="publication-workspace publication-screen">
        <TeamNotifications notifications={publication.notifications} acknowledgementsOnly={acknowledgementsOnly} onShowAll={() => setAcknowledgementsOnly(false)} onResend={resend} />
        <aside className="publication-sidebar" aria-label="Published plan actions">
          <section className="plan-review-card publication-lock">
            <h2 className="type-text-sm-bold">
              <InfoOutlined fontSize="inherit" />
              Plan Lock State
            </h2>
            <p className="type-text-xs-regular text-wp-text-secondary">
              Any changes to this plan will create version {publication.nextVersion}. Affected drivers and the loading team will automatically receive an updated mobile notification.
            </p>
          </section>
          <div className="publication-actions">
            <Button variant="primary" onClick={viewTrips} aria-expanded={showTrips} aria-controls="published-trips">
              View published trips
              <ArrowForwardRounded fontSize="inherit" />
            </Button>
            <Button onClick={viewAcknowledgements} aria-pressed={acknowledgementsOnly}>
              View acknowledgements
            </Button>
          </div>
        </aside>
      </div>
      <section id="published-trips" className={`publication-manifest ${showTrips ? 'publication-manifest--visible' : ''}`} aria-labelledby="publication-manifest-title">
        <header>
          <h2 ref={trips} tabIndex={-1} id="publication-manifest-title" className="type-text-lg-medium">
            Published Plan Manifest
          </h2>
          <Button
            className="publication-screen"
            onClick={() => {
              setShowTrips(false)
              document.querySelector<HTMLButtonElement>('[aria-controls="published-trips"]')?.focus()
            }}
          >
            Hide trips
          </Button>
        </header>
        <p className="type-text-sm-regular text-wp-text-secondary">
          Delivery · {deliveryDate} • {publication.depot} • Version {publication.version}
        </p>
        <p className="publication-print-only type-text-xs-regular">Preview manifest — no live dispatch has been made.</p>
        {publication.plan.routes.map((route) => (
          <RouteSchedule key={`${route.vehicleId}-${route.trip}`} route={route} />
        ))}
        <section className="publication-manifest-deferred">
          <h3 className="type-text-sm-bold">Deferred orders</h3>
          {publication.plan.deferred.map((order) => (
            <p key={order.id} className="type-text-xs-regular">
              {order.id} · {order.outlet} · {order.reason}
            </p>
          ))}
        </section>
      </section>
    </div>
  )
}
