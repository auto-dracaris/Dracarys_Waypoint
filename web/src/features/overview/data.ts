export type RouteFilter = 'All' | 'Errors' | 'Success' | 'Info'
export interface RoutePreview {
  id: string
  category: Exclude<RouteFilter, 'All'>
  status: string
  vehicleType: string
  nextStop: string
  recorded: number
  stops: number
  window: string
  arrival: string
  updated: string
}

// Local previews for screen interactions; replace with the route API later.
export const routes: RoutePreview[] = Array.from({ length: 15 }, (_, index) => ({
  id: `VEH${String(21 + index).padStart(3, '0')}`,
  category: index < 8 ? 'Success' : index < 11 ? 'Errors' : 'Info',
  status: index < 8 ? 'En route' : index < 11 ? 'Needs attention' : 'Scheduled',
  vehicleType: index === 0 ? 'Refrigerated van' : 'Delivery van',
  nextStop: index === 0 ? 'Fresh · Colombo 04' : `Fresh · Colombo ${String(index + 1).padStart(2, '0')}`,
  recorded: index === 0 ? 3 : index < 8 ? 2 : 0,
  stops: 6,
  window: '07:00–08:00',
  arrival: '07:35',
  updated: '2 minutes ago',
}))

export const planningTotals = { confirmed: 114, allocated: 102, decisions: 12, deferred: 0 }
