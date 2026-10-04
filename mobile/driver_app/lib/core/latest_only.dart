/// Runs async jobs one at a time and, while one is in flight, keeps only the
/// newest waiting job. For updates where only the latest state matters (the
/// van's position on the map): a backlog of stale updates would make the van
/// lag further and further behind the camera.
class LatestOnly {
  bool _running = false;
  Future<void> Function()? _pending;

  void run(Future<void> Function() job) {
    if (_running) {
      _pending = job;
      return;
    }
    _start(job);
  }

  Future<void> _start(Future<void> Function() job) async {
    _running = true;
    try {
      await job();
    } catch (_) {
      // A failed update must not block the ones after it; callers that care
      // handle their own errors inside the job.
    }
    _running = false;
    final next = _pending;
    _pending = null;
    if (next != null) _start(next);
  }
}
