import { Search, ChevronLeft, ChevronRight } from 'lucide-react'
import type { Paginated } from '@/lib/api-client'
import { statusStyles } from '../../order-format'

export interface OrderTableRow {
  id: string
  requestedDate: string
  requirement: string
  quantity: string
  status: string
  statusVariant: 'yellow' | 'green' | 'red' | 'gray'
}

interface OrdersTableProps<Tab extends string> {
  items: OrderTableRow[]
  selectedId: string | null
  onSelect: (id: string) => void
  tabs: readonly Tab[]
  tab: Tab
  onTab: (tab: Tab) => void
  search: string
  onSearch: (search: string) => void
  loading: boolean
  error: string
  onRetry: () => void
  meta: Paginated<unknown>['meta'] | null
  onPage: (page: number) => void
}

export function OrdersTable<Tab extends string>({ items, selectedId, onSelect, tabs, tab, onTab, search, onSearch, loading, error, onRetry, meta, onPage }: OrdersTableProps<Tab>) {
  const first = meta ? (meta.page - 1) * meta.limit + 1 : 0
  return (
    <div className="flex-1 bg-white rounded-xl border border-neutral-200 shadow-sm flex flex-col overflow-hidden">
      {/* Header & Controls */}
      <div className="p-5 flex flex-col gap-4 border-b border-neutral-200">
        <h2 className="text-stone-900 text-2xl font-medium font-sans">Recent orders</h2>

        <div className="flex justify-between items-center mt-1">
          {/* Tabs */}
          <div className="flex p-1 bg-neutral-100 rounded-xl gap-1" role="group" aria-label="Filter orders">
            {tabs.map((label) => (
              <button
                key={label}
                aria-pressed={tab === label}
                onClick={() => onTab(label)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium font-sans flex items-center gap-1.5 ${tab === label ? 'bg-white shadow-sm text-stone-900' : 'text-stone-600 hover:bg-neutral-200'}`}
              >
                {label} {tab === label && meta && <span className="text-stone-400">{meta.total}</span>}
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="relative w-64">
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
      </div>

      {/* Table Area */}
      <div className="overflow-x-auto flex-1">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-neutral-100 border-b border-neutral-200">
              <th className="font-medium text-stone-500 text-sm py-3 px-6 w-[20%]">Order</th>
              <th className="font-medium text-stone-500 text-sm py-3 px-4 w-[20%]">Requested date</th>
              <th className="font-medium text-stone-500 text-sm py-3 px-4 w-[20%]">Requirement</th>
              <th className="font-medium text-stone-500 text-sm py-3 px-4 w-[20%]">Quantity</th>
              <th className="font-medium text-stone-500 text-sm py-3 px-4 w-[20%]">Status</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => {
              const isSelected = item.id === selectedId
              return (
                <tr
                  key={item.id}
                  onClick={() => onSelect(item.id)}
                  className={`border-b border-neutral-200 cursor-pointer transition-colors relative ${isSelected ? 'bg-yellow-50' : 'hover:bg-neutral-50'}`}
                >
                  <td className="py-3 px-6 text-stone-900 text-sm font-sans relative">
                    {isSelected && <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-yellow-500" />}
                    <button aria-pressed={isSelected} onClick={() => onSelect(item.id)}>
                      {item.id}
                    </button>
                  </td>
                  <td className="py-3 px-4 text-stone-900 text-sm font-sans">{item.requestedDate}</td>
                  <td className="py-3 px-4 text-stone-900 text-sm font-sans">{item.requirement}</td>
                  <td className="py-3 px-4 text-stone-900 text-sm font-sans">{item.quantity}</td>
                  <td className="py-3 px-4">
                    <span className={`px-2.5 py-1 rounded-full text-[11px] font-medium font-sans whitespace-nowrap ${statusStyles[item.statusVariant]}`}>{item.status}</span>
                  </td>
                </tr>
              )
            })}
            {!items.length && (
              <tr>
                <td colSpan={5} className="py-12 px-6 text-center text-sm font-sans text-stone-500">
                  {loading ? (
                    <p role="status">Loading orders…</p>
                  ) : error ? (
                    <div className="flex flex-col items-center gap-3">
                      <p role="alert">{error}</p>
                      <button onClick={onRetry} className="h-9 px-3 bg-white border border-neutral-200 rounded-md text-stone-800 text-sm font-medium hover:bg-neutral-50">
                        Try again
                      </button>
                    </div>
                  ) : (
                    <p>No orders here yet.</p>
                  )}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      {meta && meta.total > 0 && (
        <div className="p-3 bg-neutral-50 border-t border-neutral-200 flex justify-between items-center">
          <span className="text-stone-500 text-sm font-sans px-3" role="status">
            Showing {first}–{Math.min(first + items.length - 1, meta.total)} of {meta.total} results
          </span>
          <div className="flex items-center gap-2">
            <button
              disabled={meta.page <= 1}
              onClick={() => onPage(meta.page - 1)}
              className="h-9 px-3 bg-white border border-neutral-200 rounded-md text-stone-800 text-sm font-medium flex items-center gap-1 hover:bg-neutral-50 disabled:opacity-50"
            >
              <ChevronLeft className="w-4 h-4" /> Previous
            </button>
            <span className="text-stone-600 text-sm font-sans px-1">
              Page {meta.page} of {meta.totalPages}
            </span>
            <button
              disabled={meta.page >= meta.totalPages}
              onClick={() => onPage(meta.page + 1)}
              className="h-9 px-3 bg-white border border-neutral-200 rounded-md text-stone-800 text-sm font-medium flex items-center gap-1 hover:bg-neutral-50 disabled:opacity-50"
            >
              Next <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
