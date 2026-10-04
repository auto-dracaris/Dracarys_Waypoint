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
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        scaffoldBackgroundColor: const Color(0xFFF3F4F6),
        fontFamily: 'Roboto',
      ),
      home: const LoginScreen(),
    );
  }
}
