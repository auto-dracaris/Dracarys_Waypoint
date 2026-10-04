import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react'
import ArrowForwardRounded from '@mui/icons-material/ArrowForwardRounded'
import SearchRounded from '@mui/icons-material/SearchRounded'
import { Button } from '@/components/ui/button'
import { routes, type RouteFilter } from '../data'
import { ALL_OUTLETS, KANDY_DEPOT, PELIYAGODA_DEPOT } from '../map-data'
import type { VehicleMapItem } from './delivery-map'
import { RouteTimelineCard } from './route-timeline-card'
import { VehiclePanel } from './vehicle-panel'

const filters: RouteFilter[] = ['All', 'Errors', 'Success', 'Unallocated']
const DeliveryMap = lazy(() => import('./delivery-map').then((module) => ({ default: module.DeliveryMap })))

export function ActiveRoutes({ onNavigate }: { onNavigate: (title: string) => void }) {
  const [filter, setFilter] = useState<RouteFilter>('All')
  const [query, setQuery] = useState('')
  // Opens with a vehicle on the road selected, so its details panel is there from the start.
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(() => routes.find((route) => route.category === 'Success')?.id ?? null)
  const [showRouteTimeline, setShowRouteTimeline] = useState(false)
  const search = useRef<HTMLInputElement>(null)
  const mapSectionRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const shortcut = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        search.current?.focus()
      }
    }
    window.addEventListener('keydown', shortcut)
    return () => window.removeEventListener('keydown', shortcut)
  }, [])

  // Snap the top of the map to the top of the viewport (with 16px space) and require a deliberate scroll effort (scroll delta accumulation) to break free
  useEffect(() => {
    let isSnapped = false
    let accumulatedDelta = 0
    let resetTimer: ReturnType<typeof setTimeout> | null = null
    let justBrokeSnap = false
    let brokeSnapTimer: ReturnType<typeof setTimeout> | null = null

    const targetOffset = 16 // Small 16px space from the top of viewport
    const snapZone = 120 // Generous window to catch fast wheel gestures
    const escapeThreshold = 380 // Amount of deliberate scroll delta needed to break out of the snap

    const handleWheel = (e: WheelEvent) => {
      if (!mapSectionRef.current) return

      const rect = mapSectionRef.current.getBoundingClientRect()
      const diff = rect.top - targetOffset

      // If user just deliberately broke the snap, allow free scrolling until they move away from the snap point
      if (justBrokeSnap) {
        if (Math.abs(diff) > 200) {
          justBrokeSnap = false
        }
        return
      }

      // If we are currently locked in the snap position:
      if (isSnapped) {
        // Accumulate scroll input in either direction
        accumulatedDelta += Math.abs(e.deltaY)

        if (resetTimer) clearTimeout(resetTimer)
        resetTimer = setTimeout(() => {
          accumulatedDelta = 0
        }, 400)

        // If user hasn't scrolled hard enough yet, absorb scroll event and lock view to the snapped position
        if (accumulatedDelta < escapeThreshold) {
          e.preventDefault()
          const exactTarget = window.scrollY + diff
          if (Math.abs(diff) > 0.5) {
            window.scrollTo({ top: exactTarget })
          }
          return
        }

        // Once accumulated delta exceeds threshold, break the snap lock
        isSnapped = false
        accumulatedDelta = 0
        justBrokeSnap = true
        if (brokeSnapTimer) clearTimeout(brokeSnapTimer)
        brokeSnapTimer = setTimeout(() => {
          justBrokeSnap = false
        }, 800)
        return
      }

      // Check if this wheel gesture crosses or enters the snap point:
      // Case 1: Scrolling down, currently above target, and this gesture reaches or shoots past target
      const isCrossingDown = diff > 0 && e.deltaY > 0 && (diff <= snapZone || diff - e.deltaY <= 0)
      // Case 2: Scrolling up, currently below target, and this gesture reaches or shoots past target
      const isCrossingUp = diff < 0 && e.deltaY < 0 && (Math.abs(diff) <= snapZone || diff - e.deltaY >= 0)

      if (isCrossingDown || isCrossingUp) {
        e.preventDefault()
        isSnapped = true
        accumulatedDelta = 0
        const exactTarget = window.scrollY + diff
        window.scrollTo({ top: exactTarget, behavior: 'smooth' })
      }
    }

    // If user scrolls via scrollbar or touch outside wheel, update isSnapped status if far away
    const handleScroll = () => {
      if (!mapSectionRef.current) return
      const rect = mapSectionRef.current.getBoundingClientRect()
      const diff = rect.top - targetOffset
      if (Math.abs(diff) > 250) {
        isSnapped = false
        accumulatedDelta = 0
        justBrokeSnap = false
      }
    }

    window.addEventListener('wheel', handleWheel, { passive: false })
    window.addEventListener('scroll', handleScroll, { passive: true })

    return () => {
      window.removeEventListener('wheel', handleWheel)
      window.removeEventListener('scroll', handleScroll)
      if (resetTimer) clearTimeout(resetTimer)
      if (brokeSnapTimer) clearTimeout(brokeSnapTimer)
    }
  }, [])

  const matching = routes.filter(
    (route) =>
      (filter === 'All' || route.category === filter) &&
      `${route.id} ${route.nextStop} ${route.vehicleType}`.toLowerCase().includes(query.trim().toLowerCase()),
  )

  const selected = matching.find((r) => r.id === selectedVehicleId) || null

  const mapVehicles: VehicleMapItem[] = useMemo(
    () =>
      matching.map((route) => ({
        id: route.id,
        type: route.vehicleType.toLowerCase().includes('van') ? 'van' : 'truck',
        category: route.category,
        status: route.status,
        position: route.map.vehiclePosition,
        depotName: route.depotName,
        nextStop: route.nextStop,
        outletId: route.outletId,
        destinationOutletId: route.destinationOutletId,
        destinationDistrict: route.destinationDistrict,
        routeCoordinates: route.map.routeCoordinates,
        routeStops: route.routeStops,
      })),
    [matching],
  )

  const depots = useMemo(
    () => [
      { name: 'Peliyagoda Depot', position: PELIYAGODA_DEPOT },
      { name: 'Kandy Depot', position: KANDY_DEPOT },
    ],
    [],
  )

  return (
    <section className="active-routes" aria-labelledby="routes-title">
      <div className="routes-header">
        <h2 id="routes-title" className="type-display-md-medium">
          Active routes
        </h2>
        <Button size="md" className="" onClick={() => onNavigate('All routes')}>
          View all routes <ArrowForwardRounded fontSize="inherit" />
        </Button>
      </div>

      <div className="routes-toolbar">
        <div className="route-filters" role="group" aria-label="Filter routes">
          {filters.map((label) => (
            <button
              key={label}
              type="button"
              aria-pressed={label === filter}
              onClick={() => setFilter(label)}
              className={label === filter ? 'route-filter--active type-text-sm-medium' : 'type-text-sm-regular'}
            >
              <span>{label}</span>
              <span className="text-wp-text-quaternary">
                {routes.filter((route) => label === 'All' || route.category === label).length}
              </span>
            </button>
          ))}
        </div>

        <div className="route-search">
          <SearchRounded fontSize="inherit" />
          <input
            ref={search}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            aria-label="Search routes by vehicle or outlet"
            placeholder="Search"
            className="type-text-sm-regular"
          />
          <kbd className="type-text-xs-medium">⌘K</kbd>
        </div>
      </div>

      <div ref={mapSectionRef} className="route-content">
        <div className="overview-map">
          {mapVehicles.length > 0 ? (
            <Suspense
              fallback={
                <div className="delivery-map-empty type-text-sm-regular" role="status">
                  Loading map…
                </div>
              }
            >
              <DeliveryMap
                vehicles={mapVehicles}
                depots={depots}
                outlets={ALL_OUTLETS}
                selectedVehicleId={selected?.id ?? null}
                showRouteStops={showRouteTimeline}
                onSelectVehicle={(id) => {
                  setSelectedVehicleId((prev) => {
                    if (prev === id) {
                      setShowRouteTimeline(false)
                      return null
                    }
                    return id
                  })
                }}
                onClearSelection={() => {
                  setSelectedVehicleId(null)
                  setShowRouteTimeline(false)
                }}
              />
            </Suspense>
          ) : (
            <div className="delivery-map-empty type-text-sm-regular" role="status">
              No matching routes to display on the map.
            </div>
          )}

          {selected && showRouteTimeline && (
            <RouteTimelineCard
              route={selected}
              onClose={() => setShowRouteTimeline(false)}
            />
          )}
        </div>

        {selected && (
          <VehiclePanel
            route={selected}
            isViewingRoute={showRouteTimeline}
            onView={() => setShowRouteTimeline((prev) => !prev)}
            onClose={() => {
              setSelectedVehicleId(null)
              setShowRouteTimeline(false)
            }}
          />
        )}
      </div>
    </section>
  )
}
