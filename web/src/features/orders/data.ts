export type OrderStatus = 'Unallocated' | 'Allocated' | 'Deferred'
export type OrderFilter = 'All' | OrderStatus
export type OrderRequirement = 'Chilled' | 'Dry' | 'Heavy Dry' | 'Ambient'
export interface ConfirmedOrder {
  id: string
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
  deferral?: { reason: string; details: string }
}
export type OrderSortKey = 'id' | 'outlet' | 'requirement' | 'weight' | 'volume' | 'status'
export interface OrderSort { key: OrderSortKey | null; direction: 'ascending' | 'descending' }
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
export const orderFilters: OrderFilter[] = ['All', 'Unallocated', 'Allocated', 'Deferred']
export const initialOrders: ConfirmedOrder[] = [
  { id: 'DEMO-101', outlet: 'Cargills - Negombo', district: null, requirement: 'Chilled', weight: 340, volume: 2.4, status: 'Allocated', vanOnly: false, windowStart: null, windowEnd: null, assignedVehicle: null, assignedTrip: null },
  { id: 'DEMO-102', outlet: 'Keells - Colombo 03', district: 'Colombo', requirement: 'Dry', weight: 120, volume: 0.8, status: 'Unallocated', vanOnly: true, windowStart: '08:00', windowEnd: '12:00', assignedVehicle: null, assignedTrip: null },
  { id: 'DEMO-103', outlet: 'Arpico - Kandy Road', district: null, requirement: 'Heavy Dry', weight: 980, volume: 3.2, status: 'Allocated', vanOnly: false, windowStart: null, windowEnd: null, assignedVehicle: null, assignedTrip: null },
  { id: 'DEMO-104', outlet: 'Cargills - Wattala', district: null, requirement: 'Ambient', weight: 210, volume: 1.1, status: 'Allocated', vanOnly: false, windowStart: null, windowEnd: null, assignedVehicle: null, assignedTrip: null },
  { id: 'DEMO-106', outlet: 'Fresh - Ja-Ela', district: 'Gampaha', requirement: 'Chilled', weight: 410, volume: 2.9, status: 'Unallocated', vanOnly: false, windowStart: '06:00', windowEnd: '08:00', assignedVehicle: null, assignedTrip: null, reviewDescription: 'Fresh - Ja-Ela · Gampaha district' },
  { id: 'DEMO-108', outlet: 'Fresh — Biyagama', district: null, requirement: 'Chilled', weight: 300, volume: 1.2, status: 'Unallocated', vanOnly: true, windowStart: null, windowEnd: null, assignedVehicle: null, assignedTrip: null, requestedDelivery: 'Mon, 28 Sep 2026' },
]
export const allocationNotices: Record<string, { title: string; description: string }> = {
  'DEMO-102': { title: 'Dry order needs a van', description: 'No van with sufficient capacity was pre-assigned. Two vans are available for manual assignment; capacity limits apply.' },
  'DEMO-106': { title: 'Chilled order needs a vehicle', description: 'Automatic planning found no available chilled capacity. Vehicle availability has since changed.' },
  'DEMO-108': { title: 'Chilled order needs a vehicle', description: 'Automatic planning found no available chilled capacity. Vehicle availability has since changed.' },
}
// Figma supplies vehicle options for DEMO-102 and DEMO-106 only.
// Missing option data stays null and cannot enable assignment.
export const allocationOptions: AllocationOption[] = [
  { id: 'VEH008-new-1', orderId: 'DEMO-102', vehicleId: 'VEH008', trip: 'New trip 1', depot: 'Colombo', type: 'Van', supports: ['Dry', 'Ambient'], weightCapacity: 800, usedWeight: 0, volumeCapacity: 4, usedVolume: 0, remainingVolume: 4, arrival: '09:45', fuelRequired: 5, fuelRemaining: 18, dailyTripsAfter: 1, dailyTripLimit: 2 },
  { id: 'VEH015-trip-1', orderId: 'DEMO-102', vehicleId: 'VEH015', trip: 'Trip 1', depot: 'Kelaniya', type: 'Van', supports: ['Dry', 'Ambient'], weightCapacity: null, usedWeight: null, volumeCapacity: null, usedVolume: null, remainingVolume: 0.3, arrival: null, fuelRequired: null, fuelRemaining: null, dailyTripsAfter: null, dailyTripLimit: null },
  { id: 'VEH012-new-1', orderId: 'DEMO-106', vehicleId: 'VEH012', trip: 'New trip 1', depot: 'Peliyagoda', type: 'Refrigerated truck', supports: ['Chilled'], weightCapacity: 2500, usedWeight: 0, volumeCapacity: 16, usedVolume: 0, remainingVolume: 16, arrival: '07:10', fuelRequired: 8, fuelRemaining: 24, dailyTripsAfter: 1, dailyTripLimit: 2 },
  { id: 'VEH021-trip-1', orderId: 'DEMO-106', vehicleId: 'VEH021', trip: 'Trip 1', depot: 'Peliyagoda', type: 'Refrigerated truck', supports: ['Chilled'], weightCapacity: null, usedWeight: null, volumeCapacity: null, usedVolume: null, remainingVolume: 1.2, arrival: null, fuelRequired: null, fuelRemaining: null, dailyTripsAfter: null, dailyTripLimit: null },
]

export function selectOrders(orders: ConfirmedOrder[], filter: OrderFilter, query: string, sort: OrderSort): ConfirmedOrder[] {
  const term = query.trim().toLowerCase()
  const visible = orders.filter(order => (filter === 'All' || order.status === filter) && `${order.id} ${order.outlet} ${order.district ?? ''} ${order.requirement} ${order.status} ${order.assignedVehicle ?? ''}`.toLowerCase().includes(term))
  if (sort.key) {
    const key = sort.key
    visible.sort((a, b) => { const left = a[key], right = b[key]; return (typeof left === 'number' && typeof right === 'number' ? left - right : String(left).localeCompare(String(right))) * (sort.direction === 'ascending' ? 1 : -1) })
  }
  return visible
}

export function optionBlocker(order: ConfirmedOrder, option: AllocationOption): string | null {
  if (option.orderId !== order.id) return 'This option belongs to another order.'
  if (!option.supports.includes(order.requirement)) return 'This vehicle does not meet the cargo requirement.'
  const remainingVolume = option.volumeCapacity !== null && option.usedVolume !== null ? Math.min(option.remainingVolume, Math.round((option.volumeCapacity - option.usedVolume) * 1000) / 1000) : option.remainingVolume
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
  const order = orders.find(item => item.id === orderId)
  const option = allocationOptions.find(item => item.id === optionId)
  if (!order || !option) return { orders, error: 'Select an order and an available vehicle option.' }
  if (order.status !== 'Unallocated') return { orders, error: 'This order is already allocated or deferred.' }
  const blocker = optionBlocker(order, option)
  if (blocker) return { orders, error: blocker }
  return { orders: orders.map(item => item.id === orderId ? { ...item, status: 'Allocated', assignedVehicle: option.vehicleId, assignedTrip: option.trip } : item), error: null }
}

export const deferralReason = 'No suitable vehicle capacity'

export function deferOrder(orders: ConfirmedOrder[], orderId: string, reason: string, details: string): { orders: ConfirmedOrder[]; error: string | null } {
  const order = orders.find(item => item.id === orderId)
  if (!order || order.status !== 'Unallocated') return { orders, error: 'Only an unallocated order can be deferred.' }
  if (reason !== deferralReason) return { orders, error: 'Select a reason for deferral.' }
  return { orders: orders.map(item => item.id === orderId ? { ...item, status: 'Deferred', assignedVehicle: null, assignedTrip: null, deferral: { reason, details: details.trim() } } : item), error: null }
}
