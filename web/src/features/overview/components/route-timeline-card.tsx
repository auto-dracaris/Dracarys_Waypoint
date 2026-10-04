import { useState } from 'react'
import { Check, ChevronDown, ChevronUp, Clock, Calendar, X } from 'lucide-react'
import type { RoutePreview } from '../data'

interface RouteTimelineCardProps {
  route: RoutePreview
  onClose?: () => void
}

export function RouteTimelineCard({ route, onClose }: RouteTimelineCardProps) {
  const [earlierExpanded, setEarlierExpanded] = useState(false)
  const [remainingExpanded, setRemainingExpanded] = useState(false)

  const stops = route.routeStops || []
  const completedStops = stops.filter((s) => s.isCompleted)
  const pendingStops = stops.filter((s) => !s.isCompleted)
  const nextStop = pendingStops[0] || stops[stops.length - 1]
  const remainingStops = pendingStops.length > 1 ? pendingStops.slice(1) : []

  return (
    <div className="route-timeline-card" aria-label={`Trip route for ${route.id}`}>
      {/* Header */}
      <div className="route-timeline-header">
        <h3 className="route-timeline-title">
          {route.id} · {route.tripName || 'Trip 1'}
        </h3>
        {onClose && (
          <button
            type="button"
            className="route-timeline-close-btn"
            onClick={onClose}
            aria-label="Close route timeline"
          >
            <X size={16} />
          </button>
        )}
      </div>

      <div className="route-timeline-body">
        {/* Step: Pick up at Depot */}
        <div className="timeline-node">
          <div className="timeline-rail">
            <div className="timeline-icon timeline-icon--pickup">
              <Check size={12} strokeWidth={3} />
            </div>
            <div className="timeline-line timeline-line--solid" />
          </div>
          <div className="timeline-content">
            <h4 className="timeline-heading">Pick up · {route.depotName}</h4>
            <p className="timeline-address">{route.depotAddress}</p>
            <p className="timeline-time">07:00 AM</p>
          </div>
        </div>

        {/* Earlier stops */}
        {completedStops.length === 1 && (
          <div className="timeline-node">
            <div className="timeline-rail">
              <div className="timeline-icon timeline-icon--number">
                <span>{completedStops[0].sequence}</span>
              </div>
              <div className="timeline-line timeline-line--solid" />
            </div>
            <div className="timeline-content">
              <h4 className="timeline-heading">{completedStops[0].outletId}</h4>
              <p className="timeline-address">{completedStops[0].district} · Completed</p>
              <p className="timeline-time">{completedStops[0].arrival}</p>
            </div>
          </div>
        )}

        {completedStops.length > 1 && (
          <div className="timeline-node timeline-node--accordion">
            <div className="timeline-rail">
              <div className="timeline-icon timeline-icon--expand">
                <ChevronDown size={12} />
              </div>
              <div className="timeline-line timeline-line--dashed" />
            </div>
            <div className="timeline-content">
              <button
                type="button"
                className="timeline-accordion-trigger"
                onClick={() => setEarlierExpanded(!earlierExpanded)}
              >
                <span>{completedStops.length} earlier stops completed</span>
                {earlierExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </button>
              {earlierExpanded && (
                <div className="timeline-expanded-list flex flex-col gap-1.5 mt-1.5">
                  {completedStops.map((stop) => (
                    <div key={stop.sequence} className="timeline-expanded-item">
                      <p className="timeline-subheading">
                        Stop {stop.sequence} · {stop.outletId} ({stop.district})
                      </p>
                      <p className="timeline-time">{stop.arrival} · Completed</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Current / Next Stop highlighted card */}
        {nextStop && (
          <div className="timeline-node timeline-node--current">
            <div className="timeline-rail">
              <div className="timeline-icon timeline-icon--number timeline-icon--next">
                <span>{nextStop.sequence}</span>
              </div>
              <div
                className={`timeline-line ${
                  remainingStops.length > 0 ? 'timeline-line--dashed' : 'timeline-line--solid'
                }`}
              />
            </div>
            <div className="timeline-content">
              <div className="next-stop-card">
                <div className="next-stop-badges">
                  <span className="badge-next-stop">
                    {nextStop.sequence === stops.length ? 'DESTINATION' : 'NEXT STOP'}
                  </span>
                  <span className="badge-status">
                    {nextStop.isCompleted ? 'Delivered' : route.status || 'En route'}
                  </span>
                </div>
                <p className="next-stop-address">
                  {nextStop.outletId}
                  <span className="ml-1.5 text-xs font-semibold text-gray-500">
                    ({nextStop.district})
                  </span>
                </p>
                <div className="next-stop-details">
                  <div className="next-stop-detail-row">
                    <Clock size={14} className="text-wp-lime-700" />
                    <div>
                      <span className="text-xs text-gray-500">Expected arrival</span>
                      <strong className="block text-xs font-semibold text-gray-900">
                        {nextStop.arrival}
                      </strong>
                    </div>
                  </div>
                  <div className="next-stop-detail-row">
                    <Calendar size={14} className="text-wp-lime-700" />
                    <div>
                      <span className="text-xs text-gray-500">Delivery window</span>
                      <strong className="block text-xs font-semibold text-gray-900">
                        {nextStop.window}
                      </strong>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Remaining stops accordion */}
        {remainingStops.length > 0 && (
          <div className="timeline-footer">
            <button
              type="button"
              className="timeline-footer-trigger"
              onClick={() => setRemainingExpanded(!remainingExpanded)}
            >
              <div className="flex items-center gap-2">
                <span className="remaining-badge">
                  {remainingStops.length === 1
                    ? `${remainingStops[0].sequence}`
                    : `${remainingStops[0].sequence}–${remainingStops[remainingStops.length - 1].sequence}`}
                </span>
                <span className="text-xs font-medium text-gray-700">Remaining stops</span>
              </div>
              {remainingExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
            {remainingExpanded && (
              <div className="timeline-remaining-list">
                {remainingStops.map((stop) => (
                  <div key={stop.sequence} className="timeline-remaining-item">
                    <span className="font-semibold">Stop {stop.sequence}:</span> {stop.outletId} (
                    {stop.district}) ({stop.arrival})
                    {stop.sequence === stops.length && (
                      <span className="ml-1 text-wp-lime-700 font-bold">· Destination</span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {stops.length === 0 && (
          <div className="py-6 text-center text-xs text-gray-500">
            Vehicle is parked at {route.depotName}. No active stops scheduled.
          </div>
        )}
      </div>
    </div>
  )
}
