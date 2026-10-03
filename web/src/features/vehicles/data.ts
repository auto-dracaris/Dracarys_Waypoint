export type VehicleAvailability = 'Available' | 'In workshop' | 'Unavailable'
export type VehicleFilter = 'All Vehicles' | 'Available' | 'In Workshop'
export interface FleetVehicle {
  id: string
  type: string
  weight: number
  volume: number
  plannedTrips: number
  allocation: 'Allocated' | 'Unallocated'
  availability: VehicleAvailability
  driver: string
  temperature: string
  fuel: number | null
}

// Six populated rows from Figma; the four remaining visual rows are placeholders.
export const initialVehicles: FleetVehicle[] = [
  {
    id: 'VEH021',
    type: 'Reefer truck',
    weight: 2000,
    volume: 12,
    plannedTrips: 2,
    allocation: 'Allocated',
    availability: 'Available',
    driver: 'Nimal Silva',
    temperature: 'Chilled / Frozen',
    fuel: 84,
  },
  { id: 'VEH022', type: 'Dry box', weight: 3000, volume: 18, plannedTrips: 1, allocation: 'Unallocated', availability: 'Available', driver: 'Not assigned', temperature: 'Ambient', fuel: null },
  { id: 'VEH023', type: 'Refrigerated van', weight: 800, volume: 4, plannedTrips: 1, allocation: 'Allocated', availability: 'Available', driver: 'Not assigned', temperature: 'Chilled', fuel: null },
  { id: 'VEH024', type: 'Dry box', weight: 3000, volume: 18, plannedTrips: 0, allocation: 'Allocated', availability: 'Available', driver: 'Not assigned', temperature: 'Ambient', fuel: null },
  { id: 'VEH025', type: 'Van', weight: 900, volume: 5, plannedTrips: 0, allocation: 'Unallocated', availability: 'Available', driver: 'Not assigned', temperature: 'Ambient', fuel: null },
  {
    id: 'VEH026',
    type: 'Reefer truck',
    weight: 2000,
    volume: 12,
    plannedTrips: 0,
    allocation: 'Allocated',
    availability: 'Available',
    driver: 'Not assigned',
    temperature: 'Chilled / Frozen',
    fuel: null,
  },
]

export const initialFleetTotals = { vehicles: 30, Available: 26, 'In workshop': 3, Unavailable: 1 }
export const draftTrips = [
  { title: 'Trip 01 · 05:30 – 09:15', subtitle: '4 stops · 6 orders' },
  { title: 'Trip 02 · 10:00 – 13:30', subtitle: '3 stops · 4 orders' },
]
