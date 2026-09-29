class Driver {
  const Driver({
    required this.id,
    required this.name,
    required this.code,
    required this.depot,
  });

  final String id;
  final String name;
  final String code;
  final String depot;

  String get initials {
    final parts = name.trim().split(RegExp(r'\s+')).where((p) => p.isNotEmpty);
    return parts.take(2).map((p) => p[0].toUpperCase()).join();
  }
}
