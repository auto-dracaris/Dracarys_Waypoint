/// What the phone is given to check an outlet's delivery code with no signal:
/// the salted PBKDF2-HMAC-SHA256 hash of the code (never the code itself).
class DeliveryCodeHash {
  const DeliveryCodeHash({
    required this.salt,
    required this.iterations,
    required this.hash,
  });

  /// Hex-encoded salt bytes.
  final String salt;
  final int iterations;

  /// Hex-encoded 32-byte derived key.
  final String hash;
}
