import 'package:go_router/go_router.dart';

import '../../features/navigation/presentation/navigation_preview_screen.dart';
import '../../features/offline/presentation/offline_trip_screen.dart';
import '../../features/route_update/presentation/route_update_screen.dart';
import '../../features/stops/presentation/arrived_screen.dart';
import '../../features/stops/presentation/proof_of_delivery_screen.dart';
import '../../features/stops/presentation/report_issue_screen.dart';
import '../../features/stops/presentation/stop_info_screen.dart';
import '../../features/trips/presentation/trip_overview_screen.dart';

/// Child routes of `/trips` (My trips tab): the driver's trip flow. Kept apart
/// from the app router so tests can mount exactly the same table.
final tripRoutes = <RouteBase>[
  GoRoute(
    path: 'trip/:tripId',
    builder: (context, state) =>
        TripOverviewScreen(tripId: state.pathParameters['tripId']!),
    routes: [
      GoRoute(
        path: 'offline',
        builder: (context, state) =>
            OfflineTripScreen(tripId: state.pathParameters['tripId']!),
      ),
      GoRoute(
        path: 'stop/:stopId',
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
          GoRoute(
            path: 'proof',
            builder: (context, state) => ProofOfDeliveryScreen(
              tripId: state.pathParameters['tripId']!,
              stopId: state.pathParameters['stopId']!,
            ),
          ),
          GoRoute(
            path: 'issue/:orderId',
            builder: (context, state) => ReportIssueScreen(
              tripId: state.pathParameters['tripId']!,
              stopId: state.pathParameters['stopId']!,
              orderId: state.pathParameters['orderId']!,
            ),
          ),
        ],
      ),
    ],
  ),
];

/// Child routes of `/updates` (Updates tab).
final updateRoutes = <RouteBase>[
  GoRoute(
    path: 'route-update/:tripId',
    builder: (context, state) =>
        RouteUpdateScreen(tripId: state.pathParameters['tripId']!),
  ),
];
