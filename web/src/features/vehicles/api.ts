import { apiRequest, type Paginated } from '@/lib/api-client'
import { API_ENDPOINTS } from '@/lib/api-endpoints'
import type { User } from '@/features/auth/api'
import type { Driver, DraftTrip, FleetTotals, FleetVehicle, NewVehicle, VehicleAvailability, VehicleDetail, VehicleFilter, VehicleKind, VehicleSort, VehicleSortKey, FuelType } from './data'

type ApiStatus = 'available' | 'in_workshop' | 'breakdown'
type TripStatus = 'draft' | 'planned' | 'loading' | 'loaded' | 'dispatched' | 'completed' | 'cancelled'

interface ApiVehicle {
  id: number
  uniqueId: string
  registrationNo: string | null
  type: VehicleKind
  isRefrigerated: boolean
  weightCapKg: number
  volumeCapM3: number
  fuelType: FuelType
  kmPerL: number
  weeklyFuelQuotaL: number
  status: ApiStatus
  depot?: { name: string; lat?: number | null; lng?: number | null }
  lastLat?: number | null
  lastLng?: number | null
  lastLocationAt?: string | null
  plannedTrips?: number
}

interface ApiTripStop {
  seq: number
  outletId: string
  outletName: string | null
  plannedArrivalAt: string
  status: string
  orderCount: number
}

interface ApiTrip {
  id: string
  tripNo: number
  status: TripStatus
  brand?: string
  plannedDepartAt: string
  plannedEndAt: string
  plannedMinutes?: number
  plannedKm?: number
  plannedFuelL?: number
  stops: number
  orders: number
  nextStop: string | null
  timeline?: ApiTripStop[]
}

interface ApiVehicleDetail extends ApiVehicle {
  driver: { id: number; firstName: string; lastName: string; phone: string } | null
  fuelQuotaRemainingL: number
  trips: ApiTrip[]
}

export const pageSize = 20

const availabilityByStatus: Record<ApiStatus, VehicleAvailability> = { available: 'Available', in_workshop: 'In workshop', breakdown: 'Unavailable' }
const statusByAvailability: Record<VehicleAvailability, ApiStatus> = { Available: 'available', 'In workshop': 'in_workshop', Unavailable: 'breakdown' }
const sortColumns: Record<VehicleSortKey, string> = { id: 'uniqueId', type: 'type', weight: 'weightCapKg', availability: 'status' }

const capitalise = (value: string) => `${value[0].toUpperCase()}${value.slice(1)}`
const clock = (iso: string) => {
  if (!iso) return '—'
  const d = new Date(iso)
  return isNaN(d.getTime()) ? '—' : d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Colombo' })
}

/** Tomorrow's date (YYYY-MM-DD) where Waypoint operates; the day dispatchers are planning. */
export function planningDate(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Colombo' }).format(new Date(Date.now() + 86_400_000))
}

function toVehicle(vehicle: ApiVehicle): FleetVehicle {
  const plannedTrips = vehicle.plannedTrips ?? 0
  return {
    id: vehicle.uniqueId,
    dbId: vehicle.id,
    registrationNo: vehicle.registrationNo ?? '—',
    type: vehicle.isRefrigerated ? `Refrigerated ${vehicle.type}` : capitalise(vehicle.type),
    kind: vehicle.type,
    isRefrigerated: vehicle.isRefrigerated,
    weight: vehicle.weightCapKg,
    volume: vehicle.volumeCapM3,
    plannedTrips,
    allocation: plannedTrips > 0 ? 'Allocated' : 'Unallocated',
    availability: availabilityByStatus[vehicle.status],
    depot: vehicle.depot?.name ?? '—',
    fuelType: vehicle.fuelType,
    kmPerL: vehicle.kmPerL,
    weeklyFuelQuota: vehicle.weeklyFuelQuotaL,
    temperature: vehicle.isRefrigerated ? 'Chilled capable' : 'Ambient only',
    lastLat: vehicle.lastLat != null ? Number(vehicle.lastLat) : null,
    lastLng: vehicle.lastLng != null ? Number(vehicle.lastLng) : null,
    lastLocationAt: vehicle.lastLocationAt ?? null,
    depotLat: vehicle.depot?.lat != null ? Number(vehicle.depot.lat) : null,
    depotLng: vehicle.depot?.lng != null ? Number(vehicle.depot.lng) : null,
  }
}

function toTrip(trip: ApiTrip): DraftTrip {
  return {
    id: trip.id,
    title: `Trip ${String(trip.tripNo).padStart(2, '0')}`,
    status: capitalise(trip.status),
    stops: trip.stops,
    orders: trip.orders,
    window: `${clock(trip.plannedDepartAt)} – ${clock(trip.plannedEndAt)}`,
    nextStop: trip.nextStop,
    brand: trip.brand,
    plannedMinutes: trip.plannedMinutes,
    plannedKm: trip.plannedKm,
    plannedFuelL: trip.plannedFuelL,
    timeline: trip.timeline?.map((stop) => ({
      seq: stop.seq,
      outletId: stop.outletId,
      outletName: stop.outletName,
      plannedArrivalAt: clock(stop.plannedArrivalAt),
      status: capitalise(stop.status),
      orderCount: stop.orderCount,
    })),
  }
}

/** One page of vehicles; search, status filter and sort are applied by the API. */
export async function fetchVehicles(
  token: string,
  { page, search, filter, sort }: { page: number; search: string; filter: VehicleFilter; sort: VehicleSort },
): Promise<{ items: FleetVehicle[]; meta: Paginated<ApiVehicle>['meta'] }> {
  const result = await apiRequest<Paginated<ApiVehicle>>(API_ENDPOINTS.vehicles.list, {
    token,
    params: {
      page,
      limit: pageSize,
      date: planningDate(),
      search: search.trim() || undefined,
      status: filter === 'All Vehicles' ? undefined : statusByAvailability[filter],
      sortBy: sort.key ? sortColumns[sort.key] : undefined,
      sortDir: sort.key ? (sort.direction === 'ascending' ? 'asc' : 'desc') : undefined,
    },
  })
  return { items: result.items.map(toVehicle), meta: result.meta }
}

export function fetchFleetTotals(token: string): Promise<FleetTotals> {
  return apiRequest<FleetTotals>(API_ENDPOINTS.vehicles.summary, { token, params: { date: planningDate() } })
}

export async function fetchVehicleDetail(token: string, vehicleDbId: number): Promise<VehicleDetail> {
  const vehicle = await apiRequest<ApiVehicleDetail>(API_ENDPOINTS.vehicles.detail(vehicleDbId), { token, params: { date: planningDate() } })
  return {
    driver: vehicle.driver && { id: vehicle.driver.id, name: `${vehicle.driver.firstName} ${vehicle.driver.lastName}`, phone: vehicle.driver.phone ? `+${vehicle.driver.phone}` : '—' },
    fuelRemaining: vehicle.fuelQuotaRemainingL,
    trips: vehicle.trips.map(toTrip),
  }
}

/** Resolves with how many draft or planned trips the change leaves needing review. */
export async function setVehicleAvailability(token: string, vehicleDbId: number, availability: VehicleAvailability): Promise<number> {
  const result = await apiRequest<{ affectedTrips: number }>(API_ENDPOINTS.vehicles.status(vehicleDbId), { method: 'PATCH', token, body: { status: statusByAvailability[availability] } })
  return result.affectedTrips
}

export async function assignDriver(token: string, vehicleDbId: number, driverId: number | null): Promise<void> {
  await apiRequest(API_ENDPOINTS.vehicles.driver(vehicleDbId), { method: 'PATCH', token, body: { driverId } })
}

export async function createVehicle(token: string, vehicle: NewVehicle): Promise<FleetVehicle> {
  const created = await apiRequest<ApiVehicle>(API_ENDPOINTS.vehicles.list, {
    method: 'POST',
    token,
    body: { ...vehicle, uniqueId: vehicle.uniqueId.trim(), registrationNo: vehicle.registrationNo.trim() || undefined },
  })
  return toVehicle(created)
}

// ponytail: one page of 200 drivers; follow `meta.totalPages` if the driver roster outgrows it.
export async function fetchDrivers(token: string): Promise<Driver[]> {
  const page = await apiRequest<Paginated<User>>(API_ENDPOINTS.users.list, { token, params: { role: 'driver', status: 'active', limit: 200 } })
  return page.items.map((driver) => ({ id: driver.id, name: `${driver.firstName} ${driver.lastName}` }))
}
