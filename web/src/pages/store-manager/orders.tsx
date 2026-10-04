import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import CalendarMonthRounded from '@mui/icons-material/CalendarMonthRounded'
import ShoppingCartRounded from '@mui/icons-material/ShoppingCartRounded'
import { OrdersTable, type OrderTableRow } from '@/features/store-manager/components/orders/orders-table'
import { OrderDetailsPanel } from '@/features/store-manager/components/orders/order-details-panel'
import { OrderDateRangeFilter, type OrderDateRange } from '@/features/store-manager/components/orders/order-date-range'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/shadcn/dialog'
import { cancelOrder, fetchMyOrders, fetchPlacementOptions, type MyOrderSort, type MyOrders, type OrderStatus, type PlacementOptions, type StoreOrder, type TempRequirement } from '@/features/store-manager/api'
import { formatDay, formatMoment, formatTime, toDetails, toTableRow } from '@/features/store-manager/order-format'
import { awaitsReceipt } from '@/features/store-manager/delivery-format'
import { useUser } from '@/features/auth/user-context'
import '@/styles/store-manager/orders.css'

const tabs = ['All orders', 'Awaiting scheduling', 'Deferred', 'Cancelled'] as const
type Tab = (typeof tabs)[number]
const tabStatus: Record<Tab, OrderStatus | undefined> = { 'All orders': undefined, 'Awaiting scheduling': 'confirmed', Deferred: 'deferred', Cancelled: 'cancelled' }
function tableRow(order: StoreOrder): OrderTableRow {
  const row = toTableRow(order)
  row.requestedDate = new Date(`${order.requestedDate}T00:00:00`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
  if (order.assignment?.receiptConfirmedAt) { row.status = 'Receipt confirmed'; row.statusVariant = 'green' }
  else if (awaitsReceipt(order)) { row.status = 'Awaiting receipt'; row.statusVariant = 'red' }
  else if (order.status === 'confirmed' || order.status === 'ordered') { row.status = 'Awaiting scheduling'; row.statusVariant = 'green' }
  return row
}
export function OrdersPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { accessToken } = useUser()
  const [list, setList] = useState<MyOrders | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [attempt, setAttempt] = useState(0)
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(6)
  const [tab, setTab] = useState<Tab>('All orders')
  const [query, setQuery] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [range, setRange] = useState<OrderDateRange>({ from: '', to: '' })
  const [requirement, setRequirement] = useState<TempRequirement | ''>('')
  const [sort, setSort] = useState<{ key: MyOrderSort; direction: 'ASC' | 'DESC' } | null>(null)
  const [options, setOptions] = useState<PlacementOptions | null>(null)
  const [optionsError, setOptionsError] = useState('')
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null)
  const fullTitle = useRef<HTMLHeadingElement>(null)
  const [fullOpen, setFullOpen] = useState(false)
  const [message, setMessage] = useState((location.state as { message?: string } | null)?.message ?? '')
  const [cancelling, setCancelling] = useState(false)
  const [cancelError, setCancelError] = useState('')
  useEffect(() => {
    const timer = setTimeout(() => { setSearchTerm(query); setPage(1) }, 300)
    return () => clearTimeout(timer)
  }, [query])
  useEffect(() => {
    if (!accessToken) return
    let stale = false
    fetchPlacementOptions(accessToken).then((result) => { if (!stale) { setOptions(result); setOptionsError('') } }, (reason: Error) => { if (!stale) setOptionsError(reason.message) })
    return () => { stale = true }
  }, [accessToken, attempt])
  useEffect(() => {
    if (!accessToken) return
    let stale = false
    fetchMyOrders(accessToken, { page, limit, status: tabStatus[tab], search: searchTerm, dateFrom: range.from || undefined, dateTo: range.to || undefined, tempRequirement: requirement || undefined, sortBy: sort?.key, sortDirection: sort?.direction }).then(
      (result) => {
        if (stale) return
        if (result.meta.totalPages > 0 && page > result.meta.totalPages) { setPage(result.meta.totalPages); return }
        setList(result); setLoading(false); setError('')
      },
      (reason: Error) => { if (!stale) { setError(reason.message); setLoading(false) } },
    )
    return () => { stale = true }
  }, [accessToken, attempt, page, limit, tab, searchTerm, range, requirement, sort])
  const roster = list?.items ?? []
  const selected = roster.find((order) => order.reference === selectedOrderId) ?? roster[0]
  const row = selected ? tableRow(selected) : null
  const detail = selected ? {
    ...toDetails(selected),
    status: row!.status,
    statusVariant: selected.status === 'confirmed' || selected.status === 'ordered' ? 'yellow' as const : row!.statusVariant,
    ...(selected.status === 'confirmed' || selected.status === 'ordered' ? { timelineStatus: 'Order received', timelineMessage: 'Your order has been received. A delivery date will be confirmed after planning.' } : {}),
    ...(selected.assignment ? { arrivalTime: selected.assignment.actualArrivalAt ? `Arrived ${formatTime(selected.assignment.actualArrivalAt)}` : `Planned ${formatTime(selected.assignment.plannedArrivalAt)}` } : {}),
  } : null
  const count = list?.counts
  const counts: Partial<Record<Tab, number>> = count ? { 'All orders': count.all, 'Awaiting scheduling': count.confirmed, Deferred: count.deferred, Cancelled: count.cancelled } : list ? { [tab]: list.meta.total } : {}
  function refresh() { setLoading(true); setAttempt((value) => value + 1) }
  function resetSelection() { setLoading(true); setSelectedOrderId(null); setFullOpen(false); setCancelError(''); setPage(1) }
  async function cancel(order: StoreOrder) {
    if (!accessToken || !window.confirm(`Cancel order ${order.reference}? It will not be delivered.`)) return
    setCancelling(true); setCancelError('')
    try { await cancelOrder(accessToken, order.id); setMessage(`Order ${order.reference} cancelled.`); refresh() }
    catch (reason) { setCancelError((reason as Error).message) }
    finally { setCancelling(false) }
  }
  const next = options?.deliveryDays[0]
  return <div className="store-orders-page"><div className="store-orders-surface">
    <header className="store-orders-header"><h1 className="type-display-lg-medium">Orders</h1><div className="store-orders-header-actions">
      <OrderDateRangeFilter value={range} onChange={(value) => { resetSelection(); setRange(value) }} />
      <Button variant="primary" size="md" trailingIcon={<ShoppingCartRounded />} onClick={() => navigate('/store-manager/orders/create')}>Place Order</Button>
    </div></header>
    <div className="store-orders-notice type-text-sm-regular"><CalendarMonthRounded aria-hidden="true" />
      {next ? <><p>Next eligible delivery: <strong>{formatDay(next.date)}</strong></p><span className="store-orders-notice-divider" aria-hidden="true">|</span><p>Order cutoff: <strong>{formatMoment(next.cutoffAt)}</strong></p></> : <p>{optionsError || (options ? 'No delivery days are currently open for orders.' : 'Loading the next delivery run…')}</p>}
    </div>
    {message && <p role="status" className="store-orders-success type-text-sm-medium">{message}</p>}
    <div className="store-orders-workspace">
      <OrdersTable items={roster.map(tableRow)} selectedId={selected?.reference ?? null} onSelect={(id) => { setSelectedOrderId(id); setCancelError('') }} tabs={tabs} tab={tab} counts={counts}
        onTab={(value) => { resetSelection(); setTab(value) }} search={query} onSearch={(value) => { setQuery(value) }}
        requirement={requirement} onRequirement={(value) => { resetSelection(); setRequirement(value) }} sort={sort}
        onSort={(key) => { resetSelection(); setSort({ key, direction: sort?.key === key && sort.direction === 'ASC' ? 'DESC' : 'ASC' }) }}
        loading={loading} error={error} onRetry={refresh} meta={list?.meta ?? null} limit={limit}
        onLimit={(value) => { resetSelection(); setLimit(value) }} onPage={(value) => { setLoading(true); setPage(value); setFullOpen(false) }} />
      <OrderDetailsPanel data={detail} onViewFull={selected ? () => setFullOpen(true) : undefined} onCancel={selected?.cancellable ? () => void cancel(selected) : undefined} cancelling={cancelling} cancelError={cancelError} />
    </div>
    <Dialog open={fullOpen} onOpenChange={setFullOpen}><DialogContent className="store-order-full-dialog" initialFocus={fullTitle}>
      <DialogTitle ref={fullTitle} tabIndex={-1} className="type-display-xs-medium">Full order details</DialogTitle>
      <OrderDetailsPanel data={detail} full />
      {selected?.outlet?.depot && <p className="type-text-sm-regular">Serving depot: {selected.outlet.depot}</p>}
      <Button size="sm" onClick={() => setFullOpen(false)}>Close order</Button>
    </DialogContent></Dialog>
  </div></div>
}
