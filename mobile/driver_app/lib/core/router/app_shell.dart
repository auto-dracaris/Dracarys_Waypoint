import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../widgets/app_bottom_nav.dart';

const _tabs = [
  AppNavItem(
      label: 'My trips',
      icon: Icons.map_outlined,
      selectedIcon: Icons.map_rounded),
  AppNavItem(
      label: 'Updates',
      icon: Icons.notifications_none_rounded,
      selectedIcon: Icons.notifications_rounded),
  AppNavItem(
      label: 'Account',
      icon: Icons.person_outline_rounded,
      selectedIcon: Icons.person_rounded),
];

class AppShell extends StatelessWidget {
  const AppShell({super.key, required this.shell});

  final StatefulNavigationShell shell;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: shell,
      bottomNavigationBar: AppBottomNav(
        items: _tabs,
        currentIndex: shell.currentIndex,
        onSelected: (i) =>
            shell.goBranch(i, initialLocation: i == shell.currentIndex),
      ),
    );
  }
}
