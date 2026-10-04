# Driver app: wiring to the real API

Date: 2026-10-04
Status: design approved in chat; awaiting spec review

## Goal

Replace the driver app's mock repositories with HTTP repositories that talk to
the NestJS API in `api/`, so the app works end to end. Until the API is hosted,
every stage is run and verified against a **local API** (Docker Postgres +
RabbitMQ + `npm run start`) from the Android emulator. The base URL is build
time config so pointing at the hosted API later is a flag change.

## Success criteria

- A driver can sign in by phone, see the real trips, start one with the
  loader's start code, arrive at and complete each stop with the outlet's
  delivery code, record a proof or issue with photos, and see route changes,
  all against the local API on the emulator.
- Mocks are still available (`--dart-define=USE_MOCKS=true`) and the existing
  tests keep passing.
- Notifications stay on the mock (backend has not built them) and the offline
  outbox is out of scope (see "Later").

## Source of truth

`origin/main`: `api/src/**` and `mobile/driver_app/API_README.md` (sections 0-9,
especially section 8 "App changes to make"). Findings that drive the work:

- Trip status seen by the app has 7 values: `draft | assigned | loading | ready
  | in_progress | completed | cancelled` (mapped from the DB's `draft, planned,
  loading, loaded, dispatched, completed, cancelled` in `trips.service.ts`).
  The app currently models 5.
- Login is by phone + password; registration is first name, last name, phone,
  password, then OTP. Forgot/reset password exist.
- Starting a trip needs the loader's 6-digit code (`otp`). Completing a stop
  needs `planVersion`, `deliveredCases` per order reference and the outlet's
  delivery code (or a proof of delivery instead).
- Every driver action carries a device-minted `clientId` and device time.
- Images upload first (`POST /images`); other bodies reference the returned id.
- Ids: trip = UUID, stop = outlet id as string, order = `ORD0000012`.

## Approach

Swap each mock repository for an HTTP implementation behind the existing
repository interface. Screens and providers keep their shape. A provider picks
HTTP or mock from `USE_MOCKS`. Rejected: generated API clients (too heavy for
~15 endpoints) and screens calling the API directly (breaks structure and tests).

## Stages

Each stage ends with `flutter analyze`, `flutter test`, and a run on the
emulator against the local API before the next begins.

### Stage 0: groundwork
- Merge `origin/main` into `feat/live-navigation`; resolve conflicts
  (expected: `API_README.md`).
- Bring up the local API: `docker compose up`, `api/.env` with the demo driver
  and loader passwords, seed, `GET /api/health`. Follow `api/docs/api-test/trips/`
  to produce a `ready` trip (dispatcher plans and publishes via the web app,
  loader calls `loading/start` and `loading/complete`).

### Stage 1: HTTP foundation and auth
- `ApiClient` on the existing `http` dependency: base URL from
  `--dart-define=API_BASE_URL` (emulator `http://10.0.2.2:5000/api`), bearer
  token, unwraps `{statusCode, message, data}`, typed exceptions, refresh once
  on 401 then sign out, 409 carries the current trip.
- Token storage (secure storage package).
- Debug-manifest cleartext HTTP only.
- Auth: phone login, sign-up with OTP step, forgot/reset password; driver
  profile, vehicle and depot from `/auth/me` (`driver` block).

### Stage 2: trips
- `TripStatus` becomes the 7 app-visible values; wire `in_progress` maps to
  `inProgress`. Trip card image map covers all 7 (same image for now).
- Models: string stop ids, order references, `vehicle`, `stopCount`,
  `completedStops`, `deliveryCode`, `codeVerified`.
- Paginated `GET /trips`, `GET /trips/:id`, poll every 30-60 s while open.
- Remove "simulate loading complete".

### Stage 3: driver actions
- Start code entry before `POST /trips/:id/start`.
- Arrive/complete take `stopId` and `planVersion`, device time, `clientId`.
- Delivery code checked on the handset against the saved hash; proof-of-delivery
  fallback.

### Stage 4: records and the rest
- `POST /images` then proof/issue/profile bodies by image id.
- Issue form types aligned to the API's `IssueType` list.
- Records from `GET /trips/:id/records`; route change with `DateTime` times and
  acknowledge.
- Live location to `POST /vehicles/:id/locations` (batched uploader, GPS
  source); routing via `POST /routing/route` with straight-line fallback.

## Testing

Test first for mappers (JSON to model), status mapping, `ApiClient`
(envelope, refresh, 409), code checks, using a fake HTTP client. Emulator
verification per stage as above.

## Risks

- Producing a real trip needs the web app and loader calls (stage 0).
- Cleartext HTTP and `10.0.2.2` are dev-only; production needs HTTPS.
- `origin/main` carries 400+ changed files (mostly `web/`); the merge should
  only touch the app through `API_README.md`.

## Later (out of scope)

Local database for trip cache, persistent outbox with retry/backoff, real
connectivity listener, notifications and push.
