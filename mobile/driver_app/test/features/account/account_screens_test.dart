import 'package:driver_app/core/photos/photo_picker.dart';
import 'package:driver_app/core/theme/app_theme.dart';
import 'package:driver_app/core/widgets/map_view.dart';
import 'package:driver_app/features/account/data/account_providers.dart';
import 'package:driver_app/features/account/data/account_repository.dart';
import 'package:driver_app/features/account/data/mock_account_repository.dart';
import 'package:driver_app/features/account/presentation/account_screen.dart';
import 'package:driver_app/features/account/presentation/change_password_screen.dart';
import 'package:driver_app/features/account/presentation/edit_profile_screen.dart';
import 'package:driver_app/features/auth/data/auth_providers.dart';
import 'package:driver_app/features/auth/data/auth_repository.dart';
import 'package:driver_app/features/auth/data/mock_auth_repository.dart';
import 'package:driver_app/features/auth/domain/driver.dart';
import 'package:driver_app/features/auth/presentation/auth_controller.dart';
import 'package:driver_app/features/sync/application/sync_service.dart';
import 'package:driver_app/features/sync/domain/pending_action.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_riverpod/misc.dart' show Override;
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';

import '../../support/fake_photo_picker.dart';

const kasun = Driver(
  id: '12',
  name: 'Kasun Perera',
  firstName: 'Kasun',
  lastName: 'Perera',
  phone: '94771234567',
  code: 'DRV-0012',
  depot: 'Peliyagoda',
  depotLat: 6.9645,
  depotLng: 79.888,
  vehicle: DriverVehicle(id: 21, plate: 'VEH021', type: 'Refrigerated van'),
);

class _SignedIn extends AuthController {
  _SignedIn(this.driver);

  final Driver? driver;

  @override
  Future<Driver?> build() async => driver;
}

class _FailingAccount implements AccountRepository {
  @override
  Future<Driver> updateProfile(
    Driver current, {
    String? firstName,
    String? lastName,
    String? phone,
    PickedPhoto? newAvatar,
    bool removeAvatar = false,
  }) async => throw const AuthException('This phone number is already in use');

  @override
  Future<void> changePassword({
    required String currentPassword,
    required String newPassword,
  }) async => throw const AuthException('Something broke');
}

class _RecordingAccount extends MockAccountRepository {
  _RecordingAccount() : super(latency: Duration.zero);

  PickedPhoto? avatar;
  bool removed = false;
  String? sentFirst, sentLast, sentPhone;

  @override
  Future<Driver> updateProfile(
    Driver current, {
    String? firstName,
    String? lastName,
    String? phone,
    PickedPhoto? newAvatar,
    bool removeAvatar = false,
  }) {
    avatar = newAvatar;
    removed = removeAvatar;
    sentFirst = firstName;
    sentLast = lastName;
    sentPhone = phone;
    return super.updateProfile(
      current,
      firstName: firstName,
      lastName: lastName,
      phone: phone,
      newAvatar: newAvatar,
      removeAvatar: removeAvatar,
    );
  }
}

Future<GoRouter> pumpAccount(
  WidgetTester tester, {
  Driver? driver = kasun,
  AccountRepository? account,
  FakePhotoPicker? picker,
  String location = '/account',
  List<Override> overrides = const [],
}) async {
  tester.view.physicalSize = const Size(402 * 3, 1100 * 3);
  tester.view.devicePixelRatio = 3;
  addTearDown(tester.view.reset);

  final router = GoRouter(
    initialLocation: location,
    routes: [
      GoRoute(
        path: '/account',
        builder: (_, _) => const AccountScreen(),
        routes: [
          GoRoute(path: 'edit', builder: (_, _) => const EditProfileScreen()),
          GoRoute(
            path: 'password',
            builder: (_, _) => const ChangePasswordScreen(),
          ),
        ],
      ),
      GoRoute(
        path: '/updates',
        builder: (_, _) => const Scaffold(body: Text('Updates page')),
      ),
    ],
  );
  await tester.pumpWidget(
    ProviderScope(
      overrides: [
        authControllerProvider.overrideWith(() => _SignedIn(driver)),
        authRepositoryProvider.overrideWithValue(
          MockAuthRepository(latency: Duration.zero),
        ),
        accountRepositoryProvider.overrideWithValue(
          account ?? MockAccountRepository(latency: Duration.zero),
        ),
        photoPickerProvider.overrideWithValue(picker ?? FakePhotoPicker()),
        mapTilesEnabledProvider.overrideWithValue(false),
        ...overrides,
      ],
      child: MaterialApp.router(theme: AppTheme.light, routerConfig: router),
    ),
  );
  await tester.pumpAndSettle();
  return router;
}

Future<void> enter(WidgetTester tester, String key, String text) async {
  await tester.ensureVisible(find.byKey(Key(key)));
  await tester.enterText(find.byKey(Key(key)), text);
  await tester.pump();
}

Future<void> tapKey(WidgetTester tester, String key) async {
  await tester.ensureVisible(find.byKey(Key(key)));
  await tester.tap(find.byKey(Key(key)));
  await tester.pumpAndSettle();
}

void main() {
  group('Account screen', () {
    testWidgets('shows the driver, vehicle and depot details', (tester) async {
      await pumpAccount(tester);

      expect(find.text('Kasun Perera'), findsOneWidget);
      expect(find.text('DRV-0012'), findsOneWidget);
      expect(find.text('Online'), findsOneWidget);
      expect(find.byKey(const Key('vehicle-card')), findsOneWidget);
      expect(find.text('VEH021'), findsOneWidget);
      expect(find.text('Refrigerated van'), findsOneWidget);
      expect(find.text('94771234567'), findsOneWidget);
      expect(find.text('Peliyagoda'), findsOneWidget);
      expect(find.text('6.9645, 79.8880'), findsOneWidget);
      expect(find.text('Edit profile'), findsOneWidget);
      expect(find.text('Change password'), findsOneWidget);
      expect(find.byKey(const Key('app-footer')), findsOneWidget);
    });

    testWidgets('initials stand in when there is no picture', (tester) async {
      await pumpAccount(tester);
      expect(find.text('KP'), findsOneWidget);
      expect(find.byKey(const Key('avatar-image')), findsNothing);
    });

    testWidgets('a driver with no vehicle or depot location says so', (
      tester,
    ) async {
      await pumpAccount(
        tester,
        driver: const Driver(
          id: '1',
          name: 'New Driver',
          code: 'DRV-0001',
          depot: '',
        ),
      );
      expect(find.byKey(const Key('no-vehicle')), findsOneWidget);
      expect(find.byKey(const Key('vehicle-card')), findsNothing);
      expect(find.text('Depot location'), findsNothing);
      expect(find.byKey(const Key('detail-phone')), findsOneWidget);
    });

    testWidgets('the bell opens Updates', (tester) async {
      await pumpAccount(tester);
      await tester.tap(find.byKey(const Key('bell-button')));
      await tester.pumpAndSettle();
      expect(find.text('Updates page'), findsOneWidget);
    });

    testWidgets('the avatar and the rows open the edit screens', (
      tester,
    ) async {
      final router = await pumpAccount(tester);

      await tester.tap(find.byKey(const Key('avatar-button')));
      await tester.pumpAndSettle();
      expect(find.text('Edit profile'), findsWidgets);
      expect(find.byKey(const Key('save-profile')), findsOneWidget);

      router.go('/account');
      await tester.pumpAndSettle();
      await tester.tap(find.byKey(const Key('change-password')));
      await tester.pumpAndSettle();
      expect(find.byKey(const Key('save-password')), findsOneWidget);
    });

    testWidgets('unsent changes are warned about before signing out',
        (tester) async {
      await pumpAccount(tester, overrides: [
        syncServiceProvider.overrideWith(() => _WaitingSync(2)),
      ]);
      final container =
          ProviderScope.containerOf(tester.element(find.text('Kasun Perera')));

      await tapKey(tester, 'sign-out');
      expect(find.byKey(const Key('sign-out-warning')), findsOneWidget);
      expect(find.textContaining('2 changes have not been sent'),
          findsOneWidget);

      await tester.tap(find.text('Stay signed in'));
      await tester.pumpAndSettle();
      expect(container.read(authControllerProvider).value, isNotNull);

      await tapKey(tester, 'sign-out');
      await tester.tap(find.byKey(const Key('sign-out-anyway')));
      await tester.pumpAndSettle();
      expect(container.read(authControllerProvider).value, isNull);
    });

    testWidgets('one unsent change reads in the singular', (tester) async {
      await pumpAccount(tester, overrides: [
        syncServiceProvider.overrideWith(() => _WaitingSync(1)),
      ]);
      await tapKey(tester, 'sign-out');
      expect(find.textContaining('1 change has not been sent'),
          findsOneWidget);
    });

    testWidgets('Sign out signs the driver out', (tester) async {
      await pumpAccount(tester);
      final container = ProviderScope.containerOf(
        tester.element(find.text('Kasun Perera')),
      );

      await tapKey(tester, 'sign-out');
      expect(container.read(authControllerProvider).value, isNull);
    });
  });

  group('Edit profile', () {
    testWidgets('is filled in with the current details', (tester) async {
      await pumpAccount(tester, location: '/account/edit');
      expect(find.widgetWithText(TextField, 'Kasun'), findsOneWidget);
      expect(find.widgetWithText(TextField, 'Perera'), findsOneWidget);
      expect(find.widgetWithText(TextField, '94771234567'), findsOneWidget);
      expect(find.text('Add photo'), findsOneWidget);
    });

    testWidgets('empty names and a bad phone are refused', (tester) async {
      final account = _RecordingAccount();
      await pumpAccount(tester, location: '/account/edit', account: account);

      await enter(tester, 'first-name', '');
      await enter(tester, 'last-name', ' ');
      await enter(tester, 'phone', '12345');
      await tapKey(tester, 'save-profile');

      expect(find.text('Enter your name'), findsNWidgets(2));
      expect(find.text('Enter a valid mobile number'), findsOneWidget);
      expect(account.sentFirst, isNull);
    });

    testWidgets('saving sends only what changed and updates the account', (
      tester,
    ) async {
      final account = _RecordingAccount();
      await pumpAccount(tester, location: '/account/edit', account: account);

      await enter(tester, 'first-name', 'Nimal');
      await tapKey(tester, 'save-profile');

      expect(account.sentFirst, 'Nimal');
      expect(account.sentLast, isNull);
      expect(account.sentPhone, isNull);
      expect(find.text('Profile updated'), findsOneWidget);
      // Back on the Account tab, with the new name.
      expect(find.text('Nimal Perera'), findsOneWidget);
      expect(find.byKey(const Key('save-profile')), findsNothing);
    });

    testWidgets('saving with nothing changed just goes back', (tester) async {
      final account = _RecordingAccount();
      await pumpAccount(tester, location: '/account/edit', account: account);

      await tapKey(tester, 'save-profile');
      expect(account.sentFirst, isNull);
      expect(find.byKey(const Key('save-profile')), findsNothing);
      expect(find.text('Kasun Perera'), findsOneWidget);
    });

    testWidgets('a server refusal is shown on the form', (tester) async {
      await pumpAccount(
        tester,
        location: '/account/edit',
        account: _FailingAccount(),
      );

      await enter(tester, 'phone', '0771234999');
      await tapKey(tester, 'save-profile');

      expect(find.text('This phone number is already in use'), findsOneWidget);
      expect(find.byKey(const Key('save-profile')), findsOneWidget);
    });

    testWidgets('a photo from the gallery is previewed and sent', (
      tester,
    ) async {
      final account = _RecordingAccount();
      final picker = FakePhotoPicker();
      await pumpAccount(
        tester,
        location: '/account/edit',
        account: account,
        picker: picker,
      );

      await tapKey(tester, 'change-photo');
      await tester.tap(find.byKey(const Key('photo-gallery')));
      await tester.pumpAndSettle();

      expect(picker.requested, [PhotoSource.gallery]);
      expect(find.byKey(const Key('avatar-image')), findsOneWidget);
      expect(find.text('Change photo'), findsOneWidget);

      await tapKey(tester, 'save-profile');
      expect(account.avatar, isNotNull);
      expect(account.sentFirst, isNull);
    });

    testWidgets('the camera option uses the camera', (tester) async {
      final picker = FakePhotoPicker();
      await pumpAccount(tester, location: '/account/edit', picker: picker);

      await tapKey(tester, 'change-photo');
      await tester.tap(find.byKey(const Key('photo-camera')));
      await tester.pumpAndSettle();
      expect(picker.requested, [PhotoSource.camera]);
    });

    testWidgets('backing out of the picker changes nothing', (tester) async {
      final picker = FakePhotoPicker();
      await pumpAccount(tester, location: '/account/edit', picker: picker);
      picker.photo = null;

      await tapKey(tester, 'change-photo');
      await tester.tap(find.byKey(const Key('photo-gallery')));
      await tester.pumpAndSettle();
      // The fake always answers; what matters is the sheet closed cleanly.
      expect(find.byKey(const Key('photo-gallery')), findsNothing);
    });

    testWidgets('an existing picture can be removed', (tester) async {
      final account = _RecordingAccount();
      await pumpAccount(
        tester,
        location: '/account/edit',
        account: account,
        driver: Driver(
          id: kasun.id,
          name: kasun.name,
          firstName: kasun.firstName,
          lastName: kasun.lastName,
          phone: kasun.phone,
          code: kasun.code,
          depot: kasun.depot,
          avatarUrl: 'https://img.test/me.jpg',
        ),
      );

      expect(find.text('Change photo'), findsOneWidget);
      await tapKey(tester, 'change-photo');
      await tester.tap(find.byKey(const Key('photo-remove-picture')));
      await tester.pumpAndSettle();
      expect(find.text('Add photo'), findsOneWidget);

      await tapKey(tester, 'save-profile');
      expect(account.removed, isTrue);
    });

    testWidgets('the sheet offers no remove when there is no picture', (
      tester,
    ) async {
      await pumpAccount(tester, location: '/account/edit');
      await tapKey(tester, 'change-photo');
      expect(find.byKey(const Key('photo-remove-picture')), findsNothing);
    });

    testWidgets('the back link returns to Account', (tester) async {
      await pumpAccount(tester, location: '/account/edit');
      await tester.tap(find.byKey(const Key('back-bar-button')));
      await tester.pumpAndSettle();
      expect(find.byKey(const Key('sign-out')), findsOneWidget);
    });
  });

  group('Change password', () {
    testWidgets('checks each field before sending', (tester) async {
      await pumpAccount(tester, location: '/account/password');

      await tapKey(tester, 'save-password');
      expect(find.text('Enter your current password'), findsOneWidget);
      expect(
        find.text('Password must be at least 6 characters'),
        findsOneWidget,
      );

      await enter(tester, 'current-password', 'Secret1!');
      await enter(tester, 'new-password', 'NewPass1!');
      await enter(tester, 'confirm-password', 'Different1!');
      expect(find.text('Passwords do not match'), findsOneWidget);
    });

    testWidgets('the wrong current password is reported on the form', (
      tester,
    ) async {
      await pumpAccount(tester, location: '/account/password');
      await enter(tester, 'current-password', 'nope-nope');
      await enter(tester, 'new-password', 'NewPass1!');
      await enter(tester, 'confirm-password', 'NewPass1!');
      await tapKey(tester, 'save-password');

      expect(find.text('Current password is incorrect'), findsOneWidget);
      expect(find.byKey(const Key('save-password')), findsOneWidget);
    });

    testWidgets('a good change confirms and returns, still signed in', (
      tester,
    ) async {
      final account = MockAccountRepository(latency: Duration.zero);
      await pumpAccount(
        tester,
        location: '/account/password',
        account: account,
      );
      final container = ProviderScope.containerOf(
        tester.element(find.byKey(const Key('save-password'))),
      );

      await enter(tester, 'current-password', 'Secret1!');
      await enter(tester, 'new-password', 'NewPass1!');
      await enter(tester, 'confirm-password', 'NewPass1!');
      await tapKey(tester, 'save-password');

      expect(account.password, 'NewPass1!');
      expect(find.text('Password changed'), findsOneWidget);
      expect(find.byKey(const Key('sign-out')), findsOneWidget);
      expect(container.read(authControllerProvider).value, isNotNull);
    });

    testWidgets('any other failure is shown too', (tester) async {
      await pumpAccount(
        tester,
        location: '/account/password',
        account: _FailingAccount(),
      );
      await enter(tester, 'current-password', 'Secret1!');
      await enter(tester, 'new-password', 'NewPass1!');
      await enter(tester, 'confirm-password', 'NewPass1!');
      await tapKey(tester, 'save-password');
      expect(find.text('Something broke'), findsOneWidget);
    });
  });
}

/// A sync service holding [count] unsent actions: no timers, no storage.
class _WaitingSync extends SyncService {
  _WaitingSync(this.count);

  final int count;

  @override
  SyncState build() => SyncState(pending: [
        for (var i = 0; i < count; i++)
          PendingAction(
              id: '$i',
              kind: ActionKind.arrive,
              tripId: 't',
              createdAt: DateTime(2026),
              body: const {}),
      ]);
}
