import { Truck } from 'lucide-react'

interface VehicleMarkerProps {
  vehicleId: string
  isActive?: boolean
  progress?: number
}

export function VehicleMarker({ vehicleId, isActive = false, progress = 0 }: VehicleMarkerProps) {
  const clampedProgress = Math.max(0, Math.min(100, Math.round(progress)))

  return (
    <div className="relative inline-flex flex-col drop-shadow-sm cursor-pointer hover:scale-105 transition-transform z-10">
      {/* Main Marker Box */}
      <div className={`h-9 flex items-center rounded-md ${isActive ? 'bg-yellow-400' : 'bg-white outline outline-1 outline-offset-[-1px] outline-neutral-300'}`}>
        {/* Icon Container with Radial Progress Ring */}
        <div className={`h-9 w-9 flex justify-center items-center rounded-l-md relative ${isActive ? 'bg-yellow-400' : 'bg-white'}`}>
          {!isActive && (
            <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 36 36">
              {/* Muted Track */}
              <rect x="2" y="2" width="32" height="32" rx="6" ry="6" fill="none" stroke="#b5cca4" strokeWidth="3" />
              {/* Radial / Perimeter Progress Fill */}
              {clampedProgress > 0 && (
                <rect
                  x="2"
                  y="2"
                  width="32"
                  height="32"
                  rx="6"
                  ry="6"
                  fill="none"
                  stroke="#65a30d"
                  strokeWidth="3"
                  strokeLinecap="round"
                  pathLength="100"
                  strokeDasharray="100"
                  strokeDashoffset={100 - clampedProgress}
                />
              )}
            </svg>
          )}

          <Truck className={`w-5 h-5 relative z-10 ${isActive ? 'text-stone-900' : 'text-[#333438]'}`} strokeWidth={2.2} />
        </div>

        {/* Text Container */}
        <div className={`h-full px-3 flex justify-center items-center rounded-r-md ${isActive ? 'bg-yellow-400' : 'bg-white'}`}>
          <span className={`text-base font-sans tracking-tight line-clamp-1 ${isActive ? 'text-stone-900 font-bold' : 'text-stone-900 font-semibold'}`}>{vehicleId}</span>
        </div>
      </div>

      {/* Map Pin Pointer */}
      <div
        className={`absolute w-0 h-0 -bottom-1.5 left-4.5 -translate-x-1/2 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent ${
          isActive ? 'border-t-[6px] border-t-yellow-400' : 'border-t-[6px] border-t-[#b5cca4]'
        }`}
      />
    </div>
  )
}
