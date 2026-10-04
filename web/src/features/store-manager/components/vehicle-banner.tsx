import layer from '@/assets/store-manager/layer.png'
import truck from '@/assets/store-manager/truck.png'
import van from '@/assets/store-manager/van.png'

interface VehicleBannerProps {
  vehicleId: string
  vehicleType: string
  statusLabel: string
  statusVariant?: 'green' | 'yellow' | 'blue' | 'red'
}

export function VehicleBanner({ vehicleId, vehicleType, statusLabel, statusVariant = 'green' }: VehicleBannerProps) {
  const statusStyles = {
    green: 'bg-lime-100 text-lime-700',
    yellow: 'bg-amber-100 text-amber-800',
    blue: 'bg-blue-100 text-blue-700',
    red: 'bg-red-100 text-red-700',
  }[statusVariant]

  return (
    <div className="relative w-full h-full min-h-[140px] px-4 py-3.5 bg-yellow-400 flex justify-between items-center overflow-hidden">
      {/* Background Soft-light texture overlay */}
      <img className="w-full h-full absolute inset-0 mix-blend-soft-light pointer-events-none object-cover opacity-50" src={layer} alt="Texture background" />

      {/* Truck graphic positioned tightly to the left and bottom */}
      <div className="absolute left-0 bottom-0 z-10 flex items-end w-[220px] md:w-[260px] h-full">
        <img className="w-full h-auto object-contain object-bottom select-none pointer-events-none -ml-4" src={vehicleType.toLowerCase().includes('truck') ? truck : van} alt={vehicleType} />
      </div>

      {/* Spacer to push text content to the right */}
      <div className="flex-1" />

      {/* Right Column: Status badge and vehicle text info */}
      <div className="flex flex-col justify-between items-end z-10 h-full relative py-1">
        {/* Status Pill */}
        <div className={`px-3 py-1 rounded-full flex justify-center items-center ${statusStyles}`}>
          <span className="text-xs font-medium font-sans">{statusLabel}</span>
        </div>

        {/* Vehicle ID & Type */}
        <div className="flex flex-col items-end mt-auto">
          <h3 className="text-stone-900 text-3xl font-semibold font-sans tracking-tight">{vehicleId}</h3>
          <span className="text-stone-800 text-sm font-medium font-sans">{vehicleType}</span>
        </div>
      </div>
    </div>
  )
}
