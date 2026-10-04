import { NotificationsButton } from '@/features/notifications/components/notifications-button'
import { IconButton } from '@/components/ui/icon-button'
import { useEffect, useRef, useState } from 'react'
import MenuRounded from '@mui/icons-material/MenuRounded'
import SearchRounded from '@mui/icons-material/SearchRounded'
import AddRounded from '@mui/icons-material/AddRounded'
import { Button } from '@/components/ui/button'
import { FleetSummary } from '@/features/vehicles/components/fleet-summary'
import { FleetDetails } from '@/features/vehicles/components/fleet-details'
import { useDetailPanel } from '@/components/ui/use-detail-panel'
import { FleetTable } from '@/features/vehicles/components/fleet-table'
import { AvailabilityEditor } from '@/features/vehicles/components/availability-editor'
import { DriverEditor } from '@/features/vehicles/components/driver-editor'
import { VehicleCreator } from '@/features/vehicles/components/vehicle-creator'
import { assignDriver, createVehicle, fetchDrivers, fetchFleetTotals, fetchVehicleDetail, fetchVehicles, setVehicleAvailability } from '@/features/vehicles/api'
import {
  vehicleFilters,
  type Driver,
  type FleetTotals,
  type FleetVehicle,
  type NewVehicle,
  type VehicleAvailability,
  type VehicleDetail,
  type VehicleFilter,
  type VehicleSort,
  type VehicleSortKey,
} from '@/features/vehicles/data'
import type { Paginated } from '@/lib/api-client'
import { useUser } from '@/features/auth/user-context'
import '@/styles/vehicles.css'

// A vehicle named in the URL (e.g. from the Team page) is searched for, selected and shown straight away.
const vehicleFromUrl = () => new URLSearchParams(window.location.search).get('vehicle') ?? ''

export function VehiclesPage({ onNavigate, onOpenNavigation, navigationOpen }: { onNavigate: (page: string) => void; onOpenNavigation: () => void; navigationOpen: boolean }) {
  const { accessToken } = useUser()
  // `null` until the first load settles.
  const [vehicles, setVehicles] = useState<FleetVehicle[] | null>(null)
  const [meta, setMeta] = useState<Paginated<unknown>['meta'] | null>(null)
  const [totals, setTotals] = useState<FleetTotals | null>(null)
  const [drivers, setDrivers] = useState<Driver[]>([])
  const [error, setError] = useState('')
  const [attempt, setAttempt] = useState(0)
  const [page, setPage] = useState(1)
  const [filter, setFilter] = useState<VehicleFilter>('All Vehicles')
  const [query, setQuery] = useState(vehicleFromUrl)
  // What the API is actually asked for; trails `query` so typing doesn't fire a request per key.
  const [searchTerm, setSearchTerm] = useState(vehicleFromUrl)
  const [sort, setSort] = useState<VehicleSort>({ key: null, direction: 'ascending' })
  const [selectedId, setSelectedId] = useState(vehicleFromUrl)
  const [checked, setChecked] = useState(new Set<string>())
  const panel = useDetailPanel(vehicleFromUrl() !== '')
  const [detail, setDetail] = useState<{ vehicleId: string; data: VehicleDetail | null; error: string } | null>(null)
  const [editing, setEditing] = useState<'availability' | 'driver' | 'create' | null>(null)
  const [message, setMessage] = useState('')
  const search = useRef<HTMLInputElement>(null)
  useEffect(() => {
    const shortcut = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        search.current?.focus()
      }
    }
    const syncSelection = () => {
      const id = vehicleFromUrl()
      setSelectedId(id)
      if (id) {
        setQuery(id)
        setSearchTerm(id)
        setPage(1)
      }
    }
    window.addEventListener('keydown', shortcut)
    window.addEventListener('popstate', syncSelection)
    return () => {
      window.removeEventListener('keydown', shortcut)
      window.removeEventListener('popstate', syncSelection)
    }
  }, [])
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchTerm(query)
      setPage(1)
    }, 300)
    return () => clearTimeout(timer)
  }, [query])
  useEffect(() => {
    if (!accessToken) return
    let stale = false
    fetchDrivers(accessToken).then(
      (list) => {
        if (!stale) setDrivers(list)
      },
      () => {},
    )
    return () => {
      stale = true
    }
  }, [accessToken, attempt])
  useEffect(() => {
    if (!accessToken) return
    let stale = false
    Promise.all([fetchVehicles(accessToken, { page, search: searchTerm, filter, sort }), fetchFleetTotals(accessToken)]).then(
      ([list, fleet]) => {
        if (stale) return
        setVehicles(list.items)
        setMeta(list.meta)
        setTotals(fleet)
        setError('')
      },
      (reason: Error) => {
        if (!stale) setError(reason.message)
      },
    )
    return () => {
      stale = true
    }
  }, [accessToken, attempt, page, searchTerm, filter, sort])
  const roster = vehicles ?? []
  const selected = roster.find((vehicle) => vehicle.id === selectedId) ?? roster[0]
  const selectedVehicleId = selected?.id
  const selectedDbId = selected?.dbId
  useEffect(() => {
    if (!accessToken || !selectedVehicleId || selectedDbId === undefined) return
    let stale = false
    fetchVehicleDetail(accessToken, selectedDbId).then(
      (data) => {
        if (!stale) setDetail({ vehicleId: selectedVehicleId, data, error: '' })
      },
      (reason: Error) => {
        if (!stale) setDetail({ vehicleId: selectedVehicleId, data: null, error: reason.message })
      },
    )
    return () => {
      stale = true
    }
  }, [accessToken, selectedVehicleId, selectedDbId, attempt])
  // A result only counts for the vehicle it was loaded for.
  const loadedDetail = detail?.vehicleId === selectedVehicleId ? detail : null
  function onSort(key: VehicleSortKey) {
    setPage(1)
    setSort({ key, direction: sort.key === key && sort.direction === 'ascending' ? 'descending' : 'ascending' })
  }
  function changeFilter(next: VehicleFilter) {
    setFilter(next)
    setPage(1)
  }
  function toggleChecked(id: string) {
    setChecked((previous) => {
      const next = new Set(previous)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }
  async function saveAvailability(availability: VehicleAvailability) {
    if (!selected || !accessToken) return
    const affected = await setVehicleAvailability(accessToken, selected.dbId, availability)
    setMessage(`Availability updated for ${selected.id}.${affected ? ` ${affected} planned ${affected === 1 ? 'trip needs' : 'trips need'} review.` : ''}`)
    setEditing(null)
    setAttempt((count) => count + 1)
  }
  async function saveDriver(driverId: number | null) {
    if (!selected || !accessToken) return
    await assignDriver(accessToken, selected.dbId, driverId)
    setMessage(driverId === null ? `Driver unassigned from ${selected.id}.` : `Driver assigned to ${selected.id}.`)
    setEditing(null)
    setAttempt((count) => count + 1)
  }
  async function create(vehicle: NewVehicle) {
    if (!accessToken) return
    const created = await createVehicle(accessToken, vehicle)
    // Search for the new vehicle so it is on screen and selected.
    setQuery(created.id)
    setSearchTerm(created.id)
    setFilter('All Vehicles')
    setPage(1)
    setSelectedId(created.id)
    setMessage(`Vehicle ${created.id} added to ${created.depot}.`)
    setEditing(null)
    setAttempt((count) => count + 1)
  }
  return (
    <div className="overview-canvas vehicles-canvas">
      <header className="overview-header fleet-page-header">
        <div className="flex items-center gap-wp-space-lg">
          <IconButton type="button" aria-label="Open navigation" aria-expanded={navigationOpen} aria-controls="main-navigation" className="mobile-menu" onClick={onOpenNavigation}>
            <MenuRounded fontSize="inherit" />
          </IconButton>
          <h1 className="type-display-lg-medium">Vehicles</h1>
        </div>
        <div className="fleet-header-actions">
          <NotificationsButton />
        </div>
      </header>
      <nav aria-label="Breadcrumb" className="fleet-breadcrumb type-text-sm-medium">
        {['Home', 'Dashboard', 'Management'].map((label) => (
          <span key={label}>
            <button onClick={() => onNavigate(label)}>{label}</button>
            <span aria-hidden="true">/</span>
          </span>
        ))}
        <strong aria-current="page" className="text-wp-text-primary type-text-sm-semibold">
          Vehicles
        </strong>
      </nav>
      <FleetSummary totals={totals} onReview={() => onNavigate('Vehicle change impact review')} />
      {message && (
        <p role="status" className="fleet-update-message type-text-sm-medium">
          {message}
        </p>
      )}
      <div className={`fleet-workspace ${panel.mode === 'modal' ? 'fleet-workspace--full' : ''}`}>
        <section className="fleet-inventory" aria-labelledby="fleet-planning-title">
          <h2 id="fleet-planning-title" className="fleet-inventory-title type-display-md-medium">
            Delivery planning
          </h2>
          <div className="fleet-toolbar">
            <div className="route-filters fleet-filters" role="group" aria-label="Filter vehicles">
              {vehicleFilters.map((label) => (
                <button
                  key={label}
                  aria-pressed={filter === label}
                  className={filter === label ? 'route-filter--active type-text-sm-medium' : 'type-text-sm-regular'}
                  onClick={() => changeFilter(label)}
                >
                  {label}
                  <span className="text-wp-text-quaternary">
                    {totals ? (label === 'All Vehicles' ? totals.total : label === 'Available' ? totals.available : label === 'In workshop' ? totals.inWorkshop : totals.unavailable) : '—'}
                  </span>
                </button>
              ))}
            </div>
            <div className="route-search fleet-search">
              <SearchRounded fontSize="inherit" />
              <input ref={search} className="type-text-sm-regular" placeholder="Search" aria-label="Search vehicles" value={query} onChange={(event) => setQuery(event.target.value)} />
              <kbd className="type-text-xs-medium">⌘K</kbd>
            </div>
            <Button variant="primary" leadingIcon={<AddRounded fontSize="inherit" />} onClick={() => setEditing('create')}>
              Add vehicle
            </Button>
          </div>
          <FleetTable
            vehicles={roster}
            checked={checked}
            selectedId={selected?.id}
            sort={sort}
            loading={!vehicles && !error}
            error={error}
            hasVehicles={(totals?.total ?? 0) > 0}
            meta={meta}
            onPage={setPage}
            onSort={onSort}
            onCheck={toggleChecked}
            onSelect={(id) => {
              setSelectedId(id)
              panel.show()
            }}
            onClear={() => {
              setQuery('')
              setSearchTerm('')
              setFilter('All Vehicles')
              setPage(1)
            }}
            onRetry={() => {
              setError('')
              setAttempt((count) => count + 1)
            }}
          />
        </section>
        {selected ? (
          <FleetDetails
            panel={panel}
            vehicle={selected}
            detail={loadedDetail?.data ?? null}
            detailError={loadedDetail?.error ?? ''}
            onNavigate={onNavigate}
            onEdit={() => setEditing('availability')}
            onAssignDriver={() => setEditing('driver')}
          />
        ) : (
          panel.mode === 'side' && <aside className="fleet-no-selection text-wp-text-tertiary type-text-sm-regular">Select a matching vehicle to view its details.</aside>
        )}
      </div>
      {editing === 'availability' && selected && <AvailabilityEditor key={selected.id} vehicle={selected} onSave={saveAvailability} onClose={() => setEditing(null)} />}
      {editing === 'driver' && selected && loadedDetail?.data && (
        <DriverEditor key={selected.id} vehicle={selected} currentDriverId={loadedDetail.data.driver?.id ?? null} drivers={drivers} onSave={saveDriver} onClose={() => setEditing(null)} />
      )}
      {editing === 'create' && <VehicleCreator onCreate={create} onClose={() => setEditing(null)} />}
    </div>
  )
}
