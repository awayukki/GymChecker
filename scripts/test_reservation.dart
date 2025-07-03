import 'package:http/http.dart' as http;
import 'lib/services/reservation_service.dart';

void main() async {
  final service = ReservationService();
  
  // Test for July 4th, 2025
  final date = DateTime(2025, 7, 4);
  
  print('Testing reservation service for ${date.year}-${date.month}-${date.day}...');
  
  try {
    final slots = await service.checkAvailability(date: date, facility: 'badminton');
    
    if (slots.isNotEmpty) {
      print('Found ${slots.length} available slots:');
      for (final slot in slots) {
        print('  - ${slot.time} at ${slot.courtName}');
      }
    } else {
      print('No available slots found for ${date.year}-${date.month}-${date.day}');
    }
  } catch (e) {
    print('Error: $e');
  }
}