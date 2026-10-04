import SearchRounded from '@mui/icons-material/SearchRounded'
import SwapVertRounded from '@mui/icons-material/SwapVertRounded'
import FilterListRounded from '@mui/icons-material/FilterListRounded'
import ChevronLeftRounded from '@mui/icons-material/ChevronLeftRounded'
import ChevronRightRounded from '@mui/icons-material/ChevronRightRounded'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { StatusBadge } from '@/components/ui/status-badge'
import type { Paginated } from '@/lib/api-client'
import type { MyOrderSort, TempRequirement } from '../../api'

export interface OrderTableRow {
  id: string
  requestedDate: string
  requirement: string
  quantity: string
  status: string
  statusVariant: 'yellow' | 'green' | 'red' | 'gray'
}
const orderStatusTones = { yellow: 'warning', green: 'success', red: 'error', gray: 'neutral' } as const
const columns: { key: MyOrderSort; label: string }[] = [
  { key: 'reference', label: 'Order' }, { key: 'requestedDate', label: 'Requested date' },
  { key: 'tempRequirement', label: 'Requirement' }, { key: 'orderUnits', label: 'Quantity' },
  { key: 'status', label: 'Status' },
]
interface OrdersTableProps<Tab extends string> {
  items: OrderTableRow[]
  selectedId: string | null
  onSelect: (id: string) => void
  tabs: readonly Tab[]
  tab: Tab
  counts: Partial<Record<Tab, number>>
  onTab: (tab: Tab) => void
  search: string
  onSearch: (search: string) => void
  requirement: TempRequirement | ''
  onRequirement: (value: TempRequirement | '') => void
  sort: { key: MyOrderSort; direction: 'ASC' | 'DESC' } | null
  onSort: (key: MyOrderSort) => void
  loading: boolean
  error: string
  onRetry: () => void
  meta: Paginated<unknown>['meta'] | null
  limit: number
  onLimit: (limit: number) => void
  onPage: (page: number) => void
}
export function OrdersTable<Tab extends string>({ items, selectedId, onSelect, tabs, tab, counts, onTab, search, onSearch, requirement, onRequirement, sort, onSort, loading, error, onRetry, meta, limit, onLimit, onPage }: OrdersTableProps<Tab>) {
  const [filtersOpen, setFiltersOpen] = useState(false)
  const first = meta && meta.total > 0 ? (meta.page - 1) * meta.limit + 1 : 0
  const current = meta?.page ?? 1
  const pages = meta?.totalPages ?? 0
  const start = Math.max(1, Math.min(current - 1, pages - 3))
  const visiblePages = Array.from({ length: Math.min(4, pages) }, (_, index) => start + index)
  return <section className="store-orders-table-card" aria-label="Recent orders" aria-busy={loading}>
    <h2 className="type-display-md-medium">Recent orders</h2>
    <div className="store-orders-toolbar">
      <div className="store-orders-tabs" role="group" aria-label="Filter orders">
        {tabs.map((label) => <button key={label} type="button" aria-pressed={tab === label} onClick={() => onTab(label)} className="type-text-sm-regular">{label}{counts[label] !== undefined && <span>{counts[label]}</span>}</button>)}
      </div>
      <div className="store-orders-search-controls">
        <Button size="xs" leadingIcon={<FilterListRounded />} aria-expanded={filtersOpen} aria-controls="store-order-filters" onClick={() => setFiltersOpen(!filtersOpen)}>Filter{requirement ? ' (1)' : ''}</Button>
        <div className="store-orders-search"><SearchRounded aria-hidden="true" /><Input controlSize="sm" aria-label="Search order ID" placeholder="Search order ID" value={search} maxLength={50} onChange={(event) => onSearch(event.target.value)} /></div>
      </div>
    </div>
    {filtersOpen && <div id="store-order-filters" className="store-orders-filter-fields">
      <label htmlFor="store-order-requirement" className="type-text-sm-medium">Requirement</label>
      <Select id="store-order-requirement" controlSize="sm" value={requirement} onChange={(event) => onRequirement(event.target.value as TempRequirement | '')}><option value="">All requirements</option><option value="ambient">Ambient</option><option value="chilled">Chilled</option></Select>
      <Button size="xs" onClick={() => onRequirement('')}>Clear filter</Button>
    </div>}
    {error && <div className="store-orders-error type-text-sm-regular" role="alert"><p>{error}</p><Button size="sm" onClick={onRetry}>Try again</Button></div>}
    <div className="store-orders-table-scroll">
      <table className="store-orders-table"><caption className="sr-only">Orders for your outlet</caption>
        <thead><tr>{columns.map(({ key, label }) => <th key={key} scope="col" aria-sort={sort?.key === key ? sort.direction === 'ASC' ? 'ascending' : 'descending' : 'none'}><button type="button" className="type-text-sm-medium" onClick={() => onSort(key)}>{label}<SwapVertRounded aria-hidden="true" /></button></th>)}</tr></thead>
        <tbody>{items.map((item) => <tr key={item.id} onClick={() => onSelect(item.id)} className={item.id === selectedId ? 'store-order-row--selected' : ''}>
          <td><button type="button" aria-pressed={item.id === selectedId} onClick={(event) => { event.stopPropagation(); onSelect(item.id) }}>{item.id}</button></td>
          <td>{item.requestedDate}</td><td>{item.requirement}</td><td>{item.quantity}</td>
          <td><StatusBadge tone={orderStatusTones[item.statusVariant]}>{item.status}</StatusBadge></td>
        </tr>)}
        {!items.length && <tr><td colSpan={5} className="store-orders-empty">{loading ? <p role="status">Loading orders…</p> : !error && <p>No orders here yet.</p>}</td></tr>}</tbody>
      </table>
    </div>
    <div className="store-orders-footer">
      <span className="type-text-sm-regular" role="status">Showing {first}–{meta && items.length ? Math.min(first + items.length - 1, meta.total) : 0} of {meta?.total ?? 0} results</span>
      <nav className="store-orders-pagination" aria-label="Order pages">
        <Button size="xs" disabled={loading || current <= 1} leadingIcon={<ChevronLeftRounded />} onClick={() => onPage(current - 1)}>Previous</Button>
        {visiblePages.map((number) => <Button key={number} size="xs" variant={number === current ? 'primary' : 'outline'} aria-label={`Page ${number}`} aria-current={number === current ? 'page' : undefined} disabled={loading} onClick={() => onPage(number)}>{number}</Button>)}
        <Button size="xs" disabled={loading || current >= pages} trailingIcon={<ChevronRightRounded />} onClick={() => onPage(current + 1)}>Next</Button>
        <Select controlSize="sm" aria-label="Orders per page" value={limit} onChange={(event) => onLimit(Number(event.target.value))}>{[6, 10, 20, 50].map((size) => <option key={size} value={size}>{size} per page</option>)}</Select>
      </nav>
    </div>
  </section>
}
