import { deferralReasons } from '@/features/orders/data'
import type { OrderStatus, StoreOrder, StoreOutlet } from './api'
import type { OrderDetailsData } from './components/orders/order-details-panel'
import type { OrderTableRow } from './components/orders/orders-table'

type Variant = OrderTableRow['statusVariant']

export const statusStyles: Record<Variant, string> = {
  yellow: 'bg-yellow-100 text-yellow-700',
  green: 'bg-lime-100 text-lime-700',
  red: 'bg-red-100 text-red-700',
  gray: 'bg-neutral-100 text-stone-600',
}

// What a store manager is told at each stage of an order.
const statuses: Record<OrderStatus, { label: string; variant: Variant; headline: string }> = {
  ordered: { label: 'Order received', variant: 'yellow', headline: 'Order received' },
  confirmed: { label: 'Awaiting scheduling', variant: 'yellow', headline: 'Order confirmed' },
  planned: { label: 'Scheduled', variant: 'green', headline: 'Delivery scheduled' },
  loaded: { label: 'Loaded', variant: 'green', headline: 'Loaded at the depot' },
  dispatched: { label: 'On the way', variant: 'green', headline: 'On the way' },
  in_transit: { label: 'On the way', variant: 'green', headline: 'On the way' },
  docked: { label: 'Arrived', variant: 'green', headline: 'Arrived at your outlet' },
  delivered: { label: 'Delivered', variant: 'green', headline: 'Delivered' },
  deferred: { label: 'Deferred', variant: 'red', headline: 'Order deferred' },
  failed: { label: 'Not delivered', variant: 'red', headline: 'Delivery failed' },
  cancelled: { label: 'Cancelled', variant: 'gray', headline: 'Order cancelled' },
}

const capitalise = (value: string) => `${value[0].toUpperCase()}${value.slice(1)}`

/** `YYYY-MM-DD` (a calendar day) or a timestamp, as e.g. "Wed, 30 Sep". */
export function formatDay(value: string, withYear = false): string {
  return new Date(value.length === 10 ? `${value}T00:00:00` : value).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', ...(withYear && { year: 'numeric' }) })
}

/** A timestamp in Waypoint's own time zone, as e.g. "Tue, 29 Sep at 16:00". */
export function formatMoment(value: string): string {
  const moment = new Date(value)
  const zone = { timeZone: 'Asia/Colombo' } as const
  return `${moment.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', ...zone })} at ${moment.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', ...zone })}`
}

export const outletLabel = (outlet: StoreOutlet) => `${outlet.brand} · ${outlet.name ?? outlet.district ?? outlet.uniqueId}`
export const windowLabel = (outlet: StoreOutlet) => `${outlet.windowOpenTime.slice(0, 5)} – ${outlet.windowCloseTime.slice(0, 5)}`

export function toTableRow(order: StoreOrder): OrderTableRow {
  return {
    id: order.reference,
    requestedDate: formatDay(order.requestedDate),
    requirement: capitalise(order.tempRequirement),
    quantity: `${order.orderUnits} ${order.orderUnits === 1 ? 'case' : 'cases'}`,
    status: statuses[order.status].label,
    statusVariant: statuses[order.status].variant,
  }
}

function timelineMessage(order: StoreOrder): string {
  if (order.status === 'deferred' && order.deferral) {
    const { reason, reasonNote, deferredToDate } = order.deferral
    return `${deferralReasons[reason]}${reasonNote ? `: ${reasonNote}` : ''}. ${deferredToDate ? `It has been moved to the run on ${formatDay(deferredToDate)}.` : 'A new delivery day will be confirmed.'}`
  }
  if (order.status === 'confirmed')
    return order.cutoffAt ? `Your order is confirmed. Delivery planning starts after orders close on ${formatMoment(order.cutoffAt)}.` : 'Your order is confirmed and waiting to be scheduled.'
  if (order.status === 'cancelled') return 'This order was cancelled and will not be delivered.'
  if (order.status === 'planned') return 'Your delivery has been scheduled.'
  return 'We will keep this order updated as it moves through delivery.'
}

export function toDetails(order: StoreOrder): OrderDetailsData {
  const status = statuses[order.status]
  return {
    id: order.reference,
    location: order.outlet ? outletLabel(order.outlet) : '—',
    status: status.label,
    statusVariant: status.variant,
    timelineStatus: status.headline,
    timelineTime: order.status === 'deferred' && order.deferral ? `Deferred ${formatMoment(order.deferral.deferredAt)}` : `Submitted ${formatMoment(order.placedAt)}`,
    timelineMessage: timelineMessage(order),
    requestedDelivery: formatDay(order.requestedDate),
    requirement: capitalise(order.tempRequirement),
    quantity: `${order.orderUnits} ${order.orderUnits === 1 ? 'case' : 'cases'}`,
    totalWeight: `${order.orderWeightKg} kg`,
    totalVolume: `${order.orderVolumeM3} m³`,
    receivingWindow: order.outlet ? windowLabel(order.outlet) : '—',
    arrivalTime:
      order.status === 'deferred'
        ? order.deferral?.deferredToDate
          ? `Moved to ${formatDay(order.deferral.deferredToDate)}`
          : 'Deferred'
        : order.status === 'cancelled'
          ? 'Cancelled'
          : 'Not yet scheduled',
    notes: order.notes ?? '',
  }
}
