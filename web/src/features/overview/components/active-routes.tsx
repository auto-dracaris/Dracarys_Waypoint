import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import ArrowForwardRounded from '@mui/icons-material/ArrowForwardRounded'
import SearchRounded from '@mui/icons-material/SearchRounded'
import { Button } from '@/components/ui/button'
import { routes, type RouteFilter } from '../data'
import { VehiclePanel } from './vehicle-panel'

const filters: RouteFilter[] = ['All', 'Errors', 'Success', 'Info']
const DeliveryMap = lazy(() => import('./delivery-map').then(module => ({ default: module.DeliveryMap })))

export function ActiveRoutes({ onNavigate }: { onNavigate: (title: string) => void }) {
  const [filter, setFilter] = useState<RouteFilter>('All')
  const [query, setQuery] = useState('')
  const search = useRef<HTMLInputElement>(null)
  useEffect(() => {
    const shortcut = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); search.current?.focus() }
    }
    window.addEventListener('keydown', shortcut)
    return () => window.removeEventListener('keydown', shortcut)
  }, [])
  const matching = routes.filter(route => (filter === 'All' || route.category === filter) && `${route.id} ${route.nextStop} ${route.vehicleType}`.toLowerCase().includes(query.trim().toLowerCase()))
  const selected = matching[0]
  return (
    <section className="active-routes" aria-labelledby="routes-title">
      <div className="routes-header"><h2 id="routes-title" className="type-display-md-medium">Active routes</h2><Button className="type-text-md-semibold" onClick={() => onNavigate('All routes')}>View all routes <ArrowForwardRounded fontSize="inherit" /></Button></div>
      <div className="routes-toolbar">
        <div className="route-filters" role="group" aria-label="Filter routes">{filters.map(label => <button key={label} type="button" aria-pressed={label === filter} onClick={() => setFilter(label)} className={label === filter ? 'route-filter--active type-text-sm-medium' : 'type-text-sm-regular'}><span>{label}</span><span className="text-wp-text-quaternary">{routes.filter(route => label === 'All' || route.category === label).length}</span></button>)}</div>
        <div className="route-search"><SearchRounded fontSize="inherit" /><input ref={search} value={query} onChange={event => setQuery(event.target.value)} aria-label="Search routes by vehicle or outlet" placeholder="Search" className="type-text-sm-regular" /><kbd className="type-text-xs-medium">⌘K</kbd></div>
      </div>
      <div className="route-content">
        <div className="overview-map">{selected ? <Suspense fallback={<div className="delivery-map-empty type-text-sm-regular" role="status">Loading map…</div>}><DeliveryMap {...selected.map} vehicleId={selected.id} vehicleStatus={selected.status} /></Suspense> : <div className="delivery-map-empty type-text-sm-regular" role="status">No matching route to display on the map.</div>}</div>
        {selected ? <VehiclePanel route={selected} onView={() => onNavigate(`Route ${selected.id}`)} /> : <div className="route-empty"><h3 className="type-text-lg-semibold">No matching routes</h3><p className="type-text-sm-regular">Try another vehicle, outlet, or filter.</p><Button onClick={() => { setQuery(''); setFilter('All') }}>Clear filters</Button></div>}
      </div>
    </section>
  )
}
