import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { ActionLink, Badge, DatePicker, Icon, PageHeader } from '../../shared/ui'
import { useOverviewState } from './overviewState'
import { PendingAction } from './PendingAction'
import { planning, routes } from './mockData'
import type { DeliveryRoute } from './mockData'
import map from '../../assets/figma/1308e.png'
import texture from '../../assets/figma/0a750.png'
import van from '../../assets/figma/02fe4.png'
import truck from '../../assets/figma/fd17e.svg'
import house from '../../assets/figma/d76e0.svg'
import check from '../../assets/figma/0556c.svg'
import searchIcon from '../../assets/figma/32d08.svg'
import alertIcon from '../../assets/figma/5b2f0.svg'
import fileIcon from '../../assets/figma/78bff.svg'

export function OverviewPage() {
  const { vehicleId } = useParams()
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const { date, setDate, filter, setFilter, search, setSearch } = useOverviewState()
  const [showRoutes, setShowRoutes] = useState(false)
  const searchField = useRef<HTMLInputElement>(null)
  const filtered = routes.filter(route => (filter === 'All' || route.category === filter) &&
    [route.id, route.type, route.status, 'Peliyagoda', ...route.stops.map(stop => stop.name)].join(' ').toLowerCase().includes(search.toLowerCase().trim()))
  const selectedId = vehicleId || params.get('vehicle')
  const route = vehicleId ? routes.find(item => item.id === vehicleId) : filtered.find(item => item.id === selectedId) || filtered[0]

  useEffect(() => {
    const shortcut = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        searchField.current?.focus()
      }
    }
    window.addEventListener('keydown', shortcut)
    return () => window.removeEventListener('keydown', shortcut)
  }, [])

  const notificationTo = '/notifications' + (vehicleId ? '?from=' + encodeURIComponent('/trips/' + vehicleId + (params.toString() ? '?' + params.toString() : '')) : '')
  const selectRoute = (id: string) => {
    if (vehicleId) navigate('/trips/' + id)
    else setParams({ vehicle: id })
    setShowRoutes(false)
  }

  return <>
    <PageHeader title="Delivery Overview" subtitle={`Planning for ${new Date(date + 'T12:00:00').toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}`}>
      <ActionLink to={notificationTo}><Icon name="notifications" />3 orders need a decision</ActionLink>
    </PageHeader>
    <section className="panel routes-panel">
      <div className="panel-heading">
        <h2>Active routes</h2>
        <button className="button" onClick={() => setShowRoutes(!showRoutes)} aria-expanded={showRoutes} aria-controls="route-picker">View all routes <Icon name={showRoutes ? 'expand_less' : 'arrow_forward'} /></button>
      </div>
      <div className="toolbar">
        <div className="segments" aria-label="Route status filters">
          {['All', 'Errors', 'Success', 'Info'].map(category => <button key={category} aria-pressed={filter === category} className={filter === category ? 'selected' : ''} onClick={() => { setFilter(category); setShowRoutes(true) }}>{category} <span>{category === 'All' ? routes.length : routes.filter(item => item.category === category).length}</span></button>)}
        </div>
        <label className="search"><img src={searchIcon} alt="" /><input ref={searchField} placeholder="Search" aria-label="Search active routes" value={search} onChange={event => { setSearch(event.target.value); setShowRoutes(true) }} /><kbd>⌘K</kbd></label>
      </div>
      {showRoutes && <div className="route-picker" id="route-picker" aria-label="Matching routes">
        {filtered.map(item => <button key={item.id} className={item.id === route?.id ? 'route-choice chosen' : 'route-choice'} onClick={() => selectRoute(item.id)}>
          <span><strong>{item.id}</strong><small>{item.type} · Trip 1</small></span><Badge tone={item.category === 'Errors' ? 'danger' : item.category === 'Success' ? 'success' : 'info'}>{item.status}</Badge>
        </button>)}
        <small className="route-result-count">{filtered.length} of {routes.length} routes</small>
      </div>}
      {route && (vehicleId || filtered.length > 0) ? <div className="route-content">
        <div className="route-map">
          {vehicleId && <TripTimeline route={route} selectedStop={Number(params.get('stop') || 0)} />}
          <div className="map-image"><img src={map} alt="Illustrative route map of Colombo" /></div>
          <div className="map-depot"><span><img src={house} alt="" /></span><strong>Peliyagoda Depot</strong></div>
          <Link className="map-vehicle" to={`/trips/${route.id}`}><img src={truck} alt="" />{route.id}</Link>
          <div className="map-stop-line" />
          {[[58, 58], [64, 65], [68, 71], [71, 83], [73, 91], [80, 97]].map(([x, y], index) => <Link key={index} aria-label={`View stop ${index + 1} for ${route.id}`} to={`/trips/${route.id}?stop=${index + 1}`} className={`map-stop ${index < route.recorded ? 'complete' : ''}`} style={{ left: x + '%', top: y + '%' }}>{index + 1}{index < route.recorded && <img src={check} alt="Recorded" />}</Link>)}
          <Link className="map-vehicle secondary-marker" to="/trips/VEH032"><img src={truck} alt="" />VEH032</Link>
        </div>
        <VehiclePanel route={route} expanded={Boolean(vehicleId)} />
      </div> : <div className="empty-state"><Icon name="search_off" /><h3>{vehicleId ? 'Route not found' : 'No routes match this view'}</h3><p>{vehicleId ? 'This vehicle is not part of the mock delivery plan.' : 'Try another status or vehicle search.'}</p>{vehicleId ? <ActionLink to="/">Back to Overview</ActionLink> : <button className="button" onClick={() => { setSearch(''); setFilter('All') }}>Clear filters</button>}</div>}
    </section>
    <PlanningSummary date={date} setDate={setDate} />
  </>
}

function VehiclePanel({ route, expanded }: { route: DeliveryRoute; expanded: boolean }) {
  const next = route.stops[Math.min(route.recorded, route.stops.length - 1)]
  const completed = route.recorded === route.stops.length
  const progress = Math.round(route.recorded / route.stops.length * 100)
  const tone = route.category === 'Errors' ? 'danger' : route.category === 'Success' ? 'success' : 'success'
  return <div className="vehicle-panel">
    {expanded && <div className="detail-top"><span>Vehicle details</span><Link to="/" aria-label="Close trip details"><Icon name="close" /></Link></div>}
    <div className="vehicle-banner">
      <img className="vehicle-texture" src={texture} alt="" />
      <div className="vehicle-art"><img src={van} alt="WayPoint delivery van" /></div>
      <div><Badge tone={tone}>{route.status}</Badge><h3>{route.id}</h3><strong>{route.type}</strong></div>
    </div>
    <div className="vehicle-info">
      <div><div className="progress-label"><small>Trip 1 · {route.recorded} of {route.stops.length} stops recorded</small><small>{progress}%</small></div><div className="progress dark" role="progressbar" aria-label="Recorded stops" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}><span style={{ width: progress + '%' }} /></div>
        <div className="next-stop"><small>{completed ? 'Last stop' : 'Next stop'}</small><strong>{next.name}</strong></div>
      </div>
      <div><dl><div><dt>Delivery window</dt><dd>{next.window}</dd></div><div><dt>{completed ? 'Recorded arrival' : 'Expected arrival'}</dt><dd>{next.time}</dd></div><div><dt>Location updated</dt><dd>{route.updated}</dd></div></dl>
        <ActionLink primary to={`/trips/${route.id}`}>View route <Icon name="arrow_forward" /></ActionLink>
        <p className="info-note"><Icon name="info" />Location freshness and delivery progress are tracked separately.</p>
      </div>
    </div>
  </div>
}

function TripTimeline({ route, selectedStop }: { route: DeliveryRoute; selectedStop: number }) {
  const lastSelected = useRef<number>(0)
  const timeline = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (selectedStop && lastSelected.current !== selectedStop) {
      timeline.current?.querySelector<HTMLElement>(`[data-stop="${selectedStop}"]`)?.scrollIntoView({ block: 'nearest' })
      lastSelected.current = selectedStop
    }
  }, [selectedStop, route.id])
  const stopRow = (index: number) => {
    const stop = route.stops[index]
    const recorded = index < route.recorded
    const next = index === route.recorded
    return <div key={index} data-stop={index + 1} className={`timeline-row ${selectedStop === index + 1 ? 'highlight-stop' : ''}`}>
      <span className={`timeline-dot ${recorded || next ? 'green' : ''}`}>{index === 0 && recorded ? <Icon name="check" /> : index + 1}</span>
      <div className={next ? 'next-stop-card' : ''}>
        {next && <Badge tone="success">NEXT STOP</Badge>}
        <strong>{stop.name}</strong><p>{stop.address}</p>
        {next ? <><div><Icon name="schedule" /><span><small>Expected arrival</small><strong>{stop.time}</strong></span></div><div><Icon name="calendar_today" /><span><small>Delivery window</small><strong>{stop.window}</strong></span></div></> : <small>{stop.time} · {recorded ? 'Recorded' : 'Planned'}</small>}
      </div>
    </div>
  }
  return <div className="trip-timeline" ref={timeline}><h3>{route.id} · Trip 1</h3>
    {stopRow(0)}
    <details className="timeline-collapse" open={selectedStop === 2 || undefined}><summary>1 earlier stop {route.recorded > 1 ? 'completed' : 'planned'}</summary>{stopRow(1)}</details>
    {stopRow(2)}{stopRow(3)}
    <details className="timeline-collapse" open={selectedStop >= 5 || undefined}><summary>5–6 {route.recorded === 6 ? 'Recorded stops' : 'Remaining stops'}</summary>{stopRow(4)}{stopRow(5)}</details>
  </div>
}

function PlanningSummary({ date, setDate }: { date: string; setDate: (date: string) => void }) {
  const progress = planning.allocated / planning.confirmed * 100
  return <section className="panel planning-panel">
    <div className="panel-heading"><h2>Delivery planning</h2><DatePicker value={date} onChange={setDate} /></div>
    <div className="intake"><span className="status-dot" /><strong>Order intake closed</strong><span>Cutoff · 4:00 PM</span><small>Saved just now</small></div>
    <div className="overview-stats">{[['Confirmed orders', planning.confirmed], ['Orders allocated', planning.allocated], ['Need a decision', planning.decision], ['Deferred orders', planning.deferred]].map(([label, number], index) => <div key={label} className={index === 2 ? 'danger-stat' : ''}><small>{label}</small><strong>{number}</strong></div>)}</div>
    <div className="planning-body">
      <div className="progress-label"><strong>Allocation progress</strong><small>{planning.allocated} of {planning.confirmed} orders allocated</small></div>
      <div className="progress" role="progressbar" aria-label="Orders allocated" aria-valuenow={Math.round(progress)} aria-valuemin={0} aria-valuemax={100}><span style={{ width: progress + '%' }} /></div>
      <div className="warning-panel">
        <div className="warning-heading"><img src={alertIcon} alt="" /><div><strong>{planning.decision} orders need a decision</strong><small>Allocate or defer the remaining orders before publishing.</small></div></div>
        <PendingAction feature="Order review" className="warning-row"><strong>DEMO-106 · DEMO-107</strong><span>Awaiting vehicle allocation</span><b>Review orders →</b></PendingAction>
        <PendingAction feature="Order allocation" className="warning-row"><strong>DEMO-108</strong><span>Refrigerated van required</span><Badge tone="warning">Deferred on 3 previous runs</Badge><b>Review orders →</b></PendingAction>
      </div>
    </div>
    <div className="panel-footer"><strong><span className="file-icon"><img src={fileIcon} alt="" /></span>Plan not published</strong><PendingAction feature="Planning">Continue the Planning <Icon name="arrow_forward" /></PendingAction></div>
  </section>
}
