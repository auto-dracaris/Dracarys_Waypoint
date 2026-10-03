import { Clock, Calendar, MapPin } from 'lucide-react'

interface MetricsOverviewProps {
  plannedArrival: string
  receivingWindow: string
  locationName: string
}

export function MetricsOverview({ plannedArrival, receivingWindow, locationName }: MetricsOverviewProps) {
  return (
    <div className="self-stretch h-28 flex gap-3.5">
      <div className="flex-1 px-4 py-2.5 bg-white rounded-md border border-stone-200/50 flex flex-col justify-between items-end">
        <div className="w-full flex justify-between items-center">
          <Clock className="h-7 w-7 text-stone-600" />
          <span className="text-stone-600 text-base font-medium">Planned arrival</span>
        </div>
        <span className="text-stone-900 text-4xl font-medium">{plannedArrival}</span>
      </div>

      <div className="flex-1 px-4 py-2.5 bg-white rounded-md border border-stone-200/50 flex flex-col justify-between items-end">
        <div className="w-full flex justify-between items-center">
          <Calendar className="h-7 w-7 text-stone-600" />
          <span className="text-stone-600 text-base font-medium">Receiving window</span>
        </div>
        <span className="text-stone-900 text-4xl font-medium">{receivingWindow}</span>
      </div>

      <div className="flex-1 px-4 py-2.5 bg-white rounded-md border border-stone-200/50 flex flex-col justify-between items-end">
        <div className="w-full flex justify-between items-center">
          <MapPin className="h-7 w-7 text-stone-600" />
          <span className="text-stone-600 text-base font-medium">Delivery location</span>
        </div>
        <span className="text-stone-900 text-4xl font-medium">{locationName}</span>
      </div>
    </div>
  )
}
