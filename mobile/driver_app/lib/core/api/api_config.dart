/// The hosted API. For a backend on your own machine, run with
/// `--dart-define=API_BASE_URL=http://10.0.2.2:5000/api` (Android emulator
/// reaching the host; plain http works in debug builds only).
const apiBaseUrl = String.fromEnvironment('API_BASE_URL',
    defaultValue: 'https://api.way-point.site/api');

/// `--dart-define=USE_MOCKS=true` runs the app on the in-memory repositories.
const useMocks = bool.fromEnvironment('USE_MOCKS');

/// Which built-in demo trip the demo data tells. Empty is the Gampaha story the
/// tests use; `--dart-define=DEMO_AREA=colombo` is a short loop of stops in
/// central Colombo (about 1 km apart, tall buildings for the 3D view).
const demoArea = String.fromEnvironment('DEMO_AREA');

/// `--dart-define=HIDE_DEMO_UI=true` keeps the demo data running but hides the
/// "Demo data" switch, for a screen recording that should look like the real app.
const hideDemoUi = bool.fromEnvironment('HIDE_DEMO_UI');

/// How fast the demo van drives (km/h). 30 is a gentle city pace; raise it
/// (`--dart-define=DEMO_SPEED_KMH=70`) to keep a screen recording short.
const demoSpeedKmh = 0.0 + int.fromEnvironment('DEMO_SPEED_KMH', defaultValue: 30);

/// Where the AI assistant service runs (`POST {AI_BASE_URL}/api/v1/chat`). A
/// separate service from the main API, hosted behind the same site at
/// `/ai-api/`. For one on your own machine, run with
/// `--dart-define=AI_BASE_URL=http://10.0.2.2:8000` (Android emulator reaching
/// the host). Set it empty to turn the assistant off; the chat then says it is
/// not set up instead of failing.
const aiBaseUrl = String.fromEnvironment('AI_BASE_URL',
    defaultValue: 'https://way-point.site/ai-api');
