export type StaffRole = 'Driver' | 'Loader'
export type TeamFilter = 'All' | 'Drivers' | 'Loaders'
export type TeamSortKey = 'name' | 'id' | 'role' | 'depot' | 'assignment'
export interface TeamSort { key: TeamSortKey | null; direction: 'ascending' | 'descending' }
export interface StaffTrip {
  id: string
  title: string
  status: 'Completed' | 'In progress'
  recordedStops: number
  totalStops: number
  nextStop?: string
}
export interface StaffMember {
  id: string
  name: string
  initials: string
  role: StaffRole
  depot: string
  vehicleId: string | null
  assignment: string
  // Null indicates trip details were not supplied by Figma.
  trips: StaffTrip[] | null
}
export const teamFilters: TeamFilter[] = ['All', 'Drivers', 'Loaders']
export const teamMetrics = [72, 12, 18] as const
export const teamMembers: StaffMember[] = [
  { id: 'DRV021', name: 'Nimal Silva', initials: 'NS', role: 'Driver', depot: 'Peliyagoda', vehicleId: 'VEH021', assignment: 'VEH021 · 2 trips', trips: [
    { id: '01', title: 'Trip 01', status: 'Completed', recordedStops: 4, totalStops: 4 },
    { id: '02', title: 'Trip 02', status: 'In progress', recordedStops: 1, totalStops: 3, nextStop: 'Fresh · Wattala' },
  ] },
  { id: 'DRV022', name: 'Kasun Perera', initials: 'KP', role: 'Driver', depot: 'Peliyagoda', vehicleId: 'VEH022', assignment: 'VEH022 · 1 trip', trips: null },
  { id: 'LDR003', name: 'Amali Fernando', initials: 'AF', role: 'Loader', depot: 'Peliyagoda', vehicleId: null, assignment: 'Depot loading team', trips: null },
  { id: 'DRV023', name: 'Dinesh Kumara', initials: 'DK', role: 'Driver', depot: 'Peliyagoda', vehicleId: 'VEH023', assignment: 'VEH023 · 1 trip', trips: null },
  { id: 'LDR004', name: 'Tharindu Dias', initials: 'TD', role: 'Loader', depot: 'Peliyagoda', vehicleId: null, assignment: 'Depot loading team', trips: null },
  { id: 'DRV025', name: 'Ruwan Senanayake', initials: 'RS', role: 'Driver', depot: 'Peliyagoda', vehicleId: 'VEH025', assignment: 'VEH025 · No trips', trips: [] },
]

export function selectTeam(members: StaffMember[], filter: TeamFilter, query: string, sort: TeamSort): StaffMember[] {
  const term = query.trim().toLowerCase()
  const visible = members.filter(member => (filter === 'All' || member.role === (filter === 'Drivers' ? 'Driver' : 'Loader')) && `${member.name} ${member.id} ${member.role} ${member.depot} ${member.assignment}`.toLowerCase().includes(term))
  if (sort.key) {
    const key = sort.key
    visible.sort((a, b) => a[key].localeCompare(b[key]) * (sort.direction === 'ascending' ? 1 : -1))
  }
  return visible
}
