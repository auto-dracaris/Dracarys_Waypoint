import { apiRequest } from './api-client'
import { API_ENDPOINTS } from './api-endpoints'

export type MapPosition = [number, number]

export interface LegRoute {
  distanceMeters: number
  durationSeconds: number
  geometry?: MapPosition[]
}

export interface RoadRoute {
  profile: string
  geometry: MapPosition[]
  distanceMeters: number
  durationSeconds: number
  legs: LegRoute[]
}

interface ApiLegResponse {
  distanceMeters: number
  durationSeconds: number
  geometry?: [number, number][]
}

interface ApiRouteResponse {
  profile: string
  geometry: [number, number][]
  distanceMeters: number
  durationSeconds: number
  legs?: ApiLegResponse[]
}

const routeCache = new Map<string, RoadRoute>()

function cacheKey(waypoints: MapPosition[], profile?: string): string {
  const pts = waypoints.map(([lat, lng]) => `${lat.toFixed(5)},${lng.toFixed(5)}`).join(';')
  return `${profile ?? 'van'}:${pts}`
}

/**
 * Resolves real road coordinates from self-hosted OSRM for a trip with waypoints
 * [start, stop 1, stop 2, ..., end] in a single pass.
 *
 * If OSRM is unreachable or fails, falls back gracefully to straight lines
 * connecting the waypoints so maps never break.
 */
export async function fetchRoadRoute(
  waypoints: MapPosition[],
  options?: { profile?: 'van' | 'truck'; token?: string | null },
): Promise<RoadRoute> {
  if (waypoints.length < 2) {
    return {
      profile: options?.profile ?? 'van',
      geometry: waypoints,
      distanceMeters: 0,
      durationSeconds: 0,
      legs: [],
    }
  }

  const key = cacheKey(waypoints, options?.profile)
  const cached = routeCache.get(key)
  if (cached) {
    return cached
  }

  try {
    const data = await apiRequest<ApiRouteResponse>(API_ENDPOINTS.routing.route, {
      method: 'POST',
      body: {
        waypoints: waypoints.map(([lat, lng]) => ({ lat, lng })),
        profile: options?.profile ?? 'van',
      },
      token: options?.token,
    })

    // GeoJSON coordinates are [longitude, latitude]. Convert to Leaflet [lat, lng].
    const geometry: MapPosition[] = data.geometry.map(([lng, lat]) => [lat, lng])

    const legs: LegRoute[] = (data.legs ?? []).map((leg) => ({
      distanceMeters: leg.distanceMeters,
      durationSeconds: leg.durationSeconds,
      geometry: leg.geometry ? leg.geometry.map(([lng, lat]) => [lat, lng]) : undefined,
    }))

    const result: RoadRoute = {
      profile: data.profile,
      geometry,
      distanceMeters: data.distanceMeters,
      durationSeconds: data.durationSeconds,
      legs,
    }

    routeCache.set(key, result)
    return result
  } catch {
    // Graceful fallback to straight line waypoints on network or server error
    return {
      profile: options?.profile ?? 'van',
      geometry: waypoints,
      distanceMeters: 0,
      durationSeconds: 0,
      legs: [],
    }
  }
}

/**
 * Resolves each leg (e.g. start -> stop 1, stop 1 -> stop 2, stop 2 -> end) separately.
 * First attempts to extract leg geometries from a single-pass API call. If leg geometries
 * are not populated, queries each pair in parallel.
 */
export async function fetchLegRoutes(
  waypoints: MapPosition[],
  options?: { profile?: 'van' | 'truck'; token?: string | null },
): Promise<MapPosition[][]> {
  if (waypoints.length < 2) return []

  // Attempt single-pass resolution first
  const fullRoute = await fetchRoadRoute(waypoints, options)
  const hasAllLegGeometries =
    fullRoute.legs.length === waypoints.length - 1 &&
    fullRoute.legs.every((l) => l.geometry && l.geometry.length > 0)

  if (hasAllLegGeometries) {
    return fullRoute.legs.map((l) => l.geometry as MapPosition[])
  }

  // If leg-level geometries weren't provided in single pass, resolve each leg pair concurrently
  const legPromises = []
  for (let i = 0; i < waypoints.length - 1; i++) {
    const pair = [waypoints[i], waypoints[i + 1]]
    legPromises.push(
      fetchRoadRoute(pair, options).then((res) => res.geometry),
    )
  }

  return Promise.all(legPromises)
}
