# Driver App Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create the runnable Flutter base of the Waypoint driver app: scaffold, theme, shared widgets, mock data layer, mock auth, router with 3-tab shell, and splash/login/sign-up, with placeholder tab screens ready to be replaced page by page.

**Architecture:** Feature-first Flutter app in `mobile/driver_app/`. Each feature has `domain/` (immutable models), `data/` (abstract repository + `Mock…Repository`, exposed through Riverpod providers so the real API can be swapped in later by changing one provider), and `presentation/`. `go_router` handles navigation with an auth redirect and a `StatefulShellRoute` for the tabs.

**Tech Stack:** Flutter 3.47 / Dart 3.13, `flutter_riverpod`, `go_router`, Material 3. (`flutter_map` is added later by the map screens' plan.)

**Spec:** `docs/superpowers/specs/2026-09-29-driver-app-design.md`

## Global Constraints

- App lives in `mobile/driver_app/` (package name `driver_app`), beside `api/`; platforms android + ios only.
- UI only: no network calls; all data comes from `Mock…Repository` implementations.
- Screens depend on abstract repositories via Riverpod providers, never on `Mock…` classes directly.
- Models are plain immutable Dart classes, no code generation (`fromJson` is added when the API is connected).
- Riverpod: use only `Provider`, `FutureProvider`, `Notifier`/`AsyncNotifier` (+ their `…Provider`s); no `StateProvider`.
- Colours only via `AppColors`; primary yellow ≈ `#E3B412`. Material 3.
- `flutter analyze` must be clean and `flutter test` green before every commit.
- Mock repositories take a `latency` (default a few hundred ms) so loading states are visible; tests pass `Duration.zero`.
- No 3D navigation; no loader-app code.

## Review Focus

- Login/sign-up form submitted with empty, whitespace-only or malformed email / short password → inline validation message, no crash, no repository call.
- Sign up with an email that is already registered → error message shown, user stays on the sign-up screen.
- "Mark arrived" on a trip whose stops are all completed → no-op, trip returned unchanged (no exception).
- `getTrip` with an unknown id → `StateError`, not a null-dereference.
- Sign out from Account → lands on login, and the shell is not reachable by navigating back.

---

### Task 1: Scaffold the Flutter project

**Files:**
- Create: `mobile/driver_app/**` (via `flutter create`)
- Modify: `mobile/driver_app/pubspec.yaml`, `mobile/driver_app/lib/main.dart`
- Delete: `mobile/driver_app/test/widget_test.dart`

**Interfaces:**
- Produces: buildable project `driver_app` with `flutter_riverpod` and `go_router` dependencies.

- [ ] **Step 1: Create the project**

Run from the repo root:
```bash
flutter create --org com.dracarys --project-name driver_app --platforms=android,ios mobile/driver_app
cd mobile/driver_app
flutter pub add flutter_riverpod go_router
```
Expected: project created, dependencies resolved.

- [ ] **Step 2: Replace the counter demo**

Delete `test/widget_test.dart`. Overwrite `lib/main.dart`:
```dart
import 'package:flutter/material.dart';

void main() {
  runApp(const MaterialApp(home: Scaffold()));
}
```

- [ ] **Step 3: Verify**

Run: `flutter analyze` → `No issues found!`

- [ ] **Step 4: Commit**

```bash
cd ../..
git add mobile/driver_app
git commit -m "feat(driver): scaffold Flutter driver app"
```

---

### Task 2: Theme, formatting and shared widgets

**Files:**
- Create: `lib/core/theme/app_colors.dart`, `lib/core/theme/app_theme.dart`, `lib/core/format.dart`
- Create: `lib/core/widgets/waypoint_logo.dart`, `status_pill.dart`, `primary_button.dart`, `async_value_view.dart`
- Test: `test/core/format_test.dart`, `test/core/widgets_test.dart`

**Interfaces:**
- Produces:
  - `AppColors` (static consts: `primary, onPrimary, ink, inkMuted, background, surface, border, success, successBg, danger, dangerBg, warning, warningBg`)
  - `AppTheme.light` → `ThemeData`
  - `String formatTime(DateTime t)` → `"05:30 AM"`
  - `WaypointLogo({double size = 72})` (has `Key('waypoint-logo')`)
  - `enum StatusKind { success, danger, warning, neutral }`; `StatusPill({required String label, StatusKind kind = StatusKind.neutral, VoidCallback? onLongPress})`
  - `PrimaryButton({required String label, required VoidCallback? onPressed, bool isLoading = false})`
  - `AsyncValueView<T>({required AsyncValue<T> value, required Widget Function(T) data, VoidCallback? onRetry, bool Function(T)? isEmpty, String emptyMessage = 'Nothing here yet'})`

- [ ] **Step 1: Write failing tests**

`test/core/format_test.dart`:
```dart
import 'package:driver_app/core/format.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test('formats morning, noon, afternoon and midnight', () {
    expect(formatTime(DateTime(2026, 1, 1, 5, 30)), '05:30 AM');
    expect(formatTime(DateTime(2026, 1, 1, 12, 0)), '12:00 PM');
    expect(formatTime(DateTime(2026, 1, 1, 17, 20)), '05:20 PM');
    expect(formatTime(DateTime(2026, 1, 1, 0, 5)), '12:05 AM');
  });
}
```

`test/core/widgets_test.dart`:
```dart
import 'package:driver_app/core/theme/app_theme.dart';
import 'package:driver_app/core/widgets/async_value_view.dart';
import 'package:driver_app/core/widgets/primary_button.dart';
import 'package:driver_app/core/widgets/status_pill.dart';
import 'package:driver_app/core/widgets/waypoint_logo.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

Widget wrap(Widget child) =>
    MaterialApp(theme: AppTheme.light, home: Scaffold(body: child));

void main() {
  testWidgets('StatusPill shows label and reports long press', (tester) async {
    var pressed = false;
    await tester.pumpWidget(wrap(StatusPill(
      label: 'Online',
      kind: StatusKind.success,
      onLongPress: () => pressed = true,
    )));
    expect(find.text('Online'), findsOneWidget);
    await tester.longPress(find.text('Online'));
    expect(pressed, isTrue);
  });

  testWidgets('PrimaryButton calls onPressed', (tester) async {
    var taps = 0;
    await tester.pumpWidget(
        wrap(PrimaryButton(label: 'Go', onPressed: () => taps++)));
    await tester.tap(find.text('Go'));
    expect(taps, 1);
  });

  testWidgets('PrimaryButton ignores taps while loading', (tester) async {
    var taps = 0;
    await tester.pumpWidget(wrap(
        PrimaryButton(label: 'Go', isLoading: true, onPressed: () => taps++)));
    expect(find.byType(CircularProgressIndicator), findsOneWidget);
    await tester.tap(find.byType(PrimaryButton), warnIfMissed: false);
    expect(taps, 0);
  });

  testWidgets('AsyncValueView renders data, loading, error and empty',
      (tester) async {
    await tester.pumpWidget(wrap(AsyncValueView<int>(
        value: const AsyncData(7), data: (v) => Text('v$v'))));
    expect(find.text('v7'), findsOneWidget);

    await tester.pumpWidget(wrap(AsyncValueView<int>(
        value: const AsyncLoading<int>(), data: (v) => Text('v$v'))));
    expect(find.byType(CircularProgressIndicator), findsOneWidget);

    var retried = false;
    await tester.pumpWidget(wrap(AsyncValueView<int>(
      value: AsyncError<int>(Exception('x'), StackTrace.empty),
      data: (v) => Text('v$v'),
      onRetry: () => retried = true,
    )));
    expect(find.text('Something went wrong'), findsOneWidget);
    await tester.tap(find.text('Try again'));
    expect(retried, isTrue);

    await tester.pumpWidget(wrap(AsyncValueView<List<int>>(
      value: const AsyncData(<int>[]),
      data: (v) => Text('n${v.length}'),
      isEmpty: (v) => v.isEmpty,
      emptyMessage: 'No trips',
    )));
    expect(find.text('No trips'), findsOneWidget);
  });

  testWidgets('WaypointLogo renders', (tester) async {
    await tester.pumpWidget(wrap(const WaypointLogo()));
    expect(find.byKey(const Key('waypoint-logo')), findsOneWidget);
  });
}
```

- [ ] **Step 2: Run to verify failure**

Run: `flutter test test/core` → FAIL (files/symbols not found).

- [ ] **Step 3: Implement**

`lib/core/theme/app_colors.dart`:
```dart
import 'package:flutter/material.dart';

abstract final class AppColors {
  static const primary = Color(0xFFE3B412);
  static const onPrimary = Color(0xFF1A1A1A);
  static const ink = Color(0xFF1F1B16);
  static const inkMuted = Color(0xFF5F6368);
  static const background = Color(0xFFF3F3F3);
  static const surface = Color(0xFFFFFFFF);
  static const border = Color(0xFFDADADA);
  static const success = Color(0xFF3E6B0A);
  static const successBg = Color(0xFFDCEBC0);
  static const danger = Color(0xFFD93A3A);
  static const dangerBg = Color(0xFFF6DAD8);
  static const warning = Color(0xFF7A5F00);
  static const warningBg = Color(0xFFF1E8A0);
}
```

`lib/core/theme/app_theme.dart`:
```dart
import 'package:flutter/material.dart';

import 'app_colors.dart';

abstract final class AppTheme {
  static ThemeData get light {
    final scheme = ColorScheme.fromSeed(
      seedColor: AppColors.primary,
      brightness: Brightness.light,
    ).copyWith(
      primary: AppColors.primary,
      onPrimary: AppColors.onPrimary,
      surface: AppColors.surface,
      onSurface: AppColors.ink,
      error: AppColors.danger,
    );
    return ThemeData(
      useMaterial3: true,
      colorScheme: scheme,
      scaffoldBackgroundColor: AppColors.background,
      appBarTheme: const AppBarTheme(
        backgroundColor: AppColors.background,
        foregroundColor: AppColors.ink,
        elevation: 0,
        scrolledUnderElevation: 0,
      ),
      filledButtonTheme: FilledButtonThemeData(
        style: FilledButton.styleFrom(
          backgroundColor: AppColors.primary,
          foregroundColor: AppColors.onPrimary,
          textStyle: const TextStyle(fontSize: 16, fontWeight: FontWeight.w600),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(6)),
        ),
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: AppColors.surface,
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(8),
          borderSide: const BorderSide(color: AppColors.border),
        ),
      ),
      navigationBarTheme: NavigationBarThemeData(
        backgroundColor: AppColors.background,
        indicatorColor: AppColors.warningBg,
      ),
    );
  }
}
```

`lib/core/format.dart`:
```dart
String formatTime(DateTime t) {
  final hour = t.hour % 12 == 0 ? 12 : t.hour % 12;
  final minute = t.minute.toString().padLeft(2, '0');
  final period = t.hour < 12 ? 'AM' : 'PM';
  return '${hour.toString().padLeft(2, '0')}:$minute $period';
}
```

`lib/core/widgets/waypoint_logo.dart`:
```dart
import 'package:flutter/material.dart';

import '../theme/app_colors.dart';

/// Placeholder mark until the real logo asset is exported from Figma.
class WaypointLogo extends StatelessWidget {
  const WaypointLogo({super.key, this.size = 72});

  final double size;

  @override
  Widget build(BuildContext context) {
    return Container(
      key: const Key('waypoint-logo'),
      width: size,
      height: size,
      alignment: Alignment.center,
      decoration: BoxDecoration(
        color: AppColors.primary,
        borderRadius: BorderRadius.circular(size * 0.22),
      ),
      child: Text(
        'W',
        style: TextStyle(
          fontSize: size * 0.6,
          fontWeight: FontWeight.w900,
          color: AppColors.ink,
        ),
      ),
    );
  }
}
```

`lib/core/widgets/status_pill.dart`:
```dart
import 'package:flutter/material.dart';

import '../theme/app_colors.dart';

enum StatusKind { success, danger, warning, neutral }

class StatusPill extends StatelessWidget {
  const StatusPill({
    super.key,
    required this.label,
    this.kind = StatusKind.neutral,
    this.onLongPress,
  });

  final String label;
  final StatusKind kind;
  final VoidCallback? onLongPress;

  (Color, Color) get _colors => switch (kind) {
        StatusKind.success => (AppColors.successBg, AppColors.success),
        StatusKind.danger => (AppColors.dangerBg, AppColors.danger),
        StatusKind.warning => (AppColors.warningBg, AppColors.warning),
        StatusKind.neutral => (AppColors.border, AppColors.inkMuted),
      };

  @override
  Widget build(BuildContext context) {
    final (bg, fg) = _colors;
    return GestureDetector(
      onLongPress: onLongPress,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
        decoration: BoxDecoration(
          color: bg,
          borderRadius: BorderRadius.circular(999),
        ),
        child: Text(label,
            style: TextStyle(color: fg, fontWeight: FontWeight.w600)),
      ),
    );
  }
}
```

`lib/core/widgets/primary_button.dart`:
```dart
import 'package:flutter/material.dart';

class PrimaryButton extends StatelessWidget {
  const PrimaryButton({
    super.key,
    required this.label,
    required this.onPressed,
    this.isLoading = false,
  });

  final String label;
  final VoidCallback? onPressed;
  final bool isLoading;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: double.infinity,
      height: 52,
      child: FilledButton(
        onPressed: isLoading ? null : onPressed,
        child: isLoading
            ? const SizedBox(
                width: 22,
                height: 22,
                child: CircularProgressIndicator(strokeWidth: 2.5),
              )
            : Text(label),
      ),
    );
  }
}
```

`lib/core/widgets/async_value_view.dart`:
```dart
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

class AsyncValueView<T> extends StatelessWidget {
  const AsyncValueView({
    super.key,
    required this.value,
    required this.data,
    this.onRetry,
    this.isEmpty,
    this.emptyMessage = 'Nothing here yet',
  });

  final AsyncValue<T> value;
  final Widget Function(T) data;
  final VoidCallback? onRetry;
  final bool Function(T)? isEmpty;
  final String emptyMessage;

  @override
  Widget build(BuildContext context) {
    return value.when(
      data: (v) => (isEmpty?.call(v) ?? false)
          ? Center(child: Text(emptyMessage))
          : data(v),
      loading: () => const Center(child: CircularProgressIndicator()),
      error: (e, _) => Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Text('Something went wrong'),
            if (onRetry != null)
              TextButton(onPressed: onRetry, child: const Text('Try again')),
          ],
        ),
      ),
    );
  }
}
```

- [ ] **Step 4: Run to verify pass**

Run: `flutter test test/core && flutter analyze` → all pass, no issues.

- [ ] **Step 5: Commit**

```bash
git add mobile/driver_app
git commit -m "feat(driver): add theme, formatting and shared widgets"
```

---

### Task 3: Trips domain and mock repository

**Files:**
- Create: `lib/features/trips/domain/order.dart`, `stop.dart`, `trip.dart`, `vehicle.dart`
- Create: `lib/features/trips/data/trips_repository.dart`, `mock_trips_repository.dart`, `trips_providers.dart`
- Test: `test/features/trips/mock_trips_repository_test.dart`

**Interfaces:**
- Produces:
  - `enum Temperature { chilled, ambient }`, `enum OrderStatus { pendingDelivery, delivered }`, `Order({id, storeName, cases, temperature, status = pendingDelivery})`
  - `enum StopStatus { pending, completed }`, `Stop({id, sequence, name, deliveryWindow, plannedArrival, dock, lat, lng, orders, status = pending})` + `copyWith({StopStatus? status})`
  - `enum TripStatus { assigned, loading, ready, inProgress, completed }`, `Trip({id, name, subtitle, departure, status, stops})` + `int completedStops`, `Stop? nextStop`, `copyWith({TripStatus? status, List<Stop>? stops})`
  - `Vehicle({plate, type})`
  - `abstract interface class TripsRepository { Future<Vehicle> getVehicle(); Future<List<Trip>> getTrips(); Future<Trip> getTrip(String id); Future<Trip> markArrived(String tripId); }`
  - `MockTripsRepository({Duration latency = const Duration(milliseconds: 400), DateTime? today})`
  - Providers: `tripsRepositoryProvider` (`Provider<TripsRepository>`), `vehicleProvider` (`FutureProvider<Vehicle>`), `tripsProvider` (`FutureProvider<List<Trip>>`)

- [ ] **Step 1: Write failing test**

`test/features/trips/mock_trips_repository_test.dart`:
```dart
import 'package:driver_app/features/trips/data/mock_trips_repository.dart';
import 'package:driver_app/features/trips/domain/order.dart';
import 'package:driver_app/features/trips/domain/stop.dart';
import 'package:driver_app/features/trips/domain/trip.dart';
import 'package:flutter_test/flutter_test.dart';

MockTripsRepository repo() => MockTripsRepository(
    latency: Duration.zero, today: DateTime(2026, 9, 29));

void main() {
  test('seeds the Figma story', () async {
    final r = repo();
    final vehicle = await r.getVehicle();
    expect(vehicle.plate, 'VEH021');
    expect(vehicle.type, 'Refrigerated van');

    final trips = await r.getTrips();
    expect(trips.map((t) => t.name), ['Trip 1', 'Trip 2']);
    expect(trips[0].stops.length, 4);
    expect(trips[0].completedStops, 2);
    expect(trips[0].status, TripStatus.loading);
    expect(trips[1].stops.length, 2);

    final next = trips[0].nextStop!;
    expect(next.sequence, 3);
    expect(next.name, 'Waypoint Fresh - Ja-Ela');
    expect(next.orders.map((o) => o.id), ['ORD-4521', 'ORD-4522']);
    expect(next.orders.first.temperature, Temperature.chilled);
  });

  test('markArrived completes the next stop and advances progress', () async {
    final r = repo();
    final updated = await r.markArrived('trip-1');
    expect(updated.completedStops, 3);
    expect(updated.nextStop!.sequence, 4);
    expect((await r.getTrip('trip-1')).completedStops, 3);
  });

  test('markArrived on the last stop completes the trip', () async {
    final r = repo();
    await r.markArrived('trip-1');
    final done = await r.markArrived('trip-1');
    expect(done.status, TripStatus.completed);
    expect(done.nextStop, isNull);
    expect(done.stops.every((s) => s.status == StopStatus.completed), isTrue);
  });

  test('markArrived on an already completed trip is a no-op', () async {
    final r = repo();
    await r.markArrived('trip-1');
    await r.markArrived('trip-1');
    final again = await r.markArrived('trip-1');
    expect(again.completedStops, 4);
    expect(again.status, TripStatus.completed);
  });

  test('getTrip / markArrived with unknown id throw StateError', () async {
    final r = repo();
    expect(() => r.getTrip('nope'), throwsStateError);
    expect(() => r.markArrived('nope'), throwsStateError);
  });
}
```

- [ ] **Step 2: Run to verify failure**

Run: `flutter test test/features/trips` → FAIL (missing files).

- [ ] **Step 3: Implement models**

`lib/features/trips/domain/order.dart`:
```dart
enum Temperature { chilled, ambient }

enum OrderStatus { pendingDelivery, delivered }

class Order {
  const Order({
    required this.id,
    required this.storeName,
    required this.cases,
    required this.temperature,
    this.status = OrderStatus.pendingDelivery,
  });

  final String id;
  final String storeName;
  final int cases;
  final Temperature temperature;
  final OrderStatus status;
}
```

`lib/features/trips/domain/stop.dart`:
```dart
import 'order.dart';

enum StopStatus { pending, completed }

class Stop {
  const Stop({
    required this.id,
    required this.sequence,
    required this.name,
    required this.deliveryWindow,
    required this.plannedArrival,
    required this.dock,
    required this.lat,
    required this.lng,
    required this.orders,
    this.status = StopStatus.pending,
  });

  final String id;
  final int sequence;
  final String name;
  final String deliveryWindow;
  final DateTime plannedArrival;
  final String dock;
  final double lat;
  final double lng;
  final List<Order> orders;
  final StopStatus status;

  Stop copyWith({StopStatus? status}) => Stop(
        id: id,
        sequence: sequence,
        name: name,
        deliveryWindow: deliveryWindow,
        plannedArrival: plannedArrival,
        dock: dock,
        lat: lat,
        lng: lng,
        orders: orders,
        status: status ?? this.status,
      );
}
```

`lib/features/trips/domain/trip.dart`:
```dart
import 'stop.dart';

enum TripStatus { assigned, loading, ready, inProgress, completed }

class Trip {
  const Trip({
    required this.id,
    required this.name,
    required this.subtitle,
    required this.departure,
    required this.status,
    required this.stops,
  });

  final String id;
  final String name;
  final String subtitle;
  final DateTime departure;
  final TripStatus status;
  final List<Stop> stops;

  int get completedStops =>
      stops.where((s) => s.status == StopStatus.completed).length;

  Stop? get nextStop {
    for (final s in stops) {
      if (s.status == StopStatus.pending) return s;
    }
    return null;
  }

  Trip copyWith({TripStatus? status, List<Stop>? stops}) => Trip(
        id: id,
        name: name,
        subtitle: subtitle,
        departure: departure,
        status: status ?? this.status,
        stops: stops ?? this.stops,
      );
}
```

`lib/features/trips/domain/vehicle.dart`:
```dart
class Vehicle {
  const Vehicle({required this.plate, required this.type});

  final String plate;
  final String type;
}
```

- [ ] **Step 4: Implement repository, mock and providers**

`lib/features/trips/data/trips_repository.dart`:
```dart
import '../domain/trip.dart';
import '../domain/vehicle.dart';

abstract interface class TripsRepository {
  Future<Vehicle> getVehicle();
  Future<List<Trip>> getTrips();

  /// Throws [StateError] if [id] is unknown.
  Future<Trip> getTrip(String id);

  /// Completes the next pending stop. No-op if none are pending.
  /// Throws [StateError] if [tripId] is unknown.
  Future<Trip> markArrived(String tripId);
}
```

`lib/features/trips/data/mock_trips_repository.dart`:
```dart
import '../domain/order.dart';
import '../domain/stop.dart';
import '../domain/trip.dart';
import '../domain/vehicle.dart';
import 'trips_repository.dart';

class MockTripsRepository implements TripsRepository {
  MockTripsRepository({
    this.latency = const Duration(milliseconds: 400),
    DateTime? today,
  }) {
    final now = today ?? DateTime.now();
    _trips = _seed(DateTime(now.year, now.month, now.day));
  }

  final Duration latency;
  late List<Trip> _trips;

  Future<void> _wait() => Future<void>.delayed(latency);

  @override
  Future<Vehicle> getVehicle() async {
    await _wait();
    return const Vehicle(plate: 'VEH021', type: 'Refrigerated van');
  }

  @override
  Future<List<Trip>> getTrips() async {
    await _wait();
    return List.unmodifiable(_trips);
  }

  @override
  Future<Trip> getTrip(String id) async {
    await _wait();
    return _trips[_indexOf(id)];
  }

  @override
  Future<Trip> markArrived(String tripId) async {
    await _wait();
    final i = _indexOf(tripId);
    final trip = _trips[i];
    final next = trip.nextStop;
    if (next == null) return trip;

    final stops = [
      for (final s in trip.stops)
        s.id == next.id ? s.copyWith(status: StopStatus.completed) : s,
    ];
    var updated = trip.copyWith(stops: stops);
    if (updated.nextStop == null) {
      updated = updated.copyWith(status: TripStatus.completed);
    }
    _trips = [..._trips]..[i] = updated;
    return updated;
  }

  int _indexOf(String id) {
    final i = _trips.indexWhere((t) => t.id == id);
    if (i == -1) throw StateError('Trip not found: $id');
    return i;
  }

  static List<Trip> _seed(DateTime day) {
    DateTime at(int h, int m) => DateTime(day.year, day.month, day.day, h, m);

    Stop stop(int seq, String name, String window, DateTime eta, double lat,
            double lng,
            {List<Order> orders = const [],
            StopStatus status = StopStatus.pending,
            String tripId = 'trip-1'}) =>
        Stop(
          id: '$tripId-stop-$seq',
          sequence: seq,
          name: name,
          deliveryWindow: window,
          plannedArrival: eta,
          dock: 'Rear loading dock',
          lat: lat,
          lng: lng,
          orders: orders,
          status: status,
        );

    return [
      Trip(
        id: 'trip-1',
        name: 'Trip 1',
        subtitle: 'Fresh deliveries · Gampaha',
        departure: at(5, 30),
        status: TripStatus.loading,
        stops: [
          stop(1, 'Waypoint Fresh - Kiribathgoda', '05:30-06:30', at(5, 50),
              7.0000, 79.9280, status: StopStatus.completed),
          stop(2, 'Waypoint Fresh - Wattala', '05:45-07:00', at(6, 30),
              6.9890, 79.8900, status: StopStatus.completed),
          stop(3, 'Waypoint Fresh - Ja-Ela', '06:00-08:00', at(7, 10),
              7.0744, 79.8919,
              orders: const [
                Order(
                    id: 'ORD-4521',
                    storeName: 'Waypoint Fresh - Ja-Ela',
                    cases: 12,
                    temperature: Temperature.chilled),
                Order(
                    id: 'ORD-4522',
                    storeName: 'Waypoint Fresh - Ja-Ela',
                    cases: 8,
                    temperature: Temperature.ambient),
              ]),
          stop(4, 'Waypoint Fresh - Gampaha', '07:00-09:00', at(7, 50),
              7.0917, 79.9925),
        ],
      ),
      Trip(
        id: 'trip-2',
        name: 'Trip 2',
        subtitle: 'Fresh deliveries · Gampaha',
        departure: at(7, 0),
        status: TripStatus.assigned,
        stops: [
          stop(1, 'Waypoint Fresh - Minuwangoda', '08:00-10:00', at(8, 30),
              7.1730, 79.9530, tripId: 'trip-2'),
          stop(2, 'Waypoint Fresh - Veyangoda', '09:00-11:00', at(9, 30),
              7.1600, 80.0980, tripId: 'trip-2'),
        ],
      ),
    ];
  }
}
```

`lib/features/trips/data/trips_providers.dart`:
```dart
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../domain/trip.dart';
import '../domain/vehicle.dart';
import 'mock_trips_repository.dart';
import 'trips_repository.dart';

/// Swap this one provider for an API-backed implementation later.
final tripsRepositoryProvider =
    Provider<TripsRepository>((ref) => MockTripsRepository());

final vehicleProvider = FutureProvider<Vehicle>(
    (ref) => ref.watch(tripsRepositoryProvider).getVehicle());

final tripsProvider = FutureProvider<List<Trip>>(
    (ref) => ref.watch(tripsRepositoryProvider).getTrips());
```

- [ ] **Step 5: Run to verify pass**

Run: `flutter test test/features/trips && flutter analyze` → PASS, no issues.

- [ ] **Step 6: Commit**

```bash
git add mobile/driver_app
git commit -m "feat(driver): add trips domain and mock repository"
```

---

### Task 4: Notifications domain and mock repository

**Files:**
- Create: `lib/features/notifications/domain/app_notification.dart`
- Create: `lib/features/notifications/data/notifications_repository.dart`, `mock_notifications_repository.dart`, `notifications_providers.dart`
- Test: `test/features/notifications/mock_notifications_repository_test.dart`

**Interfaces:**
- Produces:
  - `enum NotificationSeverity { error, warning, info, success }`
  - `AppNotification({id, title, body, createdAt, severity, tripId?, actionLabel?, footnote?})`
  - `abstract interface class NotificationsRepository { Future<List<AppNotification>> getNotifications(); }` (newest first)
  - `MockNotificationsRepository({Duration latency = const Duration(milliseconds: 400), DateTime Function()? now})`
  - `notificationsRepositoryProvider`, `notificationsProvider` (`FutureProvider<List<AppNotification>>`)

- [ ] **Step 1: Write failing test**

`test/features/notifications/mock_notifications_repository_test.dart`:
```dart
import 'package:driver_app/features/notifications/data/mock_notifications_repository.dart';
import 'package:driver_app/features/notifications/domain/app_notification.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test('seeds the four Figma cards, newest first', () async {
    final repo = MockNotificationsRepository(
        latency: Duration.zero, now: () => DateTime(2026, 9, 29, 9, 0));
    final list = await repo.getNotifications();

    expect(list.length, 4);
    expect(list.first.severity, NotificationSeverity.error);
    expect(list.first.title, 'Trip 1 stop sequence updated');
    expect(list.first.actionLabel, 'Review changes');
    expect(list.where((n) => n.severity == NotificationSeverity.error).length, 1);

    for (var i = 1; i < list.length; i++) {
      expect(list[i].createdAt.isBefore(list[i - 1].createdAt), isTrue);
    }
  });
}
```

- [ ] **Step 2: Run to verify failure**

Run: `flutter test test/features/notifications` → FAIL.

- [ ] **Step 3: Implement**

`lib/features/notifications/domain/app_notification.dart`:
```dart
enum NotificationSeverity { error, warning, info, success }

class AppNotification {
  const AppNotification({
    required this.id,
    required this.title,
    required this.body,
    required this.createdAt,
    required this.severity,
    this.tripId,
    this.actionLabel,
    this.footnote,
  });

  final String id;
  final String title;
  final String body;
  final DateTime createdAt;
  final NotificationSeverity severity;
  final String? tripId;
  final String? actionLabel;
  final String? footnote;
}
```

`lib/features/notifications/data/notifications_repository.dart`:
```dart
import '../domain/app_notification.dart';

abstract interface class NotificationsRepository {
  /// Newest first.
  Future<List<AppNotification>> getNotifications();
}
```

`lib/features/notifications/data/mock_notifications_repository.dart`:
```dart
import '../domain/app_notification.dart';
import 'notifications_repository.dart';

class MockNotificationsRepository implements NotificationsRepository {
  MockNotificationsRepository({
    this.latency = const Duration(milliseconds: 400),
    DateTime Function()? now,
  }) : _now = now ?? DateTime.now;

  final Duration latency;
  final DateTime Function() _now;

  @override
  Future<List<AppNotification>> getNotifications() async {
    await Future<void>.delayed(latency);
    final now = _now();
    final yesterday = DateTime(now.year, now.month, now.day - 1);
    return [
      AppNotification(
        id: 'n1',
        title: 'Trip 1 stop sequence updated',
        body: 'The dispatcher changed the delivery order. '
            'Review the latest sequence before departure.',
        createdAt: now.subtract(const Duration(minutes: 2)),
        severity: NotificationSeverity.error,
        tripId: 'trip-1',
        actionLabel: 'Review changes',
      ),
      AppNotification(
        id: 'n2',
        title: 'Loading started for Trip 1',
        body: 'The loading team is preparing your 4 stops. '
            'Loading is still in progress.',
        createdAt: now.subtract(const Duration(minutes: 8)),
        severity: NotificationSeverity.warning,
        tripId: 'trip-1',
        actionLabel: 'View trip',
      ),
      AppNotification(
        id: 'n3',
        title: 'Trip 2 assigned',
        body: 'Fresh deliveries · Gampaha',
        footnote: '2 stops · Planned departure 07:00 AM',
        createdAt: DateTime(yesterday.year, yesterday.month, yesterday.day, 17, 20),
        severity: NotificationSeverity.info,
        tripId: 'trip-2',
        actionLabel: 'View trip',
      ),
      AppNotification(
        id: 'n4',
        title: 'Latest trip saved offline',
        body: 'Trip 2 details are available on this device without a connection.',
        footnote: 'Map availability depends on downloaded map data.',
        createdAt: DateTime(yesterday.year, yesterday.month, yesterday.day, 17, 15),
        severity: NotificationSeverity.success,
      ),
    ];
  }
}
```

`lib/features/notifications/data/notifications_providers.dart`:
```dart
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../domain/app_notification.dart';
import 'mock_notifications_repository.dart';
import 'notifications_repository.dart';

final notificationsRepositoryProvider = Provider<NotificationsRepository>(
    (ref) => MockNotificationsRepository());

final notificationsProvider = FutureProvider<List<AppNotification>>(
    (ref) => ref.watch(notificationsRepositoryProvider).getNotifications());
```

- [ ] **Step 4: Run to verify pass**

Run: `flutter test test/features/notifications && flutter analyze` → PASS.

- [ ] **Step 5: Commit**

```bash
git add mobile/driver_app
git commit -m "feat(driver): add notifications domain and mock repository"
```

---

### Task 5: Auth domain, mock repository, controller and validators

**Files:**
- Create: `lib/features/auth/domain/driver.dart`
- Create: `lib/features/auth/data/auth_repository.dart`, `mock_auth_repository.dart`, `auth_providers.dart`
- Create: `lib/features/auth/presentation/auth_controller.dart`, `validators.dart`
- Test: `test/features/auth/mock_auth_repository_test.dart`, `test/features/auth/validators_test.dart`

**Interfaces:**
- Produces:
  - `Driver({id, name, code, depot})` + `String initials`
  - `class AuthException implements Exception { final String message; }`
  - `abstract interface class AuthRepository { Future<Driver?> currentDriver(); Future<Driver> login({required String email, required String password}); Future<Driver> signUp({required String name, required String email, required String password}); Future<void> logout(); }`
  - `MockAuthRepository({Duration latency = const Duration(milliseconds: 600)})`; `MockAuthRepository.demoDriver`
  - `authRepositoryProvider`; `authControllerProvider` = `AsyncNotifierProvider<AuthController, Driver?>`; `AuthController.login({email,password})`, `.signUp({name,email,password})`, `.logout()` — `login`/`signUp` rethrow `AuthException` and leave state unchanged on failure
  - Validators (return `String?`, null = valid): `validateEmail`, `validatePassword`, `validateName`, `validateConfirm(String? confirm, String password)`

- [ ] **Step 1: Write failing tests**

`test/features/auth/validators_test.dart`:
```dart
import 'package:driver_app/features/auth/presentation/validators.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test('validateEmail', () {
    expect(validateEmail(null), 'Enter a valid email');
    expect(validateEmail(''), 'Enter a valid email');
    expect(validateEmail('   '), 'Enter a valid email');
    expect(validateEmail('bad'), 'Enter a valid email');
    expect(validateEmail('a@b'), 'Enter a valid email');
    expect(validateEmail(' nimal@waypoint.lk '), isNull);
  });

  test('validatePassword', () {
    expect(validatePassword(null), 'Password must be at least 6 characters');
    expect(validatePassword('12345'), 'Password must be at least 6 characters');
    expect(validatePassword('123456'), isNull);
  });

  test('validateName', () {
    expect(validateName(null), 'Enter your name');
    expect(validateName('   '), 'Enter your name');
    expect(validateName('Nimal'), isNull);
  });

  test('validateConfirm', () {
    expect(validateConfirm('abc', 'abcdef'), 'Passwords do not match');
    expect(validateConfirm('abcdef', 'abcdef'), isNull);
  });
}
```

`test/features/auth/mock_auth_repository_test.dart`:
```dart
import 'package:driver_app/features/auth/data/auth_repository.dart';
import 'package:driver_app/features/auth/data/mock_auth_repository.dart';
import 'package:flutter_test/flutter_test.dart';

MockAuthRepository repo() => MockAuthRepository(latency: Duration.zero);

void main() {
  test('login returns the demo driver and sets the session', () async {
    final r = repo();
    expect(await r.currentDriver(), isNull);
    final d = await r.login(email: 'x@y.lk', password: 'secret1');
    expect(d.name, 'Nimal Silva');
    expect(d.initials, 'NS');
    expect((await r.currentDriver())!.code, 'DRV021');
  });

  test('login rejects a short password', () async {
    expect(() => repo().login(email: 'x@y.lk', password: '123'),
        throwsA(isA<AuthException>()));
  });

  test('signUp then login returns the new driver; logout clears session',
      () async {
    final r = repo();
    final created =
        await r.signUp(name: 'Kasun Perera', email: 'K@y.lk', password: 'secret1');
    expect(created.name, 'Kasun Perera');
    expect(created.initials, 'KP');
    final again = await r.login(email: 'k@y.lk', password: 'secret1');
    expect(again.id, created.id);
    await r.logout();
    expect(await r.currentDriver(), isNull);
  });

  test('signUp with an existing email throws AuthException', () async {
    final r = repo();
    await r.signUp(name: 'A B', email: 'a@b.lk', password: 'secret1');
    expect(() => r.signUp(name: 'C D', email: 'A@B.lk', password: 'secret1'),
        throwsA(isA<AuthException>()));
  });
}
```

- [ ] **Step 2: Run to verify failure**

Run: `flutter test test/features/auth` → FAIL.

- [ ] **Step 3: Implement**

`lib/features/auth/domain/driver.dart`:
```dart
class Driver {
  const Driver({
    required this.id,
    required this.name,
    required this.code,
    required this.depot,
  });

  final String id;
  final String name;
  final String code;
  final String depot;

  String get initials {
    final parts = name.trim().split(RegExp(r'\s+')).where((p) => p.isNotEmpty);
    return parts.take(2).map((p) => p[0].toUpperCase()).join();
  }
}
```

`lib/features/auth/data/auth_repository.dart`:
```dart
import '../domain/driver.dart';

class AuthException implements Exception {
  const AuthException(this.message);

  final String message;

  @override
  String toString() => message;
}

abstract interface class AuthRepository {
  Future<Driver?> currentDriver();
  Future<Driver> login({required String email, required String password});
  Future<Driver> signUp({
    required String name,
    required String email,
    required String password,
  });
  Future<void> logout();
}
```

`lib/features/auth/data/mock_auth_repository.dart`:
```dart
import '../domain/driver.dart';
import 'auth_repository.dart';

class MockAuthRepository implements AuthRepository {
  MockAuthRepository({this.latency = const Duration(milliseconds: 600)});

  static const demoDriver = Driver(
    id: 'drv-021',
    name: 'Nimal Silva',
    code: 'DRV021',
    depot: 'Peliyagoda depot',
  );

  final Duration latency;
  final Map<String, Driver> _registered = {};
  Driver? _current;

  Future<void> _wait() => Future<void>.delayed(latency);
  String _key(String email) => email.trim().toLowerCase();

  @override
  Future<Driver?> currentDriver() async {
    await _wait();
    return _current;
  }

  @override
  Future<Driver> login({required String email, required String password}) async {
    await _wait();
    if (password.length < 6) {
      throw const AuthException('Invalid email or password');
    }
    return _current = _registered[_key(email)] ?? demoDriver;
  }

  @override
  Future<Driver> signUp({
    required String name,
    required String email,
    required String password,
  }) async {
    await _wait();
    final key = _key(email);
    if (_registered.containsKey(key)) {
      throw const AuthException('This email is already registered');
    }
    final n = _registered.length + 1;
    final driver = Driver(
      id: 'drv-${100 + n}',
      name: name.trim(),
      code: 'DRV${100 + n}',
      depot: 'Peliyagoda depot',
    );
    _registered[key] = driver;
    return _current = driver;
  }

  @override
  Future<void> logout() async {
    await _wait();
    _current = null;
  }
}
```

`lib/features/auth/data/auth_providers.dart`:
```dart
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'auth_repository.dart';
import 'mock_auth_repository.dart';

final authRepositoryProvider =
    Provider<AuthRepository>((ref) => MockAuthRepository());
```

`lib/features/auth/presentation/auth_controller.dart`:
```dart
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../data/auth_providers.dart';
import '../domain/driver.dart';

/// State is the signed-in driver, or null when signed out. `login`/`signUp`
/// throw AuthException on failure and leave state untouched so the form can
/// show the message itself.
class AuthController extends AsyncNotifier<Driver?> {
  @override
  Future<Driver?> build() => ref.read(authRepositoryProvider).currentDriver();

  Future<void> login({required String email, required String password}) async {
    final driver = await ref
        .read(authRepositoryProvider)
        .login(email: email, password: password);
    state = AsyncData(driver);
  }

  Future<void> signUp({
    required String name,
    required String email,
    required String password,
  }) async {
    final driver = await ref
        .read(authRepositoryProvider)
        .signUp(name: name, email: email, password: password);
    state = AsyncData(driver);
  }

  Future<void> logout() async {
    await ref.read(authRepositoryProvider).logout();
    state = const AsyncData(null);
  }
}

final authControllerProvider =
    AsyncNotifierProvider<AuthController, Driver?>(AuthController.new);
```

`lib/features/auth/presentation/validators.dart`:
```dart
String? validateEmail(String? v) {
  final value = (v ?? '').trim();
  return RegExp(r'^[^@\s]+@[^@\s]+\.[^@\s]+$').hasMatch(value)
      ? null
      : 'Enter a valid email';
}

String? validatePassword(String? v) =>
    (v ?? '').length >= 6 ? null : 'Password must be at least 6 characters';

String? validateName(String? v) =>
    (v ?? '').trim().isEmpty ? 'Enter your name' : null;

String? validateConfirm(String? confirm, String password) =>
    confirm == password ? null : 'Passwords do not match';
```

- [ ] **Step 4: Run to verify pass**

Run: `flutter test test/features/auth && flutter analyze` → PASS.

- [ ] **Step 5: Commit**

```bash
git add mobile/driver_app
git commit -m "feat(driver): add mock auth, controller and validators"
```

---

### Task 6: Router, shell, splash, login, sign-up and placeholder tabs

**Files:**
- Create: `lib/app.dart`, `lib/core/router/app_router.dart`, `lib/core/router/app_shell.dart`
- Create: `lib/features/auth/presentation/splash_screen.dart`, `auth_scaffold.dart`, `login_screen.dart`, `signup_screen.dart`
- Create: `lib/features/trips/presentation/my_trips_screen.dart` (placeholder), `lib/features/notifications/presentation/updates_screen.dart` (placeholder), `lib/features/account/presentation/account_screen.dart` (placeholder + sign out)
- Modify: `lib/main.dart`
- Test: `test/app_flow_test.dart`

**Interfaces:**
- Consumes: `authControllerProvider`, `authRepositoryProvider`, `AuthException`, validators, `tripsProvider`, `notificationsProvider`, `AsyncValueView`, `PrimaryButton`, `WaypointLogo`, `AppTheme`.
- Produces: `splashDurationProvider` (`Provider<Duration>`, default 1600 ms); `routerProvider` (`Provider<GoRouter>`); routes `/splash`, `/login`, `/signup`, shell tabs `/trips`, `/updates`, `/account`; `WaypointDriverApp` widget. Later screen plans replace the three placeholder screens (same class names/paths) and add pushed routes above the shell.

- [ ] **Step 1: Write failing flow test**

`test/app_flow_test.dart`:
```dart
import 'package:driver_app/app.dart';
import 'package:driver_app/core/router/app_router.dart';
import 'package:driver_app/features/auth/data/auth_providers.dart';
import 'package:driver_app/features/auth/data/mock_auth_repository.dart';
import 'package:driver_app/features/notifications/data/mock_notifications_repository.dart';
import 'package:driver_app/features/notifications/data/notifications_providers.dart';
import 'package:driver_app/features/trips/data/mock_trips_repository.dart';
import 'package:driver_app/features/trips/data/trips_providers.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

Widget buildApp() => ProviderScope(
      overrides: [
        authRepositoryProvider
            .overrideWithValue(MockAuthRepository(latency: Duration.zero)),
        tripsRepositoryProvider
            .overrideWithValue(MockTripsRepository(latency: Duration.zero)),
        notificationsRepositoryProvider.overrideWithValue(
            MockNotificationsRepository(latency: Duration.zero)),
        splashDurationProvider.overrideWithValue(Duration.zero),
      ],
      child: const WaypointDriverApp(),
    );

Future<void> signIn(WidgetTester tester) async {
  await tester.enterText(find.byKey(const Key('email')), 'nimal@waypoint.lk');
  await tester.enterText(find.byKey(const Key('password')), 'secret1');
  await tester.tap(find.text('Sign in'));
  await tester.pumpAndSettle();
}

void main() {
  testWidgets('splash goes to login when signed out', (tester) async {
    await tester.pumpWidget(buildApp());
    await tester.pumpAndSettle();
    expect(find.byKey(const Key('waypoint-logo')), findsOneWidget);
    expect(find.text('Sign in'), findsWidgets);
    expect(find.byKey(const Key('email')), findsOneWidget);
  });

  testWidgets('invalid login shows inline validation and stays', (tester) async {
    await tester.pumpWidget(buildApp());
    await tester.pumpAndSettle();
    await tester.enterText(find.byKey(const Key('email')), '   ');
    await tester.enterText(find.byKey(const Key('password')), '123');
    await tester.tap(find.text('Sign in').last);
    await tester.pumpAndSettle();
    expect(find.text('Enter a valid email'), findsOneWidget);
    expect(find.text('Password must be at least 6 characters'), findsOneWidget);
    expect(find.byKey(const Key('email')), findsOneWidget);
  });

  testWidgets('login lands on trips, tabs work, sign out returns to login',
      (tester) async {
    await tester.pumpWidget(buildApp());
    await tester.pumpAndSettle();
    await signIn(tester);

    expect(find.text('Trip 1'), findsOneWidget);

    await tester.tap(find.text('Updates'));
    await tester.pumpAndSettle();
    expect(find.text('Trip 1 stop sequence updated'), findsOneWidget);

    await tester.tap(find.text('Account'));
    await tester.pumpAndSettle();
    expect(find.text('Nimal Silva'), findsOneWidget);

    await tester.tap(find.text('Sign out'));
    await tester.pumpAndSettle();
    expect(find.byKey(const Key('email')), findsOneWidget);
    expect(find.text('Account'), findsNothing); // shell not reachable
  });

  testWidgets('sign up with a registered email shows an error and stays',
      (tester) async {
    await tester.pumpWidget(buildApp());
    await tester.pumpAndSettle();

    Future<void> submitSignUp() async {
      await tester.enterText(find.byKey(const Key('name')), 'Kasun Perera');
      await tester.enterText(find.byKey(const Key('email')), 'k@y.lk');
      await tester.enterText(find.byKey(const Key('password')), 'secret1');
      await tester.enterText(find.byKey(const Key('confirm')), 'secret1');
      await tester.tap(find.text('Create account').last);
      await tester.pumpAndSettle();
    }

    await tester.tap(find.text('Create account'));
    await tester.pumpAndSettle();
    await submitSignUp(); // first time succeeds -> shell
    expect(find.text('Trip 1'), findsOneWidget);

    await tester.tap(find.text('Account'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Sign out'));
    await tester.pumpAndSettle();

    await tester.tap(find.text('Create account'));
    await tester.pumpAndSettle();
    await submitSignUp(); // duplicate
    expect(find.text('This email is already registered'), findsOneWidget);
    expect(find.byKey(const Key('confirm')), findsOneWidget);
  });
}
```

- [ ] **Step 2: Run to verify failure**

Run: `flutter test test/app_flow_test.dart` → FAIL (missing files).

- [ ] **Step 3: Implement auth screens**

`lib/features/auth/presentation/splash_screen.dart`:
```dart
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/router/app_router.dart';
import '../../../core/widgets/waypoint_logo.dart';
import 'auth_controller.dart';

class SplashScreen extends ConsumerStatefulWidget {
  const SplashScreen({super.key});

  @override
  ConsumerState<SplashScreen> createState() => _SplashScreenState();
}

class _SplashScreenState extends ConsumerState<SplashScreen> {
  @override
  void initState() {
    super.initState();
    _next();
  }

  Future<void> _next() async {
    final minimum = Future<void>.delayed(ref.read(splashDurationProvider));
    final driver = await ref.read(authControllerProvider.future);
    await minimum;
    if (!mounted) return;
    context.go(driver != null ? '/trips' : '/login');
  }

  @override
  Widget build(BuildContext context) {
    return const Scaffold(
      body: Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            WaypointLogo(size: 96),
            SizedBox(height: 16),
            Text('Waypoint',
                style: TextStyle(fontSize: 28, fontWeight: FontWeight.w800)),
            Text('Driver'),
          ],
        ),
      ),
    );
  }
}
```

`lib/features/auth/presentation/auth_scaffold.dart`:
```dart
import 'package:flutter/material.dart';

import '../../../core/theme/app_colors.dart';
import '../../../core/widgets/waypoint_logo.dart';

class AuthScaffold extends StatelessWidget {
  const AuthScaffold({
    super.key,
    required this.title,
    required this.subtitle,
    required this.children,
  });

  final String title;
  final String subtitle;
  final List<Widget> children;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(24),
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 420),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  const Align(
                      alignment: Alignment.centerLeft,
                      child: WaypointLogo(size: 56)),
                  const SizedBox(height: 24),
                  Text(title,
                      style: const TextStyle(
                          fontSize: 32, fontWeight: FontWeight.w800)),
                  const SizedBox(height: 4),
                  Text(subtitle,
                      style: const TextStyle(color: AppColors.inkMuted)),
                  const SizedBox(height: 24),
                  ...children,
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
```

`lib/features/auth/presentation/login_screen.dart`:
```dart
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/theme/app_colors.dart';
import '../../../core/widgets/primary_button.dart';
import '../data/auth_repository.dart';
import 'auth_controller.dart';
import 'auth_scaffold.dart';
import 'validators.dart';

class LoginScreen extends ConsumerStatefulWidget {
  const LoginScreen({super.key});

  @override
  ConsumerState<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends ConsumerState<LoginScreen> {
  final _formKey = GlobalKey<FormState>();
  final _email = TextEditingController();
  final _password = TextEditingController();
  bool _busy = false;
  String? _error;

  @override
  void dispose() {
    _email.dispose();
    _password.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      await ref.read(authControllerProvider.notifier).login(
            email: _email.text.trim(),
            password: _password.text,
          );
    } on AuthException catch (e) {
      if (mounted) setState(() => _error = e.message);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return AuthScaffold(
      title: 'Sign in',
      subtitle: 'Welcome back, driver.',
      children: [
        Form(
          key: _formKey,
          child: Column(
            children: [
              TextFormField(
                key: const Key('email'),
                controller: _email,
                keyboardType: TextInputType.emailAddress,
                decoration: const InputDecoration(labelText: 'Email'),
                validator: validateEmail,
              ),
              const SizedBox(height: 16),
              TextFormField(
                key: const Key('password'),
                controller: _password,
                obscureText: true,
                decoration: const InputDecoration(labelText: 'Password'),
                validator: validatePassword,
              ),
            ],
          ),
        ),
        if (_error != null) ...[
          const SizedBox(height: 12),
          Text(_error!, style: const TextStyle(color: AppColors.danger)),
        ],
        const SizedBox(height: 24),
        PrimaryButton(label: 'Sign in', isLoading: _busy, onPressed: _submit),
        const SizedBox(height: 12),
        TextButton(
          onPressed: () => context.go('/signup'),
          child: const Text('Create account'),
        ),
      ],
    );
  }
}
```

`lib/features/auth/presentation/signup_screen.dart`:
```dart
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/theme/app_colors.dart';
import '../../../core/widgets/primary_button.dart';
import '../data/auth_repository.dart';
import 'auth_controller.dart';
import 'auth_scaffold.dart';
import 'validators.dart';

class SignUpScreen extends ConsumerStatefulWidget {
  const SignUpScreen({super.key});

  @override
  ConsumerState<SignUpScreen> createState() => _SignUpScreenState();
}

class _SignUpScreenState extends ConsumerState<SignUpScreen> {
  final _formKey = GlobalKey<FormState>();
  final _name = TextEditingController();
  final _email = TextEditingController();
  final _password = TextEditingController();
  final _confirm = TextEditingController();
  bool _busy = false;
  String? _error;

  @override
  void dispose() {
    _name.dispose();
    _email.dispose();
    _password.dispose();
    _confirm.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      await ref.read(authControllerProvider.notifier).signUp(
            name: _name.text.trim(),
            email: _email.text.trim(),
            password: _password.text,
          );
    } on AuthException catch (e) {
      if (mounted) setState(() => _error = e.message);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return AuthScaffold(
      title: 'Create account',
      subtitle: 'Set up your driver profile.',
      children: [
        Form(
          key: _formKey,
          child: Column(
            children: [
              TextFormField(
                key: const Key('name'),
                controller: _name,
                textCapitalization: TextCapitalization.words,
                decoration: const InputDecoration(labelText: 'Full name'),
                validator: validateName,
              ),
              const SizedBox(height: 16),
              TextFormField(
                key: const Key('email'),
                controller: _email,
                keyboardType: TextInputType.emailAddress,
                decoration: const InputDecoration(labelText: 'Email'),
                validator: validateEmail,
              ),
              const SizedBox(height: 16),
              TextFormField(
                key: const Key('password'),
                controller: _password,
                obscureText: true,
                decoration: const InputDecoration(labelText: 'Password'),
                validator: validatePassword,
              ),
              const SizedBox(height: 16),
              TextFormField(
                key: const Key('confirm'),
                controller: _confirm,
                obscureText: true,
                decoration:
                    const InputDecoration(labelText: 'Confirm password'),
                validator: (v) => validateConfirm(v, _password.text),
              ),
            ],
          ),
        ),
        if (_error != null) ...[
          const SizedBox(height: 12),
          Text(_error!, style: const TextStyle(color: AppColors.danger)),
        ],
        const SizedBox(height: 24),
        PrimaryButton(
            label: 'Create account', isLoading: _busy, onPressed: _submit),
        const SizedBox(height: 12),
        TextButton(
          onPressed: () => context.go('/login'),
          child: const Text('Sign in'),
        ),
      ],
    );
  }
}
```

- [ ] **Step 4: Implement placeholder tab screens**

`lib/features/trips/presentation/my_trips_screen.dart`:
```dart
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/widgets/async_value_view.dart';
import '../data/trips_providers.dart';

/// Placeholder — replaced by the My Trips screen plan.
class MyTripsScreen extends ConsumerWidget {
  const MyTripsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final trips = ref.watch(tripsProvider);
    return Scaffold(
      appBar: AppBar(title: const Text('My trips')),
      body: AsyncValueView(
        value: trips,
        onRetry: () => ref.invalidate(tripsProvider),
        isEmpty: (t) => t.isEmpty,
        emptyMessage: 'No trips assigned',
        data: (list) => ListView(
          children: [for (final t in list) ListTile(title: Text(t.name))],
        ),
      ),
    );
  }
}
```

`lib/features/notifications/presentation/updates_screen.dart`:
```dart
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/widgets/async_value_view.dart';
import '../data/notifications_providers.dart';

/// Placeholder — replaced by the Updates screen plan.
class UpdatesScreen extends ConsumerWidget {
  const UpdatesScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final items = ref.watch(notificationsProvider);
    return Scaffold(
      appBar: AppBar(title: const Text('Updates')),
      body: AsyncValueView(
        value: items,
        onRetry: () => ref.invalidate(notificationsProvider),
        isEmpty: (l) => l.isEmpty,
        emptyMessage: 'No updates',
        data: (list) => ListView(
          children: [for (final n in list) ListTile(title: Text(n.title))],
        ),
      ),
    );
  }
}
```

`lib/features/account/presentation/account_screen.dart`:
```dart
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/widgets/async_value_view.dart';
import '../../auth/presentation/auth_controller.dart';

/// Placeholder — replaced by the Account screen plan (keeps sign out).
class AccountScreen extends ConsumerWidget {
  const AccountScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final driver = ref.watch(authControllerProvider);
    return Scaffold(
      appBar: AppBar(title: const Text('Account')),
      body: AsyncValueView(
        value: driver,
        data: (d) => Column(
          children: [
            ListTile(
              title: Text(d?.name ?? ''),
              subtitle: Text('Driver · ${d?.code ?? ''}'),
            ),
            TextButton(
              onPressed: () =>
                  ref.read(authControllerProvider.notifier).logout(),
              child: const Text('Sign out'),
            ),
          ],
        ),
      ),
    );
  }
}
```

- [ ] **Step 5: Implement shell, router, app and main**

`lib/core/router/app_shell.dart`:
```dart
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

class AppShell extends StatelessWidget {
  const AppShell({super.key, required this.shell});

  final StatefulNavigationShell shell;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: shell,
      bottomNavigationBar: NavigationBar(
        selectedIndex: shell.currentIndex,
        onDestinationSelected: (i) =>
            shell.goBranch(i, initialLocation: i == shell.currentIndex),
        destinations: const [
          NavigationDestination(
              icon: Icon(Icons.map_outlined),
              selectedIcon: Icon(Icons.map),
              label: 'My trips'),
          NavigationDestination(
              icon: Icon(Icons.notifications_outlined),
              selectedIcon: Icon(Icons.notifications),
              label: 'Updates'),
          NavigationDestination(
              icon: Icon(Icons.person_outline),
              selectedIcon: Icon(Icons.person),
              label: 'Account'),
        ],
      ),
    );
  }
}
```

`lib/core/router/app_router.dart`:
```dart
import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../features/account/presentation/account_screen.dart';
import '../../features/auth/presentation/auth_controller.dart';
import '../../features/auth/presentation/login_screen.dart';
import '../../features/auth/presentation/signup_screen.dart';
import '../../features/auth/presentation/splash_screen.dart';
import '../../features/notifications/presentation/updates_screen.dart';
import '../../features/trips/presentation/my_trips_screen.dart';
import 'app_shell.dart';

final splashDurationProvider =
    Provider<Duration>((ref) => const Duration(milliseconds: 1600));

const _publicRoutes = {'/splash', '/login', '/signup'};

final routerProvider = Provider<GoRouter>((ref) {
  final refresh = ValueNotifier<int>(0);
  ref.listen(authControllerProvider, (_, __) => refresh.value++);
  ref.onDispose(refresh.dispose);

  return GoRouter(
    initialLocation: '/splash',
    refreshListenable: refresh,
    redirect: (context, state) {
      final auth = ref.read(authControllerProvider);
      if (auth.isLoading) return null;
      final loggedIn = auth.hasValue && auth.value != null;
      final loc = state.matchedLocation;
      if (loc == '/splash') return null;
      if (!loggedIn && !_publicRoutes.contains(loc)) return '/login';
      if (loggedIn && (loc == '/login' || loc == '/signup')) return '/trips';
      return null;
    },
    routes: [
      GoRoute(path: '/splash', builder: (_, __) => const SplashScreen()),
      GoRoute(path: '/login', builder: (_, __) => const LoginScreen()),
      GoRoute(path: '/signup', builder: (_, __) => const SignUpScreen()),
      StatefulShellRoute.indexedStack(
        builder: (_, __, shell) => AppShell(shell: shell),
        branches: [
          StatefulShellBranch(routes: [
            GoRoute(path: '/trips', builder: (_, __) => const MyTripsScreen()),
          ]),
          StatefulShellBranch(routes: [
            GoRoute(path: '/updates', builder: (_, __) => const UpdatesScreen()),
          ]),
          StatefulShellBranch(routes: [
            GoRoute(path: '/account', builder: (_, __) => const AccountScreen()),
          ]),
        ],
      ),
    ],
  );
});
```

`lib/app.dart`:
```dart
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'core/router/app_router.dart';
import 'core/theme/app_theme.dart';

class WaypointDriverApp extends ConsumerWidget {
  const WaypointDriverApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return MaterialApp.router(
      title: 'Waypoint Driver',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.light,
      routerConfig: ref.watch(routerProvider),
    );
  }
}
```

`lib/main.dart`:
```dart
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'app.dart';

void main() {
  runApp(const ProviderScope(child: WaypointDriverApp()));
}
```

- [ ] **Step 6: Run to verify pass**

Run: `flutter test && flutter analyze` → all tests pass, no issues.
If a flow assertion fails only because `find.text('Sign in')` matches both the title and the button, keep the `.last` / `findsWidgets` forms already used in the test; do not weaken the assertions.

- [ ] **Step 7: Commit**

```bash
git add mobile/driver_app
git commit -m "feat(driver): add router, shell, splash, login and sign-up"
```

---

### Task 7: Run on a device, README and spec touch-up

**Files:**
- Create: `mobile/driver_app/README.md`
- Modify: `docs/superpowers/specs/2026-09-29-driver-app-design.md` (models line)

- [ ] **Step 1: Amend the spec**

In the spec's Architecture section change
`Models: plain immutable Dart classes with fromJson, shaped like the likely API payloads. No codegen.`
to
`Models: plain immutable Dart classes, no codegen. fromJson is added per model when the API is connected (payload shapes are not known yet).`

- [ ] **Step 2: Write README**

`mobile/driver_app/README.md`:
```markdown
# Waypoint Driver App

Flutter app for delivery drivers (competition build, UI + mock data).

## Run
    flutter pub get
    flutter run

## Structure
- `lib/core/` theme, shared widgets, router
- `lib/features/<name>/{domain,data,presentation}`
- Data comes from `Mock…Repository` classes; to connect the API, change the
  `…RepositoryProvider` in each feature's `data/*_providers.dart`.

## Demo login
Any email with a password of 6+ characters signs in as Nimal Silva (DRV021).
Sign up creates an in-memory driver.
```

- [ ] **Step 3: Launch and eyeball**

Run: `flutter run` on an emulator/Chrome-less Android device (or `flutter run -d windows` is NOT enabled; use an Android emulator). Expected: splash with logo → login → sign in → 3 tabs show Trip 1/Trip 2, updates list, account with Sign out.

- [ ] **Step 4: Final verification and commit**

Run: `flutter analyze && flutter test` → clean and green.
```bash
git add mobile/driver_app/README.md docs/superpowers/specs
git commit -m "docs(driver): add README and align spec on fromJson"
```

---

## Self-Review Notes

- **Spec coverage:** splash ✔ (T6), login/sign-up ✔ (T5–6), shell + 3 tabs ✔ (T6), mock repos for trips/notifications/auth ✔ (T3–5), design tokens + shared widgets ✔ (T2; `TripCard`, `InfoTile`, `OrderChip`, `NotificationCard`, `ProgressStops`, `BottomSheetPanel` are built by their screen's plan, where the design defines them), Online pill long-press hook ✔ (`StatusPill.onLongPress`; the offline toggle provider lands with the My Trips plan), maps/navigation/screens → later per-screen plans.
- **Types consistent:** `Trip.nextStop/completedStops`, `TripsRepository.markArrived`, `AuthController.login/signUp/logout`, `splashDurationProvider` used identically across tasks.
