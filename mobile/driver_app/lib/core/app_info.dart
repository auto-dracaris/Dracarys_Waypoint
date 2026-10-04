import 'api/api_config.dart';

/// Keep in step with `version:` in pubspec.yaml.
const appVersion = '1.0.0';

/// Where the app is pointed, for the Account footer: the API host, or the demo
/// data when it runs on mocks.
String environmentLabel({required bool demo}) =>
    demo ? 'Demo data' : Uri.parse(apiBaseUrl).host;
