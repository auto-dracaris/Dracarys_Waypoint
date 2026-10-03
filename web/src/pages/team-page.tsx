import { IconButton } from '@/components/ui/icon-button'
import { useEffect, useRef, useState } from 'react'
import NotificationsRounded from '@mui/icons-material/NotificationsRounded'
import MenuRounded from '@mui/icons-material/MenuRounded'
import SearchRounded from '@mui/icons-material/SearchRounded'
import GroupsRounded from '@mui/icons-material/GroupsRounded'
import LocalShippingRounded from '@mui/icons-material/LocalShippingRounded'
import Inventory2Rounded from '@mui/icons-material/Inventory2Rounded'
import SupportAgentRounded from '@mui/icons-material/SupportAgentRounded'
import StorefrontRounded from '@mui/icons-material/StorefrontRounded'
import { Button } from '@/components/ui/button'
import { TeamTable } from '@/features/team/components/team-table'
import { TeamDetails } from '@/features/team/components/team-details'
import { useDetailPanel } from '@/components/ui/use-detail-panel'
import { fetchOutletOptions, fetchTeam, fetchTrips, updateStaffAccess } from '@/features/team/api'
import { teamFilters, countTeam, selectTeam, type OutletOption, type StaffMember, type StaffTrip, type TeamFilter, type TeamSort, type TeamSortKey } from '@/features/team/data'
import { useUser } from '@/features/auth/user-context'
import '@/styles/vehicles.css'
import '@/styles/team.css'

const metrics: { label: string; filter: TeamFilter; Icon: typeof GroupsRounded }[] = [
  { label: 'Total staff', filter: 'All', Icon: GroupsRounded },
  { label: 'Dispatchers', filter: 'Dispatchers', Icon: SupportAgentRounded },
  { label: 'Store managers', filter: 'Store Managers', Icon: StorefrontRounded },
  { label: 'Drivers', filter: 'Drivers', Icon: LocalShippingRounded },
  { label: 'Loaders', filter: 'Loaders', Icon: Inventory2Rounded },
]

export function TeamPage({
  onNavigate,
  onViewVehicle,
  onOpenNavigation,
  navigationOpen,
}: {
  onNavigate: (page: string) => void
  onViewVehicle: (vehicleId: string) => void
  onOpenNavigation: () => void
  navigationOpen: boolean
}) {
  const [filter, setFilter] = useState<TeamFilter>('All')
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState<TeamSort>({ key: null, direction: 'ascending' })
  const [selectedId, setSelectedId] = useState('')
  const { accessToken, user } = useUser()
  const panel = useDetailPanel()
  // `null` until the first load settles.
  const [members, setMembers] = useState<StaffMember[] | null>(null)
  const [error, setError] = useState('')
  const [attempt, setAttempt] = useState(0)
  const [outlets, setOutlets] = useState<OutletOption[]>([])
  const [trips, setTrips] = useState<{ memberId: string; items: StaffTrip[] | null; error: string } | null>(null)
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
    if (!accessToken) return
    let stale = false
    fetchOutletOptions(accessToken).then(
      (list) => {
        if (!stale) setOutlets(list)
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
    fetchTeam(accessToken).then(
      (team) => {
        if (!stale) {
          setMembers(team)
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
  }, [accessToken, attempt])
  const roster = members ?? []
  const visible = selectTeam(roster, filter, query, sort)
  const selected = visible.find((member) => member.id === selectedId) ?? visible[0]
  const selectedMemberId = selected?.id
  const selectedVehicleDbId = selected?.vehicleDbId ?? null
  useEffect(() => {
    if (!accessToken || !selectedMemberId || selectedVehicleDbId === null) return
    let stale = false
    fetchTrips(accessToken, selectedVehicleDbId).then(
      (items) => {
        if (!stale) setTrips({ memberId: selectedMemberId, items, error: '' })
      },
      (reason: Error) => {
        if (!stale) setTrips({ memberId: selectedMemberId, items: null, error: reason.message })
      },
    )
    return () => {
      stale = true
    }
  }, [accessToken, selectedMemberId, selectedVehicleDbId])
  // A result only counts for the member it was loaded for; without a vehicle there is nothing to load.
  const loadedTrips = trips?.memberId === selectedMemberId ? trips : null
  function onSort(key: TeamSortKey) {
    setSort({ key, direction: sort.key === key && sort.direction === 'ascending' ? 'descending' : 'ascending' })
  }
  return (
    <div className="overview-canvas vehicles-canvas team-canvas">
      <header className="overview-header fleet-page-header">
        <div className="flex items-center gap-wp-space-lg">
          <IconButton type="button" aria-label="Open navigation" aria-expanded={navigationOpen} aria-controls="main-navigation" className="mobile-menu" onClick={onOpenNavigation}>
            <MenuRounded fontSize="inherit" />
          </IconButton>
          <h1 className="type-display-lg-medium">Team</h1>
        </div>
        <div className="fleet-header-actions">
          <Button variant="danger" size="md" className="decision-button" onClick={() => onNavigate('Order notifications')}>
            <NotificationsRounded fontSize="inherit" />3 orders need a decision
          </Button>
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
          Team
        </strong>
      </nav>
      <section className="team-metrics" aria-label="Team summary">
        {metrics.map(({ label, filter: group, Icon }) => (
          <div className="team-metric" key={label}>
            <div>
              <Icon fontSize="inherit" />
              <span className="type-text-md-medium text-wp-text-secondary">{label}</span>
            </div>
            <strong className="type-display-xl-semibold">{members ? countTeam(members, group) : '—'}</strong>
          </div>
        ))}
      </section>
      <div className={`fleet-workspace team-workspace ${panel.mode === 'modal' ? 'fleet-workspace--full' : ''}`}>
        <section className="fleet-inventory" aria-labelledby="team-planning-title">
          <h2 id="team-planning-title" className="fleet-inventory-title type-display-md-medium">
            Staff roster
          </h2>
          <div className="fleet-toolbar team-toolbar">
            <div className="route-filters team-filters" role="group" aria-label="Filter staff by role">
              {teamFilters.map((label) => (
                <button key={label} aria-pressed={filter === label} className={filter === label ? 'route-filter--active type-text-sm-medium' : 'type-text-sm-regular'} onClick={() => setFilter(label)}>
                  {label}
                  <span className="text-wp-text-quaternary">{countTeam(roster, label)}</span>
                </button>
              ))}
            </div>
            <div className="route-search fleet-search">
              <SearchRounded fontSize="inherit" />
              <input ref={search} className="type-text-sm-regular" placeholder="Search" aria-label="Search staff" value={query} onChange={(event) => setQuery(event.target.value)} />
              <kbd className="type-text-xs-medium">⌘K</kbd>
            </div>
          </div>
          <TeamTable
            members={visible}
            selectedId={selected?.id}
            sort={sort}
            loading={!members && !error}
            error={error}
            hasStaff={roster.length > 0}
            onSort={onSort}
            onSelect={(id) => {
              setSelectedId(id)
              panel.show()
            }}
            onClear={() => {
              setQuery('')
              setFilter('All')
            }}
            onRetry={() => {
              setError('')
              setAttempt((count) => count + 1)
            }}
          />
        </section>
        {selected ? (
          <TeamDetails
            panel={panel}
            member={selected}
            self={selected.userId === user?.id}
            outlets={outlets}
            onSaveAccess={async (next) => {
              if (!accessToken) return
              await updateStaffAccess(accessToken, selected, next)
              setAttempt((count) => count + 1)
            }}
            trips={selected.vehicleDbId === null ? [] : (loadedTrips?.items ?? null)}
            tripsError={loadedTrips?.error ?? ''}
            onNavigate={onNavigate}
            onViewVehicle={onViewVehicle}
          />
        ) : (
          panel.mode === 'side' && <aside className="fleet-no-selection text-wp-text-tertiary type-text-sm-regular">Select a matching staff member to view their details.</aside>
        )}
      </div>
    </div>
  )
}
