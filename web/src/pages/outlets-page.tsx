import { HubBreadcrumbs } from '@/components/layout/hub-breadcrumbs'
import { NotificationsButton } from '@/features/notifications/components/notifications-button'
import { IconButton } from '@/components/ui/icon-button'
import { useEffect, useRef, useState } from 'react'
import MenuRounded from '@mui/icons-material/MenuRounded'
import AddRounded from '@mui/icons-material/AddRounded'
import SearchRounded from '@mui/icons-material/SearchRounded'
import StorefrontRounded from '@mui/icons-material/StorefrontRounded'
import LocalShippingRounded from '@mui/icons-material/LocalShippingRounded'
import StoreMallDirectoryRounded from '@mui/icons-material/StoreMallDirectoryRounded'
import { Button } from '@/components/ui/button'
import { OutletTable } from '@/features/outlets/components/outlet-table'
import { OutletDetails } from '@/features/outlets/components/outlet-details'
import { useDetailPanel } from '@/components/ui/use-detail-panel'
import { OutletEditor } from '@/features/outlets/components/outlet-editor'
import { createOutlet, fetchDistricts, fetchOutletOverview, fetchOutletSummary, fetchOutlets, setOutletAvailability, updateOutlet } from '@/features/outlets/api'
import {
  outletFilters,
  type DeliveryRequirements,
  type District,
  type NewOutlet,
  type Outlet,
  type OutletAvailability,
  type OutletFilter,
  type OutletOverview,
  type OutletSort,
  type OutletSortKey,
  type OutletSummary,
  type PageMeta,
} from '@/features/outlets/data'
import { useUser } from '@/features/auth/user-context'
import '@/styles/vehicles.css'
import '@/styles/outlets.css'

const metrics: {
  label: string
  value: (summary: OutletSummary) => number
  Icon: typeof StorefrontRounded
}[] = [
  { label: 'Total outlets', value: (summary) => summary.total, Icon: StorefrontRounded },
  { label: 'Van-only outlets', value: (summary) => summary.vanOnly, Icon: LocalShippingRounded },
  { label: 'Mall outlets', value: (summary) => summary.mallDock, Icon: StoreMallDirectoryRounded },
]

export function OutletsPage({ onNavigate, onOpenNavigation, navigationOpen }: { onNavigate: (page: string) => void; onOpenNavigation: () => void; navigationOpen: boolean }) {
  const { accessToken } = useUser()
  // `null` until the first load settles.
  const [outlets, setOutlets] = useState<Outlet[] | null>(null)
  const [meta, setMeta] = useState<PageMeta | null>(null)
  const [page, setPage] = useState(1)
  const [districts, setDistricts] = useState<District[]>([])
  const [summary, setSummary] = useState<OutletSummary | null>(null)
  const [error, setError] = useState('')
  const [attempt, setAttempt] = useState(0)
  const [overview, setOverview] = useState<{
    outletId: string
    data: OutletOverview | null
    error: string
  } | null>(null)
  const [filter, setFilter] = useState<OutletFilter>('All')
  const [query, setQuery] = useState('')
  // What the API is actually asked for; trails `query` so typing doesn't fire a request per key.
  const [searchTerm, setSearchTerm] = useState('')
  const [sort, setSort] = useState<OutletSort>({ key: null, direction: 'ascending' })
  const [selectedId, setSelectedId] = useState('')
  const panel = useDetailPanel()
  const [editing, setEditing] = useState<{
    id?: string
    mode: 'create' | 'requirements' | 'availability'
  } | null>(null)
  const [message, setMessage] = useState('')
  const search = useRef<HTMLInputElement>(null)
  useEffect(() => {
    const shortcut = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        search.current?.focus()
      }
    }
    window.addEventListener('keydown', shortcut)
    return () => window.removeEventListener('keydown', shortcut)
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
    fetchDistricts(accessToken).then(
      (list) => {
        if (!stale) setDistricts(list)
      },
      () => {},
    )
    return () => {
      stale = true
    }
  }, [accessToken])
  useEffect(() => {
    if (!accessToken) return
    let stale = false
    Promise.all([fetchOutlets(accessToken, { page, search: searchTerm, filter, sort }), fetchOutletSummary(accessToken)]).then(
      ([list, totals]) => {
        if (!stale) {
          setOutlets(list.items)
          setMeta(list.meta)
          setSummary(totals)
          setError('')
        }
      },
      (reason: Error) => {
        if (!stale) setError(reason.message)
      },
    )
    return () => {
      stale = true
    }
  }, [accessToken, attempt, page, searchTerm, filter, sort])
  const roster = outlets ?? []
  const selected = roster.find((outlet) => outlet.id === selectedId) ?? roster[0]
  const selectedOutletId = selected?.id
  const selectedDbId = selected?.dbId
  useEffect(() => {
    if (!accessToken || !selectedOutletId || selectedDbId === undefined) return
    let stale = false
    fetchOutletOverview(accessToken, selectedDbId).then(
      (data) => {
        if (!stale) setOverview({ outletId: selectedOutletId, data, error: '' })
      },
      (reason: Error) => {
        if (!stale) setOverview({ outletId: selectedOutletId, data: null, error: reason.message })
      },
    )
    return () => {
      stale = true
    }
  }, [accessToken, selectedOutletId, selectedDbId, attempt])
  // A result only counts for the outlet it was loaded for.
  const loadedOverview = overview?.outletId === selectedOutletId ? overview : null
  const editingOutlet = roster.find((outlet) => outlet.id === editing?.id)
  function onSort(key: OutletSortKey) {
    setPage(1)
    setSort({
      key,
      direction: sort.key === key && sort.direction === 'ascending' ? 'descending' : 'ascending',
    })
  }
  async function save(requirements: DeliveryRequirements, availability: OutletAvailability) {
    if (!editing || !editingOutlet || !accessToken) return
    const saved =
      editing.mode === 'requirements' ? await updateOutlet(accessToken, editingOutlet.dbId, requirements) : await setOutletAvailability(accessToken, editingOutlet.dbId, availability === 'Available')
    setOutlets((previous) => previous && previous.map((outlet) => (outlet.id === saved.id ? saved : outlet)))
    setMessage(`${editing.mode === 'requirements' ? 'Delivery requirements' : `Availability (${availability.toLowerCase()})`} updated for ${editing.id}.`)
    setEditing(null)
    // Reload so the summary stays in step with the change.
    setAttempt((count) => count + 1)
  }
  async function create(outlet: NewOutlet) {
    if (!accessToken) return
    const created = await createOutlet(accessToken, outlet)
    // Search for the new outlet so it is on screen and selected.
    setQuery(created.id)
    setSearchTerm(created.id)
    setFilter('All')
    setPage(1)
    setSelectedId(created.id)
    setMessage(`Outlet ${created.id} added to ${created.depot}.`)
    setEditing(null)
    setAttempt((count) => count + 1)
  }
  function changeFilter(next: OutletFilter) {
    setFilter(next)
    setPage(1)
  }
  return (
    <div className="overview-canvas vehicles-canvas outlets-canvas">
      <header className="overview-header fleet-page-header">
        <div className="flex items-center gap-wp-space-lg">
          <IconButton type="button" aria-label="Open navigation" aria-expanded={navigationOpen} aria-controls="main-navigation" className="mobile-menu" onClick={onOpenNavigation}>
            <MenuRounded fontSize="inherit" />
          </IconButton>
          <h1 className="type-display-lg-medium">Outlets</h1>
        </div>
        <div className="fleet-header-actions">
          <NotificationsButton />
        </div>
      </header>
      <HubBreadcrumbs />
      <section className="outlet-metrics" aria-label="Outlet summary">
        {metrics.map(({ label, value, Icon }) => (
          <div className="outlet-metric" key={label}>
            <div>
              <Icon fontSize="inherit" />
              <span className="type-text-md-medium text-wp-text-secondary">{label}</span>
            </div>
            <strong className="type-display-xl-semibold">{summary ? value(summary) : '—'}</strong>
          </div>
        ))}
      </section>
      {message && (
        <p role="status" className="fleet-update-message type-text-sm-medium">
          {message}
        </p>
      )}
      <div className={`fleet-workspace outlet-workspace ${panel.mode === 'modal' ? 'fleet-workspace--full' : ''}`}>
        <section className="fleet-inventory" aria-labelledby="outlet-planning-title">
          <h2 id="outlet-planning-title" className="fleet-inventory-title type-display-md-medium">
            Delivery planning
          </h2>
          <div className="fleet-toolbar outlet-toolbar">
            <div className="route-filters outlet-filters" role="group" aria-label="Filter outlets">
              {outletFilters.map((label) => (
                <button
                  key={label}
                  aria-pressed={filter === label}
                  className={filter === label ? 'route-filter--active type-text-sm-medium' : 'type-text-sm-regular'}
                  onClick={() => changeFilter(label)}
                >
                  {label}
                  <span className="text-wp-text-quaternary">{summary ? (label === 'All' ? summary.total : label === 'Available' ? summary.available : summary.unavailable) : '—'}</span>
                </button>
              ))}
            </div>
            <div className="route-search fleet-search">
              <SearchRounded fontSize="inherit" />
              <input ref={search} className="type-text-sm-regular" placeholder="Search" aria-label="Search outlets" value={query} onChange={(event) => setQuery(event.target.value)} />
              <kbd className="type-text-xs-medium">⌘K</kbd>
            </div>
            <Button variant="primary" leadingIcon={<AddRounded fontSize="inherit" />} disabled={!districts.length} onClick={() => setEditing({ mode: 'create' })}>
              Add outlet
            </Button>
          </div>
          <OutletTable
            outlets={roster}
            selectedId={selected?.id}
            sort={sort}
            loading={!outlets && !error}
            error={error}
            hasOutlets={(summary?.total ?? 0) > 0}
            meta={meta}
            onPage={setPage}
            onSort={onSort}
            onSelect={(id) => {
              setSelectedId(id)
              panel.show()
            }}
            onClear={() => {
              setQuery('')
              setSearchTerm('')
              setFilter('All')
              setPage(1)
            }}
            onRetry={() => {
              setError('')
              setAttempt((count) => count + 1)
            }}
          />
        </section>
        {selected ? (
          <OutletDetails
            panel={panel}
            outlet={selected}
            overview={loadedOverview?.data ?? null}
            overviewError={loadedOverview?.error ?? ''}
            onNavigate={onNavigate}
            onEdit={() => setEditing({ id: selected.id, mode: 'requirements' })}
            onAvailability={() => setEditing({ id: selected.id, mode: 'availability' })}
          />
        ) : (
          panel.mode === 'side' && <aside className="fleet-no-selection text-wp-text-tertiary type-text-sm-regular">Select a matching outlet to view its details.</aside>
        )}
      </div>
      {editing && (editing.mode === 'create' || editingOutlet) && (
        <OutletEditor key={`${editing.id}-${editing.mode}`} outlet={editingOutlet} mode={editing.mode} districts={districts} onSave={save} onCreate={create} onClose={() => setEditing(null)} />
      )}
    </div>
  )
}
