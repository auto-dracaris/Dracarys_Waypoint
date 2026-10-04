# Waypoint Driver App

Flutter app for Waypoint delivery drivers. A driver signs in, sees the day's trips,
starts a trip with the loader's code, navigates stop to stop, records what was
delivered (code, signature or photo), reports problems, and can ask an AI
assistant questions. It is built to keep working **without a signal**: what the
driver does is saved on the phone and sent when the connection returns.

- [Quick start](#quick-start)
- [Features](#features)
- [Offline mode](#offline-mode) — storage, the action queue, sync, **start code and delivery code (OTP) handling**, offline maps
- [Architecture](#architecture)
- [How the app talks to the API](#how-the-app-talks-to-the-api)
- [Testing](#testing)
- [Platform notes](#platform-notes)
- [Known gaps](#known-gaps)
- [Design source](#design-source)

---

## Quick start

```bash
flutter pub get
flutter run                      # pick a device: Android emulator, iOS simulator...
flutter test && flutter analyze  # ~530 tests
```

By default the app talks to the hosted API, `https://api.way-point.site/api`.

| Setting (`--dart-define=NAME=value`) | Default | Use |
|---|---|---|
| `API_BASE_URL` | `https://api.way-point.site/api` | Point at your own backend, e.g. `http://10.0.2.2:5000/api` (Android emulator reaching a server on your machine; plain `http` works in debug builds only). |
| `AI_BASE_URL` | *(empty)* | Where the AI assistant service runs, e.g. `http://10.0.2.2:8000`. It has no public address yet; empty means "assistant not set up" in the chat. |
| `USE_MOCKS` | `false` | Start in **demo data** mode (see below). |

### Demo data (no server needed)

A **Demo data** switch is on the sign-in screen and at the bottom of the Account tab
(hidden in release builds). When on, every repository is swapped for built-in fake
data: a trip with four stops, fake route changes, notifications, a scripted
assistant. Sign in with any phone number and a password of 6+ characters.

- Switching sends you back to sign-in (demo data has its own session). Your real
  session is untouched and returns when you switch back.
- The choice is remembered between launches.
- Useful demo hooks: **long-press the yellow "Loading in progress" banner** on the trip
  overview to mark loading complete (stands in for the loader's app); **long-press the
  Online pill** to force the app offline until you long-press it again.
- Demo mode exercises the screens, map and navigation. The offline queue, sync and
  offline code check run only against the real API repositories (they are covered by
  automated tests).

---

## Features

### Sign-in and account
- Phone + password sign-in, sign-up with SMS OTP, forgot/reset password (all against
  `/auth/*`). Tokens are kept in secure storage; an expired access token is refreshed
  once automatically, a rejected refresh signs the driver out.
- **Account tab:** photo/initials, name, driver code (`DRV-0002`), assigned vehicle,
  phone, depot and depot location, from `GET /auth/me`.
- **Edit profile:** first/last name, phone, profile photo (camera, gallery or remove).
  The photo is uploaded with `POST /images` and attached with `PUT /auth/me`.
- **Change password:** current + new + confirm; the driver stays signed in.

### My trips
- The day's trips with status, stop count, departure and a loading banner. A **day
  selector** (previous/next arrows and a calendar) shows any other day: `GET /trips?date=`.
- Pull to refresh. A bar shows anything **waiting to sync** (see offline mode).

### Trip overview and starting a trip
- Summary, loading result (including a **shortfall** reported by the loaders), and the
  unloading sequence with delivery windows, arrival times and chilled/ambient tags.
- **Ready to depart** asks for the loader's 6-digit **start code**; the trip starts only
  when the server accepts it (details in [offline mode](#the-two-codes-otp)).

### Stops
- **Stop info:** window, planned arrival, dock, contact, orders and handling notes.
- **Get directions → navigation** (below).
- **Arrived:** confirm the quantity handed over per order.
- **Proof of delivery:** receiver's name, a signature or a photo, optional notes, and
  the outlet's **delivery code**. Completing a stop sends arrival, proof and completion.
- **Report an issue:** damaged goods, temperature breach, short delivery, wrong items,
  other; affected cases; note; camera photo. Sent to the dispatcher via `POST /issues`.
- Every action carries a `planVersion`: if the dispatcher reordered the stops in the
  meantime the server answers `409` and the driver is told to review the change first.

### Navigation
- **Route preview:** the whole route with numbered stops, ETA and distance.
- **Live turn-by-turn** (per the Figma "Turn-by-Turn Navigation" screen): a blue banner
  with the distance to the next turn, the turn and a "Then" preview, a red ETA bar
  (minutes left, km, arrival time), a 2D/3D button, end-navigation button and a
  recentre button. The API returns road *shape*, not instructions, so turns are
  derived from the route geometry (street names are not available).
- **Driving simulation at 30 km/h** until real GPS is wired in. The camera follows the
  van in both modes: **3D** is a tilted chase view, **2D** is heading-up from straight
  above. The van and camera are carried forward to the moment each frame is drawn by
  the same distance, so uneven map updates do not read as jumps.
- Routes come from `POST /routing/route` (the project's own OSRM, with a profile per
  vehicle type).

### Vehicle tracking
- While a trip is **in progress**, the phone records the vehicle's GPS position about
  every 5 seconds and sends it to the dispatcher (`POST /vehicles/:id/locations`), so
  they can see where the vehicle is. It stops when no trip is under way.
- It keeps going with the screen off (on Android a "Trip in progress" notification shows
  that the phone is sharing its position), and with **no signal it keeps recording and
  sends the backlog later** (see [offline mode](#vehicle-location-points)).
- If location is off or not allowed, My trips shows a red notice with a **Try again**
  button, because the dispatcher cannot see the vehicle without it.
- Nothing is recorded in Demo data mode or for a driver with no vehicle assigned.

### Updates and route changes
- **Updates tab:** built from today's trips (assigned, loading, loaded, loading
  shortfall) and unacknowledged route changes — the API has no notifications feed.
- **Route update:** the dispatcher's reorder, with before/after sequence, the stop most
  affected and any tight-window warning; the driver acknowledges it
  (`GET /trips/:id/route-change`, `POST …/acknowledge`).

### AI assistant
- A sparkle button beside the bell on My trips opens a chat: suggestion cards, typing
  indicator, formatted answers (bold, italics, lists), numbered collapsible sources,
  retry on failure, **New chat**. History is kept per driver and readable offline.
- Talks to the separate `ai-service` (`POST /api/v1/chat`, workflow `business_qa`) with
  the driver's access token. It is read-only: it can look at the driver's trips and
  route changes and search approved delivery/incident policy, never change anything.
- The chat sends the current trip's id as context so "my next stop" has a meaning.
- Offline, the box is disabled and the earlier chat stays readable.

---

## Offline mode

The principle: **everything the driver needs on the road works with no signal, and
nothing the driver does is lost.** Only the few steps that genuinely need the server
say so.

### What works with no signal

| | Offline? | How |
|---|---|---|
| Open the app, stay signed in | Yes | The profile from the last session is cached. |
| See today's trips, stops, orders | Yes | The API's own JSON is cached after every read. |
| See the route line and the map | Yes (after a first online visit) | Road lines are cached; map tiles for each trip's area are downloaded. |
| Arrive at a stop | Yes | Queued; the stop shows as arrived at once. |
| Confirm the outlet's delivery code | **Yes** | Checked on the phone against a hash (below). |
| Capture signature / photo, complete the stop | Yes | Queued with the files; the trip advances on screen. |
| Report an issue with a photo | Yes | Queued with the photo. |
| Acknowledge a route change | Yes | Queued. |
| Record the vehicle's position | Yes | Kept on the phone and sent in batches when the signal returns. |
| Read the earlier assistant chat | Yes | Chat history is stored locally. |
| **Start a trip (start code)** | **No** | Needs the server (explained below). |
| Sign in for the first time, change password, upload an avatar, ask the assistant | No | Need the server. |

### Connectivity detection (`core/connectivity`)
`onlineProvider` is the app's single "can we reach the server?" flag. It combines:
1. the system network state (`connectivity_plus`), and
2. the outcome of real requests: `ApiClient` reports every request as reached or died
   on the network, so a wifi with no internet is detected too.

A request that gets through flips it back online. The Online/Offline pill, the sync
bar and the queue all follow it. (Long-pressing the pill forces offline for demos.)

### Local storage (`core/storage`)
- `LocalStore` — a small key/value + blob store. `FileLocalStore` writes to the app's
  private documents folder, **atomically** (write to a temp file, then rename), so a crash
  or flat battery mid-write never leaves half a file. `MemoryLocalStore` is for tests.
- `OfflineCache` — JSON snapshots of what the API last said (`trip:<id>`, `trips:<day>`,
  `me`, `route:<tripId>`, `records:<tripId>`, `road:<hash>`, `chat`). Because it stores
  the API's own JSON, a cached value goes through the same mappers as a live reply.
- **Per-driver:** `bindTo(driverId)` wipes the cache, the queue and the stored photos when
  a *different* driver signs in, so nothing leaks between accounts that share a phone.
  Signing out does **not** delete unsent work; it is sent when the same driver signs in
  again. (Signing out with unsent changes asks for confirmation first.)

### Reading with a fallback
Repositories try the server and fall back to the cache **only when the failure is a
network failure**. A server refusal (`403`, `404`, `409`…) is never hidden behind stale
data. A day or trip never seen online has nothing to fall back on and shows the error.

### The action queue (`features/sync`)
Everything the driver *does* goes through one door, `ActionSubmitter`:

```
 driver taps "Complete stop"
          │
          ▼
 ActionSubmitter.submit(kind, tripId, stopId, body, files)
          │   saves files to disk first
          ├── online and nothing waiting for this trip ──► send now ──► sent
          │        │
          │        ├─ server refuses (wrong code, stale plan) ──► error shown to the driver, nothing queued
          │        └─ signal dropped mid-send ─────────────────┐
          └── offline, or earlier actions still waiting ───────┴─► ActionQueue (on disk) ─► "waiting to sync"
```

- Kinds: `arrive`, `proof`, `complete`, `issue`, `ackRoute`. `ActionExecutor` is the only
  place that knows which HTTP calls each kind makes (a proof uploads its signature/photo
  with `POST /images`, then names the images in `POST …/proof`).
- **Order is preserved per trip.** If a trip already has something waiting, a new action
  joins the queue behind it even when the signal is back — `complete` can never overtake
  `arrive`.
- **Idempotent.** Every action (and every image) carries a client-minted UUID
  (`clientId`) and the phone's own timestamps (`arrivedAt`, `completedAt`, `recordedAt`).
  The API stores a repeated `clientId` once, so a send that got through just before the
  signal dropped is safe to repeat.
- **The screen reflects what the driver did.** `applyPending` lays the unsent actions on
  top of the last trip from the server, so a stop completed offline stays completed when
  the screen reloads, and the trip shows as finished after its last stop.
- The Records list marks queued items **waiting to sync**.

### Syncing (`SyncService`)
`OfflineHost` (above the whole app) starts the service, so queued work is sent without any
screen asking. It runs:
- when the network returns,
- when the app comes back to the foreground,
- every 20 s while anything is waiting or the server cannot be reached (that call also
  serves as the "is it back?" check), and
- when the driver taps **Sync now** in the sync sheet.

For each queued action, in order:

| Result | What happens |
|---|---|
| Sent | Removed from the queue; trips, records and updates reload. |
| Network failure, `5xx`, `429`, `401` | **Stop and keep everything**, in order, for the next attempt. Nothing is marked refused. |
| `4xx` refusal (wrong code, trip not assigned, stale plan…) | Marked **rejected** with the server's message; kept so the driver can read why and **Dismiss** it. Later steps at the *same stop* are not sent ("an earlier step at this stop was refused"); an unrelated action (say an issue report) still goes. |
| Photo missing from disk | Rejected with a clear message, not a crash. |

The **sync bar** on My trips and on the offline trip screen shows "N changes waiting to
sync" (yellow) and "N not accepted by the server" (red); tapping it opens the list with
times, stop names and reasons.

### The two codes (OTP)

The app handles two different 6-digit codes. They behave differently offline, and the
reason is in how the API issues them.

#### 1. Start code (the loader's dispatch code) — **needs the server**
- When the loader marks the vehicle loaded, the API creates a start code, shows it to the
  loader, and **texts it to the driver** ("Your vehicle is loaded. Your start code is …";
  an SMS needs mobile coverage, not data). The driver types it in **Ready to depart**.
- It is verified **only by the server** (`POST /trips/:id/start`), and the API sends the
  phone no hash for it. So the app cannot check it, and **starting a trip needs a
  connection**. Offline, the app says so instead of failing silently.
- A wrong code counts against the code on the server, which voids it after too many
  tries; the loader can then issue a new one (`POST /trips/:id/loading/code`). The app
  checks only that the box holds 6 digits before sending, so typing carefully matters.
- This is not a limitation of the phone: it is also the moment the API texts each outlet
  its delivery code and returns the delivery-code hashes the phone needs for the road.
  Starting online is what makes the rest of the trip work offline.
- The reply of `start` is stored, so the hashes survive going offline.

#### 2. Delivery code (the outlet's confirmation code) — **checked on the phone**
- At trip start the API texts every outlet on the trip a delivery code and returns, for
  each pending stop, a **salted hash** of that code — never the code:
  `{ salt, iterations, hash }`, where
  `hash = PBKDF2-HMAC-SHA256(password = the 6 digits as UTF-8, salt = 16 bytes (hex), iterations = 150 000, 32 bytes out)` as hex.
- The store manager reads the code to the driver at the dock. **With no signal**, the app
  derives the same PBKDF2 from what the driver typed and compares it to the stored hash
  (`core/crypto/delivery_code.dart`, the same algorithm as `trip-codes.util.ts` in the
  API; verified against Node's `crypto.pbkdf2Sync` at the real 150 000 iterations).
  - It runs on a separate **isolate** so the screen does not freeze for the ~150k rounds.
  - The comparison is constant-time.
  - A **wrong code is caught at the dock**, before anything is saved, so the driver can
    ask the store manager again.
  - A right code is saved with the completion and **verified again by the server** when
    the queue is sent.
- **Security note.** Holding the hash lets anyone with the phone test guesses without the
  server's attempt limit. The 150 000 PBKDF2 rounds are what make that slow, and the
  hash is dropped once the stop is completed. The server still has the final say on sync.
- **Online, the phone does not second-guess the server** — it just sends the code, and the
  server is the judge (the hash on the phone could be stale if the code was reissued).
- **If the store cannot give a code**, leave the field empty: the signature or photo plus
  receiver's name is recorded first and **completes the stop**; the dispatcher is told the
  code was not used. This also works offline.
- If a hash is unavailable (the trip came from a cache without one), the typed code is
  queued and the server decides when it syncs; a wrong one comes back as a rejected action
  with the server's message.
- The hash is only present until a stop is completed; the code itself is only echoed by
  the API outside production (for trying the flow without phones).

### Maps offline
- **Road line:** every route fetched from `/routing/route` is cached under a hash of its
  waypoints. With no signal the saved line for the same stops is drawn; a route never
  seen before falls back to straight segments between the stops.
- **Map tiles:** while online, `OfflineMapService` downloads the vector tiles around each
  active trip (bounding box of the depot and stops plus ~3 km, zoom 9–14; the tiles stop
  at zoom 14 and are stretched beyond that, so this covers every zoom the camera uses).
  It keeps the four most recent trips, never throws, and retries the next time trips load.
  Uses MapLibre's offline regions (Android/iOS).

### Vehicle location points
The dispatcher sees the vehicle move because the phone sends its GPS points
(`LocationTracker`, `features/tracking`). The API's rules for this endpoint shape the design:

- **Recording:** every 5 s while a trip is in progress, the latest GPS reading becomes a
  point with its own `clientId` (a UUID made once and stored with it) and the phone's
  time (`recordedAt`). Readings older than 15 s, or vaguer than 200 m, are skipped;
  heading and speed the phone cannot give are left out.
- **Storage:** points go to `LocationBuffer`, in chunks of 100 so adding a point rewrites
  only the newest chunk however long the backlog (a day is ~17,000 points). It survives an
  app restart, is wiped with the rest when a different driver signs in, and is capped at
  100,000 points (the oldest are dropped first).
- **Sending:** about every 5 s when online, and at once when the network returns, in
  batches of **up to 500, oldest first**, until the backlog is empty. A retried point is
  stored once by the server because it keeps its `clientId`.
- **A point is deleted only after the server answers `202`.** Everything else keeps it:

| Server says | What the app does |
|---|---|
| `202` | Deletes those points. |
| `400` (invalid body) | Does not resend it unchanged: splits the batch in halves to find the bad point, drops that one, and sends the rest. |
| `401` | `ApiClient` refreshes the token and resends the same batch; if that fails, keeps the points. |
| `403` / `404` | Keeps the points and fetches the profile again (the vehicle assignment may have changed); tries again after 60 s. |
| `503`, `5xx`, no signal | Keeps the points and sends the same batch again after 15 s. |

- **Visible:** the sync bar shows "N location points waiting" when offline or when a real
  pile builds up, and **Sync now** sends them right away.
- **Not sent:** no trip id (the server links each point to the trip running at its
  `recordedAt`), and nothing is read back from the server.

### Conflicts
The dispatcher may reorder stops while the driver is offline. The queued `arrive`/`complete`
carry the `planVersion` the driver saw, so the server answers `409` on sync. The action
shows in the red sync list with the server's message ("The stop order has changed. Review
the route update first"); the driver reviews the route change and redoes the step.

---

## Architecture

### Layers
Feature-first. Each feature has up to three layers and dependencies point inward:

```
lib/core/                  theme, router, shared widgets, API client, storage, crypto, photos, connectivity
lib/features/<name>/
  domain/                  plain immutable models (no Flutter, no I/O)
  data/                    abstract Repository + HTTP implementation + Mock implementation + Riverpod provider
  application/             use-case objects that coordinate repositories (TripActions, SyncService, ChatController…)
  presentation/            screens and widgets (talk to the rest only through providers)
```

### Features

| Feature | Responsibility |
|---|---|
| `auth` | Sign-in/up, OTP, password reset, session, cached profile |
| `account` | Profile screen, edit profile, change password |
| `trips` | Trips/stops/orders, trip overview, starting, arrive/complete (`TripActions`) |
| `stops` | Stop screens, proof of delivery, issue report |
| `navigation` | Route preview, turn-by-turn, camera, simulated driving, offline map download |
| `route_update` | The dispatcher's reorder and its acknowledgement |
| `records` | What was recorded at a trip (arrivals, proofs, issues) |
| `notifications` | The Updates feed (derived from trips and route changes) |
| `offline` | The "saved trip" screen |
| `sync` | Action queue, executor, submitter, sync service, sync status UI, `OfflineHost` |
| `tracking` | Vehicle GPS: recording, the on-phone buffer, sending batches, location problems |
| `assistant` | AI chat |

### Key principles
- **Dependency inversion.** Screens depend on `abstract interface class …Repository`, never
  on a concrete class. Each repository has an HTTP implementation and a mock one, and one
  `…RepositoryProvider` chooses between them (driven by the **Demo data** switch). Tests
  override the provider.
- **State is Riverpod.** Data providers (`tripsProvider`, `tripProvider(id)`,
  `recordsProvider(id)`…) are `FutureProvider`s that *watch the signed-in driver*, so caches
  reset on sign-out or user switch. Writes go through `TripActions`, which calls a
  repository, saves a record and invalidates the providers screens watch.
- **One door for writes.** Everything that changes server state goes through
  `ActionSubmitter` (see the diagram above). Everything that reads goes through a
  repository that falls back to the cache on network failure.
- **Failures are handled at the edge.** Forms show inline errors; async screens use the
  shared `AsyncValueView` (loading / empty / error + retry); action buttons show the API's
  own message in a snackbar (`showErrorSnack`). `ApiException.isNetwork` separates "no
  signal" from "the server said no".
- **Pure rules are separate and tested.** Routing rules (`auth_redirect`), turn detection
  (`findManeuvers`), the offline overlay (`applyPending`), PBKDF2 (`codeMatches`), citation
  rewriting — all plain functions with unit tests.
- **Seams for the platform.** Camera/gallery (`PhotoPicker`), signature rasterising
  (`signatureEncoderProvider`), the delivery-code check (`deliveryCodeVerifierProvider`),
  the network (`networkStatusProvider`), the offline map (`offlineMapServiceProvider`) and the
  clock (`clockProvider`) are all providers, so widget tests need no device.

### Data flow

**Read**
```
Screen ──watch──► FutureProvider ──► Repository ──► ApiClient ──► server
                                          │  network failure only
                                          └──► OfflineCache (last JSON) ──► same mappers
                                          then applyPending(queue) on top
```

**Write**
```
Screen ─► TripActions ─► Repository ─► ActionSubmitter ─► (send now | ActionQueue)
                                                              ▲
                          SyncService ◄── network back / resume / 20 s / "Sync now"
```

### Networking (`core/api`)
- `ApiClient` — thin client returning the envelope's `data`. Adds the bearer token,
  refreshes it once on `401` (one refresh at a time, since it rotates the tokens),
  multipart upload for images, a raw-JSON variant for the AI service (which does not use
  the envelope), per-request timeouts, and a reachability callback.
- `ApiException(statusCode, message, data)`; `statusCode == 0` means the server could not
  be reached; a `409` carries the current trip in `data`.
- The mapper layer (`trip_mapper.dart`, `routeChangeFromJson`, `driverFromJson`) is the only
  code that knows JSON field names, and follows the controllers/services in `api/src`.

### Navigation internals
- `PolylineWalker` walks the route by distance; `SimulatedLocationSource` drives it at a
  steady speed from a clock (distance = speed × elapsed time, not tick count) and limits how
  fast the heading may turn; `roundCorners` rounds the polyline's corners so the van and the
  line agree. A real GPS source only has to implement `LocationSource`.
- `findManeuvers` turns the geometry into turns (left/right/slight/sharp/U-turn) by
  resampling every 5 m and summing runs of changing heading.
- `MapView` wraps MapLibre; the 3D van is an extruded layer sized in screen pixels so it
  does not balloon when the camera is close.

---

## How the app talks to the API

All paths are under the base URL (`/api`). See `API_README.md` for the contracts.

| Area | Calls |
|---|---|
| Auth | `POST /auth/login`, `register`, `verify-otp`, `resend-otp`, `forgot-password`, `reset-password`, `refresh`, `logout`; `GET/PUT /auth/me`; `PUT /auth/change-password` |
| Trips | `GET /trips?date=&limit=`, `GET /trips/:id`, `POST /trips/:id/start`, `POST …/stops/:stopId/arrive`, `…/complete`, `…/proof` |
| Route changes | `GET /trips/:id/route-change`, `POST …/route-change/acknowledge` |
| Records | `GET /trips/:id/records` |
| Issues | `POST /issues` |
| Images | `POST /images` (multipart; purposes `avatar`, `proof_signature`, `proof_photo`, `issue_photo`) |
| Routing | `POST /routing/route` |
| Vehicle location | `POST /vehicles/:id/locations` (driver only; `:id` is the numeric vehicle id from `/auth/me`) |
| Assistant | `POST {AI_BASE_URL}/api/v1/chat` (separate service) |

A stop's id is its outlet's id. Order references look like `ORD0000012`.

---

## Testing

```bash
flutter test                       # whole suite
flutter test test/features/sync    # one area
flutter analyze
```

- **Repositories** are tested against a fake HTTP client with the API's real JSON shapes.
- **`test/support/offline_harness.dart`** builds the whole offline stack (API client, local
  store, cache, queue, submitter) over a fake network with an on/off switch, so tests can
  say "go offline, do this, come back, check what was sent and in what order".
- **Widget tests** pump the real routes with instant mock repositories, fake photo picker,
  fake signature encoder and a stand-in delivery-code verifier.
- Areas covered include: storage and cache wipe on driver change, queue persistence and
  ordering, submit/sync rules (transient vs refused, dependent steps), the offline overlay,
  PBKDF2 against Node's output, the offline code check in the UI, road-line cache, trips
  and profile flows, the assistant (HTTP contract, citations, controller, screen), and
  the navigation maths and camera.
- Widget tests run on fake time: a drive in progress needs `tester.pump(duration)`, not
  `pumpAndSettle`.

Not covered by automated tests: the real map and its tile download, the camera, and how
smooth the driving looks on a device — check those on a phone/emulator.

---

## Platform notes
- **Android:** `INTERNET` permission is declared. Tracking adds fine/coarse location, a location foreground service and notifications (Android 13+ asks for the notification permission). Plain `http://` (a local backend or AI
  service) works in **debug** builds only; production must use HTTPS. The emulator reaches
  your machine at `10.0.2.2`.
- **iOS:** camera and photo-library usage descriptions are in `Info.plist`. Location uses `NSLocationWhenInUseUsageDescription` and the `location` background mode.
- **Offline map download** needs Android or iOS (MapLibre offline regions); other platforms
  skip it.
- The emulator may show "System UI isn't responding" right after a cold boot; tap *Wait*.

---

## Known gaps
- **Navigation still drives a simulation** at 30 km/h. The GPS tracking above reports the
  phone's real position to the dispatcher, but the turn-by-turn view does not use it yet.
- **Vehicle tracking has been tested with a fake GPS** and against the API's documented
  rules, not yet on a phone driving a real trip: check the permission prompt, the
  foreground notification and the screen-off behaviour on a device.
- **Street names:** the routing API gives geometry only, so turn banners say the turn and
  the destination stop, not a street.
- **Start code offline:** by design it needs the server (see above).
- **Notifications:** no push; the Updates feed is derived and refreshed when the app loads
  or syncs.
- **AI assistant:** needs a deployed `ai-service` and `AI_BASE_URL`; answer quality depends
  on that service.
- **Smoothness** of the simulated drive and the offline tile download have been checked on
  an emulator only.

---

## Design source
Screens are built from the Figma file "WayPoint" (frame width 402). Tokens live in
`lib/core/theme/` (`AppColors`, `AppText`), copied from the Figma variables.
- Images/SVGs exported from Figma are in `assets/images/`.
- Fonts (variable, SIL OFL) are bundled in `assets/fonts/`: Google Sans Flex for UI text,
  Inter for status labels, Outfit for a few headings. Icons are Flutter's Material Icons.
- Map style: OpenFreeMap (OpenStreetMap data, no key) via MapLibre.
