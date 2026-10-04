import { useEffect } from 'react'
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet'
import { Loader2 } from 'lucide-react'
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
const createVehicleIcon = (vehicleId: string, isActive: boolean, progress?: number) => {
  const markerHtml = renderToString(<VehicleMarker vehicleId={vehicleId} isActive={isActive} progress={progress} />)

  return L.divIcon({
    html: markerHtml,
    className: 'bg-transparent border-none outline-none', // Clears default Leaflet styles
    iconAnchor: [56, 44], // Centers the point of the pin over the GPS coordinate
    popupAnchor: [0, -48],
  })
}

function MapBoundsUpdater({ points }: { points: [number, number][] }) {
  const map = useMap()
  useEffect(() => {
    if (points.length > 1) {
      map.fitBounds(L.latLngBounds(points), { padding: [48, 48] })
    }
  }, [map, points])
  return null
}

interface MapProps {
  depot: { name: string; position: [number, number] | null }
  outletPosition: [number, number] | null
  vehiclePosition: [number, number] | null
  routeCoordinates: [number, number][]
  vehicleId: string
  statusLabel: string
  isRouteLoading?: boolean
}

export function DeliveryMap({
  depot,
  outletPosition,
  vehiclePosition,
  routeCoordinates,
  vehicleId,
  statusLabel,
  isRouteLoading = false,
}: MapProps) {
  // If warehouse and vehicle markers are too close, position them side by side
  const isTooClose =
    depot.position &&
    vehiclePosition &&
    Math.hypot(vehiclePosition[0] - depot.position[0], vehiclePosition[1] - depot.position[1]) < 0.001
  const effectiveVehiclePos: [number, number] | null =
    isTooClose && depot.position && vehiclePosition
      ? [depot.position[0], depot.position[1] + 0.003]
      : vehiclePosition

  // Frame the whole route, or whichever points are known.
  const points = [
    ...(isRouteLoading ? [] : routeCoordinates),
    ...([depot.position, outletPosition, effectiveVehiclePos].filter((point): point is [number, number] => point !== null)),
  ]
  const view = points.length > 1 ? { bounds: L.latLngBounds(points), boundsOptions: { padding: [48, 48] as [number, number] } } : { center: points[0] ?? FALLBACK_CENTER, zoom: 13 }

  return (
    <div className="w-full h-full relative z-0">
      {isRouteLoading && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[1000] flex items-center gap-2 px-3.5 py-1.5 bg-white/95 backdrop-blur-sm shadow-md rounded-full border border-neutral-200 text-xs font-medium text-stone-700 pointer-events-none select-none">
          <Loader2 className="h-3.5 w-3.5 animate-spin text-lime-600" />
          <span>Calculating road route…</span>
        </div>
      )}

      <MapContainer {...view} scrollWheelZoom={false} className="w-full h-full min-h-[700px] z-0">
        <MapBoundsUpdater points={points} />
        {/* OpenStreetMap Tile Layer */}
        <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

        {/* Route Path Line - Only rendered once real road coordinates are loaded */}
        {!isRouteLoading && routeCoordinates.length > 1 && (
          <Polyline positions={routeCoordinates} color="#15803d" weight={5} />
        )}

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
          <Marker position={effectiveVehiclePos} icon={createVehicleIcon(vehicleId, true)} zIndexOffset={600}>
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
