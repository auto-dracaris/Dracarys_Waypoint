import DescriptionOutlined from '@mui/icons-material/DescriptionOutlined'
import ChevronRightRounded from '@mui/icons-material/ChevronRightRounded'
import NorthEastRounded from '@mui/icons-material/NorthEastRounded'
import van from '@/assets/vehicles/van.png'
import texture from '@/assets/overview/texture.png'
import { Button } from '@/components/ui/button'
import { draftTrips, type FleetVehicle } from '../data'

export function FleetDetails({ vehicle, onNavigate, onEdit }: { vehicle: FleetVehicle; onNavigate: (title: string) => void; onEdit: () => void }) {
  const details = [['Home depot', 'Peliyagoda'], ['Assigned driver', vehicle.driver], ['Weight capacity', `${vehicle.weight.toLocaleString('en-GB')} kg`], ['Volume capacity', `${vehicle.volume} m³`], ['Temperature capability', vehicle.temperature], ['Fuel quota remaining', vehicle.fuel === null ? 'Not recorded' : `${vehicle.fuel} L`]]
  return <aside className="fleet-details" aria-label={`Details for ${vehicle.id}`}>
    <div className="fleet-vehicle-banner"><img src={texture} alt="" className="fleet-vehicle-texture" /><div className="fleet-van-crop"><img src={van} alt="WayPoint refrigerated van" /></div><div className="fleet-vehicle-title"><h2 className="type-display-md-semibold">{vehicle.id}</h2><p className="text-wp-text-secondary type-text-md-medium">{vehicle.id === 'VEH021' ? 'Refrigerated van' : vehicle.type}</p></div></div>
    <div className="fleet-details-body">
      <section><h3 className="fleet-section-title type-text-lg-medium">Vehicle details</h3><dl className="fleet-detail-rows">{details.map(([label, value]) => <div key={label}><dt className="text-wp-text-secondary type-text-sm-regular">{label}</dt><dd className="type-text-sm-medium">{value}</dd></div>)}</dl></section>
      <section><h3 className="fleet-section-title type-text-lg-medium">Tomorrow’s draft trips</h3>{vehicle.id === 'VEH021' ? <div className="fleet-draft-trips">{draftTrips.map(trip => <button key={trip.title} className="fleet-draft-trip" onClick={() => onNavigate(`${vehicle.id} · ${trip.title}`)}><DescriptionOutlined fontSize="inherit" /><span><strong className="type-text-sm-semibold">{trip.title}</strong><span className="text-wp-text-secondary type-text-xs-regular">{trip.subtitle}</span></span><ChevronRightRounded fontSize="inherit" /></button>)}</div> : <p className="text-wp-text-tertiary type-text-sm-regular">Draft trip details will be added in the next development stage.</p>}<button className="fleet-planning-link type-text-sm-medium" onClick={() => onNavigate('Planning')}>View in Planning <NorthEastRounded fontSize="inherit" /></button></section>
    </div>
    <footer className="fleet-details-footer"><Button className="w-full" onClick={onEdit}>Update availability</Button></footer>
  </aside>
}
