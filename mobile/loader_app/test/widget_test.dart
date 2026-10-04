import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:flutter_application/main.dart';

void main() {
  testWidgets('requires phone credentials before opening trips', (
    tester,
  ) async {
    SharedPreferences.setMockInitialValues({});
    await tester.pumpWidget(const TripsApp());
    await tester.pumpAndSettle();
    expect(find.text('Phone number'), findsOneWidget);
    expect(find.text('Trips to load'), findsNothing);
    await tester.tap(find.text('Log in'));
    await tester.pump();
    expect(find.text('Enter your phone number'), findsOneWidget);
    expect(find.text('Enter your password'), findsOneWidget);
  });
}
