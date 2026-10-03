import NorthEastRounded from '@mui/icons-material/NorthEastRounded'
import ChevronRightRounded from '@mui/icons-material/ChevronRightRounded'
import ScheduleRounded from '@mui/icons-material/ScheduleRounded'
import { Button } from '@/components/ui/button'
import texture from '@/assets/overview/texture.png'
import driver from '@/assets/team/driver.png'
import type { StaffMember } from '../data'

export function TeamDetails({ member, onNavigate, onViewVehicle }: { member: StaffMember; onNavigate: (page: string) => void; onViewVehicle: (vehicleId: string) => void }) {
  const isReference = member.id === 'DRV021'
  return <aside className="fleet-details team-details" aria-label={`Work details for ${member.name}`}>
    <header className="fleet-vehicle-banner team-banner"><img className="fleet-vehicle-texture" src={texture} alt="" /><div className="team-driver-crop"><img src={driver} alt="" /></div><div className="fleet-vehicle-title"><h2 className="type-display-md-semibold">{member.vehicleId ?? member.id}</h2><p className="type-text-md-medium text-wp-text-secondary">{isReference ? 'Refrigerated van' : member.role}</p></div></header>
    <div className="team-details-body">
      <section className="team-work-details"><h3 className="type-text-lg-semibold">Work details</h3><dl className="team-detail-rows type-text-md-regular"><div><dt className="text-wp-text-tertiary">Home depot</dt><dd>{member.depot}</dd></div><div><dt className="text-wp-text-tertiary">Assigned vehicle</dt><dd>{member.vehicleId ? `${member.vehicleId}${isReference ? ' · Reefer truck' : ''}` : 'Not assigned'}</dd></div></dl>{member.vehicleId && <button className="team-vehicle-link type-text-md-medium" onClick={() => onViewVehicle(member.vehicleId!)}>View vehicle<NorthEastRounded fontSize="inherit" /></button>}</section>
      <section className="team-today-trips"><h3 className="type-text-lg-semibold">Today’s trips</h3>
        {member.trips?.length ? <>{member.trips.map(trip => <button key={trip.id} className="team-trip" onClick={() => onNavigate(`${member.name} · ${trip.title} in Operations`)}><span className="team-trip-summary"><span className="team-trip-heading"><strong className="type-text-md-semibold">{trip.title}</strong><span className={`team-trip-status type-text-xs-medium ${trip.status === 'Completed' ? 'team-trip-status--completed' : 'team-trip-status--progress'}`}>{trip.status}</span></span><span className="type-text-sm-regular text-wp-text-tertiary">{trip.recordedStops} of {trip.totalStops} stops recorded</span>{trip.nextStop && <span className="type-text-sm-regular text-wp-text-tertiary">Next: {trip.nextStop}</span>}</span><ChevronRightRounded fontSize="inherit" /></button>)}<p className="team-update-time type-text-sm-regular text-wp-text-tertiary"><ScheduleRounded fontSize="inherit" />Trip updates received at 11:20</p></> : <p className="type-text-sm-regular text-wp-text-tertiary">{member.role === 'Loader' ? 'Assigned to the depot loading team.' : member.trips === null ? 'Trip details will be added in the next development stage.' : 'No trips assigned today.'}</p>}
      </section>
    </div>
    <footer className="fleet-details-footer"><Button className="w-full" onClick={() => onNavigate(`Trips for ${member.name} in Operations`)}>View trips in Operations</Button></footer>
  </aside>
}
