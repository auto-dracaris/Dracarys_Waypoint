import { useState } from 'react'
import { Dialog, DialogContent, DialogTrigger, DialogClose } from '@/components/ui/shadcn/dialog'
import { Button } from '@/components/ui/shadcn/button'
import { AlertCircle, AlertTriangle, CheckCircle2, Info, ArrowRight, X } from 'lucide-react'

type NotificationType = 'error' | 'warning' | 'success' | 'info'

interface NotificationItem {
  id: string
  type: NotificationType
  title: string
  time: string
  unread: boolean
  actionNeeded?: boolean
  description?: string
  details?: {
    order?: string
    reportedBy?: string
    run?: string
    status?: string
  }
  actionText?: string
}

const initialNotifications: NotificationItem[] = [
  {
    id: '1',
    type: 'error',
    title: 'Loading shortfall reported',
    time: '5 min ago',
    unread: true,
    actionNeeded: true,
    description: 'The loading team reported missing items for DEMO-103. Review the quantities and decide the next action.',
    details: {
      order: 'DEMO-103',
      reportedBy: 'Loading team',
      run: 'Earlier run · 26 Sep 2026',
      status: 'Awaiting review',
    },
    actionText: 'View order DEMO-103',
  },
  {
    id: '2',
    type: 'warning',
    title: 'Chilled order needs a vehicle',
    time: '8 min ago',
    unread: true,
    description: 'DEMO-108 requires a refrigerated van. The current allocation cannot accommodate it.',
    actionText: 'Reassign Vehicle',
  },
  {
    id: '3',
    type: 'success',
    title: 'DEMO-109 delivery confirmed',
    time: '2h ago',
    unread: true,
    description: 'Customer signed off at 14:32. All 18 items received in good condition.',
    actionText: 'Reassign Vehicle',
  },
  {
    id: '4',
    type: 'info',
    title: 'Late departure – Run R-042',
    time: '3h ago',
    unread: true,
    description: 'Vehicle left depot 22 min behind schedule. ETA for first drop updated.',
    actionText: 'Reassign Vehicle',
  },
]

export function NotificationDialog() {
  const [notifications, setNotifications] = useState<NotificationItem[]>(initialNotifications)
  const [activeTab, setActiveTab] = useState<'All' | 'Errors' | 'Success' | 'Info'>('All')

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, unread: false })))
  }

  const filteredNotifications = notifications.filter((n) => {
    if (activeTab === 'Errors') return n.type === 'error' || n.type === 'warning'
    if (activeTab === 'Success') return n.type === 'success'
    if (activeTab === 'Info') return n.type === 'info'
    return true
  })

  const errorCount = notifications.filter((n) => n.type === 'error' || n.type === 'warning').length
  const successCount = notifications.filter((n) => n.type === 'success').length
  const infoCount = notifications.filter((n) => n.type === 'info').length

  return (
    <Dialog>
      <DialogTrigger>
        <Button variant="outline">Open Notifications</Button>
      </DialogTrigger>

      {/* Expanded max-w-2xl width so elements don't feel squished */}
      <DialogContent className="w-full sm:max-w-2xl max-h-[85vh] overflow-y-auto p-0 bg-neutral-50 rounded-2xl border-0 shadow-xl [&>button]:hidden">
        {/* Top Header */}
        <div className="self-stretch h-11 px-4 bg-white border-b border-gray-200 flex justify-between items-center">
          <div className="text-gray-800 text-sm font-medium">Notification</div>
          <div className="flex items-center gap-3">
            <button onClick={markAllAsRead} className="p-1 text-blue-600 text-sm font-semibold underline hover:text-blue-700 transition-colors">
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
            <button
              onClick={() => setActiveTab('All')}
              className={`flex-1 px-3 py-2 rounded-lg flex justify-center items-center gap-1.5 transition-all ${activeTab === 'All' ? 'bg-white shadow-sm' : ''}`}
            >
              <span className="text-sm font-medium text-slate-900">All</span>
              <span className="text-sm text-neutral-400">{notifications.length}</span>
            </button>
            <button
              onClick={() => setActiveTab('Errors')}
              className={`flex-1 px-3 py-2 rounded-lg flex justify-center items-center gap-1.5 transition-all ${activeTab === 'Errors' ? 'bg-white shadow-sm' : ''}`}
            >
              <span className="text-sm font-normal text-neutral-600">Errors</span>
              <span className="text-sm text-neutral-400">{errorCount}</span>
            </button>
            <button
              onClick={() => setActiveTab('Success')}
              className={`flex-1 px-3 py-2 rounded-lg flex justify-center items-center gap-1.5 transition-all ${activeTab === 'Success' ? 'bg-white shadow-sm' : ''}`}
            >
              <span className="text-sm font-normal text-neutral-600">Success</span>
              <span className="text-sm text-neutral-400">{successCount}</span>
            </button>
            <button
              onClick={() => setActiveTab('Info')}
              className={`flex-1 px-3 py-2 rounded-lg flex justify-center items-center gap-1.5 transition-all ${activeTab === 'Info' ? 'bg-white shadow-sm' : ''}`}
            >
              <span className="text-sm font-normal text-neutral-600">Info</span>
              <span className="text-sm text-neutral-400">{infoCount}</span>
            </button>
          </div>
        </div>

        {/* Notifications List */}
        <div className="px-4 pb-4 flex flex-col gap-3">
          {filteredNotifications.map((item) => {
            // Map token styling matching your exact Figma definitions
            const containerStyles = {
              error: 'bg-red-50 outline-red-100',
              warning: 'bg-yellow-50 outline-yellow-300',
              success: 'bg-emerald-50 outline-lime-200',
              info: 'bg-indigo-50 outline-lime-200',
            }[item.type]

            return (
              <div key={item.id} className={`w-full rounded-xl outline outline-1 outline-offset-[-1px] ${containerStyles} flex flex-col justify-start overflow-hidden`}>
                {/* Notification Main Content Row */}
                <div className="p-3 flex justify-between items-start gap-3 relative">
                  {/* Icon Representation */}
                  {item.type === 'error' && <AlertCircle className="h-6 w-6 text-red-700 shrink-0 mt-0.5" />}
                  {item.type === 'warning' && (
                    <div className="h-8 w-8 bg-orange-50 rounded-2xl flex justify-center items-center shrink-0">
                      <AlertTriangle className="h-5 w-5 text-amber-600" />
                    </div>
                  )}
                  {item.type === 'success' && (
                    <div className="h-8 w-8 bg-green-100 rounded-2xl flex justify-center items-center shrink-0">
                      <CheckCircle2 className="h-5 w-5 text-green-600" />
                    </div>
                  )}
                  {item.type === 'info' && (
                    <div className="h-8 w-8 bg-blue-100 rounded-2xl flex justify-center items-center shrink-0">
                      <Info className="h-5 w-5 text-blue-500" />
                    </div>
                  )}

                  {/* Text Header & Body */}
                  <div className="flex-1 flex flex-col gap-1">
                    <div className="text-slate-900 text-sm font-bold leading-5">{item.title}</div>

                    {item.actionNeeded && <div className="text-red-600 text-xs font-semibold">Action needed</div>}

                    <div className="text-neutral-600 text-sm font-normal leading-5">{item.description}</div>
                  </div>

                  {/* Time & Unread Blue Dot */}
                  <div className="flex flex-col items-end gap-1.5 shrink-0">
                    <span className="text-neutral-400 text-xs">{item.time}</span>
                    {item.unread && <div className="h-1.5 w-1.5 bg-blue-500 rounded-full" />}
                  </div>
                </div>

                {/* Complex Card Sub-box (e.g. DEMO-103 view) */}
                {item.details && (
                  <div className="px-2 pb-2">
                    <div className="p-3 bg-neutral-50 rounded-lg outline outline-1 outline-offset-[-1px] outline-red-200 flex flex-col gap-4">
                      <div className="grid grid-cols-2 gap-y-3 text-xs">
                        <div>
                          <span className="text-neutral-400 block font-medium">Order</span>
                          <span className="font-semibold text-slate-900">{item.details.order}</span>
                        </div>
                        <div>
                          <span className="text-neutral-400 block font-medium">Reported by</span>
                          <span className="font-semibold text-slate-900">{item.details.reportedBy}</span>
                        </div>
                        <div>
                          <span className="text-neutral-400 block font-medium">Run</span>
                          <span className="font-semibold text-slate-900">{item.details.run}</span>
                        </div>
                        <div>
                          <span className="text-neutral-400 block font-medium">Status</span>
                          <span className="font-semibold text-slate-900">{item.details.status}</span>
                        </div>
                      </div>

                      <Button className="w-full bg-red-500 hover:bg-red-600 text-white font-semibold h-9 rounded-sm">
                        {item.actionText} <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}

                {/* Standard Link Action Button for Warnings/Success/Info */}
                {item.actionText && !item.details && (
                  <div className="p-3 pt-0 flex justify-end">
                    <button className="flex items-center gap-2 text-sm font-semibold underline text-amber-600 hover:text-amber-700">
                      {item.actionText}
                      <ArrowRight className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </DialogContent>
    </Dialog>
  )
}
