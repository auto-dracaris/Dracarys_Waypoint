import { renderToStaticMarkup } from 'react-dom/server'
import { Truck, Van } from 'lucide-react'
import L from 'leaflet'
import '@/styles/delivery-map.css'

// Single Vehicle Icon (Yellow pin for selected, White pin for unselected).
// Shared by the fleet map and the store manager's delivery tracking map.
export function createVehicleIcon({ vehicleId, type, isSelected, showLabel = true }: { vehicleId: string; type: 'truck' | 'van'; isSelected: boolean; showLabel?: boolean }) {
  const IconComponent = type === 'van' ? Van : Truck
  const svg = renderToStaticMarkup(<IconComponent size={14} strokeWidth={2} />)

  if (isSelected) {
    return L.divIcon({
      className: 'wp-map-marker-container',
      html: `
        <div class="wp-vehicle-marker wp-vehicle-marker--selected">
          <div class="wp-vehicle-pin">
            <span class="wp-vehicle-icon">${svg}</span>
            <span class="wp-vehicle-pointer"></span>
          </div>
          <div class="wp-vehicle-label">${vehicleId}</div>
        </div>
      `,
      iconSize: [0, 0],
      iconAnchor: [16, 34],
    })
  }

  return L.divIcon({
    className: 'wp-map-marker-container',
    html: `
      <div class="wp-vehicle-marker wp-vehicle-marker--unselected" title="${vehicleId}">
        <div class="wp-vehicle-pin">
          <span class="wp-vehicle-icon">${svg}</span>
          <span class="wp-vehicle-pointer"></span>
        </div>
        ${showLabel ? `<div class="wp-vehicle-label">${vehicleId}</div>` : ''}
      </div>
    `,
    iconSize: [0, 0],
    iconAnchor: [16, 34],
  })
}
