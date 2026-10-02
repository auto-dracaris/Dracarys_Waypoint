export type NotificationFilter = 'All' | 'Errors' | 'Success' | 'Info'
export type NotificationItem = {
  id: string
  kind: 'error' | 'warning' | 'success' | 'info'
  title: string
  description: string
  time: string
  read: boolean
  actionLabel: string
  target: { page: 'Orders'; orderId: string } | { page: string; orderId?: never }
  facts?: { label: string; value: string }[]
}

export const notificationFilters: NotificationFilter[] = ['All', 'Errors', 'Success', 'Info']

// Only the four populated cards supplied by Figma; counts follow these records.
export const initialNotifications: NotificationItem[] = [
  {
    id: 'loading-shortfall-DEMO-103', kind: 'error', read: false,
    title: 'Loading shortfall reported', time: '5 min ago',
    description: 'The loading team reported missing items for DEMO-103. Review the quantities and decide the next action.',
    facts: [
      { label: 'Order', value: 'DEMO-103' }, { label: 'Reported by', value: 'Loading team' },
      { label: 'Run', value: 'Earlier run · 26 Sep 2026' }, { label: 'Status', value: 'Awaiting review' },
    ],
    actionLabel: 'View order DEMO-103', target: { page: 'Orders', orderId: 'DEMO-103' },
  },
  {
    id: 'chilled-vehicle-DEMO-108', kind: 'warning', read: false,
    title: 'Chilled order needs a vehicle', time: '8 min ago',
    description: 'DEMO-108 requires a refrigerated van. The current allocation cannot accommodate it.',
    actionLabel: 'Reassign Vehicle', target: { page: 'Orders', orderId: 'DEMO-108' },
  },
  {
    id: 'delivery-confirmed-DEMO-109', kind: 'success', read: false,
    title: 'DEMO-109 delivery confirmed', time: '2h ago',
    description: 'Customer signed off at 14:32. All 18 items received in good condition.',
    actionLabel: 'View delivery', target: { page: 'Delivery details · DEMO-109' },
  },
  {
    id: 'late-departure-R-042', kind: 'info', read: false,
    title: 'Late departure – Run R-042', time: '3h ago',
    description: 'Vehicle left depot 22 min behind schedule. ETA for first drop updated.',
    actionLabel: 'View run', target: { page: 'Run R-042 details' },
  },
]

export function filterNotifications(items: NotificationItem[], filter: NotificationFilter) {
  return items.filter(item => filter === 'All' || (filter === 'Errors'
    ? item.kind === 'error' || item.kind === 'warning'
    : item.kind === filter.toLowerCase()))
}

export function markNotificationsRead(items: NotificationItem[], id?: string) {
  return items.map(item => !item.read && (id === undefined || item.id === id) ? { ...item, read: true } : item)
}
