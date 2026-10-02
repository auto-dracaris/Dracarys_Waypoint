import 'package:go_router/go_router.dart';

import '../../features/navigation/presentation/navigation_preview_screen.dart';
import '../../features/stops/presentation/arrived_screen.dart';
import '../../features/stops/presentation/stop_info_screen.dart';

/// Child routes of `/trips` (My trips tab): the driver's trip flow. Kept apart
/// from the app router so tests can mount exactly the same table.
final tripRoutes = <RouteBase>[
  GoRoute(
    path: 'trip/:tripId/stop/:stopId',
    builder: (context, state) => StopInfoScreen(
      tripId: state.pathParameters['tripId']!,
      stopId: state.pathParameters['stopId']!,
    ),
    routes: [
      GoRoute(
        path: 'navigate',
        builder: (context, state) => NavigationPreviewScreen(
          tripId: state.pathParameters['tripId']!,
          stopId: state.pathParameters['stopId']!,
        ),
      ),
      GoRoute(
        path: 'arrived',
        builder: (context, state) => ArrivedScreen(
          tripId: state.pathParameters['tripId']!,
          stopId: state.pathParameters['stopId']!,
        ),
      ),
    ],
  ),
];
