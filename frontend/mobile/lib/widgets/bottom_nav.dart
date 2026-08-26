import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../providers/cart_provider.dart';
import '../app/theme.dart';

/// Bottom navigation dùng chung — KHÔNG lặp trong từng screen.
/// Tabs: Trang chủ | Danh mục | Giỏ hàng | Thông báo | Tôi
class BottomNav extends StatelessWidget {
  final int currentIndex;

  const BottomNav({super.key, required this.currentIndex});

  static const _routes = [
    '/',
    '/categories',
    '/cart',
    '/notifications',
    '/account',
  ];

  @override
  Widget build(BuildContext context) {
    final cartCount = context.select<CartProvider, int>(
      (cart) => cart.itemCount,
    );

    return NavigationBar(
      selectedIndex: currentIndex.clamp(0, _routes.length - 1),
      onDestinationSelected: (index) {
        if (index != currentIndex) {
          context.go(_routes[index]);
        }
      },
      backgroundColor: Colors.white,
      indicatorColor: AppColors.accent.withOpacity(.12),
      destinations: [
        const NavigationDestination(
          icon: Icon(Icons.home_outlined),
          selectedIcon: Icon(Icons.home, color: AppColors.accent),
          label: 'Trang chủ',
        ),
        const NavigationDestination(
          icon: Icon(Icons.grid_view_outlined),
          selectedIcon:
              Icon(Icons.grid_view, color: AppColors.accent),
          label: 'Danh mục',
        ),
        NavigationDestination(
          icon: Badge(
            isLabelVisible: cartCount > 0,
            label: Text('$cartCount'),
            backgroundColor: AppColors.accent,
            child:
                const Icon(Icons.shopping_cart_outlined),
          ),
          selectedIcon: Badge(
            isLabelVisible: cartCount > 0,
            label: Text('$cartCount'),
            backgroundColor: AppColors.accent,
            child: const Icon(Icons.shopping_cart,
                color: AppColors.accent),
          ),
          label: 'Giỏ hàng',
        ),
        const NavigationDestination(
          icon: Icon(Icons.notifications_outlined),
          selectedIcon: Icon(Icons.notifications,
              color: AppColors.accent),
          label: 'Thông báo',
        ),
        const NavigationDestination(
          icon: Icon(Icons.person_outline),
          selectedIcon:
              Icon(Icons.person, color: AppColors.accent),
          label: 'Tôi',
        ),
      ],
    );
  }
}
