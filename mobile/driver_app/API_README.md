# Driver App — Backend API

What the Waypoint driver app calls to run end to end with no mocks. Today the
app talks to in-memory mock repositories
(`lib/features/*/data/mock_*_repository.dart`); each section says which
repository interface the endpoints replace, so wiring the API is "write an
`ApiXRepository` that implements the same interface and swap the provider".

This describes the `api/` project as it is built (NestJS + TypeORM +
PostgreSQL). The runnable examples are the Bruno requests in
`api/docs/api-test/trips/`.

Legend: ✅ built · ⏳ not built yet

## 0. Ground rules

**Base URL** — the global prefix is `api` and the port defaults to `5000`:

| Where the app runs | Base URL |
|---|---|
| Android emulator | `http://10.0.2.2:5000/api` |
| iOS simulator / desktop | `http://localhost:5000/api` |
| Physical device (dev) | `http://<your-LAN-ip>:5000/api` |

Health check: `GET /api/health`.

**Android dev gotcha:** Android 9+ blocks plain `http://` unless the manifest
allows it. For local development add `android:usesCleartextTraffic="true"` to
the `<application>` element in the **debug** manifest only; production must use
HTTPS. Make the base URL build-time config
(`--dart-define=API_BASE_URL=http://10.0.2.2:5000/api`).

**One envelope for everything**, success and error:

```json
{ "statusCode": 200, "message": "Trip started", "data": { } }
```

- List endpoints: `data = { "items": [...], "meta": { "total", "page", "limit", "totalPages" } }`,
  query `?page=1&limit=10` (page ≥ 1, limit 1–200, default 10).
- Errors use the same shape. For validation errors `message` is the first
  problem and `data` is the full list.
- A `409` on a trip action carries **the current trip in `data`** (same shape
  as `GET /trips/:id`), so the app can replace its copy and show what changed.

**Strict request bodies.** Any field that is not documented below is rejected
with `400`. Send exactly these fields.

**Auth** — `Authorization: Bearer <accessToken>`. Access token lifetime `1d`,
refresh token `30d`; refresh **rotates** (the old session is revoked, replaying
an old refresh token fails). Logout takes effect immediately. On `401` the app
refreshes once and retries; if that fails it signs out.

**Access is by role.** A user has one role: `driver`, `loader`,
`store_manager` or `dispatcher`. There are no per-user permissions to grant.
Driver routes also check **ownership**: a trip is yours if it names you as its
driver, or names nobody yet and you are on its vehicle. Anything else is `403`.

**IDs**

| Thing | Id |
|---|---|
| User, vehicle | integer |
| Trip | UUID |
| Stop | the outlet's integer id, as a string (`"14"`). A stop is every order the trip carries to one outlet |
| Order | its reference, `ORD0000012`. Use it in paths and as the key in `deliveredCases` |

**`clientId` and retries.** Every driver action carries a `clientId`, a UUID
minted on the handset.

- Start, arrive and complete are state changes. Sending one that already
  happened returns `200` with the current trip and changes nothing, so a retry
  after working offline is safe.
- Issues, proofs and location points are records. Their `clientId` becomes the
  record's id; sending the same one again returns the stored record (`200`
  instead of `201`) and creates nothing.

**Times** — ISO-8601 strings on the wire. Send the **device's** time for
`startedAt`, `arrivedAt`, `completedAt` and `recordedAt`, not the time of the
request. The operation runs in Sri Lanka (UTC+5:30); `deliveryWindow`
(`"06:00-08:00"`) is local time. Quantities are whole cases.

**Status codes** — `400` validation, `401` auth, `403` wrong role or not your
trip, `404` unknown id, `409` the trip is not in a state that allows the action
(with the current trip in `data`), `413` image over 5 MB, `422` a business rule
failed, `502` the routing engine or image storage failed, `503` image storage
is not configured on the server.

## 1. Auth & profile ✅

Replaces `AuthRepository`.

| Method & path | Body | Notes |
|---|---|---|
| `POST /auth/register` | `{ firstName, lastName, phone, password }` | Creates a **driver** account and sends an OTP by SMS. Returns `otpId` |
| `POST /auth/verify-otp` | `{ phone, otp, otpId }` | Activates the account |
| `POST /auth/resend-otp` | `{ phone }` | |
| `POST /auth/login` | `{ phone, password }` | → `{ accessToken, refreshToken, user }` |
| `POST /auth/forgot-password` | `{ phone }` | Texts a 6-digit reset code if the number has an active account. Always `200` with the same message, whether or not it does. At most one code a minute |
| `POST /auth/reset-password` | `{ phone, otp, newPassword }` | Sets the new password and signs the user out everywhere; sign in again. `400` for a wrong, expired or used code; the code is void after 5 wrong tries |
| `POST /auth/refresh` | `{ refreshToken }` | → new `accessToken`, `refreshToken`, `user` |
| `POST /auth/logout` | — | Revokes the session |
| `GET /auth/me` | — | The `user` below |
| `PUT /auth/me` | `{ firstName?, lastName?, phone?, avatarImageId? }` | Edit profile. `avatarImageId` is an image uploaded with purpose `avatar` (§3); `null` removes the picture |
| `PUT /auth/change-password` | `{ currentPassword, newPassword }` | |

Login is by **phone number**, not email. Sign-up works, but a new driver has no
vehicle until a dispatcher assigns one on the web app.

**`user`** for a driver (login, refresh and `/auth/me`):

```json
{
  "id": 12,
  "firstName": "Kasun", "lastName": "Perera",
  "phone": "94771234567",
  "avatar": null,
  "role": "driver",
  "status": "active",
  "depotId": 1,
  "driver": {
    "code": "DRV-0012",
    "depot": "Peliyagoda",
    "depotLocation": { "lat": 6.9645, "lng": 79.888 },
    "vehicle": { "id": 21, "plate": "VEH021", "type": "Refrigerated van" }
  }
}
```

`avatar` is the profile picture's URL, or `null`. To change it, upload the
image (§3) and send its id as `avatarImageId` to `PUT /auth/me`.

`driver.vehicle` is the vehicle the driver is assigned to, or `null`. There is
no separate vehicle endpoint: `TripsRepository.getVehicle` reads it from here.
Use `vehicle.id` for location uploads (§6).

## 2. Trips ✅

Replaces `TripsRepository` (`getTrips / getTrip / startTrip / markArrived / completeStop`).

| Method & path | Body | Result |
|---|---|---|
| `GET /trips?date=YYYY-MM-DD&updatedSince=<ISO>&page=&limit=` | — | My trips for the day (default today), summary form. `updatedSince` returns only trips changed after that instant |
| `GET /trips/:id` | — | Full trip with stops and orders |
| `POST /trips/:id/start` | `{ clientId, startedAt, otp }` | `ready → in_progress`; `409` unless ready. `otp` is the start code from the loader (see "Confirmation codes") |
| `POST /trips/:id/stops/:stopId/arrive` | `{ clientId, planVersion, arrivedAt, lat?, lng? }` | Stop becomes `arrived` |
| `POST /trips/:id/stops/:stopId/complete` | `{ clientId, planVersion, completedAt, deliveredCases, deliveryCode? }` | Stop becomes `completed`; the last one completes the trip. `deliveryCode` is the outlet's code (see "Confirmation codes") |
| `POST /trips/:id/stops/:stopId/delivery-code` | — | Sends the outlet a new code. Needs a connection; refetch the trip afterwards for the new hash |

`deliveredCases` maps **every** order at the stop to the cases handed over:
`{ "ORD0000012": 12, "ORD0000013": 0 }`. Each value is `0..cases`.

Every action returns the updated trip.

**Trip** (`GET /trips/:id`; the list returns the fields above `depot`):

```json
{
  "id": "5f1c…",
  "name": "Trip 1",
  "subtitle": "Fresh deliveries · Gampaha",
  "departure": "2026-10-05T22:00:00.000Z",
  "status": "loading",
  "planVersion": 1,
  "updatedAt": "2026-10-05T21:40:00.000Z",
  "vehicle": { "id": 21, "plate": "VEH021", "type": "Refrigerated van" },
  "stopCount": 4,
  "completedStops": 0,
  "depot": "Peliyagoda",
  "shortfall": {
    "orderId": "ORD0000012", "storeName": "Waypoint Fresh — OUT014",
    "shortCases": 2, "plannedCases": 12,
    "dispatcherNote": "Two cases short from the warehouse"
  },
  "stops": [
    {
      "id": "14",
      "sequence": 1,
      "name": "Waypoint Fresh — OUT014",
      "deliveryWindow": "06:00-08:00",
      "plannedArrival": "2026-10-06T00:37:00.000Z",
      "dock": "Rear loading dock",
      "lat": 7.0961, "lng": 80.0231,
      "contactPhone": null,
      "status": "pending",
      "arrivedAt": null,
      "deliveryCode": { "salt": "9f2c…", "iterations": 150000, "hash": "5b1e…" },
      "codeVerified": null,
      "etaMinutes": 37,
      "distanceKm": 28,
      "orders": [
        {
          "id": "ORD0000012", "storeName": "Waypoint Fresh — OUT014",
          "cases": 12, "temperature": "chilled",
          "status": "pending_delivery",
          "deliveredCases": null,
          "handling": "Keep below 4°C"
        }
      ]
    }
  ]
}
```

- `status`: `assigned | loading | ready | in_progress | completed`.
- Stop `status`: `pending | arrived | completed`.
- Order `status`: `pending_delivery | delivered`. `delivered` means the driver
  recorded an outcome; `deliveredCases` says how much (it can be `0`).
- `shortfall` is `null` when the load is complete.
- `lat`, `lng` and `contactPhone` can be `null`. Outlet coordinates are
  approximate (placed near the district centre) until someone corrects them.
- `etaMinutes` and `distanceKm` are the planner's clear-road figures from the
  previous point (the depot for the first stop). For a live route use §6.

**Rules the server enforces:** start only when `ready`; stops complete in
`sequence` order; `complete` requires `arrived`; an arrive or complete sent with
an old `planVersion` gets `409` (see §4). On `409`, replace the local trip with
`data` from the response.

**Loading → ready is the loader's job**, not the driver's. Remove the app's
*"Simulate loading complete"* button. These two calls are made by a loader (or
a dispatcher) and are listed here so a developer can drive a trip to `ready`
when testing:

| Method & path | Body | Result |
|---|---|---|
| `POST /trips/:id/loading/start` | — | `assigned → loading` |
| `POST /trips/:id/loading/complete` | — | `→ ready`. The response has `dispatchCode`, the start code for the driver. A loader reports a shortfall with `POST /issues` (type `load_shortfall`), and the trip then shows it as `shortfall` |
| `POST /trips/:id/loading/code` | — | A fresh `dispatchCode` if the first was lost or used up |

A loader calling `GET /trips` gets their depot's trips for the day.

### Confirmation codes

Two handovers are confirmed with a 6-digit code.

**Starting a trip.** When the loader marks the vehicle loaded, a start code is
shown on the loader's screen and texted to the driver. Send it as `otp` to
`POST /trips/:id/start`. A wrong code is `400` "Invalid start code"; after 5
wrong tries the code is void and the loader issues a new one. The driver is at
the depot here, so this step is online.

**Completing a stop, with or without signal.** When the trip starts, each
outlet's store manager is texted a delivery code. The driver asks for it at the
stop and types it in. So that this works with no connection, the trip carries
each stop's `deliveryCode: { salt, iterations, hash }` from the moment it
starts (in the `start` response and `GET /trips/:id`). Save it with the trip.

The app checks a typed code like this, with no network:

```
PBKDF2-HMAC-SHA256(
  password   = the 6 digits, as UTF-8 text,
  salt       = the bytes of `salt` (it is hex: decode it to 16 bytes),
  iterations = `iterations`,
  length     = 32 bytes
) -> lowercase hex, must equal `hash`
```

In Dart, `Pbkdf2(macAlgorithm: Hmac.sha256(), iterations: …, bits: 256)` from
the `cryptography` package does this. To check an implementation: password
`password`, salt `73616c74` (the bytes of "salt"), 4096 iterations gives
`c5e478d59288c841aa530db6845c4c8d962893a001ce4e11a4963873aa98134a`. Run it off
the UI thread; 150 000 iterations take a noticeable moment on a phone.

Then send the code as `deliveryCode` in `complete` (now, or later from the
offline queue). The server checks it again; a wrong one is `400` "Invalid
delivery code".

**If the store cannot give a code** (phone off, nobody there to ask): record a
proof of delivery for the stop first (§3), then send `complete` without
`deliveryCode`. Without a code or a proof, `complete` is `400`.

On a completed stop, `codeVerified` is `true` if the outlet's code confirmed it
and `false` if a proof stood in; it is `null` before that. `deliveryCode` is
`null` before the trip starts and after the stop is completed.

## 3. Images and delivery records ✅

Replaces `RecordsRepository`.

### Uploading an image

Every image goes through one endpoint, whatever it is for. Upload first, then
send the returned `id` in the JSON body of the thing it belongs to.

| Method & path | Fields (`multipart/form-data`) | Result |
|---|---|---|
| `POST /images` | `image` (the file), `purpose`, `clientId?` | `{ id, url, purpose, format, width, height, bytes }` |

- `purpose`: `avatar | proof_signature | proof_photo | issue_photo`. An image
  can only be attached where its purpose fits, and only by the user who
  uploaded it.
- PNG or JPEG, up to 5 MB. The server checks the file's content, not its name.
  Compress photos before upload.
- `clientId` (a UUID from the handset) becomes the image's `id`. Sending the
  same one again returns the stored image (`200` instead of `201`) without
  uploading twice, so an upload can be retried safely after working offline.
- `url` is an `https://res.cloudinary.com/…` address. Load it directly; it
  needs no token.

**There is no endpoint for fetching an image.** Wherever an image is used, the
response already carries its URL: `avatar` on the user, `signatureUrl` and
`photoUrl` on a proof, `photoUrl` on an issue.

### Proof of delivery and issues

All take ordinary JSON.

| Method & path | Body |
|---|---|
| `POST /trips/:id/stops/:stopId/proof` | `{ clientId, receivedBy, notes?, signatureImageId?, photoImageId? }` — at least one of the two images. `signatureImageId` is an image of purpose `proof_signature` (the PNG from the in-app pad), `photoImageId` one of `proof_photo` |
| `POST /issues` | `{ clientId?, type, tripId, orderId?, affectedCases?, note?, photoImageId?, recordedAt? }` — see "Reporting an issue" below |
| `GET /issues?page=&limit=` | — → the issues this driver reported, newest first, each with its `status` (`open`, `acknowledged`, `resolved`) and the dispatcher's `resolutionNote` |
| `GET /trips/:id/records?page=&limit=` | — → `{ items, meta }` of `{ id, kind: arrival\|issue\|proof, title, savedAt, syncState }`, newest first |

#### Reporting an issue

Issues from every role go to the same `POST /issues`. For a driver:

| Field | Notes |
|---|---|
| `type` | `damaged`, `temperature_breach`, `short_delivery`, `wrong_items` (about one order's goods), or `delivery_problem`, `delay`, `vehicle_breakdown`, `other` (about the trip) |
| `tripId` | Required; the driver's own trip |
| `orderId` | The order reference. Required for the four goods types |
| `affectedCases` | Required for the four goods types; 1 to the order's cases |
| `note` | Optional; up to 500 characters |
| `photoImageId` | Optional; an image of purpose `issue_photo` |
| `recordedAt` | Optional; the device's clock, for an issue noted offline |
| `clientId` | Optional UUID; becomes the issue's id, so a retry stores nothing new (`200` instead of `201`) |

Errors: `400` a type a driver cannot use, or a goods type without `orderId` and
`affectedCases`; `403` not the driver's trip; `404` the order is not on the
trip; `422` more cases than the order has.

A proof response includes `signatureUrl` and `photoUrl`; an issue response
includes `photoUrl`. Everything the server returns in `records` has
`syncState: "synced"`; records still waiting on the handset are the app's to
list.

Offline, queue the image upload and the record that uses it together: mint the
image's `clientId` up front, put it in the record's body, and send the upload
before the record.

## 4. Route updates ✅

Replaces `RouteChangesRepository`.

| Method & path | Body | Result |
|---|---|---|
| `GET /trips/:id/route-change` | — | The latest change the driver has not acknowledged, or `data: null` |
| `POST /trips/:id/route-change/acknowledge` | `{ clientId }` | The change, now `acknowledged: true` |

```json
{
  "tripId": "5f1c…",
  "planVersion": 2,
  "updatedAt": "2026-10-05T23:28:00.000Z",
  "reason": "Store closing early",
  "previous": [ { "name": "Waypoint Fresh — OUT011", "area": "Gampaha", "completed": true, "movement": "none" } ],
  "updated":  [ { "name": "Waypoint Fresh — OUT014", "area": "Gampaha", "completed": false, "movement": "up" } ],
  "impactStopName": "Waypoint Fresh — OUT016",
  "impactArrivalNow": "2026-10-06T01:45:00.000Z",
  "impactArrivalWas": "2026-10-06T01:10:00.000Z",
  "tightWindow": "Window closes 08:00",
  "acknowledged": false
}
```

`impactArrivalNow` and `impactArrivalWas` are **ISO timestamps**; change the
app's model from display strings to `DateTime` and format them locally.
`movement`: `none | up | down`. `tightWindow` is `null` unless the stop is now
reached within 30 minutes of its window closing.

A change is written when the dispatcher reorders the stops the vehicle has not
reached yet. That raises the trip's `planVersion`, so an arrive or complete sent
with the old one gets `409` and the app should fetch the route change, show the
Route update screen, acknowledge, then retry with the new `planVersion`.

## 5. Notifications and push ⏳

Not built. `GET /notifications`, `POST /notifications/:id/read` and
`POST /devices` do not exist yet. Until they do, poll `GET /trips` and
`GET /trips/:id/route-change` every 30–60 s while the app is open, and keep
`NotificationsRepository` on its mock.

## 6. Live location & routing ✅

| Method & path | Body | Notes |
|---|---|---|
| `POST /vehicles/:id/locations` | `{ "points": [{ "clientId", "lat", "lng", "heading?", "speedKmh?", "recordedAt" }] }` | 1–50 fixes per call, about every 5 s while a trip is `in_progress`. `:id` is `driver.vehicle.id`. Only that vehicle's driver may send. Replaces `SimulatedLocationSource` |
| `POST /routing/route` | `{ "waypoints": [{ "lat", "lng" }, …], "profile?": "van" \| "truck" }` | 2–25 points → `{ profile, geometry: [[lng,lat],…], distanceMeters, durationSeconds, legs: [{ distanceMeters, durationSeconds }] }`. `profile` defaults to the driver's own vehicle type |

`heading` is whole degrees (0–360). Points captured offline can be sent later
in batches; a point sent twice is stored once.

`/routing/route` proxies the team's self-hosted OSRM (`osrm_setup/`), which has
separate van and truck road profiles. Replace the public OSRM URL in
`routing_repository.dart` with it. It returns `502` when the engine is not
running; keep `StraightLineRoutingRepository` as the fallback.

## 7. Offline & sync

The server side of the contract is in place:

1. Every driver action carries a `clientId` and the device's own time.
2. Retries are safe (§0). A retry the trip no longer allows returns `409` with
   the current trip.
3. `GET /trips?updatedSince=<ISO>` returns only trips changed since then.
4. `GET /trips/:id/records` is the source of truth for what has synced.

Still needed in the app: a local database for the trip cache, a persistent
outbox of pending actions with retry and backoff, and a real connectivity
listener (the online pill is currently a long-press toggle).

## 8. App changes to make

- **Login by phone.** Change `AuthRepository.login` and the sign-in form from
  email to phone. Sign-up needs the OTP step (`/auth/register` then
  `/auth/verify-otp`).
- **Vehicle** comes from `user.driver.vehicle`; drop the separate call.
- **Confirmation codes.** A start-code field before starting a trip, and a
  delivery-code field when completing a stop, checked on the handset against
  the hash saved with the trip (§2, "Confirmation codes").
- **Stop-specific calls.** `markArrived(tripId)` and the `RecordsRepository`
  calls must take the `stopId` and `planVersion`.
- **Order ids** are references like `ORD0000012`.
- **Images are two steps.** Upload with `POST /images`, then send the returned
  id in the JSON body of the proof, issue or profile update (§3). Proofs and
  issues are no longer multipart.
- Remove *Simulate loading complete* (`TripsRepository.simulateLoadingComplete`).
- Route change arrival times become `DateTime` (§4).
- Mock repositories and `SimulatedLocationSource` stop being the defaults; add a
  `GpsLocationSource` and a small uploader that batches fixes.
- Replace the public OSRM URL with `/routing/route`.
- Add the API base URL as build-time config (`--dart-define=API_BASE_URL=…`).

## 9. Trying it against a local API

1. In `api/.env`, set `DEMO_DRIVER_PASSWORD` and `DEMO_LOADER_PASSWORD` (see
   `api/.env.example`) and start the API. That seeds a driver on a Peliyagoda
   vehicle and a loader.
2. On the web app, as the dispatcher: have orders placed, open **Planning**, run
   it and publish. If the demo driver's vehicle got no trip, assign the driver
   to a vehicle that did (Vehicles → Assign driver).
3. As the loader, call `loading/start` then `loading/complete` on the trip. The
   response's `dispatchCode` is the start code.
4. Sign in on the app as the driver: the trip is `ready`. Start it with that
   code.
5. Outside production, the `start` response also gives each stop's delivery
   code as `deliveryCode.code`, so a stop can be completed without the SMS.

`api/docs/api-test/trips/` walks the same steps request by request.
