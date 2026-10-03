export type MapPosition = [number, number]
export interface DeliveryMapLocations {
  depotPosition: MapPosition
  vehiclePosition: MapPosition
  routeCoordinates: MapPosition[]
}

// Illustrative coordinates around Colombo, not verified depot/outlet GPS data.
const demoDepot: MapPosition = [6.9607, 79.8915]
const demoPaths: MapPosition[][] = [
  [demoDepot, [6.9538, 79.8812], [6.9431, 79.8741], [6.9282, 79.8639], [6.9102, 79.8581], [6.8866, 79.8618]],
  [demoDepot, [6.9554, 79.8991], [6.9452, 79.9015], [6.9302, 79.8894], [6.9136, 79.8811], [6.8951, 79.8773]],
  [demoDepot, [6.9543, 79.8864], [6.9463, 79.8835], [6.9344, 79.8767], [6.9201, 79.8736], [6.9041, 79.8672]],
]

export function demoMapLocations(index: number): DeliveryMapLocations {
  const path = demoPaths[index % demoPaths.length]
  return {
    depotPosition: [...demoDepot],
    vehiclePosition: [...path[1 + index % (path.length - 2)]],
    routeCoordinates: path.map(position => [...position]),
  }
}

export function hasValidMapLocations(locations: DeliveryMapLocations) {
  const validPosition = ([latitude, longitude]: MapPosition) => Number.isFinite(latitude) && Number.isFinite(longitude) && Math.abs(latitude) <= 90 && Math.abs(longitude) <= 180
  return validPosition(locations.depotPosition) && validPosition(locations.vehiclePosition) && locations.routeCoordinates.every(validPosition)
}
