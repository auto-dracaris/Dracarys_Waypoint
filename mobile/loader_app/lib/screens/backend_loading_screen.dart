import 'package:flutter/material.dart';
import '../models/trip.dart';
import '../models/issue.dart';
import '../services/trip_service.dart';
import '../services/issue_service.dart';
import '../widgets/app_header.dart';
import 'report_issue_screen.dart';

/// The live API saves loading for the whole trip, not individual orders.
class BackendLoadingScreen extends StatefulWidget {
  final String tripId;
  final TripService? service;
  const BackendLoadingScreen({super.key, required this.tripId, this.service});
  @override
  State<BackendLoadingScreen> createState() => _BackendLoadingScreenState();
}

class _BackendLoadingScreenState extends State<BackendLoadingScreen> {
  late final TripService _trips = widget.service ?? TripService();
  final IssueService _issues = IssueService();
  TripDetail? _trip;
  List<Issue> _reports = [];
  bool _busy = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    _refresh();
  }

  Future<void> _refresh() async {
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      final trip = await _trips.getTripById(widget.tripId);
      final reports = await _issues.getIssues(widget.tripId);
      if (!mounted) return;
      setState(() {
        _trip = trip;
        _reports = reports;
      });
    } catch (error) {
      if (mounted) {
        setState(
          () => _error = error is StateError
              ? error.message.toString()
              : 'Could not refresh this trip. Please retry.',
        );
      }
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _complete() async {
    if (_busy || _trip == null) return;
    final resend = _trip!.summary.status == 'ready';
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: Text(
          resend ? 'Resend driver code?' : 'Confirm loading complete?',
        ),
        content: Text(
          resend
              ? 'The driver will receive a fresh departure code by SMS.'
              : 'Confirm that loading for this trip is complete and any reported issues have been addressed according to dispatcher instructions.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Cancel'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(context, true),
            child: const Text('Confirm'),
          ),
        ],
      ),
    );
    if (confirmed != true || !mounted) return;
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      if (resend) {
        await _trips.resendDriverCode(widget.tripId);
      } else {
        await _trips.finishLoading(widget.tripId);
      }
      if (!mounted) return;
      await showDialog<void>(
        context: context,
        builder: (context) => AlertDialog(
          title: Text(resend ? 'Driver code requested' : 'Loading complete'),
          content: const Text(
            'The departure code is sent to the driver by SMS. It is not displayed here.',
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context),
              child: const Text('OK'),
            ),
          ],
        ),
      );
      if (mounted) Navigator.pop(context, true);
    } catch (error) {
      if (mounted) {
        setState(
          () => _error = error is StateError
              ? error.message.toString()
              : 'Could not confirm loading. Refresh the trip before retrying.',
        );
      }
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _report(TripStop stop, String orderId, int cases) async {
    await Navigator.push<int>(
      context,
      MaterialPageRoute(
        builder: (_) => ReportIssueScreen(
          tripId: widget.tripId,
          stopId: stop.id,
          orderId: orderId,
          orderIds: [orderId],
          orderCases: {orderId: cases},
          expectedCases: cases,
          vehicleNumber: _trip!.summary.plate,
          tripNumber: _trip!.summary.name,
          outletIdentifier: stop.outletCode ?? stop.name,
          client: stop.name,
          stopSequence: stop.sequence,
        ),
      ),
    );
    if (mounted) await _refresh();
  }

  @override
  void dispose() {
    if (widget.service == null) _trips.dispose();
    _issues.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final trip = _trip;
    final status = trip?.summary.status;
    return Scaffold(
      body: SafeArea(
        child: Column(
          children: [
            const AppHeader(),
            Expanded(
              child: RefreshIndicator(
                onRefresh: _refresh,
                child: ListView(
                  physics: const AlwaysScrollableScrollPhysics(),
                  padding: const EdgeInsets.all(24),
                  children: [
                    Align(
                      alignment: Alignment.centerLeft,
                      child: TextButton.icon(
                        onPressed: _busy ? null : () => Navigator.pop(context),
                        icon: const Icon(Icons.arrow_back),
                        label: const Text('Back to trips'),
                      ),
                    ),
                    if (_busy) const LinearProgressIndicator(),
                    if (_error != null) ...[
                      Text(_error!),
                      TextButton(
                        onPressed: _busy ? null : _refresh,
                        child: const Text('Retry'),
                      ),
                    ],
                    if (trip != null) ...[
                      Text(
                        '${trip.summary.plate} · ${trip.summary.name}',
                        style: Theme.of(context).textTheme.headlineSmall,
                      ),
                      Text(
                        '${trip.summary.statusLabel} · Plan v${trip.summary.planVersion}',
                      ),
                      const SizedBox(height: 16),
                      const Text(
                        'Load the orders below, starting with the last delivery stop. Confirm once the entire vehicle is loaded.',
                      ),
                      const SizedBox(height: 16),
                      for (final stop in trip.stops) ...[
                        Text(
                          'Stop ${stop.sequence} · ${stop.name}',
                          style: Theme.of(context).textTheme.titleMedium,
                        ),
                        for (final order in stop.orderCases.entries)
                          Card(
                            child: ListTile(
                              title: Text(order.key),
                              subtitle: Text('${order.value} cases planned'),
                              trailing: TextButton(
                                onPressed:
                                    _busy ||
                                        status == 'ready' ||
                                        order.value == 0
                                    ? null
                                    : () =>
                                          _report(stop, order.key, order.value),
                                child: const Text('Report issue'),
                              ),
                            ),
                          ),
                        const SizedBox(height: 12),
                      ],
                      if (_reports.isNotEmpty) ...[
                        Text(
                          'Your reports',
                          style: Theme.of(context).textTheme.titleMedium,
                        ),
                        for (final report in _reports)
                          ListTile(
                            title: Text(
                              '${report.orderId ?? 'Order'} · ${report.affectedCases} cases affected',
                            ),
                            subtitle: Text(
                              '${report.status == 'resolved'
                                  ? 'Resolved'
                                  : report.status == 'acknowledged'
                                  ? 'Under review'
                                  : 'Open'}${report.resolutionNote == null ? '' : '\n${report.resolutionNote}'}',
                            ),
                          ),
                      ],
                      const SizedBox(height: 16),
                      FilledButton(
                        onPressed:
                            _busy ||
                                _error != null ||
                                trip.stops.isEmpty ||
                                !const [
                                  'assigned',
                                  'loading',
                                  'ready',
                                ].contains(status)
                            ? null
                            : _complete,
                        child: Text(
                          status == 'ready'
                              ? 'Resend driver code'
                              : 'Confirm loading complete',
                        ),
                      ),
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
}
