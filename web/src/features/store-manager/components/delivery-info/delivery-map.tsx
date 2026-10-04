import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet'
import L from 'leaflet'

import icon from 'leaflet/dist/images/marker-icon.png'
import iconShadow from 'leaflet/dist/images/marker-shadow.png'
import 'leaflet/dist/leaflet.css'

const DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
})

interface MapProps {
  depotPosition: [number, number]
  vehiclePosition: [number, number]
  routeCoordinates: [number, number][]
  vehicleId: string
}

export function DeliveryMap({ depotPosition, vehiclePosition, routeCoordinates, vehicleId }: MapProps) {
  // If warehouse and vehicle markers are too close, position them side by side
  const isTooClose =
    Math.hypot(vehiclePosition[0] - depotPosition[0], vehiclePosition[1] - depotPosition[1]) < 0.001
  const effectiveVehiclePos: [number, number] = isTooClose
    ? [depotPosition[0], depotPosition[1] + 0.003]
    : vehiclePosition

  return (
    <div className="w-full h-full relative z-0">
      <MapContainer center={vehiclePosition} zoom={13} scrollWheelZoom={false} className="w-full h-full min-h-[700px]">
        {/* OpenStreetMap Tile Layer */}
        <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

        {/* Route Path Line */}
        <Polyline positions={routeCoordinates} color="#15803d" weight={5} />

        {/* Peliyagoda Depot Marker - Warehouse covers vehicle */}
        <Marker position={depotPosition} icon={DefaultIcon} zIndexOffset={1000}>
          <Popup>
            <div className="font-semibold">Peliyagoda Depot</div>
          </Popup>
        </Marker>

        {/* Current Vehicle Position Marker - Sits side by side if close to warehouse */}
        <Marker position={effectiveVehiclePos} icon={DefaultIcon} zIndexOffset={600}>
          <Popup>
            <div className="font-semibold text-stone-900">{vehicleId} - En Route</div>
          </Popup>
        </Marker>
      </MapContainer>
    </div>
  )
}
