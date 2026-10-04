import { useEffect, useState } from 'react'
import { Header } from '@/components/layout/store-manager-header'
import { MetricsOverview } from '@/features/store-manager/components/delivery-info/metrics-overview'
import { DeliveryRouteMap } from '@/features/store-manager/components/delivery-info/delivery-route-map'
import { fetchDelivery, type DeliveryTracking } from '@/features/store-manager/api'
import { isEnRoute, toDeliveryDetails } from '@/features/store-manager/delivery-format'
import { capitalise, formatLongDay, formatTime, outletLabel, windowLabel } from '@/features/store-manager/order-format'
import { useUser } from '@/features/auth/user-context'
import { Info } from 'lucide-react'
import { Link, useNavigate, useParams } from 'react-router-dom'

// How often a delivery on the road is refreshed, so the vehicle moves on the map.
const LIVE_REFRESH_MS = 30_000

function footnote({ trip, stop, route }: DeliveryTracking): string {
  const location = trip?.vehicle.location
  const parts = [route.followsRoads ? 'Road route from the depot to your outlet' : 'Straight lines between stops; road routing is unavailable']
  if (location?.at) parts.push(`vehicle location updated ${formatTime(location.at)}`)
  else if (trip && stop && isEnRoute(trip, stop)) parts.push('waiting for the vehicle’s first location update')
  return parts.join(' · ')
}

export function DeliveryTrackingPage() {
  const navigate = useNavigate()
  const { id } = useParams()
  const orderId = Number(id)
  const validId = Number.isInteger(orderId) && orderId > 0
  const { accessToken } = useUser()
  const [tracking, setTracking] = useState<DeliveryTracking | null>(null)
  const [error, setError] = useState('')
  const [attempt, setAttempt] = useState(0)
  const live = !!tracking?.trip && !!tracking.stop && isEnRoute(tracking.trip, tracking.stop)

  useEffect(() => {
    if (!accessToken || !validId) return
    let stale = false
    fetchDelivery(accessToken, orderId).then(
      (data) => {
        if (stale) return
        setTracking(data)
        setError('')
      },
      (reason: Error) => {
        if (!stale) setError(reason.message)
      },
    )
    return () => {
      stale = true
    }
  }, [accessToken, orderId, validId, attempt])

  useEffect(() => {
    if (!live) return
    const timer = setInterval(() => setAttempt((count) => count + 1), LIVE_REFRESH_MS)
    return () => clearInterval(timer)
  }, [live])

  const placeOrder = () => navigate('/store-manager/orders/create')

  if (!validId || (error && !tracking)) {
    return (
      <div className="p-8 flex flex-col items-start gap-3 font-sans">
        <p className="text-red-700 font-medium">{validId ? error : 'This delivery could not be found.'}</p>
        <button type="button" onClick={() => setAttempt((count) => count + 1)} className="text-blue-600 font-medium hover:underline">
          Try again
        </button>
      </div>
    )
  }
  if (!tracking) {
    return <div className="p-8 text-stone-500 font-medium">Loading delivery...</div>
  }

  const { order, trip, stop } = tracking
  const details = toDeliveryDetails(tracking)
  const title = `${capitalise(order.tempRequirement)} delivery`
  const dateLabel = `${formatLongDay(trip?.serviceDate ?? order.requestedDate)} · ${details ? 'Delivery tracking' : 'Not scheduled yet'}`

  return (
    <div className="w-full min-h-screen bg-neutral-50 flex justify-start items-start">
      <div className="flex-1 pl-8 pr-6 pt-5 pb-8 flex flex-col gap-6 overflow-hidden">
        <Header title={title} deliveryCode={order.reference} dateLabel={dateLabel} breadcrumbs={[]} onPlaceOrder={placeOrder} />
        {details && trip && stop ? (
          <>
            <MetricsOverview
              plannedArrival={formatTime(stop.plannedArrivalAt)}
              receivingWindow={order.outlet ? windowLabel(order.outlet) : '—'}
              locationName={order.outlet ? outletLabel(order.outlet) : '—'}
            />
            <DeliveryRouteMap data={details} />

            <div className="flex items-center gap-2 text-gray-500 text-xs">
              <Info className="h-4 w-4" />
              <span>{footnote(tracking)}</span>
            </div>
          </>
        ) : (
          <div className="self-stretch p-6 bg-white rounded-lg border border-neutral-300 flex flex-col items-start gap-2 font-sans">
            <p className="text-stone-900 font-medium">{order.reference} is not on a delivery yet.</p>
            <p className="text-stone-500 text-sm">Tracking appears here once the dispatcher publishes the plan that carries it.</p>
            <Link to="/store-manager/orders" className="text-blue-600 text-sm font-medium hover:underline">
              Back to orders
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}

export default DeliveryTrackingPage
