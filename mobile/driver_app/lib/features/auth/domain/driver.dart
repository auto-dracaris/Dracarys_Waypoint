class DriverVehicle {
  const DriverVehicle({
    required this.id,
    required this.plate,
    required this.type,
  });

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
    this.firstName = '',
    this.lastName = '',
    this.phone = '',
    this.avatarUrl,
    this.depotLat,
    this.depotLng,
  });

  final String id;
  final String name;
  final String code;
  final String depot;
  final DriverVehicle? vehicle;

  final String firstName;
  final String lastName;
  final String phone;

  /// The profile picture's URL, or null when none was set.
  final String? avatarUrl;

  final double? depotLat;
  final double? depotLng;

  String get initials {
    final parts = name.trim().split(RegExp(r'\s+')).where((p) => p.isNotEmpty);
    return parts.take(2).map((p) => p[0].toUpperCase()).join();
  }
}
