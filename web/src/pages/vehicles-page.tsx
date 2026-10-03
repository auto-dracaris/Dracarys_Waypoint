import { IconButton } from '@/components/ui/icon-button'
import { useEffect, useRef, useState } from 'react'
import NotificationsRounded from '@mui/icons-material/NotificationsRounded'
import MenuRounded from '@mui/icons-material/MenuRounded'
import SearchRounded from '@mui/icons-material/SearchRounded'
import { Button } from '@/components/ui/button'
import { DateRangePicker } from '@/components/ui/date-range-picker'
import { FleetSummary } from '@/features/vehicles/components/fleet-summary'
import { FleetDetails } from '@/features/vehicles/components/fleet-details'
import { FleetTable, type VehicleSort, type VehicleSortKey } from '@/features/vehicles/components/fleet-table'
import { AvailabilityEditor } from '@/features/vehicles/components/availability-editor'
import { initialVehicles, initialFleetTotals, type FleetVehicle, type VehicleFilter, type VehicleAvailability } from '@/features/vehicles/data'
import '@/styles/vehicles.css'

const filters: VehicleFilter[] = ['All Vehicles', 'Available', 'In Workshop']

export function VehiclesPage({ onNavigate, onOpenNavigation, navigationOpen }: { onNavigate: (page: string) => void; onOpenNavigation: () => void; navigationOpen: boolean }) {
  const [vehicles, setVehicles] = useState(initialVehicles)
  const [filter, setFilter] = useState<VehicleFilter>('Available')
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState<VehicleSort>({ key: null, direction: 'ascending' })
  const [selectedId, setSelectedId] = useState(() => new URLSearchParams(window.location.search).get('vehicle') ?? 'VEH021')
  const [checked, setChecked] = useState(new Set(['VEH022', 'VEH024']))
  const [editing, setEditing] = useState<FleetVehicle | null>(null)
  const [message, setMessage] = useState('')
  const search = useRef<HTMLInputElement>(null)
  useEffect(() => {
    const shortcut = (event: KeyboardEvent) => { if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); search.current?.focus() } }
    window.addEventListener('keydown', shortcut)
    const syncSelection = () => setSelectedId(new URLSearchParams(window.location.search).get('vehicle') ?? 'VEH021')
    window.addEventListener('popstate', syncSelection)
    return () => { window.removeEventListener('keydown', shortcut); window.removeEventListener('popstate', syncSelection) }
  }, [])
  const visible = vehicles.filter(vehicle => (filter === 'All Vehicles' || vehicle.availability === (filter === 'In Workshop' ? 'In workshop' : filter)) && `${vehicle.id} ${vehicle.type} ${vehicle.driver} ${vehicle.allocation}`.toLowerCase().includes(query.trim().toLowerCase()))
  if (sort.key) {
    const key = sort.key
    visible.sort((a, b) => {
      const left = a[key], right = b[key]
      const comparison = typeof left === 'number' && typeof right === 'number' ? left - right : String(left).localeCompare(String(right))
      return sort.direction === 'ascending' ? comparison : -comparison
    })
  }
  const selected = visible.find(vehicle => vehicle.id === selectedId) ?? visible[0]
  const totals = { ...initialFleetTotals }
  let changes = 0
  for (const vehicle of vehicles) {
    const original = initialVehicles.find(item => item.id === vehicle.id)!
    if (vehicle.availability !== original.availability) { totals[original.availability]--; totals[vehicle.availability]++; changes++ }
  }
  function onSort(key: VehicleSortKey) { setSort({ key, direction: sort.key === key && sort.direction === 'ascending' ? 'descending' : 'ascending' }) }
  function toggleChecked(id: string) { setChecked(previous => { const next = new Set(previous); if (next.has(id)) next.delete(id); else next.add(id); return next }) }
  function saveAvailability(availability: VehicleAvailability) {
    if (!editing) return
    setVehicles(previous => previous.map(vehicle => vehicle.id === editing.id ? { ...vehicle, availability } : vehicle))
    setMessage(`Availability updated for ${editing.id}.`)
    setEditing(null)
  }
  return <div className="overview-canvas vehicles-canvas">
    <header className="overview-header fleet-page-header"><div className="flex items-center gap-wp-space-lg"><IconButton type="button" aria-label="Open navigation" aria-expanded={navigationOpen} aria-controls="main-navigation" className="mobile-menu" onClick={onOpenNavigation}><MenuRounded fontSize="inherit" /></IconButton><h1 className="type-display-lg-medium">Vehicles</h1></div><div className="fleet-header-actions"><DateRangePicker /><Button variant="danger" size="md" className="decision-button" onClick={() => onNavigate('Order notifications')}><NotificationsRounded fontSize="inherit" />3 orders need a decision</Button></div></header>
    <nav aria-label="Breadcrumb" className="fleet-breadcrumb type-text-sm-medium">{['Home', 'Dashboard', 'Management'].map(label => <span key={label}><button onClick={() => onNavigate(label)}>{label}</button><span aria-hidden="true">/</span></span>)}<strong aria-current="page" className="text-wp-text-primary type-text-sm-semibold">Vehicles</strong></nav>
    <FleetSummary totals={totals} reviewCount={1 + changes} onReview={() => onNavigate('Vehicle change impact review')} />
    {message && <p role="status" className="fleet-update-message type-text-sm-medium">{message}</p>}
    <div className="fleet-workspace">
      <section className="fleet-inventory" aria-labelledby="fleet-planning-title">
        <h2 id="fleet-planning-title" className="fleet-inventory-title type-display-md-medium">Delivery planning</h2>
        <div className="fleet-toolbar"><div className="route-filters fleet-filters" role="group" aria-label="Filter vehicles">{filters.map(label => <button key={label} aria-pressed={filter === label} className={filter === label ? 'route-filter--active type-text-sm-medium' : 'type-text-sm-regular'} onClick={() => setFilter(label)}>{label}</button>)}</div><div className="route-search fleet-search"><SearchRounded fontSize="inherit" /><input ref={search} className="type-text-sm-regular" placeholder="Search" aria-label="Search vehicles" value={query} onChange={event => setQuery(event.target.value)} /><kbd className="type-text-xs-medium">⌘K</kbd></div></div>
        <FleetTable vehicles={visible} checked={checked} selectedId={selected?.id} sort={sort} showPlaceholders={!query.trim()} onSort={onSort} onCheck={toggleChecked} onSelect={setSelectedId} onClear={() => { setQuery(''); setFilter('All Vehicles') }} onAddColumn={() => onNavigate('Customize vehicle columns')} />
      </section>
      {selected ? <FleetDetails vehicle={selected} onNavigate={onNavigate} onEdit={() => setEditing(selected)} /> : <aside className="fleet-no-selection text-wp-text-tertiary type-text-sm-regular">Select a matching vehicle to view its details.</aside>}
    </div>
    {editing && <AvailabilityEditor key={editing.id} vehicle={editing} onSave={saveAvailability} onClose={() => setEditing(null)} />}
  </div>
}
