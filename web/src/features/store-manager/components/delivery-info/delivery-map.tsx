import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet'
import L from 'leaflet'
import { renderToString } from 'react-dom/server'
import { VehicleMarker } from '../vehicle-marker'

import icon from 'leaflet/dist/images/marker-icon.png'
import iconShadow from 'leaflet/dist/images/marker-shadow.png'
import 'leaflet/dist/leaflet.css'

// Default Leaflet icon for the depot and the outlet
const DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
})

// Where the map opens when nothing on it has a known position: Colombo.
const FALLBACK_CENTER: [number, number] = [6.9271, 79.8612]

// Helper to convert the React component into a Leaflet divIcon
const createVehicleIcon = (vehicleId: string, isActive: boolean) => {
  const markerHtml = renderToString(<VehicleMarker vehicleId={vehicleId} isActive={isActive} />)

  return L.divIcon({
    html: markerHtml,
    className: 'bg-transparent border-none outline-none', // Clears default Leaflet styles
    iconAnchor: [56, 44], // Centers the point of the pin over the GPS coordinate
    popupAnchor: [0, -48],
  })
}

interface MapProps {
  depot: { name: string; position: [number, number] | null }
  outletPosition: [number, number] | null
  vehiclePosition: [number, number] | null
  routeCoordinates: [number, number][]
  vehicleId: string
  statusLabel: string
}

export function DeliveryMap({ depot, outletPosition, vehiclePosition, routeCoordinates, vehicleId, statusLabel }: MapProps) {
  // Frame the whole route, or whichever points are known.
  const points = [...routeCoordinates, ...[depot.position, outletPosition, vehiclePosition].filter((point) => point !== null)]
  const view = points.length > 1 ? { bounds: L.latLngBounds(points), boundsOptions: { padding: [48, 48] as [number, number] } } : { center: points[0] ?? FALLBACK_CENTER, zoom: 13 }

  return (
    <div className="w-full h-full relative z-0">
      <MapContainer {...view} scrollWheelZoom={false} className="w-full h-full min-h-[700px] z-0">
        {/* OpenStreetMap Tile Layer */}
        <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

        {/* Route Path Line */}
        {routeCoordinates.length > 1 && <Polyline positions={routeCoordinates} color="#15803d" weight={5} />}

        {depot.position && (
          <Marker position={depot.position} icon={DefaultIcon}>
            <Popup>
              <div className="font-sans font-semibold text-stone-900">{depot.name} depot</div>
            </Popup>
          </Marker>
        )}

        {outletPosition && (
          <Marker position={outletPosition} icon={DefaultIcon}>
            <Popup>
              <div className="font-sans font-semibold text-stone-900">Your outlet</div>
            </Popup>
          </Marker>
        )}

        {/* Current Vehicle Position Marker using the Custom Icon */}
        {vehiclePosition && (
          <Marker position={vehiclePosition} icon={createVehicleIcon(vehicleId, true)}>
            <Popup>
              <div className="font-sans font-semibold text-stone-900">
                {vehicleId} · {statusLabel}
              </div>
            </Popup>
          </Marker>
        )}
      </MapContainer>
    </div>
  )
}
