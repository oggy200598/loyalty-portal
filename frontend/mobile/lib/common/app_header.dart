import 'package:provider/provider.dart';
import '../shop/cart_provider.dart';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import 'theme.dart';
import 'notification_feed.dart';

/// Shell layout chứa bottom nav — các tab screen render bên trong.
class MainShell extends StatelessWidget {
  final Widget child;
  final int currentIndex;

  const MainShell({super.key, required this.child, required this.currentIndex});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: child,
      bottomNavigationBar: BottomNav(currentIndex: currentIndex),
    );
  }
}

/// Header tìm kiếm dùng chung cho Home/Search.
class SearchHeader extends StatelessWidget {
  final String? initialQuery;
  final ValueChanged<String>? onSubmitted;

  const SearchHeader({super.key, this.initialQuery, this.onSubmitted});

  @override
  Widget build(BuildContext context) {
    final controller = TextEditingController(text: initialQuery);
    final unread = context.watch<NotificationFeed?>()?.unreadCount ?? 0;

    return Material(
      color: AppColors.accent,
      child: SafeArea(
        bottom: false,
        child: Padding(
          padding: const EdgeInsets.fromLTRB(16, 8, 16, 12),
          child: Row(
            children: [
              Expanded(
                child: TextField(
                  controller: controller,
                  onSubmitted:
                      onSubmitted ??
                      (query) {
                        if (query.trim().isNotEmpty) {
                          context.go(
                            '/search?q=${Uri.encodeComponent(query.trim())}',
                          );
                        }
                      },
                  style: const TextStyle(fontSize: 14),
                  decoration: InputDecoration(
                    hintText: 'Tìm kiếm sản phẩm, shop...',
                    hintStyle: TextStyle(
                      color: Colors.grey.shade500,
                      fontSize: 14,
                    ),
                    prefixIcon: const Icon(
                      Icons.search,
                      color: AppColors.textSecondary,
                    ),
                    filled: true,
                    fillColor: Colors.white,
                    isDense: true,
                    contentPadding: EdgeInsets.zero,
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(6),
                      borderSide: BorderSide.none,
                    ),
                  ),
                ),
              ),

              IconButton(
                onPressed: () => context.push('/notifications'),
                icon: Badge(
                  isLabelVisible: unread > 0,
                  label: Text('$unread'),
                  child: const Icon(
                    Icons.notifications_outlined,
                    color: Colors.white,
                  ),
                ),
              ),

              Stack(
                children: [
                  IconButton(
                    onPressed: () => context.push('/cart'),
                    icon: const Icon(
                      Icons.shopping_cart_outlined,
                      color: Colors.white,
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}

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
    final unread = context.watch<NotificationFeed?>()?.unreadCount ?? 0;
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
      indicatorColor: AppColors.accent.withValues(alpha: .12),
      destinations: [
        const NavigationDestination(
          icon: Icon(Icons.home_outlined),
          selectedIcon: Icon(Icons.home, color: AppColors.accent),
          label: 'Trang chủ',
        ),
        const NavigationDestination(
          icon: Icon(Icons.grid_view_outlined),
          selectedIcon: Icon(Icons.grid_view, color: AppColors.accent),
          label: 'Danh mục',
        ),
        NavigationDestination(
          icon: Badge(
            isLabelVisible: cartCount > 0,
            label: Text('$cartCount'),
            backgroundColor: AppColors.accent,
            child: const Icon(Icons.shopping_cart_outlined),
          ),
          selectedIcon: Badge(
            isLabelVisible: cartCount > 0,
            label: Text('$cartCount'),
            backgroundColor: AppColors.accent,
            child: const Icon(Icons.shopping_cart, color: AppColors.accent),
          ),
          label: 'Giỏ hàng',
        ),
        NavigationDestination(
          icon: Badge(
            isLabelVisible: unread > 0,
            label: Text('$unread'),
            child: const Icon(Icons.notifications_outlined),
          ),
          selectedIcon: Badge(
            isLabelVisible: unread > 0,
            label: Text('$unread'),
            child: const Icon(Icons.notifications, color: AppColors.accent),
          ),
          label: 'Thông báo',
        ),
        const NavigationDestination(
          icon: Icon(Icons.person_outline),
          selectedIcon: Icon(Icons.person, color: AppColors.accent),
          label: 'Tôi',
        ),
      ],
    );
  }
}
