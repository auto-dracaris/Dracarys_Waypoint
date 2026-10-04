import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Dialog, DialogContent, DialogTrigger, DialogClose } from '@/components/ui/shadcn/dialog'
import { Button } from '@/components/ui/shadcn/button'
import { AlertCircle, AlertTriangle, CheckCircle2, Info, ArrowRight, Bell, X } from 'lucide-react'
import { timeAgo, type ApiNotification, type NotificationSeverity } from '@/features/notifications/api'
import { useNotifications } from '@/features/notifications/use-notifications'

const tabs = ['All', 'Errors', 'Success', 'Info'] as const
type Tab = (typeof tabs)[number]

const inTab = (item: ApiNotification, tab: Tab) => tab === 'All' || (tab === 'Errors' ? item.severity === 'error' || item.severity === 'warning' : item.severity === tab.toLowerCase())

// Token styling matching the Figma definitions.
const containerStyles: Record<NotificationSeverity, string> = {
  error: 'bg-red-50 outline-red-100',
  warning: 'bg-yellow-50 outline-yellow-300',
  success: 'bg-emerald-50 outline-lime-200',
  info: 'bg-indigo-50 outline-lime-200',
}

function SeverityIcon({ severity }: { severity: NotificationSeverity }) {
  if (severity === 'error') return <AlertCircle className="h-6 w-6 text-red-700 shrink-0 mt-0.5" />
  const [wrap, icon] = {
    warning: ['bg-orange-50', <AlertTriangle key="icon" className="h-5 w-5 text-amber-600" />],
    success: ['bg-green-100', <CheckCircle2 key="icon" className="h-5 w-5 text-green-600" />],
    info: ['bg-blue-100', <Info key="icon" className="h-5 w-5 text-blue-500" />],
  }[severity]
  return <div className={`h-8 w-8 ${wrap} rounded-2xl flex justify-center items-center shrink-0`}>{icon}</div>
}

// The header's bell: the store manager's notifications, with the unread count on it.
export function NotificationDialog() {
  const navigate = useNavigate()
  const { items, unreadCount, read, refresh } = useNotifications()
  const [open, setOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<Tab>('All')
  const visible = items.filter((item) => inTab(item, activeTab))

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (next) refresh()
        setOpen(next)
      }}
    >
      <DialogTrigger render={<Button variant="outline" size="icon" className="relative h-10 w-10 bg-white border-neutral-200" />}>
        <Bell className="h-5 w-5 text-stone-800" />
        {unreadCount > 0 && (
          <span className="absolute -top-1.5 -right-1.5 min-w-5 h-5 px-1 rounded-full bg-red-500 text-white text-xs font-semibold flex items-center justify-center" aria-hidden>
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
        <span className="sr-only">{unreadCount ? `Notifications, ${unreadCount} unread` : 'Notifications'}</span>
      </DialogTrigger>

      {/* Expanded max-w-2xl width so elements don't feel squished */}
      <DialogContent className="w-full sm:max-w-2xl max-h-[85vh] overflow-y-auto p-0 bg-neutral-50 rounded-2xl border-0 shadow-xl [&>button]:hidden">
        {/* Top Header */}
        <div className="self-stretch h-11 px-4 bg-white border-b border-gray-200 flex justify-between items-center">
          <div className="text-gray-800 text-sm font-medium">Notification</div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => read()}
              disabled={unreadCount === 0}
              className="p-1 text-blue-600 text-sm font-semibold underline hover:text-blue-700 transition-colors disabled:text-neutral-400 disabled:no-underline"
            >
              Mark All Read
            </button>
            <DialogClose className="p-1 rounded-md border border-neutral-300 text-neutral-600 hover:bg-neutral-100 transition-colors">
              <X className="h-4 w-4" />
              <span className="sr-only">Close</span>
            </DialogClose>
          </div>
        </div>

        {/* Filter Tabs Container */}
        <div className="px-4 py-3 bg-neutral-50">
          <div className="p-1 bg-neutral-200/70 rounded-[10px] flex justify-between items-center">
            {tabs.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                aria-pressed={activeTab === tab}
                className={`flex-1 px-3 py-2 rounded-lg flex justify-center items-center gap-1.5 transition-all ${activeTab === tab ? 'bg-white shadow-sm' : ''}`}
              >
                <span className={`text-sm ${activeTab === tab ? 'font-medium text-slate-900' : 'font-normal text-neutral-600'}`}>{tab}</span>
                <span className="text-sm text-neutral-400">{items.filter((item) => inTab(item, tab)).length}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Notifications List */}
        <div className="px-4 pb-4 flex flex-col gap-3">
          {visible.length === 0 && <p className="py-8 text-center text-sm text-neutral-500">No {activeTab === 'All' ? '' : `${activeTab.toLowerCase()} `}notifications.</p>}
          {visible.map((item) => (
            <div key={item.id} className={`w-full rounded-xl outline outline-1 outline-offset-[-1px] ${containerStyles[item.severity]} flex flex-col justify-start overflow-hidden`}>
              {/* Notification Main Content Row */}
              <div className="p-3 flex justify-between items-start gap-3 relative">
                <SeverityIcon severity={item.severity} />

                {/* Text Header & Body */}
                <div className="flex-1 flex flex-col gap-1">
                  <div className="text-slate-900 text-sm font-bold leading-5">{item.title}</div>
                  <div className="text-neutral-600 text-sm font-normal leading-5">{item.body}</div>
                </div>

                {/* Time & Unread Blue Dot */}
                <div className="flex flex-col items-end gap-1.5 shrink-0">
                  <span className="text-neutral-400 text-xs">{timeAgo(item.createdAt)}</span>
                  {!item.read && (
                    <button onClick={() => read(item.id)} className="p-1.5 -m-1.5" aria-label={`Mark ${item.title} as read`}>
                      <span className="block h-1.5 w-1.5 bg-blue-500 rounded-full" />
                    </button>
                  )}
                </div>
              </div>

              {/* Every store-manager notification that names an order leads to the orders list. */}
              {item.data.orderId && (
                <div className="p-3 pt-0 flex justify-end">
                  <button
                    onClick={() => {
                      read(item.id)
                      setOpen(false)
                      navigate('/store-manager/orders')
                    }}
                    className="flex items-center gap-2 text-sm font-semibold underline text-amber-600 hover:text-amber-700"
                  >
                    View order {item.data.orderId}
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}
