import { StatusBadge } from '@/components/ui/status-badge'
import SwapVertRounded from '@mui/icons-material/SwapVertRounded'
import ArrowUpwardRounded from '@mui/icons-material/ArrowUpwardRounded'
import ArrowDownwardRounded from '@mui/icons-material/ArrowDownwardRounded'
import AddRounded from '@mui/icons-material/AddRounded'
import CheckRounded from '@mui/icons-material/CheckRounded'
import { Button } from '@/components/ui/button'
import type { ConfirmedOrder, OrderSort, OrderSortKey } from '../data'

const columns: { label: string; key: OrderSortKey }[] = [
  { label: 'ORDER ID', key: 'id' },
  { label: 'OUTLET / DISTRICT', key: 'outlet' },
  { label: 'REQUIREMENT', key: 'requirement' },
  { label: 'WEIGHT', key: 'weight' },
  { label: 'VOLUME', key: 'volume' },
  { label: 'STATUS', key: 'status' },
]

export function OrdersTable({
  orders,
  checked,
  selectedId,
  sort,
  onSort,
  onCheck,
  onSelect,
  onClear,
  onAddColumn,
}: {
  orders: ConfirmedOrder[]
  checked: Set<string>
  selectedId?: string
  sort: OrderSort
  onSort: (key: OrderSortKey) => void
  onCheck: (id: string) => void
  onSelect: (id: string) => void
  onClear: () => void
  onAddColumn: () => void
}) {
  return (
    <div className="fleet-table-scroll" role="region" aria-label="Confirmed orders" tabIndex={0}>
      <table className="fleet-table orders-table">
        <caption className="sr-only">Confirmed orders. Select an order to review vehicle options; use column headings to sort.</caption>
        <thead>
          <tr>
            {columns.map(({ label, key }) => (
              <th key={key} scope="col" aria-sort={sort.key === key ? sort.direction : 'none'}>
                <button className="type-text-sm-medium" onClick={() => onSort(key)}>
                  {label}
                  {sort.key === key ? sort.direction === 'ascending' ? <ArrowUpwardRounded fontSize="inherit" /> : <ArrowDownwardRounded fontSize="inherit" /> : <SwapVertRounded fontSize="inherit" />}
                </button>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {orders.map((order) => (
            <tr key={order.id} className={`${checked.has(order.id) ? 'fleet-row-checked' : ''} ${selectedId === order.id ? 'orders-row-selected' : ''}`} onClick={() => onSelect(order.id)}>
              <td>
                <div className="fleet-id-cell">
                  <span className="fleet-checkbox">
                    <input type="checkbox" aria-label={`Select ${order.id}`} checked={checked.has(order.id)} onClick={(event) => event.stopPropagation()} onChange={() => onCheck(order.id)} />
                    {checked.has(order.id) && <CheckRounded fontSize="inherit" />}
                  </span>
                  <button id={`order-select-${order.id}`} aria-pressed={selectedId === order.id} onClick={() => onSelect(order.id)}>
                    {order.id}
                  </button>
                </div>
              </td>
              <td title={order.outlet}>{order.outlet}</td>
              <td>{order.requirement}</td>
              <td>{order.weight} kg</td>
              <td>{order.volume} m³</td>
              <td>
                <StatusBadge tone={order.status === 'Unallocated' ? 'error' : order.status === 'Deferred' ? 'warning' : 'success'}>{order.status}</StatusBadge>
              </td>
            </tr>
          ))}
          {!orders.length && (
            <tr>
              <td colSpan={6}>
                <div className="fleet-empty">
                  <h3 className="type-text-lg-semibold">No matching orders</h3>
                  <p className="type-text-sm-regular text-wp-text-secondary">Try another search or allocation filter.</p>
                  <Button onClick={onClear}>Clear filters</Button>
                </div>
              </td>
            </tr>
          )}
        </tbody>
        <tfoot>
          <tr>
            <td>
              <button className="fleet-add-column type-text-xs-regular" onClick={onAddColumn}>
                <AddRounded fontSize="inherit" />
                Add Column
              </button>
            </td>
            <td />
            <td />
            <td />
            <td />
            <td />
          </tr>
        </tfoot>
      </table>
    </div>
  )
}
