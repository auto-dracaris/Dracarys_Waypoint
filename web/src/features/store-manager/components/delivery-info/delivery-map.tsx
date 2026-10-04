import { MapContainer, TileLayer, Marker, Popup, Polyline, Tooltip } from 'react-leaflet'
import L from 'leaflet'
import { createVehicleIcon } from '@/features/overview/vehicle-icon'

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

interface MapProps {
  depot: { name: string; position: [number, number] | null }
  outletPosition: [number, number] | null
  vehiclePosition: [number, number] | null
  routeCoordinates: [number, number][]
  vehicleId: string
  vehicleKind: 'truck' | 'van'
  statusLabel: string
}

export function DeliveryMap({ depot, outletPosition, vehiclePosition, routeCoordinates, vehicleId, vehicleKind, statusLabel }: MapProps) {
  // If warehouse and vehicle markers are too close, position them side by side
  const isTooClose = depot.position && vehiclePosition && Math.hypot(vehiclePosition[0] - depot.position[0], vehiclePosition[1] - depot.position[1]) < 0.001
  const effectiveVehiclePos: [number, number] | null = isTooClose && depot.position && vehiclePosition ? [depot.position[0], depot.position[1] + 0.003] : vehiclePosition

  // Frame the whole route, or whichever points are known.
  const points = [...routeCoordinates, ...[depot.position, outletPosition, effectiveVehiclePos].filter((point): point is [number, number] => point !== null)]
  const view = points.length > 1 ? { bounds: L.latLngBounds(points), boundsOptions: { padding: [48, 48] as [number, number] } } : { center: points[0] ?? FALLBACK_CENTER, zoom: 13 }

  return (
    <div className="w-full h-full relative z-0">
      <MapContainer {...view} scrollWheelZoom={false} className="w-full h-full min-h-[700px] z-0">
        {/* OpenStreetMap Tile Layer */}
        <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

        {/* Route Path Line */}
        {routeCoordinates.length > 1 && <Polyline positions={routeCoordinates} color="#15803d" weight={5} />}

        {depot.position && (
          <Marker position={depot.position} icon={DefaultIcon} zIndexOffset={1000}>
            <Popup>
              <div className="font-sans font-semibold text-stone-900">{depot.name} depot</div>
            </Popup>
          </Marker>
        )}

        {outletPosition && (
          <Marker position={outletPosition} icon={DefaultIcon} zIndexOffset={100}>
            <Popup>
              <div className="font-sans font-semibold text-stone-900">Your outlet</div>
            </Popup>
          </Marker>
        )}

        {/* Current Vehicle Position Marker using the Custom Icon - covers outlet, sits side-by-side if close to depot */}
        {effectiveVehiclePos && (
          <Marker position={effectiveVehiclePos} icon={createVehicleIcon({ vehicleId, type: vehicleKind, isSelected: true })} zIndexOffset={600}>
            <Tooltip direction="top" offset={[0, -18]} className="wp-vehicle-tooltip">
              <span>
                {vehicleId} · {statusLabel}
              </span>
            </Tooltip>
          </Marker>
        )}
      </MapContainer>
    </div>
  )
}
