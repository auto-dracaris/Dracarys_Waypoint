export type OutletAvailability = 'Available' | 'Unavailable'
export type OutletFilter = 'All' | OutletAvailability
export type ParkingConstraint = 'van_only' | 'normal' | 'mall_dock'
export type DockType = 'street' | 'rear_dock' | 'mall_bay'
export interface DeliveryRequirements {
  // The district decides the depot, so a depot change is a district change.
  district: string
  windowStart: string
  windowEnd: string
  // A mall's fixed access window; empty for outlets outside malls.
  mallWindowStart: string
  mallWindowEnd: string
  parkingConstraint: ParkingConstraint
  dockType: DockType
  address: string
}
export interface Outlet extends DeliveryRequirements {
  id: string
  dbId: number
  brand: string
  name: string
  depot: string
  contactPhone: string
  availability: OutletAvailability
  // Labels for the enum columns above, so the table can show and sort them.
  access: string
  deliveryPoint: string
}
export type Brand = 'Fresh' | 'Style' | 'Tech'
export interface NewOutlet extends DeliveryRequirements {
  uniqueId: string
  name: string
  brand: Brand
}
export interface District {
  name: string
  depot: string
}
export interface PageMeta {
  total: number
  page: number
  limit: number
  totalPages: number
}
export interface OutletSummary {
  total: number
  available: number
  unavailable: number
  vanOnly: number
  mallDock: number
}
export interface OutletActivity {
  type: 'received' | 'deferred'
  at: string
  note: string | null
}
export interface OutletOverview {
  nextDelivery: { date: string; orders: number; temps: ('ambient' | 'chilled')[] } | null
  recentActivity: OutletActivity[]
}
export type OutletSortKey = 'id' | 'name' | 'brand' | 'district' | 'windowStart' | 'access'
export interface OutletSort {
  key: OutletSortKey | null
  direction: 'ascending' | 'descending'
}

export const parkingLabels: Record<ParkingConstraint, string> = { van_only: 'Van only', normal: 'Standard', mall_dock: 'Mall dock' }
export const dockLabels: Record<DockType, string> = { street: 'Street frontage', rear_dock: 'Rear loading dock', mall_bay: 'Mall loading bay' }
export const brands: Brand[] = ['Fresh', 'Style', 'Tech']
export const outletFilters: OutletFilter[] = ['All', 'Available', 'Unavailable']

export function requirementsError(value: DeliveryRequirements): string {
  if (!value.district) return 'Choose a district.'
  if (!value.address.trim()) return 'Enter a delivery address.'
  const validTime = /^([01]\d|2[0-3]):[0-5]\d$/
  if (!validTime.test(value.windowStart) || !validTime.test(value.windowEnd) || value.windowStart >= value.windowEnd) return 'The delivery window must end after it starts.'
  if (!value.mallWindowStart !== !value.mallWindowEnd) return 'Enter both mall access times, or leave both blank.'
  if (value.mallWindowStart && (!validTime.test(value.mallWindowStart) || !validTime.test(value.mallWindowEnd) || value.mallWindowStart >= value.mallWindowEnd))
    return 'The mall access window must end after it starts.'
  return ''
}
