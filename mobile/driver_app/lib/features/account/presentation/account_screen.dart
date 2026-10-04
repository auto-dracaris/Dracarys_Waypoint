import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/app_info.dart';
import '../../../core/demo_mode.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_text.dart';
import '../../../core/widgets/app_button.dart';
import '../../../core/widgets/app_header.dart';
import '../../../core/widgets/async_value_view.dart';
import '../../../core/widgets/demo_mode_switch.dart';
import '../../../core/widgets/driver_avatar.dart';
import '../../../core/widgets/label_chip.dart';
import '../../../core/widgets/online_status_pill.dart';
import '../../auth/domain/driver.dart';
import '../../sync/application/sync_service.dart';
import '../../auth/presentation/auth_controller.dart';
import '../../trips/domain/vehicle.dart';
import '../../trips/presentation/widgets/vehicle_banner.dart';

/// The Account tab: who the driver is, their vehicle and depot, and the ways
/// to change their details or sign out.
class AccountScreen extends ConsumerWidget {
  const AccountScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final driver = ref.watch(authControllerProvider);
    return Scaffold(
      backgroundColor: AppColors.background,
      body: Column(
        children: [
          AppHeader(onBellTap: () => context.go('/updates')),
          Expanded(
            child: AsyncValueView(
              value: driver,
              onRetry: () => ref.invalidate(authControllerProvider),
              data: (d) =>
                  d == null ? const SizedBox.shrink() : _Content(driver: d),
            ),
          ),
        ],
      ),
    );
  }
}

class _Content extends ConsumerWidget {
  const _Content({required this.driver});

  final Driver driver;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final vehicle = driver.vehicle;
    return ListView(
      padding: const EdgeInsets.fromLTRB(16, 16, 16, 24),
      children: [
        _ProfileCard(driver: driver),
        const SizedBox(height: 16),
        if (vehicle != null)
          ClipRRect(
            key: const Key('vehicle-card'),
            borderRadius: BorderRadius.circular(12),
            child: VehicleBanner(
              vehicle: Vehicle(plate: vehicle.plate, type: vehicle.type),
            ),
          )
        else
          const _NoVehicle(),
        const SizedBox(height: 16),
        _DetailsCard(driver: driver),
        const SizedBox(height: 16),
        _ActionsCard(
          children: [
            _ActionRow(
              key: const Key('edit-profile'),
              icon: Icons.edit_outlined,
              label: 'Edit profile',
              onTap: () => context.go('/account/edit'),
            ),
            const Divider(height: 1, thickness: 1, color: AppColors.border),
            _ActionRow(
              key: const Key('change-password'),
              icon: Icons.lock_outline_rounded,
              label: 'Change password',
              onTap: () => context.go('/account/password'),
            ),
          ],
        ),
        const SizedBox(height: 24),
        AppButton(
          key: const Key('sign-out'),
          label: 'Sign out',
          variant: AppButtonVariant.dangerOutlined,
          leadingIcon: Icons.logout_rounded,
          padding: 14,
          radius: 8,
          onPressed: () => _signOut(context, ref),
        ),
        const DemoModeSwitch(),
        const SizedBox(height: 20),
        Text(
          'Waypoint Driver v$appVersion · ${environmentLabel(demo: ref.watch(demoModeProvider))}',
          key: const Key('app-footer'),
          textAlign: TextAlign.center,
          style: AppText.textXsRegular.copyWith(color: AppColors.inkMuted),
        ),
      ],
    );
  }
}

class _Card extends StatelessWidget {
  const _Card({required this.child, this.padding = 16});

  final Widget child;
  final double padding;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: EdgeInsets.all(padding),
      decoration: BoxDecoration(
        color: AppColors.surface,
        border: Border.all(color: AppColors.border),
        borderRadius: BorderRadius.circular(12),
      ),
      child: child,
    );
  }
}

class _ProfileCard extends StatelessWidget {
  const _ProfileCard({required this.driver});

  final Driver driver;

  @override
  Widget build(BuildContext context) {
    return _Card(
      padding: 20,
      child: Column(
        children: [
          InkWell(
            key: const Key('avatar-button'),
            customBorder: const CircleBorder(),
            onTap: () => context.go('/account/edit'),
            child: SizedBox(
              width: 96,
              height: 96,
              child: Stack(
                children: [
                  Positioned(
                    left: 4,
                    top: 4,
                    child: DriverAvatar(
                      initials: driver.initials,
                      url: driver.avatarUrl,
                      size: 88,
                    ),
                  ),
                  Positioned(
                    right: 0,
                    bottom: 0,
                    child: Container(
                      width: 30,
                      height: 30,
                      decoration: BoxDecoration(
                        color: AppColors.primary,
                        shape: BoxShape.circle,
                        border: Border.all(color: AppColors.surface, width: 2),
                      ),
                      child: const Icon(
                        Icons.photo_camera_rounded,
                        size: 16,
                        color: AppColors.ink,
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 12),
          Text(
            driver.name,
            key: const Key('driver-name'),
            textAlign: TextAlign.center,
            style: AppText.displayXs,
          ),
          const SizedBox(height: 8),
          Wrap(
            alignment: WrapAlignment.center,
            crossAxisAlignment: WrapCrossAlignment.center,
            spacing: 8,
            runSpacing: 8,
            children: [
              LabelChip(
                key: const Key('driver-code'),
                label: driver.code,
                background: AppColors.background,
                foreground: AppColors.ink,
                icon: Icons.badge_outlined,
                large: true,
              ),
              const IntrinsicWidth(child: OnlineStatusPill()),
            ],
          ),
        ],
      ),
    );
  }
}

class _NoVehicle extends StatelessWidget {
  const _NoVehicle();

  @override
  Widget build(BuildContext context) {
    return _Card(
      child: Row(
        children: [
          const Icon(
            Icons.local_shipping_outlined,
            size: 24,
            color: AppColors.inkMuted,
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Text(
              'No vehicle assigned yet',
              key: const Key('no-vehicle'),
              style: AppText.textSmMedium.copyWith(
                color: AppColors.inkSecondary,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _DetailsCard extends StatelessWidget {
  const _DetailsCard({required this.driver});

  final Driver driver;

  String? get _location {
    final lat = driver.depotLat, lng = driver.depotLng;
    if (lat == null || lng == null) return null;
    return '${lat.toStringAsFixed(4)}, ${lng.toStringAsFixed(4)}';
  }

  @override
  Widget build(BuildContext context) {
    final rows = <(IconData, String, String)>[
      (
        Icons.phone_outlined,
        'Phone',
        driver.phone.isEmpty ? '—' : driver.phone,
      ),
      (
        Icons.warehouse_outlined,
        'Depot',
        driver.depot.isEmpty ? '—' : driver.depot,
      ),
      if (_location != null)
        (Icons.place_outlined, 'Depot location', _location!),
    ];
    return _Card(
      padding: 4,
      child: Column(
        children: [
          for (var i = 0; i < rows.length; i++) ...[
            if (i > 0)
              const Divider(height: 1, thickness: 1, color: AppColors.border),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
              child: Row(
                children: [
                  Icon(rows[i].$1, size: 20, color: AppColors.inkSecondary),
                  const SizedBox(width: 12),
                  Text(
                    rows[i].$2,
                    style: AppText.textSmRegular.copyWith(
                      color: AppColors.inkSecondary,
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Text(
                      rows[i].$3,
                      key: Key(
                        'detail-${rows[i].$2.toLowerCase().replaceAll(' ', '-')}',
                      ),
                      textAlign: TextAlign.end,
                      style: AppText.textSmSemibold,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ],
      ),
    );
  }
}

class _ActionsCard extends StatelessWidget {
  const _ActionsCard({required this.children});

  final List<Widget> children;

  @override
  Widget build(BuildContext context) =>
      _Card(padding: 0, child: Column(children: children));
}

class _ActionRow extends StatelessWidget {
  const _ActionRow({
    super.key,
    required this.icon,
    required this.label,
    required this.onTap,
  });

  final IconData icon;
  final String label;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
        child: Row(
          children: [
            Icon(icon, size: 20, color: AppColors.ink),
            const SizedBox(width: 12),
            Expanded(child: Text(label, style: AppText.textSmSemibold)),
            const Icon(
              Icons.chevron_right_rounded,
              size: 22,
              color: AppColors.inkMuted,
            ),
          ],
        ),
      ),
    );
  }
}

/// Signing out with unsent work would leave it on the phone with nobody signed
/// in to send it, so the driver is asked first. It is not lost: it is sent the
/// next time the same driver signs in.
Future<void> _signOut(BuildContext context, WidgetRef ref) async {
  final waiting = ref.read(syncServiceProvider).pending.length;
  if (waiting > 0) {
    final leave = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        key: const Key('sign-out-warning'),
        title: const Text('Unsent changes'),
        content: Text(
          '$waiting ${waiting == 1 ? 'change has' : 'changes have'} not been '
          'sent to the dispatcher yet. They stay on this phone and are sent '
          'when you sign in again with a connection.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(false),
            child: const Text('Stay signed in'),
          ),
          TextButton(
            key: const Key('sign-out-anyway'),
            onPressed: () => Navigator.of(context).pop(true),
            child: const Text('Sign out'),
          ),
        ],
      ),
    );
    if (leave != true) return;
  }
  await ref.read(authControllerProvider.notifier).logout();
}
