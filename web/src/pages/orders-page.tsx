import { IconButton } from '@/components/ui/icon-button'
import { useEffect, useRef, useState } from 'react'
import NotificationsRounded from '@mui/icons-material/NotificationsRounded'
import MenuRounded from '@mui/icons-material/MenuRounded'
import SearchRounded from '@mui/icons-material/SearchRounded'
import { Button } from '@/components/ui/button'
import { OrdersTable } from '@/features/orders/components/orders-table'
import { AllocationPanel } from '@/features/orders/components/allocation-panel'
import { DeferOrderDialog } from '@/features/orders/components/defer-order-dialog'
import { initialOrders, allocationOptions, orderFilters, selectOrders, assignOrder, deferOrder, optionBlocker, type OrderFilter, type OrderSort, type OrderSortKey } from '@/features/orders/data'
import '@/styles/vehicles.css'
import '@/styles/orders.css'

function requestedOrderId() {
  const id = new URLSearchParams(window.location.search).get('order')
  return initialOrders.some(order => order.id === id) ? id : null
}

export function OrdersPage({ onNavigate, onOpenNavigation, navigationOpen }: { onNavigate: (page: string) => void; onOpenNavigation: () => void; navigationOpen: boolean }) {
  const [orders, setOrders] = useState(initialOrders)
  const [filter, setFilter] = useState<OrderFilter>('All')
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState<OrderSort>({ key: null, direction: 'ascending' })
  const [review, setReview] = useState<{ id: string; open: boolean } | null>(() => { const id = requestedOrderId(); return id ? { id, open: true } : null })
  const [checked, setChecked] = useState(new Set<string>())
  const [optionId, setOptionId] = useState<string | null>(() => {
    const id = requestedOrderId()
    const order = initialOrders.find(item => item.id === id)
    return order ? allocationOptions.find(option => option.orderId === id && !optionBlocker(order, option))?.id ?? null : null
  })
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [deferringId, setDeferringId] = useState<string | null>(null)
  const [deferralError, setDeferralError] = useState('')
  const search = useRef<HTMLInputElement>(null)
  useEffect(() => {
    const shortcut = (event: KeyboardEvent) => { if (!deferringId && (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); search.current?.focus() } }
    window.addEventListener('keydown', shortcut)
    return () => window.removeEventListener('keydown', shortcut)
  }, [deferringId])
  useEffect(() => {
    const selectFromUrl = () => {
      const id = requestedOrderId()
      const order = orders.find(item => item.id === id)
      setFilter('All'); setQuery(''); setError('')
      setReview(order ? { id: order.id, open: true } : null)
      setOptionId(order ? allocationOptions.find(option => option.orderId === order.id && !optionBlocker(order, option))?.id ?? null : null)
      if (order) requestAnimationFrame(() => document.getElementById(`order-select-${order.id}`)?.focus())
    }
    window.addEventListener('popstate', selectFromUrl)
    window.addEventListener('waypoint:order-selection', selectFromUrl)
    return () => {
      window.removeEventListener('popstate', selectFromUrl)
      window.removeEventListener('waypoint:order-selection', selectFromUrl)
    }
  }, [orders])
  useEffect(() => {
    const id = requestedOrderId()
    if (id) requestAnimationFrame(() => document.getElementById(`order-select-${id}`)?.focus())
  }, [])
  const deferringOrder = orders.find(order => order.id === deferringId)
  const visible = selectOrders(orders, filter, query, sort)
  const selected = review?.open ? visible.find(order => order.id === review.id) : undefined
  // Keep the last review mounted during its exit animation. The closed slot
  // is inert and hidden, while only an explicitly selected row opens it.
  const reviewedOrder = review ? orders.find(order => order.id === review.id) : undefined
  const reviewOpen = !!selected
  const pending = orders.filter(order => order.status === 'Unallocated').length
  function onSort(key: OrderSortKey) { setSort({ key, direction: sort.key === key && sort.direction === 'ascending' ? 'descending' : 'ascending' }) }
  function toggleChecked(id: string) { setChecked(previous => { const next = new Set(previous); if (next.has(id)) next.delete(id); else next.add(id); return next }) }
  function selectOrder(id: string) {
    const order = orders.find(item => item.id === id)
    if (!order) return
    setReview({ id, open: true }); setError('')
    setOptionId(order ? allocationOptions.find(option => option.orderId === id && !optionBlocker(order, option))?.id ?? null : null)
  }
  function closeReview() {
    setReview(previous => previous ? { ...previous, open: false } : null)
    setOptionId(null); setError('')
    if (selected) document.getElementById(`order-select-${selected.id}`)?.focus()
  }
  function updateView(nextFilter: OrderFilter, nextQuery: string) {
    setFilter(nextFilter); setQuery(nextQuery)
    if (review && !selectOrders(orders, nextFilter, nextQuery, sort).some(order => order.id === review.id)) {
      setReview({ ...review, open: false }); setOptionId(null); setError('')
    }
  }
  function assign() {
    if (!selected || !optionId) return
    const result = assignOrder(orders, selected.id, optionId)
    setError(result.error ?? '')
    if (result.error) return
    setOrders(result.orders); setFilter('All'); setQuery('')
    const assigned = result.orders.find(order => order.id === selected.id)!
    setMessage(`${assigned.id} assigned to ${assigned.assignedVehicle} · ${assigned.assignedTrip}. Saved for this preview only.`)
  }
  function confirmDeferral(reason: string, details: string) {
    if (!deferringId) return
    const result = deferOrder(orders, deferringId, reason, details)
    setDeferralError(result.error ?? '')
    if (result.error) return
    setOrders(result.orders); setFilter('All'); setQuery(''); setOptionId(null); setError('')
    setMessage(`${deferringId} deferred. Revised delivery date not confirmed. Saved for this preview only; no store update was sent.`)
    setDeferringId(null)
  }
  return <div className="overview-canvas vehicles-canvas orders-canvas">
    <header className="overview-header orders-page-header"><div className="orders-page-title"><div className="flex items-center gap-wp-space-lg"><IconButton type="button" aria-label="Open navigation" aria-expanded={navigationOpen} aria-controls="main-navigation" className="mobile-menu" onClick={onOpenNavigation}><MenuRounded fontSize="inherit" /></IconButton><h1 className="type-display-lg-medium">Confirmed Orders</h1></div><p className="type-text-sm-regular text-wp-text-tertiary">Requested run · Sat, 26 Sep · Cutoff closed 25 Sep, 16:00</p></div><Button variant="danger" size="md" className="decision-button" onClick={() => onNavigate('Order notifications')}><NotificationsRounded fontSize="inherit" />{pending} {pending === 1 ? 'order needs' : 'orders need'} a decision</Button></header>
    {message && <p role="status" className="fleet-update-message type-text-sm-medium">{message}</p>}{error && <p role="alert" className="order-error type-text-sm-medium">{error}</p>}
    <div className={`fleet-workspace orders-workspace ${reviewOpen ? 'orders-workspace--review-open' : ''}`}><section className="fleet-inventory" aria-labelledby="orders-planning-title"><h2 id="orders-planning-title" className="fleet-inventory-title type-display-md-medium">Delivery planning</h2><div className="fleet-toolbar orders-toolbar"><div className="route-filters orders-filters" role="group" aria-label="Filter orders by allocation">{orderFilters.map(label => <button key={label} aria-pressed={filter === label} className={filter === label ? 'route-filter--active type-text-sm-medium' : 'type-text-sm-regular'} onClick={() => updateView(label, query)}>{label}<span className="text-wp-text-quaternary">{label === 'All' ? orders.length : orders.filter(order => order.status === label).length}</span></button>)}</div><div className="route-search fleet-search"><SearchRounded fontSize="inherit" /><input ref={search} className="type-text-sm-regular" placeholder="Search" aria-label="Search confirmed orders" value={query} onChange={event => updateView(filter, event.target.value)} /><kbd className="type-text-xs-medium">⌘K</kbd></div></div>
      <OrdersTable orders={visible} checked={checked} selectedId={selected?.id} sort={sort} onSort={onSort} onCheck={toggleChecked} onSelect={selectOrder} onClear={() => updateView('All', '')} onAddColumn={() => onNavigate('Customize order columns')} />
    </section><div className={`order-review-slot ${reviewOpen ? 'order-review-slot--open' : ''}`} aria-hidden={!reviewOpen} inert={!reviewOpen} onKeyDown={event => { if (event.key === 'Escape') { event.preventDefault(); closeReview() } }}><div className="order-review-content">{reviewedOrder && <AllocationPanel order={reviewedOrder} optionId={optionId} onSelectOption={setOptionId} onAssign={assign} onClose={closeReview} onDefer={() => { if (reviewedOrder.status === 'Unallocated') { setDeferralError(''); setDeferringId(reviewedOrder.id) } }} />}</div></div></div>
    {deferringOrder && <DeferOrderDialog key={deferringOrder.id} order={deferringOrder} error={deferralError} onClose={() => setDeferringId(null)} onConfirm={confirmDeferral} />}
  </div>
}
