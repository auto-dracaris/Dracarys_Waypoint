import { Truck } from 'lucide-react'

interface VehicleMarkerProps {
  vehicleId: string
  isActive?: boolean
}

export function VehicleMarker({ vehicleId, isActive = false }: VehicleMarkerProps) {
  return (
    <div className="relative inline-flex flex-col drop-shadow-sm cursor-pointer hover:scale-105 transition-transform z-10">
      {/* Main Marker Box */}
      <div className={`h-9 flex items-center rounded-md ${isActive ? 'bg-yellow-400' : 'bg-white outline outline-1 outline-offset-[-1px] outline-neutral-300'}`}>
        {/* Icon Container */}
        <div className={`h-full flex justify-center items-center px-2.5 rounded-l-md relative ${isActive ? 'bg-yellow-400' : 'bg-white'}`}>
          {/* Green accent indicator on the left side for inactive state */}
          {!isActive && <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-lime-500 rounded-l-md" />}

          <Truck className={`w-5 h-5 ${isActive ? 'text-stone-900' : 'text-stone-700 ml-0.5'}`} strokeWidth={isActive ? 2.5 : 2} />
        </div>

        {/* Text Container */}
        <div className={`h-full px-3 flex justify-center items-center rounded-r-md ${isActive ? 'bg-yellow-400' : 'bg-white'}`}>
          <span className={`text-base font-sans tracking-tight line-clamp-1 ${isActive ? 'text-stone-900 font-bold' : 'text-stone-900 font-semibold'}`}>{vehicleId}</span>
        </div>
      </div>

      {/* Map Pin Pointer (Rotated Square) */}
      <div className={`absolute w-2.5 h-2.5 rotate-45 -bottom-1 left-5 ${isActive ? 'bg-yellow-400' : 'bg-white border-b border-r border-neutral-300'}`} />
    </div>
  )
}
