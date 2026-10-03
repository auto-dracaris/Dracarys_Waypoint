# Driver App — Backend API Requirements

Everything the Waypoint driver app needs from the backend to run end to end
with no mocks. Today the app talks to in-memory mock repositories
(`lib/features/*/data/mock_*_repository.dart`); each section says which
repository interface the endpoints replace, so wiring the API is "write an
`ApiXRepository` that implements the same interface and swap the provider".

This document was written against the real `api/` project (NestJS + TypeORM +
PostgreSQL, see `api/CLAUDE.md`). Where it proposes something new it follows
that project's conventions.

Legend: ✅ exists in `api/` today · 🔁 exists but must change · 🆕 must be built

## 0. Ground rules (from the existing API)

**Base URL** — `main.ts` sets the global prefix `api` and the port defaults to
`5000` (`api/.env`). Every path below is relative to it:

| Where the app runs | Base URL |
|---|---|
| Android emulator | `http://10.0.2.2:5000/api` |
| iOS simulator / desktop | `http://localhost:5000/api` |
| Physical device (dev) | `http://<your-LAN-ip>:5000/api` |

Health check: ✅ `GET /api/health`.

**Android dev gotcha:** Android 9+ blocks plain `http://` unless the manifest
allows it, and the debug manifest
(`android/app/src/debug/AndroidManifest.xml`) currently only declares `INTERNET`.
For local development add `android:usesCleartextTraffic="true"` to the
`<application>` element in the **debug** manifest only; production must use
HTTPS. Make the base URL build-time config
(`--dart-define=API_BASE_URL=http://10.0.2.2:5000/api`).

**One envelope for everything**, success and error (`ApiResponseDto`):

```json
{ "statusCode": 200, "message": "Logged in successfully", "data": { } }
```

- List endpoints: `data = { "items": [...], "meta": { "total", "page", "limit", "totalPages" } }`,
  query `?page=1&limit=10` (`PaginationQueryDto`: page ≥ 1, limit 1–100, default 10).
- Errors use the same shape. For validation errors `message` is the *first*
  problem and `data` is the full array of messages.
- Common messages the app should surface as-is: `Invalid email or password`,
  `This account is not active`.

**Strict request bodies.** The global `ValidationPipe` runs with
`whitelist: true, forbidNonWhitelisted: true, transform: true`. Any field that
is not declared in the endpoint's DTO is rejected with **400**. So the app must
send exactly the documented fields, and every DTO below must declare all of
them (with a custom `message` per rule, per the API's conventions).

**Auth** — `Authorization: Bearer <accessToken>`. Access token lifetime `1d`,
refresh token `30d`; refresh **rotates** (the old session is revoked, replaying
an old refresh token fails). A token is only honoured while its
`user_sessions` row is live, so logout takes effect immediately. On `401` the
app refreshes once and retries; if that fails it signs out.

**Authorisation.** Routes use `@UseGuards(JwtAuthGuard, PermissionsGuard)` +
`@Permissions(...)` (OR semantics). Permissions are granted **directly to a
user** — there are *no role defaults*, and only `dispatcher` bypasses checks.
Consequence for this app: every new driver endpoint needs (a) a permission
string in `PERMISSIONS` (`src/common/constants/permissions.constant.ts`), (b) a
seed migration row (otherwise the guard fails closed for non-dispatchers), and
(c) that permission granted to each driver user. The existing
`PUT /api/permissions/users/:userId` (`permission.manage`, dispatcher bypasses)
takes `{ permissions: string[] }` and **replaces** the user's whole grant set,
so the caller must send the complete list, not just the new one — or add a small
"driver bundle" step to user creation. Proposed strings:

| Permission | Used by |
|---|---|
| `trip.view` | driver: read own vehicle/trips/notifications/route changes |
| `delivery.execute` | driver: start, arrive, complete, proof, issues, acknowledge, location |
| `trip.manage` | dispatcher: create/resequence trips (bypassed by role anyway) |
| `loading.manage` | loader: mark loading done, record shortfall |

Every driver route must additionally check **ownership** in the service
(the trip's driver is the caller) and respond `403` otherwise.

**IDs.** `users.id` is an integer (`AutoIncBaseEntity`); the app keeps ids as
strings, so it converts. New domain tables that the handset reads or creates
use `UuidBaseEntity` — the API's own comment says UUIDs are for ids "exposed to
a client" or "minted offline (driver handsets) and merged on sync". Records the
driver creates (arrival, completion, proof, issue, location points) take the
**handset-generated UUID as their primary key** (`clientId` in bodies, stored as
`id`). Replaying the same `clientId` returns the original result and creates
nothing new.

**Times** — ISO-8601 UTC strings on the wire; quantities are integer cases.
The operation runs in Sri Lanka (UTC+5:30, `Asia/Colombo`), so the app formats
all times in the device's local zone. `deliveryWindow` (`"06:00-08:00"`) is a
local-time display string.

**Status codes** — `400` validation, `401` auth, `403` not allowed / not your
trip, `404` unknown id, `409` invalid state transition, `422` business-rule failure.

**Conventions to follow when building** (from `api/CLAUDE.md`): controllers are
pass-through; services return `ApiResponseDto` and throw typed Nest exceptions;
all DB access via per-entity repositories; entities in `src/database/entities/`
with snake_case columns; schema comes from `synchronize: true`, migrations are
seed-only and idempotent; multi-table writes use a `QueryRunner` transaction;
config via `ConfigService`, never `process.env`.

**Documentation = Bruno.** There is no Swagger; the collection in
`api/docs/api-test/` *is* the API doc and runs with `npm run test:api`. Each new
endpoint below ships with numbered `.bru` requests including negative cases
(wrong role, other driver's trip, replayed `clientId`, invalid transition).

## 1. Auth & profile

Replaces `AuthRepository` (`currentDriver / login / signUp / logout`).

| | Method & path | Notes |
|---|---|---|
| ✅ | `POST /auth/login` | `{ email, password }` → `data: { accessToken, refreshToken, user }` |
| ✅ | `POST /auth/refresh` | `{ refreshToken }` → new `accessToken`, `refreshToken`, `user` |
| ✅ | `POST /auth/logout` | Revokes the session (JWT required) |
| 🔁 | `GET /auth/me` | Today returns the user (password stripped) **plus `permissions: string[]`**. Must also return the driver block below |
| ✅ | `PUT /auth/me` | `{ name?, phone?, avatar? }` (name ≤ 120, phone ≤ 20, avatar text) — powers Edit profile |
| ✅ | `PUT /auth/change-password` | `{ currentPassword, newPassword }`; wrong current → 400 `Current password is incorrect` |
| ✅ | `POST /users` | **How drivers are created.** Dispatcher only (`user.manage`): `{ email, password (≥6), name, role: "driver", phone?, avatar? }` |
| ❌ | public sign-up | **Does not exist by design** — `SeedSystemDispatcher` states there is "no public registration endpoint". The app's *Sign-up* screen therefore cannot work and should be removed |

**What the app reads from `user`** (login/refresh/me):

```json
{
  "id": 12,
  "email": "kasun@waypoint.lk",
  "name": "Kasun Perera",
  "phone": "+94771234567",
  "avatar": null,
  "role": "driver",
  "status": "active",
  "permissions": ["trip.view", "delivery.execute"],
  "driver": {
    "code": "DRV-0042",
    "depot": "Peliyagoda Depot",
    "depotLocation": { "lat": 6.9645, "lng": 79.8880 }
  }
}
```

`code` and `depot` do not exist on `users` — add a `driver_profiles` entity
(`user_id`, `code`, `depot_id`) and merge it into `me`/`login` for drivers. The
app builds the avatar initials from `name`. Login rejects `blocked`/`deleted`
users, which is how a dispatcher can lock a driver out.

## 2. Vehicle

Replaces `TripsRepository.getVehicle`.

| | Method & path | Response |
|---|---|---|
| 🆕 | `GET /driver/vehicle` | `{ "id": "…uuid", "plate": "VEH021", "type": "Refrigerated van" }` — the vehicle assigned to the driver today (404 if none) |

## 3. Trips

Replaces `TripsRepository` (`getTrips / getTrip / startTrip / markArrived / completeStop`).

| | Method & path | Purpose |
|---|---|---|
| 🆕 | `GET /trips?date=YYYY-MM-DD&page=&limit=` | My trips for the day (default today), summary form, `{ items, meta }` |
| 🆕 | `GET /trips/:id` | Full trip with stops + orders |
| 🆕 | `POST /trips/:id/start` | `{ clientId, startedAt }` — `ready → in_progress`; `409` unless `ready` |
| 🆕 | `POST /trips/:id/stops/:stopId/arrive` | `{ clientId, planVersion, arrivedAt, lat?, lng? }` → stop `arrived` |
| 🆕 | `POST /trips/:id/stops/:stopId/complete` | `{ clientId, planVersion, completedAt, deliveredCases: { "<orderId>": 12 } }` → stop `completed`; when the last stop completes the trip becomes `completed` |

**Trip** (`GET /trips/:id`):

```json
{
  "id": "5f1c…",
  "name": "Trip 1",
  "subtitle": "Fresh deliveries · Gampaha",
  "departure": "2026-10-03T00:00:00Z",
  "status": "loading",            // assigned | loading | ready | in_progress | completed
  "planVersion": 3,
  "updatedAt": "2026-10-03T05:28:00Z",
  "shortfall": {                  // null when the load is complete
    "orderId": "ORD-4521", "storeName": "Waypoint Fresh — Ja-Ela",
    "shortCases": 2, "plannedCases": 12,
    "dispatcherNote": "Two cases short from the warehouse…"
  },
  "stops": [
    {
      "id": "9a02…",
      "sequence": 3,
      "name": "Waypoint Fresh — Ja-Ela",
      "deliveryWindow": "06:00-08:00",
      "plannedArrival": "2026-10-03T01:40:00Z",
      "dock": "Rear loading dock",
      "lat": 7.0742, "lng": 79.8919,
      "contactPhone": "+94112345678",
      "status": "pending",         // pending | arrived | completed
      "arrivedAt": null,
      "etaMinutes": 18,            // from routing, see §8
      "distanceKm": 12.1,
      "orders": [
        {
          "id": "ORD-4521", "storeName": "Waypoint Fresh — Ja-Ela",
          "cases": 12, "temperature": "chilled",   // chilled | ambient
          "status": "pending_delivery",            // pending_delivery | delivered
          "deliveredCases": null,
          "handling": "Keep below 4°C"
        }
      ]
    }
  ]
}
```

**Stale plans.** `arrive`/`complete` carry the `planVersion` the driver was
looking at. If the dispatcher resequenced the trip in the meantime (version
bumped) and the action no longer fits the new order, respond `409` with the
current trip so the app can show the Route update screen instead of silently
recording a delivery against the wrong stop.

**State rules enforced server-side:** start only when `ready`; stops complete in
`sequence` order; `complete` requires `arrived`; `deliveredCases[orderId]` is
`0..cases`; actions on a trip that isn't the caller's → `403`.

**Planning side (needed so there is data to serve).** `api/CLAUDE.md` lists
orders, vehicles, depots, stalls, planning, deliveries and issues as "still to
come". Minimum for the driver app: dispatcher endpoints to create a trip with
stops/orders and assign driver + vehicle (`trip.manage`), and to resequence it
(§5). The existing `settings` already hold knobs this workflow reads
(`order_cutoff_time`, `loading_deadline_time`, `max_trips_per_vehicle`,
`driver_rest_minutes`); drivers cannot call `GET /settings` (it needs
`settings.manage`), so expose anything the app must show (e.g. rest time)
inside the trip payload instead.

**Loading → ready is not driver-initiated.** The app's *"Simulate loading
complete"* button is demo-only and goes away. The loading team (`role = loader`)
marks the load done and the server moves the trip to `ready` and notifies the
driver (§6/§7):

| | Method & path | Who |
|---|---|---|
| 🆕 | `POST /trips/:id/loading/start` | loader (`loading.manage`) → trip `loading` + "loading started" notification |
| 🆕 | `POST /trips/:id/loading/complete` | loader → trip `ready`, optional `shortfall: { orderId, shortCases, dispatcherNote }` |

## 4. Delivery records (proof of delivery & issues)

Replaces `RecordsRepository` and the "complete a stop" flow. Both `POST`s are
`multipart/form-data` (platform-express/multer is already a dependency; fields
arrive as strings, so DTOs need `@Type(() => Number)` for numbers). Limit each
image to 5 MB (the app should downscale/compress before upload — it does not do
that yet).

| | Method & path | Fields |
|---|---|---|
| 🆕 | `POST /trips/:id/stops/:stopId/proof` | `clientId`, `receivedBy` (staff name, required), `notes?`, and `signature` (PNG from the in-app pad) **or** `photo` (JPEG) — at least one |
| 🆕 | `POST /trips/:id/stops/:stopId/orders/:orderId/issues` | `clientId`, `type`, `affectedCases` (1..order cases), `note?`, `photo?` |
| 🆕 | `GET /trips/:id/records` | `{ items, meta }` of `{ id, kind: arrival\|issue\|proof, title, savedAt, syncState }` — the "saved records" list |

**Issue `type`** values the form offers: `damaged` (UI label includes the
temperature), `temperature_breach`, `short_delivery`, `wrong_items`, `other`.
An issue reduces the deliverable quantity (`cases − affectedCases`) and flags
the order for dispatcher review.

Storage: save files to disk/object storage and keep only the URL/path on the
row (never blobs in Postgres). Check MIME type and size server-side, generate
the file name yourself, and serve files behind auth or short-lived signed URLs —
proof signatures are sensitive. The API currently has `enableCors()` open to all
origins and no rate limiting; tighten both before exposing upload endpoints.

## 5. Route updates (re-sequencing)

Replaces `RouteChangesRepository`.

| | Method & path | Purpose |
|---|---|---|
| 🆕 | `GET /trips/:id/route-change` | Latest change the driver has not acknowledged, or `data: null` |
| 🆕 | `POST /trips/:id/route-change/acknowledge` | `{ clientId }` |

```json
{
  "tripId": "5f1c…",
  "planVersion": 4,
  "updatedAt": "2026-10-03T05:28:00Z",
  "reason": "Store closed early — Ragama moved after Ja-Ela",
  "previous": [ { "name": "Keells — Kiribathgoda", "area": "Kiribathgoda", "completed": true, "movement": "none" } ],
  "updated":  [ { "name": "Waypoint Fresh — Ja-Ela", "area": "Ja-Ela", "completed": false, "movement": "up" } ],
  "impactStopName": "Lanka Sathosa — Ragama",
  "impactArrivalNow": "07:45 AM",
  "impactArrivalWas": "07:10 AM",
  "tightWindow": "Window closes 09:00",   // nullable
  "acknowledged": false
}
```

`impactArrivalNow` / `impactArrivalWas` are display strings in the app's current
model; send them as ISO timestamps and have the app format them (change the model
to `DateTime` when wiring this endpoint). `movement`: `none | up | down`. Written when the dispatcher resequences a trip
(bumps `planVersion`, stores before/after snapshots, creates a
`stop_sequence_changed` notification, sends a push).

## 6. Notifications

Replaces `NotificationsRepository`.

| | Method & path | Notes |
|---|---|---|
| 🆕 | `GET /notifications?page=&limit=` | Newest first, `{ items, meta }` |
| 🆕 | `POST /notifications/:id/read` | Clears the unread dot |

```json
{
  "id": "…uuid", "kind": "stop_sequence_changed",
  "severity": "warning",                // error | warning | info | success
  "title": "Stop order changed", "body": "Ja-Ela is now before Ragama.",
  "createdAt": "2026-10-03T05:28:00Z",
  "tripId": "5f1c…",                    // nullable; powers "Review changes" / "View trip"
  "actionLabel": "Review changes",      // nullable
  "footnote": null
}
```

`kind`: `stop_sequence_changed | loading_started | trip_assigned`. The app's model
also has `saved_offline` ("saved on this device, will sync"); it should be created
locally when a record is queued, never by the server (the mock repository
currently includes one as sample data).

## 7. Push

| | Method & path | Notes |
|---|---|---|
| 🆕 | `POST /devices` | `{ token, platform: "android"\|"ios" }` after login (FCM token) |
| 🆕 | `DELETE /devices/:token` | On logout |

Push on: trip assigned, loading started / complete (`ready`), stop sequence
changed. Payload `{ kind, tripId }`; the app then refetches `GET /trips/:id`,
`/route-change`, `/notifications`. Until push exists the app should poll `GET /trips`
and `GET /notifications` every 30–60 s while open (the app does not poll yet).

## 8. Live location & routing

| | Method & path | Notes |
|---|---|---|
| 🆕 | `POST /vehicles/:id/locations` | Replaces the in-app `SimulatedLocationSource`. Body `{ "points": [{ "clientId", "lat", "lng", "heading", "speedKmh", "recordedAt" }] }` — a batch (≤ 50, `@ArrayMaxSize` + `@ValidateNested`) of fixes sent about every 5 s while a trip is `in_progress`. Dispatchers read this; the driver app only writes |
| 🆕 | `POST /routing/route` | `{ "waypoints": [{ "lat", "lng" }, …] }` (2–25) → `{ "geometry": [[lng,lat],…], "distanceMeters", "durationSeconds", "legs": [{ "distanceMeters", "durationSeconds" }] }`. A thin proxy over a **self-hosted OSRM** with a Sri Lanka extract (add it to `docker-compose.yml`). The app currently calls the public OSRM demo server, which is dev-only. Per-leg figures replace the mock `etaMinutes`/`distanceKm` on stops |

App side: only `LocationSource` changes — add a `GpsLocationSource` (geolocator
+ permissions) next to the simulator and a small uploader that batches fixes.
Map tiles come from OpenFreeMap today; decide whether to self-host before launch.

## 9. Offline & sync

The app has offline *screens* ("Waiting to sync" records, a saved-trip view), but
today everything lives in memory in the mock repositories — there is **no
on-device storage or outbox yet**. Wiring this API needs, app-side: a local
database for the trip cache (e.g. drift/sqflite), a persistent outbox of pending
actions with retry/backoff, and a real connectivity listener (the online pill is
currently a long-press toggle). Server contract:

1. Every driver action carries a `clientId` and the **device's** real time
   (`arrivedAt`, `completedAt`, `recordedAt`), not the server's receive time.
2. Replays are idempotent (§0). A replay the state machine no longer allows
   returns `409` with the current state so the app can reconcile.
3. `GET /trips?updatedSince=<ISO>` returns only trips changed since a
   timestamp, so reconnecting is cheap.
4. `GET /trips/:id/records` is the source of truth for `syncState`.

## 10. Backend work list

**New entities** (in `src/database/entities/`, UUID keys unless noted):
`driver_profiles`, `depots`, `vehicles` (+ daily driver assignment), `trips`,
`trip_stops`, `trip_orders`, `shortfall_reports`, `route_changes` (+ before/after
stop snapshots), `delivery_arrivals`, `delivery_proofs`, `delivery_issues`,
`attachments`, `notifications`, `device_tokens`, `vehicle_locations`.

**New modules** (one folder each under `src/modules/`, matching the existing
layout): `drivers`, `vehicles`, `trips` (planning + driver actions),
`deliveries` (proof/issues/records), `notifications` (+ devices),
`routing`, `locations`.

**Seeds:** new permission rows (§0) in a `…-SeedDomainPermissions` migration,
written idempotently with `ON CONFLICT DO NOTHING`.

## 11. Build order (smallest path to a real delivery day)

1. **Auth & profile** — `driver_profiles`, driver block on `/auth/me`, driver
   permissions + seed, a seeded demo driver. App: remove Sign-up, build the
   Account/Profile screen on `GET/PUT /auth/me` + `PUT /auth/change-password`.
2. **Trips** — vehicle, trips list/detail, `start`/`arrive`/`complete`, plus the
   dispatcher endpoints that create and ready a trip.
3. **Records** — `proof`, `issues`, `records` with image upload.
4. **Notifications & route updates** — endpoints, `/devices` push, loader
   `loading/start|complete`.
5. **Routing & location** — OSRM + `/routing/route`, `/vehicles/:id/locations`,
   `GpsLocationSource`.
6. **Sync hardening** — `updatedSince`, idempotency tests, `409` reconciliation.

## 12. App changes once the API is live

- Remove *Simulate loading complete* (`TripsRepository.simulateLoadingComplete`).
- Remove the **Sign-up** screen and `AuthRepository.signUp` (no public registration).
- Mock repositories and `SimulatedLocationSource` stop being the defaults.
- Stop-level `etaMinutes`/`distanceKm` come from the server, not mock data.
- `TripsRepository.markArrived(tripId)` and the `RecordsRepository` calls must take
  the `stopId` (and `planVersion`) because the API is stop-specific; add the local
  outbox and persistence described in §9.
- Replace the public OSRM URL in `routing_repository.dart` with `/routing/route`.
- Add the API base URL as build-time config (`--dart-define=API_BASE_URL=…`).
