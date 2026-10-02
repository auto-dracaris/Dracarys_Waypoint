import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../features/account/presentation/account_screen.dart';
import '../../features/auth/presentation/auth_controller.dart';
import '../../features/auth/presentation/login_screen.dart';
import '../../features/auth/presentation/signup_screen.dart';
import '../../features/auth/presentation/splash_screen.dart';
import '../../features/notifications/presentation/updates_screen.dart';
import '../../features/trips/presentation/my_trips_screen.dart';
import 'app_shell.dart';
import 'trip_routes.dart';
import 'auth_redirect.dart';

final splashDurationProvider =
    Provider<Duration>((ref) => const Duration(milliseconds: 1600));

final routerProvider = Provider<GoRouter>((ref) {
  final refresh = ValueNotifier<int>(0);
  ref.listen(authControllerProvider, (_, _) => refresh.value++);

  final router = GoRouter(
    initialLocation: '/splash',
    refreshListenable: refresh,
    redirect: (context, state) => authRedirect(
      location: state.matchedLocation,
      auth: ref.read(authControllerProvider),
    ),
    routes: [
      GoRoute(path: '/splash', builder: (_, _) => const SplashScreen()),
      GoRoute(path: '/login', builder: (_, _) => const LoginScreen()),
      GoRoute(path: '/signup', builder: (_, _) => const SignUpScreen()),
      StatefulShellRoute.indexedStack(
        builder: (_, _, shell) => AppShell(shell: shell),
        branches: [
          StatefulShellBranch(routes: [
            GoRoute(
              path: '/trips',
              builder: (_, _) => const MyTripsScreen(),
              routes: tripRoutes,
            ),
          ]),
          StatefulShellBranch(routes: [
            GoRoute(
              path: '/updates',
              builder: (_, _) => const UpdatesScreen(),
              routes: updateRoutes,
            ),
          ]),
          StatefulShellBranch(routes: [
            GoRoute(
                path: '/account', builder: (_, _) => const AccountScreen()),
          ]),
        ],
      ),
    ],
  );

  ref.onDispose(() {
    router.dispose();
    refresh.dispose();
  });
  return router;
});
