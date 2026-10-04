import { apiRequest, type Paginated } from '@/lib/api-client'
import { API_ENDPOINTS } from '@/lib/api-endpoints'

export type NotificationSeverity = 'error' | 'warning' | 'success' | 'info'

// A notification as GET /notifications returns it. `data` holds the ids of
// what it is about (orderId, tripId, issueId, date, depot).
export interface ApiNotification {
  id: string
  type: string
  severity: NotificationSeverity
  title: string
  body: string
  data: Record<string, string>
  read: boolean
  createdAt: string
}

// ponytail: the panels show the newest 50; add paging if people need to scroll further back.
export async function fetchNotifications(token: string): Promise<ApiNotification[]> {
  const result = await apiRequest<Paginated<ApiNotification>>(API_ENDPOINTS.notifications.list, { token, params: { limit: 50 } })
  return result.items
}

export async function markNotificationRead(token: string, id: string): Promise<void> {
  await apiRequest(API_ENDPOINTS.notifications.read(id), { method: 'POST', token })
}

export async function markAllNotificationsRead(token: string): Promise<void> {
  await apiRequest(API_ENDPOINTS.notifications.readAll, { method: 'POST', token })
}

// "Just now", "5 min ago", "2h ago", "3d ago", then the date.
export function timeAgo(iso: string, now: number = Date.now()): string {
  const minutes = Math.floor((now - new Date(iso).getTime()) / 60_000)
  if (minutes < 1) return 'Just now'
  if (minutes < 60) return `${minutes} min ago`
  if (minutes < 24 * 60) return `${Math.floor(minutes / 60)}h ago`
  if (minutes < 7 * 24 * 60) return `${Math.floor(minutes / (24 * 60))}d ago`
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}
