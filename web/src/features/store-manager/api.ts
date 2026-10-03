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

/** One page of the outlet's orders, newest first. */
export function fetchMyOrders(token: string, { page, status, search }: { page: number; status?: OrderStatus; search: string }): Promise<Paginated<StoreOrder>> {
  return apiRequest<Paginated<StoreOrder>>(API_ENDPOINTS.orders.mine, { token, params: { page, limit: pageSize, status, search: search.trim() || undefined } })
}

export function cancelOrder(token: string, orderId: number): Promise<StoreOrder> {
  return apiRequest<StoreOrder>(API_ENDPOINTS.orders.cancel(orderId), { method: 'PATCH', token })
}
