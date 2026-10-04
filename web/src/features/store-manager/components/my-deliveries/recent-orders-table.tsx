import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { StatusBadge, type StatusBadgeProps } from '@/components/ui/status-badge'
import FilterListRounded from '@mui/icons-material/FilterListRounded'
import SwapVertRounded from '@mui/icons-material/SwapVertRounded'
import SearchRounded from '@mui/icons-material/SearchRounded'
import ArrowForwardRounded from '@mui/icons-material/ArrowForwardRounded'

export type RecentOrdersTab = 'upcoming' | 'awaiting' | 'deferred'
const tabLabels = { all: 'All', upcoming: 'Upcoming', awaiting: 'Awaiting confirmation', deferred: 'Deferred' } as const
export interface OrderRow {
  key: number
  id: string
  date: string
  requirement: string
  quantity: string
  status: string
  statusTone: StatusBadgeProps['tone']
  sortDate: string
  sortQuantity: number
  actionText: string
  onAction: () => void
  tabs: RecentOrdersTab[]
}
type SortKey = 'id' | 'date' | 'requirement' | 'quantity' | 'status'
const columns: { key: SortKey; label: string }[] = [
  { key: 'id', label: 'Order ID' }, { key: 'date', label: 'Requested date' },
  { key: 'requirement', label: 'Requirement' }, { key: 'quantity', label: 'Quantity' },
  { key: 'status', label: 'Status' },
]
export function RecentOrdersTable({ orders, onViewAll }: { orders: OrderRow[]; onViewAll?: () => void }) {
  const [tab, setTab] = useState<'all' | RecentOrdersTab>('all')
  const [search, setSearch] = useState('')
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [requirement, setRequirement] = useState('')
  const [sort, setSort] = useState<{ key: SortKey; descending: boolean } | null>(null)
  const inTab = (order: OrderRow, key: keyof typeof tabLabels) => key === 'all' || order.tabs.includes(key)
  const term = search.trim().toLowerCase()
  const visible = orders.filter((order) => inTab(order, tab) && order.id.toLowerCase().includes(term) && (!requirement || order.requirement === requirement))
  if (sort) visible.sort((a, b) => {
    const value = sort.key === 'quantity' ? a.sortQuantity - b.sortQuantity : sort.key === 'date' ? a.sortDate.localeCompare(b.sortDate) : a[sort.key].localeCompare(b[sort.key], undefined, { numeric: true })
    return sort.descending ? -value : value
  })
  return <section className="store-recent-orders">
    <div className="store-recent-heading"><h2 className="type-display-md-medium">Recent orders</h2><Button variant="link" size="sm" trailingIcon={<ArrowForwardRounded />} onClick={onViewAll}>View all orders</Button></div>
    <div className="store-recent-toolbar">
      <div className="store-recent-tabs" role="group" aria-label="Order status">
        {(Object.keys(tabLabels) as (keyof typeof tabLabels)[]).map((key) => <button key={key} type="button" aria-pressed={tab === key} onClick={() => setTab(key)} className="type-text-sm-regular">{tabLabels[key]} <span>{orders.filter((order) => inTab(order, key)).length}</span></button>)}
      </div>
      <div className="store-recent-search-controls">
        <Button size="xs" leadingIcon={<FilterListRounded />} aria-expanded={filtersOpen} aria-controls="overview-order-filters" onClick={() => setFiltersOpen(!filtersOpen)}>Filter{requirement ? ' (1)' : ''}</Button>
        <div className="store-recent-search"><SearchRounded aria-hidden="true" /><Input controlSize="sm" aria-label="Search order ID" placeholder="Search order ID" value={search} onChange={(event) => setSearch(event.target.value)} /></div>
      </div>
    </div>
    {filtersOpen && <div id="overview-order-filters" className="store-recent-filters">
      <label className="type-text-sm-medium" htmlFor="overview-requirement">Requirement</label>
      <Select id="overview-requirement" controlSize="sm" value={requirement} onChange={(event) => setRequirement(event.target.value)}>
        <option value="">All requirements</option>{[...new Set(orders.map((order) => order.requirement))].sort().map((value) => <option key={value}>{value}</option>)}
      </Select><Button size="xs" onClick={() => setRequirement('')}>Clear filter</Button>
    </div>}
    <div className="store-recent-table-scroll">
      <table className="store-recent-table">
        <caption className="sr-only">Recent orders for your outlet</caption>
        <thead><tr>{columns.map(({ key, label }) => <th key={key} scope="col" aria-sort={sort?.key === key ? sort.descending ? 'descending' : 'ascending' : 'none'}><button type="button" className="type-text-sm-medium" onClick={() => setSort({ key, descending: sort?.key === key && !sort.descending })}>{label}<SwapVertRounded aria-hidden="true" /></button></th>)}<th scope="col" className="type-text-sm-medium">Action</th></tr></thead>
        <tbody>{visible.length === 0 && <tr><td colSpan={6} className="store-overview-empty">No orders to show.</td></tr>}
          {visible.map((order) => <tr key={order.key}><td>{order.id}</td><td>{order.date}</td><td>{order.requirement}</td><td>{order.quantity}</td><td><StatusBadge tone={order.statusTone}>{order.status}</StatusBadge></td><td><button type="button" onClick={order.onAction} aria-label={`${order.actionText} for ${order.id}`}>{order.actionText}</button></td></tr>)}
        </tbody>
      </table>
    </div>
  </section>
}
