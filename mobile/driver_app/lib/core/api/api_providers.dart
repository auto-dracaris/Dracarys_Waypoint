import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../features/auth/presentation/auth_controller.dart';
import '../connectivity/online_provider.dart';
import 'api_client.dart';
import 'api_config.dart';
import 'secure_token_store.dart';
import 'token_store.dart';

final tokenStoreProvider = Provider<TokenStore>((ref) => SecureTokenStore());

final apiClientProvider = Provider<ApiClient>((ref) => ApiClient(
      baseUrl: apiBaseUrl,
      tokens: ref.watch(tokenStoreProvider),
      // A failed refresh means the session is gone: re-run auth so the router
      // sends the driver to /login.
      onSignedOut: () => ref.invalidate(authControllerProvider),
      onReachability: (ok) => ref.read(onlineProvider.notifier).report(ok),
    ));
