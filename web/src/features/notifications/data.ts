import { timeAgo, type ApiNotification } from './api'

export type NotificationFilter = 'All' | 'Errors' | 'Success' | 'Info'
export type NotificationItem = {
  id: string
  kind: 'error' | 'warning' | 'success' | 'info'
  title: string
  description: string
  time: string
  read: boolean
  // Absent when there is nothing to open, as for a type this app does not know.
  actionLabel?: string
  target?: { page: string; orderId?: string }
  facts?: { label: string; value: string }[]
}

export const notificationFilters: NotificationFilter[] = ['All', 'Errors', 'Success', 'Info']

const planTypes = new Set(['plan_draft_ready', 'plan_run_failed'])

// A server notification as the hub's card shows it, with where its action leads.
export function toNotificationItem(notification: ApiNotification): NotificationItem {
  const { orderId, date, depot } = notification.data
  const action = orderId
    ? { actionLabel: `View order ${orderId}`, target: { page: 'Orders', orderId } }
    : planTypes.has(notification.type)
      ? { actionLabel: 'Open planning', target: { page: 'Planning' } }
      : {}
  const facts = [...(orderId ? [{ label: 'Order', value: orderId }] : []), ...(depot ? [{ label: 'Depot', value: depot }] : []), ...(date ? [{ label: 'Date', value: date }] : [])]
  return {
    id: notification.id,
    kind: notification.severity,
    title: notification.title,
    description: notification.body,
    time: timeAgo(notification.createdAt),
    read: notification.read,
    ...action,
    ...(facts.length && { facts }),
  }
}

export function filterNotifications(items: NotificationItem[], filter: NotificationFilter) {
  return items.filter((item) => filter === 'All' || (filter === 'Errors' ? item.kind === 'error' || item.kind === 'warning' : item.kind === filter.toLowerCase()))
}
