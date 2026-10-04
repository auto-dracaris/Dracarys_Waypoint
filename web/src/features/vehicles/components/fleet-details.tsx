import { useState } from 'react'
import AccessTimeRounded from '@mui/icons-material/AccessTimeRounded'
import ExpandLessRounded from '@mui/icons-material/ExpandLessRounded'
import ExpandMoreRounded from '@mui/icons-material/ExpandMoreRounded'
import NorthEastRounded from '@mui/icons-material/NorthEastRounded'
import RouteRounded from '@mui/icons-material/RouteRounded'
import van from '@/assets/vehicles/van.png'
import texture from '@/assets/overview/texture.png'
import { Button } from '@/components/ui/button'
import { DetailPanel } from '@/components/ui/detail-panel'
import { StatusBadge } from '@/components/ui/status-badge'
import type { DetailPanelState } from '@/components/ui/use-detail-panel'
import type { FleetVehicle, VehicleDetail } from '../data'

function tripStatusTone(status: string): 'neutral' | 'info' | 'success' | 'warning' | 'error' {
  switch (status.toLowerCase()) {
    case 'planned':
    case 'dispatched':
      return 'info'
    case 'completed':
      return 'success'
    case 'loading':
    case 'loaded':
      return 'warning'
    case 'cancelled':
      return 'error'
    case 'draft':
    default:
      return 'neutral'
  }
}

export function FleetDetails({
  panel,
  vehicle,
  detail,
  detailError,
  onNavigate,
  onEdit,
  onAssignDriver,
}: {
  panel: DetailPanelState
  vehicle: FleetVehicle
  detail: VehicleDetail | null
  detailError: string
  onNavigate: (title: string) => void
  onEdit: () => void
  onAssignDriver: () => void
}) {
  const [expandedTrips, setExpandedTrips] = useState<Record<string, boolean>>({})

  const isExpanded = (tripId: string) => expandedTrips[tripId] ?? true
  const toggleTrip = (tripId: string) => {
    setExpandedTrips((prev) => ({
      ...prev,
      [tripId]: !(prev[tripId] ?? true),
    }))
  }

  const details = [
    ['Home depot', vehicle.depot],
    ['Registration', vehicle.registrationNo],
    ['Assigned driver', detail ? (detail.driver ? `${detail.driver.name} · ${detail.driver.phone}` : 'Not assigned') : '—'],
    ['Weight capacity', `${vehicle.weight.toLocaleString('en-GB')} kg`],
    ['Volume capacity', `${vehicle.volume} m³`],
    ['Temperature capability', vehicle.temperature],
    ['Fuel', `${vehicle.fuelType[0].toUpperCase()}${vehicle.fuelType.slice(1)} · ${vehicle.kmPerL} km/L`],
    ['Weekly fuel quota', `${vehicle.weeklyFuelQuota.toLocaleString('en-GB')} L`],
    ['Fuel quota remaining', detail ? `${detail.fuelRemaining.toLocaleString('en-GB')} L` : '—'],
  ]

  return (
    <DetailPanel panel={panel} label={`Details for ${vehicle.id}`}>
      <div className="fleet-vehicle-banner">
        <img src={texture} alt="" className="fleet-vehicle-texture" />
        <div className="fleet-van-crop">
          <img src={van} alt="" />
        </div>
        <div className="fleet-vehicle-title">
          <h2 className="type-display-md-semibold">{vehicle.id}</h2>
          <p className="text-wp-text-secondary type-text-md-medium">{vehicle.type}</p>
        </div>
      </div>
      <div className="fleet-details-body">
        <section>
          <h3 className="fleet-section-title type-text-lg-medium">Vehicle details</h3>
          <dl className="fleet-detail-rows">
            {details.map(([label, value]) => (
              <div key={label}>
                <dt className="text-wp-text-secondary type-text-sm-regular">{label}</dt>
                <dd className="type-text-sm-medium">{value}</dd>
              </div>
            ))}
          </dl>
          <Button className="w-full" onClick={onAssignDriver} disabled={!detail}>
            {detail?.driver ? 'Change driver' : 'Assign driver'}
          </Button>
        </section>
        <section>
          <h3 className="fleet-section-title type-text-lg-medium">Tomorrow’s trips</h3>
          {detail?.trips.length ? (
            <div className="fleet-trips-list">
              {detail.trips.map((trip) => {
                const expanded = isExpanded(trip.id)
                return (
                  <div key={trip.id} className="fleet-trip-card">
                    <button
                      type="button"
                      className="fleet-trip-header"
                      onClick={() => toggleTrip(trip.id)}
                      aria-expanded={expanded}
                    >
                      <div className="fleet-trip-header-left">
                        <RouteRounded className="fleet-trip-icon" fontSize="inherit" />
                        <div className="fleet-trip-header-info">
                          <div className="fleet-trip-title-row">
                            <strong className="type-text-sm-semibold">{trip.title}</strong>
                            <span className="type-text-xs-regular text-wp-text-secondary">· {trip.window}</span>
                            <StatusBadge tone={tripStatusTone(trip.status)}>{trip.status}</StatusBadge>
                          </div>
                          <span className="text-wp-text-secondary type-text-xs-regular">
                            {trip.brand ? `${trip.brand} · ` : ''}
                            {trip.stops} {trip.stops === 1 ? 'outlet' : 'outlets'} · {trip.orders} {trip.orders === 1 ? 'order' : 'orders'}
                            {trip.plannedKm !== undefined ? ` · ${trip.plannedKm} km` : ''}
                            {trip.plannedFuelL !== undefined ? ` · ${trip.plannedFuelL} L` : ''}
                          </span>
                        </div>
                      </div>
                      <div className="fleet-trip-header-right">
                        {expanded ? <ExpandLessRounded fontSize="inherit" /> : <ExpandMoreRounded fontSize="inherit" />}
                      </div>
                    </button>
                    {expanded && (
                      <div className="fleet-trip-timeline">
                        <div className="fleet-timeline-label type-text-xs-semibold text-wp-text-secondary">
                          Outlet timeline
                        </div>
                        {trip.timeline && trip.timeline.length > 0 ? (
                          <ol className="fleet-timeline-list">
                            {trip.timeline.map((stop, idx) => {
                              const isLast = idx === trip.timeline!.length - 1
                              return (
                                <li key={`${trip.id}-${stop.outletId}-${stop.seq}`} className="fleet-timeline-item">
                                  <div className="fleet-timeline-track">
                                    <div className="fleet-timeline-node">
                                      {stop.seq}
                                    </div>
                                    {!isLast && <div className="fleet-timeline-connector" />}
                                  </div>
                                  <div className="fleet-timeline-content">
                                    <div className="fleet-timeline-top">
                                      <span className="fleet-timeline-name type-text-sm-medium text-wp-text-primary" title={stop.outletName || stop.outletId}>
                                        {stop.outletName || stop.outletId}
                                      </span>
                                      <span className="fleet-timeline-time type-text-xs-medium" title={`Expected reach time: ${stop.plannedArrivalAt}`}>
                                        <AccessTimeRounded fontSize="inherit" />
                                        {stop.plannedArrivalAt}
                                      </span>
                                    </div>
                                    <div className="fleet-timeline-sub type-text-xs-regular text-wp-text-secondary">
                                      {stop.outletName ? <span>{stop.outletId}</span> : null}
                                      {stop.orderCount && stop.orderCount > 1 ? (
                                        <span>{stop.outletName ? ' · ' : ''}{stop.orderCount} orders</span>
                                      ) : null}
                                    </div>
                                  </div>
                                </li>
                              )
                            })}
                          </ol>
                        ) : (
                          <p className="text-wp-text-tertiary type-text-xs-regular">No outlet stops scheduled for this trip.</p>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          ) : (
            <p role={detailError ? 'alert' : 'status'} className="text-wp-text-tertiary type-text-sm-regular">
              {detailError || (detail ? 'No trips planned for tomorrow.' : 'Loading…')}
            </p>
          )}
          <button className="fleet-planning-link type-text-sm-medium" onClick={() => onNavigate('Planning')}>
            View in Planning <NorthEastRounded fontSize="inherit" />
          </button>
        </section>
      </div>
      <footer className="fleet-details-footer">
        <Button className="w-full" onClick={onEdit}>
          Update availability
        </Button>
      </footer>
    </DetailPanel>
  )
}
