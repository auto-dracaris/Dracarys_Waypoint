import 'package:driver_app/core/theme/app_theme.dart';
import 'package:driver_app/core/widgets/app_button.dart';
import 'package:driver_app/core/widgets/dropdown_field.dart';
import 'package:driver_app/core/widgets/labeled_field.dart';
import 'package:driver_app/core/widgets/photo_tiles.dart';
import 'package:driver_app/core/widgets/quantity_stepper.dart';
import 'package:driver_app/core/widgets/signature_pad.dart';
import 'package:driver_app/core/widgets/toggle_tabs.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

Widget wrap(Widget child) => MaterialApp(
    theme: AppTheme.light,
    home: Scaffold(body: Padding(padding: const EdgeInsets.all(16), child: child)));

void main() {
  group('LabeledField', () {
    testWidgets('shows label, hint and reports typing', (tester) async {
      String? typed;
      await tester.pumpWidget(wrap(LabeledField(
        label: 'Staff member name',
        hint: 'Full name',
        onChanged: (v) => typed = v,
      )));
      expect(find.text('Staff member name'), findsOneWidget);
      expect(find.text('Full name'), findsOneWidget);

      await tester.enterText(find.byType(TextField), 'Kumara');
      expect(typed, 'Kumara');
    });

    testWidgets('shows an error message and supports multiple lines',
        (tester) async {
      await tester.pumpWidget(wrap(const LabeledField(
        label: 'Short Note',
        errorText: 'Too short',
        minLines: 3,
        maxLines: 3,
      )));
      expect(find.text('Too short'), findsOneWidget);
    });
  });

  testWidgets('ToggleTabs reports the tapped tab', (tester) async {
    int? selected;
    await tester.pumpWidget(wrap(ToggleTabs(
      labels: const ['Signature', 'Photo'],
      selectedIndex: 0,
      onChanged: (i) => selected = i,
    )));
    await tester.tap(find.text('Photo'));
    expect(selected, 1);
  });

  group('SignaturePad', () {
    testWidgets('is empty until drawn on, then can be cleared',
        (tester) async {
      var strokes = <List<Offset>>[];
      await tester.pumpWidget(wrap(StatefulBuilder(
        builder: (context, setState) => SignaturePad(
          strokes: strokes,
          onChanged: (s) => setState(() => strokes = s),
        ),
      )));
      expect(find.text('Sign here'), findsOneWidget);
      expect(find.text('Signature captured ✓'), findsNothing);
      expect(find.text('Clear'), findsNothing);

      await tester.drag(find.byKey(const Key('signature-surface')),
          const Offset(80, 30));
      await tester.pump();
      expect(strokes, isNotEmpty);
      expect(strokes.first.length, greaterThan(1));
      expect(find.text('Signature captured ✓'), findsOneWidget);

      await tester.tap(find.text('Clear'));
      await tester.pump();
      expect(strokes, isEmpty);
      expect(find.text('Sign here'), findsOneWidget);
    });

    testWidgets('a single tap without dragging is not a signature',
        (tester) async {
      var strokes = <List<Offset>>[];
      await tester.pumpWidget(wrap(StatefulBuilder(
        builder: (context, setState) => SignaturePad(
          strokes: strokes,
          onChanged: (s) => setState(() => strokes = s),
        ),
      )));
      await tester.tap(find.byKey(const Key('signature-surface')));
      await tester.pump();
      expect(strokes.where((s) => s.length > 1), isEmpty);
      expect(find.text('Signature captured ✓'), findsNothing);
    });
  });

  group('photo tiles', () {
    testWidgets('AddPhotoTile is tappable', (tester) async {
      var taps = 0;
      await tester.pumpWidget(wrap(AddPhotoTile(onTap: () => taps++)));
      expect(find.text('Add photo'), findsOneWidget);
      await tester.tap(find.text('Add photo'));
      expect(taps, 1);
    });

    testWidgets('PhotoThumb shows the image and a remove button',
        (tester) async {
      var removed = 0;
      await tester.pumpWidget(wrap(PhotoThumb(
          asset: 'assets/images/issue_photo.jpg', onRemove: () => removed++)));
      await tester.tap(find.byKey(const Key('photo-remove')));
      expect(removed, 1);
    });
  });

  testWidgets('DropdownField shows the value and selects another option',
      (tester) async {
    String value = 'Damaged goods';
    await tester.pumpWidget(wrap(StatefulBuilder(
      builder: (context, setState) => DropdownField<String>(
        value: value,
        options: const ['Damaged goods', 'Temperature breach'],
        label: (v) => v,
        onChanged: (v) => setState(() => value = v),
      ),
    )));
    expect(find.text('Damaged goods'), findsOneWidget);

    await tester.tap(find.byKey(const Key('dropdown-field')));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Temperature breach').last);
    await tester.pumpAndSettle();
    expect(value, 'Temperature breach');
  });

  testWidgets('joined QuantityStepper respects its bounds', (tester) async {
    var value = 1;
    await tester.pumpWidget(wrap(StatefulBuilder(
      builder: (context, setState) => QuantityStepper(
        style: QuantityStepperStyle.joined,
        value: value,
        min: 1,
        max: 2,
        onChanged: (v) => setState(() => value = v),
      ),
    )));
    await tester.tap(find.byKey(const Key('stepper-minus')));
    await tester.pump();
    expect(value, 1);
    await tester.tap(find.byKey(const Key('stepper-plus')));
    await tester.pump();
    await tester.tap(find.byKey(const Key('stepper-plus')));
    await tester.pump();
    expect(value, 2);
  });

  testWidgets('AppButton supports a custom colour and radius', (tester) async {
    await tester.pumpWidget(wrap(AppButton(
      label: 'Complete stop',
      backgroundColor: const Color(0xFFFFCB06),
      radius: 8,
      onPressed: () {},
    )));
    expect(find.text('Complete stop'), findsOneWidget);
  });
}
