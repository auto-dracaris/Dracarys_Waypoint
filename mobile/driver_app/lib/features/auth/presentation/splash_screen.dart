import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/router/app_router.dart';
import '../../../core/widgets/waypoint_logo.dart';
import '../domain/driver.dart';
import 'auth_controller.dart';

class SplashScreen extends ConsumerStatefulWidget {
  const SplashScreen({super.key});

  @override
  ConsumerState<SplashScreen> createState() => _SplashScreenState();
}

class _SplashScreenState extends ConsumerState<SplashScreen> {
  @override
  void initState() {
    super.initState();
    _next();
  }

  Future<void> _next() async {
    final minimum = Future<void>.delayed(ref.read(splashDurationProvider));
    Driver? driver;
    try {
      driver = await ref.read(authControllerProvider.future);
    } catch (_) {
      // Can't restore the session: fall back to the login screen.
    }
    await minimum;
    if (!mounted) return;
    context.go(driver != null ? '/trips' : '/login');
  }

  @override
  Widget build(BuildContext context) {
    return const Scaffold(
      body: Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            WaypointLogo(size: 96),
            SizedBox(height: 16),
            Text('Waypoint',
                style: TextStyle(fontSize: 28, fontWeight: FontWeight.w800)),
            Text('Driver'),
          ],
        ),
      ),
    );
  }
}
