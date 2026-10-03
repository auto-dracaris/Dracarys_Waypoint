import { useEffect, useState } from 'react'
import { OrdersTable } from '@/features/store-manager/components/orders/orders-table'
import { OrderDetailsPanel } from '@/features/store-manager/components/orders/order-details-panel'
import { Header } from '@/components/layout/store-manager-header'
import { useLocation, useNavigate } from 'react-router-dom'
import { cancelOrder, fetchMyOrders, type OrderStatus, type StoreOrder } from '@/features/store-manager/api'
import { toDetails, toTableRow } from '@/features/store-manager/order-format'
import { useUser } from '@/features/auth/user-context'
import type { Paginated } from '@/lib/api-client'

const tabs = ['All orders', 'Awaiting scheduling', 'Deferred', 'Cancelled'] as const
type Tab = (typeof tabs)[number]
const tabStatus: Record<Tab, OrderStatus | undefined> = { 'All orders': undefined, 'Awaiting scheduling': 'confirmed', Deferred: 'deferred', Cancelled: 'cancelled' }

const today = () => new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })

export function OrdersPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { accessToken } = useUser()
  // `null` until the first load settles.
  const [orders, setOrders] = useState<StoreOrder[] | null>(null)
  const [meta, setMeta] = useState<Paginated<unknown>['meta'] | null>(null)
  const [error, setError] = useState('')
  const [attempt, setAttempt] = useState(0)
  const [page, setPage] = useState(1)
  const [tab, setTab] = useState<Tab>('All orders')
  const [query, setQuery] = useState('')
  // What the API is actually asked for; trails `query` so typing doesn't fire a request per key.
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null)
  // Placing an order lands here with a confirmation to show.
  const [message, setMessage] = useState((location.state as { message?: string } | null)?.message ?? '')
  const [cancelling, setCancelling] = useState(false)
  const [cancelError, setCancelError] = useState('')
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
    fetchMyOrders(accessToken, { page, status: tabStatus[tab], search: searchTerm }).then(
      (list) => {
        if (stale) return
        setOrders(list.items)
        setMeta(list.meta)
        setError('')
      },
      (reason: Error) => {
        if (!stale) setError(reason.message)
      },
    )
    return () => {
      stale = true
    }
  }, [accessToken, attempt, page, tab, searchTerm])
  const roster = orders ?? []
  const selected = roster.find((order) => order.reference === selectedOrderId) ?? roster[0]
  async function cancel(order: StoreOrder) {
    if (!accessToken || !window.confirm(`Cancel order ${order.reference}? It will not be delivered.`)) return
    setCancelling(true)
    setCancelError('')
    try {
      await cancelOrder(accessToken, order.id)
      setMessage(`Order ${order.reference} cancelled.`)
      setAttempt((count) => count + 1)
    } catch (reason) {
      setCancelError((reason as Error).message)
    } finally {
      setCancelling(false)
    }
  }

  return (
    <div className="flex-1 pr-2 py-2 flex flex-col h-full overflow-hidden bg-neutral-50">
      <div className="w-full bg-white rounded-2xl outline outline-1 outline-offset-[-1px] outline-stone-200 flex flex-col p-8 gap-5 h-full overflow-hidden">
        <Header title="Orders" deliveryCode="" dateLabel={`${today()} · Your outlet at a glance`} breadcrumbs={[]} onPlaceOrder={() => navigate('/store-manager/orders/create')} />
        {message && (
          <p role="status" className="px-4 py-3 rounded-lg bg-lime-50 border border-lime-200 text-lime-800 text-sm font-medium font-sans">
            {message}
          </p>
        )}

        {/* Main Content Layout (List + Panel) */}
        <div className="flex flex-1 gap-4 overflow-hidden pt-1">
          <OrdersTable
            items={roster.map(toTableRow)}
            selectedId={selected?.reference ?? null}
            onSelect={(id) => {
              setSelectedOrderId(id)
              setCancelError('')
            }}
            tabs={tabs}
            tab={tab}
            onTab={(next) => {
              setTab(next)
              setPage(1)
            }}
            search={query}
            onSearch={setQuery}
            loading={!orders && !error}
            error={error}
            onRetry={() => {
              setError('')
              setAttempt((count) => count + 1)
            }}
            meta={meta}
            onPage={setPage}
          />
          <OrderDetailsPanel
            data={selected ? toDetails(selected) : null}
            onCancel={selected?.cancellable ? () => void cancel(selected) : undefined}
            cancelling={cancelling}
            cancelError={cancelError}
          />
        </div>
      </div>
    </div>
  )
}
