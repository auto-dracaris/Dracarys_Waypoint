// API enum values use snake_case.
// ignore: constant_identifier_names
enum IssueType { load_shortfall, load_damage }

class Issue {
  final String id, status;
  final IssueType type;
  final int affectedCases;
  final String? resolutionNote;
  final DateTime? recordedAt;
  final int? expectedCases;
  final int? planVersion;
  final String? orderId;
  final String? note;
  final int? plannedCases;

  Issue.fromJson(Map<String, dynamic> json)
    : plannedCases =
          (json['plannedCases'] as num?)?.toInt() ??
          (json['order']?['cases'] as num?)?.toInt(),
      orderId = json['order']?['reference'] as String?,
      note = json['description'] as String?,
      planVersion = (json['planVersion'] as num?)?.toInt(),
      id = json['id'] as String,
      status = json['status'] as String,
      type = IssueType.values.byName(json['type'] as String),
      affectedCases = (json['affectedCases'] as num?)?.toInt() ?? 0,
      resolutionNote = json['resolutionNote'] as String?,
      recordedAt = DateTime.tryParse(
        '${json['recordedAt'] ?? json['createdAt']}',
      ),
      expectedCases = (json['expectedCases'] as num?)?.toInt();

  bool get requiresRecount =>
      const ['rejected', 'requires_recount', 'recount'].contains(status);
  bool get approved => status == 'resolved';
}
