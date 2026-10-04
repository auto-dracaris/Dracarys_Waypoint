/// The hosted API. For a backend on your own machine, run with
/// `--dart-define=API_BASE_URL=http://10.0.2.2:5000/api` (Android emulator
/// reaching the host; plain http works in debug builds only).
const apiBaseUrl = String.fromEnvironment('API_BASE_URL',
    defaultValue: 'https://api.way-point.site/api');

/// `--dart-define=USE_MOCKS=true` runs the app on the in-memory repositories.
const useMocks = bool.fromEnvironment('USE_MOCKS');

/// Where the AI assistant service runs (`POST {AI_BASE_URL}/api/v1/chat`). It
/// is a separate service from the main API and is not hosted yet, so there is
/// no default: run with
/// `--dart-define=AI_BASE_URL=http://10.0.2.2:8000` (Android emulator reaching
/// a service on this machine). Empty means the assistant is not set up, and
/// the chat says so instead of failing.
const aiBaseUrl = String.fromEnvironment('AI_BASE_URL');
