import 'dart:convert';
import 'package:shared_preferences/shared_preferences.dart';
import '../services/auth_service.dart';
import '../services/trip_service.dart';
import 'package:flutter/material.dart';

class AppHeader extends StatefulWidget {
  final Widget? trailing;
  const AppHeader({super.key, this.trailing});

  @override
  State<AppHeader> createState() => _AppHeaderState();
}

class _AppHeaderState extends State<AppHeader> {
  late final Future<String> _depot = _loadDepot();
  Future<String> _loadDepot() async {
    final preferences = await SharedPreferences.getInstance();
    final raw = preferences.getString(AuthService.sessionKey);
    if (raw == null) return 'Loading dock';
    try {
      final user = jsonDecode(raw)['user'];
      final name = user['depotName'] as String?;
      if (name != null && name.isNotEmpty) return '$name dock';
      final service = TripService();
      try {
        final trips = await service.getTrips(status: null);
        for (final trip in trips.trips) {
          if (trip.depot != null && trip.depot!.isNotEmpty) {
            return '${trip.depot} dock';
          }
        }
      } finally {
        service.dispose();
      }
      return 'Loading dock';
    } catch (_) {
      return 'Loading dock';
    }
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      color: Colors.white,
      padding: const EdgeInsets.symmetric(horizontal: 24.0, vertical: 16.0),
      child: Wrap(
        alignment: WrapAlignment.spaceBetween,
        crossAxisAlignment: WrapCrossAlignment.center,
        spacing: 16,
        runSpacing: 8,
        children: [
          Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              // Display the logo image here
              Image.asset(
                'assets/images/logo.png',
                height: 32, // Fits nicely in the top bar
                fit: BoxFit.contain,
              ),
              const SizedBox(width: 16),
              FutureBuilder<String>(
                future: _depot,
                builder: (context, snapshot) => Text(
                  snapshot.data ?? 'Loading dock',
                  style: const TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ),
            ],
          ),
          Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(
                MaterialLocalizations.of(
                  context,
                ).formatMediumDate(DateTime.now()),
                style: const TextStyle(color: Colors.grey, fontSize: 14),
              ),
              if (widget.trailing != null) ...[
                const SizedBox(width: 12),
                widget.trailing!,
              ],
            ],
          ),
        ],
      ),
    );
  }
}
