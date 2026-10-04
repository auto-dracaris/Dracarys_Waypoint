import { useState, useEffect } from 'react'
import { OverviewHeader } from '@/features/store-manager/components/my-deliveries/overview-header'
import { Button } from '@/components/ui/button'
import { DemandForecastSection } from '@/features/store-manager/components/my-deliveries/demand-forecast'
import { mockDemandForecast } from '@/features/store-manager/demand-forecast-mock'
import '@/styles/store-manager/overview.css'
import { TodayDeliveries, type DeliveryItem } from '@/features/store-manager/components/my-deliveries/today-deliveries'
import { NextRunCard } from '@/features/store-manager/components/my-deliveries/next-run-card'
import { DeferredOrderCard } from '@/features/store-manager/components/my-deliveries/deferred-order-card'
import { RecentOrdersTable, type OrderRow, type RecentOrdersTab } from '@/features/store-manager/components/my-deliveries/recent-orders-table'
import { fetchMyOverview, type OrderStatus, type StoreOrder, type StoreOverview } from '@/features/store-manager/api'
import { capitalise, formatLongDay, formatMoment, formatTime, statusOf, toDetails, toTableRow, windowLabel } from '@/features/store-manager/order-format'
import { awaitsReceipt } from '@/features/store-manager/delivery-format'
import { useUser } from '@/features/auth/user-context'
import LocalShippingIcon from '@mui/icons-material/LocalShipping'
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong'
import PauseCircleIcon from '@mui/icons-material/PauseCircle'
import { useNavigate } from 'react-router-dom'

// Statuses of an order that is on a trip, and of one still to be delivered.
const onTrip: OrderStatus[] = ['planned', 'loaded', 'dispatched', 'in_transit', 'docked']
const upcoming: OrderStatus[] = ['ordered', 'confirmed', ...onTrip]

// The banner sits on yellow, so a neutral status keeps the amber pill.
const bannerVariants: Record<ReturnType<typeof statusOf>['variant'], DeliveryItem['statusVariant']> = { green: 'green', yellow: 'yellow', red: 'red', gray: 'yellow' }

const colomboDate = (value: string) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Colombo' }).format(new Date(value))

const orderTitle = (order: StoreOrder) => `${order.reference} · ${capitalise(order.tempRequirement)}`

function overviewStatusTone(order: StoreOrder): OrderRow['statusTone'] {
  if (order.assignment?.receiptConfirmedAt) return 'success'
  if (awaitsReceipt(order)) return 'warning'
  if (order.status === 'planned') return 'info'
  if (order.status === 'deferred' || order.status === 'cancelled') return 'neutral'
  if (onTrip.includes(order.status)) return 'warning'
  const tones = { red: 'error', green: 'success', yellow: 'warning', gray: 'neutral' } as const
  return tones[statusOf(order.status).variant]
}

function toDelivery(order: StoreOrder): DeliveryItem {
  const status = statusOf(order.status)
  return {
    id: order.id,
    vehicleId: order.assignment?.vehicle ?? '—',
    vehicleType: order.assignment ? capitalise(order.assignment.vehicleType) : '',
    statusLabel: status.label,
    statusVariant: bannerVariants[status.variant],
    orderCode: orderTitle(order),
    receivingWindow: order.outlet ? windowLabel(order.outlet) : '—',
    plannedArrival: order.assignment ? formatTime(order.assignment.plannedArrivalAt) : '—',
  }
}

export function DashboardOverviewPage() {
  const navigate = useNavigate()
  const { accessToken } = useUser()
  const [overview, setOverview] = useState<StoreOverview | null>(null)
  const [error, setError] = useState('')
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    if (!accessToken) return
    let stale = false
    fetchMyOverview(accessToken).then(
      (data) => {
        if (stale) return
        setOverview(data)
        setError('')
      },
      (reason: Error) => {
        if (!stale) setError(reason.message)
      },
    )
    return () => {
      stale = true
    }
  }, [accessToken, attempt])

  if (error) {
    return (
      <div className="store-overview store-overview-state" role="alert">
        <p className="store-overview-error type-text-sm-medium">{error}</p>
        <Button
          type="button"
          onClick={() => {
            setError('')
            setAttempt((count) => count + 1)
          }}
          variant="outline"
        >
          Try again
        </Button>
      </div>
    )
  }
  if (!overview) {
    return <div className="store-overview store-overview-state type-text-sm-medium" role="status">Loading dashboard data...</div>
  }

  const placeOrder = () => navigate('/store-manager/orders/create')
  const openDelivery = (order: StoreOrder) => navigate(`/store-manager/delivery/${order.id}`)
  const openOrders = () => navigate('/store-manager/orders')
  const { metrics, nextRun, latestDeferred } = overview

  const recentOrders = overview.recentOrders.map((order): OrderRow => {
    const row = toTableRow(order)
    const tabs: RecentOrdersTab[] = []
    if (upcoming.includes(order.status)) tabs.push('upcoming')
    if (awaitsReceipt(order)) tabs.push('awaiting')
    if (order.status === 'deferred') tabs.push('deferred')
    const action = awaitsReceipt(order)
      ? { actionText: 'Review receipt', onAction: () => openDelivery(order) }
      : order.assignment?.receiptConfirmedAt
        ? { actionText: 'View receipt', onAction: () => openDelivery(order) }
        : onTrip.includes(order.status)
          ? { actionText: 'View delivery', onAction: () => openDelivery(order) }
          : { actionText: 'View order', onAction: openOrders }
    return {
      key: order.id,
      id: row.id,
      date: new Date(`${order.requestedDate}T00:00:00`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
      requirement: row.requirement,
      quantity: row.quantity,
      status: order.assignment?.receiptConfirmedAt ? 'Receipt confirmed' : awaitsReceipt(order) ? 'Awaiting confirmation' : row.status,
      statusTone: overviewStatusTone(order),
      sortDate: order.requestedDate,
      sortQuantity: order.orderUnits,
      tabs,
      ...action,
    }
  })

  return (
    <div className="store-overview">
      <div className="store-overview-surface">
        {/* Dashboard Header */}
        <OverviewHeader date={overview.date} onPlaceOrder={placeOrder} />

        {/* Top Metrics Row */}
        <div className="store-overview-metrics">
          {[
            { title: 'Expected today', icon: <LocalShippingIcon />, value: metrics.expectedToday },
            { title: 'Awaiting receipt', icon: <ReceiptLongIcon />, value: metrics.awaitingReceipt },
            { title: 'Deferred orders', icon: <PauseCircleIcon />, value: metrics.deferred, warning: metrics.deferred > 0 },
          ].map(({ title, icon, value, warning }) => <div key={title} className={`store-overview-summary ${warning ? 'store-overview-summary--warning' : ''}`}>
            <div><span aria-hidden="true">{icon}</span><span className="type-text-md-medium">{title}</span></div>
            <p className="type-display-xl-semibold">{value}</p>
          </div>)}
        </div>

        {/* Middle Grid: Today's Deliveries & Side Panels */}
        <div className="store-overview-grid">
          {/* Left Column: Deliveries List */}
          <div className="store-overview-deliveries">
            <TodayDeliveries deliveries={overview.todayDeliveries.map(toDelivery)} />
          </div>

          {/* Right Column: Next Run & Deferred */}
          <div className="store-overview-next-panel">
            <NextRunCard
              dateLabel={nextRun ? formatLongDay(nextRun.date) : 'No delivery day open'}
              cutoffTime={!nextRun ? '—' : colomboDate(nextRun.cutoffAt) === overview.date ? `Today at ${formatTime(nextRun.cutoffAt)}` : formatMoment(nextRun.cutoffAt)}
              onPlaceOrder={placeOrder}
            />

            {latestDeferred && <DeferredOrderCard orderTitle={orderTitle(latestDeferred)} reason={toDetails(latestDeferred).timelineMessage} requirement={latestDeferred.tempRequirement} newDateLabel={latestDeferred.deferral?.deferredToDate ? formatLongDay(latestDeferred.deferral.deferredToDate) : 'Not yet confirmed'} onViewOrder={openOrders} />}
          </div>
        </div>

        {/* Bottom Section: Recent Orders Table */}
        <div className="store-overview-recent">
          <RecentOrdersTable orders={recentOrders} onViewAll={openOrders} />
        </div>
        <DemandForecastSection forecast={mockDemandForecast} />
      </div>
    </div>
  )
}

export default DashboardOverviewPage
