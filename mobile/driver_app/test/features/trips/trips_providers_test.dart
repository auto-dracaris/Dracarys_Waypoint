import 'package:driver_app/features/auth/data/auth_providers.dart';
import 'package:driver_app/features/auth/data/mock_auth_repository.dart';
import 'package:driver_app/features/auth/presentation/auth_controller.dart';
import 'package:driver_app/features/trips/data/mock_trips_repository.dart';
import 'package:driver_app/features/trips/data/trips_providers.dart';
import 'package:driver_app/features/trips/domain/trip.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

class CountingTripsRepository extends MockTripsRepository {
  CountingTripsRepository() : super(latency: Duration.zero);

  int calls = 0;

  @override
  Future<List<Trip>> getTrips() {
    calls++;
    return super.getTrips();
  }
}

void main() {
  test('trips reload when the signed-in driver changes', () async {
    final trips = CountingTripsRepository();
    final container = ProviderContainer(overrides: [
      authRepositoryProvider
          .overrideWithValue(MockAuthRepository(latency: Duration.zero)),
      tripsRepositoryProvider.overrideWithValue(trips),
    ]);
    addTearDown(container.dispose);

    await container.read(authControllerProvider.future);
    await container.read(tripsProvider.future);
    expect(trips.calls, 1);

    await container
        .read(authControllerProvider.notifier)
        .login(phone: '0770000002', password: 'secret1');
    await container.read(tripsProvider.future);
    expect(trips.calls, 2);
  });
}
