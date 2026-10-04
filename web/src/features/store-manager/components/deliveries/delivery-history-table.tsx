import { useState } from 'react'
import SearchRounded from '@mui/icons-material/SearchRounded'
import SwapVertRounded from '@mui/icons-material/SwapVertRounded'
import ChevronLeftRounded from '@mui/icons-material/ChevronLeftRounded'
import ChevronRightRounded from '@mui/icons-material/ChevronRightRounded'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { IconButton } from '@/components/ui/icon-button'
import { StatusBadge, type StatusBadgeProps } from '@/components/ui/status-badge'
import { DeliveryDateFilter } from './delivery-date-filter'
import type { DeliveryHistoryItem } from '@/features/store-manager/types'
import type { DeliveryStage } from '@/features/store-manager/api'
import type { Paginated } from '@/lib/api-client'

export type DeliveryTab = 'all' | DeliveryStage
const tabs: { key: DeliveryTab; label: string }[] = [
  { key: 'all', label: 'All' }, { key: 'upcoming', label: 'Upcoming' },
  { key: 'awaiting', label: 'Awaiting confirmation' }, { key: 'completed', label: 'Completed' },
]
const tones: Record<DeliveryHistoryItem['statusVariant'], StatusBadgeProps['tone']> = {
  yellow: 'warning', green: 'success', red: 'error', blue: 'info', default: 'neutral',
}
type HistoryRow = DeliveryHistoryItem & { sortDate?: string }
type SortKey = 'id' | 'requirement' | 'deliveryDate' | 'latestUpdate' | 'status'
const columns: { key: SortKey; label: string }[] = [
  { key: 'id', label: 'Order ID' }, { key: 'requirement', label: 'Requirement' },
  { key: 'deliveryDate', label: 'Delivery date' }, { key: 'latestUpdate', label: 'Arrival / latest update' },
  { key: 'status', label: 'Status' },
]
interface DeliveryHistoryTableProps {
  items: HistoryRow[]
  selectedId: string | null
  onSelect: (id: string) => void
  counts: Record<DeliveryTab, number> | null
  tab: DeliveryTab
  onTab: (tab: DeliveryTab) => void
  search: string
  onSearch: (search: string) => void
  date: string
  onDate: (date: string) => void
  loading: boolean
  error: string
  onRetry: () => void
  meta: Paginated<unknown>['meta'] | null
  onPage: (page: number) => void
}

export function DeliveryHistoryTable({ items, selectedId, onSelect, counts, tab, onTab, search, onSearch, date, onDate, loading, error, onRetry, meta, onPage }: DeliveryHistoryTableProps) {
  const [sort, setSort] = useState<{ key: SortKey; descending: boolean } | null>(null)
  const visible = [...items]
  if (sort) visible.sort((a, b) => {
    const left = sort.key === 'deliveryDate' ? a.sortDate ?? a.deliveryDate : a[sort.key]
    const right = sort.key === 'deliveryDate' ? b.sortDate ?? b.deliveryDate : b[sort.key]
    const comparison = left.localeCompare(right, undefined, { numeric: true })
    return sort.descending ? -comparison : comparison
  })
  return (
    <section className="store-delivery-history" aria-label="Delivery history">
      <div className="store-delivery-history-heading">
        <h2 className="type-display-md-medium">Delivery history</h2>
        <div className="store-delivery-search">
          <SearchRounded aria-hidden="true" />
          <Input controlSize="sm" aria-label="Search order ID" placeholder="Search order ID" value={search} onChange={(event) => onSearch(event.target.value)} />
        </div>
      </div>
      <div className="store-delivery-history-toolbar">
        <div className="store-delivery-tabs" role="group" aria-label="Filter deliveries">
          {tabs.map(({ key, label }) => (
            <button key={key} type="button" aria-pressed={tab === key} onClick={() => onTab(key)} className="type-text-sm-regular">
              {label}{counts && <span>{counts[key]}</span>}
            </button>
          ))}
        </div>
        <DeliveryDateFilter date={date} onDate={onDate} />
      </div>
      <div className="store-delivery-table-scroll">
        <table className="store-delivery-table">
          <caption className="sr-only">Deliveries to your outlet. Column sorting applies to the displayed page.</caption>
          <thead><tr>
            {columns.map(({ key, label }) => <th key={key} scope="col" aria-sort={sort?.key === key ? sort.descending ? 'descending' : 'ascending' : 'none'}>
              <button type="button" className="type-text-sm-medium" onClick={() => setSort({ key, descending: sort?.key === key && !sort.descending })}>{label}<SwapVertRounded aria-hidden="true" /></button>
            </th>)}
          </tr></thead>
          <tbody>
            {(loading || error || items.length === 0) && <tr><td colSpan={5} className="store-delivery-table-state type-text-sm-regular">
              {loading ? <span role="status">Loading deliveries…</span> : error ? <div role="alert"><p>{error}</p><Button size="xs" onClick={onRetry}>Try again</Button></div> : 'No deliveries match these filters.'}
            </td></tr>}
            {!loading && !error && visible.map((item) => <tr key={item.id} onClick={() => onSelect(item.id)} className={item.id === selectedId ? 'store-delivery-row--selected' : ''}>
              <td><button type="button" aria-label={`View delivery ${item.id}`} aria-pressed={item.id === selectedId} aria-controls="store-delivery-details" className="type-text-xs-regular">{item.id}</button></td>
              <td>{item.requirement}</td><td>{item.deliveryDate}</td><td title={item.latestUpdate}>{item.latestUpdate}</td>
              <td><StatusBadge tone={tones[item.statusVariant]}>{item.status}</StatusBadge></td>
            </tr>)}
          </tbody>
        </table>
      </div>
      <div className="store-delivery-history-footer type-text-sm-regular">
        <span>{meta?.total ?? 0} {meta?.total === 1 ? 'delivery' : 'deliveries'}</span>
        {meta && meta.totalPages > 1 && <div className="store-delivery-pagination">
          <IconButton size="sm" aria-label="Previous page" disabled={meta.page <= 1} onClick={() => onPage(meta.page - 1)}><ChevronLeftRounded /></IconButton>
          <span>Page {meta.page} of {meta.totalPages}</span>
          <IconButton size="sm" aria-label="Next page" disabled={meta.page >= meta.totalPages} onClick={() => onPage(meta.page + 1)}><ChevronRightRounded /></IconButton>
        </div>}
      </div>
    </section>
  )
}
