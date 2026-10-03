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
  return (
    <div className="w-full h-full relative z-0">
      <MapContainer center={vehiclePosition} zoom={13} scrollWheelZoom={false} className="w-full h-full min-h-[700px]">
        {/* OpenStreetMap Tile Layer */}
        <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

        {/* Route Path Line */}
        <Polyline positions={routeCoordinates} color="#15803d" weight={5} />

        {/* Peliyagoda Depot Marker */}
        <Marker position={depotPosition} icon={DefaultIcon}>
          <Popup>
            <div className="font-semibold">Peliyagoda Depot</div>
          </Popup>
        </Marker>

        {/* Current Vehicle Position Marker */}
        <Marker position={vehiclePosition} icon={DefaultIcon}>
          <Popup>
            <div className="font-semibold text-stone-900">{vehicleId} - En Route</div>
          </Popup>
        </Marker>
      </MapContainer>
    </div>
  )
}
