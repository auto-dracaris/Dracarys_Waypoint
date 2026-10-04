import '../domain/delivery_code_hash.dart';
import '../domain/order.dart';
import '../domain/shortfall_report.dart';
import '../domain/stop.dart';
import '../domain/trip.dart';

/// Turns the API's trip JSON (`GET /trips`, `GET /trips/:id` and every driver
/// action, which all answer with the trip) into domain objects. The API is the
/// source of truth for field names; nothing here is guessed.

double _number(Object? v, [double fallback = 0]) {
  if (v is num) return v.toDouble();
  if (v is String) return double.tryParse(v) ?? fallback;
  return fallback;
}

DateTime _time(Object? v) {
  final parsed = v is String ? DateTime.tryParse(v) : null;
  return (parsed ?? DateTime.fromMillisecondsSinceEpoch(0)).toLocal();
}

DateTime? _timeOrNull(Object? v) => v == null ? null : _time(v);

TripStatus tripStatusFromApi(Object? v) => switch (v) {
  'loading' => TripStatus.loading,
  'ready' => TripStatus.ready,
  'in_progress' => TripStatus.inProgress,
  'completed' => TripStatus.completed,
  _ => TripStatus.assigned,
};

StopStatus stopStatusFromApi(Object? v) => switch (v) {
  'arrived' => StopStatus.arrived,
  'completed' => StopStatus.completed,
  _ => StopStatus.pending,
};

Order orderFromJson(Map<String, dynamic> j) => Order(
  id: j['id'] as String,
  storeName: (j['storeName'] as String?) ?? '',
  cases: _number(j['cases']).round(),
  temperature: j['temperature'] == 'chilled'
      ? Temperature.chilled
      : Temperature.ambient,
  status: j['status'] == 'delivered'
      ? OrderStatus.delivered
      : OrderStatus.pendingDelivery,
  deliveredCases: j['deliveredCases'] == null
      ? null
      : _number(j['deliveredCases']).round(),
  handling: j['handling'] as String?,
);

/// An outlet with no coordinates yet is drawn at [fallback] rather than
/// somewhere in the Atlantic.
Stop stopFromJson(
  Map<String, dynamic> j, {
  required double fallbackLat,
  required double fallbackLng,
}) {
  final lat = j['lat'], lng = j['lng'];
  return Stop(
    id: '${j['id']}',
    sequence: _number(j['sequence']).round(),
    name: j['name'] as String,
    deliveryWindow: (j['deliveryWindow'] as String?) ?? '',
    plannedArrival: _time(j['plannedArrival']),
    dock: (j['dock'] as String?) ?? '',
    lat: lat == null ? fallbackLat : _number(lat),
    lng: lng == null ? fallbackLng : _number(lng),
    contactPhone: (j['contactPhone'] as String?) ?? '',
    etaMinutes: _number(j['etaMinutes']).round(),
    distanceKm: _number(j['distanceKm']),
    status: stopStatusFromApi(j['status']),
    arrivedAt: _timeOrNull(j['arrivedAt']),
    deliveryCode: _codeHash(j['deliveryCode']),
    orders: [
      for (final o in (j['orders'] as List? ?? const []))
        orderFromJson(o as Map<String, dynamic>),
    ],
  );
}

DeliveryCodeHash? _codeHash(Object? j) {
  if (j is! Map || j['salt'] is! String || j['hash'] is! String) return null;
  return DeliveryCodeHash(
    salt: j['salt'] as String,
    iterations: _number(j['iterations']).round(),
    hash: j['hash'] as String,
  );
}

ShortfallReport? shortfallFromJson(Object? j) {
  if (j is! Map<String, dynamic>) return null;
  return ShortfallReport(
    orderId: j['orderId'] as String,
    storeName: (j['storeName'] as String?) ?? '',
    shortCases: _number(j['shortCases']).round(),
    plannedCases: _number(j['plannedCases']).round(),
    dispatcherNote: (j['dispatcherNote'] as String?) ?? '',
  );
}

/// Works for both the list item (no `stops`) and the full trip.
Trip tripFromJson(
  Map<String, dynamic> j, {
  double fallbackLat = 6.9645,
  double fallbackLng = 79.8880,
}) => Trip(
  id: j['id'] as String,
  name: j['name'] as String,
  subtitle: (j['subtitle'] as String?) ?? '',
  departure: _time(j['departure']),
  status: tripStatusFromApi(j['status']),
  planVersion: _number(j['planVersion'], 1).round(),
  updatedAt: _timeOrNull(j['updatedAt']),
  shortfall: shortfallFromJson(j['shortfall']),
  stops: [
    for (final s in (j['stops'] as List? ?? const []))
      stopFromJson(
        s as Map<String, dynamic>,
        fallbackLat: fallbackLat,
        fallbackLng: fallbackLng,
      ),
  ],
);
