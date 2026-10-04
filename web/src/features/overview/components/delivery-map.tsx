import { useEffect, useMemo, useRef, useState } from 'react'
import { MapContainer, TileLayer, Marker, Polyline, Tooltip, ZoomControl, useMap, useMapEvents } from 'react-leaflet'
import { renderToStaticMarkup } from 'react-dom/server'
import { Store, Truck, Van, Warehouse } from 'lucide-react'
import L from 'leaflet'
import { fetchRoadRoute } from '@/lib/routing'
import { createVehicleIcon } from '../vehicle-icon'
import { ALL_OUTLETS, PELIYAGODA_DEPOT, type MapPosition, type OutletMapItem, type RouteStopItem } from '../map-data'
import 'leaflet/dist/leaflet.css'
import '@/styles/delivery-map.css'

export interface VehicleMapItem {
  id: string
  type: 'truck' | 'van'
  category?: 'Success' | 'Errors' | 'Unallocated' | 'Info' | string
  status?: string
  position: MapPosition
  depotName?: string
  nextStop?: string
  outletId?: string
  destinationName?: string
  destinationOutletId?: string
  destinationDistrict?: string
  driverName?: string
  routeCoordinates?: MapPosition[]
  routeStops?: RouteStopItem[]
}

export interface DepotMapItem {
  name: string
  position: MapPosition
}

export interface DeliveryMapProps {
  vehicles?: VehicleMapItem[]
  depots?: DepotMapItem[]
  outlets?: OutletMapItem[]
  selectedVehicleId?: string | null
  onSelectVehicle?: (vehicleId: string) => void
  onClearSelection?: () => void
  showRouteStops?: boolean
  labelZoomThreshold?: number
  clusterPixelRadius?: number
  scrollWheelZoom?: boolean
  // Backward compatibility
  depotPosition?: MapPosition
  vehiclePosition?: MapPosition
  routeCoordinates?: MapPosition[]
  vehicleId?: string
  vehicleStatus?: string
}

interface VehicleCluster {
  id: string
  center: MapPosition
  vehicles: VehicleMapItem[]
}

// Group vehicles dynamically based on screen pixel distance at the current map zoom level
function clusterVehiclesByZoom(
  items: VehicleMapItem[],
  map: L.Map,
  zoom: number,
  pixelRadius = 55,
): VehicleCluster[] {
  const clusters: VehicleCluster[] = []

  for (const item of items) {
    if (!item.position || !Number.isFinite(item.position[0]) || !Number.isFinite(item.position[1])) continue

    const latLng = L.latLng(item.position[0], item.position[1])
    const pt = map.project(latLng, zoom)

    let matchedCluster: VehicleCluster | null = null
    let minDistance = Infinity

    for (const cluster of clusters) {
      const clusterLatLng = L.latLng(cluster.center[0], cluster.center[1])
      const clusterPt = map.project(clusterLatLng, zoom)
      const dist = Math.hypot(clusterPt.x - pt.x, clusterPt.y - pt.y)

      if (dist < pixelRadius && dist < minDistance) {
        minDistance = dist
        matchedCluster = cluster
      }
    }

    if (matchedCluster) {
      matchedCluster.vehicles.push(item)
      const count = matchedCluster.vehicles.length
      matchedCluster.center = [
        matchedCluster.vehicles.reduce((sum, v) => sum + v.position[0], 0) / count,
        matchedCluster.vehicles.reduce((sum, v) => sum + v.position[1], 0) / count,
      ]
    } else {
      clusters.push({
        id: `cluster-${item.id}-${clusters.length}`,
        center: [...item.position],
        vehicles: [item],
      })
    }
  }

  return clusters
}

interface OutletCluster {
  id: string
  center: MapPosition
  outlets: OutletMapItem[]
}

// Group outlets dynamically based on screen pixel distance at the current map zoom level
function clusterOutletsByZoom(
  items: OutletMapItem[],
  map: L.Map,
  zoom: number,
  pixelRadius = 48,
): OutletCluster[] {
  const clusters: OutletCluster[] = []

  for (const item of items) {
    if (!item.position || !Number.isFinite(item.position[0]) || !Number.isFinite(item.position[1])) continue

    const latLng = L.latLng(item.position[0], item.position[1])
    const pt = map.project(latLng, zoom)

    let matchedCluster: OutletCluster | null = null
    let minDistance = Infinity

    for (const cluster of clusters) {
      const clusterLatLng = L.latLng(cluster.center[0], cluster.center[1])
      const clusterPt = map.project(clusterLatLng, zoom)
      const dist = Math.hypot(clusterPt.x - pt.x, clusterPt.y - pt.y)

      if (dist < pixelRadius && dist < minDistance) {
        minDistance = dist
        matchedCluster = cluster
      }
    }

    if (matchedCluster) {
      matchedCluster.outlets.push(item)
      const count = matchedCluster.outlets.length
      matchedCluster.center = [
        matchedCluster.outlets.reduce((sum, o) => sum + o.position[0], 0) / count,
        matchedCluster.outlets.reduce((sum, o) => sum + o.position[1], 0) / count,
      ]
    } else {
      clusters.push({
        id: `outlet-cluster-${item.id}-${clusters.length}`,
        center: [...item.position],
        outlets: [item],
      })
    }
  }

  return clusters
}

// 1. Depot Icon (Yellow circle with warehouse icon + optional white label)
function createDepotIcon(name: string, showLabel = true) {
  const svg = renderToStaticMarkup(<Warehouse size={16} strokeWidth={2.2} />)
  return L.divIcon({
    className: 'wp-map-marker-container',
    html: `
      <div class="wp-depot-marker ${!showLabel ? 'wp-depot-marker--compact' : ''}" title="${name}">
        <div class="wp-depot-icon">${svg}</div>
        ${showLabel ? `<div class="wp-depot-label">${name}</div>` : ''}
      </div>
    `,
    iconSize: [0, 0],
    iconAnchor: [16, 16],
  })
}

// 3. Clustered Vehicles Icon (e.g. 9 Vehicles, or compact number when zoomed out)
function createClusterIcon({
  count,
  hasSelected,
  showLabel = true,
}: {
  count: number
  hasSelected: boolean
  showLabel?: boolean
}) {
  const svg = renderToStaticMarkup(<Truck size={14} strokeWidth={2} />)

  if (!showLabel) {
    return L.divIcon({
      className: 'wp-map-marker-container',
      html: `
        <div class="wp-cluster-marker wp-cluster-marker--compact ${hasSelected ? 'wp-cluster-marker--selected' : ''}" title="${count} vehicles">
          <span class="wp-cluster-icon">${svg}</span>
          <span class="wp-cluster-label">${count}</span>
        </div>
      `,
      iconSize: [0, 0],
      iconAnchor: [20, 14],
    })
  }

  return L.divIcon({
    className: 'wp-map-marker-container',
    html: `
      <div class="wp-cluster-marker ${hasSelected ? 'wp-cluster-marker--selected' : ''}">
        <span class="wp-cluster-icon">${svg}</span>
        <span class="wp-cluster-label">${count} vehicles</span>
      </div>
    `,
    iconSize: [0, 0],
    iconAnchor: [45, 14],
  })
}

// 4. Route Stop Marker (1, 2, 3 with checkmarks; 4, 5, 6 open circles + optional outletId badge)
function createStopIcon(seq: number, isCompleted: boolean, outletId?: string) {
  if (isCompleted) {
    return L.divIcon({
      className: 'wp-map-marker-container',
      html: `
        <div class="wp-stop-marker-wrapper" title="Stop ${seq}${outletId ? ` · ${outletId}` : ''}">
          <div class="wp-stop-marker wp-stop-marker--completed">
            <span>${seq}</span>
            <span class="wp-stop-check">
              <svg width="7" height="7" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
            </span>
          </div>
          ${outletId ? `<span class="wp-stop-outlet-id">${outletId}</span>` : ''}
        </div>
      `,
      iconSize: [0, 0],
      iconAnchor: [12, 12],
    })
  }

  return L.divIcon({
    className: 'wp-map-marker-container',
    html: `
      <div class="wp-stop-marker-wrapper" title="Stop ${seq}${outletId ? ` · ${outletId}` : ''}">
        <div class="wp-stop-marker wp-stop-marker--pending">
          <span>${seq}</span>
        </div>
        ${outletId ? `<span class="wp-stop-outlet-id">${outletId}</span>` : ''}
      </div>
    `,
    iconSize: [0, 0],
    iconAnchor: [12, 12],
  })
}

// 5. Destination Outlet Icon (Store icon + attached label with Outlet ID)
function createOutletIcon(outletId: string, district?: string) {
  const svg = renderToStaticMarkup(<Store size={15} strokeWidth={2.2} />)
  return L.divIcon({
    className: 'wp-map-marker-container',
    html: `
      <div class="wp-outlet-marker wp-outlet-marker--destination" title="Destination: ${outletId}${district ? ` (${district})` : ''}">
        <div class="wp-outlet-icon">${svg}</div>
        <div class="wp-outlet-label">
          <div class="wp-outlet-header-row">
            <span class="wp-outlet-tag">Destination</span>
          </div>
          <span class="wp-outlet-name">${outletId}</span>
        </div>
      </div>
    `,
    iconSize: [0, 0],
    iconAnchor: [16, 16],
  })
}

// 6. Standard Outlet Icon (Shown all the time across the map: icon only, details on hover)
function createStandardOutletIcon(outletId: string) {
  const svg = renderToStaticMarkup(<Store size={14} strokeWidth={2.2} />)
  return L.divIcon({
    className: 'wp-map-marker-container',
    html: `
      <div class="wp-outlet-marker wp-outlet-marker--icon-only" title="${outletId}">
        <span class="wp-outlet-icon-circle">${svg}</span>
      </div>
    `,
    iconSize: [0, 0],
    iconAnchor: [13, 13],
  })
}

// 7. Clustered Outlets Icon (Icon + count number only)
function createOutletClusterIcon(count: number) {
  const svg = renderToStaticMarkup(<Store size={13} strokeWidth={2.2} />)
  return L.divIcon({
    className: 'wp-map-marker-container',
    html: `
      <div class="wp-outlet-cluster-marker" title="${count} outlets">
        <span class="wp-outlet-cluster-icon">${svg}</span>
        <span class="wp-outlet-cluster-count">${count}</span>
      </div>
    `,
    iconSize: [0, 0],
    iconAnchor: [18, 12],
  })
}

function MapViewport({
  overviewPoints,
  selectedVehicle,
  showRouteStops = false,
}: {
  overviewPoints: MapPosition[]
  selectedVehicle: VehicleMapItem | null
  showRouteStops?: boolean
}) {
  const map = useMap()
  const initialMounted = useRef(false)
  const prevVehicleId = useRef<string | null>(null)
  const prevShowRoute = useRef<boolean>(false)

  useEffect(() => {
    // 1. Initial mount: center overview of the fleet
    if (!initialMounted.current) {
      initialMounted.current = true
      if (overviewPoints.length > 0) {
        map.fitBounds(L.latLngBounds(overviewPoints), { padding: [40, 40], maxZoom: 12, animate: false })
      }
      return
    }

    // 2. If a vehicle is selected
    if (selectedVehicle) {
      const isNewVehicle = selectedVehicle.id !== prevVehicleId.current
      const routeToggled = showRouteStops !== prevShowRoute.current
      prevVehicleId.current = selectedVehicle.id
      prevShowRoute.current = !!showRouteStops

      if (showRouteStops && selectedVehicle.routeCoordinates && selectedVehicle.routeCoordinates.length > 1) {
        // Zoom to the full route, offset to the right since the route info card occupies the left ~336px
        map.fitBounds(L.latLngBounds(selectedVehicle.routeCoordinates), {
          paddingTopLeft: [390, 50],
          paddingBottomRight: [50, 50],
          maxZoom: 15,
          animate: true,
        })
      } else if (isNewVehicle || routeToggled) {
        // Zoom smoothly to the vehicle (not too much: zoom level 14)
        map.flyTo(selectedVehicle.position, 14, { duration: 0.5 })
      }
    } else {
      // Vehicle deselected
      if (prevVehicleId.current !== null) {
        prevVehicleId.current = null
        prevShowRoute.current = false
      }
    }
  }, [map, overviewPoints, selectedVehicle, showRouteStops])

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

function MapBackgroundClickHandler({ onClear }: { onClear?: () => void }) {
  useMapEvents({
    click: (e) => {
      const target = e.originalEvent?.target as HTMLElement | null
      if (
        target &&
        (target.closest('.leaflet-marker-icon') ||
          target.closest('.leaflet-popup') ||
          target.closest('.leaflet-tooltip') ||
          target.closest('.leaflet-control') ||
          target.closest('.wp-cluster-popover') ||
          target.closest('.wp-outlet-popover') ||
          target.closest('.wp-outlet-marker') ||
          target.closest('.wp-outlet-cluster-marker') ||
          target.closest('.route-timeline-card'))
      ) {
        return
      }
      onClear?.()
    },
  })
  return null
}

function MapDragScrollLock() {
  const map = useMap()

  useEffect(() => {
    let isDragging = false

    const preventScroll = (e: TouchEvent | WheelEvent) => {
      if (isDragging) {
        e.preventDefault()
      }
    }

    const onDragStart = () => {
      isDragging = true
      document.body.style.userSelect = 'none'
      window.addEventListener('wheel', preventScroll, { passive: false })
      window.addEventListener('touchmove', preventScroll, { passive: false })
    }

    const onDragEnd = () => {
      isDragging = false
      document.body.style.userSelect = ''
      window.removeEventListener('wheel', preventScroll)
      window.removeEventListener('touchmove', preventScroll)
    }

    map.on('dragstart', onDragStart)
    map.on('dragend', onDragEnd)

    return () => {
      map.off('dragstart', onDragStart)
      map.off('dragend', onDragEnd)
      document.body.style.userSelect = ''
      window.removeEventListener('wheel', preventScroll)
      window.removeEventListener('touchmove', preventScroll)
    }
  }, [map])

  return null
}

interface ClusterMarkerItemProps {
  cluster: VehicleCluster
  selectedVehicleId?: string | null
  onSelectVehicle?: (id: string) => void
  showClusterLabel: boolean
  clusterPosition: MapPosition
  allAtSameCoord: boolean
  map: L.Map
}

function ClusterMarkerItem({
  cluster,
  selectedVehicleId,
  onSelectVehicle,
  showClusterLabel,
  clusterPosition,
  allAtSameCoord,
  map,
}: ClusterMarkerItemProps) {
  const [isOpen, setIsOpen] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleMouseEnter = () => {
    if (timerRef.current) clearTimeout(timerRef.current)
    setIsOpen(true)
  }

  const handleMouseLeave = () => {
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => {
      setIsOpen(false)
    }, 280)
  }

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [])

  const hasSelected = cluster.vehicles.some((v) => v.id === selectedVehicleId)

  return (
    <Marker
      position={clusterPosition}
      zIndexOffset={hasSelected ? 650 : 500}
      icon={createClusterIcon({
        count: cluster.vehicles.length,
        hasSelected,
        showLabel: showClusterLabel,
      })}
      eventHandlers={{
        mouseover: handleMouseEnter,
        mouseout: handleMouseLeave,
        click: () => {
          if (allAtSameCoord) {
            setIsOpen((prev) => !prev)
          } else {
            map.flyTo(cluster.center, Math.min(map.getZoom() + 2, 17), { duration: 0.35 })
          }
        },
      }}
    >
      {isOpen && (
        <Tooltip
          permanent
          interactive
          direction="top"
          opacity={1}
          offset={[0, -2]}
          className="wp-cluster-tooltip"
        >
          <div
            className="wp-cluster-popover"
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
          >
            <div className="wp-cluster-popover-header">
              <div className="wp-cluster-popover-title">
                <Truck size={14} />
                <span>{cluster.vehicles.length} Vehicles</span>
              </div>
              <span className="wp-cluster-popover-subtitle">
                {allAtSameCoord ? 'Click to select' : 'Click marker to zoom in'}
              </span>
            </div>
            <div className="wp-cluster-popover-list">
              {cluster.vehicles.map((v) => {
                const Icon = v.type === 'van' ? Van : Truck
                const isCurrent = v.id === selectedVehicleId
                const statusClass = `wp-status-${(v.status || 'available').toLowerCase().replace(/\s+/g, '-')}`

                return (
                  <button
                    key={v.id}
                    type="button"
                    className={`wp-cluster-popover-item ${isCurrent ? 'wp-cluster-popover-item--selected' : ''}`}
                    onClick={(e) => {
                      e.stopPropagation()
                      onSelectVehicle?.(v.id)
                      setIsOpen(false)
                    }}
                  >
                    <div className="wp-cluster-item-left">
                      <span className="wp-cluster-item-icon">
                        <Icon size={14} />
                      </span>
                      <div className="wp-cluster-item-text">
                        <span className="wp-cluster-item-id">{v.id}</span>
                        {v.nextStop && <span className="wp-cluster-item-sub">{v.nextStop}</span>}
                      </div>
                    </div>
                    <span className={`wp-cluster-item-badge ${statusClass}`}>{v.status || 'Available'}</span>
                  </button>
                )
              })}
            </div>
          </div>
        </Tooltip>
      )}
    </Marker>
  )
}

interface OutletClusterMarkerItemProps {
  cluster: OutletCluster
  map: L.Map
}

function OutletClusterMarkerItem({ cluster, map }: OutletClusterMarkerItemProps) {
  return (
    <Marker
      position={cluster.center}
      icon={createOutletClusterIcon(cluster.outlets.length)}
      zIndexOffset={150}
      eventHandlers={{
        click: (e) => {
          e.originalEvent?.stopPropagation()
          map.flyTo(cluster.center, Math.min(map.getZoom() + 2, 17), { duration: 0.35 })
        },
      }}
    >
      <Tooltip direction="top" offset={[0, -12]} className="wp-vehicle-tooltip">
        <span>{cluster.outlets.length} Outlets · Click to zoom in</span>
      </Tooltip>
    </Marker>
  )
}

interface VehicleMapLayersProps {
  allVehicles: VehicleMapItem[]
  depots: DepotMapItem[]
  outlets?: OutletMapItem[]
  selectedVehicle: VehicleMapItem | null
  selectedVehicleId?: string | null
  onSelectVehicle?: (vehicleId: string) => void
  showRouteStops?: boolean
  labelZoomThreshold?: number
  clusterPixelRadius?: number
}

/**
 * Ensures vehicle or vehicle cluster markers that are too close to a warehouse (depot)
 * marker are placed side by side horizontally instead of overlapping.
 */
function getSideBySidePosition(
  position: MapPosition,
  depots: DepotMapItem[],
  map: L.Map,
  zoom: number,
  isCluster = false,
): MapPosition {
  const itemPt = map.project(L.latLng(position[0], position[1]), zoom)

  for (const depot of depots) {
    const depotPt = map.project(L.latLng(depot.position[0], depot.position[1]), zoom)
    const dx = itemPt.x - depotPt.x
    const dy = itemPt.y - depotPt.y
    const dist = Math.hypot(dx, dy)

    // Markers are too close if their screen pixel distance is within the threshold
    const proximityThreshold = isCluster ? 54 : 46
    if (dist < proximityThreshold) {
      // Place side by side: depot on left, vehicle on right (or flip if vehicle was on the left)
      const sideOffset = isCluster ? 52 : 44
      const sign = dx < -6 ? -1 : 1
      const sideX = depotPt.x + sign * sideOffset
      // Keep vertically aligned with the warehouse marker center
      const sideY = depotPt.y

      const adjusted = map.unproject(L.point(sideX, sideY), zoom)
      return [adjusted.lat, adjusted.lng]
    }
  }

  return position
}

function VehicleMapLayers({
  allVehicles,
  depots,
  outlets = ALL_OUTLETS,
  selectedVehicle,
  selectedVehicleId,
  onSelectVehicle,
  showRouteStops = false,
  labelZoomThreshold = 13,
  clusterPixelRadius = 55,
}: VehicleMapLayersProps) {
  const map = useMap()
  const [currentZoom, setCurrentZoom] = useState(() => map.getZoom())

  useEffect(() => {
    const handleZoom = () => {
      setCurrentZoom(map.getZoom())
    }
    map.on('zoomend', handleZoom)
    map.on('zoom', handleZoom)
    return () => {
      map.off('zoomend', handleZoom)
      map.off('zoom', handleZoom)
    }
  }, [map])

  // Vehicle ID label is shown when zoomed in (>= labelZoomThreshold, e.g. 13)
  const showVehicleLabel = currentZoom >= labelZoomThreshold
  // Cluster label is shown as "N vehicles" when zoom >= 11, otherwise "N"
  const showClusterLabel = currentZoom >= 11
  // Depot label shown when zoom >= 12
  const showDepotLabel = currentZoom >= 12

  // When viewing a vehicle's route (showRouteStops is true), only display that vehicle; otherwise display all vehicles
  const displayedVehicles = useMemo(() => {
    if (showRouteStops && selectedVehicle) {
      return [selectedVehicle]
    }
    return allVehicles
  }, [showRouteStops, selectedVehicle, allVehicles])

  // Dynamically cluster vehicles based on screen pixel distance at the current zoom level
  const clusters = useMemo(
    () => clusterVehiclesByZoom(displayedVehicles, map, currentZoom, clusterPixelRadius),
    [displayedVehicles, map, currentZoom, clusterPixelRadius],
  )

  // Selected vehicle destination outlet (only displayed when a vehicle is selected)
  const destination = useMemo(() => {
    if (!selectedVehicle) {
      return null
    }
    const stops = selectedVehicle.routeStops
    if (stops && stops.length > 0) {
      const destStop = stops[stops.length - 1]
      return {
        position: destStop.position,
        outletId: destStop.outletId,
        district: destStop.district,
        locationName: destStop.locationName,
        arrival: destStop.arrival,
      }
    }
    if (selectedVehicle.destinationOutletId && selectedVehicle.routeCoordinates && selectedVehicle.routeCoordinates.length > 1) {
      const coords = selectedVehicle.routeCoordinates
      return {
        position: coords[coords.length - 1],
        outletId: selectedVehicle.destinationOutletId,
        district: selectedVehicle.destinationDistrict,
      }
    }
    return null
  }, [selectedVehicle])

  // Set of outlet IDs that are rendered as route stops or destination for the selected vehicle
  const activeRouteOutletIds = useMemo(() => {
    const ids = new Set<string>()
    if (showRouteStops && selectedVehicle?.routeStops) {
      for (const stop of selectedVehicle.routeStops) {
        if (stop.outletId) ids.add(stop.outletId)
      }
    }
    if (destination?.outletId) {
      ids.add(destination.outletId)
    }
    return ids
  }, [showRouteStops, selectedVehicle, destination])

  // Filter out outlets that are currently rendered as active destination or route stops
  const clusterableOutlets = useMemo(
    () => outlets.filter((o) => !activeRouteOutletIds.has(o.id)),
    [outlets, activeRouteOutletIds],
  )

  // Dynamically cluster outlets based on screen pixel distance at the current zoom level
  const outletClusters = useMemo(
    () => clusterOutletsByZoom(clusterableOutlets, map, currentZoom, 48),
    [clusterableOutlets, map, currentZoom],
  )

  return (
    <>
      {/* Depots: render with high zIndexOffset so warehouse building is never covered */}
      {depots.map((depot) => (
        <Marker
          key={`depot-${depot.name}`}
          position={depot.position}
          icon={createDepotIcon(depot.name, showDepotLabel)}
          zIndexOffset={1000}
          title={depot.name}
          alt={`${depot.name} marker`}
        />
      ))}

      {/* Outlets & Outlet Clusters: grouped depending on closeness & zoom level */}
      {outletClusters.map((cluster) => {
        if (cluster.outlets.length === 1) {
          const outlet = cluster.outlets[0]
          return (
            <Marker
              key={`outlet-${outlet.id}`}
              position={outlet.position}
              icon={createStandardOutletIcon(outlet.id)}
              zIndexOffset={100}
            >
              <Tooltip
                direction="top"
                offset={[0, -14]}
                className="wp-vehicle-tooltip"
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <span style={{ fontWeight: 700, fontSize: '12px', color: '#ffffff' }}>
                    {outlet.id} · {outlet.locationName || outlet.district}
                  </span>
                  <span style={{ fontSize: '10px', color: '#94a3b8' }}>
                    {outlet.district} · {outlet.brand} {outlet.depot ? `(${outlet.depot} Depot)` : ''}
                  </span>
                  <span style={{ fontSize: '10px', color: '#86efac', fontWeight: 600 }}>
                    Window: {outlet.defaultWindow}
                  </span>
                </div>
              </Tooltip>
            </Marker>
          )
        }

        return (
          <OutletClusterMarkerItem
            key={cluster.id}
            cluster={cluster}
            map={map}
          />
        )
      })}

      {/* Vehicle Clusters and Single Vehicles */}
      {clusters.map((cluster) => {
        // If cluster has 1 vehicle: render single vehicle marker
        if (cluster.vehicles.length === 1) {
          const v = cluster.vehicles[0]
          const isSelected = v.id === selectedVehicleId
          // If vehicle is too close to a warehouse, position side by side horizontally
          const vehiclePos = getSideBySidePosition(v.position, depots, map, currentZoom, false)

          return (
            <Marker
              key={v.id}
              position={vehiclePos}
              zIndexOffset={isSelected ? 700 : 600}
              icon={createVehicleIcon({
                vehicleId: v.id,
                type: v.type,
                isSelected,
                showLabel: showVehicleLabel,
              })}
              eventHandlers={{
                click: () => onSelectVehicle?.(v.id),
              }}
            >
              {!isSelected && (
                <Tooltip
                  direction="top"
                  offset={showVehicleLabel ? [0, -18] : [0, -16]}
                  className="wp-vehicle-tooltip"
                >
                  <span>
                    {v.id} · {v.status || 'Available'}
                  </span>
                </Tooltip>
              )}
            </Marker>
          )
        }

        // Multiple vehicles clustered: if near depot, position side by side
        const clusterPosition = getSideBySidePosition(cluster.center, depots, map, currentZoom, true)
        const allAtSameCoord = cluster.vehicles.every(
          (v) =>
            Math.abs(v.position[0] - cluster.vehicles[0].position[0]) < 0.0001 &&
            Math.abs(v.position[1] - cluster.vehicles[0].position[1]) < 0.0001,
        )

        return (
          <ClusterMarkerItem
            key={cluster.id}
            cluster={cluster}
            selectedVehicleId={selectedVehicleId}
            onSelectVehicle={onSelectVehicle}
            showClusterLabel={showClusterLabel}
            clusterPosition={clusterPosition}
            allAtSameCoord={allAtSameCoord}
            map={map}
          />
        )
      })}

      {/* Route line for the selected vehicle */}
      {selectedVehicle && selectedVehicle.routeCoordinates && selectedVehicle.routeCoordinates.length > 1 && (
        <Polyline
          positions={selectedVehicle.routeCoordinates}
          pathOptions={{ className: 'delivery-route-path', color: '#4d7c0f', weight: 4 }}
        />
      )}

      {/* Route stops (intermediate stops) when viewing route */}
      {showRouteStops &&
        selectedVehicle?.routeStops &&
        selectedVehicle.routeStops.length > 1 &&
        selectedVehicle.routeStops.slice(0, -1).map((stop) => (
          <Marker
            key={`route-stop-${stop.sequence}-${stop.outletId}`}
            position={stop.position}
            icon={createStopIcon(stop.sequence, stop.isCompleted, stop.outletId)}
            zIndexOffset={300}
          >
            <Tooltip direction="top" offset={[0, -14]} className="wp-vehicle-tooltip">
              <span>
                Stop {stop.sequence} · {stop.outletId} ({stop.district}) {stop.isCompleted ? '(Completed)' : '(Pending)'}
              </span>
            </Tooltip>
          </Marker>
        ))}

      {/* Fallback route stops when routeStops is not provided */}
      {showRouteStops &&
        (!selectedVehicle?.routeStops || selectedVehicle.routeStops.length === 0) &&
        selectedVehicle?.routeCoordinates &&
        selectedVehicle.routeCoordinates.slice(1, -1).map((pos, idx) => {
          const seq = idx + 1
          const isCompleted = seq <= 2
          return (
            <Marker
              key={`route-stop-${seq}`}
              position={pos}
              icon={createStopIcon(seq, isCompleted, selectedVehicle.outletId)}
              zIndexOffset={300}
            >
              <Tooltip direction="top" offset={[0, -14]} className="wp-vehicle-tooltip">
                <span>Stop {seq} {isCompleted ? '(Completed)' : '(Pending)'}</span>
              </Tooltip>
            </Marker>
          )
        })}

      {/* Destination Outlet Marker (shown only when a vehicle is selected) */}
      {destination && (
        <Marker
          key={`destination-${selectedVehicle?.id}-${destination.outletId}`}
          position={destination.position}
          icon={createOutletIcon(destination.outletId, destination.district)}
          zIndexOffset={200}
        >
          <Tooltip direction="top" offset={[0, -18]} className="wp-vehicle-tooltip">
            <span>
              Destination: {destination.outletId} ({destination.district})
              {destination.arrival ? ` · Expected ${destination.arrival}` : ''}
            </span>
          </Tooltip>
        </Marker>
      )}
    </>
  )
}

export function DeliveryMap(props: DeliveryMapProps) {
  const {
    vehicles: propVehicles,
    depots: propDepots,
    outlets: propOutlets,
    selectedVehicleId,
    onSelectVehicle,
    onClearSelection,
    showRouteStops = false,
    labelZoomThreshold = 13,
    clusterPixelRadius = 55,
    scrollWheelZoom = true,
    depotPosition,
    vehiclePosition,
    routeCoordinates,
    vehicleId,
    vehicleStatus = 'En route',
  } = props

  const tiles = useRef<L.TileLayer>(null)
  const [tilesFailed, setTilesFailed] = useState(false)

  const outlets: OutletMapItem[] = useMemo(() => {
    if (propOutlets && propOutlets.length > 0) return propOutlets
    return ALL_OUTLETS
  }, [propOutlets])

  // Construct vehicles list from props or legacy single-vehicle props
  const allVehicles: VehicleMapItem[] = useMemo(() => {
    if (propVehicles && propVehicles.length > 0) {
      return propVehicles
    }
    if (vehiclePosition && vehicleId) {
      return [
        {
          id: vehicleId,
          type: 'van',
          status: vehicleStatus,
          position: vehiclePosition,
          routeCoordinates,
        },
      ]
    }
    return []
  }, [propVehicles, vehiclePosition, vehicleId, vehicleStatus, routeCoordinates])

  // Depots list
  const depots: DepotMapItem[] = useMemo(() => {
    if (propDepots && propDepots.length > 0) return propDepots
    if (depotPosition) return [{ name: 'Peliyagoda Depot', position: depotPosition }]
    return [{ name: 'Peliyagoda Depot', position: PELIYAGODA_DEPOT }]
  }, [propDepots, depotPosition])

  // Find selected vehicle object
  const selectedVehicle = useMemo(
    () => allVehicles.find((v) => v.id === selectedVehicleId) || null,
    [allVehicles, selectedVehicleId],
  )

  // Dynamically resolve road coordinates for the selected vehicle's trip in a single pass
  const [activeRoadRoute, setActiveRoadRoute] = useState<{
    vehicleId: string
    coordinates: MapPosition[]
  } | null>(null)

  useEffect(() => {
    if (!selectedVehicle) return

    const stops = selectedVehicle.routeStops
    const depot = depots.find((d) => d.name === selectedVehicle.depotName) || depots[0]
    const depotPos = depot ? depot.position : PELIYAGODA_DEPOT

    let waypoints: MapPosition[] = []
    if (stops && stops.length > 0) {
      // Trip with start (depot), stop 1, stop 2, ..., end (destination stop)
      waypoints = [depotPos, ...stops.map((s) => s.position)]
    } else if (selectedVehicle.routeCoordinates && selectedVehicle.routeCoordinates.length > 1) {
      waypoints = selectedVehicle.routeCoordinates
    }

    if (waypoints.length < 2) return

    let cancelled = false
    fetchRoadRoute(waypoints, { profile: selectedVehicle.type }).then((res) => {
      if (!cancelled && res.geometry && res.geometry.length > 1) {
        setActiveRoadRoute({
          vehicleId: selectedVehicle.id,
          coordinates: res.geometry,
        })
      }
    })

    return () => {
      cancelled = true
    }
  }, [selectedVehicle, depots])

  // Vehicle with resolved real-road outline coordinates
  const enhancedSelectedVehicle = useMemo(() => {
    if (!selectedVehicle) return null
    if (activeRoadRoute && activeRoadRoute.vehicleId === selectedVehicle.id) {
      return {
        ...selectedVehicle,
        routeCoordinates: activeRoadRoute.coordinates,
      }
    }
    return selectedVehicle
  }, [selectedVehicle, activeRoadRoute])

  // Compute points for auto-fitting bounds
  const viewportPoints = useMemo(() => {
    const pts: MapPosition[] = []
    for (const d of depots) pts.push(d.position)
    for (const v of allVehicles) pts.push(v.position)
    if (enhancedSelectedVehicle?.routeCoordinates) {
      for (const pt of enhancedSelectedVehicle.routeCoordinates) pts.push(pt)
    }
    return pts
  }, [depots, allVehicles, enhancedSelectedVehicle])

  const initialCenter: MapPosition = selectedVehicle?.position || depots[0]?.position || PELIYAGODA_DEPOT

  return (
    <div className="delivery-map" role="region" aria-label="Fleet delivery map">
      <MapContainer
        center={initialCenter}
        zoom={13}
        zoomControl={false}
        scrollWheelZoom={scrollWheelZoom}
        className="delivery-map-canvas"
      >
        <ZoomControl position="bottomright" />
        <TileLayer
          ref={tiles}
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          eventHandlers={{
            tileerror: () => {
              setTilesFailed(true)
            },
          }}
        />

        <VehicleMapLayers
          allVehicles={allVehicles}
          depots={depots}
          outlets={outlets}
          selectedVehicle={enhancedSelectedVehicle}
          selectedVehicleId={selectedVehicleId}
          onSelectVehicle={onSelectVehicle}
          showRouteStops={showRouteStops}
          labelZoomThreshold={labelZoomThreshold}
          clusterPixelRadius={clusterPixelRadius}
        />

        <MapViewport
          overviewPoints={viewportPoints}
          selectedVehicle={enhancedSelectedVehicle}
          showRouteStops={showRouteStops}
        />

        <MapBackgroundClickHandler
          onClear={() => {
            if (onClearSelection) {
              onClearSelection()
            } else if (onSelectVehicle && selectedVehicleId) {
              onSelectVehicle('')
            }
          }}
        />

        <MapDragScrollLock />
      </MapContainer>

      <span className="delivery-map-demo type-text-xs-medium">
        {showRouteStops && selectedVehicle
          ? `Route · ${selectedVehicle.id}`
          : selectedVehicle
            ? `Selected · ${selectedVehicle.id}`
            : `Fleet overview · ${allVehicles.length} vehicles`}
      </span>

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
