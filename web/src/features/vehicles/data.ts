export type VehicleAvailability = 'Available' | 'In workshop' | 'Unavailable'
export type VehicleFilter = 'All Vehicles' | VehicleAvailability
export type VehicleKind = 'truck' | 'van'
export type FuelType = 'diesel' | 'petrol'

export interface FleetVehicle {
  id: string
  dbId: number
  registrationNo: string
  type: string
  kind: VehicleKind
  isRefrigerated: boolean
  weight: number
  volume: number
  plannedTrips: number
  // A vehicle with at least one live trip on the planning day is allocated.
  allocation: 'Allocated' | 'Unallocated'
  availability: VehicleAvailability
  depot: string
  fuelType: FuelType
  kmPerL: number
  weeklyFuelQuota: number
  temperature: string
}

export interface TripTimelineStop {
  seq: number
  outletId: string
  outletName: string | null
  plannedArrivalAt: string
  status: string
  orderCount?: number
}

export interface DraftTrip {
  id: string
  title: string
  status: string
  stops: number
  orders: number
  window: string
  nextStop: string | null
  brand?: string
  plannedMinutes?: number
  plannedKm?: number
  plannedFuelL?: number
  timeline?: TripTimelineStop[]
}

export interface VehicleDetail {
  driver: { id: number; name: string; phone: string } | null
  fuelRemaining: number
  trips: DraftTrip[]
}

export interface FleetTotals {
  total: number
  available: number
  inWorkshop: number
  unavailable: number
  needsReview: number
}

export interface Driver {
  id: number
  name: string
}

export interface NewVehicle {
  uniqueId: string
  registrationNo: string
  type: VehicleKind
  depot: string
  isRefrigerated: boolean
  fuelType: FuelType
  weightCapKg: number
  volumeCapM3: number
  kmPerL: number
  weeklyFuelQuotaL: number
}

export type VehicleSortKey = 'id' | 'type' | 'weight' | 'availability'
export interface VehicleSort {
  key: VehicleSortKey | null
  direction: 'ascending' | 'descending'
}

export const vehicleFilters: VehicleFilter[] = ['All Vehicles', 'Available', 'In workshop', 'Unavailable']
export const depots = ['Peliyagoda', 'Kandy']
export const availabilityTones = { Available: 'success', 'In workshop': 'warning', Unavailable: 'error' } as const
