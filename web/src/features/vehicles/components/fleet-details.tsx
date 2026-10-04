import DescriptionOutlined from '@mui/icons-material/DescriptionOutlined'
import ChevronRightRounded from '@mui/icons-material/ChevronRightRounded'
import NorthEastRounded from '@mui/icons-material/NorthEastRounded'
import van from '@/assets/vehicles/van.png'
import texture from '@/assets/overview/texture.png'
import { Button } from '@/components/ui/button'
import { DetailPanel } from '@/components/ui/detail-panel'
import type { DetailPanelState } from '@/components/ui/use-detail-panel'
import type { FleetVehicle, VehicleDetail } from '../data'

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
            <div className="fleet-draft-trips">
              {detail.trips.map((trip) => (
                <button key={trip.id} className="fleet-draft-trip" onClick={() => onNavigate(`${vehicle.id} · ${trip.title}`)}>
                  <DescriptionOutlined fontSize="inherit" />
                  <span>
                    <strong className="type-text-sm-semibold">
                      {trip.title} · {trip.window}
                    </strong>
                    <span className="text-wp-text-secondary type-text-xs-regular">
                      {trip.status} · {trip.stops} {trip.stops === 1 ? 'stop' : 'stops'} · {trip.orders} {trip.orders === 1 ? 'order' : 'orders'}
                    </span>
                  </span>
                  <ChevronRightRounded fontSize="inherit" />
                </button>
              ))}
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
