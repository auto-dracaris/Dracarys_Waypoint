/// The hosted API. For a backend on your own machine, run with
/// `--dart-define=API_BASE_URL=http://10.0.2.2:5000/api` (Android emulator
/// reaching the host; plain http works in debug builds only).
const apiBaseUrl = String.fromEnvironment('API_BASE_URL',
    defaultValue: 'https://api.way-point.site/api');

/// `--dart-define=USE_MOCKS=true` runs the app on the in-memory repositories.
const useMocks = bool.fromEnvironment('USE_MOCKS');
