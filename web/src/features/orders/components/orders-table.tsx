import { StatusBadge } from '@/components/ui/status-badge'
import SwapVertRounded from '@mui/icons-material/SwapVertRounded'
import ArrowUpwardRounded from '@mui/icons-material/ArrowUpwardRounded'
import ArrowDownwardRounded from '@mui/icons-material/ArrowDownwardRounded'
import { Button } from '@/components/ui/button'
import type { Paginated } from '@/lib/api-client'
import { orderStatusTones, type ConfirmedOrder, type OrderSort, type OrderSortKey } from '../data'

const columns: { label: string; key: OrderSortKey }[] = [
  { label: 'ORDER ID', key: 'id' },
  { label: 'OUTLET / DISTRICT', key: 'outlet' },
  { label: 'DELIVERY DAY', key: 'requestedDelivery' },
  { label: 'REQUIREMENT', key: 'requirement' },
  { label: 'WEIGHT', key: 'weight' },
  { label: 'VOLUME', key: 'volume' },
  { label: 'STATUS', key: 'status' },
]

export function OrdersTable({
  orders,
  selectedId,
  sort,
  loading,
  error,
  hasOrders,
  meta,
  onPage,
  onSort,
  onSelect,
  onClear,
  onRetry,
}: {
  orders: ConfirmedOrder[]
  selectedId?: string
  sort: OrderSort
  loading: boolean
  error: string
  hasOrders: boolean
  meta: Paginated<unknown>['meta'] | null
  onPage: (page: number) => void
  onSort: (key: OrderSortKey) => void
  onSelect: (id: string) => void
  onClear: () => void
  onRetry: () => void
}) {
  const first = meta ? (meta.page - 1) * meta.limit + 1 : 0
  return (
    <>
      <div className="fleet-table-scroll" role="region" aria-label="Confirmed orders" tabIndex={0}>
        <table className="fleet-table orders-table">
          <caption className="sr-only">Confirmed orders. Select an order to review vehicle options; use column headings to sort.</caption>
          <thead>
            <tr>
              {columns.map(({ label, key }) => (
                <th key={key} scope="col" aria-sort={sort.key === key ? sort.direction : 'none'}>
                  <button className="type-text-sm-medium" onClick={() => onSort(key)}>
                    {label}
                    {sort.key === key ? (
                      sort.direction === 'ascending' ? (
                        <ArrowUpwardRounded fontSize="inherit" />
                      ) : (
                        <ArrowDownwardRounded fontSize="inherit" />
                      )
                    ) : (
                      <SwapVertRounded fontSize="inherit" />
                    )}
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => (
              <tr key={order.id} className={selectedId === order.id ? 'orders-row-selected' : ''} onClick={() => onSelect(order.id)}>
                <td>
                  <div className="fleet-id-cell">
                    <button id={`order-select-${order.id}`} aria-pressed={selectedId === order.id} onClick={() => onSelect(order.id)}>
                      {order.id}
                    </button>
                  </div>
                </td>
                <td title={order.outlet}>{order.outlet}</td>
                <td>{order.requestedDelivery}</td>
                <td>{order.requirement}</td>
                <td>{order.weight} kg</td>
                <td>{order.volume} m³</td>
                <td>
                  <StatusBadge tone={orderStatusTones[order.status]}>{order.status}</StatusBadge>
                  {order.carriedOver && <StatusBadge tone="info">Carried over</StatusBadge>}
                </td>
              </tr>
            ))}
            {!orders.length && (
              <tr>
                <td colSpan={7}>
                  <div className="fleet-empty">
                    {loading ? (
                      <p role="status" className="type-text-sm-regular text-wp-text-secondary">
                        Loading orders…
                      </p>
                    ) : error ? (
                      <>
                        <h3 className="type-text-lg-semibold">Could not load orders</h3>
                        <p role="alert" className="type-text-sm-regular text-wp-text-secondary">
                          {error}
                        </p>
                        <Button onClick={onRetry}>Try again</Button>
                      </>
                    ) : !hasOrders ? (
                      <>
                        <h3 className="type-text-lg-semibold">No orders yet</h3>
                        <p className="type-text-sm-regular text-wp-text-secondary">Orders appear here as store managers place them.</p>
                      </>
                    ) : (
                      <>
                        <h3 className="type-text-lg-semibold">No matching orders</h3>
                        <p className="type-text-sm-regular text-wp-text-secondary">Try another search or filter.</p>
                        <Button onClick={onClear}>Clear filters</Button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {meta && meta.total > 0 && (
        <nav className="fleet-pager type-text-sm-regular" aria-label="Order pages">
          <span className="text-wp-text-secondary" role="status">
            Showing {first}–{Math.min(first + orders.length - 1, meta.total)} of {meta.total}
          </span>
          <div>
            <Button disabled={meta.page <= 1} onClick={() => onPage(meta.page - 1)}>
              Previous
            </Button>
            <span>
              Page {meta.page} of {meta.totalPages}
            </span>
            <Button disabled={meta.page >= meta.totalPages} onClick={() => onPage(meta.page + 1)}>
              Next
            </Button>
          </div>
        </nav>
      )}
    </>
  )
}
