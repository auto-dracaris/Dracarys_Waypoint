import {
  getVehicleRouteData,
  type DeliveryMapLocations,
  type MapPosition,
  type RouteStopItem,
} from './map-data'

export type { RouteStopItem }

export type RouteFilter = 'All' | 'Errors' | 'Success' | 'Unallocated'

export interface RoutePreview {
  id: string
  category: Exclude<RouteFilter, 'All'>
  status: string
  vehicleType: string
  tripName: string
  depotName: string
  depotAddress: string
  nextStop: string // Outlet ID (e.g. OUT008 or Parked at Depot)
  outletId?: string // Outlet ID (e.g. OUT008)
  destinationOutletId?: string // Destination Outlet ID (e.g. OUT010)
  destinationDistrict?: string
  destinationPosition?: MapPosition
  recorded: number
  stops: number
  window: string
  arrival: string
  updated: string
  map: DeliveryMapLocations
  routeStops: RouteStopItem[]
}

function getVehicleType(idNum: number): string {
  if (idNum === 21) return 'Refrigerated van'
  if (idNum === 32) return 'Dry van'
  if (idNum === 15) return 'Chilled truck'
  if (idNum >= 1 && idNum <= 7) return 'Refrigerated truck'
  if (idNum >= 8 && idNum <= 34) return 'Delivery truck'
  if (idNum >= 35 && idNum <= 36) return 'Refrigerated van'
  if (idNum >= 37 && idNum <= 38) return 'Delivery van'
  if (idNum >= 39 && idNum <= 43) return 'Refrigerated truck'
  if (idNum >= 44 && idNum <= 56) return 'Delivery truck'
  if (idNum >= 57 && idNum <= 58) return 'Refrigerated van'
  return 'Delivery van'
}

// Complete fleet of 60 vehicles (VEH001..VEH060) matching the database dataset
export const routes: RoutePreview[] = Array.from({ length: 60 }, (_, index) => {
  const idNum = index + 1
  const id = `VEH${String(idNum).padStart(3, '0')}`
  const isPeliyagoda = index < 38

  // Allocation & operational status
  const isParked = (isPeliyagoda && index >= 28) || (!isPeliyagoda && index >= 48)
  const isError = !isParked && index % 5 === 0

  let category: Exclude<RouteFilter, 'All'>
  let status: string
  if (isParked) {
    category = 'Unallocated'
    status = 'Unallocated'
  } else if (isError) {
    category = 'Errors'
    status = 'Needs attention'
  } else {
    category = 'Success'
    status = 'En route'
  }

  const routeData = getVehicleRouteData(index)

  return {
    id,
    category,
    status,
    vehicleType: getVehicleType(idNum),
    tripName: routeData.tripName,
    depotName: routeData.depotName,
    depotAddress: routeData.depotAddress,
    nextStop: routeData.nextStop,
    outletId: routeData.outletId || undefined,
    destinationOutletId: routeData.destinationOutletId || undefined,
    destinationDistrict: routeData.destinationDistrict,
    destinationPosition: routeData.destinationPosition,
    recorded: routeData.recorded,
    stops: routeData.stopsCount,
    window: routeData.window,
    arrival: routeData.arrival,
    updated: isParked ? 'Parked at depot' : routeData.updated,
    map: routeData.map,
    routeStops: routeData.routeStops,
  }
})

export const planningTotals = { confirmed: 114, allocated: 102, decisions: 12, deferred: 0 }
