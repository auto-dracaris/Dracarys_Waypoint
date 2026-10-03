import { useEffect, useRef, useState } from 'react'
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet'
import L from 'leaflet'
import icon from 'leaflet/dist/images/marker-icon.png'
import iconRetina from 'leaflet/dist/images/marker-icon-2x.png'
import iconShadow from 'leaflet/dist/images/marker-shadow.png'
import { hasValidMapLocations, type DeliveryMapLocations } from '../map-data'
import 'leaflet/dist/leaflet.css'
import '@/styles/delivery-map.css'

// Explicit marker icons keep Vite asset URLs correct without changing Leaflet globals.
const markerIcon = L.icon({
  iconUrl: icon,
  iconRetinaUrl: iconRetina,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
})

interface MapProps extends DeliveryMapLocations {
  vehicleId: string
  vehicleStatus?: string
}

function MapViewport({ depotPosition, vehiclePosition, routeCoordinates }: DeliveryMapLocations) {
  const map = useMap()
  useEffect(() => {
    const padding = Number.parseFloat(getComputedStyle(map.getContainer()).getPropertyValue('--wp-space-3xl')) || 0
    map.fitBounds(L.latLngBounds([depotPosition, vehiclePosition, ...routeCoordinates]), { padding: [padding, padding], maxZoom: 13, animate: false })
  }, [map, depotPosition, vehiclePosition, routeCoordinates])
  useEffect(() => {
    let frame = 0
    const observer = new ResizeObserver(() => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => map.invalidateSize({ pan: false, debounceMoveend: true }))
    })
    observer.observe(map.getContainer())
    return () => {
      observer.disconnect()
      cancelAnimationFrame(frame)
    }
  }, [map])
  return null
}

export function DeliveryMap({ depotPosition, vehiclePosition, routeCoordinates, vehicleId, vehicleStatus = 'En route' }: MapProps) {
  const tiles = useRef<L.TileLayer>(null)
  const [tilesFailed, setTilesFailed] = useState(false)
  const locations = { depotPosition, vehiclePosition, routeCoordinates }
  if (!hasValidMapLocations(locations))
    return (
      <div className="delivery-map-empty type-text-sm-regular" role="status">
        Route location data is unavailable.
      </div>
    )
  return (
    <div className="delivery-map" role="region" aria-label={`Delivery map for ${vehicleId}`}>
      <MapContainer center={vehiclePosition} zoom={13} scrollWheelZoom={false} className="delivery-map-canvas">
        <TileLayer
          ref={tiles}
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          eventHandlers={{ tileerror: () => setTilesFailed(true) }}
        />
        {routeCoordinates.length > 1 && <Polyline positions={routeCoordinates} pathOptions={{ className: 'delivery-route-path' }} />}
        <Marker position={depotPosition} icon={markerIcon} title="Peliyagoda Depot" alt="Peliyagoda Depot marker">
          <Popup>
            <strong className="type-text-sm-semibold">Peliyagoda Depot</strong>
          </Popup>
        </Marker>
        <Marker position={vehiclePosition} icon={markerIcon} title={vehicleId} alt={`${vehicleId} vehicle marker`}>
          <Popup>
            <strong className="type-text-sm-semibold">
              {vehicleId} · {vehicleStatus}
            </strong>
          </Popup>
        </Marker>
        <MapViewport {...locations} />
      </MapContainer>
      <span className="delivery-map-demo type-text-xs-medium">Demo locations · {vehicleId}</span>
      {tilesFailed && (
        <div className="delivery-map-notice type-text-xs-regular" role="status">
          <span>Some map tiles could not load.</span>
          <button
            type="button"
            className="type-text-xs-semibold"
            onClick={() => {
              setTilesFailed(false)
              tiles.current?.redraw()
            }}
          >
            Retry
          </button>
        </div>
      )}
    </div>
  )
}
