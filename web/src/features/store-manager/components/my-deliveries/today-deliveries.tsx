import { VehicleBanner } from '@/features/store-manager/components/vehicle-banner'
import { Link } from 'react-router-dom'

export interface DeliveryItem {
  id: string
  vehicleType: string
  statusLabel: string
  orderCode: string
  receivingWindow: string
  plannedArrival: string
}

interface TodayDeliveriesSectionProps {
  deliveries: DeliveryItem[]
}

export function TodayDeliveries({ deliveries }: TodayDeliveriesSectionProps) {
  return (
    <div className="bg-white rounded-lg border border-neutral-300 flex flex-col overflow-hidden h-full">
      {/* Section Title */}
      <div className="px-6 py-5 border-b border-neutral-200">
        <h3 className="text-stone-900 text-4xl font-medium font-sans">Today’s deliveries</h3>
      </div>

      {/* Deliveries List */}
      <div className="flex flex-col flex-1">
        {deliveries.map((item, index) => (
          <Link to={`/store-manager/delivery/${item.id}`} key={index} className="flex flex-1 border-b border-neutral-200 last:border-none min-h-[160px]">
            {/* Left: Vehicle Banner Component */}
            <div className="flex-[3] relative">
              <VehicleBanner vehicleId={item.id} vehicleType={item.vehicleType} statusLabel={item.statusLabel} statusVariant="green" />
            </div>

            {/* Right: Delivery Details Sidebar info */}
            <div className="flex-[1] px-4 py-3.5 bg-white flex flex-col justify-between items-start border-l border-neutral-200 min-w-[200px]">
              <div className="pt-1 flex flex-col gap-1 w-full">
                <span className="text-stone-900 text-base font-medium font-sans block truncate">{item.orderCode}</span>
                <p className="text-stone-500 text-xs font-normal leading-4 font-sans mt-1">
                  Receiving window
                  <br />
                  {item.receivingWindow}
                </p>
              </div>

              <div className="flex flex-col items-start w-full">
                <span className="text-stone-500 text-sm font-medium font-sans">Planned arrival</span>
                <span className="text-stone-900 text-5xl font-normal font-sans -ml-1">{item.plannedArrival}</span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
