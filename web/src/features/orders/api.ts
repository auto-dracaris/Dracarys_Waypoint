import { apiRequest, type Paginated } from '@/lib/api-client'
import { API_ENDPOINTS } from '@/lib/api-endpoints'
import { deferralReasons, type ConfirmedOrder, type DeferralReason, type OrderFilter, type OrderSort, type OrderSortKey, type OrderStatus, type OrderSummary } from './data'

// Mirrors api/src/common/enums/order-status.enum.ts.
type ApiStatus = 'ordered' | 'confirmed' | 'planned' | 'deferred' | 'loaded' | 'dispatched' | 'in_transit' | 'docked' | 'delivered' | 'failed' | 'cancelled'

interface ApiOrder {
  id: number
  reference: string
  status: ApiStatus
  requestedDate: string
  tempRequirement: 'ambient' | 'chilled'
  orderUnits: number
  orderWeightKg: number
  orderVolumeM3: number
  notes: string | null
  outlet: { uniqueId: string; name: string | null; brand: string; district: string | null; parkingConstraint: string; windowOpenTime: string; windowCloseTime: string } | null
  deferral: { reason: DeferralReason; reasonNote: string | null; deferredToDate: string | null } | null
  // The vehicle and trip carrying it, once its plan is published.
  assignment: { vehicle: string; tripNo: number } | null
  // Set on the dispatcher's list: how the order relates to the run being looked at.
  carriedOver?: boolean
  deferredAway?: boolean
}

export interface OrderQuery {
  // The delivery day (run) to look at; '' is every day.
  date: string
  page: number
  search: string
  filter: OrderFilter
  sort: OrderSort
  depot: string
  brand: string
  temp: string
}

export const pageSize = 20

const stages: Record<Exclude<OrderFilter, 'All'>, string> = { Unallocated: 'awaiting', Allocated: 'allocated', Deferred: 'deferred', Cancelled: 'cancelled' }
const sortColumns: Record<OrderSortKey, string> = {
  id: 'id',
  outlet: 'outlet',
  requestedDelivery: 'requestedDate',
  requirement: 'tempRequirement',
  weight: 'orderWeightKg',
  volume: 'orderVolumeM3',
  status: 'status',
}

/** A calendar day (YYYY-MM-DD) as e.g. "Mon, 5 Oct". */
export const formatDay = (date: string) => new Date(`${date}T00:00:00`).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })

function displayStatus(order: ApiOrder): OrderStatus {
  // Deferred off this run, whatever became of it on a later one.
  if (order.deferredAway) return 'Deferred'
  if (order.status === 'cancelled') return 'Cancelled'
  if (order.status === 'delivered') return 'Delivered'
  if (order.status === 'failed') return 'Failed'
  // A deferred order that reached this run is waiting to be planned again.
  if (order.status === 'ordered' || order.status === 'confirmed' || order.status === 'deferred') return order.status === 'deferred' && !order.carriedOver ? 'Deferred' : 'Unallocated'
  return 'Allocated'
}

function toOrder(order: ApiOrder): ConfirmedOrder {
  const outlet = order.outlet
  return {
    id: order.reference,
    dbId: order.id,
    carriedOver: !!order.carriedOver,
    notes: order.notes ?? '',
    outlet: outlet ? `${outlet.uniqueId} · ${outlet.name ?? outlet.brand}` : '—',
    district: outlet?.district ?? null,
    requirement: order.tempRequirement === 'chilled' ? 'Chilled' : 'Ambient',
    weight: order.orderWeightKg,
    volume: order.orderVolumeM3,
    status: displayStatus(order),
    vanOnly: outlet?.parkingConstraint === 'van_only',
    // The API sends times as HH:MM:SS.
    windowStart: outlet?.windowOpenTime.slice(0, 5) ?? null,
    windowEnd: outlet?.windowCloseTime.slice(0, 5) ?? null,
    assignedVehicle: order.assignment?.vehicle ?? null,
    assignedTrip: order.assignment ? `Trip ${order.assignment.tripNo}` : null,
    requestedDelivery: formatDay(order.requestedDate),
    reviewDescription: outlet ? `${outlet.brand} · ${outlet.district ?? 'Unknown'} district · ${order.orderUnits} ${order.orderUnits === 1 ? 'case' : 'cases'}` : undefined,
    deferral: order.deferral ? { reason: deferralReasons[order.deferral.reason], details: order.deferral.reasonNote ?? '', deferredTo: order.deferral.deferredToDate } : undefined,
  }
}

/** One page of orders, for one run or every day; search, filters and sort are applied by the API. */
export async function fetchOrders(token: string, { date, page, search, filter, sort, depot, brand, temp }: OrderQuery): Promise<{ items: ConfirmedOrder[]; meta: Paginated<ApiOrder>['meta'] }> {
  const result = await apiRequest<Paginated<ApiOrder>>(API_ENDPOINTS.orders.list, {
    token,
    params: {
      date: date || undefined,
      page,
      limit: pageSize,
      search: search.trim() || undefined,
      stage: filter === 'All' ? undefined : stages[filter],
      depot: depot || undefined,
      brand: brand || undefined,
      tempRequirement: temp || undefined,
      sortBy: sort.key ? sortColumns[sort.key] : undefined,
      sortDir: sort.key ? (sort.direction === 'ascending' ? 'asc' : 'desc') : undefined,
    },
  })
  return { items: result.items.map(toOrder), meta: result.meta }
}

export function fetchOrderSummary(token: string, date: string, depot: string): Promise<OrderSummary> {
  return apiRequest<OrderSummary>(API_ENDPOINTS.orders.summary, { token, params: { date: date || undefined, depot: depot || undefined } })
}

/** Leaves a confirmed order off its run; it joins the next operating day's instead. */
export async function deferOrder(token: string, orderDbId: number, reason: DeferralReason, note: string): Promise<void> {
  await apiRequest(API_ENDPOINTS.orders.defer(orderDbId), { method: 'PATCH', token, body: { reason, reasonNote: note.trim() || undefined } })
}
