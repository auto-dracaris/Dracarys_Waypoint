import 'dart:async';
import 'package:flutter/material.dart';
import '../models/trip.dart';
import '../services/trip_service.dart';
import '../services/auth_service.dart';
import '../widgets/app_header.dart';
import 'load_confirm_screen.dart';
import 'trips_detail_screen.dart';
import 'login_screen.dart';

class TripsScreen extends StatefulWidget {
  final TripService? service;
  const TripsScreen({super.key, this.service});

  @override
  State<TripsScreen> createState() => _TripsScreenState();
}

class _TripsScreenState extends State<TripsScreen> with WidgetsBindingObserver {
  late final TripService _service;
  Timer? _poll;
  List<TripSummary> _trips = [];
  bool _loading = true;
  bool _routeOpen = false;
  bool _loggingOut = false;
  String? _error;
  int _request = 0;

  @override
  void initState() {
    super.initState();
    _service = widget.service ?? TripService();
    WidgetsBinding.instance.addObserver(this);
    _refresh();
    _startPolling();
  }

  void _startPolling() {
    _poll?.cancel();
    if (_loggingOut) return;
    _poll = Timer.periodic(const Duration(seconds: 30), (_) {
      if (!_loading && !_routeOpen && !_loggingOut) _refresh();
    });
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed) {
      if (!_routeOpen && !_loggingOut) _refresh();
      _startPolling();
    } else {
      _poll?.cancel();
    }
  }

  Future<void> _refresh() async {
    final request = ++_request;
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final result = await _service.getTrips(status: null);
      if (!mounted || request != _request) return;
      setState(() {
        _trips = result.trips
            .where(
              (trip) => const [
                'assigned',
                'loading',
                'ready',
                'draft',
              ].contains(trip.status),
            )
            .toList();
        _loading = false;
      });
    } catch (error) {
      if (!mounted || request != _request) return;
      setState(() {
        _loading = false;
        _error = error is StateError
            ? error.message.toString()
            : 'Could not load trips. Please try again.';
      });
    }
  }

  Future<void> _openTrip(TripSummary trip) async {
    if (_loggingOut) return;
    _routeOpen = true;
    try {
      await Navigator.push<void>(
        context,
        MaterialPageRoute(
          builder: (_) => trip.status == 'loading' || trip.status == 'ready'
              ? LoadConfirmScreen(tripId: trip.id, service: _service)
              : TripDetailScreen(tripId: trip.id),
        ),
      );
    } finally {
      _routeOpen = false;
      if (mounted) await _refresh();
    }
  }

  Future<void> _logout() async {
    if (_loggingOut) return;
    setState(() => _loggingOut = true);
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (dialogContext) => AlertDialog(
        title: const Text('Log out?'),
        content: const Text('Are you sure you want to log out?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(dialogContext, false),
            child: const Text('Cancel'),
          ),
          TextButton(
            onPressed: () => Navigator.pop(dialogContext, true),
            child: const Text('Log out'),
          ),
        ],
      ),
    );
    if (!mounted) return;
    if (confirmed != true) {
      setState(() => _loggingOut = false);
      return;
    }
    _poll?.cancel();
    ++_request;
    final auth = AuthService();
    try {
      await auth.logout();
      if (!mounted) return;
      Navigator.of(context).pushAndRemoveUntil(
        MaterialPageRoute(builder: (_) => const LoginScreen()),
        (_) => false,
      );
    } catch (error) {
      if (!mounted) return;
      setState(() => _loggingOut = false);
      _startPolling();
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            error is StateError
                ? error.message.toString()
                : 'Could not log out. Please try again.',
          ),
        ),
      );
    } finally {
      auth.dispose();
    }
  }

  @override
  void dispose() {
    _poll?.cancel();
    WidgetsBinding.instance.removeObserver(this);
    if (widget.service == null) _service.dispose();
    super.dispose();
  }

  String get _emptyMessage => 'No trips to load.';

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: Column(
          children: [
            AppHeader(
              trailing: IconButton(
                tooltip: 'Log out',
                onPressed: _loggingOut ? null : _logout,
                icon: const Icon(Icons.logout),
              ),
            ),
            Expanded(
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 24.0),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const SizedBox(height: 32),
                    const Text(
                      'Trips to load',
                      style: TextStyle(
                        fontSize: 32,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    const SizedBox(height: 24),
                    Expanded(
                      child: RefreshIndicator(
                        onRefresh: _refresh,
                        child: ListView(
                          physics: const AlwaysScrollableScrollPhysics(),
                          children: [
                            if (_loading && _trips.isEmpty)
                              const Center(child: CircularProgressIndicator())
                            else if (_error != null) ...[
                              Text(
                                _error!,
                                style: TextStyle(color: Colors.grey.shade600),
                              ),
                              Align(
                                alignment: Alignment.centerLeft,
                                child: TextButton(
                                  onPressed: _refresh,
                                  child: const Text('Retry'),
                                ),
                              ),
                            ],
                            if (!_loading && _error == null && _trips.isEmpty)
                              Text(
                                _emptyMessage,
                                style: TextStyle(color: Colors.grey.shade600),
                              ),
                            for (final trip in _trips) ...[
                              TripCard(
                                vehicleAndTrip: '${trip.plate} · ${trip.name}',
                                route:
                                    '${trip.subtitle} · ${trip.stopCount} stops · ${trip.totalCases} cases',
                                status: trip.statusLabel,
                                departureTime:
                                    trip.departure ?? 'Not scheduled',
                                buttonText: switch (trip.status) {
                                  'loading' => 'Resume loading',
                                  'ready' => 'Resend driver OTP',
                                  'draft' => 'Plan pending',
                                  _ => 'Start loading',
                                },
                                onPressed: trip.status == 'draft'
                                    ? null
                                    : () => _openTrip(trip),
                              ),
                              const SizedBox(height: 16),
                            ],
                          ],
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class TripCard extends StatelessWidget {
  final String vehicleAndTrip;
  final String route;
  final String status;
  final String departureTime;
  final String buttonText;
  final VoidCallback? onPressed;

  const TripCard({
    super.key,
    required this.vehicleAndTrip,
    required this.route,
    required this.status,
    required this.departureTime,
    required this.buttonText,
    this.onPressed,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: Colors.grey.shade300),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            vehicleAndTrip,
            style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
          ),
          Text(
            route,
            style: TextStyle(color: Colors.grey.shade600, fontSize: 15),
          ),
          Text(
            '$status · Depart $departureTime',
            style: TextStyle(color: Colors.grey.shade600, fontSize: 15),
          ),
          const SizedBox(height: 16),
          ElevatedButton(
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFFFACC15),
              foregroundColor: Colors.black,
            ),
            onPressed: onPressed,
            child: Text(buttonText),
          ),
        ],
      ),
    );
  }
}
