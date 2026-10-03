import 'package:driver_app/core/theme/app_colors.dart';
import 'package:driver_app/core/theme/app_theme.dart';
import 'package:driver_app/core/widgets/app_bottom_nav.dart';
import 'package:driver_app/core/widgets/segmented_control.dart';
import 'package:driver_app/core/widgets/soft_light_overlay.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

Widget wrap(Widget child) =>
    MaterialApp(theme: AppTheme.light, home: Scaffold(body: child));

void main() {
  const items = [
    AppNavItem(
        label: 'My trips', icon: Icons.map_outlined, selectedIcon: Icons.map),
    AppNavItem(
        label: 'Updates',
        icon: Icons.notifications_none,
        selectedIcon: Icons.notifications),
    AppNavItem(
        label: 'Account',
        icon: Icons.person_outline,
        selectedIcon: Icons.person),
  ];

  testWidgets('AppBottomNav shows labels, marks the selected one and reports taps',
      (tester) async {
    int? tapped;
    await tester.pumpWidget(wrap(Align(
      alignment: Alignment.bottomCenter,
      child: AppBottomNav(
          items: items, currentIndex: 0, onSelected: (i) => tapped = i),
    )));

    for (final label in ['My trips', 'Updates', 'Account']) {
      expect(find.text(label), findsOneWidget);
    }
    // Selected item shows its filled icon, the others their outlined icon.
    expect(find.byIcon(Icons.map), findsOneWidget);
    expect(find.byIcon(Icons.notifications_none), findsOneWidget);

    await tester.tap(find.text('Account'));
    expect(tapped, 2);
  });

  testWidgets('SoftLightOverlay paints its child over a coloured backdrop',
      (tester) async {
    await tester.pumpWidget(wrap(Stack(children: [
      const SizedBox.expand(child: ColoredBox(color: AppColors.brandYellow)),
      const SoftLightOverlay(
          child: SizedBox(
              width: 50, height: 50, child: ColoredBox(color: Colors.grey))),
    ])));
    expect(find.byType(SoftLightOverlay), findsOneWidget);
    expect(tester.takeException(), isNull);
  });

  testWidgets('SegmentedControl shows counts and reports the tapped segment',
      (tester) async {
    int? selected;
    await tester.pumpWidget(wrap(SegmentedControl(
      segments: const [
        Segment(label: 'All', count: 15),
        Segment(label: 'Errors', count: 3),
      ],
      selectedIndex: 0,
      onChanged: (i) => selected = i,
    )));

    expect(find.text('15'), findsOneWidget);
    expect(find.text('3'), findsOneWidget);
    await tester.tap(find.text('Errors'));
    expect(selected, 1);
  });
}
