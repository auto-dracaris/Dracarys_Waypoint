# Waypoint Driver App

Flutter app for delivery drivers (competition build, UI + mock data).

## Run
    flutter pub get
    flutter run            # pick a device: Android emulator, Chrome, Windows...
    flutter test && flutter analyze

## Demo login
Any email with a password of 6+ characters signs in as Nimal Silva (DRV021).
Sign up creates an in-memory driver.

## Design source
Screens are built from the Figma file "WayPoint" (frame width 402). Tokens live in
`lib/core/theme/` (`AppColors`, `AppText`), copied from the Figma variables.
- Images/SVGs exported from Figma are in `assets/images/`.
- Fonts (variable, SIL OFL) are bundled in `assets/fonts/`: Google Sans Flex for UI text,
  Inter for status labels, Outfit for a few headings. Icons are Flutter's Material Icons (Round variants).
- Screens: My Trips, Updates, Trip overview, Stop info (+ orders), Navigation preview, Arrived,
  Proof of delivery, Report issue, Route update, Offline trip. The 3D turn-by-turn view is not built.
- Demo hooks: long-press the Online pill to go offline; long-press the yellow "Loading in progress"
  banner on the trip overview to finish loading (stands in for the loader app).
- Map tiles come from OpenStreetMap and need internet.

## Architecture
Feature-first, three layers per feature, dependencies point inward:

    lib/core/                      theme, shared widgets, router (no feature logic)
    lib/features/<name>/
      domain/                      plain immutable models (no Flutter, no I/O)
      data/                        abstract Repository + Mock implementation + Riverpod provider
      presentation/                screens and state (only talk to repositories via providers)

Principles in practice:
- **Single responsibility:** routing rules live in `core/router/auth_redirect.dart` (pure
  function, unit-tested); the router only wires them. Form behaviour shared by login and
  sign-up lives in `AuthFormState`; visuals in `AuthScaffold` / `FormError`.
- **Dependency inversion:** screens depend on `abstract interface class …Repository`, never
  on `Mock…`. To connect the real API, add an implementation and change the one
  `…RepositoryProvider` per feature; no screen changes.
- **Open/closed:** new screens are added as routes + presentation code; domain and data
  layers are untouched unless the data itself changes.
- **No cross-account leaks:** data providers watch the signed-in driver, so caches reset on
  sign-out / user switch.
- **Failures are handled at the edge:** forms show inline errors for any failure; async
  screens use the shared `AsyncValueView` (loading / empty / error + retry).
