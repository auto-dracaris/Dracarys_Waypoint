import { renderToStaticMarkup } from 'react-dom/server'
import { Truck, Van } from 'lucide-react'
import L from 'leaflet'
import '@/styles/delivery-map.css'

// Single Vehicle Icon (Yellow pin for selected, Radial progress pin for unselected).
// Shared by the fleet map and the store manager's delivery tracking map.
export function createVehicleIcon({
  vehicleId,
  type,
  isSelected,
  showLabel = true,
  progress = 0,
}: {
  vehicleId: string
  type: 'truck' | 'van'
  isSelected: boolean
  showLabel?: boolean
  progress?: number
}) {
  const IconComponent = type === 'van' ? Van : Truck
  const svg = renderToStaticMarkup(<IconComponent size={20} strokeWidth={2.2} />)
  const clampedProgress = Math.max(0, Math.min(100, Math.round(progress)))

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
      iconAnchor: [18, 40],
    })
  }

  return L.divIcon({
    className: 'wp-map-marker-container',
    html: `
      <div class="wp-vehicle-marker wp-vehicle-marker--unselected" title="${vehicleId} (${clampedProgress}% completed)">
        <div class="wp-vehicle-pin wp-vehicle-pin--progress">
          <svg class="wp-vehicle-progress-ring" viewBox="0 0 36 36">
            <rect class="wp-progress-track" x="2" y="2" width="32" height="32" rx="7" ry="7" />
            ${
              clampedProgress > 0
                ? `<rect class="wp-progress-bar" x="2" y="2" width="32" height="32" rx="7" ry="7"
                    pathLength="100"
                    stroke-dasharray="100"
                    stroke-dashoffset="${100 - clampedProgress}"
                  />`
                : ''
            }
          </svg>
          <span class="wp-vehicle-icon">${svg}</span>
          <span class="wp-vehicle-pointer"></span>
        </div>
        ${showLabel ? `<div class="wp-vehicle-label">${vehicleId}</div>` : ''}
      </div>
    `,
    iconSize: [0, 0],
    iconAnchor: [18, 40],
  })
}
