import 'package:flutter/material.dart';
import '../models/trip.dart';
import '../services/trip_service.dart';
import '../widgets/app_header.dart';
import 'report_issue_screen.dart';

class LoadConfirmScreen extends StatefulWidget {
  final String? tripId;
  final TripService? service;
  final TripDetail? initialTrip;
  const LoadConfirmScreen({
    super.key,
    this.tripId,
    this.service,
    this.initialTrip,
  });

  @override
  State<LoadConfirmScreen> createState() => _LoadConfirmScreenState();
}

class _LoadConfirmScreenState extends State<LoadConfirmScreen> {
  late final TripService _service;
  DateTime? _syncedAt;
  bool _usedInitialTrip = false;
  TripDetail? _trip;
  int currentStopIndex = 0;
  int loadedCases = 0;
  bool _busy = true;
  String? _error;
  bool _loadingCompleted = false;

  List<TripStop> get stops => [
    for (final stop in _trip?.stops ?? <TripStop>[])
      for (final order in stop.orderCases.entries)
        TripStop.fromJson({
          'id': '${stop.id}:${order.key}',
          'name': stop.name,
          'outletCode': '${stop.outletCode ?? stop.name} · ${order.key}',
          'sequence': stop.sequence,
          'orders': [
            {
              'id': order.key,
              'cases': order.value,
              'loadedCases': stop.loadedByOrder[order.key],
            },
          ],
        }),
  ];
  TripStop? get currentStop => stops.isEmpty ? null : stops[currentStopIndex];
  int get expectedCases => currentStop?.cases ?? 0;
  bool get _canLoad => !_busy && currentStop != null && !_loadingCompleted;
  String get _stepLabel => stops.isEmpty
      ? 'Load 0 of 0'
      : 'Load ${currentStopIndex + 1} of ${stops.length}';

  @override
  void initState() {
    super.initState();
    _service = widget.service ?? TripService();
    _loadTrip();
  }

  Future<void> _loadTrip() async {
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      final id = widget.tripId;
      if (id == null || id.isEmpty) {
        throw StateError('Select a trip from Trips to load.');
      }
      final trip = !_usedInitialTrip && widget.initialTrip != null
          ? widget.initialTrip!
          : await _service.getTripById(id);
      _usedInitialTrip = true;
      if (trip.stops.isEmpty) {
        throw StateError('This trip has no loading stops.');
      }
      if (!mounted) return;
      setState(() {
        _trip = trip;
        final next = stops.indexWhere((stop) => !stop.confirmed);
        currentStopIndex = next < 0 ? stops.length - 1 : next;
        loadedCases = stops[currentStopIndex].cases;
        _syncedAt = DateTime.now();
        _busy = false;
      });
    } catch (error) {
      if (!mounted) return;
      setState(() {
        _busy = false;
        _error = error is StateError
            ? error.message.toString()
            : 'Could not load trip. Please try again.';
      });
    }
  }

  Future<void> _confirmStop() async {
    if (!_canLoad) return;
    setState(() => _busy = true);
    try {
      final id = widget.tripId!;
      if (_trip!.summary.status != 'ready') {
        if (loadedCases != expectedCases) {
          throw StateError(
            'Report the quantity difference and obtain dispatcher approval first.',
          );
        }
        final stop = currentStop!;
        for (final order in stop.orderCases.entries) {
          if (stop.loadedByOrder[order.key] == order.value) continue;
          _trip = await _service.confirmOrder(
            id,
            order.key,
            order.value,
            _trip!.summary.planVersion,
          );
        }
        if (!mounted) return;
        final next = stops.indexWhere((stop) => !stop.confirmed);
        if (next >= 0) {
          setState(() {
            currentStopIndex = next;
            loadedCases = expectedCases;
            _syncedAt = DateTime.now();
            _busy = false;
          });
          return;
        }
      }
      if (_trip!.summary.status == 'ready') {
        await _service.recoverCode(id);
      } else {
        await _service.completeLoading(id);
      }
      if (!mounted) return;
      setState(() {
        _busy = false;
        _loadingCompleted = true;
      });
      await showDialog<void>(
        context: context,
        barrierDismissible: false,
        builder: (dialogContext) => PopScope(
          canPop: false,
          child: AlertDialog(
            title: const Text('Loading complete'),
            content: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Icon(Icons.check_circle, color: Colors.green, size: 48),
                const SizedBox(height: 16),
                Text('The driver will receive the departure code by SMS.'),
              ],
            ),
            actions: [
              TextButton(
                onPressed: () {
                  Navigator.of(dialogContext).pop();
                  Navigator.of(context).pop(true);
                },
                child: const Text('Return to Trips'),
              ),
            ],
          ),
        ),
      );
    } catch (error) {
      if (!mounted) return;
      setState(() => _busy = false);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            error is StateError
                ? error.message.toString()
                : 'Could not complete loading. Please try again.',
          ),
        ),
      );
      // Refresh stale plan versions and a trip already marked loaded if SMS
      // queuing failed; the next action can explicitly resend the driver code.
      await _loadTrip();
    }
  }

  @override
  void dispose() {
    if (widget.service == null) _service.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    if (_busy || _error != null) {
      return Scaffold(
        body: SafeArea(
          child: Column(
            children: [
              const AppHeader(),
              Expanded(
                child: Center(
                  child: _busy
                      ? const CircularProgressIndicator()
                      : Column(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Text(_error!),
                            TextButton(
                              onPressed: _loadTrip,
                              child: const Text('Retry'),
                            ),
                            TextButton(
                              onPressed: _busy
                                  ? null
                                  : () => Navigator.pop(context),
                              child: const Text('Trip overview'),
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
    return PopScope(
      canPop: !_busy,
      child: Scaffold(
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
                          onPressed: _busy
                              ? null
                              : () => Navigator.pop(context),
                          icon: const Icon(Icons.arrow_back, size: 18),
                          label: const Text('Trip overview'),
                          style: OutlinedButton.styleFrom(
                            foregroundColor: Colors.black,
                            side: BorderSide(color: Colors.grey.shade300),
                            backgroundColor: Colors.white,
                          ),
                        ),
                      ),
                      const SizedBox(height: 24),
                      Text(
                        _trip == null
                            ? ''
                            : '${_trip!.summary.plate} · ${_trip!.summary.name}',
                        style: const TextStyle(
                          color: Colors.grey,
                          fontSize: 14,
                        ),
                      ),
                      Text(
                        _trip == null
                            ? ''
                            : 'Plan v${_trip!.summary.planVersion}',
                        style: const TextStyle(
                          color: Colors.grey,
                          fontSize: 12,
                        ),
                      ),
                      const SizedBox(height: 8),
                      Text(
                        _stepLabel,
                        style: const TextStyle(
                          fontSize: 32,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        currentStop == null
                            ? ''
                            : 'For delivery Stop ${currentStop!.sequence}',
                        style: const TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      const SizedBox(height: 24),

                      if (_busy && _trip == null)
                        const Center(child: CircularProgressIndicator()),
                      if (_error != null) ...[
                        Text(
                          _error!,
                          style: const TextStyle(color: Colors.grey),
                        ),
                        Align(
                          alignment: Alignment.centerLeft,
                          child: TextButton(
                            onPressed: _loadTrip,
                            child: const Text('Retry'),
                          ),
                        ),
                      ],

                      // Item Detail Card
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
                              currentStop?.outletCode ??
                                  currentStop?.name ??
                                  '',
                              style: const TextStyle(
                                fontSize: 24,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                            const SizedBox(height: 4),
                            Text(
                              currentStop?.name ?? '',
                              style: TextStyle(color: Colors.grey.shade600),
                            ),
                            const SizedBox(height: 16),
                            Text(
                              '$expectedCases cases expected',
                              style: const TextStyle(color: Colors.grey),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 24),
                      const Text(
                        'Place these cases near the front of the vehicle.',
                        style: TextStyle(color: Colors.grey),
                      ),
                      const SizedBox(height: 16),

                      const Padding(
                        padding: EdgeInsets.only(bottom: 16),
                        child: Text(
                          'Order checks are saved on this device. The trip is submitted when all loading steps are confirmed.',
                          style: TextStyle(color: Colors.grey, fontSize: 12),
                        ),
                      ),
                      // Interactive Counter Card
                      Container(
                        padding: const EdgeInsets.all(24),
                        decoration: BoxDecoration(
                          color: Colors.white,
                          border: Border.all(color: Colors.grey.shade300),
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: Column(
                          children: [
                            Text(
                              'Loaded: $loadedCases of $expectedCases cases',
                              style: const TextStyle(
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                            const SizedBox(height: 16),
                            Row(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                IconButton(
                                  icon: const Icon(Icons.remove),
                                  onPressed:
                                      _canLoad &&
                                          _trip!.summary.status != 'ready' &&
                                          loadedCases > 0
                                      ? () => setState(() => loadedCases--)
                                      : null,
                                  style: IconButton.styleFrom(
                                    shape: RoundedRectangleBorder(
                                      borderRadius: BorderRadius.circular(4),
                                      side: BorderSide(
                                        color: Colors.grey.shade300,
                                      ),
                                    ),
                                  ),
                                ),
                                const SizedBox(width: 24),
                                Text(
                                  '$loadedCases',
                                  style: const TextStyle(
                                    fontSize: 32,
                                    fontWeight: FontWeight.bold,
                                  ),
                                ),
                                const SizedBox(width: 24),
                                IconButton(
                                  icon: const Icon(Icons.add),
                                  onPressed:
                                      _canLoad &&
                                          _trip!.summary.status != 'ready'
                                      ? () => setState(() => loadedCases++)
                                      : null,
                                  style: IconButton.styleFrom(
                                    shape: RoundedRectangleBorder(
                                      borderRadius: BorderRadius.circular(4),
                                      side: BorderSide(
                                        color: Colors.grey.shade300,
                                      ),
                                    ),
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 16),
                            Text(
                              loadedCases < expectedCases
                                  ? 'Shortfall detected - please report issue or verify count'
                                  : 'Change this count only if it differs',
                              style: TextStyle(
                                color: loadedCases < expectedCases
                                    ? Colors.orange.shade800
                                    : Colors.grey,
                                fontSize: 12,
                              ),
                            ),
                          ],
                        ),
                      ),
                      if (loadedCases < expectedCases)
                        const Padding(
                          padding: EdgeInsets.only(top: 16),
                          child: Text(
                            'Shortfall detected - please report issue or verify count',
                            style: TextStyle(color: Colors.orange),
                          ),
                        ),
                      const SizedBox(height: 32),
                    ],
                  ),
                ),
              ),
              _buildBottomBar(),
            ],
          ),
        ),
      ),
    );
  }

  // The sticky footer with action buttons
  Widget _buildBottomBar() {
    return Container(
      padding: const EdgeInsets.all(24.0),
      decoration: BoxDecoration(
        color: const Color(0xFFF3F4F6),
        border: Border(top: BorderSide(color: Colors.grey.shade300)),
      ),
      child: Column(
        children: [
          Row(
            children: [
              Expanded(
                child: OutlinedButton(
                  onPressed: !_canLoad || _trip!.summary.status == 'ready'
                      ? null
                      : () async {
                          final stop = currentStop!;
                          await Navigator.push<int>(
                            context,
                            MaterialPageRoute(
                              builder: (context) => ReportIssueScreen(
                                tripId: widget.tripId,
                                stopId: currentStop!.id,
                                orderId: currentStop!.orderIds.length == 1
                                    ? currentStop!.orderIds.first
                                    : null,
                                orderIds: currentStop!.orderIds,
                                orderCases: currentStop!.orderCases,
                                expectedCases: expectedCases,
                                vehicleNumber: _trip!.summary.plate,
                                tripNumber: _trip!.summary.name,
                                outletIdentifier: stop.outletCode ?? stop.name,
                                client: stop.name,
                                stopSequence: stop.sequence,
                                loadingStep: currentStopIndex + 1,
                                totalSteps: stops.length,
                              ),
                            ),
                          );
                          if (!mounted) return;
                          setState(() => _busy = true);
                          try {
                            final latest = await _service.getTripById(
                              widget.tripId!,
                            );
                            if (!mounted) return;
                            setState(() {
                              _trip = latest;
                              currentStopIndex = stops.indexWhere(
                                (item) => item.id == stop.id,
                              );
                              if (currentStopIndex < 0) currentStopIndex = 0;
                              loadedCases = expectedCases;
                              _syncedAt = DateTime.now();
                              _busy = false;
                            });
                          } catch (_) {
                            if (mounted) {
                              setState(() {
                                _busy = false;
                                _error =
                                    'Could not refresh the loading plan. Please retry.';
                              });
                            }
                          }
                        },
                  style: OutlinedButton.styleFrom(
                    padding: const EdgeInsets.symmetric(vertical: 16),
                    foregroundColor: Colors.black,
                    side: BorderSide(color: Colors.grey.shade300),
                    backgroundColor: Colors.white,
                  ),
                  child: const Text(
                    'Missing or damaged goods',
                    style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
                  ),
                ),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: ElevatedButton(
                  onPressed: _canLoad ? _confirmStop : null,
                  style: ElevatedButton.styleFrom(
                    padding: const EdgeInsets.symmetric(vertical: 16),
                    backgroundColor: const Color(0xFFFACC15),
                    foregroundColor: Colors.black,
                    elevation: 0,
                  ),
                  child: Text(
                    _busy
                        ? 'Completing loading...'
                        : _trip!.summary.status == 'ready'
                        ? 'Resend driver OTP'
                        : 'Confirm $loadedCases cases loaded',
                    style: const TextStyle(
                      fontWeight: FontWeight.bold,
                      fontSize: 13,
                    ),
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Row(
                children: [
                  Text(
                    '${stops.isEmpty ? 0 : currentStopIndex + 1} of ${stops.length} loading steps',
                    style: const TextStyle(color: Colors.grey, fontSize: 12),
                  ),
                  const SizedBox(width: 8),
                  Container(
                    width: stops.isEmpty
                        ? 0
                        : 80 *
                              (_loadingCompleted
                                  ? 1
                                  : (currentStopIndex + 1) / stops.length),
                    height: 4,
                    color: const Color(0xFFFACC15),
                  ),
                  Container(
                    width: stops.isEmpty
                        ? 80
                        : 80 *
                              (_loadingCompleted
                                  ? 0
                                  : 1 - (currentStopIndex + 1) / stops.length),
                    height: 4,
                    color: Colors.grey.shade300,
                  ),
                ],
              ),
              Text(
                _syncedAt == null
                    ? 'Not synced'
                    : 'Fetched ${TimeOfDay.fromDateTime(_syncedAt!).format(context)}',
                style: TextStyle(color: Colors.green, fontSize: 12),
              ),
            ],
          ),
        ],
      ),
    );
  }
}
