import 'package:flutter/material.dart';
import 'screens/login_screen.dart';

void main() {
  runApp(const TripsApp());
}

class TripsApp extends StatelessWidget {
  const TripsApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Waypoint',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(
          seedColor: const Color(0xFFFACC15),
        ).copyWith(
          primary: const Color(0xFFFACC15),
          onPrimary: Colors.black,
        ),
        textSelectionTheme: const TextSelectionThemeData(
          cursorColor: Color(0xFFFACC15),
          selectionColor: Color(0x66FACC15),
          selectionHandleColor: Color(0xFFFACC15),
        ),
        scaffoldBackgroundColor: const Color(0xFFF3F4F6),
        fontFamily: 'Roboto',
      ),
      home: const LoginScreen(),
    );
  }
}
