import { Button } from '@/components/ui/shadcn/button'
import { Input } from '@/components/ui/shadcn/input'
import { Filter, ArrowUpDown, Search } from 'lucide-react'
import { useState } from 'react'

export type RecentOrdersTab = 'upcoming' | 'awaiting' | 'deferred'

const tabLabels: Record<'all' | RecentOrdersTab, string> = { all: 'All', upcoming: 'Upcoming', awaiting: 'Awaiting confirmation', deferred: 'Deferred' }

export interface OrderRow {
  key: number
  id: string
  date: string
  requirement: string
  quantity: string
  status: string
  statusColor: string
  actionText: string
  onAction: () => void
  // The tabs, besides All, that list this order.
  tabs: RecentOrdersTab[]
}

interface RecentOrdersTableProps {
  orders: OrderRow[]
  onViewAll?: () => void
}

export function RecentOrdersTable({ orders, onViewAll }: RecentOrdersTableProps) {
  const [tab, setTab] = useState<'all' | RecentOrdersTab>('all')
  const [search, setSearch] = useState('')
  const inTab = (order: OrderRow, key: 'all' | RecentOrdersTab) => key === 'all' || order.tabs.includes(key)
  const term = search.trim().toLowerCase()
  const visible = orders.filter((order) => inTab(order, tab) && order.id.toLowerCase().includes(term))

  return (
    <div className="flex-1 bg-white rounded-xl border border-gray-200 flex flex-col gap-4 overflow-hidden shadow-sm p-4">
      <div className="flex justify-between items-center">
        <h3 className="text-stone-900 text-4xl font-medium">Recent orders</h3>
        <Button variant="ghost" onClick={onViewAll} className="text-neutral-700 font-semibold gap-2">
          View all orders <span className="text-xl">→</span>
        </Button>
      </div>

      {/* Tabs and Search Filters */}
      <div className="flex justify-between items-center px-2">
        <div className="p-1 bg-neutral-100 rounded-[10px] flex gap-1">
          {(Object.keys(tabLabels) as (keyof typeof tabLabels)[]).map((key) => (
            <button
              key={key}
              type="button"
              aria-pressed={tab === key}
              onClick={() => setTab(key)}
              className={`px-3 py-2 rounded-lg text-sm ${tab === key ? 'bg-white shadow-sm font-medium' : 'text-stone-600 font-normal cursor-pointer'}`}
            >
              {tabLabels[key]} ({orders.filter((order) => inTab(order, key)).length})
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" className="h-9 gap-2">
            <Filter className="h-4 w-4" /> Filter
          </Button>
          <div className="relative w-72">
            <Search className="absolute left-3 top-3 h-4 w-4 text-neutral-400" />
            <Input placeholder="Search order ID" value={search} onChange={(event) => setSearch(event.target.value)} className="pl-9 h-10" />
          </div>
        </div>
      </div>

      {/* Table Structure */}
      <div className="border border-neutral-200 rounded-lg overflow-hidden">
        <div className="grid grid-cols-5 bg-neutral-100 h-10 px-4 items-center text-sm font-medium text-stone-600 border-b border-neutral-200">
          <div className="flex items-center gap-1">
            Order ID <ArrowUpDown className="h-3 w-3" />
          </div>
          <div className="flex items-center gap-1">
            Requested date <ArrowUpDown className="h-3 w-3" />
          </div>
          <div className="flex items-center gap-1">
            Requirement <ArrowUpDown className="h-3 w-3" />
          </div>
          <div className="flex items-center gap-1">
            Quantity <ArrowUpDown className="h-3 w-3" />
          </div>
          <div className="flex items-center gap-1">
            Status & Action <ArrowUpDown className="h-3 w-3" />
          </div>
        </div>

        {visible.length === 0 && <p className="h-12 px-4 flex items-center text-xs text-stone-500">No orders to show.</p>}
        {visible.map((order) => (
          <div key={order.key} className="grid grid-cols-5 h-12 px-4 items-center text-xs border-b border-neutral-200 hover:bg-neutral-50">
            <span className="font-medium text-stone-900">{order.id}</span>
            <span className="text-stone-600">{order.date}</span>
            <span className="text-stone-600">{order.requirement}</span>
            <span className="text-stone-600">{order.quantity}</span>
            <div className="flex justify-between items-center">
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${order.statusColor}`}>{order.status}</span>
              <button type="button" onClick={order.onAction} className="text-blue-600 font-medium cursor-pointer hover:underline">
                {order.actionText}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
