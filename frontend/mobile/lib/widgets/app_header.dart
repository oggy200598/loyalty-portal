import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../app/theme.dart';
import 'bottom_nav.dart';

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
                icon: const Icon(
                  Icons.notifications_outlined,
                  color: Colors.white,
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
