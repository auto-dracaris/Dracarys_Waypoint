# Waypoint Driver App — Design

Date: 2026-09-29 · Branch: WP-5

## Purpose

A Flutter mobile app for delivery **drivers** of the company, to manage their trips, stops,
orders and notifications. Built for a competition: working features, flows and visual design
matter most; it will not go to production and time is short. Ships as a clean base that is
built **page by page** against Figma designs (screenshots in `C:\Users\sulit\Documents\Way\ss`;
live Figma connection later).

## Scope

In scope (driver app only):

- **Splash** — logo on launch, then routes to login or My Trips.
- **Login / Sign up** — mock auth (no backend yet). Not in Figma; kept minimal, restyled when designs arrive.
- **My Trips** — vehicle banner (VEH021, refrigerated van), trip cards (departure, stop count, loading status), Online/Synced pill, notification bell with badge.
- **Trip Details / Stop Info** — "N of M stops completed" progress, map, bottom sheet (next stop, delivery window, planned arrival, dock, order chips Chilled/Ambient, Get Directions, Mark arrived); expanded order list variant.
- **Navigation Preview** — From/To card, numbered route polyline, ETA/distance, Start navigation, Route details.
- **Turn-by-turn** — flat 2D map, instruction banner, ETA bar, simulated progress. **No 3D.**
- **Updates (notifications)** — All/Errors tabs, grouped Today/Yesterday, colour-coded cards (red action / yellow info / neutral).
- **Account** — driver profile card + sign out only.
- Shell: 3-tab bottom nav (My trips / Updates / Account).

Out of scope: loader app (separate, later), real API calls, 3D navigation, production hardening,
full test suite.

## Architecture

- **Location:** `mobile/driver_app/` in this monorepo, beside `api/`. Other members add their own project folders.
- **Feature-first:** `lib/core/` (theme, shared widgets, router, config) and
  `lib/features/<name>/{data,domain,presentation}` for auth, trips, stops, notifications, account, navigation.
- **Data layer:** each feature has an abstract repository plus a `Mock…Repository` (only implementation for now,
  with a small artificial delay so loading states show). Riverpod providers expose repositories; connecting the
  existing `api/` later = adding an API implementation and changing one provider. No screen code changes.
- **Models:** plain immutable Dart classes with `fromJson`, shaped like the likely API payloads. No codegen.
- **State:** Riverpod `AsyncNotifier`s per screen.
- **Routing:** `go_router` with `StatefulShellRoute` for the 3 tabs; trip details, navigation preview and
  turn-by-turn are pushed above the shell; splash/login/signup outside it with an auth redirect.
- **Maps:** `flutter_map` + OpenStreetMap tiles (no API key). Route = polyline + numbered markers; turn-by-turn = simulated.

## Design system (`core/`)

- Tokens: yellow primary (~`#E3B412`), near-black text, soft grey surfaces, green/red/amber status colours,
  extracted from screenshots; refined when Figma is connected. Material 3 base, `google_fonts`.
- Shared widgets, built once: `StatusPill`, `TripCard`, `InfoTile`, `OrderChip`, `PrimaryButton`,
  `NotificationCard`, `ProgressStops`, `BottomSheetPanel`, async loading/empty/error view.
- Kept self-contained so it can be lifted into a shared package if the loader app needs it (not built now).

## Mock data & demo behaviour

- Figma story: driver Nimal Silva (DRV021, Peliyagoda depot), vehicle VEH021, Trip 1 (4 stops, loading in progress),
  Trip 2 (2 stops, assigned), orders ORD-4521 (Chilled, 12 cases) / ORD-4522 (Ambient, 8 cases).
- "Mark arrived" advances stop and progress; notifications seeded with the Figma cards.
- Long-press the Online pill toggles Offline state for demos.
- Mock auth accepts any well-formed credentials (sign up stores a mock driver in memory).

## Errors & testing

- Every async screen handles loading / empty / error via the shared view.
- `flutter analyze` clean; 2–3 widget smoke tests (trip list renders, Mark arrived advances progress).

## Workflow

Base first (project scaffold, theme, router, mock repos, shared widgets), then screens one at a time,
each reviewed against its Figma design before moving on.
