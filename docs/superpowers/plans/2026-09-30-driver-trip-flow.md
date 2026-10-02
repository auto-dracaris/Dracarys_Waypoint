# Driver Trip Flow (9 screens) Implementation Plan

> Executed inline, TDD per task. This plan is design-level (structure, interfaces, behaviour, tests);
> exact layout/colours are read from Figma per screen at build time (`get_design_context`), so the
> code is not duplicated here.

**Goal:** Build the driver's trip flow from the Figma frames: trip overview, stop info (+orders), navigation
preview, arrived, proof of delivery, report issue, route update, offline. 3D turn-by-turn (921:30621) is out.

**Approved decisions:** `flutter_map` + OSM tiles (drawn polyline, numbered markers); signature is a real
drawing pad, photo is a mocked sample image; three stacked PRs.

**Spec:** `docs/superpowers/specs/2026-09-29-driver-app-design.md`

## Global constraints
- Same architecture as before: `domain` / `data` (abstract repo + Mock + provider) / `presentation`. UI only, mock data.
- Screens depend on repository interfaces via providers; shared UI lives in `core/widgets`, no feature logic there.
- Tokens only via `AppColors` / `AppText`; assets exported from Figma into `assets/images/`.
- Map tiles are switchable (`mapTilesEnabledProvider`, tests turn them off). Android manifest gets INTERNET.
- `flutter analyze` clean and `flutter test` green before each commit. Emulator check against Figma per chunk.

## Routes (all inside the My trips shell branch, so the bottom nav stays)
```
/trips                                   MyTripsScreen
/trips/trip/:tripId                      TripOverviewScreen      (pre-departure, "All stops")
/trips/trip/:tripId/offline              OfflineTripScreen
/trips/trip/:tripId/stop/:stopId         StopInfoScreen          (View orders toggles expanded list)
  .../navigate                           NavigationPreviewScreen
  .../arrived                            ArrivedScreen
  .../proof                              ProofOfDeliveryScreen
  .../issue/:orderId                     ReportIssueScreen
/updates/route-update/:tripId            RouteUpdateScreen       (Updates branch)
```
`tripDestination(trip, online)`: offline → `/offline`; loading/ready → overview; in progress → next stop.

## Domain / data additions (mock)
- `Stop`: `arrivedAt`, `contactPhone`, `etaMinutes`, `distanceKm`; `StopStatus {pending, arrived, completed}`.
- `Order`: `deliveredCases`, `handling` note. `Trip`: `planVersion`, `updatedAt`, `shortfall` (`ShortfallReport`).
- `TripsRepository`: `startTrip`, `markArrived` (stop -> arrived + time), `completeStop(tripId, stopId, DeliveryRecord)`,
  `simulateLoadingComplete` (demo hook: long-press the loading banner), `getRouteChange`, `acknowledgeRouteChange`.
- `RecordsRepository` (offline saved records: arrival / issue / proof, each `savedOnPhone|waitingToSync`).
- `DeliveryDraft` (per-stop working state: delivered qty, staff name, signature strokes / photo, notes) in a provider.

## Chunk A — shared UI + stop flow  (branch `feat/stop-flow`, PR into `feat/notifications-screen`)
1. **Shared widgets** (tests first): `AppButton` (filled / outlined / danger / dangerOutlined, optional icon,
   loading), `BackBar`, `VehicleChip`, `StopProgressBar`, `StopStepper`, `InfoTile`, `IconRow`, `TempChip`,
   `Notice` (yellow/red/green/blue/grey), `QuantityStepper`, `BottomSheetPanel`, `MapView` (+ numbered markers, route).
2. **Data**: model/mock changes above for stops, `markArrived`, `startTrip`; update existing tests.
3. **StopInfoScreen** (+ orders expanded), **NavigationPreviewScreen**, **ArrivedScreen** (+ draft provider).
4. Routing + wire "View trip" on My Trips and notification actions; tests: happy path, order expansion,
   Mark arrived advances to Arrived, stepper bounds (0..planned+? cannot go below 0).

## Chunk B — delivery completion  (branch `feat/delivery-completion`, PR into chunk A)
1. Shared: `LabeledTextField`, `ToggleTabs` (Signature/Photo), `SignaturePad`, `PhotoTile`, `DropdownField`.
2. **ProofOfDeliveryScreen**: summary from draft, staff name required, signature or photo required, notes,
   Complete stop -> completeStop -> next stop (or trip completed). **ReportIssueScreen**: breakdown, type, qty
   (1..planned), note, mock photo, Save -> record + back.
3. Tests: validation (missing name/signature blocks completion), totals, issue quantity bounds, completing the last stop.

## Chunk C — overview, route update, offline  (branch `feat/trip-overview-offline`, PR into chunk B)
1. **TripOverviewScreen** (loading vs ready states, shortfall, unloading sequence, Ready to depart; demo hook).
2. **RouteUpdateScreen** (previous vs new order, impact, acknowledge). **OfflineTripScreen** (records list, badges).
3. Wire notifications ("Review changes" -> route update), offline destination, README update. Tests per screen.

## Review focus (behaviours the frames don't spell out)
- Stepper never goes below 0 or above the planned quantity; Complete stop with no signature/photo is blocked.
- Marking arrived twice / completing an already completed stop is a no-op, not a crash.
- Opening a stop/trip id that doesn't exist shows an error view, not a red screen.
- Offline: actions still work and appear in saved records as "Waiting to sync".
- Route change acknowledged once can't be acknowledged again.
