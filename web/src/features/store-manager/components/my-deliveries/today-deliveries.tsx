import { Link } from 'react-router-dom'
import { StatusBadge } from '@/components/ui/status-badge'
import layer from '@/assets/store-manager/layer.png'
import truck from '@/assets/store-manager/truck.png'
import van from '@/assets/store-manager/van.png'

export interface DeliveryItem {
  id: number
  vehicleId: string
  vehicleType: string
  statusLabel: string
  statusVariant: 'green' | 'yellow' | 'blue' | 'red'
  orderCode: string
  receivingWindow: string
  plannedArrival: string
}
const tones = { green: 'success', yellow: 'warning', blue: 'info', red: 'error' } as const

export function TodayDeliveries({ deliveries }: { deliveries: DeliveryItem[] }) {
  return <section className="store-today-deliveries">
    <div className="store-overview-section-heading"><h2 className="type-display-md-medium">Today’s deliveries</h2></div>
    <div className="store-today-list">
      {deliveries.length === 0 && <p className="store-overview-empty type-text-sm-regular">No deliveries are scheduled to your outlet today.</p>}
      {deliveries.map((item) => {
        const isTruck = item.vehicleType.toLowerCase().includes('truck')
        return <Link to={`/store-manager/delivery/${item.id}`} key={item.id} className="store-today-delivery">
          <div className={`store-overview-vehicle ${isTruck ? 'store-overview-vehicle--truck' : ''}`}>
            <img className="store-overview-vehicle-texture" src={layer} alt="" />
            <img className="store-overview-vehicle-image" src={isTruck ? truck : van} alt={item.vehicleType || 'Delivery vehicle'} />
            <div className="store-overview-vehicle-copy">
              <StatusBadge tone={tones[item.statusVariant]}>{item.statusLabel}</StatusBadge>
              <div><p className="type-display-md-semibold">{item.vehicleId}</p><p className="type-text-xs-medium">{item.vehicleType}</p></div>
            </div>
          </div>
          <div className="store-today-details">
            <div><h3 className="type-text-md-medium">{item.orderCode}</h3><p className="type-text-xs-regular">Receiving window<br />{item.receivingWindow}</p></div>
            <div className="store-today-arrival"><p className="type-text-sm-medium">Planned arrival</p><p className="type-display-lg-regular">{item.plannedArrival}</p></div>
          </div>
        </Link>
      })}
    </div>
  </section>
}
