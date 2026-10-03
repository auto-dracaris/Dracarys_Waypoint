/// Where the API lives. The emulator reaches the host machine at 10.0.2.2.
/// Override with `--dart-define=API_BASE_URL=https://...` when it is hosted.
const apiBaseUrl = String.fromEnvironment('API_BASE_URL',
    defaultValue: 'http://10.0.2.2:5000/api');

/// `--dart-define=USE_MOCKS=true` runs the app on the in-memory repositories.
const useMocks = bool.fromEnvironment('USE_MOCKS');
