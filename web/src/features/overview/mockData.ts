export type RouteCategory = 'Errors' | 'Success' | 'Info'
export type Stop = { name: string; address: string; time: string; window: string }
export type DeliveryRoute = {
  id: string; type: string; category: RouteCategory; status: string
  recorded: number; updated: string; stops: Stop[]
}

const stops: Stop[] = [
  { name: 'Pick up', address: '42 Baseline Rd, Peliyagoda 11100', time: '06:00', window: '05:30–06:30' },
  { name: 'Keells · Wattala', address: '12 Station Rd, Wattala 11300', time: '06:25', window: '06:00–07:00' },
  { name: 'In sorting centre', address: '15 Negombo Rd, Wattala 11300', time: '06:45', window: '06:30–07:00' },
  { name: 'Fresh · Colombo 04', address: '88 Duplication Rd, Colombo 00400', time: '07:35', window: '07:00–08:00' },
  { name: 'Cargills · Bambalapitiya', address: 'Galle Rd, Colombo 00400', time: '08:20', window: '08:00–09:00' },
  { name: 'Laugfs · Maharagama', address: 'High Level Rd, Maharagama 10280', time: '09:05', window: '08:30–10:00' },
]

export const routes: DeliveryRoute[] = Array.from({ length: 15 }, (_, index) => {
  const category: RouteCategory = index >= 12 ? 'Errors' : index >= 4 ? 'Success' : 'Info'
  const id = index === 0 ? 'VEH021' : index === 1 ? 'VEH032' : `VEH${String(40 + index).padStart(3, '0')}`
  return {
    id, type: index % 3 === 0 ? 'Refrigerated van' : index % 3 === 1 ? 'Dry van' : 'Reefer truck',
    category, status: category === 'Errors' ? 'Delayed' : category === 'Success' ? 'Completed' : 'En route',
    recorded: category === 'Success' ? 6 : index === 0 ? 3 : 2, updated: index === 0 ? '2 minutes ago' : `${index + 2} minutes ago`,
    stops: index === 0 ? stops : stops.map((stop, i) => i === 3 ? { ...stop, name: index === 1 ? 'Sathosa · Piliyandala' : `Outlet ${index + 1} · Colombo`, address: index === 1 ? 'Colombo Rd, Piliyandala 10300' : `${20 + index} Galle Rd, Colombo 00300` } : stop),
  }
})

export const planning = { confirmed: 114, allocated: 102, decision: 12, deferred: 0 }
export const alerts = [
  { id: 'shortfall', title: 'Loading shortfall reported', text: 'The loading team reported missing items for DEMO-103. Review the quantities and decide the next action.', category: 'Errors', tone: 'danger', icon: 'error', time: '5 min ago', to: '/operations', action: 'View order DEMO-103', pending: 'Loading exception review' },
  { id: 'chilled', title: 'Chilled order needs a vehicle', text: 'DEMO-108 requires a refrigerated van. The current allocation cannot accommodate it.', category: 'Errors', tone: 'warning', icon: 'warning', time: '8 min ago', to: '/orders/DEMO-108', action: 'Reassign Vehicle', pending: 'Order allocation' },
  { id: 'delivery', title: 'DEMO-109 delivery confirmed', text: 'Customer signed off at 14:32. All 18 items received in good condition.', category: 'Success', tone: 'success', icon: 'check_circle', time: '2h ago', to: '/trips/VEH032', action: 'View delivery', pending: '' },
  { id: 'departure', title: 'Late departure – Run R-042', text: 'Vehicle left depot 22 min behind schedule. ETA for first drop updated.', category: 'Info', tone: 'info', icon: 'info', time: '3h ago', to: '/trips/VEH021', action: 'View route', pending: '' },
  { id: 'capacity', title: 'Vehicle capacity needs review', text: 'DEMO-106 and DEMO-107 are awaiting vehicle allocation before the plan can be published.', category: 'Errors', tone: 'warning', icon: 'warning', time: '3h ago', to: '/orders', action: 'Review orders', pending: 'Order review' },
  { id: 'completed', title: 'Trip completed – VEH044', text: 'All six stops have been recorded. The vehicle is returning to Peliyagoda Depot.', category: 'Success', tone: 'success', icon: 'check_circle', time: '4h ago', to: '/trips/VEH044', action: 'View trip', pending: '' },
  { id: 'update', title: 'Route location updated', text: 'VEH042 has sent a new location update. Its delivery progress is tracked separately.', category: 'Info', tone: 'info', icon: 'info', time: '4h ago', to: '/trips/VEH042', action: 'View route', pending: '' },
]
