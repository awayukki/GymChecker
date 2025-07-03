import 'package:flutter/material.dart';
import '../services/reservation_service.dart';

class SlotList extends StatelessWidget {
  final List<AvailableSlot> slots;

  const SlotList({super.key, required this.slots});

  @override
  Widget build(BuildContext context) {
    final groupedSlots = _groupSlotsByDate(slots);
    
    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: groupedSlots.length,
      itemBuilder: (context, index) {
        final date = groupedSlots.keys.elementAt(index);
        final daySlots = groupedSlots[date]!;
        
        return Card(
          margin: const EdgeInsets.only(bottom: 16),
          child: ExpansionTile(
            title: Text(
              '${date.month}月${date.day}日 (${_getWeekdayName(date.weekday)})',
              style: const TextStyle(fontWeight: FontWeight.bold),
            ),
            subtitle: Text('${daySlots.length}件の空き'),
            children: daySlots.map((slot) => _buildSlotTile(slot)).toList(),
          ),
        );
      },
    );
  }

  Map<DateTime, List<AvailableSlot>> _groupSlotsByDate(List<AvailableSlot> slots) {
    final grouped = <DateTime, List<AvailableSlot>>{};
    
    for (final slot in slots) {
      final dateKey = DateTime(slot.date.year, slot.date.month, slot.date.day);
      if (!grouped.containsKey(dateKey)) {
        grouped[dateKey] = [];
      }
      grouped[dateKey]!.add(slot);
    }
    
    // Sort by date
    final sortedKeys = grouped.keys.toList()..sort();
    final sortedGrouped = <DateTime, List<AvailableSlot>>{};
    for (final key in sortedKeys) {
      sortedGrouped[key] = grouped[key]!;
    }
    
    return sortedGrouped;
  }

  Widget _buildSlotTile(AvailableSlot slot) {
    return ListTile(
      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
      leading: const Icon(Icons.sports_tennis, color: Colors.green),
      title: Text(slot.time),
      subtitle: Text(slot.courtName),
      trailing: const Icon(Icons.arrow_forward_ios, size: 16),
      onTap: () {
        // Handle slot selection - could open reservation page or show more details
      },
    );
  }

  String _getWeekdayName(int weekday) {
    const weekdays = ['月', '火', '水', '木', '金', '土', '日'];
    return weekdays[weekday - 1];
  }
}