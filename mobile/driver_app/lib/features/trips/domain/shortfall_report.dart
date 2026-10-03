/// Cargo the loaders could not put on the vehicle, reported to the driver
/// before departure (e.g. "2 of 12 cases short").
class ShortfallReport {
  const ShortfallReport({
    required this.orderId,
    required this.storeName,
    required this.shortCases,
    required this.plannedCases,
    required this.dispatcherNote,
  });

  final String orderId;
  final String storeName;
  final int shortCases;
  final int plannedCases;
  final String dispatcherNote;
}
