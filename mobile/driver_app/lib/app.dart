import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'core/router/app_router.dart';
import 'core/theme/app_theme.dart';
import 'features/notifications/application/push_registrar.dart';
import 'features/sync/presentation/offline_host.dart';

class WaypointDriverApp extends ConsumerWidget {
  const WaypointDriverApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    ref.watch(pushLifecycleProvider); // registers this phone for pushes
    return MaterialApp.router(
      title: 'Waypoint Driver',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.light,
      routerConfig: ref.watch(routerProvider),
      builder: (context, child) =>
          OfflineHost(child: child ?? const SizedBox.shrink()),
    );
  }
}
