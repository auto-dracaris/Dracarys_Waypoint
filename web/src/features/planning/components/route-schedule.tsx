import { StatusBadge } from '@/components/ui/status-badge'
import type { PlanRoute } from '../data'

export function RouteSchedule({ route }: { route: PlanRoute }) {
  const titleId = `plan-route-${route.vehicleId}-${route.trip.replaceAll(' ', '-')}`
  return (
    <section className="plan-route" aria-labelledby={titleId}>
      <header className="plan-route-header">
        <div>
          <h3 id={titleId} className="type-text-sm-bold">
            {route.vehicleId}
          </h3>
          <span className="type-text-xs-regular text-wp-text-secondary">
            {route.vehicleType}
            {route.summary && ` · ${route.summary}`}
          </span>
        </div>
        <StatusBadge tone="info">{route.trip}</StatusBadge>
      </header>
      <div className="plan-schedule-scroll" role="region" aria-label={`${route.vehicleId} ${route.trip} stop schedule`} tabIndex={0}>
        <table className="plan-schedule type-text-xs-regular">
          <caption className="sr-only">
            {route.vehicleId} · {route.trip} · Vehicle sequence and stop schedule
          </caption>
          <colgroup>
            <col />
            <col />
            <col />
            <col />
            <col />
            <col />
          </colgroup>
          <thead>
            <tr>
              {['Stop #', 'Outlet', 'Order ID', 'Planned arrival', 'Delivery window', 'Load (kg / m³)'].map((label) => (
                <th scope="col" className="type-text-xs-semibold" key={label}>
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {route.stops.map((stop) => (
              <tr key={stop.orderId}>
                <td>{stop.sequence}</td>
                <th scope="row" className="type-text-xs-medium">
                  {stop.outlet}
                </th>
                <td className="text-wp-text-secondary">{stop.orderId}</td>
                <td>{stop.arrival}</td>
                <td className="text-wp-text-secondary">{stop.window}</td>
                <td>{stop.load}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}
