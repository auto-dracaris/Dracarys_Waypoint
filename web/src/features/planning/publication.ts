import { getReviewedPlan, reviewedPlan } from './data'

export type NotificationStatus = 'Acknowledged' | 'Delivered' | 'Sent'
export interface TeamNotification {
  id: string
  name: string
  role: string
  assignment: string
  status: NotificationStatus
  sentLabel?: string
}
export interface PublishedPlan {
  plan: typeof reviewedPlan
  version: string
  nextVersion: string
  publishedDate: string
  publishedTime: string
  depot: string
  notifications: TeamNotification[]
}

// Publication metadata and notification statuses are Figma demo fixtures.
// These helpers never dispatch a plan or send a notification.
export function createPublishedPlan(date: string): { publication: PublishedPlan | null; error: string | null } {
  const plan = getReviewedPlan(date)
  if (!plan || plan.issues > 0) return { publication: null, error: 'A reviewed plan without unresolved issues is required.' }
  const assignment = (vehicleId: string) => {
    const route = plan.routes.find(item => item.vehicleId === vehicleId)!
    return `${route.trip} - ${route.vehicleType}`
  }
  return { publication: {
    plan: { ...plan, routes: plan.routes.map(route => ({ ...route, stops: route.stops.map(stop => ({ ...stop })) })), deferred: plan.deferred.map(order => ({ ...order })), constraints: [...plan.constraints] },
    version: 'v2.1', nextVersion: 'v2.2', publishedDate: '2026-09-28', publishedTime: '05:42 AM', depot: 'Peliyagoda Hub',
    notifications: [
      { id: 'loading-lead', name: 'Amali Fernando', role: 'Loading Team Lead', assignment: 'Depot Staging Area', status: 'Acknowledged' },
      { id: 'driver-VEH021', name: 'Nimal Silva', role: 'Driver (VEH021)', assignment: assignment('VEH021'), status: 'Delivered' },
      { id: 'driver-VEH032', name: 'Kasun Perera', role: 'Driver (VEH032)', assignment: assignment('VEH032'), status: 'Sent', sentLabel: 'Sent 2 min ago' },
      { id: 'driver-VEH015', name: 'Dinesh Kumara', role: 'Driver (VEH015)', assignment: assignment('VEH015'), status: 'Acknowledged' },
    ],
  }, error: null }
}

export function resendNotification(publication: PublishedPlan, staffId: string): { publication: PublishedPlan; error: string | null } {
  const notification = publication.notifications.find(item => item.id === staffId)
  if (!notification || notification.status !== 'Sent') return { publication, error: 'Only a pending sent notification can be resent.' }
  return { publication: { ...publication, notifications: publication.notifications.map(item => item.id === staffId ? { ...item, sentLabel: 'Sent just now' } : item) }, error: null }
}
