import 'dart:async';
import 'package:flutter/material.dart';
import 'reservation_service.dart';

class NotificationService {
  static final NotificationService _instance = NotificationService._internal();
  factory NotificationService() => _instance;
  NotificationService._internal();

  Timer? _timer;
  final List<String> _watchedFacilities = [];
  final List<DateTime> _watchedDates = [];
  Function(List<AvailableSlot>)? _onNewSlotsFound;

  void startWatching({
    required List<String> facilities,
    required List<DateTime> dates,
    required Function(List<AvailableSlot>) onNewSlotsFound,
    Duration interval = const Duration(minutes: 30),
  }) {
    _watchedFacilities.clear();
    _watchedFacilities.addAll(facilities);
    _watchedDates.clear();
    _watchedDates.addAll(dates);
    _onNewSlotsFound = onNewSlotsFound;

    _timer?.cancel();
    _timer = Timer.periodic(interval, (timer) {
      _checkForNewSlots();
    });
  }

  void stopWatching() {
    _timer?.cancel();
    _timer = null;
  }

  Future<void> _checkForNewSlots() async {
    final reservationService = ReservationService();
    final allNewSlots = <AvailableSlot>[];

    for (final facility in _watchedFacilities) {
      for (final date in _watchedDates) {
        try {
          final slots = await reservationService.checkAvailability(
            date: date,
            facility: facility,
          );
          allNewSlots.addAll(slots);
        } catch (e) {
          debugPrint('Error checking availability: $e');
        }
      }
    }

    if (allNewSlots.isNotEmpty && _onNewSlotsFound != null) {
      _onNewSlotsFound!(allNewSlots);
    }
  }

  bool get isWatching => _timer?.isActive ?? false;
}

class NotificationSettings {
  final bool enableNotifications;
  final Duration checkInterval;
  final List<String> watchedFacilities;
  final TimeOfDay startTime;
  final TimeOfDay endTime;

  NotificationSettings({
    this.enableNotifications = true,
    this.checkInterval = const Duration(minutes: 30),
    this.watchedFacilities = const ['badminton'],
    this.startTime = const TimeOfDay(hour: 9, minute: 0),
    this.endTime = const TimeOfDay(hour: 21, minute: 0),
  });
}