import { Calendar, ChevronLeft, ChevronRight, Search, X } from 'lucide-react'
import type { DeliveryHistoryItem } from '@/features/store-manager/types'
import type { DeliveryStage } from '@/features/store-manager/api'
import type { Paginated } from '@/lib/api-client'

export type DeliveryTab = 'all' | DeliveryStage

const tabs: { key: DeliveryTab; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'upcoming', label: 'Upcoming' },
  { key: 'awaiting', label: 'Awaiting confirmation' },
  { key: 'completed', label: 'Completed' },
]

interface DeliveryHistoryTableProps {
  items: DeliveryHistoryItem[]
  selectedId: string | null
  onSelect: (id: string) => void
  counts: Record<DeliveryTab, number> | null
  tab: DeliveryTab
  onTab: (tab: DeliveryTab) => void
  search: string
  onSearch: (search: string) => void
  // YYYY-MM-DD, or empty for every day.
  date: string
  onDate: (date: string) => void
  loading: boolean
  error: string
  onRetry: () => void
  meta: Paginated<unknown>['meta'] | null
  onPage: (page: number) => void
}

export function DeliveryHistoryTable({ items, selectedId, onSelect, counts, tab, onTab, search, onSearch, date, onDate, loading, error, onRetry, meta, onPage }: DeliveryHistoryTableProps) {
  return (
    <div className="flex-2 bg-white rounded-xl border border-neutral-200 shadow-sm flex flex-col overflow-hidden">
      {/* Header & Controls */}
      <div className="p-6 flex flex-col gap-4 border-b border-neutral-200">
        <div className="flex justify-between items-center">
          <h2 className="text-stone-900 text-2xl font-medium font-sans">Delivery history</h2>
          <div className="relative w-72">
            <Search className="w-4 h-4 text-stone-400 absolute left-3 top-3" />
            <input
              type="text"
              placeholder="Search order ID"
              aria-label="Search order ID"
              value={search}
              onChange={(event) => onSearch(event.target.value)}
              className="w-full h-10 pl-9 pr-3 rounded-lg border border-neutral-300 text-sm font-sans outline-none focus:border-yellow-400"
            />
          </div>
        </div>

        <div className="flex justify-between items-center mt-2">
          {/* Tabs */}
          <div className="flex p-1 bg-neutral-100 rounded-xl gap-1" role="group" aria-label="Filter deliveries">
            {tabs.map(({ key, label }) => (
              <button
                key={key}
                type="button"
                aria-pressed={tab === key}
                onClick={() => onTab(key)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium font-sans flex gap-1.5 ${tab === key ? 'bg-white shadow-sm text-stone-900' : 'text-stone-600 hover:bg-neutral-200'}`}
              >
                {label} {counts && <span className="text-stone-400">{counts[key]}</span>}
              </button>
            ))}
          </div>

          {/* Date Filter */}
          <div className="flex items-center gap-1">
            <label className="h-9 px-3 border border-neutral-200 rounded-md text-stone-800 text-sm font-medium flex items-center gap-2 hover:bg-neutral-50 cursor-pointer">
              <Calendar className="w-4 h-4" />
              <span className="sr-only">Delivery date</span>
              {!date && <span aria-hidden="true">Delivery date</span>}
              <input type="date" value={date} onChange={(event) => onDate(event.target.value)} className={date ? 'bg-transparent outline-none' : 'w-0 opacity-0'} />
            </label>
            {date && (
              <button type="button" onClick={() => onDate('')} aria-label="Clear delivery date" className="h-9 w-9 flex items-center justify-center rounded-md text-stone-500 hover:bg-neutral-100">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Table Area */}
      <div className="overflow-x-auto flex-1">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-neutral-100 border-b border-neutral-200">
              <th className="font-medium text-stone-500 text-sm py-3 px-4 w-[20%]">Order ID ↑↓</th>
              <th className="font-medium text-stone-500 text-sm py-3 px-4 w-[15%]">Requirement ↑↓</th>
              <th className="font-medium text-stone-500 text-sm py-3 px-4 w-[20%]">Delivery date ↑↓</th>
              <th className="font-medium text-stone-500 text-sm py-3 px-4 w-[25%]">Arrival / latest update ↑↓</th>
              <th className="font-medium text-stone-500 text-sm py-3 px-4 w-[20%]">Status ↑↓</th>
            </tr>
          </thead>
          <tbody>
            {(loading || error || items.length === 0) && (
              <tr>
                <td colSpan={5} className="py-10 px-4 text-center text-stone-500 text-sm font-sans">
                  {loading ? (
                    'Loading deliveries…'
                  ) : error ? (
                    <span className="text-red-700">
                      {error}{' '}
                      <button type="button" onClick={onRetry} className="text-blue-600 font-medium hover:underline">
                        Try again
                      </button>
                    </span>
                  ) : (
                    'No deliveries match these filters.'
                  )}
                </td>
              </tr>
            )}
            {!loading &&
              !error &&
              items.map((item) => {
                const isSelected = item.id === selectedId
                const statusStyles = {
                  yellow: 'bg-yellow-100 text-yellow-700',
                  green: 'bg-lime-100 text-lime-700',
                  red: 'bg-red-100 text-red-700',
                  blue: 'bg-blue-100 text-blue-700',
                  default: 'bg-neutral-100 text-neutral-700',
                }[item.statusVariant]

                return (
                  <tr key={item.id} onClick={() => onSelect(item.id)} className={`border-b border-neutral-200 cursor-pointer transition-colors ${isSelected ? 'bg-yellow-50' : 'hover:bg-neutral-50'}`}>
                    {/* CRITICAL FIX: The yellow bar is now an absolute div inside the first td, keeping the column count at 5 */}
                    <td className="py-3 px-4 text-stone-900 text-sm font-sans relative">
                      {isSelected && <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-yellow-500" />}
                      {item.id}
                    </td>

                    <td className="py-3 px-4 text-stone-900 text-sm font-sans">{item.requirement}</td>
                    <td className="py-3 px-4 text-stone-900 text-sm font-sans">{item.deliveryDate}</td>
                    <td className="py-3 px-4 text-stone-900 text-sm font-sans">{item.latestUpdate}</td>
                    <td className="py-3 px-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium font-sans ${statusStyles}`}>{item.status}</span>
                    </td>
                  </tr>
                )
              })}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div className="p-3 bg-neutral-50 border-t border-neutral-200 text-stone-500 text-sm font-sans flex justify-between items-center">
        <span>
          {meta?.total ?? 0} {meta?.total === 1 ? 'delivery' : 'deliveries'}
        </span>
        {meta && meta.totalPages > 1 && (
          <div className="flex items-center gap-2">
            <button type="button" aria-label="Previous page" disabled={meta.page <= 1} onClick={() => onPage(meta.page - 1)} className="p-1 rounded hover:bg-neutral-200 disabled:opacity-40">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span>
              Page {meta.page} of {meta.totalPages}
            </span>
            <button type="button" aria-label="Next page" disabled={meta.page >= meta.totalPages} onClick={() => onPage(meta.page + 1)} className="p-1 rounded hover:bg-neutral-200 disabled:opacity-40">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
