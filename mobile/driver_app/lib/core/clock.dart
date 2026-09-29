import 'package:flutter_riverpod/flutter_riverpod.dart';

/// The current time, injectable so relative times ("2 min ago") are testable.
final clockProvider = Provider<DateTime Function()>((ref) => DateTime.now);
