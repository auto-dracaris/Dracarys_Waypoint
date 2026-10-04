import { useState, useEffect } from 'react'
import { Header } from '@/components/layout/store-manager-header'
import { SummaryCard } from '@/features/store-manager/components/my-deliveries/summary-card'
import { TodayDeliveries, type DeliveryItem } from '@/features/store-manager/components/my-deliveries/today-deliveries'
import { NextRunCard } from '@/features/store-manager/components/my-deliveries/next-run-card'
import { DeferredOrderCard } from '@/features/store-manager/components/my-deliveries/deferred-order-card'
import { RecentOrdersTable, type OrderRow, type RecentOrdersTab } from '@/features/store-manager/components/my-deliveries/recent-orders-table'
import { fetchMyOverview, type OrderStatus, type StoreOrder, type StoreOverview } from '@/features/store-manager/api'
import { capitalise, formatDay, formatLongDay, formatMoment, formatTime, statusOf, statusStyles, toDetails, toTableRow, windowLabel } from '@/features/store-manager/order-format'
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
      <div className="p-8 flex flex-col items-start gap-3 font-sans">
        <p className="text-red-700 font-medium">{error}</p>
        <button
          type="button"
          onClick={() => {
            setError('')
            setAttempt((count) => count + 1)
          }}
          className="text-blue-600 font-medium hover:underline"
        >
          Try again
        </button>
      </div>
    )
  }
  if (!overview) {
    return <div className="p-8 text-stone-500 font-medium">Loading dashboard data...</div>
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
      date: formatDay(order.requestedDate, true),
      requirement: row.requirement,
      quantity: row.quantity,
      status: row.status,
      statusColor: statusStyles[row.statusVariant],
      tabs,
      ...action,
    }
  })

  return (
    <div className="flex-1 pr-2 py-2 flex flex-col justify-start items-start gap-2 h-full">
      <div className="self-stretch p-8 bg-white rounded-2xl outline outline-1 outline-offset-[-1px] outline-stone-200 flex flex-col justify-start items-start gap-6">
        {/* Dashboard Header */}
        <Header title="My deliveries" deliveryCode="" dateLabel={`${formatLongDay(overview.date)} · Your outlet at a glance`} breadcrumbs={[]} onPlaceOrder={placeOrder} />

        {/* Top Metrics Row */}
        <div className="self-stretch flex justify-start items-start gap-3">
          <SummaryCard icon={<LocalShippingIcon fontSize="large" />} title="Expected today" value={metrics.expectedToday} />
          <SummaryCard icon={<ReceiptLongIcon fontSize="large" />} title="Awaiting receipt" value={metrics.awaitingReceipt} />
          <SummaryCard icon={<PauseCircleIcon fontSize="large" />} title="Deferred orders" value={metrics.deferred} isWarning={metrics.deferred > 0} />
        </div>

        {/* Middle Grid: Today's Deliveries & Side Panels */}
        <div className="self-stretch flex justify-start items-start gap-4">
          {/* Left Column: Deliveries List */}
          <div className="flex-1 self-stretch flex flex-col">
            <TodayDeliveries deliveries={overview.todayDeliveries.map(toDelivery)} />
          </div>

          {/* Right Column: Next Run & Deferred */}
          <div className="flex flex-1 flex-col justify-start items-start gap-4">
            <NextRunCard
              dateLabel={nextRun ? formatLongDay(nextRun.date) : 'No delivery day open'}
              cutoffTime={!nextRun ? '—' : colomboDate(nextRun.cutoffAt) === overview.date ? `Today at ${formatTime(nextRun.cutoffAt)}` : formatMoment(nextRun.cutoffAt)}
              onPlaceOrder={placeOrder}
            />

            {latestDeferred && <DeferredOrderCard orderTitle={orderTitle(latestDeferred)} reason={toDetails(latestDeferred).timelineMessage} onViewOrder={openOrders} />}
          </div>
        </div>

        {/* Bottom Section: Recent Orders Table */}
        <div className="self-stretch flex flex-col gap-5 mt-2">
          <RecentOrdersTable orders={recentOrders} onViewAll={openOrders} />
        </div>
      </div>
    </div>
  )
}

export default DashboardOverviewPage
