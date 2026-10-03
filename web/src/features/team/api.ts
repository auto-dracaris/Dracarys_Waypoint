import { apiRequest, type Paginated } from '@/lib/api-client'
import { API_ENDPOINTS } from '@/lib/api-endpoints'
import type { User } from '@/features/auth/api'
import { staffRoleLabels, staffStatusLabels, type StaffMember, type StaffTrip } from './data'

interface Depot { id: number; name: string }
interface StaffUser extends User { depot?: Depot }

interface Vehicle {
  id: number
  uniqueId: string
  type: 'truck' | 'van'
  isRefrigerated: boolean
  driverId: number | null
  depot?: Depot
  // Live trips on the requested day (today by default).
  plannedTrips?: number
}

type TripStatus = 'draft' | 'planned' | 'loading' | 'loaded' | 'dispatched' | 'completed'
interface VehicleTrip { id: string; tripNo: number; status: TripStatus; stops: number; recordedStops: number; nextStop: string | null }

const tripStatusLabels: Record<TripStatus, StaffTrip['status']> = {
  draft: 'Planned', planned: 'Planned', loading: 'Loading', loaded: 'Loading', dispatched: 'In progress', completed: 'Completed',
}

// What each non-driving role does all day; a driver's assignment is their vehicle.
const roleAssignments: Record<Exclude<User['role'], 'driver'>, string> = { dispatcher: 'Hub dispatch', store_manager: 'Outlet ordering', loader: 'Depot loading team' }

// ponytail: one page of 200 each; follow `meta.totalPages` if the staff or the fleet outgrow it.
const firstPage = { limit: 200 }

function toStaffMember(user: StaffUser, vehicle: Vehicle | undefined): StaffMember {
  const trips = vehicle?.plannedTrips ?? 0
  const vehicleType = vehicle && (vehicle.isRefrigerated ? `Refrigerated ${vehicle.type}` : `${vehicle.type[0].toUpperCase()}${vehicle.type.slice(1)}`)
  return {
    id: String(user.id),
    name: `${user.firstName} ${user.lastName}`,
    initials: `${user.firstName[0] ?? ''}${user.lastName[0] ?? ''}`.toUpperCase(),
    phone: user.phone ? `+${user.phone}` : '—',
    role: staffRoleLabels[user.role],
    status: staffStatusLabels[user.status],
    userId: user.id,
    roleKey: user.role,
    statusKey: user.status,
    depot: user.depot?.name ?? '—',
    vehicleId: vehicle?.uniqueId ?? null,
    vehicleDbId: vehicle?.id ?? null,
    vehicleLabel: vehicleType ?? null,
    assignment: user.role !== 'driver' ? roleAssignments[user.role]
      : vehicle ? `${vehicle.uniqueId} · ${trips ? `${trips} ${trips === 1 ? 'trip' : 'trips'}` : 'No trips'}`
      : 'No vehicle assigned',
  }
}

/** Every account that has not been deleted, each driver joined to the vehicle they are assigned to. */
export async function fetchTeam(token: string): Promise<StaffMember[]> {
  const [staff, vehicles] = await Promise.all([
    apiRequest<Paginated<StaffUser>>(API_ENDPOINTS.users.list, { token, params: firstPage }),
    apiRequest<Paginated<Vehicle>>(API_ENDPOINTS.vehicles.list, { token, params: firstPage }),
  ])
  const vehicleByDriver = new Map(vehicles.items.map(vehicle => [vehicle.driverId, vehicle]))
  // Deleting is how an account leaves the roster; the API keeps the row for its history.
  return staff.items.filter(user => user.status !== 'deleted').map(user => toStaffMember(user, vehicleByDriver.get(user.id)))
}

/** Sends only what changed; the API refuses a dispatcher changing their own role or status. */
export async function updateStaffAccess(token: string, member: StaffMember, next: { depot: string; role: User['role']; status: User['status'] }): Promise<void> {
  if (next.depot !== member.depot) await apiRequest(API_ENDPOINTS.users.detail(member.userId), { method: 'PUT', token, body: { depot: next.depot } })
  if (next.role !== member.roleKey) await apiRequest(API_ENDPOINTS.users.role(member.userId), { method: 'PATCH', token, body: { role: next.role } })
  if (next.status !== member.statusKey) await apiRequest(API_ENDPOINTS.users.status(member.userId), { method: 'PATCH', token, body: { status: next.status } })
}

/** Today's trips of one vehicle, for the driver assigned to it. */
export async function fetchTrips(token: string, vehicleDbId: number): Promise<StaffTrip[]> {
  const { trips } = await apiRequest<{ trips: VehicleTrip[] }>(API_ENDPOINTS.vehicles.detail(vehicleDbId), { token })
  return trips.map(trip => ({
    id: trip.id,
    title: `Trip ${String(trip.tripNo).padStart(2, '0')}`,
    status: tripStatusLabels[trip.status],
    recordedStops: trip.recordedStops,
    totalStops: trip.stops,
    nextStop: trip.nextStop ?? undefined,
  }))
}
