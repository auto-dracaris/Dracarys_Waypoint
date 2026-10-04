// A trip exactly as the API shapes it (TripsService.toView), for tests.
/// The trip exactly as `TripsService.toView` shapes it.
Map<String, dynamic> tripJson({
  String status = 'in_progress',
  int planVersion = 2,
  List<String> stopStates = const ['completed', 'pending'],
  Map<String, Object?>? codeHash,
}) => {
  'id': '11111111-1111-4111-8111-111111111111',
  'name': 'Trip 7',
  'subtitle': 'Fresh deliveries · Gampaha',
  'departure': '2026-10-04T01:30:00.000Z',
  'status': status,
  'planVersion': planVersion,
  'updatedAt': '2026-10-04T02:00:00.000Z',
  'vehicle': {'id': 21, 'plate': 'VEH021', 'type': 'Refrigerated van'},
  'stopCount': stopStates.length,
  'completedStops': 1,
  'depot': 'Peliyagoda',
  'shortfall': null,
  'stops': [
    for (var i = 0; i < stopStates.length; i++)
      {
        'id': '${40 + i}',
        'sequence': i + 1,
        'name': 'Outlet ${i + 1}',
        'deliveryWindow': '08:00-10:00',
        'plannedArrival': '2026-10-04T02:10:00.000Z',
        'dock': 'Rear loading dock',
        'lat': i == 0 ? 7.1 : null,
        'lng': i == 0 ? 79.9 : null,
        'contactPhone': '0112345678',
        'status': stopStates[i],
        'arrivedAt': stopStates[i] == 'pending'
            ? null
            : '2026-10-04T02:12:00.000Z',
        'deliveryCode': stopStates[i] == 'completed' ? null : codeHash,
        'codeVerified': null,
        'etaMinutes': 18,
        'distanceKm': '7.2',
        'orders': [
          {
            'id': 'ORD0000012',
            'storeName': 'Outlet ${i + 1}',
            'cases': 12,
            'temperature': 'chilled',
            'status': 'pending_delivery',
            'deliveredCases': null,
            'handling': 'Keep below 4°C',
          },
        ],
      },
  ],
};
