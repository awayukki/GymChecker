import 'package:flutter/material.dart';
import '../services/reservation_service.dart';
import '../widgets/slot_list.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  final ReservationService _reservationService = ReservationService();
  List<AvailableSlot> _availableSlots = [];
  bool _isLoading = false;
  final DateTime _selectedDate = DateTime.now();
  String _selectedFacility = 'badminton';

  @override
  void initState() {
    super.initState();
    _loadAvailability();
  }

  Future<void> _loadAvailability() async {
    setState(() {
      _isLoading = true;
    });

    try {
      final slots = await _reservationService.searchAvailabilityForMonth(
        year: _selectedDate.year,
        month: _selectedDate.month,
        facility: _selectedFacility,
      );
      
      setState(() {
        _availableSlots = slots;
      });
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error loading availability: $e')),
        );
      }
    } finally {
      setState(() {
        _isLoading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('体育館予約チェッカー'),
        backgroundColor: Theme.of(context).colorScheme.inversePrimary,
      ),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.all(16.0),
            child: Row(
              children: [
                Expanded(
                  child: DropdownButton<String>(
                    value: _selectedFacility,
                    onChanged: (String? newValue) {
                      if (newValue != null) {
                        setState(() {
                          _selectedFacility = newValue;
                        });
                        _loadAvailability();
                      }
                    },
                    items: const [
                      DropdownMenuItem(value: 'badminton', child: Text('バドミントン')),
                      DropdownMenuItem(value: 'tennis', child: Text('テニス')),
                      DropdownMenuItem(value: 'basketball', child: Text('バスケットボール')),
                    ],
                  ),
                ),
                const SizedBox(width: 16),
                ElevatedButton(
                  onPressed: _isLoading ? null : _loadAvailability,
                  child: _isLoading
                      ? const SizedBox(
                          width: 16,
                          height: 16,
                          child: CircularProgressIndicator(strokeWidth: 2),
                        )
                      : const Text('更新'),
                ),
              ],
            ),
          ),
          Expanded(
            child: _isLoading
                ? const Center(child: CircularProgressIndicator())
                : _availableSlots.isEmpty
                    ? const Center(
                        child: Text(
                          '利用可能な時間はありません',
                          style: TextStyle(fontSize: 16),
                        ),
                      )
                    : SlotList(slots: _availableSlots),
          ),
        ],
      ),
    );
  }
}