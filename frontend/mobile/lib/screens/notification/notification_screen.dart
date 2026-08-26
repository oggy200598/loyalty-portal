import 'package:flutter/material.dart';

import '../../app/theme.dart';

/// Phase 1: khung thông báo — đầy đủ ở Phase 6.
class NotificationScreen extends StatelessWidget {
  const NotificationScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Thông báo')),
      body: const Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              Icons.notifications_outlined,
              size: 56,
              color: Colors.grey,
            ),
            SizedBox(height: 12),
            Text(
              'Thông báo sẽ hoàn thiện ở Phase 6',
              style:
                  TextStyle(color: AppColors.textSecondary),
            ),
          ],
        ),
      ),
    );
  }
}
