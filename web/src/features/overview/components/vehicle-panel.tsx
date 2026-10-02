import ArrowForwardRounded from '@mui/icons-material/ArrowForwardRounded'
import InfoOutlined from '@mui/icons-material/InfoOutlined'
import truck from '@/assets/overview/truck.png'
import texture from '@/assets/overview/texture.png'
import { Button } from '@/components/ui/button'
import type { RoutePreview } from '../data'

export function VehiclePanel({ route, onView }: { route: RoutePreview; onView: () => void }) {
  const progress = Math.round(route.recorded / route.stops * 100)
  return (
    <aside className="vehicle-panel" aria-label="Selected vehicle">
      <div className="vehicle-banner">
        <img src={texture} className="vehicle-texture" alt="" />
        <div className="truck-crop"><img src={truck} alt="WayPoint delivery truck" /></div>
        <div className="vehicle-heading">
          <span className={`vehicle-status type-text-xs-medium vehicle-status--${route.category.toLowerCase()}`}>{route.status}</span>
          <div><h3 className="type-display-sm-medium">{route.id}</h3><p className="type-text-sm-bold">{route.vehicleType}</p></div>
        </div>
      </div>
      <div className="vehicle-body">
        <div>
          <div className="trip-progress">
            <div className="flex justify-between gap-wp-space-md type-text-sm-regular"><span>Trip 1 · {route.recorded} of {route.stops} stops recorded</span><strong className="type-text-sm-semibold">{progress}%</strong></div>
            <div className="trip-progress-track" role="progressbar" aria-label="Stops recorded" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress}><div style={{ width: `${progress}%` }} /></div>
          </div>
          <div className="next-stop"><p className="text-wp-text-tertiary type-text-xs-medium">Next stop</p><p className="mt-wp-space-xs type-text-md-semibold">{route.nextStop}</p></div>
        </div>
        <div>
          <dl className="schedule-details type-text-sm-regular">
            {[['Delivery window', route.window], ['Expected arrival', route.arrival], ['Location updated', route.updated]].map(([label, value]) => <div key={label}><dt>{label}</dt><dd className="type-text-sm-medium">{value}</dd></div>)}
          </dl>
          <Button variant="primary" className="w-full" onClick={onView}>View route <ArrowForwardRounded fontSize="inherit" /></Button>
          <div className="tracking-note type-text-xs-regular"><InfoOutlined fontSize="inherit" /><p>Location freshness and delivery progress are tracked separately.</p></div>
        </div>
      </div>
    </aside>
  )
}
