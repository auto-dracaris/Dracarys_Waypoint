import type { User } from '@/features/auth/api'

export type StaffRole = 'Dispatcher' | 'Store Manager' | 'Driver' | 'Loader'
export type TeamFilter = 'All' | 'Dispatchers' | 'Store Managers' | 'Drivers' | 'Loaders'
export type TeamSortKey = 'name' | 'phone' | 'role' | 'depot' | 'assignment'
export interface TeamSort {
  key: TeamSortKey | null
  direction: 'ascending' | 'descending'
}
export interface StaffTrip {
  id: string
  title: string
  status: 'Planned' | 'Loading' | 'In progress' | 'Completed'
  recordedStops: number
  totalStops: number
  nextStop?: string
}
export interface OutletOption {
  id: string
  label: string
}
export interface StaffMember {
  id: string
  name: string
  initials: string
  phone: string
  role: StaffRole
  status: string
  // The account as the API knows it, for the role and status editor.
  userId: number
  roleKey: User['role']
  statusKey: User['status']
  depot: string
  // The vehicle's dataset id (e.g. VEH021) is what staff see; the API addresses it by row id.
  vehicleId: string | null
  vehicleDbId: number | null
  vehicleLabel: string | null
  // The outlet a store manager orders for, by its dataset id (e.g. OUT001).
  outletId: string | null
  assignment: string
}
// Mirrors api/src/common/enums/depot.enum.ts; the API takes and returns a depot by this name.
export const depots = ['Peliyagoda', 'Kandy']
export const staffRoleLabels: Record<User['role'], StaffRole> = { dispatcher: 'Dispatcher', store_manager: 'Store Manager', driver: 'Driver', loader: 'Loader' }
export const staffStatusLabels: Record<User['status'], string> = { active: 'Active', pending: 'Pending verification', blocked: 'Blocked', deleted: 'Deleted' }
export const staffStatusTones: Record<User['status'], 'success' | 'warning' | 'error' | 'neutral'> = { active: 'success', pending: 'warning', blocked: 'error', deleted: 'neutral' }
export const teamFilters: TeamFilter[] = ['All', 'Dispatchers', 'Store Managers', 'Drivers', 'Loaders']
const filterRoles: Record<Exclude<TeamFilter, 'All'>, StaffRole> = { Dispatchers: 'Dispatcher', 'Store Managers': 'Store Manager', Drivers: 'Driver', Loaders: 'Loader' }
const matchesFilter = (member: StaffMember, filter: TeamFilter) => filter === 'All' || member.role === filterRoles[filter]

export function countTeam(members: StaffMember[], filter: TeamFilter): number {
  return members.filter((member) => matchesFilter(member, filter)).length
}

export function selectTeam(members: StaffMember[], filter: TeamFilter, query: string, sort: TeamSort): StaffMember[] {
  const term = query.trim().toLowerCase()
  const visible = members.filter(
    (member) => matchesFilter(member, filter) && `${member.name} ${member.phone} ${member.role} ${member.status} ${member.depot} ${member.assignment}`.toLowerCase().includes(term),
  )
  if (sort.key) {
    const key = sort.key
    visible.sort((a, b) => a[key].localeCompare(b[key]) * (sort.direction === 'ascending' ? 1 : -1))
  }
  return visible
}
