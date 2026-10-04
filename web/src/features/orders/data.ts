// How an order stands in the run being looked at. `Unallocated` is confirmed and waiting to be planned.
export type OrderStatus = 'Unallocated' | 'Allocated' | 'Deferred' | 'Delivered' | 'Failed' | 'Cancelled'
export type OrderFilter = 'All' | 'Unallocated' | 'Allocated' | 'Deferred' | 'Cancelled'
// Mirrors api/src/common/enums/deferral-reason.enum.ts.
export type DeferralReason = 'vehicle_capacity' | 'refrigerated_capacity' | 'van_access' | 'fuel_quota' | 'time_budget' | 'vehicle_unavailable' | 'store_requested' | 'other'
export type OrderRequirement = 'Chilled' | 'Dry' | 'Heavy Dry' | 'Ambient'
export interface ConfirmedOrder {
  // The reference people quote (ORD0000012); the API addresses an order by `dbId`.
  id: string
  dbId: number
  // Deferred onto this run from an earlier delivery day.
  carriedOver: boolean
  notes: string
  outlet: string
  district: string | null
  requirement: OrderRequirement
  weight: number
  volume: number
  status: OrderStatus
  vanOnly: boolean
  windowStart: string | null
  windowEnd: string | null
  assignedVehicle: string | null
  assignedTrip: string | null
  requestedDelivery?: string
  reviewDescription?: string
  deferral?: { reason: string; details: string; deferredTo: string | null }
}
export type OrderSortKey = 'id' | 'outlet' | 'requestedDelivery' | 'requirement' | 'weight' | 'volume' | 'status'
export interface OrderSort {
  key: OrderSortKey | null
  direction: 'ascending' | 'descending'
}
export interface AllocationOption {
  id: string
  orderId: string
  vehicleId: string
  trip: string
  depot: string
  type: 'Van' | 'Refrigerated truck'
  supports: OrderRequirement[]
  weightCapacity: number | null
  usedWeight: number | null
  volumeCapacity: number | null
  usedVolume: number | null
  remainingVolume: number
  arrival: string | null
  fuelRequired: number | null
  fuelRemaining: number | null
  dailyTripsAfter: number | null
  dailyTripLimit: number | null
}
export interface OrderSummary {
  total: number
  awaiting: number
  allocated: number
  deferred: number
  cancelled: number
  weightKg: number
  volumeM3: number
  chilledVolumeM3: number
}
export const orderFilters: OrderFilter[] = ['All', 'Unallocated', 'Allocated', 'Deferred', 'Cancelled']
export const orderStatusTones: Record<OrderStatus, 'error' | 'warning' | 'success' | 'neutral'> = {
  Unallocated: 'error',
  Allocated: 'success',
  Deferred: 'warning',
  Delivered: 'success',
  Failed: 'error',
  Cancelled: 'neutral',
}
export const deferralReasons: Record<DeferralReason, string> = {
  vehicle_capacity: 'No vehicle capacity',
  refrigerated_capacity: 'No refrigerated capacity',
  van_access: 'No van available for this outlet',
  fuel_quota: 'Fuel quota reached',
  time_budget: 'Could not fit the delivery window',
  vehicle_unavailable: 'Vehicle unavailable',
  store_requested: 'Requested by the store',
  other: 'Other',
}
// Mirror api/src/common/enums/{depot,brand}.enum.ts.
export const depots = ['Peliyagoda', 'Kandy']
export const brands = ['Fresh', 'Style', 'Tech']
// The allocation notices and vehicle options below are Figma's preview data, kept until the planning step supplies real ones.
export const allocationNotices: Record<string, { title: string; description: string }> = {
  'DEMO-102': { title: 'Dry order needs a van', description: 'No van with sufficient capacity was pre-assigned. Two vans are available for manual assignment; capacity limits apply.' },
  'DEMO-106': { title: 'Chilled order needs a vehicle', description: 'Automatic planning found no available chilled capacity. Vehicle availability has since changed.' },
  'DEMO-108': { title: 'Chilled order needs a vehicle', description: 'Automatic planning found no available chilled capacity. Vehicle availability has since changed.' },
}
// Figma supplies vehicle options for DEMO-102 and DEMO-106 only.
// Missing option data stays null and cannot enable assignment.
export const allocationOptions: AllocationOption[] = [
  {
    id: 'VEH008-new-1',
    orderId: 'DEMO-102',
    vehicleId: 'VEH008',
    trip: 'New trip 1',
    depot: 'Colombo',
    type: 'Van',
    supports: ['Dry', 'Ambient'],
    weightCapacity: 800,
    usedWeight: 0,
    volumeCapacity: 4,
    usedVolume: 0,
    remainingVolume: 4,
    arrival: '09:45',
    fuelRequired: 5,
    fuelRemaining: 18,
    dailyTripsAfter: 1,
    dailyTripLimit: 2,
  },
  {
    id: 'VEH015-trip-1',
    orderId: 'DEMO-102',
    vehicleId: 'VEH015',
    trip: 'Trip 1',
    depot: 'Kelaniya',
    type: 'Van',
    supports: ['Dry', 'Ambient'],
    weightCapacity: null,
    usedWeight: null,
    volumeCapacity: null,
    usedVolume: null,
    remainingVolume: 0.3,
    arrival: null,
    fuelRequired: null,
    fuelRemaining: null,
    dailyTripsAfter: null,
    dailyTripLimit: null,
  },
  {
    id: 'VEH012-new-1',
    orderId: 'DEMO-106',
    vehicleId: 'VEH012',
    trip: 'New trip 1',
    depot: 'Peliyagoda',
    type: 'Refrigerated truck',
    supports: ['Chilled'],
    weightCapacity: 2500,
    usedWeight: 0,
    volumeCapacity: 16,
    usedVolume: 0,
    remainingVolume: 16,
    arrival: '07:10',
    fuelRequired: 8,
    fuelRemaining: 24,
    dailyTripsAfter: 1,
    dailyTripLimit: 2,
  },
  {
    id: 'VEH021-trip-1',
    orderId: 'DEMO-106',
    vehicleId: 'VEH021',
    trip: 'Trip 1',
    depot: 'Peliyagoda',
    type: 'Refrigerated truck',
    supports: ['Chilled'],
    weightCapacity: null,
    usedWeight: null,
    volumeCapacity: null,
    usedVolume: null,
    remainingVolume: 1.2,
    arrival: null,
    fuelRequired: null,
    fuelRemaining: null,
    dailyTripsAfter: null,
    dailyTripLimit: null,
  },
]

export function optionBlocker(order: ConfirmedOrder, option: AllocationOption): string | null {
  if (option.orderId !== order.id) return 'This option belongs to another order.'
  if (!option.supports.includes(order.requirement)) return 'This vehicle does not meet the cargo requirement.'
  const remainingVolume =
    option.volumeCapacity !== null && option.usedVolume !== null ? Math.min(option.remainingVolume, Math.round((option.volumeCapacity - option.usedVolume) * 1000) / 1000) : option.remainingVolume
  if (order.volume > remainingVolume) return `Only ${remainingVolume} m³ remaining; this order needs ${order.volume} m³.`
  if (option.volumeCapacity === null || option.usedVolume === null) return 'Volume capacity has not been supplied.'
  if (option.weightCapacity === null || option.usedWeight === null) return 'Weight capacity has not been supplied.'
  if (order.weight + option.usedWeight > option.weightCapacity) return 'Insufficient weight capacity.'
  if (!order.windowStart || !order.windowEnd || !option.arrival) return 'Delivery timing has not been supplied.'
  if (option.arrival < order.windowStart || option.arrival > order.windowEnd) return 'Planned arrival is outside the delivery window.'
  if (option.fuelRequired === null || option.fuelRemaining === null) return 'Fuel availability has not been supplied.'
  if (option.fuelRequired > option.fuelRemaining) return 'Insufficient fuel remaining.'
  if (option.dailyTripsAfter === null || option.dailyTripLimit === null) return 'Daily trip limits have not been supplied.'
  if (option.dailyTripsAfter > option.dailyTripLimit) return 'Daily trip limit exceeded.'
  return null
}

export function assignOrder(orders: ConfirmedOrder[], orderId: string, optionId: string): { orders: ConfirmedOrder[]; error: string | null } {
  const order = orders.find((item) => item.id === orderId)
  const option = allocationOptions.find((item) => item.id === optionId)
  if (!order || !option) return { orders, error: 'Select an order and an available vehicle option.' }
  if (order.status !== 'Unallocated') return { orders, error: 'This order is already allocated or deferred.' }
  const blocker = optionBlocker(order, option)
  if (blocker) return { orders, error: blocker }
  return { orders: orders.map((item) => (item.id === orderId ? { ...item, status: 'Allocated', assignedVehicle: option.vehicleId, assignedTrip: option.trip } : item)), error: null }
}
