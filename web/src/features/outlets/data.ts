export type OutletAllocation = 'Unallocated' | 'Allocated' | 'Deferred'
export type OutletFilter = 'All' | OutletAllocation
export type OutletAvailability = 'Available' | 'Unavailable'
export interface DeliveryRequirements {
  depot: string
  district: string
  windowStart: string
  windowEnd: string
  access: 'Van only' | 'Standard'
  deliveryPoint: string
}
export interface Outlet extends DeliveryRequirements {
  id: string
  brand: string
  allocation: OutletAllocation
  availability: OutletAvailability
}
export type OutletSortKey = 'id' | 'brand' | 'district' | 'windowStart' | 'access'
export interface OutletSort { key: OutletSortKey | null; direction: 'ascending' | 'descending' }

// Figma supplies these six table records. Allocation and availability are
// explicit local preview values, not confirmed operational assignments.
const rows = [
  ['OUT014', 'Fresh', 'Gampaha', '06:00', '08:00', 'Van only', 'Unallocated'],
  ['OUT008', 'Fresh', 'Gampaha', '06:00', '08:00', 'Standard', 'Allocated'],
  ['OUT025', 'Style', 'Colombo', '10:00', '12:00', 'Standard', 'Unallocated'],
  ['OUT031', 'Fresh', 'Gampaha', '06:00', '08:00', 'Standard', 'Allocated'],
  ['OUT042', 'Tech', 'Gampaha', '09:00', '12:00', 'Standard', 'Unallocated'],
  ['OUT056', 'Fresh', 'Gampaha', '06:00', '08:00', 'Van only', 'Allocated'],
] as const
export const initialOutlets: Outlet[] = rows.map(([id, brand, district, windowStart, windowEnd, access, allocation]) => ({ id, brand, district, windowStart, windowEnd, access, allocation, depot: 'Peliyagoda', deliveryPoint: 'Rear loading bay', availability: 'Available' }))
export const outletMetrics = [72, 12, 18] as const
export const outletFilters: OutletFilter[] = ['All', 'Unallocated', 'Allocated', 'Deferred']

export function selectOutlets(outlets: Outlet[], filter: OutletFilter, query: string, sort: OutletSort): Outlet[] {
  const term = query.trim().toLowerCase()
  const visible = outlets.filter(outlet => (filter === 'All' || outlet.allocation === filter) && `${outlet.id} ${outlet.brand} ${outlet.district} ${outlet.depot} ${outlet.windowStart} ${outlet.windowEnd} ${outlet.access}`.toLowerCase().includes(term))
  if (sort.key) {
    const key = sort.key
    visible.sort((a, b) => a[key].localeCompare(b[key]) * (sort.direction === 'ascending' ? 1 : -1))
  }
  return visible
}

export function requirementsError(value: DeliveryRequirements): string {
  if (!value.depot.trim() || !value.district.trim() || !value.deliveryPoint.trim()) return 'Enter a depot, district, and delivery point.'
  const validTime = /^([01]\d|2[0-3]):[0-5]\d$/
  if (!validTime.test(value.windowStart) || !validTime.test(value.windowEnd) || value.windowStart >= value.windowEnd) return 'The receiving window must end after it starts.'
  return ''
}
