# Waypoint Driver App

Flutter app for Waypoint delivery drivers. A driver signs in, sees the day's trips,
starts a trip with the loader's code, navigates stop to stop, records what was
delivered (the outlet's code or a photo), reports problems, and can ask an AI
assistant questions. It is built to keep working **without a signal**: what the
driver does is saved on the phone and sent when the connection returns.

- [Highlights](#highlights)
- [Quick start](#quick-start) — **real vs demo build**, settings
- [Stop rules](#stop-rules) — what a driver can do and when
- [Features](#features)
- [Offline mode](#offline-mode) — storage, the action queue, sync, **start code and delivery code (OTP) handling**, offline maps
- [Architecture](#architecture)
- [How the app talks to the API](#how-the-app-talks-to-the-api)
- [Testing](#testing)
- [Platform notes](#platform-notes)
- [Design source](#design-source)

## Highlights

- **Works on the road, with or without signal.** Every delivery step is saved on the
  phone first and sent in order when the connection returns; nothing the driver does is lost.
- **Delivery codes checked at the dock.** The outlet's 6-digit code is verified on the phone
  against a salted PBKDF2 hash, so a wrong code is caught on the spot, online or not.
- **Clear rules at every stop.** One shared rule decides what a driver can do next, so each
  screen shows exactly the right action at the right time.
- **Live vehicle tracking.** GPS positions are recorded every second and sent to the
  dispatcher about once a minute, including after the signal comes back.
- **Guided navigation.** Route preview, turn-by-turn banners, ETA bar and a 2D/3D follow
  camera, with road lines and map tiles saved for offline use.
- **Real-time updates.** An Updates feed and Android push notifications for new trips,
  loaded vehicles, route changes and issue replies.
- **AI assistant.** Read-only chat that answers questions about the driver's trips and
  approved delivery and incident policy.
- **Clean, tested architecture.** Feature-first layers, Riverpod state, swappable
  repositories and a ~540-test suite.

---

## Quick start

```bash
flutter pub get
flutter run                      # the real app, on the hosted API
flutter test && flutter analyze  # ~540 tests
```

### Real build or demo build

One switch decides which app you get. **Real** is the normal app; **demo** runs on
built-in data with no server and no "demo" wording on screen (good for a screen
recording). The helper script wraps the commands (`tool/app.ps1`, Windows PowerShell):

| Want | Command (from `mobile/driver_app`) |
|---|---|
| Real app on a connected phone | `./tool/app.ps1 -Mode real -Action install -Device <id>` |
| Demo app on a connected phone | `./tool/app.ps1 -Mode demo -Action install -Device <id>` |
| Run with hot reload | `./tool/app.ps1 -Mode real -Action run` (or `-Mode demo`) |
| Release APK to share | `./tool/app.ps1 -Mode real -Action apk` |
| Play the whole demo trip by itself | `./tool/app.ps1 -Mode demo -Action test -Device <id>` |

Find device ids with `flutter devices`. Without the script, demo is the same thing as
`flutter run --dart-define-from-file=config/demo.json`; leave the flag off for real.
`install` replaces the other mode's copy on the phone (same app id), so you sign in again.
A **release** build never contains demo mode, whatever the flags say.

By default the app talks to the hosted API, `https://api.way-point.site/api`.

| Setting (`--dart-define=NAME=value`) | Default | Use |
|---|---|---|
| `API_BASE_URL` | `https://api.way-point.site/api` | Point at your own backend, e.g. `http://10.0.2.2:5000/api` (Android emulator reaching a server on your machine; plain `http` works in debug builds only). |
| `AI_BASE_URL` | `https://way-point.site/ai-api` | Where the AI assistant service runs. For your own: `http://10.0.2.2:8000`. Set it empty to turn the assistant off ("not set up" in the chat). |
| `USE_MOCKS` | `false` | Start in **demo data** mode (see below). |
| `DEMO_AREA` | *(empty)* | Which demo story: empty is the Gampaha trips the tests use, `colombo` is the short central-Colombo loop. |
| `HIDE_DEMO_UI` | `false` | Hide the "Demo data" switch, for a recording. |
| `DEMO_SPEED_KMH` | `30` | How fast the simulated van drives. |

These demo settings are already in `config/demo.json`.

### Demo data (no server needed)

A **Demo data** switch is on the sign-in screen and at the bottom of the Account tab
(debug builds only, and hidden by `HIDE_DEMO_UI`). When on, every repository is swapped
for built-in fake data: trips, fake route changes, notifications, a scripted assistant.
Sign in with any phone number and a password of 6+ characters.

- **Colombo story** (`DEMO_AREA=colombo`): *Trip 1*, already loaded, four stops about
  1 km apart through Pettah, Slave Island, Galle Face and the World Trade Centre (tall
  buildings for the 3D view), and *Trip 2*, still loading. The demo depot is at the Fort.
- **Delivery code in demo:** type **`482913`** on the proof screen; any other code is
  refused, so a wrong-code moment can be shown too.

- Switching sends you back to sign-in (demo data has its own session). Your real
  session is untouched and returns when you switch back.
- The choice is remembered between launches.
- Useful demo hooks (debug builds): **long-press the yellow "Loading in progress" banner** on the trip
  overview to mark loading complete (stands in for the loader's app); **long-press the
  Online pill** to force the app offline until you long-press it again.
- Demo mode shows off the screens, map and navigation end to end. The offline queue, sync
  and offline code check are part of the real build and are covered by automated tests.

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
- **Proof of delivery:** receiver's name, then an **OTP | Photo** choice. *OTP*: six boxes
  for the outlet's delivery code and a **Verify** button (checked on the phone, see
  [the two codes](#the-two-codes-otp)); *Photo*: a camera photo when the store cannot
  give a code. Optional notes. Completing a stop sends arrival, proof/code and completion.
- **Report an issue:** damaged goods, temperature breach, short delivery, wrong items,
  other; affected cases; note; camera photo. Sent to the dispatcher via `POST /issues`.
- Every action carries a `planVersion`: if the dispatcher reordered the stops in the
  meantime the server answers `409` and the driver is told to review the change first.

### Navigation
- **Route preview:** the whole route with numbered stops, ETA and distance.
- **Live turn-by-turn** (per the Figma "Turn-by-Turn Navigation" screen): a blue banner
  with the distance to the next turn, the turn and a "Then" preview, a red ETA bar
  (minutes left, km, arrival time), a 2D/3D button, end-navigation button and a
  recentre button. Turns are derived from the route geometry, so guidance works from
  any route the API returns.
- **Smooth guided drive** at a steady 30 km/h; a `LocationSource` interface lets the
  phone's live GPS drive the same view. The camera follows the
  van in both modes: **3D** is a tilted chase view, **2D** is heading-up from straight
  above. The van and camera are carried forward to the moment each frame is drawn by
  the same distance, so uneven map updates do not read as jumps.
- Routes come from `POST /routing/route` (the project's own OSRM, with a profile per
  vehicle type).

### Vehicle tracking
- While a trip is **in progress**, the phone records the vehicle's GPS position about
  every **second** and sends the list to the dispatcher about **once a minute**
  (`POST /vehicles/:id/locations`), so they can see where the vehicle is. Both times are
  minimums: a weak GPS, traffic or no signal only stretch them. It stops when no trip is
  under way.
- It keeps going with the screen off (on Android a "Trip in progress" notification shows
  that the phone is sharing its position), and with **no signal it keeps recording and
  sends the backlog later** (see [offline mode](#vehicle-location-points)).
- If location is off or not allowed, My trips shows a red notice with a **Try again**
  button, because the dispatcher cannot see the vehicle without it.
- Tracking follows real trips for drivers with an assigned vehicle.

### Updates and route changes
- **Updates tab:** the server's notification list (`GET /notifications`): trip assigned,
  trip ready, route changed, issue acknowledged/resolved. Opening a card marks it read
  and goes to the trip or the route update. An unknown type shows its words with no
  action. With no connection it falls back to a list worked out from the saved trips.
- **Push (Android):** see [Push notifications](#push-notifications-android).
- **Route update:** the dispatcher's reorder, with before/after sequence, the stop most
  affected and any tight-window warning; the driver acknowledges it
  (`GET /trips/:id/route-change`, `POST …/acknowledge`).

### AI assistant
- A sparkle button beside the bell on My trips opens a chat: suggestion cards, typing
  indicator, formatted answers (bold, italics, lists), numbered collapsible sources,
  retry on failure, **New chat**. History is kept per driver and readable offline.
- Talks to the separate `ai-service` (`POST /api/v1/chat`, workflow `business_qa`), live at
  `https://way-point.site/ai-api`, with the driver's access token (not in demo mode). It is read-only: it can look at the driver's trips and
  route changes and search approved delivery/incident policy, never change anything.
- The chat sends the current trip's id as context so "my next stop" has a meaning.
- Offline, the box is disabled and the earlier chat stays readable.

---

## Stop rules

One rule (`features/trips/domain/stop_gate.dart`) decides what a driver may do at a stop.
The screens, the routes and the repositories all ask it, so something that would be
refused is neither offered nor saved to the offline queue.

- **Trip not on the road** (assigned, loading, ready): no directions, arriving, proof or
  issue. The stop shows why ("Still being loaded", "Start the trip first"); only the trip
  overview works, and **Ready to depart** needs the start code and a connection.
- **Trip in progress:** only the **next** stop can be worked on; stops go in order. Later
  stops are dimmed and read-only.
- **Order inside a stop:** directions come before arriving; the delivery details, proof
  and issue come after arriving. A stop that was not marked arrived cannot be opened there.
- **Route changed by the dispatcher:** the stop is held until the driver has reviewed the
  new route (the server would refuse actions against the old plan).
- **Short delivery:** if any order is delivered below its planned cases, *Continue* turns
  into *Report the shortfall*; completing the stop is held until an issue is reported for
  each short order.
- **Trip completed:** everything is view-only. Arriving twice does nothing; completing
  needs the stop to be arrived first.
- The offline "saved trip" screen follows the same rule (it explains instead of offering
  actions before the trip starts).

---

## Push notifications (Android)

The server keeps each driver's notification list and also pushes every item through
Firebase Cloud Messaging (FCM); a push nudges the app to refresh
(`api/src/modules/notifications`).

- **Registration:** after sign-in the app asks for the notification permission, gets the
  phone's FCM token and registers it (`POST /devices`). It re-registers when Firebase
  changes the token and removes it before logout (`DELETE /devices/:token`), so a phone only
  receives the signed-in driver's notifications.
- **On a push:** with the app open the list refreshes; a tap opens the trip
  (`trip_assigned`, `trip_ready`) or the route-update screen (`route_changed`), and anything
  else opens the Updates tab. Code: `features/notifications/application/push_registrar.dart`.
- **Firebase project:** `waypoint-f0a64`, Android app `com.dracarys.driver_app`; the client
  config is `android/app/google-services.json` and `lib/firebase_options.dart` (generated by
  `flutterfire configure`). The app also runs fine without Firebase; push simply switches on
  when it is present.
- **Server side:** a Firebase service-account key from the same project in
  `FIREBASE_SERVICE_ACCOUNT` turns pushes on (see the server's notifications README). The
  in-app list is always available.

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
| Start a trip (start code) | Online, once | The server accepts the loader's code and prepares the whole trip for the road (explained below). |
| Sign in, change password, upload an avatar, ask the assistant | Live when connected | Use the server directly. |

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
data.

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

#### 1. Start code (the loader's dispatch code) — **confirmed by the server**
- When the loader marks the vehicle loaded, the API creates a start code, shows it to the
  loader, and **texts it to the driver** ("Your vehicle is loaded. Your start code is …";
  an SMS needs mobile coverage, not data). The driver types it in **Ready to depart**.
- It is verified by the server (`POST /trips/:id/start`), so the start is a single trusted
  moment, and the app tells the driver clearly when it is waiting for a connection.
- The server guards the code against repeated wrong tries, and the loader can issue a new
  one at any time (`POST /trips/:id/loading/code`). The app checks that the box holds 6
  digits before sending.
- Starting is also the moment the API texts each outlet its delivery code and returns the
  delivery-code hashes the phone needs, so **starting online is what makes the rest of the
  trip work offline.**
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
- **Built for safety.** The phone holds only a salted hash, never the code. The 150 000
  PBKDF2 rounds keep it strong, the hash is dropped once the stop is completed, and the
  server always has the final say on sync.
- **Verify button.** On the proof screen the driver types the code into six boxes and
  taps **Verify**. When the phone holds the hash it checks there and then, online or not;
  a wrong code turns the boxes red and **Complete stop** stays blocked. The server checks
  the code again when the stop is completed and has the final say.
- **If the store cannot give a code**, use the **Photo** tab: the photo plus receiver's
  name is recorded first and **completes the stop**; the dispatcher is told the code was
  not used. This also works offline.
- **Demo data** has no hash, so it accepts one fixed code, `482913`.
- When the server confirms the code at sync time, a rejected one comes back as a clear
  action with the server's message.
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

- **Recording:** every 1 s while a trip is in progress, the latest GPS reading becomes a
  point with its own `clientId` (a UUID made once and stored with it) and the phone's
  time (`recordedAt`). Readings older than 15 s, or vaguer than 200 m, are skipped;
  heading and speed the phone cannot give are left out.
- **Storage:** points go to `LocationBuffer`, in chunks of 100 so adding a point rewrites
  only the newest chunk however long the backlog (a day is ~17,000 points). It survives an
  app restart, is wiped with the rest when a different driver signs in, and is capped at
  100,000 points (the oldest are dropped first).
- **Sending:** about once a minute when online (the first batch goes at once, so the
  dispatcher sees the vehicle as soon as the trip starts), and at once when the network
  returns or the trip ends, in batches of **up to 500, oldest first**, until the backlog
  is empty. A retried point is
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
- **Simple payload:** no trip id is needed; the server links each point to the trip running
  at its `recordedAt`.

### Plan changes while offline
The dispatcher may reorder stops while the driver is offline, and the app handles it
cleanly. The queued `arrive`/`complete`
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
- **Widget tests** pump the real routes with instant mock repositories, a fake photo picker
  and a stand-in delivery-code verifier. The shared test trip starts on the road; tests
  that need it still loading ask for that explicitly.
- Areas covered include: storage and cache wipe on driver change, queue persistence and
  ordering, submit/sync rules (transient vs refused, dependent steps), the offline overlay,
  PBKDF2 against Node's output, the offline code check in the UI, road-line cache, trips
  and profile flows, the assistant (HTTP contract, citations, controller, screen), and
  the navigation maths and camera.
- Widget tests run on fake time: a drive in progress needs `tester.pump(duration)`, not
  `pumpAndSettle`.

- **`integration_test/demo_trip_test.dart`** plays the Colombo demo trip on a device by
  itself, at a pace for a screen recording (`./tool/app.ps1 -Mode demo -Action test`).
  Run it on an emulator with the GPU on (an emulator with its GPU off draws a black
  screen) and internet for the map.

---

## Platform notes
- **Android:** `INTERNET` permission is declared. Tracking adds fine/coarse location, a
  location foreground service and notifications (Android 13+ asks for the notification
  permission). Production uses HTTPS, and debug builds also allow a local `http://` backend
  or AI service; the emulator reaches your machine at `10.0.2.2`.
- **iOS:** camera and photo-library usage descriptions are in `Info.plist`. Location uses `NSLocationWhenInUseUsageDescription` and the `location` background mode.
- **Offline map download** uses MapLibre offline regions on Android and iOS.

---

## Design source
Screens are built from the Figma file "WayPoint" (frame width 402). Tokens live in
`lib/core/theme/` (`AppColors`, `AppText`), copied from the Figma variables.
- Images/SVGs exported from Figma are in `assets/images/`.
- Fonts (variable, SIL OFL) are bundled in `assets/fonts/`: Google Sans Flex for UI text,
  Inter for status labels, Outfit for a few headings. Icons are Flutter's Material Icons.
- Map style: OpenFreeMap (OpenStreetMap data, no key) via MapLibre.
