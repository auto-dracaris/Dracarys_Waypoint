/// A failed API call. [statusCode] 0 means the server could not be reached.
class ApiException implements Exception {
  const ApiException(this.statusCode, this.message, [this.data]);

  final int statusCode;
  final String message;

  /// The envelope's `data`: the full validation list, or the current trip on 409.
  final Object? data;

  bool get isNetwork => statusCode == 0;

  @override
  String toString() => message;
}
