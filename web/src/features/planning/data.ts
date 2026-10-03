export interface PlanStop {
  sequence: number
  outlet: string
  orderId: string
  arrival: string
  window: string
  load: string
}
export interface PlanRoute {
  vehicleId: string
  vehicleType: string
  trip: string
  stops: PlanStop[]
}

// This reviewed plan is the Figma snapshot, independent of the Orders fixtures.
// Its passed constraints are supplied design results, not a live validation run.
export const reviewedPlan = {
  date: '2026-09-29',
  routes: [
    {
      vehicleId: 'VEH021',
      vehicleType: 'Refrigerated Van',
      trip: 'Trip 1',
      stops: [
        { sequence: 1, outlet: 'Keells - Colombo 04', orderId: 'DEMO-101', arrival: '07:30 AM', window: '07:00–09:00', load: '340 kg / 2.4 m³' },
        { sequence: 2, outlet: 'Cargills - Negombo', orderId: 'DEMO-103', arrival: '08:45 AM', window: '08:00–10:00', load: '180 kg / 1.6 m³' },
        { sequence: 3, outlet: 'Food City - Kaduwela', orderId: 'DEMO-108', arrival: '09:50 AM', window: '09:00–11:00', load: '95 kg / 0.8 m³' },
        { sequence: 4, outlet: 'Laugfs - Maharagama', orderId: 'DEMO-112', arrival: '10:40 AM', window: '10:00–12:00', load: '120 kg / 1.1 m³' },
      ],
    },
    {
      vehicleId: 'VEH032',
      vehicleType: 'Dry Van',
      trip: 'Trip 2',
      stops: [
        { sequence: 1, outlet: 'Keells - Colpetty', orderId: 'DEMO-102', arrival: '08:15 AM', window: '08:00–10:00', load: '210 kg / 1.4 m³' },
        { sequence: 2, outlet: 'Sathosa - Piliyandala', orderId: 'DEMO-105', arrival: '09:30 AM', window: '09:00–11:00', load: '310 kg / 2.1 m³' },
        { sequence: 3, outlet: 'Cargills - Nattala', orderId: 'DEMO-109', arrival: '10:45 AM', window: '10:00–12:00', load: '150 kg / 1.0 m³' },
      ],
    },
    {
      vehicleId: 'VEH015',
      vehicleType: 'Chilled Truck',
      trip: 'Trip 1',
      stops: [
        { sequence: 1, outlet: 'Arpico - Kandy Road', orderId: 'DEMO-104', arrival: '07:45 AM', window: '07:00–09:00', load: '420 kg / 3.0 m³' },
        { sequence: 2, outlet: 'Laugfs - Maharagama', orderId: 'DEMO-110', arrival: '09:15 AM', window: '08:30–10:30', load: '190 kg / 1.5 m³' },
      ],
    },
  ] satisfies PlanRoute[],
  deferred: [
    { id: 'DEMO-106', outlet: 'Sathosa - Piliyandala', reason: 'No suitable vehicle capacity', previousDeferrals: 1 },
    { id: 'DEMO-107', outlet: 'Arpico - Kandy Road', reason: 'Awaiting vehicle allocation', previousDeferrals: 0 },
  ],
  constraints: ['Weight capacity', 'Volume capacity', 'Chilled/Frozen compatibility', 'Van-only access', 'Delivery windows', 'Weekly fuel quota', 'Max 2 routes/vehicle/day'],
  issues: 0,
}

export function getReviewedPlan(date: string) {
  return date === reviewedPlan.date ? reviewedPlan : null
}

export function planTotals(plan: typeof reviewedPlan | null) {
  const assigned = plan?.routes.reduce((sum, route) => sum + route.stops.length, 0) ?? 0
  const deferred = plan?.deferred.length ?? 0
  return { confirmed: assigned + deferred, assigned, routes: plan?.routes.length ?? 0, deferred, issues: plan?.issues ?? 0 }
}
