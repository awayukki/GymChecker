import 'package:flutter/material.dart';
import '../services/reservation_service.dart';

class AvailabilityCalendar extends StatefulWidget {
  final List<AvailableSlot> availableSlots;
  final Function(DateTime) onDateSelected;

  const AvailabilityCalendar({
    super.key,
    required this.availableSlots,
    required this.onDateSelected,
  });

  @override
  State<AvailabilityCalendar> createState() => _AvailabilityCalendarState();
}

class _AvailabilityCalendarState extends State<AvailabilityCalendar> {
  DateTime _selectedDate = DateTime.now();

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            '予約可能日',
            style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 16),
          Expanded(
            child: GridView.builder(
              gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                crossAxisCount: 7,
                childAspectRatio: 1.0,
                crossAxisSpacing: 4,
                mainAxisSpacing: 4,
              ),
              itemCount: _getDaysInMonth(_selectedDate).length,
              itemBuilder: (context, index) {
                final day = _getDaysInMonth(_selectedDate)[index];
                final hasAvailability = _hasAvailabilityForDate(day);
                final isSelected = _isSameDay(day, _selectedDate);

                return GestureDetector(
                  onTap: () {
                    setState(() {
                      _selectedDate = day;
                    });
                    widget.onDateSelected(day);
                  },
                  child: Container(
                    decoration: BoxDecoration(
                      color: isSelected
                          ? Theme.of(context).primaryColor
                          : hasAvailability
                              ? Colors.green[100]
                              : Colors.grey[200],
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(
                        color: isSelected ? Theme.of(context).primaryColor : Colors.transparent,
                        width: 2,
                      ),
                    ),
                    child: Center(
                      child: Text(
                        day.day.toString(),
                        style: TextStyle(
                          color: isSelected
                              ? Colors.white
                              : hasAvailability
                                  ? Colors.green[800]
                                  : Colors.grey[600],
                          fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
                        ),
                      ),
                    ),
                  ),
                );
              },
            ),
          ),
        ],
      ),
    );
  }

  List<DateTime> _getDaysInMonth(DateTime date) {
    final lastDay = DateTime(date.year, date.month + 1, 0);
    final days = <DateTime>[];

    for (int i = 1; i <= lastDay.day; i++) {
      days.add(DateTime(date.year, date.month, i));
    }

    return days;
  }

  bool _hasAvailabilityForDate(DateTime date) {
    return widget.availableSlots.any((slot) => _isSameDay(slot.date, date));
  }

  bool _isSameDay(DateTime a, DateTime b) {
    return a.year == b.year && a.month == b.month && a.day == b.day;
  }
}