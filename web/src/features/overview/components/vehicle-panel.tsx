import { ArrowRight, Info, X } from 'lucide-react'
import type { RoutePreview } from '../data'

export function VehiclePanel({
  route,
  onView,
  onClose,
  isViewingRoute = false,
}: {
  route: RoutePreview
  onView: () => void
  onClose?: () => void
  isViewingRoute?: boolean
}) {
  const progress = Math.round((route.recorded / route.stops) * 100)

  return (
    <aside className="vehicle-panel" aria-label="Selected vehicle">
      {/* Top Header */}
      <div className="vehicle-panel-topbar">
        <span className="text-sm font-semibold text-gray-600">Vehicle details</span>
        {onClose && (
          <button
            type="button"
            className="vehicle-panel-close-btn"
            onClick={onClose}
            aria-label="Close vehicle details"
          >
            <X size={18} />
          </button>
        )}
      </div>

      <div className="vehicle-panel-main">
        {/* Title and Status */}
        <div className="vehicle-title-section">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold tracking-tight text-gray-900">{route.id}</h2>
            <span className={`vehicle-status-badge vehicle-status-badge--${route.category.toLowerCase()}`}>
              <span className="vehicle-status-dot" />
              {route.status}
            </span>
          </div>
          <p className="text-sm text-gray-500 font-medium mt-0.5">{route.vehicleType}</p>
        </div>

        {/* Progress Bar or Unallocated Notice */}
        {route.stops > 0 ? (
          <div className="vehicle-progress-section">
            <div className="flex justify-between items-center text-xs text-gray-700 font-medium mb-1.5">
              <span>
                Trip 1 · {route.recorded} of {route.stops} stops recorded
              </span>
              <strong className="font-semibold text-gray-900">{progress}%</strong>
            </div>
            <div
              className="vehicle-progress-track"
              role="progressbar"
              aria-label="Stops recorded"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={progress}
            >
              <div className="vehicle-progress-fill" style={{ width: `${progress}%` }} />
            </div>
          </div>
        ) : (
          <div className="vehicle-unallocated-card">
            <div className="flex items-center justify-between text-xs font-semibold text-gray-700">
              <span>Allocation: Unallocated</span>
              <span className="text-gray-500 font-normal">0 trips</span>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Vehicle is available and parked at Peliyagoda Depot.
            </p>
          </div>
        )}

        {/* Next Stop */}
        <div className="vehicle-next-stop-section">
          <p className="text-xs font-medium text-gray-500">Next stop</p>
          <p className="text-sm font-bold text-gray-900 mt-0.5">
            {route.outletId || route.nextStop}
          </p>
        </div>

        {/* Key Values List */}
        <dl className="vehicle-details-list">
          {route.destinationOutletId && (
            <div className="vehicle-details-row">
              <dt className="text-xs text-gray-500 font-normal">Destination</dt>
              <dd className="text-xs font-semibold text-gray-900">
                {route.destinationOutletId}
                {route.destinationDistrict && (
                  <span className="ml-1 text-gray-500 font-normal">({route.destinationDistrict})</span>
                )}
              </dd>
            </div>
          )}
          <div className="vehicle-details-row">
            <dt className="text-xs text-gray-500 font-normal">Delivery window</dt>
            <dd className="text-xs font-semibold text-gray-900">{route.window}</dd>
          </div>
          <div className="vehicle-details-row">
            <dt className="text-xs text-gray-500 font-normal">Expected arrival</dt>
            <dd className="text-xs font-semibold text-gray-900">{route.arrival}</dd>
          </div>
          <div className="vehicle-details-row">
            <dt className="text-xs text-gray-500 font-normal">Location status</dt>
            <dd className="text-xs font-semibold text-gray-900">{route.updated}</dd>
          </div>
        </dl>

        {/* Action Button */}
        {route.stops > 0 ? (
          <button
            type="button"
            className="vehicle-view-route-button"
            onClick={onView}
          >
            <span>{isViewingRoute ? 'Hide route' : 'View route'}</span>
            <ArrowRight size={16} />
          </button>
        ) : (
          <button
            type="button"
            className="vehicle-view-route-button vehicle-view-route-button--disabled"
            disabled
          >
            <span>No route planned</span>
          </button>
        )}

        {/* Footer info note */}
        <div className="vehicle-info-note">
          <Info size={16} className="text-gray-500 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-gray-600 leading-relaxed">
            Location freshness and delivery progress are tracked separately.
          </p>
        </div>
      </div>
    </aside>
  )
}
