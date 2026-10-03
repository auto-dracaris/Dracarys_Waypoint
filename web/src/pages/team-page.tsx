import { IconButton } from '@/components/ui/icon-button'
import { useEffect, useRef, useState } from 'react'
import NotificationsRounded from '@mui/icons-material/NotificationsRounded'
import MenuRounded from '@mui/icons-material/MenuRounded'
import SearchRounded from '@mui/icons-material/SearchRounded'
import StorefrontRounded from '@mui/icons-material/StorefrontRounded'
import LocalShippingRounded from '@mui/icons-material/LocalShippingRounded'
import ScheduleRounded from '@mui/icons-material/ScheduleRounded'
import { Button } from '@/components/ui/button'
import { DateRangePicker } from '@/components/ui/date-range-picker'
import { TeamTable } from '@/features/team/components/team-table'
import { TeamDetails } from '@/features/team/components/team-details'
import { teamMembers, teamFilters, teamMetrics, selectTeam, type TeamFilter, type TeamSort, type TeamSortKey } from '@/features/team/data'
import '@/styles/vehicles.css'
import '@/styles/team.css'

const metricIcons = [StorefrontRounded, LocalShippingRounded, ScheduleRounded]

export function TeamPage({ onNavigate, onViewVehicle, onOpenNavigation, navigationOpen }: { onNavigate: (page: string) => void; onViewVehicle: (vehicleId: string) => void; onOpenNavigation: () => void; navigationOpen: boolean }) {
  const [filter, setFilter] = useState<TeamFilter>('All')
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState<TeamSort>({ key: null, direction: 'ascending' })
  const [selectedId, setSelectedId] = useState('DRV021')
  const search = useRef<HTMLInputElement>(null)
  useEffect(() => {
    const shortcut = (event: KeyboardEvent) => { if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); search.current?.focus() } }
    window.addEventListener('keydown', shortcut)
    return () => window.removeEventListener('keydown', shortcut)
  }, [])
  const visible = selectTeam(teamMembers, filter, query, sort)
  const selected = visible.find(member => member.id === selectedId) ?? visible[0]
  function onSort(key: TeamSortKey) { setSort({ key, direction: sort.key === key && sort.direction === 'ascending' ? 'descending' : 'ascending' }) }
  return <div className="overview-canvas vehicles-canvas team-canvas">
    <header className="overview-header fleet-page-header"><div className="flex items-center gap-wp-space-lg"><IconButton type="button" aria-label="Open navigation" aria-expanded={navigationOpen} aria-controls="main-navigation" className="mobile-menu" onClick={onOpenNavigation}><MenuRounded fontSize="inherit" /></IconButton><h1 className="type-display-lg-medium">Team</h1></div><div className="fleet-header-actions"><DateRangePicker /><Button variant="danger" size="md" className="decision-button" onClick={() => onNavigate('Order notifications')}><NotificationsRounded fontSize="inherit" />3 orders need a decision</Button></div></header>
    <nav aria-label="Breadcrumb" className="fleet-breadcrumb type-text-sm-medium">{['Home', 'Dashboard', 'Management'].map(label => <span key={label}><button onClick={() => onNavigate(label)}>{label}</button><span aria-hidden="true">/</span></span>)}<strong aria-current="page" className="text-wp-text-primary type-text-sm-semibold">Team</strong></nav>
    <section className="team-metrics" aria-label="Team summary">{teamMetrics.map((value, index) => { const Icon = metricIcons[index]; return <div className="team-metric" key={index}><div><Icon fontSize="inherit" /><span className="type-text-md-medium text-wp-text-secondary">Confirmed orders</span></div><strong className="type-display-xl-semibold">{value}</strong></div> })}</section>
    <div className="fleet-workspace team-workspace"><section className="fleet-inventory" aria-labelledby="team-planning-title"><h2 id="team-planning-title" className="fleet-inventory-title type-display-md-medium">Delivery planning</h2><div className="fleet-toolbar team-toolbar"><div className="route-filters team-filters" role="group" aria-label="Filter staff by role">{teamFilters.map(label => <button key={label} aria-pressed={filter === label} className={filter === label ? 'route-filter--active type-text-sm-medium' : 'type-text-sm-regular'} onClick={() => setFilter(label)}>{label}<span className="text-wp-text-quaternary">{label === 'All' ? teamMembers.length : teamMembers.filter(member => member.role === (label === 'Drivers' ? 'Driver' : 'Loader')).length}</span></button>)}</div><div className="route-search fleet-search"><SearchRounded fontSize="inherit" /><input ref={search} className="type-text-sm-regular" placeholder="Search" aria-label="Search staff" value={query} onChange={event => setQuery(event.target.value)} /><kbd className="type-text-xs-medium">⌘K</kbd></div></div>
      <TeamTable members={visible} selectedId={selected?.id} sort={sort} onSort={onSort} onSelect={setSelectedId} onClear={() => { setQuery(''); setFilter('All') }} />
    </section>{selected ? <TeamDetails member={selected} onNavigate={onNavigate} onViewVehicle={onViewVehicle} /> : <aside className="fleet-no-selection text-wp-text-tertiary type-text-sm-regular">Select a matching staff member to view their details.</aside>}</div>
  </div>
}
