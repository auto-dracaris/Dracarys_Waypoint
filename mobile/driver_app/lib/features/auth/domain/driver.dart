class DriverVehicle {
  const DriverVehicle(
      {required this.id, required this.plate, required this.type});

  final int id;
  final String plate;
  final String type;
}

class Driver {
  const Driver({
    required this.id,
    required this.name,
    required this.code,
    required this.depot,
    this.vehicle,
  });

  final String id;
  final String name;
  final String code;
  final String depot;
  final DriverVehicle? vehicle;

  String get initials {
    final parts = name.trim().split(RegExp(r'\s+')).where((p) => p.isNotEmpty);
    return parts.take(2).map((p) => p[0].toUpperCase()).join();
  }
}
