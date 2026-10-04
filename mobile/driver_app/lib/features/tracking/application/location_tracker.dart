import 'dart:async';

import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/api/api_providers.dart';
import '../../../core/connectivity/online_provider.dart';
import '../../../core/demo_mode.dart';
import '../../../core/storage/local_store.dart';
import '../../../core/uuid.dart';
import '../../auth/data/auth_providers.dart';
import '../../auth/presentation/auth_controller.dart';
import '../../trips/data/trips_providers.dart';
import '../../trips/domain/trip.dart';
import '../data/location_buffer.dart';
import '../data/location_uploader.dart';
import '../data/position_source.dart';
import '../domain/location_point.dart';

class TrackerState {
  const TrackerState({this.tracking = false, this.pending = 0, this.problem});

  /// A trip is under way and the phone is recording the vehicle's position.
  final bool tracking;

  /// Points on the phone that the server does not have yet.
  final int pending;

  /// Why tracking cannot work right now (location off or not allowed), or null.
  final String? problem;

  TrackerState copyWith({
    bool? tracking,
    int? pending,
    String? problem,
    bool clearProblem = false,
  }) => TrackerState(
    tracking: tracking ?? this.tracking,
    pending: pending ?? this.pending,
    problem: clearProblem ? null : problem ?? this.problem,
  );
}

final locationBufferProvider = Provider<LocationBuffer>(
  (ref) => LocationBuffer(ref.watch(localStoreProvider)),
);

final locationUploaderProvider = Provider<LocationUploader>(
  (ref) => LocationUploader(ref.watch(apiClientProvider)),
);

/// Tells the dispatcher where the vehicle is.
///
/// While a trip is in progress it records the vehicle's position about every
/// second, keeps each point on the phone with its own id, and sends the list
/// about once a minute in batches of up to 500, oldest first. Both times are
/// minimums: a weak GPS, heavy traffic or no signal only make them longer, and
/// whatever was missed goes out with the next batch. A point is deleted only once the server
/// has answered `202`. With no signal it keeps recording; when the connection
/// returns the backlog is sent. Sending the same point twice is safe because the
/// server stores a repeated id once.
class LocationTracker extends Notifier<TrackerState> {
  /// How often a position is recorded (at most; the GPS may be slower).
  static const interval = Duration(seconds: 1);

  /// The least time between uploads. The first goes out at once so the
  /// dispatcher sees the van as soon as the trip starts; a full batch or the
  /// connection coming back does not wait either.
  static const defaultUploadEvery = Duration(seconds: 60);

  /// [defaultUploadEvery] unless a test shortens it.
  Duration uploadEvery = defaultUploadEvery;

  /// A reading older than this is not recorded: the GPS has stopped reporting.
  static const _staleAfter = Duration(seconds: 15);

  /// A reading this vague (a cell-tower guess) would put the van on the wrong road.
  static const _worstAccuracy = 200.0;

  Timer? _timer;
  StreamSubscription<GpsFix>? _fixes;
  GpsFix? _latest;
  DateTime? _lastRecordedFix;
  DateTime? _retryAt;
  DateTime? _lastUploadAt;
  DateTime? _restartAt;
  bool _flushing = false;

  LocationBuffer get _buffer => ref.read(locationBufferProvider);
  DateTime Function() clock = DateTime.now;

  @override
  TrackerState build() {
    ref.listen(
      authControllerProvider.select((a) => a.value?.id),
      (_, _) => _evaluate(),
    );
    ref.listen(tripsProvider, (_, _) => _evaluate());
    ref.listen(demoModeProvider, (_, _) => _evaluate());
    ref.listen(onlineProvider, (was, online) {
      if (online && was == false) unawaited(flush(force: true));
    });
    _timer = Timer.periodic(interval, (_) => unawaited(tick()));
    ref.onDispose(() {
      _timer?.cancel();
      _fixes?.cancel();
    });
    Future.microtask(() async {
      await _refreshCount();
      _evaluate();
    });
    return const TrackerState();
  }

  int? get _vehicleId => ref.read(authControllerProvider).value?.vehicle?.id;

  bool get _shouldTrack {
    if (ref.read(demoModeProvider) || _vehicleId == null) return false;
    final trips = ref.read(tripsProvider).value;
    return trips != null && trips.any((t) => t.status == TripStatus.inProgress);
  }

  /// After the GPS failed, wait before asking again; the driver may be in Settings.
  bool get _mayRestart => _restartAt?.isBefore(clock()) ?? true;

  void _evaluate() {
    if (_shouldTrack) {
      if (_fixes == null && _mayRestart) _start();
    } else if (_fixes != null || state.tracking) {
      _stop();
    }
  }

  void _start() {
    try {
      _fixes = ref
          .read(positionSourceProvider)
          .watch()
          .listen(
            (fix) {
              _latest = fix;
              if (state.problem != null) {
                state = state.copyWith(clearProblem: true);
              }
            },
            onError: (Object e) {
              _fixes?.cancel();
              _fixes = null;
              _restartAt = clock().add(const Duration(seconds: 30));
              state = state.copyWith(
                tracking: false,
                problem: e is LocationUnavailable
                    ? e.message
                    : 'The phone could not get your location.',
              );
            },
          );
      state = state.copyWith(tracking: true);
    } catch (_) {
      state = state.copyWith(
        tracking: false,
        problem: 'The phone could not get your location.',
      );
    }
  }

  void _stop() {
    _fixes?.cancel();
    _fixes = null;
    _latest = null;
    _restartAt = null;
    state = state.copyWith(tracking: false, clearProblem: true);
    // The trip is over: send what is left rather than wait out the minute.
    unawaited(flush(force: true));
  }

  Future<void> _refreshCount() async {
    try {
      final pending = await _buffer.count();
      // Read the state only after the await: it may have changed meanwhile.
      state = state.copyWith(pending: pending);
    } catch (_) {}
  }

  /// One beat: record the latest reading, then send what is waiting. Runs every
  /// [interval]; public so a test can drive it.
  Future<void> tick() async {
    // The GPS was refused or switched off: try again now and then, since the
    // driver may have fixed it in Settings.
    if (_shouldTrack && _fixes == null && _mayRestart) {
      _start();
    }
    if (state.tracking) await _record();
    final due =
        _lastUploadAt == null ||
        clock().difference(_lastUploadAt!) >= uploadEvery ||
        state.pending >= LocationUploader.maxBatch;
    if (due) await flush();
  }

  Future<void> _record() async {
    final fix = _latest;
    if (fix == null || fix.time == _lastRecordedFix) return;
    if (clock().difference(fix.time) > _staleAfter) return;
    if ((fix.accuracyMeters ?? 0) > _worstAccuracy) return;
    _lastRecordedFix = fix.time;

    final heading = fix.headingDegrees;
    final speed = fix.speedMps;
    await _buffer.add(
      LocationPoint(
        id: newUuid(),
        lat: fix.lat,
        lng: fix.lng,
        heading: heading != null && heading >= 0 && heading <= 360
            ? heading.round()
            : null,
        speedKmh: speed != null && speed >= 0 ? speed * 3.6 : null,
        recordedAt: fix.time,
      ),
    );
    state = state.copyWith(pending: state.pending + 1);
  }

  /// Sends the backlog if there is a connection: batches of up to 500, oldest
  /// first, until it is empty or something stops it. [force] ignores the wait
  /// after a failed attempt (the network just came back, or the driver asked).
  Future<void> flush({bool force = false}) async {
    if (_flushing || state.pending == 0 && !force) return;
    final vehicleId = _vehicleId;
    if (vehicleId == null ||
        ref.read(demoModeProvider) ||
        !ref.read(onlineProvider)) {
      return;
    }
    if (!force && (_retryAt?.isAfter(clock()) ?? false)) return;

    _flushing = true;
    _lastUploadAt = clock();
    try {
      while (true) {
        final batch = await _buffer.oldest(LocationUploader.maxBatch);
        if (batch.isEmpty) {
          await _refreshCount();
          _retryAt = null;
          break;
        }
        final result = await ref
            .read(locationUploaderProvider)
            .upload(vehicleId, batch);
        await _buffer.remove(result.finished);
        await _refreshCount();

        if (result.status == UploadStatus.vehicleRejected) {
          // Not the driver of that vehicle (any more): the assignment has most
          // likely changed, so fetch the profile again. Points stay put.
          _retryAt = clock().add(const Duration(seconds: 60));
          unawaited(_refreshProfile());
          break;
        }
        if (result.status == UploadStatus.retryLater) {
          _retryAt = clock().add(const Duration(seconds: 15));
          break;
        }
        _retryAt = null;
        if (batch.length < LocationUploader.maxBatch) {
          await _refreshCount();
          break;
        }
      }
    } finally {
      _flushing = false;
    }
  }

  /// Fetches the driver's profile quietly. (Invalidating the sign-in state would
  /// flash the splash screen.)
  Future<void> _refreshProfile() async {
    try {
      final driver = await ref.read(authRepositoryProvider).currentDriver();
      if (driver != null) {
        ref.read(authControllerProvider.notifier).setDriver(driver);
      }
    } catch (_) {}
  }
}

final locationTrackerProvider = NotifierProvider<LocationTracker, TrackerState>(
  LocationTracker.new,
);
