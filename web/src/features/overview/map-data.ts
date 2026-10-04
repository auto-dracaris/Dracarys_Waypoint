export type MapPosition = [number, number]

export interface RouteStopItem {
  sequence: number
  outletId: string
  position: MapPosition
  district: string
  locationName?: string
  arrival: string
  window: string
  isCompleted: boolean
  orderId?: string
  load?: string
}

export interface DeliveryMapLocations {
  depotPosition: MapPosition
  vehiclePosition: MapPosition
  routeCoordinates: MapPosition[]
}

export interface VehicleRouteData {
  tripName: string
  depotName: string
  depotAddress: string
  recorded: number
  stopsCount: number
  nextStop: string // Outlet ID
  outletId: string // Outlet ID
  destinationOutletId: string // Destination Outlet ID
  destinationDistrict?: string
  destinationPosition: MapPosition
  window: string
  arrival: string
  updated: string
  map: DeliveryMapLocations
  routeStops: RouteStopItem[]
}

// Depot coordinates matching actual warehouse locations in Sri Lanka
export const PELIYAGODA_DEPOT: MapPosition = [6.9645, 79.888]
export const KANDY_DEPOT: MapPosition = [7.2955, 80.6356]

/**
 * Verified geographic coordinates for every outlet in the dataset (OUT001..OUT120)
 * sourced directly from the database and scattered around each district city centre.
 */
export interface OutletMapItem {
  id: string
  position: MapPosition
  district: string
  locationName: string
  defaultWindow: string
  brand: string
  depot: string
  dockType: string
  parkingConstraint: string
}

export const OUTLET_COORDINATES: Record<string, OutletMapItem> = {
  // Colombo District
  OUT001: { id: 'OUT001', position: [6.9334, 79.8501], district: 'Colombo', locationName: 'Colombo Fort', defaultWindow: '05:00–07:30', brand: 'Fresh', depot: 'Peliyagoda', dockType: 'street', parkingConstraint: 'van_only' },
  OUT002: { id: 'OUT002', position: [6.9117, 79.8494], district: 'Colombo', locationName: 'Kollupitiya', defaultWindow: '05:30–08:00', brand: 'Fresh', depot: 'Peliyagoda', dockType: 'street', parkingConstraint: 'van_only' },
  OUT003: { id: 'OUT003', position: [6.8965, 79.855], district: 'Colombo', locationName: 'Bambalapitiya', defaultWindow: '05:00–07:30', brand: 'Fresh', depot: 'Peliyagoda', dockType: 'street', parkingConstraint: 'van_only' },
  OUT004: { id: 'OUT004', position: [6.8745, 79.8635], district: 'Colombo', locationName: 'Wellawatte', defaultWindow: '05:30–08:00', brand: 'Fresh', depot: 'Peliyagoda', dockType: 'street', parkingConstraint: 'normal' },
  OUT005: { id: 'OUT005', position: [6.887, 79.865], district: 'Colombo', locationName: 'Havelock Town', defaultWindow: '04:00–07:45', brand: 'Fresh', depot: 'Peliyagoda', dockType: 'rear_dock', parkingConstraint: 'normal' },
  OUT006: { id: 'OUT006', position: [6.9048, 79.8698], district: 'Colombo', locationName: 'Cinnamon Gardens', defaultWindow: '03:00–08:00', brand: 'Fresh', depot: 'Peliyagoda', dockType: 'street', parkingConstraint: 'normal' },
  OUT007: { id: 'OUT007', position: [6.914, 79.879], district: 'Colombo', locationName: 'Borella', defaultWindow: '05:30–08:00', brand: 'Fresh', depot: 'Peliyagoda', dockType: 'street', parkingConstraint: 'normal' },
  OUT008: { id: 'OUT008', position: [6.9312, 79.8785], district: 'Colombo', locationName: 'Dematagoda', defaultWindow: '05:00–07:30', brand: 'Fresh', depot: 'Peliyagoda', dockType: 'rear_dock', parkingConstraint: 'normal' },
  OUT009: { id: 'OUT009', position: [6.927, 79.862], district: 'Colombo', locationName: 'Maradana', defaultWindow: '04:00–07:45', brand: 'Fresh', depot: 'Peliyagoda', dockType: 'rear_dock', parkingConstraint: 'normal' },
  OUT010: { id: 'OUT010', position: [6.937, 79.853], district: 'Colombo', locationName: 'Pettah', defaultWindow: '05:00–07:30', brand: 'Fresh', depot: 'Peliyagoda', dockType: 'rear_dock', parkingConstraint: 'normal' },
  OUT011: { id: 'OUT011', position: [6.9461, 79.8647], district: 'Colombo', locationName: 'Kotahena', defaultWindow: '03:00–08:00', brand: 'Fresh', depot: 'Peliyagoda', dockType: 'rear_dock', parkingConstraint: 'normal' },
  OUT012: { id: 'OUT012', position: [6.9221, 79.8524], district: 'Colombo', locationName: 'Slave Island', defaultWindow: '05:30–08:00', brand: 'Fresh', depot: 'Peliyagoda', dockType: 'rear_dock', parkingConstraint: 'normal' },
  OUT013: { id: 'OUT013', position: [6.9532, 79.8752], district: 'Colombo', locationName: 'Grandpass', defaultWindow: '05:00–07:30', brand: 'Fresh', depot: 'Peliyagoda', dockType: 'rear_dock', parkingConstraint: 'normal' },
  OUT014: { id: 'OUT014', position: [6.9712, 79.8721], district: 'Colombo', locationName: 'Mattakkuliya', defaultWindow: '05:30–08:00', brand: 'Fresh', depot: 'Peliyagoda', dockType: 'street', parkingConstraint: 'normal' },
  OUT015: { id: 'OUT015', position: [6.903, 79.897], district: 'Colombo', locationName: 'Rajagiriya', defaultWindow: '09:00–11:00', brand: 'Style', depot: 'Peliyagoda', dockType: 'mall_bay', parkingConstraint: 'mall_dock' },
  OUT016: { id: 'OUT016', position: [6.87, 79.8883], district: 'Colombo', locationName: 'Nugegoda', defaultWindow: '09:00–11:00', brand: 'Style', depot: 'Peliyagoda', dockType: 'mall_bay', parkingConstraint: 'mall_dock' },
  OUT017: { id: 'OUT017', position: [6.8473, 79.9265], district: 'Colombo', locationName: 'Maharagama', defaultWindow: '10:30–12:30', brand: 'Style', depot: 'Peliyagoda', dockType: 'mall_bay', parkingConstraint: 'mall_dock' },
  OUT018: { id: 'OUT018', position: [6.935, 79.98], district: 'Colombo', locationName: 'Kaduwela', defaultWindow: '10:30–12:30', brand: 'Style', depot: 'Peliyagoda', dockType: 'mall_bay', parkingConstraint: 'mall_dock' },
  OUT019: { id: 'OUT019', position: [6.8513, 79.866], district: 'Colombo', locationName: 'Dehiwala', defaultWindow: '09:00–17:00', brand: 'Style', depot: 'Peliyagoda', dockType: 'rear_dock', parkingConstraint: 'normal' },
  OUT020: { id: 'OUT020', position: [6.8331, 79.8674], district: 'Colombo', locationName: 'Mount Lavinia', defaultWindow: '09:00–17:00', brand: 'Style', depot: 'Peliyagoda', dockType: 'street', parkingConstraint: 'normal' },
  OUT021: { id: 'OUT021', position: [6.8185, 79.8782], district: 'Colombo', locationName: 'Ratmalana', defaultWindow: '10:30–12:30', brand: 'Tech', depot: 'Peliyagoda', dockType: 'mall_bay', parkingConstraint: 'mall_dock' },
  OUT022: { id: 'OUT022', position: [6.7731, 79.8816], district: 'Colombo', locationName: 'Moratuwa', defaultWindow: '10:00–12:00', brand: 'Tech', depot: 'Peliyagoda', dockType: 'mall_bay', parkingConstraint: 'mall_dock' },
  OUT023: { id: 'OUT023', position: [6.8988, 79.9192], district: 'Colombo', locationName: 'Battaramulla', defaultWindow: '09:00–17:00', brand: 'Tech', depot: 'Peliyagoda', dockType: 'street', parkingConstraint: 'normal' },
  OUT024: { id: 'OUT024', position: [6.8415, 80.0033], district: 'Colombo', locationName: 'Homagama', defaultWindow: '09:00–17:00', brand: 'Tech', depot: 'Peliyagoda', dockType: 'rear_dock', parkingConstraint: 'normal' },
  // Gampaha District
  OUT025: { id: 'OUT025', position: [6.9553, 79.922], district: 'Gampaha', locationName: 'Kelaniya', defaultWindow: '05:30–08:00', brand: 'Fresh', depot: 'Peliyagoda', dockType: 'rear_dock', parkingConstraint: 'normal' },
  OUT026: { id: 'OUT026', position: [6.9899, 79.8927], district: 'Gampaha', locationName: 'Wattala', defaultWindow: '03:00–08:00', brand: 'Fresh', depot: 'Peliyagoda', dockType: 'rear_dock', parkingConstraint: 'normal' },
  OUT027: { id: 'OUT027', position: [6.9778, 79.9272], district: 'Gampaha', locationName: 'Kiribathgoda', defaultWindow: '05:00–07:30', brand: 'Fresh', depot: 'Peliyagoda', dockType: 'street', parkingConstraint: 'normal' },
  OUT028: { id: 'OUT028', position: [7.0021, 79.9512], district: 'Gampaha', locationName: 'Kadawatha', defaultWindow: '03:00–08:00', brand: 'Fresh', depot: 'Peliyagoda', dockType: 'street', parkingConstraint: 'normal' },
  OUT029: { id: 'OUT029', position: [7.0142, 79.8985], district: 'Gampaha', locationName: 'Mahabage', defaultWindow: '05:30–08:00', brand: 'Fresh', depot: 'Peliyagoda', dockType: 'rear_dock', parkingConstraint: 'normal' },
  OUT030: { id: 'OUT030', position: [7.0266, 79.9213], district: 'Gampaha', locationName: 'Ragama', defaultWindow: '03:00–08:00', brand: 'Fresh', depot: 'Peliyagoda', dockType: 'rear_dock', parkingConstraint: 'normal' },
  OUT031: { id: 'OUT031', position: [7.0482, 79.8964], district: 'Gampaha', locationName: 'Kandana', defaultWindow: '03:00–08:00', brand: 'Fresh', depot: 'Peliyagoda', dockType: 'rear_dock', parkingConstraint: 'normal' },
  OUT032: { id: 'OUT032', position: [7.0744, 79.8919], district: 'Gampaha', locationName: 'Ja-Ela', defaultWindow: '04:00–07:45', brand: 'Fresh', depot: 'Peliyagoda', dockType: 'rear_dock', parkingConstraint: 'normal' },
  OUT033: { id: 'OUT033', position: [7.1265, 79.8782], district: 'Gampaha', locationName: 'Seeduwa', defaultWindow: '05:30–08:00', brand: 'Fresh', depot: 'Peliyagoda', dockType: 'rear_dock', parkingConstraint: 'normal' },
  OUT034: { id: 'OUT034', position: [7.1698, 79.8883], district: 'Gampaha', locationName: 'Katunayake', defaultWindow: '05:00–07:30', brand: 'Fresh', depot: 'Peliyagoda', dockType: 'rear_dock', parkingConstraint: 'normal' },
  OUT035: { id: 'OUT035', position: [7.2083, 79.8358], district: 'Gampaha', locationName: 'Negombo', defaultWindow: '10:30–12:30', brand: 'Style', depot: 'Peliyagoda', dockType: 'mall_bay', parkingConstraint: 'mall_dock' },
  OUT036: { id: 'OUT036', position: [7.0873, 80.0144], district: 'Gampaha', locationName: 'Gampaha City', defaultWindow: '10:30–12:30', brand: 'Style', depot: 'Peliyagoda', dockType: 'mall_bay', parkingConstraint: 'mall_dock' },
  OUT037: { id: 'OUT037', position: [7.1693, 79.9485], district: 'Gampaha', locationName: 'Minuwangoda', defaultWindow: '09:00–17:00', brand: 'Style', depot: 'Peliyagoda', dockType: 'street', parkingConstraint: 'normal' },
  OUT038: { id: 'OUT038', position: [7.1535, 80.0603], district: 'Gampaha', locationName: 'Veyangoda', defaultWindow: '09:00–17:00', brand: 'Tech', depot: 'Peliyagoda', dockType: 'street', parkingConstraint: 'normal' },
  OUT039: { id: 'OUT039', position: [7.2414, 80.1325], district: 'Gampaha', locationName: 'Mirigama', defaultWindow: '09:00–17:00', brand: 'Tech', depot: 'Peliyagoda', dockType: 'rear_dock', parkingConstraint: 'normal' },
  // Kalutara District
  OUT040: { id: 'OUT040', position: [6.7132, 79.9026], district: 'Kalutara', locationName: 'Panadura', defaultWindow: '03:00–08:00', brand: 'Fresh', depot: 'Peliyagoda', dockType: 'street', parkingConstraint: 'normal' },
  OUT041: { id: 'OUT041', position: [6.664, 79.9305], district: 'Kalutara', locationName: 'Wadduwa', defaultWindow: '05:00–07:30', brand: 'Fresh', depot: 'Peliyagoda', dockType: 'rear_dock', parkingConstraint: 'normal' },
  OUT042: { id: 'OUT042', position: [6.5982, 79.9584], district: 'Kalutara', locationName: 'Kalutara North', defaultWindow: '03:00–08:00', brand: 'Fresh', depot: 'Peliyagoda', dockType: 'rear_dock', parkingConstraint: 'normal' },
  OUT043: { id: 'OUT043', position: [6.5854, 79.9607], district: 'Kalutara', locationName: 'Kalutara South', defaultWindow: '05:00–07:30', brand: 'Fresh', depot: 'Peliyagoda', dockType: 'street', parkingConstraint: 'normal' },
  OUT044: { id: 'OUT044', position: [6.4754, 79.9856], district: 'Kalutara', locationName: 'Beruwala', defaultWindow: '03:00–08:00', brand: 'Fresh', depot: 'Peliyagoda', dockType: 'rear_dock', parkingConstraint: 'normal' },
  OUT045: { id: 'OUT045', position: [6.4526, 80.0055], district: 'Kalutara', locationName: 'Aluthgama', defaultWindow: '03:00–08:00', brand: 'Fresh', depot: 'Peliyagoda', dockType: 'rear_dock', parkingConstraint: 'normal' },
  OUT046: { id: 'OUT046', position: [6.7214, 80.0212], district: 'Kalutara', locationName: 'Horana', defaultWindow: '05:00–07:30', brand: 'Fresh', depot: 'Peliyagoda', dockType: 'rear_dock', parkingConstraint: 'normal' },
  OUT047: { id: 'OUT047', position: [6.7167, 79.9833], district: 'Kalutara', locationName: 'Bandaragama', defaultWindow: '09:00–17:00', brand: 'Style', depot: 'Peliyagoda', dockType: 'street', parkingConstraint: 'normal' },
  OUT048: { id: 'OUT048', position: [6.5222, 80.1144], district: 'Kalutara', locationName: 'Matugama', defaultWindow: '09:00–17:00', brand: 'Style', depot: 'Peliyagoda', dockType: 'rear_dock', parkingConstraint: 'normal' },
  OUT049: { id: 'OUT049', position: [6.7412, 80.1724], district: 'Kalutara', locationName: 'Ingiriya', defaultWindow: '09:00–17:00', brand: 'Tech', depot: 'Peliyagoda', dockType: 'street', parkingConstraint: 'normal' },
  // Galle District
  OUT050: { id: 'OUT050', position: [6.4258, 79.9984], district: 'Galle', locationName: 'Bentota', defaultWindow: '05:30–08:00', brand: 'Fresh', depot: 'Peliyagoda', dockType: 'rear_dock', parkingConstraint: 'normal' },
  OUT051: { id: 'OUT051', position: [6.2442, 80.0591], district: 'Galle', locationName: 'Ambalangoda', defaultWindow: '03:00–08:00', brand: 'Fresh', depot: 'Peliyagoda', dockType: 'street', parkingConstraint: 'normal' },
  OUT052: { id: 'OUT052', position: [6.1367, 80.103], district: 'Galle', locationName: 'Hikkaduwa', defaultWindow: '05:00–07:30', brand: 'Fresh', depot: 'Peliyagoda', dockType: 'street', parkingConstraint: 'normal' },
  OUT053: { id: 'OUT053', position: [6.0267, 80.217], district: 'Galle', locationName: 'Galle Fort', defaultWindow: '03:00–08:00', brand: 'Fresh', depot: 'Peliyagoda', dockType: 'street', parkingConstraint: 'normal' },
  OUT054: { id: 'OUT054', position: [6.0535, 80.221], district: 'Galle', locationName: 'Galle City', defaultWindow: '05:00–07:30', brand: 'Fresh', depot: 'Peliyagoda', dockType: 'rear_dock', parkingConstraint: 'normal' },
  OUT055: { id: 'OUT055', position: [6.0536, 80.2104], district: 'Galle', locationName: 'Karapitiya', defaultWindow: '05:00–07:30', brand: 'Fresh', depot: 'Peliyagoda', dockType: 'street', parkingConstraint: 'normal' },
  OUT056: { id: 'OUT056', position: [6.0094, 80.2486], district: 'Galle', locationName: 'Unawatuna', defaultWindow: '10:00–12:00', brand: 'Style', depot: 'Peliyagoda', dockType: 'mall_bay', parkingConstraint: 'mall_dock' },
  OUT057: { id: 'OUT057', position: [5.9912, 80.3275], district: 'Galle', locationName: 'Koggala', defaultWindow: '09:00–17:00', brand: 'Style', depot: 'Peliyagoda', dockType: 'street', parkingConstraint: 'normal' },
  OUT058: { id: 'OUT058', position: [6.1833, 80.1833], district: 'Galle', locationName: 'Baddegama', defaultWindow: '09:00–17:00', brand: 'Tech', depot: 'Peliyagoda', dockType: 'rear_dock', parkingConstraint: 'normal' },
  // Matara District
  OUT059: { id: 'OUT059', position: [5.9739, 80.4294], district: 'Matara', locationName: 'Weligama', defaultWindow: '04:00–07:45', brand: 'Fresh', depot: 'Peliyagoda', dockType: 'rear_dock', parkingConstraint: 'normal' },
  OUT060: { id: 'OUT060', position: [5.9467, 80.4578], district: 'Matara', locationName: 'Mirissa', defaultWindow: '03:00–08:00', brand: 'Fresh', depot: 'Peliyagoda', dockType: 'rear_dock', parkingConstraint: 'normal' },
  OUT061: { id: 'OUT061', position: [5.9452, 80.5489], district: 'Matara', locationName: 'Matara Fort', defaultWindow: '05:00–07:30', brand: 'Fresh', depot: 'Peliyagoda', dockType: 'rear_dock', parkingConstraint: 'normal' },
  OUT062: { id: 'OUT062', position: [5.95, 80.533], district: 'Matara', locationName: 'Matara City', defaultWindow: '05:30–08:00', brand: 'Fresh', depot: 'Peliyagoda', dockType: 'rear_dock', parkingConstraint: 'normal' },
  OUT063: { id: 'OUT063', position: [5.9255, 80.5898], district: 'Matara', locationName: 'Dondra', defaultWindow: '09:00–17:00', brand: 'Style', depot: 'Peliyagoda', dockType: 'street', parkingConstraint: 'normal' },
  OUT064: { id: 'OUT064', position: [6.0984, 80.4735], district: 'Matara', locationName: 'Akuressa', defaultWindow: '09:00–17:00', brand: 'Tech', depot: 'Peliyagoda', dockType: 'rear_dock', parkingConstraint: 'normal' },
  // Kurunegala District
  OUT065: { id: 'OUT065', position: [7.4833, 80.3667], district: 'Kurunegala', locationName: 'Kurunegala City', defaultWindow: '05:30–08:00', brand: 'Fresh', depot: 'Peliyagoda', dockType: 'rear_dock', parkingConstraint: 'normal' },
  OUT066: { id: 'OUT066', position: [7.4706, 80.0456], district: 'Kurunegala', locationName: 'Kuliyapitiya', defaultWindow: '04:00–07:45', brand: 'Fresh', depot: 'Peliyagoda', dockType: 'rear_dock', parkingConstraint: 'normal' },
  OUT067: { id: 'OUT067', position: [7.4333, 80.2167], district: 'Kurunegala', locationName: 'Narammala', defaultWindow: '05:00–07:30', brand: 'Fresh', depot: 'Peliyagoda', dockType: 'rear_dock', parkingConstraint: 'normal' },
  OUT068: { id: 'OUT068', position: [7.6167, 80.2333], district: 'Kurunegala', locationName: 'Wariyapola', defaultWindow: '03:00–08:00', brand: 'Fresh', depot: 'Peliyagoda', dockType: 'rear_dock', parkingConstraint: 'normal' },
  OUT069: { id: 'OUT069', position: [7.3333, 80.3], district: 'Kurunegala', locationName: 'Polgahawela', defaultWindow: '05:30–08:00', brand: 'Fresh', depot: 'Peliyagoda', dockType: 'rear_dock', parkingConstraint: 'normal' },
  OUT070: { id: 'OUT070', position: [7.2833, 80.2333], district: 'Kurunegala', locationName: 'Alawwa', defaultWindow: '09:00–17:00', brand: 'Style', depot: 'Peliyagoda', dockType: 'rear_dock', parkingConstraint: 'normal' },
  OUT071: { id: 'OUT071', position: [7.4333, 80.4333], district: 'Kurunegala', locationName: 'Mawathagama', defaultWindow: '09:00–17:00', brand: 'Style', depot: 'Peliyagoda', dockType: 'street', parkingConstraint: 'normal' },
  OUT072: { id: 'OUT072', position: [7.5333, 80.4333], district: 'Kurunegala', locationName: 'Ibbagamuwa', defaultWindow: '09:00–17:00', brand: 'Tech', depot: 'Peliyagoda', dockType: 'rear_dock', parkingConstraint: 'normal' },
  // Puttalam District
  OUT073: { id: 'OUT073', position: [7.583, 79.8], district: 'Puttalam', locationName: 'Chilaw', defaultWindow: '03:00–08:00', brand: 'Fresh', depot: 'Peliyagoda', dockType: 'rear_dock', parkingConstraint: 'normal' },
  OUT074: { id: 'OUT074', position: [7.4167, 79.8167], district: 'Puttalam', locationName: 'Marawila', defaultWindow: '05:30–08:00', brand: 'Fresh', depot: 'Peliyagoda', dockType: 'rear_dock', parkingConstraint: 'normal' },
  OUT075: { id: 'OUT075', position: [8.0362, 79.8283], district: 'Puttalam', locationName: 'Puttalam City', defaultWindow: '03:00–08:00', brand: 'Fresh', depot: 'Peliyagoda', dockType: 'rear_dock', parkingConstraint: 'normal' },
  // Kandy District
  OUT076: { id: 'OUT076', position: [7.2936, 80.635], district: 'Kandy', locationName: 'Kandy City Centre', defaultWindow: '03:00–08:00', brand: 'Fresh', depot: 'Kandy', dockType: 'street', parkingConstraint: 'van_only' },
  OUT077: { id: 'OUT077', position: [7.2622, 80.5841], district: 'Kandy', locationName: 'Peradeniya', defaultWindow: '05:00–07:30', brand: 'Fresh', depot: 'Kandy', dockType: 'street', parkingConstraint: 'van_only' },
  OUT078: { id: 'OUT078', position: [7.3385, 80.6277], district: 'Kandy', locationName: 'Katugastota', defaultWindow: '03:00–08:00', brand: 'Fresh', depot: 'Kandy', dockType: 'street', parkingConstraint: 'van_only' },
  OUT079: { id: 'OUT079', position: [7.2812, 80.6245], district: 'Kandy', locationName: 'William Gopallawa Mawatha', defaultWindow: '04:00–07:45', brand: 'Fresh', depot: 'Kandy', dockType: 'street', parkingConstraint: 'van_only' },
  OUT080: { id: 'OUT080', position: [7.1645, 80.5758], district: 'Kandy', locationName: 'Gampola', defaultWindow: '05:30–08:00', brand: 'Fresh', depot: 'Kandy', dockType: 'street', parkingConstraint: 'van_only' },
  OUT081: { id: 'OUT081', position: [7.275, 80.6864], district: 'Kandy', locationName: 'Kundasale', defaultWindow: '03:00–08:00', brand: 'Fresh', depot: 'Kandy', dockType: 'street', parkingConstraint: 'van_only' },
  OUT082: { id: 'OUT082', position: [7.2884, 80.7341], district: 'Kandy', locationName: 'Digana', defaultWindow: '03:00–08:00', brand: 'Fresh', depot: 'Kandy', dockType: 'street', parkingConstraint: 'van_only' },
  OUT083: { id: 'OUT083', position: [7.2667, 80.5333], district: 'Kandy', locationName: 'Pilimathalawa', defaultWindow: '04:00–07:45', brand: 'Fresh', depot: 'Kandy', dockType: 'street', parkingConstraint: 'van_only' },
  OUT084: { id: 'OUT084', position: [7.2542, 80.5211], district: 'Kandy', locationName: 'Kadugannawa', defaultWindow: '05:30–08:00', brand: 'Fresh', depot: 'Kandy', dockType: 'rear_dock', parkingConstraint: 'normal' },
  OUT085: { id: 'OUT085', position: [7.2833, 80.65], district: 'Kandy', locationName: 'Ampitiya', defaultWindow: '05:00–07:30', brand: 'Fresh', depot: 'Kandy', dockType: 'rear_dock', parkingConstraint: 'normal' },
  OUT086: { id: 'OUT086', position: [7.2167, 80.5833], district: 'Kandy', locationName: 'Gelioya', defaultWindow: '03:00–08:00', brand: 'Fresh', depot: 'Kandy', dockType: 'rear_dock', parkingConstraint: 'normal' },
  OUT087: { id: 'OUT087', position: [7.05, 80.5333], district: 'Kandy', locationName: 'Nawalapitiya', defaultWindow: '03:00–08:00', brand: 'Fresh', depot: 'Kandy', dockType: 'rear_dock', parkingConstraint: 'normal' },
  OUT088: { id: 'OUT088', position: [7.3167, 80.7667], district: 'Kandy', locationName: 'Teldeniya', defaultWindow: '09:00–17:00', brand: 'Style', depot: 'Kandy', dockType: 'street', parkingConstraint: 'van_only' },
  OUT089: { id: 'OUT089', position: [7.35, 80.6833], district: 'Kandy', locationName: 'Wattegama', defaultWindow: '10:30–12:30', brand: 'Style', depot: 'Kandy', dockType: 'mall_bay', parkingConstraint: 'mall_dock' },
  OUT090: { id: 'OUT090', position: [7.3667, 80.6167], district: 'Kandy', locationName: 'Akurana', defaultWindow: '10:30–12:30', brand: 'Style', depot: 'Kandy', dockType: 'mall_bay', parkingConstraint: 'mall_dock' },
  OUT091: { id: 'OUT091', position: [7.3167, 80.7], district: 'Kandy', locationName: 'Menikhinna', defaultWindow: '09:00–17:00', brand: 'Style', depot: 'Kandy', dockType: 'street', parkingConstraint: 'normal' },
  OUT092: { id: 'OUT092', position: [7.4, 80.6], district: 'Kandy', locationName: 'Alawatugoda', defaultWindow: '09:00–17:00', brand: 'Style', depot: 'Kandy', dockType: 'street', parkingConstraint: 'normal' },
  OUT093: { id: 'OUT093', position: [7.3667, 80.5667], district: 'Kandy', locationName: 'Poojapitiya', defaultWindow: '09:00–17:00', brand: 'Tech', depot: 'Kandy', dockType: 'street', parkingConstraint: 'van_only' },
  OUT094: { id: 'OUT094', position: [7.2833, 80.6667], district: 'Kandy', locationName: 'Thennekumbura', defaultWindow: '09:00–11:00', brand: 'Tech', depot: 'Kandy', dockType: 'mall_bay', parkingConstraint: 'mall_dock' },
  OUT095: { id: 'OUT095', position: [7.275, 80.6], district: 'Kandy', locationName: 'Gannoruwa', defaultWindow: '09:00–17:00', brand: 'Tech', depot: 'Kandy', dockType: 'rear_dock', parkingConstraint: 'normal' },
  // Matale District
  OUT096: { id: 'OUT096', position: [7.4667, 80.6167], district: 'Matale', locationName: 'Matale City', defaultWindow: '05:30–08:00', brand: 'Fresh', depot: 'Kandy', dockType: 'rear_dock', parkingConstraint: 'normal' },
  OUT097: { id: 'OUT097', position: [7.8578, 80.6525], district: 'Matale', locationName: 'Dambulla', defaultWindow: '03:00–08:00', brand: 'Fresh', depot: 'Kandy', dockType: 'street', parkingConstraint: 'normal' },
  OUT098: { id: 'OUT098', position: [7.4167, 80.6333], district: 'Matale', locationName: 'Ukuwela', defaultWindow: '03:00–08:00', brand: 'Fresh', depot: 'Kandy', dockType: 'rear_dock', parkingConstraint: 'normal' },
  OUT099: { id: 'OUT099', position: [7.5167, 80.6667], district: 'Matale', locationName: 'Rattota', defaultWindow: '05:00–07:30', brand: 'Fresh', depot: 'Kandy', dockType: 'rear_dock', parkingConstraint: 'normal' },
  OUT100: { id: 'OUT100', position: [7.7667, 80.5667], district: 'Matale', locationName: 'Galewela', defaultWindow: '03:00–08:00', brand: 'Fresh', depot: 'Kandy', dockType: 'rear_dock', parkingConstraint: 'normal' },
  OUT101: { id: 'OUT101', position: [7.6167, 80.5833], district: 'Matale', locationName: 'Pallepola', defaultWindow: '05:00–07:30', brand: 'Fresh', depot: 'Kandy', dockType: 'rear_dock', parkingConstraint: 'normal' },
  OUT102: { id: 'OUT102', position: [7.9542, 80.7558], district: 'Matale', locationName: 'Sigiriya', defaultWindow: '09:00–17:00', brand: 'Style', depot: 'Kandy', dockType: 'street', parkingConstraint: 'normal' },
  OUT103: { id: 'OUT103', position: [7.7, 80.65], district: 'Matale', locationName: 'Naula', defaultWindow: '09:00–17:00', brand: 'Tech', depot: 'Kandy', dockType: 'rear_dock', parkingConstraint: 'normal' },
  // Nuwara Eliya District
  OUT104: { id: 'OUT104', position: [6.9667, 80.7667], district: 'Nuwara Eliya', locationName: 'Nuwara Eliya Town', defaultWindow: '03:00–08:00', brand: 'Fresh', depot: 'Kandy', dockType: 'rear_dock', parkingConstraint: 'normal' },
  OUT105: { id: 'OUT105', position: [6.8897, 80.5981], district: 'Nuwara Eliya', locationName: 'Hatton', defaultWindow: '05:00–07:30', brand: 'Fresh', depot: 'Kandy', dockType: 'rear_dock', parkingConstraint: 'normal' },
  OUT106: { id: 'OUT106', position: [6.9372, 80.6567], district: 'Nuwara Eliya', locationName: 'Talawakele', defaultWindow: '05:30–08:00', brand: 'Fresh', depot: 'Kandy', dockType: 'rear_dock', parkingConstraint: 'normal' },
  OUT107: { id: 'OUT107', position: [6.9167, 80.6], district: 'Nuwara Eliya', locationName: 'Kotagala', defaultWindow: '03:00–08:00', brand: 'Fresh', depot: 'Kandy', dockType: 'rear_dock', parkingConstraint: 'normal' },
  OUT108: { id: 'OUT108', position: [6.9833, 80.4833], district: 'Nuwara Eliya', locationName: 'Ginigathena', defaultWindow: '04:00–07:45', brand: 'Fresh', depot: 'Kandy', dockType: 'rear_dock', parkingConstraint: 'normal' },
  OUT109: { id: 'OUT109', position: [6.95, 80.7333], district: 'Nuwara Eliya', locationName: 'Nanu Oya', defaultWindow: '09:00–17:00', brand: 'Style', depot: 'Kandy', dockType: 'rear_dock', parkingConstraint: 'normal' },
  // Badulla District
  OUT110: { id: 'OUT110', position: [6.9847, 81.0564], district: 'Badulla', locationName: 'Badulla Town', defaultWindow: '03:00–08:00', brand: 'Fresh', depot: 'Kandy', dockType: 'rear_dock', parkingConstraint: 'normal' },
  OUT111: { id: 'OUT111', position: [6.8333, 80.9833], district: 'Badulla', locationName: 'Bandarawela', defaultWindow: '03:00–08:00', brand: 'Fresh', depot: 'Kandy', dockType: 'rear_dock', parkingConstraint: 'normal' },
  OUT112: { id: 'OUT112', position: [6.8667, 81.0467], district: 'Badulla', locationName: 'Ella', defaultWindow: '04:00–07:45', brand: 'Fresh', depot: 'Kandy', dockType: 'rear_dock', parkingConstraint: 'normal' },
  OUT113: { id: 'OUT113', position: [6.95, 81.0333], district: 'Badulla', locationName: 'Hali Ela', defaultWindow: '05:30–08:00', brand: 'Fresh', depot: 'Kandy', dockType: 'rear_dock', parkingConstraint: 'normal' },
  OUT114: { id: 'OUT114', position: [6.9, 80.9], district: 'Badulla', locationName: 'Welimada', defaultWindow: '09:00–17:00', brand: 'Style', depot: 'Kandy', dockType: 'rear_dock', parkingConstraint: 'normal' },
  OUT115: { id: 'OUT115', position: [7.3167, 81], district: 'Badulla', locationName: 'Mahiyanganaya', defaultWindow: '09:00–17:00', brand: 'Tech', depot: 'Kandy', dockType: 'street', parkingConstraint: 'normal' },
  // Kegalle District
  OUT116: { id: 'OUT116', position: [7.2531, 80.3453], district: 'Kegalle', locationName: 'Kegalle Town', defaultWindow: '05:00–07:30', brand: 'Fresh', depot: 'Kandy', dockType: 'rear_dock', parkingConstraint: 'normal' },
  OUT117: { id: 'OUT117', position: [7.2533, 80.4464], district: 'Kegalle', locationName: 'Mawanella', defaultWindow: '04:00–07:45', brand: 'Fresh', depot: 'Kandy', dockType: 'rear_dock', parkingConstraint: 'normal' },
  OUT118: { id: 'OUT118', position: [7.3167, 80.4], district: 'Kegalle', locationName: 'Rambukkana', defaultWindow: '04:00–07:45', brand: 'Fresh', depot: 'Kandy', dockType: 'street', parkingConstraint: 'normal' },
  OUT119: { id: 'OUT119', position: [7.2333, 80.2], district: 'Kegalle', locationName: 'Warakapola', defaultWindow: '03:00–08:00', brand: 'Fresh', depot: 'Kandy', dockType: 'rear_dock', parkingConstraint: 'normal' },
  OUT120: { id: 'OUT120', position: [7.05, 80.25], district: 'Kegalle', locationName: 'Ruwanwella', defaultWindow: '09:00–17:00', brand: 'Style', depot: 'Kandy', dockType: 'rear_dock', parkingConstraint: 'normal' },
}

export const ALL_OUTLETS: OutletMapItem[] = Object.values(OUTLET_COORDINATES)

// Outlets for Peliyagoda Depot (OUT001 - OUT075)
const PELIYAGODA_OUTLET_IDS = Object.keys(OUTLET_COORDINATES).slice(0, 75)

// Outlets for Kandy Depot (OUT076 - OUT120)
const KANDY_OUTLET_IDS = Object.keys(OUTLET_COORDINATES).slice(75)

export function getVehicleRouteData(index: number): VehicleRouteData {
  const isPeliyagoda = index < 38
  const depotPosition: MapPosition = isPeliyagoda ? [...PELIYAGODA_DEPOT] : [...KANDY_DEPOT]
  const depotName = isPeliyagoda ? 'Peliyagoda Depot' : 'Kandy Depot'
  const depotAddress = isPeliyagoda ? '42 Baseline Rd, Peliyagoda 11100' : 'William Gopallawa Mawatha, Kandy 20000'
  const parkingYardPosition: MapPosition = isPeliyagoda ? [6.9618, 79.8928] : [7.2932, 80.6398]

  // Unallocated / parked vehicles
  const isParkedAtDepot = (isPeliyagoda && index >= 28) || (!isPeliyagoda && index >= 48)

  if (isParkedAtDepot) {
    return {
      tripName: 'Trip 1',
      depotName,
      depotAddress,
      recorded: 0,
      stopsCount: 0,
      nextStop: `Parked at ${depotName}`,
      outletId: '',
      destinationOutletId: '',
      destinationPosition: parkingYardPosition,
      window: '—',
      arrival: '—',
      updated: 'Parked at depot',
      map: {
        depotPosition,
        vehiclePosition: [...parkingYardPosition],
        routeCoordinates: [parkingYardPosition],
      },
      routeStops: [],
    }
  }

  // 1. VEH021 (index 20) -> Today's active delivery trip (6 stops, 3 completed)
  if (index === 20) {
    const stops: RouteStopItem[] = [
      {
        sequence: 1,
        outletId: 'OUT001',
        position: OUTLET_COORDINATES.OUT001.position,
        district: OUTLET_COORDINATES.OUT001.district,
        locationName: 'Colombo Fort Depot Outlet',
        arrival: '06:00 AM',
        window: '05:30–07:00',
        orderId: 'TODAY-201',
        load: '320 kg / 2.2 m³',
        isCompleted: true,
      },
      {
        sequence: 2,
        outletId: 'OUT002',
        position: OUTLET_COORDINATES.OUT002.position,
        district: OUTLET_COORDINATES.OUT002.district,
        locationName: 'Central Colombo Outlet',
        arrival: '06:20 AM',
        window: '06:00–07:30',
        orderId: 'TODAY-202',
        load: '190 kg / 1.5 m³',
        isCompleted: true,
      },
      {
        sequence: 3,
        outletId: 'OUT026',
        position: OUTLET_COORDINATES.OUT026.position,
        district: OUTLET_COORDINATES.OUT026.district,
        locationName: 'Wattala Sorting Centre',
        arrival: '06:45 AM',
        window: '06:30–08:00',
        orderId: 'TODAY-203',
        load: '210 kg / 1.7 m³',
        isCompleted: true,
      },
      {
        sequence: 4,
        outletId: 'OUT004',
        position: OUTLET_COORDINATES.OUT004.position,
        district: OUTLET_COORDINATES.OUT004.district,
        locationName: '88 Duplication Rd, Colombo 04',
        arrival: '07:35 AM',
        window: '07:00–08:00',
        orderId: 'TODAY-204',
        load: '140 kg / 1.2 m³',
        isCompleted: false,
      },
      {
        sequence: 5,
        outletId: 'OUT005',
        position: OUTLET_COORDINATES.OUT005.position,
        district: OUTLET_COORDINATES.OUT005.district,
        locationName: 'Fresh Colombo South',
        arrival: '08:15 AM',
        window: '08:00–09:30',
        orderId: 'TODAY-205',
        load: '110 kg / 0.9 m³',
        isCompleted: false,
      },
      {
        sequence: 6,
        outletId: 'OUT006',
        position: OUTLET_COORDINATES.OUT006.position,
        district: OUTLET_COORDINATES.OUT006.district,
        locationName: 'Outlet Hub Wellawatte',
        arrival: '08:45 AM',
        window: '08:30–10:00',
        orderId: 'TODAY-206',
        load: '160 kg / 1.3 m³',
        isCompleted: false,
      },
    ]

    const destStop = stops[stops.length - 1]
    const nextStop = stops.find((s) => !s.isCompleted) || destStop
    // Vehicle is en route between stop 3 (OUT026) and stop 4 (OUT004)
    const vehiclePosition: MapPosition = [
      Number(((stops[2].position[0] + stops[3].position[0]) / 2).toFixed(6)),
      Number(((stops[2].position[1] + stops[3].position[1]) / 2).toFixed(6)),
    ]

    return {
      tripName: 'Trip 1',
      depotName,
      depotAddress,
      recorded: 3,
      stopsCount: stops.length,
      nextStop: nextStop.outletId,
      outletId: nextStop.outletId,
      destinationOutletId: destStop.outletId,
      destinationDistrict: destStop.district,
      destinationPosition: destStop.position,
      window: nextStop.window,
      arrival: nextStop.arrival,
      updated: 'En route · 2 minutes ago',
      map: {
        depotPosition,
        vehiclePosition,
        routeCoordinates: [depotPosition, ...stops.map((s) => s.position)],
      },
      routeStops: stops,
    }
  }

  // 2. VEH032 (index 31) -> Stops: OUT002, OUT005, OUT009 (Destination)
  if (index === 31) {
    const stops: RouteStopItem[] = [
      {
        sequence: 1,
        outletId: 'OUT002',
        position: OUTLET_COORDINATES.OUT002.position,
        district: OUTLET_COORDINATES.OUT002.district,
        locationName: OUTLET_COORDINATES.OUT002.locationName,
        arrival: '08:15 AM',
        window: '08:00–10:00',
        orderId: 'DEMO-102',
        load: '210 kg / 1.4 m³',
        isCompleted: true,
      },
      {
        sequence: 2,
        outletId: 'OUT005',
        position: OUTLET_COORDINATES.OUT005.position,
        district: OUTLET_COORDINATES.OUT005.district,
        locationName: OUTLET_COORDINATES.OUT005.locationName,
        arrival: '09:30 AM',
        window: '09:00–11:00',
        orderId: 'DEMO-105',
        load: '310 kg / 2.1 m³',
        isCompleted: false,
      },
      {
        sequence: 3,
        outletId: 'OUT009',
        position: OUTLET_COORDINATES.OUT009.position,
        district: OUTLET_COORDINATES.OUT009.district,
        locationName: OUTLET_COORDINATES.OUT009.locationName,
        arrival: '10:45 AM',
        window: '10:00–12:00',
        orderId: 'DEMO-109',
        load: '150 kg / 1.0 m³',
        isCompleted: false,
      },
    ]

    const destStop = stops[stops.length - 1]
    const nextStop = stops.find((s) => !s.isCompleted) || destStop
    // Vehicle is en route between stop 1 and stop 2
    const vehiclePosition: MapPosition = [
      Number(((stops[0].position[0] + stops[1].position[0]) / 2).toFixed(6)),
      Number(((stops[0].position[1] + stops[1].position[1]) / 2).toFixed(6)),
    ]

    return {
      tripName: 'Trip 2',
      depotName,
      depotAddress,
      recorded: 1,
      stopsCount: stops.length,
      nextStop: nextStop.outletId,
      outletId: nextStop.outletId,
      destinationOutletId: destStop.outletId,
      destinationDistrict: destStop.district,
      destinationPosition: destStop.position,
      window: nextStop.window,
      arrival: nextStop.arrival,
      updated: 'En route · 5 minutes ago',
      map: {
        depotPosition,
        vehiclePosition,
        routeCoordinates: [depotPosition, ...stops.map((s) => s.position)],
      },
      routeStops: stops,
    }
  }

  // 3. VEH015 (index 14) -> Stops: OUT025, OUT010 (Destination)
  if (index === 14) {
    const stops: RouteStopItem[] = [
      {
        sequence: 1,
        outletId: 'OUT025',
        position: OUTLET_COORDINATES.OUT025.position,
        district: OUTLET_COORDINATES.OUT025.district,
        locationName: OUTLET_COORDINATES.OUT025.locationName,
        arrival: '07:45 AM',
        window: '07:00–09:00',
        orderId: 'DEMO-104',
        load: '420 kg / 3.0 m³',
        isCompleted: true,
      },
      {
        sequence: 2,
        outletId: 'OUT010',
        position: OUTLET_COORDINATES.OUT010.position,
        district: OUTLET_COORDINATES.OUT010.district,
        locationName: OUTLET_COORDINATES.OUT010.locationName,
        arrival: '09:15 AM',
        window: '08:30–10:30',
        orderId: 'DEMO-110',
        load: '190 kg / 1.5 m³',
        isCompleted: false,
      },
    ]

    const destStop = stops[stops.length - 1]
    const nextStop = stops.find((s) => !s.isCompleted) || destStop
    const vehiclePosition: MapPosition = [
      Number(((stops[0].position[0] + stops[1].position[0]) / 2).toFixed(6)),
      Number(((stops[0].position[1] + stops[1].position[1]) / 2).toFixed(6)),
    ]

    return {
      tripName: 'Trip 1',
      depotName,
      depotAddress,
      recorded: 1,
      stopsCount: stops.length,
      nextStop: nextStop.outletId,
      outletId: nextStop.outletId,
      destinationOutletId: destStop.outletId,
      destinationDistrict: destStop.district,
      destinationPosition: destStop.position,
      window: nextStop.window,
      arrival: nextStop.arrival,
      updated: 'En route · 2 minutes ago',
      map: {
        depotPosition,
        vehiclePosition,
        routeCoordinates: [depotPosition, ...stops.map((s) => s.position)],
      },
      routeStops: stops,
    }
  }

  // All other active fleet vehicles: select 3 to 4 sequential outlets from depot catalog
  const outletPool = isPeliyagoda ? PELIYAGODA_OUTLET_IDS : KANDY_OUTLET_IDS
  const stopCount = 3 + (index % 2) // 3 or 4 stops
  const startIndex = (index * 2) % outletPool.length
  const recorded = 1 + (index % (stopCount - 1)) // 1 or 2 completed stops

  const stops: RouteStopItem[] = []
  for (let s = 0; s < stopCount; s++) {
    const oId = outletPool[(startIndex + s) % outletPool.length]
    const data = OUTLET_COORDINATES[oId]
    const seq = s + 1
    const hour = 7 + Math.floor((s * 50) / 60)
    const min = (20 + s * 40 + (index % 15)) % 60
    const arrivalTime = `0${hour}:${String(min).padStart(2, '0')} AM`

    stops.push({
      sequence: seq,
      outletId: oId,
      position: data.position,
      district: data.district,
      locationName: data.locationName,
      arrival: arrivalTime,
      window: data.defaultWindow,
      isCompleted: seq <= recorded,
    })
  }

  const destStop = stops[stops.length - 1]
  const nextStop = stops.find((s) => !s.isCompleted) || destStop

  const completedStop = stops[recorded - 1]
  const vehiclePosition: MapPosition = completedStop
    ? [
        Number(((completedStop.position[0] + nextStop.position[0]) / 2).toFixed(6)),
        Number(((completedStop.position[1] + nextStop.position[1]) / 2).toFixed(6)),
      ]
    : [
        Number(((depotPosition[0] + nextStop.position[0]) / 2).toFixed(6)),
        Number(((depotPosition[1] + nextStop.position[1]) / 2).toFixed(6)),
      ]

  return {
    tripName: `Trip ${(index % 2) + 1}`,
    depotName,
    depotAddress,
    recorded,
    stopsCount: stops.length,
    nextStop: nextStop.outletId,
    outletId: nextStop.outletId,
    destinationOutletId: destStop.outletId,
    destinationDistrict: destStop.district,
    destinationPosition: destStop.position,
    window: nextStop.window,
    arrival: nextStop.arrival,
    updated: `En route · ${(index % 5) + 1} minutes ago`,
    map: {
      depotPosition,
      vehiclePosition,
      routeCoordinates: [depotPosition, ...stops.map((s) => s.position)],
    },
    routeStops: stops,
  }
}

export function demoMapLocations(index: number): DeliveryMapLocations {
  return getVehicleRouteData(index).map
}

export function hasValidMapLocations(locations: DeliveryMapLocations) {
  const validPosition = ([latitude, longitude]: MapPosition) =>
    Number.isFinite(latitude) && Number.isFinite(longitude) && Math.abs(latitude) <= 90 && Math.abs(longitude) <= 180
  return (
    validPosition(locations.depotPosition) &&
    validPosition(locations.vehiclePosition) &&
    locations.routeCoordinates.every(validPosition)
  )
}
