import { HubBreadcrumbs } from '@/components/layout/hub-breadcrumbs'
import { IconButton } from '@/components/ui/icon-button'
import { useEffect, useRef, useState } from 'react'
import NotificationsRounded from '@mui/icons-material/NotificationsRounded'
import MenuRounded from '@mui/icons-material/MenuRounded'
import SearchRounded from '@mui/icons-material/SearchRounded'
import FormatListBulletedRounded from '@mui/icons-material/FormatListBulletedRounded'
import ScheduleRounded from '@mui/icons-material/ScheduleRounded'
import CheckCircleRounded from '@mui/icons-material/CheckCircleRounded'
import CalendarMonthOutlined from '@mui/icons-material/CalendarMonthOutlined'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { useDetailPanel, type DetailPanelState } from '@/components/ui/use-detail-panel'
import { OrdersTable } from '@/features/orders/components/orders-table'
import { AllocationPanel } from '@/features/orders/components/allocation-panel'
import { DeferOrderDialog } from '@/features/orders/components/defer-order-dialog'
import { deferOrder, fetchOrders, fetchOrderSummary, formatDay } from '@/features/orders/api'
import {
  allocationOptions,
  assignOrder,
  brands,
  depots,
  optionBlocker,
  orderFilters,
  type ConfirmedOrder,
  type DeferralReason,
  type OrderFilter,
  type OrderSort,
  type OrderSortKey,
  type OrderSummary,
} from '@/features/orders/data'
import type { Paginated } from '@/lib/api-client'
import { useUser } from '@/features/auth/user-context'
import '@/styles/vehicles.css'
import '@/styles/orders.css'

// An order named in the URL (e.g. from a notification) is searched for and opened straight away.
const orderFromUrl = () => new URLSearchParams(window.location.search).get('order') ?? ''

const cards: { label: string; value: (summary: OrderSummary) => number; Icon: typeof ScheduleRounded; tone: string }[] = [
  { label: 'Orders', value: (summary) => summary.total, Icon: FormatListBulletedRounded, tone: 'default' },
  { label: 'Awaiting planning', value: (summary) => summary.awaiting, Icon: ScheduleRounded, tone: 'warning' },
  { label: 'Allocated', value: (summary) => summary.allocated, Icon: CheckCircleRounded, tone: 'success' },
  { label: 'Deferred', value: (summary) => summary.deferred, Icon: CalendarMonthOutlined, tone: 'error' },
]
const filterCount = (summary: OrderSummary, filter: OrderFilter) =>
  filter === 'All'
    ? summary.total + summary.cancelled
    : filter === 'Unallocated'
      ? summary.awaiting
      : filter === 'Allocated'
        ? summary.allocated
        : filter === 'Deferred'
          ? summary.deferred
          : summary.cancelled

export function OrdersPage({ onOpenNavigation, navigationOpen }: { onNavigate: (page: string) => void; onOpenNavigation: () => void; navigationOpen: boolean }) {
  const { accessToken } = useUser()
  // `null` until the first load settles.
  const [orders, setOrders] = useState<ConfirmedOrder[] | null>(null)
  const [meta, setMeta] = useState<Paginated<unknown>['meta'] | null>(null)
  const [summary, setSummary] = useState<OrderSummary | null>(null)
  // The delivery day (run) being looked at; '' shows orders for every day.
  const [date, setDate] = useState('')
  const [loadError, setLoadError] = useState('')
  const [attempt, setAttempt] = useState(0)
  const [page, setPage] = useState(1)
  const [filter, setFilter] = useState<OrderFilter>('All')
  const [depot, setDepot] = useState('')
  const [brand, setBrand] = useState('')
  const [temp, setTemp] = useState('')
  const [query, setQuery] = useState(orderFromUrl)
  // What the API is actually asked for; trails `query` so typing doesn't fire a request per key.
  const [searchTerm, setSearchTerm] = useState(orderFromUrl)
  const [sort, setSort] = useState<OrderSort>({ key: null, direction: 'ascending' })
  const [review, setReview] = useState<{ id: string; open: boolean } | null>(() => (orderFromUrl() ? { id: orderFromUrl(), open: true } : null))
  const [optionId, setOptionId] = useState<string | null>(null)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [deferringId, setDeferringId] = useState<string | null>(null)
  // Only the display mode is the shared preference; whether the review is open is this page's own state.
  const panel = useDetailPanel()
  const modal = panel.mode === 'modal'
  const search = useRef<HTMLInputElement>(null)
  useEffect(() => {
    const shortcut = (event: KeyboardEvent) => {
      if (!deferringId && (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        search.current?.focus()
      }
    }
    window.addEventListener('keydown', shortcut)
    return () => window.removeEventListener('keydown', shortcut)
  }, [deferringId])
  useEffect(() => {
    const selectFromUrl = () => {
      const id = orderFromUrl()
      setFilter('All')
      setQuery(id)
      setSearchTerm(id)
      setPage(1)
      setError('')
      setOptionId(null)
      setReview(id ? { id, open: true } : null)
    }
    window.addEventListener('popstate', selectFromUrl)
    window.addEventListener('waypoint:order-selection', selectFromUrl)
    return () => {
      window.removeEventListener('popstate', selectFromUrl)
      window.removeEventListener('waypoint:order-selection', selectFromUrl)
    }
  }, [])
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchTerm(query)
      setPage(1)
    }, 300)
    return () => clearTimeout(timer)
  }, [query])
  useEffect(() => {
    if (!accessToken) return
    let stale = false
    Promise.all([fetchOrders(accessToken, { date, page, search: searchTerm, filter, sort, depot, brand, temp }), fetchOrderSummary(accessToken, date, depot)]).then(
      ([list, totals]) => {
        if (stale) return
        setOrders(list.items)
        setMeta(list.meta)
        setSummary(totals)
        setLoadError('')
      },
      (reason: Error) => {
        if (!stale) setLoadError(reason.message)
      },
    )
    return () => {
      stale = true
    }
  }, [accessToken, attempt, date, page, searchTerm, filter, sort, depot, brand, temp])
  const roster = orders ?? []
  const deferringOrder = roster.find((order) => order.id === deferringId)
  const selected = review?.open ? roster.find((order) => order.id === review.id) : undefined
  // Keep the last review mounted during its exit animation. The closed slot
  // is inert and hidden, while only an explicitly selected row opens it.
  const reviewedOrder = review ? roster.find((order) => order.id === review.id) : undefined
  const reviewOpen = !!selected
  function onSort(key: OrderSortKey) {
    setPage(1)
    setSort({ key, direction: sort.key === key && sort.direction === 'ascending' ? 'descending' : 'ascending' })
  }
  function selectOrder(id: string) {
    const order = roster.find((item) => item.id === id)
    if (!order) return
    setReview({ id, open: true })
    setError('')
    setOptionId(allocationOptions.find((option) => option.orderId === id && !optionBlocker(order, option))?.id ?? null)
  }
  function closeReview() {
    setReview((previous) => (previous ? { ...previous, open: false } : null))
    setOptionId(null)
    setError('')
    if (selected) document.getElementById(`order-select-${selected.id}`)?.focus()
  }
  const reviewPanel: DetailPanelState = { ...panel, open: reviewOpen, close: closeReview }
  // Any change to what is listed starts again from the first page.
  function narrow(change: () => void) {
    change()
    setPage(1)
  }
  // Vehicle options are still preview data, so an assignment is kept on this page only until the planning step.
  function assign() {
    if (!selected || !optionId) return
    const result = assignOrder(roster, selected.id, optionId)
    setError(result.error ?? '')
    if (result.error) return
    setOrders(result.orders)
    const assigned = result.orders.find((order) => order.id === selected.id)!
    setMessage(`${assigned.id} assigned to ${assigned.assignedVehicle} · ${assigned.assignedTrip}. Saved for this preview only.`)
  }
  async function confirmDeferral(reason: DeferralReason, details: string) {
    if (!deferringOrder || !accessToken) return
    await deferOrder(accessToken, deferringOrder.dbId, reason, details)
    setMessage(`${deferringOrder.id} deferred to the next operating day’s run. The store manager can see the reason.`)
    setOptionId(null)
    setError('')
    setDeferringId(null)
    setAttempt((count) => count + 1)
  }
  const allocationPanel = (order: ConfirmedOrder) => (
    <AllocationPanel
      panel={reviewPanel}
      order={order}
      optionId={optionId}
      onSelectOption={setOptionId}
      onAssign={assign}
      onClose={closeReview}
      onDefer={() => {
        if (order.status === 'Unallocated') setDeferringId(order.id)
      }}
    />
  )
  return (
    <div className="overview-canvas vehicles-canvas orders-canvas">
      <header className="overview-header orders-page-header">
        <div className="orders-page-title">
          <div className="flex items-center gap-wp-space-lg">
            <IconButton type="button" aria-label="Open navigation" aria-expanded={navigationOpen} aria-controls="main-navigation" className="mobile-menu" onClick={onOpenNavigation}>
              <MenuRounded fontSize="inherit" />
            </IconButton>
            <h1 className="type-display-lg-medium">Order Manager</h1>
          </div>
          <p className="type-text-sm-regular text-wp-text-tertiary">
            {date ? `Delivery run · ${formatDay(date)} · Orders close at 16:00 on the operating day before` : 'All delivery days · pick a day to see one run'}
          </p>
        </div>
        <Button variant="danger" size="md" className="decision-button" onClick={() => narrow(() => setFilter('Unallocated'))}>
          <NotificationsRounded fontSize="inherit" />
          {summary ? `${summary.awaiting} ${summary.awaiting === 1 ? 'order awaits' : 'orders await'} planning` : 'Orders awaiting planning'}
        </Button>
      </header>
      <HubBreadcrumbs />
      <section className="fleet-summary" aria-label="Order summary">
        {cards.map(({ label, value, Icon, tone }) => (
          <div key={label} className={`fleet-stat fleet-stat--${tone}`}>
            <div>
              <Icon fontSize="inherit" />
              <span className="text-wp-text-secondary type-text-md-medium">{label}</span>
            </div>
            <strong className="type-display-xl-semibold">{summary ? value(summary) : '—'}</strong>
          </div>
        ))}
      </section>
      {message && (
        <p role="status" className="fleet-update-message type-text-sm-medium">
          {message}
        </p>
      )}
      {error && (
        <p role="alert" className="order-error type-text-sm-medium">
          {error}
        </p>
      )}
      <div className={`fleet-workspace orders-workspace ${reviewOpen && !modal ? 'orders-workspace--review-open' : ''}`}>
        <section className="fleet-inventory" aria-labelledby="orders-planning-title">
          <h2 id="orders-planning-title" className="fleet-inventory-title type-display-md-medium">
            Order Queue
          </h2>
          <div className="orders-run-filters type-text-sm-medium">
            <label>
              Delivery day
              <span className="orders-day-filter">
                <Input controlSize="sm" type="date" value={date} onChange={(event) => narrow(() => setDate(event.target.value))} />
                {date && <Button onClick={() => narrow(() => setDate(''))}>All days</Button>}
              </span>
            </label>
            <label>
              Depot
              <Select controlSize="sm" value={depot} onChange={(event) => narrow(() => setDepot(event.target.value))}>
                <option value="">All depots</option>
                {depots.map((name) => (
                  <option key={name}>{name}</option>
                ))}
              </Select>
            </label>
            <label>
              Brand
              <Select controlSize="sm" value={brand} onChange={(event) => narrow(() => setBrand(event.target.value))}>
                <option value="">All brands</option>
                {brands.map((name) => (
                  <option key={name}>{name}</option>
                ))}
              </Select>
            </label>
            <label>
              Temperature
              <Select controlSize="sm" value={temp} onChange={(event) => narrow(() => setTemp(event.target.value))}>
                <option value="">Ambient and chilled</option>
                <option value="ambient">Ambient</option>
                <option value="chilled">Chilled</option>
              </Select>
            </label>
          </div>
          <div className="fleet-toolbar orders-toolbar">
            <div className="route-filters orders-filters" role="group" aria-label="Filter orders by allocation">
              {orderFilters.map((label) => (
                <button
                  key={label}
                  aria-pressed={filter === label}
                  className={filter === label ? 'route-filter--active type-text-sm-medium' : 'type-text-sm-regular'}
                  onClick={() => narrow(() => setFilter(label))}
                >
                  {label}
                  <span className="text-wp-text-quaternary">{summary ? filterCount(summary, label) : '—'}</span>
                </button>
              ))}
            </div>
            <div className="route-search fleet-search">
              <SearchRounded fontSize="inherit" />
              <input ref={search} className="type-text-sm-regular" placeholder="Search" aria-label="Search confirmed orders" value={query} onChange={(event) => setQuery(event.target.value)} />
              <kbd className="type-text-xs-medium">⌘K</kbd>
            </div>
          </div>
          <OrdersTable
            orders={roster}
            selectedId={selected?.id}
            sort={sort}
            loading={!orders && !loadError}
            error={loadError}
            hasOrders={!!summary && summary.total + summary.cancelled > 0}
            meta={meta}
            onPage={setPage}
            onSort={onSort}
            onSelect={selectOrder}
            onClear={() => {
              setQuery('')
              setSearchTerm('')
              setFilter('All')
              setDepot('')
              setBrand('')
              setTemp('')
              setDate('')
              setPage(1)
            }}
            onRetry={() => {
              setLoadError('')
              setAttempt((count) => count + 1)
            }}
          />
        </section>
        {/* Docked beside the table, the review slides open in its slot; as a pop-up it is rendered outside the hidden slot. */}
        {!modal && (
          <div
            className={`order-review-slot ${reviewOpen ? 'order-review-slot--open' : ''}`}
            aria-hidden={!reviewOpen}
            inert={!reviewOpen}
            onKeyDown={(event) => {
              if (event.key === 'Escape') {
                event.preventDefault()
                closeReview()
              }
            }}
          >
            <div className="order-review-content">{reviewedOrder && allocationPanel(reviewedOrder)}</div>
          </div>
        )}
      </div>
      {modal && reviewedOrder && allocationPanel(reviewedOrder)}
      {deferringOrder && <DeferOrderDialog key={deferringOrder.id} order={deferringOrder} onClose={() => setDeferringId(null)} onConfirm={confirmDeferral} />}
    </div>
  )
}
