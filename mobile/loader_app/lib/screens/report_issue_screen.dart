import 'package:flutter/material.dart';
import '../widgets/app_header.dart';
import '../models/issue.dart';
import '../services/issue_service.dart';
import 'waiting_dispatcher_screen.dart';

class ReportIssueScreen extends StatefulWidget {
  final String? tripId, stopId, orderId;
  final int expectedCases;
  final List<String> orderIds;
  final Map<String, int> orderCases;
  final IssueService? service;
  final String vehicleNumber, tripNumber, outletIdentifier, client, brand;
  final int stopSequence, loadingStep, totalSteps;
  const ReportIssueScreen({
    super.key,
    this.tripId,
    this.stopId,
    this.orderId,
    this.orderIds = const [],
    this.orderCases = const {},
    this.service,
    this.expectedCases = 0,
    this.vehicleNumber = '',
    this.tripNumber = '',
    this.outletIdentifier = '',
    this.client = '',
    this.brand = '',
    this.stopSequence = 0,
    this.loadingStep = 1,
    this.totalSteps = 1,
  });

  @override
  State<ReportIssueScreen> createState() => _ReportIssueScreenState();
}

class _ReportIssueScreenState extends State<ReportIssueScreen> {
  late final IssueService _issueService;
  final TextEditingController _noteController = TextEditingController();
  bool _sending = false;
  bool _restoreFailed = false;
  String? _selectedOrder;
  Issue? _reportedIssue;
  String? get _orderId => _selectedOrder ?? widget.orderId;
  int affectedCases = 1;

  Future<void> _submit() async {
    if (_sending || totalExpected < 1) return;
    if (_restoreFailed) {
      await _restoreIssue();
      return;
    }
    if (widget.tripId == null || _orderId == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Select a trip and order before reporting an issue.'),
        ),
      );
      return;
    }
    if (_noteController.text.trim().length > 500) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Keep the note within 500 characters.')),
      );
      return;
    }
    setState(() => _sending = true);
    try {
      final previous = _reportedIssue;
      final Issue issue;
      if (previous != null) {
        final latest = await _issueService.getIssue(previous.id);
        issue = latest.requiresRecount
            ? await _issueService.resubmit(
                latest.id,
                affectedCases,
                _noteController.text,
              )
            : latest;
      } else {
        issue = await _issueService.reportIssue(
          tripId: widget.tripId!,
          orderId: _orderId!,
          type: isMissingSelected
              ? IssueType.load_shortfall
              : IssueType.load_damage,
          affectedCases: affectedCases,
          note: _noteController.text.trim(),
        );
      }
      _reportedIssue = issue;
      if (!mounted) return;
      final cases = await Navigator.push<int>(
        context,
        MaterialPageRoute(
          builder: (_) => WaitingDispatcherScreen(
            tripId: widget.tripId!,
            issueId: issue.id,
            initialIssue: issue,
            expectedCases: totalExpected,
            vehicleNumber: widget.vehicleNumber,
            tripNumber: widget.tripNumber,
            outletIdentifier: widget.outletIdentifier,
            stopSequence: widget.stopSequence,
          ),
        ),
      );
      if (!mounted) return;
      if (cases != null) Navigator.pop(context, cases);
    } catch (error) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            error is StateError
                ? error.message.toString()
                : 'Could not send issue. Please try again.',
          ),
        ),
      );
    } finally {
      if (mounted) setState(() => _sending = false);
    }
  }

  @override
  void dispose() {
    _noteController.dispose();
    if (widget.service == null) _issueService.dispose();
    super.dispose();
  }

  int get totalExpected =>
      widget.orderCases[_orderId] ??
      (widget.expectedCases < 0 ? 0 : widget.expectedCases);
  bool isMissingSelected = true;

  @override
  void initState() {
    super.initState();
    _issueService = widget.service ?? IssueService();
    _selectedOrder =
        widget.orderId ??
        (widget.orderIds.isEmpty ? null : widget.orderIds.first);
    affectedCases = totalExpected > 0 ? 1 : 0;
    _restoreIssue();
  }

  Future<void> _restoreIssue() async {
    final selected = _orderId;
    if (widget.tripId == null || selected == null) return;
    setState(() => _sending = true);
    try {
      final issues = await _issueService.getIssues(widget.tripId!);
      if (!mounted || _orderId != selected) return;
      final pending = issues.where(
        (issue) => issue.orderId == selected && !issue.approved,
      );
      setState(() {
        _restoreFailed = false;
        _reportedIssue = pending.isEmpty ? null : pending.first;
        if (_reportedIssue != null) {
          affectedCases = _reportedIssue!.affectedCases;
          isMissingSelected = _reportedIssue!.type == IssueType.load_shortfall;
          _noteController.text = _reportedIssue!.note ?? '';
        }
      });
    } catch (_) {
      _restoreFailed = true;
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text(
              'Could not check existing issues. Retry before reporting.',
            ),
          ),
        );
      }
    } finally {
      if (mounted) setState(() => _sending = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    int goodCases = totalExpected - affectedCases;

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
                    if (widget.orderIds.length > 1)
                      DropdownButtonFormField<String>(
                        initialValue: _selectedOrder,
                        decoration: const InputDecoration(labelText: 'Order'),
                        items: widget.orderIds
                            .map(
                              (id) => DropdownMenuItem(
                                value: id,
                                child: Text(
                                  '$id · ${widget.orderCases[id] ?? 0} cases',
                                ),
                              ),
                            )
                            .toList(),
                        onChanged: _sending
                            ? null
                            : (id) {
                                setState(() {
                                  _selectedOrder = id;
                                  _reportedIssue = null;
                                  _noteController.clear();
                                  affectedCases = totalExpected > 0 ? 1 : 0;
                                });
                                _restoreIssue();
                              },
                      ),
                    const SizedBox(height: 24),
                    Align(
                      alignment: Alignment.centerLeft,
                      child: OutlinedButton.icon(
                        onPressed: () => Navigator.pop(context),
                        icon: const Icon(Icons.arrow_back, size: 18),
                        label: Text(
                          'Load ${widget.loadingStep} of ${widget.totalSteps}',
                        ),
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
                      '${widget.outletIdentifier} · Stop ${widget.stopSequence} · $totalExpected cases expected',
                      style: const TextStyle(color: Colors.grey, fontSize: 12),
                    ),
                    const SizedBox(height: 8),
                    const Text(
                      'Report loading issue',
                      style: TextStyle(
                        fontSize: 32,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    const SizedBox(height: 24),
                    const Text(
                      'What happened?',
                      style: TextStyle(color: Colors.grey),
                    ),
                    const SizedBox(height: 8),
                    Row(
                      children: [
                        Expanded(
                          child: ElevatedButton(
                            onPressed: _sending || _reportedIssue != null
                                ? null
                                : () =>
                                      setState(() => isMissingSelected = true),
                            style: ElevatedButton.styleFrom(
                              backgroundColor: isMissingSelected
                                  ? const Color(0xFFFACC15)
                                  : Colors.white,
                              foregroundColor: Colors.black,
                              elevation: 0,
                              side: BorderSide(
                                color: isMissingSelected
                                    ? const Color(0xFFFACC15)
                                    : Colors.grey.shade300,
                              ),
                              padding: const EdgeInsets.symmetric(vertical: 16),
                            ),
                            child: const Text(
                              'Missing goods',
                              style: TextStyle(fontWeight: FontWeight.bold),
                            ),
                          ),
                        ),
                        const SizedBox(width: 16),
                        Expanded(
                          child: ElevatedButton(
                            onPressed: _sending || _reportedIssue != null
                                ? null
                                : () =>
                                      setState(() => isMissingSelected = false),
                            style: ElevatedButton.styleFrom(
                              backgroundColor: !isMissingSelected
                                  ? const Color(0xFFFACC15)
                                  : Colors.white,
                              foregroundColor: Colors.black,
                              elevation: 0,
                              side: BorderSide(
                                color: !isMissingSelected
                                    ? const Color(0xFFFACC15)
                                    : Colors.grey.shade300,
                              ),
                              padding: const EdgeInsets.symmetric(vertical: 16),
                            ),
                            child: const Text(
                              'Damaged goods',
                              style: TextStyle(fontWeight: FontWeight.bold),
                            ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 24),
                    const Text(
                      'Affected cases',
                      style: TextStyle(color: Colors.grey),
                    ),
                    const SizedBox(height: 16),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        IconButton(
                          icon: const Icon(Icons.remove),
                          onPressed: affectedCases > 1
                              ? () => setState(() => affectedCases--)
                              : null,
                          style: IconButton.styleFrom(
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(4),
                              side: BorderSide(color: Colors.grey.shade300),
                            ),
                          ),
                        ),
                        const SizedBox(width: 24),
                        Text(
                          '$affectedCases',
                          style: const TextStyle(
                            fontSize: 32,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        const SizedBox(width: 24),
                        IconButton(
                          icon: const Icon(Icons.add),
                          onPressed: affectedCases < totalExpected
                              ? () => setState(() => affectedCases++)
                              : null,
                          style: IconButton.styleFrom(
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(4),
                              side: BorderSide(color: Colors.grey.shade300),
                            ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 8),
                    Center(
                      child: Text(
                        'Of $totalExpected cases expected',
                        style: const TextStyle(
                          color: Colors.grey,
                          fontSize: 12,
                        ),
                      ),
                    ),
                    const SizedBox(height: 16),
                    Container(
                      width: double.infinity,
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        color: Colors.white,
                        border: Border.all(color: Colors.grey.shade300),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Text(
                        '$goodCases good cases can be loaded',
                        textAlign: TextAlign.center,
                        style: const TextStyle(fontWeight: FontWeight.bold),
                      ),
                    ),
                    const SizedBox(height: 24),
                    const Text(
                      'Add a note (optional)',
                      style: TextStyle(color: Colors.grey),
                    ),
                    const SizedBox(height: 8),
                    TextField(
                      controller: _noteController,
                      maxLines: 3,
                      decoration: InputDecoration(
                        hintText:
                            'e.g. Item not on truck, short delivery, etc.',
                        hintStyle: TextStyle(color: Colors.grey.shade400),
                        filled: true,
                        fillColor: Colors.white,
                        enabledBorder: OutlineInputBorder(
                          borderSide: BorderSide(color: Colors.grey.shade300),
                          borderRadius: BorderRadius.circular(8),
                        ),
                        focusedBorder: OutlineInputBorder(
                          borderSide: const BorderSide(color: Colors.blue),
                          borderRadius: BorderRadius.circular(8),
                        ),
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
    );
  }

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
                flex: 3,
                child: ElevatedButton(
                  onPressed: _sending || totalExpected < 1 ? null : _submit,
                  style: ElevatedButton.styleFrom(
                    padding: const EdgeInsets.symmetric(vertical: 16),
                    backgroundColor: const Color(0xFFFACC15),
                    foregroundColor: Colors.black,
                    elevation: 0,
                  ),
                  child: Text(
                    _sending ? 'Sending issue…' : 'Send issue to dispatcher',
                    style: const TextStyle(
                      fontWeight: FontWeight.bold,
                      fontSize: 13,
                    ),
                  ),
                ),
              ),
              const SizedBox(width: 16),
              Expanded(
                flex: 2,
                child: OutlinedButton(
                  onPressed: () => Navigator.pop(context),
                  style: OutlinedButton.styleFrom(
                    padding: const EdgeInsets.symmetric(vertical: 16),
                    foregroundColor: Colors.black,
                    side: BorderSide(color: Colors.grey.shade300),
                    backgroundColor: Colors.white,
                  ),
                  child: const Text(
                    'Back to loading',
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
              Row(
                children: [
                  Text(
                    '${widget.loadingStep} of ${widget.totalSteps} loading steps',
                    style: const TextStyle(color: Colors.grey, fontSize: 12),
                  ),
                  const SizedBox(width: 8),
                  Container(
                    width: 40,
                    height: 4,
                    color: const Color(0xFFFACC15),
                  ),
                  Container(width: 40, height: 4, color: Colors.grey.shade300),
                ],
              ),
              const Text(
                'Submit online',
                style: TextStyle(color: Colors.green, fontSize: 12),
              ),
            ],
          ),
        ],
      ),
    );
  }
}
