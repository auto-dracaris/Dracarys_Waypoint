import React, { lazy, Suspense, useSyncExternalStore } from 'react'
import { Check, Phone } from 'lucide-react'
import { Button } from '@/components/ui/shadcn/button'
import type { DeliveryDetails } from '@/features/store-manager/types'
import { VehicleBanner } from '../vehicle-banner'

const DeliveryMap = lazy(() => import('./delivery-map').then((module) => ({ default: module.DeliveryMap })))
const subscribe = () => () => {}
const clientSnapshot = () => true
const serverSnapshot = () => false

interface DeliveryRouteMapProps {
  data: DeliveryDetails
}

export function DeliveryRouteMap({ data }: DeliveryRouteMapProps) {
  const isClient = useSyncExternalStore(subscribe, clientSnapshot, serverSnapshot)

  return (
    <div className="self-stretch rounded-lg border border-neutral-300 flex flex-col bg-white overflow-hidden">
      <div className="p-4 border-b border-neutral-200">
        <h2 className="text-stone-900 text-4xl font-medium font-sans">Delivery route</h2>
      </div>

      {/* FIX: Ensure flex-row layout and strict minimum height */}
      <div className="flex flex-row w-full relative min-h-[750px] items-stretch">
        {/* Left Map Panel */}
        <div className="flex-2 relative z-0 bg-slate-100">
          <Suspense fallback={<p role="status">Loading delivery map…</p>}>
            {isClient ? (
              <DeliveryMap
                depot={data.depot}
                outletPosition={data.outletPosition}
                vehiclePosition={data.vehiclePosition}
                routeCoordinates={data.route}
                vehicleId={data.vehicleId}
                statusLabel={data.status}
              />
            ) : (
              <p role="status">Loading delivery map…</p>
            )}
          </Suspense>
        </div>

        {/* Right Tracking Details Panel - Added shrink-0 */}
        <div className="flex-1 shrink-0 bg-neutral-50 border-l border-zinc-200 flex flex-col justify-between z-10">
          <div>
            <div className="h-[150px] shrink-0 border-b border-neutral-200 w-full">
              <VehicleBanner vehicleId={data.vehicleId} vehicleType={data.vehicleType} statusLabel={data.status} statusVariant={data.statusVariant} />
            </div>

            <div className="p-4 flex flex-col gap-3">
              {data.timeline.map((step, index) => {
                const isCompleted = step.status === 'completed'
                const isCurrent = step.status === 'current'

                return (
                  <React.Fragment key={step.id}>
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold font-sans ${
                          isCompleted ? 'bg-lime-500 text-white' : isCurrent ? 'bg-neutral-50 border-2 border-lime-500 text-lime-700' : 'bg-neutral-50 border-2 border-neutral-300 text-stone-500'
                        }`}
                      >
                        {isCompleted ? <Check className="h-4 w-4" /> : step.id}
                      </div>
                      <div>
                        <p className={`text-sm font-medium font-sans ${isCurrent ? 'text-lime-800' : 'text-stone-700'}`}>{step.title}</p>
                        <p className={`text-xs font-sans ${isCurrent ? 'text-lime-700' : 'text-stone-500'}`}>{step.timestamp}</p>
                      </div>
                    </div>

                    {index < data.timeline.length - 1 && <div className={`ml-4 w-0.5 h-6 ${isCompleted ? 'bg-lime-500' : 'bg-neutral-200'}`} />}
                  </React.Fragment>
                )
              })}
            </div>

            <div className="px-4 py-2 border-t border-neutral-200 flex justify-between items-center text-sm font-sans">
              <span className="text-stone-500">Quantity</span>
              <span className="text-stone-900 font-medium">{data.quantity}</span>
            </div>
          </div>

          <div className="p-4 border-t border-neutral-200">
            <Button variant="outline" className="w-full h-12 border-stone-900 text-stone-900 font-medium font-sans gap-2 rounded-sm">
              <Phone className="h-5 w-5" />
              Contact dispatcher
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
