import 'dart:async';
import 'package:flutter/material.dart';
import '../models/issue.dart';
import '../services/issue_service.dart';
import '../widgets/app_header.dart';

class WaitingDispatcherScreen extends StatefulWidget {
  final String tripId, issueId, vehicleNumber, tripNumber, outletIdentifier;
  final int expectedCases, stopSequence;
  final Issue initialIssue;
  const WaitingDispatcherScreen({
    super.key,
    required this.tripId,
    required this.issueId,
    required this.initialIssue,
    required this.expectedCases,
    this.vehicleNumber = '',
    this.tripNumber = '',
    this.outletIdentifier = '',
    this.stopSequence = 0,
  });

  @override
  State<WaitingDispatcherScreen> createState() =>
      _WaitingDispatcherScreenState();
}

class _WaitingDispatcherScreenState extends State<WaitingDispatcherScreen>
    with WidgetsBindingObserver {
  final IssueService _service = IssueService();
  Timer? _timer;
  late Issue _issue;
  bool _checking = false;
  bool _active = true;
  String? _error;
  int get _goodCases =>
      (_issue.expectedCases ?? _issue.plannedCases ?? widget.expectedCases)
          .clamp(0, _issue.plannedCases ?? widget.expectedCases)
          .toInt();
  String get _banner => _issue.requiresRecount
      ? 'Dispatcher requests a re-check'
      : _issue.approved
      ? 'Resolved by Dispatcher'
      : _issue.status == 'acknowledged'
      ? 'Issue under review'
      : 'Issue sent · Decision pending';
  @override
  void initState() {
    super.initState();
    _issue = widget.initialIssue;
    WidgetsBinding.instance.addObserver(this);
    _timer = Timer.periodic(const Duration(seconds: 5), (_) {
      if (_active &&
          (ModalRoute.of(context)?.isCurrent ?? false) &&
          !_issue.approved &&
          !_issue.requiresRecount) {
        _poll();
      }
    });
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    _active = state == AppLifecycleState.resumed;
    if (_active && !_issue.approved && !_issue.requiresRecount) _poll();
  }

  Future<void> _poll({bool manual = false}) async {
    if (_checking) return;
    setState(() => _checking = true);
    try {
      final issue = await _service.getIssue(widget.issueId);
      if (!mounted) return;
      setState(() {
        _issue = issue;
        _error = null;
      });
    } catch (error) {
      if (!mounted) return;
      setState(
        () => _error = error is StateError
            ? error.message.toString()
            : 'Could not check for updates. Please try again.',
      );
      if (manual) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text(_error!)));
      }
    } finally {
      if (mounted) setState(() => _checking = false);
    }
  }

  @override
  void dispose() {
    _timer?.cancel();
    WidgetsBinding.instance.removeObserver(this);
    _service.dispose();
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
                        label: const Text('Back to trip'),
                        style: OutlinedButton.styleFrom(
                          foregroundColor: Colors.black,
                          side: BorderSide(color: Colors.grey.shade300),
                          backgroundColor: Colors.white,
                        ),
                      ),
                    ),
                    const SizedBox(height: 24),
                    Text(
                      '${widget.vehicleNumber} · ${widget.tripNumber}',
                      style: const TextStyle(color: Colors.grey, fontSize: 12),
                    ),
                    Text(
                      '${widget.outletIdentifier} · Stop ${widget.stopSequence}',
                      style: const TextStyle(color: Colors.grey, fontSize: 12),
                    ),
                    const SizedBox(height: 8),
                    const Text(
                      'Waiting for dispatcher',
                      style: TextStyle(
                        fontSize: 32,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    const SizedBox(height: 24),

                    // Pending Status Banner
                    Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 16,
                        vertical: 12,
                      ),
                      decoration: BoxDecoration(
                        color: _issue.requiresRecount
                            ? const Color(0xFFFEE2E2)
                            : _issue.approved
                            ? const Color(0xFFDCFCE7)
                            : const Color(0xFFFEF08A),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Row(
                        children: [
                          Icon(
                            _issue.approved
                                ? Icons.check_circle
                                : _issue.requiresRecount
                                ? Icons.warning_amber
                                : Icons.access_time,
                            size: 20,
                            color: Color(0xFF92400E),
                          ),
                          SizedBox(width: 8),
                          Text(
                            _banner,
                            style: const TextStyle(
                              color: Color(0xFF92400E),
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 24),

                    const Text(
                      'Issue summary',
                      style: TextStyle(color: Colors.grey),
                    ),
                    const SizedBox(height: 8),

                    // Missing and Available Summary Cards
                    Row(
                      children: [
                        Expanded(
                          child: Container(
                            padding: const EdgeInsets.all(16),
                            decoration: BoxDecoration(
                              color: const Color(
                                0xFFFEE2E2,
                              ), // Light red background
                              borderRadius: BorderRadius.circular(8),
                              border: Border.all(
                                color: const Color(0xFFFCA5A5),
                              ),
                            ),
                            child: Column(
                              children: [
                                Text(
                                  'of ${widget.expectedCases} cases ${_issue.type == IssueType.load_shortfall ? 'missing' : 'damaged'}',
                                  style: const TextStyle(
                                    color: Colors.grey,
                                    fontSize: 12,
                                  ),
                                ),
                                SizedBox(height: 4),
                                Text(
                                  '${_issue.affectedCases}',
                                  style: const TextStyle(
                                    fontSize: 32,
                                    fontWeight: FontWeight.bold,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ),
                        const SizedBox(width: 16),
                        Expanded(
                          child: Container(
                            padding: const EdgeInsets.all(16),
                            decoration: BoxDecoration(
                              color: Colors.white,
                              borderRadius: BorderRadius.circular(8),
                              border: Border.all(color: Colors.grey.shade300),
                            ),
                            child: Column(
                              children: [
                                Text(
                                  _issue.approved
                                      ? 'cases expected in current plan'
                                      : 'cases not reported affected',
                                  style: TextStyle(
                                    color: Colors.grey,
                                    fontSize: 12,
                                  ),
                                ),
                                SizedBox(height: 4),
                                Text(
                                  '$_goodCases',
                                  style: const TextStyle(
                                    fontSize: 32,
                                    fontWeight: FontWeight.bold,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 24),

                    // Info Icon and Note
                    Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Icon(Icons.info, size: 20, color: Colors.black),
                        SizedBox(width: 8),
                        Expanded(
                          child: Text(
                            _error ??
                                _issue.resolutionNote ??
                                'Reported ${_issue.recordedAt == null ? '' : TimeOfDay.fromDateTime(_issue.recordedAt!.toLocal()).format(context)}\nThis screen updates when dispatch responds.',
                            style: const TextStyle(
                              color: Colors.grey,
                              fontSize: 13,
                            ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 32),
                  ],
                ),
              ),
            ),
            _buildBottomBar(context),
          ],
        ),
      ),
    );
  }

  Widget _buildBottomBar(BuildContext context) {
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
                child: ElevatedButton(
                  onPressed: _checking
                      ? null
                      : () {
                          if (_issue.approved) {
                            Navigator.pop(context, _goodCases);
                          } else if (_issue.requiresRecount) {
                            Navigator.pop(context);
                          } else {
                            _poll(manual: true);
                          }
                        },
                  style: ElevatedButton.styleFrom(
                    padding: const EdgeInsets.symmetric(vertical: 16),
                    backgroundColor: const Color(0xFFFACC15),
                    foregroundColor: Colors.black,
                    elevation: 0,
                  ),
                  child: _checking
                      ? const SizedBox(
                          width: 18,
                          height: 18,
                          child: CircularProgressIndicator(
                            strokeWidth: 2,
                            color: Colors.black,
                          ),
                        )
                      : Text(
                          _checking
                              ? 'Checking…'
                              : _issue.approved
                              ? 'Continue loading with $_goodCases cases'
                              : _issue.requiresRecount
                              ? 'Re-check count / edit issue'
                              : 'Check for update',
                          style: const TextStyle(
                            fontWeight: FontWeight.bold,
                            fontSize: 13,
                          ),
                        ),
                ),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: OutlinedButton(
                  onPressed: () => Navigator.pop(context),
                  style: OutlinedButton.styleFrom(
                    padding: const EdgeInsets.symmetric(vertical: 16),
                    foregroundColor: Colors.black,
                    side: BorderSide(color: Colors.grey.shade300),
                    backgroundColor: Colors.white,
                  ),
                  child: const Text(
                    'Back to trip',
                    style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                _issue.planVersion == null
                    ? 'Plan pending'
                    : 'Plan v${_issue.planVersion}',
                style: TextStyle(color: Colors.grey, fontSize: 12),
              ),
              Text(
                _checking
                    ? 'Checking…'
                    : _error != null
                    ? 'Update failed'
                    : 'Last decision received',
                style: TextStyle(color: Colors.green, fontSize: 12),
              ),
            ],
          ),
        ],
      ),
    );
  }
}
