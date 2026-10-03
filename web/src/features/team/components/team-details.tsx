import NorthEastRounded from '@mui/icons-material/NorthEastRounded'
import ChevronRightRounded from '@mui/icons-material/ChevronRightRounded'
import { Button } from '@/components/ui/button'
import { DetailPanel } from '@/components/ui/detail-panel'
import type { DetailPanelState } from '@/components/ui/use-detail-panel'
import texture from '@/assets/overview/texture.png'
import driver from '@/assets/team/driver.png'
import type { StaffMember, StaffTrip } from '../data'
import { StaffAccessEditor, type StaffAccess } from './staff-access-editor'

// `trips` is null while the selected driver's trips are still loading; `self` marks the signed-in user's own account.
export function TeamDetails({
  panel,
  member,
  trips,
  tripsError,
  self,
  onSaveAccess,
  onNavigate,
  onViewVehicle,
}: {
  panel: DetailPanelState
  member: StaffMember
  trips: StaffTrip[] | null
  tripsError: string
  self: boolean
  onSaveAccess: (next: StaffAccess) => Promise<void>
  onNavigate: (page: string) => void
  onViewVehicle: (vehicleId: string) => void
}) {
  return (
    <DetailPanel panel={panel} label={`Work details for ${member.name}`} className="team-details">
      <header className="fleet-vehicle-banner team-banner">
        <img className="fleet-vehicle-texture" src={texture} alt="" />
        <div className="team-driver-crop">
          <img src={driver} alt="" />
        </div>
        <div className="fleet-vehicle-title">
          <h2 className="type-display-md-semibold">{member.vehicleId ?? member.name}</h2>
          <p className="type-text-md-medium text-wp-text-secondary">{member.vehicleLabel ?? member.role}</p>
        </div>
      </header>
      <div className="team-details-body">
        <section className="team-work-details">
          <h3 className="type-text-lg-semibold">Work details</h3>
          <dl className="team-detail-rows type-text-md-regular">
            <div>
              <dt className="text-wp-text-tertiary">Home depot</dt>
              <dd>{member.depot}</dd>
            </div>
            <div>
              <dt className="text-wp-text-tertiary">Assigned vehicle</dt>
              <dd>{member.vehicleId ? `${member.vehicleId} · ${member.vehicleLabel}` : 'Not assigned'}</dd>
            </div>
          </dl>
          {member.vehicleId && (
            <button className="team-vehicle-link type-text-md-medium" onClick={() => onViewVehicle(member.vehicleId!)}>
              View vehicle
              <NorthEastRounded fontSize="inherit" />
            </button>
          )}
        </section>
        <section className="team-today-trips">
          <h3 className="type-text-lg-semibold">Today’s trips</h3>
          {trips?.length ? (
            trips.map((trip) => (
              <button key={trip.id} className="team-trip" onClick={() => onNavigate(`${member.name} · ${trip.title} in Operations`)}>
                <span className="team-trip-summary">
                  <span className="team-trip-heading">
                    <strong className="type-text-md-semibold">{trip.title}</strong>
                    <span className={`team-trip-status type-text-xs-medium ${trip.status === 'Completed' ? 'team-trip-status--completed' : 'team-trip-status--progress'}`}>{trip.status}</span>
                  </span>
                  <span className="type-text-sm-regular text-wp-text-tertiary">
                    {trip.recordedStops} of {trip.totalStops} stops recorded
                  </span>
                  {trip.nextStop && <span className="type-text-sm-regular text-wp-text-tertiary">Next: {trip.nextStop}</span>}
                </span>
                <ChevronRightRounded fontSize="inherit" />
              </button>
            ))
          ) : (
            <p className="type-text-sm-regular text-wp-text-tertiary" role={tripsError ? 'alert' : undefined}>
              {member.role === 'Loader'
                ? 'Assigned to the depot loading team.'
                : member.role !== 'Driver'
                  ? 'Trips apply to drivers only.'
                  : tripsError
                    ? tripsError
                    : trips === null
                      ? 'Loading trips…'
                      : 'No trips assigned today.'}
            </p>
          )}
        </section>
        <section className="team-work-details">
          <h3 className="type-text-lg-semibold">Depot, role and status</h3>
          <p className="type-text-sm-regular text-wp-text-tertiary">Where they work, what they can do, and whether they can sign in.</p>
          <StaffAccessEditor key={`${member.id}:${member.depot}:${member.roleKey}:${member.statusKey}`} member={member} self={self} onSave={onSaveAccess} />
        </section>
      </div>
      <footer className="fleet-details-footer">
        <Button className="w-full" onClick={() => onNavigate(`Trips for ${member.name} in Operations`)}>
          View trips in Operations
        </Button>
      </footer>
    </DetailPanel>
  )
}
