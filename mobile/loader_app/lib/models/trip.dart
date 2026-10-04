enum TripListStatus {
  readyToLoad('ready_to_load', 'Ready to load'),
  inProgress('in_progress', 'In progress'),
  awaitingPlan('awaiting_plan', 'Awaiting plan');

  const TripListStatus(this.apiValue, this.label);
  final String apiValue, label;
}

class TripTabCounts {
  final int readyToLoad, inProgress, awaitingPlan;
  const TripTabCounts({
    this.readyToLoad = 0,
    this.inProgress = 0,
    this.awaitingPlan = 0,
  });
  TripTabCounts.fromJson(Map<String, dynamic> json)
    : readyToLoad = json['readyToLoad'] as int,
      inProgress = json['inProgress'] as int,
      awaitingPlan = json['awaitingPlan'] as int;

  int forStatus(TripListStatus status) => switch (status) {
    TripListStatus.readyToLoad => readyToLoad,
    TripListStatus.inProgress => inProgress,
    TripListStatus.awaitingPlan => awaitingPlan,
  };
}

class TripListResult {
  final List<TripSummary> trips;
  final TripTabCounts counts;
  const TripListResult({required this.trips, required this.counts});
}

class TripSummary {
  final String id, name, plate, subtitle, statusLabel;
  final String status;
  final String? depot;
  final int planVersion, totalCases, stopCount;
  final String? departure;
  TripSummary.fromJson(Map<String, dynamic> json)
    : status = json['status'] as String? ?? '',
      depot = json['depot'] as String?,
      id = json['id'] as String,
      name = json['name'] as String,
      plate = json['vehicle']['plate'] as String,
      subtitle = json['subtitle'] as String,
      statusLabel = json['statusLabel'] as String,
      planVersion = json['planVersion'] as int,
      totalCases = json['totalUnits'] as int,
      stopCount = json['stopCount'] as int,
      departure = json['departure'] as String?;
}

class TripStop {
  final String id, name;
  final String? outletCode;
  final String? orderId;
  final int sequence, cases;
  final List<String> orderIds;
  final Map<String, int> orderCases;
  final Map<String, int?> loadedByOrder;
  bool get confirmed =>
      orderCases.isNotEmpty &&
      orderCases.entries.every(
        (entry) => loadedByOrder[entry.key] == entry.value,
      );

  TripStop.fromJson(Map<String, dynamic> json)
    : orderCases = {
        for (final order in json['orders'] as List)
          if (order['id'] != null) order['id'] as String: order['cases'] as int,
      },
      loadedByOrder = {
        for (final order in json['orders'] as List)
          if (order['id'] != null)
            order['id'] as String: (order['loadedCases'] as num?)?.toInt(),
      },
      id = json['id'] as String,
      outletCode = json['outletCode'] as String?,
      name = json['name'] as String,
      orderId = (json['orders'] as List).isEmpty
          ? null
          : (json['orders'] as List).first['id'] as String?,
      sequence = json['sequence'] as int,
      orderIds = (json['orders'] as List)
          .where((order) => order['id'] != null)
          .map((order) => order['id'].toString())
          .toList(),
      cases = (json['orders'] as List).fold<int>(
        0,
        (sum, order) => sum + (order['cases'] as int),
      );
}

class TripDetail {
  final TripSummary summary;
  final List<TripStop> stops;
  TripDetail.fromJson(Map<String, dynamic> json)
    : summary = TripSummary.fromJson(json),
      stops =
          (json['stops'] as List)
              .map((stop) => TripStop.fromJson(stop as Map<String, dynamic>))
              .toList()
            ..sort((a, b) => b.sequence.compareTo(a.sequence));
  int get totalCases => stops.fold(0, (sum, stop) => sum + stop.cases);
}
