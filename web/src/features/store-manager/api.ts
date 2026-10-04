import { apiRequest, type Paginated } from '@/lib/api-client'
import { API_ENDPOINTS } from '@/lib/api-endpoints'
import type { DeferralReason } from '@/features/orders/data'
import type { PlaceOrderFormValues } from './types'

// Mirrors api/src/common/enums/order-status.enum.ts.
export type OrderStatus = 'ordered' | 'confirmed' | 'planned' | 'deferred' | 'loaded' | 'dispatched' | 'in_transit' | 'docked' | 'delivered' | 'failed' | 'cancelled'
export type TempRequirement = 'ambient' | 'chilled'

export interface StoreOutlet {
  id: number
  uniqueId: string
  name: string | null
  brand: string
  district: string | null
  depot: string | null
  lat: number | null
  lng: number | null
  // The API sends times as HH:MM:SS.
  windowOpenTime: string
  windowCloseTime: string
}

// A delivery day that can still be ordered for, and when its orders close.
export interface DeliveryDay {
  date: string
  cutoffAt: string
}

export interface PlacementOptions {
  outlet: StoreOutlet
  deliveryDays: DeliveryDay[]
  tempRequirements: TempRequirement[]
}

// The trip stop carrying an order, once its plan is published.
export interface OrderAssignment {
  vehicle: string
  vehicleType: 'truck' | 'van'
  tripNo: number
  serviceDate: string
  actualDepartAt: string | null
  plannedArrivalAt: string
  stopStatus: 'pending' | 'loaded' | 'arrived' | 'delivered' | 'partial' | 'failed'
  actualArrivalAt: string | null
  // When the driver recorded the drop, and how many cases they handed over.
  completedAt: string | null
  deliveredUnits: number | null
  failureReason: string | null
  receivedUnits: number | null
  receiptConfirmedAt: string | null
}

export interface StoreOrder {
  id: number
  reference: string
  status: OrderStatus
  requestedDate: string
  tempRequirement: TempRequirement
  orderUnits: number
  orderWeightKg: number
  orderVolumeM3: number
  notes: string | null
  placedAt: string
  cutoffAt: string | null
  cancellable: boolean
  outlet: StoreOutlet | null
  deferral: { reason: DeferralReason; reasonNote: string | null; deferredToDate: string | null; deferredAt: string } | null
  assignment: OrderAssignment | null
}

export interface StoreOverview {
  // Today in Colombo, YYYY-MM-DD.
  date: string
  metrics: { expectedToday: number; awaitingReceipt: number; deferred: number }
  // Earliest planned arrival first.
  todayDeliveries: StoreOrder[]
  nextRun: DeliveryDay | null
  latestDeferred: StoreOrder | null
  recentOrders: StoreOrder[]
}

export const pageSize = 10

/** The signed-in store manager's outlet and the delivery days still open. Fails when no outlet is linked to the account. */
export function fetchPlacementOptions(token: string): Promise<PlacementOptions> {
  return apiRequest<PlacementOptions>(API_ENDPOINTS.orders.placementOptions, { token })
}

export function placeOrder(token: string, order: PlaceOrderFormValues): Promise<StoreOrder> {
  return apiRequest<StoreOrder>(API_ENDPOINTS.orders.list, {
    method: 'POST',
    token,
    body: {
      requestedDate: order.deliveryDate,
      tempRequirement: order.temperatureMode,
      orderUnits: order.quantity,
      orderWeightKg: order.weight,
      orderVolumeM3: order.volume,
      notes: order.notes.trim() || undefined,
    },
  })
}

export interface DeliveryTracking {
  order: StoreOrder
  // Null until a plan carrying the order is published.
  trip: {
    tripNo: number
    serviceDate: string
    status: 'planned' | 'loading' | 'loaded' | 'dispatched' | 'completed'
    plannedDepartAt: string
    actualDepartAt: string | null
    completedAt: string | null
    vehicle: {
      uniqueId: string
      type: 'truck' | 'van'
      isRefrigerated: boolean
      // Only shared while the vehicle is out on this trip.
      location: { lat: number; lng: number; at: string | null } | null
    }
    depot: { name: string; lat: number | null; lng: number | null }
  } | null
  stop: {
    seq: number
    status: OrderAssignment['stopStatus']
    plannedArrivalAt: string
    actualArrivalAt: string | null
    completedAt: string | null
    deliveredUnits: number | null
    failureReason: string | null
    receivedUnits: number | null
    receiptConfirmedAt: string | null
  } | null
  // [lat, lng] pairs from the depot to the outlet; straight lines between stops unless `followsRoads`.
  route: { path: [number, number][]; followsRoads: boolean }
}

// Mirrors api/src/modules/orders/dto/query-my-delivery.dto.ts.
export type DeliveryStage = 'upcoming' | 'awaiting' | 'completed'

export interface MyDeliveries extends Paginated<StoreOrder> {
  counts: Record<'all' | DeliveryStage, number>
  metrics: { expectedToday: number; awaitingConfirmation: number; issuesOpen: number }
}

// What a store manager may report; mirrors api/src/common/constants/issue.constant.ts.
export type ReceiptIssueType = 'receipt_damage' | 'receipt_shortfall' | 'other'

/** One page of the outlet's deliveries (orders on a published trip), latest delivery day first. */
export function fetchMyDeliveries(token: string, { page, stage, date, search }: { page: number; stage?: DeliveryStage; date?: string; search: string }): Promise<MyDeliveries> {
  return apiRequest<MyDeliveries>(API_ENDPOINTS.orders.myDeliveries, { token, params: { page, limit: pageSize, stage, date: date || undefined, search: search.trim() || undefined } })
}

/** Confirms the cases the store accepted from a delivery the driver recorded. */
export function confirmReceipt(token: string, orderId: number, receivedUnits: number): Promise<StoreOrder> {
  return apiRequest<StoreOrder>(API_ENDPOINTS.orders.receipt(orderId), { method: 'PATCH', token, body: { receivedUnits } })
}

export function reportIssue(token: string, issue: { type: ReceiptIssueType; orderReference: string; affectedCases?: number; note: string }): Promise<unknown> {
  return apiRequest(API_ENDPOINTS.issues.list, {
    method: 'POST',
    token,
    body: { type: issue.type, orderId: issue.orderReference, affectedCases: issue.affectedCases, note: issue.note || undefined },
  })
}

export function fetchDelivery(token: string, orderId: number): Promise<DeliveryTracking> {
  return apiRequest<DeliveryTracking>(API_ENDPOINTS.orders.delivery(orderId), { token })
}

/** Everything the store manager's dashboard shows. */
export function fetchMyOverview(token: string): Promise<StoreOverview> {
  return apiRequest<StoreOverview>(API_ENDPOINTS.orders.myOverview, { token })
}

/** One page of the outlet's orders, newest first. */
export type MyOrderSort = 'reference' | 'requestedDate' | 'tempRequirement' | 'orderUnits' | 'status'
export interface MyOrders extends Paginated<StoreOrder> {
  counts?: Record<'all' | 'confirmed' | 'deferred' | 'cancelled', number>
}
export interface MyOrderQuery {
  page: number
  limit?: number
  status?: OrderStatus
  search: string
  dateFrom?: string
  dateTo?: string
  tempRequirement?: TempRequirement
  sortBy?: MyOrderSort
  sortDirection?: 'ASC' | 'DESC'
}
export function fetchMyOrders(token: string, { search, limit = pageSize, ...query }: MyOrderQuery): Promise<MyOrders> {
  return apiRequest<MyOrders>(API_ENDPOINTS.orders.mine, { token, params: { ...query, limit, search: search.trim() || undefined } })
}

export function cancelOrder(token: string, orderId: number): Promise<StoreOrder> {
  return apiRequest<StoreOrder>(API_ENDPOINTS.orders.cancel(orderId), { method: 'PATCH', token })
}
