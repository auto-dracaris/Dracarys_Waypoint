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

final splashDurationProvider =
    Provider<Duration>((ref) => const Duration(milliseconds: 1600));

const _publicRoutes = {'/splash', '/login', '/signup'};

final routerProvider = Provider<GoRouter>((ref) {
  final refresh = ValueNotifier<int>(0);
  ref.listen(authControllerProvider, (_, _) => refresh.value++);
  ref.onDispose(refresh.dispose);

  return GoRouter(
    initialLocation: '/splash',
    refreshListenable: refresh,
    redirect: (context, state) {
      final auth = ref.read(authControllerProvider);
      if (auth.isLoading) return null;
      final loggedIn = auth.hasValue && auth.value != null;
      final loc = state.matchedLocation;
      if (loc == '/splash') return null;
      if (!loggedIn && !_publicRoutes.contains(loc)) return '/login';
      if (loggedIn && (loc == '/login' || loc == '/signup')) return '/trips';
      return null;
    },
    routes: [
      GoRoute(path: '/splash', builder: (_, _) => const SplashScreen()),
      GoRoute(path: '/login', builder: (_, _) => const LoginScreen()),
      GoRoute(path: '/signup', builder: (_, _) => const SignUpScreen()),
      StatefulShellRoute.indexedStack(
        builder: (_, _, shell) => AppShell(shell: shell),
        branches: [
          StatefulShellBranch(routes: [
            GoRoute(path: '/trips', builder: (_, _) => const MyTripsScreen()),
          ]),
          StatefulShellBranch(routes: [
            GoRoute(
                path: '/updates', builder: (_, _) => const UpdatesScreen()),
          ]),
          StatefulShellBranch(routes: [
            GoRoute(
                path: '/account', builder: (_, _) => const AccountScreen()),
          ]),
        ],
      ),
    ],
  );
});
