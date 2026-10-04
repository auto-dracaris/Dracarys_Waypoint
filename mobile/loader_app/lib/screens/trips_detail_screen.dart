import 'package:flutter/material.dart';
import '../models/trip.dart';
import '../services/trip_service.dart';
import '../widgets/app_header.dart';
import 'load_confirm_screen.dart';

class TripDetailScreen extends StatefulWidget {
  final String? tripId;
  final TripService? service;
  const TripDetailScreen({super.key, this.tripId, this.service});

  @override
  State<TripDetailScreen> createState() => _TripDetailScreenState();
}

class _TripDetailScreenState extends State<TripDetailScreen> {
  late final TripService _service;
  TripDetail? _trip;
  DateTime? _syncedAt;
  String? _error;
  bool _loading = true;
  bool _starting = false;

  @override
  void initState() {
    super.initState();
    _service = widget.service ?? TripService();
    _fetchTrip();
  }

  Future<void> _fetchTrip() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final id = widget.tripId;
      if (id == null || id.isEmpty) {
        throw StateError('Select a trip from Trips to load.');
      }
      final trip = await _service.getTripById(id);
      if (!mounted) return;
      setState(() {
        _trip = trip;
        _syncedAt = DateTime.now();
        _loading = false;
      });
    } catch (error) {
      if (!mounted) return;
      setState(() {
        _loading = false;
        _error = error is StateError
            ? error.message.toString()
            : 'Could not load trip. Please try again.';
      });
    }
  }

  Future<void> _beginLoading() async {
    if (_starting || _trip == null || _trip!.stops.isEmpty) return;
    setState(() => _starting = true);
    try {
      final trip = await _service.startLoading(widget.tripId!);
      if (!mounted) return;
      setState(() => _trip = trip);
      final completed = await Navigator.push<bool>(
        context,
        MaterialPageRoute(
          builder: (_) => LoadConfirmScreen(
            tripId: widget.tripId,
            initialTrip: trip,
            service: _service,
          ),
        ),
      );
      if (completed == true && mounted) Navigator.pop(context);
    } catch (error) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            error is StateError
                ? error.message.toString()
                : 'Could not begin loading. Please try again.',
          ),
        ),
      );
    } finally {
      if (mounted) setState(() => _starting = false);
    }
  }

  @override
  void dispose() {
    if (widget.service == null) _service.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF3F4F6),
      body: SafeArea(
        child: Column(
          children: [
            const AppHeader(),
            Expanded(
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 24.0),
                child: ListView(
                  children: [
                    const SizedBox(height: 24),
                    Align(
                      alignment: Alignment.centerLeft,
                      child: OutlinedButton.icon(
                        onPressed: () => Navigator.pop(context),
                        icon: const Icon(Icons.arrow_back, size: 18),
                        label: const Text('Trips to load'),
                        style: OutlinedButton.styleFrom(
                          foregroundColor: Colors.black,
                          side: BorderSide(color: Colors.grey.shade300),
                          backgroundColor: Colors.white,
                        ),
                      ),
                    ),
                    const SizedBox(height: 24),
                    if (_loading)
                      const Center(child: CircularProgressIndicator())
                    else if (_error != null) ...[
                      Text(_error!, style: const TextStyle(color: Colors.grey)),
                      TextButton(
                        onPressed: _fetchTrip,
                        child: const Text('Retry'),
                      ),
                    ] else if (_trip != null) ...[
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                '${_trip!.summary.plate} · ${_trip!.summary.name}',
                                style: const TextStyle(
                                  fontSize: 28,
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                              SizedBox(height: 4),
                              Text(
                                _trip!.summary.subtitle,
                                style: const TextStyle(
                                  color: Colors.grey,
                                  fontSize: 16,
                                ),
                              ),
                            ],
                          ),
                          Container(
                            padding: const EdgeInsets.symmetric(
                              horizontal: 12,
                              vertical: 6,
                            ),
                            decoration: BoxDecoration(
                              color: const Color(0xFFFDE68A),
                              borderRadius: BorderRadius.circular(16),
                            ),
                            child: Row(
                              children: [
                                Icon(
                                  Icons.circle,
                                  size: 10,
                                  color: Color(0xFF92400E),
                                ),
                                SizedBox(width: 6),
                                Text(
                                  _trip!.summary.statusLabel,
                                  style: const TextStyle(
                                    color: Color(0xFF92400E),
                                    fontWeight: FontWeight.bold,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 16),
                      Container(
                        padding: const EdgeInsets.all(16),
                        decoration: BoxDecoration(
                          color: Colors.white,
                          border: Border.all(color: Colors.grey.shade300),
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'Plan v${_trip!.summary.planVersion} · Synced ${TimeOfDay.fromDateTime(_syncedAt!).format(context)}',
                              style: const TextStyle(color: Colors.grey),
                            ),
                            SizedBox(height: 4),
                            Text(
                              '${_trip!.stops.length} stops · ${_trip!.totalCases} cases · Depart ${_trip!.summary.departure ?? 'Not scheduled'}',
                              style: const TextStyle(color: Colors.grey),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 24),
                      const Text(
                        'Load in reverse stop order',
                        style: TextStyle(
                          fontSize: 20,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      const SizedBox(height: 4),
                      const Text(
                        'Place the last delivery near the front. Keep Stop 1 accessible at the rear.',
                        style: TextStyle(color: Colors.grey),
                      ),
                      const SizedBox(height: 16),
                      if (_trip!.stops.isEmpty)
                        const Text(
                          'This trip has no loading stops.',
                          style: TextStyle(color: Colors.grey),
                        ),
                      for (var index = 0; index < _trip!.stops.length; index++)
                        _buildStopItem(
                          '${index + 1}',
                          'Load ${index + 1} · Stop ${_trip!.stops[index].sequence}',
                          '${_trip!.stops[index].outletCode ?? _trip!.stops[index].name} · ${_trip!.stops[index].cases} cases',
                        ),
                      const SizedBox(height: 24),
                      SizedBox(
                        width: double.infinity,
                        height: 50,
                        child: ElevatedButton(
                          style: ElevatedButton.styleFrom(
                            backgroundColor: const Color(0xFFFACC15),
                            foregroundColor: Colors.black,
                            elevation: 0,
                          ),
                          onPressed:
                              _starting ||
                                  _trip!.stops.isEmpty ||
                                  _trip!.summary.status == 'draft'
                              ? null
                              : _beginLoading,
                          child: _starting
                              ? const SizedBox(
                                  width: 20,
                                  height: 20,
                                  child: CircularProgressIndicator(
                                    strokeWidth: 2,
                                  ),
                                )
                              : const Text(
                                  'Begin loading',
                                  style: TextStyle(
                                    fontSize: 16,
                                    fontWeight: FontWeight.bold,
                                  ),
                                ),
                        ),
                      ),
                      const SizedBox(height: 32),
                    ],
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildStopItem(String number, String title, String details) {
    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      decoration: BoxDecoration(
        color: Colors.white,
        border: Border.all(color: Colors.grey.shade300),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Row(
        children: [
          Text(
            number,
            style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
          ),
          const SizedBox(width: 16),
          Expanded(child: Text(title)),
          Text(details, style: const TextStyle(color: Colors.grey)),
        ],
      ),
    );
  }
}
