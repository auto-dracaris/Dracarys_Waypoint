import 'package:flutter/material.dart';
import '../widgets/app_header.dart';
import 'trips_detail_screen.dart';

class TripsScreen extends StatelessWidget {
  const TripsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: Column(
          children: [
            const AppHeader(),
            Expanded(
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 24.0),
                child: ListView(
                  children: [
                    const SizedBox(height: 32),
                    const Text(
                      'Trips to load',
                      style: TextStyle(
                        fontSize: 32,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    const SizedBox(height: 24),
                    TripCard(
                      vehicleAndTrip: 'VEH014 · Trip 1',
                      route: 'Fresh · Colombo',
                      status: 'Ready to load',
                      departureTime: '07:10',
                      buttonText: 'Start loading',
                      onPressed: () {
                        // THIS IS HOW YOU NAVIGATE TO THE NEXT SCREEN
                        Navigator.push(
                          context,
                          MaterialPageRoute(
                            builder: (context) => const TripDetailScreen(),
                          ),
                        );
                      },
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class TripCard extends StatelessWidget {
  final String vehicleAndTrip;
  final String route;
  final String status;
  final String departureTime;
  final String buttonText;
  final VoidCallback? onPressed;

  const TripCard({
    super.key,
    required this.vehicleAndTrip,
    required this.route,
    required this.status,
    required this.departureTime,
    required this.buttonText,
    this.onPressed,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: Colors.grey.shade300),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            vehicleAndTrip,
            style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
          ),
          Text(
            route,
            style: TextStyle(color: Colors.grey.shade600, fontSize: 15),
          ),
          const SizedBox(height: 16),
          ElevatedButton(
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFFFACC15),
              foregroundColor: Colors.black,
            ),
            onPressed: onPressed,
            child: Text(buttonText),
          ),
        ],
      ),
    );
  }
}
