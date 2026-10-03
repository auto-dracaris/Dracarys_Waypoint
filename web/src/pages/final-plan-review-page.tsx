import { IconButton } from '@/components/ui/icon-button'
import { useState } from 'react'
import MenuRounded from '@mui/icons-material/MenuRounded'
import CalendarTodayOutlined from '@mui/icons-material/CalendarTodayOutlined'
import LocalShippingRounded from '@mui/icons-material/LocalShippingRounded'
import DoneAllRounded from '@mui/icons-material/DoneAllRounded'
import RouteRounded from '@mui/icons-material/RouteRounded'
import RemoveCircleOutlineRounded from '@mui/icons-material/RemoveCircleOutlineRounded'
import CheckCircleRounded from '@mui/icons-material/CheckCircleRounded'
import { Button } from '@/components/ui/button'
import { RouteSchedule } from '@/features/planning/components/route-schedule'
import { PlanReviewSidebar } from '@/features/planning/components/plan-review-sidebar'
import { getReviewedPlan, planTotals, reviewedPlan } from '@/features/planning/data'
import '@/styles/vehicles.css'
import '@/styles/planning.css'

export function FinalPlanReviewPage({ onNavigate, onOpenNavigation, navigationOpen, onPublish, published = false }: { onNavigate: (page: string) => void; onOpenNavigation: () => void; navigationOpen: boolean; onPublish: (date: string) => void; published?: boolean }) {
  const [date, setDate] = useState(reviewedPlan.date)
  const plan = getReviewedPlan(date)
  const totals = planTotals(plan)
  const dateLabel = new Intl.DateTimeFormat('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(`${date}T12:00:00`))
  const cards = [
    { label: 'Confirmed orders', value: totals.confirmed, Icon: LocalShippingRounded, tone: 'default' },
    { label: 'Assigned orders', value: totals.assigned, Icon: DoneAllRounded, tone: 'success' },
    { label: 'Routes', value: totals.routes, Icon: RouteRounded, tone: 'default' },
    { label: 'Deferred orders', value: totals.deferred, Icon: RemoveCircleOutlineRounded, tone: 'warning' },
    { label: 'Issues', value: plan ? totals.issues : '—', Icon: CheckCircleRounded, tone: 'default' },
  ]
  return <div className="overview-canvas vehicles-canvas plan-review-canvas">
    <header className="overview-header plan-page-header"><div className="plan-page-title"><div className="flex items-center gap-wp-space-lg"><IconButton type="button" aria-label="Open navigation" aria-expanded={navigationOpen} aria-controls="main-navigation" className="mobile-menu" onClick={onOpenNavigation}><MenuRounded fontSize="inherit" /></IconButton><h1 className="type-display-lg-medium">Final Plan Review</h1></div><p className="type-text-sm-regular text-wp-text-secondary">Delivery Date: {dateLabel.replace(',', '')}</p></div><div className="plan-header-actions"><label className="date-picker type-text-sm-medium"><CalendarTodayOutlined fontSize="inherit" /><span>{dateLabel}</span><input type="date" aria-label="Delivery plan date" value={date} onChange={event => { if (event.target.value) setDate(event.target.value) }} /></label><Button variant="primary" className="plan-publish-button" disabled={!plan} onClick={() => onPublish(date)}>{published ? 'View published plan' : 'Publish plan'}</Button></div></header>
    <nav aria-label="Breadcrumb" className="fleet-breadcrumb type-text-sm-medium"><span><button onClick={() => onNavigate('Home')}>Home</button><span aria-hidden="true">/</span></span><span>Planning<span aria-hidden="true">/</span></span><span>Active Plan<span aria-hidden="true">/</span></span><strong aria-current="page" className="text-wp-text-primary type-text-sm-semibold">Final Plan Review</strong></nav>
    <section className="plan-summary" aria-label="Delivery plan summary">{cards.map(({ label, value, Icon, tone }) => <div key={label} className={`fleet-stat fleet-stat--${tone}`}><div><Icon fontSize="inherit" /><span className="text-wp-text-secondary type-text-md-medium">{label}</span></div><strong className="type-display-xl-semibold">{value}</strong></div>)}</section>
    <div className="plan-review-workspace"><section className="plan-sequences" aria-labelledby="plan-sequences-title"><h2 id="plan-sequences-title" className="type-text-lg-medium">Vehicle Sequence &amp; Stop Schedule</h2>{plan ? plan.routes.map(route => <RouteSchedule key={`${route.vehicleId}-${route.trip}`} route={route} />) : <div className="plan-empty"><h3 className="type-text-lg-semibold">No reviewed plan for this date</h3><p className="type-text-sm-regular text-wp-text-secondary">Select the reviewed delivery date to view its routes and stops.</p><Button onClick={() => setDate(reviewedPlan.date)}>Return to {new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short' }).format(new Date(`${reviewedPlan.date}T12:00:00`))}</Button></div>}</section><PlanReviewSidebar plan={plan} published={published} /></div>
  </div>
}


