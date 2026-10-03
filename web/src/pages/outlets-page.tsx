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
import { OutletTable } from '@/features/outlets/components/outlet-table'
import { OutletDetails } from '@/features/outlets/components/outlet-details'
import { OutletEditor } from '@/features/outlets/components/outlet-editor'
import { initialOutlets, outletMetrics, outletFilters, selectOutlets, type DeliveryRequirements, type OutletAvailability, type OutletFilter, type OutletSort, type OutletSortKey } from '@/features/outlets/data'
import '@/styles/vehicles.css'
import '@/styles/outlets.css'

const metricIcons = [StorefrontRounded, LocalShippingRounded, ScheduleRounded]

export function OutletsPage({ onNavigate, onOpenNavigation, navigationOpen }: { onNavigate: (page: string) => void; onOpenNavigation: () => void; navigationOpen: boolean }) {
  const [outlets, setOutlets] = useState(initialOutlets)
  const [filter, setFilter] = useState<OutletFilter>('All')
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState<OutletSort>({ key: null, direction: 'ascending' })
  const [selectedId, setSelectedId] = useState('OUT014')
  const [checked, setChecked] = useState(new Set(['OUT008', 'OUT031']))
  const [editing, setEditing] = useState<{ id: string; mode: 'requirements' | 'availability' } | null>(null)
  const [message, setMessage] = useState('')
  const search = useRef<HTMLInputElement>(null)
  useEffect(() => {
    const shortcut = (event: KeyboardEvent) => { if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); search.current?.focus() } }
    window.addEventListener('keydown', shortcut)
    return () => window.removeEventListener('keydown', shortcut)
  }, [])
  const visible = selectOutlets(outlets, filter, query, sort)
  const selected = visible.find(outlet => outlet.id === selectedId) ?? visible[0]
  const editingOutlet = outlets.find(outlet => outlet.id === editing?.id)
  function onSort(key: OutletSortKey) { setSort({ key, direction: sort.key === key && sort.direction === 'ascending' ? 'descending' : 'ascending' }) }
  function toggleChecked(id: string) { setChecked(previous => { const next = new Set(previous); if (next.has(id)) next.delete(id); else next.add(id); return next }) }
  function save(requirements: DeliveryRequirements, availability: OutletAvailability) {
    if (!editing) return
    setOutlets(previous => previous.map(outlet => outlet.id === editing.id ? { ...outlet, ...requirements, availability } : outlet))
    setMessage(`${editing.mode === 'requirements' ? 'Delivery requirements' : `Availability (${availability.toLowerCase()})`} updated for ${editing.id}.`)
    setEditing(null)
  }
  return <div className="overview-canvas vehicles-canvas outlets-canvas">
    <header className="overview-header fleet-page-header"><div className="flex items-center gap-wp-space-lg"><IconButton type="button" aria-label="Open navigation" aria-expanded={navigationOpen} aria-controls="main-navigation" className="mobile-menu" onClick={onOpenNavigation}><MenuRounded fontSize="inherit" /></IconButton><h1 className="type-display-lg-medium">Outlets</h1></div><div className="fleet-header-actions"><DateRangePicker /><Button variant="danger" size="md" className="decision-button" onClick={() => onNavigate('Order notifications')}><NotificationsRounded fontSize="inherit" />3 orders need a decision</Button></div></header>
    <nav aria-label="Breadcrumb" className="fleet-breadcrumb type-text-sm-medium">{['Home', 'Dashboard', 'Management'].map(label => <span key={label}><button onClick={() => onNavigate(label)}>{label}</button><span aria-hidden="true">/</span></span>)}<strong aria-current="page" className="text-wp-text-primary type-text-sm-semibold">Outlets</strong></nav>
    <section className="outlet-metrics" aria-label="Outlet summary">{outletMetrics.map((value, index) => { const Icon = metricIcons[index]; return <div className="outlet-metric" key={index}><div><Icon fontSize="inherit" /><span className="type-text-md-medium text-wp-text-secondary">Confirmed orders</span></div><strong className="type-display-xl-semibold">{value}</strong></div> })}</section>
    {message && <p role="status" className="fleet-update-message type-text-sm-medium">{message}</p>}
    <div className="fleet-workspace outlet-workspace">
      <section className="fleet-inventory" aria-labelledby="outlet-planning-title"><h2 id="outlet-planning-title" className="fleet-inventory-title type-display-md-medium">Delivery planning</h2><div className="fleet-toolbar outlet-toolbar"><div className="route-filters outlet-filters" role="group" aria-label="Filter outlets">{outletFilters.map(label => <button key={label} aria-pressed={filter === label} className={filter === label ? 'route-filter--active type-text-sm-medium' : 'type-text-sm-regular'} onClick={() => setFilter(label)}>{label}<span className="text-wp-text-quaternary">{label === 'All' ? outlets.length : outlets.filter(outlet => outlet.allocation === label).length}</span></button>)}</div><div className="route-search fleet-search"><SearchRounded fontSize="inherit" /><input ref={search} className="type-text-sm-regular" placeholder="Search" aria-label="Search outlets" value={query} onChange={event => setQuery(event.target.value)} /><kbd className="type-text-xs-medium">⌘K</kbd></div></div>
        <OutletTable outlets={visible} checked={checked} selectedId={selected?.id} sort={sort} showPlaceholders={filter === 'All' && !query.trim()} onSort={onSort} onCheck={toggleChecked} onSelect={setSelectedId} onClear={() => { setQuery(''); setFilter('All') }} onAddColumn={() => onNavigate('Customize outlet columns')} />
      </section>
      {selected ? <OutletDetails outlet={selected} onNavigate={onNavigate} onEdit={() => setEditing({ id: selected.id, mode: 'requirements' })} onAvailability={() => setEditing({ id: selected.id, mode: 'availability' })} /> : <aside className="fleet-no-selection text-wp-text-tertiary type-text-sm-regular">Select a matching outlet to view its details.</aside>}
    </div>
    {editing && editingOutlet && <OutletEditor key={`${editing.id}-${editing.mode}`} outlet={editingOutlet} mode={editing.mode} onSave={save} onClose={() => setEditing(null)} />}
  </div>
}
