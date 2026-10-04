import React from 'react'
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet'
import L from 'leaflet'
import { renderToString } from 'react-dom/server'
import { VehicleMarker } from '../vehicle-marker' // Adjust this path if needed

import icon from 'leaflet/dist/images/marker-icon.png'
import iconShadow from 'leaflet/dist/images/marker-shadow.png'
import 'leaflet/dist/leaflet.css'

// Default Leaflet icon for the Depot
const DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
})

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
  depotPosition: [number, number]
  vehiclePosition: [number, number]
  routeCoordinates: [number, number][]
  vehicleId: string
}

export function DeliveryMap({ depotPosition, vehiclePosition, routeCoordinates, vehicleId }: MapProps) {
  return (
    <div className="w-full h-full relative z-0">
      <MapContainer center={vehiclePosition} zoom={13} scrollWheelZoom={false} className="w-full h-full min-h-[700px] z-0">
        {/* OpenStreetMap Tile Layer */}
        <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

        {/* Route Path Line */}
        <Polyline positions={routeCoordinates} color="#15803d" weight={5} />

        {/* Peliyagoda Depot Marker */}
        <Marker position={depotPosition} icon={DefaultIcon}>
          <Popup>
            <div className="font-sans font-semibold text-stone-900">Peliyagoda Depot</div>
          </Popup>
        </Marker>

        {/* Current Vehicle Position Marker using the Custom Icon */}
        <Marker
          position={vehiclePosition}
          icon={createVehicleIcon(vehicleId, true)} // Set to true to display the yellow active state
        >
          <Popup>
            <div className="font-sans font-semibold text-stone-900">{vehicleId} - En Route</div>
          </Popup>
        </Marker>
      </MapContainer>
    </div>
  )
}
