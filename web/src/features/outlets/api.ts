import { apiRequest, type Paginated } from '@/lib/api-client'
import { API_ENDPOINTS } from '@/lib/api-endpoints'
import {
  dockLabels,
  parkingLabels,
  type DeliveryRequirements,
  type District,
  type DockType,
  type NewOutlet,
  type Outlet,
  type OutletFilter,
  type OutletOverview,
  type OutletSort,
  type OutletSortKey,
  type OutletSummary,
  type PageMeta,
  type ParkingConstraint,
} from './data'

interface ApiOutlet {
  id: number
  uniqueId: string
  brand: string
  name: string | null
  district?: { name: string }
  depot?: { name: string }
  dockType: DockType
  parkingConstraint: ParkingConstraint
  windowOpenTime: string
  windowCloseTime: string
  mallWindowOpen: string | null
  mallWindowClose: string | null
  isAvailable: boolean
  address: string | null
  contactPhone: string | null
}

export const pageSize = 20

const sortColumns: Record<OutletSortKey, string> = { id: 'uniqueId', name: 'name', brand: 'brand', district: 'district', windowStart: 'windowOpenTime', access: 'parkingConstraint' }

function toOutlet(outlet: ApiOutlet): Outlet {
  return {
    id: outlet.uniqueId,
    dbId: outlet.id,
    brand: outlet.brand,
    name: outlet.name ?? '—',
    depot: outlet.depot?.name ?? '—',
    district: outlet.district?.name ?? '—',
    // The API sends HH:MM:SS.
    windowStart: outlet.windowOpenTime.slice(0, 5),
    windowEnd: outlet.windowCloseTime.slice(0, 5),
    mallWindowStart: outlet.mallWindowOpen?.slice(0, 5) ?? '',
    mallWindowEnd: outlet.mallWindowClose?.slice(0, 5) ?? '',
    parkingConstraint: outlet.parkingConstraint,
    dockType: outlet.dockType,
    address: outlet.address ?? '',
    contactPhone: outlet.contactPhone ?? '—',
    availability: outlet.isAvailable ? 'Available' : 'Unavailable',
    access: parkingLabels[outlet.parkingConstraint],
    deliveryPoint: outlet.address || dockLabels[outlet.dockType],
  }
}

/** One page of outlets; search, availability filter and sort are applied by the API. */
export async function fetchOutlets(
  token: string,
  { page, search, filter, sort }: { page: number; search: string; filter: OutletFilter; sort: OutletSort },
): Promise<{ items: Outlet[]; meta: PageMeta }> {
  const result = await apiRequest<Paginated<ApiOutlet>>(API_ENDPOINTS.outlets.list, {
    token,
    params: {
      page,
      limit: pageSize,
      search: search.trim() || undefined,
      isAvailable: filter === 'All' ? undefined : filter === 'Available',
      sortBy: sort.key ? sortColumns[sort.key] : undefined,
      sortDir: sort.key ? (sort.direction === 'ascending' ? 'asc' : 'desc') : undefined,
    },
  })
  return { items: result.items.map(toOutlet), meta: result.meta }
}

export function fetchDistricts(token: string): Promise<District[]> {
  return apiRequest<District[]>(API_ENDPOINTS.outlets.districts, { token })
}

export function fetchOutletSummary(token: string): Promise<OutletSummary> {
  return apiRequest<OutletSummary>(API_ENDPOINTS.outlets.summary, { token })
}

export function fetchOutletOverview(token: string, outletDbId: number): Promise<OutletOverview> {
  return apiRequest<OutletOverview>(API_ENDPOINTS.outlets.overview(outletDbId), { token })
}

function requirementsBody({ district, windowStart, windowEnd, mallWindowStart, mallWindowEnd, parkingConstraint, dockType, address }: DeliveryRequirements) {
  return {
    district,
    windowOpenTime: windowStart,
    windowCloseTime: windowEnd,
    mallWindowOpen: mallWindowStart || null,
    mallWindowClose: mallWindowEnd || null,
    parkingConstraint,
    dockType,
    address: address.trim(),
  }
}

export async function updateOutlet(token: string, outletDbId: number, requirements: DeliveryRequirements): Promise<Outlet> {
  return toOutlet(await apiRequest<ApiOutlet>(API_ENDPOINTS.outlets.detail(outletDbId), { method: 'PATCH', token, body: requirementsBody(requirements) }))
}

export async function createOutlet(token: string, outlet: NewOutlet): Promise<Outlet> {
  return toOutlet(
    await apiRequest<ApiOutlet>(API_ENDPOINTS.outlets.list, {
      method: 'POST',
      token,
      body: { ...requirementsBody(outlet), uniqueId: outlet.uniqueId.trim(), brand: outlet.brand, name: outlet.name.trim() || undefined },
    }),
  )
}

export async function setOutletAvailability(token: string, outletDbId: number, available: boolean): Promise<Outlet> {
  return toOutlet(await apiRequest<ApiOutlet>(API_ENDPOINTS.outlets.availability(outletDbId), { method: 'PATCH', token, body: { isAvailable: available } }))
}
