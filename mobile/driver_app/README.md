# Waypoint Driver App

Flutter app for delivery drivers (competition build, UI + mock data).

## Run
    flutter pub get
    flutter run            # pick a device: Android emulator, Chrome, Windows...

## Structure
- `lib/core/` theme, shared widgets, router
- `lib/features/<name>/{domain,data,presentation}`
- Data comes from `Mock...Repository` classes; to connect the API, change the
  `...RepositoryProvider` in each feature's `data/*_providers.dart`.

## Demo login
Any email with a password of 6+ characters signs in as Nimal Silva (DRV021).
Sign up creates an in-memory driver.
