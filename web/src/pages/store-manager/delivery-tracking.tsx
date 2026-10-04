import { deliveryData } from '@/features/store-manager/data/delivery-tracking'
import { Header } from '@/components/layout/store-manager-header'
import { MetricsOverview } from '@/features/store-manager/components/delivery-info/metrics-overview'
import { DeliveryRouteMap } from '@/features/store-manager/components/delivery-info/delivery-route-map'
import { Info } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

export function DeliveryTrackingPage() {
  const navigate = useNavigate()
  return (
    <div className="w-full min-h-screen bg-neutral-50 flex justify-start items-start">
      <div className="flex-1 pl-8 pr-6 pt-5 pb-8 flex flex-col gap-6 overflow-hidden">
        <Header title="Ambient Delivery" deliveryCode="" dateLabel="Tuesday, 29 September · Your outlet at a glance" breadcrumbs={[]} onPlaceOrder={() => navigate('/store-manager/orders/create')} />
        <MetricsOverview plannedArrival={deliveryData.plannedArrival} receivingWindow={deliveryData.receivingWindow} locationName={deliveryData.locationName} />
        <DeliveryRouteMap data={deliveryData} />

        <div className="flex items-center gap-2 text-gray-500 text-xs">
          <Info className="h-4 w-4" />
          <span>Illustrative route and location data</span>
        </div>
      </div>
    </div>
  )
}

export default DeliveryTrackingPage
