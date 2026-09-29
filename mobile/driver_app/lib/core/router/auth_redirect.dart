import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../features/auth/domain/driver.dart';

const _publicRoutes = {'/splash', '/login', '/signup'};

/// Pure routing rule: where should [auth] send a user who is at [location]?
/// Returns null to stay put. Kept free of Flutter/router types so it is
/// trivially testable and the router only wires it in.
String? authRedirect({
  required String location,
  required AsyncValue<Driver?> auth,
}) {
  if (location == '/splash') return null;
  final isPublic = _publicRoutes.contains(location);

  if (auth.isLoading) return isPublic ? null : '/splash';

  final signedIn = auth.hasValue && auth.value != null;
  if (!signedIn && !isPublic) return '/login';
  if (signedIn && (location == '/login' || location == '/signup')) {
    return '/trips';
  }
  return null;
}
