import { HubBreadcrumbs } from '@/components/layout/hub-breadcrumbs'
import { IconButton } from '@/components/ui/icon-button'
import { useEffect, useState } from 'react'
import MenuRounded from '@mui/icons-material/MenuRounded'
import CalendarTodayOutlined from '@mui/icons-material/CalendarTodayOutlined'
import LocalShippingRounded from '@mui/icons-material/LocalShippingRounded'
import DoneAllRounded from '@mui/icons-material/DoneAllRounded'
import RouteRounded from '@mui/icons-material/RouteRounded'
import RemoveCircleOutlineRounded from '@mui/icons-material/RemoveCircleOutlineRounded'
import CheckCircleRounded from '@mui/icons-material/CheckCircleRounded'
import { Button } from '@/components/ui/button'
import { Select } from '@/components/ui/select'
import { StatusBadge } from '@/components/ui/status-badge'
import { RouteSchedule } from '@/features/planning/components/route-schedule'
import { PlanReviewSidebar } from '@/features/planning/components/plan-review-sidebar'
import { ConfirmPlanDialog } from '@/features/planning/components/confirm-plan-dialog'
import { fetchPlan, publishPlan, runPlanning } from '@/features/planning/api'
import type { DeliveryPlan } from '@/features/planning/data'
import { depots } from '@/features/orders/data'
import { useUser } from '@/features/auth/user-context'
import '@/styles/vehicles.css'
import '@/styles/planning.css'

/** The next delivery day (YYYY-MM-DD) in Colombo: tomorrow, or Monday when tomorrow is a Sunday. */
function nextDeliveryDay(): string {
  const day = new Date(Date.now() + 86_400_000)
  const colombo = (value: Date, options: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Colombo', ...options }).format(value)
  if (colombo(day, { weekday: 'short' }) === 'Sun') day.setTime(day.getTime() + 86_400_000)
  return colombo(day, {})
}

const stateLabels = { none: 'Not planned', draft: 'Draft', published: 'Published' } as const
const stateTones = { none: 'neutral', draft: 'warning', published: 'success' } as const

export function FinalPlanReviewPage({ onOpenNavigation, navigationOpen }: { onNavigate: (page: string) => void; onOpenNavigation: () => void; navigationOpen: boolean }) {
  const { accessToken } = useUser()
  const [date, setDate] = useState(nextDeliveryDay)
  const [depot, setDepot] = useState(depots[0])
  // The plan for the chosen day and depot; a result only counts for the pair it was loaded for.
  const [loaded, setLoaded] = useState<{ key: string; plan: DeliveryPlan | null; error: string } | null>(null)
  const [attempt, setAttempt] = useState(0)
  const [busy, setBusy] = useState<'run' | 'publish' | null>(null)
  // The action waiting for the dispatcher's go-ahead.
  const [confirming, setConfirming] = useState<'run' | 'publish' | null>(null)
  const [message, setMessage] = useState('')
  const [actionError, setActionError] = useState('')
  const key = `${date}:${depot}`
  useEffect(() => {
    if (!accessToken) return
    let stale = false
    fetchPlan(accessToken, date, depot).then(
      (plan) => {
        if (!stale) setLoaded({ key: `${date}:${depot}`, plan, error: '' })
      },
      (reason: Error) => {
        if (!stale) setLoaded({ key: `${date}:${depot}`, plan: null, error: reason.message })
      },
    )
    return () => {
      stale = true
    }
  }, [accessToken, date, depot, attempt])
  const current = loaded?.key === key ? loaded : null
  const plan = current?.plan ?? null
  const planned = !!plan && plan.state !== 'none'
  const dateLabel = new Intl.DateTimeFormat('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(`${date}T12:00:00`))
  const cards = [
    { label: planned ? 'Orders on this plan' : 'Orders awaiting planning', value: plan ? (planned ? plan.totals.orders : plan.awaiting) : '—', Icon: LocalShippingRounded, tone: 'default' },
    { label: 'Assigned orders', value: planned ? plan.totals.assigned : '—', Icon: DoneAllRounded, tone: 'success' },
    { label: 'Routes', value: planned ? plan.totals.trips : '—', Icon: RouteRounded, tone: 'default' },
    { label: 'Deferred orders', value: planned ? plan.totals.deferred : '—', Icon: RemoveCircleOutlineRounded, tone: 'warning' },
    { label: 'Issues', value: planned ? plan.totals.issues : '—', Icon: CheckCircleRounded, tone: 'default' },
  ]
  function choose(change: () => void) {
    change()
    setMessage('')
    setActionError('')
  }
  async function act(action: 'run' | 'publish', confirmed = false) {
    if (!accessToken || !plan) return
    // Publishing, or running over a draft, is confirmed first.
    if (!confirmed && (action === 'publish' || plan.state === 'draft')) return setConfirming(action)
    setConfirming(null)
    setBusy(action)
    setMessage('')
    setActionError('')
    try {
      const next = await (action === 'run' ? runPlanning : publishPlan)(accessToken, date, depot)
      setLoaded({ key, plan: next, error: '' })
      setMessage(
        action === 'run'
          ? `Planning run complete: ${next.totals.assigned} ${next.totals.assigned === 1 ? 'order' : 'orders'} on ${next.totals.trips} ${next.totals.trips === 1 ? 'trip' : 'trips'}, ${next.totals.deferred} deferred.`
          : `Plan published for ${dateLabel}.`,
      )
    } catch (reason) {
      setActionError((reason as Error).message)
      // The plan may have changed underneath, so show it as it now stands.
      setAttempt((count) => count + 1)
    } finally {
      setBusy(null)
    }
  }
  return (
    <div className="overview-canvas vehicles-canvas plan-review-canvas">
      <header className="overview-header plan-page-header">
        <div className="plan-page-title">
          <div className="flex items-center gap-wp-space-lg">
            <IconButton type="button" aria-label="Open navigation" aria-expanded={navigationOpen} aria-controls="main-navigation" className="mobile-menu" onClick={onOpenNavigation}>
              <MenuRounded fontSize="inherit" />
            </IconButton>
            <h1 className="type-display-lg-medium">Final Plan Review</h1>
            {plan && <StatusBadge tone={stateTones[plan.state]}>{stateLabels[plan.state]}</StatusBadge>}
          </div>
          <p className="type-text-sm-regular text-wp-text-secondary">
            Delivery Date: {dateLabel.replace(',', '')} · {depot} depot
          </p>
        </div>
        <div className="plan-header-actions">
          <Select controlSize="sm" aria-label="Depot" value={depot} onChange={(event) => choose(() => setDepot(event.target.value))}>
            {depots.map((name) => (
              <option key={name}>{name}</option>
            ))}
          </Select>
          <label className="date-picker type-text-sm-medium">
            <CalendarTodayOutlined fontSize="inherit" />
            <span>{dateLabel}</span>
            <input
              type="date"
              aria-label="Delivery plan date"
              value={date}
              onChange={(event) => {
                if (event.target.value) choose(() => setDate(event.target.value))
              }}
            />
          </label>
          {plan && plan.state !== 'published' && (
            <Button disabled={busy !== null || (!planned && plan.awaiting === 0)} onClick={() => void act('run')}>
              {busy === 'run' ? 'Planning…' : planned ? 'Run again' : 'Run planning'}
            </Button>
          )}
          <Button variant="primary" className="plan-publish-button" disabled={busy !== null || plan?.state !== 'draft' || plan.issues.length > 0} onClick={() => void act('publish')}>
            {busy === 'publish' ? 'Publishing…' : plan?.state === 'published' ? 'Published' : 'Publish plan'}
          </Button>
        </div>
      </header>
      <HubBreadcrumbs />
      {message && (
        <p role="status" className="fleet-update-message type-text-sm-medium">
          {message}
        </p>
      )}
      {actionError && (
        <p role="alert" className="plan-error type-text-sm-medium">
          {actionError}
        </p>
      )}
      <section className="plan-summary" aria-label="Delivery plan summary">
        {cards.map(({ label, value, Icon, tone }) => (
          <div key={label} className={`fleet-stat fleet-stat--${tone}`}>
            <div>
              <Icon fontSize="inherit" />
              <span className="text-wp-text-secondary type-text-md-medium">{label}</span>
            </div>
            <strong className="type-display-xl-semibold">{value}</strong>
          </div>
        ))}
      </section>
      <div className="plan-review-workspace">
        <section className="plan-sequences" aria-labelledby="plan-sequences-title">
          <h2 id="plan-sequences-title" className="type-text-lg-medium">
            Vehicle Sequence &amp; Stop Schedule
          </h2>
          {plan?.routes.length ? (
            plan.routes.map((route) => <RouteSchedule key={`${route.vehicleId}-${route.trip}`} route={route} />)
          ) : (
            <div className="plan-empty">
              {!current ? (
                <p role="status" className="type-text-sm-regular text-wp-text-secondary">
                  Loading the plan…
                </p>
              ) : current.error ? (
                <>
                  <h3 className="type-text-lg-semibold">Could not load the plan</h3>
                  <p role="alert" className="type-text-sm-regular text-wp-text-secondary">
                    {current.error}
                  </p>
                  <Button onClick={() => setAttempt((count) => count + 1)}>Try again</Button>
                </>
              ) : planned ? (
                <>
                  <h3 className="type-text-lg-semibold">No trips on this plan</h3>
                  <p className="type-text-sm-regular text-wp-text-secondary">Every order on this run was deferred.</p>
                </>
              ) : (
                <>
                  <h3 className="type-text-lg-semibold">No plan for this day yet</h3>
                  <p className="type-text-sm-regular text-wp-text-secondary">
                    {plan?.awaiting
                      ? `${plan.awaiting} ${plan.awaiting === 1 ? 'order is' : 'orders are'} awaiting planning at ${depot}.`
                      : `No orders are awaiting planning at ${depot} for this day.`}
                  </p>
                  {!!plan?.awaiting && (
                    <Button variant="primary" disabled={busy !== null} onClick={() => void act('run')}>
                      {busy === 'run' ? 'Planning…' : 'Run planning'}
                    </Button>
                  )}
                </>
              )}
            </div>
          )}
        </section>
        <PlanReviewSidebar plan={plan} />
      </div>
      {confirming && (
        <ConfirmPlanDialog
          title={confirming === 'publish' ? `Publish the ${depot} plan for ${dateLabel}?` : 'Run planning again?'}
          description={confirming === 'publish' ? 'Loaders and drivers will see its trips, and the orders it leaves off will be deferred.' : 'The current draft will be replaced.'}
          confirmLabel={confirming === 'publish' ? 'Publish plan' : 'Run again'}
          onClose={() => setConfirming(null)}
          onConfirm={() => void act(confirming, true)}
        />
      )}
    </div>
  )
}
