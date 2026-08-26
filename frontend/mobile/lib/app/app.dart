import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import 'theme.dart';

class RiskMindApp extends StatelessWidget {
  final GoRouter router;

  const RiskMindApp({super.key, required this.router});

  @override
  Widget build(BuildContext context) {
    return MaterialApp.router(
      title: 'RiskMind AI',
      debugShowCheckedModeBanner: false,
      theme: buildAppTheme(),
      routerConfig: router,
    );
  }
}
